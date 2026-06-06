import { describe, expect, it } from 'vitest'
import { createAxisScale, createScales, isBandScale } from '../src/core/scales'
import type { ChartDimensions } from '../src/types'

/**
 * Context-level scale behavior that `scales.test.ts` (helper-level) does not pin:
 *  - band default padding is exactly paddingInner 0.1 / paddingOuter 0.05,
 *  - the `createScales` context output's `bounds` equals each scale's `.range()`,
 *  - `domain` is the ORIGINAL data units (band → category list, linear → [min,max]),
 *  - the y scale's domain always includes 0 (bars grow from a baseline), even for
 *    all-negative data,
 *  - band/linear inference routes string→band and numeric→linear: this library
 *    only ever instantiates scaleBand or scaleLinear, and routes to the right one
 *    per axis.
 */

const DIMS: ChartDimensions = { width: 10, height: 5, depth: 10 }

describe('band scale default padding (0.1 / 0.05)', () => {
  it('applies paddingInner 0.1 and paddingOuter 0.05 to a band axis', () => {
    const scale = createAxisScale(['a', 'b', 'c'], 10)
    expect(isBandScale(scale)).toBe(true)
    if (isBandScale(scale)) {
      expect(scale.paddingInner()).toBeCloseTo(0.1)
      expect(scale.paddingOuter()).toBeCloseTo(0.05)
    }
  })
})

describe('scale-type inference routes band vs linear per axis', () => {
  it('builds a band x scale for string xKey and a linear y scale', () => {
    const data = [
      { m: 'Jan', v: 10 },
      { m: 'Feb', v: 20 },
    ]
    const { xScale, yScale } = createScales(data, 'm', 'v', undefined, DIMS)
    expect(isBandScale(xScale)).toBe(true) // string domain → scaleBand
    expect(isBandScale(yScale)).toBe(false) // y is always linear
  })

  it('builds a linear x scale for numeric xKey', () => {
    const data = [
      { x: 1, v: 10 },
      { x: 2, v: 20 },
    ]
    const { xScale } = createScales(data, 'x', 'v', undefined, DIMS)
    expect(isBandScale(xScale)).toBe(false) // numeric domain → scaleLinear
  })

  it('builds a z scale only when zKey is supplied', () => {
    const data = [
      { m: 'Jan', v: 10, r: 'A' },
      { m: 'Feb', v: 20, r: 'B' },
    ]
    const withZ = createScales(data, 'm', 'v', 'r', DIMS)
    expect(withZ.zScale).toBeDefined()
    expect(isBandScale(withZ.zScale!)).toBe(true) // string z → band
    const withoutZ = createScales(data, 'm', 'v', undefined, DIMS)
    expect(withoutZ.zScale).toBeUndefined()
    expect(withoutZ.bounds.z).toBeUndefined()
    expect(withoutZ.domain.z).toBeUndefined()
  })
})

describe('bounds === scale.range() (world space)', () => {
  it('mirrors each scale range exactly into bounds (x/y/z)', () => {
    const data = [
      { m: 'Jan', v: 10, r: 'A' },
      { m: 'Feb', v: 20, r: 'B' },
    ]
    const s = createScales(data, 'm', 'v', 'r', DIMS)
    expect(s.bounds.x).toEqual(s.xScale.range())
    expect(s.bounds.y).toEqual(s.yScale.range())
    expect(s.bounds.z).toEqual(s.zScale!.range())
    // And the world spans match the requested dimensions.
    expect(s.bounds.x).toEqual([-DIMS.width / 2, DIMS.width / 2])
    expect(s.bounds.y).toEqual([0, DIMS.height])
    expect(s.bounds.z).toEqual([-DIMS.depth / 2, DIMS.depth / 2])
  })
})

describe('domain is the ORIGINAL data units', () => {
  it('band axis domain is the category list; linear y domain is numeric [min,max]', () => {
    const data = [
      { m: 'Jan', v: 10 },
      { m: 'Feb', v: 20 },
      { m: 'Mar', v: 30 },
    ]
    const s = createScales(data, 'm', 'v', undefined, DIMS)
    // x: band categories, in original string units.
    expect(s.domain.x).toEqual(['Jan', 'Feb', 'Mar'])
    // y: linear numeric domain that includes 0 and the data max (post-nice).
    const [ylo, yhi] = s.domain.y
    expect(ylo).toBeLessThanOrEqual(0)
    expect(yhi).toBeGreaterThanOrEqual(30)
  })

  it('y domain still includes 0 for all-NEGATIVE data (baseline at the top)', () => {
    const data = [
      { m: 'Jan', v: -10 },
      { m: 'Feb', v: -30 },
    ]
    const s = createScales(data, 'm', 'v', undefined, DIMS)
    const [lo, hi] = s.domain.y
    expect(lo).toBeLessThanOrEqual(-30)
    expect(hi).toBeGreaterThanOrEqual(0)
    // yBaseline (world y for value 0) equals yScale(0).
    expect(s.yBaseline).toBe(s.yScale(0))
  })
})

describe('createScales only ever instantiates band or linear', () => {
  it('every produced scale is either a band scale or a linear (numeric) scale', () => {
    const data = [
      { m: 'Jan', v: 10, r: 5 }, // numeric z → linear
    ]
    const s = createScales(data, 'm', 'v', 'r', DIMS)
    // x band, y linear, z linear here.
    expect(isBandScale(s.xScale)).toBe(true)
    expect(isBandScale(s.yScale)).toBe(false)
    expect(isBandScale(s.zScale!)).toBe(false)
    // A linear scale is a callable that returns a number for a numeric input.
    expect(typeof (s.yScale as (n: number) => number)(0)).toBe('number')
  })
})
