import type { ScaleLinear } from 'd3-scale'
import { useEffect, useMemo, useState } from 'react'
import { CanvasTexture, Sprite, SpriteMaterial } from 'three'
import { axisPosition, isBandScale } from '../../core/scales'
import { useChart3D } from '../../hooks/useChart3D'
import type { AxisName, AxisScale } from '../../types'

/** length (world units) of a tick mark drawn perpendicular to the axis. */
const TICK_LENGTH = 0.15

export interface Axis3DProps {
  /** which axis to draw — picks `xScale` / `yScale` / `zScale` from Chart3D. */
  axis: AxisName
  /** approximate tick count for linear axes (ignored by band axes; default 5). */
  tickCount?: number
  /** formats a tick value to its label string (defaults to `String(value)`). */
  tickFormat?: (value: unknown) => string
  /** axis line / tick color (default `#888888`). */
  color?: string
  /** render tick labels as camera-facing sprites (default true). */
  showLabels?: boolean
  /** world-space height of a label sprite (default 0.3). */
  fontSize?: number
}

/** A single tick: its data value and its world position along the axis. */
interface Tick {
  value: unknown
  pos: number
}

/**
 * Builds a camera-facing text Sprite from a CanvasTexture. In a headless test
 * env (`getContext('2d')` returns null) this returns null so callers can skip
 * the label gracefully instead of throwing.
 */
function createTextSprite(text: string, opts: { color: string; fontSize: number }): Sprite | null {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  // Clamp label length so a pathological tickFormat or huge category string
  // can't allocate an unbounded canvas (measureText-driven DoS).
  const label = text.length > 256 ? `${text.slice(0, 255)}…` : text

  const fontPx = 64
  ctx.font = `${fontPx}px sans-serif`
  const padding = 0.25 * fontPx
  const textWidth = ctx.measureText(label).width
  canvas.width = Math.min(4096, Math.max(1, Math.ceil(textWidth + padding * 2)))
  canvas.height = Math.ceil(fontPx + padding * 2)

  // measureText is reset when the canvas is resized, so restore the font/style.
  ctx.font = `${fontPx}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  // A dark halo keeps labels legible over bright data/grid (any background).
  ctx.lineJoin = 'round'
  ctx.lineWidth = fontPx * 0.14
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.65)'
  ctx.strokeText(label, canvas.width / 2, canvas.height / 2)
  ctx.fillStyle = opts.color
  ctx.fillText(label, canvas.width / 2, canvas.height / 2)

  const texture = new CanvasTexture(canvas)
  const material = new SpriteMaterial({ map: texture, transparent: true })
  const sprite = new Sprite(material)
  // Keep glyph aspect ratio; height tracks fontSize, width scales by the canvas.
  sprite.scale.set((canvas.width / canvas.height) * opts.fontSize, opts.fontSize, 1)
  return sprite
}

/**
 * Draws one chart axis: a base line spanning the scale's range plus a tick mark
 * (and optional camera-facing label sprite) at every tick. Endpoints come from
 * `scale.range()` — the world-space source of truth — so the axis always lines
 * up with the series and grid.
 *
 * - x axis: along X at y=0, z=0.
 * - y axis: along Y at x=`xScale.range()[0]`, z=0.
 * - z axis: along Z at x=`xScale.range()[0]`, y=0 (null when there is no zScale).
 *
 * Tick positions: `scale.ticks(tickCount)` for linear axes, the band centers
 * (`scale.domain()` via `axisPosition`) for band axes.
 */
export function Axis3D({
  axis,
  tickCount = 5,
  tickFormat,
  color = '#888888',
  showLabels = true,
  fontSize = 0.3,
}: Axis3DProps) {
  const { xScale, yScale, zScale } = useChart3D()

  // Pick the scale for this axis. z is optional — bail out before any work.
  const scale: AxisScale | undefined = axis === 'x' ? xScale : axis === 'y' ? yScale : zScale
  const xMin = xScale.range()[0]

  // Tick values + world positions, derived from the scale.
  const ticks = useMemo<Tick[]>(() => {
    if (!scale) return []
    if (isBandScale(scale)) {
      return scale.domain().map((c) => ({ value: c, pos: axisPosition(scale, c) }))
    }
    const linear = scale as ScaleLinear<number, number>
    return linear.ticks(tickCount).map((t: number) => ({ value: t, pos: linear(t) }))
  }, [scale, tickCount])

  // Line endpoints: the axis base segment followed by one short tick segment per
  // tick, all packed into a single position buffer for one <lineSegments>.
  const positions = useMemo<Float32Array | null>(() => {
    if (!scale) return null
    const [r0, r1] = scale.range() as [number, number]
    const verts: number[] = []

    if (axis === 'x') {
      verts.push(r0, 0, 0, r1, 0, 0)
      for (const { pos } of ticks) verts.push(pos, 0, 0, pos, -TICK_LENGTH, 0)
    } else if (axis === 'y') {
      verts.push(xMin, r0, 0, xMin, r1, 0)
      for (const { pos } of ticks) verts.push(xMin, pos, 0, xMin - TICK_LENGTH, pos, 0)
    } else {
      verts.push(xMin, 0, r0, xMin, 0, r1)
      for (const { pos } of ticks) verts.push(xMin, 0, pos, xMin - TICK_LENGTH, 0, pos)
    }
    return new Float32Array(verts)
  }, [scale, axis, ticks, xMin])

  // Label sprites are built AFTER commit (in an effect, never in render/useMemo)
  // so a half-built CanvasTexture/Sprite can't leak on an aborted render or a
  // StrictMode double-invoke. The cleanup disposes exactly the sprites it made.
  const [labels, setLabels] = useState<Sprite[]>([])
  useEffect(() => {
    if (!showLabels || !scale) {
      setLabels([])
      return
    }
    const sprites: Sprite[] = []
    for (const { value, pos } of ticks) {
      const text = tickFormat ? tickFormat(value) : String(value)
      const sprite = createTextSprite(text, { color, fontSize })
      if (!sprite) continue
      const labelOffset = fontSize * 0.75
      if (axis === 'x') sprite.position.set(pos, -TICK_LENGTH - labelOffset, 0)
      else if (axis === 'y') sprite.position.set(xMin - TICK_LENGTH - labelOffset, pos, 0)
      else sprite.position.set(xMin - TICK_LENGTH - labelOffset, 0, pos)
      sprites.push(sprite)
    }
    setLabels(sprites)
    return () => {
      for (const sprite of sprites) {
        const material = sprite.material as SpriteMaterial
        material.map?.dispose()
        material.dispose()
      }
    }
  }, [showLabels, scale, ticks, tickFormat, color, fontSize, axis, xMin])

  if (!scale || !positions) return null

  return (
    <group>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color={color} />
      </lineSegments>
      {labels.map((sprite, i) => (
        <primitive key={i} object={sprite} />
      ))}
    </group>
  )
}
