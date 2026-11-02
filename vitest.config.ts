import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tsconfig = JSON.parse(readFileSync(resolve(__dirname, 'tsconfig.base.json'), 'utf8'));
const paths: Record<string, string[]> = tsconfig.compilerOptions?.paths ?? {};

const alias: Record<string, string> = {};
for (const [key, targets] of Object.entries(paths)) {
  if (targets[0]) {
    alias[key] = resolve(__dirname, targets[0]);
  }
}

export default defineConfig({
  resolve: {
    alias,
  },
  test: {
    setupFiles: [resolve(__dirname, 'vitest.setup.ts')],
  },
});
