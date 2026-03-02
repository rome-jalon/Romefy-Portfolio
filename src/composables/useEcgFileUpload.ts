import { ref } from 'vue'
import { useFileUpload } from './useFileUpload'
import { ecgDataSchema } from '@/types/ecg-schemas'
import type { EcgData } from '@/types/ecg'

export function useEcgFileUpload(onValidData: (data: EcgData) => void) {
  const validationErrors = ref<string[]>([])
  const isValidating = ref(false)
  const parsedData = ref<EcgData | null>(null)
  const loadingSample = ref(false)

  function processContent(content: string, name: string) {
    validationErrors.value = []
    parsedData.value = null

    if (!name.endsWith('.json')) {
      validationErrors.value = ['Only .json files are accepted.']
      return
    }

    if (!content) {
      validationErrors.value = ['Failed to read file content.']
      return
    }

    isValidating.value = true
    try {
      const raw = JSON.parse(content)
      const result = ecgDataSchema.safeParse(raw)
      if (!result.success) {
        validationErrors.value = result.error.issues.map(
          (issue) => `${issue.path.join('.')}: ${issue.message}`,
        )
        return
      }
      parsedData.value = result.data as EcgData
      onValidData(result.data as EcgData)
    } catch {
      validationErrors.value = ['Invalid JSON — the file could not be parsed.']
    } finally {
      isValidating.value = false
    }
  }

  const { isDragging, fileName, handleDragOver, handleDragLeave, handleDrop, handleFileInput } =
    useFileUpload(processContent)

  async function loadSample(sampleFileName: string) {
    loadingSample.value = true
    validationErrors.value = []
    parsedData.value = null

    try {
      const response = await fetch(`/ecg-samples/${sampleFileName}`)
      if (!response.ok) {
        throw new Error(`Failed to load sample: ${response.statusText}`)
      }
      const content = await response.text()
      fileName.value = sampleFileName
      processContent(content, sampleFileName)
    } catch (error) {
      validationErrors.value = [
        error instanceof Error ? error.message : 'Failed to load sample dataset — try refreshing.',
      ]
    } finally {
      loadingSample.value = false
    }
  }

  function clearData() {
    validationErrors.value = []
    parsedData.value = null
    fileName.value = null
  }

  return {
    isDragging,
    fileName,
    validationErrors,
    isValidating,
    parsedData,
    loadingSample,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileInput,
    loadSample,
    clearData,
  }
}
