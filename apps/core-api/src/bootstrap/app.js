import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { corsOptions } from '../platform/config/cors.js';
import { logger } from '../platform/observability/logger.js';
import { requestId } from '../platform/observability/requestId.js';
import { routes } from './routes.js';
import { notFound, errorHandler } from '../platform/http/errorHandler.js';

export function createApp() {
  const app = express();

  app.use(requestId);
  app.use(helmet());
  app.use(cors(corsOptions));
  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => req.id,
      customProps: (req) => ({ requestId: req.id }),
    }),
  );

  app.use('/api/v1', routes);
  app.use('/api', routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
