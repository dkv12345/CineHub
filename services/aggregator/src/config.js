import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';

config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)) });

export const galaxy = {
  baseUrl: process.env.GALAXY_BASE_URL ?? 'https://www.galaxycine.vn',
  delayMs: Number(process.env.GALAXY_REQUEST_DELAY_MS ?? 1000),
  daysAhead: Number(process.env.CRAWL_DAYS_AHEAD ?? 7),
};

export const mongoUri = process.env.MONGODB_URI;
