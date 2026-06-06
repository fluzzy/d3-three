import ReactThreeTestRenderer from '@react-three/test-renderer'
import { render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Chart3D } from '../src/components/Chart3D'
import { useChart3D } from '../src/hooks/useChart3D'
import type { Chart3DContextValue } from '../src/types'

const DATA = [
  { x: 'Jan', y: 10 },
  { x: 'Feb', y: 20 },
  { x: 'Mar', y: Number.NaN }, // invalid row, dropped by validation
]

afterEach(() => {
  vi.restoreAllMocks()
})

/** Captures the context value seen by a child rendered inside <Chart3D>. */
function Probe({ onContext }: { onContext: (ctx: Chart3DContextValue) => void }) {
  onContext(useChart3D())
  return null
}

describe('Chart3D context (inside Canvas)', () => {
  it('provides functional scales and the validated data length to children', async () => {
    let captured: Chart3DContextValue | undefined
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={DATA} xKey="x" yKey="y">
        <Probe
          onContext={(ctx) => {
            captured = ctx
          }}
        />
      </Chart3D>,
    )

    expect(captured).toBeDefined()
    expect(typeof captured!.xScale).toBe('function')
    expect(typeof captured!.yScale).toBe('function')
    // The NaN row is dropped, so only 2 valid rows remain.
    expect(captured!.data).toHaveLength(2)
    expect(captured!.yBaseline).toBe(captured!.yScale(0))

    await renderer.unmount()
  })
})

describe('useChart3D outside <Chart3D> but inside Canvas', () => {
  it('rejects create() with a friendly error', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(ReactThreeTestRenderer.create(<Probe onContext={() => {}} />)).rejects.toThrow(
      /useChart3D\(\) must be called inside a <Chart3D>/,
    )
    errorSpy.mockRestore()
  })
})

describe('Chart3D outside any Canvas', () => {
  it('lets R3F throw its Canvas-only hooks error (useStore called unconditionally)', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() =>
      render(
        <Chart3D data={DATA} xKey="x" yKey="y">
          <Probe onContext={() => {}} />
        </Chart3D>,
      ),
    ).toThrow(/Hooks can only be used within the Canvas component/)
    errorSpy.mockRestore()
  })
})
