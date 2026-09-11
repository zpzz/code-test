import { fail } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { prisma } from '$lib/server/db';
import { localNow } from '$lib/format/date';
import { APPLICATION_STATUS, USER_ROLE } from '$lib/enums';
import {
	resolveApprovalTransition,
	validateRejectReason,
	type ApprovalAction
} from '$lib/server/approval';
import type { Actions, PageServerLoad, RequestEvent } from './$types';
import type { Prisma } from '@prisma/client';

function readApplicationIds(value: FormDataEntryValue | null): string[] | null {
	if (typeof value !== 'string') return null;

	try {
		const ids = JSON.parse(value);
		if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string' || !id)) return null;
		return [...new Set(ids)];
	} catch {
		return null;
	}
}

async function processApplications(
	{ request, cookies }: Pick<RequestEvent, 'request' | 'cookies'>,
	action: ApprovalAction,
	batch = false
) {
	const actorId = cookies.get('applicantId');
	if (!actorId) {
		return fail(401, { success: false, message: '未识别当前用户，请重新切换角色后再试。' });
	}

	const formData = await request.formData();
	const rejectReason = String(formData.get('rejectReason') ?? '').trim();
	const applicationIds = batch
		? readApplicationIds(formData.get('applicationIds'))
		: typeof formData.get('applicationId') === 'string'
			? [formData.get('applicationId') as string]
			: null;

	if (!applicationIds || applicationIds.length === 0) {
		return fail(400, { success: false, message: '请选择需要审批的申请。' });
	}

	if (action === 'reject') {
		const message = validateRejectReason(rejectReason);
		if (message) return fail(400, { success: false, message });
	}

	const actor = await prisma.user.findUnique({
		where: { id: actorId },
		select: { id: true, name: true, role: true }
	});

	if (!actor) {
		return fail(401, { success: false, message: '未识别当前用户，请重新切换角色后再试。' });
	}

	try {
		await prisma.$transaction(async (tx) => {
			const applications = await tx.application.findMany({
				where: { id: { in: applicationIds } },
				include: { applicant: { select: { managerId: true } } }
			});

			if (applications.length !== applicationIds.length) {
				throw new Error('部分申请不存在或已被删除。');
			}

			const transitions = applications.map((application) => ({
				application,
				transition: resolveApprovalTransition(actor, application, action)
			}));

			if (transitions.some(({ transition }) => !transition)) {
				throw new Error('部分申请已被处理，或你没有对应的审批权限。');
			}

			const now = localNow();
			for (const { application, transition } of transitions) {
				if (!transition) continue;

				await tx.application.update({
					where: { id: application.id },
					data: {
						status: transition.toStatus,
						auditLogs: {
							create: {
								id: randomUUID(),
								at: now,
								actorId: actor.id,
								actorName: actor.name,
								action: transition.action,
								fromStatus: application.status,
								toStatus: transition.toStatus,
								comment: transition.action === 'reject' ? rejectReason : null
							}
						}
					}
				});
			}
		});
	} catch (error) {
		return fail(400, {
			success: false,
			message: error instanceof Error ? error.message : '审批处理失败，请稍后重试。'
		});
	}

	const label = action === 'approve' ? '通过' : '驳回';
	return {
		success: true,
		message: batch ? `已批量${label} ${applicationIds.length} 份申请。` : `申请已${label}。`
	};
}

export const load: PageServerLoad = async ({ cookies }) => {
	const actorId = cookies.get('applicantId');
	if (!actorId) {
		return { applications: [] };
	}

	const actor = await prisma.user.findUnique({
		where: { id: actorId },
		select: { id: true, role: true }
	});

	if (!actor) {
		return { applications: [] };
	}

	let where: Prisma.ApplicationWhereInput | null = null;
	if (actor.role === USER_ROLE.manager) {
		where = {
			status: APPLICATION_STATUS.pendingManager,
			applicantId: { not: actor.id },
			applicant: { managerId: actor.id }
		};
	} else if (actor.role === USER_ROLE.finance) {
		where = {
			status: APPLICATION_STATUS.pendingFinance,
			applicantId: { not: actor.id }
		};
	}

	if (!where) {
		return { applications: [] };
	}

	const applications = await prisma.application.findMany({
		where,
		include: { applicant: { select: { managerId: true } } },
		orderBy: [{ submittedAt: 'desc' }, { createdAt: 'desc' }]
	});

	return {
		applications: applications.map((application) => ({
			...application,
			fields: JSON.parse(application.fields)
		}))
	};
};

export const actions: Actions = {
	approve: (event) => processApplications(event, 'approve'),
	reject: (event) => processApplications(event, 'reject'),
	batchApprove: (event) => processApplications(event, 'approve', true)
};
