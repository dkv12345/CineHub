import { prisma } from '@cinehub/db';
import { env } from '../platform/config/env.js';
import { createApp } from './app.js';
import { logger } from '../platform/observability/logger.js';
import { closeMongo } from '../modules/chatbot/index.js';
import { cleanExpiredBookingsAndHolds } from '../jobs/cleanup-expired.js';

const server = createApp().listen(env.PORT, () => {
  logger.info(`core-api chạy tại http://localhost:${env.PORT}`);
});

// Run expired bookings & holds cleanup job every 60 seconds
const cleanupInterval = setInterval(() => {
  cleanExpiredBookingsAndHolds().catch((err) => {
    logger.warn({ err: err.message }, '[Cleanup Timer] Recurring cleanup failed');
  });
}, 60000);

function shutdown(signal) {
  logger.info(`${signal}: đang tắt server`);
  if (cleanupInterval) clearInterval(cleanupInterval);
  server.close(async () => {
    await Promise.all([prisma.$disconnect(), closeMongo()]);
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
