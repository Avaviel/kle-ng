import type { Key } from '@adamws/kle-serial'

/**
 * Distinguishes the two families of sanitize rule.
 *
 * - `redundancy` deletes data that provably has no effect on any render or
 *   export path. Removing it cannot change what the user sees. `count` is the
 *   number of individual fields that would be cleared, so counts are additive.
 * - `normalization` rewrites live data. The result looks identical on canvas,
 *   but the underlying values change. `count` is on the rule's own scale — the
 *   keys it would rewrite, or 0/1 for a whole-layout operation like recentring —
 *   so it must never be summed together with `redundancy` counts, or with
 *   another normalization rule's count.
 *
 * This discriminator carries no weight in the engine itself; `applySanitizeFixes`
 * treats every rule identically. It exists so the panel can group and report the
 * two families separately, and so a future rule author has to classify consciously.
 */
export type SanitizeRuleKind = 'redundancy' | 'normalization'

export interface SanitizeScanResult {
  /** Number of issues found; drives the UI badge. */
  count: number
}

export interface SanitizeRule {
  id: string
  kind: SanitizeRuleKind
  name: string
  /**
   * A short phrase shown inline under the rule name. Keep it to a few words — it
   * has to fit one compact line, and the panel is sized so it never scrolls.
   */
  description: string
  /** Read-only: must not mutate `keys`. */
  scan(keys: Key[]): SanitizeScanResult
  /**
   * Mutates `keys` in place. Must be idempotent, and must leave the layout in a
   * state where every rule's `scan()` is accurate — including other rules'.
   * See the ordering note in `./index.ts`.
   */
  fix(keys: Key[]): void
}
