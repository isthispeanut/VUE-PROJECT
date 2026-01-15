import { describe, it, expect } from 'vitest'
import { buildSeries, METRICS, parseJsonToPieData } from '../ChartData.js'

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
})
