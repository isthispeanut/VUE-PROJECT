import { shallowMount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import HelloWorld from '../HelloWorld.vue'

vi.mock('chart.js/auto', () => ({ default: class { constructor(){ } update(){} destroy(){} }}))

describe('HelloWorld.vue', () => {
  it('renders title, subtext and theme button', () => {
    const wrapper = shallowMount(HelloWorld)
    expect(wrapper.find('h1').text()).toContain('Passenger Tracking')
    expect(wrapper.find('.sub').text()).toContain('A SAMPLE CHART DEMO')
    expect(wrapper.find('button[aria-label="toggle theme"]').exists()).toBe(true)
  })

  it('stubs PieChart and IndividualBarChart components', () => {
    const wrapper = shallowMount(HelloWorld)
    const html = wrapper.html().toLowerCase()
    expect(html).toContain('pie-chart-stub')
    expect(html).toContain('individual-bar-chart-stub')
  })
})
