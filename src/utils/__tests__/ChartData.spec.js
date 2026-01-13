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
})
