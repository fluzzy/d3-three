import { afterEach, describe, expect, it, vi } from 'vitest'
import { validateData } from '../src/core/validation'

const OPTS = { xKey: 'x', yKey: 'y' }
const OPTS_Z = { xKey: 'x', yKey: 'y', zKey: 'z' }

afterEach(() => {
  vi.restoreAllMocks()
})

describe('validateData', () => {
  it('returns [] for a non-array input', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(validateData(null, OPTS)).toEqual([])
    expect(validateData(undefined, OPTS)).toEqual([])
    expect(validateData(42, OPTS)).toEqual([])
    expect(validateData('nope', OPTS)).toEqual([])
    expect(warn).toHaveBeenCalled()
  })

  it('returns [] for an empty array without warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(validateData([], OPTS)).toEqual([])
    expect(warn).not.toHaveBeenCalled()
  })

  it('keeps a valid numeric row', () => {
    const data = [{ x: 1, y: 2 }]
    expect(validateData(data, OPTS)).toEqual(data)
  })

  it('keeps a row with a string x value', () => {
    const data = [{ x: 'Jan', y: 10 }]
    expect(validateData(data, OPTS)).toEqual(data)
  })

  it('drops a row whose y is NaN and warns in dev', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const result = validateData([{ x: 1, y: Number.NaN }], OPTS)
    expect(result).toEqual([])
    expect(warn).toHaveBeenCalled()
  })

  it('drops a row whose y is Infinity and warns in dev', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const result = validateData([{ x: 1, y: Number.POSITIVE_INFINITY }], OPTS)
    expect(result).toEqual([])
    expect(warn).toHaveBeenCalled()
  })

  it('drops a row missing a required key and warns in dev', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(validateData([{ x: 1 }], OPTS)).toEqual([])
    expect(validateData([{ y: 1 }], OPTS)).toEqual([])
    expect(warn).toHaveBeenCalled()
  })

  it('drops a row whose numeric x is non-finite', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(validateData([{ x: Number.NaN, y: 1 }], OPTS)).toEqual([])
    expect(validateData([{ x: Number.POSITIVE_INFINITY, y: 1 }], OPTS)).toEqual([])
    expect(warn).toHaveBeenCalled()
  })

  it('drops a row whose x is an empty string', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(validateData([{ x: '', y: 1 }], OPTS)).toEqual([])
    expect(warn).toHaveBeenCalled()
  })

  it('partitions a mixed batch, keeping only valid rows', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const data = [{ x: 'a', y: 1 }, { x: 1, y: Number.NaN }, { x: 2, y: 5 }, { y: 9 }, null]
    expect(validateData(data, OPTS)).toEqual([
      { x: 'a', y: 1 },
      { x: 2, y: 5 },
    ])
  })

  it('handles zKey present: requires a valid z coordinate', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(validateData([{ x: 1, y: 2, z: 3 }], OPTS_Z)).toEqual([{ x: 1, y: 2, z: 3 }])
    // missing z key → dropped
    expect(validateData([{ x: 1, y: 2 }], OPTS_Z)).toEqual([])
    // invalid z coordinate → dropped
    expect(validateData([{ x: 1, y: 2, z: Number.NaN }], OPTS_Z)).toEqual([])
    expect(warn).toHaveBeenCalled()
  })

  it('handles zKey absent: ignores any z field', () => {
    const data = [{ x: 1, y: 2, z: Number.NaN }]
    // zKey not requested, so z is irrelevant; row is valid.
    expect(validateData(data, OPTS)).toEqual(data)
  })

  it('warns exactly once per call, even for a mixed missing/invalid batch', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    validateData(
      [
        { x: 1 }, // missing y
        { y: 1 }, // missing x
        { x: Number.NaN, y: 1 }, // invalid x
        { x: 1, y: Number.NaN }, // invalid y
      ],
      OPTS,
    )
    expect(warn).toHaveBeenCalledTimes(1)
  })
})
