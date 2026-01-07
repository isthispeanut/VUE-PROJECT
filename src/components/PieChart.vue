<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import mockData from './data/MockData.json'
import { createChartLifecycle, buildPieConfig } from '../utils/ChartUtils.js'

const CanvasRef = ref(null)

// Parsing and config builders live in src/utils/ChartUtils.js

// create lifecycle handlers for this chart instance (reusable pattern)
const { mount, unmount, update } = createChartLifecycle(CanvasRef, () => buildPieConfig(mockData))

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