# Contributing to d3-three

Thanks for your interest in improving `d3-three`! This guide gets you from a
fresh clone to a green test run in a couple of minutes.

## Prerequisites

- **Node 22** (see [`.nvmrc`](./.nvmrc) — run `nvm use` if you use nvm)
- **pnpm 9** (the repo pins `packageManager` in `package.json`; enable it with
  `corepack enable`)

## Getting started

```bash
git clone https://github.com/fluzzy/d3-three.git
cd d3-three
pnpm install
```

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm test` | Run the Vitest suite (unit + `@react-three/test-renderer`). |
| `pnpm test:watch` | Run Vitest in watch mode. |
| `pnpm typecheck` | `tsc --noEmit` in strict mode. |
| `pnpm build` | Build `dist/` (ESM + CJS + `.d.ts`) with tsup. |
| `pnpm size` | Check the bundle against the size-limit budget. |
| `pnpm lint` | Lint + format check with Biome. |
| `pnpm format` | Auto-format the repo with Biome. |
| `pnpm lint:pkg` | Validate the published package (`publint` + `attw --pack`). |

Before opening a pull request, please make sure these pass locally:

```bash
pnpm typecheck && pnpm test && pnpm build && pnpm size && pnpm lint
```

CI runs the same chain on every pull request and push.

## Running the examples

The demos in [`examples/`](./examples) run against the library **source** (no
build step) via a Vite alias:

```bash
pnpm exec vite --config examples/vite.config.ts
```

Then open the printed local URL in a WebGL-capable browser.

## Commits

We follow the [Conventional Commits](https://www.conventionalcommits.org/)
specification — for example `feat: add ScatterSeries3D sizeBy`,
`fix: avoid frustum-culling charts offset from origin`, or
`docs: clarify Next.js usage`. This keeps the changelog readable and makes the
history easy to scan.

## Good first issues

New here? Look for issues labelled
[`good first issue`](https://github.com/fluzzy/d3-three/labels/good%20first%20issue).
They're scoped to be approachable without deep knowledge of the codebase. If
nothing fits, open an issue describing what you'd like to work on and we'll help
you find a starting point. Questions and small PRs are always welcome.
