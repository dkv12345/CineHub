# Engineering Guardrails

## Preserve the product

- Treat the current repository as the source of truth for behavior and architecture.
- Do not replace the framework, router, state manager, API client, ORM, authentication solution, or payment integration to achieve a visual redesign.
- Do not change API contracts, database schemas, migrations, authorization rules, or business rules unless explicitly requested or required to fix a confirmed defect.
- Do not remove features because they are difficult to style.
- Do not hardcode production data to make screenshots look populated.

## Before implementation

- Inspect `package.json` or the equivalent project manifest.
- Identify the package manager from lockfiles; do not mix package managers.
- Inspect shared components and style conventions.
- Record the current build/test status if practical.
- Identify the route and component owners for each page.

## While implementing

- Prefer improving an existing component over creating a duplicate.
- Keep components cohesive and avoid giant page components.
- Keep business logic and data transformations out of purely presentational components where the project already separates them.
- Avoid over-abstraction for a one-off component.
- Use semantic HTML and the project's established patterns.
- Use the installed icon library where possible.
- Avoid adding a new package for a visual effect that can be achieved with existing CSS.
- Do not install new fonts or icons without considering licensing, performance, and project conventions.
- Keep responsive behavior in the same styling system already used by the project.
- Do not hide broken functionality behind disabled-looking UI unless the underlying feature is genuinely unavailable.

## Data and state integrity

- Render real API/domain data where available.
- Preserve loading, error, empty, and stale-data behavior.
- Maintain server-side validation for session, seat, price, discount, and payment operations.
- Treat client-side seat state and price summaries as provisional until validated by the backend.
- Keep authentication/authorization checks intact.
- Do not expose private identifiers, payment secrets, or internal data in the UI.

## Asset integrity

- Prefer assets already in the repository or assets the user has permission to use.
- Do not scrape and copy copyrighted movie posters or cinema logos from reference sites into the project.
- Do not fabricate brand marks or movie artwork.
- Use a deliberate missing-image state when no authorized asset exists.
- Give meaningful alt text to informative imagery and empty alt text to purely decorative imagery.

## Git and scope safety

- Do not reset, clean, force-push, or discard user changes.
- Inspect `git status` before editing if Git is available.
- Do not overwrite unrelated files or user work.
- Keep changes scoped to the redesign.
- Summarize changed files and any potentially breaking changes.

## Verification honesty

- Run the actual scripts available in the repository.
- If a command cannot run because a dependency, service, test account, or environment variable is unavailable, report that exact blocker.
- Distinguish “code reviewed” from “run and tested”.
- Do not claim the payment provider, backend, or live booking flow works if only a frontend preview was available.
