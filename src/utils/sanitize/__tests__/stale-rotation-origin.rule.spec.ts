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

  it('leaves rotated keys alone', () => {
    const keys = [makeKey({ rotation_angle: 15, rotation_x: 3, rotation_y: 2 })]
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
