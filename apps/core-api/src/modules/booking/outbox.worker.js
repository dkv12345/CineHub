import { prisma } from '@cinehub/db';
import { sendEmail, getClientUrl } from '../../platform/mail/mailer.js';
import { logger } from '../../platform/observability/logger.js';
import { getUserTicketById } from './booking.service.js';

let isProcessingOutbox = false;

export async function processPendingOutboxEvents() {
  if (isProcessingOutbox) return 0;
  isProcessingOutbox = true;

  try {
    const events = await prisma.outboxEvent.findMany({
      where: {
        status: 'PENDING',
        nextAttemptAt: { lte: new Date() },
      },
      orderBy: { createdAt: 'asc' },
      take: 25,
    });

    if (events.length === 0) return 0;
    let processedCount = 0;

    for (const ev of events) {
      try {
        // Idempotent consumer guard via InboxEvent
        const alreadyConsumed = await prisma.inboxEvent.findUnique({
          where: {
            consumer_eventId: {
              consumer: 'core-outbox-worker',
              eventId: ev.id,
            },
          },
        });

        if (alreadyConsumed) {
          await prisma.outboxEvent.update({
            where: { id: ev.id },
            data: { status: 'PROCESSED', processedAt: new Date() },
          });
          continue;
        }

        if (ev.eventType === 'BookingConfirmed') {
          const bookingId = ev.payload?.bookingId || ev.aggregateId;
          const dedupeKey = `TICKET_EMAIL:${bookingId}`;
          const existingLog = await prisma.notificationLog.findUnique({
            where: { dedupeKey },
          });

          if (!existingLog) {
            const ticketDto = await getUserTicketById(bookingId);
            const booking = await prisma.booking.findUnique({
              where: { id: bookingId },
              include: { user: true },
            });
            const toAddress =
              booking?.contactEmail || booking?.user?.email || 'customer@cinehub.vn';
            const ticketLink = `${getClientUrl()}/result/${ticketDto.id}`;

            const html = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; padding: 24px; border-radius: 16px;">
                <h2 style="color: #fbbf24; margin-top: 0;">🎬 Vé điện tử CineHub #${ticketDto.bookingCode}</h2>
                <p>Xin chào <strong>${booking?.user?.fullName || 'Quý khách'}</strong>, đơn đặt vé của bạn đã được xác nhận thành công!</p>
                <div style="background: #1e293b; padding: 16px; border-radius: 12px; margin: 16px 0;">
                  <p><strong>Phim:</strong> ${ticketDto.movieTitle}</p>
                  <p><strong>Rạp:</strong> ${ticketDto.cinemaName} — ${ticketDto.screenName}</p>
                  <p><strong>Suất chiếu:</strong> ${ticketDto.showTime} · ${ticketDto.showDate} (${ticketDto.format})</p>
                  <p><strong>Ghế:</strong> ${ticketDto.seats.join(', ')}</p>
                  <p><strong>Tổng thanh toán:</strong> ${ticketDto.totalPaid.toLocaleString('vi-VN')} đ</p>
                  <p><strong>Mã QR Check-in (HMAC-SHA256):</strong> <code style="color:#fbbf24;">${ticketDto.qrPayload}</code></p>
                </div>
                <p><a href="${ticketLink}" style="display:inline-block; background:#ef4444; color:#ffffff; padding:10px 18px; border-radius:8px; text-decoration:none; font-weight:bold;">Xem Vé Điện Tử & Mã QR</a></p>
              </div>
            `;
            const text = `[CineHub] Xác nhận vé #${ticketDto.bookingCode} | Phim: ${ticketDto.movieTitle} | Ghế: ${ticketDto.seats.join(', ')} | QR: ${ticketDto.qrPayload}`;

            await sendEmail({
              to: toAddress,
              subject: `[CineHub] Vé điện tử #${ticketDto.bookingCode} - ${ticketDto.movieTitle}`,
              html,
              text,
            });

            await prisma.notificationLog.create({
              data: {
                userId: booking?.userId || null,
                type: 'TICKET_CONFIRMATION',
                status: 'SENT',
                toAddress,
                dedupeKey,
                payload: {
                  bookingId,
                  bookingCode: ticketDto.bookingCode,
                  qrPayload: ticketDto.qrPayload,
                },
                sentAt: new Date(),
              },
            });
          }
        }

        await prisma.$transaction([
          prisma.inboxEvent.create({
            data: {
              consumer: 'core-outbox-worker',
              eventId: ev.id,
            },
          }),
          prisma.outboxEvent.update({
            where: { id: ev.id },
            data: {
              status: 'PROCESSED',
              processedAt: new Date(),
              attempts: { increment: 1 },
            },
          }),
        ]);
        processedCount++;
      } catch (err) {
        const nextDelayMs = Math.min(300_000, Math.pow(2, ev.attempts + 1) * 5_000);
        await prisma.outboxEvent.update({
          where: { id: ev.id },
          data: {
            attempts: { increment: 1 },
            lastError: String(err.message || err).slice(0, 490),
            nextAttemptAt: new Date(Date.now() + nextDelayMs),
            status: ev.attempts + 1 >= 5 ? 'DEAD' : 'PENDING',
          },
        });
        logger.warn({ err: err.message, eventId: ev.id }, '[OutboxWorker] Event processing error');
      }
    }

    return processedCount;
  } catch {
    return 0;
  } finally {
    isProcessingOutbox = false;
  }
}
