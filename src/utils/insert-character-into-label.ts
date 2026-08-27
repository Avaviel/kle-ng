// Label strings are parsed as HTML by LabelParser (see
// src/utils/parsers/LabelParser.ts), so characters that are significant to
// HTML syntax must be inserted as their entity text, not as literal glyphs,
// or they'll be misread as markup instead of literal content.
const LABEL_ESCAPE_MAP: Record<string, string> = {
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;',
  '"': '&quot;',
}

export function escapeForLabelInsertion(char: string): string {
  return LABEL_ESCAPE_MAP[char] ?? char
}

export interface InsertCharacterResult {
  text: string
  cursorPos: number
}

/**
 * Splices `char` into `current` at `cursorPos`, escaping it if needed.
 * `cursorPos` of `null` or past the end of the string appends at the end.
 */
export function insertCharacterAtCursor(
  current: string,
  char: string,
  cursorPos: number | null,
): InsertCharacterResult {
  const escaped = escapeForLabelInsertion(char)
  const pos = cursorPos === null || cursorPos > current.length ? current.length : cursorPos
  const text = current.slice(0, pos) + escaped + current.slice(pos)
  return { text, cursorPos: pos + escaped.length }
}
