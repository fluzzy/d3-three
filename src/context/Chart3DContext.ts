import { createContext } from 'react'
import type { Chart3DContextValue } from '../types'

/**
 * Shared chart scales/data provided by `<Chart3D>` and consumed via
 * `useChart3D()`. `null` outside a `<Chart3D>` so the hook can throw a friendly
 * error.
 */
export const Chart3DContext = createContext<Chart3DContextValue | null>(null)
Chart3DContext.displayName = 'Chart3DContext'
