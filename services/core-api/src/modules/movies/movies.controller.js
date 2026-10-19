import { getMovieById } from './movies.service.js';

export async function get(req, res) {
  const movie = await getMovieById(req.valid.params.id);
  if (!movie) return res.status(404).json({ error: { code: 'MOVIE_NOT_FOUND' } });
  res.json({ data: movie });
}
