import { describe, it, expect } from 'vitest'
import { blankLabelTextColorRule } from '../rules/blank-label-text-color.rule'
import { makeKey } from './fixtures'

describe('blankLabelTextColorRule', () => {
  it('is registered as a redundancy rule', () => {
    expect(blankLabelTextColorRule.kind).toBe('redundancy')
  })

  it('flags a color override on an empty label', () => {
    const key = makeKey()
    key.textColor[0] = '#ff0000'

    expect(blankLabelTextColorRule.scan([key]).count).toBe(1)
  })

  it('clears the orphaned override', () => {
    const key = makeKey()
    key.textColor[0] = '#ff0000'

    blankLabelTextColorRule.fix([key])

    expect(key.textColor[0]).toBe('')
  })

  it('keeps overrides on labels that have content', () => {
    const key = makeKey()
    key.labels[0] = 'Esc'
    key.textColor[0] = '#ff0000'

    expect(blankLabelTextColorRule.scan([key]).count).toBe(0)
    blankLabelTextColorRule.fix([key])
    expect(key.textColor[0]).toBe('#ff0000')
  })

  it('treats a whitespace-only label as blank, independent of the whitespace rule', () => {
    const key = makeKey()
    key.labels[2] = '  '
    key.textColor[2] = '#00ff00'

    expect(blankLabelTextColorRule.scan([key]).count).toBe(1)
    blankLabelTextColorRule.fix([key])
    expect(key.textColor[2]).toBe('')
    expect(key.labels[2]).toBe('  ')
  })

  it('is a no-op on a clean key', () => {
    const key = makeKey()
    key.labels[0] = 'A'
    const before = structuredClone(key)

    expect(blankLabelTextColorRule.scan([key]).count).toBe(0)
    blankLabelTextColorRule.fix([key])
    expect(key).toEqual(before)
  })

  it('is idempotent', () => {
    const key = makeKey()
    key.textColor[1] = '#111111'
    key.textColor[7] = '#222222'

    blankLabelTextColorRule.fix([key])
    expect(blankLabelTextColorRule.scan([key]).count).toBe(0)

    const afterFirst = structuredClone(key)
    blankLabelTextColorRule.fix([key])
    expect(key).toEqual(afterFirst)
  })
})
