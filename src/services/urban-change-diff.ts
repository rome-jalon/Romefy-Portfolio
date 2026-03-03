import type {
  BuildingFootprint,
  LandUseArea,
  BuildingChange,
  LandUseChange,
  ChangeSummary,
  ChangeStats,
} from '@/types/urban-change'

const PROXIMITY_THRESHOLD_M = 15

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const toRad = Math.PI / 180
  const dLat = (lat2 - lat1) * toRad
  const dLon = (lon2 - lon1) * toRad
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

function findClosestMatch(
  building: BuildingFootprint,
  candidates: BuildingFootprint[],
  matched: Set<number>,
): BuildingFootprint | null {
  let closest: BuildingFootprint | null = null
  let minDist = Infinity

  for (const candidate of candidates) {
    if (matched.has(candidate.id)) continue
    const dist = haversineDistance(
      building.centroidLat,
      building.centroidLng,
      candidate.centroidLat,
      candidate.centroidLng,
    )
    if (dist < PROXIMITY_THRESHOLD_M && dist < minDist) {
      minDist = dist
      closest = candidate
    }
  }

  return closest
}

function hasSignificantChange(a: BuildingFootprint, b: BuildingFootprint): boolean {
  const areaRatio = Math.abs(a.area - b.area) / Math.max(a.area, 1)
  if (areaRatio > 0.2) return true
  if (a.tags.building !== b.tags.building) return true
  return false
}

function describeModification(old: BuildingFootprint, current: BuildingFootprint): string {
  const parts: string[] = []
  const areaDiff = current.area - old.area
  if (Math.abs(areaDiff) > old.area * 0.2) {
    parts.push(`area ${areaDiff > 0 ? 'increased' : 'decreased'} by ${Math.abs(Math.round(areaDiff))} m²`)
  }
  if (old.tags.building !== current.tags.building) {
    parts.push(`type changed from "${old.tags.building}" to "${current.tags.building}"`)
  }
  return parts.length > 0 ? parts.join(', ') : 'minor modifications'
}

function diffBuildings(
  buildingsA: BuildingFootprint[],
  buildingsB: BuildingFootprint[],
): { added: BuildingChange[]; removed: BuildingChange[]; modified: BuildingChange[] } {
  const matchedA = new Set<number>()
  const matchedB = new Set<number>()
  const modified: BuildingChange[] = []

  for (const bA of buildingsA) {
    const match = findClosestMatch(bA, buildingsB, matchedB)
    if (match) {
      matchedA.add(bA.id)
      matchedB.add(match.id)
      if (hasSignificantChange(bA, match)) {
        modified.push({
          changeType: 'modified',
          building: match,
          previousBuilding: bA,
          details: describeModification(bA, match),
        })
      }
    }
  }

  const removed: BuildingChange[] = buildingsA
    .filter((b) => !matchedA.has(b.id))
    .map((b) => ({
      changeType: 'removed' as const,
      building: b,
      details: `Removed ${b.tags.building || 'building'} (${Math.round(b.area)} m²)`,
    }))

  const added: BuildingChange[] = buildingsB
    .filter((b) => !matchedB.has(b.id))
    .map((b) => ({
      changeType: 'added' as const,
      building: b,
      details: `New ${b.tags.building || 'building'} (${Math.round(b.area)} m²)`,
    }))

  return { added, removed, modified }
}

function diffLandUse(landUseA: LandUseArea[], landUseB: LandUseArea[]): LandUseChange[] {
  const changes: LandUseChange[] = []
  const matchedB = new Set<number>()

  for (const areaA of landUseA) {
    const match = landUseB.find((b) => b.id === areaA.id && !matchedB.has(b.id))
    if (match) {
      matchedB.add(match.id)
      if (match.landUseType !== areaA.landUseType) {
        changes.push({
          changeType: 'modified',
          area: match,
          previousArea: areaA,
          fromType: areaA.landUseType,
          toType: match.landUseType,
        })
      }
    } else {
      changes.push({ changeType: 'removed', area: areaA, fromType: areaA.landUseType })
    }
  }

  for (const areaB of landUseB) {
    if (!matchedB.has(areaB.id)) {
      changes.push({ changeType: 'added', area: areaB, toType: areaB.landUseType })
    }
  }

  return changes
}

function computeStats(
  buildingsA: BuildingFootprint[],
  buildingsB: BuildingFootprint[],
  added: BuildingChange[],
  removed: BuildingChange[],
  modified: BuildingChange[],
  landUseChanges: LandUseChange[],
): ChangeStats {
  const totalAreaA = buildingsA.reduce((sum, b) => sum + b.area, 0)
  const totalAreaB = buildingsB.reduce((sum, b) => sum + b.area, 0)

  const shiftMap = new Map<string, number>()
  for (const change of landUseChanges) {
    if (change.changeType === 'modified' && change.fromType && change.toType) {
      const key = `${change.fromType}→${change.toType}`
      shiftMap.set(key, (shiftMap.get(key) ?? 0) + 1)
    }
  }

  return {
    totalBuildingsYearA: buildingsA.length,
    totalBuildingsYearB: buildingsB.length,
    addedCount: added.length,
    removedCount: removed.length,
    modifiedCount: modified.length,
    netAreaChangeM2: totalAreaB - totalAreaA,
    landUseShifts: Array.from(shiftMap.entries()).map(([key, count]) => {
      const [from, to] = key.split('→')
      return { from, to, count }
    }),
  }
}

export function computeChangeSummary(
  buildingsA: BuildingFootprint[],
  buildingsB: BuildingFootprint[],
  landUseA: LandUseArea[],
  landUseB: LandUseArea[],
): ChangeSummary {
  const { added, removed, modified } = diffBuildings(buildingsA, buildingsB)
  const landUseChanges = diffLandUse(landUseA, landUseB)
  const stats = computeStats(buildingsA, buildingsB, added, removed, modified, landUseChanges)

  return {
    addedBuildings: added,
    removedBuildings: removed,
    modifiedBuildings: modified,
    landUseChanges,
    stats,
  }
}
