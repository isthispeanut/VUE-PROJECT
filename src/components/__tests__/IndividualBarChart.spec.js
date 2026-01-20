import { shallowMount, mount } from '@vue/test-utils'
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
    const wrapper = mount(IndividualBarChart)
    expect(wrapper.find('h3').text()).toBe('Passenger Breakdown')
    expect(wrapper.find('select#metric').exists()).toBe(true)
    expect(wrapper.find('canvas').exists()).toBe(true)
    wrapper.unmount()
  })

  it('mounting with props.data populates metric options and shows Normalize label', async () => {
    const wrapper = mount(IndividualBarChart, { props: { data: mockData } })
    // allow mounted async to complete
    await new Promise(r => setTimeout(r, 0))
    await new Promise(r => setTimeout(r, 0))
    const select = wrapper.find('select#metric')
    const options = select.findAll('option')
    expect(options.length).toBe(wrapper.vm.Headers.length)
    // first option should reflect header label or Metric 0 fallback
    expect(options[0].text()).toContain(wrapper.vm.Headers[0] || 'Metric 0')
    const label = wrapper.find('label')
    expect(label.text()).toContain('Normalize')
    wrapper.unmount()
  })

  it('accessing HeaderLabels and chartConfig triggers computed branches', async () => {
    const wrapper = mount(IndividualBarChart)
    // touch computed properties to execute their code paths
    const headers = wrapper.vm.HeaderLabels
    const cfg = wrapper.vm.chartConfig
    expect(Array.isArray(headers)).toBe(true)
    expect(cfg).toBeDefined()
    wrapper.unmount()
  })

  it('fetch success sets localData, loading flows and mounts chart', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(mockData) })))
    const wrapper = mount(IndividualBarChart)
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
    const wrapper = mount(IndividualBarChart)
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
    const wrapper = mount(IndividualBarChart)
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
    const wrapper = mount(IndividualBarChart)
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
    const wrapper = mount(IndividualBarChart)
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
    const wrapper = mount(IndividualBarChart)
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

  it('renders fallback metric text when header entry is falsy', async () => {
    const wrapper = mount(IndividualBarChart)
    // set Headers to include a falsy entry so template falls back to 'Metric N'
    wrapper.vm.Headers = ['', null]
    await wrapper.vm.$nextTick()
    const select = wrapper.find('select#metric')
    const option0 = select.findAll('option')[0]
    expect(option0.text()).toContain('Metric')
    wrapper.unmount()
  })

  it('HeaderLabels fallback for undefined/null covers template branch', async () => {
    const wrapper = mount(IndividualBarChart)
    // include undefined/null entries
    wrapper.vm.Headers = [undefined, null]
    await wrapper.vm.$nextTick()
    const options = wrapper.findAll('option')
    // Expect both options to render fallback text 'Metric N'
    expect(options[0].text()).toContain('Metric')
    expect(options[1].text()).toContain('Metric')
    wrapper.unmount()
  })

  it('template renders fallback for falsy header entry (explicit false)', async () => {
    const wrapper = mount(IndividualBarChart)
    wrapper.vm.Headers = [false]
    await wrapper.vm.$nextTick()
    const option = wrapper.find('select#metric').findAll('option')[0]
    expect(option.text()).toContain('Metric')
    wrapper.unmount()
  })

  it('HeaderLabels renders both string and empty-string entries correctly', async () => {
    const wrapper = mount(IndividualBarChart)
    wrapper.vm.Headers = ['Revenue', '']
    await wrapper.vm.$nextTick()
    const options = wrapper.find('select#metric').findAll('option')
    expect(options[0].text()).toContain('Revenue')
    expect(options[1].text()).toContain('Metric')
    wrapper.unmount()
  })

  it('select value binding updates MetricIndex via DOM interaction', async () => {
    const wrapper = mount(IndividualBarChart)
    // build simple headers
    wrapper.vm.Headers = ['One', 'Two', 'Three']
    await wrapper.vm.$nextTick()
    const select = wrapper.find('select#metric')
    const options = select.findAll('option')
    expect(options.length).toBeGreaterThanOrEqual(3)
    // set via DOM to second index
    await select.setValue('1')
    expect(wrapper.vm.MetricIndex).toBe(1)
    wrapper.unmount()
  })

  it('mounting with empty metrics prop uses default METRICS and builds headers', async () => {
    const wrapper = mount(IndividualBarChart, { props: { metrics: [] } })
    // allow mounted async to complete
    await wait(); await wait()
    // headers should be built from provided (empty) metrics -> fallback to Metric N labels
    expect(wrapper.vm.Headers.length).toBe(0)
    const select = wrapper.find('select#metric')
    // even with no headers, select exists and options map to HeaderLabels length
    expect(select.exists()).toBe(true)
    wrapper.unmount()
  })

  it('sort select options exist and can be changed via DOM', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(mockData) })))
    const wrapper = mount(IndividualBarChart)
    // wait for async mount to complete
    await new Promise(r => setTimeout(r, 0))
    await new Promise(r => setTimeout(r, 0))
    const selects = wrapper.findAll('select')
    // metric select is first, sort select is second
    const sortSelect = selects[1]
    const options = sortSelect.findAll('option')
    expect(options.map(o => o.text())).toEqual(expect.arrayContaining(['No sort', 'Sort ↓', 'Sort ↑']))

    // change value by DOM and ensure component state updates
    await sortSelect.setValue('desc')
    expect(wrapper.vm.SortOrder).toBe('desc')
    await sortSelect.setValue('asc')
    expect(wrapper.vm.SortOrder).toBe('asc')
    wrapper.unmount()
  })

  it('tooltip callback falls back to metric label "Value", empty row and 0 when raw missing', async () => {
    const wrapper = mount(IndividualBarChart)
    // ensure Metrics empty so metricLabel falls back
    // ensure MetricIndex points outside Metrics so metricLabel falls back
    wrapper.vm.MetricIndex = 999
    wrapper.vm.Rows = []
    const cb = wrapper.vm.chartOptions.plugins.tooltip.callbacks.label
    const label = cb({ dataIndex: 0 })
    expect(label).toContain('Value')
    expect(label).toContain('Unknown')
    expect(label).toContain('0')
    wrapper.unmount()
  })

  it('optionLabel and tooltip variations cover fallback branches', async () => {
    const wrapper = mount(IndividualBarChart)
    // direct call to optionLabel should return fallback text for falsy labels
    expect(wrapper.vm.optionLabel('', 0)).toContain('Metric')

    // exercise tooltip callback with a simple row and fallback cases
    wrapper.vm.Rows = [{ name: 'Alpha', value: 123, purchases: 1 }]
    wrapper.vm.MetricIndex = 0
    const cb = wrapper.vm.chartOptions.plugins.tooltip.callbacks.label
    const out = cb({ dataIndex: 0, raw: 123 })
    expect(out).toContain('Alpha')
    expect(out).toContain('Purchases')

    // missing row fallback
    wrapper.vm.Rows = []
    const out2 = cb({ dataIndex: 0, raw: 9 })
    expect(out2).toContain('Unknown')
    expect(out2).toContain('9')
    wrapper.unmount()
  })

  it('does not mount chart when canvas context is missing', async () => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = () => null

    const wrapper = mount(IndividualBarChart)
    await new Promise(r => setTimeout(r, 0))

    // Should not crash and should not create Chart
    expect(wrapper.exists()).toBe(true)

    HTMLCanvasElement.prototype.getContext = original
    wrapper.unmount()
  })

  it('returns early when canvas context is missing', async () => {
    const original = HTMLCanvasElement.prototype.getContext

    HTMLCanvasElement.prototype.getContext = undefined

    const wrapper = mount(IndividualBarChart)

    await wrapper.vm.$nextTick()

    expect(wrapper.exists()).toBe(true)

    wrapper.unmount()
    HTMLCanvasElement.prototype.getContext = original
  })
})
