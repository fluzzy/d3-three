import { type ThreeEvent, useThree } from '@react-three/fiber'
import { type RefObject, useLayoutEffect, useMemo, useRef } from 'react'
import { Color, type InstancedMesh } from 'three'
import type { Chart3DContextValue, Datum, SeriesEventHandler } from '../types'

/** Smallest GPU capacity; even a few rows get headroom so small changes reuse the mesh. */
const MIN_CAPACITY = 8

/** Next capacity ≥ `needed`: keep the current one if it fits, else grow by powers of two. */
function growCapacity(current: number, needed: number): number {
  if (needed <= current) return current
  let cap = Math.max(current, MIN_CAPACITY)
  while (cap < needed) cap *= 2
  return cap
}

/** Lays out every instance's transform matrix into `mesh` (called once per layout pass). */
export type WriteAll = (mesh: InstancedMesh, rows: Datum[]) => void

export interface InstancedSeriesOptions {
  /** chart context (data + scales); its identity changes when data/keys/dims change. */
  chart: Chart3DContextValue
  /** base CSS color for every instance. */
  color: string
  /** CSS color applied to the hovered instance. */
  highlightColor: string
  /** the only mark-specific logic: lay out all instance matrices. Memoize it (useCallback). */
  writeAll: WriteAll
  onClick?: SeriesEventHandler
  onPointerOver?: SeriesEventHandler
  onPointerOut?: SeriesEventHandler
}

export interface InstancedSeriesHandle {
  /** attach to `<instancedMesh ref>`. */
  ref: RefObject<InstancedMesh | null>
  /** GPU instance capacity for `<instancedMesh args={[, , capacity]}>`. */
  capacity: number
  /** spread onto `<instancedMesh {...handlers}>`. */
  handlers: {
    onPointerOver: (e: ThreeEvent<PointerEvent>) => void
    onPointerOut: (e: ThreeEvent<PointerEvent>) => void
    onClick: (e: ThreeEvent<MouseEvent>) => void
  }
}

/**
 * Shared engine for an instanced series mark (bars, points, …). It owns the
 * InstancedMesh ref, an over-provisioned GPU capacity (so an ordinary row-count
 * change reuses the same mesh + GPU buffers instead of reallocating them), the
 * base/highlight colors, the transform + color layout effects, and imperative
 * zero-rerender hover. The caller supplies only the memoized `writeAll` matrix
 * writer and the geometry — that is the entire difference between marks.
 */
export function useInstancedSeries(opts: InstancedSeriesOptions): InstancedSeriesHandle {
  const { chart, color, highlightColor, writeAll, onClick, onPointerOver, onPointerOut } = opts
  const ref = useRef<InstancedMesh | null>(null)
  // Hover is tracked imperatively (never via React state), so a pointer move is
  // O(2) setColorAt writes + one invalidate, with zero component re-renders.
  const hoveredRef = useRef(-1)
  const invalidate = useThree((s) => s.invalidate)

  const base = useMemo(() => new Color(color), [color])
  const highlight = useMemo(() => new Color(highlightColor), [highlightColor])

  // Over-provision GPU capacity and grow it monotonically. `args` (hence the host
  // InstancedMesh) only changes when the data outgrows the capacity, so ordinary
  // row-count changes reuse the same mesh; `mesh.count` drives what renders.
  const capacityRef = useRef(0)
  capacityRef.current = growCapacity(capacityRef.current, chart.data.length)
  const capacity = Math.max(capacityRef.current, 1)

  // Transforms — rewritten only when the chart or the memoized writer changes.
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    writeAll(mesh, chart.data)
    mesh.count = chart.data.length
    mesh.instanceMatrix.needsUpdate = true
    invalidate()
  }, [chart, writeAll, invalidate])

  // Base colors — repainted only when the data or the base color changes.
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const rows = chart.data
    for (let i = 0; i < rows.length; i++) mesh.setColorAt(i, base)
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    hoveredRef.current = -1
    invalidate()
  }, [chart, base, invalidate])

  const setHover = (id: number) => {
    const mesh = ref.current
    if (!mesh || !mesh.instanceColor) return
    const prev = hoveredRef.current
    if (id === prev) return
    const count = chart.data.length
    if (prev >= 0 && prev < count) mesh.setColorAt(prev, base)
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
