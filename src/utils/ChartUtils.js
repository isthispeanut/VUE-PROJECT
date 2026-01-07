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
    instance.update()
  }

  return { mount, unmount, update }
}

// Build config for the horizontal bar chart. Accepts simple plain objects and
// returns a Chart.js config object. Components should pass their reactive
// values (e.g. `Labels.value`, `Values.value`, etc.) into this function.
export function buildBarConfig({ labels = [], values = [], rows = [], metricIndex = 0, headers = [], metrics = [] } = {}) {
  return {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: (headers && headers[metricIndex]) || 'Value',
        data: values,
        backgroundColor: labels.map((_, i) => `hsl(${(i*45)%360} 70% 55%)`)
      }]
    },
    options: {
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label(ctx) {
              const di = ctx.dataIndex
              const metricLabel = (metrics && metrics[metricIndex] && metrics[metricIndex].label) || 'Value'
              const row = (rows && rows[di]) || {}
              const val = Number.isFinite(Number(row.value)) ? Number(row.value) : 0
              const name = row.name || 'Unknown'
              const parts = [`${metricLabel}: ${val.toLocaleString()}`, name]
              if (row.purchases !== undefined) parts.push(`Purchases: ${row.purchases}`)
              if (row.visits !== undefined) parts.push(`Visits: ${row.visits}`)
              return parts.join(' — ')
            }
          }
        }
      },
      scales: { x: { beginAtZero: true } },
      maintainAspectRatio: false
    }
  }
}

// Simple parser used by the pie chart: convert passengers JSON into labels
// and counts.
export function parseJsonToPieData(json) {
  const passengers = (json && json.passengers) || []
  const counts = {}
  for (const p of passengers) {
    const t = (p && p.type) ? String(p.type) : 'UNKNOWN'
    counts[t] = (counts[t] || 0) + 1
  }
  const Labels = Object.keys(counts)
  const Data = Labels.map(l => counts[l])
  return { Labels, Data }
}

// Build config for a pie chart from a JSON payload. Components can pass the
// JSON they have (mock data or props) and receive a Chart.js config.
export function buildPieConfig(json, colors) {
  const { Labels, Data } = parseJsonToPieData(json)
  const defaultColors = ['#667eea', '#764ba2', '#f6ad55', '#48bb78', '#4299e1', '#f56565', '#9F7AEA']
  return {
    type: 'pie',
    data: {
      labels: Labels,
      datasets: [{
        data: Data,
        backgroundColor: colors || defaultColors,
        borderColor: '#fff',
        borderWidth: 1
      }]
    },
    options: { plugins: { legend: { position: 'bottom' } }, maintainAspectRatio: false }
  }
}

export default { createChartLifecycle, buildBarConfig, parseJsonToPieData, buildPieConfig }
