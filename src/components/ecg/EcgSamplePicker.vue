<script setup lang="ts">
import { ref } from 'vue'
import { ChevronDown, Database, Download } from 'lucide-vue-next'
import { SAMPLE_DATASETS } from '@/types/ecg'
import type { SampleDataset } from '@/types/ecg'

const emit = defineEmits<{
  select: [dataset: SampleDataset]
}>()

defineProps<{
  loading: boolean
}>()

const isOpen = ref(false)

function toggleDropdown() {
  isOpen.value = !isOpen.value
}

function selectSample(dataset: SampleDataset) {
  isOpen.value = false
  emit('select', dataset)
}

function downloadSample(event: Event, dataset: SampleDataset) {
  event.stopPropagation()
  const link = document.createElement('a')
  link.href = `/ecg-samples/${dataset.fileName}`
  link.download = dataset.fileName
  link.click()
}
</script>

<template>
  <div class="ecg-sample-picker">
    <button class="ecg-sample-picker-btn" :disabled="loading" @click="toggleDropdown">
      <Database :size="16" :stroke-width="2" />
      <span>{{ loading ? 'Loading sample...' : 'Sample Datasets' }}</span>
      <ChevronDown
        :size="14"
        :stroke-width="2.5"
        class="ecg-sample-picker-chevron"
        :class="{ 'is-open': isOpen }"
      />
    </button>

    <transition name="fade">
      <div v-if="isOpen" class="ecg-sample-dropdown">
        <div
          v-for="dataset in SAMPLE_DATASETS"
          :key="dataset.id"
          class="ecg-sample-option"
        >
          <button class="ecg-sample-option-main" @click="selectSample(dataset)">
            <div class="ecg-sample-option-header">
              <span class="ecg-sample-option-name">{{ dataset.name }}</span>
              <span class="ecg-sample-option-condition">{{ dataset.condition }}</span>
            </div>
            <p class="ecg-sample-option-desc">{{ dataset.description }}</p>
          </button>
          <button
            class="ecg-sample-download-btn"
            title="Download JSON file"
            @click="downloadSample($event, dataset)"
          >
            <Download :size="13" :stroke-width="2.5" />
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>
