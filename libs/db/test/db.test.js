import { describe, expect, it } from 'vitest';
import { prisma } from '../src/index.js';

describe('@cinehub/db client export', () => {
  it('exports a configured PrismaClient singleton instance', () => {
    expect(prisma).toBeDefined();
    expect(typeof prisma.$connect).toBe('function');
    expect(typeof prisma.$disconnect).toBe('function');
  });
});
