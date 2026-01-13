import { describe, it, expect, vi } from 'vitest'

// Mock Chart.js constructor so lifecycle tests can spy on instance methods
vi.mock('chart.js/auto', () => {
  const ctor = vi.fn().mockImplementation(function (ctx, cfg) {
    this.ctx = ctx
    this.cfg = cfg
    this.update = vi.fn()
    this.destroy = vi.fn()
  })
  return { default: ctor }
})

import Chart from 'chart.js/auto'
import { buildBarConfig, buildPieConfig, createChartConfig, createChartLifecycle } from '../ChartUtils.js'

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

  it('createChartLifecycle mount/update/unmount behavior', () => {
    // Chart is the mocked constructor imported above
    // no canvas -> mount should no-op
    const canvasRef = { value: null }
    const cfg = { type: 'bar', data: { labels: [], datasets: [] } }
    const lifecycle = createChartLifecycle(canvasRef, () => cfg)
    lifecycle.mount()
    expect(Chart).not.toHaveBeenCalled()

    // canvas without context -> no mount
    canvasRef.value = {}
    lifecycle.mount()
    expect(Chart).not.toHaveBeenCalled()

    // provide a canvas with getContext -> mount should call Chart
    const fakeCtx = {}
    const canvas = { getContext: () => fakeCtx }
    canvasRef.value = canvas
    lifecycle.mount()
    expect(Chart).toHaveBeenCalled()
    const created = Chart.mock.results[0].value

    // update should set data/options and call instance.update
    const newCfg = { data: { labels: ['x'], datasets: [{ data: [1] }] }, options: { test: true } }
    lifecycle.update(newCfg)
    expect(created.update).toHaveBeenCalled()
    expect(created.cfg).toBe(cfg) // constructor got initial cfg

    // unmount should call destroy
    lifecycle.unmount()
    expect(created.destroy).toHaveBeenCalled()
  })
})
