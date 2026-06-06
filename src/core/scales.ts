import { extent } from 'd3-array'
import { type ScaleBand, type ScaleLinear, scaleBand, scaleLinear } from 'd3-scale'
import type { AxisScale, ChartDimensions, LinearScale } from '../types'

const BAND_PADDING_INNER = 0.1
const BAND_PADDING_OUTER = 0.05

/**
 * A value array is continuous (linear) only if every present value is a finite
 * number; otherwise it is categorical (band).
 */
export function inferScaleType(values: unknown[]): 'band' | 'linear' {
  const present = values.filter((v) => v !== undefined && v !== null)
  if (present.length === 0) return 'band'
  return present.every((v) => typeof v === 'number' && Number.isFinite(v)) ? 'linear' : 'band'
}

/** True when the scale is a d3 band scale (has `bandwidth`). */
export function isBandScale(scale: AxisScale): scale is ScaleBand<string> {
  return typeof (scale as ScaleBand<string>).bandwidth === 'function'
}

/**
 * Safe linear domain from numbers: falls back on empty/NaN input and pads a
 * degenerate `[a, a]` domain (which would otherwise collapse a linear scale to
 * a constant range-midpoint).
 */
export function safeLinearDomain(
  values: number[],
  fallback: [number, number] = [0, 1],
): [number, number] {
  if (values.length === 0) return fallback
  const [lo, hi] = extent(values) as [number | undefined, number | undefined]
  if (lo == null || hi == null || Number.isNaN(lo) || Number.isNaN(hi)) return fallback
  if (lo === hi) {
    const pad = lo === 0 ? 1 : Math.abs(lo) * 0.05
    return [lo - pad, hi + pad]
  }
  return [lo, hi]
}

/** x / z scale: band for categorical data, linear for numeric, over `[-span/2, span/2]`. */
export function createAxisScale(values: unknown[], span: number): AxisScale {
  const range: [number, number] = [-span / 2, span / 2]
  if (inferScaleType(values) === 'band') {
    const categories = Array.from(
      new Set(values.filter((v) => v !== undefined && v !== null).map((v) => String(v))),
    )
    return scaleBand<string>()
      .domain(categories)
      .range(range)
      .paddingInner(BAND_PADDING_INNER)
      .paddingOuter(BAND_PADDING_OUTER)
  }
  const nums = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  return scaleLinear().domain(safeLinearDomain(nums)).range(range).nice()
}

/**
 * y scale: always linear, domain anchored to include 0, mapped to `[0, height]`.
 * value 0 therefore lands at (or above) the xz floor; bars grow upward and
 * negative values downward from the `yScale(0)` baseline.
 */
export function createYScale(values: number[], height: number): LinearScale {
  const nums = values.filter((v) => Number.isFinite(v))
  const lo = Math.min(0, ...(nums.length ? nums : [0]))
  let hi = Math.max(0, ...(nums.length ? nums : [0]))
  if (lo === hi) hi = lo + 1 // avoid a degenerate constant scale
  return scaleLinear().domain([lo, hi]).range([0, height]).nice()
}

/** Center world-position of a value on an axis (band: band center; linear: scaled). */
export function axisPosition(scale: AxisScale, value: unknown): number {
  if (isBandScale(scale)) {
    const left = scale(String(value))
    return (left ?? 0) + scale.bandwidth() / 2
  }
  return (scale as ScaleLinear<number, number>)(Number(value))
}

/** Band width of a category, or `fallback` world units for a linear axis. */
export function axisBandwidth(scale: AxisScale, fallback: number): number {
  return isBandScale(scale) ? scale.bandwidth() : fallback
}

export interface ChartScales {
  xScale: AxisScale
  yScale: LinearScale
  zScale?: AxisScale
  yBaseline: number
  /** world-space extents per axis — each scale's `.range()`. */
  bounds: {
    x: [number, number]
    y: [number, number]
    z?: [number, number]
  }
  /** data-space extents per axis — each scale's `.domain()` (band: categories). */
  domain: {
    x: [number, number] | string[]
    y: [number, number]
    z?: [number, number] | string[]
  }
}

/** World-space extent of an axis: `scale.range()` as a `[lo, hi]` tuple. */
function axisRange(scale: AxisScale): [number, number] {
  const [lo, hi] = scale.range()
  return [lo, hi]
}

/**
 * Data-space extent of an axis: band → its `string[]` categories; linear → its
 * numeric `[min, max]` domain.
 */
function axisDomain(scale: AxisScale): [number, number] | string[] {
  if (isBandScale(scale)) return scale.domain()
  const [lo, hi] = scale.domain()
  return [lo, hi]
}

/** Builds the x/y/z scales (and the y baseline) for a Chart3D context. */
export function createScales(
  data: Record<string, unknown>[],
  xKey: string,
  yKey: string,
  zKey: string | undefined,
  dims: ChartDimensions,
): ChartScales {
  const xScale = createAxisScale(
    data.map((d) => d[xKey]),
    dims.width,
  )
  const yValues = data.map((d) => Number(d[yKey])).filter((v) => Number.isFinite(v))
  const yScale = createYScale(yValues, dims.height)
  const zScale = zKey
    ? createAxisScale(
        data.map((d) => d[zKey]),
        dims.depth,
      )
    : undefined
  return {
    xScale,
    yScale,
    zScale,
    yBaseline: yScale(0),
    bounds: {
      x: axisRange(xScale),
      y: axisRange(yScale),
      ...(zScale ? { z: axisRange(zScale) } : {}),
    },
    domain: {
      x: axisDomain(xScale),
      y: axisDomain(yScale) as [number, number],
      ...(zScale ? { z: axisDomain(zScale) } : {}),
    },
  }
}
