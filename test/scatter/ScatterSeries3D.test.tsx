import ReactThreeTestRenderer from '@react-three/test-renderer'
import type * as THREE from 'three'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Chart3D } from '../../src/components/Chart3D'
import { ScatterSeries3D } from '../../src/components/marks/ScatterSeries3D'
import type { Datum } from '../../src/types'

const data: Datum[] = [
  { x: 1, y: 10, z: 1 },
  { x: 2, y: 20, z: 2 },
  { x: 3, y: 30, z: 3 },
]

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ScatterSeries3D', () => {
  it('renders an InstancedMesh with count equal to the data length', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={data} xKey="x" yKey="y" zKey="z">
        <ScatterSeries3D />
      </Chart3D>,
    )
    await ReactThreeTestRenderer.act(async () => {
      await renderer.advanceFrames(1, 1)
    })

    // three's InstancedMesh inherits `.type === 'Mesh'`, so match on the mesh
    // and verify instancing via three's realm-independent `isInstancedMesh`
    // brand (a plain `instanceof` can cross module copies under Vitest).
    const mesh = renderer.scene.findByType('Mesh')
    const instance = mesh.instance as THREE.InstancedMesh
    expect(instance.isInstancedMesh).toBe(true)
    expect(instance.count).toBe(data.length)

    await renderer.unmount()
  })

  it('calls onClick with the datum bound to the clicked instance', async () => {
    const onClick = vi.fn()
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={data} xKey="x" yKey="y" zKey="z">
        <ScatterSeries3D onClick={onClick} />
      </Chart3D>,
    )
    await ReactThreeTestRenderer.act(async () => {
      await renderer.advanceFrames(1, 1)
    })

    const mesh = renderer.scene.findByType('Mesh')
    await renderer.fireEvent(mesh, 'click', { instanceId: 0 })

    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onClick.mock.calls[0][1]).toEqual(data[0])
    expect(onClick.mock.calls[0][2]).toBe(0)

    await renderer.unmount()
  })

  it('warns once and still renders a mesh when zKey is omitted', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={data} xKey="x" yKey="y">
        <ScatterSeries3D />
      </Chart3D>,
    )
    await ReactThreeTestRenderer.act(async () => {
      await renderer.advanceFrames(1, 1)
    })

    const mesh = renderer.scene.findByType('Mesh')
    const instance = mesh.instance as THREE.InstancedMesh
    expect(instance.isInstancedMesh).toBe(true)
    expect(instance.count).toBe(data.length)
    expect(warn).toHaveBeenCalledWith(
      '[d3-three] ScatterSeries3D without zKey renders a 2D plane; consider 2D Recharts',
    )

    await renderer.unmount()
  })
})
