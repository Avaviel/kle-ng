import type { Array12, Key, KeyboardMetadata } from '@adamws/kle-serial'
import { createEmptyLabels } from './array-helpers'

/** Extra CAD fields kle-serial2 does not model. Kept on key objects in the editor. */
export type CadKey = Key & { _z?: number; _zi?: number }

export type ZoneShape = 'convex' | 'path'

export interface ZoneSettings {
  fillet: number
  offset: number
  shape: ZoneShape
}

export const DEFAULT_ZONE_SETTINGS: ZoneSettings = { fillet: 6, offset: 16, shape: 'convex' }

export const CORNER_ZONE_CHOICES = [1, 2, 3, 4, 5, 6, 7, 8]

const ZONE_PALETTE = [
  '#e91e63',
  '#2196f3',
  '#4caf50',
  '#ff9800',
  '#9c27b0',
  '#00bcd4',
  '#795548',
  '#607d8b',
]

const CORNER_LEGEND = /^Z(\d+)\.(\d+)$/i

export function cornerLabel(zone: number, index: number): string {
  return `Z${zone}.${index}`
}

export function parseCornerLegend(text: string | undefined | null): { zone: number; index: number } | null {
  const match = String(text || '')
    .trim()
    .match(CORNER_LEGEND)
  if (!match) return null
  return { zone: parseInt(match[1]!, 10), index: parseInt(match[2]!, 10) }
}

export function parseCornerLabel(key: Key): { zone: number; index: number } | null {
  const cad = key as CadKey
  if ((cad._z || 0) > 0) {
    return { zone: cad._z as number, index: cad._zi || 0 }
  }
  for (const label of key.labels || []) {
    const parsed = parseCornerLegend(label)
    if (parsed) return parsed
  }
  return null
}

export function isCorner(key: Key | null | undefined): boolean {
  return !!key && parseCornerLabel(key) != null
}

export function getCornerZone(key: Key): number {
  return parseCornerLabel(key)?.zone || 0
}

export function getCornerIndex(key: Key): number {
  return parseCornerLabel(key)?.index || 0
}

export function zoneColor(zone: number): string {
  const i = (((zone || 1) - 1) % ZONE_PALETTE.length + ZONE_PALETTE.length) % ZONE_PALETTE.length
  return ZONE_PALETTE[i]!
}

export function nextCornerIndex(keys: Key[], zone: number): number {
  let max = -1
  for (const key of keys) {
    if (getCornerZone(key) === zone) {
      max = Math.max(max, getCornerIndex(key))
    }
  }
  return max + 1
}

export function nextNewZone(keys: Key[]): number {
  let max = 0
  for (const key of keys) {
    max = Math.max(max, getCornerZone(key))
  }
  return max + 1
}

export function usedZones(keys: Key[]): number[] {
  const set = new Set<number>()
  for (const key of keys) {
    const zone = getCornerZone(key)
    if (zone > 0) set.add(zone)
  }
  return [...set].sort((a, b) => a - b)
}

export function cornerLabelsFor(zone: number, index: number): Array12<string> {
  const labels = createEmptyLabels()
  labels[4] = cornerLabel(zone, index)
  return labels
}

export function applyCornerFields(key: Key, zone: number, index: number): void {
  const cad = key as CadKey
  cad._z = zone
  cad._zi = index
  key.decal = true
}

/**
 * After kle-serial2 load (which drops _z/_zi), restore them from Z#.# legends
 * so the editor can treat CAD-desk corners as corners.
 */
export function hydrateCorners(keys: Key[]): void {
  for (const key of keys) {
    const parsed = parseCornerLabel(key)
    if (!parsed) continue
    applyCornerFields(key, parsed.zone, parsed.index)
  }
}

export function ensureZoneMeta(meta: KeyboardMetadata, zone: number): void {
  const rec = meta as KeyboardMetadata & { _zones?: Record<string, ZoneSettings> }
  if (!rec._zones) rec._zones = {}
  const z = String(zone)
  if (!rec._zones[z]) {
    rec._zones[z] = { ...DEFAULT_ZONE_SETTINGS }
  }
}

/**
 * kle-serial2 will not emit _z/_zi. After compact serialize, stamp them onto
 * the property object that precedes each Z#.# legend so Copy/YAKB get typed fields.
 */
export function injectCadCornerProps(data: unknown): unknown {
  if (!Array.isArray(data)) return data
  return data.map((row) => {
    if (!Array.isArray(row)) return row
    const out: unknown[] = []
    for (const item of row) {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        out.push({ ...(item as Record<string, unknown>) })
        continue
      }
      if (typeof item === 'string') {
        const parsed = parseCornerLegend(item)
        if (parsed) {
          const prev = out[out.length - 1]
          if (prev && typeof prev === 'object' && !Array.isArray(prev)) {
            const rec = prev as Record<string, unknown>
            if (rec._z == null) rec._z = parsed.zone
            if (rec._zi == null) rec._zi = parsed.index
          } else {
            out.push({ _z: parsed.zone, _zi: parsed.index })
          }
        }
        out.push(item)
        continue
      }
      out.push(item)
    }
    return out
  })
}
