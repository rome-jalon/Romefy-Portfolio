import type { NominatimResult } from '@/types/urban-change'

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'

let lastRequestTime = 0

async function throttle(): Promise<void> {
  const now = Date.now()
  const elapsed = now - lastRequestTime
  if (elapsed < 1000) {
    await new Promise((resolve) => setTimeout(resolve, 1000 - elapsed))
  }
  lastRequestTime = Date.now()
}

export async function searchLocation(query: string): Promise<NominatimResult[]> {
  if (!query.trim()) return []

  await throttle()

  const params = new URLSearchParams({
    q: query,
    format: 'json',
    limit: '5',
    addressdetails: '0',
  })

  const response = await fetch(`${NOMINATIM_URL}?${params}`, {
    headers: {
      'User-Agent': 'RomefyUrbanChangeDetector/1.0',
    },
  })

  if (!response.ok) {
    throw new Error(`Geocoding failed: ${response.status} ${response.statusText}`)
  }

  return response.json()
}
