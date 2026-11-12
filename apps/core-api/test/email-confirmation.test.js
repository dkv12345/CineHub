import 'dotenv/config';
import { describe, it, expect } from 'vitest';
import { sendBookingConfirmationEmail } from '../src/platform/mail/mailer.js';

describe('Booking Confirmation Email Tests (Phase H)', () => {
  it('sends booking confirmation email with movie details and tickets', async () => {
    const res = await sendBookingConfirmationEmail({
      to: 'tester@cinehub.vn',
      bookingCode: 'CH261112TEST',
      movieTitle: 'Thám Tử Lừng Danh Conan',
      cinemaName: 'Galaxy CineX Hanoi',
      auditoriumName: 'Screen 1',
      showtime: '19:30 - 12/11/2026',
      seats: ['E5', 'E6'],
      totalAmount: 200000,
      tickets: [
        { ticketId: 'tk-1', seatLabel: 'E5', qrCode: 'tk-1.sig1' },
        { ticketId: 'tk-2', seatLabel: 'E6', qrCode: 'tk-2.sig2' },
      ],
    });

    expect(res).toBeDefined();
    expect(res.messageId).toBeDefined();
  });
});
