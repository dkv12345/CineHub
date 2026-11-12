import { prisma } from '@cinehub/db';
import { MAX_SEATS_PER_BOOKING } from '@cinehub/contracts';
import { env } from '../../platform/config/env.js';
import { AppError } from '../../platform/utils/errors.js';
import { buildQr } from '../../platform/utils/qr.js';
import { logger } from '../../platform/observability/logger.js';
import {
  acquireSeatLeases,
  releaseSeatLeases,
  forceDeleteSeatLeases,
  getActiveSeatLeases,
} from '../../platform/cache/seat-lease.js';
import { generateBookingCode, resolveOrEnsureShowtime } from './booking.repository.js';
import { broadcastShowtimeSeatEvent } from './booking.realtime.js';

export const BOOKING_MODULE_STATUS = 'active';

function seatZoneFromCode(code) {
  const upper = String(code || '').toUpperCase();
  if (upper === 'SWEETBOX') return 'sweetbox';
  if (upper === 'VIP') return 'vip';
  return 'normal';
}

function buildFrontendLayout(showtime, showtimeSeats) {
  const maxRowIndex = showtimeSeats.reduce((max, ss) => {
    const r = (ss.seat.rowLabel?.charCodeAt(0) || 65) - 65;
    return Math.max(max, r);
  }, 9);
  const maxCol = showtimeSeats.reduce(
    (max, ss) => Math.max(max, ss.seat.colNumber + (ss.seat.colSpan - 1)),
    14,
  );
  const vipRows = showtimeSeats
    .filter((ss) => ss.seat.seatType?.code === 'VIP')
    .map((ss) => (ss.seat.rowLabel?.charCodeAt(0) || 65) - 65);
  const sweetboxSeats = showtimeSeats.filter((ss) => ss.seat.seatType?.code === 'SWEETBOX');
  const vipFromRow = vipRows.length ? Math.min(...vipRows) : 4;
  const sweetboxRow = sweetboxSeats.length
    ? (sweetboxSeats[0].seat.rowLabel?.charCodeAt(0) || 74) - 65
    : maxRowIndex;
  const sweetboxCols = sweetboxSeats.map((ss) => ss.seat.colNumber);

  return {
    rows: maxRowIndex + 1,
    columns: maxCol,
    aislesAfter: maxCol >= 16 ? [4, 12] : [Math.floor(maxCol / 2)],
    vipFromRow,
    sweetbox: {
      row: sweetboxRow,
      from: sweetboxCols.length ? Math.min(...sweetboxCols) : 1,
      to: sweetboxCols.length ? Math.max(...sweetboxCols) : maxCol,
    },
    style: `${showtime.cinema?.name || 'Galaxy Cinema'} · ${showtime.auditorium?.name || 'RAP 1'} · ${showtime.formatRaw || '2D'}`,
  };
}

/**
 * Checks whether the user's selected seats leave an isolated 1-seat gap (`BR-09`).
 */
export function checkOrphanSeatGap(showtimeSeats, selectedSeatLabels, viewerUserId) {
  const selectedSet = new Set(selectedSeatLabels);
  const byRow = new Map();

  for (const ss of showtimeSeats) {
    const row = ss.seat.rowLabel;
    if (!byRow.has(row)) byRow.set(row, []);
    byRow.get(row).push(ss);
  }

  for (const [, rowSeats] of byRow.entries()) {
    const hasSelectionInRow = rowSeats.some((ss) => selectedSet.has(ss.seat.label));
    if (!hasSelectionInRow) continue;

    const sorted = [...rowSeats].sort((a, b) => a.seat.colNumber - b.seat.colNumber);
    // Split row by physical aisle gaps (posX jump > 48px)
    const sections = [];
    let currentSection = [];
    for (let i = 0; i < sorted.length; i++) {
      if (
        i > 0 &&
        sorted[i].seat.posX - sorted[i - 1].seat.posX > 48 * (sorted[i - 1].seat.colSpan || 1)
      ) {
        sections.push(currentSection);
        currentSection = [];
      }
      currentSection.push(sorted[i]);
    }
    if (currentSection.length) sections.push(currentSection);

    for (const section of sections) {
      if (!section.some((ss) => selectedSet.has(ss.seat.label))) continue;

      const states = section.map((ss) => {
        if (selectedSet.has(ss.seat.label)) return 'SELECTED';
        const isHeldActive =
          ss.status === 'HELD' &&
          ss.heldUntil &&
          new Date(ss.heldUntil).getTime() > Date.now() &&
          ss.heldByBooking?.userId !== viewerUserId;
        if (ss.status === 'SOLD' || ss.status === 'BLOCKED' || isHeldActive) {
          return 'OCCUPIED';
        }
        return 'FREE';
      });

      const totalFreeInSection = states.filter((st) => st === 'FREE').length;
      if (totalFreeInSection <= 1) continue;

      let i = 0;
      while (i < states.length) {
        if (states[i] !== 'FREE') {
          i++;
          continue;
        }
        let j = i;
        while (j < states.length && states[j] === 'FREE') j++;
        const gapLen = j - i;
        if (gapLen === 1) {
          const leftState = i > 0 ? states[i - 1] : 'WALL';
          const rightState = j < states.length ? states[j] : 'WALL';
          if (leftState === 'SELECTED' || rightState === 'SELECTED') {
            return {
              hasOrphan: true,
              orphanSeatLabel: section[i].seat.label,
            };
          }
        }
        i = j;
      }
    }
  }

  return { hasOrphan: false, orphanSeatLabel: null };
}

/**
 * WS1: Returns the real seat map from MySQL merged with Redis leases, customized for the viewer.
 */
export async function getSeatMap(rawShowtimeId, viewerUserId = null, metadata = {}) {
  await sweepExpiredBookings();

  const { showtime, showtimeSeats } = await resolveOrEnsureShowtime(rawShowtimeId, metadata);
  const priceBySeatType = new Map();
  for (const p of showtime.prices || []) {
    if (p.ticketType?.code === 'ADULT' || !priceBySeatType.has(p.seatTypeId)) {
      priceBySeatType.set(p.seatTypeId, p.price);
    }
  }

  const allLabels = showtimeSeats.map((ss) => ss.seat.label);
  const redisLeases = await getActiveSeatLeases(showtime.id, allLabels);
  const now = Date.now();

  const seats = showtimeSeats
    .map((ss) => {
      const label = ss.seat.label;
      const redisLease = redisLeases.get(label);
      const dbHoldActive =
        ss.status === 'HELD' &&
        ss.heldUntil &&
        new Date(ss.heldUntil).getTime() > now &&
        ss.heldByBooking?.status === 'PENDING';

      let effectiveStatus = ss.status;
      let holderUserId = dbHoldActive ? ss.heldByBooking?.userId : null;

      if (effectiveStatus !== 'SOLD' && effectiveStatus !== 'BLOCKED') {
        if (dbHoldActive) {
          effectiveStatus = 'HELD';
        } else if (redisLease) {
          effectiveStatus = 'HELD';
          holderUserId = redisLease.userId;
        } else {
          effectiveStatus = 'AVAILABLE';
        }
      }

      const heldByViewer = Boolean(
        effectiveStatus === 'HELD' && viewerUserId && holderUserId === viewerUserId,
      );
      const heldByOther = Boolean(
        effectiveStatus === 'HELD' && (!viewerUserId || holderUserId !== viewerUserId),
      );
      const sold = effectiveStatus === 'SOLD' || effectiveStatus === 'BLOCKED';
      const zone = seatZoneFromCode(ss.seat.seatType?.code);
      const defaultPrice = zone === 'sweetbox' ? 190000 : zone === 'vip' ? 105000 : 85000;
      const price = priceBySeatType.get(ss.seat.seatTypeId) ?? defaultPrice;

      return {
        id: label,
        showtimeSeatId: ss.id,
        seatId: ss.seatId,
        row: ss.seat.rowLabel,
        rowIndex: (ss.seat.rowLabel?.charCodeAt(0) || 65) - 65,
        column: ss.seat.colNumber - 1,
        colSpan: ss.seat.colSpan || 1,
        zone,
        seatTypeCode: ss.seat.seatType?.code || 'STANDARD',
        price,
        status: effectiveStatus,
        sold,
        selected: heldByViewer,
        heldByViewer,
        heldByOther,
        heldUntil: dbHoldActive ? ss.heldUntil.toISOString() : null,
      };
    })
    .sort((a, b) => a.rowIndex - b.rowIndex || a.column - b.column);

  let activeHold = null;
  if (viewerUserId) {
    activeHold = await getCurrentHold({ showtimeId: showtime.id, userId: viewerUserId });
  }

  const layout = buildFrontendLayout(showtime, showtimeSeats);

  return {
    showtimeId: showtime.id,
    externalShowtimeId: showtime.externalId || rawShowtimeId,
    movie: {
      id: showtime.movie.id,
      title: showtime.movie.title,
      backdropUrl: showtime.movie.backdropUrl || showtime.movie.posterUrl || '',
      posterUrl: showtime.movie.posterUrl || '',
    },
    cinema: {
      id: showtime.cinema.id,
      code: showtime.cinema.externalId || '',
      name: showtime.cinema.name,
    },
    auditorium: {
      id: showtime.auditorium.id,
      name: showtime.auditorium.name,
      tier: showtime.auditorium.tier,
    },
    format: showtime.formatRaw || showtime.format,
    startTime: showtime.startTime.toISOString(),
    layout,
    seats,
    activeHold,
  };
}

/**
 * WS2: Retrieves the current user's active PENDING booking hold (for F5 session recovery).
 */
export async function getCurrentHold({ showtimeId, userId }) {
  if (!userId) return null;
  await sweepExpiredBookings();

  let targetShowtimeId = showtimeId;
  if (showtimeId) {
    const st = await prisma.showtime.findFirst({
      where: { OR: [{ id: showtimeId }, { externalId: showtimeId }] },
      select: { id: true },
    });
    if (st) targetShowtimeId = st.id;
  }

  const booking = await prisma.booking.findFirst({
    where: {
      userId,
      ...(targetShowtimeId ? { showtimeId: targetShowtimeId } : {}),
      status: 'PENDING',
      expiresAt: { gt: new Date() },
    },
    include: {
      seats: true,
      concessions: true,
      redemption: { include: { voucher: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!booking || booking.seats.length === 0) return null;

  const remainingSeconds = Math.max(
    0,
    Math.ceil((booking.expiresAt.getTime() - Date.now()) / 1000),
  );

  return {
    bookingId: booking.id,
    bookingCode: booking.code,
    showtimeId: booking.showtimeId,
    seatIds: booking.seats.map((s) => s.seatLabel),
    seats: booking.seats.map((s) => ({
      id: s.seatLabel,
      showtimeSeatId: s.showtimeSeatId,
      zone: seatZoneFromCode(s.seatTypeCode),
      price: s.price,
      ticketTypeCode: s.ticketTypeCode,
    })),
    concessions: booking.concessions.map((c) => ({
      concessionId: c.concessionId,
      name: c.nameSnapshot,
      quantity: c.quantity,
      unitPrice: c.unitPrice,
    })),
    voucherCode: booking.redemption?.voucher?.code || null,
    discountAmount: booking.discountAmount,
    subtotalAmount: booking.subtotalAmount,
    serviceFee: booking.serviceFee,
    totalAmount: booking.totalAmount,
    expiresAt: booking.expiresAt.toISOString(),
    remainingSeconds,
  };
}

/**
 * WS2: Atomically holds/updates seats for a user using 4-layer concurrency protection:
 * 1) Redis Lua `SET NX EX`
 * 2) MySQL `SELECT ... FOR UPDATE` in sorted `id` order
 * 3) Optimistic `version` increment
 * 4) `BookingSeat.activeLock` unique constraint
 */
export async function createSeatHold({
  showtimeId: rawShowtimeId,
  seatIds,
  userId,
  userEmail = 'customer@cinehub.vn',
  ticketTypes = {},
  enforceOrphanRule = false,
  ttlSeconds,
  metadata = {},
}) {
  if (!userId) {
    throw new AppError(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập để chọn và giữ ghế.');
  }

  const requestedLabels = [...new Set((seatIds || []).map((s) => String(s).trim()))];
  if (requestedLabels.length === 0 || requestedLabels.length > MAX_SEATS_PER_BOOKING) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      `Số lượng ghế phải từ 1 đến ${MAX_SEATS_PER_BOOKING} ghế.`,
    );
  }

  await sweepExpiredBookings();

  const { showtime, showtimeSeats, ticketTypeMap } = await resolveOrEnsureShowtime(
    rawShowtimeId,
    metadata,
  );

  // Match requested labels/IDs to ShowtimeSeat rows
  const byLabel = new Map();
  for (const ss of showtimeSeats) {
    byLabel.set(ss.seat.label, ss);
    byLabel.set(ss.id, ss);
    byLabel.set(ss.seatId, ss);
  }

  const targetShowtimeSeats = [];
  for (const reqId of requestedLabels) {
    const found = byLabel.get(reqId);
    if (!found) {
      throw new AppError(404, 'NOT_FOUND', `Không tìm thấy ghế ${reqId} trong phòng chiếu.`);
    }
    targetShowtimeSeats.push(found);
  }

  const canonicalLabels = targetShowtimeSeats.map((ss) => ss.seat.label);

  // Check Orphan Single-Seat Gap Rule if requested
  if (enforceOrphanRule) {
    const orphanCheck = checkOrphanSeatGap(showtimeSeats, canonicalLabels, userId);
    if (orphanCheck.hasOrphan) {
      throw new AppError(
        400,
        'ORPHAN_SEAT_GAP',
        `Không được chừa 1 ghế trống lẻ (${orphanCheck.orphanSeatLabel}) bên cạnh ghế đã chọn.`,
      );
    }
  }

  // Layer 1: Redis atomic Lua lease acquisition
  const effectiveTtl = Number(ttlSeconds) > 0 ? Number(ttlSeconds) : env.SEAT_HOLD_TTL_SECONDS;
  const leaseResult = await acquireSeatLeases({
    showtimeId: showtime.id,
    seatIds: canonicalLabels,
    userId,
    ttlSeconds: effectiveTtl,
  });

  if (!leaseResult.acquired) {
    throw new AppError(
      409,
      'SEAT_TAKEN',
      `409 SEAT_TAKEN: Một hoặc nhiều ghế (${canonicalLabels.join(', ')}) đang được người khác giữ hoặc đã bán.`,
    );
  }

  // Price lookup map
  const priceMap = new Map();
  for (const p of showtime.prices || []) {
    priceMap.set(`${p.seatTypeId}:${p.ticketType?.code || 'ADULT'}`, p.price);
  }
  const adultTicketType = ticketTypeMap.get('ADULT');

  const releasedLabels = [];
  let bookingRecord = null;

  try {
    bookingRecord = await prisma.$transaction(async (tx) => {
      // Find existing PENDING booking for this user + showtime
      let existingBooking = await tx.booking.findFirst({
        where: {
          userId,
          showtimeId: showtime.id,
          status: 'PENDING',
        },
        include: {
          seats: { include: { showtimeSeat: { include: { seat: true } } } },
          concessions: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      const previousShowtimeSeatIds = existingBooking
        ? existingBooking.seats.map((bs) => bs.showtimeSeatId)
        : [];
      const allLockIds = [
        ...new Set([...targetShowtimeSeats.map((ss) => ss.id), ...previousShowtimeSeatIds]),
      ].sort();

      // Layer 2: Pessimistic row lock in deterministic sorted ID order
      const lockedRows = await tx.$queryRawUnsafe(
        `SELECT id, seatId, status, heldByBookingId, heldUntil, version
         FROM showtime_seats
         WHERE showtimeId = ? AND id IN (${allLockIds.map(() => '?').join(',')})
         ORDER BY id ASC
         FOR UPDATE`,
        showtime.id,
        ...allLockIds,
      );

      const lockedById = new Map(lockedRows.map((r) => [r.id, r]));
      const now = new Date();

      // Verify all requested target seats are available or held by this user's existing booking
      for (const targetSs of targetShowtimeSeats) {
        const row = lockedById.get(targetSs.id);
        if (!row) {
          throw new AppError(404, 'NOT_FOUND', `Ghế ${targetSs.seat.label} không tồn tại.`);
        }
        const heldByThisBooking = existingBooking && row.heldByBookingId === existingBooking.id;
        const holdExpired =
          row.status === 'HELD' && row.heldUntil && new Date(row.heldUntil) <= now;

        if (
          row.status === 'SOLD' ||
          row.status === 'BLOCKED' ||
          (row.status === 'HELD' && !heldByThisBooking && !holdExpired)
        ) {
          throw new AppError(
            409,
            'SEAT_TAKEN',
            `409 SEAT_TAKEN: Ghế ${targetSs.seat.label} đã được người khác giữ hoặc đã bán.`,
          );
        }

        // If an expired hold from an old booking was still lingering on the row, clear its activeLock first
        if (holdExpired && row.heldByBookingId && !heldByThisBooking) {
          await tx.bookingSeat.updateMany({
            where: { showtimeSeatId: row.id, activeLock: row.id },
            data: { activeLock: null },
          });
        }
      }

      // Preserve existing expiry timer when user adds/toggles seats within an active hold, or start fresh
      const holdExpiresAt =
        existingBooking && existingBooking.expiresAt > now && !ttlSeconds
          ? existingBooking.expiresAt
          : leaseResult.expiresAt;

      if (!existingBooking) {
        existingBooking = await tx.booking.create({
          data: {
            code: generateBookingCode(now),
            userId,
            showtimeId: showtime.id,
            status: 'PENDING',
            contactEmail: userEmail || 'customer@cinehub.vn',
            expiresAt: holdExpiresAt,
            subtotalAmount: 0,
            discountAmount: 0,
            serviceFee: 0,
            totalAmount: 0,
          },
          include: { seats: true, concessions: true },
        });
      }

      const targetIdSet = new Set(targetShowtimeSeats.map((ss) => ss.id));

      // Release seats that were previously in existingBooking but unselected now
      for (const oldBs of existingBooking.seats || []) {
        if (!targetIdSet.has(oldBs.showtimeSeatId)) {
          const oldLabel = oldBs.seatLabel;
          releasedLabels.push(oldLabel);
          await tx.bookingSeat.update({
            where: { id: oldBs.id },
            data: { activeLock: null },
          });
          await tx.bookingSeat.delete({
            where: { id: oldBs.id },
          });
          await tx.showtimeSeat.update({
            where: { id: oldBs.showtimeSeatId },
            data: {
              status: 'AVAILABLE',
              heldByBookingId: null,
              heldUntil: null,
              version: { increment: 1 },
            },
          });
        }
      }

      // Lock/update all target seats (Layer 3: version increment + Layer 4: activeLock unique constraint)
      let seatsSubtotal = 0;
      const existingSeatBySsId = new Map(
        (existingBooking.seats || []).map((bs) => [bs.showtimeSeatId, bs]),
      );

      for (const targetSs of targetShowtimeSeats) {
        const lockedRow = lockedById.get(targetSs.id);
        const ticketTypeCode = ticketTypes[targetSs.seat.label] || 'ADULT';
        const ticketTypeObj = ticketTypeMap.get(ticketTypeCode) || adultTicketType;
        const zone = seatZoneFromCode(targetSs.seat.seatType?.code);
        const fallbackPrice = zone === 'sweetbox' ? 190000 : zone === 'vip' ? 105000 : 85000;
        const unitPrice =
          priceMap.get(`${targetSs.seat.seatTypeId}:${ticketTypeObj.code}`) ??
          priceMap.get(`${targetSs.seat.seatTypeId}:ADULT`) ??
          fallbackPrice;

        seatsSubtotal += unitPrice;

        // Layer 3: Optimistic version check
        const updatedCount = await tx.showtimeSeat.updateMany({
          where: {
            id: targetSs.id,
            version: Number(lockedRow.version),
          },
          data: {
            status: 'HELD',
            heldByBookingId: existingBooking.id,
            heldUntil: holdExpiresAt,
            version: { increment: 1 },
          },
        });

        if (updatedCount.count === 0) {
          throw new AppError(
            409,
            'SEAT_TAKEN',
            `409 SEAT_TAKEN: Xung đột phiên bản khi khóa ghế ${targetSs.seat.label}.`,
          );
        }

        // Layer 4: BookingSeat.activeLock unique constraint
        const existingBs = existingSeatBySsId.get(targetSs.id);
        if (existingBs) {
          await tx.bookingSeat.update({
            where: { id: existingBs.id },
            data: {
              price: unitPrice,
              ticketTypeId: ticketTypeObj.id,
              ticketTypeCode: ticketTypeObj.code,
              activeLock: targetSs.id,
            },
          });
        } else {
          await tx.bookingSeat.create({
            data: {
              bookingId: existingBooking.id,
              showtimeSeatId: targetSs.id,
              seatLabel: targetSs.seat.label,
              seatTypeCode: targetSs.seat.seatType?.code || 'STANDARD',
              ticketTypeId: ticketTypeObj.id,
              ticketTypeCode: ticketTypeObj.code,
              price: unitPrice,
              activeLock: targetSs.id,
            },
          });
        }
      }

      const concessionsSubtotal = (existingBooking.concessions || []).reduce(
        (sum, c) => sum + c.unitPrice * c.quantity,
        0,
      );
      const subtotalAmount = seatsSubtotal + concessionsSubtotal;
      const discountAmount = Math.min(existingBooking.discountAmount || 0, subtotalAmount);
      const totalAmount = Math.max(
        0,
        subtotalAmount + (existingBooking.serviceFee || 0) - discountAmount,
      );

      const updatedBooking = await tx.booking.update({
        where: { id: existingBooking.id },
        data: {
          subtotalAmount,
          discountAmount,
          totalAmount,
          expiresAt: holdExpiresAt,
          version: { increment: 1 },
        },
        include: { seats: true },
      });

      await tx.outboxEvent.create({
        data: {
          aggregateType: 'Booking',
          aggregateId: updatedBooking.id,
          eventType: 'BookingHoldUpdated',
          payload: {
            bookingId: updatedBooking.id,
            showtimeId: showtime.id,
            userId,
            seatIds: canonicalLabels,
            releasedSeatIds: releasedLabels,
            expiresAt: holdExpiresAt.toISOString(),
          },
        },
      });

      return updatedBooking;
    });
  } catch (err) {
    // Compensating action: release newly acquired Redis leases if SQL transaction failed
    await releaseSeatLeases({
      showtimeId: showtime.id,
      seatIds: canonicalLabels,
      userId,
    });
    if (err instanceof AppError) throw err;
    if (err.code === 'P2002') {
      throw new AppError(
        409,
        'SEAT_TAKEN',
        '409 SEAT_TAKEN: Ghế bạn chọn vừa được khách hàng khác khóa (activeLock conflict).',
      );
    }
    throw err;
  }

  // Release Redis leases for any seats unselected in this update
  if (releasedLabels.length > 0) {
    await releaseSeatLeases({
      showtimeId: showtime.id,
      seatIds: releasedLabels,
      userId,
    });
  }

  const remainingSeconds = Math.max(
    0,
    Math.ceil((bookingRecord.expiresAt.getTime() - Date.now()) / 1000),
  );

  // WS3: Broadcast real-time seat update to all connected browsers
  await broadcastShowtimeSeatEvent([showtime.id, showtime.externalId, rawShowtimeId], {
    type: 'SEAT_HOLD_UPDATED',
    showtimeId: showtime.id,
    externalShowtimeId: showtime.externalId || rawShowtimeId,
    userId,
    heldSeatIds: canonicalLabels,
    releasedSeatIds: releasedLabels,
    expiresAt: bookingRecord.expiresAt.toISOString(),
  });

  return {
    bookingId: bookingRecord.id,
    bookingCode: bookingRecord.code,
    showtimeId: showtime.id,
    seatIds: canonicalLabels,
    seats: bookingRecord.seats.map((s) => ({
      id: s.seatLabel,
      showtimeSeatId: s.showtimeSeatId,
      zone: seatZoneFromCode(s.seatTypeCode),
      price: s.price,
      ticketTypeCode: s.ticketTypeCode,
    })),
    subtotalAmount: bookingRecord.subtotalAmount,
    discountAmount: bookingRecord.discountAmount,
    totalAmount: bookingRecord.totalAmount,
    heldUntil: bookingRecord.expiresAt.toISOString(),
    expiresAt: bookingRecord.expiresAt.toISOString(),
    ttlSeconds: remainingSeconds,
    remainingSeconds,
  };
}

/**
 * WS2: Releases either a specific seat or all seats held by `userId` for `showtimeId`.
 */
export async function releaseSeatHold({ showtimeId: rawShowtimeId, userId, seatId = null }) {
  if (!userId) {
    throw new AppError(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập.');
  }

  const showtime = await prisma.showtime.findFirst({
    where: { OR: [{ id: rawShowtimeId }, { externalId: rawShowtimeId }] },
  });
  const resolvedShowtimeId = showtime?.id || rawShowtimeId;

  const existingBooking = await prisma.booking.findFirst({
    where: {
      userId,
      showtimeId: resolvedShowtimeId,
      status: 'PENDING',
    },
    include: {
      seats: true,
      redemption: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!existingBooking) {
    if (seatId) {
      await releaseSeatLeases({ showtimeId: resolvedShowtimeId, seatIds: [seatId], userId });
    }
    return { released: true, seatIds: [], remainingSeatIds: [] };
  }

  // If releasing a single seat and other seats still remain in the booking
  const remainingSeats = seatId
    ? existingBooking.seats.filter((bs) => bs.seatLabel !== seatId && bs.showtimeSeatId !== seatId)
    : [];

  if (seatId && remainingSeats.length > 0) {
    const updated = await createSeatHold({
      showtimeId: resolvedShowtimeId,
      seatIds: remainingSeats.map((bs) => bs.seatLabel),
      userId,
    });
    return {
      released: true,
      releasedSeatIds: [seatId],
      remainingSeatIds: updated.seatIds,
      bookingId: updated.bookingId,
      expiresAt: updated.expiresAt,
      remainingSeconds: updated.remainingSeconds,
    };
  }

  // Otherwise release the entire PENDING booking hold
  const releasedSeatLabels = existingBooking.seats.map((bs) => bs.seatLabel);
  const releasedShowtimeSeatIds = existingBooking.seats.map((bs) => bs.showtimeSeatId);

  await prisma.$transaction(async (tx) => {
    await tx.bookingSeat.updateMany({
      where: { bookingId: existingBooking.id },
      data: { activeLock: null },
    });

    if (releasedShowtimeSeatIds.length > 0) {
      await tx.showtimeSeat.updateMany({
        where: { id: { in: releasedShowtimeSeatIds } },
        data: {
          status: 'AVAILABLE',
          heldByBookingId: null,
          heldUntil: null,
          version: { increment: 1 },
        },
      });
    }

    if (existingBooking.redemption && existingBooking.redemption.status === 'RESERVED') {
      await tx.voucherRedemption.update({
        where: { id: existingBooking.redemption.id },
        data: { status: 'RELEASED' },
      });
      await tx.voucher.update({
        where: { id: existingBooking.redemption.voucherId },
        data: { usedCount: { decrement: 1 } },
      });
    }

    await tx.booking.update({
      where: { id: existingBooking.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelReason: 'USER_RELEASED_HOLD',
        version: { increment: 1 },
      },
    });
  });

  await releaseSeatLeases({
    showtimeId: resolvedShowtimeId,
    seatIds: releasedSeatLabels,
    userId,
  });

  await broadcastShowtimeSeatEvent([resolvedShowtimeId, showtime?.externalId, rawShowtimeId], {
    type: 'SEAT_HOLD_RELEASED',
    showtimeId: resolvedShowtimeId,
    externalShowtimeId: showtime?.externalId || rawShowtimeId,
    userId,
    heldSeatIds: [],
    releasedSeatIds: releasedSeatLabels,
  });

  return {
    released: true,
    releasedSeatIds: releasedSeatLabels,
    remainingSeatIds: [],
  };
}

/**
 * WS4: Background reconciliation sweep for expired PENDING bookings.
 */
let isSweeping = false;
export async function sweepExpiredBookings() {
  if (isSweeping) return 0;
  isSweeping = true;
  try {
    const now = new Date();
    const expiredBookings = await prisma.booking.findMany({
      where: {
        status: 'PENDING',
        expiresAt: { lte: now },
      },
      include: {
        seats: true,
        redemption: true,
        showtime: { select: { id: true, externalId: true } },
      },
      take: 50,
    });

    if (expiredBookings.length === 0) return 0;

    for (const booking of expiredBookings) {
      const seatLabels = booking.seats.map((bs) => bs.seatLabel);
      const showtimeSeatIds = booking.seats.map((bs) => bs.showtimeSeatId);

      try {
        await prisma.$transaction(async (tx) => {
          const fresh = await tx.booking.findUnique({ where: { id: booking.id } });
          if (!fresh || fresh.status !== 'PENDING') return;

          await tx.bookingSeat.updateMany({
            where: { bookingId: booking.id },
            data: { activeLock: null },
          });

          if (showtimeSeatIds.length > 0) {
            await tx.showtimeSeat.updateMany({
              where: {
                id: { in: showtimeSeatIds },
                status: 'HELD',
              },
              data: {
                status: 'AVAILABLE',
                heldByBookingId: null,
                heldUntil: null,
                version: { increment: 1 },
              },
            });
          }

          if (booking.redemption && booking.redemption.status === 'RESERVED') {
            await tx.voucherRedemption.update({
              where: { id: booking.redemption.id },
              data: { status: 'RELEASED' },
            });
            await tx.voucher.update({
              where: { id: booking.redemption.voucherId },
              data: { usedCount: { decrement: 1 } },
            });
          }

          await tx.payment.updateMany({
            where: {
              bookingId: booking.id,
              status: { in: ['INITIATED', 'PENDING'] },
            },
            data: {
              status: 'CANCELLED',
              failureCode: 'HOLD_EXPIRED',
            },
          });

          await tx.booking.update({
            where: { id: booking.id },
            data: {
              status: 'EXPIRED',
              cancelledAt: now,
              cancelReason: 'HOLD_TIMEOUT',
              version: { increment: 1 },
            },
          });

          await tx.outboxEvent.create({
            data: {
              aggregateType: 'Booking',
              aggregateId: booking.id,
              eventType: 'BookingExpired',
              payload: {
                bookingId: booking.id,
                showtimeId: booking.showtimeId,
                releasedSeatIds: seatLabels,
              },
            },
          });
        });

        await forceDeleteSeatLeases({
          showtimeId: booking.showtimeId,
          seatIds: seatLabels,
        });

        await broadcastShowtimeSeatEvent([booking.showtimeId, booking.showtime?.externalId], {
          type: 'SEATS_EXPIRED',
          showtimeId: booking.showtimeId,
          externalShowtimeId: booking.showtime?.externalId,
          bookingId: booking.id,
          releasedSeatIds: seatLabels,
        });
      } catch (err) {
        logger.warn(
          { err: err.message, bookingId: booking.id },
          '[ExpirySweep] Error expiring booking',
        );
      }
    }

    return expiredBookings.length;
  } catch (err) {
    logger.warn({ err: err.message }, '[ExpirySweep] Sweep query skipped');
    return 0;
  } finally {
    isSweeping = false;
  }
}

/**
 * WS5: Validates a voucher code against MySQL `vouchers` table and computes discount in VND.
 */
export async function validateVoucher({ code: rawCode, subtotalAmount = 0, userId = null }) {
  const code = String(rawCode || '')
    .trim()
    .toUpperCase();
  if (!code) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Vui lòng nhập mã giảm giá.');
  }

  let voucher = await prisma.voucher.findUnique({ where: { code } });

  // Auto-seed default demo vouchers if DB has not run seed yet
  if (!voucher && ['CINEHUB50', 'GALAXY30', 'VIP2026', 'CINEHUB20', 'CINEHUB50K'].includes(code)) {
    const defaults = {
      CINEHUB50: {
        description: 'Giảm 50.000đ thành viên mới',
        type: 'FIXED',
        value: 50000,
        minOrderAmount: 0,
      },
      GALAXY30: {
        description: 'Giảm 30.000đ đối tác Galaxy',
        type: 'FIXED',
        value: 30000,
        minOrderAmount: 0,
      },
      VIP2026: {
        description: 'Giảm 45.000đ hạng VIP',
        type: 'FIXED',
        value: 45000,
        minOrderAmount: 0,
      },
      CINEHUB20: {
        description: 'Giảm 20% tổng đơn hàng',
        type: 'PERCENT',
        value: 20,
        maxDiscount: 50000,
        minOrderAmount: 100000,
      },
      CINEHUB50K: {
        description: 'Giảm trực tiếp 50.000đ',
        type: 'FIXED',
        value: 50000,
        maxDiscount: 50000,
        minOrderAmount: 150000,
      },
    };
    const def = defaults[code];
    voucher = await prisma.voucher.create({
      data: {
        code,
        ...def,
        startsAt: new Date('2025-01-01'),
        endsAt: new Date('2028-12-31'),
        usageLimit: 1000,
        perUserLimit: 10,
        isActive: true,
      },
    });
  }

  if (!voucher || !voucher.isActive) {
    throw new AppError(
      404,
      'NOT_FOUND',
      'Mã giảm giá không tồn tại hoặc đã ngừng áp dụng. Thử CINEHUB50, GALAXY30 hoặc VIP2026.',
    );
  }

  const now = new Date();
  if (voucher.startsAt > now || voucher.endsAt < now) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      `Mã giảm giá ${code} đã hết hạn hoặc chưa đến ngày áp dụng.`,
    );
  }

  if (voucher.usageLimit !== null && voucher.usedCount >= voucher.usageLimit) {
    throw new AppError(400, 'VALIDATION_ERROR', `Mã giảm giá ${code} đã hết lượt sử dụng.`);
  }

  if (subtotalAmount > 0 && subtotalAmount < voucher.minOrderAmount) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      `Đơn hàng tối thiểu ${voucher.minOrderAmount.toLocaleString('vi-VN')}đ để áp dụng mã ${code}.`,
    );
  }

  if (userId && voucher.perUserLimit) {
    const usedByUser = await prisma.voucherRedemption.count({
      where: {
        voucherId: voucher.id,
        userId,
        status: { in: ['RESERVED', 'REDEEMED'] },
      },
    });
    if (usedByUser >= voucher.perUserLimit) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        `Bạn đã sử dụng tối đa số lượt cho phép của mã ${code}.`,
      );
    }
  }

  let discountAmount =
    voucher.type === 'PERCENT'
      ? Math.round(((subtotalAmount || 100000) * voucher.value) / 100)
      : voucher.value;

  if (voucher.maxDiscount !== null && discountAmount > voucher.maxDiscount) {
    discountAmount = voucher.maxDiscount;
  }
  if (subtotalAmount > 0 && discountAmount > subtotalAmount) {
    discountAmount = subtotalAmount;
  }

  return {
    valid: true,
    voucherId: voucher.id,
    code: voucher.code,
    description: voucher.description || `Giảm ${discountAmount.toLocaleString('vi-VN')}đ`,
    type: voucher.type,
    value: voucher.value,
    discountAmount,
    message: `Đã áp dụng ${voucher.code}: ${voucher.description || ''}`,
  };
}

/**
 * WS5: Persists concessions for a booking and recalculates server-side totals.
 */
export async function updateBookingConcessions({ bookingId, userId, items = [] }) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { seats: true },
  });
  if (!booking || booking.userId !== userId) {
    throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy đơn đặt vé.');
  }
  if (booking.status !== 'PENDING' || booking.expiresAt <= new Date()) {
    throw new AppError(409, 'HOLD_EXPIRED', 'Thời gian giữ ghế đã hết hạn.');
  }

  const validItems = items.filter((it) => it.quantity > 0);
  const seatsTotal = booking.seats.reduce((s, bs) => s + bs.price, 0);

  const updated = await prisma.$transaction(async (tx) => {
    await tx.bookingConcession.deleteMany({ where: { bookingId: booking.id } });

    let concessionsTotal = 0;
    for (const item of validItems) {
      const dbConc = await tx.concession.findFirst({
        where: { OR: [{ id: item.concessionId }, { externalId: item.concessionId }] },
      });
      if (!dbConc) continue;
      const unitPrice = dbConc.price;
      concessionsTotal += unitPrice * item.quantity;
      await tx.bookingConcession.create({
        data: {
          bookingId: booking.id,
          concessionId: dbConc.id,
          nameSnapshot: dbConc.name,
          quantity: item.quantity,
          unitPrice,
        },
      });
    }

    const subtotalAmount = seatsTotal + concessionsTotal;
    const discountAmount = Math.min(booking.discountAmount, subtotalAmount);
    const totalAmount = Math.max(0, subtotalAmount + booking.serviceFee - discountAmount);

    return tx.booking.update({
      where: { id: booking.id },
      data: {
        subtotalAmount,
        discountAmount,
        totalAmount,
        version: { increment: 1 },
      },
      include: { seats: true, concessions: true },
    });
  });

  return updated;
}

/**
 * WS5: Finalizes booking order assembly (seats + concessions + voucher reservation)
 * and calculates authoritative totalAmount in MySQL before payment initiation.
 */
export async function checkoutBooking({
  showtimeId: rawShowtimeId,
  bookingId,
  userId,
  userEmail = 'customer@cinehub.vn',
  seatIds,
  voucherCode,
  concessions = [],
}) {
  if (!userId) {
    throw new AppError(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập để thanh toán.');
  }

  await sweepExpiredBookings();

  // Ensure seat hold exists and passes orphan seat validation
  let holdInfo = null;
  if (seatIds && seatIds.length > 0) {
    holdInfo = await createSeatHold({
      showtimeId: rawShowtimeId,
      seatIds,
      userId,
      userEmail,
      enforceOrphanRule: true,
    });
  }

  const targetBookingId = bookingId || holdInfo?.bookingId;
  const booking = await prisma.booking.findFirst({
    where: {
      ...(targetBookingId ? { id: targetBookingId } : { showtimeId: rawShowtimeId }),
      userId,
      status: 'PENDING',
    },
    include: {
      seats: true,
      concessions: true,
      redemption: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!booking) {
    throw new AppError(409, 'HOLD_EXPIRED', 'Đơn giữ ghế không tồn tại hoặc đã hết hạn.');
  }
  if (booking.expiresAt <= new Date()) {
    await sweepExpiredBookings();
    throw new AppError(
      409,
      'HOLD_EXPIRED',
      'Thời gian giữ ghế 15 phút đã hết hạn. Vui lòng chọn lại ghế.',
    );
  }

  const seatsSubtotal = booking.seats.reduce((sum, s) => sum + s.price, 0);

  // Resolve concessions
  let concessionsSubtotal = 0;
  const resolvedConcessions = [];
  for (const item of concessions.filter((c) => c.quantity > 0)) {
    const dbConc = await prisma.concession.findFirst({
      where: {
        OR: [
          { id: item.concessionId },
          { externalId: item.concessionId },
          { name: item.name || '' },
        ],
      },
    });
    if (dbConc) {
      concessionsSubtotal += dbConc.price * item.quantity;
      resolvedConcessions.push({
        concessionId: dbConc.id,
        nameSnapshot: dbConc.name,
        quantity: item.quantity,
        unitPrice: dbConc.price,
      });
    } else if (item.unitPrice) {
      concessionsSubtotal += item.unitPrice * item.quantity;
    }
  }

  const subtotalAmount = seatsSubtotal + concessionsSubtotal;
  let validatedVoucher = null;
  let discountAmount = 0;

  if (voucherCode) {
    validatedVoucher = await validateVoucher({
      code: voucherCode,
      subtotalAmount,
      userId: booking.redemption ? null : userId,
    });
    discountAmount = validatedVoucher.discountAmount;
  }

  const totalAmount = Math.max(0, subtotalAmount + booking.serviceFee - discountAmount);

  const updatedBooking = await prisma.$transaction(async (tx) => {
    await tx.bookingConcession.deleteMany({ where: { bookingId: booking.id } });
    for (const rc of resolvedConcessions) {
      await tx.bookingConcession.create({
        data: {
          bookingId: booking.id,
          ...rc,
        },
      });
    }

    if (
      booking.redemption &&
      (!validatedVoucher || booking.redemption.voucherId !== validatedVoucher.voucherId)
    ) {
      await tx.voucherRedemption.delete({ where: { id: booking.redemption.id } });
      await tx.voucher.update({
        where: { id: booking.redemption.voucherId },
        data: { usedCount: { decrement: 1 } },
      });
    }

    if (validatedVoucher) {
      const existingRedemption = await tx.voucherRedemption.findUnique({
        where: { bookingId: booking.id },
      });
      if (existingRedemption) {
        await tx.voucherRedemption.update({
          where: { id: existingRedemption.id },
          data: {
            voucherId: validatedVoucher.voucherId,
            discountAmount,
            status: 'RESERVED',
          },
        });
      } else {
        await tx.voucherRedemption.create({
          data: {
            voucherId: validatedVoucher.voucherId,
            userId,
            bookingId: booking.id,
            status: 'RESERVED',
            discountAmount,
          },
        });
        await tx.voucher.update({
          where: { id: validatedVoucher.voucherId },
          data: { usedCount: { increment: 1 } },
        });
      }
    }

    return tx.booking.update({
      where: { id: booking.id },
      data: {
        subtotalAmount,
        discountAmount,
        totalAmount,
        version: { increment: 1 },
      },
      include: {
        seats: true,
        concessions: true,
        redemption: { include: { voucher: true } },
      },
    });
  });

  return {
    bookingId: updatedBooking.id,
    bookingCode: updatedBooking.code,
    showtimeId: updatedBooking.showtimeId,
    subtotalAmount: updatedBooking.subtotalAmount,
    discountAmount: updatedBooking.discountAmount,
    serviceFee: updatedBooking.serviceFee,
    totalAmount: updatedBooking.totalAmount,
    expiresAt: updatedBooking.expiresAt.toISOString(),
    seats: updatedBooking.seats,
    concessions: updatedBooking.concessions,
  };
}

/**
 * WS7: Formats a confirmed Booking and its cryptographic QR Tickets for `/result/:id` and `/my-tickets`.
 */
export function formatBookingTicketDto(booking) {
  const showtime = booking.showtime;
  const showDate = showtime?.localDate
    ? showtime.localDate.toISOString().slice(0, 10)
    : showtime?.startTime?.toISOString().slice(0, 10) || '';
  const hours = showtime?.startTime
    ? String((showtime.startTime.getUTCHours() + 7) % 24).padStart(2, '0')
    : '19';
  const minutes = showtime?.startTime
    ? String(showtime.startTime.getUTCMinutes()).padStart(2, '0')
    : '30';

  const tickets = (booking.tickets || []).map((t) => {
    const bs = booking.seats?.find((s) => s.id === t.bookingSeatId);
    const qrPayload = buildQr(t.id, t.qrVersion);
    return {
      ticketId: t.id,
      seatLabel: bs?.seatLabel || '',
      seatTypeCode: bs?.seatTypeCode || 'STANDARD',
      price: bs?.price || 0,
      status: t.status,
      qrVersion: t.qrVersion,
      qrPayload,
      issuedAt: t.issuedAt?.toISOString(),
      usedAt: t.usedAt?.toISOString() || null,
    };
  });

  const primaryTicket = tickets[0];
  const latestPayment = booking.payments?.[0];

  return {
    id: primaryTicket?.ticketId || booking.id,
    bookingId: booking.id,
    bookingCode: booking.code,
    movieTitle: showtime?.movie?.title || 'Phim CineHub',
    movieBackdropUrl: showtime?.movie?.backdropUrl || showtime?.movie?.posterUrl || '',
    cinemaName: showtime?.cinema?.name || 'Galaxy Cinema',
    screenName: showtime?.auditorium?.name || 'RAP 1',
    showTime: `${hours}:${minutes}`,
    showDate,
    startTime: showtime?.startTime?.toISOString() || new Date().toISOString(),
    format: showtime?.formatRaw || showtime?.format || '2D Phụ Đề',
    seats: (booking.seats || []).map((s) => s.seatLabel),
    concessions: (booking.concessions || []).map((c) => ({
      name: c.nameSnapshot,
      quantity: c.quantity,
      unitPrice: c.unitPrice,
    })),
    subtotalAmount: booking.subtotalAmount,
    discountAmount: booking.discountAmount,
    totalPaid: booking.totalAmount,
    paymentMethod: latestPayment?.provider || 'VNPAY',
    createdAt: (booking.confirmedAt || booking.createdAt).toISOString(),
    status: primaryTicket?.status || (booking.status === 'CONFIRMED' ? 'VALID' : 'CANCELLED'),
    bookingStatus: booking.status,
    qrPayload: primaryTicket?.qrPayload || buildQr(booking.id, 1),
    tickets,
  };
}

/**
 * WS7: Lists all confirmed/historical tickets for the authenticated user from MySQL.
 */
export async function listUserTickets(userId) {
  const bookings = await prisma.booking.findMany({
    where: {
      userId,
      status: { in: ['CONFIRMED', 'REFUNDED', 'PARTIALLY_REFUNDED'] },
    },
    include: {
      seats: true,
      concessions: true,
      tickets: true,
      payments: { orderBy: { createdAt: 'desc' } },
      showtime: {
        include: {
          movie: true,
          cinema: true,
          auditorium: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return bookings.map(formatBookingTicketDto);
}

/**
 * WS7: Retrieves a single ticket/booking by Ticket ID, Booking ID, or Booking Code from MySQL.
 */
export async function getUserTicketById(idOrCode, userId = null) {
  const ticketMatch = await prisma.ticket.findUnique({
    where: { id: idOrCode },
    select: { bookingId: true },
  });

  const targetId = ticketMatch?.bookingId || idOrCode;
  const booking = await prisma.booking.findFirst({
    where: {
      OR: [{ id: targetId }, { code: idOrCode }],
      ...(userId ? { userId } : {}),
    },
    include: {
      seats: true,
      concessions: true,
      tickets: true,
      payments: { orderBy: { createdAt: 'desc' } },
      showtime: {
        include: {
          movie: true,
          cinema: true,
          auditorium: true,
        },
      },
    },
  });

  if (!booking) {
    throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy vé điện tử.');
  }

  return formatBookingTicketDto(booking);
}

/**
 * WS6: Returns current status of a booking by ID or code.
 */
export async function getBookingStatusByCodeOrId(codeOrId) {
  await sweepExpiredBookings();
  const booking = await prisma.booking.findFirst({
    where: {
      OR: [{ id: codeOrId }, { code: codeOrId }],
    },
    include: {
      seats: true,
      tickets: true,
      payments: { orderBy: { createdAt: 'desc' } },
      showtime: {
        include: {
          movie: true,
          cinema: true,
          auditorium: true,
        },
      },
    },
  });

  if (!booking) {
    throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy đơn đặt vé.');
  }

  return {
    bookingId: booking.id,
    bookingCode: booking.code,
    status: booking.status,
    expiresAt: booking.expiresAt.toISOString(),
    totalAmount: booking.totalAmount,
    ticket: booking.status === 'CONFIRMED' ? formatBookingTicketDto(booking) : null,
  };
}
