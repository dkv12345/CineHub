import { listConcessions, toConcessionDto } from './concessions.service.js';

export async function list(req, res) {
  const { chain, cinemaCode, cinemaId, seats } = req.valid.query;
  const rows = await listConcessions({ chain, cinemaCode, cinemaId, seats });
  res.json({ data: rows.map(toConcessionDto) });
}
