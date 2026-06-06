import { describe, expect, it } from 'vitest'
import * as api from '../src/index'

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

  it('has no default export', () => {
    expect((api as Record<string, unknown>).default).toBeUndefined()
  })

  it('does NOT export v0.2 symbols (GridPlane3D, ChartLights)', () => {
    expect((api as Record<string, unknown>).GridPlane3D).toBeUndefined()
    expect((api as Record<string, unknown>).ChartLights).toBeUndefined()
  })
})
