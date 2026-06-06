import { useCallback } from 'react'
import type { InstancedMesh } from 'three'
import { axisPosition, isBandScale } from '../../core/scales'
import { useChart3D } from '../../hooks/useChart3D'
import { writePoint } from '../../internal/instancing'
import { useInstancedSeries } from '../../internal/useInstancedSeries'
import { useWarnOnce } from '../../internal/useWarnOnce'
import type { Datum, SeriesBaseProps } from '../../types'

export interface ScatterSeries3DProps extends SeriesBaseProps {
  /** uniform sphere radius in world units (default 0.15). */
  size?: number
}

const FLAT_PLANE_WARNING = 'ScatterSeries3D without zKey renders a 2D plane; consider 2D Recharts'

const CONTINUOUS_AXIS_WARNING =
  'ScatterSeries3D expects continuous (numeric) x/y/z axes; a categorical axis collapses points onto band centers. Use BarSeries3D for categorical axes.'

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
  const chart = useChart3D()
  const { xKey, yKey, zKey, xScale, yScale, zScale } = chart

  useWarnOnce(zKey ? undefined : FLAT_PLANE_WARNING)
  const hasBandAxis = isBandScale(xScale) || (zScale !== undefined && isBandScale(zScale))
  useWarnOnce(hasBandAxis ? CONTINUOUS_AXIS_WARNING : undefined)

  // Points: direct linear positions, uniform `size` on every axis (no baseline).
  const writeAll = useCallback(
    (mesh: InstancedMesh, rows: Datum[]) => {
      for (let i = 0; i < rows.length; i++) {
        const d = rows[i]
        const x = axisPosition(xScale, d[xKey])
        const y = yScale(Number(d[yKey]))
        const z = zKey ? axisPosition(zScale!, d[zKey]) : 0
        writePoint(mesh, i, { x, y, z, size })
      }
    },
    [xScale, yScale, zScale, xKey, yKey, zKey, size],
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
      <sphereGeometry args={[1, 16, 16]} />
      <meshStandardMaterial />
    </instancedMesh>
  )
}
