<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js'
import { Doughnut, Bar } from 'vue-chartjs'
import {
  ArrowLeft,
  FileDown,
  Flame,
  Beef,
  Wheat,
  Droplets,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  AlertCircle,
} from 'lucide-vue-next'
import { useNutritionStore } from '@/stores/nutrition'
import { useNutritionFetcher } from '@/composables/useNutritionFetcher'
import { getDeviationColor } from '@/services/nutrition-calculator'
import { exportToPDF } from '@/services/pdf-export'

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

const store = useNutritionStore()
const { isLoading, progress, fetchError, result, fetchAllNutrition } = useNutritionFetcher()

const dashboardRef = ref<HTMLElement | null>(null)
const expandedMeals = ref<Set<number>>(new Set())
const isExporting = ref(false)

onMounted(async () => {
  if (store.results) {
    result.value = store.results
    // Expand all meals by default
    for (let i = 0; i < store.results.meals.length; i++) {
      expandedMeals.value.add(i)
    }
    return
  }

  if (store.mealPlan) {
    const res = await fetchAllNutrition(store.mealPlan)
    if (res) {
      store.setResults(res)
      for (let i = 0; i < res.meals.length; i++) {
        expandedMeals.value.add(i)
      }
    }
  }
})

// KPI Cards
const kpiCards = computed(() => {
  if (!result.value || !store.goals) return []
  const d = result.value.dailyTotals
  const g = store.goals
  return [
    {
      label: 'Calories',
      actual: Math.round(d.calories),
      goal: g.calorieTarget,
      unit: 'kcal',
      color: getDeviationColor(d.calories, g.calorieTarget),
      icon: Flame,
    },
    {
      label: 'Protein',
      actual: Math.round(d.protein),
      goal: Math.round((g.calorieTarget * g.macroSplit.protein) / 100 / 4),
      unit: 'g',
      color: getDeviationColor(d.protein, (g.calorieTarget * g.macroSplit.protein) / 100 / 4),
      icon: Beef,
    },
    {
      label: 'Carbs',
      actual: Math.round(d.carbs),
      goal: Math.round((g.calorieTarget * g.macroSplit.carbs) / 100 / 4),
      unit: 'g',
      color: getDeviationColor(d.carbs, (g.calorieTarget * g.macroSplit.carbs) / 100 / 4),
      icon: Wheat,
    },
    {
      label: 'Fat',
      actual: Math.round(d.fat),
      goal: Math.round((g.calorieTarget * g.macroSplit.fat) / 100 / 9),
      unit: 'g',
      color: getDeviationColor(d.fat, (g.calorieTarget * g.macroSplit.fat) / 100 / 9),
      icon: Droplets,
    },
  ]
})

function kpiProgress(actual: number, goal: number): number {
  if (goal === 0) return 0
  return Math.min(actual / goal, 1.5)
}

// Doughnut Chart
const doughnutData = computed(() => {
  if (!result.value) return { labels: [], datasets: [] }
  const d = result.value.dailyTotals
  const proteinKcal = d.protein * 4
  const carbsKcal = d.carbs * 4
  const fatKcal = d.fat * 9
  return {
    labels: ['Protein', 'Carbs', 'Fat'],
    datasets: [
      {
        data: [
          Math.round(proteinKcal),
          Math.round(carbsKcal),
          Math.round(fatKcal),
        ],
        backgroundColor: [
          'rgba(96, 165, 250, 0.85)',
          'rgba(16, 185, 129, 0.85)',
          'rgba(251, 146, 60, 0.85)',
        ],
        borderColor: [
          'rgba(96, 165, 250, 1)',
          'rgba(16, 185, 129, 1)',
          'rgba(251, 146, 60, 1)',
        ],
        borderWidth: 1,
        hoverOffset: 6,
      },
    ],
  }
})

const doughnutOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  cutout: '70%',
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1a1a1f',
      titleColor: '#fafafa',
      bodyColor: '#a1a1aa',
      borderColor: '#27272a',
      borderWidth: 1,
      padding: 10,
      callbacks: {
        label: (ctx: unknown) => {
          const item = ctx as { label: string; parsed: number; dataset: { data: number[] } }
          const total = item.dataset.data.reduce((a: number, b: number) => a + b, 0)
          const pct = total > 0 ? Math.round((item.parsed / total) * 100) : 0
          return `${item.label}: ${item.parsed} kcal (${pct}%)`
        },
      },
    },
  },
}))

// Stacked Bar Chart
const stackedBarData = computed(() => {
  if (!result.value) return { labels: [], datasets: [] }
  return {
    labels: result.value.meals.map((m) => m.name),
    datasets: [
      {
        label: 'Protein (kcal)',
        data: result.value.meals.map((m) => Math.round(m.totals.protein * 4)),
        backgroundColor: 'rgba(96, 165, 250, 0.8)',
        borderColor: 'rgba(96, 165, 250, 1)',
        borderWidth: 1,
      },
      {
        label: 'Carbs (kcal)',
        data: result.value.meals.map((m) => Math.round(m.totals.carbs * 4)),
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 1,
      },
      {
        label: 'Fat (kcal)',
        data: result.value.meals.map((m) => Math.round(m.totals.fat * 9)),
        backgroundColor: 'rgba(251, 146, 60, 0.8)',
        borderColor: 'rgba(251, 146, 60, 1)',
        borderWidth: 1,
      },
    ],
  }
})

const stackedBarOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y' as const,
  scales: {
    x: {
      stacked: true,
      grid: { color: 'rgba(63, 63, 70, 0.4)' },
      ticks: { color: '#71717a' },
    },
    y: {
      stacked: true,
      grid: { display: false },
      ticks: { color: '#a1a1aa' },
    },
  },
  plugins: {
    legend: {
      display: true,
      position: 'bottom' as const,
      labels: {
        color: '#a1a1aa',
        padding: 16,
        usePointStyle: true,
        pointStyleWidth: 10,
      },
    },
    tooltip: {
      backgroundColor: '#1a1a1f',
      titleColor: '#fafafa',
      bodyColor: '#a1a1aa',
      borderColor: '#27272a',
      borderWidth: 1,
      padding: 10,
    },
  },
}))

// Timeline Chart
const timelineData = computed(() => {
  if (!result.value) return { labels: [], datasets: [] }
  const meals = result.value.meals
  const maxCal = Math.max(...meals.map((m) => m.totals.calories), 1)

  return {
    labels: meals.map((m) => m.name),
    datasets: [
      {
        label: 'Meal Time',
        data: meals.map((m) => {
          const parts = m.time.split(':').map(Number)
          const h = parts[0] ?? 0
          const min = parts[1] ?? 0
          const start = h + min / 60
          const width = Math.max((m.totals.calories / maxCal) * 2, 0.3)
          return [start, start + width] as [number, number]
        }),
        backgroundColor: meals.map((_, i) => {
          const colors = [
            'rgba(96, 165, 250, 0.7)',
            'rgba(16, 185, 129, 0.7)',
            'rgba(251, 146, 60, 0.7)',
            'rgba(167, 139, 250, 0.7)',
            'rgba(251, 113, 133, 0.7)',
            'rgba(45, 212, 191, 0.7)',
          ] as const
          return colors[i % colors.length] ?? colors[0]
        }),
        borderColor: meals.map((_, i) => {
          const colors = [
            'rgba(96, 165, 250, 1)',
            'rgba(16, 185, 129, 1)',
            'rgba(251, 146, 60, 1)',
            'rgba(167, 139, 250, 1)',
            'rgba(251, 113, 133, 1)',
            'rgba(45, 212, 191, 1)',
          ] as const
          return colors[i % colors.length] ?? colors[0]
        }),
        borderWidth: 1,
        borderSkipped: false,
        borderRadius: 4,
        barPercentage: 0.6,
      },
    ],
  }
})

const timelineOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y' as const,
  scales: {
    x: {
      type: 'linear' as const,
      min: 0,
      max: 24,
      grid: { color: 'rgba(63, 63, 70, 0.3)' },
      ticks: {
        color: '#71717a',
        stepSize: 3,
        callback: (value: number | string) => {
          const h = Number(value)
          return `${h.toString().padStart(2, '0')}:00`
        },
      },
    },
    y: {
      grid: { display: false },
      ticks: { color: '#a1a1aa' },
    },
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1a1a1f',
      titleColor: '#fafafa',
      bodyColor: '#a1a1aa',
      borderColor: '#27272a',
      borderWidth: 1,
      padding: 10,
      callbacks: {
        label: (ctx: unknown) => {
          const item = ctx as { dataIndex: number }
          if (!result.value) return ''
          const meal = result.value.meals[item.dataIndex]
          if (!meal) return ''
          return `${meal.time} — ${Math.round(meal.totals.calories)} kcal`
        },
      },
    },
  },
}))

// Threshold Alerts
const thresholdAlerts = computed(() => {
  if (!result.value || !store.goals) return []
  const d = result.value.dailyTotals
  const t = store.goals.thresholds
  const alerts: { label: string; actual: number; limit: number; unit: string; type: 'over' | 'under' }[] = []

  if (d.sodium > t.sodiumMax) {
    alerts.push({ label: 'Sodium', actual: Math.round(d.sodium), limit: t.sodiumMax, unit: 'mg', type: 'over' })
  }
  if (d.sugar > t.sugarMax) {
    alerts.push({ label: 'Sugar', actual: Math.round(d.sugar), limit: t.sugarMax, unit: 'g', type: 'over' })
  }
  if (d.fiber < t.fiberMin) {
    alerts.push({ label: 'Fiber', actual: Math.round(d.fiber * 10) / 10, limit: t.fiberMin, unit: 'g', type: 'under' })
  }

  return alerts
})

// Macro actual percentages (for doughnut center)
const macroActualPcts = computed(() => {
  if (!result.value) return { protein: 0, carbs: 0, fat: 0 }
  const d = result.value.dailyTotals
  const totalKcal = d.protein * 4 + d.carbs * 4 + d.fat * 9
  if (totalKcal === 0) return { protein: 0, carbs: 0, fat: 0 }
  return {
    protein: Math.round((d.protein * 4 / totalKcal) * 100),
    carbs: Math.round((d.carbs * 4 / totalKcal) * 100),
    fat: Math.round((d.fat * 9 / totalKcal) * 100),
  }
})

function toggleMeal(index: number) {
  if (expandedMeals.value.has(index)) {
    expandedMeals.value.delete(index)
  } else {
    expandedMeals.value.add(index)
  }
}

async function handleExport() {
  if (!dashboardRef.value || !result.value) return
  isExporting.value = true
  try {
    await exportToPDF(dashboardRef.value, result.value.planName)
  } finally {
    isExporting.value = false
  }
}

function formatNumber(n: number): string {
  return n.toLocaleString()
}
</script>

<template>
  <div class="view-stack">
    <!-- Loading State -->
    <div v-if="isLoading || (!fetchError && !result)" class="dashboard-loading">
      <div class="dashboard-loading-icon-wrap">
        <Flame :size="28" class="dashboard-loading-icon" />
      </div>
      <h2 class="dashboard-loading-title">Fetching nutritional data</h2>
      <p class="dashboard-loading-desc">
        Analyzing {{ progress.current }} of {{ progress.total }} items
      </p>
      <div class="loading-progress-bar">
        <div
          class="loading-progress-fill"
          :style="{ width: progress.total > 0 ? `${(progress.current / progress.total) * 100}%` : '0%' }"
        ></div>
      </div>
    </div>

    <!-- Error State -->
    <template v-else-if="fetchError">
      <div class="page-heading-row">
        <button class="back-btn" @click="store.goToStage(2)">
          <ArrowLeft :size="18" />
        </button>
        <h1 class="view-title">Dashboard</h1>
      </div>
      <div class="dashboard-error">
        <div class="dashboard-error-icon-wrap">
          <AlertCircle :size="28" class="dashboard-error-icon" />
        </div>
        <h2 class="dashboard-error-title">Unable to fetch nutrition data</h2>
        <p class="dashboard-error-desc">{{ fetchError }}</p>
        <div class="dashboard-error-steps">
          <p class="dashboard-error-steps-title">Setup instructions:</p>
          <ol class="dashboard-error-list">
            <li>Get a free API key at fdc.nal.usda.gov/api-key-signup.html</li>
            <li>Create a <code>.env.local</code> file in the project root</li>
            <li>Add <code>VITE_USDA_API_KEY=your_key_here</code></li>
            <li>Restart the dev server</li>
          </ol>
        </div>
      </div>
    </template>

    <!-- Dashboard Content -->
    <template v-else-if="result">
    <!-- Header -->
    <div class="dashboard-header-row">
      <div class="dashboard-header-left">
        <button class="back-btn" @click="store.goToStage(2)">
          <ArrowLeft :size="18" />
        </button>
        <div>
          <h1 class="view-title">{{ result.planName }}</h1>
          <p class="view-subtitle">
            {{ result.meals.length }} meals &middot; {{ formatNumber(Math.round(result.dailyTotals.calories)) }} kcal total
          </p>
        </div>
      </div>
      <button class="export-btn" :disabled="isExporting" @click="handleExport">
        <FileDown :size="16" />
        <span>{{ isExporting ? 'Exporting...' : 'Export PDF' }}</span>
      </button>
    </div>

    <!-- Dashboard body (PDF capture target) -->
    <div ref="dashboardRef" class="dashboard-body">
      <!-- Failed Items Banner -->
      <div v-if="result.failedItems > 0" class="failed-banner">
        <AlertTriangle :size="16" />
        <span>{{ result.failedItems }} item{{ result.failedItems > 1 ? 's' : '' }} could not be resolved from the USDA database. Their values are shown as zero.</span>
      </div>

      <!-- Section 1: KPI Cards -->
      <div class="kpi-grid">
        <div
          v-for="(kpi, i) in kpiCards"
          :key="i"
          class="kpi-card"
        >
          <div class="kpi-ring-wrap">
            <svg viewBox="0 0 120 120" class="kpi-ring-svg">
              <circle
                cx="60" cy="60" r="52"
                class="kpi-ring-bg"
              />
              <circle
                cx="60" cy="60" r="52"
                class="kpi-ring-progress"
                :class="`is-${kpi.color}`"
                :style="{
                  strokeDasharray: `${2 * Math.PI * 52}`,
                  strokeDashoffset: `${2 * Math.PI * 52 * (1 - kpiProgress(kpi.actual, kpi.goal))}`,
                }"
              />
            </svg>
            <div class="kpi-ring-inner">
              <component :is="kpi.icon" :size="20" class="kpi-ring-icon" :class="`is-${kpi.color}`" />
            </div>
          </div>
          <div class="kpi-info">
            <span class="kpi-label">{{ kpi.label }}</span>
            <span class="kpi-actual" :class="`is-${kpi.color}`">
              {{ formatNumber(kpi.actual) }}
            </span>
            <span class="kpi-goal">/ {{ formatNumber(kpi.goal) }} {{ kpi.unit }}</span>
          </div>
        </div>
      </div>

      <!-- Section 2: Charts Row -->
      <div class="charts-grid">
        <!-- Doughnut -->
        <div class="chart-card">
          <div class="chart-card-header">
            <h3 class="chart-card-title">Macro Distribution</h3>
          </div>
          <div class="chart-card-body">
            <div class="doughnut-wrap">
              <Doughnut :data="doughnutData" :options="doughnutOptions" />
              <div class="doughnut-center">
                <span class="doughnut-center-value">{{ formatNumber(Math.round(result.dailyTotals.calories)) }}</span>
                <span class="doughnut-center-label">kcal</span>
              </div>
            </div>
            <div class="doughnut-legend">
              <div class="doughnut-legend-item">
                <span class="doughnut-legend-dot is-protein"></span>
                <span class="doughnut-legend-label">Protein</span>
                <span class="doughnut-legend-value">{{ macroActualPcts.protein }}%</span>
              </div>
              <div class="doughnut-legend-item">
                <span class="doughnut-legend-dot is-carbs"></span>
                <span class="doughnut-legend-label">Carbs</span>
                <span class="doughnut-legend-value">{{ macroActualPcts.carbs }}%</span>
              </div>
              <div class="doughnut-legend-item">
                <span class="doughnut-legend-dot is-fat"></span>
                <span class="doughnut-legend-label">Fat</span>
                <span class="doughnut-legend-value">{{ macroActualPcts.fat }}%</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Stacked Bar -->
        <div class="chart-card">
          <div class="chart-card-header">
            <h3 class="chart-card-title">Per-Meal Breakdown</h3>
          </div>
          <div class="chart-card-body">
            <div class="stacked-bar-wrap">
              <Bar :data="stackedBarData" :options="stackedBarOptions" />
            </div>
          </div>
        </div>
      </div>

      <!-- Section 3: Meal Detail Tables -->
      <div class="meal-details-section">
        <h3 class="section-heading">Meal Details</h3>
        <div
          v-for="(meal, mealIdx) in result.meals"
          :key="mealIdx"
          class="meal-detail-card"
        >
          <button class="meal-detail-header" @click="toggleMeal(mealIdx)">
            <div class="meal-detail-header-left">
              <Clock :size="16" class="meal-detail-time-icon" />
              <span class="meal-detail-time">{{ meal.time }}</span>
              <span class="meal-detail-name">{{ meal.name }}</span>
            </div>
            <div class="meal-detail-header-right">
              <span class="meal-detail-cals">{{ formatNumber(Math.round(meal.totals.calories)) }} kcal</span>
              <component :is="expandedMeals.has(mealIdx) ? ChevronUp : ChevronDown" :size="18" class="meal-detail-chevron" />
            </div>
          </button>
          <div v-if="expandedMeals.has(mealIdx)" class="meal-detail-body">
            <div class="detail-table-wrap">
              <table class="detail-table">
                <thead>
                  <tr>
                    <th class="detail-th">Food</th>
                    <th class="detail-th detail-th-right">Qty</th>
                    <th class="detail-th detail-th-right">Cal</th>
                    <th class="detail-th detail-th-right">Protein</th>
                    <th class="detail-th detail-th-right">Carbs</th>
                    <th class="detail-th detail-th-right">Fat</th>
                    <th class="detail-th detail-th-right">Fiber</th>
                    <th class="detail-th detail-th-right">Sugar</th>
                    <th class="detail-th detail-th-right">Sodium</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(item, itemIdx) in meal.items"
                    :key="itemIdx"
                    :class="{ 'detail-row-failed': item.failed }"
                  >
                    <td class="detail-td">
                      <div class="detail-food-cell">
                        <AlertTriangle v-if="item.failed" :size="14" class="detail-failed-icon" />
                        <div>
                          <div class="detail-food-name">{{ item.food }}</div>
                          <div class="detail-food-matched" :class="{ 'is-failed': item.failed }">
                            {{ item.matchedName }}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td class="detail-td detail-td-right">{{ item.quantity }} {{ item.unit }}</td>
                    <td class="detail-td detail-td-right detail-td-num">{{ Math.round(item.calories) }}</td>
                    <td class="detail-td detail-td-right detail-td-num">{{ item.protein.toFixed(1) }}g</td>
                    <td class="detail-td detail-td-right detail-td-num">{{ item.carbs.toFixed(1) }}g</td>
                    <td class="detail-td detail-td-right detail-td-num">{{ item.fat.toFixed(1) }}g</td>
                    <td class="detail-td detail-td-right detail-td-num">{{ item.fiber.toFixed(1) }}g</td>
                    <td class="detail-td detail-td-right detail-td-num">{{ item.sugar.toFixed(1) }}g</td>
                    <td class="detail-td detail-td-right detail-td-num">{{ Math.round(item.sodium) }}mg</td>
                  </tr>
                  <!-- Subtotal row -->
                  <tr class="detail-subtotal-row">
                    <td class="detail-td detail-td-subtotal">Subtotal</td>
                    <td class="detail-td"></td>
                    <td class="detail-td detail-td-right detail-td-subtotal">{{ Math.round(meal.totals.calories) }}</td>
                    <td class="detail-td detail-td-right detail-td-subtotal">{{ meal.totals.protein.toFixed(1) }}g</td>
                    <td class="detail-td detail-td-right detail-td-subtotal">{{ meal.totals.carbs.toFixed(1) }}g</td>
                    <td class="detail-td detail-td-right detail-td-subtotal">{{ meal.totals.fat.toFixed(1) }}g</td>
                    <td class="detail-td detail-td-right detail-td-subtotal">{{ meal.totals.fiber.toFixed(1) }}g</td>
                    <td class="detail-td detail-td-right detail-td-subtotal">{{ meal.totals.sugar.toFixed(1) }}g</td>
                    <td class="detail-td detail-td-right detail-td-subtotal">{{ Math.round(meal.totals.sodium) }}mg</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Section 4: Threshold Alerts -->
      <div class="threshold-alerts-card">
        <h3 class="section-heading">Threshold Alerts</h3>
        <div v-if="thresholdAlerts.length === 0" class="threshold-success">
          <CheckCircle2 :size="20" class="threshold-success-icon" />
          <span>All thresholds met — your plan is within target ranges.</span>
        </div>
        <div v-else class="threshold-alert-list">
          <div
            v-for="(alert, i) in thresholdAlerts"
            :key="i"
            class="threshold-alert-item"
          >
            <AlertTriangle :size="16" class="threshold-alert-icon" />
            <div class="threshold-alert-text">
              <span class="threshold-alert-label">{{ alert.label }}</span>
              <span v-if="alert.type === 'over'">
                is at <strong>{{ formatNumber(alert.actual) }}{{ alert.unit }}</strong>, exceeding the {{ formatNumber(alert.limit) }}{{ alert.unit }} maximum
              </span>
              <span v-else>
                is at <strong>{{ formatNumber(alert.actual) }}{{ alert.unit }}</strong>, below the {{ formatNumber(alert.limit) }}{{ alert.unit }} minimum
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Section 5: Meal Timeline -->
      <div class="chart-card">
        <div class="chart-card-header">
          <h3 class="chart-card-title">Meal Timeline</h3>
        </div>
        <div class="chart-card-body">
          <div class="timeline-wrap">
            <Bar :data="timelineData" :options="timelineOptions" />
          </div>
        </div>
      </div>
    </div>
    </template>
  </div>
</template>
