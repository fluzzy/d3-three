import { useCallback } from 'react'
import type { InstancedMesh } from 'three'
import { isBandScale } from '../../core/scales'
import { useSeriesLayout3D } from '../../hooks/useSeriesLayout3D'
import { writePoint } from '../../internal/instancing'
import { useInstancedSeries } from '../../internal/useInstancedSeries'
import { useWarnOnce } from '../../internal/useWarnOnce'
import type { SeriesBaseProps } from '../../types'

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
  const layout = useSeriesLayout3D()
  const { chart } = layout
  const { xScale, zScale, zKey } = chart

  useWarnOnce(zKey ? undefined : FLAT_PLANE_WARNING)
  const hasBandAxis = isBandScale(xScale) || (zScale !== undefined && isBandScale(zScale))
  useWarnOnce(hasBandAxis ? CONTINUOUS_AXIS_WARNING : undefined)

  const writeAll = useCallback(
    (mesh: InstancedMesh) => {
      for (const { x, y, z, index } of layout.rows) {
        writePoint(mesh, index, { x, y, z, size })
      }
    },
    [layout, size],
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
