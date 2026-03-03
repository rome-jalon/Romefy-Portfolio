<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useUrbanChangeStore } from '@/stores/urban-change'
import type { BuildingChange, ChangeType } from '@/types/urban-change'

const store = useUrbanChangeStore()

let map: L.Map | null = null
const addedLayer = ref<L.GeoJSON | null>(null)
const removedLayer = ref<L.GeoJSON | null>(null)
const modifiedLayer = ref<L.GeoJSON | null>(null)

const showAdded = ref(true)
const showRemoved = ref(true)
const showModified = ref(true)

const changeColors: Record<ChangeType, string> = {
  added: '#10b981',
  removed: '#ef4444',
  modified: '#f59e0b',
}

function buildingToGeoJSON(change: BuildingChange) {
  const coords: number[][] = change.building.geometry.map((p) => [p.lon, p.lat])
  if (coords.length > 0) {
    const first = coords[0]!
    const last = coords[coords.length - 1]!
    if (first[0] !== last[0] || first[1] !== last[1]) {
      coords.push([first[0]!, first[1]!])
    }
  }
  return {
    type: 'Feature' as const,
    properties: {
      color: changeColors[change.changeType],
      details: change.details,
      changeType: change.changeType,
    },
    geometry: {
      type: 'Polygon' as const,
      coordinates: [coords],
    },
  }
}

function createGeoJSONLayer(features: ReturnType<typeof buildingToGeoJSON>[]) {
  return L.geoJSON(
    { type: 'FeatureCollection', features } as GeoJSON.FeatureCollection,
    {
      style: (feature) => ({
        color: feature?.properties?.color || '#10b981',
        fillColor: feature?.properties?.color || '#10b981',
        fillOpacity: 0.4,
        weight: 1,
      }),
      onEachFeature: (feature, layer) => {
        if (feature.properties?.details) {
          layer.bindPopup(
            `<div class="uc-popup"><strong>${feature.properties.changeType}</strong><br/>${feature.properties.details}</div>`,
          )
        }
      },
    },
  )
}

function renderLayers() {
  if (!map || !store.changeSummary) return

  // Clear existing
  if (addedLayer.value) { map.removeLayer(addedLayer.value as unknown as L.Layer); addedLayer.value = null }
  if (removedLayer.value) { map.removeLayer(removedLayer.value as unknown as L.Layer); removedLayer.value = null }
  if (modifiedLayer.value) { map.removeLayer(modifiedLayer.value as unknown as L.Layer); modifiedLayer.value = null }

  const summary = store.changeSummary

  if (showAdded.value && summary.addedBuildings.length > 0) {
    const features = summary.addedBuildings.map(buildingToGeoJSON)
    addedLayer.value = createGeoJSONLayer(features)
    addedLayer.value.addTo(map)
  }

  if (showRemoved.value && summary.removedBuildings.length > 0) {
    const features = summary.removedBuildings.map(buildingToGeoJSON)
    removedLayer.value = createGeoJSONLayer(features)
    removedLayer.value.addTo(map)
  }

  if (showModified.value && summary.modifiedBuildings.length > 0) {
    const features = summary.modifiedBuildings.map(buildingToGeoJSON)
    modifiedLayer.value = createGeoJSONLayer(features)
    modifiedLayer.value.addTo(map)
  }
}

function toggleLayer(type: 'added' | 'removed' | 'modified') {
  if (type === 'added') showAdded.value = !showAdded.value
  else if (type === 'removed') showRemoved.value = !showRemoved.value
  else showModified.value = !showModified.value
  renderLayers()
}

onMounted(() => {
  nextTick(() => {
    const m = L.map('uc-results-map', { zoomControl: true }).setView([20, 0], 3)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; CARTO | &copy; OSM',
      maxZoom: 19,
    }).addTo(m)

    map = m

    if (store.selectedBounds) {
      const b = store.selectedBounds
      const rect = L.rectangle(
        [[b.south, b.west], [b.north, b.east]],
        { color: '#6ee7b7', weight: 1, fillOpacity: 0.05, dashArray: '6 4' },
      )
      rect.addTo(m)
      m.fitBounds(rect.getBounds(), { padding: [30, 30] })
    }

    if (store.changeSummary) {
      renderLayers()
    }
  })
})

watch(
  () => store.changeSummary,
  () => {
    if (store.changeSummary) {
      renderLayers()
    }
  },
)

onUnmounted(() => {
  if (map) {
    map.remove()
    map = null
  }
})
</script>

<template>
  <div class="uc-results-map-wrap">
    <div id="uc-results-map" class="uc-results-map" />
    <div class="uc-toggle-panel">
      <button
        class="uc-toggle-btn uc-toggle-btn--added"
        :class="{ active: showAdded }"
        @click="toggleLayer('added')"
      >
        Added
      </button>
      <button
        class="uc-toggle-btn uc-toggle-btn--removed"
        :class="{ active: showRemoved }"
        @click="toggleLayer('removed')"
      >
        Removed
      </button>
      <button
        class="uc-toggle-btn uc-toggle-btn--modified"
        :class="{ active: showModified }"
        @click="toggleLayer('modified')"
      >
        Modified
      </button>
    </div>
  </div>
</template>
