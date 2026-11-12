import { listSessions } from './sessions.service.js';

export async function list(_req, res) {
  const data = await listSessions(_req.valid?.query ?? _req.query);
  res.json(data);
}
