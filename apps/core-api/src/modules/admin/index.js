import { createHash } from 'node:crypto';
import { Router } from 'express';
import { prisma } from '@cinehub/db';
import { requireAuth, requireRole } from '../../platform/http/auth.middleware.js';
import { getRedisClient } from '../../platform/cache/redis.js';
import { AppError } from '../../platform/utils/errors.js';
import { resolveOrEnsureShowtime, broadcastShowtimeSeatEvent } from '../booking/index.js';
import { listSessions } from '../sessions/index.js';

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole('ADMIN'));

async function invalidateCatalogAndShowtimeCache(movieId = null) {
  try {
    const redis = getRedisClient();
    const keys = await redis.keys('cache:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    if (movieId) {
      await redis.del(`cache:movie:${movieId}`);
    }
    await redis.del('sessions:galaxy:live:v1');
  } catch {
    // Non-fatal if Redis is offline
  }
}

function normalizeTitle(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .trim();
}

// 1. Admin Dashboard Analytics
adminRouter.get('/dashboard', async (_req, res, next) => {
  try {
    const [
      confirmedBookings,
      totalMovies,
      totalCinemas,
      totalShowtimes,
      totalUsers,
      soldSeatsCount,
      totalShowtimeSeatsCount,
      paymentsByProvider,
      recentBookings,
    ] = await Promise.all([
      prisma.booking.findMany({
        where: { status: 'CONFIRMED' },
        select: { totalAmount: true },
      }),
      prisma.movie.count({ where: { deletedAt: null } }),
      prisma.cinema.count({ where: { isActive: true } }),
      prisma.showtime.count(),
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.showtimeSeat.count({ where: { status: 'SOLD', isSeeded: false } }),
      prisma.showtimeSeat.count(),
      prisma.payment.groupBy({
        by: ['provider'],
        where: { status: 'SUCCESS' },
        _count: { id: true },
        _sum: { amount: true },
      }),
      prisma.booking.findMany({
        include: {
          user: { select: { fullName: true, email: true } },
          seats: true,
          payments: { orderBy: { createdAt: 'desc' }, take: 1 },
          showtime: { include: { movie: true, cinema: true, auditorium: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    const totalRevenue = confirmedBookings.reduce((sum, b) => sum + b.totalAmount, 0);
    const occupancyRate =
      totalShowtimeSeatsCount > 0
        ? Number(((soldSeatsCount / totalShowtimeSeatsCount) * 100).toFixed(2))
        : 0;

    res.json({
      data: {
        totalRevenue,
        confirmedBookingsCount: confirmedBookings.length,
        totalMovies,
        totalCinemas,
        totalShowtimes,
        totalUsers,
        soldSeatsCount,
        occupancyRate,
        paymentShare: paymentsByProvider.map((p) => ({
          provider: p.provider,
          count: p._count.id,
          amount: p._sum.amount || 0,
        })),
        recentBookings: recentBookings.map((b) => ({
          id: b.id,
          code: b.code,
          status: b.status,
          customerName: b.user?.fullName || b.contactEmail,
          customerEmail: b.user?.email || b.contactEmail,
          movieTitle: b.showtime?.movie?.title || '',
          cinemaName: b.showtime?.cinema?.name || '',
          screenName: b.showtime?.auditorium?.name || '',
          seats: b.seats.map((s) => s.seatLabel),
          totalAmount: b.totalAmount,
          paymentProvider: b.payments[0]?.provider || 'VNPAY',
          createdAt: b.createdAt.toISOString(),
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

// 2. Admin Movies CRUD (Soft Delete)
adminRouter.get('/movies', async (_req, res, next) => {
  try {
    const movies = await prisma.movie.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ data: movies });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/movies', async (req, res, next) => {
  try {
    const {
      title,
      slug,
      synopsis,
      durationMin = 120,
      ageRating = 'T13',
      status = 'NOW_SHOWING',
      posterUrl,
      backdropUrl,
      trailerUrl,
      releaseDate,
    } = req.body;

    if (!title) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Tên phim (title) là bắt buộc.');
    }

    const normalized = normalizeTitle(title);
    const cleanSlug =
      slug ||
      normalized.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') +
        '-' +
        Date.now().toString().slice(-4);

    const movie = await prisma.movie.create({
      data: {
        title,
        titleNormalized: normalized,
        slug: cleanSlug,
        synopsis: synopsis || null,
        durationMin: Number(durationMin) || 120,
        ageRating,
        status,
        posterUrl: posterUrl || null,
        backdropUrl: backdropUrl || null,
        trailerUrl: trailerUrl || null,
        releaseDate: releaseDate ? new Date(releaseDate) : new Date(),
        releaseYear: releaseDate ? new Date(releaseDate).getFullYear() : 2026,
      },
    });

    await invalidateCatalogAndShowtimeCache(movie.id);
    res.status(201).json({ data: movie });
  } catch (err) {
    next(err);
  }
});

adminRouter.put('/movies/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, synopsis, durationMin, ageRating, status, posterUrl, backdropUrl, trailerUrl } =
      req.body;

    const updated = await prisma.movie.update({
      where: { id },
      data: {
        ...(title ? { title, titleNormalized: normalizeTitle(title) } : {}),
        ...(synopsis !== undefined ? { synopsis } : {}),
        ...(durationMin !== undefined ? { durationMin: Number(durationMin) } : {}),
        ...(ageRating ? { ageRating } : {}),
        ...(status ? { status } : {}),
        ...(posterUrl !== undefined ? { posterUrl } : {}),
        ...(backdropUrl !== undefined ? { backdropUrl } : {}),
        ...(trailerUrl !== undefined ? { trailerUrl } : {}),
      },
    });

    await invalidateCatalogAndShowtimeCache(id);
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/movies/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await prisma.movie.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'ENDED' },
    });
    await invalidateCatalogAndShowtimeCache(id);
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

// 3. Admin Showtimes CRUD (with Auditorium Overlap Check + Auto ShowtimePrice & ShowtimeSeat generation)
adminRouter.get('/showtimes', async (_req, res, next) => {
  try {
    const [showtimes, cinemas, auditoriums] = await Promise.all([
      prisma.showtime.findMany({
        include: {
          movie: { select: { id: true, title: true, durationMin: true } },
          cinema: { select: { id: true, name: true } },
          auditorium: { select: { id: true, name: true, tier: true } },
        },
        orderBy: { startTime: 'desc' },
        take: 100,
      }),
      prisma.cinema.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.auditorium.findMany({
        where: { isActive: true },
        select: { id: true, name: true, cinemaId: true, tier: true },
      }),
    ]);

    res.json({ data: { showtimes, cinemas, auditoriums } });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/showtimes', async (req, res, next) => {
  try {
    const {
      movieId,
      cinemaId,
      auditoriumId,
      startTime: rawStartTime,
      format = 'TWO_D',
      captionMode = 'SUBTITLED',
    } = req.body;

    if (!movieId || !rawStartTime) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Vui lòng chọn phim và thời gian bắt đầu chiếu.');
    }

    const movie = await prisma.movie.findUnique({ where: { id: movieId } });
    if (!movie) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy phim.');

    let auditorium = auditoriumId
      ? await prisma.auditorium.findUnique({ where: { id: auditoriumId } })
      : null;
    if (!auditorium && cinemaId) {
      auditorium = await prisma.auditorium.findFirst({ where: { cinemaId } });
    }
    if (!auditorium) {
      auditorium = await prisma.auditorium.findFirst();
    }
    if (!auditorium) {
      throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy phòng chiếu.');
    }

    const startTime = new Date(rawStartTime);
    const durationMin = movie.durationMin || 120;
    const endTime = new Date(startTime.getTime() + (durationMin + 15) * 60_000);

    // Overlap check in the same Auditorium (BR-02)
    const overlapping = await prisma.showtime.findFirst({
      where: {
        auditoriumId: auditorium.id,
        status: { in: ['SCHEDULED', 'OPEN', 'SOLD_OUT'] },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
      include: { movie: { select: { title: true } } },
    });

    if (overlapping) {
      throw new AppError(
        409,
        'CONFLICT',
        `409 CONFLICT: Trùng giờ phòng chiếu "${auditorium.name}" với suất phim "${overlapping.movie?.title}" (${overlapping.startTime.toLocaleTimeString('vi-VN')} - ${overlapping.endTime.toLocaleTimeString('vi-VN')}).`,
      );
    }

    const localDateStr = new Date(startTime.getTime() + 7 * 3600_000).toISOString().slice(0, 10);
    const dedupKey = createHash('sha1')
      .update(`ADMIN:${auditorium.cinemaId}:${movie.id}:${startTime.toISOString()}:${format}`)
      .digest('hex');

    const createdShowtime = await prisma.showtime.create({
      data: {
        movieId: movie.id,
        cinemaId: auditorium.cinemaId,
        auditoriumId: auditorium.id,
        externalId: `ADM-${Date.now()}`,
        dedupKey,
        startTime,
        endTime,
        localDate: new Date(`${localDateStr}T00:00:00.000Z`),
        format,
        formatRaw: `${format === 'IMAX' ? 'IMAX' : format === 'THREE_D' ? '3D' : '2D'} ${captionMode === 'DUBBED' ? 'Lồng Tiếng' : 'Phụ Đề'}`,
        captionMode,
        status: 'OPEN',
      },
    });

    // Materialize ShowtimePrice and ShowtimeSeat rows
    await resolveOrEnsureShowtime(createdShowtime.id);
    await invalidateCatalogAndShowtimeCache(movie.id);

    res.status(201).json({ data: createdShowtime });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/showtimes/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const soldCount = await prisma.showtimeSeat.count({
      where: { showtimeId: id, status: 'SOLD', isSeeded: false },
    });
    if (soldCount > 0) {
      throw new AppError(
        409,
        'CONFLICT',
        `409 CONFLICT: Không thể xóa suất chiếu đã có ${soldCount} ghế bán thật (BR-06). Vui lòng hoàn tiền đơn trước.`,
      );
    }

    await prisma.showtime.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
    await invalidateCatalogAndShowtimeCache();
    res.json({ data: { cancelled: true, id } });
  } catch (err) {
    next(err);
  }
});

// 4. Admin Vouchers CRUD
adminRouter.get('/vouchers', async (_req, res, next) => {
  try {
    const vouchers = await prisma.voucher.findMany({
      orderBy: { startsAt: 'desc' },
    });
    res.json({ data: vouchers });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/vouchers', async (req, res, next) => {
  try {
    const {
      code,
      description,
      type = 'FIXED',
      value = 50000,
      maxDiscount = 50000,
      minOrderAmount = 0,
      usageLimit = 500,
      perUserLimit = 5,
      startsAt,
      endsAt,
    } = req.body;

    const cleanCode = String(code || '')
      .trim()
      .toUpperCase();
    if (!cleanCode) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Mã voucher là bắt buộc.');
    }

    const voucher = await prisma.voucher.upsert({
      where: { code: cleanCode },
      update: {
        description,
        type,
        value: Number(value),
        maxDiscount: maxDiscount ? Number(maxDiscount) : null,
        minOrderAmount: Number(minOrderAmount) || 0,
        usageLimit: usageLimit ? Number(usageLimit) : null,
        perUserLimit: Number(perUserLimit) || 1,
        isActive: true,
      },
      create: {
        code: cleanCode,
        description: description || `Mã giảm giá ${cleanCode}`,
        type,
        value: Number(value),
        maxDiscount: maxDiscount ? Number(maxDiscount) : null,
        minOrderAmount: Number(minOrderAmount) || 0,
        usageLimit: usageLimit ? Number(usageLimit) : null,
        perUserLimit: Number(perUserLimit) || 1,
        startsAt: startsAt ? new Date(startsAt) : new Date('2025-01-01'),
        endsAt: endsAt ? new Date(endsAt) : new Date('2028-12-31'),
        isActive: true,
      },
    });

    res.status(201).json({ data: voucher });
  } catch (err) {
    next(err);
  }
});

// 5. Admin Bookings & Refund Processing (Increments Ticket.qrVersion to revoke QR!)
adminRouter.post('/bookings/:id/refund', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason = 'ADMIN_MANUAL_REFUND' } = req.body || {};

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        seats: true,
        tickets: true,
        payments: { where: { status: 'SUCCESS' } },
        showtime: { select: { id: true, externalId: true } },
      },
    });

    if (!booking) {
      throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy đơn đặt vé.');
    }

    await prisma.$transaction(async (tx) => {
      await tx.bookingSeat.updateMany({
        where: { bookingId: booking.id },
        data: { activeLock: null },
      });

      const showtimeSeatIds = booking.seats.map((s) => s.showtimeSeatId);
      if (showtimeSeatIds.length > 0) {
        await tx.showtimeSeat.updateMany({
          where: { id: { in: showtimeSeatIds } },
          data: {
            status: 'AVAILABLE',
            heldByBookingId: null,
            heldUntil: null,
            version: { increment: 1 },
          },
        });
      }

      // Void all tickets and increment qrVersion to revoke existing QR signatures
      await tx.ticket.updateMany({
        where: { bookingId: booking.id },
        data: {
          status: 'VOID',
          qrVersion: { increment: 1 },
        },
      });

      for (const pay of booking.payments) {
        await tx.payment.update({
          where: { id: pay.id },
          data: { status: 'REFUNDED' },
        });
        await tx.refund.create({
          data: {
            paymentId: pay.id,
            amount: pay.amount,
            reason,
            status: 'PROCESSED',
            processedAt: new Date(),
          },
        });
      }

      await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: 'REFUNDED',
          cancelledAt: new Date(),
          cancelReason: reason,
          version: { increment: 1 },
        },
      });
    });

    await broadcastShowtimeSeatEvent([booking.showtimeId, booking.showtime?.externalId], {
      type: 'SEAT_HOLD_RELEASED',
      showtimeId: booking.showtimeId,
      releasedSeatIds: booking.seats.map((s) => s.seatLabel),
    });

    res.json({ data: { refunded: true, bookingId: booking.id } });
  } catch (err) {
    next(err);
  }
});

// 6. Admin Trigger Galaxy Crawler Sync
adminRouter.post('/crawl/galaxy', async (_req, res, next) => {
  try {
    await invalidateCatalogAndShowtimeCache();
    const snapshot = await listSessions({});
    res.json({
      data: {
        synced: true,
        totalSessions: snapshot.total || 0,
        source: snapshot.source,
        fetchedAt: snapshot.fetchedAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

// 7. Admin Users & RBAC Management
adminRouter.get('/users', async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        status: true,
        cinemaId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ data: users });
  } catch (err) {
    next(err);
  }
});

adminRouter.put('/users/:id/role', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, status, cinemaId } = req.body;
    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(role ? { role } : {}),
        ...(status ? { status } : {}),
        ...(cinemaId !== undefined ? { cinemaId } : {}),
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        cinemaId: true,
      },
    });
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});
