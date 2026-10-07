import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';

export function notFound(req, res) {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Không tìm thấy đường dẫn',
    },
  });
}

export function errorHandler(err, req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dữ liệu không hợp lệ',
        details: err.issues,
      },
    });
  }

  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }

  if (req.log) {
    req.log.error(err);
  } else {
    console.error(err);
  }

  res.status(500).json({
    error: {
      code: 'INTERNAL',
      message: 'Lỗi hệ thống',
    },
  });
}
