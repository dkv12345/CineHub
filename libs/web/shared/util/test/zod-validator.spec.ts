import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { zodFieldValidator, zodFormGroupValidator, fmt } from '../src/index';

describe('shared-util', () => {
  it('validates single control with zodFieldValidator', () => {
    const validator = zodFieldValidator(z.string().email('Invalid email'));
    expect(validator({ value: 'bad' } as never)).toEqual({ zod: 'Invalid email' });
    expect(validator({ value: 'user@cinehub.vn' } as never)).toBeNull();
  });

  it('validates form group with zodFormGroupValidator', () => {
    const schema = z.object({
      email: z.string().email('Email invalid'),
      password: z.string().min(8, 'Password too short'),
    });
    const validator = zodFormGroupValidator(schema);
    expect(validator({ value: { email: 'nope', password: '123' } } as never)).toEqual({
      email: 'Email invalid',
      password: 'Password too short',
    });
  });

  it('formats Vietnamese currency', () => {
    expect(fmt(90000)).toContain('90.000');
  });
});
