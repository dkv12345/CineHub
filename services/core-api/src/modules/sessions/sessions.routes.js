import { Router } from 'express';
import { listSessions } from './sessions.service.js';

export const sessionsRouter = Router();

sessionsRouter.get('/', async (req, res) => {
  try {
    const data = await listSessions();
    res.json(data);
  } catch (error) {
    console.error('Failed to list sessions from DB:', error);
    res.status(500).json({ error: { message: 'Failed to fetch sessions' } });
  }
});
