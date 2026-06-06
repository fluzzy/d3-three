import type { ReactThreeTest } from '@react-three/test-renderer'
import ReactThreeTestRenderer from '@react-three/test-renderer'
import { Profiler } from 'react'
import * as THREE from 'three'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Chart3D } from '../../src/components/Chart3D'
import { ScatterSeries3D } from '../../src/components/marks/ScatterSeries3D'

type TestInstance = ReactThreeTest.ReactThreeTestInstance

// Numeric x/y/z + zKey: continuous axes, so no dev warnings fire here. Scatter
// shares the same imperative-hover engine as bars (useInstancedSeries); this
// pins that path for ScatterSeries3D specifically (previously uncovered).
const DATA = [
  { x: 1, y: 10, z: 1 },
  { x: 2, y: 20, z: 2 },
  { x: 3, y: 30, z: 3 },
]

afterEach(() => {
  vi.restoreAllMocks()
})

function findMeshNode(scene: TestInstance): TestInstance {
  return scene.find((n) =>
    Boolean(n.instance && (n.instance as THREE.InstancedMesh).isInstancedMesh),
  )
}

describe('ScatterSeries3D imperative hover (no rerender)', () => {
  it('writes the highlight color on pointerOver and restores the base on pointerOut', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={DATA} xKey="x" yKey="y" zKey="z">
        <ScatterSeries3D highlightColor="#ffffff" />
      </Chart3D>,
    )
    const node = findMeshNode(renderer.scene)
    const mesh = node.instance as THREE.InstancedMesh

    const base1 = new THREE.Color()
    mesh.getColorAt(1, base1)

    await renderer.fireEvent(node, 'pointerOver', { instanceId: 1 })
    const hovered = new THREE.Color()
    mesh.getColorAt(1, hovered)
    expect(hovered.r).toBeCloseTo(1)
    expect(hovered.g).toBeCloseTo(1)
    expect(hovered.b).toBeCloseTo(1)
    expect(mesh.instanceColor).not.toBeNull()

    await renderer.fireEvent(node, 'pointerOut', { instanceId: 1 })
    const restored = new THREE.Color()
    mesh.getColorAt(1, restored)
    expect(restored.getHex()).toBe(base1.getHex())

    await renderer.unmount()
  })

  it('does not disturb sibling instances when one is hovered', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={DATA} xKey="x" yKey="y" zKey="z">
        <ScatterSeries3D highlightColor="#ffffff" />
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
    expect(after0.getHex()).toBe(base0.getHex())
    expect(after2.getHex()).toBe(base2.getHex())

    await renderer.unmount()
  })

  it('commits the series subtree 0 additional times across a full hover sweep', async () => {
    let updateCommits = 0
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={DATA} xKey="x" yKey="y" zKey="z">
        <Profiler
          id="scatter"
          onRender={(_id, phase) => {
            if (phase === 'update') updateCommits++
          }}
        >
          <ScatterSeries3D highlightColor="#ffffff" />
        </Profiler>
      </Chart3D>,
    )
    expect(updateCommits).toBe(0) // mount produced no update commits

    const node = findMeshNode(renderer.scene)
    for (let id = 0; id < DATA.length; id++) {
      await renderer.fireEvent(node, 'pointerOver', { instanceId: id })
      await renderer.fireEvent(node, 'pointerOut', { instanceId: id })
      expect(updateCommits).toBe(0)
    }
    expect(updateCommits).toBe(0)

    await renderer.unmount()
  })
})
