import type {
  BoundingBox,
  OverpassResponse,
  BuildingFootprint,
  LandUseArea,
  FocusFilter,
} from '@/types/urban-change'

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
const TIMEOUT_SECONDS = 30

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
  const response = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  })

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('Overpass API rate limit exceeded. Please wait a moment and try again.')
    }
    if (response.status === 504) {
      throw new Error('Query timed out. Try selecting a smaller area or a major city.')
    }
    throw new Error(`Overpass API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
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
