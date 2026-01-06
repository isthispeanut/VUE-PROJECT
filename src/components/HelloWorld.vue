<script setup>
// Simple page layout: shows the PieChart and IndividualBarChart components
import PieChart from './PieChart.vue'
import IndividualBarChart from './IndividualBarChart.vue'
import './Design.css'
</script>

<template>
  <div class="card" style="max-width:1200px; margin: 28px auto;">
    <header class="header" style="align-items:flex-start; gap:12px;">
      <div>
        <h1>Passenger Tracking</h1>
        <p class="sub">A SAMPLE CHART DEMO</p>
      </div>
      <button class="theme-toggle" aria-label="toggle theme">☀️</button>
    </header>

    <div class="dashboard landscape" style="margin-top:12px;">
      <div class="chart-wrap">
        <PieChart />
      </div>
      <div class="chart-wrap">
        <IndividualBarChart />
      </div>
    </div>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.dashboard {
  display: flex;
  gap: 28px;
  width: 100%;
  box-sizing: border-box;
  align-items: flex-start;
  padding: 8px 4px;
}

.chart-wrap {
  flex: 1 1 0;
  min-width: 360px;
  display: flex;
  align-items: stretch;
}

.chart-wrap .panel {
  width: 100%;
  display: flex;
  flex-direction: column;
}

@media (max-width: 900px) {
  .dashboard {
    flex-direction: column;
    align-items: center;
  }
  .chart-wrap { min-width: 0; max-width: 720px; }
  .card { margin: 16px; }
}
</style>

