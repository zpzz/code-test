import { prisma } from '$lib/server/db';
import { isApplicationType, type ApplicationType } from '$lib/domain/applicationTypes';

export const load = async ({ cookies }) => {
  const allUsers = await prisma.user.findMany({
    orderBy: { employeeId: 'asc' }
  });

  return {
    allUsers,
    applicationType: isApplicationType(cookies.get('currentApplicationType') ?? '')
      ? (cookies.get('currentApplicationType') as ApplicationType)
      : 'travel'
  };
};
