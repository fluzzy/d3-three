import type { ReactThreeTest } from '@react-three/test-renderer'
import ReactThreeTestRenderer from '@react-three/test-renderer'
import * as THREE from 'three'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Chart3D } from '../../src/components/Chart3D'
import { ScatterSeries3D } from '../../src/components/marks/ScatterSeries3D'
import { useChart3D } from '../../src/hooks/useChart3D'
import type { Chart3DContextValue, Datum } from '../../src/types'

type TestInstance = ReactThreeTest.ReactThreeTestInstance

afterEach(() => {
  vi.restoreAllMocks()
})

function findMesh(scene: TestInstance): THREE.InstancedMesh {
  const node = scene.find((n) =>
    Boolean(n.instance && (n.instance as THREE.InstancedMesh).isInstancedMesh),
  )
  return node.instance as THREE.InstancedMesh
}

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
 * Scatter instance matrices/colors that `ScatterSeries3D.test.tsx` (which
 * checked count + onClick + the 2D-plane warning) does not assert. These prove:
 *  - point positions are the DIRECT linear scale outputs (xScale(x), yScale(y),
 *    zScale(z)) — NOT baseline-relative like bars,
 *  - the uniform `size` prop becomes the instance scale on all three axes,
 *  - the `color` prop lands on every instance.
 */

const DATA: Datum[] = [
  { x: 1, y: 10, z: 1 },
  { x: 2, y: 20, z: 2 },
  { x: 3, y: 30, z: 3 },
]

describe('exact linear x/y/z positions (direct scale outputs)', () => {
  it('positions each point at (xScale(x), yScale(y), zScale(z)) — not baseline-relative', async () => {
    let ctx: Chart3DContextValue | undefined
    function Cap() {
      ctx = useChart3D()
      return null
    }
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={DATA} xKey="x" yKey="y" zKey="z">
        <ScatterSeries3D size={0.2} />
        <Cap />
      </Chart3D>,
    )
    const mesh = findMesh(renderer.scene)
    const c = ctx!
    const xScale = c.xScale as unknown as (n: number) => number
    const yScale = c.yScale
    const zScale = c.zScale as unknown as (n: number) => number

    for (let i = 0; i < mesh.count; i++) {
      const d = DATA[i]
      const { pos, scl } = decompose(mesh, i)
      expect(pos.x).toBeCloseTo(xScale(Number(d.x)), 5)
      // Direct mapping: y is yScale(value), NOT (yScale(value)+baseline)/2.
      expect(pos.y).toBeCloseTo(yScale(Number(d.y)), 5)
      expect(pos.z).toBeCloseTo(zScale(Number(d.z)), 5)
      // Uniform size on every axis.
      expect(scl.x).toBeCloseTo(0.2, 5)
      expect(scl.y).toBeCloseTo(0.2, 5)
      expect(scl.z).toBeCloseTo(0.2, 5)
    }
    await renderer.unmount()
  })

  it('the y position is NOT halved toward a baseline (distinguishes scatter from bars)', async () => {
    let ctx: Chart3DContextValue | undefined
    function Cap() {
      ctx = useChart3D()
      return null
    }
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={DATA} xKey="x" yKey="y" zKey="z">
        <ScatterSeries3D />
        <Cap />
      </Chart3D>,
    )
    const mesh = findMesh(renderer.scene)
    const yScale = ctx!.yScale
    // For the largest value, a bar would center at yScale(v)/2; scatter sits at
    // yScale(v) itself. Assert it's the full value, not the half.
    const { pos } = decompose(mesh, 2) // y = 30 (the max)
    const full = yScale(30)
    expect(pos.y).toBeCloseTo(full, 5)
    expect(pos.y).not.toBeCloseTo(full / 2, 2)
    await renderer.unmount()
  })
})

describe('the `color` prop drives the base instanceColor', () => {
  it("colors every point with the prop color (e.g. '#4e79a7')", async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={DATA} xKey="x" yKey="y" zKey="z">
        <ScatterSeries3D color="#4e79a7" />
      </Chart3D>,
    )
    const mesh = findMesh(renderer.scene)
    expect(mesh.instanceColor).not.toBeNull()
    const expected = new THREE.Color('#4e79a7')
    const got = new THREE.Color()
    for (let i = 0; i < mesh.count; i++) {
      mesh.getColorAt(i, got)
      expect(got.getHexString()).toBe(expected.getHexString())
    }
    await renderer.unmount()
  })
})
