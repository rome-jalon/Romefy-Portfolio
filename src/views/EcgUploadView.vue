<script setup lang="ts">
import { Upload, FileText, AlertCircle, X, Activity } from 'lucide-vue-next'
import { useEcgFileUpload } from '@/composables/useEcgFileUpload'
import { useEcgAnalyzerStore } from '@/stores/ecg-analyzer'
import EcgSamplePicker from '@/components/ecg/EcgSamplePicker.vue'
import { ECG_LEAD_NAMES } from '@/types/ecg'
import type { EcgData, SampleDataset } from '@/types/ecg'

const store = useEcgAnalyzerStore()

function onValidData(data: EcgData) {
  store.setEcgData(data)
}

const {
  isDragging,
  fileName,
  validationErrors,
  parsedData,
  loadingSample,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  handleFileInput,
  loadSample,
  clearData,
} = useEcgFileUpload(onValidData)

function onSampleSelect(dataset: SampleDataset) {
  loadSample(dataset.fileName)
}

function proceedToAnalyze() {
  if (store.ecgData) {
    store.goToStage(2)
  }
}

function handleClear() {
  clearData()
  store.setEcgData(null)
}

function getLeadStats(leadData: number[]) {
  const min = Math.min(...leadData)
  const max = Math.max(...leadData)
  return {
    samples: leadData.length,
    min: min.toFixed(3),
    max: max.toFixed(3),
    range: (max - min).toFixed(3),
  }
}
</script>

<template>
  <div class="ecg-upload-page">
    <div class="ecg-page-intro">
      <div class="ecg-intro-icon-wrap">
        <Activity :size="22" :stroke-width="2" class="ecg-intro-icon" />
      </div>
      <h1 class="ecg-page-title">Upload ECG Data</h1>
      <p class="ecg-page-desc">
        Upload a 12-lead ECG recording in JSON format or select a sample dataset to get started.
      </p>
    </div>

    <EcgSamplePicker :loading="loadingSample" @select="onSampleSelect" />

    <div class="ecg-upload-divider">
      <span class="ecg-upload-divider-text">or upload your own file</span>
    </div>

    <div
      class="ecg-drop-zone"
      :class="{ 'is-dragging': isDragging, 'is-loaded': !!parsedData }"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
    >
      <template v-if="!parsedData">
        <Upload :size="28" :stroke-width="1.5" class="ecg-drop-icon" />
        <p class="ecg-drop-text">
          Drag & drop your ECG JSON file here
        </p>
        <label class="ecg-browse-btn">
          Browse files
          <input
            type="file"
            accept=".json"
            hidden
            @change="handleFileInput"
          />
        </label>
        <p class="ecg-drop-hint">Accepts .json files with 12-lead ECG data</p>
      </template>

      <template v-else>
        <div class="ecg-file-loaded">
          <div class="ecg-file-bar">
            <FileText :size="16" :stroke-width="2" />
            <span class="ecg-file-name">{{ fileName }}</span>
            <span class="ecg-file-meta">
              {{ parsedData.samplingRate }} Hz &middot; {{ parsedData.duration }}s &middot; 12 leads
            </span>
            <button class="ecg-file-remove" @click="handleClear">
              <X :size="14" :stroke-width="2.5" />
            </button>
          </div>
        </div>
      </template>
    </div>

    <div v-if="validationErrors.length > 0" class="ecg-validation-errors">
      <div v-for="(error, idx) in validationErrors" :key="idx" class="ecg-validation-error">
        <AlertCircle :size="14" :stroke-width="2" />
        <span>{{ error }}</span>
      </div>
    </div>

    <div v-if="parsedData" class="ecg-lead-summary">
      <h3 class="ecg-section-title">Lead Summary</h3>
      <div class="ecg-lead-table-wrap">
        <table class="ecg-lead-table">
          <thead>
            <tr>
              <th>Lead</th>
              <th>Samples</th>
              <th>Min (mV)</th>
              <th>Max (mV)</th>
              <th>Range (mV)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="lead in ECG_LEAD_NAMES" :key="lead">
              <td class="ecg-lead-name-cell">{{ lead }}</td>
              <td>{{ getLeadStats(parsedData.leads[lead]).samples }}</td>
              <td>{{ getLeadStats(parsedData.leads[lead]).min }}</td>
              <td>{{ getLeadStats(parsedData.leads[lead]).max }}</td>
              <td>{{ getLeadStats(parsedData.leads[lead]).range }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="parsedData" class="ecg-upload-actions">
      <button class="ecg-primary-btn" @click="proceedToAnalyze">
        Analyze ECG
        <Activity :size="16" :stroke-width="2" />
      </button>
    </div>
  </div>
</template>
