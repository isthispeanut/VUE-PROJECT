<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import mockData from './data/MockData.json'
import { createChartLifecycle, createChartConfig } from '../utils/ChartUtils.js'

const CanvasRef = ref(null)

// Parsing and config builders live in src/utils/ChartUtils.js

// Prepare raw chart `data` and `options` here (domain parsing lives in component)
function parseToPieData(json) {
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

const pie = parseToPieData(mockData)
const pieData = { labels: pie.Labels, datasets: [{ data: pie.Data, backgroundColor: ['#667eea', '#764ba2', '#f6ad55', '#48bb78', '#4299e1', '#f56565', '#9F7AEA'], borderColor: '#fff', borderWidth: 1 }] }
const pieOptions = { plugins: { legend: { position: 'bottom' } } }

// create lifecycle handlers for this chart instance (reusable pattern)
const { mount, unmount, update } = createChartLifecycle(CanvasRef, () => createChartConfig({ type: 'pie', data: pieData, options: pieOptions }))

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