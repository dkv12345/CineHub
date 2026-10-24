import { prisma } from '@cinehub/db';

function formatDuration(min) {
  if (!min) return '1h 45m';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m > 0 ? `${m}m` : ''}` : `${m}m`;
}

function formatReleaseDate(d) {
  if (!d) return 'Đang chiếu';
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return 'Đang chiếu';
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  return `${day}/${month}/${year}`;
}

function getThemeKey(title, genres) {
  const g = (genres || '').toLowerCase();
  const t = (title || '').toLowerCase();
  if (t.includes('conan') || t.includes('trinh thám')) return 'conan';
  if (t.includes('doraemon') || t.includes('mèo mang mũ')) return 'doraemon';
  if (
    t.includes('suzume') ||
    t.includes('totoro') ||
    t.includes('ghibli') ||
    t.includes('shaun the sheep') ||
    t.includes('spy') ||
    t.includes('điệp viên')
  )
    return 'ghibli';
  if (
    t.includes('avengers') ||
    t.includes('dune') ||
    t.includes('godzilla') ||
    g.includes('viễn tưởng') ||
    g.includes('giả tưởng') ||
    t.includes('street fighter')
  )
    return 'space';
  if (
    g.includes('kinh dị') ||
    g.includes('quỷ') ||
    g.includes('vùng đất quỷ dữ') ||
    t.includes('hung tàn') ||
    t.includes('trấn yểm')
  )
    return 'noir';
  if (
    g.includes('hành động') ||
    g.includes('tội phạm') ||
    g.includes('giật gân') ||
    t.includes('trại buôn người')
  )
    return 'scarlet';
  if (
    g.includes('hài') ||
    g.includes('phiêu lưu') ||
    t.includes('quyết cua') ||
    t.includes('lên hương')
  )
    return 'western';
  if (
    t.includes('chung quỳ') ||
    t.includes('thần sư') ||
    t.includes('loạn thế') ||
    g.includes('võ hiệp') ||
    g.includes('cổ trang')
  )
    return 'china';
  if (
    t.includes('bts') ||
    t.includes('lalisa') ||
    t.includes('seventeen') ||
    t.includes('enhypen') ||
    t.includes('txt') ||
    g.includes('ca nhạc')
  )
    return 'korea';
  if (
    g.includes('tâm lý') ||
    g.includes('gia đình') ||
    g.includes('lãng mạn') ||
    g.includes('tình cảm')
  )
    return 'earth';
  return 'ocean';
}

export async function listMovies(query = {}) {
  const { status, search } = query;
  const where = {
    deletedAt: null,
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { titleNormalized: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const movies = await prisma.movie.findMany({
    where,
    include: {
      genres: { select: { genre: { select: { name: true, slug: true } } } },
      credits: {
        orderBy: { billingOrder: 'asc' },
        select: { role: true, person: { select: { fullName: true } } },
      },
      sources: { select: { externalId: true, sourceScore: true, sourceVotes: true } },
    },
    orderBy: [{ releaseDate: 'desc' }, { createdAt: 'desc' }],
  });

  return movies.map((m, idx) => {
    const genreNames = m.genres.map((g) => g.genre.name);
    const genresStr = genreNames.length > 0 ? genreNames.join(', ') : 'Hành động, Kịch tính';
    const directors = m.credits.filter((c) => c.role === 'DIRECTOR').map((c) => c.person.fullName);
    const cast = m.credits.filter((c) => c.role === 'ACTOR').map((c) => c.person.fullName);
    const source = m.sources[0];
    const rating = source?.sourceScore ? Number(source.sourceScore) : Number(m.ratingAvg) || 8.2;
    const votes = source?.sourceVotes ? Number(source.sourceVotes) : m.ratingCount || 150;
    const views = votes * 8 + idx * 133;
    const isNow = m.status === 'NOW_SHOWING';
    const externalId = source?.externalId || m.slug;

    return {
      id: externalId,
      dbId: m.id,
      title: m.title,
      genre: genresStr,
      duration: formatDuration(m.durationMin),
      durationMin: m.durationMin || 115,
      director: directors.length > 0 ? directors.join(', ') : 'Đang cập nhật',
      cast: cast.length > 0 ? cast.slice(0, 5).join(', ') : 'Đang cập nhật',
      age: m.ageRating || 'T13',
      rating: Number(rating.toFixed(1)),
      votes,
      views,
      poster:
        m.posterUrl ||
        'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=900&auto=format&fit=crop&q=80',
      backdrop:
        m.backdropUrl ||
        m.posterUrl ||
        'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1800&auto=format&fit=crop&q=80',
      status: isNow ? 'now' : 'soon',
      release: formatReleaseDate(m.releaseDate),
      startDate: m.releaseDate
        ? `${new Date(m.releaseDate).toISOString().slice(0, 10)} 00:00:00`
        : '2026-10-01 00:00:00',
      endDate: m.endDate
        ? `${new Date(m.endDate).toISOString().slice(0, 10)} 00:00:00`
        : '2026-12-31 00:00:00',
      slug: m.slug,
      trailer: m.trailerUrl || 'https://www.youtube.com/watch?v=NSrioJtAiEU',
      themeKey: getThemeKey(m.title, genresStr),
      country: m.country || 'Việt Nam',
      synopsis:
        m.synopsis ||
        'Bộ phim hấp dẫn mang đến những trải nghiệm điện ảnh đặc sắc tại các phòng chiếu hiện đại của CineHub.',
    };
  });
}

export async function getMovieById(id) {
  const movie = await prisma.movie.findFirst({
    where: {
      OR: [{ id }, { slug: id }, { sources: { some: { externalId: id } } }],
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      slug: true,
      synopsis: true,
      durationMin: true,
      ageRating: true,
      status: true,
      posterUrl: true,
      backdropUrl: true,
      trailerUrl: true,
      releaseDate: true,
      country: true,
      ratingAvg: true,
      ratingCount: true,
      genres: { select: { genre: { select: { name: true } } } },
      credits: {
        orderBy: { billingOrder: 'asc' },
        select: { role: true, person: { select: { fullName: true } } },
      },
      sources: { select: { externalId: true, sourceScore: true, sourceVotes: true } },
    },
  });

  if (!movie) return null;

  const genreNames = movie.genres.map(({ genre }) => genre.name);
  const genresStr = genreNames.length > 0 ? genreNames.join(', ') : 'Hành động, Kịch tính';
  const directors = movie.credits
    .filter(({ role }) => role === 'DIRECTOR')
    .map(({ person }) => person.fullName);
  const cast = movie.credits
    .filter(({ role }) => role === 'ACTOR')
    .map(({ person }) => person.fullName);
  const source = movie.sources[0];
  const externalId = source?.externalId || movie.slug;

  return {
    id: externalId,
    dbId: movie.id,
    title: movie.title,
    slug: movie.slug,
    synopsis: movie.synopsis,
    duration: formatDuration(movie.durationMin),
    durationMin: movie.durationMin,
    ageRating: movie.ageRating || 'T13',
    status: movie.status === 'NOW_SHOWING' ? 'now' : 'soon',
    poster: movie.posterUrl,
    posterUrl: movie.posterUrl,
    backdrop: movie.backdropUrl || movie.posterUrl,
    backdropUrl: movie.backdropUrl || movie.posterUrl,
    trailer: movie.trailerUrl,
    trailerUrl: movie.trailerUrl,
    release: formatReleaseDate(movie.releaseDate),
    releaseDate: movie.releaseDate,
    country: movie.country,
    rating: Number(source?.sourceScore || movie.ratingAvg || 8.5),
    ratingCount: source?.sourceVotes || movie.ratingCount || 100,
    genres: genreNames,
    genre: genresStr,
    directors,
    director: directors.join(', ') || 'Đang cập nhật',
    cast: cast.slice(0, 5).join(', ') || 'Đang cập nhật',
    themeKey: getThemeKey(movie.title, genresStr),
  };
}
