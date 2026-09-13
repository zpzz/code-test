import { prisma } from '$lib/server/db';
import { isApplicationType, type ApplicationType } from '$lib/domain/applicationTypes';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	const applicantId = cookies.get('applicantId');
	const storedType = cookies.get('currentApplicationType');
	const applicationType: ApplicationType = isApplicationType(storedType ?? '')
		? (storedType as ApplicationType)
		: 'travel';
	const applications = await prisma.application.findMany({
		orderBy: { createdAt: 'desc' },
		where: {
			applicantId,
			type: applicationType
		}
	});

	return {
		applicationType,
		applications: applications.map((app) => ({
			...app,
			fields: JSON.parse(app.fields)
		}))
	};
};
