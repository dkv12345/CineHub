import { prisma } from '@cinehub/db';
import { env } from '../platform/config/env.js';
import { createApp } from './app.js';
import { logger } from '../platform/observability/logger.js';
import { closeMongo } from '../modules/chatbot/index.js';
import { sweepExpiredBookings } from '../modules/booking/booking.service.js';
import { processPendingOutboxEvents } from '../modules/booking/outbox.worker.js';

const server = createApp().listen(env.PORT, () => {
  logger.info(`core-api chạy tại http://localhost:${env.PORT}`);
});

const expiryTimer = setInterval(() => {
  void sweepExpiredBookings();
}, env.EXPIRY_SWEEP_INTERVAL_MS || 5000);

const outboxTimer = setInterval(() => {
  void processPendingOutboxEvents();
}, 10000);

function shutdown(signal) {
  logger.info(`${signal}: đang tắt server`);
  clearInterval(expiryTimer);
  clearInterval(outboxTimer);
  server.close(async () => {
    await Promise.all([prisma.$disconnect(), closeMongo()]);
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
