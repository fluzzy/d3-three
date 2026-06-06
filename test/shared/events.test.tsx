import ReactThreeTestRenderer from '@react-three/test-renderer'
import type { ReactThreeTest } from '@react-three/test-renderer'
import type { InstancedMesh } from 'three'
import { describe, expect, it, vi } from 'vitest'
import { BarSeries3D } from '../../src/components/BarSeries3D'
import { Chart3D } from '../../src/components/Chart3D'

type TestInstance = ReactThreeTest.ReactThreeTestInstance

const DATA = [
  { m: 'Jan', v: 10 },
  { m: 'Feb', v: 20 },
]

/**
 * Finds the InstancedMesh node by its `isInstancedMesh` flag. RTTR's
 * `findByType('InstancedMesh')` does not match because a THREE InstancedMesh
 * reports `.type === 'Mesh'`.
 */
function findMesh(scene: TestInstance): TestInstance {
  return scene.find((n) => Boolean(n.instance && (n.instance as InstancedMesh).isInstancedMesh))
}

describe('BarSeries3D events', () => {
  it('forwards click to onClick with (event, datum, index)', async () => {
    const onClick = vi.fn()
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={DATA} xKey="m" yKey="v">
        <BarSeries3D onClick={onClick} />
      </Chart3D>,
    )

    const mesh = findMesh(renderer.scene)
    await renderer.fireEvent(mesh, 'click', { instanceId: 1 })

    expect(onClick).toHaveBeenCalledTimes(1)
    const [event, datum, index] = onClick.mock.calls[0]
    expect(event.instanceId).toBe(1)
    expect(datum).toEqual(DATA[1])
    expect(index).toBe(1)

    await renderer.unmount()
  })

  it('forwards pointerOver / pointerOut to their handlers with the bound datum', async () => {
    const onPointerOver = vi.fn()
    const onPointerOut = vi.fn()
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={DATA} xKey="m" yKey="v">
        <BarSeries3D onPointerOver={onPointerOver} onPointerOut={onPointerOut} />
      </Chart3D>,
    )

    const mesh = findMesh(renderer.scene)

    await renderer.fireEvent(mesh, 'pointerOver', { instanceId: 0 })
    expect(onPointerOver).toHaveBeenCalledTimes(1)
    {
      const [event, datum, index] = onPointerOver.mock.calls[0]
      expect(event.instanceId).toBe(0)
      expect(datum).toEqual(DATA[0])
      expect(index).toBe(0)
    }

    await renderer.fireEvent(mesh, 'pointerOut', { instanceId: 0 })
    expect(onPointerOut).toHaveBeenCalledTimes(1)
    {
      const [event, datum, index] = onPointerOut.mock.calls[0]
      expect(event.instanceId).toBe(0)
      expect(datum).toEqual(DATA[0])
      expect(index).toBe(0)
    }

    await renderer.unmount()
  })

  it('ignores events whose instanceId is undefined', async () => {
    const onClick = vi.fn()
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={DATA} xKey="m" yKey="v">
        <BarSeries3D onClick={onClick} />
      </Chart3D>,
    )

    const mesh = findMesh(renderer.scene)
    await renderer.fireEvent(mesh, 'click', {})
    expect(onClick).not.toHaveBeenCalled()

    await renderer.unmount()
  })
})
