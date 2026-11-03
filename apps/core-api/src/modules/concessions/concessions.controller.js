import { listConcessions, toConcessionDto } from './concessions.service.js';

export async function list(req, res) {
  const { chain, cinemaCode } = req.valid.query;
  const rows = await listConcessions({ chain, cinemaCode });
  res.json({ data: rows.map(toConcessionDto) });
}
