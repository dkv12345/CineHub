# TODO

## A. Mismatches between outline, skills, diagrams and code (reported to the user)

1. **Two skill files conflict.** `SKILL-2.md` describes a six-chapter report, output under `report/`, and `[INSERT FIGURE n.n]` numbering. `SKILL-3.md` describes the seven-chapter outline in `FinalReport_CineHub.pdf`, output under `docs/report/`, and `Figure <leaf>-<n>` numbering. The outline PDF has seven chapters, so `SKILL-3.md` was followed. Confirm.
2. **Outline PDF vs `SKILL-3.md` corrections.** The PDF Chapter 3 title is "System Analysis and Proposed Design" and the PDF lacks 1.7, 3.6.1–3.6.3 and Appendix K. `SKILL-3.md` renames Chapter 3 to "System Analysis" and restores them. Confirm the title.
3. **Skill preflight paths are outdated.** The skills mention `services/core-api`, `apps/web/src/pages`, `packages/db`, React `router.tsx`. The real paths are `apps/core-api`, `libs/web/*`, `libs/db`, Angular `*.routes.ts`. The report follows the real repository.
4. **Frontend:** Angular 20 is present and the React code was removed (commit `3a96fed`). Some docs still mention Vite (`docs/ai/chatbot-and-recommendations.md`). README says `renderMode` and SSR; verify in Chapter 6.
5. **Booking backend is not implemented** (HTTP 501, ADR 0006). The PCCV has detailed diagrams D39–D42, D48–D52 for it. These are `Designed` in the report.
6. **Payment code vs rules:** IPN handler does not verify signature (`verifyMomoSignature` is never called); payment model is Mongoose, not MySQL; the browser treats the return URL as proof of payment. Hard-coded sandbox credentials and fallback secrets exist in `apps/core-api/src/modules/payment/*.js`. **Do not quote them in the report.** Recommend moving them to environment variables and rotating them.
7. **Seat availability is simulated** (`generateAuditoriumSeats` hash rule).
8. **Admin console and staff check-in** have PCCV diagrams (D43, D47) but no code.
9. **Git authorship:** the history records three author identities (about 99, 13 and 9 non-merge commits). Contribution of all five members must be documented in Appendix J.
10. **PCCV note:** "report captures screenshots, not wireframes" (D54 row note). Chapter 5 follows this.
11. **Docs vs code:** `docs/ai` says vectors are searched with a vector index; `jobs/embed-movies.js` falls back to in-memory cosine when Atlas Search is unavailable. State which runs in the team's environment.

## B. Open items by type

- `TODO-CONFIRM`: supervisor, course, date (title page); citation style; whether any stakeholder or survey informed requirements (1.5.1); Chapter 3 title; skill choice.
- `TODO-DATA`: run `npm test` and CI; capture totals (7.2); concurrency, load and usability data (7.3, 7.4, 5.12).
- `CITATION NEEDED`: 1.1.1 (online ticketing adoption).
- `ACCESS DATE TO CONFIRM`: references [1]–[6].

## C. Chapter status

| File                                  | Status               |
| ------------------------------------- | -------------------- |
| `EVIDENCE_LOG.md`                     | Written (this audit) |
| `01-introduction.md`                  | Written              |
| `02` – `07`, appendices, front matter | Not started          |
