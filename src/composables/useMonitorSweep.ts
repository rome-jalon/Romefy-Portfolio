import { ref, type Ref } from 'vue'
import { SAMPLING_RATE } from '@/config/monitor-patients'

const PAPER_SPEED = 25 // mm/s
const AMPLITUDE_SCALE = 10 // mm/mV
const GRID_COLOR_SMALL = 'rgba(34, 197, 94, 0.06)'
const GRID_COLOR_LARGE = 'rgba(34, 197, 94, 0.15)'
const TRACE_COLOR = '#22c55e'
const SWEEP_BLANK_WIDTH = 20 // px blank region ahead of sweep
const BG_COLOR = '#0a0f14'

export function useMonitorSweep(
  canvasRef: Ref<HTMLCanvasElement | null>,
  getSamples: () => number[],
) {
  const isRunning = ref(false)
  let animationId: number | null = null
  let sweepX = 0
  let displayBuffer: number[] = []
  let sampleAccumulator: number[] = []
  let lastTimestamp = 0

  function getCtx(): CanvasRenderingContext2D | null {
    return canvasRef.value?.getContext('2d') ?? null
  }

  function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number, pxPerMm: number) {
    // Small grid (1mm)
    ctx.strokeStyle = GRID_COLOR_SMALL
    ctx.lineWidth = 0.5
    ctx.beginPath()
    for (let x = 0; x < w; x += pxPerMm) {
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
    }
    for (let y = 0; y < h; y += pxPerMm) {
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
    }
    ctx.stroke()

    // Large grid (5mm)
    ctx.strokeStyle = GRID_COLOR_LARGE
    ctx.lineWidth = 0.8
    ctx.beginPath()
    const large = pxPerMm * 5
    for (let x = 0; x < w; x += large) {
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
    }
    for (let y = 0; y < h; y += large) {
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
    }
    ctx.stroke()
  }

  function render(timestamp: number) {
    const ctx = getCtx()
    const canvas = canvasRef.value
    if (!ctx || !canvas) {
      animationId = requestAnimationFrame(render)
      return
    }

    if (lastTimestamp === 0) lastTimestamp = timestamp
    const dt = (timestamp - lastTimestamp) / 1000 // seconds elapsed
    lastTimestamp = timestamp

    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth * dpr
    const h = canvas.clientHeight * dpr
    canvas.width = w
    canvas.height = h
    ctx.scale(dpr, dpr)

    const displayW = canvas.clientWidth
    const displayH = canvas.clientHeight

    // Pixels per mm based on 10-second sweep across full width
    const totalMm = PAPER_SPEED * 10 // 250mm for 10 seconds
    const pxPerMm = displayW / totalMm
    const mVtoPx = AMPLITUDE_SCALE * pxPerMm
    const baselineY = displayH / 2

    // How many samples to consume this frame
    const samplesPerSecond = SAMPLING_RATE
    const samplesToConsume = Math.round(samplesPerSecond * dt)

    // Get new samples from feed
    const newSamples = getSamples()
    sampleAccumulator.push(...newSamples)

    // Consume from accumulator
    const consuming = Math.min(samplesToConsume, sampleAccumulator.length)
    const consumed = sampleAccumulator.splice(0, consuming)
    displayBuffer.push(...consumed)

    // Pixels per sample
    const pxPerSample = (PAPER_SPEED * pxPerMm) / SAMPLING_RATE

    // Cap display buffer to fit canvas width
    const maxSamples = Math.ceil(displayW / pxPerSample)
    if (displayBuffer.length > maxSamples) {
      displayBuffer = displayBuffer.slice(displayBuffer.length - maxSamples)
    }

    // Clear and draw background
    ctx.fillStyle = BG_COLOR
    ctx.fillRect(0, 0, displayW, displayH)

    // Draw grid
    drawGrid(ctx, displayW, displayH, pxPerMm)

    // Sweep position
    sweepX = (displayBuffer.length * pxPerSample) % displayW

    // Draw trace
    if (displayBuffer.length > 1) {
      ctx.strokeStyle = TRACE_COLOR
      ctx.lineWidth = 1.5
      ctx.beginPath()

      for (let i = 0; i < displayBuffer.length; i++) {
        const x = (i * pxPerSample) % displayW
        const y = baselineY - displayBuffer[i]! * mVtoPx

        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          const prevX = ((i - 1) * pxPerSample) % displayW
          // Don't draw line across wrap
          if (x < prevX) {
            ctx.stroke()
            ctx.beginPath()
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        }
      }
      ctx.stroke()
    }

    // Draw sweep line
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.6)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(sweepX, 0)
    ctx.lineTo(sweepX, displayH)
    ctx.stroke()

    // Blank region ahead of sweep
    const blankStart = sweepX
    const blankEnd = Math.min(sweepX + SWEEP_BLANK_WIDTH, displayW)
    ctx.fillStyle = BG_COLOR
    ctx.fillRect(blankStart, 0, blankEnd - blankStart, displayH)

    if (isRunning.value) {
      animationId = requestAnimationFrame(render)
    }
  }

  function start() {
    if (isRunning.value) return
    isRunning.value = true
    lastTimestamp = 0
    animationId = requestAnimationFrame(render)
  }

  function stop() {
    isRunning.value = false
    if (animationId !== null) {
      cancelAnimationFrame(animationId)
      animationId = null
    }
  }

  function reset() {
    stop()
    sweepX = 0
    displayBuffer = []
    sampleAccumulator = []
    lastTimestamp = 0
  }

  return { isRunning, sweepX: ref(sweepX), start, stop, reset }
}
