import { type ThreeEvent, useThree } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { Color, type InstancedMesh } from 'three'
import { axisPosition, isBandScale } from '../core/scales'
import { useChart3D } from '../hooks/useChart3D'
import { isDev } from '../internal/env'
import { scratchColor, writePoint } from '../internal/instancing'
import type { SeriesBaseProps } from '../types'

export interface ScatterSeries3DProps extends SeriesBaseProps {
  /** uniform sphere radius in world units (default 0.15). */
  size?: number
}

/**
 * InstancedMesh 3D scatter series. Reads x/y/z scales from the enclosing
 * `<Chart3D>` and plots one unit sphere per row, scaled by `size`. With `zKey`
 * set on Chart3D the points fill the xyz volume; without it they sit on the z=0
 * plane (a 2D scatter — see the dev warning below).
 *
 * Best for distribution / correlation across three numeric axes. A flat 2D
 * scatter gains nothing from 3D perspective — prefer 2D Recharts there.
 */
export function ScatterSeries3D({
  color = 'steelblue',
  highlightColor = '#ffaa00',
  onClick,
  onPointerOver,
  onPointerOut,
  size = 0.15,
}: ScatterSeries3DProps) {
  const { data, xKey, yKey, zKey, xScale, yScale, zScale } = useChart3D()
  const ref = useRef<InstancedMesh>(null)
  // Hover is tracked imperatively (never via React state) so a pointer move is
  // O(2) setColorAt writes + one invalidate, with zero component re-renders.
  const hoveredRef = useRef(-1)
  // Warns at most once per mount when rendering a degenerate 2D plane.
  const warnedRef = useRef(false)
  // Warns at most once per mount when fed a categorical axis (wrong series type).
  const warnedScaleRef = useRef(false)
  const invalidate = useThree((s) => s.invalidate)

  // v0.1 coloring: a single `color` for every point (default steelblue).
  // Per-datum palettes (`colorBy`) land in v0.2.
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

  // Transforms — rewritten only when data/scales/size inputs change.
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    if (isDev && !zKey && !warnedRef.current) {
      warnedRef.current = true
      console.warn(
        '[d3-three] ScatterSeries3D without zKey renders a 2D plane; consider 2D Recharts',
      )
    }
    if (
      isDev &&
      !warnedScaleRef.current &&
      (isBandScale(xScale) || (zScale && isBandScale(zScale)))
    ) {
      warnedScaleRef.current = true
      console.warn(
        '[d3-three] ScatterSeries3D expects continuous (numeric) x/y/z axes; a categorical axis collapses points onto band centers. Use BarSeries3D for categorical axes.',
      )
    }
    for (let i = 0; i < data.length; i++) {
      const d = data[i]
      const x = axisPosition(xScale, d[xKey])
      const y = yScale(Number(d[yKey]))
      const z = zKey ? axisPosition(zScale!, d[zKey]) : 0
      writePoint(mesh, i, { x, y, z, size })
    }
    mesh.count = data.length
    mesh.instanceMatrix.needsUpdate = true
    invalidate()
  }, [data, xKey, yKey, zKey, xScale, yScale, zScale, size, invalidate])

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
      <sphereGeometry args={[1, 16, 16]} />
      <meshStandardMaterial />
    </instancedMesh>
  )
}
