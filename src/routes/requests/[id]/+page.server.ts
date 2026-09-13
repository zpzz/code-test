import { error, fail, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import {
	approveApplication,
	cancelApplication,
	rejectApplication
} from '$lib/server/approval-service';
import { ServiceError } from '$lib/server/service-error';
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
 * 处理详情页的通过和驳回操作。
 *
 * 审批人身份从 cookie 获取，避免客户端伪造 actorId。
 */
async function handleApprovalAction(
	applicationId: string,
	request: Request,
	cookies: { get(name: string): string | undefined },
	action: 'approve' | 'reject'
) {
	const formData = await request.formData();
	const actorId = cookies.get('applicantId');
	const rejectReason = String(formData.get('rejectReason') ?? '').trim();

	if (!actorId) {
		return fail(400, { success: false, message: '未识别当前用户，请重新切换角色后再试。' });
	}

	try {
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

	throw redirect(303, '/approvals');
}

export const actions: Actions = {
	approve: ({ params, request, cookies }) =>
		handleApprovalAction(params.id, request, cookies, 'approve'),
	reject: ({ params, request, cookies }) =>
		handleApprovalAction(params.id, request, cookies, 'reject'),
	cancel: async ({ params, cookies }) => {
		const actorId = cookies.get('applicantId');
		if (!actorId) {
			return fail(400, { message: '未识别当前用户，请重新切换角色后再试。' });
		}

		try {
			await cancelApplication({ actorId, applicationId: params.id });
		} catch (cause) {
			if (cause instanceof ServiceError) {
				return fail(cause.status, { message: cause.message });
			}
			return fail(500, { message: '撤销申请失败，请稍后重试。' });
		}

		throw redirect(303, `/requests/${params.id}?from=requests`);
	}
};
