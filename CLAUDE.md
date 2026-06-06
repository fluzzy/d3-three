# d3-three — project notes (for Claude)

A small library that drops D3-powered 3D chart marks into an existing React Three
Fiber (R3F) `<Canvas>`. It owns the chart math (scales, axes, instancing), not the
scene: lighting, camera, and the `<Canvas>` itself stay the host app's responsibility.

## Public surface (v0.1)

- `<Chart3D>` — non-rendering context root; validates data and builds shared d3
  scales, exposed to descendants via `useChart3D()`.
- `<BarSeries3D>` — instanced bars (one `InstancedMesh` draw call per series).
- `<ScatterSeries3D>` — instanced points.
- `<Axis3D>` — axis line, ticks, and sprite labels derived from the context scales.
- `useChart3D()` — read the chart context (scales, bounds, domain, dimensions).

Hover is imperative (`setColorAt` + `invalidate`) so highlighting a mark triggers
**zero** React re-renders of the series subtree.

## Design constraints

- Runtime dependencies are limited to `d3-scale` and `d3-array` (named imports
  only) plus the peers (`three`, `@react-three/fiber`, `react`).
- Bundle budget: **< 25 KB gzip**, enforced by a `size-limit` gate in CI.
- The build prepends a `'use client'` banner so the package works under the
  Next.js App Router (RSC).
- One series type per `<Chart3D>`: bars need a band x axis, scatter a linear one,
  so mixing them collides on the x scale (guarded by a dev warning).

## Commands

- `pnpm test` — run the vitest suite (`vitest run`)
- `pnpm build` — build ESM + CJS bundles with tsup
- `pnpm typecheck` — `tsc --noEmit`
- `pnpm lint` / `pnpm format` — Biome
- `pnpm size` — check the bundle against the size-limit budget

## Conventions

- Conventional Commits, written in English; one concern per commit.
