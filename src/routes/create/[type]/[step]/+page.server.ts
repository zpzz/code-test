import { error, fail, redirect } from '@sveltejs/kit';
import {
	isApplicationType,
	type ApplicationType
} from '$lib/domain/applicationTypes';
import { getApplicationForEdit, saveApplication } from '$lib/server/application-service';
import { ServiceError } from '$lib/server/service-error';
import { readApplicationFields } from '$lib/utils';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	if (!isApplicationType(params.type)) error(404, '未找到该申请类型');
	const editId = url.searchParams.get('edit');

	if (!editId) return { application: null };

	try {
		return { application: await getApplicationForEdit(params.type, editId) };
	} catch (cause) {
		if (cause instanceof ServiceError) error(cause.status, cause.message);
		throw cause;
	}
};

/**
 * 将 SvelteKit 的表单请求转换为申请 service 所需的业务参数。
 *
 * 用户身份只从 cookie 读取，不信任前端 hidden input 中的 applicantId。
 */
async function handleSave(
	type: ApplicationType,
	request: Request,
	cookies: { get(name: string): string | undefined },
	intent: 'save' | 'submit'
) {
	const formData = await request.formData();
	const applicantId = cookies.get('applicantId');
	const editIdValue = formData.get('editId');
	const rawFields = readApplicationFields(formData.get('fields'));

	if (!applicantId || !rawFields) {
		return fail(400, { message: '申请信息不完整，请刷新后重试。' });
	}

	const editId = typeof editIdValue === 'string' && editIdValue ? editIdValue : undefined;
	try {
		await saveApplication({ type, applicantId, rawFields, editId, intent });
	} catch (cause) {
		if (cause instanceof ServiceError) {
			return fail(cause.status, { message: cause.message });
		}
		throw cause;
	}

	throw redirect(303, '/request');
}

export const actions: Actions = {
	save: ({ params, request, cookies }) =>
		isApplicationType(params.type)
			? handleSave(params.type, request, cookies, 'save')
			: fail(404, { message: '未找到该申请类型。' }),
	submit: ({ params, request, cookies }) =>
		isApplicationType(params.type)
			? handleSave(params.type, request, cookies, 'submit')
			: fail(404, { message: '未找到该申请类型。' })
};
