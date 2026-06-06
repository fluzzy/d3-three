import ReactThreeTestRenderer from '@react-three/test-renderer'
import type { ReactThreeTest } from '@react-three/test-renderer'
import type * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { BarSeries3D } from '../src/components/BarSeries3D'
import { Chart3D } from '../src/components/Chart3D'

type TestInstance = ReactThreeTest.ReactThreeTestInstance

const ROW = (m: string, v: number) => ({ m, v })

const TWO = [ROW('Jan', 10), ROW('Feb', 20)]
const FOUR = [ROW('Jan', 10), ROW('Feb', 20), ROW('Mar', 30), ROW('Apr', 40)]
const ONE = [ROW('Jan', 10)]

/**
 * Finds InstancedMesh nodes by the `isInstancedMesh` instance flag. A THREE
 * InstancedMesh reports `.type === 'Mesh'` (not 'InstancedMesh'), so RTTR's
 * `findAllByType('InstancedMesh')` never matches — the flag is the reliable key.
 */
function findInstancedMeshes(scene: TestInstance): THREE.InstancedMesh[] {
  return scene
    .findAll((n) => Boolean(n.instance && (n.instance as THREE.InstancedMesh).isInstancedMesh))
    .map((n) => n.instance as THREE.InstancedMesh)
}

describe('BarSeries3D dynamic data (over-provisioned capacity, mesh reuse)', () => {
  it('reuses one InstancedMesh across row-count changes within capacity, tracking count', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={TWO} xKey="m" yKey="v">
        <BarSeries3D />
      </Chart3D>,
    )

    const first = findInstancedMeshes(renderer.scene)
    expect(first).toHaveLength(1)
    expect(first[0].count).toBe(TWO.length)
    const mesh = first[0]

    // Grow 2 -> 4: the GPU capacity is over-provisioned, so the data still fits
    // and the SAME host InstancedMesh is reused (no dispose/realloc); only
    // mesh.count follows the new row count.
    await renderer.update(
      <Chart3D data={FOUR} xKey="m" yKey="v">
        <BarSeries3D />
      </Chart3D>,
    )
    {
      const grown = findInstancedMeshes(renderer.scene)
      expect(grown).toHaveLength(1)
      expect(grown[0]).toBe(mesh) // reused, not recreated
      expect(grown[0].count).toBe(FOUR.length)
    }

    // Shrink 4 -> 1: still the same mesh.
    await renderer.update(
      <Chart3D data={ONE} xKey="m" yKey="v">
        <BarSeries3D />
      </Chart3D>,
    )
    {
      const shrunk = findInstancedMeshes(renderer.scene)
      expect(shrunk).toHaveLength(1)
      expect(shrunk[0]).toBe(mesh)
      expect(shrunk[0].count).toBe(ONE.length)
    }

    await renderer.unmount()
  })

  it('renders thousands of rows as a single InstancedMesh (one draw call)', async () => {
    const many = Array.from({ length: 2000 }, (_, i) => ROW(`c${i}`, (i % 50) + 1))
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={many} xKey="m" yKey="v">
        <BarSeries3D />
      </Chart3D>,
    )

    const meshes = findInstancedMeshes(renderer.scene)
    expect(meshes).toHaveLength(1)
    expect(meshes[0].count).toBe(2000)

    await renderer.unmount()
  })
})
