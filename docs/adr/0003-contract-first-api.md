# ADR 0003: Contract-First API with Zod-to-OpenAPI & Generated Angular Client

- **Status**: Accepted
- **Date**: 2026-11-02

## Context

Previously, backend request validation used Zod schemas while the frontend maintained hand-written TypeScript API files (`services/*Api.ts`), creating risk of schema drift between `core-api` and `web`.

## Decision

1. Rename `@cinehub/shared` to `@cinehub/contracts` (`libs/shared/contracts`).
2. Maintain canonical Zod schemas, domain constants, and error codes in `libs/shared/contracts`.
3. Generate an OpenAPI 3.1 specification (`docs/api/openapi.json`) directly from `@cinehub/contracts` via `npm run api:spec`.
4. Generate the typed Angular `HttpClient` API service and DTO models into `libs/web/shared/data-access` via `npm run api:client`.
5. Enforce a CI drift check (`npm run api:spec && npm run api:client && git diff --exit-code`) so schema changes cannot merge without regenerating the spec and client.

## Consequences

- Zero manual `*Api.ts` maintenance in the frontend.
- Compile-time type safety from backend Zod contracts to Angular SignalStores and Reactive Forms.
