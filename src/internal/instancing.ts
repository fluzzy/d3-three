import { type InstancedMesh, Object3D } from 'three'

// Reused scratch object. React render + layout effects run synchronously, so a
// single module-scope dummy is safe and avoids per-update allocation.
const dummy = new Object3D()

/** Minimum scale for a zero-height/size instance so the matrix stays invertible. */
const MIN_EXTENT = 1e-6

/** Clamp to a finite, strictly-positive extent — guards NaN/Infinity/<=0 (e.g.
 *  a degenerate scale bandwidth or value) that would otherwise write a
 *  degenerate matrix and poison the whole InstancedMesh. */
function extentOr(v: number): number {
  return Number.isFinite(v) && v > 0 ? v : MIN_EXTENT
}

/** Clamp to a finite coordinate (NaN/Infinity -> fallback), preserving sign. */
function finiteOr(v: number, fallback = 0): number {
  return Number.isFinite(v) ? v : fallback
}

export interface BoxInstance {
  /** center position */
  x: number
  y: number
  z: number
  /** box extents (a unit BoxGeometry is scaled to these) */
  width: number
  height: number
  depth: number
}

/** Writes a box instance matrix into `mesh` at index `i` (centered at x/y/z). */
export function writeBox(mesh: InstancedMesh, i: number, b: BoxInstance): void {
  dummy.position.set(finiteOr(b.x), finiteOr(b.y), finiteOr(b.z))
  dummy.rotation.set(0, 0, 0)
  dummy.scale.set(extentOr(b.width), extentOr(b.height), extentOr(b.depth))
  dummy.updateMatrix()
  mesh.setMatrixAt(i, dummy.matrix)
}

export interface PointInstance {
  x: number
  y: number
  z: number
  /** uniform scale applied to the unit geometry */
  size: number
}

/** Writes a uniformly-scaled point instance matrix into `mesh` at index `i`. */
export function writePoint(mesh: InstancedMesh, i: number, p: PointInstance): void {
  const s = extentOr(p.size)
  dummy.position.set(finiteOr(p.x), finiteOr(p.y), finiteOr(p.z))
  dummy.rotation.set(0, 0, 0)
  dummy.scale.set(s, s, s)
  dummy.updateMatrix()
  mesh.setMatrixAt(i, dummy.matrix)
}
