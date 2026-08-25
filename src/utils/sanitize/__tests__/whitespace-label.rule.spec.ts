import { describe, it, expect } from 'vitest'
import { whitespaceLabelRule } from '../rules/whitespace-label.rule'
import { makeKey } from './fixtures'

function withLabels(labels: Record<number, string>) {
  const key = makeKey()
  for (const [index, value] of Object.entries(labels)) {
    key.labels[Number(index)] = value
  }
  return key
}

describe('whitespaceLabelRule', () => {
  it('is registered as a redundancy rule', () => {
    expect(whitespaceLabelRule.kind).toBe('redundancy')
  })

  it('counts whitespace-only labels across keys and indices', () => {
    const keys = [withLabels({ 0: ' ', 4: '\t' }), withLabels({ 9: '   ' })]

    expect(whitespaceLabelRule.scan(keys).count).toBe(3)
  })

  it('clears whitespace-only labels', () => {
    const keys = [withLabels({ 0: ' ', 3: 'Esc' })]

    whitespaceLabelRule.fix(keys)

    expect(keys[0]!.labels[0]).toBe('')
    expect(keys[0]!.labels[3]).toBe('Esc')
  })

  it('does not flag already-empty labels', () => {
    const keys = [makeKey()]
    expect(whitespaceLabelRule.scan(keys).count).toBe(0)
  })

  it('does not touch labels with real content, including padded ones', () => {
    const keys = [withLabels({ 0: ' A ', 1: 'B' })]
    const before = structuredClone(keys)

    expect(whitespaceLabelRule.scan(keys).count).toBe(0)
    whitespaceLabelRule.fix(keys)
    expect(keys).toEqual(before)
  })

  it('is idempotent', () => {
    const keys = [withLabels({ 0: ' ', 5: '\n' })]

    whitespaceLabelRule.fix(keys)
    expect(whitespaceLabelRule.scan(keys).count).toBe(0)

    const afterFirst = structuredClone(keys)
    whitespaceLabelRule.fix(keys)
    expect(keys).toEqual(afterFirst)
  })
})
