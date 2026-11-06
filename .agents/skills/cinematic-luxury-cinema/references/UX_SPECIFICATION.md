# Product UX Specification — Cinema Booking

Adapt this guide to the routes and features that actually exist. Do not add a feature merely because it appears here.

## 1. Global navigation

The global shell should help users answer three questions quickly:

1. Where can I watch?
2. What can I watch?
3. How do I book?

Recommended navigation concepts, if supported:

- Movies / Now Showing.
- Coming Soon.
- Cinemas / Locations.
- Offers or Membership.
- Account / Sign in.

Keep the header calm and compact. Use the product logo, not a text-only imitation. Make location context clear when it affects showtimes. On mobile, keep the main booking entry point discoverable without obstructing content.

## 2. Homepage

The homepage should prioritize discovery and booking, not generic marketing statements.

Suggested hierarchy:

1. Header and location context.
2. Featured film / campaign area with a relevant, real CTA.
3. Now Showing.
4. Coming Soon or Advance Screenings if supported.
5. Browse by cinema, date, or category where useful.
6. Actual offers, experiences, or membership content if present.
7. Footer with support and key navigation.

Do not place every possible section on the homepage. Use actual product data and prioritize the actions users take most often.

## 3. Movie listing / discovery

Users should be able to scan the available films and understand:

- Poster and title.
- Relevant rating/age classification where available.
- Runtime, genre, language, and format where available.
- Whether the film is currently bookable or upcoming.
- The next useful action.

Search and filters should reflect the real data model. Avoid filter controls that do not affect results. Keep applied filters visible and provide a clear reset path.

## 4. Movie detail

Recommended content hierarchy:

1. Poster or cinematic key art.
2. Film title and essential metadata.
3. Short synopsis.
4. Trailer or media action if available.
5. Cinema/date/session discovery.
6. Cast, director, format, and additional details when available.

The booking action should be attached to a real selection context. Do not show a “Book now” button that leads nowhere or lacks the information required to continue.

## 5. Cinema, date, and showtime selection

- Make the selected cinema and date obvious.
- Make available showtimes easy to scan.
- Show language, format, experience type, and price only when supported by the API/data.
- Differentiate unavailable and selectable sessions with both text/state and visual styling.
- Preserve server-side availability checks; client-side presentation is not authoritative.
- If there are multiple ways to begin booking (movie-first or cinema-first), support only the routes that exist in the product.

## 6. Seat selection

This is a high-risk interaction surface and must be tested carefully.

The interface should explain:

- Screen orientation.
- Seat rows and seat identifiers.
- Available, selected, sold/unavailable, blocked, and accessible seats where those states exist.
- Price/category differences where applicable.
- How many seats are selected and the current subtotal.

Requirements:

- Do not rely on color alone; use labels, patterns, shapes, or accessible semantics where appropriate.
- Provide a visible legend.
- Selected seats must be unmistakable.
- Make tap targets usable on mobile; consider zoom/pan or a responsive layout if the auditorium is wide.
- Do not allow selection beyond server/product limits.
- Revalidate availability before payment/confirmation.
- Do not invent a seat-hold countdown unless the backend actually provides and enforces it.
- If the backend supports it, expose seat availability early so users can judge whether a session is suitable before committing to later steps. Do not force a seat-first sequence that conflicts with existing business rules.

## 7. Checkout and payment

Keep the checkout focused and reassuring.

Show a clear order summary containing only real selected data:

- Film.
- Cinema and auditorium if available.
- Date and time.
- Seat identifiers and ticket types.
- Ticket subtotal.
- Applicable discounts, fees, and concessions.
- Final payable amount.

Requirements:

- Clearly show the current step and next action.
- Preserve validation and server-side price calculation.
- Do not trust client-provided totals or payment status.
- Prevent accidental double submission where appropriate.
- Provide useful loading, payment-pending, failed, and successful states.
- Never fake payment success for visual convenience.

## 8. Confirmation and booking history

- Display the actual booking/payment status.
- Show a ticket code or QR only if the existing secure implementation provides it.
- Make the next action clear: view ticket, return to movies, or view booking history.
- Provide empty states for users with no bookings.

## 9. Account and authentication

- Keep sign-in, sign-up, profile, and password recovery consistent with the product system.
- Use explicit labels and accessible validation.
- Preserve session, token, role, and permission behavior.
- Avoid turning authentication into a decorative marketing page.

## 10. Admin surfaces

If present, admin pages are operational tools. They may use denser tables, filters, forms, and status indicators. Share colors, typography, and spacing tokens, but do not force the consumer-facing editorial composition onto data-heavy workflows.

## 11. Core journey to verify

When the application supports the full journey, verify:

`Discover movie → Open movie detail → Choose cinema/date/session → Select seats → Review order → Complete payment → View confirmation/ticket`

Also test the relevant alternate entry point, such as `Choose cinema → Browse sessions → Select movie/session`, if it exists.
