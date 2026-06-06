import type { ThreeEvent } from '@react-three/fiber'
import type { ScaleBand, ScaleLinear } from 'd3-scale'

/** A single Recharts-style data row, e.g. `{ month: 'Jan', revenue: 100 }`. */
export type Datum = Record<string, unknown>

/**
 * x / z axes are categorical (band, string domain) or continuous (linear,
 * number domain). Chart3D infers which per axis from the data.
 */
export type AxisScale = ScaleBand<string> | ScaleLinear<number, number>

/** y axis is always continuous, anchored so its domain includes 0. */
export type LinearScale = ScaleLinear<number, number>

export type AxisName = 'x' | 'y' | 'z'

export interface ChartDimensions {
  /** world-space width spanned by the x axis (default 10) */
  width: number
  /** world-space height spanned by the y axis (default 5) */
  height: number
  /** world-space depth spanned by the z axis (default 10) */
  depth: number
}

export interface Chart3DContextValue extends ChartDimensions {
  /** validated + normalized rows (invalid rows removed) */
  data: Datum[]
  xKey: string
  yKey: string
  zKey?: string
  /**
   * Per-axis d3 scales. Each scale's `.range()` is the WORLD-SPACE source of
   * truth — Axis3D reads line endpoints from `scale.range()`. The scale's
   * `.domain()` is the data space. x/z are band (string data) or linear (number
   * data); y is always linear with a 0-anchored domain mapped to `[0, height]`.
   */
  xScale: AxisScale
  yScale: LinearScale
  zScale?: AxisScale
  /** world-space y for value 0; bars grow from here. Equals `yScale(0)`. */
  yBaseline: number
  /**
   * World-space extents of each axis — exactly each scale's `.range()`. These are
   * the Axis3D line endpoints, in Three.js world coordinates.
   */
  bounds: {
    x: [number, number]
    y: [number, number]
    z?: [number, number]
  }
  /**
   * Data-space extents of each axis — exactly each scale's `.domain()`. Band
   * (categorical) axes carry the `string[]` category list; linear axes carry the
   * numeric `[min, max]`.
   */
  domain: {
    x: [number, number] | string[]
    y: [number, number]
    z?: [number, number] | string[]
  }
}

/** Pointer/click handler for a series instance, carrying the bound datum. */
export type SeriesEventHandler = (
  event: ThreeEvent<MouseEvent | PointerEvent>,
  datum: Datum,
  index: number,
) => void

/** Maps a row to a CSS color string, or to a domain value the palette resolves. */
export type ColorAccessor = (datum: Datum, index: number) => string | number

export interface ColorByConfig {
  value: ColorAccessor
  /**
   * - omitted: categorical via `DEFAULT_PALETTE` (string values → palette colors)
   * - `string[]`: categorical with a custom palette (wraps if shorter than the domain)
   * - `(value: number) => string`: continuous; you supply the number→color function
   * - `'raw'`: `value` already returns CSS color strings, used as-is
   */
  palette?: string[] | ((value: number) => string) | 'raw'
}

export interface SeriesBaseProps {
  /** single CSS color for every instance (default `steelblue`); the fallback when `colorBy` is absent or a row fails to resolve. */
  color?: string
  /** color applied to the hovered instance (default `#ffaa00`). */
  highlightColor?: string
  /** per-instance base color from each datum (accessor shorthand or full config); overrides `color`. */
  colorBy?: ColorAccessor | ColorByConfig
  /** fired when an instance is clicked. */
  onClick?: SeriesEventHandler
  /** fired when the pointer enters an instance. */
  onPointerOver?: SeriesEventHandler
  /** fired when the pointer leaves an instance. */
  onPointerOut?: SeriesEventHandler
}
