import { describe, expect, it } from 'vitest'
import * as api from '../../src/index'

describe('public API surface', () => {
  it('named-exports the v0.1 components + hook', () => {
    expect(typeof api.Chart3D).toBe('function')
    expect(typeof api.BarSeries3D).toBe('function')
    expect(typeof api.ScatterSeries3D).toBe('function')
    expect(typeof api.Axis3D).toBe('function')
    expect(typeof api.useChart3D).toBe('function')
  })

  it('exports the scale-position helpers for custom marks', () => {
    // Custom-mark authors need the SAME positioning the built-in marks use:
    // calling a band scale directly returns the band's left edge, not its
    // center. These helpers give the correct world position.
    expect(typeof api.axisPosition).toBe('function')
    expect(typeof api.isBandScale).toBe('function')
    expect(typeof api.axisBandwidth).toBe('function')
  })

  it('exports the headless layout hook for custom marks', () => {
    expect(typeof api.useSeriesLayout3D).toBe('function')
  })

  it('exports the DEFAULT_PALETTE for categorical colorBy', () => {
    expect(Array.isArray(api.DEFAULT_PALETTE)).toBe(true)
    expect(api.DEFAULT_PALETTE).toHaveLength(10)
  })

  it('has no default export', () => {
    expect((api as Record<string, unknown>).default).toBeUndefined()
  })

  it('exports the ChartLights lighting preset component', () => {
    expect(typeof api.ChartLights).toBe('function')
  })

  it('does NOT export not-yet-shipped v0.2 symbols (GridPlane3D)', () => {
    expect((api as Record<string, unknown>).GridPlane3D).toBeUndefined()
  })
})
