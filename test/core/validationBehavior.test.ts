import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Validation behavior not pinned by `validation.test.ts`:
 *  - production is SILENT (no console.warn when NODE_ENV === 'production'),
 *  - the returned filtered array is the source of truth for downstream
 *    count / instanceId mapping: its order is the input order with invalid rows
 *    removed, so index i in the result is the (i+1)-th valid input row — exactly
 *    what `e.instanceId` resolves against.
 *
 * `isDev` is computed once at module load from `process.env.NODE_ENV`, so the
 * production-silent case uses resetModules + a dynamic import under a patched env.
 */

const OPTS = { xKey: 'x', yKey: 'y' }

describe('production is silent (no dev warn)', () => {
  const prevEnv = process.env.NODE_ENV

  beforeEach(() => {
    vi.resetModules()
  })
  afterEach(() => {
    process.env.NODE_ENV = prevEnv
    vi.restoreAllMocks()
  })

  it('emits ZERO warnings when NODE_ENV === "production", even with invalid rows', async () => {
    process.env.NODE_ENV = 'production'
    // Re-import so `internal/env`'s `isDev` is recomputed as false.
    const { validateData } = await import('../../src/core/validation')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const result = validateData(
      [
        { x: 'a', y: 1 },
        { x: 1, y: Number.NaN }, // invalid → dropped
        { y: 9 }, // missing x → dropped
      ],
      OPTS,
    )

    // Filtering still happens (the invalid rows are gone)...
    expect(result).toEqual([{ x: 'a', y: 1 }])
    // ...but production stays silent.
    expect(warn).not.toHaveBeenCalled()
  })

  it('DOES warn in dev (NODE_ENV !== "production") — proves the silence above is env-driven', async () => {
    process.env.NODE_ENV = 'development'
    const { validateData } = await import('../../src/core/validation')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    validateData([{ x: 1, y: Number.NaN }], OPTS)

    expect(warn).toHaveBeenCalledTimes(1)
  })
})

describe('the filtered array is the count/instanceId source of truth', () => {
  it('preserves input order with invalid rows removed (index i === i-th valid row)', async () => {
    vi.resetModules()
    const { validateData } = await import('../../src/core/validation')
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const raw = [
      { x: 'Jan', y: 10 }, // valid → result[0]
      { x: 'Feb', y: Number.NaN }, // invalid → dropped
      { x: 'Mar', y: 30 }, // valid → result[1]
      { y: 40 }, // missing x → dropped
      { x: 'May', y: 50 }, // valid → result[2]
    ]
    const result = validateData(raw, OPTS)

    // The result length is the InstancedMesh `count` source of truth.
    expect(result).toHaveLength(3)
    // Index → datum mapping that `e.instanceId` will use downstream.
    expect(result[0]).toEqual({ x: 'Jan', y: 10 })
    expect(result[1]).toEqual({ x: 'Mar', y: 30 })
    expect(result[2]).toEqual({ x: 'May', y: 50 })
    // Order is the surviving-input order (stable filter), not reordered.
    expect(result.map((d) => d.x)).toEqual(['Jan', 'Mar', 'May'])

    vi.restoreAllMocks()
  })

  it('does NOT clamp invalid rows to the origin — it removes them (no phantom marks)', async () => {
    vi.resetModules()
    const { validateData } = await import('../../src/core/validation')
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    // A clamp-to-0 impl would keep this row (coerced to {x:0,y:0}); filtering drops it.
    const result = validateData([{ x: Number.NaN, y: Number.NaN }], OPTS)
    expect(result).toEqual([])

    vi.restoreAllMocks()
  })
})
