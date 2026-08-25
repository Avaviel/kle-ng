import type { Key } from '@adamws/kle-serial'
import type { SanitizeRule } from '../types'

/**
 * A rotation origin only means anything when there is a rotation. Left on a key
 * whose angle is 0, the coordinates are dead weight.
 */
function hasStaleOrigin(key: Key): boolean {
  const angle = key.rotation_angle ?? 0
  if (angle !== 0) return false
  return (key.rotation_x ?? 0) !== 0 || (key.rotation_y ?? 0) !== 0
}

export const staleRotationOriginRule: SanitizeRule = {
  id: 'stale-rotation-origin',
  kind: 'redundancy',
  name: 'Stale rotation origins',
  description: 'Origins on unrotated keys',

  scan(keys) {
    return { count: keys.filter(hasStaleOrigin).length }
  },

  fix(keys) {
    for (const key of keys) {
      if (!hasStaleOrigin(key)) continue
      // Matches the Key class defaults.
      key.rotation_x = 0
      key.rotation_y = 0
    }
  },
}
