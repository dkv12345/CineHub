import { listSessions } from './sessions.service.js';

export async function list(_req, res) {
  const data = await listSessions();
  res.json(data);
}
