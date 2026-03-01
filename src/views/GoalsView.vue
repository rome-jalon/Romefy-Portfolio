<script setup lang="ts">
import { ArrowLeft, ArrowRight, Flame, Beef, ShieldAlert } from 'lucide-vue-next'
import { useNutritionStore } from '@/stores/nutrition'
import { useGoalsForm } from '@/composables/useGoalsForm'

const store = useNutritionStore()
const {
  calorieTarget,
  proteinPct,
  carbsPct,
  fatPct,
  sodiumMax,
  sugarMax,
  fiberMin,
  proteinGrams,
  carbsGrams,
  fatGrams,
  macroTotal,
  calorieError,
  isValid,
  adjustMacro,
  buildGoals,
  restoreFromGoals,
} = useGoalsForm()

// Restore state if navigating back from Stage 3
if (store.goals) {
  restoreFromGoals(store.goals)
}

function continueToDashboard() {
  if (isValid.value) {
    store.setGoals(buildGoals())
    store.goToStage(3)
  }
}
</script>

<template>
  <div class="view-stack">
    <!-- Page heading -->
    <div class="page-heading-row">
      <button class="back-btn" @click="store.goToStage(1)">
        <ArrowLeft :size="18" />
      </button>
      <div>
        <h1 class="view-title">Configure Goals</h1>
        <p class="view-subtitle">Set your daily targets and macro split.</p>
      </div>
    </div>

    <!-- Calorie Target -->
    <div class="goals-section">
      <div class="goals-section-header">
        <div class="goals-section-icon-wrap is-calories">
          <Flame :size="18" class="goals-section-icon" />
        </div>
        <h2 class="goals-section-title">Daily Calorie Target</h2>
      </div>
      <div class="calorie-input-wrap">
        <input
          v-model.number="calorieTarget"
          type="number"
          min="500"
          max="10000"
          class="calorie-input"
          :class="{ 'is-invalid': calorieError }"
        />
        <span class="calorie-unit">kcal</span>
      </div>
      <p v-if="calorieError" class="goals-field-error">{{ calorieError }}</p>
    </div>

    <!-- Macro Split -->
    <div class="goals-section">
      <div class="goals-section-header">
        <div class="goals-section-icon-wrap is-macros">
          <Beef :size="18" class="goals-section-icon" />
        </div>
        <h2 class="goals-section-title">Macro Split</h2>
      </div>

      <div
        class="macro-total-bar"
        :class="{ 'is-valid': macroTotal === 100, 'is-invalid': macroTotal !== 100 }"
      >
        <span class="macro-total-label">Total</span>
        <span class="macro-total-value">{{ macroTotal }}%</span>
      </div>

      <!-- Protein -->
      <div class="macro-slider-group">
        <div class="macro-slider-header">
          <span class="macro-slider-label is-protein">Protein</span>
          <span class="macro-slider-pct is-protein">{{ proteinPct }}%</span>
          <span class="macro-grams is-protein">{{ proteinGrams }}g</span>
        </div>
        <input
          type="range"
          min="5"
          max="60"
          :value="proteinPct"
          class="macro-slider is-protein"
          @input="adjustMacro('protein', Number(($event.target as HTMLInputElement).value))"
        />
      </div>

      <!-- Carbs -->
      <div class="macro-slider-group">
        <div class="macro-slider-header">
          <span class="macro-slider-label is-carbs">Carbs</span>
          <span class="macro-slider-pct is-carbs">{{ carbsPct }}%</span>
          <span class="macro-grams is-carbs">{{ carbsGrams }}g</span>
        </div>
        <input
          type="range"
          min="5"
          max="60"
          :value="carbsPct"
          class="macro-slider is-carbs"
          @input="adjustMacro('carbs', Number(($event.target as HTMLInputElement).value))"
        />
      </div>

      <!-- Fat -->
      <div class="macro-slider-group">
        <div class="macro-slider-header">
          <span class="macro-slider-label is-fat">Fat</span>
          <span class="macro-slider-pct is-fat">{{ fatPct }}%</span>
          <span class="macro-grams is-fat">{{ fatGrams }}g</span>
        </div>
        <input
          type="range"
          min="5"
          max="60"
          :value="fatPct"
          class="macro-slider is-fat"
          @input="adjustMacro('fat', Number(($event.target as HTMLInputElement).value))"
        />
      </div>
    </div>

    <!-- Threshold Alerts -->
    <div class="goals-section">
      <div class="goals-section-header">
        <div class="goals-section-icon-wrap is-thresholds">
          <ShieldAlert :size="18" class="goals-section-icon" />
        </div>
        <h2 class="goals-section-title">Threshold Alerts</h2>
      </div>

      <div class="threshold-grid">
        <div class="threshold-item">
          <label class="threshold-label">Sodium (max)</label>
          <div class="threshold-input-wrap">
            <input
              v-model.number="sodiumMax"
              type="number"
              min="0"
              class="threshold-input"
            />
            <span class="threshold-unit">mg</span>
          </div>
        </div>
        <div class="threshold-item">
          <label class="threshold-label">Sugar (max)</label>
          <div class="threshold-input-wrap">
            <input
              v-model.number="sugarMax"
              type="number"
              min="0"
              class="threshold-input"
            />
            <span class="threshold-unit">g</span>
          </div>
        </div>
        <div class="threshold-item">
          <label class="threshold-label">Fiber (min)</label>
          <div class="threshold-input-wrap">
            <input
              v-model.number="fiberMin"
              type="number"
              min="0"
              class="threshold-input"
            />
            <span class="threshold-unit">g</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Continue button -->
    <div class="continue-wrap">
      <button
        :disabled="!isValid"
        class="continue-btn"
        :class="{ 'is-disabled': !isValid }"
        @click="continueToDashboard"
      >
        Continue to Dashboard
        <ArrowRight :size="16" />
      </button>
    </div>
  </div>
</template>
