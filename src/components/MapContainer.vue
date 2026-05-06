<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import XYZ from 'ol/source/XYZ';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import LineString from 'ol/geom/LineString';
import { fromLonLat } from 'ol/proj';
import { Style, Icon, Text, Fill, Stroke, Circle } from 'ol/style';
import Overlay from 'ol/Overlay';

interface Props {
  markers: any[];
}

const props = defineProps<Props>();
const mapContainer = ref<HTMLElement | null>(null);
const popupContainer = ref<HTMLElement | null>(null);
const popupContent = ref<HTMLElement | null>(null);
const selectedPlane = ref<any>(null);

let map: Map;
let vectorSource: VectorSource;

const initMap = () => {
  if (!mapContainer.value) return;

  vectorSource = new VectorSource();

  map = new Map({
    target: mapContainer.value,
    layers: [
      new TileLayer({
        source: new XYZ({
          url: 'https://{a-d}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png',
          attributions: '© OpenStreetMap contributors, © CARTO'
        }),
        zIndex: 0
      }),
      new VectorLayer({
        source: vectorSource,
        zIndex: 10
      })
    ],
    view: new View({
      center: fromLonLat([-98.5795, 39.8283]), // Center on USA
      zoom: 4
    })
  });

  // Popup overlay
  const overlay = new Overlay({
    element: popupContainer.value!,
    autoPan: {
      animation: {
        duration: 250,
      },
    },
  });
  map.addOverlay(overlay);

  map.on('click', (evt) => {
    const feature = map.forEachFeatureAtPixel(evt.pixel, (f) => f);
    if (feature) {
      const data = feature.get('data');
      selectedPlane.value = data;
      const coordinates = (feature.getGeometry() as Point).getCoordinates();
      overlay.setPosition(coordinates);
    } else {
      overlay.setPosition(undefined);
      selectedPlane.value = null;
    }
  });

  updateMarkers();

  // Handle resize
  const resizeObserver = new ResizeObserver(() => {
    map.updateSize();
  });
  resizeObserver.observe(mapContainer.value);
};

const getDestinationLonLat = (lon: number, lat: number, track: number, distanceKm: number) => {
  const R = 6371; // Earth radius in km
  const bearing = (track * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lon1 = (lon * Math.PI) / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(distanceKm / R) +
    Math.cos(lat1) * Math.sin(distanceKm / R) * Math.cos(bearing)
  );

  const lon2 = lon1 + Math.atan2(
    Math.sin(bearing) * Math.sin(distanceKm / R) * Math.cos(lat1),
    Math.cos(distanceKm / R) - Math.sin(lat1) * Math.sin(lat2)
  );

  return [(lon2 * 180) / Math.PI, (lat2 * 180) / Math.PI];
};

const updateMarkers = () => {
  if (!vectorSource) return;

  console.log('Updating markers, count:', props.markers.length);
  vectorSource.clear();

  props.markers.forEach((plane) => {
    const lat = parseFloat(plane.lat);
    const lon = parseFloat(plane.lon);
    if (isNaN(lat) || isNaN(lon)) return;

    // Determine color
    let planeColor = '#22d3ee'; // default cyan
    let planeColorRgba = 'rgba(34, 211, 238, 0.4)'; // cyan with opacity
    if (plane.cmpg === 'Mil') {
      planeColor = '#ef4444'; // red
      planeColorRgba = 'rgba(239, 68, 68, 0.4)';
    } else if (plane.cmpg === 'Gov') {
      planeColor = '#3b82f6'; // blue
      planeColorRgba = 'rgba(59, 130, 246, 0.4)';
    } else if (plane.is_military) {
      planeColor = '#ef4444'; // fallback red for military
      planeColorRgba = 'rgba(239, 68, 68, 0.4)';
    }

    // 1. Draw prediction line (dead reckoning) if track and speed available
    if (plane.track !== undefined && plane.track !== null && plane.speed > 0) {
      // Predict 15 minutes of flight path
      const distanceKm = plane.speed * 1.852 * (15 / 60); 
      const destLonLat = getDestinationLonLat(lon, lat, plane.track, distanceKm);
      
      const lineFeature = new Feature({
        geometry: new LineString([fromLonLat([lon, lat]), fromLonLat(destLonLat)]),
        data: plane
      });

      lineFeature.setStyle(new Style({
        stroke: new Stroke({
          color: planeColorRgba,
          width: 2,
          lineDash: [4, 4]
        })
      }));
      vectorSource.addFeature(lineFeature);
    }

    // 2. Draw plane marker
    const feature = new Feature({
      geometry: new Point(fromLonLat([lon, lat])),
      data: plane
    });

    const svgIcon = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
        <path fill="${planeColor}" stroke="#ffffff" stroke-width="0.5" d="M21,16v-2l-8-5V3.5A1.5,1.5 0 0,0 11.5,2A1.5,1.5 0 0,0 10,3.5V9l-8,5v2l8-2.5V19l-2,1.5V22l3.5-1l3.5,1v-1.5L13,19v-5.5L21,16z"/>
      </svg>
    `.trim();

    // Set or update style
    feature.setStyle(new Style({
      image: new Icon({
        src: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgIcon),
        scale: 1.2,
        rotation: plane.track ? (plane.track * Math.PI / 180) : 0,
      }),
      text: new Text({
        text: plane.callsign || 'UNK',
        offsetY: 20,
        fill: new Fill({ color: planeColor }),
        stroke: new Stroke({ color: '#05070a', width: 2 }),
        font: 'bold 10px JetBrains Mono, monospace'
      })
    }));

    vectorSource.addFeature(feature);
  });
};

watch(() => props.markers, () => {
  updateMarkers();
}, { deep: true });

onMounted(() => {
  initMap();
});
</script>

<template>
  <div class="absolute inset-0 w-full h-full">
    <div ref="mapContainer" class="absolute inset-0 w-full h-full"></div>
    
    <!-- Popup Overlay -->
    <div ref="popupContainer" class="absolute glass p-4 rounded-xl shadow-2xl min-w-[220px] pointer-events-auto border border-white/10" v-show="selectedPlane">
      <div v-if="selectedPlane" class="space-y-3">
        <div class="flex justify-between items-start border-b border-white/10 pb-2 mb-2">
          <h3 class="font-bold text-cyan-400 font-mono text-[11px] leading-tight">{{ selectedPlane.callsign || 'UNKNOWN' }}</h3>
          <span class="text-[9px] bg-white/5 px-1.5 py-0.5 rounded text-slate-500 font-mono border border-white/5">{{ selectedPlane.hex }}</span>
        </div>
        <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-[10px] font-mono">
          <div class="flex flex-col">
            <span class="text-slate-500 uppercase font-bold text-[8px]">Type</span>
            <span class="text-slate-200">{{ selectedPlane.type || 'N/A' }}</span>
          </div>
          <div class="flex flex-col">
            <span class="text-slate-500 uppercase font-bold text-[8px]">Altitude</span>
            <span class="text-slate-200">{{ selectedPlane.altitude }} ft</span>
          </div>
          <div class="flex flex-col">
            <span class="text-slate-500 uppercase font-bold text-[8px]">Speed</span>
            <span class="text-slate-200">{{ selectedPlane.speed }} kts</span>
          </div>
          <div class="flex flex-col">
            <span class="text-slate-500 uppercase font-bold text-[8px]">Sector</span>
            <span class="text-slate-200">{{ selectedPlane.tile }}</span>
          </div>
        </div>
        <div v-if="selectedPlane.cmpg === 'Mil'" class="mt-2 pt-2 border-t border-white/10 flex items-center gap-2">
          <div class="w-1.5 h-1.5 bg-red-500 rounded-full status-pulse"></div>
          <span class="text-[9px] text-red-400 font-bold uppercase tracking-widest">
            Identity: Military Host
          </span>
        </div>
        <div v-else-if="selectedPlane.cmpg === 'Gov'" class="mt-2 pt-2 border-t border-white/10 flex items-center gap-2">
          <div class="w-1.5 h-1.5 bg-blue-500 rounded-full status-pulse"></div>
          <span class="text-[9px] text-blue-400 font-bold uppercase tracking-widest">
            Identity: Government Host
          </span>
        </div>
        <div v-else-if="selectedPlane.is_military" class="mt-2 pt-2 border-t border-white/10 flex items-center gap-2">
          <div class="w-1.5 h-1.5 bg-red-500 rounded-full status-pulse"></div>
          <span class="text-[9px] text-red-400 font-bold uppercase tracking-widest">
            Identity: Military Host
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
:deep(.ol-attribution) {
  display: none;
}
:deep(.ol-zoom) {
  top: 6.5rem; /* Pushed down below the floating status bar */
  left: 1.5rem;
}
:deep(.ol-zoom button) {
  background-color: rgba(15, 23, 42, 0.8) !important;
  backdrop-filter: blur(8px);
  color: #94a3b8 !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 8px;
  margin-bottom: 6px;
  width: 2.5rem;
  height: 2.5rem;
  font-size: 1.25rem;
}
:deep(.ol-zoom button:hover) {
  background-color: rgba(6, 182, 212, 0.2) !important;
  color: #22d3ee !important;
  border-color: rgba(34, 211, 238, 0.5) !important;
}
</style>
