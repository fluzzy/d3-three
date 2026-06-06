import ReactThreeTestRenderer from '@react-three/test-renderer'
import * as THREE from 'three'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Chart3D } from '../../src/components/Chart3D'
import { Axis3D } from '../../src/components/marks/Axis3D'
import type { Datum } from '../../src/types'

// Stable references so Chart3D's context — and thus the axis scale/ticks — keeps
// its identity across re-renders, isolating the tickFormat / color change.
const DATA: Datum[] = [
  { x: 'Jan', y: 10 },
  { x: 'Feb', y: 20 },
  { x: 'Mar', y: 30 },
]

let rasterCount = 0

afterEach(() => {
  vi.restoreAllMocks()
})

/**
 * Stubs a 2D canvas context (jsdom returns null) and counts each label
 * rasterization: createTextSprite is the only getContext('2d') caller, so one
 * '2d' request == one CanvasTexture built.
 */
function countingStub2d(): void {
  rasterCount = 0
  const prev = HTMLCanvasElement.prototype.getContext
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
    this: HTMLCanvasElement,
    contextId: string,
    ...args: unknown[]
  ): unknown {
    if (contextId === '2d') {
      rasterCount++
      return {
        font: '',
        textAlign: '',
        textBaseline: '',
        lineJoin: '',
        lineWidth: 0,
        strokeStyle: '',
        fillStyle: '',
        measureText: (_t: string) => ({ width: 42 }),
        strokeText: () => {},
        fillText: () => {},
      }
    }
    return (prev as (...a: unknown[]) => unknown).call(this, contextId, ...args)
  } as typeof HTMLCanvasElement.prototype.getContext)
}

describe('Axis3D label rasterization gating', () => {
  it('does not re-rasterize labels when an inline tickFormat returns the same strings', async () => {
    countingStub2d()
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={DATA} xKey="x" yKey="y">
        <Axis3D axis="x" tickFormat={(v) => `#${v}`} />
      </Chart3D>,
    )
    const afterMount = rasterCount
    expect(afterMount).toBe(DATA.length) // one raster per category at mount

    // Re-render with a NEW inline tickFormat that returns the SAME strings. The
    // label text is unchanged, so nothing should be re-rasterized.
    await renderer.update(
      <Chart3D data={DATA} xKey="x" yKey="y">
        <Axis3D axis="x" tickFormat={(v) => `#${v}`} />
      </Chart3D>,
    )
    expect(rasterCount - afterMount).toBe(0)

    await renderer.unmount()
  })

  it('rebuilds the label textures when color changes (color is baked into the canvas)', async () => {
    countingStub2d()
    const texDispose = vi.spyOn(THREE.CanvasTexture.prototype, 'dispose')
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={DATA} xKey="x" yKey="y">
        <Axis3D axis="x" color="#111111" />
      </Chart3D>,
    )
    const afterMount = rasterCount

    await renderer.update(
      <Chart3D data={DATA} xKey="x" yKey="y">
        <Axis3D axis="x" color="#ff0000" />
      </Chart3D>,
    )
    // color is painted into the texture, so every label must be rebuilt...
    expect(rasterCount - afterMount).toBe(DATA.length)
    // ...and the previous textures disposed (no leak).
    expect(texDispose.mock.calls.length).toBe(DATA.length)

    await renderer.unmount()
  })
})
