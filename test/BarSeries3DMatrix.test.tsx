import ReactThreeTestRenderer from '@react-three/test-renderer'
import type { ReactThreeTest } from '@react-three/test-renderer'
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { BarSeries3D } from '../src/components/BarSeries3D'
import { Chart3D } from '../src/components/Chart3D'
import { useChart3D } from '../src/hooks/useChart3D'
import type { Chart3DContextValue } from '../src/types'

type TestInstance = ReactThreeTest.ReactThreeTestInstance

function findInstancedMeshes(scene: TestInstance): TestInstance[] {
  return scene.findAll((n) =>
    Boolean(n.instance && (n.instance as THREE.InstancedMesh).isInstancedMesh),
  )
}
function findMesh(scene: TestInstance): THREE.InstancedMesh {
  return findInstancedMeshes(scene)[0].instance as THREE.InstancedMesh
}

/** Decomposes instance `i`'s matrix into position + per-axis scale. */
function decompose(mesh: THREE.InstancedMesh, i: number) {
  const m = new THREE.Matrix4()
  const pos = new THREE.Vector3()
  const quat = new THREE.Quaternion()
  const scl = new THREE.Vector3()
  mesh.getMatrixAt(i, m)
  m.decompose(pos, quat, scl)
  return { pos, scl }
}

/**
 * Bar instance matrices/colors that `BarSeries3D.test.tsx` (which only checked
 * InstancedMesh count) does not assert:
 *  - bars grow from the y=0 baseline (bar BOTTOM === yBaseline for all-positive),
 *  - bar width === xScale.bandwidth(), grouped depth === zScale.bandwidth(),
 *  - one draw call per series === exactly ONE InstancedMesh node,
 *  - the `color` prop lands on every instance's instanceColor.
 */

describe('bars grow from the y=0 baseline', () => {
  it('every bar BOTTOM sits at yBaseline; height === yScale(value) - yBaseline', async () => {
    const data = [
      { m: 'Jan', v: 10 },
      { m: 'Feb', v: 20 },
      { m: 'Mar', v: 30 },
    ]
    let ctx: Chart3DContextValue | undefined
    function Cap() {
      ctx = useChart3D()
      return null
    }
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={data} xKey="m" yKey="v">
        <BarSeries3D />
        <Cap />
      </Chart3D>,
    )
    const mesh = findMesh(renderer.scene)
    const c = ctx!
    const baseline = c.yBaseline

    for (let i = 0; i < mesh.count; i++) {
      const { pos, scl } = decompose(mesh, i)
      const expectedHeight = Math.abs(c.yScale(Number(data[i].v)) - baseline)
      // Box is centered, so bottom = centerY - height/2. For all-positive data
      // every bottom must coincide with the baseline (the xz floor at y=0).
      const bottom = pos.y - scl.y / 2
      expect(bottom).toBeCloseTo(baseline, 5)
      expect(scl.y).toBeCloseTo(expectedHeight, 5)
      // The bar TOP reaches yScale(value).
      expect(pos.y + scl.y / 2).toBeCloseTo(c.yScale(Number(data[i].v)), 5)
    }

    await renderer.unmount()
  })

  it('negative values grow DOWNWARD from the baseline (top at baseline)', async () => {
    const data = [
      { m: 'Jan', v: -10 },
      { m: 'Feb', v: -30 },
    ]
    let ctx: Chart3DContextValue | undefined
    function Cap() {
      ctx = useChart3D()
      return null
    }
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={data} xKey="m" yKey="v">
        <BarSeries3D />
        <Cap />
      </Chart3D>,
    )
    const mesh = findMesh(renderer.scene)
    const baseline = ctx!.yBaseline
    for (let i = 0; i < mesh.count; i++) {
      const { pos, scl } = decompose(mesh, i)
      // Negative bar: its TOP is at the baseline, body hangs below.
      expect(pos.y + scl.y / 2).toBeCloseTo(baseline, 5)
    }
    await renderer.unmount()
  })
})

describe('bar width === xScale.bandwidth(); grouped depth === zScale.bandwidth()', () => {
  it('uses xScale.bandwidth() for width and falls back to it for depth without zKey', async () => {
    const data = [
      { m: 'Jan', v: 10 },
      { m: 'Feb', v: 20 },
    ]
    let ctx: Chart3DContextValue | undefined
    function Cap() {
      ctx = useChart3D()
      return null
    }
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={data} xKey="m" yKey="v">
        <BarSeries3D />
        <Cap />
      </Chart3D>,
    )
    const mesh = findMesh(renderer.scene)
    const xbw = (ctx!.xScale as unknown as { bandwidth: () => number }).bandwidth()
    const { scl } = decompose(mesh, 0)
    expect(scl.x).toBeCloseTo(xbw, 5)
    // No zKey → depth falls back to the x bandwidth.
    expect(scl.z).toBeCloseTo(xbw, 5)
    await renderer.unmount()
  })

  it('grouped (zKey) bars use zScale.bandwidth() for depth', async () => {
    const data = [
      { m: 'Jan', v: 10, r: 'A' },
      { m: 'Feb', v: 20, r: 'B' },
      { m: 'Mar', v: 30, r: 'A' },
    ]
    let ctx: Chart3DContextValue | undefined
    function Cap() {
      ctx = useChart3D()
      return null
    }
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={data} xKey="m" yKey="v" zKey="r">
        <BarSeries3D />
        <Cap />
      </Chart3D>,
    )
    const mesh = findMesh(renderer.scene)
    const zbw = (ctx!.zScale as unknown as { bandwidth: () => number }).bandwidth()
    const xbw = (ctx!.xScale as unknown as { bandwidth: () => number }).bandwidth()
    const { scl } = decompose(mesh, 0)
    expect(scl.z).toBeCloseTo(zbw, 5) // depth tracks the z bandwidth
    expect(scl.x).toBeCloseTo(xbw, 5) // width still the x bandwidth
    await renderer.unmount()
  })
})

describe('one draw call per series (single InstancedMesh)', () => {
  it('renders exactly ONE InstancedMesh node regardless of row count', async () => {
    const data = Array.from({ length: 50 }, (_, i) => ({ m: `c${i}`, v: i + 1 }))
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={data} xKey="m" yKey="v">
        <BarSeries3D />
      </Chart3D>,
    )
    const meshes = findInstancedMeshes(renderer.scene)
    // 50 bars, still ONE mesh → one draw call.
    expect(meshes).toHaveLength(1)
    expect((meshes[0].instance as THREE.InstancedMesh).count).toBe(50)
    await renderer.unmount()
  })
})

describe('the `color` prop drives the base instanceColor', () => {
  it("colors every instance with the prop color (e.g. 'red' → ff0000)", async () => {
    const data = [
      { m: 'Jan', v: 10 },
      { m: 'Feb', v: 20 },
    ]
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={data} xKey="m" yKey="v">
        <BarSeries3D color="red" />
      </Chart3D>,
    )
    const mesh = findMesh(renderer.scene)
    expect(mesh.instanceColor).not.toBeNull()
    const expected = new THREE.Color('red')
    const got = new THREE.Color()
    for (let i = 0; i < mesh.count; i++) {
      mesh.getColorAt(i, got)
      expect(got.getHexString()).toBe(expected.getHexString())
    }
    await renderer.unmount()
  })
})
