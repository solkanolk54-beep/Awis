import { 
  WildfireIncident, 
  ForestZone, 
  WaterPoint, 
  EmergencyResource, 
  DetectionSignal 
} from '../types';
import { LiveWeatherData } from './liveWeatherService';

const CACHE_KEYS = {
  INCIDENTS: 'awis_offline_incidents_v1',
  FORESTS: 'awis_offline_forests_v1',
  WATER_POINTS: 'awis_offline_water_points_v1',
  RESOURCES: 'awis_offline_resources_v1',
  SIGNALS: 'awis_offline_signals_v1',
  WEATHER: 'awis_offline_weather_v1',
  LAST_SYNC: 'awis_offline_last_sync_timestamp',
  QUEUED_REPORTS: 'awis_offline_queued_reports_v1'
} as const;

export interface OfflineCacheStats {
  hasCachedData: boolean;
  incidentsCount: number;
  forestsCount: number;
  waterPointsCount: number;
  resourcesCount: number;
  signalsCount: number;
  lastSyncFormatted: string | null;
  pendingQueuedReports: number;
}

export interface QueuedOfflineReport {
  id: string;
  timestamp: string;
  type: 'citizen_report' | 'field_note';
  payload: Record<string, unknown>;
}

/**
 * Persists complete GIS spatial markers and alerts into localStorage for offline mountain/forest missions
 */
export function saveOfflineGISState(data: {
  incidents: WildfireIncident[];
  forests: ForestZone[];
  waterPoints: WaterPoint[];
  resources: EmergencyResource[];
  signals: DetectionSignal[];
  weather?: LiveWeatherData | null;
}): boolean {
  try {
    localStorage.setItem(CACHE_KEYS.INCIDENTS, JSON.stringify(data.incidents));
    localStorage.setItem(CACHE_KEYS.FORESTS, JSON.stringify(data.forests));
    localStorage.setItem(CACHE_KEYS.WATER_POINTS, JSON.stringify(data.waterPoints));
    localStorage.setItem(CACHE_KEYS.RESOURCES, JSON.stringify(data.resources));
    localStorage.setItem(CACHE_KEYS.SIGNALS, JSON.stringify(data.signals));

    if (data.weather) {
      localStorage.setItem(CACHE_KEYS.WEATHER, JSON.stringify(data.weather));
    }

    const now = new Date().toISOString();
    localStorage.setItem(CACHE_KEYS.LAST_SYNC, now);
    return true;
  } catch (error) {
    console.warn('[AWIS Offline Cache] Storage write error:', error);
    return false;
  }
}

/**
 * Recovers all GIS markers and alerts from localStorage if internet is lost
 */
export function loadOfflineGISState(): {
  incidents: WildfireIncident[] | null;
  forests: ForestZone[] | null;
  waterPoints: WaterPoint[] | null;
  resources: EmergencyResource[] | null;
  signals: DetectionSignal[] | null;
  weather: LiveWeatherData | null;
  lastSync: string | null;
} {
  try {
    const rawIncidents = localStorage.getItem(CACHE_KEYS.INCIDENTS);
    const rawForests = localStorage.getItem(CACHE_KEYS.FORESTS);
    const rawWaterPoints = localStorage.getItem(CACHE_KEYS.WATER_POINTS);
    const rawResources = localStorage.getItem(CACHE_KEYS.RESOURCES);
    const rawSignals = localStorage.getItem(CACHE_KEYS.SIGNALS);
    const rawWeather = localStorage.getItem(CACHE_KEYS.WEATHER);
    const lastSync = localStorage.getItem(CACHE_KEYS.LAST_SYNC);

    return {
      incidents: rawIncidents ? JSON.parse(rawIncidents) : null,
      forests: rawForests ? JSON.parse(rawForests) : null,
      waterPoints: rawWaterPoints ? JSON.parse(rawWaterPoints) : null,
      resources: rawResources ? JSON.parse(rawResources) : null,
      signals: rawSignals ? JSON.parse(rawSignals) : null,
      weather: rawWeather ? JSON.parse(rawWeather) : null,
      lastSync
    };
  } catch (error) {
    console.warn('[AWIS Offline Cache] Storage read error:', error);
    return {
      incidents: null,
      forests: null,
      waterPoints: null,
      resources: null,
      signals: null,
      weather: null,
      lastSync: null
    };
  }
}

/**
 * Inspects the status and storage count of the local offline cache
 */
export function getOfflineCacheStats(): OfflineCacheStats {
  try {
    const rawInc = localStorage.getItem(CACHE_KEYS.INCIDENTS);
    const rawFor = localStorage.getItem(CACHE_KEYS.FORESTS);
    const rawWat = localStorage.getItem(CACHE_KEYS.WATER_POINTS);
    const rawRes = localStorage.getItem(CACHE_KEYS.RESOURCES);
    const rawSig = localStorage.getItem(CACHE_KEYS.SIGNALS);
    const lastSync = localStorage.getItem(CACHE_KEYS.LAST_SYNC);
    const rawQueued = localStorage.getItem(CACHE_KEYS.QUEUED_REPORTS);

    const incidentsCount = rawInc ? (JSON.parse(rawInc) as unknown[]).length : 0;
    const forestsCount = rawFor ? (JSON.parse(rawFor) as unknown[]).length : 0;
    const waterPointsCount = rawWat ? (JSON.parse(rawWat) as unknown[]).length : 0;
    const resourcesCount = rawRes ? (JSON.parse(rawRes) as unknown[]).length : 0;
    const signalsCount = rawSig ? (JSON.parse(rawSig) as unknown[]).length : 0;
    const pendingQueuedReports = rawQueued ? (JSON.parse(rawQueued) as unknown[]).length : 0;

    let lastSyncFormatted: string | null = null;
    if (lastSync) {
      const d = new Date(lastSync);
      lastSyncFormatted = `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }

    return {
      hasCachedData: incidentsCount > 0,
      incidentsCount,
      forestsCount,
      waterPointsCount,
      resourcesCount,
      signalsCount,
      lastSyncFormatted,
      pendingQueuedReports
    };
  } catch {
    return {
      hasCachedData: false,
      incidentsCount: 0,
      forestsCount: 0,
      waterPointsCount: 0,
      resourcesCount: 0,
      signalsCount: 0,
      lastSyncFormatted: null,
      pendingQueuedReports: 0
    };
  }
}

/**
 * Stores a report or note locally when field agents or citizens have no cellular signal
 */
export function queueOfflineReport(report: {
  type: 'citizen_report' | 'field_note';
  payload: Record<string, unknown>;
}): void {
  try {
    const raw = localStorage.getItem(CACHE_KEYS.QUEUED_REPORTS);
    const list: QueuedOfflineReport[] = raw ? JSON.parse(raw) : [];
    list.push({
      id: `offline_rep_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      type: report.type,
      payload: report.payload
    });
    localStorage.setItem(CACHE_KEYS.QUEUED_REPORTS, JSON.stringify(list));
  } catch (err) {
    console.warn('[AWIS Offline Queue] Failed to save offline item:', err);
  }
}

/**
 * Returns pending reports that were queued while offline
 */
export function getQueuedOfflineReports(): QueuedOfflineReport[] {
  try {
    const raw = localStorage.getItem(CACHE_KEYS.QUEUED_REPORTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Clears pending reports once internet is restored and data is synchronized
 */
export function clearQueuedOfflineReports(): void {
  try {
    localStorage.removeItem(CACHE_KEYS.QUEUED_REPORTS);
  } catch (err) {
    console.warn('[AWIS Offline Queue] Error clearing queue:', err);
  }
}

/**
 * Registers the Service Worker to guarantee offline app execution in remote areas
 */
export async function registerServiceWorker(): Promise<boolean> {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      console.log('[AWIS PWA] Service Worker active with scope:', registration.scope);
      return true;
    } catch (error) {
      console.warn('[AWIS PWA] Service Worker registration encountered error:', error);
      return false;
    }
  }
  return false;
}
