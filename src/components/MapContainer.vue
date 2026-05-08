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
import { defaults as defaultControls } from 'ol/control';

interface Props {
  markers: any[];
  alerts?: any[];
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
    controls: defaultControls({ zoom: false }),
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
    id: 'popup-overlay',
    element: popupContainer.value!,
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

const zoomIn = () => {
  if (map) {
    const view = map.getView();
    view.animate({ zoom: (view.getZoom() || 4) + 1, duration: 250 });
  }
};

const zoomOut = () => {
  if (map) {
    const view = map.getView();
    view.animate({ zoom: (view.getZoom() || 4) - 1, duration: 250 });
  }
};

const selectPlane = (plane: any) => {
  if (!map || !plane) return;
  selectedPlane.value = plane;
  
  if (plane.lon && plane.lat) {
    // Position overlay
    const overlay = map.getOverlayById('popup-overlay');
    if (overlay) {
      overlay.setPosition(fromLonLat([plane.lon, plane.lat]));
    }
  }
};

defineExpose({ zoomIn, zoomOut, selectPlane, selectedPlane });

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

  if (props.alerts) {
    props.alerts.forEach((alert) => {
      const feature = new Feature({
        geometry: new Point(fromLonLat([alert.lon, alert.lat])),
        data: alert
      });

      const alertIcon = `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
          <line x1="12" x2="12" y1="9" y2="13"/>
          <line x1="12" x2="12.01" y1="17" y2="17"/>
        </svg>
      `.trim();

      feature.setStyle(new Style({
        image: new Icon({
          src: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(alertIcon),
          scale: 1,
        }),
        text: new Text({
          text: alert.country.toUpperCase(),
          offsetY: 22,
          fill: new Fill({ color: '#ef4444' }),
          font: 'bold 14px JetBrains Mono, monospace',
          stroke: new Stroke({ color: '#1e293b', width: 4 })
        })
      }));

      vectorSource.addFeature(feature);
    });
  }
};

watch(() => [props.markers, props.alerts], () => {
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
    <div ref="popupContainer" class="absolute bg-[#1e293b]/95 backdrop-blur-md p-0 rounded-xl shadow-2xl min-w-[320px] pointer-events-auto border border-slate-700/50 overflow-hidden" v-show="selectedPlane">
      <div v-if="selectedPlane">
        
        <!-- Alert Template -->
        <div v-if="selectedPlane.is_alert">
          <div class="p-4 bg-red-500/10 border-b border-red-500/20 flex flex-col items-center justify-center text-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
              <line x1="12" x2="12" y1="9" y2="13"/>
              <line x1="12" x2="12.01" y1="17" y2="17"/>
            </svg>
            <h3 class="text-xl font-bold font-mono text-red-500 tracking-widest uppercase">{{ selectedPlane.country }}</h3>
          </div>
          <div class="p-4 max-h-[300px] overflow-y-auto custom-scrollbar space-y-4">
            <div v-for="(item, idx) in selectedPlane.items" :key="idx" class="border-b border-white/5 pb-3">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-[9px] uppercase bg-white/10 px-1.5 py-0.5 rounded text-slate-300 font-mono">{{ item.source || item.channel || 'Feed' }}</span>
              </div>
              <p class="text-xs text-slate-200 leading-relaxed font-sans">{{ item.text || item.title || item.summary }}</p>
            </div>
          </div>
        </div>

        <!-- Plane Template -->
        <div v-else>
          <!-- Top Image Section -->
          <div v-if="selectedPlane.imagelink1 || selectedPlane.imagelink2" class="relative w-full h-[180px] bg-slate-800">
           <img :src="selectedPlane.imagelink1 || selectedPlane.imagelink2" class="w-full h-full object-cover" />
           <div class="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/20 to-transparent"></div>
           
           <div class="absolute top-3 left-3">
             <span v-if="selectedPlane.cmpg === 'Mil' || selectedPlane.is_military" class="text-[9px] font-bold bg-red-600 text-white px-2 py-0.5 rounded shadow tracking-widest leading-none block">MILITARY HOST</span>
             <span v-else-if="selectedPlane.cmpg === 'Gov'" class="text-[9px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded shadow tracking-widest leading-none block">GOVERNMENT HOST</span>
             <span v-else class="text-[9px] font-bold bg-cyan-600 text-white px-2 py-0.5 rounded shadow tracking-widest leading-none block">{{ selectedPlane.category || 'CIVIL' }}</span>
           </div>
      
           <div class="absolute bottom-3 left-4 right-4 flex justify-between items-end">
             <div>
               <h3 :class="['text-2xl font-bold italic tracking-tight font-mono leading-none drop-shadow-md', selectedPlane.cmpg === 'Gov' ? 'text-blue-400' : (selectedPlane.cmpg === 'Mil' || selectedPlane.is_military) ? 'text-red-400' : 'text-cyan-400']">{{ selectedPlane.callsign || 'UNK_ID' }}</h3>
               <p class="text-[10px] text-slate-300 uppercase tracking-widest mt-1.5 font-mono drop-shadow-md">{{ (selectedPlane.type_full || selectedPlane.type) || 'UNKNOWN TYPE' }}</p>
             </div>
             <span class="text-[10px] uppercase font-bold px-2 py-1 bg-[#1e293b]/80 backdrop-blur-sm text-slate-300 rounded font-mono border border-white/10">{{ selectedPlane.hex }}</span>
           </div>
        </div>
      
        <!-- If NO Image -->
        <div v-else class="p-4 border-b border-white/10 flex justify-between items-start bg-slate-800/50">
            <div>
               <h3 :class="['text-2xl font-bold italic tracking-tight font-mono leading-none drop-shadow-md', selectedPlane.cmpg === 'Gov' ? 'text-blue-500' : (selectedPlane.cmpg === 'Mil' || selectedPlane.is_military) ? 'text-red-500' : 'text-cyan-500']">{{ selectedPlane.callsign || 'UNK_ID' }}</h3>
               <p class="text-[10px] text-slate-400 uppercase tracking-widest mt-1.5 font-mono">{{ (selectedPlane.type_full || selectedPlane.type) || 'UNKNOWN TYPE' }}</p>
            </div>
            <span class="text-[10px] uppercase font-bold px-2 py-1 bg-[#1e293b]/80 text-slate-300 rounded font-mono border border-white/10">{{ selectedPlane.hex }}</span>
        </div>
      
        <div class="p-4 space-y-4 bg-[#0f172a]">
           <!-- Data grid -->
           <div class="grid grid-cols-2 gap-y-4 gap-x-2 text-[10px] font-mono">
              <div class="flex flex-col gap-1">
                 <span class="text-slate-500 uppercase font-bold text-[8px] tracking-wider">Altitude</span>
                 <span class="text-slate-200 uppercase font-bold text-xs">{{ selectedPlane.altitude === 'ground' || selectedPlane.altitude === 'Ground' ? 'ground ft' : ((selectedPlane.altitude) + ' ft') }}</span>
              </div>
              <div class="flex flex-col gap-1">
                 <span class="text-slate-500 uppercase font-bold text-[8px] tracking-wider">Speed</span>
                 <span class="text-slate-200 uppercase font-bold text-xs">{{ selectedPlane.speed }} kts</span>
              </div>
              <div class="flex flex-col gap-1">
                 <span class="text-slate-500 uppercase font-bold text-[8px] tracking-wider">Track</span>
                 <span class="text-slate-200 uppercase font-bold text-xs">{{ selectedPlane.track !== undefined ? selectedPlane.track + '°' : '-' }}</span>
              </div>
              <div class="flex flex-col gap-1">
                 <span class="text-slate-500 uppercase font-bold text-[8px] tracking-wider">Squawk</span>
                 <span class="text-slate-200 uppercase font-bold text-xs">{{ selectedPlane.squawk || '-' }}</span>
              </div>
              <div class="flex flex-col gap-1">
                 <span class="text-slate-500 uppercase font-bold text-[8px] tracking-wider">Operator</span>
                 <span class="text-slate-200 font-bold truncate pr-2 capitalize">{{ selectedPlane.operator || '-' }}</span>
              </div>
              <div class="flex flex-col gap-1">
                 <span class="text-slate-500 uppercase font-bold text-[8px] tracking-wider">Registration</span>
                 <span class="text-slate-200 font-bold uppercase">{{ selectedPlane.registration || '-' }}</span>
              </div>
              <div class="flex flex-col gap-1">
                 <span class="text-slate-500 uppercase font-bold text-[8px] tracking-wider">Lat / Lon</span>
                 <span class="text-slate-200 font-bold">{{ selectedPlane.lat?.toFixed(4) }} / {{ selectedPlane.lon?.toFixed(4) }}</span>
              </div>
              <div class="flex flex-col gap-1">
                 <span class="text-slate-500 uppercase font-bold text-[8px] tracking-wider">Mission Type</span>
                 <span class="text-emerald-500 uppercase font-bold text-xs tracking-tight">{{ selectedPlane.mission_type || '-' }}</span>
              </div>
           </div>
           
           <!-- Tags -->
           <div v-if="selectedPlane.tag1 || selectedPlane.tag2 || selectedPlane.tag3" class="flex flex-wrap gap-1.5 pt-2">
              <span v-if="selectedPlane.tag1" class="text-[8px] bg-white/5 text-slate-400 px-2 py-1 rounded border border-white/10 uppercase font-bold tracking-wider">{{ selectedPlane.tag1 }}</span>
              <span v-if="selectedPlane.tag2" class="text-[8px] bg-white/5 text-slate-400 px-2 py-1 rounded border border-white/10 uppercase font-bold tracking-wider">{{ selectedPlane.tag2 }}</span>
              <span v-if="selectedPlane.tag3" class="text-[8px] bg-white/5 text-slate-400 px-2 py-1 rounded border border-white/10 uppercase font-bold tracking-wider">{{ selectedPlane.tag3 }}</span>
           </div>
           
           <div class="mt-2 pt-3 border-t border-white/10 flex justify-between items-center">
              <div class="flex items-center gap-1.5">
                 <div :class="['w-1.5 h-1.5 rounded-full', selectedPlane.cmpg === 'Gov' ? 'bg-blue-500' : (selectedPlane.cmpg === 'Mil' || selectedPlane.is_military) ? 'bg-red-500' : 'bg-cyan-500']"></div>
                 <span class="text-[8px] text-slate-400 font-bold uppercase tracking-widest">{{ selectedPlane.tile || 'Global' }}</span>
              </div>
              <span class="text-[8px] text-slate-600 font-mono tracking-widest">TARGET_INT_VECTOR_V4</span>
           </div>
        </div>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
:deep(.ol-attribution) {
  display: none;
}
</style>
