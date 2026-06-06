import ReactThreeTestRenderer from '@react-three/test-renderer'
import type { ReactThreeTest } from '@react-three/test-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Chart3D } from '../../src/components/Chart3D'
import { Axis3D } from '../../src/components/marks/Axis3D'
import { axisPosition } from '../../src/core/scales'
import { useChart3D } from '../../src/hooks/useChart3D'
import type { AxisName, Chart3DContextValue, Datum } from '../../src/types'

type TestInstance = ReactThreeTest.ReactThreeTestInstance

afterEach(() => {
  vi.restoreAllMocks()
})

interface PositionAttr {
  array: ArrayLike<number>
  count: number
}

/** Reads the position buffer of the (first) LineSegments under a node. */
function readPositions(node: TestInstance): PositionAttr {
  const line = node.findByType('LineSegments')
  return (
    line.instance as unknown as { geometry: { getAttribute(n: string): PositionAttr } }
  ).geometry.getAttribute('position')
}

/**
 * Vertex layout (from Axis3D): verts come in pairs (lineSegments). The FIRST
 * pair is the base line; every later pair is one tick. For axis `a`, the varying
 * coordinate is x→0, y→1, z→2. Returns the tick positions along that axis.
 */
function tickPositions(attr: PositionAttr, axis: AxisName): number[] {
  const comp = axis === 'x' ? 0 : axis === 'y' ? 1 : 2
  const out: number[] = []
  // Skip the base segment (verts 0,1) → start at vert index 2, step 2 (per tick).
  for (let v = 2; v < attr.count; v += 2) {
    out.push(attr.array[v * 3 + comp])
  }
  return out
}

/** Returns the base-line endpoints along the axis's varying component. */
function baseEndpoints(attr: PositionAttr, axis: AxisName): [number, number] {
  const comp = axis === 'x' ? 0 : axis === 'y' ? 1 : 2
  return [attr.array[comp], attr.array[3 + comp]]
}

/**
 * Axis tick geometry that `Axis3D.test.tsx` (which only checked that lines
 * render) does not assert:
 *  - linear x/y/z tick positions === scale.ticks() mapped through the scale,
 *  - a band axis uses its domain categories (at band centers) as ticks,
 *  - the axis base-line endpoints === context `bounds` (the world-space bounds),
 *  - in a NORMAL (2D-canvas-available) setup a Sprite label is created per tick.
 */

describe('linear tick positions === scale.ticks() mapped through the scale', () => {
  it('x / y / z axes each place ticks at scale(tick) for every scale.ticks() value', async () => {
    const data: Datum[] = [
      { x: 1, y: 10, z: 1 },
      { x: 2, y: 20, z: 2 },
      { x: 3, y: 30, z: 3 },
    ]
    let ctx: Chart3DContextValue | undefined
    function Cap() {
      ctx = useChart3D()
      return null
    }
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={data} xKey="x" yKey="y" zKey="z">
        <group name="ax-x">
          <Axis3D axis="x" showLabels={false} />
        </group>
        <group name="ax-y">
          <Axis3D axis="y" showLabels={false} />
        </group>
        <group name="ax-z">
          <Axis3D axis="z" showLabels={false} />
        </group>
        <Cap />
      </Chart3D>,
    )
    const c = ctx!

    for (const axis of ['x', 'y', 'z'] as const) {
      const scale = (axis === 'x' ? c.xScale : axis === 'y' ? c.yScale : c.zScale) as unknown as {
        ticks(n: number): number[]
      } & ((n: number) => number)
      const group = renderer.scene.find(
        (n) => (n.instance as { name?: string })?.name === `ax-${axis}`,
      )
      const attr = readPositions(group)
      const expected = scale.ticks(5).map((t) => scale(t))
      const got = tickPositions(attr, axis)
      expect(got).toHaveLength(expected.length)
      for (let i = 0; i < expected.length; i++) {
        expect(got[i]).toBeCloseTo(expected[i], 5)
      }
    }

    await renderer.unmount()
  })
})

describe('a band axis uses its domain categories (band centers) as ticks', () => {
  it('places one tick per category at axisPosition(scale, category)', async () => {
    const data: Datum[] = [
      { m: 'Jan', y: 10 },
      { m: 'Feb', y: 20 },
      { m: 'Mar', y: 30 },
    ]
    let ctx: Chart3DContextValue | undefined
    function Cap() {
      ctx = useChart3D()
      return null
    }
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={data} xKey="m" yKey="y">
        <Axis3D axis="x" showLabels={false} />
        <Cap />
      </Chart3D>,
    )
    const c = ctx!
    const attr = readPositions(renderer.scene)
    const got = tickPositions(attr, 'x')
    // One tick per band category, at the band center.
    const categories = ['Jan', 'Feb', 'Mar']
    expect(got).toHaveLength(categories.length)
    categories.forEach((cat, i) => {
      expect(got[i]).toBeCloseTo(axisPosition(c.xScale, cat), 5)
    })
    await renderer.unmount()
  })
})

describe('axis base-line endpoints === context bounds', () => {
  it('x / y / z base segments span exactly bounds[axis] (world-space bounds)', async () => {
    const data: Datum[] = [
      { x: 1, y: 10, z: 1 },
      { x: 2, y: 20, z: 2 },
    ]
    let ctx: Chart3DContextValue | undefined
    function Cap() {
      ctx = useChart3D()
      return null
    }
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={data} xKey="x" yKey="y" zKey="z">
        <group name="b-x">
          <Axis3D axis="x" showLabels={false} />
        </group>
        <group name="b-y">
          <Axis3D axis="y" showLabels={false} />
        </group>
        <group name="b-z">
          <Axis3D axis="z" showLabels={false} />
        </group>
        <Cap />
      </Chart3D>,
    )
    const c = ctx!
    const expected = { x: c.bounds.x, y: c.bounds.y, z: c.bounds.z! }
    for (const axis of ['x', 'y', 'z'] as const) {
      const group = renderer.scene.find(
        (n) => (n.instance as { name?: string })?.name === `b-${axis}`,
      )
      const [lo, hi] = baseEndpoints(readPositions(group), axis)
      expect(lo).toBeCloseTo(expected[axis][0], 5)
      expect(hi).toBeCloseTo(expected[axis][1], 5)
    }
    await renderer.unmount()
  })
})

/**
 * Installs a minimal stub 2D canvas context so Axis3D's `createTextSprite`
 * actually builds a Sprite (test/setup.ts forces getContext('2d') → null, which
 * skips labels in jsdom). Mirrors the helper in memory.test.tsx.
 */
function stub2dContext(): void {
  const prev = HTMLCanvasElement.prototype.getContext
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
    this: HTMLCanvasElement,
    contextId: string,
    ...args: unknown[]
  ): unknown {
    if (contextId === '2d') {
      return {
        font: '',
        textAlign: '',
        textBaseline: '',
        lineJoin: '',
        lineWidth: 0,
        strokeStyle: '',
        fillStyle: '',
        measureText: (_t: string) => ({ width: 42 }),
        strokeText: () => {},
        fillText: () => {},
      }
    }
    return (prev as (...a: unknown[]) => unknown).call(this, contextId, ...args)
  } as typeof HTMLCanvasElement.prototype.getContext)
}

describe('Sprite labels are created in a normal (2D-canvas) setup', () => {
  it('renders one camera-facing Sprite label per band tick when showLabels is on', async () => {
    stub2dContext()
    const data: Datum[] = [
      { m: 'Jan', y: 10 },
      { m: 'Feb', y: 20 },
      { m: 'Mar', y: 30 },
    ]
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={data} xKey="m" yKey="y">
        <Axis3D axis="x" showLabels />
      </Chart3D>,
    )

    // One Sprite per category label. Sprite reports `.type === 'Sprite'`.
    const sprites = renderer.scene.findAll((n) =>
      Boolean((n.instance as { isSprite?: boolean })?.isSprite),
    )
    expect(sprites).toHaveLength(data.length)

    await renderer.unmount()
  })
})
