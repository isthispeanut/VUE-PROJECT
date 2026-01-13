import { shallowMount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

// Mock Chart.js to avoid creating a real canvas context in JSDOM
vi.mock('chart.js/auto', () => ({
  default: class {
    constructor() {}
    destroy() {}
    update() {}
  }
}))

import IndividualBarChart from '../IndividualBarChart.vue'
import mockData from '../data/MockData.json'

// ensure fetch is available and returns mock data during mount
vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(mockData) })))

describe('IndividualBarChart.vue', () => {
  it('renders header, select and canvas', () => {
    const wrapper = shallowMount(IndividualBarChart)
    expect(wrapper.find('h3').text()).toBe('Passenger Breakdown')
    expect(wrapper.find('select#metric').exists()).toBe(true)
    expect(wrapper.find('canvas').exists()).toBe(true)
  })
})
