import type { ReactThreeTest } from '@react-three/test-renderer'
import ReactThreeTestRenderer from '@react-three/test-renderer'
import { Profiler } from 'react'
import * as THREE from 'three'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Chart3D } from '../../src/components/Chart3D'
import { BarSeries3D } from '../../src/components/marks/BarSeries3D'
import { ScatterSeries3D } from '../../src/components/marks/ScatterSeries3D'
import { DEFAULT_PALETTE } from '../../src/core/colorBy'
import type { Datum } from '../../src/types'

type TestInstance = ReactThreeTest.ReactThreeTestInstance

afterEach(() => {
  vi.restoreAllMocks()
})

function findMeshNode(scene: TestInstance): TestInstance {
  return scene.find((n) =>
    Boolean(n.instance && (n.instance as THREE.InstancedMesh).isInstancedMesh),
  )
}
function colorAt(mesh: THREE.InstancedMesh, i: number): THREE.Color {
  const c = new THREE.Color()
  mesh.getColorAt(i, c)
  return c
}
const hex = (css: string) => new THREE.Color(css).getHex()

const BARS: Datum[] = [
  { m: 'Jan', v: 10, region: 'NA' },
  { m: 'Feb', v: 20, region: 'EU' },
  { m: 'Mar', v: 30, region: 'NA' },
]

const POINTS: Datum[] = [
  { x: 1, y: 2, t: 'a' },
  { x: 3, y: 4, t: 'b' },
  { x: 5, y: 6, t: 'a' },
]

describe('colorBy paints per-instance base colors', () => {
  it('BarSeries3D categorical: distinct categories → distinct palette colors, same → equal', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={BARS} xKey="m" yKey="v">
        <BarSeries3D colorBy={(d) => d.region as string} />
      </Chart3D>,
    )
    const mesh = findMeshNode(renderer.scene).instance as THREE.InstancedMesh
    expect(colorAt(mesh, 0).getHex()).toBe(hex(DEFAULT_PALETTE[0])) // NA
    expect(colorAt(mesh, 1).getHex()).toBe(hex(DEFAULT_PALETTE[1])) // EU
    expect(colorAt(mesh, 2).getHex()).toBe(colorAt(mesh, 0).getHex()) // NA again
    expect(colorAt(mesh, 0).getHex()).not.toBe(colorAt(mesh, 1).getHex())
    await renderer.unmount()
  })

  it('ScatterSeries3D categorical: colors follow the datum, not a flat color', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={POINTS} xKey="x" yKey="y">
        <ScatterSeries3D colorBy={(d) => d.t as string} />
      </Chart3D>,
    )
    const mesh = findMeshNode(renderer.scene).instance as THREE.InstancedMesh
    expect(colorAt(mesh, 0).getHex()).toBe(hex(DEFAULT_PALETTE[0]))
    expect(colorAt(mesh, 1).getHex()).toBe(hex(DEFAULT_PALETTE[1]))
    expect(colorAt(mesh, 2).getHex()).toBe(colorAt(mesh, 0).getHex())
    await renderer.unmount()
  })

  it('no colorBy → every instance keeps the flat `color` prop (back-compat)', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={BARS} xKey="m" yKey="v">
        <BarSeries3D color="red" />
      </Chart3D>,
    )
    const mesh = findMeshNode(renderer.scene).instance as THREE.InstancedMesh
    for (let i = 0; i < mesh.count; i++) {
      expect(colorAt(mesh, i).getHex()).toBe(hex('red'))
    }
    await renderer.unmount()
  })
})

describe('hover over a colorBy series', () => {
  it('restores each instance to its OWN colorBy base on pointerOut; siblings untouched', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={BARS} xKey="m" yKey="v">
        <BarSeries3D colorBy={(d) => d.region as string} highlightColor="#ffffff" />
      </Chart3D>,
    )
    const node = findMeshNode(renderer.scene)
    const mesh = node.instance as THREE.InstancedMesh
    const base0 = colorAt(mesh, 0).getHex() // palette[0] (NA)
    const base1 = colorAt(mesh, 1).getHex() // palette[1] (EU)

    await renderer.fireEvent(node, 'pointerOver', { instanceId: 0 })
    expect(colorAt(mesh, 0).getHex()).toBe(hex('#ffffff')) // highlighted
    expect(colorAt(mesh, 1).getHex()).toBe(base1) // sibling untouched

    await renderer.fireEvent(node, 'pointerOut', { instanceId: 0 })
    // restored to its OWN colorBy base, NOT a shared flat color.
    expect(colorAt(mesh, 0).getHex()).toBe(base0)
    await renderer.unmount()
  })

  it('hovering a colorBy series commits the subtree 0 times (zero re-render preserved)', async () => {
    let updateCommits = 0
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={BARS} xKey="m" yKey="v">
        <Profiler
          id="colorby-bars"
          onRender={(_id, phase) => {
            if (phase === 'update') updateCommits++
          }}
        >
          <BarSeries3D colorBy={(d) => d.region as string} highlightColor="#ffffff" />
        </Profiler>
      </Chart3D>,
    )
    expect(updateCommits).toBe(0)
    const node = findMeshNode(renderer.scene)
    for (let id = 0; id < BARS.length; id++) {
      await renderer.fireEvent(node, 'pointerOver', { instanceId: id })
      await renderer.fireEvent(node, 'pointerOut', { instanceId: id })
    }
    expect(updateCommits).toBe(0)
    await renderer.unmount()
  })

  it('keeps the highlight when an unrelated re-render churns an inline colorBy', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={BARS} xKey="m" yKey="v">
        <BarSeries3D colorBy={(d) => d.region as string} highlightColor="#ffffff" />
      </Chart3D>,
    )
    const node = findMeshNode(renderer.scene)
    const mesh = node.instance as THREE.InstancedMesh
    await renderer.fireEvent(node, 'pointerOver', { instanceId: 0 })
    expect(colorAt(mesh, 0).getHex()).toBe(hex('#ffffff'))

    // Re-render with a NEW inline colorBy (fresh accessor identity), no data
    // change, no pointerOut. The base-color effect re-runs but must NOT wipe the
    // active highlight.
    await renderer.update(
      <Chart3D data={BARS} xKey="m" yKey="v">
        <BarSeries3D colorBy={(d) => d.region as string} highlightColor="#ffffff" />
      </Chart3D>,
    )
    expect(colorAt(mesh, 0).getHex()).toBe(hex('#ffffff')) // survives
    await renderer.unmount()
  })
})

describe('colorBy reacts to data changes', () => {
  it('repaints the per-instance base colors when the data changes', async () => {
    const A: Datum[] = [
      { m: 'Jan', v: 1, region: 'NA' },
      { m: 'Feb', v: 2, region: 'NA' },
      { m: 'Mar', v: 3, region: 'NA' },
    ]
    const B: Datum[] = [
      { m: 'Jan', v: 1, region: 'NA' },
      { m: 'Feb', v: 2, region: 'EU' },
      { m: 'Mar', v: 3, region: 'ASIA' },
    ]
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={A} xKey="m" yKey="v">
        <BarSeries3D colorBy={(d) => d.region as string} />
      </Chart3D>,
    )
    const mesh = findMeshNode(renderer.scene).instance as THREE.InstancedMesh
    expect(colorAt(mesh, 1).getHex()).toBe(hex(DEFAULT_PALETTE[0])) // all NA → palette[0]

    await renderer.update(
      <Chart3D data={B} xKey="m" yKey="v">
        <BarSeries3D colorBy={(d) => d.region as string} />
      </Chart3D>,
    )
    // instance 1 is now EU → palette[1]; the colors followed the new data.
    expect(colorAt(mesh, 1).getHex()).toBe(hex(DEFAULT_PALETTE[1]))
    expect(colorAt(mesh, 2).getHex()).toBe(hex(DEFAULT_PALETTE[2]))
    await renderer.unmount()
  })

  it('clears a stale highlight when the data shrinks past the hovered index', async () => {
    const three: Datum[] = [
      { m: 'Jan', v: 1, region: 'NA' },
      { m: 'Feb', v: 2, region: 'EU' },
      { m: 'Mar', v: 3, region: 'ASIA' },
    ]
    const two = three.slice(0, 2)
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={three} xKey="m" yKey="v">
        <BarSeries3D colorBy={(d) => d.region as string} highlightColor="#ffffff" />
      </Chart3D>,
    )
    const node = findMeshNode(renderer.scene)
    const mesh = node.instance as THREE.InstancedMesh
    await renderer.fireEvent(node, 'pointerOver', { instanceId: 2 })
    expect(colorAt(mesh, 2).getHex()).toBe(hex('#ffffff'))

    await renderer.update(
      <Chart3D data={two} xKey="m" yKey="v">
        <BarSeries3D colorBy={(d) => d.region as string} highlightColor="#ffffff" />
      </Chart3D>,
    )
    // The hovered row no longer exists; no instance is left stuck on highlight.
    expect(mesh.count).toBe(2)
    expect(colorAt(mesh, 0).getHex()).not.toBe(hex('#ffffff'))
    expect(colorAt(mesh, 1).getHex()).not.toBe(hex('#ffffff'))
    await renderer.unmount()
  })
})

describe('colorBy invalid input', () => {
  it('falls back to `color`, paints no white, and dev-warns once', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const bad: Datum[] = [
      { m: 'Jan', v: 1, region: 'north' },
      { m: 'Feb', v: 2, region: 'south' },
    ]
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={bad} xKey="m" yKey="v">
        <BarSeries3D color="green" colorBy={{ value: (d) => d.region as string, palette: 'raw' }} />
      </Chart3D>,
    )
    const mesh = findMeshNode(renderer.scene).instance as THREE.InstancedMesh
    for (let i = 0; i < mesh.count; i++) {
      expect(colorAt(mesh, i).getHex()).toBe(hex('green')) // fallback, not white
      expect(colorAt(mesh, i).getHex()).not.toBe(hex('white'))
    }
    const colorByWarns = warn.mock.calls.filter((c) =>
      String(c[0]).includes('colorBy could not resolve'),
    )
    expect(colorByWarns).toHaveLength(1) // useWarnOnce → exactly once
    await renderer.unmount()
  })
})
