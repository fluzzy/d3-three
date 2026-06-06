import ReactThreeTestRenderer from '@react-three/test-renderer'
import { type MockInstance, afterEach, describe, expect, it, vi } from 'vitest'
import { BarSeries3D } from '../../src/components/BarSeries3D'
import { Chart3D } from '../../src/components/Chart3D'
import { ScatterSeries3D } from '../../src/components/ScatterSeries3D'
import type { Datum } from '../../src/types'

// Under vitest NODE_ENV === 'test', so `isDev` is true and the one-shot dev
// warnings actually fire. Each test spies console.warn and restores it after.
afterEach(() => {
  vi.restoreAllMocks()
})

/** Did console.warn receive any call whose first arg contains `needle`? */
function warnedWith(warn: MockInstance, needle: string): boolean {
  return warn.mock.calls.some((args) => typeof args[0] === 'string' && args[0].includes(needle))
}

function countWarnsWith(warn: MockInstance, needle: string): number {
  return warn.mock.calls.filter((args) => typeof args[0] === 'string' && args[0].includes(needle))
    .length
}

describe('series dev warnings (scale-type mismatch)', () => {
  it('BarSeries3D with a NUMERIC (continuous) x warns once that a band axis is expected', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    // Numeric xKey values => Chart3D builds a continuous (linear) x scale, which
    // is the wrong axis type for bars.
    const data: Datum[] = [
      { x: 1, v: 10 },
      { x: 2, v: 20 },
    ]
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={data} xKey="x" yKey="v">
        <BarSeries3D />
      </Chart3D>,
    )

    expect(warnedWith(warn, 'BarSeries3D expects a categorical (band) x axis')).toBe(true)
    // The message points at ScatterSeries3D as the fix (no more barWidth fallback).
    expect(warnedWith(warn, 'Use ScatterSeries3D for numeric x')).toBe(true)
    // One-shot: exactly once, not per frame.
    expect(countWarnsWith(warn, 'BarSeries3D expects a categorical (band) x axis')).toBe(1)

    await renderer.unmount()
  })

  it('ScatterSeries3D with a STRING (band) x warns that continuous axes are expected', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    // String xKey values => band x scale; zKey set so the unrelated "2D plane"
    // warning is not what we are asserting here.
    const data: Datum[] = [
      { x: 'A', y: 10, z: 1 },
      { x: 'B', y: 20, z: 2 },
    ]
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={data} xKey="x" yKey="y" zKey="z">
        <ScatterSeries3D />
      </Chart3D>,
    )

    expect(warnedWith(warn, 'ScatterSeries3D expects continuous (numeric) x/y/z axes')).toBe(true)

    await renderer.unmount()
  })

  it('ScatterSeries3D without zKey warns that it renders a 2D plane', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    // Continuous numeric x/y but no zKey => the degenerate 2D-plane warning.
    const data: Datum[] = [
      { x: 1, y: 10 },
      { x: 2, y: 20 },
    ]
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={data} xKey="x" yKey="y">
        <ScatterSeries3D />
      </Chart3D>,
    )

    expect(
      warnedWith(warn, 'ScatterSeries3D without zKey renders a 2D plane; consider 2D Recharts'),
    ).toBe(true)

    await renderer.unmount()
  })
})
