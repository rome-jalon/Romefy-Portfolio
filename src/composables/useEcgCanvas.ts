import { ref, onMounted, onBeforeUnmount, watch, type Ref } from 'vue'
import type { EcgAnalysisResult, EcgCanvasConfig } from '@/types/ecg'
import { STANDARD_3x4_LAYOUT, RHYTHM_STRIP_LEAD } from '@/types/ecg'

const AMPLITUDE_SCALE = 10 // mm/mV
const SMALL_GRID_MM = 1
const LARGE_GRID_MM = 5
const STRIP_DURATION = 2.5 // seconds per strip column

export function useEcgCanvas(
  canvasRef: Ref<HTMLCanvasElement | null>,
  analysisResult: Ref<EcgAnalysisResult | null>,
  samplingRate: Ref<number>,
  config: Ref<EcgCanvasConfig>,
) {
  const canvasWidth = ref(0)
  const canvasHeight = ref(0)
  let resizeObserver: ResizeObserver | null = null

  function getPixelsPerMm(canvasWidthPx: number): number {
    // Total width covers 4 strips × 2.5s = 10s at 25mm/s = 250mm
    return canvasWidthPx / 250
  }

  function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number, pxPerMm: number) {
    // Small grid (1mm)
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.08)'
    ctx.lineWidth = 0.5
    ctx.beginPath()
    const smallStep = SMALL_GRID_MM * pxPerMm
    for (let x = 0; x <= w; x += smallStep) {
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
    }
    for (let y = 0; y <= h; y += smallStep) {
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
    }
    ctx.stroke()

    // Large grid (5mm)
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.18)'
    ctx.lineWidth = 0.8
    ctx.beginPath()
    const largeStep = LARGE_GRID_MM * pxPerMm
    for (let x = 0; x <= w; x += largeStep) {
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
    }
    for (let y = 0; y <= h; y += largeStep) {
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
    }
    ctx.stroke()
  }

  function drawLeadWaveform(
    ctx: CanvasRenderingContext2D,
    signal: number[],
    _sr: number,
    startX: number,
    baselineY: number,
    stripWidthPx: number,
    pxPerMm: number,
    startSample: number,
    endSample: number,
  ) {
    const pxPerSample = stripWidthPx / (endSample - startSample)
    const mVtoPx = AMPLITUDE_SCALE * pxPerMm

    ctx.strokeStyle = '#06b6d4'
    ctx.lineWidth = 1.5
    ctx.beginPath()

    for (let i = startSample; i < endSample && i < signal.length; i++) {
      const x = startX + (i - startSample) * pxPerSample
      const y = baselineY - (signal[i]! * mVtoPx)
      if (i === startSample) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }
    ctx.stroke()
  }

  function drawRPeakMarkers(
    ctx: CanvasRenderingContext2D,
    rPeakIndices: number[],
    signal: number[],
    _sr: number,
    startX: number,
    baselineY: number,
    stripWidthPx: number,
    pxPerMm: number,
    startSample: number,
    endSample: number,
  ) {
    const pxPerSample = stripWidthPx / (endSample - startSample)
    const mVtoPx = AMPLITUDE_SCALE * pxPerMm
    const markerSize = 4

    ctx.fillStyle = '#ef4444'
    for (const idx of rPeakIndices) {
      if (idx >= startSample && idx < endSample) {
        const x = startX + (idx - startSample) * pxPerSample
        const y = baselineY - (signal[idx]! * mVtoPx) - markerSize - 2

        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x - markerSize, y - markerSize * 1.5)
        ctx.lineTo(x + markerSize, y - markerSize * 1.5)
        ctx.closePath()
        ctx.fill()
      }
    }
  }

  function drawLeadLabel(
    ctx: CanvasRenderingContext2D,
    label: string,
    x: number,
    y: number,
  ) {
    ctx.font = 'bold 11px "DM Sans", sans-serif'
    ctx.fillStyle = '#d4d4d8'
    ctx.fillText(label, x + 4, y + 14)
  }

  function render() {
    const canvas = canvasRef.value
    const result = analysisResult.value
    if (!canvas || !result) return

    const container = canvas.parentElement
    if (!container) return

    const dpr = window.devicePixelRatio || 1
    const rect = container.getBoundingClientRect()
    const w = rect.width
    // 3 rows + rhythm strip = 4 row-heights total, each row ~height/4
    const rowCount = 4
    const h = w * 0.6 // aspect ratio ~5:3

    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`

    canvasWidth.value = w
    canvasHeight.value = h

    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)

    // Background
    ctx.fillStyle = '#0a0a0c'
    ctx.fillRect(0, 0, w, h)

    const pxPerMm = getPixelsPerMm(w)

    // Draw grid
    if (config.value.showGrid) {
      drawGrid(ctx, w, h, pxPerMm)
    }

    const sr = samplingRate.value
    const colWidth = w / 4
    const stripRowHeight = h / rowCount
    const samplesPerStrip = Math.round(STRIP_DURATION * sr)

    // Draw 3x4 layout (rows 0-2)
    for (let row = 0; row < 3; row++) {
      const layoutRow = STANDARD_3x4_LAYOUT[row]!
      for (let col = 0; col < 4; col++) {
        const leadName = layoutRow[col]!
        const leadAnalysis = result.leadAnalyses.find((a) => a.leadName === leadName)
        if (!leadAnalysis) continue

        const startX = col * colWidth
        const baselineY = row * stripRowHeight + stripRowHeight / 2
        const startSample = 0
        const endSample = samplesPerStrip

        drawLeadLabel(ctx, leadName, startX, row * stripRowHeight)

        drawLeadWaveform(
          ctx,
          leadAnalysis.filteredSignal,
          sr,
          startX,
          baselineY,
          colWidth,
          pxPerMm,
          startSample,
          endSample,
        )

        if (config.value.showRPeaks) {
          drawRPeakMarkers(
            ctx,
            leadAnalysis.rPeaks.indices,
            leadAnalysis.filteredSignal,
            sr,
            startX,
            baselineY,
            colWidth,
            pxPerMm,
            startSample,
            endSample,
          )
        }
      }
    }

    // Draw rhythm strip (row 3) - Lead II full 10s
    const rhythmLead = result.leadAnalyses.find((a) => a.leadName === RHYTHM_STRIP_LEAD)
    if (rhythmLead) {
      const rhythmY = 3 * stripRowHeight
      const baselineY = rhythmY + stripRowHeight / 2

      drawLeadLabel(ctx, `${RHYTHM_STRIP_LEAD} (Rhythm)`, 0, rhythmY)

      drawLeadWaveform(
        ctx,
        rhythmLead.filteredSignal,
        sr,
        0,
        baselineY,
        w,
        pxPerMm,
        0,
        rhythmLead.filteredSignal.length,
      )

      if (config.value.showRPeaks) {
        drawRPeakMarkers(
          ctx,
          rhythmLead.rPeaks.indices,
          rhythmLead.filteredSignal,
          sr,
          0,
          baselineY,
          w,
          pxPerMm,
          0,
          rhythmLead.filteredSignal.length,
        )
      }
    }
  }

  function setupResizeObserver() {
    const canvas = canvasRef.value
    if (!canvas?.parentElement) return

    resizeObserver = new ResizeObserver(() => {
      render()
    })
    resizeObserver.observe(canvas.parentElement)
  }

  onMounted(() => {
    setupResizeObserver()
    render()
  })

  onBeforeUnmount(() => {
    resizeObserver?.disconnect()
  })

  watch([analysisResult, config], () => {
    render()
  }, { deep: true })

  return { canvasWidth, canvasHeight, render }
}
