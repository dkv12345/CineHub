import { Router } from 'express';
import { prisma } from '@cinehub/db';
import { requireAuth } from '../../platform/http/auth.middleware.js';
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

staffRouter.get('/stats', requireAuth, async (req, res, next) => {
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

staffRouter.post('/checkin', requireAuth, async (req, res, next) => {
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

      // Support checking in single booking QR code representing multiple seats
      if (!ticket) {
        const booking = await prisma.booking.findFirst({
          where: {
            OR: [{ id: ticketId }, { code: ticketId }],
          },
          include: {
            user: { select: { fullName: true, email: true, phone: true } },
            seats: true,
            tickets: {
              include: {
                bookingSeat: true,
                checkedInBy: { select: { id: true, fullName: true, email: true } },
              },
            },
            showtime: {
              include: { movie: true, cinema: true, auditorium: true },
            },
          },
        });

        if (booking) {
          const verifiedBookingId = verifyQr(cleanQr, 1);
          if (!verifiedBookingId && cleanQr !== booking.code) {
            throw new AppError(
              400,
              'INVALID_QR_SIGNATURE',
              '400 INVALID_QR_SIGNATURE: Chữ ký HMAC-SHA256 hoặc phiên bản vé không hợp lệ / đã bị thu hồi.',
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
            where: { bookingId: booking.id, status: 'VALID' },
            data: {
              status: 'USED',
              usedAt: now,
              checkedInById: req.user.id,
            },
          });

          const stats = await getShowtimeCheckinStats(booking.showtimeId);

          return res.status(200).json({
            data: {
              message: `Check-in thành công toàn bộ ${booking.seats.length} ghế (${booking.seats.map((s) => s.seatLabel).join(', ')})!`,
              ticket: {
                ticketId: booking.id,
                bookingCode: booking.code,
                seats: booking.seats.map((s) => s.seatLabel),
                seatLabel: booking.seats.map((s) => s.seatLabel).join(', '),
                movieTitle: booking.showtime?.movie?.title || 'Phim CineHub',
                cinemaName: booking.showtime?.cinema?.name || 'CineHub Cinema',
                auditoriumName: booking.showtime?.auditorium?.name || 'Phòng chiếu',
                customerName: booking.user?.fullName || booking.contactEmail,
                customerEmail: booking.user?.email || booking.contactEmail,
                status: 'USED',
                usedAt: now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                startTime: booking.showtime?.startTime
                  ? new Date(booking.showtime.startTime).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Suất chiếu',
              },
              stats,
            },
          });
        }

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
        process.env.NODE_ENV === 'production' &&
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

      // Fetch full booking details with all seats & tickets for this order
      const fullBooking = await prisma.booking.findUnique({
        where: { id: ticket.bookingId },
        include: {
          seats: true,
          tickets: {
            include: {
              bookingSeat: true,
              checkedInBy: { select: { id: true, fullName: true, email: true } },
            },
          },
          user: { select: { fullName: true, email: true, phone: true } },
          showtime: {
            include: { movie: true, cinema: true, auditorium: true },
          },
        },
      });

      const allSeats =
        fullBooking?.seats && fullBooking.seats.length > 0
          ? fullBooking.seats.map((s) => s.seatLabel)
          : fullBooking?.tickets?.map((t) => t.bookingSeat?.seatLabel).filter(Boolean) || [
              ticket.bookingSeat?.seatLabel || 'Ghế',
            ];

      if (ticket.status === 'VOID') {
        throw new AppError(
          409,
          'TICKET_VOID',
          '409 TICKET_VOID: Vé này đã bị hủy hoặc hoàn tiền (VOID).',
        );
      }

      const validTickets = fullBooking?.tickets.filter((t) => t.status === 'VALID') || [];
      if (validTickets.length === 0 && ticket.status === 'USED') {
        const usedTimeStr = ticket.usedAt
          ? new Date(ticket.usedAt).toLocaleString('vi-VN')
          : 'trước đó';
        throw new AppError(
          409,
          'TICKET_ALREADY_USED',
          `409 TICKET_ALREADY_USED: Toàn bộ ghế (${allSeats.join(', ')}) của đơn #${ticket.booking.code} đã được quét vào cổng lúc ${usedTimeStr} bởi ${ticket.checkedInBy?.fullName || 'Nhân viên'}.`,
          {
            ticketId: ticket.id,
            bookingCode: ticket.booking.code,
            seatLabel: allSeats.join(', '),
            seats: allSeats,
            usedAt: ticket.usedAt?.toISOString(),
            checkedInBy: ticket.checkedInBy?.fullName || 'Staff',
          },
        );
      }

      const now = new Date();
      // Check in ALL VALID tickets for this booking at once so all seats are admitted
      await prisma.ticket.updateMany({
        where: { bookingId: ticket.bookingId, status: 'VALID' },
        data: {
          status: 'USED',
          usedAt: now,
          checkedInById: req.user.id,
        },
      });

      const stats = await getShowtimeCheckinStats(ticket.booking.showtimeId);

      return res.status(200).json({
        data: {
          verified: true,
          message: `Check-in thành công toàn bộ ${allSeats.length} ghế (${allSeats.join(', ')})!`,
          ticketId: ticket.id,
          bookingCode: ticket.booking.code,
          seatLabel: allSeats.join(', '),
          seats: allSeats,
          seatTypeCode: ticket.bookingSeat?.seatTypeCode,
          movieTitle: ticket.booking.showtime?.movie?.title || 'Phim CineHub',
          cinemaName: ticket.booking.showtime?.cinema?.name || 'CineHub Cinema',
          screenName: ticket.booking.showtime?.auditorium?.name || 'Phòng chiếu',
          customerName: ticket.booking.user?.fullName || ticket.booking.contactEmail,
          customerEmail: ticket.booking.user?.email || ticket.booking.contactEmail,
          status: 'USED',
          usedAt: now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          startTime: ticket.booking.showtime?.startTime
            ? new Date(ticket.booking.showtime.startTime).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'Suất chiếu',
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
      const allSeatLabels = booking.seats.map((s) => s.seatLabel);

      return res.status(200).json({
        data: {
          verified: true,
          message: `Check-in thành công toàn bộ ${allSeatLabels.length} ghế (${allSeatLabels.join(', ')})!`,
          ticketId: firstValid.id,
          qrPayload: buildQr(firstValid.id, firstValid.qrVersion),
          bookingCode: booking.code,
          seatLabel: allSeatLabels.join(', '),
          seats: allSeatLabels,
          movieTitle: booking.showtime?.movie?.title,
          cinemaName: booking.showtime?.cinema?.name,
          screenName: booking.showtime?.auditorium?.name,
          customerName: booking.user?.fullName || booking.contactEmail,
          customerEmail: booking.user?.email || booking.contactEmail,
          status: 'USED',
          usedAt: now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          startTime: booking.showtime?.startTime
            ? new Date(booking.showtime.startTime).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'Suất chiếu',
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
