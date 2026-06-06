import { scaleOrdinal } from 'd3-scale'
import { Color } from 'three'
import type { ColorAccessor, ColorByConfig, Datum } from '../types'

/** Zero-config categorical palette (Tableau 10) used when no palette is given. */
export const DEFAULT_PALETTE = [
  '#4e79a7',
  '#f28e2b',
  '#e15759',
  '#76b7b2',
  '#59a14f',
  '#edc949',
  '#af7aa1',
  '#ff9da7',
  '#9c755f',
  '#bab0ac',
] as const

export const COLORBY_INVALID_WARNING =
  'colorBy could not resolve a color for one or more rows (wrong value type or an unparseable color string); those marks fall back to the `color` prop. Check the colorBy accessor / palette.'

export interface ResolveColorsResult {
  colors: Color[]
  /** true when any row fell back to `color` (dev-warn once, never throw). */
  invalid: boolean
}

// new Color('bad') warns and silently returns WHITE rather than throwing, so a
// sentinel probe is the only reliable way to detect an unparseable string and
// honor the caller's fallback instead of poisoning the instance with white.
const SENTINEL = 0x010203
function parseColor(input: string, fallback: Color): { color: Color; ok: boolean } {
  const c = new Color(SENTINEL)
  c.set(input)
  return c.getHex() === SENTINEL ? { color: fallback.clone(), ok: false } : { color: c, ok: true }
}

/**
 * Resolves a per-instance base color for every row, or `undefined` when there
 * is no `colorBy` (the engine then keeps its single base color — exact v0.1
 * back-compat). Bare string accessors map categorically through DEFAULT_PALETTE;
 * `palette: 'raw'` treats the value as a CSS color; a function palette maps a
 * numeric value. Bad input degrades to `fallbackColor` and flags `invalid`.
 */
export function resolveColors(
  rows: Datum[],
  colorBy: ColorAccessor | ColorByConfig | undefined,
  fallbackColor: string,
): ResolveColorsResult | undefined {
  if (!colorBy) return undefined
  const cfg = typeof colorBy === 'function' ? { value: colorBy } : colorBy
  const fallback = new Color(fallbackColor)
  const colors: Color[] = new Array(rows.length)
  let invalid = false

  if (typeof cfg.palette === 'function') {
    const ramp = cfg.palette
    for (let i = 0; i < rows.length; i++) {
      const v = cfg.value(rows[i], i)
      if (typeof v !== 'number') {
        colors[i] = fallback.clone()
        invalid = true
        continue
      }
      const { color, ok } = parseColor(ramp(v), fallback)
      colors[i] = color
      if (!ok) invalid = true
    }
  } else if (cfg.palette === 'raw') {
    for (let i = 0; i < rows.length; i++) {
      const v = cfg.value(rows[i], i)
      if (typeof v !== 'string') {
        colors[i] = fallback.clone()
        invalid = true
        continue
      }
      const { color, ok } = parseColor(v, fallback)
      colors[i] = color
      if (!ok) invalid = true
    }
  } else {
    const range = Array.isArray(cfg.palette) ? cfg.palette : [...DEFAULT_PALETTE]
    const ordinal = scaleOrdinal<string, string>().range(range)
    for (let i = 0; i < rows.length; i++) {
      const { color, ok } = parseColor(ordinal(String(cfg.value(rows[i], i))), fallback)
      colors[i] = color
      if (!ok) invalid = true
    }
  }
  return { colors, invalid }
}
