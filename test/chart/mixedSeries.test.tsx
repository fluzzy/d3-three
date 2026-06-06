import ReactThreeTestRenderer from '@react-three/test-renderer'
import { type MockInstance, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Datum } from '../../src/types'

// The mixed-series warning is one-shot (module-scoped guard), so each test gets
// a fresh module copy via resetModules + dynamic import to stay order-independent.
async function loadComponents() {
  const chart = await import('../../src/components/Chart3D')
  const bar = await import('../../src/components/BarSeries3D')
  const scatter = await import('../../src/components/ScatterSeries3D')
  return {
    Chart3D: chart.Chart3D,
    BarSeries3D: bar.BarSeries3D,
    ScatterSeries3D: scatter.ScatterSeries3D,
  }
}

const MIXED_NEEDLE = 'One series type per <Chart3D>'

function warnedWith(warn: MockInstance, needle: string): boolean {
  return warn.mock.calls.some((args) => typeof args[0] === 'string' && args[0].includes(needle))
}

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('Chart3D mixed-series detection', () => {
  it('warns when BarSeries3D and ScatterSeries3D are mixed under one Chart3D', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { Chart3D, BarSeries3D, ScatterSeries3D } = await loadComponents()
    const data: Datum[] = [
      { x: 'A', y: 10 },
      { x: 'B', y: 20 },
    ]
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={data} xKey="x" yKey="y">
        <BarSeries3D />
        <ScatterSeries3D />
      </Chart3D>,
    )

    expect(warnedWith(warn, MIXED_NEEDLE)).toBe(true)

    await renderer.unmount()
  })

  it('does NOT warn for a single BarSeries3D', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { Chart3D, BarSeries3D } = await loadComponents()
    const data: Datum[] = [
      { x: 'A', y: 10 },
      { x: 'B', y: 20 },
    ]
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={data} xKey="x" yKey="y">
        <BarSeries3D />
      </Chart3D>,
    )

    expect(warnedWith(warn, MIXED_NEEDLE)).toBe(false)

    await renderer.unmount()
  })

  it('does NOT warn for a single ScatterSeries3D', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { Chart3D, ScatterSeries3D } = await loadComponents()
    const data: Datum[] = [
      { x: 1, y: 10, z: 1 },
      { x: 2, y: 20, z: 2 },
    ]
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={data} xKey="x" yKey="y" zKey="z">
        <ScatterSeries3D />
      </Chart3D>,
    )

    expect(warnedWith(warn, MIXED_NEEDLE)).toBe(false)

    await renderer.unmount()
  })
})
