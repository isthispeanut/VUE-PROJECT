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

import PieChart from '../PieChart.vue'

describe('PieChart.vue', () => {
  it('renders header and canvas', () => {
    const wrapper = shallowMount(PieChart)
    expect(wrapper.find('h3').text()).toBe('Passenger Count')
    expect(wrapper.find('canvas').exists()).toBe(true)
  })
})
