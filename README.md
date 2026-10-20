# CineHub Platform - Enterprise Monorepo Specification

## Overview

CineHub is an enterprise-grade digital cinema ticketing and reservation platform built on a distributed monorepo architecture. The platform provides real-time showtime aggregation, 3D Point-of-View (POV) auditorium seating simulation using WebGL/Three.js, an intelligent natural language processing and recommendation engine powered by Google Gemini and vector retrieval, and a multi-tiered concurrency control pipeline designed to eliminate double-booking anomalies under high-throughput conditions.

The platform integrates directly with live commercial cinema provider datasets (Galaxy Cinema catalog covering active movies, complexes nationwide, and daily sessions) and operates over a polyglot persistence tier composed of MySQL 8.4, Redis 7, and MongoDB 7.

---

## Architecture Diagram

```mermaid
flowchart TB
    subgraph ClientTier["Client Presentation Tier (apps/web)"]
        UI["React 19 + Vite + Tailwind CSS v4"]
        Three["3D POV Seat Simulation (Three.js)"]
        Axios["authorizedAxios Instance"]
        Queue["Promise Failed Queue & isRefreshing Guard"]
        Mocks["Isolated Mock Store (mocks/)"]
        UI --> Three
        UI --> Axios
        Axios <--> Queue
        UI -.->|VITE_USE_MOCKS=true / Fallback| Mocks
    end

    subgraph GatewayTier["API & Domain Services (services/core-api)"]
        Router["Express 5 Router (/api)"]
        Cors["CORS Policy (Credentials & Whitelist)"]
        AuthMW["Authentication Middleware (requireAuth)"]

        subgraph DomainModules["Modular Monolith Domains (modules/)"]
            AuthMod["auth (routes, controller, service, schema)"]
            CinemasMod["cinemas"]
            MoviesMod["movies"]
            ConcessionsMod["concessions"]
            ChatbotMod["chatbot & recommendations"]
        end

        Jobs["Background Jobs (jobs/embed-movies.js)"]

        Router --> Cors --> AuthMW
        AuthMW --> DomainModules
        Jobs -.-> ChatbotMod
    end

    subgraph DataIngestionTier["Ingestion & Data Pipelines (services/aggregator & tools)"]
        Crawler["Galaxy Cinema Crawler"]
        SyncTool["tools/sync-data.js"]
    end

    subgraph PersistenceTier["Polyglot Persistence Tier"]
        MySQL[("MySQL 8.4 (Prisma ORM 6 / @cinehub/db)\nTransactional Source of Truth")]
        Redis[("Redis 7 (Cache & Distributed Lock)\nSeat Leases & Rate Limiting")]
        Mongo[("MongoDB 7 (Document Store)\nRaw Crawler Payloads & Vector Embeddings")]
    end

    Axios <==>|HTTP / REST (Proxy /api)| Router
    DomainModules <--> MySQL
    DomainModules <--> Redis
    ChatbotMod <--> Mongo
    Jobs <--> Mongo
    Jobs <--> MySQL
    Crawler --> MySQL
    Crawler -.-> Mongo
    SyncTool --> MySQL
```

---

## Table of Contents

1. [Architectural Overview and Core Decisions](#1-architectural-overview-and-core-decisions)
2. [Monorepo Workspace Topology](#2-monorepo-workspace-topology)
3. [Network Topology and Service Port Allocations](#3-network-topology-and-service-port-allocations)
4. [Standard 4-Step Onboarding and Local Setup](#4-standard-4-step-onboarding-and-local-setup)
5. [Authentication and Token Lifecycle Architecture](#5-authentication-and-token-lifecycle-architecture)
6. [Operational Scripts and Command Reference](#6-operational-scripts-and-command-reference)
7. [Data Tier Management and Migration Workflows](#7-data-tier-management-and-migration-workflows)
8. [Concurrency Control and Seat Lease Protocol](#8-concurrency-control-and-seat-lease-protocol)
9. [Engineering Standards and Git Governance](#9-engineering-standards-and-git-governance)
10. [Troubleshooting and Operational Runbook](#10-troubleshooting-and-operational-runbook)

---

## 1. Architectural Overview and Core Decisions

The CineHub architecture follows domain-driven modular design principles configured as an NPM Monorepo. Key architectural decisions include:

### 1.1. Monorepo Topology

- **NPM Workspaces**: Centralized dependency resolution, single lockfile integrity, and zero-overhead workspace package resolution (`@cinehub/db`, `@cinehub/shared`, `@cinehub/core-api`, `@cinehub/web`, `@cinehub/aggregator`).

### 1.2. Polyglot Persistence Architecture

- **Relational Core (MySQL 8.4 via Prisma ORM 6)**: Acts as the definitive single source of truth for all transactional business entities, including Accounts, Refresh Tokens, Bookings, Orders, Tickets, Concessions, Showtimes, Auditoriums, and Price Rule matrices. Schema integrity is strictly enforced across 39 tables and 27 enumerations.
- **Distributed Cache and Locking (Redis 7)**: Implements atomic seat hold reservations using Lua scripts with explicit Time-To-Live (TTL) expiration, rate limiting, and session security. Configured with Append-Only File (AOF) persistence and `noeviction` policy to guarantee lease validity.
- **Unstructured / Document Storage (MongoDB 7)**: Retains raw immutable crawler payloads from cinema API gateways, user reviews, audit logging, and fallback embedding vector representations.

### 1.3. Concurrency and Transaction Isolation

- Seat selection under high load implements a multi-tier reservation protocol:
  1. Distributed atomic lease in Redis (`SET resource_key token NX EX 900`).
  2. Transactional validation in MySQL (`READ COMMITTED` isolation with row-level locks).
  3. Pre-checkout lease validation ensuring no order placement can occur past lease expiration.

### 1.4. Technology Matrix

| Layer                       | Technology                                    | Operational Function                                                           |
| :-------------------------- | :-------------------------------------------- | :----------------------------------------------------------------------------- |
| **Workspace Orchestration** | NPM Workspaces                                | Workspace coordination, shared dependencies, unified tooling                   |
| **Client Application**      | React 19, Vite, Tailwind CSS v4               | Single-page application, responsive layout, reactive state machine             |
| **HTTP Client & Security**  | Axios with Interceptors & Queue               | Silent JWT renewal, request retry queue, withCredentials cookies               |
| **3D Simulation Engine**    | Three.js (WebGL)                              | Procedural 3D auditorium viewport projection from selected seat coordinates    |
| **Application Server**      | Node.js 20+ (ESM), Express 5                  | High-throughput REST API, Modular Monolith architecture                        |
| **AI / NLP Engine**         | Google Gemini API, Natural NLP, Vector Math   | Vietnamese intent classification, cosine similarity search, generative chatbot |
| **Database & ORM**          | MySQL 8.4, Prisma 6                           | ACID-compliant transaction processing, schema migrations, relation modeling    |
| **Cache & Task Queue**      | Redis 7                                       | Atomic distributed locks, TTL leases, rate limiting                            |
| **Validation Layer**        | Zod (`@cinehub/shared`)                       | End-to-end runtime type safety shared across client and server tiers           |
| **Static Analysis & QA**    | ESLint 9, Prettier, Husky, Commitlint, Vitest | Continuous code linting, formatting enforcement, automated unit test suites    |

---

## 2. Monorepo Workspace Topology

```
cinehub/
├── apps/
│   └── web/                                # Client Frontend Application (React 19 + Vite + TypeScript)
│       ├── src/
│       │   ├── components/                 # UI primitives, layout wrappers, SeatMap3D
│       │   ├── lib/
│       │   │   └── authorizedAxios.ts      # Axios instance, request/response interceptors & refresh queue
│       │   ├── mocks/
│       │   │   ├── data.mock.ts            # Isolated static movie/cinema datasets for tests & fallbacks
│       │   │   └── sessions.mock.ts        # Large showtime session mock dataset (code-split on demand)
│       │   ├── pages/                      # Route controllers: Home, Showtimes, Seats, Checkout, Profile
│       │   ├── services/
│       │   │   ├── authApi.ts              # Authentication service client interface
│       │   │   ├── sessionsApi.ts          # Showtime sessions client with real API & mock fallback
│       │   │   ├── moviesApi.ts            # Movie catalog API client
│       │   │   ├── concessionsApi.ts       # Food and beverage API client
│       │   │   └── chatbotApi.ts           # AI assistant API client
│       │   ├── data.ts                     # UI configuration, theme tokens, and mock re-exports
│       │   └── store.tsx                   # Client state management
│       └── test/                           # UI and seat simulation tests
├── services/
│   ├── core-api/                           # Modular Monolith Backend (Node.js ESM + Express 5)
│   │   ├── src/
│   │   │   ├── config/
│   │   │   │   ├── cors.js                 # Centralized CORS policy with credentials support
│   │   │   │   └── env.js                  # Runtime environment variable validation (Zod)
│   │   │   ├── lib/
│   │   │   │   ├── jwt.js                  # JWT token creation, verification and hashing utilities
│   │   │   │   ├── errors.js               # Structured AppError class
│   │   │   │   └── logger.js               # Pino logging configuration
│   │   │   ├── middleware/
│   │   │   │   ├── auth.middleware.js      # Bearer token verification and role guard middleware
│   │   │   │   ├── errorHandler.js         # Centralized error handler and notFound handler
│   │   │   │   └── validate.js             # Zod schema request validation middleware
│   │   │   ├── modules/                    # Feature domains (Modular Monolith)
│   │   │   │   ├── auth/                   # routes, controller, service, schema
│   │   │   │   ├── cinemas/                # routes, controller, service, schema
│   │   │   │   ├── concessions/            # routes, controller, service, schema
│   │   │   │   ├── movies/                 # routes, controller, service, schema
│   │   │   │   ├── chatbot/                # routes, controller, service, vector search
│   │   │   │   └── recommendations/        # routes, controller, service
│   │   │   ├── jobs/
│   │   │   │   └── embed-movies.js         # Movie vector embedding generation job
│   │   │   ├── app.js                      # Express application factory
│   │   │   ├── routes.js                   # Root API route aggregations
│   │   │   └── server.js                   # HTTP server entrypoint
│   │   └── test/                           # API domain and controller unit tests
│   └── aggregator/                         # Ingestion Worker & Cinema Data Pipeline
│       ├── src/
│       │   ├── adapters/                   # Cinema provider data normalization mappers
│       │   └── jobs/                       # Scheduled crawl jobs (crawl-galaxy.js)
│       └── test/                           # Ingestion mapper contract test suites
├── packages/
│   ├── db/                                 # Relational Database Package
│   │   ├── prisma/
│   │   │   ├── schema.prisma               # Enterprise Prisma schema (39 models, 27 enums)
│   │   │   ├── migrations/                 # Version-controlled SQL migration history
│   │   │   └── seed.js                     # Seed script (cinemas, rooms, pricing rules, concessions)
│   │   └── src/index.js                    # Singleton PrismaClient export
│   └── shared/                             # Universal Shared Library
│       └── src/                            # Zod schemas, HTTP error codes, domain business constants
├── tools/
│   └── sync-data.js                        # Direct live data synchronization utility
├── docs/
│   ├── GIT_WORKFLOW.md                     # Team Git governance, feature branch lifecycle, rebase standards
│   └── database/                           # Physical database architecture documentation
├── .env.example                            # Canonical environment variable specification
├── docker-compose.yml                      # Containerized infrastructure definition
├── eslint.config.js                        # ESLint flat configuration enforcing module boundaries
├── commitlint.config.js                    # Commit message standard rules (Conventional Commits)
└── package.json                            # Root orchestration scripts and workspace manifests
```

---

## 3. Network Topology and Service Port Allocations

The default local development topology requires the following network port allocations:

| Service Identity           | Network Endpoint        | Transport / Protocol    | Access Role                                 |
| :------------------------- | :---------------------- | :---------------------- | :------------------------------------------ |
| **Frontend Web**           | `http://localhost:5173` | HTTP / WebSockets (HMR) | End-user interactive web interface          |
| **Core API Gateway**       | `http://localhost:4000` | HTTP / JSON REST        | Primary RESTful application services        |
| **Prisma Studio**          | `http://localhost:5555` | HTTP / Web GUI          | Administrative relational data explorer     |
| **MySQL Engine**           | `localhost:3306`        | TCP / MySQL Protocol    | Relational persistence engine               |
| **Redis Cache**            | `localhost:6379`        | TCP / RESP              | In-memory distributed lock and caching tier |
| **MongoDB Document Store** | `localhost:27017`       | TCP / MongoDB Wire      | Unstructured ingest document storage        |

---

## 4. Standard 4-Step Onboarding and Local Setup

Follow this standardized four-step procedure to initialize and run the entire CineHub monorepo locally:

### Prerequisites

- Node.js version `>= 20.0.0`
- NPM version `>= 10.0.0`
- Docker Engine and Docker Compose version `>= 24.0.0`

### Preparation: Environment Configuration

Before executing the onboarding steps, ensure `.env` is initialized from the example file:

```bash
cp .env.example .env
```

---

### Step 1: Provision Containerized Infrastructure

Start the containerized MySQL 8.4, Redis 7, and MongoDB 7 instances in detached mode:

```bash
npm run infra:up
```

_Alternative equivalent command:_

```bash
docker compose up -d
```

Verify that all three database containers are healthy:

```bash
docker compose ps
```

---

### Step 2: Install Monorepo Dependencies

Install all workspace dependencies from the root directory. This command automatically resolves workspace symlinks and configures Git hooks via Husky:

```bash
npm install
```

---

### Step 3: Run Database Migrations and Seed Baseline Data

Apply the Prisma relational schema migrations to MySQL and populate master records (cinema chains, auditoriums, room tiers, price rule matrices, seat maps, concessions, and movies):

```bash
npm run db:migrate && npm run db:seed
```

---

### Step 4: Launch Full-Stack Development Environment

Start both the Backend API server and the Frontend Vite client concurrently with live reload:

```bash
npm run dev
```

_Alternative alias:_

```bash
npm run dev:all
```

Once launched, access the local services at:

- Web Application: `http://localhost:5173`
- Backend API Health Check: `http://localhost:4000/api/health`
- Optional Prisma Studio: `npm run db:studio` -> `http://localhost:5555`

---

## 5. Authentication and Token Lifecycle Architecture

CineHub enforces an enterprise JWT + Refresh Token Rotation (RTR) authentication lifecycle designed to protect against cross-site scripting (XSS) and token theft:

```
[Client Application]                                     [Core API Server]
         |                                                        |
         |---- 1. POST /api/auth/login -------------------------->|
         |                                                        | Validates credentials
         |<--- 2. Returns accessToken (15m) + refreshToken Cookie -| Sets HTTP-only cookie
         |                                                        |
         |---- 3. GET /api/* (Header: Bearer accessToken) ------->|
         |                                                        | Validates JWT Access Token
         |<--- 4. HTTP 200 OK (Protected Data) -------------------|
         |                                                        |
         | [Time passes: accessToken expires]                     |
         |                                                        |
         |---- 5. GET /api/* (Expired accessToken) -------------->|
         |                                                        | Detects expiration
         |<--- 6. HTTP 401 Unauthorized (code: TOKEN_EXPIRED) ----|
         |                                                        |
         | [Axios Interceptor catches 401 & queues requests]      |
         |---- 7. POST /api/auth/refresh-token (Cookie sent) ---->|
         |                                                        | Validates RTR Family
         |                                                        | Rotates token record
         |<--- 8. Returns new accessToken + new Cookie -----------|
         |                                                        |
         | [Drains Promise queue & retries original requests]     |
         |---- 9. Retries GET /api/* with new token ------------->|
         |<--- 10. HTTP 200 OK (Success) -------------------------|
```

### 5.1. Dual Token Strategy

- **Access Token (Short-lived, 15 minutes)**: Signed using `JWT_ACCESS_SECRET` with algorithm `HS256`. Carries `{ sub: userId, role, email }`. Passed by the frontend in the HTTP `Authorization: Bearer <token>` header.
- **Refresh Token (Long-lived, 7 days)**: Signed using `JWT_REFRESH_SECRET`. Stored as a SHA-256 hash in MySQL (`refresh_tokens` table) and transmitted exclusively via an HTTP-only, SameSite=Strict cookie (`path: /api/auth`).

### 5.2. Refresh Token Rotation (RTR) & Reuse Detection

- Every refresh request invalidates the presenting refresh token and issues a new token pair within the same `familyId`.
- If an attacker attempts to use an already-revoked or already-replaced refresh token, the system detects a token reuse attack, terminates the entire token family immediately, and revokes all active sessions for that family.

### 5.3. Frontend Axios Interceptors & Concurrency Guard

- **`isRefreshing` Flag**: Prevents duplicate refresh requests when multiple concurrent asynchronous API calls receive HTTP 401 simultaneously.
- **Promise Failed Queue (`failedQueue`)**: Holds pending resolver/rejecter callbacks. While the refresh request is in flight, incoming 401 responses are enqueued. Upon successful token renewal, all queued requests are replayed with the new Bearer token.

---

## 6. Operational Scripts and Command Reference

All orchestration commands are managed from the root `package.json`:

| Script Command         | Execution Context   | Description                                                            |
| :--------------------- | :------------------ | :--------------------------------------------------------------------- |
| `npm run dev`          | Monorepo Root       | Concurrently runs `@cinehub/core-api` and `@cinehub/web`               |
| `npm run dev:all`      | Monorepo Root       | Alias for `npm run dev`                                                |
| `npm run dev:api`      | `services/core-api` | Launches Core API with file-watch auto-reload (`node --watch`)         |
| `npm run dev:web`      | `apps/web`          | Launches Vite development server with Hot Module Replacement           |
| `npm run build`        | `apps/web`          | Compiles optimized production bundle for the client application        |
| `npm run sync:live`    | Root Utility        | Ingests live Galaxy Cinema sessions and synchronizes database          |
| `npm run crawl:galaxy` | Aggregator Service  | Crawls Galaxy API, upserts MySQL entities, and triggers sync           |
| `npm run infra:up`     | Docker Engine       | Boots containerized MySQL, Redis, and MongoDB in detached mode         |
| `npm run infra:down`   | Docker Engine       | Halts all containers while preserving data volumes                     |
| `npm run db:migrate`   | `@cinehub/db`       | Executes Prisma schema migration on the target relational database     |
| `npm run db:seed`      | `@cinehub/db`       | Runs comprehensive database seeding script                             |
| `npm run db:studio`    | `@cinehub/db`       | Starts local Prisma Studio web interface on port 5555                  |
| `npm run db:validate`  | `@cinehub/db`       | Validates Prisma schema syntax and relation constraints                |
| `npm run lint`         | Monorepo Root       | Runs ESLint across all workspaces adhering to flat configuration       |
| `npm run format`       | Monorepo Root       | Formats codebase adhering to Prettier specifications                   |
| `npm test`             | Monorepo Root       | Executes unit and integration test suites via Vitest across workspaces |

---

## 7. Data Tier Management and Migration Workflows

Relational data modeling is centralized within the `@cinehub/db` package.

### 7.1. Schema Modification Procedure

When extending or altering entities in `packages/db/prisma/schema.prisma`:

1. Apply the schema change locally and generate a named SQL migration:
   ```bash
   npm run db:migrate -- --name <migration_name_snake_case>
   ```
2. Re-generate Prisma Client bindings across all consuming workspaces:
   ```bash
   npm run generate -w @cinehub/db
   ```
3. Commit both `schema.prisma` and the newly generated SQL file under `packages/db/prisma/migrations/`.

### 7.2. Master Data Ingestion and Seeding

The database seeder (`packages/db/prisma/seed.js`) provides an idempotent ingestion routine covering:

- Seat types: `STANDARD`, `VIP`, `SWEETBOX` with respective dimension and capacity metrics.
- Ticket tier matrices: Adult, Student, Child, Member.
- Cinema chains: Master entities for Galaxy Cinema, CGV, Lotte Cinema, and BHD Star.
- Full provincial administrative taxonomy across 12 Vietnamese municipal regions.
- Auditorium layout geometry, seat map matrix generation, and dynamic concession pricing.

---

## 8. Concurrency Control and Seat Lease Protocol

To prevent overselling and double-booking during peak ticket sale intervals, CineHub enforces an atomic reservation lifecycle:

```
[Client Request: Select Seat]
             |
             v
    [Check Redis Lock via Lua]
       |                 |
(Lock Exists)     (Lock Available)
       |                 |
       v                 v
[Reject 409 Conflict] [Acquire Lease: SET seat:{id} token NX EX 900]
                        |
                        v
              [Display Hold State on Client]
                        |
            [Checkout: Within 15 Min?]
               /                 \
            (Yes)                (No / TTL Expired)
             /                     \
            v                       v
[MySQL Transaction Commit]  [Redis Key Eviction: Seat Released]
[Insert Ticket & Order]
[Release Redis Lock]
```

1. **Lease Acquisition**: When a user selects a seat, an atomic Redis key is set with a 15-minute lease:
   `KEY: seat:{showtime_id}:{seat_id}`, `VALUE: {user_id}:{timestamp}`, `TTL: 900s`.
2. **Atomic Verification**: Any concurrent selection attempts fail immediately at the Redis tier prior to touching relational database storage.
3. **Checkout Validation**: During order creation, the server validates lease ownership within an ACID-compliant MySQL transaction.
4. **Lease Release / Expiration**: Upon successful payment, the seat status transitions to `BOOKED` in MySQL and the Redis key is deleted. If the session expires without payment, Redis TTL expiration automatically returns the seat to available inventory.

---

## 9. Engineering Standards and Git Governance

The engineering organization strictly adheres to the Feature Branch Workflow. **Direct commits or pushes to the `main` branch are strictly prohibited.**

Detailed operational runbook available at: [docs/GIT_WORKFLOW.md](docs/GIT_WORKFLOW.md).

### 9.1. Commit Standards (Conventional Commits)

All commit messages are validated via Husky and Commitlint:

- `feat(scope): message`: New user-facing or platform functionality
- `fix(scope): message`: Bug fix or defect remediation
- `refactor(scope): message`: Code improvement without behavioral change
- `docs(scope): message`: Documentation addition or modification
- `chore(scope): message`: Dependency updates, tooling, or environment configuration
- `test(scope): message`: Unit, integration, or end-to-end test suite adjustments

_Rule: Subject lines must remain lowercase and must not terminate with a period._

### 9.2. Standard Development Lifecycle

1. **Synchronize Main**:
   ```bash
   git checkout main && git pull origin main
   ```
2. **Create Topic Branch**:
   ```bash
   git checkout -b <type>/<task-slug>
   ```
3. **Develop and Commit**:
   ```bash
   git add . && git commit -m "feat(module): explicit description"
   ```
4. **Rebase Against Remote Main**:
   ```bash
   git fetch origin && git rebase origin/main
   ```
5. **Publish and Open Pull Request**:
   ```bash
   git push -u origin <type>/<task-slug>
   ```

---

## 10. Troubleshooting and Operational Runbook

### 10.1. Client UI Displays Outdated Showtimes

- **Root Cause**: Client fallback dataset contains static show dates from previous testing windows.
- **Remediation**: Execute direct live synchronization to ingest today's current showtimes from Galaxy Cinema:
  ```bash
  npm run sync:live
  ```

### 10.2. Missing Environment File

- **Symptom**: `Environment variable not found: DATABASE_URL`.
- **Remediation**: Copy the environment specification template:
  ```bash
  cp .env.example .env
  ```

### 10.3. Port 3306 Conflict (`EADDRINUSE`)

- **Symptom**: Local MySQL service conflicts with Docker container port 3306.
- **Remediation**:
  - Option 1 (Docker remapping): In `docker-compose.yml`, change ports to `"3307:3306"` and update `DATABASE_URL` in `.env` to `localhost:3307`.
  - Option 2 (Native service termination): Stop the native daemon via `brew services stop mysql` (macOS) or `sudo systemctl stop mysql` (Linux).

### 10.4. Prisma Client Out of Sync

- **Symptom**: Error indicating `@prisma/client did not initialize yet` or missing generated types.
- **Remediation**:
  ```bash
  npm run generate -w @cinehub/db
  ```

### 10.5. Git Hooks Execution Permission Failure

- **Symptom**: Permission denied when executing `.husky/pre-commit` or `.husky/commit-msg`.
- **Remediation**:
  ```bash
  chmod +x .husky/*
  ```

---

_CineHub Enterprise Architecture - Internal Technical Documentation._
