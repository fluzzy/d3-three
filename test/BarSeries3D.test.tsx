import ReactThreeTestRenderer from '@react-three/test-renderer'
import type { ReactThreeTest } from '@react-three/test-renderer'
import type * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { BarSeries3D } from '../src/components/BarSeries3D'
import { Chart3D } from '../src/components/Chart3D'

type TestInstance = ReactThreeTest.ReactThreeTestInstance

const BARS = [
  { m: 'Jan', v: 10 },
  { m: 'Feb', v: 20 },
]

/**
 * Finds InstancedMesh nodes by the `isInstancedMesh` instance flag. A THREE
 * InstancedMesh reports `.type === 'Mesh'` (not 'InstancedMesh'), so RTTR's
 * `findAllByType('InstancedMesh')` never matches — the flag is the reliable key.
 */
function findInstancedMeshes(scene: TestInstance): TestInstance[] {
  return scene.findAll((node) =>
    Boolean(node.instance && (node.instance as THREE.InstancedMesh).isInstancedMesh),
  )
}

describe('BarSeries3D', () => {
  it('renders exactly one InstancedMesh with count equal to the row count', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={BARS} xKey="m" yKey="v">
        <BarSeries3D />
      </Chart3D>,
    )

    const meshes = findInstancedMeshes(renderer.scene)
    expect(meshes).toHaveLength(1)

    const mesh = meshes[0].instance as THREE.InstancedMesh
    expect(mesh.count).toBe(2)

    await renderer.unmount()
  })

  it('renders count 0 without crashing for empty data', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={[]} xKey="m" yKey="v">
        <BarSeries3D />
      </Chart3D>,
    )

    const meshes = findInstancedMeshes(renderer.scene)
    expect(meshes).toHaveLength(1)
    expect((meshes[0].instance as THREE.InstancedMesh).count).toBe(0)

    await renderer.unmount()
  })

  it('still renders one InstancedMesh with count===rows when zKey is set', async () => {
    const data = [
      { m: 'Jan', v: 10, r: 'A' },
      { m: 'Feb', v: 20, r: 'B' },
      { m: 'Mar', v: 30, r: 'A' },
    ]
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={data} xKey="m" yKey="v" zKey="r">
        <BarSeries3D />
      </Chart3D>,
    )

    const meshes = findInstancedMeshes(renderer.scene)
    expect(meshes).toHaveLength(1)
    expect((meshes[0].instance as THREE.InstancedMesh).count).toBe(data.length)

    await renderer.unmount()
  })
})
