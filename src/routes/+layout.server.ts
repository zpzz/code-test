import { prisma } from '$lib/server/db';

export const load = async () => {
  const allUsers = await prisma.user.findMany({
    orderBy: { employeeId: 'asc' }
  });

  return {
    allUsers
  };
};