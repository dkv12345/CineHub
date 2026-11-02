import { getRecommendations } from './recommendations.service.js';

export async function list(req, res) {
  const recommendations = await getRecommendations(req.valid.body);
  res.json({ data: recommendations });
}
