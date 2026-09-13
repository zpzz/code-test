import { prisma } from '$lib/server/db';
import { isApplicationType, type ApplicationType } from '$lib/domain/applicationTypes';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	const storedType = cookies.get('currentApplicationType');
	const applicationType: ApplicationType = isApplicationType(storedType ?? '')
		? storedType
		: 'travel';
	const applications = await prisma.application.findMany({
		where: { type: applicationType },
		orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]
	});

	return {
		applicationType,
		applications: applications.map((application) => ({
			...application,
			fields: JSON.parse(application.fields)
		}))
	};
};
