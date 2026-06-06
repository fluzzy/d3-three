import { useMemo } from 'react'
import { axisBandwidth, axisPosition } from '../core/scales'
import type { Chart3DContextValue, Datum } from '../types'
import { useChart3D } from './useChart3D'

/** Default band footprint (world units) for a linear x/z axis, matching BarSeries3D. */
const DEFAULT_FALLBACK = 0.5

export interface SeriesLayoutRow3D {
  /** the source row — same reference as the chart's validated `data[index]`. */
  datum: Datum
  index: number
  /** world-space center: band center for band axes, the scaled value for linear. */
  x: number
  y: number
  z: number
}

export interface SeriesLayout3D {
  rows: SeriesLayoutRow3D[]
  /** world-space y for value 0 (=== `chart.yBaseline`); bars grow from here. */
  yBaseline: number
  /** x footprint: band width, or `fallback` for a linear x axis. */
  bandWidth: number
  /** z footprint: z band width, or `bandWidth` when there is no z axis. */
  bandDepth: number
  /** the enclosing chart context, so a custom mark reads `useChart3D()` once. */
  chart: Chart3DContextValue
}

/**
 * Headless per-row world positions, computed exactly like the built-in marks,
 * for building custom instanced marks. Must be called inside a `<Chart3D>`.
 */
export function useSeriesLayout3D(options?: { fallback?: number }): SeriesLayout3D {
  const chart = useChart3D()
  const fallback = options?.fallback ?? DEFAULT_FALLBACK
  return useMemo(() => {
    const { data, xKey, yKey, zKey, xScale, yScale, zScale, yBaseline } = chart
    const rows: SeriesLayoutRow3D[] = data.map((datum, index) => ({
      datum,
      index,
      x: axisPosition(xScale, datum[xKey]),
      y: yScale(Number(datum[yKey])),
      z: zScale && zKey ? axisPosition(zScale, datum[zKey]) : 0,
    }))
    const bandWidth = axisBandwidth(xScale, fallback)
    const bandDepth = zScale ? axisBandwidth(zScale, fallback) : bandWidth
    return { rows, yBaseline, bandWidth, bandDepth, chart }
  }, [chart, fallback])
}
