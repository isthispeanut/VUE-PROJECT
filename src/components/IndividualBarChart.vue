<script setup>
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import mockData from './data/MockData.json'
import { METRICS, buildSeries } from '../utils/ChartData.js'
import { createChartLifecycle, createChartConfig } from '../utils/ChartUtils.js'

const CanvasRef = ref(null)

// props: `data` and optional `metrics` can come from parent; default data is null so component can fetch
const props = defineProps({ data: { type: Object, default: null }, metrics: { type: Array, default: () => METRICS } })

// Helper to manage a Chart.js instance: create it, update it, and destroy it
// lifecycle and config helpers are in src/utils/ChartUtils.js

const MetricIndex = ref(0)        // which metric to show (index into `METRICS`)
const Headers = ref([])           // labels for the metric selector dropdown
const Rows = ref([])              // series rows (objects) returned by `buildSeries`
const Labels = ref([])
const Values = ref([])              
const Normalize = ref(false)
const SortOrder = ref('none')     // 'none' | 'asc' | 'desc' — controls sorting of bars
const Metrics = props.metrics

// local async data handling (Phase 3)
const localData = ref(null)
const loading = ref(false)
const error = ref(null)

async function fetchPassengers() {
  const res = await fetch('/api/passengers')
  if (!res.ok) throw new Error(`Fetch failed (${res.status})`)
  return await res.json()
}

// the data source used by the component: parent prop > local fetch > bundled mock
const sourceData = computed(() => props.data || localData.value || mockData)

function RebuildSeries() {
  const passengers = (sourceData.value && sourceData.value.passengers) || []
  const metricKey = (Metrics[MetricIndex.value] && Metrics[MetricIndex.value].key) || 'purchases'
  const series = buildSeries(passengers, metricKey, { normalize: Normalize.value, sort: SortOrder.value })
  Rows.value = series.rows
  Labels.value = series.labels
  Values.value = series.values
}

function optionLabel(h, idx) {
  return h || 'Metric ' + idx
}

const HeaderLabels = computed(() => Headers.value.map((h, idx) => optionLabel(h, idx)))

// Build Chart.js `data` (labels + datasets) from domain series produced by buildSeries
const chartData = computed(() => ({
  labels: Labels.value,
  datasets: [{
    label: (Metrics[MetricIndex.value] && Metrics[MetricIndex.value].label) || 'Value',
    data: Values.value,
    backgroundColor: Labels.value.map((_, i) => `hsl(${(i * 45) % 360} 70% 55%)`)
  }]
}))

// Chart options are chart-specific but should not include domain logic; tooltip
// callbacks are allowed here because they are presentation concerns implemented
// by the component (they may use Rows/metrics which live in the component).
const chartOptions = computed(() => ({
  indexAxis: 'y',
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
          label(ctx) {
          const di = ctx.dataIndex
          const metricLabel = (Metrics[MetricIndex.value] && Metrics[MetricIndex.value].label) || 'Value'
          const row = (Rows.value && Rows.value[di]) || {}
          const val = Number.isFinite(Number(row.value))
            ? Number(row.value)
            : (ctx.raw ?? 0)
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
}))

// Create a computed, derived Chart.js config so the chart becomes reactive
const chartConfig = computed(() => createChartConfig({ type: 'bar', data: chartData.value, options: chartOptions.value }))

// Create the Chart.js lifecycle manager from shared helper (factory returns current computed config)
const { mount, unmount, update } = createChartLifecycle(CanvasRef, () => chartConfig.value)

// Note: old helper functions were removed and metrics are built in `src/utils/ChartData.js`

onMounted(() => {
  // Set up selector labels and initial series data, then mount the chart
  Headers.value = Metrics.map(m => m.label)
  MetricIndex.value = 0;
  (async () => {
    if (!props.data) {
      loading.value = true
      error.value = null
      try {
        localData.value = await fetchPassengers()
      } catch (err) {
        error.value = err
        localData.value = mockData 
      } finally {
        loading.value = false
      }
    }
    RebuildSeries()
    mount()
  })()
})

watch([MetricIndex, Normalize, SortOrder], () => {
  RebuildSeries()
})

// rebuild when data source arrives/changes
watch(sourceData, () => {
  RebuildSeries()
})

// When the derived chart config changes, update the existing Chart.js instance
watch(chartConfig, (cfg) => {
  update(cfg)
})

onBeforeUnmount(() => { unmount() })
</script>

<template>
  <div class="panel" style="width:100%; min-height:360px;">
    <div class="panel-header" style="align-items:center; gap:12px;">
      <h3>Passenger Breakdown</h3>
      <small>Select metric to compare</small>
      <div style="margin-left:auto; display:flex; gap:8px; align-items:center;">
        <select id="metric" v-model="MetricIndex" style="padding:6px 8px; min-width:160px; color:#1f1f2b; background:#fff; border-radius:8px; border:1px solid #dfe3f3;">
          <!-- istanbul ignore next -->
          <option v-for="(label, idx) in HeaderLabels" :key="idx" :value="idx">{{ label }}</option>
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