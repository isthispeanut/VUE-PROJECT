<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import Chart from 'chart.js/auto'
import mockData from './data/MockData.json'
import { METRICS, buildSeries } from '../utils/ChartData.js'

const CanvasRef = ref(null)

// accept data via prop; default to mockData for backward compatibility
const props = defineProps({ data: { type: Object, default: () => mockData } })

// Reusable lifecycle helper: encapsulates Chart.js create/update/destroy
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

const MetricIndex = ref(0)        // index into METRICS
const Headers = ref([]) // will hold metric labels for selector
const Rows = ref([])    // rows are objects (see ChartData.buildSeries)
const Labels = ref([])
const Values = ref([])
const Normalize = ref(false)
const SortOrder = ref('none') // 'none' | 'asc' | 'desc'
const Metrics = METRICS

function RebuildSeries() {
  const passengers = (props.data && props.data.passengers) || []
  const metricKey = (Metrics[MetricIndex.value] && Metrics[MetricIndex.value].key) || 'purchases'
  const series = buildSeries(passengers, metricKey, { normalize: Normalize.value, sort: SortOrder.value })
  Rows.value = series.rows
  Labels.value = series.labels
  Values.value = series.values
}

// buildConfig returns a Chart.js config object based on current reactive values
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
              // show metric value and passenger name; include purchases/visits for context
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

//create Chart.js lifecycle manager
const { mount, unmount, update } = createChartLifecycle(CanvasRef, buildConfig)

// legacy helpers removed; metrics handled by src/utils/ChartData.js

onMounted(() => {
  // initialize metric selector labels and series using utils
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