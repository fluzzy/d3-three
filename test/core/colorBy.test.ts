import { Color } from 'three'
import { describe, expect, it } from 'vitest'
import { DEFAULT_PALETTE, resolveColors } from '../../src/core/colorBy'
import type { Datum } from '../../src/types'

const hex = (css: string) => new Color(css).getHex()

describe('resolveColors', () => {
  it('returns undefined with no colorBy (engine keeps the single base color)', () => {
    expect(resolveColors([{ a: 1 }], undefined, 'steelblue')).toBeUndefined()
  })

  it('DEFAULT_PALETTE has 10 parseable colors', () => {
    expect(DEFAULT_PALETTE).toHaveLength(10)
    for (const c of DEFAULT_PALETTE) {
      // every entry differs from a sentinel-unparseable fallback (i.e. it parses).
      expect(hex(c)).toBe(new Color(c).getHex())
    }
  })

  it('bare string accessor with no palette → categorical DEFAULT_PALETTE', () => {
    const rows: Datum[] = [{ c: 'a' }, { c: 'b' }, { c: 'a' }, { c: 'c' }]
    const r = resolveColors(rows, (d) => d.c as string, 'steelblue')!
    expect(r.invalid).toBe(false)
    // first-seen order: a→palette[0], b→palette[1], c→palette[2]
    expect(r.colors[0].getHex()).toBe(hex(DEFAULT_PALETTE[0]))
    expect(r.colors[1].getHex()).toBe(hex(DEFAULT_PALETTE[1]))
    expect(r.colors[3].getHex()).toBe(hex(DEFAULT_PALETTE[2]))
    // same category → same color; distinct categories → distinct colors
    expect(r.colors[2].getHex()).toBe(r.colors[0].getHex())
    expect(r.colors[0].getHex()).not.toBe(r.colors[1].getHex())
  })

  it('categorical palette wraps when categories exceed the palette length', () => {
    const rows: Datum[] = Array.from({ length: 11 }, (_, i) => ({ c: `cat${i}` }))
    const r = resolveColors(rows, (d) => d.c as string, 'steelblue')!
    // 11th distinct category wraps to palette[0].
    expect(r.colors[10].getHex()).toBe(r.colors[0].getHex())
  })

  it('custom string[] palette is used in first-seen order', () => {
    const palette = ['#e6194b', '#3cb44b', '#4363d8']
    const rows: Datum[] = [{ t: 'x' }, { t: 'y' }, { t: 'x' }]
    const r = resolveColors(rows, { value: (d) => d.t as string, palette }, 'steelblue')!
    expect(r.colors[0].getHex()).toBe(hex('#e6194b'))
    expect(r.colors[1].getHex()).toBe(hex('#3cb44b'))
    expect(r.colors[2].getHex()).toBe(hex('#e6194b'))
  })

  it("palette: 'raw' uses the accessor's string as the CSS color directly", () => {
    const rows: Datum[] = [{ c: '#ff0000' }, { c: 'seagreen' }]
    const r = resolveColors(rows, { value: (d) => d.c as string, palette: 'raw' }, 'steelblue')!
    expect(r.invalid).toBe(false)
    expect(r.colors[0].getHex()).toBe(hex('#ff0000'))
    expect(r.colors[1].getHex()).toBe(hex('seagreen'))
  })

  it('function palette maps a numeric value to a color', () => {
    const rows: Datum[] = [{ v: 0 }, { v: 100 }]
    const ramp = (v: number) => (v < 50 ? '#000000' : '#ffffff')
    const r = resolveColors(rows, { value: (d) => d.v as number, palette: ramp }, 'steelblue')!
    expect(r.invalid).toBe(false)
    expect(r.colors[0].getHex()).toBe(hex('#000000'))
    expect(r.colors[1].getHex()).toBe(hex('#ffffff'))
  })

  it('an unparseable raw CSS string falls back to `color` (NOT white) and flags invalid', () => {
    const rows: Datum[] = [{ c: 'north' }]
    const r = resolveColors(rows, { value: (d) => d.c as string, palette: 'raw' }, 'steelblue')!
    expect(r.colors[0].getHex()).toBe(hex('steelblue')) // fallback, not white
    expect(r.colors[0].getHex()).not.toBe(hex('white'))
    expect(r.invalid).toBe(true)
  })

  it('a type mismatch (function palette but non-number value) falls back + flags invalid', () => {
    const rows: Datum[] = [{ v: 'oops' }]
    const r = resolveColors(
      rows,
      { value: (d) => d.v as unknown as number, palette: (v: number) => `hsl(${v},50%,50%)` },
      'steelblue',
    )!
    expect(r.colors[0].getHex()).toBe(hex('steelblue'))
    expect(r.invalid).toBe(true)
  })

  it('never throws on bad input', () => {
    expect(() =>
      resolveColors([{ c: 'nope' }], { value: (d) => d.c as string, palette: 'raw' }, 'steelblue'),
    ).not.toThrow()
  })

  it('accepts a legitimate near-black color (no single-sentinel collision)', () => {
    const r = resolveColors(
      [{ c: '#010203' }],
      { value: (d) => d.c as string, palette: 'raw' },
      'steelblue',
    )!
    expect(r.invalid).toBe(false)
    expect(r.colors[0].getHex()).toBe(hex('#010203'))
  })
})
