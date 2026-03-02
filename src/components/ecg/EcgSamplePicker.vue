<script setup lang="ts">
import { ref } from 'vue'
import { ChevronDown, Database } from 'lucide-vue-next'
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
</script>

<template>
  <div class="ecg-sample-picker">
    <button class="ecg-sample-picker-btn" :disabled="loading" @click="toggleDropdown">
      <Database :size="16" :stroke-width="2" />
      <span>{{ loading ? 'Loading sample...' : 'Load Sample Dataset' }}</span>
      <ChevronDown
        :size="14"
        :stroke-width="2.5"
        class="ecg-sample-picker-chevron"
        :class="{ 'is-open': isOpen }"
      />
    </button>

    <transition name="fade">
      <div v-if="isOpen" class="ecg-sample-dropdown">
        <button
          v-for="dataset in SAMPLE_DATASETS"
          :key="dataset.id"
          class="ecg-sample-option"
          @click="selectSample(dataset)"
        >
          <div class="ecg-sample-option-header">
            <span class="ecg-sample-option-name">{{ dataset.name }}</span>
            <span class="ecg-sample-option-hr">{{ dataset.heartRate }}</span>
          </div>
          <p class="ecg-sample-option-desc">{{ dataset.description }}</p>
        </button>
      </div>
    </transition>
  </div>
</template>
