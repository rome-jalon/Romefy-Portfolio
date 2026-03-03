<script setup lang="ts">
import { ref } from 'vue'
import { useEcgMonitorStore } from '@/stores/ecg-monitor'
import type { MonitorUrgency } from '@/types/ecg-monitor'

const store = useEcgMonitorStore()

const showFlagForm = ref(false)
const showOverrideForm = ref(false)

// Flag form state
const flagUrgency = ref<MonitorUrgency>('routine')
const flagNote = ref('')

// Override form state
const overrideRhythm = ref('')
const overrideNote = ref('')

const isDisabled = () => store.analysisState !== 'complete'

function toggleFlagForm() {
  showFlagForm.value = !showFlagForm.value
  showOverrideForm.value = false
  if (showFlagForm.value) {
    flagUrgency.value = 'routine'
    flagNote.value = ''
  }
}

function toggleOverrideForm() {
  showOverrideForm.value = !showOverrideForm.value
  showFlagForm.value = false
  if (showOverrideForm.value) {
    overrideRhythm.value = ''
    overrideNote.value = ''
  }
}

function sendFlag() {
  store.sendNotification(flagUrgency.value, flagNote.value)
  showFlagForm.value = false
}

function saveOverride() {
  store.overrideFindings(overrideRhythm.value, overrideNote.value)
  showOverrideForm.value = false
}
</script>

<template>
  <div>
    <div class="monitor-actions">
      <button class="monitor-btn monitor-btn-confirm" :disabled="isDisabled()" @click="store.confirmReading()">
        Confirm Reading
      </button>
      <button class="monitor-btn monitor-btn-flag" :disabled="isDisabled()" @click="toggleFlagForm">
        Flag as Concerning
      </button>
      <button class="monitor-btn monitor-btn-override" :disabled="isDisabled()" @click="toggleOverrideForm">
        Override Findings
      </button>
    </div>

    <div v-if="showFlagForm" class="monitor-flag-form">
      <div class="monitor-urgency-selector">
        <button
          class="monitor-urgency-option is-routine"
          :class="{ 'is-active': flagUrgency === 'routine' }"
          @click="flagUrgency = 'routine'"
        >Routine</button>
        <button
          class="monitor-urgency-option is-urgent"
          :class="{ 'is-active': flagUrgency === 'urgent' }"
          @click="flagUrgency = 'urgent'"
        >Urgent</button>
        <button
          class="monitor-urgency-option is-critical"
          :class="{ 'is-active': flagUrgency === 'critical' }"
          @click="flagUrgency = 'critical'"
        >Critical</button>
      </div>
      <textarea
        v-model="flagNote"
        class="monitor-note-input"
        placeholder="Technician note (optional)"
        rows="3"
      />
      <button class="monitor-send-btn" @click="sendFlag">Send Notification</button>
    </div>

    <div v-if="showOverrideForm" class="monitor-override-form">
      <input
        v-model="overrideRhythm"
        class="monitor-text-input"
        placeholder="Override rhythm label"
      />
      <input
        v-model="overrideNote"
        class="monitor-text-input"
        placeholder="Correction note"
      />
      <button class="monitor-btn monitor-btn-confirm" @click="saveOverride">Save Override</button>
    </div>
  </div>
</template>
