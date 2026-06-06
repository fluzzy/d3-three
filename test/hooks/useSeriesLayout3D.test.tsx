import ReactThreeTestRenderer from '@react-three/test-renderer'
import type { ReactThreeTest } from '@react-three/test-renderer'
import * as THREE from 'three'
import { describe, expect, it, vi } from 'vitest'
import { Chart3D } from '../../src/components/Chart3D'
import { ScatterSeries3D } from '../../src/components/marks/ScatterSeries3D'
import { axisPosition } from '../../src/core/scales'
import { useSeriesLayout3D } from '../../src/hooks/useSeriesLayout3D'
import type { SeriesLayout3D } from '../../src/hooks/useSeriesLayout3D'
import type { Chart3DContextValue } from '../../src/types'

type TestInstance = ReactThreeTest.ReactThreeTestInstance

function findMesh(scene: TestInstance): THREE.InstancedMesh {
  const node = scene.find((n) =>
    Boolean(n.instance && (n.instance as THREE.InstancedMesh).isInstancedMesh),
  )
  return node.instance as THREE.InstancedMesh
}

/** World-space position of instance `i`. */
function position(mesh: THREE.InstancedMesh, i: number): THREE.Vector3 {
  const m = new THREE.Matrix4()
  const pos = new THREE.Vector3()
  const quat = new THREE.Quaternion()
  const scl = new THREE.Vector3()
  mesh.getMatrixAt(i, m)
  m.decompose(pos, quat, scl)
  return pos
}

const BANDS = [
  { m: 'Jan', v: 10 },
  { m: 'Feb', v: 20 },
  { m: 'Mar', v: 30 },
]

const POINTS = [
  { x: 1, y: 2, z: 3 },
  { x: 4, y: 5, z: 6 },
  { x: 7, y: 8, z: 9 },
]

describe('useSeriesLayout3D outside <Chart3D>', () => {
  it('rejects with the friendly useChart3D error', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    function Probe() {
      useSeriesLayout3D()
      return null
    }
    await expect(ReactThreeTestRenderer.create(<Probe />)).rejects.toThrow(
      /useChart3D\(\) must be called inside a <Chart3D>/,
    )
    errorSpy.mockRestore()
  })
})

describe('useSeriesLayout3D matches the built-in mark positions', () => {
  it('row x/y/z equal the ScatterSeries3D instance world positions', async () => {
    let layout: SeriesLayout3D | undefined
    function Cap() {
      layout = useSeriesLayout3D()
      return null
    }
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={POINTS} xKey="x" yKey="y" zKey="z">
        <ScatterSeries3D />
        <Cap />
      </Chart3D>,
    )
    const mesh = findMesh(renderer.scene)
    const l = layout!
    expect(l.rows).toHaveLength(POINTS.length)
    for (let i = 0; i < mesh.count; i++) {
      const pos = position(mesh, i)
      expect(l.rows[i].x).toBeCloseTo(pos.x, 5)
      expect(l.rows[i].y).toBeCloseTo(pos.y, 5)
      expect(l.rows[i].z).toBeCloseTo(pos.z, 5)
      expect(l.rows[i].index).toBe(i)
      // datum carries the SAME reference as the chart's validated row.
      expect(l.rows[i].datum).toBe(l.chart.data[i])
    }
    await renderer.unmount()
  })
})

describe('useSeriesLayout3D band vs linear footprint', () => {
  it('band x: row.x is the band center and bandWidth === xScale.bandwidth()', async () => {
    let layout: SeriesLayout3D | undefined
    function Cap() {
      layout = useSeriesLayout3D()
      return null
    }
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={BANDS} xKey="m" yKey="v">
        <Cap />
      </Chart3D>,
    )
    const l = layout!
    const xScale = l.chart.xScale as unknown as { bandwidth: () => number }
    expect(l.bandWidth).toBeCloseTo(xScale.bandwidth(), 5)
    for (const row of l.rows) {
      expect(row.x).toBeCloseTo(axisPosition(l.chart.xScale, row.datum.m), 5)
    }
    await renderer.unmount()
  })

  it('linear x: bandWidth falls back to 0.5 by default and to options.fallback when given', async () => {
    let dflt: SeriesLayout3D | undefined
    let custom: SeriesLayout3D | undefined
    function CapDefault() {
      dflt = useSeriesLayout3D()
      return null
    }
    function CapCustom() {
      custom = useSeriesLayout3D({ fallback: 0.25 })
      return null
    }
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={POINTS} xKey="x" yKey="y">
        <CapDefault />
        <CapCustom />
      </Chart3D>,
    )
    expect(dflt!.bandWidth).toBeCloseTo(0.5, 5)
    expect(custom!.bandWidth).toBeCloseTo(0.25, 5)
    await renderer.unmount()
  })
})

describe('useSeriesLayout3D z handling', () => {
  it('no zKey: every z is 0 and bandDepth === bandWidth', async () => {
    let layout: SeriesLayout3D | undefined
    function Cap() {
      layout = useSeriesLayout3D()
      return null
    }
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={BANDS} xKey="m" yKey="v">
        <Cap />
      </Chart3D>,
    )
    const l = layout!
    for (const row of l.rows) expect(row.z).toBe(0)
    expect(l.bandDepth).toBeCloseTo(l.bandWidth, 5)
    await renderer.unmount()
  })

  it('with zKey: z is the z band center and bandDepth === zScale.bandwidth()', async () => {
    const data = [
      { m: 'Jan', v: 10, r: 'A' },
      { m: 'Feb', v: 20, r: 'B' },
    ]
    let layout: SeriesLayout3D | undefined
    function Cap() {
      layout = useSeriesLayout3D()
      return null
    }
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={data} xKey="m" yKey="v" zKey="r">
        <Cap />
      </Chart3D>,
    )
    const l = layout!
    const zScale = l.chart.zScale!
    expect(l.bandDepth).toBeCloseTo(
      (zScale as unknown as { bandwidth: () => number }).bandwidth(),
      5,
    )
    for (const row of l.rows) {
      expect(row.z).toBeCloseTo(axisPosition(zScale, row.datum.r), 5)
    }
    await renderer.unmount()
  })
})

describe('useSeriesLayout3D yBaseline + memoization', () => {
  it('yBaseline equals chart.yScale(0)', async () => {
    let layout: SeriesLayout3D | undefined
    function Cap() {
      layout = useSeriesLayout3D()
      return null
    }
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={BANDS} xKey="m" yKey="v">
        <Cap />
      </Chart3D>,
    )
    const l = layout!
    expect(l.yBaseline).toBe(l.chart.yScale(0))
    await renderer.unmount()
  })

  it('returns a stable identity across re-renders with the same data reference', async () => {
    const seen: SeriesLayout3D[] = []
    function Cap() {
      seen.push(useSeriesLayout3D())
      return null
    }
    // Two DISTINCT element trees sharing the same `BANDS` data reference, so
    // Chart3D's memoized context (and thus the layout) keeps its identity while
    // Cap actually re-renders.
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={BANDS} xKey="m" yKey="v">
        <Cap />
      </Chart3D>,
    )
    await renderer.update(
      <Chart3D data={BANDS} xKey="m" yKey="v">
        <Cap />
      </Chart3D>,
    )
    expect(seen.length).toBeGreaterThanOrEqual(2)
    // Same data ref → memoized chart → memoized layout (identity preserved).
    expect(seen[seen.length - 1]).toBe(seen[0])
    await renderer.unmount()
  })
})

describe('Chart3DContextValue type sanity for layout consumers', () => {
  it('exposes the chart context on the layout result', async () => {
    let layout: SeriesLayout3D | undefined
    function Cap() {
      layout = useSeriesLayout3D()
      return null
    }
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={BANDS} xKey="m" yKey="v">
        <Cap />
      </Chart3D>,
    )
    const chart: Chart3DContextValue = layout!.chart
    expect(typeof chart.xScale).toBe('function')
    await renderer.unmount()
  })
})
