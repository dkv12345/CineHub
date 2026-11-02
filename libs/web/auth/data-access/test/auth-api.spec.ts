import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';
import { extractAuthErrorCode, formatAuthErrorMessage } from '../src/index';

describe('auth data-access error helpers', () => {
  it('maps INVALID_CREDENTIALS to Vietnamese message', () => {
    const err = new HttpErrorResponse({
      status: 401,
      error: { error: { code: 'INVALID_CREDENTIALS' } },
    });
    expect(extractAuthErrorCode(err)).toBe('INVALID_CREDENTIALS');
    expect(formatAuthErrorMessage(err)).toBe('Email hoặc mật khẩu không đúng.');
  });
});
