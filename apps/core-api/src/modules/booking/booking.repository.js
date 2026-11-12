import { createHash } from 'node:crypto';
import { prisma } from '@cinehub/db';

const ROW_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const CELL = 40;
const AISLE_GAP = 24;

const LAYOUTS = {
  STD_10x14: {
    cols: 14,
    aisleAfter: 7,
    bands: [
      ['STANDARD', 4],
      ['VIP', 5],
      ['SWEETBOX', 1],
    ],
  },
  IMAX_12x16: {
    cols: 16,
    aisleAfter: 8,
    bands: [
      ['STANDARD', 4],
      ['VIP', 8],
    ],
  },
  FOURDX_6x10: {
    cols: 10,
    aisleAfter: 5,
    bands: [['VIP', 6]],
  },
  VIP_5x8: {
    cols: 8,
    aisleAfter: null,
    bands: [['VIP', 5]],
  },
  KIDS_6x10: {
    cols: 10,
    aisleAfter: 5,
    bands: [['STANDARD', 6]],
  },
};

export function pickLayoutCode({ name = '', tier, defaultFormat } = {}) {
  if (defaultFormat === 'IMAX' || /imax/i.test(name)) return 'IMAX_12x16';
  if (defaultFormat === 'FOUR_DX' || /4dx/i.test(name)) return 'FOURDX_6x10';
  if (tier === 'KIDS' || /kids/i.test(name)) return 'KIDS_6x10';
  if (tier === 'VIP' || /vip|aqualis|laurus|lagom|romantico|harbor/i.test(name)) return 'VIP_5x8';
  return 'STD_10x14';
}

export function generateSeats(layoutCode) {
  const layout = LAYOUTS[layoutCode] || LAYOUTS.STD_10x14;
  const seats = [];
  let rowIndex = 0;

  for (const [seatTypeCode, rowCount] of layout.bands) {
    for (let r = 0; r < rowCount; r++, rowIndex++) {
      const rowLabel = ROW_LETTERS[rowIndex];
      const posY = rowIndex * CELL;

      if (seatTypeCode === 'SWEETBOX') {
        for (let col = 1; col + 1 <= layout.cols; col += 2) {
          seats.push({
            rowLabel,
            colNumber: col,
            label: `${rowLabel}${col}-${col + 1}`,
            seatTypeCode,
            colSpan: 2,
            posX: (col - 1) * CELL,
            posY,
          });
        }
      } else {
        for (let col = 1; col <= layout.cols; col++) {
          const gap = layout.aisleAfter && col > layout.aisleAfter ? AISLE_GAP : 0;
          seats.push({
            rowLabel,
            colNumber: col,
            label: `${rowLabel}${col}`,
            seatTypeCode,
            colSpan: 1,
            posX: (col - 1) * CELL + gap,
            posY,
          });
        }
      }
    }
  }
  return seats;
}

/**
 * Generates a unique human-readable booking code: CH + yymmdd + 6 uppercase alphanumeric chars
 */
export function generateBookingCode(now = new Date()) {
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `CH${yy}${mm}${dd}${suffix}`;
}

/**
 * Ensures SeatType and TicketType baseline records exist in MySQL.
 */
export async function ensureBaseTypes() {
  const [seatTypes, ticketTypes] = await Promise.all([
    prisma.seatType.findMany(),
    prisma.ticketType.findMany(),
  ]);

  const seatTypeMap = new Map(seatTypes.map((st) => [st.code, st]));
  const ticketTypeMap = new Map(ticketTypes.map((tt) => [tt.code, tt]));

  if (!seatTypeMap.has('STANDARD')) {
    const st = await prisma.seatType.upsert({
      where: { code: 'STANDARD' },
      update: {},
      create: { code: 'STANDARD', name: 'Ghế tiêu chuẩn', colorHex: '#4b5563', capacity: 1 },
    });
    seatTypeMap.set('STANDARD', st);
  }
  if (!seatTypeMap.has('VIP')) {
    const st = await prisma.seatType.upsert({
      where: { code: 'VIP' },
      update: {},
      create: { code: 'VIP', name: 'Ghế VIP', colorHex: '#eab308', capacity: 1 },
    });
    seatTypeMap.set('VIP', st);
  }
  if (!seatTypeMap.has('SWEETBOX')) {
    const st = await prisma.seatType.upsert({
      where: { code: 'SWEETBOX' },
      update: {},
      create: { code: 'SWEETBOX', name: 'Ghế đôi Sweetbox', colorHex: '#ec4899', capacity: 2 },
    });
    seatTypeMap.set('SWEETBOX', st);
  }

  if (!ticketTypeMap.has('ADULT')) {
    const tt = await prisma.ticketType.upsert({
      where: { code: 'ADULT' },
      update: {},
      create: { code: 'ADULT', name: 'Người lớn', sortOrder: 1 },
    });
    ticketTypeMap.set('ADULT', tt);
  }
  if (!ticketTypeMap.has('STUDENT')) {
    const tt = await prisma.ticketType.upsert({
      where: { code: 'STUDENT' },
      update: {},
      create: { code: 'STUDENT', name: 'HSSV', sortOrder: 2 },
    });
    ticketTypeMap.set('STUDENT', tt);
  }

  return { seatTypeMap, ticketTypeMap };
}

/**
 * Resolves a showtime by UUID `id`, Galaxy `externalId`, or composite frontend key,
 * and lazily initializes `Auditorium.seats`, `ShowtimePrice`, and `ShowtimeSeat` in MySQL
 * if they do not exist yet.
 */
export async function resolveOrEnsureShowtime(rawShowtimeId, metadata = {}) {
  const cleanId = String(rawShowtimeId || '').trim();
  const { seatTypeMap, ticketTypeMap } = await ensureBaseTypes();

  let showtime = await prisma.showtime.findFirst({
    where: {
      OR: [{ id: cleanId }, { externalId: cleanId }],
    },
    include: {
      movie: true,
      cinema: { include: { chain: true } },
      auditorium: true,
      prices: { include: { seatType: true, ticketType: true } },
    },
  });

  // If showtime does not exist yet in MySQL (e.g. live Galaxy session not yet synced or composite key)
  if (!showtime) {
    const parts = cleanId.split('__');
    const movieHint = metadata.movieId || parts[0] || '';
    const cinemaHint = metadata.cinemaId || metadata.cinemaCode || parts[1] || '';
    const showTimeHint = metadata.showTime || parts[2] || '19:30';
    const showDateHint = metadata.showDate || new Date().toISOString().slice(0, 10);

    let movie =
      (movieHint
        ? await prisma.movie.findFirst({
            where: {
              OR: [
                { id: movieHint },
                { slug: movieHint },
                { title: { contains: metadata.movieTitle || movieHint } },
                { sources: { some: { externalId: movieHint } } },
              ],
            },
          })
        : null) || (await prisma.movie.findFirst({ orderBy: { createdAt: 'desc' } }));

    let cinema =
      (cinemaHint
        ? await prisma.cinema.findFirst({
            where: {
              OR: [
                { id: cinemaHint },
                { externalId: cinemaHint },
                { slug: cinemaHint },
                { name: { contains: metadata.cinemaName || cinemaHint } },
              ],
            },
            include: { chain: true },
          })
        : null) ||
      (await prisma.cinema.findFirst({
        include: { chain: true },
        orderBy: { sortOrder: 'asc' },
      }));

    // Create fallback chain/province/cinema/movie if DB was completely empty
    if (!cinema) {
      const chain = await prisma.cinemaChain.upsert({
        where: { code: 'GALAXY' },
        update: {},
        create: { code: 'GALAXY', name: 'Galaxy Cinema' },
      });
      const province = await prisma.province.upsert({
        where: { code: 'HCM' },
        update: {},
        create: { code: 'HCM', name: 'TP. Hồ Chí Minh', nameNormalized: 'ho chi minh' },
      });
      cinema = await prisma.cinema.create({
        data: {
          chainId: chain.id,
          externalId: cinemaHint || '1001',
          name: metadata.cinemaName || 'Galaxy Nguyễn Du',
          address: '116 Nguyễn Du, Quận 1, TP.HCM',
          provinceId: province.id,
        },
        include: { chain: true },
      });
    }

    if (!movie) {
      movie = await prisma.movie.create({
        data: {
          slug: `cinehub-movie-${Date.now()}`,
          title: metadata.movieTitle || 'Phim Điện Ảnh CineHub',
          titleNormalized: 'phim dien anh cinehub',
          durationMin: 120,
          status: 'NOW_SHOWING',
          ageRating: 'T13',
        },
      });
    }

    const screenName = metadata.screenName || 'RAP 1';
    const auditorium = await prisma.auditorium.upsert({
      where: {
        cinemaId_name: {
          cinemaId: cinema.id,
          name: screenName,
        },
      },
      update: {},
      create: {
        cinemaId: cinema.id,
        name: screenName,
        tier: 'STANDARD',
        defaultFormat: 'TWO_D',
        layoutCode: 'STD_10x14',
        totalSeats: 133,
        totalCapacity: 140,
      },
    });

    const [hh, mm] = String(showTimeHint).split(':').map(Number);
    const baseDate = /^\d{4}-\d{2}-\d{2}$/.test(showDateHint)
      ? showDateHint
      : new Date().toISOString().slice(0, 10);
    const [yr, mo, dy] = baseDate.split('-').map(Number);
    const startTime = new Date(
      Date.UTC(
        yr || 2026,
        (mo || 1) - 1,
        dy || 1,
        (Number.isFinite(hh) ? hh : 19) - 7,
        Number.isFinite(mm) ? mm : 30,
      ),
    );
    const endTime = new Date(startTime.getTime() + ((movie.durationMin || 120) + 15) * 60_000);
    const dedupKey = createHash('sha1')
      .update(`CINEHUB:${cinema.id}:${movie.id}:${cleanId}`)
      .digest('hex');

    try {
      showtime = await prisma.showtime.create({
        data: {
          movieId: movie.id,
          cinemaId: cinema.id,
          auditoriumId: auditorium.id,
          externalId: cleanId.slice(0, 100),
          dedupKey,
          startTime,
          endTime,
          localDate: new Date(`${baseDate}T00:00:00.000Z`),
          format: 'TWO_D',
          formatRaw: metadata.format || '2D Phụ Đề',
          status: 'OPEN',
        },
        include: {
          movie: true,
          cinema: { include: { chain: true } },
          auditorium: true,
          prices: { include: { seatType: true, ticketType: true } },
        },
      });
    } catch {
      showtime = await prisma.showtime.findFirst({
        where: {
          OR: [{ externalId: cleanId.slice(0, 100) }, { dedupKey }],
        },
        include: {
          movie: true,
          cinema: { include: { chain: true } },
          auditorium: true,
          prices: { include: { seatType: true, ticketType: true } },
        },
      });
    }
  }

  // Ensure Auditorium has physical Seat rows
  let auditoriumSeats = await prisma.seat.findMany({
    where: { auditoriumId: showtime.auditoriumId, isActive: true },
    include: { seatType: true },
    orderBy: [{ posY: 'asc' }, { colNumber: 'asc' }],
  });

  if (auditoriumSeats.length === 0) {
    const layoutCode = showtime.auditorium.layoutCode || pickLayoutCode(showtime.auditorium);
    const planned = generateSeats(layoutCode);
    await prisma.seat.createMany({
      data: planned.map(({ seatTypeCode, ...s }) => ({
        ...s,
        auditoriumId: showtime.auditoriumId,
        seatTypeId: seatTypeMap.get(seatTypeCode)?.id || seatTypeMap.get('STANDARD').id,
      })),
      skipDuplicates: true,
    });
    auditoriumSeats = await prisma.seat.findMany({
      where: { auditoriumId: showtime.auditoriumId, isActive: true },
      include: { seatType: true },
      orderBy: [{ posY: 'asc' }, { colNumber: 'asc' }],
    });
  }

  // Ensure ShowtimePrice rows exist for this showtime
  if (!showtime.prices || showtime.prices.length === 0) {
    const defaultPrices = [
      { seatTypeCode: 'STANDARD', ticketTypeCode: 'ADULT', price: 85000 },
      { seatTypeCode: 'STANDARD', ticketTypeCode: 'STUDENT', price: 70000 },
      { seatTypeCode: 'VIP', ticketTypeCode: 'ADULT', price: 105000 },
      { seatTypeCode: 'VIP', ticketTypeCode: 'STUDENT', price: 90000 },
      { seatTypeCode: 'SWEETBOX', ticketTypeCode: 'ADULT', price: 190000 },
    ];
    for (const dp of defaultPrices) {
      const st = seatTypeMap.get(dp.seatTypeCode);
      const tt = ticketTypeMap.get(dp.ticketTypeCode);
      if (st && tt) {
        await prisma.showtimePrice.upsert({
          where: {
            showtimeId_seatTypeId_ticketTypeId: {
              showtimeId: showtime.id,
              seatTypeId: st.id,
              ticketTypeId: tt.id,
            },
          },
          update: {},
          create: {
            showtimeId: showtime.id,
            seatTypeId: st.id,
            ticketTypeId: tt.id,
            price: dp.price,
            source: 'DEFAULT',
          },
        });
      }
    }
    showtime.prices = await prisma.showtimePrice.findMany({
      where: { showtimeId: showtime.id },
      include: { seatType: true, ticketType: true },
    });
  }

  // Ensure ShowtimeSeat rows exist for this showtime
  let showtimeSeats = await prisma.showtimeSeat.findMany({
    where: { showtimeId: showtime.id },
    include: {
      seat: { include: { seatType: true } },
      heldByBooking: { select: { id: true, userId: true, expiresAt: true, status: true } },
    },
  });

  if (showtimeSeats.length < auditoriumSeats.length) {
    // Deterministic initial seeded sold seats (approx 10% of seats), keeping row E and F center (E4..E10, F4..F10) always AVAILABLE for demos!
    let hash = 17;
    for (const ch of showtime.id) {
      hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    }

    const demoProtectedLabels = new Set([
      'E4',
      'E5',
      'E6',
      'E7',
      'E8',
      'E9',
      'E10',
      'F4',
      'F5',
      'F6',
      'F7',
      'F8',
      'F9',
      'F10',
      'G5',
      'G6',
      'G7',
      'G8',
    ]);

    const createData = auditoriumSeats.map((seat, idx) => {
      const isProtected = demoProtectedLabels.has(seat.label);
      const isSeededSold = !isProtected && (idx * 13 + seat.colNumber * 7 + (hash % 19)) % 15 === 0;
      return {
        showtimeId: showtime.id,
        seatId: seat.id,
        status: isSeededSold ? 'SOLD' : 'AVAILABLE',
        isSeeded: isSeededSold,
        version: 0,
      };
    });

    await prisma.showtimeSeat.createMany({
      data: createData,
      skipDuplicates: true,
    });

    showtimeSeats = await prisma.showtimeSeat.findMany({
      where: { showtimeId: showtime.id },
      include: {
        seat: { include: { seatType: true } },
        heldByBooking: { select: { id: true, userId: true, expiresAt: true, status: true } },
      },
    });
  }

  return { showtime, showtimeSeats, seatTypeMap, ticketTypeMap };
}
