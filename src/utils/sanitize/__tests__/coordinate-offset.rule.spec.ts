import { describe, it, expect } from 'vitest'
import { coordinateOffsetRule } from '../rules/coordinate-offset.rule'
import { staleRotationOriginRule } from '../rules/stale-rotation-origin.rule'
import { makeKey } from './fixtures'

describe('coordinateOffsetRule', () => {
  it('is registered as a normalization rule', () => {
    expect(coordinateOffsetRule.kind).toBe('normalization')
  })

  it('detects a layout offset from the origin', () => {
    const keys = [makeKey({ x: 2, y: 3 }), makeKey({ x: 3, y: 3 })]

    // A whole-layout operation: one issue, not one per key.
    expect(coordinateOffsetRule.scan(keys).count).toBe(1)
  })

  it('detects a layout sitting at negative coordinates', () => {
    const keys = [makeKey({ x: -4, y: -1.5 })]

    expect(coordinateOffsetRule.scan(keys).count).toBe(1)

    coordinateOffsetRule.fix(keys)
    expect(keys[0]!.x).toBe(0)
    expect(keys[0]!.y).toBe(0)
  })

  it('shifts the layout to the origin, preserving relative positions', () => {
    const keys = [makeKey({ x: 2, y: 3 }), makeKey({ x: 5, y: 4 })]

    coordinateOffsetRule.fix(keys)

    expect(keys[0]!.x).toBe(0)
    expect(keys[0]!.y).toBe(0)
    expect(keys[1]!.x).toBe(3)
    expect(keys[1]!.y).toBe(1)
  })

  it('is a no-op on an already-normalized layout', () => {
    const keys = [makeKey({ x: 0, y: 0 }), makeKey({ x: 1, y: 0 })]
    const before = structuredClone(keys)

    expect(coordinateOffsetRule.scan(keys).count).toBe(0)
    coordinateOffsetRule.fix(keys)
    expect(keys).toEqual(before)
  })

  it('is a no-op on an empty layout', () => {
    const keys: ReturnType<typeof makeKey>[] = []
    expect(coordinateOffsetRule.scan(keys).count).toBe(0)
    expect(() => coordinateOffsetRule.fix(keys)).not.toThrow()
  })

  it('is idempotent', () => {
    const keys = [makeKey({ x: 2, y: 3 }), makeKey({ x: 5, y: 4 })]

    coordinateOffsetRule.fix(keys)
    expect(coordinateOffsetRule.scan(keys).count).toBe(0)

    const afterFirst = structuredClone(keys)
    coordinateOffsetRule.fix(keys)
    expect(keys).toEqual(afterFirst)
  })

  describe('rotated keys', () => {
    it('derives the shift from the visual bounding box, not min(key.x)', () => {
      // Rotated 90° about (5,5): the key's raw x/y is (5,5) but it sweeps out to
      // the left of that origin, so the visual box starts further left.
      const keys = [makeKey({ x: 5, y: 5, rotation_angle: 90, rotation_x: 5, rotation_y: 5 })]

      const raw = Math.min(...keys.map((k) => k.x))
      coordinateOffsetRule.fix(keys)

      // A min(key.x)-based implementation would have landed key.x on 0.
      expect(keys[0]!.x).not.toBe(0)
      expect(keys[0]!.x).not.toBe(raw)
      expect(coordinateOffsetRule.scan(keys).count).toBe(0)
    })

    it('is idempotent on a rotated layout (the case the epsilon exists for)', () => {
      // 37° is deliberately not a clean angle: cos/sin leave float residue in the
      // bounding box, so a round-only predicate would keep reporting an issue here.
      const keys = [
        makeKey({ x: 3, y: 2, rotation_angle: 37, rotation_x: 3, rotation_y: 2 }),
        makeKey({ x: 4, y: 2, rotation_angle: 37, rotation_x: 3, rotation_y: 2 }),
      ]

      coordinateOffsetRule.fix(keys)
      expect(coordinateOffsetRule.scan(keys).count).toBe(0)

      const afterFirst = structuredClone(keys)
      coordinateOffsetRule.fix(keys)
      expect(keys).toEqual(afterFirst)
    })

    it('moves the rotation origin of rotated keys by the same delta', () => {
      const keys = [makeKey({ x: 4, y: 4, rotation_angle: 15, rotation_x: 4, rotation_y: 4 })]
      const originalOrigin = { x: keys[0]!.rotation_x, y: keys[0]!.rotation_y }

      coordinateOffsetRule.fix(keys)

      const dx = keys[0]!.x - 4
      const dy = keys[0]!.y - 4
      expect(keys[0]!.rotation_x).toBeCloseTo(originalOrigin.x + dx, 6)
      expect(keys[0]!.rotation_y).toBeCloseTo(originalOrigin.y + dy, 6)
    })
  })

  describe('rotation-origin guard', () => {
    it('leaves rotation origins at zero on unrotated keys', () => {
      // Regression test: shifting rotation_x/rotation_y unconditionally would give
      // every unrotated key a nonzero origin with a zero angle -- exactly the
      // redundancy the stale-rotation-origin rule exists to remove.
      const keys = [
        makeKey({ x: 3, y: 3 }),
        makeKey({ x: 4, y: 3, rotation_angle: 20, rotation_x: 4, rotation_y: 3 }),
      ]

      coordinateOffsetRule.fix(keys)

      expect(keys[0]!.rotation_x).toBe(0)
      expect(keys[0]!.rotation_y).toBe(0)
      expect(keys[1]!.rotation_x).not.toBe(4)
    })

    it('does not manufacture work for the stale-rotation-origin rule', () => {
      const keys = [makeKey({ x: 3, y: 3 }), makeKey({ x: 4, y: 3 }), makeKey({ x: 5, y: 3 })]

      expect(staleRotationOriginRule.scan(keys).count).toBe(0)
      coordinateOffsetRule.fix(keys)
      expect(staleRotationOriginRule.scan(keys).count).toBe(0)
    })

    it('treats a whole-turn angle as unrotated', () => {
      // A truthy-but-meaningless 360 would slip past a plain `if (angle)` guard
      // and hand a key with no effective rotation a nonzero origin.
      const keys = [makeKey({ x: 3, y: 3, rotation_angle: 360 }), makeKey({ x: 4, y: 3 })]

      coordinateOffsetRule.fix(keys)

      expect(keys[0]!.rotation_x).toBe(0)
      expect(keys[0]!.rotation_y).toBe(0)
      expect(staleRotationOriginRule.scan(keys).count).toBe(0)
    })
  })

  describe('secondary rectangle', () => {
    it('leaves x2/y2/width2/height2 untouched', () => {
      const keys = [
        makeKey({
          x: 2,
          y: 2,
          width: 1.25,
          height: 2,
          x2: -0.75,
          y2: 0,
          width2: 1.5,
          height2: 1,
        }),
      ]

      coordinateOffsetRule.fix(keys)

      expect(keys[0]!.x2).toBe(-0.75)
      expect(keys[0]!.y2).toBe(0)
      expect(keys[0]!.width2).toBe(1.5)
      expect(keys[0]!.height2).toBe(1)
    })

    it('aligns the visual edge to 0, leaving min(key.x) positive for a negative x2', () => {
      // Locks in the documented post-condition. An ISO-enter-shaped key whose
      // secondary rect hangs to the left is the leftmost thing in the layout, so
      // it is the secondary rect -- not key.x -- that lands on 0.
      const keys = [
        makeKey({
          x: 2,
          y: 0,
          width: 1.25,
          height: 2,
          x2: -0.75,
          y2: 0,
          width2: 1.5,
          height2: 1,
        }),
        makeKey({ x: 4, y: 0 }),
      ]

      coordinateOffsetRule.fix(keys)

      expect(Math.min(...keys.map((k) => k.x))).toBeGreaterThan(0)
      expect(keys[0]!.x + keys[0]!.x2).toBeCloseTo(0, 6)
      expect(coordinateOffsetRule.scan(keys).count).toBe(0)
    })
  })
})
