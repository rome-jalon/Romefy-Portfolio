export interface ProjectConfig {
  id: string
  title: string
  description: string
  tags: string[]
  icon: string
  route: string
}

export const projects: ProjectConfig[] = [
  {
    id: 'nutrition',
    title: 'Meal Nutrition Planner',
    description:
      'Upload a meal plan, configure nutritional goals, and view per-meal analysis with USDA data and PDF export.',
    tags: ['Vue 3', 'Chart.js', 'USDA API', 'TypeScript'],
    icon: 'Leaf',
    route: '/nutrition',
  },
  {
    id: 'task-breakdown',
    title: 'AI Task Breakdown',
    description:
      'Turn natural language instructions into structured, actionable tasks using AI with drag-and-drop reordering and Excel export.',
    tags: ['Vue 3', 'OpenRouter AI', 'Drag & Drop', 'TypeScript'],
    icon: 'ListChecks',
    route: '/task-breakdown',
  },
]
