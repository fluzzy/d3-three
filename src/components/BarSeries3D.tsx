import { type ThreeEvent, useThree } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { Color, type InstancedMesh } from 'three'
import { axisBandwidth, axisPosition, isBandScale } from '../core/scales'
import { useChart3D } from '../hooks/useChart3D'
import { isDev } from '../internal/env'
import { scratchColor, writeBox } from '../internal/instancing'
import type { SeriesBaseProps } from '../types'

export type BarSeries3DProps = SeriesBaseProps

/** Fallback bar footprint (world units) when fed a non-band (linear) x/z axis. */
const LINEAR_BAR_WIDTH = 0.5

/**
 * InstancedMesh 3D bar series. Reads x/y/z scales from the enclosing
 * `<Chart3D>`. With `zKey` set on Chart3D the bars are laid out on the xz grid
 * as grouped 3D bars; without it they sit on the z=0 plane. Bars grow from the
 * `yScale(0)` baseline (the xz floor for all-positive data).
 *
 * Best for category comparison / grouped 3D bars. For a single flat series,
 * 3D perspective hurts value reading — prefer ScatterSeries3D or 2D Recharts.
 */
export function BarSeries3D({
  color = 'steelblue',
  highlightColor = '#ffaa00',
  onClick,
  onPointerOver,
  onPointerOut,
}: BarSeries3DProps) {
  const { data, xKey, yKey, zKey, xScale, yScale, zScale, yBaseline } = useChart3D()
  const ref = useRef<InstancedMesh>(null)
  // Hover is tracked imperatively (never via React state) so a pointer move is
  // O(2) setColorAt writes + one invalidate, with zero component re-renders.
  const hoveredRef = useRef(-1)
  // One-shot dev warnings (kept stable across re-renders via refs).
  const warnedScaleRef = useRef(false)
  const invalidate = useThree((s) => s.invalidate)

  // v0.1 coloring: a single `color` for every bar (default steelblue). Per-datum
  // palettes (`colorBy`) land in v0.2.
  const baseColor = useMemo(() => new Color(color), [color])
  const baseColors = useMemo(() => data.map(() => baseColor), [data, baseColor])

  const setHover = (id: number) => {
    const mesh = ref.current
    if (!mesh || !mesh.instanceColor) return
    const prev = hoveredRef.current
    if (id === prev) return
    if (prev >= 0 && prev < baseColors.length) mesh.setColorAt(prev, baseColors[prev])
    if (id >= 0 && id < data.length) mesh.setColorAt(id, scratchColor.set(highlightColor))
    mesh.instanceColor.needsUpdate = true
    hoveredRef.current = id
    invalidate()
  }

  // Transforms — rewritten only when data/scales/geometry inputs change.
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    if (isDev && !warnedScaleRef.current && !isBandScale(xScale)) {
      warnedScaleRef.current = true
      console.warn(
        '[d3-three] BarSeries3D expects a categorical (band) x axis (string xKey values); got a continuous one. Use ScatterSeries3D for numeric x.',
      )
    }
    const bw = axisBandwidth(xScale, LINEAR_BAR_WIDTH)
    const bd = zScale ? axisBandwidth(zScale, LINEAR_BAR_WIDTH) : bw
    for (let i = 0; i < data.length; i++) {
      const d = data[i]
      const x = axisPosition(xScale, d[xKey])
      const z = zKey ? axisPosition(zScale!, d[zKey]) : 0
      const top = yScale(Number(d[yKey]))
      const height = Math.abs(top - yBaseline)
      const cy = (top + yBaseline) / 2
      writeBox(mesh, i, { x, y: cy, z, width: bw, height, depth: bd })
    }
    mesh.count = data.length
    mesh.instanceMatrix.needsUpdate = true
    invalidate()
  }, [data, xKey, yKey, zKey, xScale, yScale, zScale, yBaseline, invalidate])

  // Base colors — full write only when data/colors change.
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    for (let i = 0; i < data.length; i++) mesh.setColorAt(i, baseColors[i])
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    hoveredRef.current = -1
    invalidate()
  }, [data, baseColors, invalidate])

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, Math.max(data.length, 1)]}
      frustumCulled={false}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        if (e.instanceId === undefined) return
        setHover(e.instanceId)
        onPointerOver?.(e, data[e.instanceId], e.instanceId)
      }}
      onPointerOut={(e: ThreeEvent<PointerEvent>) => {
        const prev = hoveredRef.current
        setHover(-1)
        const id = e.instanceId ?? prev
        if (id >= 0) onPointerOut?.(e, data[id], id)
      }}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation()
        if (e.instanceId === undefined) return
        onClick?.(e, data[e.instanceId], e.instanceId)
      }}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial />
    </instancedMesh>
  )
}
