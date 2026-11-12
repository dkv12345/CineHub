# CHAPTER 2. THEORETICAL BACKGROUND AND RELATED SYSTEMS

This chapter presents the concepts on which CineHub is built. Each section explains a concept, why it matters for ticketing, and its trade-offs. It closes with one sentence on how CineHub applies it.

## 2.1. Online Cinema Ticketing Systems

### 2.1.1. Core Concepts and Business Models

An online cinema ticketing system sells admission to a screening: a film shown in an auditorium at a given time. Operators earn revenue from tickets and concessions (food and drink), and share ticket revenue with film distributors [CITATION NEEDED: cinema exhibition business model and revenue sharing]. Three commercial models are visible in the market. Chains sell tickets for their own cinemas through their own channels–. Aggregators list showtimes from many chains and may redirect the purchase. Payment intermediaries, such as e-wallets, sit between the customer and the seller.

Each model shapes the technical requirements. A chain owns the seat inventory and must keep it exact. An aggregator owns no inventory and depends on external data. CineHub's data model follows the chain model, with a catalogue structured to hold several chains, and its content comes from an external source, as an aggregator would. In CineHub, this is applied by a single relational catalogue that is filled by a crawler and a seed process (Section 4.1.6).

### 2.1.2. Movie, Cinema, Auditorium and Showtime Relationships

The ticketing domain has a stable core of concepts. A _movie_ is an abstract work. A _cinema_ is a venue that belongs to a chain and a region. An _auditorium_ is a screen room inside a cinema, with a seat layout. A _showtime_ ties one movie to one auditorium at one time, with a format and a price. A _seat_ belongs to an auditorium, and a _booking_ reserves one or more seats for one showtime. Figure 2.1.2-1 shows these concepts and their multiplicities, without technical attributes.

> **[INSERT FIGURE 2.1.2-1 | D02 | UML conceptual class diagram | owner: Thảo Châu | file: PCCV link, row D02]**
> _Figure 2.1.2-1. Conceptual class diagram of movie, cinema, auditorium, showtime, seat and booking._

The diagram shows that the showtime is the pivot of the model. A movie has many showtimes, an auditorium hosts many showtimes, and a booking always refers to exactly one showtime. The consequence is that availability is a property of the pair (showtime, seat), not of the seat alone, because the same physical seat is free for one showtime and sold for the next. In CineHub, this pair is the unit of locking and of the seat map (Sections 4.3.3 and 4.5.1).

### 2.1.3. The Online Ticket Booking Lifecycle

A booking passes through a fixed sequence of steps: browse films, choose a showtime, choose seats, hold them, add concessions, pay, receive the ticket, and later present it at the door. The sequence has a time limit between holding and paying, and a branch for expiry or payment failure. Figure 2.1.3-1 shows this lifecycle as an activity diagram with three swimlanes: customer, system and payment gateway.

> **[INSERT FIGURE 2.1.3-1 | D03 | UML activity diagram with swimlanes | owner: Thảo Châu | file: PCCV link, row D03]**
> _Figure 2.1.3-1. Online ticket booking lifecycle with customer, system and payment gateway lanes._

The diagram shows that responsibility changes hands twice: from the customer to the system when seats are chosen, and from the system to the gateway when payment starts. The system regains control only through a notification from the gateway. This explains why payment confirmation is treated separately in Sections 2.9 and 4.5.4. CineHub models this lifecycle in BPMN (Section 3.7) and in sequence diagrams (Sections 4.4.4 to 4.4.7).

### 2.1.4. Stakeholders and Business Rules in Cinema Ticketing

Stakeholders include customers, cinema staff, administrators, film distributors and payment providers. Business rules protect their interests: a seat can be sold once per showtime; a hold lasts for a limited time; the number of seats per order is capped; a ticket is valid only for its showtime; and only authorised staff may change schedules or prices. Rules like these are the source of most test cases, because they define what "correct" means when many users act at once.

Rules must be explicit and numbered, so that they can be traced to code and tests. CineHub's constants include a limit of six seats per booking and a hold of 900 seconds (15 minutes), which are shared between the front end and the back end through a common contract library. Section 3.5 lists all business rules with identifiers.

## 2.2. Requirements Engineering and Business Process Modeling

### 2.2.1. Functional and Non-Functional Requirements

Requirements engineering turns stakeholder needs into verifiable statements,. A _functional requirement_ states what the system must do ("a customer can hold up to six seats"). A _non-functional requirement_ states how well it must do it: performance, security, reliability, usability and maintainability. Good requirements are unambiguous, testable and traceable to design and tests.

For ticketing, non-functional requirements are often more critical than functional ones, because a feature that works for one user but fails under concurrent use is not acceptable. The trade-off is effort: measurable targets need measurement. CineHub writes requirements with identifiers (FR and NFR groups per area) and links each to a verification method, as described in Sections 3.3 and 3.4.

### 2.2.2. Use Case Modeling and Actor Relationships

A use case describes a goal that an actor can achieve with the system, in a sequence of steps with alternative and exception flows. A use case diagram shows actors, use cases and two relations defined by the UML: _include_ (a mandatory shared step, such as authentication) and _extend_ (an optional behaviour, such as applying a voucher). Use case specifications add preconditions, postconditions and flows.

Use cases suit ticketing because most behaviour is a user goal with failure paths. Their weakness is that they say little about time and data, which is why BPMN and data flow diagrams complement them. CineHub uses overview and per-area use case diagrams and writes detailed specifications for the critical flows (Section 3.6).

### 2.2.3. Business Process Model and Notation (BPMN)

BPMN is a standard notation for business processes with events, tasks, gateways, lanes and timers. It is more precise than an informal flowchart about who does what, which exceptions can occur, and what happens when a timer expires. A timer boundary event is particularly relevant to ticketing, since a hold must expire.

The cost of BPMN is its detail: diagrams grow quickly, so each process should have a clear start and end. CineHub uses BPMN for registration, discovery, seat holding, booking and payment, expiry, and administrative updates, with a 10-minute OTP timer and a 15-minute hold timer (Section 3.7).

### 2.2.4. Data Flow Diagrams (DFD)

A data flow diagram shows processes, data stores, external entities and the data that moves between them. A context diagram (Level 0) treats the system as one process. Level 1 diagrams break it into main processes. Balancing means that the flows at Level 1 must match those at Level 0.

DFDs are useful for ticketing because they expose where data is stored and which external systems receive it, which matters for privacy and consistency. They do not show order or timing. CineHub numbers processes, stores and entities consistently and draws one Level 0 and several Level 1 diagrams (Section 3.8).

### 2.2.5. UML Sequence and Class Diagrams

A class diagram shows structure: classes, attributes and relationships. A sequence diagram shows behaviour over time: which participant sends which message, in which order, with alternative fragments for errors,. Class diagrams answer "what is in the system"; sequence diagrams answer "what happens when a user does X".

Sequence diagrams are the main tool for describing concurrency-sensitive interactions, because they make the order of steps visible. They become large if they try to show every error. CineHub uses conceptual class diagrams in analysis (Section 2.1.2) and detailed sequence diagrams in design, with each diagram covering a main path, error paths and the design decision it demonstrates (Section 4.4).

## 2.3. Web Application Architecture

### 2.3.1. Client–Server Architecture

In a client–server architecture, a client sends requests and a server holds the shared state and rules. The web adds a standard protocol (HTTP) and a browser as a universal client. Fielding describes this style, together with statelessness and a uniform interface, as the basis of the web's scalability. Figure 2.3.1-1 shows a three-tier arrangement with REST communication between the tiers.

> **[INSERT FIGURE 2.3.1-1 | D04 | Block diagram: client-server, three tiers, REST | owner: Thảo Châu | file: PCCV link, row D04]**
> _Figure 2.3.1-1. Client–server architecture with presentation, application and data tiers communicating over REST._

The diagram places the browser in the presentation tier, the application programming interface (API) in the application tier, and the databases in the data tier. The trade-off is that the client cannot be trusted: every rule that matters, such as seat ownership, must be enforced on the server. CineHub follows this layout, with an Angular client, an Express API and three data stores (Section 4.1.1).

### 2.3.2. Separation of Presentation, Business Logic and Data Access

Layering separates responsibilities: the presentation layer handles interaction, the domain layer holds business rules, and the data-source layer talks to storage. The benefit is that each layer can change or be tested alone. The cost is some indirection and mapping code.

For ticketing, the separation keeps pricing, seat rules and payment rules out of controllers and components, so that they can be tested without a network. CineHub applies the separation on both sides: Angular libraries are split into feature, data-access, UI and utility layers with enforced dependency rules, and the API splits routes, controllers, services and repositories (Sections 4.1.2 and 4.1.3).

### 2.3.3. RESTful API Design Principles

REST models an API as resources identified by URLs and manipulated with a small set of HTTP methods. HTTP semantics define which methods are safe and which are idempotent: GET, PUT and DELETE are idempotent, while POST is not. Status codes express outcomes, for example 401 for missing credentials, 403 for forbidden actions, and 409 for a conflict.

These semantics matter in booking. Creating a hold or a payment is a POST, so a retry may create a duplicate unless the design prevents it (Section 2.7.5). The 409 code is the natural answer when a seat is already taken. CineHub uses resource-oriented routes under a versioned prefix and plans the 409 response for seat conflicts (Section 4.2).

### 2.3.4. Modular Backend Architecture and Separation of Concerns

Parnas proposed that a system should be divided into modules around design decisions that are likely to change, so that each module hides one decision. A _modular monolith_ applies this inside a single deployable unit: modules have public interfaces, private internals and controlled dependencies. A microservice architecture applies a similar idea across network boundaries, at the cost of distributed-system complexity. Fowler advises starting with a monolith and splitting only when needed.

For a team of five students with one deployment target, the modular monolith offers local function calls, one transaction scope and simple debugging. Its risk is erosion of boundaries over time, which must be controlled by conventions. CineHub is a modular monolith in Node.js and Express: each domain is a module with its own routes, controller, service and repository, exposed through an index file (Section 4.1.3).

### 2.3.5. API Validation, Error Handling and Versioning

An API must validate every input, return errors in a predictable structure, and evolve without breaking clients. RFC 9457 defines a standard "problem details" format for HTTP errors. Validation at the boundary stops malformed data from reaching business logic. Versioning, often through a path prefix, lets old and new clients coexist.

Predictable errors are important in booking, because the client must tell "seat taken" from "hold expired" from "server error" and react differently. CineHub validates requests with Zod schemas, returns errors with a stable code, message and request identifier, and prefixes routes with `/api/v1` (Sections 4.2.1 and 4.2.4).

## 2.4. Frontend Engineering with Angular

### 2.4.1. Component-Based Architecture

Angular builds an interface from components: a TypeScript class, a template and styles, with inputs and outputs for communication. Standalone components declare their own dependencies and no longer need modules. Signals provide fine-grained reactive state: a signal holds a value, computed signals derive from it, and the template updates when it changes.

Components make an interface testable and reusable, for example a seat or a movie card. The trade-off is the need for discipline in state ownership. CineHub uses standalone components, signals and OnPush change detection throughout the front end (Section 4.1.2).

### 2.4.2. Routing, Services and Dependency Injection

The Angular router maps URLs to components and supports lazy loading of route groups, so that code is downloaded only when needed. Services are classes that hold logic or state; dependency injection supplies them to components and to other services, which makes them replaceable in tests.

Lazy loading is valuable where a feature is heavy, such as a three-dimensional seat view. CineHub's shell loads each feature's routes lazily, and services and stores are injected with the `inject()` function (Sections 4.1.2 and 6.2.1).

### 2.4.3. Reactive Forms and Client-Side Validation

Reactive forms model a form as an object in code, with controls, groups and validators, and give typed access to values. Client-side validation improves the user experience by giving fast feedback, but it is not a security measure, since a client can be bypassed.

For this reason the same rules should exist on the server. A common technique is to share a schema. CineHub defines validation schemas with Zod in a shared library and uses them on the server and, through an adapter, in the Angular forms (Section 6.2.4).

### 2.4.4. HTTP Client and HTTP Interceptors

Angular's `HttpClient` returns observables for HTTP calls. An _interceptor_ is a function that sees every request and response, so it can attach credentials, add correlation identifiers, retry, or map errors. Interceptors form a chain in the order in which they are registered. Figure 2.4.4-1 shows the building blocks of the Angular application and the interceptor chain.

> **[INSERT FIGURE 2.4.4-1 | D05 | Block and flowchart: Angular building blocks and interceptor chain | owner: Thảo Châu | file: PCCV link, row D05]**
> _Figure 2.4.4-1. Angular building blocks (component, service, dependency injection, router, guard, interceptor) and the HTTP interceptor chain._

The figure shows that a request leaves a component, passes through the interceptors, and reaches the server, and that the response travels back in reverse. Placing token handling in an interceptor keeps it out of every component. CineHub registers functional interceptors for request identifiers, authentication and error mapping (Sections 4.1.2 and 6.3.4).

### 2.4.5. Route Guards and Frontend State Management

A route guard is a function that decides whether navigation may continue, for example whether a user is logged in. State management decides where application data lives. NgRx SignalStore offers stores built from signals, with state, computed values and methods.

Guards improve the experience but do not replace server checks. Stores keep shared state, such as the current selection of seats, in one place. CineHub uses functional guards for authentication and one SignalStore per feature, including the booking store that holds selected seats and the hold countdown (Sections 4.1.2 and 6.3.6).

## 2.5. Backend Engineering with Node.js and Express

### 2.5.1. Request–Response Lifecycle

In Express, an HTTP request travels through an ordered list of middleware functions and then a route handler; the handler writes the response, and an error handler catches failures,. The order matters: a middleware registered later never sees what an earlier middleware has ended. Figure 2.5.1-1 shows the path of a request in CineHub.

> **[INSERT FIGURE 2.5.1-1 | D06 | Flowchart: request through middleware, controller, service, error handler | owner: Khánh Vi | file: PCCV link, row D06]**
> _Figure 2.5.1-1. Request lifecycle through the Express middleware stack, controller, service and error handler._

In CineHub the order is: request identifier, security headers, cross-origin policy, cookie parsing, body parsing with a size limit, request logging, the versioned routes, a not-found handler and the central error handler. This sequence is defined in the application factory (Section 4.1.7).

### 2.5.2. Middleware and Route Organization

Middleware is a function with access to the request, the response and the next step. It can run code, end the response or pass control on. Routers group routes by prefix and can carry their own middleware, which allows a module to bring its own validation and authentication.

The benefit is reuse of cross-cutting logic, such as rate limiting, validation and authentication. CineHub composes per-route middleware for validation, authentication and rate limits, and mounts one router per module (Section 6.8.1).

### 2.5.3. Business Service and Data Access Layers

A service layer holds business operations and is independent of HTTP; a repository (or data access) layer hides storage queries behind functions. Controllers translate between HTTP and services. This arrangement lets a service be tested with a fake repository.

It also gives a clear place for transactions: the service decides where a transaction starts and ends, and the repository executes the queries inside it. CineHub follows the route, controller, service and repository pattern for its modules (Section 6.2.3).

### 2.5.4. Asynchronous Processing and Exception Handling

Node.js runs JavaScript on a single thread and delegates input and output to the operating system through an event loop, so a server can handle many concurrent connections without blocking. The cost is that long computation blocks every request, and that unhandled errors in asynchronous code can be lost. Express 5 forwards rejected promises from handlers to the error middleware, which reduces this risk.

A central error handler can turn known errors into well-formed responses and hide the internals of unknown ones. CineHub defines an application error type with a status and a code, handled in one error middleware, and logs each request with Pino (Section 6.2.6).

## 2.6. Relational Database Design and ORM

### 2.6.1. Relational Data Modeling and Normalization

The relational model represents data as tables of rows and columns related by keys. Normalization removes redundancy by splitting data so that each fact is stored once, which avoids update anomalies. Normalised schemas are consistent, but they need joins.

Ticketing benefits from normalisation because prices, seats and bookings change independently. Some denormalised fields, such as a stored total, are acceptable if they are controlled. CineHub's MySQL schema has 39 models in eight domains and is organised to keep each fact in one place (Sections 4.3.3 and 4.3.4); TODO-CONFIRM: state the normal form actually reached and any deliberate denormalisation.

### 2.6.2. Primary Keys, Foreign Keys and Referential Integrity

A primary key identifies a row; a foreign key links to another table and guarantees that the link is valid; a unique constraint forbids duplicates. Constraints enforce rules in the database, whatever the application does. A useful detail in MySQL is that a unique index on a nullable column permits many NULL values but only one of each non-NULL value.

This detail supports an elegant rule: a column that is NULL when a seat is released and holds an identifier when active can make a second active holder impossible. CineHub's booking schema uses such nullable unique columns (an active-lock column on booked seats and a success-lock column on payments) as the last line of defence against double booking and double payment (Section 4.3.6).

### 2.6.3. Transaction Processing and ACID Properties

A transaction groups operations so that they are atomic, consistent, isolated and durable, the ACID properties. Isolation levels trade strictness for concurrency. InnoDB offers REPEATABLE READ by default and READ COMMITTED as an option, and `SELECT ... FOR UPDATE` takes row locks that make other writers wait.

For booking, the transaction is the place where "check, then write" becomes safe. Locks should be taken in a consistent order to avoid deadlocks. CineHub's design performs the final booking in a READ COMMITTED transaction with row locks taken in a fixed order, and uses an optimistic version column as a second check (Section 4.5.2).

### 2.6.4. Database Indexing and Query Optimization

An index speeds up lookups at the cost of storage and slower writes. Composite indexes serve queries that filter on several columns in a fixed order. Query plans show whether an index is used.

For showtime search, the common filters are movie, cinema, date and format, so composite indexes on these are important. CineHub declares indexes in the Prisma schema and in migration files, and Section 4.3.6 explains the purpose of each constraint and index.

### 2.6.5. Prisma ORM and Schema Management

An object-relational mapper (ORM) maps tables to objects. Prisma describes the schema in a declarative file, generates a typed client and manages migrations. It supports interactive transactions with a chosen isolation level; row locks such as `FOR UPDATE` require raw queries.

The benefits are type safety and a single source of truth for the schema; the cost is that some features need escape hatches. CineHub keeps the schema, migrations and seed data in a dedicated database library and validates the schema in continuous integration (Sections 4.3.7 and 6.7.1).

## 2.7. Caching, Concurrency and Temporary Resource Reservation

### 2.7.1. Caching Fundamentals and Redis

A cache keeps frequently used or temporary data in fast storage. Redis is an in-memory data store with strings, hashes, sets and other structures, and with optional persistence through snapshots and an append-only file,. Because memory is limited, its eviction policy matters: a policy that refuses writes when memory is full is safer for reservations than one that silently removes keys.

Redis data should be considered ephemeral. It is suitable for locks, counters and caches, but not for records of sales. CineHub keeps durable records in MySQL, uses Redis for temporary seat leases and similar state, and configures it without eviction (Section 4.1.5).

### 2.7.2. Time-to-Live (TTL) and Temporary Seat Holds

A TTL makes a key disappear after a given time, so abandoned holds free themselves without a cleanup job. The `SET` command can create a key and set its TTL in one atomic step. Figure 2.7.2-1 shows the life of a hold on a timeline.

> **[INSERT FIGURE 2.7.2-1 | D07 | Timeline: lifecycle of a seat hold | owner: Khánh Vi | file: PCCV link, row D07]**
> _Figure 2.7.2-1. Timeline of a seat hold from creation to expiry or confirmation (panel b of D07)._

The timeline shows that a hold either ends in a confirmed booking before the TTL or is removed by the TTL. A single TTL value governs both the countdown shown to the user and the server-side expiry, so they cannot drift apart. In CineHub, a lease is a Redis key of the form `seat:{showtime}:{seat}` with a 900-second TTL (Section 4.1.5).

### 2.7.3. Race Conditions and Concurrent Booking Requests

A race condition occurs when the outcome depends on the timing of concurrent operations. Two requests that both read "seat free" and then both write "seat taken" is the classic lost-update pattern. Figure 2.7.3-1 compares two requests for the same seat without and with an atomic `SET NX` operation.

> **[INSERT FIGURE 2.7.3-1 | D07 | Race-condition panel: two requests, without and with atomic SET NX | owner: Khánh Vi | file: PCCV link, row D07]**
> _Figure 2.7.3-1. Two concurrent requests for one seat: unsafe check-then-set versus atomic SET NX (panel a of D07)._

Without atomicity, both requests succeed. With `SET NX`, Redis guarantees that exactly one request creates the key and the other receives a negative answer. The remaining requests are rejected before they reach the relational database, which protects it under load. CineHub's design uses this property as its first defence layer (Section 4.5.2).

### 2.7.4. Atomic Operations and Data Consistency

Redis executes each command, and each Lua script, atomically. A script can check several keys and set them all, or none, which suits multi-seat holds: either every requested seat is leased or none is. Compare-and-delete scripts let a client release only a lease it owns. A single-instance lock has a known limitation: after a failover, two clients may briefly hold the same lock,.

For this reason, a Redis lease is a first filter, and the relational database remains the final authority. CineHub specifies Lua scripts for atomic multi-seat acquisition and for owner-checked release, and backs them with row locks, an optimistic version and a unique constraint in MySQL (Section 4.5.1).

### 2.7.5. Idempotency in Booking and Payment Workflows

An operation is idempotent if repeating it has the same effect as doing it once. Networks retry, users double-click and gateways resend notifications, so booking and payment operations must tolerate duplicates. Common techniques are idempotency keys supplied by clients, unique constraints on event identifiers, and state checks before action.

Idempotency is a design requirement, not an optimisation: a duplicate payment notification must not issue two tickets. CineHub's design stores gateway events with a unique identifier and uses a unique success marker on payments, so that a repeated notification has no second effect (Section 4.5.4).

## 2.8. Authentication, Authorization and Web Security

### 2.8.1. Authentication versus Authorization

Authentication establishes who the user is. Authorization decides what that user may do. OWASP lists broken access control and authentication failures among the most common web risks. A system can authenticate correctly and still fail if it does not check permissions on every request.

In ticketing, a customer must see only their own bookings, and only staff may validate tickets. CineHub authenticates with passwords and Google sign-in and then authorises each request from the verified identity and role (Section 4.2.3).

### 2.8.2. Access Tokens and Refresh Tokens

A JSON Web Token (JWT) is a signed set of claims. A common pattern uses a short-lived _access token_ for API calls and a longer-lived _refresh token_ to obtain new access tokens. _Refresh token rotation_ issues a new refresh token with each use and invalidates the old one; if an old token is presented again, the server treats it as theft and revokes the whole _token family_. Figure 2.8.2-1 shows login, expiry, refresh and rotation at a conceptual level.

> **[INSERT FIGURE 2.8.2-1 | D08 | Conceptual sequence: login, access token expiry, refresh, rotation | owner: Khánh Vi | file: PCCV link, row D08]**
> _Figure 2.8.2-1. Conceptual sequence of login, access-token expiry, refresh and rotation (detail in Section 4.4.2)._

The diagram stays at the conceptual level; the detailed sequence is in Section 4.4.2. The design limits the damage of a stolen access token to its short lifetime. CineHub uses an access token valid for 15 minutes and a refresh token valid for 7 days, stored on the server only as a hash, with rotation and reuse detection per family (Section 6.3.3).

### 2.8.3. Angular HTTP Interceptor and Token Lifecycle

When an access token expires, several requests may fail at the same time. If each one starts its own refresh, rotation breaks, because the second refresh presents an already used token. The standard solution is _single-flight refresh_: one refresh runs, and every waiting request is replayed with the result. If the refresh fails, the session ends.

This logic belongs in one interceptor, so components stay unaware of tokens. CineHub's authentication interceptor shares one refresh stream among concurrent 401 responses, retries each request once, and clears the session when the refresh fails (Section 6.3.5).

### 2.8.4. Role-Based Access Control (RBAC)

In role-based access control, permissions are attached to roles, and users receive roles. This simplifies administration compared with per-user permissions. The principle of least privilege says that each role should have only the permissions it needs.

CineHub defines the roles of customer, staff and administrator. The access token carries the role, route guards on the client improve navigation, and server-side middleware performs the binding check (Section 6.3.7).

### 2.8.5. Password Security, Cookie Security and CSRF

Passwords must be stored with a slow, salted hash function such as bcrypt, whose cost factor sets the work per guess,. Cookies can carry the `HttpOnly` and `Secure` attributes, which hide them from scripts and restrict them to HTTPS. The `SameSite` attribute restricts cross-site sending and reduces the risk of cross-site request forgery (CSRF).

A refresh token in an `HttpOnly` cookie cannot be read by injected scripts, while an access token kept in memory is not sent automatically with cross-site requests. CineHub hashes passwords with bcryptjs at cost 10 and sends the refresh token only in an `HttpOnly`, `SameSite=Strict` cookie restricted to the API path (Section 6.3.2).

### 2.8.6. CORS, Input Validation and Common Web Vulnerabilities

Cross-origin resource sharing (CORS) lets a server state which origins may call it from a browser. Input validation and output encoding address injection and cross-site scripting. Parameterised queries, as produced by an ORM, prevent SQL injection. Payment and seat flows add further needs: verifying the signature of gateway notifications, signing ticket codes, preventing replay, and protecting locks from release by other users. Figure 2.8.6-1 summarises these controls.

> **[INSERT FIGURE 2.8.6-1 | D08b | Architecture and security: hardening of payment and seat locks | owner: Khánh Vi | file: PCCV link, row D08b]**
> _Figure 2.8.6-1. Security hardening for payment and seat locks: IPN signature verification, HMAC tokens, replay protection and lock protection._

The figure groups four controls: signature verification of the notification, a keyed hash (HMAC) on tickets, a replay check on events, and owner-checked lease release. CineHub applies an explicit CORS policy, security headers, schema validation and an HMAC-signed ticket code, and designs the other controls into the payment and booking flows (Sections 4.5.4 and 4.5.5).

## 2.9. Payment Processing and Transaction Integrity

### 2.9.1. Online Payment Workflow

In a redirect-based workflow, the merchant creates an order, the customer is redirected to the gateway, pays, and returns to the merchant through a _return URL_. Separately, the gateway sends a server-to-server message, the _instant payment notification (IPN)_ or webhook. Only the notification is authenticated and reliable, because the customer's browser may never return. Figure 2.9.1-1 shows these steps.

> **[INSERT FIGURE 2.9.1-1 | D09 | Conceptual sequence: create order, redirect, return URL, IPN | owner: Thảo Châu | file: PCCV link, row D09]**
> _Figure 2.9.1-1. Payment workflow: the IPN is the source of truth and the return URL is for display only._

The figure shows two arrows reaching the merchant, and only the IPN changes the order state. The return URL merely shows the user a result. CineHub's design follows this rule (Section 4.4.6), and its checkout page starts MoMo, ZaloPay and VNPay payments against sandbox endpoints.

### 2.9.2. Payment Status and Order Status Management

An order and its payment are separate state machines. A payment moves from initiated to success or failure; an order moves from pending to paid, expired or cancelled. Valid transitions must be explicit and each must have a trigger and a guard, so that an expired order cannot be paid without a deliberate refund path.

CineHub models booking, payment, ticket and seat states as enumerations in the database schema and as state diagrams in the design (Section 4.5.3).

### 2.9.3. Payment Callbacks, Webhooks and Signature Verification

A callback should be accepted only if it carries a valid signature computed with a secret shared with the gateway, usually an HMAC,. The merchant recomputes the signature from the received fields and compares it in constant time. It should also check that the amount and order identifier match its own records.

Skipping this check allows anyone to forge a "payment successful" message. The gateways used by CineHub sign their messages with HMAC: MoMo with SHA-256, VNPay with SHA-512 and ZaloPay with SHA-256,,. CineHub's design verifies the signature, the amount and the order before changing any state (Section 4.5.4).

### 2.9.4. Duplicate Requests, Failed Payments and Reconciliation

Gateways may send the same notification several times, deliver notifications late, or never deliver them. A robust merchant therefore processes events idempotently, handles payments that arrive after a hold has expired, and runs a reconciliation job that asks the gateway for the status of orders that remain pending.

These cases are the main source of subtle faults in payment systems. CineHub's design includes a stored event record, a unique success marker, a refund branch for late payments, and a timeout job that releases seats and expires pending bookings (Sections 4.4.7 and 4.5.4).

### 2.9.5. Payment Gateway Integration Constraints

Each gateway has its own interface, signature scheme and sandbox. Choosing among them involves fees, supported methods, test facilities and the form of the server notification. Table 2.9.5-1 compares the four gateways considered.

> **[INSERT TABLE 2.9.5-1 | D09b | TBL | Payment gateway comparison | owner: Thảo Châu | file: authored table]**
> _Table 2.9.5-1. Comparison of MoMo, VNPay, ZaloPay and Stripe._

| Criterion           | MoMo                                              | VNPay                          | ZaloPay                | Stripe                                  |
| ------------------- | ------------------------------------------------- | ------------------------------ | ---------------------- | --------------------------------------- |
| Server notification | IPN (HTTP POST)                                   | IPN URL plus return URL        | Callback               | Webhook events                          |
| Signature           | HMAC-SHA256                                       | HMAC-SHA512 (`vnp_SecureHash`) | HMAC-SHA256 (MAC)      | HMAC-SHA256 (`Stripe-Signature` header) |
| Test environment    | Yes (sandbox)                                     | Yes (sandbox)                  | Yes (sandbox)          | Yes (test mode)                         |
| Transaction fees    | [DATA TO BE COLLECTED from provider fee schedule] | [DATA TO BE COLLECTED]         | [DATA TO BE COLLECTED] | [DATA TO BE COLLECTED]                  |
| Methods             | Wallet, cards                                     | Bank apps, cards               | Wallet, bank, cards    | Cards and wallets                       |

The comparison shows that all four use a signed server notification, so the same verification pattern can serve them all. Differences lie in the algorithm and the fields that are signed. CineHub integrates MoMo, ZaloPay and VNPay in sandbox mode, because they are widely used in Vietnam and offer test environments (Section 4.2.8). No live merchant account is used.

## 2.10. AI-Assisted Movie Discovery and Conversational Systems

### 2.10.1. Conversational Interfaces in Digital Services

A conversational interface lets users state a need in natural language instead of choosing filters. For discovery, requests such as "a film for tonight, nothing scary" combine genre, mood and time. The risk is that the system answers confidently with wrong information. A good design has a clear scope, suggests follow-up questions and falls back safely.

CineHub provides an assistant named CineBot as a chat widget that answers in Vietnamese and links each answer to movie pages and seat selection (Section 5.11).

### 2.10.2. Large Language Models and Structured Data Retrieval

A large language model (LLM) generates fluent text but has no access to a cinema's current schedule. Structured data, such as showtimes in a database, is accurate but hard for users to query in free text. A common solution is to let rule-based or model-based steps extract intent and entities, query the database, and then ask the model to phrase the result.

CineHub classifies four intents (movie search, showtimes, cinema information and chit-chat), extracts entities such as title, genre, time window and cinema, and queries MySQL for the facts (Section 4.5.6).

### 2.10.3. Retrieval-Augmented Generation (RAG) Fundamentals

Retrieval-augmented generation combines a retriever with a generator: relevant documents are found first and supplied to the model as context. Embeddings map text to vectors so that similar meanings lie close together, and a vector search finds the nearest items by cosine similarity,. Figure 2.10.3-1 shows the flow from a question to a grounded answer.

> **[INSERT FIGURE 2.10.3-1 | D10 | Flowchart: question, embedding, vector search, merge with MySQL facts, LLM, answer | owner: Thảo Châu | file: PCCV link, row D10]**
> _Figure 2.10.3-1. Retrieval-augmented flow with the anti-hallucination point: the answer is built only from retrieved data._

The figure marks the point where retrieved facts, not the model's memory, determine the content. CineHub embeds movie descriptions with the Gemini embedding model into 768-dimensional vectors stored in MongoDB, ranks candidates by cosine similarity, and merges them with current showtimes from MySQL before generation (Section 6.9.1).

### 2.10.4. Grounded Responses and Hallucination Mitigation

Hallucination is the generation of fluent content that is not supported by the source data. Mitigations include grounding answers in retrieved data, restricting the output to known entities, and using deterministic answers where precision matters.

For a ticketing assistant, an invented film title or showtime directly misleads users. CineHub builds movie lists and movie details deterministically from MySQL rows, so that the model cannot add titles, and falls back to a deterministic answer when the model is unavailable (Section 6.9.4).

### 2.10.5. Evaluation of AI Response Quality and Reliability

Quality can be assessed by correctness against the database, relevance of results, handling of out-of-scope questions and response time. Reliability also covers behaviour under quota limits and outages. Offline test sets of questions with known answers allow repeated measurement.

CineHub evaluates the assistant with scripted conversation scenarios and automated tests of intent, entity extraction, vector ranking and the model-call fallback (Section 6.9.6).

## 2.11. Review of Existing Cinema Platforms

### 2.11.1. Comparative Review of Selected Platforms

The review covers four existing platforms and CineHub. Galaxy, CGV and Lotte are cinema chains that sell tickets for their own venues–. Moveek is an aggregator that lists showtimes across chains and offers ticketing for partners. All of them offer online booking and are mature products in daily production use. CineHub is a student project and is compared on design choices, not on commercial scale.

The review compares what is publicly visible on each site; it does not rely on internal information. The chain sites are the strongest on booking, because they own the inventory. Moveek is the strongest on cross-chain discovery. This pattern defines the space in which CineHub positions itself.

### 2.11.2. Functional Comparison of Movie Discovery and Booking

Table 2.11.2-1 compares the platforms on the main functions of discovery and booking. Cells for other platforms reflect general public features; each cell must be verified and dated against the cited site before submission.

> **[INSERT TABLE 2.11.2-1 | D11 | TBL | Platform comparison | owner: Thảo Châu | file: authored table]**
> _Table 2.11.2-1. Functional comparison of Galaxy, CGV, Lotte, Moveek and CineHub._

| Criterion                          | Galaxy      | CGV         | Lotte       | Moveek           | CineHub                                                             |
| ---------------------------------- | ----------- | ----------- | ----------- | ---------------- | ------------------------------------------------------------------- |
| Online ticket purchase             | Yes         | Yes         | Yes         | Through partners | Sandbox booking flow                                                |
| Showtimes across several chains    | Own cinemas | Own cinemas | Own cinemas | Yes              | Catalogue designed for several chains; data crawled from one source |
| Seat selection                     | Yes         | Yes         | Yes         | [TO VERIFY]      | Yes, 2D and 3D point-of-view                                        |
| Temporary seat hold with countdown | [TO VERIFY] | [TO VERIFY] | [TO VERIFY] | [TO VERIFY]      | Yes, 15-minute hold                                                 |
| Natural-language assistant         | [TO VERIFY] | [TO VERIFY] | [TO VERIFY] | [TO VERIFY]      | Yes (CineBot)                                                       |
| Live payment with real tickets     | Yes         | Yes         | Yes         | Through partners | No (sandbox only)                                                   |

The table shows two things. Established platforms are complete in commerce, which CineHub does not claim to match. CineHub's distinguishing elements are the point-of-view seat preview, the assistant and the explicit study of seat-hold consistency.

### 2.11.3. Comparison of User Experience and Booking Workflows

A typical chain workflow runs from film or cinema to showtime, seats, concessions, payment and e-ticket. Aggregators compress the first steps by showing all showtimes of a film in one list. The main usability factors in this workflow are the number of steps, clarity of price, visibility of the hold timer and clear feedback after payment.

CineHub keeps the standard flow but lets the user enter from a film, a cinema or a showtime, shows the price breakdown before payment and displays the hold countdown on the seat page (Sections 5.2.4 and 5.6.5).

### 2.11.4. Identified Opportunities for CineHub

The review suggests three opportunities. First, cross-chain discovery in one catalogue can be combined with a booking flow that is designed around seat holds. Second, a conversational assistant grounded in catalogue data can help users who do not know what to watch. Third, a visual preview of the view from a seat can reduce uncertainty in seat choice.

These opportunities define CineHub's objectives O-F1, O-F3, O-F4 and O-U2 (Section 1.3), and they are the reason for the design decisions described in Chapters 3 and 4.

## 2.12. Chapter Summary

This chapter introduced the concepts that support CineHub. The ticketing domain is built around the showtime and the seat, and a booking lifecycle with a time limit and a payment step. Requirements and process models (use cases, BPMN, DFD, UML) describe it. A layered, modular architecture with Angular on the client and Express on the server keeps responsibilities apart. A relational database with constraints and transactions provides durable correctness, while Redis supplies temporary leases with atomic operations and a TTL. Security rests on short-lived tokens, rotating refresh tokens, hashed passwords, signed notifications and idempotent processing. Retrieval-augmented generation grounds the assistant in catalogue data. The platform review shows where CineHub fits among existing services. Chapter 3 uses these concepts to analyse the requirements of the system.
