import { ref } from 'vue'

const MAX_SIZE_BYTES = 500 * 1024

export function useMdUpload(initialContent: string | null = null) {
  const mdContent = ref<string | null>(initialContent)
  const mdFileName = ref<string | null>(initialContent ? 'Uploaded context.md' : null)
  const mdError = ref<string | null>(null)
  const isDragging = ref(false)

  function handleDragOver(event: DragEvent) {
    event.preventDefault()
    isDragging.value = true
  }

  function handleDragLeave(event: DragEvent) {
    event.preventDefault()
    isDragging.value = false
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault()
    isDragging.value = false
    const file = event.dataTransfer?.files[0]
    if (file) processFile(file)
  }

  function handleFileInput(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (file) processFile(file)
    input.value = ''
  }

  function processFile(file: File) {
    mdError.value = null

    if (!file.name.endsWith('.md')) {
      mdError.value = 'Only .md files are accepted'
      return
    }

    if (file.size > MAX_SIZE_BYTES) {
      mdError.value = 'File must be under 500KB'
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      mdContent.value = e.target?.result as string
      mdFileName.value = file.name
    }
    reader.onerror = () => {
      mdError.value = 'Failed to read file'
    }
    reader.readAsText(file)
  }

  function clearFile() {
    mdContent.value = null
    mdFileName.value = null
    mdError.value = null
  }

  return {
    mdContent,
    mdFileName,
    mdError,
    isDragging,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileInput,
    clearFile,
  }
}
