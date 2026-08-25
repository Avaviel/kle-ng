import { describe, it, expect } from 'vitest'
import { staleRotationOriginRule } from '../rules/stale-rotation-origin.rule'
import { makeKey } from './fixtures'

describe('staleRotationOriginRule', () => {
  it('is registered as a redundancy rule', () => {
    expect(staleRotationOriginRule.kind).toBe('redundancy')
  })

  it('flags an origin left behind on an unrotated key', () => {
    const keys = [makeKey({ rotation_angle: 0, rotation_x: 3, rotation_y: 2 })]

    expect(staleRotationOriginRule.scan(keys).count).toBe(1)
  })

  it('flags a key with only one nonzero origin coordinate', () => {
    const keys = [
      makeKey({ rotation_angle: 0, rotation_x: 3, rotation_y: 0 }),
      makeKey({ rotation_angle: 0, rotation_x: 0, rotation_y: 2 }),
    ]

    expect(staleRotationOriginRule.scan(keys).count).toBe(2)
  })

  it('zeroes both coordinates', () => {
    const keys = [makeKey({ rotation_angle: 0, rotation_x: 3, rotation_y: 2 })]

    staleRotationOriginRule.fix(keys)

    expect(keys[0]!.rotation_x).toBe(0)
    expect(keys[0]!.rotation_y).toBe(0)
  })

  it('flags an origin on a key rotated by a whole turn', () => {
    // 360 puts the key exactly where 0 does, so the origin has no effect there
    // either. Reading the wrapped angle also keeps this rule in step with the
    // rotation-angle rule, which would otherwise turn this into a new issue.
    const keys = [
      makeKey({ rotation_angle: 360, rotation_x: 3, rotation_y: 2 }),
      makeKey({ rotation_angle: -720, rotation_x: 3, rotation_y: 2 }),
    ]

    expect(staleRotationOriginRule.scan(keys).count).toBe(2)

    staleRotationOriginRule.fix(keys)

    expect(keys.every((k) => k.rotation_x === 0 && k.rotation_y === 0)).toBe(true)
    // The angle itself belongs to the rotation-angle rule.
    expect(keys[0]!.rotation_angle).toBe(360)
  })

  it('leaves rotated keys alone', () => {
    const keys = [
      makeKey({ rotation_angle: 15, rotation_x: 3, rotation_y: 2 }),
      // Out of range but a real rotation: the origin is live data.
      makeKey({ rotation_angle: 375, rotation_x: 3, rotation_y: 2 }),
    ]
    const before = structuredClone(keys)

    expect(staleRotationOriginRule.scan(keys).count).toBe(0)
    staleRotationOriginRule.fix(keys)
    expect(keys).toEqual(before)
  })

  it('is a no-op on a clean layout', () => {
    const keys = [makeKey(), makeKey({ rotation_angle: 30, rotation_x: 1, rotation_y: 1 })]
    const before = structuredClone(keys)

    expect(staleRotationOriginRule.scan(keys).count).toBe(0)
    staleRotationOriginRule.fix(keys)
    expect(keys).toEqual(before)
  })

  it('is idempotent', () => {
    const keys = [makeKey({ rotation_angle: 0, rotation_x: 3, rotation_y: 2 })]

    staleRotationOriginRule.fix(keys)
    expect(staleRotationOriginRule.scan(keys).count).toBe(0)

    const afterFirst = structuredClone(keys)
    staleRotationOriginRule.fix(keys)
    expect(keys).toEqual(afterFirst)
  })
})
