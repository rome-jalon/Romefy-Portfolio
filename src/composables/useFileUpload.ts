import { ref } from 'vue'

export function useFileUpload(onFileContent: (content: string, name: string) => void) {
  const isDragging = ref(false)
  const fileName = ref<string | null>(null)

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
    if (file) {
      readFile(file)
    }
  }

  function handleFileInput(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (file) {
      readFile(file)
    }
    // Reset input so the same file can be re-selected
    input.value = ''
  }

  function readFile(file: File) {
    if (!file.name.endsWith('.json')) {
      onFileContent('', file.name)
      return
    }

    fileName.value = file.name
    const reader = new FileReader()

    reader.onload = (e) => {
      const content = e.target?.result as string
      onFileContent(content, file.name)
    }

    reader.onerror = () => {
      onFileContent('', file.name)
    }

    reader.readAsText(file)
  }

  return {
    isDragging,
    fileName,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileInput,
  }
}
