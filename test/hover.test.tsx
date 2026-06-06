import ReactThreeTestRenderer from '@react-three/test-renderer'
import type { ReactThreeTest } from '@react-three/test-renderer'
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { BarSeries3D } from '../src/components/BarSeries3D'
import { Chart3D } from '../src/components/Chart3D'

type TestInstance = ReactThreeTest.ReactThreeTestInstance

const DATA = [
  { m: 'Jan', v: 10 },
  { m: 'Feb', v: 20 },
  { m: 'Mar', v: 30 },
]

/**
 * Finds the InstancedMesh node by its `isInstancedMesh` flag. A THREE
 * InstancedMesh reports `.type === 'Mesh'` (not 'InstancedMesh'), so RTTR's
 * `findByType('InstancedMesh')` never matches — the flag is the reliable key.
 *
 * Returns the RTTR TestInstance (needed by `fireEvent`, which reads props off
 * the node, not the raw three object). Read the live color buffer off
 * `node.instance`.
 */
function findMeshNode(scene: TestInstance): TestInstance {
  return scene.find((n) =>
    Boolean(n.instance && (n.instance as THREE.InstancedMesh).isInstancedMesh),
  )
}

describe('BarSeries3D imperative hover (no rerender)', () => {
  it('writes white to the hovered instanceColor on pointerOver and restores the base color on pointerOut', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={DATA} xKey="m" yKey="v">
        <BarSeries3D highlightColor="#ffffff" />
      </Chart3D>,
    )

    const node = findMeshNode(renderer.scene)
    const mesh = node.instance as THREE.InstancedMesh

    // Capture the base color of instance 1 BEFORE any hover. Hover is imperative
    // (setColorAt + needsUpdate, zero React state / rerender) so we must assert
    // against the live instanceColor buffer, not props.
    const base1 = new THREE.Color()
    mesh.getColorAt(1, base1)

    await renderer.fireEvent(node, 'pointerOver', { instanceId: 1 })

    const hovered = new THREE.Color()
    mesh.getColorAt(1, hovered)
    // White: r = g = b = 1 (linear/sRGB are identical at the white point).
    expect(hovered.r).toBeCloseTo(1)
    expect(hovered.g).toBeCloseTo(1)
    expect(hovered.b).toBeCloseTo(1)
    // The instanceColor buffer exists and was populated (setColorAt auto-creates
    // it). `needsUpdate` is a write-only setter in three (no getter), so the
    // re-upload flag itself isn't observable here — the color readback above is
    // the real proof the imperative write landed.
    expect(mesh.instanceColor).not.toBeNull()

    await renderer.fireEvent(node, 'pointerOut', { instanceId: 1 })

    const restored = new THREE.Color()
    mesh.getColorAt(1, restored)
    expect(restored.r).toBeCloseTo(base1.r)
    expect(restored.g).toBeCloseTo(base1.g)
    expect(restored.b).toBeCloseTo(base1.b)

    await renderer.unmount()
  })

  it('does not disturb sibling instances when one is hovered', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={DATA} xKey="m" yKey="v">
        <BarSeries3D highlightColor="#ffffff" />
      </Chart3D>,
    )

    const node = findMeshNode(renderer.scene)
    const mesh = node.instance as THREE.InstancedMesh
    const base0 = new THREE.Color()
    const base2 = new THREE.Color()
    mesh.getColorAt(0, base0)
    mesh.getColorAt(2, base2)

    await renderer.fireEvent(node, 'pointerOver', { instanceId: 1 })

    const after0 = new THREE.Color()
    const after2 = new THREE.Color()
    mesh.getColorAt(0, after0)
    mesh.getColorAt(2, after2)
    // Untouched siblings keep their base colors.
    expect(after0.getHex()).toBe(base0.getHex())
    expect(after2.getHex()).toBe(base2.getHex())

    await renderer.unmount()
  })
})
