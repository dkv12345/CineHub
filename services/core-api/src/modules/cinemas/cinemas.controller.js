import { listCinemas, toCinemaDto } from './cinemas.service.js';

export async function list(req, res) {
  const { page, pageSize, chain, province } = req.valid.query;
  const { rows, total } = await listCinemas({ page, pageSize, chain, province });
  res.json({
    data: rows.map(toCinemaDto),
    meta: { page, pageSize, total },
  });
}
