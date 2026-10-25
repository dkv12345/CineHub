import { prisma } from '@cinehub/db';
import { normalize, parseAddress, cleanPhone, AGE_MAP } from '../adapters/galaxyAdapter.js';
import { fetchMovieDetail } from '../galaxyClient.js';

const dateOnly = (s) => (s ? new Date(`${s.slice(0, 10)}T00:00:00Z`) : null);

function cleanHtml(html) {
  if (!html) return '';
  return html
    .replace(/<br\s*[/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&agrave;/g, 'à')
    .replace(/&aacute;/g, 'á')
    .replace(/&acirc;/g, 'â')
    .replace(/&atilde;/g, 'ã')
    .replace(/&egrave;/g, 'è')
    .replace(/&eacute;/g, 'é')
    .replace(/&ecirc;/g, 'ê')
    .replace(/&igrave;/g, 'ì')
    .replace(/&iacute;/g, 'í')
    .replace(/&ograve;/g, 'ò')
    .replace(/&oacute;/g, 'ó')
    .replace(/&ocirc;/g, 'ô')
    .replace(/&otilde;/g, 'õ')
    .replace(/&ugrave;/g, 'ù')
    .replace(/&uacute;/g, 'ú')
    .replace(/&yacute;/g, 'ý')
    .replace(/&Agrave;/g, 'À')
    .replace(/&Aacute;/g, 'Á')
    .replace(/&Acirc;/g, 'Â')
    .replace(/&Atilde;/g, 'Ã')
    .replace(/&Egrave;/g, 'È')
    .replace(/&Eacute;/g, 'É')
    .replace(/&Ecirc;/g, 'Ê')
    .replace(/&Igrave;/g, 'Ì')
    .replace(/&Iacute;/g, 'Í')
    .replace(/&Ograve;/g, 'Ò')
    .replace(/&Oacute;/g, 'Ó')
    .replace(/&Ocirc;/g, 'Ô')
    .replace(/&Otilde;/g, 'Õ')
    .replace(/&Ugrave;/g, 'Ù')
    .replace(/&Uacute;/g, 'Ú')
    .replace(/&Yacute;/g, 'Ý')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&ldquo;/g, '“')
    .replace(/&rdquo;/g, '”')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function syncMovieDetails(movieId, externalId, slug) {
  try {
    const detail =
      (await fetchMovieDetail(externalId)) || (slug ? await fetchMovieDetail(slug) : null);
    if (!detail) return;

    const synopsis = cleanHtml(detail.description);
    if (synopsis || detail.country) {
      await prisma.movie.update({
        where: { id: movieId },
        data: {
          synopsis: synopsis || undefined,
          country: detail.country || undefined,
        },
      });
    }

    // Categories -> Genre & MovieGenre
    for (const cat of detail.categories || []) {
      const g = await prisma.genre.upsert({
        where: { slug: cat.slug },
        update: { name: cat.name },
        create: { slug: cat.slug, name: cat.name },
      });
      await prisma.movieGenre.upsert({
        where: { movieId_genreId: { movieId, genreId: g.id } },
        update: {},
        create: { movieId, genreId: g.id },
      });
    }

    // Directors -> Person & MovieCredit
    let dOrder = 0;
    for (const dir of detail.directors || []) {
      if (!dir.name) continue;
      const norm = normalize(dir.name);
      if (!norm) continue;
      const person = await prisma.person.upsert({
        where: { nameNormalized: norm },
        update: { fullName: dir.name, photoUrl: dir.imagePortrait || undefined },
        create: { fullName: dir.name, nameNormalized: norm, photoUrl: dir.imagePortrait || null },
      });
      await prisma.movieCredit.upsert({
        where: { movieId_personId_role: { movieId, personId: person.id, role: 'DIRECTOR' } },
        update: { billingOrder: dOrder },
        create: { movieId, personId: person.id, role: 'DIRECTOR', billingOrder: dOrder },
      });
      dOrder++;
    }

    // Actors -> Person & MovieCredit
    let aOrder = 0;
    for (const act of detail.actors || []) {
      if (!act.name) continue;
      const norm = normalize(act.name);
      if (!norm) continue;
      const person = await prisma.person.upsert({
        where: { nameNormalized: norm },
        update: { fullName: act.name, photoUrl: act.imagePortrait || undefined },
        create: { fullName: act.name, nameNormalized: norm, photoUrl: act.imagePortrait || null },
      });
      await prisma.movieCredit.upsert({
        where: { movieId_personId_role: { movieId, personId: person.id, role: 'ACTOR' } },
        update: { billingOrder: aOrder },
        create: { movieId, personId: person.id, role: 'ACTOR', billingOrder: aOrder },
      });
      aOrder++;
    }
  } catch (err) {
    console.warn(`[WARN] Failed to sync movie details for ${movieId}:`, err.message);
  }
}

function movieStatus(startDate, endDate, today = new Date()) {
  if (startDate && startDate > today) return 'COMING_SOON';
  if (endDate && endDate < today) return 'ENDED';
  return 'NOW_SHOWING';
}

export async function upsertCinema(chain, c) {
  const addr = parseAddress(c.address);
  let province = await prisma.province.findUnique({
    where: { nameNormalized: addr.provinceNormalized },
  });

  if (!province) {
    const code = addr.provinceNormalized.slice(0, 4).toUpperCase();
    const name = addr.provinceNormalized
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    province = await prisma.province.upsert({
      where: { code },
      update: {},
      create: {
        code,
        name,
        nameNormalized: addr.provinceNormalized,
      },
    });
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
    const updated = await prisma.movie.update({ where: { id: source.movieId }, data });
    if (!updated.synopsis) {
      await syncMovieDetails(updated.id, mv.id, mv.slug);
    }
    return updated;
  }

  const exists = await prisma.movie.findUnique({ where: { slug: mv.slug } });
  const slug = exists ? `${mv.slug}-${start?.getUTCFullYear() ?? Date.now()}` : mv.slug;

  const created = await prisma.movie.create({
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

  await syncMovieDetails(created.id, mv.id, mv.slug);
  return created;
}

export async function upsertShowtime({ cinema, auditorium, movie }, m) {
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

  const existing = await prisma.showtime.findFirst({
    where: {
      OR: [
        { cinemaId: cinema.id, externalId: m.externalId },
        { auditoriumId: auditorium.id, startTime: m.startTime },
        { dedupKey: m.dedupKey },
      ],
    },
  });

  if (existing) {
    return prisma.showtime.update({
      where: { id: existing.id },
      data: {
        cinemaId: cinema.id,
        externalId: m.externalId,
        ...data,
      },
    });
  }

  return prisma.showtime.create({
    data: {
      cinemaId: cinema.id,
      externalId: m.externalId,
      ...data,
    },
  });
}
