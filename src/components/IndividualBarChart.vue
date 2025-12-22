<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import Chart from 'chart.js/auto'
import xmlRaw from '../assets/SAMPLE PROJECT.xml?raw'

const CanvasRef = ref(null)

function FindRows(Doc) {
  let Rows = Array.from(Doc.getElementsByTagNameNS('*', 'Row') || [])
  if (Rows.length) return Rows
  Rows = Array.from(Doc.getElementsByTagName('*')).filter(el => el.localName === 'Row')
  return Rows
}
function FindFirstDataText(Cell) {
  if (!Cell) return ''
  const Walker = document.createTreeWalker(Cell, NodeFilter.SHOW_ELEMENT, null, false)
  while (Walker.nextNode()) {
    const El = Walker.currentNode
    if (El.localName === 'Data') return (El.textContent || '').trim()
  }
  return ''
}
function ParseXmlToTable(XmlString) {
  const Parser = new DOMParser()
  const Doc = Parser.parseFromString(XmlString, 'application/xml')
  if (Doc.querySelector('parsererror')) return { Headers: [], Rows: [] }

  const Rows = FindRows(Doc)
  if (Rows.length === 0) return { Headers: [], Rows: [] }

  const HeaderCells = Array.from(Rows[0].children).filter(c => c.localName === 'Cell')
  const Headers = HeaderCells.map(Cell => FindFirstDataText(Cell) || 'Column')

  const DataRows = []
  for (let r = 1; r < Rows.length; r++) {
    const Cells = Array.from(Rows[r].children).filter(c => c.localName === 'Cell')
    const Texts = Cells.map(c => FindFirstDataText(c))
    DataRows.push(Texts)
  }
  return { Headers, Rows: DataRows }
}

// Reusable lifecycle helper: encapsulates Chart.js create/update/destroy
// so `onMounted` can just call `mount()` and `onBeforeUnmount` can call `unmount()`.
// createChartLifecycle: local helper to manage Chart.js instance (mount/update/unmount)
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

const MetricIndex = ref(1)        // header index to use as metric
const Headers = ref([])
const Rows = ref([])
const Labels = ref([])
const Values = ref([])

function RebuildSeries() {
  Labels.value = Rows.value.map(r => (r[0] && r[0].trim()) ? r[0].trim() : 'Unknown')
  Values.value = Rows.value.map(r => {
    const Raw = r[MetricIndex.value] || ''
    const N = parseFloat((Raw || '').replace(/[^0-9.-]+/g, ''))
    return Number.isFinite(N) ? N : 0
  })
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
      plugins: { legend: { display: false } },
      scales: { x: { beginAtZero: true } },
      maintainAspectRatio: false
    }
  }
}

// create lifecycle handlers for this chart instance
const { mount, unmount, update } = createChartLifecycle(CanvasRef, buildConfig)

function FindBestMetricIndex(Hdrs, DataRows) {
  // prefer headers that mention "task" or "completed"
  const Preferred = Hdrs.findIndex(h => /task|completed|completed tasks|tasks/i.test(h))
  if (Preferred > 0) return Preferred
  // otherwise pick the first numeric column (skip column 0 which is name)
  for (let ci = 1; ci < Hdrs.length; ci++) {
    // check if at least one row has numeric value at this column
    const AnyNumeric = DataRows.some(r => {
      const Raw = r[ci] || ''
      const N = parseFloat(Raw.toString().replace(/[^0-9.-]+/g, ''))
      return Number.isFinite(N) && !Number.isNaN(N)
    })
    if (AnyNumeric) return ci
  }
  return Math.min(1, Math.max(0, Hdrs.length - 1))
}

onMounted(() => {
  const Parsed = ParseXmlToTable(xmlRaw)
  Headers.value = Parsed.Headers
  Rows.value = Parsed.Rows

  // pick a sensible default metric index
  if (Headers.value.length > 1 && Rows.value.length > 0) {
    MetricIndex.value = FindBestMetricIndex(Headers.value, Rows.value)
  } else {
    MetricIndex.value = Math.min(1, Math.max(0, Headers.value.length - 1))
  }

  RebuildSeries()
  mount()
})

watch(MetricIndex, () => {
  RebuildSeries()
  update(buildConfig())
})

onBeforeUnmount(() => { unmount() })
</script>

<template>
  <div class="panel" style="width:100%; min-height:360px;">
    <div class="panel-header" style="align-items:center; gap:12px;">
      <h3>Individual Breakdown</h3>
      <small>Select metric to compare</small>
      <div style="margin-left:auto;">
        <select id="metric" v-model.number="MetricIndex" style="padding:6px 8px; margin-left:8px; min-width:160px; color:#1f1f2b; background:#fff; border-radius:8px; border:1px solid #dfe3f3;">
          <option v-for="(h, idx) in Headers" :key="idx" :value="idx">{{ h || 'Column ' + idx }}</option>
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