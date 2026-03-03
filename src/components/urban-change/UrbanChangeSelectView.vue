<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { Search, MapPin, AlertTriangle, ArrowRight, Square } from 'lucide-vue-next'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useUrbanChangeStore } from '@/stores/urban-change'
import { searchLocation } from '@/services/nominatim-api'
import type { NominatimResult, QuickStartCity } from '@/types/urban-change'

const store = useUrbanChangeStore()

const searchQuery = ref('')
const searchResults = ref<NominatimResult[]>([])
const isSearching = ref(false)
const showResults = ref(false)
const isDrawMode = ref(false)

let mapInstance: L.Map | null = null
let debounceTimer: ReturnType<typeof setTimeout> | null = null
let drawStartLatLng: L.LatLng | null = null
let isDrawing = false
let currentRect: L.Rectangle | null = null

const RECT_STYLE: L.PathOptions = {
  color: '#10b981',
  weight: 2,
  fillOpacity: 0.15,
  fillColor: '#10b981',
}

const quickStartCities: QuickStartCity[] = [
  { name: 'Dubai', lat: 25.2048, lng: 55.2708, zoom: 15, description: 'Rapid skyscraper growth' },
  { name: 'Shenzhen', lat: 22.5431, lng: 114.0579, zoom: 15, description: 'Tech hub expansion' },
  { name: 'Singapore', lat: 1.3521, lng: 103.8198, zoom: 15, description: 'Dense urban renewal' },
  { name: 'Austin', lat: 30.2672, lng: -97.7431, zoom: 15, description: 'Suburban sprawl' },
]

function calculateAreaKm2(bounds: L.LatLngBounds): number {
  const R = 6371
  const toRad = Math.PI / 180
  const south = bounds.getSouth() * toRad
  const north = bounds.getNorth() * toRad
  const dLon = (bounds.getEast() - bounds.getWest()) * toRad
  return Math.abs(R * R * dLon * (Math.sin(north) - Math.sin(south)))
}

function onSearchInput() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(async () => {
    const query = searchQuery.value.trim()
    if (query.length < 2) {
      searchResults.value = []
      showResults.value = false
      return
    }
    isSearching.value = true
    try {
      searchResults.value = await searchLocation(query)
      showResults.value = searchResults.value.length > 0
    } catch {
      searchResults.value = []
      showResults.value = false
    } finally {
      isSearching.value = false
    }
  }, 300)
}

function selectSearchResult(result: NominatimResult) {
  const lat = parseFloat(result.lat)
  const lng = parseFloat(result.lon)
  const shortName = result.display_name.split(',')[0] ?? result.display_name
  store.setLocation({
    name: shortName,
    displayName: result.display_name,
    lat,
    lng,
  })
  searchQuery.value = shortName
  showResults.value = false
  if (mapInstance) {
    mapInstance.flyTo([lat, lng], 15, { duration: 1.5 })
  }
}

function selectQuickStart(city: QuickStartCity) {
  store.setLocation({
    name: city.name,
    displayName: `${city.name} — ${city.description}`,
    lat: city.lat,
    lng: city.lng,
  })
  searchQuery.value = city.name
  showResults.value = false
  if (mapInstance) {
    mapInstance.flyTo([city.lat, city.lng], city.zoom, { duration: 1.5 })
  }
}

function commitRectangle(rect: L.Rectangle) {
  const bounds = rect.getBounds()
  const area = calculateAreaKm2(bounds)
  store.setBounds(
    {
      south: bounds.getSouth(),
      west: bounds.getWest(),
      north: bounds.getNorth(),
      east: bounds.getEast(),
    },
    area,
  )
}

function enableDrawMode() {
  const map = mapInstance
  if (!map) return
  isDrawMode.value = true
  map.dragging.disable()
  map.getContainer().style.cursor = 'crosshair'
}

function disableDrawMode() {
  const map = mapInstance
  if (!map) return
  isDrawMode.value = false
  isDrawing = false
  drawStartLatLng = null
  map.dragging.enable()
  map.getContainer().style.cursor = ''
}

function clearSelection() {
  if (currentRect && mapInstance) {
    mapInstance.removeLayer(currentRect)
    currentRect = null
  }
  store.setBounds(null, 0)
}

function onMapMouseDown(e: L.LeafletMouseEvent) {
  if (!isDrawMode.value) return
  isDrawing = true
  drawStartLatLng = e.latlng

  // Remove previous rectangle
  if (currentRect && mapInstance) {
    mapInstance.removeLayer(currentRect)
    currentRect = null
  }
}

function onMapMouseMove(e: L.LeafletMouseEvent) {
  if (!isDrawing || !drawStartLatLng || !mapInstance) return

  const bounds = L.latLngBounds(drawStartLatLng, e.latlng)

  if (currentRect) {
    currentRect.setBounds(bounds)
  } else {
    currentRect = L.rectangle(bounds, RECT_STYLE).addTo(mapInstance)
  }
}

function onMapMouseUp(e: L.LeafletMouseEvent) {
  if (!isDrawing || !drawStartLatLng || !mapInstance) return

  isDrawing = false
  const bounds = L.latLngBounds(drawStartLatLng, e.latlng)
  drawStartLatLng = null

  // Ignore tiny accidental clicks (less than ~50m across)
  const size = bounds.getNorthEast().distanceTo(bounds.getSouthWest())
  if (size < 50) {
    if (currentRect) {
      mapInstance.removeLayer(currentRect)
      currentRect = null
    }
    return
  }

  if (!currentRect) {
    currentRect = L.rectangle(bounds, RECT_STYLE).addTo(mapInstance)
  }

  commitRectangle(currentRect)
  disableDrawMode()
}

function formatArea(areaKm2: number): string {
  if (areaKm2 < 0.01) return `${(areaKm2 * 1_000_000).toFixed(0)} m²`
  return `${areaKm2.toFixed(2)} km²`
}

function proceedToConfigure() {
  if (store.selectedBounds && store.selectedAreaKm2 <= 5) {
    store.goToStage(2)
  }
}

function closeResults() {
  setTimeout(() => {
    showResults.value = false
  }, 200)
}

onMounted(() => {
  nextTick(() => {
    const map = L.map('uc-map', { zoomControl: true }).setView([20, 0], 3)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a> | &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      maxZoom: 19,
    }).addTo(map)

    // Custom rectangle drawing via native mouse events
    map.on('mousedown', onMapMouseDown)
    map.on('mousemove', onMapMouseMove)
    map.on('mouseup', onMapMouseUp)

    mapInstance = map

    // If returning from Stage 2 with existing bounds, restore them
    if (store.selectedBounds) {
      const b = store.selectedBounds
      const rect = L.rectangle(
        [[b.south, b.west], [b.north, b.east]],
        RECT_STYLE,
      )
      rect.addTo(map)
      currentRect = rect
      map.fitBounds(rect.getBounds(), { padding: [50, 50] })
    }

    // If location is set, fly to it
    if (store.selectedLocation && !store.selectedBounds) {
      map.flyTo([store.selectedLocation.lat, store.selectedLocation.lng], 15, { duration: 0.5 })
    }
  })
})

onUnmounted(() => {
  if (mapInstance) {
    mapInstance.remove()
    mapInstance = null
  }
  if (debounceTimer) clearTimeout(debounceTimer)
})

const canProceed = ref(false)
watch(
  () => [store.selectedBounds, store.selectedAreaKm2],
  () => {
    canProceed.value = !!store.selectedBounds && store.selectedAreaKm2 <= 5
  },
  { immediate: true },
)
</script>

<template>
  <div class="uc-select-page">
    <div class="uc-select-top-bar">
      <div class="uc-search-wrapper">
        <div class="uc-search-bar">
          <Search :size="16" class="uc-search-icon" />
          <input
            v-model="searchQuery"
            class="uc-search-input"
            type="text"
            placeholder="Search for a city, district, or address..."
            @input="onSearchInput"
            @blur="closeResults"
          />
          <div v-if="isSearching" class="uc-search-spinner" />
        </div>
        <div v-if="showResults" class="uc-search-results">
          <button
            v-for="result in searchResults"
            :key="result.place_id"
            class="uc-search-item"
            @mousedown.prevent="selectSearchResult(result)"
          >
            <MapPin :size="14" class="uc-search-item-icon" />
            <span class="uc-search-item-text">{{ result.display_name }}</span>
          </button>
        </div>
      </div>

      <div class="uc-quick-start-row">
        <span class="uc-quick-start-label">Quick start:</span>
        <button
          v-for="city in quickStartCities"
          :key="city.name"
          class="uc-quick-start-btn"
          @click="selectQuickStart(city)"
        >
          {{ city.name }}
        </button>
      </div>
    </div>

    <div class="uc-map-layout">
      <div class="uc-map-container">
        <div class="uc-map-toolbar">
          <button
            class="uc-draw-btn"
            :class="{ 'uc-draw-btn--active': isDrawMode }"
            @click="isDrawMode ? disableDrawMode() : enableDrawMode()"
          >
            <Square :size="14" />
            {{ isDrawMode ? 'Cancel Drawing' : 'Draw Rectangle' }}
          </button>
          <button
            v-if="store.selectedBounds"
            class="uc-draw-btn uc-draw-btn--clear"
            @click="clearSelection"
          >
            Clear
          </button>
          <span v-if="isDrawMode" class="uc-draw-hint">Click and drag on the map to draw a rectangle</span>
        </div>
        <div id="uc-map" class="uc-map-element" />
      </div>

      <div v-if="store.selectedBounds" class="uc-sidebar">
        <div class="uc-sidebar-header">
          <MapPin :size="16" class="uc-sidebar-header-icon" />
          <span class="uc-sidebar-header-title">Selected Area</span>
        </div>

        <div class="uc-sidebar-info">
          <div class="uc-sidebar-field">
            <span class="uc-sidebar-label">Location</span>
            <span class="uc-sidebar-value">{{ store.selectedLocation?.name || 'Custom Area' }}</span>
          </div>
          <div class="uc-sidebar-field">
            <span class="uc-sidebar-label">Bounds</span>
            <span class="uc-sidebar-value uc-sidebar-value--mono">
              {{ store.selectedBounds.south.toFixed(4) }}, {{ store.selectedBounds.west.toFixed(4) }}
              &rarr;
              {{ store.selectedBounds.north.toFixed(4) }}, {{ store.selectedBounds.east.toFixed(4) }}
            </span>
          </div>
          <div class="uc-sidebar-field">
            <span class="uc-sidebar-label">Estimated Area</span>
            <span class="uc-sidebar-value">{{ formatArea(store.selectedAreaKm2) }}</span>
          </div>
        </div>

        <div v-if="store.selectedAreaKm2 > 5" class="uc-area-warning">
          <AlertTriangle :size="16" class="uc-area-warning-icon" />
          <span class="uc-area-warning-text">Area too large. Please select a smaller district (max 5 km²).</span>
        </div>

        <button
          class="uc-primary-btn"
          :disabled="!canProceed"
          @click="proceedToConfigure"
        >
          Analyze This Area
          <ArrowRight :size="16" />
        </button>
      </div>

      <div v-else class="uc-empty-state">
        <MapPin :size="24" class="uc-empty-state-icon" />
        <p class="uc-empty-state-title">Select an area to analyze</p>
        <p class="uc-empty-state-desc">Click "Draw Rectangle" above the map, then click and drag to select a district.</p>
      </div>
    </div>
  </div>
</template>
