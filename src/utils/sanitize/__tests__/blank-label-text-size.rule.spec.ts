import { describe, it, expect } from 'vitest'
import { blankLabelTextSizeRule } from '../rules/blank-label-text-size.rule'
import { makeKey } from './fixtures'

describe('blankLabelTextSizeRule', () => {
  it('is registered as a redundancy rule', () => {
    expect(blankLabelTextSizeRule.kind).toBe('redundancy')
  })

  it('flags a size override on an empty label', () => {
    const key = makeKey()
    key.textSize[0] = 5

    expect(blankLabelTextSizeRule.scan([key]).count).toBe(1)
  })

  it('clears the orphaned override', () => {
    const key = makeKey()
    key.textSize[0] = 5

    blankLabelTextSizeRule.fix([key])

    expect(key.textSize[0]).toBe(0)
  })

  it('keeps overrides on labels that have content', () => {
    const key = makeKey()
    key.labels[0] = 'Esc'
    key.textSize[0] = 5

    expect(blankLabelTextSizeRule.scan([key]).count).toBe(0)
    blankLabelTextSizeRule.fix([key])
    expect(key.textSize[0]).toBe(5)
  })

  it('treats a whitespace-only label as blank, independent of the whitespace rule', () => {
    // Rules are individually selectable, so this must hold whether or not
    // whitespace-label runs in the same Apply.
    const key = makeKey()
    key.labels[2] = ' '
    key.textSize[2] = 4

    expect(blankLabelTextSizeRule.scan([key]).count).toBe(1)
    blankLabelTextSizeRule.fix([key])
    expect(key.textSize[2]).toBe(0)
    // The label itself is left for the whitespace rule to deal with.
    expect(key.labels[2]).toBe(' ')
  })

  it('is a no-op on a clean key', () => {
    const key = makeKey()
    key.labels[0] = 'A'
    const before = structuredClone(key)

    expect(blankLabelTextSizeRule.scan([key]).count).toBe(0)
    blankLabelTextSizeRule.fix([key])
    expect(key).toEqual(before)
  })

  it('is idempotent', () => {
    const key = makeKey()
    key.textSize[1] = 3
    key.textSize[7] = 9

    blankLabelTextSizeRule.fix([key])
    expect(blankLabelTextSizeRule.scan([key]).count).toBe(0)

    const afterFirst = structuredClone(key)
    blankLabelTextSizeRule.fix([key])
    expect(key).toEqual(afterFirst)
  })
})
