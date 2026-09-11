import { error, fail, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { APPLICATION_STATUS } from '$lib/enums';
import {
	getApplicationType,
	isApplicationType,
	type ApplicationType
} from '$lib/domain/applicationTypes';
import { localNow } from '$lib/format/date';
import {
	getNextSubmitStatus,
	normalizeApplicationFields,
	readApplicationFields,
	validateApplicationForSubmit
} from '$lib/utils';
import type { Actions, PageServerLoad } from './$types';

async function nextApplicationId(type: ApplicationType): Promise<string> {
	const prefix = getApplicationType(type).idPrefix;
	const latest = await prisma.application.findFirst({
		where: { id: { startsWith: `${prefix}-` } },
		orderBy: { id: 'desc' },
		select: { id: true }
	});
	const sequence = Number(latest?.id.slice(prefix.length + 1)) || 0;
	return `${prefix}-${String(sequence + 1).padStart(4, '0')}`;
}

export const load: PageServerLoad = async ({ params, url }) => {
	if (!isApplicationType(params.type)) error(404, '未找到该申请类型');
	const type = getApplicationType(params.type).type;
	const editId = url.searchParams.get('edit');

	if (!editId) return { application: null };

	const application = await prisma.application.findUnique({ where: { id: editId } });
	if (!application) error(404, '未找到需要编辑的申请');
	if (application.type !== type) error(400, '申请类型不匹配');

	return {
		application: {
			...application,
			fields: JSON.parse(application.fields)
		}
	};
};

async function saveApplication(
	type: ApplicationType,
	request: Request,
	intent: 'save' | 'submit'
) {
	const formData = await request.formData();
	const applicantId = formData.get('applicantId');
	const editId = formData.get('editId');
	const rawFields = readApplicationFields(formData.get('fields'));

	if (typeof applicantId !== 'string' || !applicantId || !rawFields) {
		return fail(400, { message: '申请信息不完整，请刷新后重试。' });
	}

	const applicant = await prisma.user.findUnique({ where: { id: applicantId } });
	if (!applicant) return fail(400, { message: '未识别当前申请人，请重新选择角色。' });

	const fields = normalizeApplicationFields(rawFields);
	if (intent === 'submit') {
		const message =
			getApplicationType(type).typeRefine?.(rawFields) ??
			validateApplicationForSubmit(fields, type);
		if (message) return fail(400, { message });
	}

	const now = localNow();
	const status = intent === 'submit' ? getNextSubmitStatus(applicant.role) : APPLICATION_STATUS.draft;
	const applicationId =
		typeof editId === 'string' && editId ? editId : await nextApplicationId(type);

	const editableId = typeof editId === 'string' && editId ? editId : null;
	const existing = editableId
		? await prisma.application.findUnique({ where: { id: editableId } })
		: null;
	if (editableId && !existing) return fail(404, { message: '未找到需要编辑的申请。' });
	if (
		existing &&
		(existing.applicantId !== applicant.id ||
			existing.type !== type ||
			(existing.status !== APPLICATION_STATUS.draft &&
				existing.status !== APPLICATION_STATUS.rejected))
	) {
		return fail(403, { message: '当前申请不可编辑。' });
	}

	if (existing) {
		await prisma.application.update({
			where: { id: existing.id },
			data: {
				fields: JSON.stringify(fields),
				status: intent === 'submit' ? status : existing.status,
				submittedAt: intent === 'submit' ? now : existing.submittedAt,
				auditLogs:
					intent === 'submit'
						? {
								create: {
									id: `${existing.id}-audit-${Date.now()}`,
									at: now,
									actorId: applicant.id,
									actorName: applicant.name,
									action: 'submit',
									fromStatus: existing.status,
									toStatus: status
								}
							}
						: undefined
			}
		});
	} else {
		await prisma.application.create({
			data: {
				id: applicationId,
				type,
				applicantId: applicant.id,
				applicantName: applicant.name,
				department: applicant.department,
				status,
				fields: JSON.stringify(fields),
				createdAt: now,
				submittedAt: intent === 'submit' ? now : null,
				auditLogs:
					intent === 'submit'
						? {
								create: {
									id: `${applicationId}-audit-1`,
									at: now,
									actorId: applicant.id,
									actorName: applicant.name,
									action: 'submit',
									fromStatus: APPLICATION_STATUS.draft,
									toStatus: status
								}
							}
						: undefined
			}
		});
	}

	throw redirect(303, '/request');
}

export const actions: Actions = {
	save: ({ params, request }) =>
		isApplicationType(params.type)
			? saveApplication(params.type, request, 'save')
			: fail(404, { message: '未找到该申请类型。' }),
	submit: ({ params, request }) =>
		isApplicationType(params.type)
			? saveApplication(params.type, request, 'submit')
			: fail(404, { message: '未找到该申请类型。' })
};
