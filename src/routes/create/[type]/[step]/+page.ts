import { redirect } from '@sveltejs/kit';
import { APPLICATION_TYPE_VALUES, type ApplicationType } from '$lib/domain/applicationTypes';
import { firstStep } from '$lib/domain/applicationTypes';
import { isStepSlug } from '$lib/domain/wizard';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params, data }) => {
	const validType = APPLICATION_TYPE_VALUES.includes(params.type as ApplicationType);
	const type = validType ? (params.type as ApplicationType) : 'travel';

	if (!validType || !isStepSlug(type, params.step)) {
		redirect(307, `/create/${type}/${firstStep(type)}`);
	}

	return {
		...data,
		type,
		step: params.step
	};
};
