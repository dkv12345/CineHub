# ADR 0004: Hybrid SSR & Client Render Modes

- **Status**: Accepted
- **Date**: 2026-11-02

## Context

Public catalog discovery pages (`Home`, `MovieDetail`, `Showtimes`) benefit from fast First Contentful Paint (FCP) and SEO metadata via Server-Side Rendering (SSR), whereas interactive transactional pages (`Seats` with WebGL/Three.js, `Checkout`, `Result`, `MyTickets`, `Profile`) rely heavily on browser-only APIs (`WebGLRenderingContext`, `localStorage`, session state).

## Decision

1. Enable `@angular/ssr` with incremental client hydration (`provideClientHydration(withEventReplay())`).
2. Configure hybrid server routing (`app.routes.server.ts`):
   - Public catalog and showtime routes render on the server (`RenderMode.Server`).
   - Transactional, authenticated, and WebGL-heavy routes (`seats`, `concessions`, `checkout`, `result`, `tickets`, `profile`, `auth`, `verify-email`, `reset-password`) use client rendering (`RenderMode.Client`).
3. Guard all browser-only APIs (`localStorage`, `window`, WebGL/Three.js, Google Identity Services script) with `isPlatformBrowser(inject(PLATFORM_ID))`.

## Consequences

- Public pages render on the server without `window`/`localStorage` ReferenceErrors.
- Three.js and browser-specific flows execute strictly on the client outside `NgZone`.
