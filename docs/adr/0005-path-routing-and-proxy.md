# ADR 0005: PathLocationStrategy Routing & Same-Origin Dev Proxy

- **Status**: Accepted
- **Date**: 2026-11-02

## Context

The legacy React application used hash-based URLs (`/#/verify-email`, `/#/reset-password`) and ran on Vite port `5173`. Hash routing is incompatible with Angular SSR, and cross-origin calls between `:4200` and `:4000` complicate `SameSite=Strict` HTTP-only refresh token cookies (`path=/api`).

## Decision

1. Use Angular `PathLocationStrategy` (default HTML5 pushState routing) for all routes (`/verify-email`, `/reset-password`, `/movies/:id`, `/showtimes`, `/seats`, etc.).
2. Update backend email templates and `mailer.js` to emit path-based URLs (`/reset-password?token=...`, `/verify-email`, `/auth`) using `CLIENT_URL` (default `http://localhost:4200`).
3. Run the Angular dev server on port `4200` with `apps/web/proxy.conf.json` forwarding `/api` to `http://localhost:4000` so refresh cookies with `SameSite=Strict; Path=/api` operate same-origin in development.

## Consequences

- Clean, SSR-compatible URLs across web and transactional emails.
- `SameSite=Strict` refresh cookies work seamlessly in local development and E2E tests.
