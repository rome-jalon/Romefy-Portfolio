export type TaskPriority = 'low' | 'medium' | 'high'

export type TaskBreakdownStage = 1 | 2

export type ResultsState = 'idle' | 'loading' | 'error' | 'success'

export interface Task {
  id: string
  title: string
  description: string
  estimatedTime: string
  priority: TaskPriority
  parentId: string | null
}

export interface TaskBreakdownInput {
  instruction: string
  mdContent: string | null
  hierarchical: boolean
}

export interface GeminiTaskRaw {
  title: string
  description: string
  estimatedTime: string
  priority: string
  parentIndex: number | null
}
