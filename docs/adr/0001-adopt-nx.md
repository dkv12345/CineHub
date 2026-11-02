# ADR 0001: Adopt Nx Monorepo & Enforced Module Boundaries

- **Status**: Accepted
- **Date**: 2026-11-02

## Context

CineHub started as a basic npm-workspaces repository (`apps/web`, `services/core-api`, `services/aggregator`, `packages/db`, `packages/shared`) without task caching, affected-graph calculation, or fine-grained domain boundary enforcement. As the frontend migrates to Angular 20+ with domain-sliced libraries (`shell`, `core`, `feature`, `data-access`, `ui`, `util`), unguarded imports risk creating circular dependencies and coupling across domains.

## Decision

We adopt **Nx** over the existing single-lockfile npm workspace:

1. Configure `nx.json` with task caching (`build`, `test`, `lint`), `namedInputs`, and `nx affected` support in CI.
2. Assign every project in `apps/*` and `libs/*` a `project.json` with explicit `scope:*` (`scope:web`, `scope:server`, `scope:shared`) and `type:*` (`type:app`, `type:shell`, `type:feature`, `type:data-access`, `type:ui`, `type:util`) tags.
3. Enforce dependency constraints at lint time via `@nx/enforce-module-boundaries` in `eslint.config.js`.

## Consequences

- CI runs only tasks affected by a PR (`nx affected -t lint test build`).
- Features cannot import other features; web projects cannot import server/db libraries; shared contracts remain pure.
