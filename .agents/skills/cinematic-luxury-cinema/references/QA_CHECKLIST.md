# QA Checklist — Cinematic Luxury Cinema

Use this checklist after implementation. Mark an item complete only after checking it.

## Visual quality

- [ ] One coherent brand palette is used across all relevant routes.
- [ ] Existing logo/brand assets are preserved where applicable.
- [ ] Typography has a deliberate display/UI pairing and clear hierarchy.
- [ ] No default gradient buttons, gradient text, neon glows, or decorative blur blobs.
- [ ] No unnecessary glassmorphism or excessive pill-shaped controls.
- [ ] Cards, borders, radii, spacing, and iconography are consistent.
- [ ] Movie artwork has correct proportions and intentional crops.
- [ ] The page does not become a repetitive wall of identical cards.
- [ ] Essential text and controls have sufficient contrast.
- [ ] Loading, empty, and error states follow the same design language.

## Product and booking UX

- [ ] The primary navigation is understandable.
- [ ] Users can find Now Showing / Coming Soon where those features exist.
- [ ] Cinema/location context is visible when relevant.
- [ ] Movie details contain accurate available information.
- [ ] Showtimes are easy to scan and selection is clear.
- [ ] Unavailable sessions cannot be mistaken for available sessions.
- [ ] Seat states are distinguishable without relying on color alone.
- [ ] Selected seats and order totals are clear.
- [ ] Checkout summary reflects actual selected data.
- [ ] Validation and payment states are understandable.
- [ ] No visible control is inert or misleading.

## Responsive checks

Test representative viewports: 375px, 390px, 768px, 1280px, and 1440px+.

- [ ] No accidental horizontal page overflow.
- [ ] Navigation remains usable.
- [ ] Hero text and imagery remain composed at narrow widths.
- [ ] Poster cards remain readable and touch-friendly.
- [ ] Filters and date/session selectors remain usable.
- [ ] Seat selection remains operable on touch screens.
- [ ] Sticky elements do not cover content or actions.
- [ ] Dialogs, drawers, and menus fit the viewport.

## Accessibility

- [ ] Keyboard navigation works for menus, forms, dialogs, and booking controls.
- [ ] Focus indicators are visible.
- [ ] Inputs have labels.
- [ ] Buttons and icon-only actions have accessible names.
- [ ] Images have appropriate alt text.
- [ ] Status is not conveyed by color alone.
- [ ] Reduced-motion preferences are respected.
- [ ] Text contrast is checked for small and secondary text.

## Functional regression

- [ ] Existing routes still resolve.
- [ ] Authentication/session behavior is preserved.
- [ ] API calls and request/response contracts are unchanged unless documented.
- [ ] Filters and search operate on real data.
- [ ] Booking/session/seat selection uses real product state.
- [ ] Server-side validation remains authoritative.
- [ ] Payment integration is not simulated or bypassed.
- [ ] Booking history and confirmation display correct statuses.
- [ ] No new console errors or broken assets are present.

## Build and tests

- [ ] Build command executed; result recorded.
- [ ] Lint command executed if available; result recorded.
- [ ] Type check executed if available; result recorded.
- [ ] Relevant automated tests executed if available; result recorded.
- [ ] Manual smoke test of the main booking flow completed where environment allows.
- [ ] Remaining blockers and unverified behaviors documented.

## Anti-AI final review

Ask a human reviewer:

1. Does this look like a real cinema product with a distinct brand, not a generated template?
2. Is every decorative effect earning its place?
3. Can a first-time user quickly identify what is showing and how to book?
4. Does the interface still feel premium when all animations are disabled?
5. Are typography, spacing, image crops, and alignment visibly intentional?

If any answer is no, refine the interface before calling the redesign complete.
