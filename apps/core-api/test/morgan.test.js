import { describe, expect, it } from 'vitest';
import EventEmitter from 'node:events';
import morgan from 'morgan';
import { createApp } from '../src/bootstrap/app.js';

describe('Morgan HTTP logger middleware', () => {
  it('instantiates createApp with morgan middleware included', () => {
    const app = createApp();
    expect(app).toBeDefined();
    expect(typeof app.use).toBe('function');
  });

  it('formats HTTP request logs using combined format', () => {
    let output = '';
    const stream = {
      write: (str) => {
        output += str;
      },
    };

    const middleware = morgan('combined', { stream });
    const req = {
      method: 'GET',
      url: '/api/v1/movies',
      httpVersionMajor: 1,
      httpVersionMinor: 1,
      headers: {
        'user-agent': 'Mozilla/5.0 TestAgent',
        referer: 'http://localhost:4200/',
      },
      socket: {
        remoteAddress: '127.0.0.1',
      },
    };

    const res = new EventEmitter();
    res.statusCode = 200;
    res._headers = {};
    res.getHeader = () => null;
    res.headersSent = true;
    res.finished = false;

    let nextCalled = false;
    middleware(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);

    res.finished = true;
    res.emit('finish');

    expect(output).toContain('GET /api/v1/movies HTTP/1.1');
    expect(output).toContain('200');
    expect(output).toContain('Mozilla/5.0 TestAgent');
  });
});
