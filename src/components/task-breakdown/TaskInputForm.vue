<script setup lang="ts">
import { ref } from 'vue'
import { FileText, Upload, X, Sparkles, GitBranch } from 'lucide-vue-next'
import { useTaskInput } from '@/composables/useTaskInput'
import { useMdUpload } from '@/composables/useMdUpload'

const emit = defineEmits<{
  submit: [instruction: string, mdContent: string | null, hierarchical: boolean]
}>()

const {
  instruction,
  hierarchical,
  validationError,
  charCount,
  isOverLimit,
  validate,
  setInstruction,
  toggleHierarchical,
} = useTaskInput()

const {
  mdContent,
  mdFileName,
  mdError,
  isDragging,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  handleFileInput,
  clearFile,
} = useMdUpload()

const fileInputRef = ref<HTMLInputElement | null>(null)

function triggerFileInput() {
  fileInputRef.value?.click()
}

function handleSubmit() {
  if (!validate()) return
  emit('submit', instruction.value, mdContent.value, hierarchical.value)
}

function onTextareaInput(event: Event) {
  setInstruction((event.target as HTMLTextAreaElement).value)
}
</script>

<template>
  <div class="tb-input-form">
    <div class="tb-form-section">
      <label class="tb-label">Describe what you want to accomplish</label>
      <div class="tb-textarea-wrap">
        <textarea
          class="tb-textarea"
          :class="{ 'is-invalid': validationError }"
          :value="instruction"
          placeholder="e.g., Build a user authentication system with login, registration, password reset, and email verification..."
          rows="6"
          maxlength="1000"
          @input="onTextareaInput"
        ></textarea>
        <div class="tb-textarea-footer">
          <span
            class="tb-char-count"
            :class="{ 'is-over': isOverLimit, 'is-near': charCount > 900 && !isOverLimit }"
          >
            {{ charCount }} / 1,000
          </span>
        </div>
      </div>
      <p v-if="validationError" class="tb-field-error">{{ validationError }}</p>
    </div>

    <div class="tb-form-section">
      <label class="tb-label">
        Supporting context
        <span class="tb-label-optional">(optional)</span>
      </label>

      <div v-if="mdFileName" class="tb-md-file-bar">
        <div class="tb-md-file-info">
          <FileText :size="16" class="tb-md-file-icon" />
          <span class="tb-md-file-name">{{ mdFileName }}</span>
        </div>
        <button class="tb-md-remove-btn" @click="clearFile">
          <X :size="14" />
        </button>
      </div>

      <div
        v-else
        class="tb-md-drop-zone"
        :class="{ 'is-dragging': isDragging }"
        @dragover="handleDragOver"
        @dragleave="handleDragLeave"
        @drop="handleDrop"
        @click="triggerFileInput"
      >
        <Upload :size="20" class="tb-md-drop-icon" />
        <span class="tb-md-drop-text">
          Drop a <strong>.md</strong> file or <span class="tb-md-browse">browse</span>
        </span>
        <span class="tb-md-drop-hint">PRD, README, or any markdown context — 500KB max</span>
        <input
          ref="fileInputRef"
          type="file"
          accept=".md"
          class="file-input-hidden"
          @change="handleFileInput"
        />
      </div>
      <p v-if="mdError" class="tb-field-error">{{ mdError }}</p>
    </div>

    <div class="tb-form-actions">
      <button class="tb-toggle-btn" :class="{ 'is-active': hierarchical }" @click="toggleHierarchical">
        <div class="tb-toggle-track">
          <div class="tb-toggle-thumb"></div>
        </div>
        <GitBranch :size="15" />
        <span>Hierarchical tasks</span>
      </button>

      <button
        class="tb-generate-btn"
        :class="{ 'is-disabled': charCount < 20 || isOverLimit }"
        :disabled="charCount < 20 || isOverLimit"
        @click="handleSubmit"
      >
        <Sparkles :size="16" />
        Generate Tasks
      </button>
    </div>
  </div>
</template>
