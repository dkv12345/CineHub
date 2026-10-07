import { prisma } from '@cinehub/db';
import { env } from './config/env.js';
import { createApp } from './app.js';
import { logger } from './lib/logger.js';

const server = createApp().listen(env.PORT, () => {
  logger.info(`core-api chạy tại http://localhost:${env.PORT}`);
});

function shutdown(signal) {
  logger.info(`${signal}: đang tắt server`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
