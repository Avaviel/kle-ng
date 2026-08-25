import { describe, it, expect } from 'vitest'
import { isLabelBlank } from '../label-utils'

describe('isLabelBlank', () => {
  it.each([
    ['', true],
    [' ', true],
    ['   ', true],
    ['\t', true],
    ['\n', true],
    [' \t\n ', true],
    ['A', false],
    [' A ', false],
    ['0', false],
  ])('isLabelBlank(%j) === %s', (label, expected) => {
    expect(isLabelBlank(label)).toBe(expected)
  })

  it('treats undefined and null as blank', () => {
    expect(isLabelBlank(undefined)).toBe(true)
    expect(isLabelBlank(null)).toBe(true)
  })
})
