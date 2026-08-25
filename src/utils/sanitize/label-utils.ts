/**
 * Returns true when a label renders as nothing — empty, missing, or whitespace only.
 *
 * Used by the redundant-formatting rules so that a whitespace-only label counts as
 * blank regardless of whether the whitespace rule itself runs in the same Apply.
 * Rules are individually selectable, so no rule may depend on another having run.
 */
export function isLabelBlank(label: string | undefined | null): boolean {
  return !label || label.trim() === ''
}
