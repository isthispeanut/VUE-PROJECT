// Shared Chart utilities for components
import Chart from 'chart.js/auto'

// Lifecycle manager for Chart.js instances. Accepts a canvas ref and a
// `buildConfig` (function or static config). Matches the previous in-component
// behavior so components can call `mount()`, `update(cfg)`, and `unmount()`.
export function createChartLifecycle(canvasRef, buildConfig) {
  let instance = null

  function mount() {
    const cfg = typeof buildConfig === 'function' ? buildConfig() : buildConfig
    const canvas = canvasRef && canvasRef.value
    if (!canvas || !cfg) return
    const ctx = canvas.getContext && canvas.getContext('2d')
    if (!ctx) return
    instance = new Chart(ctx, cfg)
  }

  function unmount() {
    if (instance) { instance.destroy(); instance = null }
  }

  function update(newCfg) {
    if (!instance || !newCfg) return
    if (newCfg.data) instance.data = newCfg.data
    if (newCfg.options) instance.options = newCfg.options
    if (instance && typeof instance.update === 'function') instance.update()
  }

  return { mount, unmount, update }
}

// Build a generic bar chart config from Chart.js `data` and `options`.
// `data` must be a Chart.js data object: { labels: [], datasets: [...] }.
// `options` can override or extend default options.
export function buildBarConfig({ data = { labels: [], datasets: [] }, options = {} } = {}) {
  const defaultOptions = {
    indexAxis: 'y',
    plugins: { legend: { display: false } },
    scales: { x: { beginAtZero: true } },
    maintainAspectRatio: false
  }
  // shallow merge of options (components may provide nested plugin callbacks)
  /* istanbul ignore next */
  const mergedOptions = { ...defaultOptions, ...(options || {}) }
  return { type: 'bar', data, options: mergedOptions }
}

// Simple parser used by the pie chart: convert passengers JSON into labels
// and counts.
// Build a generic pie chart config from Chart.js `data` and optional `options`.
export function buildPieConfig({ data = { labels: [], datasets: [] }, options = {} } = {}) {
  const defaultOptions = { plugins: { legend: { position: 'bottom' } }, maintainAspectRatio: false }
  /* istanbul ignore next */
  const mergedOptions = { ...defaultOptions, ...(options || {}) }
  return { type: 'pie', data, options: mergedOptions }
}

// Unified factory: returns a Chart.js config for a given chart `type` and `payload`.
export function createChartConfig({ type = 'bar', data = undefined, options = undefined } = {}) {
  if (type === 'bar') return buildBarConfig({ data, options })
  if (type === 'pie') return buildPieConfig({ data, options })
  // fallback: assume bar
  return buildBarConfig({ data, options })
}

export default { createChartLifecycle, buildBarConfig, buildPieConfig, createChartConfig }
