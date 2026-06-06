import { isDev } from '../internal/env'
import type { Datum } from '../types'

function warn(message: string): void {
  if (isDev) console.warn(`[d3-three] ${message}`)
}

function isValidCoord(value: unknown): boolean {
  if (typeof value === 'number') return Number.isFinite(value)
  if (typeof value === 'string') return value.length > 0
  return false
}

/**
 * A finite number or a clean numeric string. Rejects null/''/boolean/array — a
 * loose Number() would coerce those to a phantom 0-height mark (clamp-to-0).
 */
function isFiniteNumberLike(value: unknown): boolean {
  if (typeof value === 'number') return Number.isFinite(value)
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length > 0 && Number.isFinite(Number(trimmed))
  }
  return false
}

export interface ValidateOptions {
  xKey: string
  yKey: string
  zKey?: string
}

/**
 * Filters out rows that cannot be placed in 3D space:
 * - `yKey` must coerce to a finite number (the y axis is always continuous),
 * - `xKey` (and `zKey` when present) must be a finite number or non-empty string.
 *
 * Invalid rows (NaN/Infinity/undefined coordinates, missing keys, non-objects)
 * are DROPPED — never clamped — so they don't plant misleading bars/points at
 * the origin. Emits at most ONE dev warning per call summarizing what was
 * skipped. Downstream index mapping (`e.instanceId` → datum) uses this
 * filtered array.
 */
export function validateData(data: unknown, opts: ValidateOptions): Datum[] {
  const { xKey, yKey, zKey } = opts
  if (!Array.isArray(data)) {
    warn(`\`data\` must be an array, received ${typeof data}. Rendering nothing.`)
    return []
  }

  let droppedMissing = 0
  let droppedInvalid = 0
  const valid: Datum[] = []

  for (const row of data) {
    if (row == null || typeof row !== 'object') {
      droppedInvalid++
      continue
    }
    const d = row as Datum
    // Object.hasOwn (not `in`) so inherited keys like 'toString'/'constructor'
    // passed as xKey/yKey don't match the prototype chain.
    const hasKeys =
      Object.hasOwn(d, xKey) && Object.hasOwn(d, yKey) && (!zKey || Object.hasOwn(d, zKey))
    if (!hasKeys) {
      droppedMissing++
      continue
    }
    const yOk = isFiniteNumberLike(d[yKey])
    const xOk = isValidCoord(d[xKey])
    const zOk = !zKey || isValidCoord(d[zKey])
    if (yOk && xOk && zOk) {
      valid.push(d)
    } else {
      droppedInvalid++
    }
  }

  // Exactly one warning per call: combine the missing-key and
  // invalid-coordinate counts into a single summary so a mixed batch never
  // double-warns.
  const dropped = droppedMissing + droppedInvalid
  if (dropped > 0) {
    const parts: string[] = []
    if (droppedMissing > 0) {
      parts.push(`${droppedMissing} missing key "${xKey}"/"${yKey}"${zKey ? `/"${zKey}"` : ''}`)
    }
    if (droppedInvalid > 0) {
      parts.push(`${droppedInvalid} with NaN/Infinity/invalid coordinates`)
    }
    warn(`${dropped} row(s) were skipped (${parts.join(', ')}).`)
  }
  return valid
}
