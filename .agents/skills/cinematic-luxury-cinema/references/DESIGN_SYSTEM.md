# Design System — Cinematic Luxury

This is a starting system, not a mandate to overwrite a valid existing brand. Inspect the product identity first and adapt the values to the existing stack.

## 1. Color foundations

Suggested default palette:

| Token          | Value     | Use                                      |
| -------------- | --------- | ---------------------------------------- |
| Canvas         | `#11100F` | Main page background                     |
| Surface        | `#191816` | Header, panels, base cards               |
| Surface raised | `#211F1C` | Menus, selected panels, elevated areas   |
| Surface inset  | `#0B0B0A` | Deep image/seat-map sections when needed |
| Text primary   | `#F2EEE6` | Main text on dark surfaces               |
| Text secondary | `#B9B1A5` | Supporting text                          |
| Text muted     | `#91897E` | Low-priority metadata; verify contrast   |
| Border         | `#39352F` | Dividers and component outlines          |
| Accent         | `#C2A16B` | Restrained champagne/brass details       |
| Accent hover   | `#D0B47F` | Hover/focus accent where needed          |
| Action surface | `#F2EEE6` | Primary filled button                    |
| Action text    | `#171512` | Text on primary button                   |
| Danger         | `#D77870` | Errors and destructive states            |
| Success        | `#8FB49A` | Confirmed states                         |
| Warning        | `#D3AC65` | Warnings and pending states              |

Rules:

- Do not use all palette colors equally. Most UI should be charcoal, warm white, and neutral gray.
- Champagne is a detail color, not a fill color for every button or card.
- If the project already has a recognizable brand color, preserve it as the dominant accent and adjust the rest of the palette around it.
- Do not use pure black for every surface or pure white for every text element.
- Never rely on color alone for seat status, payment state, or form validation.
- Check actual contrast for small text and controls.

## 2. Typography

Recommended pairing:

- Editorial/display: `Newsreader` (or an existing high-quality editorial serif already used by the project).
- Product/UI: `IBM Plex Sans` (or an existing neutral, highly legible sans-serif).

Fallback stacks:

- Display: `Newsreader, Iowan Old Style, Palatino Linotype, Georgia, serif`.
- UI: `IBM Plex Sans, Helvetica Neue, Arial, sans-serif`.

Rules:

- Use display serif selectively for hero titles, film/editorial feature headings, and occasional section titles.
- Use the UI sans-serif for navigation, body copy, metadata, forms, controls, prices, seat labels, and buttons.
- Use no more than two font families unless the existing brand system gives a strong reason.
- Use a restrained set of weights. Avoid using every weight from 100 to 900.
- Avoid defaulting to Poppins, Montserrat, Inter, or Space Grotesk simply because they are common in generated templates. They are not categorically prohibited, but must be justified by the brand and existing project.
- Load fonts only through an approved source or existing local assets. Prefer self-hosted assets when the project already has a font pipeline. Provide a sensible fallback.
- Do not download unlicensed font files.

Suggested hierarchy (adapt responsively):

| Role        | Desktop guidance | Notes                                             |
| ----------- | ---------------- | ------------------------------------------------- |
| Display     | 56–80px          | Hero/editorial only; responsive clamp             |
| H1          | 40–56px          | One clear page title                              |
| H2          | 28–36px          | Main section title                                |
| H3          | 20–24px          | Component/section heading                         |
| Body large  | 17–18px          | Introductory copy                                 |
| Body        | 15–16px          | Main product text                                 |
| Metadata    | 13–14px          | Runtime, genre, cinema details; maintain contrast |
| Micro-label | 11–12px          | Use sparingly; not for essential instructions     |

## 3. Layout and spacing

- Desktop content max width: approximately 1280–1360px unless the existing product requires wider data tables.
- Desktop grid: 12 columns with consistent gutters.
- Side padding: fluid, commonly 24–64px depending on viewport.
- Base spacing rhythm: 4, 8, 12, 16, 24, 32, 48, 64, 80, 96px.
- Use consistent vertical section spacing; do not choose arbitrary gaps for every component.
- Keep important booking controls close to the context that explains them.
- Avoid both edge-to-edge cramped layouts and excessive empty space.

## 4. Shape, borders, and elevation

- Default radius: 2–6px for buttons, inputs, poster frames, and functional panels.
- Larger radii are allowed only when an existing brand component or interaction genuinely calls for them.
- Avoid turning every component into a pill or rounded card.
- Prefer thin, low-contrast borders and tonal surface differences over floating-card shadows.
- Use shadows sparingly; on dark surfaces, excessive shadow is often invisible or muddy.
- Keep a consistent border thickness and focus treatment.

## 5. Buttons and controls

Primary action:

- Solid warm-ivory fill with dark text in the default palette.
- No gradient.
- Clear verb-led label such as “Book tickets”, “Choose seats”, or “Continue”.
- Strong hover, active, focus-visible, disabled, and loading states.

Secondary action:

- Transparent or surface background with a fine border.
- Use clear text contrast and a visible focus state.

Tertiary action:

- Text button or link; do not style every action as a filled button.

Inputs:

- Visible labels; placeholders are examples, not labels.
- Consistent height, spacing, border, focus, invalid, and disabled states.
- Form errors should be concise, actionable, and associated with the relevant field.

## 6. Movie imagery

- Poster ratio: approximately 2:3.
- Wide film still/feature ratio: choose an intentional ratio such as 16:9 or 2.2:1 based on the asset and composition.
- Do not crop titles, faces, or key visual details unintentionally.
- Avoid placing important copy over busy imagery without a contrast treatment.
- Use actual project-provided/licensed images. If missing, use a designed neutral placeholder and clearly handle missing content.
- Lazy-load off-screen images where appropriate; prioritize the main hero image when it is the primary content.

## 7. Motion and interaction

- Typical transition duration: 140–220ms.
- Use motion for state change, orientation, and feedback—not decoration.
- Avoid looping ambient animations and large parallax effects.
- Respect `prefers-reduced-motion`.
- Hover states must not be the only way to discover important controls.

## 8. Iconography

- Use the icon library already installed in the project.
- Keep stroke weight and size consistent.
- Use icons to clarify actions, not decorate empty space.
- Avoid mixing emoji, multiple icon families, and arbitrary SVG styles.

## 9. Responsive behavior

Test at 375px, 390px, 768px, 1280px, and 1440px or larger.

- Navigation should collapse intentionally, not overflow.
- Poster rails should remain scannable and touch-friendly.
- Filters should be accessible without covering essential content.
- Booking summaries may become sticky only if they do not cover the seat map or primary action.
- Seat maps must remain operable on touch devices and must not require pixel-perfect tapping.
- Avoid horizontal scrolling except for intentional, clearly signposted poster rails or date/session rails.
