import { getMovieById, listMovies } from './movies.service.js';

export async function list(req, res) {
  const data = await listMovies(req.query);
  res.json({ data, total: data.length });
}

export async function get(req, res) {
  const movie = await getMovieById(req.params.id);
  if (!movie) return res.status(404).json({ error: { code: 'MOVIE_NOT_FOUND' } });
  res.json({ data: movie });
}
