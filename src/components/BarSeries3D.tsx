import { useCallback } from 'react'
import type { InstancedMesh } from 'three'
import { axisBandwidth, axisPosition, isBandScale } from '../core/scales'
import { useChart3D } from '../hooks/useChart3D'
import { writeBox } from '../internal/instancing'
import { useInstancedSeries } from '../internal/useInstancedSeries'
import { useWarnOnce } from '../internal/useWarnOnce'
import type { Datum, SeriesBaseProps } from '../types'

export type BarSeries3DProps = SeriesBaseProps

/** Fallback bar footprint (world units) when fed a non-band (linear) x/z axis. */
const LINEAR_BAR_WIDTH = 0.5

const BAND_AXIS_WARNING =
  'BarSeries3D expects a categorical (band) x axis (string xKey values); got a continuous one. Use ScatterSeries3D for numeric x.'

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
  const chart = useChart3D()
  const { xKey, yKey, zKey, xScale, yScale, zScale, yBaseline } = chart

  useWarnOnce(isBandScale(xScale) ? undefined : BAND_AXIS_WARNING)

  // Bars: band-width footprint, growing from the yScale(0) baseline. Negative
  // values grow downward (their top sits at the baseline).
  const writeAll = useCallback(
    (mesh: InstancedMesh, rows: Datum[]) => {
      const width = axisBandwidth(xScale, LINEAR_BAR_WIDTH)
      const depth = zScale ? axisBandwidth(zScale, LINEAR_BAR_WIDTH) : width
      for (let i = 0; i < rows.length; i++) {
        const d = rows[i]
        const x = axisPosition(xScale, d[xKey])
        const z = zKey ? axisPosition(zScale!, d[zKey]) : 0
        const top = yScale(Number(d[yKey]))
        const height = Math.abs(top - yBaseline)
        writeBox(mesh, i, { x, y: (top + yBaseline) / 2, z, width, height, depth })
      }
    },
    [xScale, zScale, yScale, yBaseline, xKey, yKey, zKey],
  )

  const { ref, capacity, handlers } = useInstancedSeries({
    chart,
    color,
    highlightColor,
    writeAll,
    onClick,
    onPointerOver,
    onPointerOut,
  })

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, capacity]}
      frustumCulled={false}
      {...handlers}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial />
    </instancedMesh>
  )
}
