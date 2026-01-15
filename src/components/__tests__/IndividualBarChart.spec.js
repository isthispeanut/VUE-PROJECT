import { shallowMount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

// Mock Chart.js with a constructor spy that returns an object with spies
vi.mock('chart.js/auto', () => {
  const ctor = vi.fn().mockImplementation(function () { return { update: vi.fn(), destroy: vi.fn() } })
  return { default: ctor }
})
import Chart from 'chart.js/auto'

import IndividualBarChart from '../IndividualBarChart.vue'
import mockData from '../data/MockData.json'

// helper to wait for pending microtasks and timers
function wait() { return new Promise(r => setTimeout(r, 0)) }

describe('IndividualBarChart.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  let originalGetContext
  beforeEach(() => {
    // ensure canvas.getContext exists in JSDOM so mount() can create a Chart instance
    originalGetContext = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function () { return {} }
  })
  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext
  })

  it('renders header, select and canvas', () => {
    const wrapper = shallowMount(IndividualBarChart)
    expect(wrapper.find('h3').text()).toBe('Passenger Breakdown')
    expect(wrapper.find('select#metric').exists()).toBe(true)
    expect(wrapper.find('canvas').exists()).toBe(true)
    wrapper.unmount()
  })

  it('fetch success sets localData, loading flows and mounts chart', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(mockData) })))
    const wrapper = shallowMount(IndividualBarChart)
    await wait()
    await wait()
    // after mount finishes
    expect(wrapper.vm.loading).toBe(false)
    expect(wrapper.vm.localData).toEqual(mockData)
    expect(wrapper.vm.Rows.length).toBeGreaterThan(0)
    expect(Chart).toHaveBeenCalled()
    wrapper.unmount()
  })

  it('fetch failure sets error and falls back to mockData', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false })))
    const wrapper = shallowMount(IndividualBarChart)
    await wait()
    await wait()
    expect(wrapper.vm.loading).toBe(false)
    expect(wrapper.vm.error).toBeInstanceOf(Error)
    expect(wrapper.vm.localData).toEqual(mockData)
    // Chart mount may not occur in JSDOM depending on canvas context; ensure fallback logic executed above
    wrapper.unmount()
  })

  it('changing controls rebuilds series and updates labels/values', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(mockData) })))
    const wrapper = shallowMount(IndividualBarChart)
    await wait(); await wait()
    const initialValues = [...wrapper.vm.Values]
    // change metric index to a different metric and expect values to change
    wrapper.vm.MetricIndex = 1
    await wait()
    expect(wrapper.vm.Values).not.toEqual(initialValues)
    // toggle normalize and expect values to change again
    const beforeValues = [...wrapper.vm.Values]
    wrapper.vm.Normalize = true
    await wait()
    expect(wrapper.vm.Values).not.toEqual(beforeValues)
    wrapper.unmount()
  })

  it('select and sort controls exist and affect values order', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(mockData) })))
    const wrapper = shallowMount(IndividualBarChart)
    await wait(); await wait()
    // select#metric should exist and have options equal to Headers length
    const select = wrapper.find('select#metric')
    expect(select.exists()).toBe(true)
    const headersLen = wrapper.vm.Headers.length
    expect(select.findAll('option').length).toBe(headersLen)

    // set SortOrder to desc and ensure Values are sorted descending
    wrapper.vm.SortOrder = 'desc'
    await wait()
    const valsDesc = [...wrapper.vm.Values]
    // set asc and expect values to reorder
    wrapper.vm.SortOrder = 'asc'
    await wait()
    const valsAsc = [...wrapper.vm.Values]
    expect(valsAsc[0]).toBeLessThanOrEqual(valsAsc[valsAsc.length-1])
    expect(valsDesc[0]).toBeGreaterThanOrEqual(valsDesc[valsDesc.length-1])
    wrapper.unmount()
  })

  it('chart instance update is called when config changes and destroyed on unmount', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(mockData) })))
    const wrapper = shallowMount(IndividualBarChart)
    await wait(); await wait()
    // Chart mock ctor returned instance is available via mock.results
    const chartInstance = Chart.mock.results[0] && Chart.mock.results[0].value
    expect(chartInstance).toBeDefined()

    // change a control to cause chartConfig to change -> should trigger update()
    wrapper.vm.MetricIndex = 2
    await wait()
    expect(chartInstance.update).toHaveBeenCalled()

    // unmount should call destroy on the instance
    wrapper.unmount()
    expect(chartInstance.destroy).toHaveBeenCalled()
  })

  it('tooltip label callback formats values and optional parts correctly', async () => {
    const wrapper = shallowMount(IndividualBarChart)
    // case: row contains purchases and visits
    wrapper.vm.Rows = [{ name: 'Jane Doe', value: 123, purchases: 3, visits: 7 }]
    wrapper.vm.MetricIndex = 0
    // grab the tooltip label callback
    const cb = wrapper.vm.chartOptions.plugins.tooltip.callbacks.label
    const label = cb({ dataIndex: 0, raw: 123 })
    expect(label).toContain('Purchases: 3')
    expect(label).toContain('Visits: 7')

    // case: row missing name and numeric value not finite -> falls back to ctx.raw and 'Unknown'
    wrapper.vm.Rows = [{ value: 'NaN' }]
    const label2 = cb({ dataIndex: 0, raw: 42 })
    expect(label2).toContain('Unknown')
    expect(label2).toContain('42')
    wrapper.unmount()
  })
})
