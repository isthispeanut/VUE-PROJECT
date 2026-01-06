<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import Chart from 'chart.js/auto'
import mockData from './data/MockData.json'
import { METRICS, buildSeries } from '../utils/ChartData.js'

const CanvasRef = ref(null)

// props: `data` comes from parent; if nothing's passed we use `mockData`
const props = defineProps({ data: { type: Object, default: () => mockData } })

// Helper to manage a Chart.js instance: create it, update it, and destroy it
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

const MetricIndex = ref(0)        // which metric to show (index into `METRICS`)
const Headers = ref([]) // labels for the metric selector dropdown
const Rows = ref([])    // series rows (objects) returned by `buildSeries`
const Labels = ref([])
const Values = ref([])
const Normalize = ref(false)
const SortOrder = ref('none') // 'none' | 'asc' | 'desc' — controls sorting of bars
const Metrics = METRICS

function RebuildSeries() {
  const passengers = (props.data && props.data.passengers) || []
  const metricKey = (Metrics[MetricIndex.value] && Metrics[MetricIndex.value].key) || 'purchases'
  const series = buildSeries(passengers, metricKey, { normalize: Normalize.value, sort: SortOrder.value })
  Rows.value = series.rows
  Labels.value = series.labels
  Values.value = series.values
}

// Build the Chart.js config using the current reactive state (labels, values, options)
function buildConfig() {
  return {
    type: 'bar',
    data: {
      labels: Labels.value,
      datasets: [{
        label: Headers.value[MetricIndex.value] || 'Value',
        data: Values.value,
        backgroundColor: Labels.value.map((_, i) => `hsl(${(i*45)%360} 70% 55%)`)
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
              const metricLabel = (Metrics[MetricIndex.value] && Metrics[MetricIndex.value].label) || 'Value'
              const row = Rows.value[di] || {}
              const val = Number.isFinite(Number(row.value)) ? Number(row.value) : 0
              const name = row.name || 'Unknown'
              // show metric value and passenger name; add purchases/visits if available
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

// Create the Chart.js lifecycle manager from the helper above
const { mount, unmount, update } = createChartLifecycle(CanvasRef, buildConfig)

// Note: old helper functions were removed — metrics are built in `src/utils/ChartData.js`

onMounted(() => {
  // Set up selector labels and initial series data, then mount the chart
  Headers.value = Metrics.map(m => m.label)
  MetricIndex.value = 0
  RebuildSeries()
  mount()
})

watch([MetricIndex, Normalize, SortOrder], () => {
  RebuildSeries()
  update(buildConfig())
})

onBeforeUnmount(() => { unmount() })
</script>

<template>
  <div class="panel" style="width:100%; min-height:360px;">
    <div class="panel-header" style="align-items:center; gap:12px;">
      <h3>Passenger Breakdown</h3>
      <small>Select metric to compare</small>
      <div style="margin-left:auto; display:flex; gap:8px; align-items:center;">
        <select id="metric" v-model.number="MetricIndex" style="padding:6px 8px; min-width:160px; color:#1f1f2b; background:#fff; border-radius:8px; border:1px solid #dfe3f3;">
          <option v-for="(h, idx) in Headers" :key="idx" :value="idx">{{ h || 'Metric ' + idx }}</option>
        </select>
        <label style="display:inline-flex; align-items:center; gap:6px; font-size:12px; color:#444;">
          <input type="checkbox" v-model="Normalize" /> Normalize
        </label>
        <select v-model="SortOrder" style="padding:6px 8px; color:#1f1f2b; background:#fff; border-radius:8px; border:1px solid #dfe3f3;">
          <option value="none">No sort</option>
          <option value="desc">Sort ↓</option>
          <option value="asc">Sort ↑</option>
        </select>
      </div>
    </div>
    <div style="height:360px; margin-top:12px;">
      <canvas ref="CanvasRef"></canvas>
    </div>
  </div>
</template>

<style scoped>
select { /* ensure selected value is readable */ color: #1f1f2b; background: #fff; }
canvas { width:100% !important; height:100% !important; display:block; }
</style>