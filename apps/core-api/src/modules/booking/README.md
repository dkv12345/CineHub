# Booking Module (`planned`)

> **Status**: `planned` — Skeleton & Contract Definition Only (See [ADR 0006](../../../../docs/adr/0006-booking-module-planned.md))

## Scope

This module defines the architectural boundary and Zod contracts for:

1. **Seat Hold / Lease Acquisition (`POST /api/v1/booking/holds`)**:
   - Atomic Redis seat lease using `SET seat:{showtime_id}:{seat_id} {user_id}:{timestamp} NX EX 900` (`apps/core-api/src/platform/cache/seat-lease.js`).
2. **Seat Hold Release (`DELETE /api/v1/booking/holds/:showtimeId`)**:
   - Releases held seats owned by the user via Lua compare-and-delete script.
3. **Order Checkout & Ticket Issuance (`POST /api/v1/booking/checkout`)**:
   - Validates active Redis leases, executes a `READ COMMITTED` MySQL transaction with row-level locks to persist `Booking`, `BookingSeat`, `BookingConcession`, and `Ticket` records, and deletes the temporary Redis hold keys.
4. **Customer Tickets (`GET /api/v1/booking/tickets`)**:
   - Lists issued tickets with HMAC-signed QR payloads (`apps/core-api/src/platform/utils/qr.js`).

## TODO Checklist

- [ ] Implement `booking.repository.js` Prisma transaction queries (`READ COMMITTED`) for `Booking` and `Ticket` models.
- [ ] Connect `booking.service.js` to `acquireSeatLeases` and `releaseSeatLeases` in `platform/cache/seat-lease.js`.
- [ ] Wire VNPay / ZaloPay / MoMo webhook verification handlers.
- [ ] Add integration tests for concurrent seat locking (`409 SEAT_TAKEN` on contention).
