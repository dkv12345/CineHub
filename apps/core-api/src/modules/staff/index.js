import { Router } from 'express';
import { prisma } from '@cinehub/db';
import { requireAuth, requireRole } from '../../platform/http/auth.middleware.js';
import { AppError } from '../../platform/utils/errors.js';
import { verifyQr, buildQr } from '../../platform/utils/qr.js';

export const staffRouter = Router();

async function getShowtimeCheckinStats(showtimeId) {
  if (!showtimeId) return { checkedInCount: 0, totalIssuedCount: 0 };
  const [checkedInCount, totalIssuedCount] = await Promise.all([
    prisma.ticket.count({
      where: { booking: { showtimeId }, status: 'USED' },
    }),
    prisma.ticket.count({
      where: { booking: { showtimeId }, status: { in: ['VALID', 'USED'] } },
    }),
  ]);
  return { checkedInCount, totalIssuedCount };
}

staffRouter.get('/stats', requireAuth, requireRole('STAFF', 'ADMIN'), async (req, res, next) => {
  try {
    const showtimeId = req.query.showtimeId || '';
    const totalUsedToday = await prisma.ticket.count({
      where: { status: 'USED' },
    });
    const totalValidToday = await prisma.ticket.count({
      where: { status: { in: ['VALID', 'USED'] } },
    });
    const showtimeStats = showtimeId
      ? await getShowtimeCheckinStats(showtimeId)
      : { checkedInCount: totalUsedToday, totalIssuedCount: totalValidToday };

    const recentCheckins = await prisma.ticket.findMany({
      where: { status: 'USED' },
      include: {
        bookingSeat: true,
        checkedInBy: { select: { fullName: true, email: true } },
        booking: {
          include: {
            user: { select: { fullName: true, email: true, phone: true } },
            showtime: {
              include: { movie: true, cinema: true, auditorium: true },
            },
          },
        },
      },
      orderBy: { usedAt: 'desc' },
      take: 15,
    });

    res.json({
      data: {
        ...showtimeStats,
        recentCheckins: recentCheckins.map((t) => ({
          ticketId: t.id,
          bookingCode: t.booking.code,
          seatLabel: t.bookingSeat?.seatLabel || '',
          movieTitle: t.booking.showtime?.movie?.title || '',
          cinemaName: t.booking.showtime?.cinema?.name || '',
          screenName: t.booking.showtime?.auditorium?.name || '',
          customerName: t.booking.user?.fullName || t.booking.contactEmail,
          usedAt: t.usedAt?.toISOString(),
          checkedInBy: t.checkedInBy?.fullName || 'Staff',
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

staffRouter.post('/checkin', requireAuth, requireRole('STAFF', 'ADMIN'), async (req, res, next) => {
  try {
    const { qrPayload, bookingCode, phone } = req.body || {};
    const staffUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, fullName: true, role: true, cinemaId: true },
    });

    // Path 1: Cryptographic QR Payload Verification (ticketId.signature)
    if (qrPayload) {
      const cleanQr = String(qrPayload).trim();
      const [ticketId] = cleanQr.split('.');
      if (!ticketId) {
        throw new AppError(
          400,
          'INVALID_QR_SIGNATURE',
          'Định dạng mã QR không hợp lệ (thiếu chữ ký HMAC-SHA256).',
        );
      }

      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          bookingSeat: true,
          checkedInBy: { select: { id: true, fullName: true, email: true } },
          booking: {
            include: {
              user: { select: { fullName: true, email: true, phone: true } },
              showtime: {
                include: { movie: true, cinema: true, auditorium: true },
              },
            },
          },
        },
      });

      if (!ticket) {
        throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy vé điện tử trong hệ thống.');
      }

      const verifiedId = verifyQr(cleanQr, ticket.qrVersion);
      if (!verifiedId) {
        throw new AppError(
          400,
          'INVALID_QR_SIGNATURE',
          '400 INVALID_QR_SIGNATURE: Chữ ký HMAC-SHA256 hoặc phiên bản vé (qrVersion) không hợp lệ / đã bị thu hồi.',
        );
      }

      // Check staff venue assignment (BR-21)
      const showtimeCinemaId = ticket.booking?.showtime?.cinemaId;
      if (
        staffUser?.role === 'STAFF' &&
        staffUser.cinemaId &&
        showtimeCinemaId &&
        staffUser.cinemaId !== showtimeCinemaId
      ) {
        throw new AppError(
          403,
          'FORBIDDEN',
          `Nhân viên không thuộc rạp "${ticket.booking.showtime.cinema?.name}" của suất chiếu này.`,
        );
      }

      if (ticket.status === 'VOID') {
        throw new AppError(
          409,
          'TICKET_VOID',
          '409 TICKET_VOID: Vé này đã bị hủy hoặc hoàn tiền (VOID).',
        );
      }

      if (ticket.status === 'USED') {
        const usedTimeStr = ticket.usedAt
          ? new Date(ticket.usedAt).toLocaleString('vi-VN')
          : 'trước đó';
        throw new AppError(
          409,
          'TICKET_ALREADY_USED',
          `409 TICKET_ALREADY_USED: Vé ghế ${ticket.bookingSeat?.seatLabel} (Đơn #${ticket.booking.code}) đã được quét vào cổng lúc ${usedTimeStr} bởi ${ticket.checkedInBy?.fullName || 'Nhân viên'}.`,
          {
            ticketId: ticket.id,
            bookingCode: ticket.booking.code,
            seatLabel: ticket.bookingSeat?.seatLabel,
            usedAt: ticket.usedAt?.toISOString(),
            checkedInBy: ticket.checkedInBy?.fullName || 'Staff',
          },
        );
      }

      const now = new Date();
      const updated = await prisma.ticket.updateMany({
        where: { id: ticket.id, status: 'VALID' },
        data: {
          status: 'USED',
          usedAt: now,
          checkedInById: req.user.id,
        },
      });

      if (updated.count === 0) {
        throw new AppError(409, 'TICKET_ALREADY_USED', 'Vé vừa được quét ở thiết bị khác.');
      }

      const stats = await getShowtimeCheckinStats(ticket.booking.showtimeId);

      return res.status(200).json({
        data: {
          verified: true,
          ticketId: ticket.id,
          bookingCode: ticket.booking.code,
          seatLabel: ticket.bookingSeat?.seatLabel,
          seatTypeCode: ticket.bookingSeat?.seatTypeCode,
          movieTitle: ticket.booking.showtime?.movie?.title,
          cinemaName: ticket.booking.showtime?.cinema?.name,
          screenName: ticket.booking.showtime?.auditorium?.name,
          customerName: ticket.booking.user?.fullName || ticket.booking.contactEmail,
          status: 'USED',
          usedAt: now.toISOString(),
          checkedInBy: staffUser?.fullName || req.user.email,
          stats,
        },
      });
    }

    // Path 2: Manual Check-in by Booking Code or Customer Phone
    if (bookingCode || phone) {
      const cleanCode = String(bookingCode || '')
        .trim()
        .toUpperCase();
      const cleanPhone = String(phone || '').trim();

      const booking = await prisma.booking.findFirst({
        where: {
          status: 'CONFIRMED',
          ...(cleanCode
            ? { code: cleanCode }
            : {
                OR: [
                  { contactPhone: { contains: cleanPhone } },
                  { user: { phone: { contains: cleanPhone } } },
                ],
              }),
        },
        include: {
          user: { select: { fullName: true, email: true, phone: true } },
          seats: true,
          tickets: { include: { checkedInBy: { select: { fullName: true } } } },
          showtime: { include: { movie: true, cinema: true, auditorium: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!booking || booking.tickets.length === 0) {
        throw new AppError(
          404,
          'NOT_FOUND',
          'Không tìm thấy đơn vé đã thanh toán khớp với mã đặt vé hoặc số điện thoại.',
        );
      }

      const validTickets = booking.tickets.filter((t) => t.status === 'VALID');
      if (validTickets.length === 0) {
        const firstTicket = booking.tickets[0];
        const usedTimeStr = firstTicket?.usedAt
          ? new Date(firstTicket.usedAt).toLocaleString('vi-VN')
          : 'trước đó';
        throw new AppError(
          409,
          'TICKET_ALREADY_USED',
          `409 TICKET_ALREADY_USED: Toàn bộ ghế (${booking.seats.map((s) => s.seatLabel).join(', ')}) của đơn #${booking.code} đã được check-in lúc ${usedTimeStr}.`,
        );
      }

      const now = new Date();
      await prisma.ticket.updateMany({
        where: {
          id: { in: validTickets.map((t) => t.id) },
          status: 'VALID',
        },
        data: {
          status: 'USED',
          usedAt: now,
          checkedInById: req.user.id,
        },
      });

      const stats = await getShowtimeCheckinStats(booking.showtimeId);
      const firstValid = validTickets[0];
      const seatLabels = booking.seats.map((s) => s.seatLabel).join(', ');

      return res.status(200).json({
        data: {
          verified: true,
          ticketId: firstValid.id,
          qrPayload: buildQr(firstValid.id, firstValid.qrVersion),
          bookingCode: booking.code,
          seatLabel: seatLabels,
          movieTitle: booking.showtime?.movie?.title,
          cinemaName: booking.showtime?.cinema?.name,
          screenName: booking.showtime?.auditorium?.name,
          customerName: booking.user?.fullName || booking.contactEmail,
          status: 'USED',
          usedAt: now.toISOString(),
          checkedInBy: staffUser?.fullName || req.user.email,
          stats,
        },
      });
    }

    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Vui lòng nhập mã QR (qrPayload), mã đặt vé (bookingCode) hoặc số điện thoại (phone).',
    );
  } catch (err) {
    next(err);
  }
});
