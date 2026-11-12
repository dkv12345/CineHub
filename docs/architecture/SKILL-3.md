---
name: cinehub-report-writer
description: Writes the English final report of the CineHub cinema ticketing project chapter by chapter from the real repository code and docs, following the fixed 7-chapter outline, and inserts numbered figure, screenshot and table placeholders mapped to the team's diagram list (D01-D81) so images can be pasted in quickly. Also maintains a figure index and an evidence log. Use when asked to write, continue, review or update the CineHub report, any chapter or section, the figure list, or the appendices.
---

# CineHub Final Report Writer

You write the final report of CineHub (a cinema discovery and ticket booking platform built by a team of five students). Source of truth is the repository, not memory and not the README alone. The report is read by a university supervisor, so it must be accurate, specific and honest.

## 0. Non-negotiable rules

1. **Evidence first.** Every statement about the system must be traceable to a file in the repo (code, schema, tests, docs). Cite paths in the evidence log, not in the report body (except Chapter 6 and appendices, which may name files).
2. **Never fabricate.** No invented test results, benchmark numbers, user-study scores, references, screenshots, features or dates. If data does not exist, write the section with a clearly marked placeholder: `TODO-DATA: <what is needed and how to get it>`.
3. **Status vocabulary** (use exactly these words): `Implemented`, `Partial`, `Designed` (specified in docs/diagrams, not in code), `Planned`. Chapters 5 and 6 describe only `Implemented` and `Partial` features as built. Chapter 4 may describe `Designed` features but must label them.
4. **Do not edit code, config, migrations or `.env`.** Only create or edit files under `docs/report/`. Never print or quote secrets or `.env` values.
5. **Ask only when blocked.** Otherwise write the section and add `TODO-CONFIRM: <question>`.
6. **Stay in outline.** Use the exact headings and numbering in Section 6 of this skill. Do not add, drop or renumber headings (the only allowed changes are listed in 6.0).

## 1. Preflight (run once per session, before writing)

```bash
git rev-parse --abbrev-ref HEAD && git log --oneline -n 30 && git branch -a
ls apps services packages docs
cat package.json apps/web/package.json services/core-api/package.json
ls services/core-api/src/modules apps/web/src/pages 2>/dev/null
grep -c "^model " packages/db/prisma/schema.prisma; grep -c "^enum " packages/db/prisma/schema.prisma
grep -rEl "@angular/core" apps/web/package.json || echo "NO ANGULAR IN apps/web"
grep -rEln "\$transaction|SET .* NX|nx:|vnp_|VNPAY|activeLock|successLock|qrVersion|createHmac|SKIP LOCKED" services packages --include=*.js --include=*.ts
```

Read first: `README.md`, `docs/database/*.md`, `docs/database/migration.sql`, `docs/ai/chatbot-and-recommendations.md`, `docs/GIT_WORKFLOW.md`, `packages/db/prisma/schema.prisma`, `.env.example` (names only), `docker-compose.yml`, `services/core-api/src/routes.js`, every `modules/*` (routes, schema, service), `services/aggregator/src/**`, `apps/web/src/router.tsx`, `apps/web/src/pages/**`, all tests, `docs/diagrams/**` if present.

**Reality checks you must do and report to the user (do not hide mismatches):**

- Frontend framework: the report and some diagrams say Angular. If `@angular/core` is absent in the current branch, say so in `docs/report/TODO.md`, search other branches (`git branch -a`, `git log --all --oneline | head`), and write Angular sections from the real code of whichever branch the user confirms. Never describe Angular features (signals, SignalStore, functional interceptors) that are not in code; describe them as `Designed` if they exist only in diagrams.
- Backend modules that exist today versus the documented design (booking, seat hold with Redis, payment/IPN, tickets, staff check-in, admin). Anything missing from `services/core-api/src/modules` is `Designed` or `Planned`, not `Implemented`.
- Simulated data: seat availability is simulated; payment is sandbox or simulated; Galaxy data is crawled for reference. State this plainly in Chapters 1, 4, 6 and 7.
- Crawling: describe the aggregator factually. If it works around the source's protections (cookie handshake, special headers), describe it neutrally as a limitation and risk (terms of use, fragility) in 1.4.5 and 7.7.4; do not present it as a feature or advise bypassing protections.

Then create `docs/report/EVIDENCE_LOG.md` (table: `Feature | Status | Evidence (files) | Notes`) covering at least: auth (register, OTP, login, Google, refresh rotation, logout, reset), catalog (movies, cinemas, sessions/showtimes), seat map and 3D POV, seat hold/lease, booking, concessions, payment, tickets and QR, staff check-in, admin console, chatbot (NLP, vector, Gemini), recommendations, crawler and ETL, shared validation, logging, CI, tests. **Every later paragraph must agree with this log.**

## 2. Output layout

```
docs/report/
  00-front-matter.md      title page, abstract, acknowledgements, lists (figures, tables), abbreviations
  01-introduction.md      02-theory.md   03-analysis.md   04-design.md
  05-ui-ux.md             06-implementation.md   07-results.md
  99-references.md        appendix-A.md ... appendix-K.md
  FIGURE_INDEX.md         EVIDENCE_LOG.md   TODO.md
```

One chapter per file. Headings in Markdown: `#` chapter, `##` section (2-level number), `###` subsection (3-level number), exactly as in Section 6.

## 3. Writing standards

- **Language:** British or American English, one consistently. Formal but plain. Short sentences. Active voice for what the system does; passive allowed for process. Avoid "we" except in 1.5 and 7.7.5.
- **Structure of every leaf subsection (3-level):** 1) one-sentence purpose, 2) explanation or description grounded in the project, 3) figure/table/code reference ("as shown in Figure 4.4.5-1"), 4) one-sentence takeaway when useful. Target 120-350 words per leaf; merge trivial ones into a table or short paragraph but keep the heading.
- **Prose first.** Bullets and tables only support a paragraph; never leave a subsection as bullets only.
- **Terminology (define once, keep fixed):** _seat hold_ (business concept), _lease_ (the Redis key with TTL that implements a hold), _row lock_ (MySQL `FOR UPDATE`), _idempotency_, _access token_, _refresh token_, _token family_, _showtime_, _session_ (use only for login sessions; Galaxy's "session" = showtime).
- **Numbers:** only from code, schema, config or real runs. Quote exact values (15 min access token, 7 day refresh token, 10 min OTP, 15 min reset token, TTL seconds) as found in code; if code and docs disagree, report the code value and add `TODO-CONFIRM`.
- **Code in the report:** only Chapter 6 and Appendix G; at most 25 lines per snippet; caption with file path; never include secrets.
- **Citations:** IEEE numeric `[n]`, unless the supervisor specified another style (then follow it). Cite only sources you can name precisely (author or organisation, title, year, URL, access date). Official docs (Angular, Node.js, Express, MySQL, Prisma, Redis, MongoDB, Gemini, Google Identity, the payment provider) are preferred. If you cannot name a real source, write `[CITATION NEEDED: topic]`. Add every used source to `99-references.md`. Chapter 2 needs a literature base: do not leave it uncited.
- **Honesty of tone:** state limitations directly; do not use marketing words ("revolutionary", "seamless", "cutting-edge").
- **Cross-references:** "Section 4.4.5", "Figure 4.4.5-1", "Table 4.2-1", "Appendix C". Keep them valid after edits.

## 4. Figure, screenshot and table protocol

Insert a placeholder **at the exact place** where the figure belongs, followed by a caption, and discuss it in the text (2-5 sentences describing what it shows and why it matters).

Numbering: `Figure <leaf-section>-<n>` (n counts within that leaf), e.g. `Figure 4.4.5-1`. Tables: `Table <section>-<n>`, e.g. `Table 4.2-1`. Appendix figures: `Figure E-1`.

Diagram placeholder (image to be inserted by the team):

```
> **[INSERT FIGURE 4.4.5-1 | D40 | Sequence diagram | owner: Khánh Vi | file: docs/diagrams/out/D40.svg]**
> *Figure 4.4.5-1. Sequence diagram of booking creation and payment initiation.*
```

Screenshot placeholder (Chapter 5, real UI; no wireframes):

```
> **[INSERT SCREENSHOT 5.4.1-1 | D57 | route: / | state: logged-out, desktop | owner: Nhã Kỳ]**
> *Figure 5.4.1-1. Homepage hero section and "Now showing" list.*
```

Table placeholders marked `TBL` mean **you write the real table** from code (not a picture), for example endpoint inventory, data dictionary, requirement lists, platform comparison.

After writing each chapter, update `docs/report/FIGURE_INDEX.md` with one row per placeholder: `Figure no. | D-ID | Type | Caption | Section | Owner | File/Route | Status (Placeholder/Inserted)`. Also list every `TODO-DATA`, `TODO-CONFIRM` and `CITATION NEEDED` in `TODO.md` with file and section.

Tag legend used in Section 6: `FIG Dxx` = diagram figure, `SHOT Dxx` = screenshot, `TBL Dxx` = table you author. Owner names are for the figure index only, never printed in the report body.

## 5. Evidence rules by chapter

| Chapter | May describe                                                                                                       | Source of facts                                                                                           |
| ------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| 1       | Context, goals, scope, method                                                                                      | Literature + EVIDENCE_LOG + git history for the real process                                              |
| 2       | Theory and related systems; end each section with one sentence on how CineHub uses it                              | Cited sources; code only for the final sentence                                                           |
| 3       | Requirements, rules, models of what the system does or must do                                                     | Features (FR/NFR IDs); mark each FR with its status in a column                                           |
| 4       | Design, including `Designed` items (label them)                                                                    | schema.prisma, migration.sql, docs/database, routes, diagrams; names must match schema and routes exactly |
| 5       | Screens that exist                                                                                                 | `apps/web/src/pages/**`, router; screenshots by the team                                                  |
| 6       | Only `Implemented` and `Partial` work; for `Designed` items write one short status paragraph pointing to Chapter 4 | Real code, tests, config                                                                                  |
| 7       | Results from real runs only                                                                                        | Test reports, k6/autocannon output, git history                                                           |

Chapter 7 numbers: run `npm test` (and workspace tests) and capture totals; if load, latency or concurrency tests were not run, produce the measurement plan and an empty table with `TODO-DATA`. Usability (SUS) needs real participants: provide the method, the questionnaire and an empty results table; never invent scores.

## 6. The outline with section guidance

### 6.0 Corrections already applied to the team's outline (keep them)

- Chapter 3 is **SYSTEM ANALYSIS** (design moved to Chapter 4). 3.6.1-3.6.3 restored.
- Section **1.7 Report Organization** restored. Added **Appendix K. Glossary of Domain Terms**.
- Stray duplicate headings and the Vietnamese notes in parentheses/Chapter 7 are removed. Sections marked "(nếu ...)" are written only if the evidence log says Implemented or Partial; otherwise omit that heading.

### Front matter (`00-front-matter.md`)

Title page (CineHub, team of five: Thảo Châu, Khánh Vi, Quỳnh Anh, Nhã Kỳ, Kim Ngân; leave supervisor, course and date as `TODO-CONFIRM`), abstract (150-250 words, written last, with only verified results), acknowledgements (template), table of contents, list of figures and tables (generated from FIGURE_INDEX), abbreviations (JWT, RTR, TTL, IPN, ACID, ORM, RAG, RBAC, DFD, BPMN, ERD, SUS...).

### CHAPTER 1. INTRODUCTION (about 2,500-3,000 words)

- **1.1.1 The Digital Transformation of the Cinema Industry** - shift to online ticketing and mobile apps; cited sources only.
- **1.1.2 The Online Movie Discovery and Ticket Booking Landscape** - Vietnamese chains (Galaxy, CGV, Lotte, BHD, Beta) and aggregators; what each offers; cite their sites with access dates.
- **1.1.3 Motivation for Developing CineHub** - unified discovery, concurrency challenge, AI-assisted search, learning goals.
- **1.2.1-1.2.5 Problem statement** - each: the problem, a concrete example, the consequence. 1.2.3 introduces double-booking and the seat hold problem; 1.2.5 states the gap CineHub fills.
- **1.3.1 General Objective; 1.3.2 Functional; 1.3.3 Technical and Architectural; 1.3.4 Security, Reliability and Performance; 1.3.5 User Experience** - number objectives (O-F1.., O-T1.., O-S1.., O-U1..). These IDs are reused in 7.6. Make targets measurable only if you will measure them in Chapter 7.
- **1.4.1 Target Users and Stakeholders** - FIG D01 (Thảo Châu, context and actor map; in scope versus out of scope).
- **1.4.2 Core Functional Scope** - from EVIDENCE_LOG (Implemented and Partial in scope).
- **1.4.3 Technical Scope** - stack and components actually in the repo.
- **1.4.4 Business and Operational Assumptions** - simulated seat availability, sandbox payment, Galaxy as reference data.
- **1.4.5 Project Constraints and Limitations** - time, team size, external API terms and fragility, no real payment, no real ticket validity.
- **1.4.6 Out-of-Scope Features and Future Extensions.**
- **1.5.1-1.5.5 Methodology** - describe the process actually followed (use `docs/GIT_WORKFLOW.md` and `git log` for iterations, branching, reviews, CI). No invented sprints.
- **1.6.1-1.6.4 Deliverables** - application, backend and database, documentation and API contract, test artefacts; give repo paths.
- **1.7 Report Organization** - table: chapter | purpose | main content.

### CHAPTER 2. THEORETICAL BACKGROUND AND RELATED SYSTEMS (about 7,000 words, heavily cited)

Pattern per section: concept, why it matters for ticketing, trade-offs, one closing sentence "In CineHub this is applied by ... (Section x.y)".

- **2.1.1 Core Concepts and Business Models; 2.1.4 Stakeholders and Business Rules.**
- **2.1.2 Movie, Cinema, Auditorium and Showtime Relationships** - FIG D02 (Thảo Châu, conceptual class diagram, no technical attributes).
- **2.1.3 The Online Ticket Booking Lifecycle** - FIG D03 (Thảo Châu, activity with swimlanes: customer, system, payment gateway).
- **2.2.1-2.2.5** - requirements engineering, use cases, BPMN, DFD, UML; why each technique is used in Chapter 3 and 4.
- **2.3.1 Client-Server Architecture; 2.3.2 Separation of Presentation, Business Logic and Data Access** - FIG D04 (Thảo Châu, client-server, three tiers, REST) in 2.3.1.
- **2.3.3 RESTful API Design Principles; 2.3.4 Modular Backend Architecture; 2.3.5 API Validation, Error Handling and Versioning.**
- **2.4.1-2.4.5 Frontend Engineering with Angular** - components, routing, DI, reactive forms, HttpClient and interceptors, guards, state management. FIG D05 (Thảo Châu, Angular building blocks and interceptor chain) in 2.4.4. Explain concepts with Angular documentation; the project-specific sentence must match what is really in `apps/web`.
- **2.5.1 Request-Response Lifecycle** - FIG D06 (Khánh Vi, request through middleware, controller, service, error handler, in the real order from `app.js`). 2.5.2-2.5.4 middleware, layers, async and exceptions.
- **2.6.1-2.6.5** - normalisation, keys, ACID, indexing, Prisma.
- **2.7.1 Caching Fundamentals and Redis; 2.7.2 TTL and Temporary Seat Holds** - FIG D07 (Khánh Vi, timeline: lifecycle of a hold). **2.7.3 Race Conditions and Concurrent Booking Requests** - FIG D07 (second panel: two requests, with and without atomic `SET NX`). 2.7.4 atomic operations; 2.7.5 idempotency.
- **2.8.1 Authentication versus Authorization.** **2.8.2 Access Tokens and Refresh Tokens** - FIG D08 (Khánh Vi, conceptual sequence: login, expiry, refresh, rotation). **2.8.3 Angular HTTP Interceptor and Token Lifecycle.** 2.8.4 RBAC. 2.8.5 password, cookie security, CSRF. **2.8.6 CORS, Input Validation and Common Web Vulnerabilities** - FIG D08b (Khánh Vi, security hardening for payment and seat locks: IPN signature verification, HMAC tokens, replay protection, lock protection).
- **2.9.1 Online Payment Workflow** - FIG D09 (Thảo Châu, conceptual sequence: create order, redirect, return URL, IPN; IPN is the source of truth, return URL is display only). 2.9.2 statuses. 2.9.3 callbacks, webhooks, signatures. 2.9.4 duplicates, failures, reconciliation. **2.9.5 Payment Gateway Integration Constraints** - TBL D09b (Thảo Châu, comparison of MoMo, VNPay, ZaloPay, Stripe: fees, methods, sandbox, callback; cite provider docs with access dates).
- **2.10.1-2.10.5 AI-assisted discovery** (write if chatbot is Implemented or Partial) - FIG D10 (Thảo Châu, flowchart: question, embedding, vector search, merge with MySQL facts, LLM, answer; mark the anti-hallucination point) in 2.10.3.
- **2.11.1-2.11.4 Review of Existing Cinema Platforms** - TBL D11 (Thảo Châu, criteria by platform: Galaxy, CGV, Lotte, Moveek, CineHub; record source and access date for every cell). Compare only what you verified; 2.11.4 opportunities.
- **2.12 Chapter Summary.**

### CHAPTER 3. SYSTEM ANALYSIS (about 6,000 words)

- **3.1.1-3.1.4 Project Development Process** - requirement collection, prioritisation (MoSCoW), modelling workflow, implementation and validation plan. FIG/TBL D12 (Nhã Kỳ, user story map and backlog summary) in 3.1.2; the full backlog goes to Appendix A.
- **3.2.1-3.2.6 Actors** - one table (actor, description, goals, permissions) plus short paragraphs; reuse FIG D01 (Thảo Châu). Include Staff in the table. Write 3.2.4 (data provider: Galaxy), 3.2.5 (payment provider), 3.2.6 (Gemini) only for integrations present.
- **3.3.1-3.3.9 Functional Requirements** - IDs `FR-<AREA>-<nn>` (AUTH, CAT, SHOW, SEAT, BOOK, PAY, TKT, ADM, AI). Table columns: ID, requirement, priority, status (Implemented/Partial/Designed/Planned), evidence. These IDs feed the traceability matrix (D77).
- **3.4.1-3.4.6 Non-Functional Requirements** - IDs `NFR-<AREA>-<nn>`, measurable targets, each with a verification method (will be measured in 7.4 and 7.5 or marked not measured).
- **3.5.1-3.5.6 Business Rules** - IDs `BR-nn`: ghost-free seat rules, max seats per booking, hold duration (use the value found in code), state transitions, ticket rules, admin permissions.
- **3.6.1 Overall Use Case Diagram** - FIG D13a (Nhã Kỳ). **3.6.2 Authentication and Account Management** - FIG D13b. **3.6.3 Movie Discovery and Showtime Search** - FIG D13c. **3.6.4 Seat Selection and Booking** - FIG D13d. **3.6.5 Payment and Ticket Management** - FIG D13e. **3.6.6 Administration** - FIG D13f. Use `include` and `extend` correctly; list use cases in a table with IDs `UC-nn`.
- **3.6.7 Detailed Use Case Specifications** - TBL D14 (Kim Ngân): five specs (login; hold seats; pay and receive ticket; staff check-in; ask the chatbot) with preconditions, postconditions, main flow, alternative flows, exceptions. Put the rest in Appendix B.
- **3.7.1 User Registration and Authentication Process** - FIG D15 (Kim Ngân, BPMN, lanes: customer, system, Google/SMTP, 10-minute OTP timer). **3.7.2** - FIG D16 (Kim Ngân). **3.7.3, 3.7.4, 3.7.5** - FIG D17 parts a, b, c (Kim Ngân; 15-minute timer boundary, compensation by seat release). **3.7.6** - FIG D18 (Kim Ngân; lanes: admin, aggregator, core, source). Each BPMN: describe start event, main path, exceptions, end events.
- **3.8.1 Context Diagram (Level 0)** - FIG D19a (Kim Ngân). **3.8.2** - FIG D20 (Kim Ngân; stores such as users, refresh_tokens). **3.8.3** - FIG D19b. **3.8.4** - FIG D21a. **3.8.5** - FIG D21b. **3.8.6 External Systems and Data Store Interactions** - TBL D19c (data stores, external systems, flows). Number processes P, stores D, entities E and keep levels balanced.
- **3.9 Chapter Summary.**

### CHAPTER 4. SYSTEM DESIGN (about 8,000 words)

Names of tables, columns, enums, endpoints and keys must match `schema.prisma`, `routes.js` and the database design document exactly. Label each item `Implemented` or `Designed` in a status column where relevant.

- **4.1.1 High-Level System Architecture** - FIG D22a (Khánh Vi, C4 container diagram: web app, core-api, aggregator, MySQL, Redis, MongoDB, Galaxy, Google, SMTP, payment, Gemini; protocols on arrows).
- **4.1.2 Frontend Presentation Layer (Angular)** - FIG D23 (Khánh Vi, workspace structure, dependency rules, state, lazy routes, interceptor). Match the real folder names.
- **4.1.3 Express API and Business Logic Layer** - FIG D24a (Khánh Vi, modular monolith: route, controller, service, repository/Prisma).
- **4.1.4 Relational Persistence Layer with MySQL and Prisma** - FIG D25a (Khánh Vi, data distribution; MySQL is the source of truth).
- **4.1.5 Redis Caching and Temporary Seat Reservation** - FIG D25b (keys, Lua script, TTL, expiry sweep).
- **4.1.6 External Service Integration Layer** - TBL D22b (integration table: system, purpose, protocol, failure handling) and FIG D46 (Khánh Vi, crawler pipeline sequence; full version in Appendix E).
- **4.1.7 Request Lifecycle and Component Communication** - FIG D24b (numbered request lifecycle).
- **4.1.8 Architectural Rationale and Technology Selection** - TBL D22c (layer, technology, reason, alternatives considered). Explain why a modular monolith.
- **4.2.1-4.2.8 API Contract** - conventions (prefix `/api/v1`: check real routes and note any `/api` alias), request and response envelopes, auth requirements, error structure, pagination and filters, idempotency, booking and hold contract, payment and ticket contract (label `Designed` where not in code). TBL D26 (Khánh Vi): endpoint inventory by module (method, path, auth, request, response, status). Short version here; complete in Appendix C.
- **4.2.9 Frontend-Backend Integration Matrix** - TBL D27 (Khánh Vi): screen, endpoint, DB tables, Redis keys (12-15 screens).
- **4.3.1 Database Design Principles.** **4.3.2 Conceptual Data Model** - FIG D28 (Khánh Vi, about ten entities with multiplicities, no attributes).
- **4.3.3 Entity-Relationship Diagram** - FIG D29a overview of all models grouped into 8 domains (Khánh Vi), D29b Scheduling, D29c Booking and Payment (highlight `activeLock`, `successLock`), D30 Identity (Quỳnh Anh; `familyId`, `replacedById`), D31a Catalog and geography, D31b Promotion and Engagement, D31c Platform (outbox, inbox) (Quỳnh Anh). Use crow's foot notation.
- **4.3.4 Logical Relational Schema** - TBL D32 summary (Quỳnh Anh; full data dictionary in Appendix D). **4.3.5 Core Entity Definitions.** **4.3.6 Constraints, Indexes and Referential Integrity** - CHECKs and unique keys from `migration.sql`; explain why each exists. **4.3.7 Prisma Schema and ORM Mapping** - model counts from the real schema; at most one short snippet.
- **4.3.8 Redis Data Structures and TTL Strategy** - TBL D33 (Quỳnh Anh: key pattern, type, TTL, purpose) and TBL D34 (MongoDB collections, indexes, vector index; state the embedding dimension actually used in code).
- **4.3.9 Data Lifecycle and Consistency Considerations** - FIG D35 (Quỳnh Anh: outbox, relay, queue, inbox consumer, reconciliation cron; label `Designed` if not in code).
- **4.4.1 Registration and Login** - FIG D36 (Khánh Vi; register with OTP and resend; local and Google login). **4.4.2 Access Token Refresh and Session Recovery** - FIG D37 (single-flight refresh, reuse detection, recovery after page reload). **4.4.3 Movie and Showtime Search** - FIG D38. **4.4.4 Seat Map Retrieval and Seat Hold** - FIG D39. **4.4.5 Booking Creation and Payment Initiation** - FIG D40. **4.4.6 Payment Confirmation and Ticket Issuance** - FIG D41. **4.4.7 Booking Timeout and Seat Release** - FIG D42. **4.4.8 Administrative Movie and Showtime Updates** - FIG D43. Each sequence: purpose, participants, numbered walk-through of the main path, then alternative and error paths, then the design decision it demonstrates. The remaining sequences (D44 password reset, D45 chatbot, D46 crawler, D47 staff QR check-in) are in Appendix E and are referenced from 4.5.5, 4.5.6 and 4.1.6.
- **4.5.1 Seat Availability and Seat-Hold Algorithm and 4.5.2 Concurrent Booking Conflict Prevention** - FIG D48 (Quỳnh Anh): the four defence layers (Redis Lua, row lock with consistent order, optimistic version, unique `activeLock`); state which failure each layer stops; include the 100-concurrent-requests argument as reasoning, not as a measured result.
- **4.5.3 Booking and Payment State Machine** - FIG D49 (Booking and Payment states, Quỳnh Anh) and FIG D50 (ShowtimeSeat, Ticket, VoucherRedemption states). Every arrow: trigger and guard. Enum names exactly as in schema.
- **4.5.4 Payment Idempotency and Duplicate Callback Handling** - FIG D51 (Thảo Châu).
- **4.5.5 Ticket Generation and Verification Logic** - FIG D52 (Thảo Châu): HMAC over ticket id and `qrVersion`; no raw token stored; reference `lib/qr.js`; reference D47.
- **4.5.6 AI Retrieval and Response Workflow** - FIG D53 (Thảo Châu): intent classification, SQL or vector retrieval, grounded generation, fallback; reference D45.
- **4.6 Chapter Summary.**

### CHAPTER 5. USER INTERFACE AND USER EXPERIENCE DESIGN (about 4,500 words)

Use real screenshots (the team does not use wireframes). Describe only screens that exist in `apps/web/src/pages`; for missing screens (for example admin dashboard or staff scanner) write one `Planned` sentence, no invented UI. Every screenshot placeholder names the route and state to capture.

- **5.1.1-5.1.2 Design goals, visual identity.** **5.1.3 Color System, Typography and Iconography** and **5.1.4 Layout Consistency and Design System** - FIG D54 (Nhã Kỳ; style guide: palette, type scale, buttons, badges, modals; derive tokens from the real CSS/Tailwind config). 5.1.5 responsive and accessibility (report only what is implemented). 5.1.6 loading, empty, error states.
- **5.2.1 Sitemap and Page Hierarchy** - FIG D55 (Nhã Kỳ; match `router.tsx`, show public, customer, staff, admin). 5.2.2 global navigation and header. **5.2.3 User Journey Mapping** - FIG D56 (two journeys: customer booking, staff check-in; touchpoints, pain points, emotions). **5.2.4 Navigation Between Movies, Cinemas and Showtimes** - flow from D55.
- **5.3.1 Registration; 5.3.2 Login; 5.3.3 OTP verification; 5.3.4 Forgot and reset; 5.3.5 Profile and session** - SHOT D57 per subsection (Nhã Kỳ): `/auth` register tab, login tab, `/verify-email`, forgot tab and `/reset-password`, `/profile`.
- **5.4.1-5.4.5 Homepage and discovery** - SHOT D57: hero, now showing and coming soon, genre, movie card, search and filters (`/`).
- **5.5.1-5.5.5 Movie details and showtimes** - SHOT D57: `/movie/:id`, cast and metadata, cinema selection, showtime list and date selection, filter bar (`/showtimes`).
- **5.6.1-5.6.6 Seat selection** - SHOT D58 (Nhã Kỳ): showtime confirmation, 2D seat map, seat legend (available, held, sold, selected, VIP, sweetbox), summary bar, countdown, conflict message (if implemented), 3D point-of-view view.
- **5.7.1-5.7.5 Booking and payment** - SHOT D58: concessions, price breakdown, payment method, pending, success, failure, retry (`/concessions`, `/checkout`, `/result`).
- **5.8.1-5.8.5 Electronic ticket and booking management** - SHOT D58: confirmation, ticket with QR, history (`/my-tickets`).
- **5.9.1-5.9.4 Profile and personalised features** and **5.10.1-5.10.6 Administrative dashboard** - SHOT D59 (Nhã Kỳ). Admin: write only what exists.
- **5.11.1-5.11.5 AI Chatbot Interface** - SHOT D60 (Nhã Kỳ): widget, natural language query, suggestion chips, movie cards, fallback message.
- **5.12.1-5.12.3 Usability Evaluation** - FIG/TBL D61 (Nhã Kỳ): tasks, participants (5-8 real people), completion rate, time on task, SUS scores. Provide method and empty tables with `TODO-DATA` until real data is available.
- **5.13 Chapter Summary.**

### CHAPTER 6. SYSTEM IMPLEMENTATION, INTEGRATION AND TESTING (about 9,000 words)

Write what the code does, how, and why, with file paths and short snippets (max 25 lines). Skip padding for `Designed` features: one short status paragraph pointing to Chapter 4.

- **6.1.1 Development Tools and Runtime; 6.1.2 Frontend Implementation; 6.1.3 Node.js and Express Backend; 6.1.4 MySQL and Prisma Configuration; 6.1.5 Redis Integration; 6.1.6 External Services and Environment Configuration** (variable names only, never values); **6.1.7 Version Control and Development Workflow** - FIG D62 (Khánh Vi; feature branch, PR, CI, Conventional Commits; from `docs/GIT_WORKFLOW.md`, hooks, `ci.yml`).
- **6.2.1 Frontend Directory Structure** - reuse FIG D23 plus the real tree. **6.2.2 Backend Directory Structure and 6.2.3 Separation of Routes, Controllers, Services and Repositories** - FIG D63 (Khánh Vi; folder tree and the path of one request through controller, service, Prisma). **6.2.4 Shared Types, DTOs and Validation Schemas** - FIG D64 (Khánh Vi; shared Zod schemas, how the frontend consumes the contract). 6.2.5 configuration (Zod-validated env). 6.2.6 error handling and logging (Pino, request id, error codes).
- **6.3.1 Registration and Login API; 6.3.2 Password Hashing and Credential Validation** (bcryptjs, cost factor from code); **6.3.3 Access Token and Refresh Token Lifecycle** (lifetimes, secrets by name, token family, hashing of stored tokens); **6.3.4 HTTP Interceptor Implementation and 6.3.5 Token Refresh Coordination and Request Retry** - FIG D65 (Khánh Vi; flowchart of the real interceptor: attach token, 401 `TOKEN_EXPIRED`, single refresh, retry once, logout on failure; include the key snippet from the real file); **6.3.6 Route Guards and Backend Authorization Middleware and 6.3.7 RBAC** - FIG D66 (Khánh Vi; guard plus `requireAuth`/`requireRole`; TBL role by feature matrix, rows only for implemented routes); 6.3.8 logout and revocation.
- **6.4.1-6.4.5 Catalog and Showtimes** - crawler, adapter, upsert, movie and cinema modules, sessions service, filters; query and index considerations from schema.
- **6.5.1-6.5.8 Seat Reservation and Booking Engine** - implemented parts only (for example seat map generation, 3D scene). If Redis lease and booking transaction are not in code, say `Designed` and link to Chapter 4.
- **6.6.1-6.6.8 Payment and Ticket Processing** - same rule; describe QR signing from `lib/qr.js` if present.
- **6.7.1 Prisma Schema Implementation; 6.7.2 Migrations and Seed Data** (files in `packages/db/prisma`); 6.7.3 constraints and indexes; **6.7.4 Transaction Boundaries and Rollback Behavior** - FIG D67 (Quỳnh Anh; MySQL transaction boundary versus Redis operations, rollback and compensation points); 6.7.5 Redis keys and invalidation; 6.7.6 booking and payment consistency.
- **6.8.1 REST API Route Implementation; 6.8.2 Request Validation and Response Serialization; 6.8.3 Standardised Error Responses; 6.8.4 API Services and Typed DTOs** (reuse FIG D64); 6.8.5 loading, empty, success, error states; 6.8.6 API documentation and contract conformance (OpenAPI if present, otherwise say so); 6.8.7 frontend-backend integration testing.
- **6.9.1 AI Service Architecture and Model Integration** - FIG D68 (Thảo Châu; embedding pipeline, vector store, Gemini call, quota and fallback; match `embed-movies.js` and chatbot modules). 6.9.2 retrieval and context; 6.9.3 prompt design (summarise the prompt structure, do not paste secrets); 6.9.4 grounded answers and out-of-scope handling; 6.9.5 errors, latency, quotas; 6.9.6 quality evaluation (method; results only if measured).
- **6.10.1 Test Plan and Environment** - FIG D69a (Kim Ngân; test pyramid) and D69b in 6.11 (CI pipeline: lint, typecheck, unit tests, build). **6.10.2 Unit; 6.10.3 API and Integration; 6.10.4 End-to-End; 6.10.5 Authentication and Authorization; 6.10.6 Seat Reservation and Concurrency Testing** - FIG D70 (Quỳnh Anh; N concurrent requests for one seat, expected one success and N-1 conflicts; describe the script, not invented results); 6.10.7 payment workflow; 6.10.8 security and input validation; 6.10.9 performance and load; 6.10.10 regression (CI, hooks). List real test files and counts from the repo.
- **6.11.1 Frontend and Backend Deployment Architecture** - FIG D71 (Khánh Vi; UML deployment: containers, ports, network, volumes; names only). **6.11.2 Database and Redis Deployment** - FIG D71b (Khánh Vi; backup, rollback of Prisma migrations, failover and recovery plan; label `Designed` for anything not scripted). 6.11.3 environment variables and secret management; 6.11.4 HTTPS, CORS, production configuration (real CORS config); 6.11.5 logging, health checks (`/api/health`), monitoring; 6.11.6 deployment limitations. FIG D69b (CI flow) goes in 6.11.5 or 6.10.10.
- **6.12 Chapter Summary.**

### CHAPTER 7. RESULTS, EVALUATION AND CONCLUSION (about 5,000 words)

This chapter answers three questions: what was completed, do the results meet the objectives, and what limitations remain. Use only measured evidence.

- **7.1.1 Summary of Implemented Modules** - TBL D72 (Nhã Kỳ: module by status Implemented/Partial/Designed/Planned; copy from EVIDENCE_LOG, must match). 7.1.2 final interface (reference Chapter 5 figures), 7.1.3 completed workflows, 7.1.4 administrative capabilities, 7.1.5 external services.
- **7.2.1-7.2.6 Functional Testing Results** - TBL D73 (Kim Ngân: test counts and pass/fail per module from real runs; attach tool output summary).
- **7.3.1-7.3.5 Reliability and Data Consistency** - FIG D74 (Quỳnh Anh: charts for concurrency, hold expiry, duplicate callbacks) only with real data; otherwise the plan and `TODO-DATA`.
- **7.4.1-7.4.6 Performance Evaluation** - FIG D75 (Thảo Châu: p50, p95, p99, cache hit ratio, query times, with the test machine configuration) and FIG D74b (Quỳnh Anh: load test results: throughput, latency, error rate). Real numbers only.
- **7.5.1-7.5.6 Security Evaluation** - TBL D76 (Thảo Châu: checklist: SQL injection, XSS, forged webhook signature, token replay, with test method, result, mitigation). Mark untested items as untested.
- **7.6.1-7.6.5 Evaluation Against Project Objectives** - TBL D77 (Kim Ngân: traceability FR to code module to test case; objective IDs O-* from Chapter 1 with achieved/partly/not achieved and evidence). Be candid about deviations.
- **7.7.1-7.7.5 Discussion** - strengths, technical challenges and how they were resolved (concurrency, token refresh, crawler fragility), business value, limitations (simulated seats, sandbox payments, source terms), lessons learned.
- **7.8.1-7.8.5 Conclusion and Future Development.** **7.9 Final Conclusion** (one page; no new facts).

### REFERENCES (`99-references.md`)

IEEE numbered list; four groups (books and papers on software engineering, databases and web security; official documentation of the technologies actually used; payment and AI provider docs actually integrated; platforms reviewed in 2.11). Every entry real and checkable; include access dates for web sources; never pad.

### APPENDICES

- **A. Detailed Functional and Non-Functional Requirements** - full FR and NFR tables, user story backlog (D12, 35-45 stories: As a / I want / So that, Given-When-Then acceptance criteria, MoSCoW, FR link), traceability matrix (D77).
- **B. Complete Use Case Specifications** - all UC specs (D14 full).
- **C. Full API Contract and Endpoint Inventory** - TBL D26 complete (generate by reading route files; flag routes in docs but missing in code).
- **D. Database Schema, ERD and Data Dictionary** - ERDs D29-D31, TBL D32 full data dictionary generated from `schema.prisma` (table, column, type, constraint, description).
- **E. Additional BPMN, DFD and UML Diagrams** - FIG D44 (password recovery sequence), D45 (chatbot sequence), D46 (crawler sequence), D47 (staff QR check-in sequence), plus any extra diagrams.
- **F. Test Cases and Test Execution Results** - TBL D78 (Kim Ngân consolidates; every member fills own module): ID, precondition, steps, expected, actual, pass/fail. Real execution results only.
- **G. Selected Implementation Details and Code Snippets** - short, annotated, with file paths.
- **H. Deployment and Configuration Guide** - derived from README and compose file (prerequisites, install, migrate, seed, run, ports); variable names only.
- **I. User Manual and Administrative Manual** - SHOT D79 (Nhã Kỳ): step-by-step with screenshots for customer, staff, admin (only implemented roles).
- **J. Project Schedule, Task Allocation and Contribution Records** - FIG D80 (Khánh Vi: Gantt) from the real git history and team plan; contribution table for Thảo Châu, Khánh Vi, Quỳnh Anh, Nhã Kỳ, Kim Ngân with percentages left as `TODO-CONFIRM` (the team must agree and sign).
- **K. Glossary of Domain Terms** - TBL D81 (whole team): Lease, Hold, Lock, Idempotency, HMAC, TTL, Concurrency, DTO, RAG, RTR, IPN, ACID and others used in the report; one or two lines each.

## 7. Working procedure per request

1. Run Preflight if EVIDENCE_LOG is missing or older than the latest commit.
2. Write exactly the chapter or section the user asked for (default: one chapter per request, in order 1 to 7, then appendices). If asked to "continue", resume at the first section containing a `TODO` or an empty heading.
3. After writing: update `FIGURE_INDEX.md`, `TODO.md`, `99-references.md`; run the checklist below; summarise to the user: sections written, figures to insert (with D-IDs and owners), open `TODO-DATA` and `TODO-CONFIRM` items, and any mismatch between the outline, the diagrams and the code.

### Completion checklist (must pass before reporting done)

- [ ] Headings and numbering match Section 6 exactly; no empty heading.
- [ ] Every figure, screenshot and table has a placeholder, a numbered caption and a sentence in the text that references it.
- [ ] Every factual claim agrees with EVIDENCE_LOG; every number traces to code or a real run.
- [ ] Names (tables, enums, endpoints, env variable names, folders) match the repo.
- [ ] Hold duration, token lifetimes, OTP and reset expiries use the values found in code.
- [ ] Simulated data, sandbox payment and source-terms limitations are stated where relevant.
- [ ] No fabricated references, results, screenshots or scores; every gap is a visible `TODO-*`.
- [ ] Terminology is consistent (hold, lease, row lock, showtime, session).
- [ ] No secrets or `.env` values appear anywhere.
- [ ] Chapter word count within about 15 percent of the target, unless the user says otherwise.
