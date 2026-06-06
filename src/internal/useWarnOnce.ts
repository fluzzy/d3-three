import { useEffect, useRef } from 'react'
import { isDev } from './env'

/**
 * Emits `console.warn('[d3-three] <message>')` once per hook call-site — the
 * first render at which `message` is a non-empty string, and only in
 * development. Pass `undefined` to skip. The once-guard is a ref tied to this
 * hook instance (NOT keyed by the message text), so use one call per distinct
 * warning. Mount-driven (no mesh required); survives re-renders and StrictMode's
 * double-invoke without duplicating.
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
