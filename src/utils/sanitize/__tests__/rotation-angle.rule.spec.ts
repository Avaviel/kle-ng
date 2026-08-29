import { describe, it, expect } from 'vitest'
import { rotationAngleRule } from '../rules/rotation-angle.rule'
import { staleRotationOriginRule } from '../rules/stale-rotation-origin.rule'
import { makeKey } from './fixtures'

describe('rotationAngleRule', () => {
  it('is registered as a normalization rule', () => {
    expect(rotationAngleRule.kind).toBe('normalization')
  })

  it('counts the keys carrying an out-of-range angle', () => {
    const keys = [
      makeKey({ rotation_angle: 3600 }),
      makeKey({ rotation_angle: 345, rotation_x: 1, rotation_y: 1 }),
      makeKey({ rotation_angle: 15, rotation_x: 1, rotation_y: 1 }),
    ]

    expect(rotationAngleRule.scan(keys).count).toBe(2)
  })

  it('counts keys carrying an out-of-range manufacturing rotation', () => {
    const keys = [
      makeKey({ switchRotation: -90 }),
      makeKey({ stabRotation: 450 }),
      makeKey({ switchRotation: 90, stabRotation: 180 }),
    ]

    expect(rotationAngleRule.scan(keys).count).toBe(2)
  })

  it('wraps angles onto the -180..180 range', () => {
    const keys = [
      makeKey({ rotation_angle: 3600 }),
      makeKey({ rotation_angle: 345, rotation_x: 1, rotation_y: 1 }),
      makeKey({ rotation_angle: -190, rotation_x: 1, rotation_y: 1 }),
    ]

    rotationAngleRule.fix(keys)

    expect(keys[0]!.rotation_angle).toBe(0)
    expect(keys[1]!.rotation_angle).toBe(-15)
    expect(keys[2]!.rotation_angle).toBe(170)
  })

  it('wraps manufacturing rotations onto the 0..360 range', () => {
    const keys = [makeKey({ switchRotation: -90, stabRotation: 450 })]

    rotationAngleRule.fix(keys)

    expect(keys[0]!.switchRotation).toBe(270)
    expect(keys[0]!.stabRotation).toBe(90)
  })

  it('leaves the rotation origin alone', () => {
    // The key lands in the same place about the same point, so the origin is
    // still correct — and rewriting it here would fight the offset rule.
    const keys = [makeKey({ rotation_angle: 375, rotation_x: 4, rotation_y: 2 })]

    rotationAngleRule.fix(keys)

    expect(keys[0]!.rotation_angle).toBe(15)
    expect(keys[0]!.rotation_x).toBe(4)
    expect(keys[0]!.rotation_y).toBe(2)
  })

  it('does not create stale rotation origins when run in isolation', () => {
    // Wrapping a whole turn down to 0 leaves an origin that reads as stale. It
    // was already dead weight at 360 — the stale-origin rule wraps the angle
    // too — so its count must not move because this rule ran.
    const keys = [makeKey({ rotation_angle: 720, rotation_x: 3, rotation_y: 2 })]
    const before = staleRotationOriginRule.scan(keys).count

    rotationAngleRule.fix(keys)

    expect(before).toBe(1)
    expect(staleRotationOriginRule.scan(keys).count).toBe(1)
  })

  it('is a no-op on an already-normalized layout', () => {
    const keys = [
      makeKey(),
      makeKey({ rotation_angle: 180, rotation_x: 1, rotation_y: 1 }),
      makeKey({ rotation_angle: -180, rotation_x: 1, rotation_y: 1 }),
      makeKey({ rotation_angle: -33.5, rotation_x: 1, rotation_y: 1 }),
    ]
    const before = structuredClone(keys)

    expect(rotationAngleRule.scan(keys).count).toBe(0)
    rotationAngleRule.fix(keys)
    expect(keys).toEqual(before)
  })

  it('is a no-op on an empty layout', () => {
    const keys: ReturnType<typeof makeKey>[] = []
    expect(rotationAngleRule.scan(keys).count).toBe(0)
    expect(() => rotationAngleRule.fix(keys)).not.toThrow()
  })

  it('is idempotent', () => {
    const keys = [
      makeKey({ rotation_angle: 3600 }),
      makeKey({ rotation_angle: 200, rotation_x: 1, rotation_y: 1 }),
    ]

    rotationAngleRule.fix(keys)
    expect(rotationAngleRule.scan(keys).count).toBe(0)

    const afterFirst = structuredClone(keys)
    rotationAngleRule.fix(keys)
    expect(keys).toEqual(afterFirst)
  })

  it('handles an absurd angle without hanging', () => {
    const keys = [makeKey({ rotation_angle: 1e20, rotation_x: 1, rotation_y: 1 })]

    rotationAngleRule.fix(keys)

    expect(Math.abs(keys[0]!.rotation_angle)).toBeLessThanOrEqual(180)
  })
})
