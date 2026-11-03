# ADR 0006: Planned Booking Module & Redis Seat Lease Skeleton

- **Status**: Accepted (Planned Implementation)
- **Date**: 2026-11-02

## Context

The CineHub architecture specifies a multi-tier concurrency protocol for seat locking (`SET seat:{showtime_id}:{seat_id} {user_id}:{timestamp} NX EX 900` in Redis followed by a `READ COMMITTED` MySQL transaction during checkout). In the current repository state, the backend `booking` module (seats, Redis lease, orders, tickets) is not yet implemented in `core-api`.

## Decision

Per engineering governance ("Do not invent features"), we do not fabricate backend booking business logic during the Nx/Angular architecture migration. Instead:

1. Create a documented module skeleton in `apps/core-api/src/modules/booking/` (`booking.routes.js`, `booking.controller.js`, `booking.service.js`, `booking.repository.js`, `booking.schema.js`, `index.js`, `README.md`) clearly marked `planned`.
2. Create the Redis cache and atomic Lua seat-lease helper skeleton in `apps/core-api/src/platform/cache/` (`redis.js`, `seat-lease.js`) documenting the exact key format (`seat:{showtime_id}:{seat_id}`), 900-second TTL, and Lua compare-and-delete release script.
3. Keep frontend seat selection and checkout flows functional against the client-side `BookingStore` and MSW/deterministic seat state until the backend booking endpoints are implemented in a dedicated feature branch.

## Consequences

- Module boundaries, contracts, and Redis lease interfaces are established and documented without introducing untested or fabricated backend persistence logic.
