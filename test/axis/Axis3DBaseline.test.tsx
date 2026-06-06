import ReactThreeTestRenderer from '@react-three/test-renderer'
import type { ReactThreeTest } from '@react-three/test-renderer'
import { scaleBand, scaleLinear } from 'd3-scale'
import { describe, expect, it } from 'vitest'
import { Axis3D } from '../../src/components/marks/Axis3D'
import { Chart3DContext } from '../../src/context/Chart3DContext'
import type { Chart3DContextValue } from '../../src/types'

type TestInstance = ReactThreeTest.ReactThreeTestInstance

interface PositionAttr {
  array: ArrayLike<number>
  count: number
}

function readPositions(node: TestInstance): PositionAttr {
  const line = node.findByType('LineSegments')
  return (
    line.instance as unknown as { geometry: { getAttribute(n: string): PositionAttr } }
  ).geometry.getAttribute('position')
}

/** Base-line endpoints along the y component (the first two packed vertices). */
function yBaseEndpoints(attr: PositionAttr): [number, number] {
  return [attr.array[1], attr.array[4]]
}

/**
 * A synthetic context whose y scale has a NON-zero range low. The real Chart3D
 * always ranges y to `[0, height]`, so `yScale.range()[0]` is always 0 there —
 * only a hand-built context exposes a hardcoded-0 low endpoint in Axis3D.
 */
function fakeContext(): Chart3DContextValue {
  const xScale = scaleBand<string>().domain(['a', 'b']).range([-5, 5])
  const yScale = scaleLinear().domain([0, 30]).range([2, 8])
  return {
    data: [],
    xKey: 'x',
    yKey: 'y',
    zKey: undefined,
    xScale,
    yScale,
    zScale: undefined,
    yBaseline: yScale(0),
    bounds: { x: [-5, 5], y: [2, 8] },
    domain: { x: ['a', 'b'], y: [0, 30] },
    width: 10,
    height: 5,
    depth: 10,
  } as unknown as Chart3DContextValue
}

describe('Axis3D y base line', () => {
  it('spans the full yScale.range(), not a hardcoded 0 low endpoint', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3DContext.Provider value={fakeContext()}>
        <Axis3D axis="y" showLabels={false} />
      </Chart3DContext.Provider>,
    )
    const [lo, hi] = yBaseEndpoints(readPositions(renderer.scene))
    expect(lo).toBeCloseTo(2) // yScale.range()[0], NOT a literal 0
    expect(hi).toBeCloseTo(8) // yScale.range()[1]
    await renderer.unmount()
  })
})
