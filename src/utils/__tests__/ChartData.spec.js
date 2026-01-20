import { describe, it, expect } from 'vitest'
import { buildSeries, METRICS, parseJsonToPieData, safeNumber, computeDerived, minMaxNormalize, computeMinMax } from '../ChartData.js'

describe('ChartData utilities', () => {
  it('buildSeries computes labels, values and rows with default metric', () => {
    const passengers = [
      { firstName: 'A', lastName: 'One', purchases: 2, visits: 1, miles: 10, avgSpend: 5 },
      { firstName: 'B', lastName: 'Two', purchases: 4, visits: 2, miles: 20, avgSpend: 10 }
    ]
    const out = buildSeries(passengers, 'purchases')
    expect(out.labels.length).toBe(2)
    expect(out.values.length).toBe(2)
    expect(out.rows[0].name).toBeTruthy()
  })

  it('buildSeries supports normalize and sort', () => {
    const passengers = [
      { firstName: 'A', lastName: 'One', purchases: 10, visits: 1 },
      { firstName: 'B', lastName: 'Two', purchases: 20, visits: 2 },
      { firstName: 'C', lastName: 'Three', purchases: 15, visits: 3 }
    ]
    const asc = buildSeries(passengers, 'purchases', { sort: 'asc' })
    expect(asc.values[0]).toBeLessThanOrEqual(asc.values[1])
    const desc = buildSeries(passengers, 'purchases', { sort: 'desc' })
    expect(desc.values[0]).toBeGreaterThanOrEqual(desc.values[1])
    const norm = buildSeries(passengers, 'purchases', { normalize: true })
    expect(Math.max(...norm.values)).toBe(100)
  })

  it('parseJsonToPieData counts types', () => {
    const json = { passengers: [ { type: 'A' }, { type: 'B' }, { type: 'A' } ] }
    const parsed = parseJsonToPieData(json)
    expect(parsed.labels.sort()).toEqual(['A', 'B'].sort())
    expect(parsed.values.reduce((a,b) => a+b, 0)).toBe(3)
  })

  it('buildSeries handles empty input and non-numeric values', () => {
    expect(buildSeries([], 'purchases').labels).toEqual([])
    const passengers = [ { firstName: 'X', purchases: 'not-a-number' } ]
    const out = buildSeries(passengers, 'purchases')
    expect(out.values[0]).toBe(0)
  })

  it('buildSeries handles totalSpend and spendPerVisit metrics and equal-values normalize', () => {
    const passengers = [
      { firstName: 'A', purchases: 2, avgSpend: 5, visits: 1 },
      { firstName: 'B', purchases: 2, avgSpend: 5, visits: 1 }
    ]
    // totalSpend should compute purchases * avgSpend
    const ts = buildSeries(passengers, 'totalSpend')
    expect(ts.values.every(v => v === 10)).toBe(true)

    // spendPerVisit should compute correctly
    const spv = buildSeries(passengers, 'spendPerVisit')
    expect(spv.values.every(v => v === 10)).toBe(true)

    // normalize when all values equal should return zeros
    const norm = buildSeries(passengers, 'totalSpend', { normalize: true })
    expect(norm.values.every(v => v === 0)).toBe(true)
  })

  it('computeDerived produces spendPerVisit 0 when visits are zero and uses passengerId/Unknown names', () => {
    const passengers = [ { purchases: 1, avgSpend: 10, visits: 0, passengerId: 'PID123' }, { } ]
    const out = buildSeries(passengers, 'spendPerVisit')
    // first passenger: visits 0 -> spendPerVisit 0
    expect(out.values[0]).toBe(0)
    // names: first should use passengerId, second should fall back to 'Unknown'
    expect(out.labels[0]).toBe('PID123')
    expect(out.labels[1]).toBe('Unknown')
  })

  it('buildSeries falls back to direct property access for unknown metric keys', () => {
    const passengers = [ { firstName: 'X', mystery: '7' }, { mystery: 3 } ]
    const out = buildSeries(passengers, 'mystery')
    expect(out.values).toEqual([7, 3])
  })

  it('parseJsonToPieData treats missing type as UNKNOWN', () => {
    const json = { passengers: [ { }, { type: null } ] }
    const parsed = parseJsonToPieData(json)
    expect(parsed.labels).toContain('UNKNOWN')
    expect(parsed.values.reduce((a,b) => a+b, 0)).toBe(2)
  })

  it('falls back to metricKey-specific branches when METRICS entry is missing', () => {
    // remove any METRICS entries for totalSpend and spendPerVisit to exercise fallback
    const original = METRICS.splice(0, METRICS.length, ...METRICS.filter(m => m.key !== 'totalSpend' && m.key !== 'spendPerVisit'))
    try {
      const passengers = [ { purchases: 2, avgSpend: 5, visits: 1 }, { purchases: 3, avgSpend: 10, visits: 2 } ]
      const ts = buildSeries(passengers, 'totalSpend')
      expect(ts.values.length).toBe(2)
      // totalSpend fallback should compute purchases * avgSpend
      expect(ts.values[0]).toBe(10)

      const spv = buildSeries(passengers, 'spendPerVisit')
      // spendPerVisit fallback should compute totalSpend/visits where visits>0
      expect(spv.values[0]).toBe(10)
    } finally {
      // restore original METRICS content
      METRICS.splice(0, METRICS.length, ...original)
    }
  })

  it('normalize on empty array returns empty values', () => {
    const out = buildSeries([], 'purchases', { normalize: true })
    expect(out.values).toEqual([])
  })

  it('safeNumber returns 0 for NaN/Infinity and numeric otherwise', () => {
    const fn = require('../ChartData.js').__getSafeNumber?.() || require('../ChartData.js').safeNumber
    // try numeric string
    expect(fn('42')).toBe(42)
    // NaN
    expect(fn('not-a-number')).toBe(0)
    // Infinity
    expect(fn(Infinity)).toBe(0)
  })

  it('computeDerived builds name from title/first/last and falls back to passengerId/Unknown', () => {
    const compute = require('../ChartData.js').__getComputeDerived?.() || require('../ChartData.js').computeDerived
    const p1 = { title: 'Dr', firstName: 'Al', lastName: 'Capone', purchases: 1 }
    const r1 = compute(p1)
    expect(r1.name).toBe('Dr Al Capone')
    const p2 = { passengerId: 'PID999' }
    const r2 = compute(p2)
    expect(r2.name).toBe('PID999')
    const r3 = compute({})
    expect(r3.name).toBe('Unknown')
  })

  it('minMaxNormalize handles empty, equal and normal ranges', () => {
    const mn = require('../ChartData.js').__getMinMaxNormalize?.() || require('../ChartData.js').minMaxNormalize
    expect(mn([])).toEqual([])
    expect(mn([5,5,5])).toEqual([0,0,0])
    const out = mn([0, 50, 100])
    expect(out.length).toBe(3)
    expect(Math.round(out[0])).toBe(0)
    expect(Math.round(out[2])).toBe(100)
  })

  it('computeMinMax handles mixed NaN and numeric arrays and minMaxNormalize covers mapping branch', () => {
    const { computeMinMax, minMaxNormalize } = require('../ChartData.js')
    // mixed NaN and numbers should produce finite min/max from numeric values
    const r = computeMinMax([NaN, 5, 10])
    expect(r.min).toBe(5)
    expect(r.max).toBe(10)

    // equal values -> zeros path
    expect(minMaxNormalize([7,7])).toEqual([0,0])

    // mapping branch: normal range
    const mapped = minMaxNormalize([0, 50, 100])
    expect(Array.isArray(mapped)).toBe(true)
    expect(mapped.length).toBe(3)
  })

  it('uses METRICS accessor for avgSpend metric', () => {
    const passengers = [ { avgSpend: 5 }, { avgSpend: 15 } ]
    const out = buildSeries(passengers, 'avgSpend')
    expect(out.values).toEqual([5,15])
  })

  it('when METRICS entry exists but accessor is not a function, fallback branch for totalSpend executes', () => {
    const { METRICS } = require('../ChartData.js')
    // backup and modify the totalSpend entry to remove accessor
    const original = METRICS.splice(0, METRICS.length, ...METRICS.map(m => ({ ...m })))
    try {
      // find totalSpend entry and remove accessor
      const idx = METRICS.findIndex(m => m.key === 'totalSpend')
      if (idx >= 0) METRICS[idx] = { ...METRICS[idx], accessor: undefined }
      const passengers = [ { purchases: 2, avgSpend: 5 }, { purchases: 3, avgSpend: 10 } ]
      const ts = buildSeries(passengers, 'totalSpend')
      expect(ts.values[0]).toBe(10)
    } finally {
      // restore METRICS
      METRICS.splice(0, METRICS.length, ...original)
    }
  })

  it('minMaxNormalize returns null when given null', () => {
    const mn = require('../ChartData.js').minMaxNormalize
    expect(mn(null)).toBeNull()
  })

  it('falls back to property access when accessor is present but not a function for avgSpend and spendPerVisit', () => {
    const mod = require('../ChartData.js')
    const { METRICS } = mod
    const original = METRICS.splice(0, METRICS.length, ...METRICS.map(m => ({ ...m })))
    try {
      // make avgSpend accessor invalid
      const ai = METRICS.findIndex(m => m.key === 'avgSpend')
      if (ai >= 0) METRICS[ai] = { ...METRICS[ai], accessor: 'not-a-fn' }
      const passengers = [ { avgSpend: 7 }, { avgSpend: 3 } ]
      const out = buildSeries(passengers, 'avgSpend')
      expect(out.values).toEqual([7,3])

      // make spendPerVisit accessor invalid and ensure fallback uses r.spendPerVisit
      const si = METRICS.findIndex(m => m.key === 'spendPerVisit')
      if (si >= 0) METRICS[si] = { ...METRICS[si], accessor: null }
      // provide values that computeDerived will turn into spendPerVisit
      const p2 = [ { purchases: 5, avgSpend: 1, visits: 1 }, { purchases: 10, avgSpend: 1, visits: 1 } ]
      const out2 = buildSeries(p2, 'spendPerVisit')
      expect(out2.values).toEqual([5,10])
    } finally {
      METRICS.splice(0, METRICS.length, ...original)
    }
  })

  it('buildSeries handles undefined passengers param', () => {
    const out = buildSeries(undefined, 'purchases')
    expect(out.labels).toEqual([])
    expect(out.values).toEqual([])
  })

  it('buildSeries with no arguments uses defaults and returns empty arrays', () => {
    const out = buildSeries()
    expect(out.labels).toEqual([])
    expect(out.values).toEqual([])
  })

  it('buildSeries explicit undefined args exercises default-assignment branch', () => {
    const out = buildSeries(undefined, undefined, undefined)
    expect(out.labels).toEqual([])
    expect(out.values).toEqual([])
  })

  it('buildSeries handles null options and accessor-not-function fallback for unknown metric', () => {
    const { METRICS, buildSeries } = require('../ChartData.js')
    // call with null options to exercise options || {} path
    const passengers = [ { firstName: 'Z', purchases: 1 } ]
    const out = buildSeries(passengers, 'purchases', null)
    expect(out.values.length).toBe(1)

    // temporarily set accessor to non-function to hit fallback branch
    const original = METRICS.map(m => ({ ...m }))
    try {
      const idx = METRICS.findIndex(m => m.key === 'avgSpend')
      if (idx >= 0) METRICS[idx].accessor = 'not-a-fn'
      const p2 = [ { avgSpend: 9 }, { avgSpend: 3 } ]
      const o2 = buildSeries(p2, 'avgSpend')
      expect(o2.values).toEqual([9,3])
    } finally {
      METRICS.splice(0, METRICS.length, ...original)
    }
  })

  it('minMaxNormalize handles undefined and NaN-only arrays', () => {
    const mn = require('../ChartData.js').minMaxNormalize
    expect(mn(undefined)).toBeUndefined()
    // NaN-only array: min/max will be NaN and min===max is false, map will produce NaN values -> safe to check length
    const nanOut = mn([NaN, NaN])
    expect(Array.isArray(nanOut)).toBe(true)
    expect(nanOut.length).toBe(2)
  })

  it('computeMinMax returns correct min and max including NaN behavior', () => {
    const cm = require('../ChartData.js').computeMinMax
    const r = cm([0, 50, 100])
    expect(r.min).toBe(0)
    expect(r.max).toBe(100)
    const r2 = cm([NaN, NaN])
    // iterative min/max on NaN-only array yields non-finite results
    expect(Number.isFinite(r2.min)).toBe(false)
    expect(Number.isFinite(r2.max)).toBe(false)
  })

  it('directly exercises METRICS accessors and safeNumber fallback', () => {
    // ensure each accessor function runs (covers arrow-accessor lines)
    for (const m of METRICS) {
      if (typeof m.accessor === 'function') {
        // call with an object that has a property matching common keys
        const sample = { purchases: 3, visits: 1, miles: 100, avgSpend: 5, totalSpend: 15, spendPerVisit: 15 }
        // should not throw and should produce a number or value
        const v = m.accessor(sample)
        expect(v === undefined || v === null || typeof v === 'number' || typeof v === 'string').toBe(true)
      }
    }

    // safeNumber directly
    expect(safeNumber('123')).toBe(123)
    expect(safeNumber('nope')).toBe(0)
    expect(safeNumber(Infinity)).toBe(0)
  })

  it('computeMinMax handles empty arrays and minMaxNormalize handles equal-values and undefined', () => {
    const empty = computeMinMax([])
    expect(empty.min).toBeUndefined()
    expect(empty.max).toBeUndefined()

    expect(minMaxNormalize([])).toEqual([])
    expect(minMaxNormalize([5,5])).toEqual([0,0])

    const norm = minMaxNormalize([0, 50, 100])
    expect(norm.length).toBe(3)
  })

  it('parseJsonToPieData with undefined yields empty labels/values', () => {
    const p = parseJsonToPieData(undefined)
    expect(p.labels).toEqual([])
    expect(p.values).toEqual([])
  })

  it('buildSeries fallback branch for totalSpend and spendPerVisit when METRICS is empty', () => {
    const mod = require('../ChartData.js')
    const { METRICS, buildSeries } = mod
    // backup and clear metrics
    const original = METRICS.splice(0, METRICS.length)
    try {
      const passengers = [ { purchases: 2, avgSpend: 5, visits: 1 }, { purchases: 4, avgSpend: 2, visits: 2 } ]
      const ts = buildSeries(passengers, 'totalSpend')
      expect(ts.values.length).toBe(2)
      expect(ts.values[0]).toBe(10)

      const spv = buildSeries(passengers, 'spendPerVisit')
      expect(spv.values[0]).toBe(10)
    } finally {
      METRICS.splice(0, METRICS.length, ...original)
    }
  })
})
