import { D } from './decimal-math'

/**
 * Wraps a rotation angle in degrees onto the canonical [-180, 180] range.
 *
 * Rotations are periodic, so 3600, 360 and 0 describe the same key placement —
 * only one of them reads as "unrotated". This is the range the editor's own
 * controls produce (`CustomNumberInput`'s wrap-around mode, and the rotation
 * field in the key properties panel), so it is the form a hand-edited or
 * imported layout is normalized towards.
 *
 * Both endpoints are stable: 180 stays 180 and -180 stays -180, rather than
 * flipping to the other end on every call. That keeps the function idempotent,
 * which the sanitize rules rely on.
 *
 * Modulo rather than a subtract-360 loop: a loop costs one iteration per turn,
 * so a pasted 1e20 would spin ~2.8e17 times and freeze the tab.
 */
export function normalizeAngleDegrees(angle: number): number {
  if (!Number.isFinite(angle)) return 0

  // D.mod keeps the sign of the dividend, so this lands in (-360, 360).
  let wrapped = D.mod(angle, 360)
  if (wrapped > 180) {
    wrapped = D.sub(wrapped, 360)
  } else if (wrapped < -180) {
    wrapped = D.add(wrapped, 360)
  }

  // `+ 0` collapses -0 (which mod produces for negative multiples of 360) to 0.
  return D.format(wrapped, 6) + 0
}
