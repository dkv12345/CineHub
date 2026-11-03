import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function optionalAuth(req, _res, next) {
  req.user = null;
  const authorization = req.get('authorization') || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (match) {
    try {
      const payload = jwt.verify(match[1], env.JWT_ACCESS_SECRET);
      if (payload && typeof payload === 'object') {
        const id = payload.sub ?? payload.userId ?? payload.id;
        if (typeof id === 'string' && UUID_PATTERN.test(id)) req.user = { id };
      }
    } catch {
      // Chat remains available to guests and callers with expired tokens.
    }
  }
  next();
}
