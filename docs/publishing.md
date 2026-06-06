# Publishing

How `d3-three` is built and released to npm. (Maintainer reference.)

## Build tooling — what you need

Only **one** build tool is a direct dependency: [`tsup`](https://tsup.egoist.dev). You do **not** install `rollup`, `esbuild`, or `webpack` yourself — tsup pulls them in:

| Output | Tool (provided by tsup) |
| --- | --- |
| `dist/index.mjs` (ESM), `dist/index.js` (CJS) | esbuild |
| `dist/index.d.ts` / `.d.mts` (types) | rollup + rollup-plugin-dts |
| `'use client'` directive at the top of each bundle | tsup `onSuccess` post-step (esbuild strips a banner directive, so it's re-added after build) |

```bash
pnpm build      # tsup → dist/  (ESM + CJS + d.ts + sourcemaps)
```

`package.json` wires the outputs up via the `exports` map (types-first), with legacy `main`/`module`/`types` for older tooling, and `sideEffects: false` for tree-shaking.

## Pre-publish checklist

```bash
pnpm typecheck      # tsc --noEmit (strict)
pnpm test           # vitest (unit + @react-three/test-renderer)
pnpm build          # produce dist/
pnpm size           # size-limit (< 25 KB gzip budget)
npm pack --dry-run  # inspect the exact tarball contents
```

`npm pack --dry-run` should list only `dist/`, `README.md`, `LICENSE`, and `package.json` (the `files` field excludes `src/`).

Optional but recommended package-correctness checks:

```bash
npx publint                       # validates exports / main / module / types
npx @arethetypeswrong/cli --pack  # checks ESM/CJS type resolution
```

## Publish

```bash
# 1. bump version (updates package.json + creates a git tag)
npm version patch        # or minor / major

# 2. publish (public, with provenance attestation)
npm publish --access public --provenance
```

`--provenance` requires publishing from CI (e.g. GitHub Actions) with `id-token: write` permission, and adds a verified build-provenance badge on npm. For a manual first publish you can drop `--provenance`.

### Automating with GitHub Actions (optional)

Publish on tag push:

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    tags: ['v*']
permissions:
  contents: read
  id-token: write          # required for --provenance
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          registry-url: https://registry.npmjs.org
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck && pnpm test && pnpm build && pnpm size
      - run: npm publish --access public --provenance
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## After publishing

Consumers install with `npm install d3-three` plus the peers (`react`, `react-dom`, `three`, `@react-three/fiber`). See [`./getting-started.md`](./getting-started.md).
