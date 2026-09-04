import { prisma } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const applications = await prisma.application.findMany({
		orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]
	});

	return {
		applications: applications.map((application) => ({
			...application,
			fields: JSON.parse(application.fields)
		}))
	};
};
