import { fail } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { prisma } from '$lib/server/db';
import { APPLICATION_STATUS, USER_ROLE } from '$lib/enums';
import type { Prisma } from '@prisma/client';
import type { Actions, PageServerLoad } from './$types';

type ApprovalAction = 'approve' | 'reject';

type PendingApplication = Prisma.ApplicationGetPayload<{
	include: { applicant: { select: { managerId: true } } };
}>;

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

function transitionFor(
	actor: { id: string; role: string },
	application: PendingApplication,
	action: ApprovalAction
): { toStatus: string; action: ApprovalAction } | null {
	if (
		actor.role === USER_ROLE.manager &&
		application.status === APPLICATION_STATUS.pendingManager &&
		application.applicantId !== actor.id &&
		application.applicant.managerId === actor.id
	) {
		return {
			toStatus:
				action === 'approve' ? APPLICATION_STATUS.pendingFinance : APPLICATION_STATUS.rejected,
			action
		};
	}

	if (
		actor.role === USER_ROLE.finance &&
		application.status === APPLICATION_STATUS.pendingFinance &&
		application.applicantId !== actor.id
	) {
		return {
			toStatus: action === 'approve' ? APPLICATION_STATUS.approved : APPLICATION_STATUS.rejected,
			action
		};
	}

	return null;
}

async function processApplications(request: Request, action: ApprovalAction, batch = false) {
	const formData = await request.formData();
	const actorId = formData.get('actorId');
	const rejectReason = String(formData.get('rejectReason') ?? '').trim();
	const applicationIds = batch
		? readApplicationIds(formData.get('applicationIds'))
		: typeof formData.get('applicationId') === 'string'
			? [formData.get('applicationId') as string]
			: null;

	if (typeof actorId !== 'string' || !actorId || !applicationIds || applicationIds.length === 0) {
		return fail(400, { success: false, message: '请选择需要审批的申请。' });
	}

	if (action === 'reject' && (!rejectReason || rejectReason.length > 200)) {
		return fail(400, { success: false, message: '请填写 1 至 200 字的驳回理由。' });
	}

	const actor = await prisma.user.findUnique({
		where: { id: actorId },
		select: { id: true, name: true, role: true }
	});

	if (!actor || ![USER_ROLE.manager, USER_ROLE.finance].includes(actor.role)) {
		return fail(403, { success: false, message: '当前用户没有审批权限。' });
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
				transition: transitionFor(actor, application, action)
			}));

			if (transitions.some(({ transition }) => !transition)) {
				throw new Error('部分申请已被处理，或你没有对应的审批权限。');
			}

			const now = new Date();
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

export const load: PageServerLoad = async () => {
	const applications = await prisma.application.findMany({
		where: {
			status: {
				in: [APPLICATION_STATUS.pendingManager, APPLICATION_STATUS.pendingFinance]
			}
		},
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
	approve: ({ request }) => processApplications(request, 'approve'),
	reject: ({ request }) => processApplications(request, 'reject'),
	batchApprove: ({ request }) => processApplications(request, 'approve', true)
};
