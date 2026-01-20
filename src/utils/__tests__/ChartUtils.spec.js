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

  it('createChartConfig falls back to bar for unknown types', () => {
    const data = { labels: [], datasets: [] }
    const cfg = createChartConfig({ type: 'radar', data })
    expect(cfg.type).toBe('bar')
  })

  it('createChartLifecycle mount/update/unmount behavior', () => {
    // Chart is the mocked constructor imported above
    // no canvas -> mount should no-op
    const canvasRef = { value: null }
    const cfg = { type: 'bar', data: { labels: [], datasets: [] } }
    const lifecycle = createChartLifecycle(canvasRef, () => cfg)
    lifecycle.mount()
    expect(Chart).not.toHaveBeenCalled()

    // buildConfig returns falsy -> mount should no-op even if canvas present
    const canvasRef2 = { value: { getContext: () => ({}) } }
    const lifecycle2 = createChartLifecycle(canvasRef2, () => null)
    lifecycle2.mount()
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

    // calling update when there is no instance should no-op (no throw)
    const lifecycleNoInstance = createChartLifecycle({ value: null }, () => cfg)
    expect(() => lifecycleNoInstance.update({})).not.toThrow()

    // unmount should call destroy
    lifecycle.unmount()
    expect(created.destroy).toHaveBeenCalled()

    // unmount when no instance should no-op
    const lifecycleEmpty = createChartLifecycle({ value: null }, () => cfg)
    expect(() => lifecycleEmpty.unmount()).not.toThrow()
  })

  it('mount accepts static config object (non-function) and update handles instance without update method', () => {
    const canvasRef = { value: { getContext: () => ({}) } }
    const staticCfg = { type: 'bar', data: { labels: [], datasets: [] } }
    const lifecycle = createChartLifecycle(canvasRef, staticCfg)
    // should use static config without throwing
    lifecycle.mount()
    expect(Chart).toHaveBeenCalled()

    // simulate instance without update method
    const created = Chart.mock.results[Chart.mock.results.length - 1].value
    // remove update to exercise typeof guard
    delete created.update
    // calling update with newCfg should not throw even when update missing
    expect(() => lifecycle.update({ data: { labels: ['x'], datasets: [] } })).not.toThrow()
    lifecycle.unmount()
  })
})
