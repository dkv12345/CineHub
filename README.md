# CineHub Platform - Enterprise Monorepo Specification

## Overview

CineHub is an enterprise-grade digital cinema ticketing and reservation platform built on a distributed monorepo architecture. The system provides real-time showtime aggregation, 3D Point-of-View (POV) auditorium seating simulation using WebGL/Three.js, an intelligent Vietnamese natural language processing and recommendation engine powered by Google Gemini and vector retrieval, and a multi-tiered concurrency control pipeline designed to eliminate double-booking anomalies under high-throughput conditions.

The platform integrates directly with live commercial cinema provider datasets (Galaxy Cinema catalog covering 43 active movies, 31 complexes nationwide, and 3,500+ daily sessions) and operates over a polyglot persistence tier composed of MySQL 8.4, Redis 7, and MongoDB 7.

---

## Table of Contents

1. [Architectural Overview & Core Decisions](#1-architectural-overview--core-decisions)
2. [Monorepo Workspace Topology](#2-monorepo-workspace-topology)
3. [Network Topology & Service Port Allocations](#3-network-topology--service-port-allocations)
4. [Infrastructure Requirements & Local Setup](#4-infrastructure-requirements--local-setup)
5. [Operational Scripts & Command Reference](#5-operational-scripts--command-reference)
6. [Data Tier Management & Migration Workflows](#6-data-tier-management--migration-workflows)
7. [Concurrency Control & Seat Lease Protocol](#7-concurrency-control--seat-lease-protocol)
8. [Data Ingestion Pipeline (Crawler Architecture)](#8-data-ingestion-pipeline-crawler-architecture)
9. [AI Assistant & Recommendation Engine Architecture](#9-ai-assistant--recommendation-engine-architecture)
10. [Engineering Standards & Git Governance](#10-engineering-standards--git-governance)
11. [Troubleshooting & Operational Runbook](#11-troubleshooting--operational-runbook)

---

## 1. Architectural Overview & Core Decisions

The CineHub architecture follows domain-driven modular design principles configured as an NPM Monorepo. Key architectural decisions include:

### 1.1. Monorepo Topology

- **NPM Workspaces**: Centralized dependency resolution, single lockfile integrity, and zero-overhead workspace package resolution (`@cinehub/db`, `@cinehub/shared`, `@cinehub/core-api`, `@cinehub/web`, `@cinehub/aggregator`).

### 1.2. Polyglot Persistence Architecture

- **Relational Core (MySQL 8.4 via Prisma ORM 6)**: Acts as the definitive single source of truth for all transactional business entities, including Accounts, Bookings, Orders, Tickets, Concessions, Showtimes, Auditoriums, and Price Rule matrices. Schema integrity is strictly enforced across 39 tables and 27 enumerations.
- **Distributed Cache & Locking (Redis 7)**: Implements atomic seat hold reservations using Lua scripts with explicit Time-To-Live (TTL) expiration, rate limiting, and asynchronous job queuing via BullMQ. Configured with Append-Only File (AOF) persistence and `noeviction` policy to guarantee lease validity.
- **Unstructured / Document Storage (MongoDB 7)**: Retains raw immutable crawler payloads from cinema API gateways, user reviews, audit logging, and fallback embedding vector representations.

### 1.3. Concurrency & Transaction Isolation

- Seat selection under high load implements a multi-tier reservation protocol:
  1. Distributed atomic lease in Redis (`SET resource_key token NX EX 900`).
  2. Transactional validation in MySQL (`READ COMMITTED` isolation with row-level locks).
  3. Pre-checkout lease validation ensuring no order placement can occur past lease expiration.

### 1.4. Technology Matrix

| Layer                       | Technology                                    | Operational Function                                                           |
| :-------------------------- | :-------------------------------------------- | :----------------------------------------------------------------------------- |
| **Workspace Orchestration** | NPM Workspaces                                | Workspace coordination, shared dependencies, unified tooling                   |
| **Client Application**      | React 19, Vite, Tailwind CSS v4               | Single-page application, responsive layout, reactive state machine             |
| **3D Simulation Engine**    | Three.js (WebGL)                              | Procedural 3D auditorium viewport projection from selected seat coordinates    |
| **Application Server**      | Node.js 20+ (ESM), Express 5                  | High-throughput REST API, route validation, middleware security pipeline       |
| **AI / NLP Engine**         | Google Gemini API, Natural NLP, Vector Math   | Vietnamese intent classification, cosine similarity search, generative chatbot |
| **Database & ORM**          | MySQL 8.4, Prisma 6                           | ACID-compliant transaction processing, schema migrations, relation modeling    |
| **Cache & Task Queue**      | Redis 7, BullMQ                               | Atomic distributed locks, TTL leases, background cleanup jobs                  |
| **Validation Layer**        | Zod (`@cinehub/shared`)                       | End-to-end runtime type safety shared across client and server tiers           |
| **Static Analysis & QA**    | ESLint 9, Prettier, Husky, Commitlint, Vitest | Continuous code linting, formatting enforcement, automated unit test suites    |

---

## 2. Monorepo Workspace Topology

```
cinehub/
├── apps/
│   └── web/                                # Client Frontend Application (React 19 + Vite)
│       ├── src/
│       │   ├── components/                 # Atomic UI primitives, layout wrappers, SeatMap3D
│       │   ├── pages/                      # Route controllers: Home, Showtimes, Seats, Checkout, Profile
│       │   ├── services/                   # Typed API consumption clients (sessionsApi, chatbotApi, etc.)
│       │   └── store.tsx                   # Client state management with localStorage account isolation
│       └── test/                           # Component and UI regression tests
├── services/
│   ├── core-api/                           # Primary Application Server (Express 5 REST API)
│   │   ├── src/
│   │   │   ├── modules/                    # Domain modules (auth, movies, cinemas, booking, chatbot)
│   │   │   ├── middleware/                 # Security, JWT authentication, rate limiting, error handling
│   │   │   └── lib/                        # Cryptographic helpers, QR generation, vector mathematics
│   │   └── test/                           # Domain integration and controller unit test suites
│   ├── aggregator/                         # Ingestion Worker & Cinema Data Pipeline
│   │   ├── src/
│   │   │   ├── adapters/                   # Cinema provider data normalization mappers
│   │   │   ├── jobs/                       # Scheduled crawl jobs (crawl-galaxy.js)
│   │   │   └── upsert/                     # Idempotent catalog upsert operations into relational schema
│   │   └── test/                           # Ingestion and mapper contract test suites
│   └── worker/                             # Background Queue Worker (BullMQ)
│       └── src/jobs/                       # Expired seat lease reclamation, email dispatch, outbox pattern
├── packages/
│   ├── db/                                 # Relational Database Package
│   │   ├── prisma/
│   │   │   ├── schema.prisma               # Enterprise Prisma schema (39 models, 27 enums)
│   │   │   ├── migrations/                 # Version-controlled SQL migration history
│   │   │   └── seed/                       # Normalized seed scripts (movies, auditoriums, concessions)
│   │   └── src/index.js                    # Singleton PrismaClient export
│   └── shared/                             # Universal Shared Library
│       └── src/                            # Zod schemas, HTTP error codes, domain business constants
├── data/
│   └── seed/                               # Frozen baseline catalog datasets (galaxy_normalized_v3.json)
├── docs/
│   ├── GIT_WORKFLOW.md                     # Team Git governance, feature branch lifecycle, rebase standards
│   ├── ai/                                 # AI chatbot NLP pipeline and vector recommendation specification
│   └── database/                           # Physical database architecture documentation and schema diagrams
├── scripts/
│   └── sync-data.js                        # Direct live data synchronization utility for client and database
├── .env.example                            # Canonical environment variable specification
├── docker-compose.yml                      # Production-mirrored local service orchestration definition
├── eslint.config.js                        # Flat ESLint rules configuration across monorepo boundaries
├── commitlint.config.js                    # Commit message standard rules (Conventional Commits)
└── package.json                            # Root orchestration scripts and workspace manifests
```

---

## 3. Network Topology & Service Port Allocations

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

## 4. Infrastructure Requirements & Local Setup

### 4.1. Runtime Prerequisites

- **Node.js**: Version `>= 20.0.0` (Active LTS recommended, e.g., v20.x or v22.x).
- **NPM**: Version `>= 10.0.0`.
- **Docker Engine & Docker Compose**: Version `>= 24.0.0` (or native local instances of MySQL 8.4, Redis 7, MongoDB 7).
- **Git**: Version `>= 2.38.0`.

### 4.2. Step-by-Step Initial Bootstrapping

#### Step 1: Clone the Repository

```bash
git clone https://github.com/dkv12345/CineHub.git
cd CineHub
```

#### Step 2: Install Workspace Dependencies

Execute installation from the monorepo root. This automatically resolves symlinks across internal workspace packages and generates the Prisma Client bindings:

```bash
npm install
```

#### Step 3: Initialize Environment Variables

Generate the local configuration file from the template:

```bash
cp .env.example .env
```

Ensure database credentials match your target infrastructure. Default connection string:

```env
DATABASE_URL=mysql://root:cinehub_root@localhost:3306/cinehub
REDIS_URL=redis://localhost:6379
MONGODB_URI=mongodb://cinehub:cinehub_pw@localhost:27017/cinehub?authSource=admin
```

#### Step 4: Provision Containerized Infrastructure

Launch the database, caching, and document storage containers in detached mode:

```bash
npm run infra:up
```

Verify container operational health:

```bash
docker compose ps
```

#### Step 5: Execute Database Migrations and Seed Master Data

Apply relational schema migrations and populate baseline catalogs (cinemas, rooms, pricing rules, concessions, seat layouts, and movies):

```bash
npm run db:migrate
npm run db:seed
```

#### Step 6: Start Full-Stack Development Environment

Launch both the Core API service and the Client Frontend application concurrently:

```bash
npm run dev
```

- Client application: `http://localhost:5173`
- Backend health endpoint: `http://localhost:4000/api/health`

---

## 5. Operational Scripts & Command Reference

All orchestration commands are managed from the root `package.json`:

| Script Command         | Execution Context   | Description                                                            |
| :--------------------- | :------------------ | :--------------------------------------------------------------------- |
| `npm run dev`          | Monorepo Root       | Concurrently runs `@cinehub/core-api` and `@cinehub/web`               |
| `npm run dev:api`      | `services/core-api` | Launches Core API with file-watch auto-reload (`node --watch`)         |
| `npm run dev:web`      | `apps/web`          | Launches Vite development server with Hot Module Replacement           |
| `npm run sync:live`    | Root Utility        | Fetches live Galaxy Cinema sessions and syncs frontend datasets        |
| `npm run crawl:galaxy` | Aggregator Service  | Crawls Galaxy API, upserts MySQL entities, and syncs frontend client   |
| `npm run infra:up`     | Docker Engine       | Boots containerized MySQL, Redis, and MongoDB in detached mode         |
| `npm run infra:down`   | Docker Engine       | Halts all containers while preserving data volumes                     |
| `npm run db:migrate`   | `@cinehub/db`       | Executes Prisma schema migration on the target relational database     |
| `npm run db:seed`      | `@cinehub/db`       | Runs comprehensive database seeding script                             |
| `npm run db:studio`    | `@cinehub/db`       | Starts local Prisma Studio web interface on port 5555                  |
| `npm run db:validate`  | `@cinehub/db`       | Validates Prisma schema syntax and relation constraints                |
| `npm run lint`         | Monorepo Root       | Runs ESLint across all workspaces adhering to flat configuration       |
| `npm run format`       | Monorepo Root       | Formats codebase adhering to enterprise Prettier specifications        |
| `npm test`             | Monorepo Root       | Executes unit and integration test suites via Vitest across workspaces |

---

## 6. Data Tier Management & Migration Workflows

Relational data modeling is centralized within the `@cinehub/db` package.

### 6.1. Schema Modification Procedure

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

### 6.2. Master Data Ingestion & Seeding

The database seeder (`packages/db/prisma/seed.js`) provides an idempotent ingestion routine covering:

- Seat types: `STANDARD`, `VIP`, `SWEETBOX` with respective dimension and capacity metrics.
- Ticket tier matrices: Adult, Student, Child, Member.
- Cinema chains: Master entities for Galaxy Cinema, CGV, Lotte Cinema, and BHD Star.
- Full provincial administrative taxonomy across 12 Vietnamese municipal regions.
- Auditorium layout geometry, seat map matrix generation, and dynamic concession pricing.

---

## 7. Concurrency Control & Seat Lease Protocol

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

## 8. Data Ingestion Pipeline (Crawler Architecture)

The data aggregator (`services/aggregator`) handles automated ingestion from external cinema provider APIs.

### 8.1. Anti-Blocking & Security Handshake

External cinema APIs (specifically Galaxy Cinema) implement web application firewall rules requiring specific session tokens:

- **Handshake Phase**: Executes an initial manual redirect handshake with `/api/v2/mobile/cinemas` using an enterprise client identifier (`clientid: 3da4eba4-94dd-4e74-bc25-38e89a01fe07`) and unified browser User-Agent to acquire a signed `muid_mly` session cookie.
- **Data Pull Phase**: Dispatches requests to `/api/v2/mobile/sessions2` with the active session cookie, retrieving 3,500+ active sessions across 31 complexes nationwide.

### 8.2. Resilient Upsert Architecture

- **Missing Entity Auto-Resolution**: When an incoming session references an unseeded province or municipality (e.g., Ben Tre, Can Tho), the upsert pipeline automatically generates the corresponding `Province` record on-the-fly rather than aborting the pipeline.
- **Decoupled MongoDB Archiving**: Raw payload storage into MongoDB is wrapped with a 2-second timeout and graceful degradation; if MongoDB is unavailable, relational MySQL catalog ingestion continues uninterrupted.

---

## 9. AI Assistant & Recommendation Engine Architecture

CineHub incorporates an AI orchestration module (`services/core-api/src/modules/chatbot`) delivering conversational support and personalized recommendations.

### 9.1. Natural Language Processing Pipeline

1. **Normalization & Tokenization**: Incoming queries in Vietnamese undergo diacritic-sensitive and diacritic-insensitive normalization, punctuation stripping, and tokenization.
2. **Intent Classification**: Evaluates user queries across 8 distinct intent categories (`BOOKING_GUIDE`, `SHOWTIMES_QUERY`, `CINEMA_LOCATIONS`, `TICKET_PRICING`, `CONCESSIONS_INFO`, `RECOMMENDATIONS`, `GENERAL_CINEMA_FAQ`, `FALLBACK`).
3. **Entity Extraction**: Recognizes cinema names, movie titles, target dates (`hom nay`, `ngay mai`, specific weekdays), and format qualifiers (`2D`, `3D`, `IMAX`).

### 9.2. Hybrid Retrieval Mechanism

- **Vector Search**: Computes cosine similarity scores between user preference vectors and normalized movie synopsis embeddings.
- **Deterministic Semantic Fallback**: Operates locally without external API latency when common inquiries (pricing rules, cinema addresses, operating hours) are detected.
- **LLM Synthesis**: When complex inquiries or open-ended advice are requested, the engine structures context-augmented prompts and queries Google Gemini for natural, helpful responses.

---

## 10. Engineering Standards & Git Governance

The engineering organization strictly adheres to the Feature Branch Workflow. **Direct commits or pushes to the `main` branch are strictly prohibited.**

> Detailed operational runbook available at: [docs/GIT_WORKFLOW.md](docs/GIT_WORKFLOW.md)

### 10.1. Commit Standards (Conventional Commits)

All commit messages are validated via Husky and Commitlint:

- `feat(scope): message`: New user-facing or platform functionality
- `fix(scope): message`: Bug fix or defect remediation
- `refactor(scope): message`: Code improvement without behavioral change
- `docs(scope): message`: Documentation addition or modification
- `chore(scope): message`: Dependency updates, tooling, or environment configuration
- `test(scope): message`: Unit, integration, or end-to-end test suite adjustments

_Rule: Subject lines must remain lowercase and must not terminate with a period._

### 10.2. Standard Five-Step Task Lifecycle

1. **Synchronize Main**: Always start from the latest remote state:
   ```bash
   git checkout main && git pull origin main
   ```
2. **Create Topic Branch**:
   ```bash
   git checkout -b <type>/<task-slug>
   ```
3. **Develop & Commit**: Stage and commit cohesive logical units:
   ```bash
   git add . && git commit -m "feat(module): explicit description"
   ```
4. **Rebase Against Remote Main (Zero Conflict Guarantee)**:
   ```bash
   git fetch origin && git rebase origin/main
   ```
5. **Publish & Open Pull Request**:
   ```bash
   git push -u origin <type>/<task-slug>
   ```
6. **Post-Merge Cleanup**:
   ```bash
   git checkout main && git pull origin main && git branch -d <type>/<task-slug>
   ```

---

## 11. Troubleshooting & Operational Runbook

### 11.1. Client UI Displays Outdated Showtimes

- **Root Cause**: Client fallback dataset contains static show dates from previous testing windows.
- **Remediation**: Execute direct live synchronization to ingest today's current showtimes from Galaxy Cinema:
  ```bash
  npm run sync:live
  ```

### 11.2. Missing Environment File

- **Symptom**: `Environment variable not found: DATABASE_URL`.
- **Remediation**: Copy the environment specification template:
  ```bash
  cp .env.example .env
  ```

### 11.3. Port 3306 Conflict (`EADDRINUSE`)

- **Symptom**: Local MySQL service conflicts with Docker container port 3306.
- **Remediation**:
  - Option 1 (Docker remapping): In `docker-compose.yml`, change ports to `"3307:3306"` and update `DATABASE_URL` in `.env` to `localhost:3307`.
  - Option 2 (Native service termination): Stop the native daemon via `brew services stop mysql` (macOS) or `sudo systemctl stop mysql` (Linux).

### 11.4. Prisma Client Out of Sync

- **Symptom**: Error indicating `@prisma/client did not initialize yet` or missing generated types.
- **Remediation**:
  ```bash
  npm run generate -w @cinehub/db
  ```

### 11.5. Git Hooks Execution Permission Failure

- **Symptom**: Permission denied when executing `.husky/pre-commit` or `.husky/commit-msg`.
- **Remediation**:
  ```bash
  chmod +x .husky/*
  ```

---

_CineHub Enterprise Architecture - Internal Technical Documentation._
