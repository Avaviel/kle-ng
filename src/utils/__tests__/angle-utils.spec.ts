import { describe, it, expect } from 'vitest'
import { normalizeAngleDegrees } from '../angle-utils'

describe('normalizeAngleDegrees', () => {
  it('leaves an in-range angle alone', () => {
    expect(normalizeAngleDegrees(0)).toBe(0)
    expect(normalizeAngleDegrees(15)).toBe(15)
    expect(normalizeAngleDegrees(-90)).toBe(-90)
    expect(normalizeAngleDegrees(179.5)).toBe(179.5)
  })

  it('keeps both endpoints stable', () => {
    // Flipping 180 to -180 (or back) on every call would make the function
    // non-idempotent, and the sanitize rule would report an issue forever.
    expect(normalizeAngleDegrees(180)).toBe(180)
    expect(normalizeAngleDegrees(-180)).toBe(-180)
  })

  it('wraps past a half turn to the near side of zero', () => {
    expect(normalizeAngleDegrees(190)).toBe(-170)
    expect(normalizeAngleDegrees(345)).toBe(-15)
    expect(normalizeAngleDegrees(-190)).toBe(170)
    expect(normalizeAngleDegrees(-345)).toBe(15)
  })

  it('collapses whole turns to zero', () => {
    expect(normalizeAngleDegrees(360)).toBe(0)
    expect(normalizeAngleDegrees(3600)).toBe(0)
    expect(normalizeAngleDegrees(-720)).toBe(0)
    // -0 would serialize as 0 anyway, but Object.is asymmetry is not worth
    // leaving in a value that flows into comparisons.
    expect(Object.is(normalizeAngleDegrees(-360), 0)).toBe(true)
  })

  it('keeps the fractional part of a wrapped angle', () => {
    expect(normalizeAngleDegrees(3615.5)).toBe(15.5)
    expect(normalizeAngleDegrees(720.1)).toBe(0.1)
  })

  it('is idempotent', () => {
    for (const angle of [0, 180, -180, 190, 345, 3600, -3615.5, 1e20]) {
      const once = normalizeAngleDegrees(angle)
      expect(normalizeAngleDegrees(once), `angle ${angle}`).toBe(once)
    }
  })

  it('handles an enormous value without iterating per turn', () => {
    // Regression guard: a subtract-360 loop would spin ~2.8e17 times here.
    const start = Date.now()
    const result = normalizeAngleDegrees(1e20)

    expect(Math.abs(result)).toBeLessThanOrEqual(180)
    expect(Date.now() - start).toBeLessThan(1000)
  })

  it('falls back to zero for a non-finite angle', () => {
    expect(normalizeAngleDegrees(NaN)).toBe(0)
    expect(normalizeAngleDegrees(Infinity)).toBe(0)
  })
})
