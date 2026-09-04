import { error, fail, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { APPLICATION_STATUS } from '$lib/enums';
import {
	getNextSubmitStatus,
	normalizeApplicationFields,
	readApplicationFields,
	validateApplicationForSubmit
} from '$lib/utils';
import type { Actions, PageServerLoad } from './$types';

async function nextApplicationId(): Promise<string> {
	const latest = await prisma.application.findFirst({
		where: { id: { startsWith: 'TR-' } },
		orderBy: { id: 'desc' },
		select: { id: true }
	});
	const sequence = Number(latest?.id.slice(3)) || 0;
	return `TR-${String(sequence + 1).padStart(4, '0')}`;
}

async function saveApplication(request: Request, intent: 'save' | 'submit') {
	const formData = await request.formData();
	console.info("🚀 ~ saveApplication ~ formData:", formData)
	const applicantId = formData.get('applicantId');
	const editId = formData.get('editId');
	const rawFields = readApplicationFields(formData.get('fields'));

	if (typeof applicantId !== 'string' || !applicantId || !rawFields) {
		return fail(400, { message: '申请信息不完整，请刷新后重试。' });
	}

	const applicant = await prisma.user.findUnique({ where: { id: applicantId } });
	if (!applicant) {
		return fail(400, { message: '未识别当前申请人，请重新选择角色。' });
	}

	const fields = normalizeApplicationFields(rawFields);
	if (intent === 'submit') {
		const message = validateApplicationForSubmit(fields);
		if (message) return fail(400, { message });
	}

	const now = new Date();
	const submitting = intent === 'submit';

	if (typeof editId === 'string' && editId) {
		const existing = await prisma.application.findUnique({ where: { id: editId } });
		if (!existing) return fail(404, { message: '未找到需要编辑的申请。' });
		if (
			existing.applicantId !== applicant.id ||
			![APPLICATION_STATUS.draft, APPLICATION_STATUS.rejected].includes(existing.status)
		) {
			return fail(403, { message: '当前申请不可编辑。' });
		}

		const nextStatus = submitting ? getNextSubmitStatus(applicant.role) : existing.status;
		await prisma.application.update({
			where: { id: existing.id },
			data: {
				fields: JSON.stringify(fields),
				status: nextStatus,
				submittedAt: submitting ? now : existing.submittedAt,
				auditLogs: submitting
					? {
							create: {
								id: `${existing.id}-audit-${Date.now()}`,
								at: now,
								actorId: applicant.id,
								actorName: applicant.name,
								action: 'submit',
								fromStatus: existing.status,
								toStatus: nextStatus
							}
						}
					: undefined
			}
		});
	} else {
		const id = await nextApplicationId();
		const status = submitting
			? getNextSubmitStatus(applicant.role)
			: APPLICATION_STATUS.draft;

		await prisma.application.create({
			data: {
				id,
				type: 'travel',
				applicantId: applicant.id,
				applicantName: applicant.name,
				department: applicant.department,
				status,
				fields: JSON.stringify(fields),
				createdAt: now,
				submittedAt: submitting ? now : null,
				auditLogs: submitting
					? {
							create: {
								id: `${id}-audit-1`,
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

	redirect(303, '/request');
}

export const load: PageServerLoad = async ({ url }) => {
	const editId = url.searchParams.get('edit');

	if (!editId) {
		return { application: null };
	}

	const application = await prisma.application.findUnique({
		where: { id: editId }
	});

	if (!application) {
		error(404, '未找到需要编辑的申请');
	}

	return {
		application: {
			...application,
			fields: JSON.parse(application.fields)
		}
	};
};

export const actions: Actions = {
	save: ({ request }) => saveApplication(request, 'save'),
	submit: ({ request }) => saveApplication(request, 'submit')
};
