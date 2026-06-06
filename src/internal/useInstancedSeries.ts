import { type ThreeEvent, useThree } from '@react-three/fiber'
import { type RefObject, useLayoutEffect, useMemo, useRef } from 'react'
import { Color, type InstancedMesh } from 'three'
import type { Chart3DContextValue, Datum, SeriesEventHandler } from '../types'

const MIN_CAPACITY = 8

/** Next capacity ≥ `needed`: keep the current one if it fits, else grow by powers of two. */
function growCapacity(current: number, needed: number): number {
  if (needed <= current) return current
  let cap = Math.max(current, MIN_CAPACITY)
  while (cap < needed) cap *= 2
  return cap
}

/** Lays out every instance's transform matrix into `mesh`. */
export type WriteAll = (mesh: InstancedMesh, rows: Datum[]) => void

export interface InstancedSeriesOptions {
  chart: Chart3DContextValue
  color: string
  highlightColor: string
  /** optional per-instance base colors (length === rows); overrides `color`. */
  colors?: Color[]
  /** the only mark-specific logic; memoize with useCallback. */
  writeAll: WriteAll
  onClick?: SeriesEventHandler
  onPointerOver?: SeriesEventHandler
  onPointerOut?: SeriesEventHandler
}

export interface InstancedSeriesHandle {
  ref: RefObject<InstancedMesh | null>
  capacity: number
  handlers: {
    onPointerOver: (e: ThreeEvent<PointerEvent>) => void
    onPointerOut: (e: ThreeEvent<PointerEvent>) => void
    onClick: (e: ThreeEvent<MouseEvent>) => void
  }
}

/**
 * Shared engine for an instanced series mark: owns the mesh, an over-provisioned
 * capacity (row-count changes reuse the mesh), colors, the layout effects, and
 * imperative zero-rerender hover. Marks supply only `writeAll` and the geometry.
 */
export function useInstancedSeries(opts: InstancedSeriesOptions): InstancedSeriesHandle {
  const { chart, color, highlightColor, colors, writeAll, onClick, onPointerOver, onPointerOut } =
    opts
  const ref = useRef<InstancedMesh | null>(null)
  const hoveredRef = useRef(-1)
  const invalidate = useThree((s) => s.invalidate)

  const base = useMemo(() => new Color(color), [color])
  const highlight = useMemo(() => new Color(highlightColor), [highlightColor])

  // Monotonic over-provisioned capacity so a row-count change reuses the mesh.
  const capacityRef = useRef(0)
  capacityRef.current = growCapacity(capacityRef.current, chart.data.length)
  const capacity = Math.max(capacityRef.current, 1)

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    writeAll(mesh, chart.data)
    mesh.count = chart.data.length
    mesh.instanceMatrix.needsUpdate = true
    invalidate()
  }, [chart.data, writeAll, invalidate])

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const rows = chart.data
    for (let i = 0; i < rows.length; i++) mesh.setColorAt(i, colors?.[i] ?? base)
    // Re-apply an active highlight instead of clearing it: a colorBy series with
    // an inline accessor re-runs this effect on every parent re-render, which
    // must not wipe the hovered instance. Clamp only when the row no longer exists.
    const hovered = hoveredRef.current
    if (hovered >= 0 && hovered < rows.length) mesh.setColorAt(hovered, highlight)
    else hoveredRef.current = -1
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    invalidate()
  }, [chart.data, base, colors, highlight, invalidate])

  // Imperative hover: no React state → zero series re-renders.
  const setHover = (id: number) => {
    const mesh = ref.current
    if (!mesh || !mesh.instanceColor) return
    const prev = hoveredRef.current
    if (id === prev) return
    const count = chart.data.length
    if (prev >= 0 && prev < count) mesh.setColorAt(prev, colors?.[prev] ?? base)
    if (id >= 0 && id < count) mesh.setColorAt(id, highlight)
    mesh.instanceColor.needsUpdate = true
    hoveredRef.current = id
    invalidate()
  }

  return {
    ref,
    capacity,
    handlers: {
      onPointerOver: (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        if (e.instanceId === undefined) return
        setHover(e.instanceId)
        onPointerOver?.(e, chart.data[e.instanceId], e.instanceId)
      },
      onPointerOut: (e: ThreeEvent<PointerEvent>) => {
        const prev = hoveredRef.current
        setHover(-1)
        const id = e.instanceId ?? prev
        if (id >= 0) onPointerOut?.(e, chart.data[id], id)
      },
      onClick: (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation()
        if (e.instanceId === undefined) return
        onClick?.(e, chart.data[e.instanceId], e.instanceId)
      },
    },
  }
}
