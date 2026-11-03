import { prisma } from '@cinehub/db';

export async function pingDatabase() {
  await prisma.$queryRaw`SELECT 1`;
  return true;
}
