import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prisma } from '../src/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jsonPath = path.resolve(__dirname, '../../../data/seed/galaxy_normalized_v3.json');

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🌱 CineHub Database Full Seeder (Galaxy Cinema & CineHub Core)');
  console.log('═══════════════════════════════════════════════════════════════');

  // 1. Seat Types
  console.log('1️⃣  Seeding Seat Types...');
  const seatTypes = [
    { code: 'STANDARD', name: 'Ghế tiêu chuẩn', colorHex: '#4b5563', capacity: 1 },
    { code: 'VIP', name: 'Ghế VIP', colorHex: '#eab308', capacity: 1 },
    { code: 'SWEETBOX', name: 'Ghế đôi Sweetbox', colorHex: '#ec4899', capacity: 2 },
  ];
  const seatTypeMap = new Map();
  for (const st of seatTypes) {
    const s = await prisma.seatType.upsert({
      where: { code: st.code },
      update: { name: st.name, colorHex: st.colorHex, capacity: st.capacity },
      create: st,
    });
    seatTypeMap.set(st.code, s);
  }

  // 2. Ticket Types
  console.log('2️⃣  Seeding Ticket Types...');
  const ticketTypes = [
    { code: 'ADULT', name: 'Người lớn', sortOrder: 1 },
    { code: 'STUDENT', name: 'HSSV', sortOrder: 2 },
    { code: 'CHILD', name: 'Trẻ em', sortOrder: 3 },
    { code: 'MEMBER', name: 'Thành viên', sortOrder: 4 },
  ];
  const ticketTypeMap = new Map();
  for (const tt of ticketTypes) {
    const t = await prisma.ticketType.upsert({
      where: { code: tt.code },
      update: { name: tt.name, sortOrder: tt.sortOrder },
      create: tt,
    });
    ticketTypeMap.set(tt.code, t);
  }

  // 3. Cinema Chains
  console.log('3️⃣  Seeding Cinema Chains...');
  const chains = [
    {
      code: 'GALAXY',
      name: 'Galaxy Cinema',
      logoUrl: 'https://www.galaxycine.vn/media/logo.png',
      websiteUrl: 'https://www.galaxycine.vn',
    },
    {
      code: 'CGV',
      name: 'CGV Cinemas',
      logoUrl: 'https://www.cgv.vn/skin/frontend/cgv/default/images/cgvlogo.png',
      websiteUrl: 'https://www.cgv.vn',
    },
    {
      code: 'LOTTE',
      name: 'Lotte Cinema',
      logoUrl: 'https://lottecinemavn.com/logo.png',
      websiteUrl: 'https://lottecinemavn.com',
    },
    {
      code: 'BHD',
      name: 'BHD Star Cineplex',
      logoUrl: 'https://bhdstar.vn/logo.png',
      websiteUrl: 'https://bhdstar.vn',
    },
  ];
  const chainMap = new Map();
  for (const c of chains) {
    const row = await prisma.cinemaChain.upsert({
      where: { code: c.code },
      update: { name: c.name, logoUrl: c.logoUrl, websiteUrl: c.websiteUrl },
      create: c,
    });
    chainMap.set(c.code, row);
  }
  const galaxyChain = chainMap.get('GALAXY');

  // Load normalized data file if present
  let data = null;
  if (fs.existsSync(jsonPath)) {
    console.log(`📂 Loaded normalized dataset from: ${jsonPath}`);
    data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  }

  if (data) {
    // 4. Provinces & Wards
    console.log(
      `4️⃣  Seeding ${data.provinces?.length || 0} Provinces & ${data.wards?.length || 0} Wards...`,
    );
    const provinceMap = new Map();
    for (const p of data.provinces || []) {
      const row = await prisma.province.upsert({
        where: { code: p.code },
        update: { name: p.name, nameNormalized: p.nameNormalized },
        create: { code: p.code, name: p.name, nameNormalized: p.nameNormalized },
      });
      provinceMap.set(p.code, row);
    }

    const wardMap = new Map();
    for (const w of data.wards || []) {
      const prov = provinceMap.get(w.provinceCode);
      if (!prov) continue;
      const row = await prisma.ward.upsert({
        where: { provinceId_name: { provinceId: prov.id, name: w.name } },
        update: {},
        create: { provinceId: prov.id, name: w.name },
      });
      wardMap.set(`${w.provinceCode}:${w.name}`, row);
    }

    // 5. Cinemas & Auditoriums
    console.log(
      `5️⃣  Seeding ${data.cinemas?.length || 0} Cinemas & ${data.auditoriums?.length || 0} Auditoriums...`,
    );
    const cinemaMap = new Map();
    for (const c of data.cinemas || []) {
      const prov = provinceMap.get(c.provinceCode) || Array.from(provinceMap.values())[0];
      const ward = c.wardName ? wardMap.get(`${c.provinceCode}:${c.wardName}`) : null;

      const row = await prisma.cinema.upsert({
        where: { chainId_externalId: { chainId: galaxyChain.id, externalId: c.externalId } },
        update: {
          name: c.name,
          slug: c.slug,
          address: c.address,
          phone: c.phone,
          latitude: c.latitude ? Number(c.latitude) : null,
          longitude: c.longitude ? Number(c.longitude) : null,
          sourceCityId: c.sourceCityId,
          sourceUrl: c.sourceUrl,
          imageUrl: c.imageUrl,
          thumbnailUrl: c.thumbnailUrl,
          galleryUrls: c.galleryUrls || [],
          sortOrder: c.sortOrder ?? 99,
          provinceId: prov.id,
          wardId: ward?.id ?? null,
        },
        create: {
          chainId: galaxyChain.id,
          externalId: c.externalId,
          name: c.name,
          slug: c.slug,
          address: c.address,
          phone: c.phone,
          latitude: c.latitude ? Number(c.latitude) : null,
          longitude: c.longitude ? Number(c.longitude) : null,
          sourceCityId: c.sourceCityId,
          sourceUrl: c.sourceUrl,
          imageUrl: c.imageUrl,
          thumbnailUrl: c.thumbnailUrl,
          galleryUrls: c.galleryUrls || [],
          sortOrder: c.sortOrder ?? 99,
          provinceId: prov.id,
          wardId: ward?.id ?? null,
        },
      });
      cinemaMap.set(c.externalId, row);
    }

    const auditoriumMap = new Map();
    for (const a of data.auditoriums || []) {
      const cinema = cinemaMap.get(a.cinemaExternalId);
      if (!cinema) continue;

      const row = await prisma.auditorium.upsert({
        where: { cinemaId_name: { cinemaId: cinema.id, name: a.name } },
        update: {
          tier: a.tier || 'STANDARD',
          defaultFormat: a.defaultFormat || 'TWO_D',
          totalSeats: a.totalSeats || 133,
          totalCapacity: a.totalCapacity || 140,
          layoutCode: a.layoutCode || 'STD_10x14',
          isLayoutMock: true,
        },
        create: {
          cinemaId: cinema.id,
          name: a.name,
          tier: a.tier || 'STANDARD',
          defaultFormat: a.defaultFormat || 'TWO_D',
          totalSeats: a.totalSeats || 133,
          totalCapacity: a.totalCapacity || 140,
          layoutCode: a.layoutCode || 'STD_10x14',
          isLayoutMock: true,
        },
      });
      auditoriumMap.set(`${a.cinemaExternalId}:${a.name}`, row);
    }

    // 6. Genres & Persons
    console.log(
      `6️⃣  Seeding ${data.genres?.length || 0} Genres & ${data.persons?.length || 0} Persons...`,
    );
    const genreMap = new Map();
    for (const g of data.genres || []) {
      const row = await prisma.genre.upsert({
        where: { slug: g.slug },
        update: { name: g.name },
        create: { slug: g.slug, name: g.name },
      });
      genreMap.set(g.slug, row);
    }

    const personMap = new Map();
    for (const p of data.persons || []) {
      const row = await prisma.person.upsert({
        where: { nameNormalized: p.nameNormalized },
        update: { fullName: p.fullName, photoUrl: p.photoUrl },
        create: { fullName: p.fullName, nameNormalized: p.nameNormalized, photoUrl: p.photoUrl },
      });
      personMap.set(p.nameNormalized, row);
    }

    // 7. Movies, Credits, Sources
    console.log(`7️⃣  Seeding ${data.movies?.length || 0} Movies...`);
    const movieMap = new Map();
    for (const m of data.movies || []) {
      const start = m.releaseDate ? new Date(m.releaseDate) : null;
      const end = m.endDate ? new Date(m.endDate) : null;

      const row = await prisma.movie.upsert({
        where: { slug: m.slug },
        update: {
          title: m.title,
          titleNormalized: m.titleNormalized,
          durationMin: m.durationMin || null,
          releaseDate: start,
          releaseYear: m.releaseYear || start?.getFullYear() || 2026,
          endDate: end,
          ageRating: m.ageRating || 'T13',
          status: m.status || 'NOW_SHOWING',
          posterUrl: m.posterUrl,
          backdropUrl: m.backdropUrl,
          trailerUrl: m.trailerUrl,
          language: m.language,
          country: m.country,
          synopsis: m.synopsis,
        },
        create: {
          slug: m.slug,
          title: m.title,
          titleNormalized: m.titleNormalized,
          durationMin: m.durationMin || null,
          releaseDate: start,
          releaseYear: m.releaseYear || start?.getFullYear() || 2026,
          endDate: end,
          ageRating: m.ageRating || 'T13',
          status: m.status || 'NOW_SHOWING',
          posterUrl: m.posterUrl,
          backdropUrl: m.backdropUrl,
          trailerUrl: m.trailerUrl,
          language: m.language,
          country: m.country,
          synopsis: m.synopsis,
        },
      });
      movieMap.set(m.externalId, row);
    }

    // Movie Genres
    for (const mg of data.movieGenres || []) {
      const movie = movieMap.get(mg.movieExternalId);
      const genre = genreMap.get(mg.genreSlug);
      if (movie && genre) {
        await prisma.movieGenre.upsert({
          where: { movieId_genreId: { movieId: movie.id, genreId: genre.id } },
          update: {},
          create: { movieId: movie.id, genreId: genre.id },
        });
      }
    }

    // Movie Credits
    for (const mc of data.movieCredits || []) {
      const movie = movieMap.get(mc.movieExternalId);
      const person = personMap.get(mc.personNameNormalized);
      if (movie && person) {
        await prisma.movieCredit.upsert({
          where: {
            movieId_personId_role: { movieId: movie.id, personId: person.id, role: mc.role },
          },
          update: { billingOrder: mc.billingOrder || 0, characterName: mc.characterName },
          create: {
            movieId: movie.id,
            personId: person.id,
            role: mc.role,
            billingOrder: mc.billingOrder || 0,
            characterName: mc.characterName,
          },
        });
      }
    }

    // Movie Sources
    for (const ms of data.movieSources || []) {
      const movie = movieMap.get(ms.movieExternalId);
      if (movie) {
        await prisma.movieSource.upsert({
          where: {
            chainId_externalId: { chainId: galaxyChain.id, externalId: ms.movieExternalId },
          },
          update: {
            sourceSlug: ms.sourceSlug,
            url: ms.url,
            sourceScore: ms.sourceScore ? Number(ms.sourceScore) : null,
            sourceScoreScale: ms.sourceScoreScale || 10,
            sourceVotes: ms.sourceVotes || null,
          },
          create: {
            movieId: movie.id,
            chainId: galaxyChain.id,
            externalId: ms.movieExternalId,
            sourceSlug: ms.sourceSlug,
            url: ms.url,
            sourceScore: ms.sourceScore ? Number(ms.sourceScore) : null,
            sourceScoreScale: ms.sourceScoreScale || 10,
            sourceVotes: ms.sourceVotes || null,
          },
        });
      }
    }

    // 8. Promotions
    console.log(`8️⃣  Seeding ${data.promotions?.length || 0} Promotions...`);
    for (const promo of data.promotions || []) {
      await prisma.promotion.upsert({
        where: { dedupKey: promo.dedupKey },
        update: {
          title: promo.title,
          imageUrl: promo.imageUrl,
          linkUrl: promo.linkUrl,
          sortOrder: promo.sortOrder || 0,
        },
        create: {
          chainId: galaxyChain.id,
          dedupKey: promo.dedupKey,
          title: promo.title,
          imageUrl: promo.imageUrl,
          linkUrl: promo.linkUrl,
          sortOrder: promo.sortOrder || 0,
        },
      });
    }

    // 9. Showtimes
    console.log(`9️⃣  Seeding ${data.showtimes?.length || 0} Showtimes...`);
    let showtimeCount = 0;
    for (const s of data.showtimes || []) {
      const cinema = cinemaMap.get(s.cinemaExternalId);
      const auditorium = auditoriumMap.get(`${s.cinemaExternalId}:${s.auditoriumName}`);
      const movie = movieMap.get(s.movieExternalId);

      if (!cinema || !auditorium || !movie) continue;

      await prisma.showtime.upsert({
        where: { cinemaId_externalId: { cinemaId: cinema.id, externalId: s.externalId } },
        update: {
          movieId: movie.id,
          auditoriumId: auditorium.id,
          dedupKey: s.dedupKey,
          startTime: new Date(s.startTime),
          endTime: new Date(s.endTime),
          localDate: new Date(`${s.localDate}T00:00:00Z`),
          format: s.format || 'TWO_D',
          formatRaw: s.formatRaw,
          versionCode: s.versionCode,
          kind: s.kind || 'REGULAR',
          captionMode: s.captionMode || 'SUBTITLED',
          status: s.status || 'SCHEDULED',
        },
        create: {
          cinemaId: cinema.id,
          externalId: s.externalId,
          movieId: movie.id,
          auditoriumId: auditorium.id,
          dedupKey: s.dedupKey,
          startTime: new Date(s.startTime),
          endTime: new Date(s.endTime),
          localDate: new Date(`${s.localDate}T00:00:00Z`),
          format: s.format || 'TWO_D',
          formatRaw: s.formatRaw,
          versionCode: s.versionCode,
          kind: s.kind || 'REGULAR',
          captionMode: s.captionMode || 'SUBTITLED',
          status: s.status || 'SCHEDULED',
        },
      });
      showtimeCount++;
    }
    console.log(`   -> Upserted ${showtimeCount} Showtimes successfully.`);
  }

  // 10. Price Rules
  console.log('🔟 Seeding Galaxy Price Rules Matrix...');
  const standardSeat = seatTypeMap.get('STANDARD');
  const vipSeat = seatTypeMap.get('VIP');
  const sweetboxSeat = seatTypeMap.get('SWEETBOX');

  const adultTicket = ticketTypeMap.get('ADULT');
  const studentTicket = ticketTypeMap.get('STUDENT');
  const childTicket = ticketTypeMap.get('CHILD');
  const memberTicket = ticketTypeMap.get('MEMBER');

  if (
    standardSeat &&
    vipSeat &&
    sweetboxSeat &&
    adultTicket &&
    studentTicket &&
    childTicket &&
    memberTicket
  ) {
    const rules = [
      // 2D STANDARD
      {
        format: 'TWO_D',
        roomTier: 'STANDARD',
        seatTypeId: standardSeat.id,
        ticketTypeId: adultTicket.id,
        dayType: 'WEEKDAY',
        price: 80000,
      },
      {
        format: 'TWO_D',
        roomTier: 'STANDARD',
        seatTypeId: standardSeat.id,
        ticketTypeId: studentTicket.id,
        dayType: 'WEEKDAY',
        price: 65000,
      },
      {
        format: 'TWO_D',
        roomTier: 'STANDARD',
        seatTypeId: standardSeat.id,
        ticketTypeId: childTicket.id,
        dayType: 'WEEKDAY',
        price: 60000,
      },
      {
        format: 'TWO_D',
        roomTier: 'STANDARD',
        seatTypeId: standardSeat.id,
        ticketTypeId: memberTicket.id,
        dayType: 'WEEKDAY',
        price: 75000,
      },
      {
        format: 'TWO_D',
        roomTier: 'STANDARD',
        seatTypeId: vipSeat.id,
        ticketTypeId: adultTicket.id,
        dayType: 'WEEKDAY',
        price: 95000,
      },
      {
        format: 'TWO_D',
        roomTier: 'STANDARD',
        seatTypeId: vipSeat.id,
        ticketTypeId: studentTicket.id,
        dayType: 'WEEKDAY',
        price: 80000,
      },
      {
        format: 'TWO_D',
        roomTier: 'STANDARD',
        seatTypeId: vipSeat.id,
        ticketTypeId: childTicket.id,
        dayType: 'WEEKDAY',
        price: 75000,
      },
      {
        format: 'TWO_D',
        roomTier: 'STANDARD',
        seatTypeId: vipSeat.id,
        ticketTypeId: memberTicket.id,
        dayType: 'WEEKDAY',
        price: 90000,
      },
      {
        format: 'TWO_D',
        roomTier: 'STANDARD',
        seatTypeId: sweetboxSeat.id,
        ticketTypeId: adultTicket.id,
        dayType: 'WEEKDAY',
        price: 180000,
      },
      {
        format: 'TWO_D',
        roomTier: 'STANDARD',
        seatTypeId: sweetboxSeat.id,
        ticketTypeId: studentTicket.id,
        dayType: 'WEEKDAY',
        price: 160000,
      },
      {
        format: 'TWO_D',
        roomTier: 'STANDARD',
        seatTypeId: sweetboxSeat.id,
        ticketTypeId: childTicket.id,
        dayType: 'WEEKDAY',
        price: 150000,
      },
      {
        format: 'TWO_D',
        roomTier: 'STANDARD',
        seatTypeId: sweetboxSeat.id,
        ticketTypeId: memberTicket.id,
        dayType: 'WEEKDAY',
        price: 170000,
      },

      // 2D WEEKEND
      {
        format: 'TWO_D',
        roomTier: 'STANDARD',
        seatTypeId: standardSeat.id,
        ticketTypeId: adultTicket.id,
        dayType: 'WEEKEND',
        price: 95000,
      },
      {
        format: 'TWO_D',
        roomTier: 'STANDARD',
        seatTypeId: standardSeat.id,
        ticketTypeId: studentTicket.id,
        dayType: 'WEEKEND',
        price: 80000,
      },
      {
        format: 'TWO_D',
        roomTier: 'STANDARD',
        seatTypeId: standardSeat.id,
        ticketTypeId: childTicket.id,
        dayType: 'WEEKEND',
        price: 75000,
      },
      {
        format: 'TWO_D',
        roomTier: 'STANDARD',
        seatTypeId: standardSeat.id,
        ticketTypeId: memberTicket.id,
        dayType: 'WEEKEND',
        price: 90000,
      },
      {
        format: 'TWO_D',
        roomTier: 'STANDARD',
        seatTypeId: vipSeat.id,
        ticketTypeId: adultTicket.id,
        dayType: 'WEEKEND',
        price: 110000,
      },
      {
        format: 'TWO_D',
        roomTier: 'STANDARD',
        seatTypeId: vipSeat.id,
        ticketTypeId: studentTicket.id,
        dayType: 'WEEKEND',
        price: 95000,
      },
      {
        format: 'TWO_D',
        roomTier: 'STANDARD',
        seatTypeId: vipSeat.id,
        ticketTypeId: childTicket.id,
        dayType: 'WEEKEND',
        price: 90000,
      },
      {
        format: 'TWO_D',
        roomTier: 'STANDARD',
        seatTypeId: vipSeat.id,
        ticketTypeId: memberTicket.id,
        dayType: 'WEEKEND',
        price: 105000,
      },
      {
        format: 'TWO_D',
        roomTier: 'STANDARD',
        seatTypeId: sweetboxSeat.id,
        ticketTypeId: adultTicket.id,
        dayType: 'WEEKEND',
        price: 210000,
      },
      {
        format: 'TWO_D',
        roomTier: 'STANDARD',
        seatTypeId: sweetboxSeat.id,
        ticketTypeId: studentTicket.id,
        dayType: 'WEEKEND',
        price: 190000,
      },
      {
        format: 'TWO_D',
        roomTier: 'STANDARD',
        seatTypeId: sweetboxSeat.id,
        ticketTypeId: childTicket.id,
        dayType: 'WEEKEND',
        price: 180000,
      },
      {
        format: 'TWO_D',
        roomTier: 'STANDARD',
        seatTypeId: sweetboxSeat.id,
        ticketTypeId: memberTicket.id,
        dayType: 'WEEKEND',
        price: 200000,
      },

      // IMAX
      {
        format: 'IMAX',
        roomTier: 'PREMIUM',
        seatTypeId: standardSeat.id,
        ticketTypeId: adultTicket.id,
        dayType: 'WEEKDAY',
        price: 140000,
      },
      {
        format: 'IMAX',
        roomTier: 'PREMIUM',
        seatTypeId: vipSeat.id,
        ticketTypeId: adultTicket.id,
        dayType: 'WEEKDAY',
        price: 160000,
      },
      {
        format: 'IMAX',
        roomTier: 'PREMIUM',
        seatTypeId: standardSeat.id,
        ticketTypeId: adultTicket.id,
        dayType: 'WEEKEND',
        price: 170000,
      },
      {
        format: 'IMAX',
        roomTier: 'PREMIUM',
        seatTypeId: vipSeat.id,
        ticketTypeId: adultTicket.id,
        dayType: 'WEEKEND',
        price: 190000,
      },
    ];

    for (const rule of rules) {
      await prisma.priceRule.upsert({
        where: {
          chainId_format_roomTier_seatTypeId_ticketTypeId_dayType: {
            chainId: galaxyChain.id,
            format: rule.format,
            roomTier: rule.roomTier,
            seatTypeId: rule.seatTypeId,
            ticketTypeId: rule.ticketTypeId,
            dayType: rule.dayType,
          },
        },
        update: { price: rule.price },
        create: {
          chainId: galaxyChain.id,
          format: rule.format,
          roomTier: rule.roomTier,
          seatTypeId: rule.seatTypeId,
          ticketTypeId: rule.ticketTypeId,
          dayType: rule.dayType,
          price: rule.price,
        },
      });
    }
  }

  // 11. Concessions & Vouchers
  console.log('1️⃣1️⃣ Seeding Concessions & Vouchers...');
  const concessions = [
    {
      name: 'Combo Solo Classic',
      description: '1 Bắp ngọt lớn (64oz) + 1 Nước ngọt (32oz)',
      category: 'COMBO',
      price: 85000,
      sortOrder: 1,
    },
    {
      name: 'Combo Couple Sweet',
      description: '1 Bắp phô mai lớn + 2 Nước ngọt (32oz)',
      category: 'COMBO',
      price: 120000,
      sortOrder: 2,
    },
    {
      name: 'Combo CineHub VIP Gold',
      description: '1 Bắp mix 2 vị + 2 Nước ép + 1 Snack khoai tây',
      category: 'COMBO',
      price: 165000,
      sortOrder: 3,
    },
    {
      name: 'Combo Family Party',
      description: '2 Bắp lớn + 4 Nước ngọt + 2 Xúc xích nướng',
      category: 'COMBO',
      price: 240000,
      sortOrder: 4,
    },
  ];
  for (const c of concessions) {
    const existing = await prisma.concession.findFirst({
      where: { chainId: galaxyChain.id, name: c.name },
    });
    if (!existing) {
      await prisma.concession.create({
        data: {
          chainId: galaxyChain.id,
          name: c.name,
          description: c.description,
          category: c.category,
          price: c.price,
          sortOrder: c.sortOrder,
        },
      });
    }
  }

  const vouchers = [
    {
      code: 'CINEHUB20',
      description: 'Giảm 20% tổng đơn hàng',
      type: 'PERCENT',
      value: 20,
      maxDiscount: 50000,
      minOrderAmount: 100000,
      startsAt: new Date('2026-01-01'),
      endsAt: new Date('2026-12-31'),
    },
    {
      code: 'CINEHUB50K',
      description: 'Giảm trực tiếp 50.000đ',
      type: 'FIXED',
      value: 50000,
      maxDiscount: 50000,
      minOrderAmount: 200000,
      startsAt: new Date('2026-01-01'),
      endsAt: new Date('2026-12-31'),
    },
  ];
  for (const v of vouchers) {
    await prisma.voucher.upsert({
      where: { code: v.code },
      update: {
        description: v.description,
        value: v.value,
        maxDiscount: v.maxDiscount,
        minOrderAmount: v.minOrderAmount,
      },
      create: v,
    });
  }

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('✅ CineHub database seeding finished successfully!');
  console.log('═══════════════════════════════════════════════════════════════');
}

main()
  .catch((e) => {
    console.error('❌ Error during database seed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
