import { useEffect, useRef } from 'react'
import { isDev } from './env'

/** Warns `[d3-three] <message>` once (dev only), per call-site; pass undefined to skip. */
export function useWarnOnce(message: string | undefined): void {
  const warned = useRef(false)
  useEffect(() => {
    if (isDev && message && !warned.current) {
      warned.current = true
      console.warn(`[d3-three] ${message}`)
    }
  }, [message])
}
