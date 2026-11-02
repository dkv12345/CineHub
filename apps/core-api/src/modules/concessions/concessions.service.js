import { prisma } from '@cinehub/db';

export async function listConcessions({ chain, cinemaCode }) {
  const [cinema, rows] = await Promise.all([
    cinemaCode
      ? prisma.cinema.findFirst({
          where: { externalId: cinemaCode, chain: { code: chain }, isActive: true },
          select: { id: true },
        })
      : null,
    prisma.concession.findMany({
      where: { isActive: true, chain: { code: chain } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    }),
  ]);

  return rows.filter((concession) => {
    if (cinemaCode) {
      if (concession.cinemaId && concession.cinemaId !== cinema?.id) return false;
      const appliesTo = Array.isArray(concession.cinemaApply) ? concession.cinemaApply : [];
      if (appliesTo.length > 0 && !appliesTo.includes(cinemaCode)) return false;
    }
    return true;
  });
}

export const toConcessionDto = (concession) => ({
  id: concession.id,
  externalId: concession.externalId,
  name: concession.name,
  description: concession.description,
  category: concession.category,
  imageUrl: concession.imageUrl,
  price: concession.price,
  minSeats: concession.minSeats,
  maxSeats: concession.maxSeats,
  sortOrder: concession.sortOrder,
});
