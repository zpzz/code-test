import { prisma } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	const applicantId = cookies.get('applicantId');
	// 直接查数据库中所有的申请，不筛选！
	const applications = await prisma.application.findMany({
		orderBy: { createdAt: 'desc' },
		where: {
			applicantId,
		}
	});

	return {
		applications: applications.map((app) => ({
			...app,
			fields: JSON.parse(app.fields)
		}))
	};
};
