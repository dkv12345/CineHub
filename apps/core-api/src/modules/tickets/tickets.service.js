import { prisma } from '@cinehub/db';
import { verifyQr } from '../../platform/utils/qr.js';
import { AppError } from '../../platform/utils/errors.js';

/**
 * Scan and validate a QR ticket, then check-in if valid.
 *
 * @param {Object} params
 * @param {string} params.qrString - Format: `${ticketId}.${hmac}`
 * @param {string} [params.staffId]
 * @returns {Promise<any>}
 */
export async function checkInTicket({ qrString, staffId }) {
  if (!qrString || typeof qrString !== 'string') {
    throw new AppError(400, 'BAD_REQUEST', 'Mã QR không hợp lệ');
  }

  const [ticketId] = qrString.split('.');
  if (!ticketId) {
    throw new AppError(400, 'INVALID_QR', 'Định dạng mã vé không đúng');
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      booking: {
        include: {
          showtime: {
            include: {
              movie: true,
              cinema: true,
              auditorium: true,
            },
          },
        },
      },
      bookingSeat: {
        include: {
          showtimeSeat: {
            include: {
              seat: true,
            },
          },
        },
      },
    },
  });

  // Support Single Booking QR code representing all seats in the order
  if (!ticket) {
    const booking = await prisma.booking.findFirst({
      where: {
        OR: [{ id: ticketId }, { code: ticketId }],
      },
      include: {
        tickets: true,
        seats: true,
        showtime: {
          include: {
            movie: true,
            cinema: true,
            auditorium: true,
          },
        },
      },
    });

    if (booking) {
      const verifiedBookingId = verifyQr(qrString, 1);
      if (
        !verifiedBookingId ||
        (verifiedBookingId !== booking.id && verifiedBookingId !== booking.code)
      ) {
        throw new AppError(
          400,
          'INVALID_QR_SIGNATURE',
          'Chữ ký mã QR vé không hợp lệ hoặc đã bị chỉnh sửa',
        );
      }

      const allUsed =
        booking.tickets.length > 0 && booking.tickets.every((t) => t.status === 'USED');
      if (allUsed) {
        throw new AppError(
          400,
          'TICKET_ALREADY_USED',
          'Đơn vé này đã được sử dụng check-in trước đó',
        );
      }

      await prisma.ticket.updateMany({
        where: { bookingId: booking.id },
        data: {
          status: 'USED',
          usedAt: new Date(),
          checkedInById: staffId || null,
        },
      });

      return {
        ticketId: booking.id,
        status: 'USED',
        usedAt: new Date(),
        movieTitle: booking.showtime?.movie?.title || 'Phim CineHub',
        cinemaName: booking.showtime?.cinema?.name || 'CineHub Cinema',
        auditoriumName: booking.showtime?.auditorium?.name || 'Phòng chiếu',
        showtimeStart: booking.showtime?.startTime,
        seatLabel: booking.seats.map((s) => s.seatLabel).join(', '),
        bookingCode: booking.code,
      };
    }

    throw new AppError(404, 'TICKET_NOT_FOUND', 'Vé không tồn tại trong hệ thống');
  }

  // 1. Verify HMAC signature
  const verifiedId = verifyQr(qrString, ticket.qrVersion);
  if (!verifiedId || verifiedId !== ticket.id) {
    throw new AppError(
      400,
      'INVALID_QR_SIGNATURE',
      'Chữ ký mã QR vé không hợp lệ hoặc đã bị chỉnh sửa',
    );
  }

  // 2. Check ticket status
  if (ticket.status === 'USED') {
    throw new AppError(400, 'TICKET_ALREADY_USED', 'Vé này đã được sử dụng check-in trước đó', {
      usedAt: ticket.usedAt,
    });
  }

  if (ticket.status === 'VOID') {
    throw new AppError(400, 'TICKET_VOID', 'Vé này đã bị hủy hoặc vô hiệu hóa');
  }

  // 3. Mark ticket as USED
  const updatedTicket = await prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      status: 'USED',
      usedAt: new Date(),
      checkedInById: staffId || null,
    },
  });

  return {
    ticketId: updatedTicket.id,
    status: updatedTicket.status,
    usedAt: updatedTicket.usedAt,
    movieTitle: ticket.booking.showtime.movie.title,
    cinemaName: ticket.booking.showtime.cinema.name,
    auditoriumName: ticket.booking.showtime.auditorium.name,
    showtimeStart: ticket.booking.showtime.startTime,
    seatLabel: ticket.bookingSeat.seatLabel,
    bookingCode: ticket.booking.code,
  };
}
