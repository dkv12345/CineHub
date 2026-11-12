import { prisma } from '@cinehub/db';

export function findActiveCinemaByExternalId({ cinemaCode, chain }) {
  return prisma.cinema.findFirst({
    where: { externalId: cinemaCode, chain: { code: chain }, isActive: true },
    select: { id: true },
  });
}

export function findActiveCinemaById({ cinemaId, chain }) {
  return prisma.cinema.findFirst({
    where: { id: cinemaId, chain: { code: chain }, isActive: true },
    select: { id: true, externalId: true },
  });
}

export function findActiveConcessionsByChain(chain) {
  return prisma.concession.findMany({
    where: { isActive: true, chain: { code: chain } },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
}
