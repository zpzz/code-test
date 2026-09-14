import { fail } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { APPLICATION_STATUS, USER_ROLE } from '$lib/enums';
import {
	approveApplication,
	batchApproveApplications,
	rejectApplication
} from '$lib/server/approval-service';
import { ServiceError } from '$lib/server/service-error';
import type { Actions, PageServerLoad, RequestEvent } from './$types';
import type { Prisma } from '@prisma/client';
import { isApplicationType, type ApplicationType } from '$lib/domain/applicationTypes';

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

/**
 * 处理待审批页面的单条审批和批量通过 action。
 *
 * 具体审批规则由 approval-service 统一处理，路由层只负责参数解析和响应转换。
 */
async function handleApprovalAction(
	{ request, cookies }: Pick<RequestEvent, 'request' | 'cookies'>,
	action: 'approve' | 'reject',
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

	try {
		if (batch) {
			const count = await batchApproveApplications({ actorId, applicationIds });
			return { success: true, message: `已批量通过 ${count} 份申请。` };
		}

		const applicationId = applicationIds[0];
		if (action === 'reject') {
			await rejectApplication({ actorId, applicationId, reason: rejectReason });
		} else {
			await approveApplication({ actorId, applicationId });
		}
	} catch (cause) {
		if (cause instanceof ServiceError) {
			return fail(cause.status, { success: false, message: cause.message });
		}
		return fail(500, { success: false, message: '审批处理失败，请稍后重试。' });
	}

	const label = action === 'approve' ? '通过' : '驳回';
	return {
		success: true,
		message: batch ? `已批量${label} ${applicationIds.length} 份申请。` : `申请已${label}。`
	};
}

export const load: PageServerLoad = async ({ cookies }) => {
	const actorId = cookies.get('applicantId');
	const storedType = cookies.get('currentApplicationType');
	const applicationType: ApplicationType = isApplicationType(storedType ?? '')
		? storedType as ApplicationType
		: 'travel';

	if (!actorId) {
		return { applications: [], applicationType };
	}

	const actor = await prisma.user.findUnique({
		where: { id: actorId },
		select: { id: true, role: true }
	});

	if (!actor) {
		return { applications: [], applicationType };
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
		return { applications: [], applicationType };
	}

	const applications = await prisma.application.findMany({
		where: {
			...where,
			type: applicationType
		},
		include: { applicant: { select: { managerId: true } } },
		orderBy: [{ submittedAt: 'desc' }, { createdAt: 'desc' }]
	});

	return {
		applicationType,
		applications: applications.map((application) => ({
			...application,
			fields: JSON.parse(application.fields)
		}))
	};
};

export const actions: Actions = {
	approve: (event) => handleApprovalAction(event, 'approve'),
	reject: (event) => handleApprovalAction(event, 'reject'),
	batchApprove: (event) => handleApprovalAction(event, 'approve', true)
};
