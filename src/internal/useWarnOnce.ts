import { useEffect, useRef } from 'react'
import { isDev } from './env'

/**
 * Emits `console.warn('[d3-three] <message>')` exactly once — the first render at
 * which `message` is a non-empty string, and only in development. Pass
 * `undefined` to skip. The once-guard is a ref, so it survives re-renders and
 * StrictMode's mount/unmount/remount double-invoke (no duplicate warnings).
 */
export function useWarnOnce(message: string | undefined): void {
  const warned = useRef(false)
  useEffect(() => {
    if (isDev && message && !warned.current) {
      warned.current = true
      console.warn(`[d3-three] ${message}`)
    }
  }, [message])
}
