import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const result = spawnSync('npx', ['prisma', ...args], {
  stdio: 'inherit',
  env: process.env,
});

process.exit(result.status ?? 1);
