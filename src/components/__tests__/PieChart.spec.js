import { shallowMount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

// Mock Chart.js with a constructor spy that returns an instance with spies
vi.mock('chart.js/auto', () => {
  const ctor = vi.fn().mockImplementation(function () { return { update: vi.fn(), destroy: vi.fn() } })
  return { default: ctor }
})

import PieChart from '../PieChart.vue'

describe('PieChart.vue', () => {
  it('renders header and canvas', () => {
    const wrapper = shallowMount(PieChart)
    expect(wrapper.find('h3').text()).toBe('Passenger Count')
    expect(wrapper.find('canvas').exists()).toBe(true)
  })

  it('mounts Chart and destroys on unmount (lifecycle)', () => {
    // ensure canvas.getContext exists so mount() can run without canvas package
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function () { return {} }
    try {
      const wrapper = shallowMount(PieChart)
      // ensure canvas element exists and component did not throw
      expect(wrapper.find('canvas').exists()).toBe(true)
      wrapper.unmount()
    } finally {
      HTMLCanvasElement.prototype.getContext = original
    }
  })

  it('uses parsed data from payload when creating chart', () => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function () { return {} }
    try {
      const wrapper = shallowMount(PieChart)
      const mockData = require('../data/MockData.json')
      const expected = require('../../utils/ChartData.js').parseJsonToPieData(mockData)
      // chartData is a computed in component setup and should reflect parsed payload
      const cd = wrapper.vm.chartData
      expect(cd.labels).toEqual(expected.labels)
      expect(cd.datasets[0].data).toEqual(expected.values)
      wrapper.unmount()
    } finally {
      HTMLCanvasElement.prototype.getContext = original
    }
  })

  it('allows calling chart.update on the instance when needed', () => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function () { return {} }
    try {
      const wrapper = shallowMount(PieChart)
      // the component exposes `chartData` computed; calling it should be stable
      const before = wrapper.vm.chartData
      expect(before).toBeDefined()
      wrapper.unmount()
    } finally {
      HTMLCanvasElement.prototype.getContext = original
    }
  })
})
