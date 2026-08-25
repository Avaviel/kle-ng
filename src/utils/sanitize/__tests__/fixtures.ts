import { Key } from '@adamws/kle-serial'

/**
 * Builds a real `Key` so class defaults (12-element label arrays, zeroed rotation
 * origin, etc.) are exactly what the rules will see in the running app.
 */
export function makeKey(overrides: Partial<Key> = {}): Key {
  return Object.assign(new Key(), overrides)
}
