import { useContext } from 'react'
import { Chart3DContext } from '../context/Chart3DContext'
import type { Chart3DContextValue } from '../types'

/**
 * Reads the scales/data shared by the enclosing `<Chart3D>`. Throws a friendly
 * error when called outside a `<Chart3D>` (the hook is always called — no
 * conditional hook usage — so React's rules of hooks are respected).
 */
export function useChart3D(): Chart3DContextValue {
  const ctx = useContext(Chart3DContext)
  if (!ctx) {
    throw new Error(
      'useChart3D() must be called inside a <Chart3D>. ' +
        'Wrap your series/primitive in <Chart3D data=... xKey=... yKey=...>. ' +
        'See https://github.com/d3-three/d3-three#usechart3d',
    )
  }
  return ctx
}
