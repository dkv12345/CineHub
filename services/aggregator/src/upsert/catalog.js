import { prisma } from '@cinehub/db';
import { normalize, parseAddress, cleanPhone, AGE_MAP } from '../adapters/galaxyAdapter.js';

const dateOnly = (s) => (s ? new Date(`${s.slice(0, 10)}T00:00:00Z`) : null);

function movieStatus(startDate, endDate, today = new Date()) {
  if (startDate && startDate > today) return 'COMING_SOON';
  if (endDate && endDate < today) return 'ENDED';
  return 'NOW_SHOWING';
}

export async function upsertCinema(chain, c) {
  const addr = parseAddress(c.address);
  const province = await prisma.province.findUnique({
    where: { nameNormalized: addr.provinceNormalized },
  });

  if (!province) {
    throw new Error(`Chưa có tỉnh "${addr.provinceNormalized}" trong seed (rạp ${c.code})`);
  }

  const ward = addr.ward
    ? await prisma.ward.upsert({
        where: { provinceId_name: { provinceId: province.id, name: addr.ward } },
        update: {},
        create: { provinceId: province.id, name: addr.ward },
      })
    : null;

  const data = {
    name: c.name.replace(/\s+/g, ' ').trim(),
    address: c.address.replace(/[\u200b\u00a0]/g, ' ').trim(),
    provinceId: province.id,
    wardId: ward?.id ?? null,
    latitude: c.latitude ? Number(c.latitude) : null,
    longitude: c.longitude ? Number(c.longitude) : null,
    phone: cleanPhone(c.phone),
    sourceCityId: c.cityId,
    imageUrl: c.imageLandscape,
    thumbnailUrl: c.imagePortrait,
    galleryUrls: c.imageUrls ?? [],
    sortOrder: c.order ?? 99,
    lastSyncedAt: new Date(),
  };

  return prisma.cinema.upsert({
    where: { chainId_externalId: { chainId: chain.id, externalId: c.code } },
    update: data,
    create: { chainId: chain.id, externalId: c.code, ...data },
  });
}

export async function upsertAuditorium(cinema, m) {
  const where = { cinemaId_name: { cinemaId: cinema.id, name: m.auditoriumName } };
  const existing = await prisma.auditorium.findUnique({ where });
  if (!existing) {
    return prisma.auditorium.create({
      data: {
        cinemaId: cinema.id,
        name: m.auditoriumName,
        tier: m.tier,
        defaultFormat: m.format,
      },
    });
  }

  if (m.tier !== 'STANDARD' && existing.tier !== m.tier) {
    return prisma.auditorium.update({
      where,
      data: { tier: m.tier, defaultFormat: m.format },
    });
  }

  return existing;
}

export async function upsertMovie(chain, mv) {
  const source = await prisma.movieSource.findUnique({
    where: { chainId_externalId: { chainId: chain.id, externalId: mv.id } },
  });

  const start = dateOnly(mv.startDate);
  const end = dateOnly(mv.endDate);
  const data = {
    title: mv.name,
    titleNormalized: normalize(mv.name),
    durationMin: mv.duration || null,
    releaseDate: start,
    releaseYear: start?.getUTCFullYear() ?? null,
    endDate: end,
    ageRating: AGE_MAP[mv.age] ?? null,
    status: movieStatus(start, end),
    posterUrl: mv.imagePortrait,
    backdropUrl: mv.imageLandscape,
    trailerUrl: /watch\?v=/.test(mv.trailer ?? '') ? mv.trailer : null,
  };

  const sourceData = {
    sourceSlug: mv.slug,
    url: `https://www.galaxycine.vn/dat-ve/${mv.slug}/`,
    sourceScore: mv.rate ?? null,
    sourceVotes: mv.totalVotes ?? null,
    lastSyncedAt: new Date(),
    lastSeenAt: new Date(),
  };

  if (source) {
    await prisma.movieSource.update({ where: { id: source.id }, data: sourceData });
    return prisma.movie.update({ where: { id: source.movieId }, data });
  }

  const exists = await prisma.movie.findUnique({ where: { slug: mv.slug } });
  const slug = exists ? `${mv.slug}-${start?.getUTCFullYear() ?? Date.now()}` : mv.slug;

  return prisma.movie.create({
    data: {
      slug,
      ...data,
      sources: {
        create: {
          chainId: chain.id,
          externalId: mv.id,
          ...sourceData,
        },
      },
    },
  });
}

export function upsertShowtime({ cinema, auditorium, movie }, m) {
  const data = {
    movieId: movie.id,
    auditoriumId: auditorium.id,
    dedupKey: m.dedupKey,
    startTime: m.startTime,
    endTime: m.endTime,
    localDate: dateOnly(m.localDate),
    format: m.format,
    formatRaw: m.formatRaw,
    versionCode: m.versionCode,
    kind: m.kind,
    captionMode: m.captionMode,
    audioLanguage: m.audioLanguage,
    subtitleLanguage: m.subtitleLanguage,
    providerTotalSeats: m.providerTotalSeats,
    providerBookedSeats: m.providerBookedSeats,
    lastSyncedAt: new Date(),
    lastSeenAt: new Date(),
  };

  return prisma.showtime.upsert({
    where: { cinemaId_externalId: { cinemaId: cinema.id, externalId: m.externalId } },
    update: data,
    create: { cinemaId: cinema.id, externalId: m.externalId, ...data },
  });
}
