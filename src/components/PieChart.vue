<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import Chart from 'chart.js/auto'
import xmlRaw from '../assets/SAMPLE PROJECT.xml?raw'

const CanvasRef = ref(null)
let ChartInstance = null

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

function ParseXmlToPieData(XmlString) {
  const Parser = new DOMParser()
  const Doc = Parser.parseFromString(XmlString, 'application/xml')
  if (Doc.querySelector('parsererror')) return { Labels: [], Data: [] }

  const Rows = FindRows(Doc)
  if (Rows.length < 2) return { Labels: [], Data: [] }

  const HeaderCells = Array.from(Rows[0].children).filter(c => c.localName === 'Cell')
  const Headers = HeaderCells.map((Cell) => FindFirstDataText(Cell) || 'Column')

  const NumColumns = Math.max(0, Headers.length - 1)
  const Sums = new Array(NumColumns).fill(0)

  for (let r = 1; r < Rows.length; r++) {
    const Cells = Array.from(Rows[r].children).filter(c => c.localName === 'Cell')
    const Texts = Cells.map(c => FindFirstDataText(c))
    for (let ci = 1; ci < Texts.length; ci++) {
      const Raw = Texts[ci] || ''
      const N = parseFloat(Raw.replace(/[^0-9.-]+/g, ''))
      if (!Number.isNaN(N)) Sums[ci - 1] += N
    }
  }

  return { Labels: Headers.slice(1), Data: Sums }
}

onMounted(() => {
  const { Labels, Data } = ParseXmlToPieData(xmlRaw)
  const Ctx = CanvasRef.value.getContext('2d')
  ChartInstance = new Chart(Ctx, {
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
  })
})

onBeforeUnmount(() => { if (ChartInstance) ChartInstance.destroy() })
</script>

<template>
  <div class="panel" style="min-height:360px; width:100%;">
    <div class="panel-header">
      <h3>Daily Progress</h3>
      <small>Derived SAMPLE PROJECT.xml</small>
    </div>
    <div style="height:360px; margin-top:12px;">
      <canvas ref="CanvasRef"></canvas>
    </div>
  </div>
</template>

<style scoped>
canvas { width: 100% !important; height: 100% !important; display: block; }
</style>