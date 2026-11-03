import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import { createServer } from 'node:http';

const angularApp = new AngularNodeAppEngine();

export const reqHandler = createNodeRequestHandler(async (req, res, next) => {
  try {
    const response = await angularApp.handle(req);
    if (response) {
      await writeResponseToNodeResponse(response, res);
    } else {
      next();
    }
  } catch (error) {
    next(error);
  }
});

if (isMainModule(import.meta.url)) {
  const port = Number(process.env['PORT'] || 4000);
  const server = createServer((req, res) => {
    void reqHandler(req, res, (err) => {
      res.statusCode = err ? 500 : 404;
      res.end(err ? 'Internal Server Error' : 'Not Found');
    });
  });
  server.listen(port);
}
