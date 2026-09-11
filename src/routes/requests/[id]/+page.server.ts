import { error, fail, redirect } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { prisma } from '$lib/server/db';
import { localNow } from '$lib/format/date';
import { APPLICATION_STATUS } from '$lib/enums';
import {
	canCancel,
	isApprovalRole,
	resolveApprovalTransition,
	validateRejectReason,
	type ApprovalAction
} from '$lib/server/approval';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const application = await prisma.application.findUnique({
		where: { id: params.id },
		include: {
			applicant: {
				select: {
					managerId: true
				}
			},
			auditLogs: {
				orderBy: { at: 'asc' }
			}
		}
	});

	if (!application) {
		error(404, '未找到该申请');
	}

	return {
		application: {
			...application,
			fields: JSON.parse(application.fields)
		}
	};
};

/**
 * 处理详情页的单条审批操作。
 *
 * 权限判定统一走 $lib/server/approval 的状态机（与待审批列表同一入口），
 * 避免两处手写角色/状态/经理关系判断漂移；这里只负责参数解析与落库跳转。
 */
async function processApproval(
	params: { id: string },
	request: Request,
	action: ApprovalAction
) {
	const formData = await request.formData();
	const actorId = formData.get('actorId');
	const rejectReason = String(formData.get('rejectReason') ?? '').trim();

	if (typeof actorId !== 'string' || !actorId) {
		return fail(400, { success: false, message: '未识别当前用户，请重新切换角色后再试。' });
	}

	if (action === 'reject') {
		const message = validateRejectReason(rejectReason);
		if (message) return fail(400, { success: false, message });
	}

	const [actor, application] = await Promise.all([
		prisma.user.findUnique({
			where: { id: actorId },
			select: { id: true, name: true, role: true }
		}),
		prisma.application.findUnique({
			where: { id: params.id },
			include: { applicant: { select: { managerId: true } } }
		})
	]);

	if (!actor || !isApprovalRole(actor.role)) {
		return fail(403, { success: false, message: '当前用户没有审批权限。' });
	}

	if (!application) {
		return fail(404, { success: false, message: '未找到该申请。' });
	}

	const transition = resolveApprovalTransition(actor, application, action);
	if (!transition) {
		return fail(403, { success: false, message: '当前角色没有处理这份申请的权限。' });
	}

	const nextStatus = transition.toStatus;
	const now = localNow();

	await prisma.application.update({
		where: { id: application.id },
		data: {
			status: nextStatus,
			auditLogs: {
				create: {
					id: randomUUID(),
					at: now,
					actorId: actor.id,
					actorName: actor.name,
					action,
					fromStatus: application.status,
					toStatus: nextStatus,
					comment: action === 'reject' ? rejectReason : null
				}
			}
		}
	});

	throw redirect(303, '/approvals');
}

export const actions: Actions = {
	approve: ({ params, request }) => processApproval(params, request, 'approve'),
	reject: ({ params, request }) => processApproval(params, request, 'reject'),
	cancel: async ({ params, request }) => {
		const formData = await request.formData();
		const actorId = formData.get('actorId');

		if (typeof actorId !== 'string' || !actorId) {
			return fail(400, { message: '未识别当前用户，请重新切换角色后再试。' });
		}

		const [actor, application] = await Promise.all([
			prisma.user.findUnique({ where: { id: actorId }, select: { id: true, name: true } }),
			prisma.application.findUnique({ where: { id: params.id } })
		]);

		if (!actor) {
			return fail(400, { message: '未识别当前用户，请重新切换角色后再试。' });
		}

		if (!application) {
			return fail(404, { message: '未找到该申请。' });
		}

		// 撤销权限：只有申请人可撤销处于待审批流转中的申请（见 $lib/server/approval）。
		if (!canCancel(actor.id, application)) {
			if (application.applicantId !== actor.id) {
				return fail(403, { message: '只有申请人可以撤销这份申请。' });
			}
			return fail(400, { message: '当前状态不可撤销。' });
		}

		const now = localNow();

		await prisma.application.update({
			where: { id: application.id },
			data: {
				status: APPLICATION_STATUS.cancelled,
				auditLogs: {
					create: {
						id: `${application.id}-audit-cancel-${Date.now()}`,
						at: now,
						actorId: actor.id,
						actorName: actor.name,
						action: 'cancel',
						fromStatus: application.status,
						toStatus: APPLICATION_STATUS.cancelled,
						comment: '申请人撤销申请'
					}
				}
			}
		});

		throw redirect(303, `/requests/${application.id}?from=requests`);
	}
};
