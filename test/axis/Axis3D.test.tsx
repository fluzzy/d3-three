import ReactThreeTestRenderer from '@react-three/test-renderer'
import { describe, expect, it } from 'vitest'
import { Chart3D } from '../../src/components/Chart3D'
import { Axis3D } from '../../src/components/marks/Axis3D'

const data = [
  { x: 'A', y: 10 },
  { x: 'B', y: 20 },
]

describe('Axis3D', () => {
  it('renders band x and linear y axes as LineSegments without throwing', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={data} xKey="x" yKey="y">
        <Axis3D axis="x" />
        <Axis3D axis="y" />
      </Chart3D>,
    )

    const lines = renderer.scene.findAllByType('LineSegments')
    // one base line per axis (band x + linear y).
    expect(lines.length).toBeGreaterThanOrEqual(2)

    await renderer.unmount()
  })

  it('renders a single axis with a populated position buffer', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={data} xKey="x" yKey="y">
        <Axis3D axis="x" />
      </Chart3D>,
    )

    const line = renderer.scene.findByType('LineSegments')
    const position = (line.instance as unknown as THREE_LineSegments).geometry.getAttribute(
      'position',
    )
    // base segment (2 verts) + one tick segment (2 verts) per band category.
    expect(position.count).toBeGreaterThanOrEqual(2)

    await renderer.unmount()
  })

  it('renders nothing for a z axis when Chart3D has no zKey/zScale', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={data} xKey="x" yKey="y">
        <Axis3D axis="z" />
      </Chart3D>,
    )

    expect(renderer.scene.findAllByType('LineSegments')).toHaveLength(0)
    expect(renderer.scene.findAllByType('Group')).toHaveLength(0)

    await renderer.unmount()
  })
})

// Minimal structural typing for the assertion above (avoids importing three just
// for a single .geometry.getAttribute access).
interface THREE_LineSegments {
  geometry: { getAttribute(name: string): { count: number } }
}
