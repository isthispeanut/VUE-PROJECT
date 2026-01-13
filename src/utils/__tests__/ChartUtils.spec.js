import { describe, it, expect } from 'vitest'
import { buildBarConfig, buildPieConfig, createChartConfig } from '../ChartUtils.js'

describe('ChartUtils generic factory', () => {
  it('buildBarConfig returns chart config with defaults merged', () => {
    const data = { labels: ['x'], datasets: [{ data: [1] }] }
    const cfg = buildBarConfig({ data })
    expect(cfg.type).toBe('bar')
    expect(cfg.data).toBe(data)
    expect(cfg.options).toBeDefined()
    expect(cfg.options.indexAxis).toBe('y')
  })

  it('buildPieConfig returns pie config and honors options override', () => {
    const data = { labels: ['a'], datasets: [{ data: [2] }] }
    const cfg = buildPieConfig({ data, options: { plugins: { legend: { position: 'top' } } } })
    expect(cfg.type).toBe('pie')
    expect(cfg.data).toBe(data)
    expect(cfg.options.plugins.legend.position).toBe('top')
  })

  it('createChartConfig dispatches by type', () => {
    const data = { labels: [], datasets: [] }
    const b = createChartConfig({ type: 'bar', data })
    expect(b.type).toBe('bar')
    const p = createChartConfig({ type: 'pie', data })
    expect(p.type).toBe('pie')
  })
})
