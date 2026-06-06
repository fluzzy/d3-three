import { useStore } from '@react-three/fiber'
import { Children, type ReactElement, type ReactNode, isValidElement, useMemo } from 'react'
import { Chart3DContext } from '../context/Chart3DContext'
import { createScales } from '../core/scales'
import { validateData } from '../core/validation'
import { isDev } from '../internal/env'
import type { Chart3DContextValue, Datum } from '../types'
import { BarSeries3D } from './BarSeries3D'
import { ScatterSeries3D } from './ScatterSeries3D'

let warnedMixedSeries = false

/**
 * Best-effort scan of the children for a mixed series set. Recurses through
 * fragments and arrays and compares element types by component identity. Wrapper
 * components (a user component that itself renders a series) cannot be detected
 * this way — the warning is an advisory guard, not a correctness guarantee.
 */
function hasMixedSeries(children: ReactNode): boolean {
  let bar = false
  let scatter = false
  const visit = (nodes: ReactNode): void => {
    Children.forEach(nodes, (child) => {
      if (!isValidElement(child)) return
      const type = (child as ReactElement).type
      if (type === BarSeries3D) bar = true
      else if (type === ScatterSeries3D) scatter = true
      const props = (child as ReactElement<{ children?: ReactNode }>).props
      if (props?.children) visit(props.children)
    })
  }
  visit(children)
  return bar && scatter
}

export interface Chart3DProps {
  /** Recharts-style rows, e.g. `[{ month: 'Jan', revenue: 100 }]`. */
  data: Datum[]
  /** field used for the x axis (band if string values, linear if numeric). */
  xKey: string
  /** field used for the y axis (always numeric/continuous). */
  yKey: string
  /** optional field for the z axis; enables grouped 3D bars / 3D scatter depth. */
  zKey?: string
  /** world width spanned by x (default 10). */
  width?: number
  /** world height spanned by y (default 5). */
  height?: number
  /** world depth spanned by z (default 10). */
  depth?: number
  children?: ReactNode
}

/**
 * Context root for a 3D chart. Validates the data, builds shared d3 scales, and
 * provides them to child series/primitives via `useChart3D()`. Renders no
 * Three.js object itself — it drops into your existing R3F `<Canvas>`.
 */
export function Chart3D({
  data,
  xKey,
  yKey,
  zKey,
  width = 10,
  height = 5,
  depth = 10,
  children,
}: Chart3DProps) {
  // Assert we're inside a <Canvas>. useStore() is called unconditionally (Rules
  // of Hooks); when rendered outside a <Canvas> R3F itself throws
  // "R3F: Hooks can only be used within the Canvas component!". We do NOT wrap
  // it in a try/catch — letting R3F throw keeps the hook unconditional and
  // avoids a custom error path.
  useStore()

  // One series type per chart: BarSeries3D needs a band x axis, ScatterSeries3D
  // a linear one, so mixing them collides on the x scale type (silent failure).
  // Warn once in dev as a second line of defense behind the README constraint.
  if (isDev && !warnedMixedSeries && hasMixedSeries(children)) {
    warnedMixedSeries = true
    console.warn(
      '[d3-three] One series type per <Chart3D>: BarSeries3D (needs a band x axis) and ScatterSeries3D (needs a linear x axis) cannot share a chart — their x scale types collide. Use separate <Chart3D> roots.',
    )
  }

  const value = useMemo<Chart3DContextValue>(() => {
    const valid = validateData(data, { xKey, yKey, zKey })
    const scales = createScales(valid, xKey, yKey, zKey, { width, height, depth })
    return { data: valid, xKey, yKey, zKey, width, height, depth, ...scales }
  }, [data, xKey, yKey, zKey, width, height, depth])

  return <Chart3DContext.Provider value={value}>{children}</Chart3DContext.Provider>
}
