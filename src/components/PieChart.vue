<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import mockData from './data/MockData.json'
import { createChartLifecycle, createChartConfig } from '../utils/ChartUtils.js'
import { parseJsonToPieData } from '../utils/ChartData.js'

const CanvasRef = ref(null)

// Parsing and config builders live in src/utils/ChartUtils.js

// Build chart.js `data` from domain payload, then hand it to the generic factory
const pieParsed = parseJsonToPieData(mockData)
const chartData = computed(() => ({ labels: pieParsed.labels, datasets: [{ data: pieParsed.values, backgroundColor: ['#667eea', '#764ba2', '#f6ad55', '#48bb78', '#4299e1', '#f56565', '#9F7AEA'], borderColor: '#fff', borderWidth: 1 }] }))
const chartOptions = { plugins: { legend: { position: 'bottom' } }, maintainAspectRatio: false }

// create lifecycle handlers for this chart instance (reusable pattern)
const { mount, unmount, update } = createChartLifecycle(CanvasRef, () => createChartConfig({ type: 'pie', data: chartData.value, options: chartOptions }))

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