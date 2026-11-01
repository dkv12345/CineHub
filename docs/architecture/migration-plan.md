# CineHub Nx & Angular 20+ Migration Plan

## 1. Executive Summary

This document defines the phased, zero-downtime architecture migration of **CineHub** from an npm-workspaces React + Express monorepo to an enterprise **Nx Monorepo** with an **Angular 20+ Frontend** (standalone components, zoneless change detection, Signals, NgRx SignalStore, SSR, Three.js outside `NgZone`, Transloco i18n) and a **layered Express 5 Modular Monolith** (`bootstrap/`, `platform/`, `modules/` with explicit `repository` layers and barrel `index.js` boundaries).

All changes are executed on branch `refactor/nx-angular-migration` using small, atomic, Conventional Commit steps with `git mv` to preserve history and continuous verification (`lint`, `test`, `build`) at every phase boundary.

---

## 2. Complete File Move & Mapping Inventory

### 2.1. Backend, Ingestion, Shared Libraries & Infrastructure (`git mv` in Phase 1)

| Source Path (`main`)                                                           | Target Path (Nx Monorepo)                                                  | Action                                    |
| :----------------------------------------------------------------------------- | :------------------------------------------------------------------------- | :---------------------------------------- |
| `docker-compose.yml`                                                           | `infra/docker/docker-compose.yml`                                          | `git mv`                                  |
| `packages/db/package.json`                                                     | `libs/db/package.json`                                                     | `git mv`                                  |
| `packages/db/prisma/migrations/20261016035752_concession_fields/migration.sql` | `libs/db/prisma/migrations/20261016035752_concession_fields/migration.sql` | `git mv`                                  |
| `packages/db/prisma/migrations/migration_lock.toml`                            | `libs/db/prisma/migrations/migration_lock.toml`                            | `git mv`                                  |
| `packages/db/prisma/schema.prisma`                                             | `libs/db/prisma/schema.prisma`                                             | `git mv`                                  |
| `packages/db/prisma/seed.js`                                                   | `libs/db/prisma/seed.js`                                                   | `git mv`                                  |
| `packages/db/prisma/seed/concessions.js`                                       | `libs/db/prisma/seed/concessions.js`                                       | `git mv`                                  |
| `packages/db/prisma/seed/seats.js`                                             | `libs/db/prisma/seed/seats.js`                                             | `git mv`                                  |
| `packages/db/scripts/prisma.mjs`                                               | `libs/db/scripts/prisma.mjs`                                               | `git mv`                                  |
| `packages/db/src/index.js`                                                     | `libs/db/src/index.js`                                                     | `git mv`                                  |
| `packages/shared/package.json`                                                 | `libs/shared/contracts/package.json`                                       | `git mv` + rename to `@cinehub/contracts` |
| `packages/shared/src/constants.js`                                             | `libs/shared/contracts/src/constants.js`                                   | `git mv`                                  |
| `packages/shared/src/index.js`                                                 | `libs/shared/contracts/src/index.js`                                       | `git mv`                                  |
| `packages/shared/src/schemas.js`                                               | `libs/shared/contracts/src/schemas.js`                                     | `git mv`                                  |
| `services/aggregator/package.json`                                             | `apps/aggregator/package.json`                                             | `git mv`                                  |
| `services/aggregator/src/adapters/galaxyAdapter.js`                            | `apps/aggregator/src/adapters/galaxyAdapter.js`                            | `git mv`                                  |
| `services/aggregator/src/config.js`                                            | `apps/aggregator/src/config.js`                                            | `git mv`                                  |
| `services/aggregator/src/galaxyClient.js`                                      | `apps/aggregator/src/galaxyClient.js`                                      | `git mv`                                  |
| `services/aggregator/src/jobs/crawl-galaxy.js`                                 | `apps/aggregator/src/jobs/crawl-galaxy.js`                                 | `git mv`                                  |
| `services/aggregator/src/saveRaw.js`                                           | `apps/aggregator/src/saveRaw.js`                                           | `git mv`                                  |
| `services/aggregator/src/upsert/catalog.js`                                    | `apps/aggregator/src/upsert/catalog.js`                                    | `git mv`                                  |
| `services/aggregator/test/galaxyAdapter.test.js`                               | `apps/aggregator/test/galaxyAdapter.test.js`                               | `git mv`                                  |
| `services/core-api/package.json`                                               | `apps/core-api/package.json`                                               | `git mv`                                  |
| `services/core-api/scripts/chat-scenario.mjs`                                  | `apps/core-api/src/scripts/chat-scenario.mjs`                              | `git mv`                                  |
| `services/core-api/scripts/gemini-probe.mjs`                                   | `apps/core-api/src/scripts/gemini-probe.mjs`                               | `git mv`                                  |
| `services/core-api/src/app.js`                                                 | `apps/core-api/src/bootstrap/app.js`                                       | `git mv`                                  |
| `services/core-api/src/routes.js`                                              | `apps/core-api/src/bootstrap/routes.js`                                    | `git mv`                                  |
| `services/core-api/src/server.js`                                              | `apps/core-api/src/bootstrap/server.js`                                    | `git mv`                                  |
| `services/core-api/src/config/cors.js`                                         | `apps/core-api/src/platform/config/cors.js`                                | `git mv`                                  |
| `services/core-api/src/config/env.js`                                          | `apps/core-api/src/platform/config/env.js`                                 | `git mv`                                  |
| `services/core-api/src/middleware/auth.middleware.js`                          | `apps/core-api/src/platform/http/auth.middleware.js`                       | `git mv`                                  |
| `services/core-api/src/middleware/errorHandler.js`                             | `apps/core-api/src/platform/http/errorHandler.js`                          | `git mv`                                  |
| `services/core-api/src/middleware/optionalAuth.js`                             | `apps/core-api/src/platform/http/optionalAuth.js`                          | `git mv`                                  |
| `services/core-api/src/middleware/rateLimit.js`                                | `apps/core-api/src/platform/http/rateLimit.js`                             | `git mv`                                  |
| `services/core-api/src/middleware/validate.js`                                 | `apps/core-api/src/platform/http/validate.js`                              | `git mv`                                  |
| `services/core-api/src/lib/googleOAuth.js`                                     | `apps/core-api/src/platform/security/googleOAuth.js`                       | `git mv`                                  |
| `services/core-api/src/lib/jwt.js`                                             | `apps/core-api/src/platform/security/jwt.js`                               | `git mv`                                  |
| `services/core-api/src/lib/mailer.js`                                          | `apps/core-api/src/platform/mail/mailer.js`                                | `git mv`                                  |
| `services/core-api/src/templates/layout.js`                                    | `apps/core-api/src/platform/mail/templates/layout.js`                      | `git mv`                                  |
| `services/core-api/src/templates/resetPasswordEmail.js`                        | `apps/core-api/src/platform/mail/templates/resetPasswordEmail.js`          | `git mv`                                  |
| `services/core-api/src/templates/resetSuccessEmail.js`                         | `apps/core-api/src/platform/mail/templates/resetSuccessEmail.js`           | `git mv`                                  |
| `services/core-api/src/templates/verifyEmail.js`                               | `apps/core-api/src/platform/mail/templates/verifyEmail.js`                 | `git mv`                                  |
| `services/core-api/src/templates/welcomeEmail.js`                              | `apps/core-api/src/platform/mail/templates/welcomeEmail.js`                | `git mv`                                  |
| `services/core-api/src/lib/logger.js`                                          | `apps/core-api/src/platform/observability/logger.js`                       | `git mv`                                  |
| `services/core-api/src/lib/errors.js`                                          | `apps/core-api/src/platform/utils/errors.js`                               | `git mv`                                  |
| `services/core-api/src/lib/qr.js`                                              | `apps/core-api/src/platform/utils/qr.js`                                   | `git mv`                                  |
| `services/core-api/src/lib/text.js`                                            | `apps/core-api/src/platform/utils/text.js`                                 | `git mv`                                  |
| `services/core-api/src/jobs/embed-movies.js`                                   | `apps/core-api/src/jobs/embed-movies.js`                                   | `git mv`                                  |
| `services/core-api/src/modules/auth/auth.controller.js`                        | `apps/core-api/src/modules/auth/auth.controller.js`                        | `git mv`                                  |
| `services/core-api/src/modules/auth/auth.routes.js`                            | `apps/core-api/src/modules/auth/auth.routes.js`                            | `git mv`                                  |
| `services/core-api/src/modules/auth/auth.schema.js`                            | `apps/core-api/src/modules/auth/auth.schema.js`                            | `git mv`                                  |
| `services/core-api/src/modules/auth/auth.service.js`                           | `apps/core-api/src/modules/auth/auth.service.js`                           | `git mv`                                  |
| `services/core-api/src/modules/chatbot/chatbot.controller.js`                  | `apps/core-api/src/modules/chatbot/chatbot.controller.js`                  | `git mv`                                  |
| `services/core-api/src/modules/chatbot/chatbot.nlp.js`                         | `apps/core-api/src/modules/chatbot/chatbot.nlp.js`                         | `git mv`                                  |
| `services/core-api/src/modules/chatbot/chatbot.routes.js`                      | `apps/core-api/src/modules/chatbot/chatbot.routes.js`                      | `git mv`                                  |
| `services/core-api/src/modules/chatbot/chatbot.schema.js`                      | `apps/core-api/src/modules/chatbot/chatbot.schema.js`                      | `git mv`                                  |
| `services/core-api/src/modules/chatbot/chatbot.service.js`                     | `apps/core-api/src/modules/chatbot/chatbot.service.js`                     | `git mv`                                  |
| `services/core-api/src/modules/chatbot/chatbot.session.js`                     | `apps/core-api/src/modules/chatbot/chatbot.session.js`                     | `git mv`                                  |
| `services/core-api/src/modules/chatbot/chatbot.vector.js`                      | `apps/core-api/src/modules/chatbot/chatbot.vector.js`                      | `git mv`                                  |
| `services/core-api/src/modules/cinemas/cinemas.controller.js`                  | `apps/core-api/src/modules/cinemas/cinemas.controller.js`                  | `git mv`                                  |
| `services/core-api/src/modules/cinemas/cinemas.routes.js`                      | `apps/core-api/src/modules/cinemas/cinemas.routes.js`                      | `git mv`                                  |
| `services/core-api/src/modules/cinemas/cinemas.schema.js`                      | `apps/core-api/src/modules/cinemas/cinemas.schema.js`                      | `git mv`                                  |
| `services/core-api/src/modules/cinemas/cinemas.service.js`                     | `apps/core-api/src/modules/cinemas/cinemas.service.js`                     | `git mv`                                  |
| `services/core-api/src/modules/concessions/concessions.controller.js`          | `apps/core-api/src/modules/concessions/concessions.controller.js`          | `git mv`                                  |
| `services/core-api/src/modules/concessions/concessions.routes.js`              | `apps/core-api/src/modules/concessions/concessions.routes.js`              | `git mv`                                  |
| `services/core-api/src/modules/concessions/concessions.schema.js`              | `apps/core-api/src/modules/concessions/concessions.schema.js`              | `git mv`                                  |
| `services/core-api/src/modules/concessions/concessions.service.js`             | `apps/core-api/src/modules/concessions/concessions.service.js`             | `git mv`                                  |
| `services/core-api/src/modules/health/health.routes.js`                        | `apps/core-api/src/modules/health/health.routes.js`                        | `git mv`                                  |
| `services/core-api/src/modules/movies/movies.controller.js`                    | `apps/core-api/src/modules/movies/movies.controller.js`                    | `git mv`                                  |
| `services/core-api/src/modules/movies/movies.routes.js`                        | `apps/core-api/src/modules/movies/movies.routes.js`                        | `git mv`                                  |
| `services/core-api/src/modules/movies/movies.schema.js`                        | `apps/core-api/src/modules/movies/movies.schema.js`                        | `git mv`                                  |
| `services/core-api/src/modules/movies/movies.service.js`                       | `apps/core-api/src/modules/movies/movies.service.js`                       | `git mv`                                  |
| `services/core-api/src/modules/recommendations/recommendations.controller.js`  | `apps/core-api/src/modules/recommendations/recommendations.controller.js`  | `git mv`                                  |
| `services/core-api/src/modules/recommendations/recommendations.routes.js`      | `apps/core-api/src/modules/recommendations/recommendations.routes.js`      | `git mv`                                  |
| `services/core-api/src/modules/recommendations/recommendations.schema.js`      | `apps/core-api/src/modules/recommendations/recommendations.schema.js`      | `git mv`                                  |
| `services/core-api/src/modules/recommendations/recommendations.service.js`     | `apps/core-api/src/modules/recommendations/recommendations.service.js`     | `git mv`                                  |
| `services/core-api/src/modules/sessions/sessions.routes.js`                    | `apps/core-api/src/modules/sessions/sessions.routes.js`                    | `git mv`                                  |
| `services/core-api/src/modules/sessions/sessions.service.js`                   | `apps/core-api/src/modules/sessions/sessions.service.js`                   | `git mv`                                  |
| `services/core-api/test/auth.http.test.js`                                     | `apps/core-api/test/auth.http.test.js`                                     | `git mv`                                  |
| `services/core-api/test/auth.service.test.js`                                  | `apps/core-api/test/auth.service.test.js`                                  | `git mv`                                  |
| `services/core-api/test/chatbot.controller.test.js`                            | `apps/core-api/test/chatbot.controller.test.js`                            | `git mv`                                  |
| `services/core-api/test/chatbot.gemini.test.js`                                | `apps/core-api/test/chatbot.gemini.test.js`                                | `git mv`                                  |
| `services/core-api/test/chatbot.nlp.test.js`                                   | `apps/core-api/test/chatbot.nlp.test.js`                                   | `git mv`                                  |
| `services/core-api/test/chatbot.semantic.test.js`                              | `apps/core-api/test/chatbot.semantic.test.js`                              | `git mv`                                  |
| `services/core-api/test/chatbot.session.test.js`                               | `apps/core-api/test/chatbot.session.test.js`                               | `git mv`                                  |
| `services/core-api/test/chatbot.vector.test.js`                                | `apps/core-api/test/chatbot.vector.test.js`                                | `git mv`                                  |
| `services/core-api/test/cinemas.test.js`                                       | `apps/core-api/test/cinemas.test.js`                                       | `git mv`                                  |
| `services/core-api/test/movies.test.js`                                        | `apps/core-api/test/movies.test.js`                                        | `git mv`                                  |
| `services/core-api/test/optionalAuth.test.js`                                  | `apps/core-api/test/optionalAuth.test.js`                                  | `git mv`                                  |

### 2.2. Frontend React → Angular Domain Libraries (Phases 4–8; React preserved until Phase 8)

| Legacy React File (`apps/web/...`)                                                                      | Target Angular Library / File                                                                                                                                | Phase                            |
| :------------------------------------------------------------------------------------------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------- |
| `apps/web/src/main.tsx`, `App.tsx`, `router.tsx`                                                        | `apps/web/src/{main.ts,main.server.ts,server.ts,app/app.component.ts,app/app.config.ts,app/app.config.server.ts,app/app.routes.ts,app/app.routes.server.ts}` | Phase 4 & 6 (removed in Phase 8) |
| `apps/web/src/components/Layout.tsx`                                                                    | `libs/web/shell/src/lib/{layout.component.ts,shell.routes.ts}`                                                                                               | Phase 4 (removed in Phase 8)     |
| `apps/web/src/components/ui.tsx`                                                                        | `libs/web/shared/ui/src/lib/*`                                                                                                                               | Phase 4 (removed in Phase 8)     |
| `apps/web/src/lib/authorizedAxios.ts`                                                                   | `libs/web/core/src/lib/{auth/auth.interceptor.ts,auth/auth.store.ts,auth/google-auth.service.ts,http/error.interceptor.ts,http/request-id.interceptor.ts}`   | Phase 4 (removed in Phase 8)     |
| `apps/web/src/mocks/data.mock.ts`, `sessions.mock.ts`, `src/data.ts`                                    | `libs/web/testing/src/lib/{handlers.ts,fixtures.ts}` + `libs/web/shared/util/src/lib/catalog-data.ts`                                                        | Phase 4 (removed in Phase 8)     |
| `apps/web/src/pages/Auth.tsx`, `VerifyEmail.tsx`, `ResetPassword.tsx`                                   | `libs/web/auth/{feature,data-access}/src/lib/*`                                                                                                              | Phase 5.1 (removed in Phase 8)   |
| `apps/web/src/pages/Home.tsx`, `MovieDetail.tsx`                                                        | `libs/web/catalog/{feature,data-access,ui}/src/lib/*`                                                                                                        | Phase 5.2 (removed in Phase 8)   |
| `apps/web/src/pages/Showtimes.tsx`, `components/ShowtimeFilterBar.tsx`                                  | `libs/web/showtimes/{feature,data-access,ui}/src/lib/*`                                                                                                      | Phase 5.3 (removed in Phase 8)   |
| `apps/web/src/utils/showtimeFilters.ts`, `showtimeFilters.test.ts`                                      | `libs/web/showtimes/util/src/lib/{showtime-filters.ts,showtime-filters.spec.ts}` (`git mv`)                                                                  | Phase 5.3                        |
| `apps/web/src/pages/Concessions.tsx`                                                                    | `libs/web/concessions/{feature,data-access}/src/lib/*`                                                                                                       | Phase 5.4 (removed in Phase 8)   |
| `apps/web/src/pages/Seats.tsx`, `Checkout.tsx`, `Result.tsx`                                            | `libs/web/booking/{feature,data-access,ui}/src/lib/*`                                                                                                        | Phase 5.5 (removed in Phase 8)   |
| `apps/web/src/components/SeatMap3D.tsx`, `SeatPOVScene.tsx`, `test/seat-map.test.ts`                    | `libs/web/seat-3d/src/lib/{seat-map-3d.component.ts,seat-pov-scene.component.ts,seat-map.spec.ts}`                                                           | Phase 5.5 (removed in Phase 8)   |
| `apps/web/src/pages/MyTickets.tsx`                                                                      | `libs/web/tickets/{feature,data-access}/src/lib/*`                                                                                                           | Phase 5.6 (removed in Phase 8)   |
| `apps/web/src/pages/Profile.tsx`                                                                        | `libs/web/account/{feature,data-access}/src/lib/*`                                                                                                           | Phase 5.7 (removed in Phase 8)   |
| Chatbot widget (from `Layout.tsx`) + `services/chatbotApi.ts`, `recommendationsApi.ts`                  | `libs/web/assistant/{feature,data-access}/src/lib/*`                                                                                                         | Phase 5.8 (removed in Phase 8)   |
| `apps/web/src/services/{authApi,moviesApi,sessionsApi,concessionsApi,chatbotApi,recommendationsApi}.ts` | `libs/web/shared/data-access/src/lib/generated/*` (generated from OpenAPI)                                                                                   | Phase 3–5 (removed in Phase 8)   |
| `apps/web/src/store.tsx`, `test/app.test.ts`, `vite.config.ts`                                          | Replaced by domain SignalStores and Angular CLI builder                                                                                                      | Phase 8 removal                  |

---

## 3. Execution Phases

- **Phase 0 – Baseline**: Record test results on `main`, fix test drift from PR #9 merge so baseline is 100% green, initialize Nx (`nx.json`, `tsconfig.base.json`) without moving code, verify `npm test` green.
- **Phase 1 – Repo Restructure**: Move `packages/*`, `services/*`, `docker-compose.yml` via `git mv`; rename `@cinehub/shared` to `@cinehub/contracts`; split `apps/core-api/src` into `bootstrap/`, `platform/`, `modules/`; add `index.js` barrels per backend module and `project.json` with `scope:*` and `type:*` tags.
- **Phase 2 – Tooling & Governance**: Configure `@nx/enforce-module-boundaries` and `angular-eslint` in `eslint.config.js`, Commitlint project-scope validation, Husky `lint-staged`, GitHub Actions CI with `nx affected`, `.github/CODEOWNERS`, multi-stage Dockerfiles (`infra/docker/`), and ADRs `0001`–`0006`.
- **Phase 3 – Backend Hardening & OpenAPI**: Add `repository` layer for every module in `apps/core-api` so services never call `prisma` directly; add `requestId` middleware and Pino propagation; update CORS/env/email templates to path-based URLs on `http://localhost:4200`; create `booking` planned module skeleton and Redis Lua lease helper skeleton; add OpenAPI 3.1 generator (`docs/api/openapi.json`) and Angular API client generator (`libs/web/shared/data-access`).
- **Phase 4 – Angular 20+ Foundation**: Configure Angular 20+ in `apps/web` (preserving React files until Phase 8), create `libs/web/{core,shell,shared/ui,shared/util,shared/data-access,testing}`, configure `proxy.conf.json`, `environment.ts`, Tailwind v4, Transloco (`vi`/`en`), functional interceptors (single shared `refresh$` Observable), guards, `AuthStore`, `GoogleAuthService`, and shell layout.
- **Phase 5 – Domain Migration**: Port all 8 domains (`auth` → `catalog` → `showtimes` → `concessions` → `booking + seat-3d` → `tickets` → `account` → `assistant`) with SignalStores, Reactive Forms + Zod validator adapter, Three.js outside `NgZone` with `DestroyRef` cleanup, MSW handlers, and unit tests.
- **Phase 6 – SSR, Hydration, i18n, Budgets & Accessibility**: Configure `@angular/ssr` with hybrid render modes (SSR + hydration for public catalog/showtimes routes; `RenderMode.Client` for booking/checkout/profile/tickets), guard browser-only APIs with `isPlatformBrowser`, enforce bundle budgets, and complete CDK a11y pass.
- **Phase 7 – Playwright E2E**: Create `apps/web-e2e` covering the full booking user journey, axe-core accessibility assertions on login and seat selection, and concurrent 401 silent token refresh deduplication verification.
- **Phase 8 – React Cleanup & Verification**: Remove legacy React files and dependencies, prune lockfile, verify zero React/Vite-React/`VITE_*`/axios references, verify `nx graph` and module boundaries.
- **Phase 9 – Final Documentation & DoD Sign-Off**: Replace `README.md` with the enterprise specification, verify all root scripts and Definition of Done items.
