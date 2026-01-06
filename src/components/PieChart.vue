<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import Chart from 'chart.js/auto'
import mockData from './data/MockData.json'

const CanvasRef = ref(null)

// Small XML helpers (not used right now) — kept for reference
// function FindRows(Doc) { ... }
// function FindFirstDataText(Cell) { ... }

// Turn the JSON payload into pie labels and counts
function ParseJsonToPieData(json) {
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

// Helper to manage a Chart.js instance: mount, update, destroy
function createChartLifecycle(canvasRef, buildConfig) {
  let instance = null

  function mount() {
    const cfg = typeof buildConfig === 'function' ? buildConfig() : buildConfig
    const canvas = canvasRef.value
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
// Build the Chart.js config from parsed JSON data
function buildConfig() {
  const { Labels, Data } = ParseJsonToPieData(mockData)
  return {
    type: 'pie',
    data: {
      labels: Labels,
      datasets: [{
        data: Data,
        backgroundColor: ['#667eea', '#764ba2', '#f6ad55', '#48bb78', '#4299e1', '#f56565', '#9F7AEA'],
        borderColor: '#fff',
        borderWidth: 1
      }]
    },
    options: { plugins: { legend: { position: 'bottom' } }, maintainAspectRatio: false }
  }
}

// create lifecycle handlers for this chart instance (reusable pattern)
const { mount, unmount, update } = createChartLifecycle(CanvasRef, buildConfig)

onMounted(() => {
  mount()
})

onBeforeUnmount(() => { unmount() })
</script>

<template>
  <div class="panel" style="min-height:360px; width:100%;">
    <div class="panel-header">
      <h3>Passenger Count</h3>
      <small>Derived from JSON Payload</small>
    </div>
    <div style="height:360px; margin-top:12px;">
      <canvas ref="CanvasRef"></canvas>
    </div>
  </div>
</template>

<style scoped>
canvas { width: 100% !important; height: 100% !important; display: block; }
</style>