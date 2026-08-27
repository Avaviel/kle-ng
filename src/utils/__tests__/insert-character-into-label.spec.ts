import { describe, it, expect } from 'vitest'
import { escapeForLabelInsertion, insertCharacterAtCursor } from '../insert-character-into-label'

describe('escapeForLabelInsertion', () => {
  it('escapes HTML-significant characters', () => {
    expect(escapeForLabelInsertion('<')).toBe('&lt;')
    expect(escapeForLabelInsertion('>')).toBe('&gt;')
    expect(escapeForLabelInsertion('&')).toBe('&amp;')
    expect(escapeForLabelInsertion('"')).toBe('&quot;')
  })

  it('passes ordinary glyphs through unescaped', () => {
    expect(escapeForLabelInsertion('©')).toBe('©')
    expect(escapeForLabelInsertion('α')).toBe('α')
    expect(escapeForLabelInsertion("'")).toBe("'")
  })
})

describe('insertCharacterAtCursor', () => {
  it('inserts at the start of the string', () => {
    const result = insertCharacterAtCursor('bc', 'a', 0)
    expect(result).toEqual({ text: 'abc', cursorPos: 1 })
  })

  it('inserts in the middle of the string', () => {
    const result = insertCharacterAtCursor('ac', 'b', 1)
    expect(result).toEqual({ text: 'abc', cursorPos: 2 })
  })

  it('inserts at the end of the string', () => {
    const result = insertCharacterAtCursor('ab', 'c', 2)
    expect(result).toEqual({ text: 'abc', cursorPos: 3 })
  })

  it('appends at the end when cursorPos is null', () => {
    const result = insertCharacterAtCursor('ab', 'c', null)
    expect(result).toEqual({ text: 'abc', cursorPos: 3 })
  })

  it('appends at the end when cursorPos is past the string length', () => {
    const result = insertCharacterAtCursor('ab', 'c', 99)
    expect(result).toEqual({ text: 'abc', cursorPos: 3 })
  })

  it('inserts into an empty string', () => {
    const result = insertCharacterAtCursor('', '©', null)
    expect(result).toEqual({ text: '©', cursorPos: 1 })
  })

  it('escapes HTML-significant characters before splicing', () => {
    const result = insertCharacterAtCursor('a b', '<', 1)
    expect(result).toEqual({ text: 'a&lt; b', cursorPos: 5 })
  })

  it('advances cursorPos by the escaped length, not the raw character length', () => {
    const result = insertCharacterAtCursor('', '&', 0)
    expect(result).toEqual({ text: '&amp;', cursorPos: 5 })
  })
})
