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
})
