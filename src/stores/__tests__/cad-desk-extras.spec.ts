import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { Serial } from '@adamws/kle-serial'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { useKeyboardStore } from '../keyboard'

/**
 * CAD desk JSON from the KLE CAD fork. kle-serial2 keeps unknown *metadata*
 * (e.g. _zones) and drops unknown *key* fields (_z, _zi). This spec is the
 * baseline for extras we must teach the parser over time — it must not throw.
 */
const cadDeskPath = resolve(__dirname, '../../../public/data/cad-desk.json')

function loadCadDesk(): unknown[] {
  return JSON.parse(readFileSync(cadDeskPath, 'utf-8')) as unknown[]
}

describe('CAD desk extras vs kle-serial2', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('deserializes without throwing', () => {
    const data = loadCadDesk()
    expect(() => Serial.deserialize(data)).not.toThrow()
  })

  it('loads through the keyboard store', () => {
    const store = useKeyboardStore()
    const data = loadCadDesk()
    expect(() => store.loadKLELayout(data)).not.toThrow()
    expect(store.keys.length).toBeGreaterThan(0)
    expect(store.metadata.name).toBe('CAD desk (split islands)')
  })

  it('keeps first-object CAD metadata (_zones)', () => {
    const keyboard = Serial.deserialize(loadCadDesk())
    const zones = (keyboard.meta as { _zones?: Record<string, unknown> })._zones
    expect(zones).toBeTruthy()
    expect(Object.keys(zones || {})).toEqual(['1', '2', '3', '4', '5', '6'])
  })

  it('kle-serial2 deserialize drops per-key _z/_zi', () => {
    const raw = JSON.stringify(loadCadDesk())
    expect(raw).toContain('"_z"')
    expect(raw).toContain('"_zi"')

    const keyboard = Serial.deserialize(loadCadDesk())
    const extrasOnKeys = keyboard.keys.filter((key) => {
      const rec = key as unknown as Record<string, unknown>
      return rec._z != null || rec._zi != null
    })
    expect(extrasOnKeys).toHaveLength(0)
  })

  it('store hydrates _z/_zi from Z#.# legends after load', () => {
    const store = useKeyboardStore()
    store.loadKLELayout(loadCadDesk())

    const extrasOnKeys = store.keys.filter((key) => {
      const rec = key as unknown as Record<string, unknown>
      return rec._z != null
    })
    expect(extrasOnKeys.length).toBeGreaterThan(0)
  })

  it('keeps corner decals and Z#.# legends so keys still render', () => {
    const store = useKeyboardStore()
    store.loadKLELayout(loadCadDesk())

    const decals = store.keys.filter((key) => key.decal)
    expect(decals.length).toBeGreaterThan(0)

    const cornerLegends = store.keys.filter((key) =>
      key.labels.some((label) => /^Z\d+\.\d+$/i.test(String(label || ''))),
    )
    expect(cornerLegends.length).toBeGreaterThan(0)
  })

  it('compact re-serialize injects _z/_zi next to Z#.# legends', () => {
    const store = useKeyboardStore()
    store.loadKLELayout(loadCadDesk())
    const compact = JSON.stringify(store.getSerializedData('kle'))
    expect(compact).toContain('"_z"')
    expect(compact).toContain('"_zi"')
    expect(compact).toContain('_zones')
  })
})
