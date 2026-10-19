import { answerMessage } from './chatbot.service.js';

export async function reply(req, res) {
  try {
    const result = await answerMessage(req.valid.body.message, {
      sessionId: req.valid.body.sessionId,
      userId: req.user?.id ?? null,
    });
    res.json(result);
  } catch (error) {
    req.log?.error({ err: error }, 'CineBot database lookup failed.');
    const code = error?.code;
    let message = `Chatbot database lookup failed (${error?.name || 'unknown error'}${code ? `, ${code}` : ''}). Check the Core API logs.`;

    if (code === 'P1000') {
      message = 'MySQL authentication failed (Prisma P1000). Check DATABASE_URL credentials.';
    } else if (code === 'P1001') {
      message =
        'MySQL is unreachable (Prisma P1001). Check that the database is running and DATABASE_URL points to the correct host and port.';
    } else if (code === 'P1002') {
      message = 'MySQL connection timed out (Prisma P1002). Check the database server and network.';
    } else if (code === 'P2021' || code === 'P2022') {
      message = `Chatbot database schema error (${code}). Apply the latest database migrations; see the Core API logs for details.`;
    }

    res.status(503).json({
      error: {
        code: code || 'CHATBOT_DATABASE_ERROR',
        message,
        requestId: req.id,
      },
    });
  }
}
