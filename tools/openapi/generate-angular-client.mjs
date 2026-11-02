import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const specPath = resolve(__dirname, '../../docs/api/openapi.json');
const outPath = resolve(
  __dirname,
  '../../libs/web/shared/data-access/src/lib/generated/api-client.ts',
);

const spec = JSON.parse(readFileSync(specPath, 'utf8'));

function schemaToTs(schema, indent = '') {
  if (!schema) return 'unknown';
  if (schema.$ref) {
    return schema.$ref.replace('#/components/schemas/', '');
  }
  if (schema.enum) {
    return schema.enum.map((v) => JSON.stringify(v)).join(' | ');
  }
  if (schema.type === 'string') return 'string';
  if (schema.type === 'number' || schema.type === 'integer') return 'number';
  if (schema.type === 'boolean') return 'boolean';
  if (schema.type === 'array') {
    const itemType = schemaToTs(schema.items, indent);
    return `Array<${itemType}>`;
  }
  if (Array.isArray(schema.type)) {
    const types = schema.type.map((t) =>
      t === 'null' ? 'null' : schemaToTs({ ...schema, type: t }, indent),
    );
    return types.join(' | ');
  }
  if (schema.anyOf || schema.oneOf) {
    const list = schema.anyOf || schema.oneOf;
    return list.map((s) => schemaToTs(s, indent)).join(' | ');
  }
  if (schema.type === 'object' || schema.properties) {
    const props = schema.properties ?? {};
    const required = new Set(schema.required ?? []);
    const entries = Object.entries(props);
    if (entries.length === 0) return 'Record<string, unknown>';
    const lines = entries.map(([key, propSchema]) => {
      const opt = required.has(key) ? '' : '?';
      return `${indent}  readonly ${key}${opt}: ${schemaToTs(propSchema, `${indent}  `)};`;
    });
    return `{\n${lines.join('\n')}\n${indent}}`;
  }
  return 'unknown';
}

const componentSchemas = spec.components?.schemas ?? {};
const schemaBlocks = Object.entries(componentSchemas).map(([name, schema]) => {
  return `export type ${name} = ${schemaToTs(schema)};`;
});

const methodBlocks = [];
for (const [pathTemplate, pathItem] of Object.entries(spec.paths ?? {})) {
  for (const [httpMethod, operation] of Object.entries(pathItem)) {
    const opId = operation.operationId;
    if (!opId) continue;

    const pathParams = (operation.parameters ?? []).filter((p) => p.in === 'path');
    const queryParams = (operation.parameters ?? []).filter((p) => p.in === 'query');
    const bodySchema =
      operation.requestBody?.content?.['application/json']?.schema ?? null;

    const successResp =
      operation.responses?.['200'] ?? operation.responses?.['201'] ?? null;
    const respSchema =
      successResp?.content?.['application/json']?.schema ?? null;
    const respType = respSchema ? schemaToTs(respSchema) : 'unknown';

    const args = [];
    for (const p of pathParams) {
      args.push(`${p.name}: string`);
    }
    if (bodySchema) {
      args.push(`body: ${schemaToTs(bodySchema)}`);
    }
    if (queryParams.length > 0) {
      const qProps = queryParams
        .map((q) => `readonly ${q.name}?: ${schemaToTs(q.schema)}`)
        .join('; ');
      args.push(`params?: { ${qProps} }`);
    }

    const interpolatedPath = pathTemplate.replace(/\{(\w+)\}/g, '${encodeURIComponent($1)}');
    const urlExpr = pathParams.length > 0 ? `\`${interpolatedPath}\`` : `'${pathTemplate}'`;

    const querySnippet =
      queryParams.length > 0
        ? `const query = this.buildQueryString(params);\n    const url = query ? \`\${${urlExpr}}?\${query}\` : ${urlExpr};`
        : `const url = ${urlExpr};`;

    const methodUpper = httpMethod.toUpperCase();
    const bodyArg = bodySchema ? ', body' : '';

    methodBlocks.push(`  /**
   * ${operation.summary ?? opId}
   * \`${methodUpper} ${pathTemplate}\`
   */
  ${opId}(${args.join(', ')}): Promise<${respType}> {
    ${querySnippet}
    return this.request<${respType}>('${methodUpper}', url${bodyArg});
  }`);
  }
}

const fileContent = `/* eslint-disable */
/**
 * AUTO-GENERATED FILE — DO NOT EDIT MANUALLY.
 * Source: docs/api/openapi.json (generated from @cinehub/contracts via tools/openapi/generate-angular-client.mjs)
 * Regenerate with: npm run api:spec && npm run api:client
 */

export type HttpRequestExecutor = <TResponse>(
  method: string,
  url: string,
  body?: unknown,
) => Promise<TResponse>;

${schemaBlocks.join('\n\n')}

export class CineHubGeneratedApiClient {
  constructor(private readonly request: HttpRequestExecutor) {}

  private buildQueryString(params?: Record<string, unknown>): string {
    if (!params) return '';
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        search.set(key, String(value));
      }
    }
    return search.toString();
  }

${methodBlocks.join('\n\n')}
}
`;

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, fileContent, 'utf8');
process.stdout.write(`Generated TypeScript API client at ${outPath}\n`);

