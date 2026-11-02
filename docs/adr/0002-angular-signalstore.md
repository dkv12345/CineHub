# ADR 0002: Angular 20+ Standalone, Zoneless & NgRx SignalStore

- **Status**: Accepted
- **Date**: 2026-11-02

## Context

The university curriculum and enterprise specification require migrating the CineHub frontend from React 19 (`store.tsx` Context singleton) to **Angular 20+**. We need a reactive state management architecture that integrates natively with Angular Signals, avoids Zone.js overhead, and scales cleanly across domain libraries.

## Decision

1. **Angular 20+ Standalone & Zoneless**: Use standalone components exclusively with `ChangeDetectionStrategy.OnPush`, `provideExperimentalZonelessChangeDetection()` / `provideZonelessChangeDetection()`, `inject()`, and `@if`/`@for`/`@switch`/`@defer` control flow.
2. **NgRx SignalStore (`@ngrx/signals`)**: Replace the monolithic React `AppContext` (`store.tsx`) with domain-scoped SignalStores in each domain's `data-access` library (`AuthStore`, `CatalogStore`, `ShowtimesStore`, `ConcessionsStore`, `BookingStore`, `TicketsStore`, `AccountStore`, `AssistantStore`) using `withState`, `withComputed`, `withMethods`, `withEntities`, and `rxMethod`.
3. **Single Shared Refresh Observable**: Replace the imperative `isRefreshing` + `failedQueue` array from `authorizedAxios.ts` with a shared RxJS `refresh$` Observable (`shareReplay({ bufferSize: 1, refCount: false })` and `finalize(() => (refresh$ = null))`) in `authInterceptor`.

## Consequences

- Fine-grained reactive updates without Zone.js monkey-patching.
- Each domain owns its state slice and side effects.
- Concurrent `401 TOKEN_EXPIRED` responses trigger exactly one `PUT /api/v1/auth/refresh-token` network call.
