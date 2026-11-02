import { Router } from 'express';
import { prisma } from '@cinehub/db';

export const healthRouter = Router();

healthRouter.get('/', async (req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ status: 'ok', time: new Date().toISOString() });
});
