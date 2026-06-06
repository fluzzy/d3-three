import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'

/**
 * Build + bundle gates as executable tests.
 *
 * The rest of the suite proves runtime behavior against `src`; nothing else
 * exercises the *built artifact* or the size budget. These tests close that gap:
 * they build once, then assert the dist shape, the SSR `'use client'` banner,
 * the ESM/CJS module formats, the absence of a default export, and that
 * `size-limit` runs and reports under the 25 KB budget.
 */

const ROOT = resolve(__dirname, '..')
const DIST = resolve(ROOT, 'dist')
const ESM = resolve(DIST, 'index.mjs')
const CJS = resolve(DIST, 'index.js')
const DTS = resolve(DIST, 'index.d.ts')
const DMTS = resolve(DIST, 'index.d.mts')

function run(cmd: string, args: string[]): string {
  return execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

describe('build output, dist banner, and size-limit gate', () => {
  beforeAll(() => {
    // Build the artifact under test. tsup's `clean: true` wipes dist itself, so
    // we always get a fresh build (no stale-output false positives). Generous
    // timeout: tsup + dts emit takes a couple seconds.
    run('pnpm', ['exec', 'tsup'])
  }, 120_000)

  it('emits ESM + CJS bundles, sourcemaps, and dual .d.ts/.d.mts type entries', () => {
    expect(existsSync(ESM)).toBe(true)
    expect(existsSync(CJS)).toBe(true)
    expect(existsSync(`${ESM}.map`)).toBe(true)
    expect(existsSync(`${CJS}.map`)).toBe(true)
    // Both CJS (.d.ts) and ESM (.d.mts) type entries exist (package.json exports).
    expect(existsSync(DTS)).toBe(true)
    expect(existsSync(DMTS)).toBe(true)
  })

  it("prepends the SSR `'use client'` banner to BOTH the ESM and CJS bundles", () => {
    // The directive must be the very first thing in the file so Next.js App
    // Router (RSC) treats d3-three as a client module.
    const esm = readFileSync(ESM, 'utf8')
    const cjs = readFileSync(CJS, 'utf8')
    expect(esm.startsWith("'use client';") || esm.startsWith('"use client";')).toBe(true)
    expect(cjs.startsWith("'use client';") || cjs.startsWith('"use client";')).toBe(true)
  })

  it('ships an ESM bundle (export) and a CJS bundle (module.exports), no default export', () => {
    const esm = readFileSync(ESM, 'utf8')
    const cjs = readFileSync(CJS, 'utf8')
    // ESM uses `export { ... }`; CJS assigns onto the `exports` object (tsup emits
    // `exports.Chart3D = Chart3D` etc.) — proves the two formats really differ.
    expect(esm).toMatch(/\bexport\s*\{/)
    expect(cjs).toMatch(/\bexports\.Chart3D\s*=/)
    expect(esm).not.toMatch(/\bexports\.Chart3D\s*=/)
    // No default export in the built ESM surface (named-only).
    expect(esm).not.toMatch(/export\s+default\b/)
    expect(esm).not.toMatch(/export\s*\{[^}]*\bdefault\b/)
  })

  it('does NOT bundle the peer deps (three / @react-three/fiber / react) into dist', () => {
    // size-limit ignores peers; the bundle must externalize them so it stays tiny.
    const esm = readFileSync(ESM, 'utf8')
    // The peers are imported, never inlined: an import specifier for them remains.
    expect(esm).toMatch(/from\s*['"]three['"]/)
    expect(esm).toMatch(/from\s*['"]@react-three\/fiber['"]/)
    // d3-scale / d3-array are runtime deps and also external (not inlined).
    expect(esm).toMatch(/from\s*['"]d3-scale['"]/)
  })

  it('runs size-limit and reports the ESM gzip bundle UNDER the 25 KB budget', () => {
    const out = run('pnpm', ['exec', 'size-limit', '--json'])
    const report = JSON.parse(out) as Array<{
      name: string
      passed: boolean
      size: number
      sizeLimit: number
    }>
    expect(report.length).toBeGreaterThan(0)
    const esm = report.find((r) => r.name.includes('ESM'))
    expect(esm).toBeDefined()
    // The gate is 25 KB gzip (25000 bytes via size-limit "25 KB").
    expect(esm!.sizeLimit).toBe(25_000)
    // Measurement actually ran (non-zero) and passed the budget.
    expect(esm!.size).toBeGreaterThan(0)
    expect(esm!.size).toBeLessThanOrEqual(25_000)
    expect(esm!.passed).toBe(true)
  })
})
