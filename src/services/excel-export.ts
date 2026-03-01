import type { Task } from '@/types/task-breakdown'

const HOURS_PER_DAY = 8

function parseEstimatedTime(time: string): number {
  const lower = time.toLowerCase().trim()
  let total = 0

  const dayMatch = lower.match(/([\d.]+)\s*days?/)
  const hourMatch = lower.match(/([\d.]+)\s*hours?/)
  const minMatch = lower.match(/([\d.]+)\s*min(utes?)?/)

  if (dayMatch?.[1]) total += parseFloat(dayMatch[1]) * HOURS_PER_DAY
  if (hourMatch?.[1]) total += parseFloat(hourMatch[1])
  if (minMatch?.[1]) total += parseFloat(minMatch[1]) / 60

  if (total === 0) {
    const num = parseFloat(lower)
    if (!isNaN(num)) total = num
  }

  return Math.max(total, 0.5)
}

interface ScheduledTask {
  task: Task
  hours: number
  startDay: number
  endDay: number
}

function scheduleTasks(tasks: Task[]): { scheduled: ScheduledTask[]; totalDays: number } {
  const scheduled: ScheduledTask[] = []
  let currentDay = 1
  let remainingCapacity = HOURS_PER_DAY

  for (const task of tasks) {
    const hours = parseEstimatedTime(task.estimatedTime)
    let hoursLeft = hours
    const startDay = currentDay

    while (hoursLeft > 0) {
      const used = Math.min(remainingCapacity, hoursLeft)
      hoursLeft -= used
      remainingCapacity -= used

      if (remainingCapacity <= 0 && hoursLeft > 0) {
        currentDay++
        remainingCapacity = HOURS_PER_DAY
      }
    }

    const endDay = currentDay

    if (remainingCapacity <= 0) {
      currentDay++
      remainingCapacity = HOURS_PER_DAY
    }

    scheduled.push({ task, hours, startDay, endDay })
  }

  return { scheduled, totalDays: currentDay }
}

const PRIORITY_COLORS: Record<string, string> = {
  high: 'FF6B6B',
  medium: 'FFB347',
  low: '64B5F6',
}

const PRIORITY_TEXT_COLORS: Record<string, string> = {
  high: 'CC0000',
  medium: 'B87700',
  low: '1565C0',
}

const HEADER_STYLE = {
  fill: { patternType: 'solid' as const, fgColor: { rgb: '2D2D2D' } },
  font: { bold: true, color: { rgb: 'FFFFFF' }, name: 'Calibri', sz: 11 },
  border: { bottom: { style: 'thin' as const, color: { rgb: '555555' } } },
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function styledCell(value: string | number, style: Record<string, any> = {}): Record<string, any> {
  return {
    v: value,
    t: typeof value === 'number' ? 'n' : 's',
    s: style,
  }
}

function buildTasksSheet(XLSX: any, scheduled: ScheduledTask[]) {
  const headers = ['id', 'parentId', 'title', 'description', 'estimatedTime', 'priority', 'hours', 'startDay', 'endDay']
  const headerRow = headers.map((h) => styledCell(h, HEADER_STYLE))

  const dataRows = scheduled.map((s) => [
    styledCell(s.task.id),
    styledCell(s.task.parentId ?? ''),
    styledCell(s.task.title),
    styledCell(s.task.description),
    styledCell(s.task.estimatedTime),
    styledCell(s.task.priority),
    styledCell(s.hours),
    styledCell(s.startDay),
    styledCell(s.endDay),
  ])

  const ws = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows])
  ws['!cols'] = [
    { wch: 8 },
    { wch: 8 },
    { wch: 30 },
    { wch: 50 },
    { wch: 15 },
    { wch: 10 },
    { wch: 8 },
    { wch: 10 },
    { wch: 8 },
  ]
  return ws
}

function buildGanttSheet(XLSX: any, scheduled: ScheduledTask[], totalDays: number) {
  const headerRow: any[] = [
    styledCell('Task', HEADER_STYLE),
    styledCell('Hours', { ...HEADER_STYLE, alignment: { horizontal: 'center' } }),
    styledCell('Priority', { ...HEADER_STYLE, alignment: { horizontal: 'center' } }),
  ]

  for (let d = 1; d <= totalDays; d++) {
    headerRow.push(
      styledCell(`Day ${d}`, {
        ...HEADER_STYLE,
        font: { ...HEADER_STYLE.font, sz: 10 },
        alignment: { horizontal: 'center' },
      }),
    )
  }

  const rows: any[][] = [headerRow]

  for (const s of scheduled) {
    const isSubtask = s.task.parentId !== null
    const label = isSubtask ? `  \u21B3 ${s.task.title}` : s.task.title
    const color = PRIORITY_COLORS[s.task.priority] || PRIORITY_COLORS.low
    const textColor = PRIORITY_TEXT_COLORS[s.task.priority] || PRIORITY_TEXT_COLORS.low

    const row: any[] = [
      styledCell(label, {
        font: {
          name: 'Calibri',
          sz: 10,
          color: { rgb: isSubtask ? '666666' : '000000' },
          bold: !isSubtask,
        },
      }),
      styledCell(s.hours, {
        font: { name: 'Calibri', sz: 10, color: { rgb: '333333' } },
        alignment: { horizontal: 'center' },
      }),
      styledCell(s.task.priority, {
        font: { name: 'Calibri', sz: 10, color: { rgb: textColor }, bold: true },
        alignment: { horizontal: 'center' },
      }),
    ]

    for (let d = 1; d <= totalDays; d++) {
      if (d >= s.startDay && d <= s.endDay) {
        const borderColor = { rgb: 'AAAAAA' }
        row.push({
          v: '',
          t: 's',
          s: {
            fill: { patternType: 'solid', fgColor: { rgb: color } },
            border: {
              top: { style: 'thin', color: borderColor },
              bottom: { style: 'thin', color: borderColor },
              ...(d === s.startDay ? { left: { style: 'thin', color: borderColor } } : {}),
              ...(d === s.endDay ? { right: { style: 'thin', color: borderColor } } : {}),
            },
          },
        })
      } else {
        row.push({ v: '', t: 's' })
      }
    }

    rows.push(row)
  }

  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [
    { wch: 35 },
    { wch: 7 },
    { wch: 10 },
    ...Array.from({ length: totalDays }, () => ({ wch: 6 })),
  ]
  return ws
}

export async function exportToExcel(tasks: Task[]): Promise<void> {
  const XLSX = await import('xlsx-js-style')

  const { scheduled, totalDays } = scheduleTasks(tasks)

  const taskSheet = buildTasksSheet(XLSX, scheduled)
  const ganttSheet = buildGanttSheet(XLSX, scheduled, totalDays)

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, taskSheet, 'Tasks')
  XLSX.utils.book_append_sheet(workbook, ganttSheet, 'Schedule')

  const now = new Date()
  const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
  XLSX.writeFile(workbook, `task-breakdown_${ts}.xlsx`)
}
