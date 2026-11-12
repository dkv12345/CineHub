# CHAPTER 4. SYSTEM DESIGN

This chapter presents the architectural, contract, database, behavioural, and algorithmic design of the CineHub platform. Bridging the analytical specifications of Chapter 3 and the source-level implementation of Chapter 6, the design establishes how the Angular 20 presentation tier, the Express 5 modular monolith, the ingestion worker, and the polyglot persistence tier (MySQL 8.4, Redis 7, and MongoDB 7) collaborate to enforce transactional integrity, sub-second seat concurrency control, and grounded conversational discovery. All entity names, enumerations, route paths, and Redis key patterns correspond directly to `libs/db/prisma/schema.prisma`, `libs/shared/contracts`, and `apps/core-api`.

## 4.1. Proposed System Architecture

### 4.1.1. High-Level System Architecture

CineHub is architected as a containerised, multi-tier platform managed within an Nx monorepo. Following the C4 model at the Container level, the system boundary encompasses four runtime compute containers and three specialised data stores communicating with five external partner services over explicit network protocols. Figure 4.1.1-1 illustrates the high-level C4 container architecture.

> **[INSERT FIGURE 4.1.1-1 | D22a | C4 container diagram: high-level system architecture | owner: Khánh Vi | file: docs/architecture/D22_c4_container.mmd]**
> _Figure 4.1.1-1. High-level C4 Container architecture of the CineHub platform showing internal runtime containers, polyglot data stores, and external service integrations (D22a)._

As depicted in Figure 4.1.1-1, the internal containers are partitioned by operational responsibility:

1. **Angular Web Application (`apps/web`)**: A hybrid Server-Side Rendered (SSR) and Single-Page Application (SPA) built with Angular 20, TypeScript, Angular Signals, NgRx SignalStore, Tailwind CSS, and Three.js. Public discovery routes (`/`, `/movie/:id`, `/showtimes`) are pre-rendered on the Node.js SSR engine with event-replay hydration for fast First Contentful Paint (FCP), whereas interactive stateful routes (`/seats/:showtimeId`, `/concessions`, `/checkout`, `/result/:ticketId`, `/my-tickets`, `/profile`, `/auth`) execute in client rendering mode.
2. **Core API Service (`apps/core-api`)**: A Node.js 20+ and Express 5 modular monolith exposing versioned RESTful endpoints under `/api/v1` (with `/api` compatibility aliases). It encapsulates identity management, catalogue and showtime querying, atomic seat-hold orchestration, checkout pricing, payment gateway integration, cryptographic QR ticket verification, and the CineBot RAG pipeline.
3. **Aggregator Crawler Service (`apps/aggregator`)**: An ingestion worker that periodically polls public Galaxy Cinema feeds over HTTPS, archives raw JSON payloads into MongoDB (`crawl_raw_items`), normalises entities through `galaxyAdapter`, and upserts structured catalogue and schedule records into MySQL.
4. **Background Worker & Reconciliation Daemon**: Asynchronous jobs responsible for relaying transactional outbox events (`OutboxEvent` polled via `FOR UPDATE SKIP LOCKED`), dispatching SMTP emails, sweeping expired seat holds (`booking-expiry`), and vectorising movie metadata (`embed-movies.js`).
5. **Polyglot Persistence Tier**: MySQL 8.4 serves as the single ACID source of truth for identity, catalogue, scheduling, booking, payment, and ticketing records; Redis 7 provides sub-millisecond atomic seat leases (`SET NX EX 900`), read-aside caches, and sliding-window rate limiters; MongoDB 7 stores unstructured crawler dumps, community reviews, multi-turn chat sessions (`ai_chat_sessions`), and 768-dimensional semantic vectors (`movie_embeddings`).

### 4.1.2. Angular Presentation Layer

To prevent cross-domain coupling as the user interface scales, the frontend is organised into domain-sliced Nx libraries under `libs/web/*`, governed by compile-time dependency rules enforced via `@nx/enforce-module-boundaries`. Each domain is decomposed into up to four library layers: `feature` (routed smart components), `data-access` (NgRx SignalStores and typed API services), `ui` (stateless presentational components), and `util` (pure formatting and validation functions). Figure 4.1.2-1 presents the Angular workspace architecture and dependency flow.

> **[INSERT FIGURE 4.1.2-1 | D23 | Architecture diagram: Angular Nx library layers and dependency rules | owner: Khánh Vi | file: docs/architecture/D23_angular_architecture.mmd]**
> _Figure 4.1.2-1. Angular presentation layer architecture showing `apps/web`, domain-sliced `libs/web/*` libraries, SignalStore state management, and strict unidirectional dependency rules (D23)._

As shown in Figure 4.1.2-1, `apps/web` serves solely as a thin bootstrapper (`main.ts`, `app.config.ts`, `app.routes.ts`) that wires the router, hydration, and the functional HTTP interceptor chain (`requestIdInterceptor` $\to$ `authInterceptor` $\to$ `errorInterceptor`). The shell library (`libs/web/shell`) composes the global layout and lazy-loads eight feature domains via `loadChildren`: `catalog`, `showtimes`, `concessions`, `booking`, `tickets`, `account`, `auth`, and the floating `assistant` concierge widget. Strictly enforced ESLint rules ensure that `type:feature` libraries depend only on `data-access`, `ui`, and `util`—never on another `feature` library—while the WebGL auditorium renderer (`libs/web/seat-3d`) runs outside Angular's zone (`NgZone.runOutsideAngular`) to sustain 60 FPS rendering without triggering unnecessary component change detection cycles.

### 4.1.3. Express API and Business Logic Layer

The backend `apps/core-api` is structured as a layered **Modular Monolith** split into three top-level directories: `bootstrap/` (`app.js`, `routes.js`, `server.js`), `platform/` (cross-cutting infrastructure including `config/`, `http/`, `security/`, `mail/`, `cache/`, `observability/`, and `utils/`), and `modules/` (self-contained domain modules: `auth`, `movies`, `cinemas`, `sessions`, `concessions`, `booking`, `payment`, `chatbot`, `recommendations`, and `health`). Figure 4.1.3-1 illustrates the internal four-layer structure of each domain module.

> **[INSERT FIGURE 4.1.3-1 | D24a | Block diagram: Express modular monolith layered architecture | owner: Khánh Vi | file: docs/architecture/D24_request_lifecycle.mmd]**
> _Figure 4.1.3-1. Modular monolith architecture inside `apps/core-api` illustrating the separation of Route, Controller, Service, and Repository layers (D24a)._

Within every module, responsibilities follow a strict four-layer unidirectional pipeline:

1. **Route & Schema Layer (`*.routes.js`, `*.schema.js`)**: Declares HTTP verbs and paths, attaches route-specific rate limiters and authentication guards (`requireAuth`, `optionalAuth`, `requireRole`), and validates request payloads against shared Zod schemas via the `validate()` middleware.
2. **Controller Layer (`*.controller.js`)**: Extracts validated DTOs and authenticated user context (`req.user`, `req.id`), invokes the corresponding domain service method, and formats the HTTP status code and JSON response envelope. Controllers contain zero business rules or database queries.
3. **Domain Service Layer (`*.service.js`)**: Implements pure business rules, orchestrates Redis Lua scripts and external SDK calls (Google OAuth, Gemini, VNPay/MoMo/ZaloPay, Nodemailer), manages ACID transaction boundaries (`prisma.$transaction`), and raises typed `AppError` exceptions on invariant violations.
4. **Repository Layer (`*.repository.js`)**: Encapsulates Prisma ORM queries, raw `SELECT ... FOR UPDATE` locking statements, and Mongoose document operations, shielding the service layer from storage engine syntax.

### 4.1.4. Relational Persistence Layer with MySQL and Prisma

CineHub employs a **Polyglot Persistence** strategy in which each data domain is assigned to the storage engine best suited to its consistency and access patterns, while **MySQL 8.4** (accessed via Prisma 6 in `libs/db`) acts as the authoritative system of record for all relational and financial entities. Figure 4.1.4-1 depicts the allocation of data domains across MySQL, Redis, and MongoDB.

> **[INSERT FIGURE 4.1.4-1 | D25a | Architecture diagram: polyglot persistence allocation | owner: Khánh Vi | file: docs/database/D25_polyglot_persistence.mmd]**
> _Figure 4.1.4-1. Polyglot persistence allocation showing MySQL 8.4 as the ACID single source of truth alongside Redis 7 and MongoDB 7 (D25a)._

As shown in Figure 4.1.4-1, MySQL stores all 39 normalized tables across eight relational domains (Identity, Catalog, Scheduling, Commerce, Payment, Promotion, Engagement, and Platform Outbox/Inbox). Every booking, seat state transition (`ShowtimeSeat`), payment confirmation (`Payment`), voucher redemption (`VoucherRedemption`), and issued ticket (`Ticket`) is committed inside MySQL ACID transactions. Losing the contents of Redis never corrupts booking history or causes financial loss, because durable seat holds (`ShowtimeSeat.status = 'HELD'`, `heldUntil`) and active seat locks (`BookingSeat.activeLock`) are persisted in MySQL and reconciled every 60 seconds.

### 4.1.5. Redis Caching and Temporary Seat Reservation

Redis 7 serves two distinct architectural roles in `apps/core-api/src/platform/cache/`: high-throughput read-aside caching and atomic distributed seat-lease coordination. Figure 4.1.5-1 illustrates the Redis seat-lease lifecycle, Lua script execution, TTL eviction, and expiry sweep.

> **[INSERT FIGURE 4.1.5-1 | D25b | Block and flow diagram: Redis seat lease, Lua script, TTL, and expiry sweep | owner: Khánh Vi | file: docs/database/D25_polyglot_persistence.mmd]**
> _Figure 4.1.5-1. Redis temporary seat reservation mechanism showing atomic multi-seat Lua acquisition, 900-second TTL, and owner-checked release (D25b)._

When a customer requests a hold on $k$ seats ($1 \le k \le 6$) for a showtime, the backend executes `ACQUIRE_SEAT_LEASES_LUA` (`seat-lease.js`) inside Redis. Because Redis evaluates Lua scripts atomically on a single thread, the script first verifies via `EXISTS` that every key `seat:{showtimeId}:{seatId}` is absent; if any key exists, the script aborts and returns `0` without modifying state. Only when all $k$ keys are free does the script execute `SET seat:{showtimeId}:{seatId} {userId}:{timestamp} NX EX 900` for every seat and return `1`. Similarly, early lease release executes `RELEASE_SEAT_LEASES_LUA`, which inspects the stored prefix (`string.sub(val, 1, #ARGV[1]) == ARGV[1]`) before calling `DEL`, ensuring that an expired request from User A can never delete a fresh lease acquired by User B.

### 4.1.6. External Service Integration Layer

CineHub integrates with five external systems through dedicated adapter and service modules that isolate third-party protocol quirks, credential signing, timeouts, and fallback policies. Table 4.1.6-1 (`TBL D22b`) summarises the external integration architecture, while Figure 4.1.6-1 (`FIG D46`) references the Galaxy crawler ETL sequence (presented in full in Appendix E).

> **[INSERT TABLE 4.1.6-1 | D22b | TBL | External service integration matrix | owner: Khánh Vi | file: authored table]**
> _Table 4.1.6-1. External service integration specification, protocols, and fault-handling strategies (D22b)._

| External System & Module                             | Protocol & Authentication                                                       | Failure & Resilience Strategy                                                                                                          |
| ---------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Galaxy Cinema Feed** (`apps/aggregator`)           | HTTPS GET (`/api/v2/mobile/sessions2`, `/movies/:slug`), session handshake      | `AbortSignal.timeout`, polite delay, SHA-1 `contentHash` deduplication in `crawl_raw_items`, orphan showtime protection (`BR-06`).     |
| **Google Identity** (`googleOAuth.js`)               | HTTPS / OIDC `id_token` verification (`google-auth-library`)                    | Cryptographic audience/issuer validation; automatic account linking by verified email or fallback to local login.                      |
| **SMTP Mail Server** (`mailer.js`)                   | SMTP over TLS (port 587 / 2525, Mailtrap / Gmail)                               | Transactional outbox relay with exponential backoff (`nextAttemptAt`) and deduplication via `NotificationLog.dedupeKey`.               |
| **Payment Gateways** (`vnpay`, `momo-vn`, `zalopay`) | HTTPS Redirect + Asynchronous POST Webhook (IPN), `HMAC-SHA512` / `HMAC-SHA256` | Constant-time signature verification, `PaymentWebhookEvent` idempotency constraint, `successLock`, and late-payment `Refund` creation. |
| **Google Gemini AI** (`chatbot`, `embed-movies.js`)  | HTTPS REST (`gemini-2.5-flash`, `gemini-embedding-001` 768-dim)                 | Strict grounding in `databaseFacts`; automatic fallback to deterministic MySQL catalogue replies on quota exhaustion or timeout.       |

> **[INSERT FIGURE 4.1.6-1 | D46 | Sequence diagram: Galaxy crawler ETL pipeline | owner: Khánh Vi | file: sequence diagram (see Appendix E)]**
> _Figure 4.1.6-1. Overview of the Galaxy Cinema ETL crawler, raw MongoDB archiving, adapter normalisation, MySQL upsert, and vector embedding pipeline (D46; full diagram in Appendix E)._

### 4.1.7. Request Lifecycle and Component Communication

Every incoming HTTP request traverses a deterministic eight-stage pipeline defined in `apps/core-api/src/bootstrap/app.js` before reaching domain logic and returning a structured JSON envelope. Figure 4.1.7-1 (`FIG D24b`) traces this numbered lifecycle for a protected transactional request.

> **[INSERT FIGURE 4.1.7-1 | D24b | Sequence diagram: numbered HTTP request lifecycle | owner: Khánh Vi | file: docs/architecture/D24_request_lifecycle.mmd]**
> _Figure 4.1.7-1. Numbered request lifecycle from the Angular HTTP client through Express platform middleware, Zod validation, service orchestration, Redis/MySQL persistence, and centralised error handling (D24b)._

As illustrated in Figure 4.1.7-1: (1) the Angular client dispatches an HTTP request carrying a `Bearer` access token and `X-Request-Id` header via `authInterceptor` and `requestIdInterceptor`; (2) the Express global middleware chain executes `requestId` $\to$ `helmet()` $\to$ `cors(corsOptions)` $\to$ `cookieParser()` $\to$ `express.json({ limit: '1mb' })` $\to$ `pinoHttp` structured logging; (3) the route-level `rateLimit`, `requireAuth` / `requireRole`, and `validate(zodSchema)` middlewares verify identity and parse the payload; (4) the module controller extracts the typed DTO and invokes the domain service; (5) the service coordinates atomic Redis operations; (6) the repository executes parameterised Prisma queries or `READ COMMITTED` transactions against MySQL; (7) the controller returns a standard `{ data, meta }` JSON envelope; or (8) any thrown `AppError` or `ZodError` is caught by the terminal `errorHandler` middleware (`platform/http/errorHandler.js`) and serialised with the correlation `requestId`.

### 4.1.8. Architectural Rationale and Technology Selection

Table 4.1.8-1 (`TBL D22c`) summarises the core architectural choices across the stack, the engineering rationale behind each selection, and the alternatives evaluated during project inception (documented in ADRs 0001–0006).

> **[INSERT TABLE 4.1.8-1 | D22c | TBL | Technology selection and architectural trade-offs | owner: Khánh Vi | file: authored table]**
> _Table 4.1.8-1. Technology stack selection, engineering rationale, and evaluated alternatives (D22c)._

| Layer & Selected Technology                                | Engineering Rationale                                                                                                          | Alternatives Considered & Trade-off                                                                                                        |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Workspace**: Nx 21 Monorepo                              | Enforces `@nx/enforce-module-boundaries`, caches build/test tasks, and runs `nx affected` in CI.                               | _Turborepo / plain npm workspaces_: lacked built-in ESLint scope/type boundary enforcement for Angular libraries.                          |
| **Frontend**: Angular 20+ (Signals, `@angular/ssr`)        | Built-in DI, functional HTTP interceptors, hybrid SSR hydration, and fine-grained reactive Signals.                            | _React + Vite_: used in initial prototype, migrated to Angular 20 (ADR 0001/0002) for enterprise structure and strict typing.              |
| **State & 3D**: NgRx SignalStore & Three.js                | SignalStore provides lightweight reactive stores without Redux boilerplate; Three.js runs outside `NgZone` at 60 FPS.          | _Classic NgRx / CSS 3D_: classic NgRx added excessive action/reducer ceremony; CSS 3D could not model true camera POV angles.              |
| **Backend**: Node.js 20+ & Express 5 Modular Monolith      | Native promise rejection forwarding in Express 5, shared in-process ACID transactions, zero network-hop overhead.              | _Microservices (NestJS / gRPC)_: rejected due to distributed transaction overhead and operational complexity for a 5-person team.          |
| **Contract**: Zod (`@cinehub/contracts`) $\to$ OpenAPI 3.1 | Single source of truth validating Express payloads at runtime and generating typed Angular API clients (`npm run api:client`). | _Hand-written OpenAPI YAML / GraphQL_: manual YAML drifts from code; GraphQL complicated HTTP caching and REST webhook handling.           |
| **Relational DB**: MySQL 8.4 (InnoDB) & Prisma 6           | Strong ACID guarantees, `SELECT ... FOR UPDATE` row locking, active `CHECK` constraints, and declarative schema migrations.    | _PostgreSQL / TypeORM_: MySQL 8.4 matched course infrastructure and supported nullable unique lock columns (`activeLock`, `successLock`).  |
| **Cache & Vector**: Redis 7 & MongoDB 7 (`768-dim`)        | Redis executes multi-seat Lua locks in $<1\text{ ms}$; MongoDB stores flexible crawler payloads and 768-dim movie embeddings.  | _Database-only locking / pgvector_: SQL-only locking increases DB load under contention; MongoDB unified raw crawl logs and vector search. |

Choosing a **Modular Monolith** over microservices is a deliberate architectural trade-off. In cinema ticketing, seat locking, booking creation, voucher redemption, and outbox event insertion must commit or roll back together within a single ACID transaction. A modular monolith preserves this single-database transactional guarantee while enforcing strict module encapsulation (`routes`, `controller`, `service`, `repository`) so that individual domains (such as `aggregator` or `chatbot`) can be extracted into standalone processes when independent scaling is required.

## 4.2. API Contract and Integration Design

### 4.2.1. API Naming Conventions and Versioning

All REST endpoints exposed by `apps/core-api` follow resource-oriented naming conventions mounted under the versioned prefix `/api/v1` (with `/api` mounted in parallel in `bootstrap/app.js` for backward compatibility). Resource collections use plural lower-case nouns (`/movies`, `/cinemas`, `/sessions`, `/concessions`, `/payments`), hierarchical sub-resources express containment (`/booking/holds/:showtimeId`), and non-CRUD state transitions use explicit action nouns (`/auth/verify-email`, `/auth/refresh-token`, `/payments/momo/create`, `/payments/momo-ipn`, `/staff/checkin`). Per ADR 0003, all endpoint schemas live in `libs/shared/contracts/src/schemas.js` and generate `docs/api/openapi.json` (OpenAPI 3.1.0).

### 4.2.2. Request and Response Format

Requests carrying a body use `Content-Type: application/json` (capped at `1mb` by `express.json`) and are parsed by the `validate()` middleware (`platform/http/validate.js`), which validates `{ body, query, params }` against a Zod schema and replaces `req.body`, `req.query`, and `req.params` with coerced, strip-validated values. Successful responses return standard HTTP status codes (`200 OK`, `201 Created`, `204 No Content`) wrapped in a consistent `{ data, meta }` JSON envelope:

```json
{
  "data": { "id": "0192f1c4-7a00-7000-8000-000000000001", "status": "CONFIRMED" },
  "meta": { "page": 1, "limit": 20, "total": 42, "requestId": "req-9f8e7d6c" }
}
```

### 4.2.3. Authentication and Authorization Requirements

API endpoints are classified into three protection tiers enforced by `platform/http/auth.middleware.js` and `optionalAuth.js`:

1. **Public Endpoints**: Catalogue browsing (`/movies`, `/cinemas`, `/sessions`, `/concessions`), authentication initiation (`/auth/register`, `/auth/login`, `/auth/google`, `/auth/forgot-password`), and signed gateway IPN webhooks (`/payments/momo-ipn`).
2. **Optional-Auth Endpoints (`optionalAuth`)**: The conversational AI endpoint (`POST /api/v1/chatbot`) accepts unauthenticated guests while binding the chat session (`ai_chat_sessions.userId`) if a valid `Authorization: Bearer <accessToken>` header is present.
3. **Protected & Role-Scoped Endpoints (`requireAuth` + `requireRole`)**: Verifies the `HS256` JWT signature and expiry (`15m`). Expired tokens throw `401 TOKEN_EXPIRED` (triggering the Angular `authInterceptor` single-flight refresh). Role-restricted routes invoke `requireRole('CUSTOMER')`, `requireRole('STAFF', 'ADMIN')`, or `requireRole('ADMIN')`, returning `403 FORBIDDEN` on insufficient privileges.

### 4.2.4. Standard Error Response Structure

Whenever validation fails or a domain invariant is violated, `errorHandler.js` intercepts the error and returns a deterministic JSON error envelope containing a machine-readable `code` from `ErrorCodes` (`@cinehub/contracts`), a human-readable message, optional field-level validation `details`, and the correlation `requestId`:

```json
{
  "error": {
    "code": "SEAT_TAKEN",
    "message": "One or more selected seats are already held or sold.",
    "details": [{ "path": "seatIds", "message": "Seat F7 is unavailable" }],
    "requestId": "c84d2a10-5b9e-4f12-9a3b-8e12d4567890"
  }
}
```

Standardised error codes include `VALIDATION_ERROR` (`400`), `UNAUTHORIZED` / `TOKEN_EXPIRED` / `INVALID_CREDENTIALS` (`401`), `FORBIDDEN` / `EMAIL_NOT_VERIFIED` / `ACCOUNT_LOCKED` (`403`), `NOT_FOUND` (`404`), `CONFLICT` / `SEAT_TAKEN` / `TICKET_ALREADY_USED` (`409`), `OTP_COOLDOWN` / `TOO_MANY_REQUESTS` (`429`), and `INTERNAL_ERROR` (`500`).

### 4.2.5. Pagination, Filtering and Sorting Conventions

Collection endpoints accept typed query parameters coerced by Zod (`z.coerce.number().int()`). Catalogue and session queries support multi-dimensional filtering: `GET /api/v1/movies` filters by `status` (`NOW_SHOWING`, `COMING_SOON`), `genre`, `q` (search keyword), `page`, and `limit` (default `20`, max `100`); `GET /api/v1/sessions` filters by `movieId`, `cinemaId`, `chainCode`, `provinceId`, `date` (`YYYY-MM-DD` in `Asia/Ho_Chi_Minh`), `format` (`TWO_D`, `THREE_D`, `IMAX`, `FOUR_DX`, `SCREENX`, `DOLBY`, `LED`), and `captionMode` (`SUBTITLED`, `DUBBED`). High-volume tables (`bookings`, `showtime_seats`) support cursor-based pagination over time-ordered UUID v7 keys to avoid SQL `OFFSET` scan degradation.

### 4.2.6. Idempotency and Duplicate Request Handling

Network retries, browser double-clicks, and at-least-once webhook deliveries require explicit idempotency controls across write endpoints:

- **Seat Lease Acquisition (`POST /api/v1/booking/holds`)**: If the same authenticated user retries a hold request for the exact same `(showtimeId, seatIds)` within an active hold window, the service recognises the existing `userId` lease prefix in Redis and returns the active hold state; if a different user holds any of the seats, Redis `SET NX` rejects the request with `409 SEAT_TAKEN`.
- **Payment Initiation & Webhook Callbacks**: Payment creation generates a unique `txnRef` (`CH` + `yymmdd` + random suffix) per attempt. Incoming gateway IPN callbacks are deduplicated across a fast Redis key `idem:pay:{provider}:{eventKey}` (`SET NX EX 86400`), a durable unique constraint `UNIQUE (provider, eventKey)` on `payment_webhook_events`, and `Payment.successLock`.

### 4.2.7. API Contract for Booking and Seat Reservation

The booking contract in `libs/shared/contracts/src/schemas.js` and `apps/core-api/src/modules/booking/` governs seat map inspection, atomic hold acquisition, concession attachment, and hold release:

- **`GET /api/v1/booking/seats/:showtimeId`**: Returns auditorium layout metadata (`rows`, `columns`, `roomTier`, `screenFormat`) and the array of `ShowtimeSeat` items (`id`, `seatId`, `rowLabel`, `colNumber`, `colSpan`, `seatType`, `price`, `status`: `AVAILABLE | HELD | SOLD | BLOCKED`).
- **`POST /api/v1/booking/holds`** (`requireAuth`): Validates `{ showtimeId: z.string().min(1), seatIds: z.array(z.string()).min(1).max(6) }` via `holdSeatsRequestSchema`. Acquires 900-second Redis leases and creates a `PENDING` `Booking` with `BookingSeat` (`activeLock = showtimeSeatId`), returning `{ showtimeId, seatIds, heldUntil, ttlSeconds: 900, bookingId }`.
- **`DELETE /api/v1/booking/holds/:showtimeId`** (`requireAuth`): Invokes `RELEASE_SEAT_LEASES_LUA` and clears `BookingSeat.activeLock = NULL`, returning held seats to `AVAILABLE`.

### 4.2.8. API Contract for Payments and Ticket Issuance

The payment and ticketing contract spans checkout initiation, gateway webhooks, customer ticket retrieval, and staff gate check-in. Figure 4.2.8-1 and Table 4.2.8-1 (`D26`) summarise the API endpoint inventory across all modules (the exhaustive parameter specification is provided in Appendix C).

> **[INSERT FIGURE 4.2.8-1 | D26 | Architecture & contract diagram: API gateway and endpoint inventory | owner: Khánh Vi | file: docs/architecture/D26_api_gateway_architecture.drawio]**
> _Figure 4.2.8-1. API gateway routing architecture, middleware pipeline, and versioned contract structure (D26)._

> **[INSERT TABLE 4.2.8-1 | D26 | TBL | Summary API endpoint inventory by domain module | owner: Khánh Vi | file: docs/api/openapi.json]**
> _Table 4.2.8-1. Consolidated REST API endpoint inventory across CineHub modules (D26; full contract in Appendix C)._

| Domain Module        | Endpoint Paths (`/api/v1/...`)                                                                                                                                        | Auth, Rate Limit & Contract Summary                                                                                                                       |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Health & Auth**    | `GET /health`; `POST /auth/{register,verify-email,resend-verification,login,google,logout,forgot-password,reset-password}`; `PUT /auth/refresh-token`; `GET /auth/me` | Public / Cookie / Bearer; `5–20 req/15m` limiters. Handles OTP registration, bcrypt/Google login, RTR family rotation, and SHA-256 password reset.        |
| **Catalog & Venues** | `GET /movies`, `GET /movies/:id`; `GET /cinemas`; `GET /concessions`                                                                                                  | Public. Supports filtering by `status`, `genre`, `q`, `chainCode`, `provinceId`, `category`, plus pagination (`page`, `limit`).                           |
| **Sessions**         | `GET /sessions`                                                                                                                                                       | Public. Queries showtimes by `movieId`, `cinemaId`, `provinceId`, `date` (`YYYY-MM-DD`), `format`, and `captionMode` with date fallback.                  |
| **Booking & Holds**  | `GET /booking/seats/:showtimeId`; `POST /booking/holds`; `DELETE /booking/holds/:showtimeId`; `POST /booking/checkout`                                                | `Bearer` (`CUSTOMER`). Enforces max 6 seats, acquires/releases 900s Redis Lua leases & `activeLock`, applies vouchers, and calculates integer VND totals. |
| **Payments & IPN**   | `POST /payments/{momo,vnpay,zalopay}/create`; `POST /payments/momo-ipn`; `POST /payments/vietqr/:MAGD`                                                                | `Bearer` / Signed Webhook. Generates HMAC-signed redirect/QR URLs; verifies IPN signatures, logs `PaymentWebhookEvent`, and sets `successLock`.           |
| **Tickets & Gate**   | `GET /booking/tickets`, `GET /booking/tickets/:id`; `POST /staff/checkin`                                                                                             | `Bearer` (`CUSTOMER` / `STAFF`, `ADMIN`). Issues `ticketId.signature` QR payloads; verifies `HMAC-SHA256`, `qrVersion`, and `cinemaId` at gate check-in.  |
| **Admin Portal**     | `POST/PUT/DELETE /admin/{movies,showtimes,vouchers,crawl}`                                                                                                            | `Bearer` (`ADMIN`). Full CRUD over catalog, non-overlapping schedules, `PriceRule`, vouchers, and manual Galaxy crawler triggers.                         |
| **AI & Recs**        | `POST /chatbot`; `POST /recommendations`                                                                                                                              | `optionalAuth` / Public. Executes 4-intent NLP + 768-dim vector RAG (`databaseFacts`) and content-based movie ranking.                                    |

### 4.2.9. Frontend–Backend Integration Matrix

Table 4.2.9-1 (`TBL D27`) maps the 14 primary Angular screens to their consumed API endpoints, relational/document entities, and Redis keys.

> **[INSERT TABLE 4.2.9-1 | D27 | TBL | Frontend-backend-database integration matrix | owner: Khánh Vi | file: authored table]**
> _Table 4.2.9-1. Frontend–backend integration matrix across 14 application screens, API endpoints, and persistence stores (D27)._

| Angular Screen & Route                            | Consumed API Endpoints                                      | MySQL / MongoDB Entities & Redis Keys Touched                                                                       |
| ------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **1. Home & Discovery** (`/`)                     | `GET /movies`, `GET /sessions`, `POST /recommendations`     | MySQL: `Movie`, `Genre`, `Promotion`, `Showtime` \| Redis: `cache:movies:*`, `rank:movies:trending`                 |
| **2. Movie Detail** (`/movie/:id`)                | `GET /movies/:id`, `GET /sessions?movieId=:id`              | MySQL: `Movie`, `MovieCredit`, `Person` \| Mongo: `movie_metadata`, `reviews` \| Redis: `cache:movie:{id}`          |
| **3. Showtimes** (`/showtimes`)                   | `GET /cinemas`, `GET /sessions`                             | MySQL: `CinemaChain`, `Province`, `Cinema`, `Auditorium`, `Showtime` \| Redis: `cache:showtimes:{date}:{hash}`      |
| **4. Login & Google SSO** (`/login`)              | `POST /auth/login`, `POST /auth/google`                     | MySQL: `User`, `RefreshToken` \| Redis: `rl:auth:*`, `auth:oauth:state:*`                                           |
| **5. Registration** (`/register`)                 | `POST /auth/register`                                       | MySQL: `User`, `EmailVerificationToken` \| Redis: `rl:auth:*`                                                       |
| **6. OTP Verification** (`/verify-email`)         | `POST /auth/verify-email`, `POST /auth/resend-verification` | MySQL: `User`, `EmailVerificationToken`, `RefreshToken` \| Redis: `rl:auth:*`                                       |
| **7. Password Reset** (`/reset-password`)         | `POST /auth/forgot-password`, `POST /auth/reset-password`   | MySQL: `User`, `PasswordResetToken`, `RefreshToken` \| Redis: `rl:auth:*`, `auth:blacklist:*`                       |
| **8. 2D/3D Seat Map** (`/seats/:showtimeId`)      | `GET /booking/seats/:id`, `POST /booking/holds`             | MySQL: `ShowtimeSeat`, `Booking`, `BookingSeat`, `OutboxEvent` \| Redis: `seat:{showtimeId}:{seatId}`               |
| **9. Concessions** (`/concessions`)               | `GET /concessions`                                          | MySQL: `Concession`, `BookingConcession`, `Booking`                                                                 |
| **10. Checkout** (`/checkout`)                    | `POST /payments/{momo,vnpay,zalopay}/create`, `/vietqr/:id` | MySQL: `Booking`, `Voucher`, `VoucherRedemption`, `Payment`, `Ticket` \| Redis: `idem:pay:{provider}:{key}`         |
| **11. Ticket Result** (`/result/:ticketId`)       | `GET /booking/tickets/:id`                                  | MySQL: `Booking`, `BookingSeat`, `Ticket`, `Payment`, `Showtime`, `Movie`, `Cinema`                                 |
| **12. My Tickets** (`/my-tickets`)                | `GET /booking/tickets`                                      | MySQL: `Booking`, `BookingSeat`, `Ticket`, `Showtime`, `Movie`, `Cinema`                                            |
| **13. Member Profile** (`/profile`)               | `GET /auth/me`, `PUT /auth/profile`, `POST /auth/logout`    | MySQL: `User`, `RefreshToken`, `Favorite`, `MovieSubscription` \| Redis: `auth:blacklist:{familyId}`                |
| **14. CineBot & Staff/Admin** (Global / `/admin`) | `POST /chatbot`, `POST /staff/checkin`, `/admin/*`          | MySQL: `Movie`, `Showtime`, `Ticket` \| Mongo: `movie_embeddings`, `ai_chat_sessions` \| Redis: `crawl:lock:GALAXY` |

## 4.3. Database Design

### 4.3.1. Database Design Principles

The database architecture of CineHub is governed by seven core engineering principles established in `docs/database/CineHub_Tai_lieu_Thiet_ke_CSDL_v3.md`:

1. **Single Source of Truth per Domain**: MySQL 8.4 owns all relational and financial state requiring ACID transactions; Redis 7 holds only ephemeral leases and caches that can be reconstructed or reconciled from MySQL; MongoDB 7 holds variable-schema crawl dumps, reviews, and high-dimensional embedding vectors.
2. **Time-Ordered UUID v7 Primary Keys**: Every SQL table uses `CHAR(36) COLLATE ascii_bin` storing UUID v7 identifiers (`@default(uuid(7))`), preventing enumeration attacks while preserving sequential B-tree insertion locality.
3. **Integer VND Monetary Representation**: All prices, subtotals, discounts, fees, and payment amounts are stored as 32-bit integers (`Int`) in Vietnamese Dong (VND), eliminating floating-point rounding discrepancies.
4. **Materialised Seat Inventory with Optimistic & Column Locks**: Per-showtime seats are materialised in `showtime_seats` with an optimistic `version` counter, while `booking_seats.activeLock` and `payments.successLock` exploit MySQL's nullable `UNIQUE` index semantics to make double-booking and double-charging structurally impossible at the storage engine level.
5. **Immutable Commercial Snapshots**: `BookingSeat` and `BookingConcession` snapshot the exact `seatLabel`, `seatTypeName`, `ticketTypeName`, `concessionName`, and `unitPrice` at the moment of purchase so that future catalogue or `PriceRule` edits never alter historical financial records.
6. **Stateless Cryptographic Tickets**: `Ticket` stores `qrVersion` rather than raw QR tokens; QR codes are dynamically signed via `HMAC-SHA256(QR_HMAC_SECRET, ticketId + ":" + qrVersion)`.
7. **Non-Destructive Financial Referential Integrity**: All financial foreign keys use `ON DELETE RESTRICT` and `ON UPDATE RESTRICT`, while `User` and `Movie` records use soft deletion (`deletedAt`) with email anonymisation.

### 4.3.2. Conceptual Data Model

Before introducing foreign-key columns, join tables, and locking attributes, Figure 4.3.2-1 (`FIG D28`) presents the high-level Conceptual Entity–Relationship Diagram encompassing the ten core domain entities (`User`, `CinemaChain`, `Cinema`, `Auditorium`, `Seat`, `Movie`, `Showtime`, `Booking`, `Payment`, and `Ticket`) and their business multiplicities.

> **[INSERT FIGURE 4.3.2-1 | D28 | Conceptual ERD: 10 core domain entities and multiplicities | owner: Khánh Vi | file: Database (PCCV row D28)]**
> _Figure 4.3.2-1. Conceptual Entity–Relationship Diagram of CineHub showing the ten principal domain entities and their structural multiplicities without technical attributes (D28)._

The conceptual model highlights the structural separation between static venue topology (`CinemaChain` $1:N$ `Cinema` $1:N$ `Auditorium` $1:N$ `Seat`), temporal screening events (`Movie` $1:N$ `Showtime` $N:1$ `Auditorium`), and customer transactions (`User` $1:N$ `Booking` $N:1$ `Showtime`, where each `Booking` comprises $1..6$ seats, $0..N$ payments, and $1..6$ issued `Ticket` records).

### 4.3.3. Entity–Relationship Diagram (ERD)

At the physical relational level, the 39 MySQL tables are organised into eight colour-coded domain packages using Crow's Foot notation (D29, D30, and D31). Figure 4.3.3-1 (`FIG D29a`) provides the complete 39-table master ERD overview, followed by six domain-focused ERD views (`FIG D29b` through `FIG D31c`).

> **[INSERT FIGURE 4.3.3-1 | D29a | Physical ERD: master overview of all 39 tables across 8 domains | owner: Khánh Vi | file: Database (PCCV row D29)]**
> _Figure 4.3.3-1. Master Physical Entity–Relationship Diagram of CineHub comprising 39 tables grouped into eight functional domains (D29a)._

> **[INSERT FIGURE 4.3.3-2 | D29b | Physical ERD: Scheduling domain (`Showtime`, `PriceRule`, `ShowtimePrice`, `ShowtimeSeat`) | owner: Khánh Vi | file: Database (PCCV row D29)]**
> _Figure 4.3.3-2. Physical ERD of the Scheduling domain showing showtimes, multi-dimensional price rules, and materialised showtime seat inventory (D29b)._

> **[INSERT FIGURE 4.3.3-3 | D29c | Physical ERD: Commerce and Payment domains highlighting `activeLock` and `successLock` | owner: Khánh Vi | file: Database (PCCV row D29)]**
> _Figure 4.3.3-3. Physical ERD of the Booking, Ticketing, and Payment domains highlighting the unique `BookingSeat.activeLock` and `Payment.successLock` concurrency columns (D29c)._

In Figure 4.3.3-2 and Figure 4.3.3-3, `ShowtimeSeat` bridges the physical `Seat` and the scheduled `Showtime`, holding the current `SeatState` (`AVAILABLE`, `HELD`, `SOLD`, `BLOCKED`) and `version`. `BookingSeat` links a `Booking` to a `ShowtimeSeat`: because a seat may be held, expired, and later booked by another user across multiple historical `BookingSeat` rows, the nullable unique column `BookingSeat.activeLock` (`CHAR(36) UNIQUE`) holds `showtimeSeatId` while the booking is active (`PENDING` or `CONFIRMED`) and is reset to `NULL` when the booking expires or is cancelled. Analogously, `Payment.successLock` (`CHAR(36) UNIQUE`) holds `bookingId` only when `Payment.status` is `SUCCESS` or `REFUNDED`, guaranteeing at most one successful payment per booking.

> **[INSERT FIGURE 4.3.3-4 | D30 | Physical ERD: Identity domain (`User`, `RefreshToken`, `PasswordResetToken`, `EmailVerificationToken`) | owner: Quỳnh Anh | file: Database (PCCV row D30)]**
> _Figure 4.3.3-4. Physical ERD of the Identity domain illustrating `RefreshToken.familyId` and self-referential `replacedById` token rotation chains (D30)._

> **[INSERT FIGURE 4.3.3-5 | D31a | Physical ERD: Catalog and Geography domains | owner: Quỳnh Anh | file: Database (PCCV row D31)]**
> _Figure 4.3.3-5. Physical ERD of the Catalog and Geography domains (`CinemaChain`, `Province`, `Ward`, `Cinema`, `Auditorium`, `Seat`, `Movie`, `Genre`, `Person`, `MovieCredit`, `MovieSource`) (D31a)._

> **[INSERT FIGURE 4.3.3-6 | D31b | Physical ERD: Promotion and Engagement domains | owner: Quỳnh Anh | file: Database (PCCV row D31)]**
> _Figure 4.3.3-6. Physical ERD of the Promotion (`Voucher`, `VoucherRedemption`, `Promotion`) and Engagement (`Favorite`, `MovieSubscription`, `Notification`, `NotificationLog`) domains (D31b)._

> **[INSERT FIGURE 4.3.3-7 | D31c | Physical ERD: Platform reliability domain (`OutboxEvent`, `InboxEvent`) | owner: Quỳnh Anh | file: Database (PCCV row D31)]**
> _Figure 4.3.3-7. Physical ERD of the Platform reliability domain showing `OutboxEvent` and `InboxEvent` tables for transactional event delivery and idempotent consumption (D31c)._

### 4.3.4. Logical Relational Schema

Table 4.3.4-1 (`TBL D32`) summarises the 39 relational tables across the eight domains of `libs/db/prisma/schema.prisma`, listing the physical MySQL table names (`@@map`), key constraints, and domain responsibilities (the complete column-by-column data dictionary is provided in Appendix D).

> **[INSERT TABLE 4.3.4-1 | D32 | TBL | Logical relational schema summary across 8 domains (39 tables) | owner: Quỳnh Anh | file: libs/db/prisma/schema.prisma]**
> _Table 4.3.4-1. Summary of the 39 relational tables in the CineHub MySQL schema grouped by domain (D32; full data dictionary in Appendix D)._

| Domain (Count)                  | Prisma Models & Physical Table Names (`snake_case`)                                                                                                                                                                                                                                                                                                                        | Key Unique Constraints & Architectural Role                                                                                                                                                               |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Identity (4)**             | `User` (`users`), `RefreshToken` (`refresh_tokens`), `PasswordResetToken` (`password_reset_tokens`), `EmailVerificationToken` (`email_verification_tokens`)                                                                                                                                                                                                                | `UNIQUE(email)`, `UNIQUE(googleId)`, `UNIQUE(tokenHash)`, `UNIQUE(replacedById)`. Manages Local/Google accounts, RTR token families (`familyId`), and 10m/15m SHA-256 verification tokens.                |
| **2. Catalog & Geography (14)** | `CinemaChain` (`cinema_chains`), `Province` (`provinces`), `Ward` (`wards`), `Cinema` (`cinemas`), `Auditorium` (`auditoriums`), `TicketType` (`ticket_types`), `SeatType` (`seat_types`), `Seat` (`seats`), `Genre` (`genres`), `Movie` (`movies`), `MovieGenre` (`movie_genres`), `Person` (`persons`), `MovieCredit` (`movie_credits`), `MovieSource` (`movie_sources`) | `UNIQUE(chainId, externalId)` on cinemas/movies; `UNIQUE(auditoriumId, rowLabel, colNumber)` on `seats`. Normalises crawled Galaxy metadata, administrative divisions, room tiers, and seat templates.    |
| **3. Scheduling (4)**           | `Showtime` (`showtimes`), `PriceRule` (`price_rules`), `ShowtimePrice` (`showtime_prices`), `ShowtimeSeat` (`showtime_seats`)                                                                                                                                                                                                                                              | `UNIQUE(cinemaId, externalId)` on `showtimes`; `UNIQUE(showtimeId, seatId)` on `showtime_seats` with optimistic `version`. Materialises screenings, price matrices, and per-seat availability.            |
| **4. Commerce & Ticketing (5)** | `Concession` (`concessions`), `Booking` (`bookings`), `BookingSeat` (`booking_seats`), `BookingConcession` (`booking_concessions`), `Ticket` (`tickets`)                                                                                                                                                                                                                   | `UNIQUE(code)` on `bookings`; `UNIQUE(activeLock)` on `booking_seats`; `UNIQUE(bookingSeatId)` on `tickets`. Stores orders, snapshotted line items, and stateless HMAC QR version counters (`qrVersion`). |
| **5. Payment (3)**              | `Payment` (`payments`), `PaymentWebhookEvent` (`payment_webhook_events`), `Refund` (`refunds`)                                                                                                                                                                                                                                                                             | `UNIQUE(txnRef)`, `UNIQUE(successLock)` on `payments`; `UNIQUE(provider, eventKey)` on `payment_webhook_events`. Enforces exactly-once payment confirmation and late-payment refund tracking.             |
| **6. Promotion (3)**            | `Voucher` (`vouchers`), `VoucherRedemption` (`voucher_redemptions`), `Promotion` (`promotions`)                                                                                                                                                                                                                                                                            | `UNIQUE(code)` on `vouchers`; `UNIQUE(bookingId)` on `voucher_redemptions`. Tracks discount campaigns, quota reservations (`RESERVED` $\to$ `REDEEMED` / `RELEASED`), and hero banners.                   |
| **7. Engagement (4)**           | `Favorite` (`favorites`), `MovieSubscription` (`movie_subscriptions`), `NotificationLog` (`notification_logs`), `Notification` (`notifications`)                                                                                                                                                                                                                           | Composite PK `(userId, movieId)` on `favorites` and `movie_subscriptions`; `UNIQUE(dedupeKey)` on `notification_logs`. Manages watchlists, release alerts, and deduplicated email logs.                   |
| **8. Platform (2)**             | `OutboxEvent` (`outbox_events`), `InboxEvent` (`inbox_events`)                                                                                                                                                                                                                                                                                                             | `UNIQUE(consumer, eventId)` on `inbox_events`; indexed `(status, nextAttemptAt)` on `outbox_events`. Guarantees at-least-once event publishing and idempotent worker consumption.                         |

### 4.3.5. Core Entity Definitions and Relationships

The core transactional path relies on the precise structural interplay among seven central entities:

- **`User` and `RefreshToken`**: `User` stores `authProvider` (`LOCAL` or `GOOGLE`), nullable `passwordHash` and `googleId`, `role` (`CUSTOMER`, `STAFF`, `ADMIN`), `status` (`ACTIVE`, `LOCKED`, `DELETED`), and optional `cinemaId` (scoping `STAFF` users to a single cinema venue). `RefreshToken` tracks `familyId`, `tokenHash`, `replacedById` (a 1:1 self-relation forming a linked list of rotated tokens), and `revokedAt`.
- **`Showtime` and `ShowtimeSeat`**: `Showtime` links `movieId`, `auditoriumId`, and denormalised `cinemaId` (for single-join cinema filtering), storing `startTime`, `endTime`, `localDate` (`DATE` in `Asia/Ho_Chi_Minh`), `format` (`ScreenFormat`), `captionMode` (`SUBTITLED`, `DUBBED`), `status` (`SCHEDULED`, `OPEN`, `SOLD_OUT`, `CANCELLED`, `FINISHED`), and `seatSource` (`MOCK` or `PROVIDER`). `ShowtimeSeat` materialises one row per `(showtimeId, seatId)` with `price`, `status` (`SeatState`), `heldByBookingId`, `heldUntil`, and `version`.
- **`Booking`, `BookingSeat`, `Payment`, and `Ticket`**: `Booking` holds the human-readable `code` (`CHyymmddXXXXXX`), monetary totals (`subtotalAmount`, `discountAmount`, `serviceFee`, `totalAmount`), `status` (`BookingStatus`), `expiresAt`, and `version`. `BookingSeat` snapshots seat attributes and carries `activeLock`. `Payment` records gateway transactions (`provider`, `txnRef`, `providerTransId`, `amount`, `status`, `successLock`), while `Ticket` maps 1:1 to `BookingSeat` and stores `status` (`VALID`, `USED`, `VOID`), `qrVersion`, `usedAt`, and `checkedInById`.

### 4.3.6. Constraints, Indexes and Referential Integrity

Because application-level checks alone can be bypassed under race conditions or direct database scripts, `migration.sql` enforces 33 database-level `CHECK` constraints alongside composite B-tree indexes:

- **Monetary Arithmetic Invariant (`bookings`)**: `CHECK (subtotalAmount >= 0 AND discountAmount >= 0 AND serviceFee >= 0 AND totalAmount >= 0 AND totalAmount = subtotalAmount + serviceFee - discountAmount)` guarantees server-side pricing integrity (`BR-14`) and prevents negative totals or discount overflow.
- **Active Seat Lock (`booking_seats`)**: `UNIQUE (activeLock)` paired with `CHECK (activeLock IS NULL OR activeLock = showtimeSeatId)` prevents any two active bookings from locking the same `ShowtimeSeat` simultaneously (`BR-10`).
- **Single Successful Payment Lock (`payments`)**: `UNIQUE (successLock)` paired with `CHECK ((successLock IS NULL AND status NOT IN ('SUCCESS','REFUNDED')) OR (successLock = bookingId AND status IN ('SUCCESS','REFUNDED')))` guarantees at most one successful payment per booking (`BR-17`).
- **Credential & Voucher Validity (`users`, `vouchers`)**: `CHECK (passwordHash IS NOT NULL OR googleId IS NOT NULL)` ensures every account has a valid credential (`BR-23`), while `CHECK (value > 0 AND (type <> 'PERCENT' OR value BETWEEN 1 AND 100))` prevents invalid percentage discounts (`BR-15`).
- **Temporal & Inventory Composite Indexes (`showtimes`, `showtime_seats`)**: `CHECK (endTime > startTime)` and composite indexes `(movieId, localDate, status)`, `(cinemaId, localDate, status)`, and `(auditoriumId, startTime)` accelerate schedule filtering and overlap checks, while `UNIQUE (showtimeId, seatId)`, `(showtimeId, status)`, and `(status, heldUntil)` accelerate seat map queries and the 60-second expired hold sweep.

### 4.3.7. Prisma Schema and ORM Mapping

The declarative schema in `libs/db/prisma/schema.prisma` defines **39 models** and **27 enumerations** targeting MySQL 8.4. Model names use singular `PascalCase` while physical tables and enum mappings use `@@map("snake_case")`. All UUID primary and foreign keys are typed as `@db.Char(36)` with `ascii_bin` collation applied in migration SQL so that join comparisons operate on raw ASCII bytes (1 byte per character) rather than multi-byte Unicode collations (`utf8mb4_unicode_ci`), reducing index size by 75% on key columns.

### 4.3.8. Redis Data Structures and TTL Strategy

Tables 4.3.8-1 (`TBL D33`) and 4.3.8-2 (`TBL D34`) specify the in-memory Redis key inventory and the MongoDB document/vector collections used by CineHub.

> **[INSERT TABLE 4.3.8-1 | D33 | TBL | Redis key pattern, data structure, and TTL inventory | owner: Quỳnh Anh | file: docs/database/CineHub_Tai_lieu_Thiet_ke_CSDL_v3.md]**
> _Table 4.3.8-1. Redis data structures, key naming patterns, TTL strategies, and operational purposes (D33)._

| Redis Key Pattern & Type                        | TTL Strategy           | Operational Purpose                                                                         |
| ----------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------- |
| `seat:{showtimeId}:{seatId}` (`STRING`)         | `900s` (15m)           | Atomic seat lease acquired via `ACQUIRE_SEAT_LEASES_LUA` (`SET NX EX 900`).                 |
| `hold:booking:{bookingId}` (`SET`)              | `960s` (16m)           | Groups all seat keys of a booking for batch cleanup upon payment or cancellation.           |
| `showtime:{showtimeId}:seats` (`HASH`)          | `10s` (evict on write) | Read-aside cache accelerating high-concurrency seat map queries.                            |
| `cache:movies:*`, `cache:movie:{id}` (`STRING`) | `600s` (10m)           | Caches catalogue lists and movie detail payloads; invalidated on admin/crawl upsert.        |
| `cache:showtimes:{date}:{hash}` (`STRING`)      | `120s` (2m)            | Caches filtered showtime schedules by date, cinema, and format.                             |
| `rl:{limiter}:{ip_or_email}` (`STRING`)         | `900s` (15m window)    | Sliding/fixed window rate limiting for login (`20`), OTP (`5`), and reset (`10`).           |
| `auth:blacklist:{familyId_or_jti}` (`STRING`)   | Remaining token TTL    | Immediate revocation of compromised refresh token families or logged-out access tokens.     |
| `idem:pay:{provider}:{eventKey}` (`STRING`)     | `86400s` (24h)         | Fast first-layer deduplication (`SET NX`) of incoming payment gateway webhooks.             |
| `crawl:lock:{chainCode}` (`STRING`)             | `3600s` (1h)           | Distributed mutex (`SET NX`) preventing overlapping crawler runs for the same cinema chain. |

> **[INSERT TABLE 4.3.8-2 | D34 | TBL | MongoDB collections, indexes, and 768-dim vector configuration | owner: Quỳnh Anh | file: docs/database/CineHub_Tai_lieu_Thiet_ke_CSDL_v3.md]**
> _Table 4.3.8-2. MongoDB document collections, TTL policies, and 768-dimensional vector search index configuration (D34)._

| MongoDB Collection           | Key Indexes & TTL                                                 | Document Schema & Architectural Purpose                                                                                                                                |
| ---------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `movie_embeddings`           | `UNIQUE(movieId)`; Vector Index (`768 dims`, `cosine` similarity) | Stores `movieId`, normalized context text, content hash, and 768-dimensional `gemini-embedding-001` vectors generated by `embed-movies.js` for semantic RAG retrieval. |
| `ai_chat_sessions`           | `UNIQUE(sessionId)`, `(userId, updatedAt)`, TTL `30 days`         | Stores multi-turn CineBot conversation history (last 20 PII-redacted messages) and up to 6 `lastSuggestedMovies` (`{ id, title }`) for anaphoric resolution.           |
| `crawl_raw_items`            | `UNIQUE(source, kind, externalId, contentHash)`, TTL `30 days`    | Archives raw JSON responses from Galaxy Cinema (`session`, `movie`, `cinema`) for replay and adapter debugging.                                                        |
| `crawl_runs`                 | `(startedAt)` with TTL `90 days`                                  | Execution audit log for `apps/aggregator` runs (fetched counts, upsert counts, duration, errors).                                                                      |
| `movie_metadata` & `reviews` | `UNIQUE(movieId)` / `UNIQUE(userId, movieId)`                     | Holds extended multi-paragraph descriptions, photo galleries, and customer 1–5 star reviews.                                                                           |

### 4.3.9. Data Lifecycle and Consistency Considerations

To maintain eventual consistency across MySQL, Redis, MongoDB, and external SMTP/gateway services without distributed two-phase commits (2PC), CineHub implements the **Transactional Outbox and Idempotent Inbox** pattern coupled with a periodic reconciliation cron. Figure 4.3.9-1 (`FIG D35`) illustrates this data lifecycle.

> **[INSERT FIGURE 4.3.9-1 | D35 | Flow diagram: Transactional Outbox, relay, queue, Inbox consumer, and reconciliation cron | owner: Quỳnh Anh | file: Database (PCCV row D35)]**
> _Figure 4.3.9-1. Cross-store consistency architecture using `OutboxEvent`, `FOR UPDATE SKIP LOCKED` relay polling, `InboxEvent` consumer deduplication, and 60-second seat-lock reconciliation (D35)._

As shown in Figure 4.3.9-1, domain state changes (such as creating a `PENDING` booking or confirming a `SUCCESS` payment) insert an `OutboxEvent` row inside the exact same MySQL ACID transaction. The relay worker polls `outbox_events` (`WHERE status = 'PENDING' AND nextAttemptAt <= NOW() ORDER BY id LIMIT 50 FOR UPDATE SKIP LOCKED`) and dispatches events to downstream consumers. Each consumer first attempts to insert `(consumer, eventId)` into `inbox_events`; a unique constraint violation proves the event was already processed, turning at-least-once delivery into effectively-once execution. In parallel, a 60-second reconciliation cron sweeps `showtime_seats` where `status = 'HELD' AND heldUntil < NOW()`, releasing any orphaned holds that survived a worker restart, and purges processed `outbox_events` older than 7 days and `inbox_events` older than 14 days.

## 4.4. UML Sequence Diagrams

This section models the dynamic interaction protocols across the Angular client, Express middleware and domain modules, Redis, MySQL, and external gateways for the eight primary runtime workflows (`D36`–`D43`). Four supplementary sequence diagrams—Password Recovery (`D44`), CineBot RAG Conversation (`D45`), Galaxy Crawler ETL (`D46`), and Staff Gate QR Check-in (`D47`)—are catalogued in Appendix E and referenced where applicable.

### 4.4.1. Registration and Login

Figure 4.4.1-1 (`FIG D36`) models account creation with 6-digit OTP verification alongside local and Google OAuth 2.0 authentication (`apps/core-api/src/modules/auth/auth.service.js`).

> **[INSERT FIGURE 4.4.1-1 | D36 | Sequence diagram: Registration, 6-digit OTP verification, and Login / Google OAuth | owner: Khánh Vi | file: sequence diagram (PCCV row D36)]**
> _Figure 4.4.1-1. UML sequence diagram for customer registration, 6-digit OTP email verification, local password login, and Google OAuth 2.0 sign-in (D36)._

- **Participants**: `Browser (Angular AuthStore)`, `Express AuthController`, `AuthService`, `Redis (RateLimiter)`, `MySQL (Prisma)`, `Google OAuth Verifier`, and `SMTP Mailer`.
- **Main Execution Path**:
  1. The user submits `POST /api/v1/auth/register` (`email`, `password`, `fullName`, `phone`). After passing `authRateLimiter` (`20 req / 15 min`) and Zod validation, `AuthService` hashes the password via `bcrypt.hash(password, 10)` and upserts an unverified `User` (`emailVerifiedAt = null`).
  2. `AuthService` generates a random 6-digit numeric OTP, stores its `SHA-256` digest in `email_verification_tokens` (`expiresAt = NOW() + 10m`, enforcing a 60-second resend cooldown), and dispatches the verification email via Nodemailer.
  3. When the user submits `POST /api/v1/auth/verify-email` (`{ email, otp }`, rate-limited to `5 req / 15 min`), `AuthService` matches the `SHA-256` digest inside a MySQL transaction, sets `User.emailVerifiedAt = NOW()`, marks `EmailVerificationToken.usedAt = NOW()`, creates a root `RefreshToken` (`familyId = uuid()`), sets the `HttpOnly` `refreshToken` cookie (`maxAge = 7d`, `path = '/api'`), and returns a 15-minute `HS256` `accessToken`.
  4. For subsequent logins (`POST /api/v1/auth/login` or `POST /api/v1/auth/google`), `AuthService` verifies the bcrypt digest or validates the Google OIDC `idToken` signature via `google-auth-library`, links or creates the `User` record, and issues a fresh token family.
- **Alternative / Error Paths**: `alt [Email already verified]` returns `409 CONFLICT`; `alt [OTP resend < 60s]` returns `429 OTP_COOLDOWN`; `alt [Unverified user attempts password login]` returns `403 EMAIL_NOT_VERIFIED` and triggers a fresh OTP email; `alt [User.status == LOCKED]` returns `403 ACCOUNT_LOCKED`.
- **Architectural Decision Demonstrated**: Storing only `SHA-256` digests of OTPs and refresh tokens ensures that a database read compromise never exposes usable credentials (`NFR-S02`).

### 4.4.2. Access Token Refresh and Session Recovery

Figure 4.4.2-1 (`FIG D37`) illustrates how the Angular SPA silently recovers expired 15-minute access tokens and detects stolen refresh token replay using Refresh Token Rotation (RTR).

> **[INSERT FIGURE 4.4.2-1 | D37 | Sequence diagram: Single-flight access token refresh, RTR rotation, and reuse detection | owner: Khánh Vi | file: sequence diagram (PCCV row D37)]**
> _Figure 4.4.2-1. UML sequence diagram for single-flight JWT refresh, Refresh Token Rotation (`familyId`), and compromised family revocation (D37)._

- **Participants**: `Angular Component`, `authInterceptor`, `AuthStore (refresh$)`, `AuthController`, `AuthService`, `MySQL (RefreshToken)`, and `Redis (Blacklist)`.
- **Main Execution Path**:
  1. On application bootstrap (`APP_INITIALIZER`) or when a protected API call returns `401 TOKEN_EXPIRED`, `authInterceptor` pauses concurrent outgoing requests behind a shared RxJS single-flight subject (`refresh$`) and dispatches a single `PUT /api/v1/auth/refresh-token` request (`withCredentials: true`).
  2. `AuthService` extracts the `refreshToken` cookie, verifies its JWT signature, computes `SHA-256(token)`, and queries `refresh_tokens` by `tokenHash`.
  3. Inside a MySQL transaction, `AuthService` creates a new `RefreshToken` row inheriting the same `familyId`, sets `oldToken.revokedAt = NOW()` and `oldToken.replacedById = newToken.id`, writes the rotated `HttpOnly` cookie, and returns a new 15-minute `accessToken`.
  4. `authInterceptor` updates `AuthStore` in memory and replays all queued HTTP requests with the new `Authorization: Bearer` header.
- **Alternative / Error Paths**: `alt [Presented token already has revokedAt != null or replacedById != null]` indicates token theft and replay; `AuthService` immediately executes `UPDATE refresh_tokens SET revokedAt = NOW() WHERE familyId = ?`, blacklists `familyId` in Redis, clears the cookie, and returns `401 UNAUTHORIZED`, forcing re-authentication across all devices.
- **Architectural Decision Demonstrated**: Single-flight client queuing (`refresh$`) prevents concurrent Angular requests from triggering false-positive RTR reuse alarms during token expiry transitions.

### 4.4.3. Movie and Showtime Search

Figure 4.4.3-1 (`FIG D38`) models hybrid SSR/CSR movie discovery and multi-dimensional showtime schedule retrieval (`GET /api/v1/movies` and `GET /api/v1/sessions`).

> **[INSERT FIGURE 4.4.3-1 | D38 | Sequence diagram: Movie catalogue browsing, showtime filtering, and Redis read-aside caching | owner: Khánh Vi | file: sequence diagram (PCCV row D38)]**
> _Figure 4.4.3-1. UML sequence diagram for movie discovery and multi-filter showtime schedule lookup with Redis read-aside caching and resilient date fallback (D38)._

- **Participants**: `Browser / Angular SSR`, `CatalogStore / ShowtimeStore`, `MoviesController & SessionsController`, `Redis Cache`, `MySQL (Prisma)`, and `MongoDB (MovieMetadata)`.
- **Main Execution Path**:
  1. When a user navigates to `/movie/:id` or `/showtimes?movieId=...&provinceId=...&date=YYYY-MM-DD&format=...`, the Angular route resolver requests movie metadata and filtered sessions in parallel.
  2. `MoviesService` and `SessionsService` check Redis (`cache:movie:{id}` TTL `600s` and `cache:showtimes:{date}:{hash}` TTL `120s`). On a cache hit, the serialised payload is returned in $<5\text{ ms}$.
  3. On a cache miss, `SessionsRepository` queries `showtimes` using composite index `idx_showtimes_movie_date_status` (`WHERE movieId = ? AND localDate = ? AND status IN ('SCHEDULED', 'OPEN', 'SOLD_OUT')`), joins `auditoriums`, `cinemas`, and `showtime_prices`, groups sessions by cinema venue and screening format (`2D`, `3D`, `IMAX`), writes the result to Redis, and returns `{ data, meta }`.
- **Alternative / Error Paths**: `alt [No showtimes found on requested date]` triggers the resilient date fallback in `sessions.service.js`, querying the nearest available `localDate` with open screenings so the UI remains populated even between crawler runs.
- **Architectural Decision Demonstrated**: Denormalising `cinemaId` and `localDate` (`Asia/Ho_Chi_Minh`) onto `showtimes` eliminates multi-table timezone conversions and sustains $p_{95} < 200\text{ ms}$ query latency.

### 4.4.4. Seat Map Retrieval and Seat Hold

Figure 4.4.4-1 (`FIG D39`) details the most latency- and concurrency-sensitive interaction in CineHub: rendering the auditorium seat map and acquiring an atomic 15-minute hold (`POST /api/v1/booking/holds`).

> **[INSERT FIGURE 4.4.4-1 | D39 | Sequence diagram: 2D/3D seat map retrieval and atomic multi-seat hold acquisition | owner: Khánh Vi | file: sequence diagram (PCCV row D39)]**
> _Figure 4.4.4-1. UML sequence diagram for seat map retrieval and atomic multi-seat reservation across Redis Lua scripts and MySQL row locks (D39)._

- **Participants**: `Angular SeatSelectionComponent (2D/3D POV)`, `BookingController`, `BookingService`, `Redis (Lua Engine)`, and `MySQL (InnoDB Transaction)`.
- **Main Execution Path**:
  1. The client calls `GET /api/v1/booking/seats/:showtimeId`. `BookingService` returns the auditorium grid and `ShowtimeSeat` states merged with active Redis lease keys (`seat:{showtimeId}:{seatId}`), enabling the user to inspect seats in 2D SVG or 3D WebGL POV (`libs/web/seat-3d`) and select $1..6$ available seats.
  2. When the user clicks _Continue_, the client dispatches `POST /api/v1/booking/holds` (`{ showtimeId, seatIds }`). Zod enforces `1 <= seatIds.length <= 6`.
  3. **Phase 1 (Redis Fast Gate)**: `BookingService` sorts `seatIds` lexicographically and executes `ACQUIRE_SEAT_LEASES_LUA`. Redis atomically checks that no `seat:{showtimeId}:{seatId}` key exists and sets all $k$ keys with `SET ... NX EX 900`.
  4. **Phase 2 (MySQL Durable Lock)**: Inside a `READ COMMITTED` Prisma transaction, `BookingRepository` locks the target `showtime_seats` rows in sorted `seatId` order (`SELECT ... FOR UPDATE`), verifies `status = 'AVAILABLE'`, increments `version = version + 1`, updates `status = 'HELD'` (`heldUntil = NOW() + 900s`), creates a `PENDING` `Booking` (`expiresAt = heldUntil`), inserts `BookingSeat` rows with `activeLock = showtimeSeatId`, and inserts an `OutboxEvent` (`booking.held`).
  5. The API returns `201 Created` with `{ bookingId, heldUntil, ttlSeconds: 900 }`, starting the 15:00 countdown timer in the Angular UI.
- **Alternative / Error Paths**: `alt [Any seat already held in Redis]` returns `0` from Lua and immediately responds `409 SEAT_TAKEN` without touching MySQL; `alt [MySQL FOR UPDATE or activeLock unique constraint fails]` rolls back the SQL transaction and invokes `RELEASE_SEAT_LEASES_LUA` to clean up the Redis keys before returning `409 SEAT_TAKEN`.
- **Architectural Decision Demonstrated**: Sorting `seatIds` prior to `SELECT ... FOR UPDATE` prevents circular wait deadlocks when two users select overlapping seat subsets simultaneously.

### 4.4.5. Booking Creation and Payment Initiation

Figure 4.4.5-1 (`FIG D40`) traces order assembly—attaching F&B concessions, reserving a promotional voucher, verifying server-side pricing, and initiating a signed payment session (`VNPay`, `MoMo`, `ZaloPay`, or `VietQR`).

> **[INSERT FIGURE 4.4.5-1 | D40 | Sequence diagram: Concession attachment, voucher reservation, and payment gateway initiation | owner: Khánh Vi | file: sequence diagram (PCCV row D40)]**
> _Figure 4.4.5-1. UML sequence diagram for checkout price calculation, voucher reservation, and signed payment URL generation (D40)._

- **Participants**: `Angular CheckoutComponent`, `BookingService`, `PaymentController & PaymentService`, `Redis`, `MySQL (Prisma)`, and `Payment Gateway API (MoMo / VNPay / ZaloPay)`.
- **Main Execution Path**:
  1. While the 900-second seat lease is active, the user optionally adds concessions (`/concessions`) and enters a voucher code on `/checkout`, then selects a payment method (`MOMO`, `VNPAY`, `ZALOPAY`, or `VIETQR`) and submits checkout.
  2. `BookingService` verifies in Redis and MySQL that all `BookingSeat` leases belong to `req.user.id` and `Booking.expiresAt > NOW()`.
  3. Inside a MySQL transaction, the service snapshots `BookingConcession` items (`concessionName`, `unitPrice`, `lineTotal`), validates the `Voucher` (`status = ACTIVE`, date window, `minOrderAmount`, `usageLimit`, `perUserLimit` via `SELECT ... FOR UPDATE`), inserts `VoucherRedemption` (`status = RESERVED`), and recomputes `totalAmount = subtotalAmount + serviceFee - discountAmount` (verified by `chk_bookings_amounts`).
  4. `PaymentService` creates a `Payment` record (`status = INITIATED`, unique `txnRef`, `successLock = NULL`, `expiresAt = Booking.expiresAt`), signs the canonical parameter string using `HMAC-SHA256` (MoMo/ZaloPay) or `HMAC-SHA512` (VNPay), and returns `{ payUrl, qrDataUrl, txnRef }` to the browser.
- **Alternative / Error Paths**: `alt [Hold expired before payment initiation]` returns `409 HOLD_EXPIRED`; `alt [Voucher quota exhausted or minOrderAmount not met]` returns `400 VALIDATION_ERROR` without mutating the seat hold.
- **Architectural Decision Demonstrated**: Recomputing all monetary figures exclusively from MySQL `ShowtimePrice`, `Concession.price`, and `Voucher` rows prevents client-side price tampering (`BR-14`).

### 4.4.6. Payment Confirmation and Ticket Issuance

Figure 4.4.6-1 (`FIG D41`) models asynchronous gateway webhook (IPN) processing, atomic order confirmation, cryptographic QR ticket generation, and transactional email dispatch.

> **[INSERT FIGURE 4.4.6-1 | D41 | Sequence diagram: Asynchronous payment webhook (IPN), booking confirmation, and QR ticket issuance | owner: Khánh Vi | file: sequence diagram (PCCV row D41)]**
> _Figure 4.4.6-1. UML sequence diagram for idempotent payment webhook verification, atomic booking/seat confirmation, and HMAC QR ticket issuance (D41)._

- **Participants**: `Payment Gateway (IPN)`, `Browser (Return URL)`, `PaymentController`, `PaymentService`, `Redis`, `MySQL (InnoDB Transaction)`, and `Outbox Relay / SMTP Mailer`.
- **Main Execution Path**:
  1. Following customer payment authorisation, the gateway dispatches an asynchronous `POST /api/v1/payments/momo-ipn` webhook while redirecting the user's browser to `/result/:ticketId`. The browser polls booking status but never mutates payment state directly.
  2. `PaymentService` verifies the webhook HMAC signature in constant time and checks the fast Redis idempotency key `idem:pay:{provider}:{eventKey}` (`SET NX EX 86400`).
  3. Inside a MySQL ACID transaction, the service inserts a `PaymentWebhookEvent` row (`UNIQUE(provider, eventKey)`), locks the `Payment` and `Booking` rows (`SELECT ... FOR UPDATE`), and verifies `Payment.amount == Booking.totalAmount`.
  4. Given `Booking.status == 'PENDING'`, the transaction updates `Payment` (`status = 'SUCCESS'`, `paidAt = NOW()`, `successLock = bookingId`), transitions `Booking` (`status = 'CONFIRMED'`, `paidAt = NOW()`, `version + 1`), updates all `ShowtimeSeat` rows (`status = 'SOLD'`, `heldUntil = NULL`), transitions `VoucherRedemption` (`status = 'REDEEMED'`), inserts one `Ticket` per `BookingSeat` (`status = 'VALID'`, `qrVersion = 1`), and writes an `OutboxEvent` (`booking.confirmed`).
  5. After commit, `BookingService` deletes the temporary Redis hold keys (`DEL seat:{showtimeId}:{seatId}`), and the outbox worker sends the HTML confirmation email with embedded QR codes (`NotificationLog.dedupeKey = "booking_confirmed:{bookingId}"`).
- **Alternative / Error Paths**: `alt [Duplicate IPN webhook]` hits `idem:pay:*` or `uq_webhook_provider_event_key` and returns `200 OK` without side effects; `alt [Gateway reports failure]` sets `Payment.status = 'FAILED'` while keeping `Booking.status = 'PENDING'` so the user can retry payment within the remaining hold TTL.
- **Architectural Decision Demonstrated**: Decoupling the untrusted browser redirect from the HMAC-verified server-to-server IPN webhook prevents spoofed return URLs from issuing unpaid tickets.

### 4.4.7. Booking Timeout and Seat Release

Figure 4.4.7-1 (`FIG D42`) models the automated background expiration sweep (`booking-expiry`) and the late-payment refund edge case.

> **[INSERT FIGURE 4.4.7-1 | D42 | Sequence diagram: Expired booking sweep, seat release, and late-payment refund handling | owner: Khánh Vi | file: sequence diagram (PCCV row D42)]**
> _Figure 4.4.7-1. UML sequence diagram for the 60-second expired booking reconciliation sweep, `activeLock` release, and late-webhook refund creation (D42)._

- **Participants**: `Expiration Worker (60s Cron)`, `BookingRepository`, `MySQL (InnoDB Transaction)`, `Redis`, and `PaymentService (Late IPN Handler)`.
- **Main Execution Path**:
  1. Every 60 seconds, the expiration job queries `bookings` where `status = 'PENDING' AND expiresAt <= NOW()` (`idx_bookings_status_expires`).
  2. For each expired booking, inside a MySQL transaction (`FOR UPDATE SKIP LOCKED`), the worker sets `Booking.status = 'EXPIRED'` (`cancelledAt = NOW()`), sets `BookingSeat.activeLock = NULL` across all child rows, resets `ShowtimeSeat` rows (`status = 'AVAILABLE'`, `heldByBookingId = NULL`, `heldUntil = NULL`, `version + 1`), updates any `VoucherRedemption` to `RELEASED` (`releasedAt = NOW()`), marks pending `Payment` attempts as `EXPIRED`, and inserts an `OutboxEvent` (`booking.expired`).
  3. Post-commit, the worker evicts `seat:{showtimeId}:{seatId}` and `showtime:{showtimeId}:seats` from Redis so the released seats immediately reappear as available.
- **Alternative / Error Paths**: `alt [Late payment IPN arrives after Booking is EXPIRED]`: if a gateway webhook reports a successful charge after the 15-minute hold expired and the seats were released, `PaymentService` records the payment, creates a `Refund` record (`status = 'PENDING'`, `reason = 'LATE_PAYMENT_AFTER_HOLD_EXPIRY'`), and emits an alert event rather than overbooking a seat that another customer may have acquired.
- **Architectural Decision Demonstrated**: Clearing `BookingSeat.activeLock = NULL` upon expiry preserves the full audit trail of historical `BookingSeat` attempts while freeing the unique constraint for future customers.

### 4.4.8. Administrative Movie and Showtime Updates

Figure 4.4.8-1 (`FIG D43`) models administrative showtime creation, room overlap validation, automated seat inventory generation, and cache invalidation.

> **[INSERT FIGURE 4.4.8-1 | D43 | Sequence diagram: Admin showtime creation, overlap validation, ShowtimeSeat materialisation, and cache eviction | owner: Khánh Vi | file: sequence diagram (PCCV row D43)]**
> _Figure 4.4.8-1. UML sequence diagram for administrative showtime scheduling, auditorium conflict checking, `ShowtimeSeat` generation, and Redis cache invalidation (D43)._

- **Participants**: `Admin Portal (Angular)`, `AdminController (requireRole('ADMIN'))`, `ShowtimeAdminService`, `MySQL (Prisma)`, and `Redis Cache`.
- **Main Execution Path**:
  1. An administrator submits `POST /api/v1/admin/showtimes` (`movieId`, `auditoriumId`, `startTime`, `format`, `captionMode`). The route guard `requireRole('ADMIN')` and Zod schema validate the request.
  2. Inside a MySQL transaction, `ShowtimeAdminService` fetches `Movie.durationMinutes`, computes `endTime = startTime + durationMinutes + cleanupBuffer`, and queries `showtimes` (`idx_showtimes_auditorium_start` `FOR UPDATE`) to verify that no active screening in `auditoriumId` overlaps `[startTime, endTime]`.
  3. The service inserts the `Showtime` row, evaluates matching `PriceRule` rows (`chainId`, `cinemaId`, `roomTier`, `screenFormat`, `dayType`, `timeSlot`, `seatType`, `ticketType` ordered by `priority DESC`) to populate `ShowtimePrice`, and bulk-inserts `ShowtimeSeat` rows (`status = 'AVAILABLE'`, `version = 0`) for every active physical `Seat` in the auditorium.
  4. Upon commit, the service invalidates `cache:showtimes:*` and `cache:movie:{movieId}` in Redis and returns `201 Created`.
- **Alternative / Error Paths**: `alt [Overlapping showtime in same auditorium]` rolls back and returns `409 CONFLICT`; `alt [Admin attempts to delete showtime with SOLD seats]` is blocked by `ON DELETE RESTRICT` and `BR-06`, requiring explicit cancellation and refund workflow.
- **Architectural Decision Demonstrated**: Materialising `ShowtimeSeat` rows with pre-resolved prices at schedule creation time makes customer seat-map reads a simple single-table lookup rather than a dynamic 5-way pricing join under load.

## 4.5. Critical Algorithm and State Modeling

### 4.5.1. Seat Availability and Seat-Hold Algorithm

The seat-hold algorithm (`apps/core-api/src/modules/booking/booking.service.js` and `platform/cache/seat-lease.js`) guarantees that a customer selecting a bundle of $k$ seats ($1 \le k \le 6$) either acquires all $k$ seats atomically or acquires none, with sub-millisecond rejection of conflicting requests:

1. **Input Canonicalisation**: Validate $1 \le |S| \le 6$ where $S = \{s_1, \dots, s_k\}$ is the set of deduplicated `seatIds`. Sort $S$ in ascending lexicographical order: $s_{(1)} < s_{(2)} < \dots < s_{(k)}$.
2. **All-or-Nothing Redis Lease (`ACQUIRE_SEAT_LEASES_LUA`)**: Pass keys $K_i = \text{\texttt{seat:}}\{\text{\texttt{showtimeId}}\}\text{\texttt{:}}\{s_{(i)}\}$ and arguments `owner = userId`, `ttl = 900` to Redis `EVAL`:
   - _Phase A (Check)_: Iterate $i = 1 \dots k$. If `redis.call('EXISTS', KEYS[i]) == 1` (and the existing value is not owned by the same `userId` retry), immediately return `0` (abort).
   - _Phase B (Acquire)_: Iterate $i = 1 \dots k$ and execute `redis.call('SET', KEYS[i], ARGV[1] .. ':' .. ARGV[3], 'NX', 'EX', 900)`. Return `1`.
3. **Database Row Locking & State Mutation**: Open a MySQL `READ COMMITTED` transaction:
   - Execute `SELECT id, seatId, status, version, price FROM showtime_seats WHERE showtimeId = ? AND seatId IN (...) ORDER BY seatId ASC FOR UPDATE`.
   - Verify all $k$ rows exist and have `status == 'AVAILABLE'`.
   - Update `showtime_seats` setting `status = 'HELD'`, `heldByBookingId = booking.id`, `heldUntil = NOW() + 900s`, `version = version + 1` where `version = oldVersion`.
   - Insert `Booking` (`status = 'PENDING'`, `expiresAt = heldUntil`) and $k$ `BookingSeat` rows with `activeLock = showtimeSeat.id`.
4. **Compensating Rollback on SQL Failure**: If step 3 throws any exception, roll back the MySQL transaction and immediately execute `RELEASE_SEAT_LEASES_LUA` to delete $K_1 \dots K_k$ in Redis before propagating `409 SEAT_TAKEN`.

### 4.5.2. Concurrent Booking Conflict Prevention

To ensure zero double-booking even under flash-sale traffic spikes or Redis cache failovers, CineHub enforces a **Four-Layer Defence-in-Depth Concurrency Architecture**, illustrated in Figure 4.5.2-1 (`FIG D48`).

> **[INSERT FIGURE 4.5.2-1 | D48 | Flowchart: 4-layer defence-in-depth seat concurrency control | owner: Quỳnh Anh | file: algorithm flowchart (PCCV row D48)]**
> _Figure 4.5.2-1. Four-layer seat concurrency control pipeline combining Redis Lua `SET NX EX 900`, MySQL `SELECT ... FOR UPDATE`, optimistic `version` checking, and the `BookingSeat.activeLock` unique constraint (D48)._

- **Layer 1 — In-Memory Atomic Gate (Redis Lua)**: `ACQUIRE_SEAT_LEASES_LUA` (`SET NX EX 900`) executes on Redis's single-threaded event loop, absorbing $>99\%$ of concurrent contention in $<1\text{ ms}$ without opening MySQL connections.
- **Layer 2 — Pessimistic Row Lock (MySQL InnoDB)**: `SELECT ... FROM showtime_seats ... ORDER BY seatId ASC FOR UPDATE` serialises concurrent transactions if Redis was flushed or restarted mid-hold, while sorted `seatId` ordering prevents circular deadlocks.
- **Layer 3 — Optimistic Version Guard (`ShowtimeSeat.version`)**: `UPDATE showtime_seats SET ..., version = version + 1 WHERE id = ? AND version = ?` detects stale state reads across service boundaries and triggers immediate rollback on mismatch.
- **Layer 4 — Structural Unique Lock (`BookingSeat.activeLock`)**: `UNIQUE (activeLock)` on `booking_seats` (`activeLock = showtimeSeatId` while active, `NULL` when expired) acts as the ultimate database storage-engine invariant: InnoDB physically refuses to commit two active `BookingSeat` rows for the same `ShowtimeSeat`.

**Proof of Conflict Prevention under 100 Concurrent Requests**: Suppose 100 users simultaneously submit `POST /api/v1/booking/holds` for seat `F7` of the same showtime at $t = 0$. Because Redis processes commands sequentially on a single thread, the first request $R_1$ reaching `EVAL` sees `EXISTS == 0`, sets `seat:{showtimeId}:F7` with TTL `900s`, and proceeds to MySQL, while requests $R_2 \dots R_{100}$ see `EXISTS == 1` and are rejected with `409 SEAT_TAKEN` in sub-millisecond time. Even in the degraded scenario where Redis experiences a failover between $R_1$ and $R_2$, both requests reach MySQL Layer 2: InnoDB grants the exclusive row lock on `showtime_seats(F7)` to $R_1$ first, while $R_2$ blocks on `FOR UPDATE`. When $R_1$ commits (`status = 'HELD'`, `version = 1`, `activeLock = ss_F7`), $R_2$ unblocks, sees `status != 'AVAILABLE'` (Layer 2), `version != 0` (Layer 3), and `Duplicate entry for key 'uq_booking_seats_active_lock'` (Layer 4), guaranteeing that at most 1 of the 100 requests succeeds.

### 4.5.3. Booking and Payment State Machine

Figures 4.5.3-1 (`FIG D49`) and 4.5.3-2 (`FIG D50`) formalise the coupled UML state machines governing `BookingStatus`, `PaymentStatus`, `SeatState`, `TicketStatus`, and `RedemptionStatus` using the exact enumerations defined in `libs/db/prisma/schema.prisma`.

> **[INSERT FIGURE 4.5.3-1 | D49 | UML Statechart: Coupled `BookingStatus` and `PaymentStatus` state machines | owner: Quỳnh Anh | file: state diagram (PCCV row D49)]**
> _Figure 4.5.3-1. Coupled UML state machine for `BookingStatus` (`PENDING`, `CONFIRMED`, `CANCELLED`, `EXPIRED`, `REFUNDED`) and `PaymentStatus` (`INITIATED`, `PENDING`, `SUCCESS`, `FAILED`, `CANCELLED`, `EXPIRED`, `REFUNDED`) showing transition triggers and `successLock` guards (D49)._

> **[INSERT FIGURE 4.5.3-2 | D50 | UML Statechart: Coupled `SeatState`, `TicketStatus`, and `RedemptionStatus` state machines | owner: Quỳnh Anh | file: state diagram (PCCV row D50)]**
> _Figure 4.5.3-2. Coupled UML state machine for `ShowtimeSeat.status` (`AVAILABLE`, `HELD`, `SOLD`, `BLOCKED`), `Ticket.status` (`VALID`, `USED`, `VOID`), and `VoucherRedemption.status` (`RESERVED`, `REDEEMED`, `RELEASED`) (D50)._

The coupled state machines enforce four strict transition invariants across the five domain entities:

- **Hold & Reservation (`[Initial] -> PENDING / HELD / RESERVED`)**: Triggered by `POST /booking/holds` when target seats are `AVAILABLE`. Sets `Booking.status = PENDING` (`expiresAt = NOW() + 15m`), `BookingSeat.activeLock = showtimeSeatId`, `ShowtimeSeat.status = HELD`, and (upon voucher attachment) `VoucherRedemption.status = RESERVED`.
- **Confirmation & Issuance (`PENDING -> CONFIRMED / SUCCESS / SOLD / VALID / REDEEMED`)**: Triggered by a verified gateway IPN (`Payment.status: INITIATED -> PENDING -> SUCCESS`) while `Booking.status == PENDING`. Atomically sets `Payment.successLock = bookingId`, transitions `Booking` to `CONFIRMED`, locks `ShowtimeSeat` as `SOLD`, transitions `VoucherRedemption` to `REDEEMED`, and issues `Ticket` in state `VALID` (`qrVersion = 1`).
- **Expiration & Cancellation (`PENDING -> EXPIRED / CANCELLED -> AVAILABLE / RELEASED`)**: Triggered either by the 60-second expiry cron (`NOW() >= expiresAt`) or explicit user release (`DELETE /holds/:id`). Resets `BookingSeat.activeLock = NULL`, returns `ShowtimeSeat` to `AVAILABLE` (`version + 1`), marks pending payments `EXPIRED` or `CANCELLED`, and transitions `VoucherRedemption` to `RELEASED`.
- **Gate Check-in & Refund (`VALID -> USED / VOID` and `CONFIRMED -> REFUNDED`)**: Staff QR verification (`POST /staff/checkin`) transitions `Ticket` from `VALID` to `USED` (`usedAt = NOW()`, `checkedInById = staff.id`). Administrative refund of a confirmed booking transitions `Booking` and `Payment` to `REFUNDED`, clears `activeLock = NULL`, voids the `Ticket` (`status = VOID`), and increments `qrVersion` to invalidate previously emailed QR codes.

### 4.5.4. Payment Idempotency and Duplicate Callback Handling

Payment providers (`VNPay`, `MoMo`, `ZaloPay`) operate on an at-least-once webhook delivery model: if an HTTP timeout occurs or a user refreshes the return URL while the server-to-server IPN is in flight, the backend receives multiple identical callbacks. Figure 4.5.4-1 (`FIG D51`) illustrates the three-tier idempotency pipeline in `apps/core-api/src/modules/payment/`.

> **[INSERT FIGURE 4.5.4-1 | D51 | Flowchart: Payment webhook idempotency, HMAC verification, and late-payment handling | owner: Thảo Châu | file: algorithm flowchart (PCCV row D51)]**
> _Figure 4.5.4-1. Payment webhook idempotency decision flowchart showing constant-time HMAC verification, Redis `idem:pay:*` filtering, `PaymentWebhookEvent` deduplication, `Payment.successLock`, and late-payment refund routing (D51)._

1. **Cryptographic Origin Verification**: Reconstruct the canonical key-sorted query/body payload and compute `HMAC-SHA512` (VNPay) or `HMAC-SHA256` (MoMo/ZaloPay). Compare digests using `crypto.timingSafeEqual`; reject mismatches with `400 INVALID_SIGNATURE`.
2. **Tier 1 Fast Redis Filter**: Execute `SET idem:pay:{provider}:{eventKey} 1 NX EX 86400`. If the key already exists and `PaymentWebhookEvent.processedAt` is set, return `200 OK` immediately.
3. **Tier 2 Durable Webhook Log**: Insert `(provider, eventKey, txnRef, rawPayload)` into `payment_webhook_events`. The composite unique index `uq_webhook_provider_event_key` prevents duplicate webhook processing across container restarts.
4. **Tier 3 `Payment.successLock` Invariant**: Inside the confirmation transaction, setting `Payment.successLock = bookingId` enforces the MySQL unique constraint `uq_payments_success_lock`. Even if two distinct payment attempts (`txnRef_1` via MoMo and `txnRef_2` via VietQR) for the same `bookingId` succeed simultaneously, the second transaction fails on `uq_payments_success_lock` and is routed to the automated `Refund` queue (`reason = 'DUPLICATE_PAYMENT'`).

### 4.5.5. Ticket Generation and Verification Logic

To prevent ticket forgery and replay attacks without storing sensitive raw tokens in the database, CineHub uses a **Stateless Versioned HMAC-SHA256 QR Protocol**, depicted in Figure 4.5.5-1 (`FIG D52`; see also sequence diagram `D47` in Appendix E).

> **[INSERT FIGURE 4.5.5-1 | D52 | Flowchart: Cryptographic HMAC-SHA256 QR ticket generation, staff check-in verification, and `qrVersion` revocation | owner: Thảo Châu | file: algorithm flowchart (PCCV row D52)]**
> _Figure 4.5.5-1. Stateless QR ticket signing (`ticketId.signature`), constant-time staff gate verification, venue scope enforcement, and instant revocation via `qrVersion` increment (D52)._

- **Generation Formula**: When a `Ticket` is rendered for email or `/my-tickets`, the backend computes a 16-hex-character (64-bit) truncated MAC over the ticket's UUID v7 identifier and its integer `qrVersion`:
  $$\text{sig} = \text{ slice}_{0..16}\Big(\text{HMAC-SHA256}\big(\text{\texttt{QR\_HMAC\_SECRET}},\; \text{\texttt{ticketId}} \mathbin{\Vert} \text{\texttt{":"}} \mathbin{\Vert} \text{\texttt{qrVersion}}\big)\Big)$$
  $$\text{qrPayload} = \text{\texttt{ticketId}} \mathbin{\Vert} \text{\texttt{"."}} \mathbin{\Vert} \text{sig}$$
- **Verification & Check-in (`POST /api/v1/staff/checkin`)**:
  1. Split `qrPayload` on `"."` into `(ticketId, presentedSig)`. Fetch `Ticket` joined with `Booking`, `Showtime`, and `BookingSeat` (`SELECT ... FOR UPDATE`).
  2. Recompute `expectedSig` using the database row's current `Ticket.qrVersion` and compare with `presentedSig` via `crypto.timingSafeEqual`. If invalid—or if the ticket was re-issued/voided, incrementing `qrVersion`—return `400 INVALID_QR_SIGNATURE`.
  3. Enforce venue authorisation (`BR-21`): if `req.user.role == 'STAFF'` and `req.user.cinemaId != Showtime.cinemaId`, reject with `403 FORBIDDEN`.
  4. Check state: if `Ticket.status == 'USED'`, return `409 TICKET_ALREADY_USED` (including `usedAt` and `checkedInById`); if `Ticket.status == 'VOID'`, return `409 TICKET_VOID`.
  5. Transition `Ticket.status = 'USED'`, `usedAt = NOW()`, `checkedInById = req.user.id`, and commit.

### 4.5.6. AI Retrieval and Response Workflow

The CineBot conversational concierge (`apps/core-api/src/modules/chatbot/`) implements a grounded **Retrieval-Augmented Generation (RAG)** workflow that eliminates hallucinated movie titles, prices, and showtimes. Figure 4.5.6-1 (`FIG D53`; see also sequence diagram `D45` in Appendix E) models this seven-stage pipeline.

> **[INSERT FIGURE 4.5.6-1 | D53 | Flowchart: 7-stage CineBot RAG pipeline with 768-dim vector search, MySQL fact grounding, and deterministic fallback | owner: Thảo Châu | file: algorithm flowchart (PCCV row D53)]**
> _Figure 4.5.6-1. CineBot conversational RAG workflow combining Vietnamese text normalisation, 4-intent classification, 768-dimensional `gemini-embedding-001` cosine retrieval, MySQL `databaseFacts` grounding, and deterministic fallback (D53)._

1. **Session & Anaphora Resolution**: Load the user's `ai_chat_sessions` document from MongoDB (`last 20 messages`, `lastSuggestedMovies`). Resolve Vietnamese pronouns (_"phim đó"_, _"suất chiếu phim này"_) against `lastSuggestedMovies[0]`.
2. **Vietnamese Normalisation & 4-Intent Classification (`nlp.js`)**: Strip accents (`normalizeText`) and classify the utterance into one of four intents (`SHOWTIME`, `BOOKING`, `CINEMA`, `GENERAL`) while extracting structured entities (`genres`, `date`, `timePreference`, `province`, `format`).
3. **Query Embedding (`gemini-embedding-001`)**: Encode the user query into a 768-dimensional float vector $\mathbf{q} \in \mathbb{R}^{768}$ using `outputDimensionality: 768`.
4. **Semantic Vector Search (MongoDB)**: Compute cosine similarity $\cos(\mathbf{q}, \mathbf{v}_i) = \frac{\mathbf{q} \cdot \mathbf{v}_i}{\|\mathbf{q}\| \|\mathbf{v}_i\|}$ against `movie_embeddings` to retrieve the top-$K$ ($K=5$) semantically relevant `movieId` candidates.
5. **Relational Fact Grounding (MySQL)**: Intersect the candidate `movieId` list with live MySQL records (`Movie`, `Showtime`, `Cinema`, `ShowtimePrice`, `Concession`) to construct the structured `databaseFacts` JSON block.
6. **Constrained LLM Generation (`gemini-2.5-flash`)**: Construct a system prompt instructing Gemini to answer solely from `databaseFacts`, redact PII in logs, and return `{ reply, suggestedMovies }`.
7. **Deterministic Fallback**: If the Gemini API times out, returns an error, or is unconfigured, `chatbot.service.js` seamlessly falls back to a template-driven response synthesised directly from `databaseFacts`, ensuring 100% availability.

## 4.6. Chapter Summary

This chapter established the complete architectural and detailed design of CineHub across thirty-two design artefacts (`D22`–`D53`). At the architectural level, the platform combines an Angular 20 domain-sliced workspace (`libs/web/*`) and an Express 5 modular monolith (`apps/core-api`) with a polyglot persistence tier (MySQL 8.4, Redis 7, and MongoDB 7). At the contract and data levels, shared Zod schemas enforce a single source of truth across all endpoint groups, while 39 normalized MySQL tables, 27 enumerations, and 33 SQL `CHECK` constraints safeguard relational and monetary integrity. Finally, the behavioural sequence models (`D36`–`D47`) and algorithmic specifications (`D48`–`D53`) demonstrate how four-layer concurrency control (`ACQUIRE_SEAT_LEASES_LUA`, `SELECT ... FOR UPDATE`, optimistic `version`, and `BookingSeat.activeLock`), three-tier webhook idempotency (`idem:pay:*`, `PaymentWebhookEvent`, and `Payment.successLock`), stateless `HMAC-SHA256` QR ticketing, and grounded 768-dimensional RAG retrieval fulfill every functional and non-functional requirement defined in Chapter 3. Chapter 5 proceeds to the user interface and user experience (UI/UX) design of the platform.
