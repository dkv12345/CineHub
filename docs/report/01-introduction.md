# CHAPTER 1. INTRODUCTION

## 1.1. Project Background and Motivation

### 1.1.1. The Digital Transformation of the Cinema Industry

Cinema operators have moved a large part of their sales and customer contact from the box office to websites, mobile applications and electronic wallets. For a customer, buying a ticket now means choosing a film, a cinema, a showtime and specific seats on a screen, then paying within minutes. For an operator, the same flow replaces queues with a software system that must stay consistent when many people act at the same time. [CITATION NEEDED: peer-reviewed or industry source on the adoption of online cinema ticketing, preferably specific to Vietnam]

This shift changes what a ticketing system must guarantee. A seat is a scarce, time-bound resource. Two customers must never hold the same seat for the same showtime, and a payment must never be lost or counted twice. These guarantees are well understood in database theory, but they are easy to break in a web application that is built mainly around browsing. CineHub takes this transformation as its starting point and studies it through a working web platform.

### 1.1.2. The Online Movie Discovery and Ticket Booking Landscape

In Vietnam, ticket sales are led by cinema chains such as Galaxy, CGV, Lotte, BHD and Beta. Each chain publishes its own schedule and sells tickets for its own cinemas through its own website or application–. A customer who wants to compare screenings across chains has to visit several sites, each with its own layout, filters and vocabulary.

Aggregator sites partly fill this gap. Moveek, for example, lists showtimes from several chains in one place. Such services help with discovery, but they depend on data that the chains control, and a customer is usually sent to the operator for the final purchase. The table of platforms reviewed in Section 2.11 compares these approaches in detail. For this chapter, one point is enough: discovery is spread across many sites, while the booking transaction belongs to each operator.

CineHub does not operate cinemas and does not sell real tickets. It uses showtime and movie data crawled from one public source, Galaxy Cinema, as reference data to make the catalogue realistic. Section 1.4.4 states the consequences of this choice.

### 1.1.3. Motivation for Developing CineHub

The team had three motivations. The first was a single place for discovery, where a user can move from a film to its cinemas and showtimes without changing site. The second was a technical challenge: seat booking is a concurrency problem, and a student project can study it with real tools such as MySQL transactions and Redis expiry. The third was to test whether an assistant that answers questions in natural Vietnamese ("a film for a date night tonight") can help users decide.

A fourth motivation concerns learning. The project gave five students a realistic reason to practise requirements analysis, modelling, API design, Angular, Node.js, three data stores and a delivery pipeline in one codebase.

## 1.2. Problem Statement

### 1.2.1. Fragmented Movie Information and Showtime Discovery

Movie information and showtimes are split across the sites of individual chains. A customer who wants "an action film after 19:00 tomorrow, near the city centre" must open several sites and compare the results by hand. The consequence is wasted time and missed options, because few customers check every chain. CineHub addresses this by storing movies, cinemas and showtimes in one relational catalogue and exposing them through one interface.

### 1.2.2. Inefficient Navigation Between Movies, Cinemas and Showtimes

Booking sites often force a fixed order: choose a cinema first, then a film, then a time. A customer who starts from a film and wants to see where and when it plays may need many steps. The consequence is abandoned sessions. CineHub treats the movie, the cinema and the showtime as three entry points that link to each other.

### 1.2.3. Seat Availability and Booking Consistency Challenges

The central technical problem is double booking. Suppose two customers open the seat map of the same showtime and both select seat F7 within the same second. If the system checks availability and then writes the booking in two separate steps, both checks can pass, and both customers believe they own the seat. The consequence is a refund, a support case and a loss of trust.

The usual remedy is the seat hold: when a customer selects seats, the system reserves them for a short period, here 15 minutes, while the customer pays. A hold raises its own problems. It must be created atomically, it must expire when the customer leaves, and it must be turned into a permanent booking only if the customer pays in time. In this report, _seat hold_ denotes the business concept and _lease_ denotes the Redis key with a time-to-live (TTL) that implements it. A _row lock_ denotes a MySQL `FOR UPDATE` lock taken during the final booking transaction.

### 1.2.4. Trust, Transaction Transparency and User Experience

Customers trust a ticketing system when it shows what it is doing. They need to see a clear price breakdown, a visible countdown for their hold, a clear "pending", "success" or "failed" payment state, and a ticket they can show at the door. A common failure is a payment that succeeds at the gateway while the browser tab is closed, so the user never sees a result. The consequence is a charged customer without a ticket. This is why the report separates the browser return from the server-side payment notification (IPN, Instant Payment Notification), and treats only the server-side message as authoritative for confirmation.

### 1.2.5. Limitations of Existing Approaches and the Need for Integration

Chain applications are complete for their own cinemas but do not compare across chains. Aggregators compare across chains but do not own the booking transaction. Neither offers a conversational way to search by mood, audience or time of day. CineHub aims to fill this gap with one catalogue, a booking flow designed around seat holds and explicit payment states, and an assistant grounded in the catalogue data. The project is a study of integration. It is not a replacement for an operator's production system.

## 1.3. Project Objectives

### 1.3.1. General Objective

The general objective is to design, build and evaluate CineHub, a cinema discovery and ticket booking platform that unifies movie, cinema and showtime information and specifies a booking flow that prevents double booking, using an Angular front end and a Node.js and Express modular monolith. Each specific objective below carries an identifier. Chapter 7 reuses these identifiers (Section 7.6) to judge what was achieved.

### 1.3.2. Functional Objectives

The functional objectives are:

- O-F1: allow users to browse movies, cinemas, showtimes and concessions from one catalogue, with filters;
- O-F2: allow users to register with email verification, log in with a password or a Google account, and recover a forgotten password;
- O-F3: allow a user to select up to six seats on a seat map (2D and 3D point-of-view), add concessions, see a price breakdown, pay, and receive an electronic ticket;
- O-F4: provide a Vietnamese-language assistant and content-based recommendations that use catalogue data;
- O-F5: specify, at design level, administrative management and staff ticket verification.

O-F5 is limited to design because the schedule did not allow its implementation. Sections 1.4.2 and 1.4.6 show how the scope reflects this.

### 1.3.3. Technical and Architectural Objectives

The technical objectives are:

- O-T1: build the front end with Angular and TypeScript as domain-sliced libraries in an Nx workspace, with enforced dependency rules;
- O-T2: build the back end as a modular monolith in Node.js, Express and JavaScript, with routes, controllers, services and repositories kept separate;
- O-T3: use polyglot persistence in which MySQL is the source of truth for durable records, Redis holds temporary state, and MongoDB holds documents such as chat sessions and embeddings;
- O-T4: keep the API contract in one place (Zod schemas that generate an OpenAPI document and a typed Angular client);
- O-T5: make development reproducible through Docker Compose, a Git workflow and a continuous integration pipeline.

### 1.3.4. Security, Reliability and Performance Objectives

The security and reliability objectives are:

- O-S1: protect sessions with short-lived access tokens and rotating refresh tokens that are stored only as hashes;
- O-S2: prevent double booking through layered defences (a Redis lease, MySQL row locks, optimistic versioning and a unique constraint), and demonstrate it with a concurrency test;
- O-S3: confirm payments only from an authenticated server-to-server notification, and process duplicate notifications idempotently;
- O-S4: measure response time and seat-booking behaviour under concurrent requests.

O-S4 sets no numeric target here. A target is only meaningful if it is measured, so the measurement plan and any results appear in Sections 6.10 and 7.4.

### 1.3.5. User Experience Objectives

The user experience objectives are:

- O-U1: provide a consistent, responsive interface that shows loading, empty and error states;
- O-U2: let users preview the view from a chosen seat in 3D before booking;
- O-U3: present the interface in Vietnamese, the language of the target users;
- O-U4: evaluate usability with real participants, using task completion and the System Usability Scale (SUS).

Chapter 5 describes the interface and Section 5.12 reports the usability evaluation only if real data is collected.

## 1.4. Project Scope and Limitations

### 1.4.1. Target Users and Stakeholders

CineHub serves four kinds of actors: guests, registered customers, cinema staff and administrators. It also depends on external systems: a source of cinema data (Galaxy), Google for sign-in, an SMTP service for email, payment gateways, and the Gemini API for the assistant. Customers and guests are the primary users. Staff and administrators are in the design but not in the running system. Figure 1.4.1-1 shows these actors and separates what is in scope from what is out of scope.

> **[INSERT FIGURE 1.4.1-1 | D01 | Context and actor map | owner: Thảo Châu | file: Chapter 1-2.drawio]**
> _Figure 1.4.1-1. Context and actor map of CineHub, distinguishing in-scope features (sandbox booking, simulated seat availability) from out-of-scope features (real ticket sales, real payment)._

The figure marks guests and customers as users of implemented features. It marks staff and administrators as actors whose functions remain at design level. It also shows that every external system is an integration boundary: the system trusts none of them without validation. Section 3.2 reuses the same figure to describe the actors in more detail.

### 1.4.2. Core Functional Scope

The core scope is every feature that the repository shows as `Implemented` or `Partial`. The status of each feature, taken from the project's evidence log, is summarised in Table 1.4.2-1. Four statuses are used throughout the report: _Implemented_ (present and wired into the application), _Partial_ (some parts exist, but the complete workflow does not), _Designed_ (specified in documents and diagrams, with no working code) and _Planned_ (intended future work).

| Area                                                                                                  | Status      | Remark                                                                                       |
| ----------------------------------------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------- |
| Account management: registration with OTP, login, Google login, token refresh, logout, password reset | Implemented | Back end and front end are connected.                                                        |
| Movie, cinema, showtime and concession catalogue                                                      | Implemented | Data is crawled from Galaxy and seeded.                                                      |
| Seat map, 2D and 3D point-of-view                                                                     | Implemented | Seat availability is simulated, not real.                                                    |
| Seat hold with countdown and six-seat limit                                                           | Partial     | The countdown and limit run in the browser; there is no server-side hold.                    |
| Server-side booking and Redis seat lease                                                              | Designed    | A module skeleton and a specification exist; the endpoints respond "not implemented".        |
| Checkout and payment initiation (MoMo, ZaloPay, VNPay)                                                | Partial     | Sandbox-oriented initiation exists; server-side confirmation and persistence are incomplete. |
| Electronic ticket and ticket history                                                                  | Partial     | Tickets are produced in the browser; server-side issuance is designed.                       |
| Chatbot and recommendations                                                                           | Implemented | Gemini is optional; a deterministic fallback exists.                                         |
| Catalogue crawler                                                                                     | Implemented | Reads one public source.                                                                     |
| Administration and staff check-in                                                                     | Planned     | Described by design diagrams only.                                                           |

_Table 1.4.2-1. Functional scope and implementation status at the time of writing._

The table shows the main finding of the audit. Discovery, accounts, the assistant and the interface are the strongest parts of the project. The transactional core (server-side booking, payment confirmation and ticket issuance) is the part that is still specified rather than built. Chapters 5 to 7 describe it with this limit in mind.

### 1.4.3. Technical Scope

The system is a single repository managed with Nx. The front end is an Angular 20 application with domain libraries, standalone components, Signals and NgRx SignalStore, and server-side rendering for public pages. The back end is a Node.js and Express 5 modular monolith written in JavaScript, with modules for authentication, movies, cinemas, showtimes, concessions, the chatbot, recommendations, booking and payment. A separate ingestion application crawls the Galaxy source. MySQL (through Prisma) stores durable data, Redis is reserved for temporary state, and MongoDB stores chat sessions and movie embeddings.

The back end is a modular monolith, not a set of microservices. This choice keeps deployment and debugging simple for a five-person team and still preserves clear module boundaries. Section 4.1.8 explains the rationale. The front end was first written with React and Vite and was migrated to Angular during the project. Only the Angular application is part of the final system.

### 1.4.4. Business and Operational Assumptions

Three assumptions define the project. First, seat availability is simulated: the seat map marks some seats as sold according to a deterministic rule, so it does not reflect any real cinema's inventory. Second, payment runs against gateway sandboxes or test endpoints, not against live accounts, so no real money moves. Third, the movie and showtime data come from Galaxy Cinema and are used as reference data to give the catalogue realistic content. CineHub is not affiliated with Galaxy, and no ticket issued by CineHub is valid at any cinema.

### 1.4.5. Project Constraints and Limitations

Time and team size are the main constraints: five students worked over about one month of recorded repository activity (7 October to 8 November 2026). This period was too short to implement every designed feature, so the report is explicit about the gap between design and code.

Three further limitations apply. The crawler depends on a third-party service whose terms of use may restrict automated access, and whose interface can change without notice, so the catalogue may become stale or the crawler may break. There is no real payment contract and no real cinema inventory, so payment correctness can be studied only in a sandbox. Finally, the test results available when this report was written do not include load or concurrency measurements. Where evidence is missing, the relevant section says so.

### 1.4.6. Out-of-Scope Features and Future Extensions

The following features are outside the scope of the current system: live payments, real ticket issuance and validation, integration with any cinema's own booking system, refunds and cancellations, loyalty programmes, a native mobile application and production deployment with high availability. Section 7.8 discusses how the designed booking engine, payment confirmation, staff check-in and administration could be completed, and how the platform could scale.

## 1.5. Research and Development Methodology

### 1.5.1. Requirements Elicitation and Analysis

We captured requirements as user stories grouped into epics (accounts, discovery, booking, payment and tickets, check-in, administration and the assistant) and linked them to functional requirement identifiers. Existing platforms served as a reference for expected behaviour (Section 2.11). Section 3.1 describes how requirements were prioritised, and Appendix A contains the full backlog. TODO-CONFIRM: state whether any external stakeholder, supervisor interview or user survey informed the requirements; none is recorded in the repository.

### 1.5.2. Iterative Software Development Approach

The team worked in short, incremental changes on separate Git branches, merged through pull requests. The history shows 145 commits between 7 October and 8 November 2026 and pull requests numbered up to #18. No formal sprints or velocity figures are claimed. The most significant iteration was architectural: the project began as a React and Express workspace and was restructured into an Nx workspace with an Angular 20 front end and a layered Express back end. Architecture Decision Records (ADRs) dated 2 November 2026 document this change and related decisions, such as contract-first API design, hybrid server-side rendering and the deferral of the booking module.

### 1.5.3. System Modeling and Architecture Design

The team modelled the system with UML (use case, class, sequence and state diagrams), BPMN, data flow diagrams and entity–relationship diagrams, and recorded the architecture with C4-style container views. A diagram plan (PCCV) assigns every diagram to a team member and a report section. The models are analysis artefacts for Chapters 3 and 4, and they also specify the parts of the system that are not yet implemented.

### 1.5.4. Implementation and Integration Strategy

Implementation follows a documented Git workflow. Direct pushes to the main branch are prohibited. Each change lives on a topic branch, uses Conventional Commits whose scope is the name of an Nx project, and is checked by commit hooks (Husky, lint-staged and Commitlint). Each pull request triggers a continuous integration workflow that validates the Prisma schema, checks that the generated OpenAPI file and Angular client are up to date, and runs linting, tests and builds for the affected projects. End-to-end tests run on the main branch. Integration proceeds feature by feature, and mock handlers allow the front end to be developed before the back end is ready.

### 1.5.5. Testing and Empirical Evaluation

The repository contains unit and integration tests for the back end (authentication, catalogue, concessions, chatbot) and component, store and interceptor tests for the front end, together with browser-level end-to-end tests. These files show intent, but they do not prove outcomes. The report therefore states test results only when they come from an actual run, and it presents measurement plans, with empty result tables, for concurrency, load and usability evaluation that have not yet been performed. Chapter 7 reports what was measured and what remains open.

## 1.6. Project Deliverables and Expected Contributions

### 1.6.1. Functional Web Application

The first deliverable is an Angular web application. It lets a user browse movies and showtimes, sign in, choose seats on a 2D or 3D seat map, add concessions, start a sandbox payment, view tickets in the browser and talk to the assistant. It is located in the `apps/web` application and the `libs/web` libraries of the repository.

### 1.6.2. Backend API and Database System

The second deliverable is the Express modular monolith in `apps/core-api`, the Prisma schema and seed data in `libs/db` (39 models and 27 enumerations), and the Galaxy ingestion application in `apps/aggregator`. The schema covers the full booking domain even where the application code does not yet write to it, so it also serves as the foundation for the designed booking engine.

### 1.6.3. Technical Documentation and API Contract

The third deliverable is documentation: an OpenAPI 3.1 document generated from the shared Zod schemas (`docs/api`), architecture decision records (`docs/adr`), the database design document (`docs/database`), AI design notes (`docs/ai`), the Git workflow (`docs/GIT_WORKFLOW.md`), and a set of diagrams registered in the PCCV. The contract is generated rather than hand-written, which limits drift between the back end and the front end.

### 1.6.4. Testing Results and Evaluation Artifacts

The fourth deliverable is the set of test suites, the continuous integration configuration and the evaluation artefacts: test result tables, a concurrency scenario, performance measurements, a security checklist and a requirements traceability matrix. At the time of writing, the suites and configuration exist, but the measured results for concurrency, load and usability are not yet collected. TODO-DATA: run `npm test` and the CI pipeline, capture totals per project, and record them for Section 7.2.

The expected contribution of the project is not a new algorithm. It is a documented, evidence-based case study of a cinema booking platform, with an honest account of which parts of the design were built and which were not.

## 1.7. Report Organization

The report has seven chapters, followed by references and appendices. Table 1.7-1 states the purpose and main content of each chapter.

| Chapter                                           | Purpose                                        | Main content                                                                                                                                         |
| ------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Introduction                                   | Explain the problem, goals and boundaries.     | Background, problem statement, objectives, scope, methodology, deliverables.                                                                         |
| 2. Theoretical Background and Related Systems     | Provide the concepts behind the design.        | Ticketing domain, modelling, web architecture, Angular, Node.js, databases, Redis and concurrency, security, payment, AI retrieval, platform review. |
| 3. System Analysis                                | Define what the system must do.                | Development process, actors, requirements, business rules, use cases, BPMN, data flow diagrams.                                                      |
| 4. System Design                                  | Define how the system is structured.           | Architecture, API contract, database, sequence diagrams, algorithms and state machines.                                                              |
| 5. User Interface and User Experience Design      | Present the interface and its rationale.       | Design principles, navigation, screens, usability evaluation.                                                                                        |
| 6. System Implementation, Integration and Testing | Describe what was built and how it was tested. | Stack, code organisation, authentication, catalogue, booking and payment status, persistence, AI, tests, deployment.                                 |
| 7. Results, Evaluation and Conclusion             | Judge the results against the objectives.      | Implemented modules, test results, reliability, performance, security, evaluation, discussion, conclusion.                                           |

_Table 1.7-1. Organisation of the report._

Each chapter marks features as Implemented, Partial, Designed or Planned. Chapters 5 and 6 describe built features. Chapter 4 may describe designed features and labels them. Chapter 7 answers three questions: what was completed, whether the objectives were met, and what limitations remain.
