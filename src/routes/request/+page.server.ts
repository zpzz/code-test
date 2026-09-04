import { prisma } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  // 直接查数据库中所有的申请，不筛选！
  const applications = await prisma.application.findMany({
    orderBy: { createdAt: 'desc' }
  });

  return {
    applications: applications.map((app) => ({
      ...app,
      fields: JSON.parse(app.fields)
    }))
  };
};