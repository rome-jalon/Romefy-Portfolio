export type UrbanChangeStage = 1 | 2 | 3

export type AnalysisState = 'idle' | 'fetching-old' | 'fetching-new' | 'diffing' | 'ai-narrating' | 'done' | 'error'

export type FocusFilter = 'buildings' | 'landuse' | 'all'

export interface BoundingBox {
  south: number
  west: number
  north: number
  east: number
}

export interface LocationInfo {
  name: string
  displayName: string
  lat: number
  lng: number
}

export interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
  boundingbox: [string, string, string, string]
}

export interface OverpassElement {
  type: 'node' | 'way' | 'relation'
  id: number
  tags?: Record<string, string>
  bounds?: { minlat: number; minlon: number; maxlat: number; maxlon: number }
  geometry?: Array<{ lat: number; lon: number }>
  lat?: number
  lon?: number
}

export interface OverpassResponse {
  elements: OverpassElement[]
}

export interface BuildingFootprint {
  id: number
  type: 'way' | 'relation'
  geometry: Array<{ lat: number; lon: number }>
  bounds: { minlat: number; minlon: number; maxlat: number; maxlon: number }
  tags: Record<string, string>
  centroidLat: number
  centroidLng: number
  area: number
}

export interface LandUseArea {
  id: number
  type: 'way' | 'relation'
  geometry: Array<{ lat: number; lon: number }>
  tags: Record<string, string>
  landUseType: string
  area: number
}

export type ChangeType = 'added' | 'removed' | 'modified'

export interface BuildingChange {
  changeType: ChangeType
  building: BuildingFootprint
  previousBuilding?: BuildingFootprint
  details: string
}

export interface LandUseChange {
  changeType: ChangeType
  area: LandUseArea
  previousArea?: LandUseArea
  fromType?: string
  toType?: string
}

export interface ChangeSummary {
  addedBuildings: BuildingChange[]
  removedBuildings: BuildingChange[]
  modifiedBuildings: BuildingChange[]
  landUseChanges: LandUseChange[]
  stats: ChangeStats
}

export interface ChangeStats {
  totalBuildingsYearA: number
  totalBuildingsYearB: number
  addedCount: number
  removedCount: number
  modifiedCount: number
  netAreaChangeM2: number
  landUseShifts: Array<{ from: string; to: string; count: number }>
}

export interface AiNarrative {
  overview: string
  keyChanges: string
  possibleDrivers: string
  urbanContext: string
  fullText: string
}

export interface QuickStartCity {
  name: string
  lat: number
  lng: number
  zoom: number
  description: string
}
