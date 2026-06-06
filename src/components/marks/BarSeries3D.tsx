import { useCallback, useMemo } from 'react'
import type { InstancedMesh } from 'three'
import { COLORBY_INVALID_WARNING, resolveColors } from '../../core/colorBy'
import { isBandScale } from '../../core/scales'
import { useSeriesLayout3D } from '../../hooks/useSeriesLayout3D'
import { writeBox } from '../../internal/instancing'
import { useInstancedSeries } from '../../internal/useInstancedSeries'
import { useWarnOnce } from '../../internal/useWarnOnce'
import type { SeriesBaseProps } from '../../types'

export type BarSeries3DProps = SeriesBaseProps

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
  colorBy,
  onClick,
  onPointerOver,
  onPointerOut,
}: BarSeries3DProps) {
  const layout = useSeriesLayout3D()
  const { chart } = layout

  useWarnOnce(isBandScale(chart.xScale) ? undefined : BAND_AXIS_WARNING)

  const colorResult = useMemo(
    () => resolveColors(chart.data, colorBy, color),
    [chart.data, colorBy, color],
  )
  useWarnOnce(colorResult?.invalid ? COLORBY_INVALID_WARNING : undefined)

  const writeAll = useCallback(
    (mesh: InstancedMesh) => {
      const { rows, yBaseline, bandWidth, bandDepth } = layout
      for (const { x, y, z, index } of rows) {
        // Box is centered, so a bar from yBaseline to y has center (y+base)/2.
        writeBox(mesh, index, {
          x,
          y: (y + yBaseline) / 2,
          z,
          width: bandWidth,
          height: Math.abs(y - yBaseline),
          depth: bandDepth,
        })
      }
    },
    [layout],
  )

  const { ref, capacity, handlers } = useInstancedSeries({
    chart,
    color,
    highlightColor,
    colors: colorResult?.colors,
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
