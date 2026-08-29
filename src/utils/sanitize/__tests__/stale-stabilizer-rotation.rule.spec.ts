import { describe, it, expect } from 'vitest'
import { staleStabilizerRotationRule } from '../rules/stale-stabilizer-rotation.rule'
import { makeKey } from './fixtures'

describe('staleStabilizerRotationRule', () => {
  it('is registered as a redundancy rule', () => {
    expect(staleStabilizerRotationRule.kind).toBe('redundancy')
  })

  it('flags a stab rotation left on a 1x1 key', () => {
    const keys = [makeKey({ width: 1, height: 1, stabRotation: 90 })]

    expect(staleStabilizerRotationRule.scan(keys).count).toBe(1)
  })

  it('flags a stab rotation on a key with no explicit width/height (defaults to 1x1)', () => {
    const keys = [makeKey({ stabRotation: 90 })]

    expect(staleStabilizerRotationRule.scan(keys).count).toBe(1)
  })

  it('zeroes the stab rotation', () => {
    const keys = [makeKey({ width: 1, height: 1, stabRotation: 270 })]

    staleStabilizerRotationRule.fix(keys)

    expect(keys[0]!.stabRotation).toBe(0)
  })

  it('leaves a wide key alone, even though it is 1u tall', () => {
    const keys = [makeKey({ width: 2, height: 1, stabRotation: 90 })]
    const before = structuredClone(keys)

    expect(staleStabilizerRotationRule.scan(keys).count).toBe(0)
    staleStabilizerRotationRule.fix(keys)
    expect(keys).toEqual(before)
  })

  it('leaves a 1x2 key alone: 1u wide but 2u tall still uses a stabilizer', () => {
    const keys = [makeKey({ width: 1, height: 2, stabRotation: 90 })]
    const before = structuredClone(keys)

    expect(staleStabilizerRotationRule.scan(keys).count).toBe(0)
    staleStabilizerRotationRule.fix(keys)
    expect(keys).toEqual(before)
  })

  it('is a no-op on a clean layout', () => {
    const keys = [
      makeKey(),
      makeKey({ width: 6.25, height: 1, stabRotation: 90 }),
      makeKey({ width: 1, height: 1, stabRotation: 0 }),
    ]
    const before = structuredClone(keys)

    expect(staleStabilizerRotationRule.scan(keys).count).toBe(0)
    staleStabilizerRotationRule.fix(keys)
    expect(keys).toEqual(before)
  })

  it('is idempotent', () => {
    const keys = [makeKey({ width: 1, height: 1, stabRotation: 90 })]

    staleStabilizerRotationRule.fix(keys)
    expect(staleStabilizerRotationRule.scan(keys).count).toBe(0)

    const afterFirst = structuredClone(keys)
    staleStabilizerRotationRule.fix(keys)
    expect(keys).toEqual(afterFirst)
  })

  it('is a no-op on an empty layout', () => {
    const keys: ReturnType<typeof makeKey>[] = []
    expect(staleStabilizerRotationRule.scan(keys).count).toBe(0)
    expect(() => staleStabilizerRotationRule.fix(keys)).not.toThrow()
  })
})
