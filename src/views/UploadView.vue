<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  Upload,
  FileJson,
  Download,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  XCircle,
  Clock,
  ChefHat,
  UtensilsCrossed,
} from 'lucide-vue-next'
import { useNutritionStore } from '@/stores/nutrition'
import { useFileUpload } from '@/composables/useFileUpload'
import { useJsonValidator } from '@/composables/useJsonValidator'

const store = useNutritionStore()
const fileInputRef = ref<HTMLInputElement | null>(null)

const {
  parsedPlan,
  validationErrors,
  parseError,
  isValid,
  hasContent,
  validate,
  reset: resetValidator,
} = useJsonValidator()

function onFileContent(content: string, name: string) {
  validate(content, name)
}

const {
  isDragging,
  fileName,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  handleFileInput,
} = useFileUpload(onFileContent)

if (store.mealPlan) {
  parsedPlan.value = store.mealPlan
  fileName.value = 'Restored from session'
}

function openFilePicker() {
  fileInputRef.value?.click()
}

function replaceFile() {
  resetValidator()
  fileName.value = null
  openFilePicker()
}

function continueToGoals() {
  if (isValid.value && parsedPlan.value) {
    store.setMealPlan(parsedPlan.value)
    store.goToStage(2)
  }
}

function formatTime(time: string): string {
  const parts = time.split(':').map(Number)
  const hours = parts[0] ?? 0
  const minutes = parts[1] ?? 0
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const h = hours % 12 || 12
  return `${h}:${minutes.toString().padStart(2, '0')} ${ampm}`
}

const totalItems = computed(() => {
  if (!parsedPlan.value) return 0
  return parsedPlan.value.meals.reduce((sum, meal) => sum + meal.items.length, 0)
})

function errorLocationLabel(err: { mealIndex?: number; itemIndex?: number }): string {
  if (err.mealIndex !== undefined && err.itemIndex !== undefined) {
    return `Meal ${err.mealIndex + 1}, Item ${err.itemIndex + 1}`
  }
  if (err.mealIndex !== undefined) {
    return `Meal ${err.mealIndex + 1}`
  }
  return 'Root'
}

function hasErrorForMeal(mealIdx: number): boolean {
  return validationErrors.value.some((e) => e.mealIndex === mealIdx)
}

function hasErrorForItem(mealIdx: number, itemIdx: number): boolean {
  return validationErrors.value.some((e) => e.mealIndex === mealIdx && e.itemIndex === itemIdx)
}
</script>

<template>
  <div class="view-stack">
    <!-- Page heading -->
    <div>
      <h1 class="view-title">Upload Meal Plan</h1>
      <p class="view-subtitle">
        Upload a JSON file with your meal plan to get started.
      </p>
    </div>

    <!-- File info bar -->
    <div
      v-if="fileName && hasContent"
      class="file-info-bar"
      :class="{ 'is-valid': isValid, 'is-invalid': !isValid }"
    >
      <div class="file-info-left">
        <div class="file-icon-wrap" :class="{ 'is-valid': isValid, 'is-invalid': !isValid }">
          <FileJson :size="18" class="file-icon" :class="{ 'is-valid': isValid, 'is-invalid': !isValid }" />
        </div>
        <div class="file-info-details">
          <p class="file-name">{{ fileName }}</p>
          <p v-if="isValid" class="file-status-valid">Valid meal plan</p>
          <p v-else-if="validationErrors.length > 0" class="file-status-warning">
            {{ validationErrors.length }} validation {{ validationErrors.length === 1 ? 'error' : 'errors' }}
          </p>
          <p v-else-if="parseError" class="file-status-error">Parse error</p>
        </div>
      </div>
      <button class="replace-btn" @click="replaceFile">
        <RefreshCw :size="13" />
        Replace
      </button>
    </div>

    <!-- Drop zone -->
    <div
      v-if="!isValid"
      class="drop-zone"
      :class="{ 'is-dragging': isDragging }"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
      @click="openFilePicker"
    >
      <div class="drop-zone-content">
        <div class="drop-zone-icon-wrap" :class="{ 'is-dragging': isDragging }">
          <Upload
            :size="28"
            class="drop-zone-icon"
            :class="{ 'is-dragging': isDragging }"
          />
        </div>

        <p class="drop-zone-title">
          {{ isDragging ? 'Drop your file here' : 'Drag & drop your meal plan' }}
        </p>
        <p class="drop-zone-hint">
          or <span class="drop-zone-browse">click to browse</span> for a .json file
        </p>

        <a
          href="/sample-meal-plan.json"
          download="sample-meal-plan.json"
          class="download-sample-btn"
          @click.stop
        >
          <Download :size="13" />
          Download sample JSON
        </a>
      </div>

      <input
        ref="fileInputRef"
        type="file"
        accept=".json"
        class="file-input-hidden"
        @change="handleFileInput"
      />
    </div>

    <!-- Parse error -->
    <div v-if="parseError" class="error-alert">
      <XCircle :size="18" class="error-alert-icon" />
      <div>
        <p class="error-alert-title">Could not parse file</p>
        <p class="error-alert-message">{{ parseError }}</p>
      </div>
    </div>

    <!-- Validation errors -->
    <div v-if="validationErrors.length > 0" class="validation-panel">
      <div class="validation-header">
        <AlertCircle :size="16" class="validation-header-icon" />
        <span class="validation-header-text">
          {{ validationErrors.length }} validation {{ validationErrors.length === 1 ? 'issue' : 'issues' }} found
        </span>
      </div>
      <ul class="validation-list">
        <li
          v-for="(err, i) in validationErrors"
          :key="i"
          class="validation-item"
        >
          <span class="validation-badge">{{ errorLocationLabel(err) }}</span>
          <span class="validation-message">{{ err.message }}</span>
        </li>
      </ul>
    </div>

    <!-- Preview table -->
    <div v-if="parsedPlan && parsedPlan.meals" class="preview-card">
      <div class="preview-header">
        <div class="preview-header-left">
          <ChefHat :size="18" class="preview-header-icon" />
          <h2 class="preview-header-title">
            {{ parsedPlan.planName || 'Unnamed Plan' }}
          </h2>
        </div>
        <div v-if="isValid" class="preview-valid-badge">
          <CheckCircle2 :size="14" />
          <span class="preview-valid-text">Valid</span>
        </div>
      </div>

      <div class="preview-table-wrap">
        <table class="preview-table">
          <thead>
            <tr class="preview-thead-row">
              <th class="preview-th">Meal</th>
              <th class="preview-th">Time</th>
              <th class="preview-th">Food Item</th>
              <th class="preview-th-right">Qty</th>
              <th class="preview-th">Unit</th>
            </tr>
          </thead>
          <tbody class="preview-tbody">
            <template v-for="(meal, mealIdx) in parsedPlan.meals" :key="mealIdx">
              <tr
                v-for="(item, itemIdx) in meal.items"
                :key="`${mealIdx}-${itemIdx}`"
                :class="{
                  'preview-row-error': hasErrorForItem(mealIdx, itemIdx),
                  'preview-row-meal-error': hasErrorForMeal(mealIdx) && !hasErrorForItem(mealIdx, itemIdx),
                }"
              >
                <td
                  v-if="itemIdx === 0"
                  :rowspan="meal.items.length"
                  class="preview-cell-top"
                >
                  <div class="meal-name-wrap">
                    <UtensilsCrossed :size="14" class="meal-name-icon" />
                    <span class="meal-name-text">{{ meal.name || '\u2014' }}</span>
                  </div>
                </td>

                <td
                  v-if="itemIdx === 0"
                  :rowspan="meal.items.length"
                  class="preview-cell-top"
                >
                  <div class="meal-time-wrap">
                    <Clock :size="13" class="meal-time-icon" />
                    <span>{{ meal.time ? formatTime(meal.time) : '\u2014' }}</span>
                  </div>
                </td>

                <td class="preview-cell">
                  <span :class="hasErrorForItem(mealIdx, itemIdx) ? 'food-text-error' : 'food-text'">
                    {{ item.food || '\u2014' }}
                  </span>
                </td>

                <td class="qty-cell">
                  {{ item.quantity ?? '\u2014' }}
                </td>

                <td class="preview-cell">
                  <span :class="item.unit ? 'unit-badge' : 'unit-badge-missing'">
                    {{ item.unit || 'missing' }}
                  </span>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <div class="preview-footer">
        <p class="preview-footer-stats">
          <span class="preview-footer-count">{{ parsedPlan.meals?.length ?? 0 }}</span>
          {{ parsedPlan.meals?.length === 1 ? 'meal' : 'meals' }},
          <span class="preview-footer-count">{{ totalItems }}</span>
          {{ totalItems === 1 ? 'item' : 'items' }}
        </p>
        <a
          v-if="isValid"
          href="/sample-meal-plan.json"
          download="sample-meal-plan.json"
          class="download-link"
        >
          <Download :size="12" />
          Sample JSON
        </a>
      </div>
    </div>

    <!-- Continue button -->
    <div class="continue-wrap">
      <button
        :disabled="!isValid"
        class="continue-btn"
        :class="{ 'is-disabled': !isValid }"
        @click="continueToGoals"
      >
        Continue to Goals
        <ArrowRight :size="16" />
      </button>
    </div>
  </div>
</template>
