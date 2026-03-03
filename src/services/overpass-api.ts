import type {
  BoundingBox,
  OverpassResponse,
  BuildingFootprint,
  LandUseArea,
  FocusFilter,
} from '@/types/urban-change'

const OVERPASS_SERVERS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]
const TIMEOUT_SECONDS = 90
const MAX_RETRIES = 2

function buildQuery(bounds: BoundingBox, focus: FocusFilter, date?: string): string {
  const bbox = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`
  const dateDirective = date ? `[date:"${date}"]` : ''

  const parts: string[] = []

  if (focus === 'buildings' || focus === 'all') {
    parts.push(`way["building"](${bbox});`)
    parts.push(`relation["building"](${bbox});`)
  }

  if (focus === 'landuse' || focus === 'all') {
    parts.push(`way["landuse"](${bbox});`)
    parts.push(`relation["landuse"](${bbox});`)
  }

  return `[out:json][timeout:${TIMEOUT_SECONDS}]${dateDirective};(${parts.join('')});out body geom;`
}

async function queryOverpass(query: string): Promise<OverpassResponse> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const server = OVERPASS_SERVERS[attempt % OVERPASS_SERVERS.length]!

    try {
      const controller = new AbortController()
      const clientTimeout = setTimeout(() => controller.abort(), (TIMEOUT_SECONDS + 15) * 1000)

      const response = await fetch(server, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      })

      clearTimeout(clientTimeout)

      if (response.status === 429) {
        lastError = new Error('Overpass API rate limit exceeded. Please wait a moment and try again.')
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)))
          continue
        }
        throw lastError
      }

      if (response.status === 504) {
        lastError = new Error('Query timed out on server.')
        if (attempt < MAX_RETRIES) continue
        throw new Error('Query timed out. Try selecting a smaller area.')
      }

      if (!response.ok) {
        // Overpass sometimes returns 200 with error text, or 400 with runtime errors
        const text = await response.text()
        if (text.includes('runtime error') || text.includes('timed out')) {
          lastError = new Error('Overpass query too heavy.')
          if (attempt < MAX_RETRIES) continue
          throw new Error('Query timed out. Try selecting a smaller area or narrowing the focus to "Buildings" only.')
        }
        throw new Error(`Overpass API error: ${response.status} ${response.statusText}`)
      }

      const text = await response.text()

      // Overpass can return 200 but with an error message in the body
      if (text.includes('"remark"') && text.includes('runtime error')) {
        lastError = new Error('Overpass runtime error.')
        if (attempt < MAX_RETRIES) continue
        throw new Error('Query timed out. Try selecting a smaller area or narrowing the focus to "Buildings" only.')
      }

      return JSON.parse(text) as OverpassResponse
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        lastError = new Error('Request timed out.')
        if (attempt < MAX_RETRIES) continue
        throw new Error('Query timed out. Try selecting a smaller area or narrowing the focus to "Buildings" only.')
      }
      if (lastError && attempt < MAX_RETRIES) continue
      throw error
    }
  }

  throw lastError ?? new Error('Overpass API request failed after retries.')
}

function computeCentroid(geometry: Array<{ lat: number; lon: number }>): { lat: number; lng: number } {
  if (geometry.length === 0) return { lat: 0, lng: 0 }
  const sumLat = geometry.reduce((s, p) => s + p.lat, 0)
  const sumLng = geometry.reduce((s, p) => s + p.lon, 0)
  return { lat: sumLat / geometry.length, lng: sumLng / geometry.length }
}

function computePolygonArea(geometry: Array<{ lat: number; lon: number }>): number {
  if (geometry.length < 3) return 0
  const toRad = Math.PI / 180
  const R = 6371000
  let area = 0
  for (let i = 0; i < geometry.length; i++) {
    const j = (i + 1) % geometry.length
    const pi = geometry[i]!
    const pj = geometry[j]!
    const xi = pi.lon * toRad * R * Math.cos(pi.lat * toRad)
    const yi = pi.lat * toRad * R
    const xj = pj.lon * toRad * R * Math.cos(pj.lat * toRad)
    const yj = pj.lat * toRad * R
    area += xi * yj - xj * yi
  }
  return Math.abs(area) / 2
}

function parseBuildings(response: OverpassResponse): BuildingFootprint[] {
  return response.elements
    .filter((el) => (el.type === 'way' || el.type === 'relation') && el.tags?.building && el.geometry)
    .map((el) => {
      const geom = el.geometry!
      const centroid = computeCentroid(geom)
      return {
        id: el.id,
        type: el.type as 'way' | 'relation',
        geometry: geom,
        bounds: el.bounds ?? { minlat: 0, minlon: 0, maxlat: 0, maxlon: 0 },
        tags: el.tags ?? {},
        centroidLat: centroid.lat,
        centroidLng: centroid.lng,
        area: computePolygonArea(geom),
      }
    })
}

function parseLandUse(response: OverpassResponse): LandUseArea[] {
  return response.elements
    .filter((el) => (el.type === 'way' || el.type === 'relation') && el.tags?.landuse && el.geometry)
    .map((el) => ({
      id: el.id,
      type: el.type as 'way' | 'relation',
      geometry: el.geometry!,
      tags: el.tags ?? {},
      landUseType: el.tags!.landuse as string,
      area: computePolygonArea(el.geometry!),
    }))
}

export async function fetchOverpassData(
  bounds: BoundingBox,
  year: number,
  focus: FocusFilter,
): Promise<{ buildings: BuildingFootprint[]; landUse: LandUseArea[] }> {
  const date = `${year}-01-01T00:00:00Z`
  const query = buildQuery(bounds, focus, date)
  const response = await queryOverpass(query)

  return {
    buildings: parseBuildings(response),
    landUse: parseLandUse(response),
  }
}

export async function fetchCurrentData(
  bounds: BoundingBox,
  focus: FocusFilter,
): Promise<{ buildings: BuildingFootprint[]; landUse: LandUseArea[] }> {
  const query = buildQuery(bounds, focus)
  const response = await queryOverpass(query)

  return {
    buildings: parseBuildings(response),
    landUse: parseLandUse(response),
  }
}
