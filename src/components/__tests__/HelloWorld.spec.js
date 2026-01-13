import { shallowMount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
// Mock Chart.js consistently so any child components that import it won't fail
vi.mock('chart.js/auto', () => {
  const ctor = vi.fn().mockImplementation(function () { this.update = vi.fn(); this.destroy = vi.fn() })
  return { default: ctor }
})

import HelloWorld from '../HelloWorld.vue'

describe('HelloWorld.vue', () => {
  it('renders title, subtext and theme button', () => {
    const wrapper = shallowMount(HelloWorld)
    expect(wrapper.find('h1').text()).toContain('Passenger Tracking')
    expect(wrapper.find('.sub').text()).toContain('A SAMPLE CHART DEMO')
    const btn = wrapper.find('button[aria-label="toggle theme"]')
    expect(btn.exists()).toBe(true)
    // button has the theme emoji and is focusable
    expect(btn.text()).toBe('☀️')
    btn.trigger('click')
    wrapper.unmount()
  })

  it('stubs PieChart and IndividualBarChart components', () => {
    const wrapper = shallowMount(HelloWorld)
    const html = wrapper.html().toLowerCase()
    expect(html).toContain('pie-chart-stub')
    expect(html).toContain('individual-bar-chart-stub')
    // structural checks: header and dashboard exist
    expect(wrapper.find('.header').exists()).toBe(true)
    expect(wrapper.find('.dashboard').exists()).toBe(true)
    expect(wrapper.findAll('.chart-wrap').length).toBe(2)
    wrapper.unmount()
  })
})
