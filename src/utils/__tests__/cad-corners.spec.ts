import { describe, it, expect } from 'vitest'
import { Key } from '@adamws/kle-serial'
import {
  applyCornerFields,
  cornerLabel,
  hydrateCorners,
  injectCadCornerProps,
  isCorner,
  nextCornerIndex,
  nextNewZone,
  parseCornerLegend,
  usedZones,
  zoneColor,
} from '../cad-corners'

describe('cad-corners', () => {
  it('parses Z#.# legends', () => {
    expect(parseCornerLegend('Z1.0')).toEqual({ zone: 1, index: 0 })
    expect(parseCornerLegend('z3.12')).toEqual({ zone: 3, index: 12 })
    expect(parseCornerLegend('Enter')).toBeNull()
  })

  it('identifies corners from _z or legends', () => {
    const fromField = new Key()
    applyCornerFields(fromField, 2, 4)
    expect(isCorner(fromField)).toBe(true)

    const fromLegend = new Key()
    fromLegend.labels[4] = 'Z1.0'
    expect(isCorner(fromLegend)).toBe(true)

    expect(isCorner(new Key())).toBe(false)
  })

  it('hydrates _z/_zi from legends after kle-serial drops them', () => {
    const key = new Key()
    key.decal = true
    key.labels[4] = 'Z6.2'
    hydrateCorners([key])
    expect((key as Key & { _z?: number })._z).toBe(6)
    expect((key as Key & { _zi?: number })._zi).toBe(2)
  })

  it('assigns next index and zone', () => {
    const a = new Key()
    applyCornerFields(a, 1, 0)
    const b = new Key()
    applyCornerFields(b, 1, 2)
    expect(nextCornerIndex([a, b], 1)).toBe(3)
    expect(nextNewZone([a, b])).toBe(2)
    expect(usedZones([a, b])).toEqual([1])
  })

  it('injects _z/_zi onto compact KLE next to Z#.# legends', () => {
    const injected = injectCadCornerProps([
      { name: 'desk' },
      [{ d: true, w: 0.5, h: 0.5 }, 'Z1.0', 'A'],
    ]) as unknown[]
    const row = injected[1] as unknown[]
    expect(row[0]).toMatchObject({ d: true, _z: 1, _zi: 0 })
    expect(row[1]).toBe('Z1.0')
  })

  it('uses a stable palette', () => {
    expect(zoneColor(1)).toBe('#e91e63')
    expect(zoneColor(9)).toBe(zoneColor(1))
    expect(cornerLabel(1, 0)).toBe('Z1.0')
  })
})
