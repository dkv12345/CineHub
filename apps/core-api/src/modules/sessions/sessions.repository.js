import { prisma } from '@cinehub/db';

export function findRecentAndUpcomingShowtimes(since) {
  return prisma.showtime.findMany({
    where: {
      startTime: { gte: since },
    },
    include: {
      movie: {
        include: {
          sources: true,
        },
      },
      cinema: true,
      auditorium: true,
    },
    orderBy: [{ startTime: 'asc' }],
    take: 6000,
  });
}
