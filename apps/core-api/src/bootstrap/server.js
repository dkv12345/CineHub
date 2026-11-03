import { prisma } from '@cinehub/db';
import { env } from '../platform/config/env.js';
import { createApp } from './app.js';
import { logger } from '../platform/observability/logger.js';
import { closeMongo } from '../modules/chatbot/index.js';

const server = createApp().listen(env.PORT, () => {
  logger.info(`core-api chạy tại http://localhost:${env.PORT}`);
});

function shutdown(signal) {
  logger.info(`${signal}: đang tắt server`);
  server.close(async () => {
    await Promise.all([prisma.$disconnect(), closeMongo()]);
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
