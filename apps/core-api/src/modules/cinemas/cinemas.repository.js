import { prisma } from '@cinehub/db';

export async function findCinemasPage({ where, page, pageSize }) {
  const [rows, total] = await Promise.all([
    prisma.cinema.findMany({
      where,
      include: { chain: true, province: true, ward: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.cinema.count({ where }),
  ]);

  return { rows, total };
}
