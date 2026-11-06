import { prisma } from '@cinehub/db';

export async function findRecentAndUpcomingShowtimes(since) {
  let showtimes = await prisma.showtime.findMany({
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

  // Self-healing fallback: nếu DB chưa có suất chiếu tương lai (do crawler chưa chạy hoặc ngày lệch),
  // tự động lấy các suất chiếu gần nhất có sẵn để đảm bảo hệ thống không bao giờ trả về danh sách trống.
  if (showtimes.length === 0) {
    showtimes = await prisma.showtime.findMany({
      include: {
        movie: {
          include: {
            sources: true,
          },
        },
        cinema: true,
        auditorium: true,
      },
      orderBy: [{ startTime: 'desc' }],
      take: 1000,
    });
  }

  return showtimes;
}
