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

describe('BarSeries3D dynamic data (args-driven recreation)', () => {
  it('tracks InstancedMesh.count to data.length across updates and never throws', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={TWO} xKey="m" yKey="v">
        <BarSeries3D />
      </Chart3D>,
    )

    {
      const meshes = findInstancedMeshes(renderer.scene)
      expect(meshes).toHaveLength(1)
      expect(meshes[0].count).toBe(TWO.length)
    }

    // Grow: 2 -> 4. The instancedMesh `args` capacity is data.length-driven, so
    // the node is recreated; count must follow the new row count.
    await renderer.update(
      <Chart3D data={FOUR} xKey="m" yKey="v">
        <BarSeries3D />
      </Chart3D>,
    )
    {
      const meshes = findInstancedMeshes(renderer.scene)
      expect(meshes).toHaveLength(1)
      expect(meshes[0].count).toBe(FOUR.length)
    }

    // Shrink: 4 -> 1.
    await renderer.update(
      <Chart3D data={ONE} xKey="m" yKey="v">
        <BarSeries3D />
      </Chart3D>,
    )
    {
      const meshes = findInstancedMeshes(renderer.scene)
      expect(meshes).toHaveLength(1)
      expect(meshes[0].count).toBe(ONE.length)
    }

    await renderer.unmount()
  })
})
