import type { ReactThreeTest } from '@react-three/test-renderer'
import ReactThreeTestRenderer from '@react-three/test-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Chart3D } from '../../src/components/Chart3D'
import { useChart3D } from '../../src/hooks/useChart3D'
import type { Chart3DContextValue, Datum } from '../../src/types'

type TestInstance = ReactThreeTest.ReactThreeTestInstance

afterEach(() => {
  vi.restoreAllMocks()
})

/**
 * Chart3D render output not pinned by `Chart3D.test.tsx`:
 *  - Chart3D renders NO Three.js object of its own (it is a context root; only
 *    its children show up in the scene),
 *  - empty data renders nothing (no error, an empty scene) and is still a valid
 *    context root,
 *  - the FULL context value interface (data/xKey/yKey/zKey/xScale/yScale/zScale/
 *    bounds/domain + dims + yBaseline) is provided.
 */

describe('Chart3D renders no Three object itself', () => {
  it('empty data + no children → an empty scene (no Three object, no throw)', async () => {
    const renderer = await ReactThreeTestRenderer.create(<Chart3D data={[]} xKey="x" yKey="y" />)
    // No nodes anywhere under the scene root: Chart3D contributed nothing.
    expect(renderer.scene.children).toHaveLength(0)
    expect(renderer.scene.findAll(() => true)).toHaveLength(0)
    await renderer.unmount()
  })

  it('passes children through WITHOUT wrapping them in a Three node of its own', async () => {
    // A lone child mesh: if Chart3D wrapped children in (say) a <group>, the
    // scene would carry that extra Group node. It must not.
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={[{ x: 'a', y: 1 }]} xKey="x" yKey="y">
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial />
        </mesh>
      </Chart3D>,
    )

    // Exactly one mesh, zero groups — Chart3D added no Three wrapper.
    const meshes = renderer.scene.findAll((n: TestInstance) =>
      Boolean((n.instance as { isMesh?: boolean })?.isMesh),
    )
    expect(meshes).toHaveLength(1)
    expect(renderer.scene.findAllByType('Group')).toHaveLength(0)

    await renderer.unmount()
  })
})

describe('Chart3D provides the full context value interface', () => {
  it('exposes data, x/y/zKey, x/y/zScale, bounds, domain, dims, and yBaseline', async () => {
    const data: Datum[] = [
      { m: 'Jan', v: 10, r: 'A' },
      { m: 'Feb', v: 20, r: 'B' },
    ]
    let ctx: Chart3DContextValue | undefined
    function Probe() {
      ctx = useChart3D()
      return null
    }
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={data} xKey="m" yKey="v" zKey="r" width={8} height={4} depth={6}>
        <Probe />
      </Chart3D>,
    )

    expect(ctx).toBeDefined()
    const c = ctx!
    expect(c.data).toHaveLength(2)
    expect(c.xKey).toBe('m')
    expect(c.yKey).toBe('v')
    expect(c.zKey).toBe('r')
    expect(typeof c.xScale).toBe('function')
    expect(typeof c.yScale).toBe('function')
    expect(typeof c.zScale).toBe('function')
    expect(c.width).toBe(8)
    expect(c.height).toBe(4)
    expect(c.depth).toBe(6)
    expect(c.yBaseline).toBe(c.yScale(0))
    // bounds/domain present for all three axes.
    expect(c.bounds.x).toBeDefined()
    expect(c.bounds.y).toBeDefined()
    expect(c.bounds.z).toBeDefined()
    expect(c.domain.x).toBeDefined()
    expect(c.domain.y).toBeDefined()
    expect(c.domain.z).toBeDefined()

    await renderer.unmount()
  })
})
