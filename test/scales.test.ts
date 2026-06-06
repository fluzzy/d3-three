import { describe, expect, it } from 'vitest'
import {
  axisBandwidth,
  axisPosition,
  createAxisScale,
  createYScale,
  inferScaleType,
  isBandScale,
  safeLinearDomain,
} from '../src/core/scales'

describe('inferScaleType', () => {
  it('returns "linear" when every present value is a finite number', () => {
    expect(inferScaleType([1, 2, 3])).toBe('linear')
    expect(inferScaleType([0, -4.5, 100])).toBe('linear')
  })

  it('returns "band" when any value is a string', () => {
    expect(inferScaleType(['Jan', 'Feb'])).toBe('band')
  })

  it('returns "band" for mixed string/number values', () => {
    expect(inferScaleType([1, 'two', 3])).toBe('band')
  })

  it('returns "band" for empty input', () => {
    expect(inferScaleType([])).toBe('band')
  })

  it('ignores null/undefined but bands on non-finite numbers', () => {
    expect(inferScaleType([1, null, 2, undefined])).toBe('linear')
    expect(inferScaleType([1, Number.NaN])).toBe('band')
    expect(inferScaleType([1, Number.POSITIVE_INFINITY])).toBe('band')
    // all values absent → band
    expect(inferScaleType([null, undefined])).toBe('band')
  })
})

describe('safeLinearDomain', () => {
  it('returns the fallback for empty input', () => {
    expect(safeLinearDomain([])).toEqual([0, 1])
    expect(safeLinearDomain([], [5, 10])).toEqual([5, 10])
  })

  it('pads a degenerate [a, a] domain into a non-degenerate range', () => {
    const [lo, hi] = safeLinearDomain([7, 7])
    expect(lo).toBeLessThan(hi)
    expect(lo).toBeCloseTo(7 - 7 * 0.05)
    expect(hi).toBeCloseTo(7 + 7 * 0.05)
  })

  it('pads a degenerate [0, 0] domain to [-1, 1]', () => {
    expect(safeLinearDomain([0, 0])).toEqual([-1, 1])
  })

  it('passes a normal domain through as [min, max]', () => {
    expect(safeLinearDomain([3, 1, 9, 4])).toEqual([1, 9])
  })
})

describe('createAxisScale', () => {
  it('builds a band scale with positive bandwidth for string values', () => {
    const scale = createAxisScale(['a', 'b', 'c'], 10)
    expect(isBandScale(scale)).toBe(true)
    if (isBandScale(scale)) {
      expect(scale.bandwidth()).toBeGreaterThan(0)
      expect(scale.domain()).toEqual(['a', 'b', 'c'])
    }
  })

  it('dedupes categories for a band scale', () => {
    const scale = createAxisScale(['a', 'a', 'b'], 10)
    expect(isBandScale(scale)).toBe(true)
    if (isBandScale(scale)) expect(scale.domain()).toEqual(['a', 'b'])
  })

  it('builds a linear scale mapping numeric values into [-span/2, span/2]', () => {
    const span = 10
    const scale = createAxisScale([0, 100], span)
    expect(isBandScale(scale)).toBe(false)
    // .nice() may widen the domain, but the range is the world-space truth.
    expect(scale.range()).toEqual([-span / 2, span / 2])
  })
})

describe('createYScale', () => {
  it('produces a domain that includes 0', () => {
    const scale = createYScale([10, 20, 30], 5)
    const [lo, hi] = scale.domain()
    expect(lo).toBeLessThanOrEqual(0)
    expect(hi).toBeGreaterThanOrEqual(0)
  })

  it('floors at 0 for all-positive data: yScale(0) === 0 exactly', () => {
    const scale = createYScale([10, 20, 30], 5)
    expect(scale(0)).toBe(0)
  })

  it('maps the range to [0, height]', () => {
    expect(createYScale([10, 20], 5).range()).toEqual([0, 5])
  })

  it('handles empty input without crashing and keeps 0 in domain', () => {
    const scale = createYScale([], 5)
    const [lo, hi] = scale.domain()
    expect(lo).toBeLessThanOrEqual(0)
    expect(hi).toBeGreaterThanOrEqual(0)
    expect(scale.range()).toEqual([0, 5])
  })
})

describe('axisPosition', () => {
  it('returns the band center for a band scale (scale(cat) + bandwidth/2)', () => {
    const scale = createAxisScale(['a', 'b', 'c'], 10)
    expect(isBandScale(scale)).toBe(true)
    if (isBandScale(scale)) {
      const left = scale('b') as number
      expect(axisPosition(scale, 'b')).toBeCloseTo(left + scale.bandwidth() / 2)
    }
  })

  it('returns scale(value) for a linear scale', () => {
    const scale = createAxisScale([0, 100], 10)
    expect(axisPosition(scale, 50)).toBeCloseTo((scale as (n: number) => number)(50))
  })
})

describe('axisBandwidth', () => {
  it('returns the bandwidth for a band scale', () => {
    const scale = createAxisScale(['a', 'b'], 10)
    expect(isBandScale(scale)).toBe(true)
    if (isBandScale(scale)) {
      expect(axisBandwidth(scale, 0.5)).toBe(scale.bandwidth())
    }
  })

  it('returns the fallback for a linear scale', () => {
    const scale = createAxisScale([0, 100], 10)
    expect(axisBandwidth(scale, 0.5)).toBe(0.5)
  })
})
