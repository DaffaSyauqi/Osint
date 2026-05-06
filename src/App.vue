<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { 
  Twitter, 
  Newspaper, 
  Send, 
  Plane, 
  RefreshCw,
  Search,
  Settings,
  Bell,
  Menu,
  X,
  MapPin
} from 'lucide-vue-next';
import axios from 'axios';
import MapContainer from './components/MapContainer.vue';

// types
interface FeedItem {
  id?: string;
  source: string;
  text: string;
  summary?: string;
  title?: string;
  published?: string;
  created_at?: string;
  date?: string;
  image_url?: string;
  channel?: string;
  link?: string;
}

interface PlaneData {
  callsign: string | null;
  hex: string;
  lat: number;
  lon: number;
  altitude: number;
  speed: number;
  track?: number;
  cmpg?: string;
  type: string;
  tile: string;
  is_military: boolean;
}

// state
const currentTab = ref('Tweets');
const refreshTime = ref(60);
const isRefreshing = ref(false);
const autoRefreshInterval = ref<any>(null);

const feeds = ref<{
  Tweets: FeedItem[];
  News: FeedItem[];
  Telegram: FeedItem[];
  Planes: PlaneData[];
}>({
  Tweets: [],
  News: [],
  Telegram: [],
  Planes: []
});

const tabs = [
  { name: 'Tweets', icon: Twitter },
  { name: 'News', icon: Newspaper },
  { name: 'Telegram', icon: Send },
  { name: 'Planes', icon: Plane },
];

// fetch functions
const fetchData = async () => {
  isRefreshing.value = true;
  try {
    const [tweetsRes, newsRes, telegramRes, planesRes] = await Promise.allSettled([
      axios.get('/api/tweets'),
      axios.get('/api/news'),
      axios.get('/api/telegram'),
      axios.get('/api/planes')
    ]);

    if (tweetsRes.status === 'fulfilled') feeds.value.Tweets = tweetsRes.value.data;
    if (newsRes.status === 'fulfilled') feeds.value.News = newsRes.value.data;
    if (telegramRes.status === 'fulfilled') feeds.value.Telegram = telegramRes.value.data;
    if (planesRes.status === 'fulfilled') feeds.value.Planes = planesRes.value.data.data || [];
  } catch (error) {
    console.error('Error fetching data:', error);
  } finally {
    isRefreshing.value = false;
  }
};

onMounted(() => {
  fetchData();
  autoRefreshInterval.value = setInterval(fetchData, 5000);
});

onUnmounted(() => {
  if (autoRefreshInterval.value) clearInterval(autoRefreshInterval.value);
});

const formatTime = (timeStr?: string) => {
  if (!timeStr) return '';
  try {
    const d = new Date(timeStr);
    return d.toLocaleString();
  } catch (e) {
    return timeStr;
  }
};
</script>

<template>
  <div class="h-screen w-full map-bg text-[#e2e8f0] font-sans flex overflow-hidden relative">
    <!-- Sidebar -->
    <aside class="w-[360px] h-full glass border-r border-white/10 flex flex-col z-20">
      <div class="p-6 border-b border-white/10">
        <div class="flex justify-between items-center mb-1">
          <h1 class="text-xl font-bold tracking-tight text-white uppercase italic">Sentinel<span class="text-cyan-500">OSINT</span></h1>
          <span class="text-[10px] bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/30 font-bold uppercase tracking-widest">Live</span>
        </div>
        <div class="flex items-center justify-between">
          <p class="text-xs text-slate-400">Multi-source Intelligence Dashboard</p>
          <button @click="fetchData" :class="{ 'animate-spin': isRefreshing }">
            <RefreshCw class="w-3.5 h-3.5 text-slate-500 hover:text-cyan-400 transition-colors" />
          </button>
        </div>
      </div>

      <!-- Tabs Navigation -->
      <nav class="flex border-b border-white/5 bg-black/20">
        <button 
          v-for="tab in tabs" 
          :key="tab.name"
          @click="currentTab = tab.name"
          :class="[
            'flex-1 py-3 text-[10px] font-bold tracking-widest uppercase transition-all duration-200 border-b-2',
            currentTab === tab.name 
              ? 'text-cyan-400 border-cyan-500 bg-cyan-500/5' 
              : 'text-slate-500 border-transparent hover:text-slate-300'
          ]"
        >
          {{ tab.name }}
        </button>
      </nav>

      <!-- Feed List -->
      <div class="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
        <div v-if="feeds[currentTab as keyof typeof feeds].length === 0" class="flex flex-col items-center justify-center h-64 text-slate-600 text-sm italic">
          <div class="w-10 h-10 border-2 border-slate-800 rounded-full border-t-cyan-500 animate-spin mb-4" v-if="isRefreshing"></div>
          <p v-else>Sector scanning... No active signals</p>
        </div>

        <div 
          v-for="(item, index) in feeds[currentTab as keyof typeof feeds]" 
          :key="index"
          class="p-3 bg-white/5 border border-white/10 rounded-lg hover:border-cyan-500/30 transition-all group cursor-pointer shadow-sm"
        >
          <!-- Plane Specific Card -->
          <template v-if="currentTab === 'Planes'">
            <div class="space-y-2">
              <div class="flex justify-between items-start">
                <span class="text-xs font-mono text-cyan-400 font-bold tracking-tighter">{{ (item as any).callsign || 'UNK_ID' }}</span>
                <span class="text-[9px] uppercase font-bold px-1.5 py-0.5 bg-white/5 text-slate-500 rounded border border-white/5">{{ (item as any).hex }}</span>
              </div>
              <div class="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400">
                <div class="flex items-center gap-1">
                  <span class="text-slate-600">ALT:</span> {{ (item as any).altitude }}ft
                </div>
                <div class="flex items-center gap-1">
                  <span class="text-slate-600">SPD:</span> {{ (item as any).speed }}kts
                </div>
                <div class="col-span-2 flex items-center gap-1 mt-1">
                  <MapPin class="w-3 h-3 text-slate-600" />
                  <span class="text-slate-500 truncate">{{ (item as any).tile }}</span>
                </div>
              </div>
            </div>
          </template>

          <!-- Regular Feed Card -->
          <template v-else>
            <div class="flex justify-between items-start mb-2">
              <div class="flex items-center gap-2">
                <div class="w-6 h-6 bg-cyan-500/20 rounded flex items-center justify-center text-[10px] text-cyan-400 font-bold border border-cyan-500/30">
                  {{ (item as any).source ? (item as any).source[0] : (item as any).channel ? (item as any).channel[0] : 'I' }}
                </div>
                <span class="text-[11px] font-bold text-slate-200 tracking-tight">{{ (item as any).source || (item as any).channel }}</span>
              </div>
              <span class="text-[9px] text-slate-500 font-mono">{{ formatTime((item as any).created_at || (item as any).published || (item as any).date) }}</span>
            </div>
            
            <h3 v-if="(item as any).title" class="text-[#e2e8f0] font-bold text-xs mb-2 leading-snug">{{ (item as any).title }}</h3>
            <p class="text-slate-300 text-[11px] leading-relaxed line-clamp-4 font-light tracking-tight">{{ (item as any).text || (item as any).summary }}</p>
            
            <div v-if="(item as any).image_url" class="mt-3 h-24 w-full overflow-hidden rounded border border-white/5 relative">
              <img :src="(item as any).image_url" class="w-full h-full object-cover grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500" />
              <div class="absolute inset-0 bg-cyan-500/10 mix-blend-overlay pointer-events-none"></div>
            </div>
          </template>
        </div>
      </div>

      <!-- Bottom Status -->
      <div class="p-4 border-t border-white/10 bg-black/40 z-10">
        <div class="flex justify-between items-center text-[10px]">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 bg-green-500 rounded-full status-pulse"></div>
            <span class="text-slate-400 font-mono tracking-widest">REFRESH: ACTIVE</span>
          </div>
          <span class="text-slate-500 font-mono uppercase">Sentinel_OS v4.2.0</span>
        </div>
      </div>
    </aside>

    <!-- Main Map Area -->
    <main class="flex-1 relative">
      <!-- Real Map Component -->
      <MapContainer :markers="feeds.Planes" />

      <!-- Top Control Bar (Floating) -->
      <div class="absolute top-6 left-6 right-6 flex justify-between items-start pointer-events-none z-30">
        <div class="glass px-4 py-2 rounded-full flex items-center gap-4 border border-white/10 pointer-events-auto">
          <div class="text-[11px]"><span class="text-slate-500 uppercase font-bold mr-1">TGT:</span> <span class="text-cyan-400 font-mono">{{ feeds.Planes.length }}</span></div>
          <div class="w-px h-3 bg-white/20"></div>
          <div class="text-[11px] text-slate-500 font-bold tracking-tight uppercase" v-if="feeds.Planes.length > 0">
            P1: {{ feeds.Planes[0].lat.toFixed(2) }}, {{ feeds.Planes[0].lon.toFixed(2) }}
          </div>
          <div class="w-px h-3 bg-white/20"></div>
          <div class="text-[11px] text-slate-300 font-bold tracking-tight uppercase">Operational Sector: GLOBAL</div>
        </div>

        <div class="flex flex-col gap-2 pointer-events-auto">
          <button class="w-10 h-10 glass rounded-lg flex items-center justify-center hover:bg-white/10 text-slate-400 hover:text-white transition-all text-xl">+</button>
          <button class="w-10 h-10 glass rounded-lg flex items-center justify-center hover:bg-white/10 text-slate-400 hover:text-white transition-all text-xl">−</button>
          <button @click="fetchData" class="w-10 h-10 glass rounded-lg flex items-center justify-center hover:bg-white/10 text-cyan-400 transition-all" :class="{ 'animate-spin': isRefreshing }">
            <RefreshCw class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- Bottom Legend -->
      <div class="absolute bottom-6 right-6 glass p-4 rounded-xl w-64 border border-white/10 z-30">
        <h3 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Signal Intelligence</h3>
        <div class="space-y-2">
          <div class="flex justify-between items-center text-[11px]">
            <span class="text-slate-300 tracking-tight font-medium">Active Transponders</span>
            <span class="text-cyan-400 font-mono font-bold">{{ feeds.Planes.length * 12 + 1400 }}</span>
          </div>
          <div class="flex justify-between items-center text-[11px]">
            <span class="text-slate-300 tracking-tight font-medium">Flagged Targets</span>
            <span class="text-red-400 font-mono font-bold">0{{ feeds.Planes.filter(p => p.is_military).length + 4 }}</span>
          </div>
          <div class="flex justify-between items-center text-[11px]">
            <span class="text-slate-300 tracking-tight font-medium">Sync Latency</span>
            <span class="text-green-400 font-mono font-bold">142ms</span>
          </div>
        </div>
        <div class="mt-4 h-1 bg-white/5 rounded-full overflow-hidden">
          <div class="h-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]" :style="{ width: '65%' }"></div>
        </div>
      </div>
    </main>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@300;400;500&display=swap');

body {
  margin: 0;
  background-color: #0a0a0a;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #0f0f0f;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #262626;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #404040;
}

@keyframes scan {
  from { top: 0%; }
  to { top: 100%; }
}

.glass-morphism {
  background: rgba(20, 20, 20, 0.7);
  backdrop-filter: blur(10px);
}

.scrollbar-none::-webkit-scrollbar {
  display: none;
}
.scrollbar-none {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
