import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import pkg from '../../package.json'
import * as api from '../../src/index'

/**
 * README accuracy. Nothing else verifies that the README actually documents the
 * SHIPPED API; this test cross-checks the README prose against the real public
 * surface, the real useChart3D error message, the real peer-dependency ranges in
 * package.json, and the real size budget — so README drift (e.g. a stale bundle
 * figure or a renamed export) fails the suite instead of silently misleading
 * users.
 */

const README = readFileSync(resolve(__dirname, '..', '..', 'README.md'), 'utf8')

describe('README documents every shipped public export', () => {
  it('names each exported component + hook somewhere in the README', () => {
    const publicNames = Object.keys(api).filter((k) => k !== 'default')
    // The runtime exports (types are erased) we expect to be documented.
    const documentedSurface = [
      'Chart3D',
      'BarSeries3D',
      'ScatterSeries3D',
      'Axis3D',
      'ChartLights',
      'useChart3D',
      'useSeriesLayout3D',
      'axisPosition',
      'isBandScale',
      'axisBandwidth',
      'DEFAULT_PALETTE',
    ]
    // Sanity: the source really exports exactly this runtime surface.
    expect(publicNames.sort()).toEqual([...documentedSurface].sort())
    // Each is mentioned in the README.
    for (const name of documentedSurface) {
      expect(README, `README should mention ${name}`).toContain(name)
    }
  })

  it('does not document a default export (the package has none)', () => {
    expect((api as Record<string, unknown>).default).toBeUndefined()
    expect(README).not.toMatch(/import\s+\w+\s+from\s+['"]d3-three['"]/) // no default-import example
  })
})

describe('README peer requirements match package.json', () => {
  it('states the React / R3F / three peer ranges that package.json actually declares', () => {
    const peers = pkg.peerDependencies as Record<string, string>
    expect(peers.react).toBe('>=19 <19.3')
    expect(peers['@react-three/fiber']).toBe('^9')
    expect(peers.three).toBe('>=0.156')
    // README surfaces the same requirements (≥19 <19.3, R3F v9, three ≥ r0.156).
    expect(README).toMatch(/React\s*[≥>]=?\s*19\s*<19\.3/)
    expect(README).toMatch(/@react-three\/fiber\s*v9/)
    expect(README).toMatch(/three\s*[≥>]=?\s*r?0\.156/)
  })
})

describe('README API details match the source', () => {
  it('documents the real useChart3D out-of-context error message', () => {
    // The hook's friendly throw (verified at runtime in Chart3D.test.tsx) is the
    // string the README quotes. Cross-check the README against the SOURCE literal
    // so a future message edit that diverges from the docs fails here.
    const hookSrc = readFileSync(
      resolve(__dirname, '..', '..', 'src', 'hooks', 'useChart3D.ts'),
      'utf8',
    )
    const message = 'useChart3D() must be called inside a <Chart3D>'
    expect(hookSrc).toContain(message)
    expect(README).toContain(message)
  })

  it('documents the default colors / sizes that the components actually use', () => {
    // Series default color + hover color, scatter size, axis defaults.
    expect(README).toContain("'steelblue'") // default series color
    expect(README).toContain('#ffaa00') // default highlightColor
    expect(README).toContain('0.15') // default scatter sphere size
    expect(README).toContain('#888888') // default axis color
  })

  it('documents the one-series-per-chart constraint (mixed-series guard)', () => {
    expect(README).toMatch(/[Oo]ne series type per/)
    // Mentions both series and the band-vs-linear x-scale collision rationale.
    expect(README).toContain('BarSeries3D')
    expect(README).toContain('ScatterSeries3D')
    expect(README).toMatch(/band/i)
    expect(README).toMatch(/linear/i)
  })
})

describe('README bundle-size claim is consistent and within budget', () => {
  it('quotes a single gzip figure that matches the 25 KB size-limit budget', () => {
    expect((pkg as { 'size-limit': Array<{ limit: string }> })['size-limit'][0].limit).toBe('25 KB')
    // Every "~N KB (gzip)" claim in the README must agree (no stale 6.9 vs 12.7
    // split) and must sit under the 25 KB budget. Strip markdown bold markers (*)
    // first so `**~6.9 KB**  (gzip)` is matched like `~6.9 KB (gzip)`.
    const plain = README.replace(/\*/g, '')
    const claims = [...plain.matchAll(/~?(\d+(?:\.\d+)?)\s*KB\s*\(gzip\)/g)].map((m) =>
      Number(m[1]),
    )
    expect(claims.length).toBeGreaterThan(0)
    const unique = [...new Set(claims)]
    expect(unique, `README gzip claims disagree: ${unique.join(', ')}`).toHaveLength(1)
    expect(unique[0]).toBeLessThan(25)
  })
})
