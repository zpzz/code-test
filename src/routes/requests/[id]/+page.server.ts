import { error, fail, redirect } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { prisma } from '$lib/server/db';
import { APPLICATION_STATUS, USER_ROLE } from '$lib/enums';
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

type ApprovalAction = 'approve' | 'reject';

/**
 * 处理详情页的单条审批操作。
 *
 * 角色和当前审批状态必须同时匹配，避免通过手动修改 actorId
 * 或直接访问详情页绕过前端按钮限制。
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

	if (action === 'reject' && (!rejectReason || rejectReason.length > 200)) {
		return fail(400, { success: false, message: '请填写 1 至 200 字的驳回理由。' });
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

	if (!actor || ![USER_ROLE.manager, USER_ROLE.finance].includes(actor.role)) {
		return fail(403, { success: false, message: '当前用户没有审批权限。' });
	}

	if (!application) {
		return fail(404, { success: false, message: '未找到该申请。' });
	}

	const isManagerApproval =
		actor.role === USER_ROLE.manager &&
		application.status === APPLICATION_STATUS.pendingManager &&
		application.applicantId !== actor.id &&
		application.applicant.managerId === actor.id;
	const isFinanceApproval =
		actor.role === USER_ROLE.finance &&
		application.status === APPLICATION_STATUS.pendingFinance &&
		application.applicantId !== actor.id;

	if (!isManagerApproval && !isFinanceApproval) {
		return fail(403, { success: false, message: '当前角色没有处理这份申请的权限。' });
	}

	const nextStatus =
		action === 'reject'
			? APPLICATION_STATUS.rejected
			: isManagerApproval
				? APPLICATION_STATUS.pendingFinance
				: APPLICATION_STATUS.approved;
	const now = new Date();

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

		if (application.applicantId !== actor.id) {
			return fail(403, { message: '只有申请人可以撤销这份申请。' });
		}

		if (
			![APPLICATION_STATUS.pendingManager, APPLICATION_STATUS.pendingFinance].includes(
				application.status
			)
		) {
			return fail(400, { message: '当前状态不可撤销。' });
		}

		const now = new Date();

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
