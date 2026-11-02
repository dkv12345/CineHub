import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import prettier from 'prettier';
import { generateOpenApiDocument } from '../../libs/shared/contracts/src/openapi.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(__dirname, '../../docs/api/openapi.json');

mkdirSync(dirname(outputPath), { recursive: true });

const doc = generateOpenApiDocument();
const rawJson = `${JSON.stringify(doc, null, 2)}\n`;
const config = (await prettier.resolveConfig(outputPath)) ?? {};
const formatted = await prettier.format(rawJson, { ...config, filepath: outputPath });
writeFileSync(outputPath, formatted, 'utf8');

process.stdout.write(`Generated OpenAPI 3.1 spec at ${outputPath}\n`);
