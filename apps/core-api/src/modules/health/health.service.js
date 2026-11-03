import * as healthRepository from './health.repository.js';

export async function getHealthStatus() {
  await healthRepository.pingDatabase();
  return { status: 'ok', time: new Date().toISOString() };
}
