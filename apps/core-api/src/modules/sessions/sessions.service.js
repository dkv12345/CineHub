import { prisma } from '@cinehub/db';

export async function listSessions() {
  const since = new Date(Date.now() - 24 * 3600 * 1000);
  const showtimes = await prisma.showtime.findMany({
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

  const result = showtimes.map((s, idx) => {
    const totalSeat = s.providerTotalSeats || 120 + ((idx * 13) % 70);
    const bookedSeat =
      s.providerBookedSeats || Math.floor(totalSeat * (0.15 + ((idx * 17) % 45) / 100));
    const showDate = s.localDate
      ? s.localDate.toISOString().slice(0, 10)
      : s.startTime.toISOString().slice(0, 10);
    const hours = String((s.startTime.getUTCHours() + 7) % 24).padStart(2, '0');
    const minutes = String(s.startTime.getUTCMinutes()).padStart(2, '0');
    const movieExtId = s.movie.sources?.[0]?.externalId || s.movie.id;

    return {
      id: s.externalId || s.id,
      showDate,
      showTime: `${hours}:${minutes}`,
      screenName: s.auditorium?.name || 'Screen 1',
      totalSeat,
      bookedSeat,
      caption: s.captionMode === 'DUBBED' ? 'voice' : 'sub',
      version: s.versionCode || '2d',
      movieFormat: s.formatRaw || '2D Phụ Đề',
      movie: {
        id: movieExtId,
        name: s.movie.title,
        age: (s.movie.ageRating || '13').replace('T', ''),
        duration: s.movie.durationMin || 115,
        startDate: s.movie.releaseDate
          ? `${s.movie.releaseDate.toISOString().slice(0, 10)} 00:00:00`
          : '',
        endDate: s.movie.endDate ? `${s.movie.endDate.toISOString().slice(0, 10)} 00:00:00` : '',
        createdAt: s.movie.createdAt ? s.movie.createdAt.toISOString() : '',
        imageLandscape: s.movie.backdropUrl || s.movie.posterUrl,
        imagePortrait: s.movie.posterUrl,
        slug: s.movie.slug,
        trailer: s.movie.trailerUrl || '',
        rate: Number(s.movie.ratingAvg) || 8.5,
        totalVotes: s.movie.ratingCount || 100,
        views: (s.movie.ratingCount || 100) * 8,
        order: idx,
      },
      cinema: {
        id: s.cinema.externalId || s.cinema.id,
        code: s.cinema.externalId || '',
        name: s.cinema.name,
        latitude: String(s.cinema.latitude || '10.773390'),
        longitude: String(s.cinema.longitude || '106.693290'),
        address: s.cinema.address,
        phone: s.cinema.phone || '1900 2224',
        cityId: s.cinema.sourceCityId || '',
        imageLandscape: s.cinema.imageUrl || '',
        imagePortrait: s.cinema.thumbnailUrl || '',
        imageUrls: s.cinema.galleryUrls || [],
        order: s.cinema.sortOrder || 0,
      },
    };
  });

  return {
    response: {
      status: 200,
      code: 0,
      message: 'OK',
      url: '/api/sessions',
    },
    data: {
      total: result.length,
      result,
    },
  };
}
