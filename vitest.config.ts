import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tsconfig = JSON.parse(readFileSync(resolve(__dirname, 'tsconfig.base.json'), 'utf8'));
const paths: Record<string, string[]> = tsconfig.compilerOptions?.paths ?? {};

const alias: Record<string, string> = {};
for (const [key, targets] of Object.entries(paths)) {
  const impl = targets.find((t) => !t.endsWith('.d.ts')) ?? targets[0];
  if (impl) {
    alias[key] = resolve(__dirname, impl);
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
