// @vitest-environment node

import { describe, expect, it } from 'vitest'
import * as api from '../../src/index'

/**
 * Importing the public API under the Node environment (no jsdom, no DOM) proves
 * the package is safe to evaluate server-side (Next.js RSC imports 'use client'
 * modules on the server): nothing touches `document` / `window` at module scope.
 */
describe('SSR import smoke test (no DOM)', () => {
  it('runs without DOM globals', () => {
    expect(typeof document).toBe('undefined')
    expect(typeof window).toBe('undefined')
  })

  it('loads every public runtime export server-side', () => {
    const expected = [
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
    ] as const
    const exported = new Set(Object.keys(api))
    for (const name of expected) {
      expect(exported.has(name), `missing export: ${name}`).toBe(true)
    }
  })
})
