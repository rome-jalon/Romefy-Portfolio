import type { Task } from '@/types/task-breakdown'

export async function exportToExcel(tasks: Task[]): Promise<void> {
  const XLSX = await import('xlsx')

  const rows = tasks.map((task) => ({
    id: task.id,
    parentId: task.parentId ?? '',
    title: task.title,
    description: task.description,
    estimatedTime: task.estimatedTime,
    priority: task.priority,
  }))

  const worksheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Tasks')

  const now = new Date()
  const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
  XLSX.writeFile(workbook, `task-breakdown_${ts}.xlsx`)
}
