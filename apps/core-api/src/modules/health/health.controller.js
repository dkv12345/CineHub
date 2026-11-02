import { getHealthStatus } from './health.service.js';

export async function check(_req, res) {
  const payload = await getHealthStatus();
  res.json(payload);
}
