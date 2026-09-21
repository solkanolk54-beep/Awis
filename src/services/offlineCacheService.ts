/**
 * AWIS Offline Cache & Tactical GIS Persistence Service
 * Upgraded to use IndexedDB (awis_tactical_db) for multi-gigabyte capacity,
 * with synchronous LocalStorage mirror for instant initial frame rendering.
 */

import { 
  WildfireIncident, 
  ForestZone, 
  WaterPoint, 
  EmergencyResource, 
  DetectionSignal 
} from '../types';
import { LiveWeatherData } from './liveWeatherService';
import {
  saveAllGISDataIDB,
  loadAllGISDataIDB,
  queueReportIDB,
  getQueuedReportsIDB,
  clearQueuedReportsIDB,
  getTacticalStorageStatsIDB,
  IDBQueuedReport,
  IDBStats
} from './indexedDbService';
import { registerTacticalServiceWorker } from '../registerServiceWorker';

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
  storageType?: 'IndexedDB' | 'LocalStorage';
  estimatedStorageUsageMB?: number;
}

export interface QueuedOfflineReport {
  id: string;
  timestamp: string;
  type: 'citizen_report' | 'field_note' | 'incident_update';
  payload: Record<string, unknown>;
}

/**
 * Persists complete GIS spatial markers and alerts into IndexedDB (multi-gigabyte storage)
 * and keeps a synchronous LocalStorage mirror for immediate mount hydration.
 */
export function saveOfflineGISState(data: {
  incidents: WildfireIncident[];
  forests: ForestZone[];
  waterPoints: WaterPoint[];
  resources: EmergencyResource[];
  signals: DetectionSignal[];
  weather?: LiveWeatherData | null;
}): boolean {
  // 1. Primary: Save to IndexedDB (asynchronously with unlimited tactical capacity)
  saveAllGISDataIDB(data).catch((err) => {
    console.warn('[AWIS Offline Cache] IndexedDB background save notice:', err);
  });

  // 2. Synchronous mirror to localStorage for instant non-blocking hydration
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
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
    }
    return true;
  } catch (error) {
    console.warn('[AWIS Offline Cache] LocalStorage quota reached, IndexedDB remains active:', error);
    return true;
  }
}

/**
 * Recovers all GIS markers and alerts synchronously from local storage for initial paint.
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
    if (typeof window === 'undefined' || !window.localStorage) {
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

    const rawIncidents = localStorage.getItem(CACHE_KEYS.INCIDENTS);
    const rawForests = localStorage.getItem(CACHE_KEYS.FORESTS);
    const rawWaterPoints = localStorage.getItem(CACHE_KEYS.WATER_POINTS);
    const rawResources = localStorage.getItem(CACHE_KEYS.RESOURCES);
    const rawSignals = localStorage.getItem(CACHE_KEYS.SIGNALS);
    let sanitizedSignals: DetectionSignal[] | null = null;
    if (rawSignals) {
      try {
        const parsed = JSON.parse(rawSignals);
        if (Array.isArray(parsed)) {
          const seen = new Set<string>();
          sanitizedSignals = parsed.filter((s: DetectionSignal) => {
            if (!s || !s.id || seen.has(s.id)) return false;
            seen.add(s.id);
            return true;
          });
        }
      } catch (e) {
        console.warn('[AWIS Offline Cache] Failed to parse cached signals:', e);
      }
    }
    const rawWeather = localStorage.getItem(CACHE_KEYS.WEATHER);
    const lastSync = localStorage.getItem(CACHE_KEYS.LAST_SYNC);

    return {
      incidents: rawIncidents ? JSON.parse(rawIncidents) : null,
      forests: rawForests ? JSON.parse(rawForests) : null,
      waterPoints: rawWaterPoints ? JSON.parse(rawWaterPoints) : null,
      resources: rawResources ? JSON.parse(rawResources) : null,
      signals: sanitizedSignals,
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
 * Recovers all GIS entities asynchronously from IndexedDB
 */
export async function loadOfflineGISStateAsync(): Promise<{
  incidents: WildfireIncident[];
  forests: ForestZone[];
  waterPoints: WaterPoint[];
  resources: EmergencyResource[];
  signals: DetectionSignal[] | null;
  weather: LiveWeatherData | null;
  lastSync: string | null;
}> {
  return loadAllGISDataIDB();
}

/**
 * Inspects the status and storage count of the local offline cache
 */
export function getOfflineCacheStats(): OfflineCacheStats {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return {
        hasCachedData: false,
        incidentsCount: 0,
        forestsCount: 0,
        waterPointsCount: 0,
        resourcesCount: 0,
        signalsCount: 0,
        lastSyncFormatted: null,
        pendingQueuedReports: 0,
        storageType: 'IndexedDB'
      };
    }

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
      hasCachedData: incidentsCount > 0 || forestsCount > 0,
      incidentsCount,
      forestsCount,
      waterPointsCount,
      resourcesCount,
      signalsCount,
      lastSyncFormatted,
      pendingQueuedReports,
      storageType: 'IndexedDB'
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
      pendingQueuedReports: 0,
      storageType: 'IndexedDB'
    };
  }
}

/**
 * Gets high-precision storage metrics directly from IndexedDB
 */
export async function getOfflineCacheStatsAsync(): Promise<OfflineCacheStats> {
  const idbStats: IDBStats = await getTacticalStorageStatsIDB();
  return {
    hasCachedData: idbStats.hasData,
    incidentsCount: idbStats.incidentsCount,
    forestsCount: idbStats.forestsCount,
    waterPointsCount: idbStats.waterPointsCount,
    resourcesCount: idbStats.resourcesCount,
    signalsCount: 0,
    lastSyncFormatted: idbStats.lastSyncFormatted,
    pendingQueuedReports: idbStats.queuedReportsCount,
    storageType: 'IndexedDB',
    estimatedStorageUsageMB: idbStats.estimatedStorageUsageMB
  };
}

/**
 * Stores a report or note locally when field agents or citizens have no cellular signal
 * Writes to both IndexedDB (primary) and localStorage mirror.
 */
export function queueOfflineReport(report: {
  type: 'citizen_report' | 'field_note' | 'incident_update';
  payload: Record<string, unknown>;
}): void {
  const newReport: QueuedOfflineReport = {
    id: `offline_rep_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    timestamp: new Date().toISOString(),
    type: report.type,
    payload: report.payload
  };

  // 1. IndexedDB persistence
  queueReportIDB(newReport).catch((err) => {
    console.warn('[AWIS Offline Queue] IndexedDB queue write notice:', err);
  });

  // 2. LocalStorage mirror for immediate UI sync
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = localStorage.getItem(CACHE_KEYS.QUEUED_REPORTS);
      const list: QueuedOfflineReport[] = raw ? JSON.parse(raw) : [];
      list.push(newReport);
      localStorage.setItem(CACHE_KEYS.QUEUED_REPORTS, JSON.stringify(list));
    }
  } catch (err) {
    console.warn('[AWIS Offline Queue] LocalStorage queue mirror error:', err);
  }
}

/**
 * Returns pending reports that were queued while offline
 */
export function getQueuedOfflineReports(): QueuedOfflineReport[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    const raw = localStorage.getItem(CACHE_KEYS.QUEUED_REPORTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Returns pending reports directly from IndexedDB
 */
export async function getQueuedOfflineReportsAsync(): Promise<QueuedOfflineReport[]> {
  const reports = await getQueuedReportsIDB();
  return reports.map((r) => ({
    id: r.id,
    timestamp: r.timestamp,
    type: r.type,
    payload: r.payload
  }));
}

/**
 * Clears pending reports from both IndexedDB and localStorage once synchronized
 */
export function clearQueuedOfflineReports(): void {
  // Clear IndexedDB
  clearQueuedReportsIDB().catch((err) => {
    console.warn('[AWIS Offline Queue] Failed to clear IndexedDB reports queue:', err);
  });

  // Clear LocalStorage
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(CACHE_KEYS.QUEUED_REPORTS);
    }
  } catch (err) {
    console.warn('[AWIS Offline Queue] Error clearing localStorage queue:', err);
  }
}

/**
 * Tactical Service Worker registration
 */
export async function registerServiceWorker(): Promise<boolean> {
  const res = await registerTacticalServiceWorker();
  return res.registered;
}

export { syncQueueToCloud } from '../firebaseConfig';
export type { SyncQueueResult } from '../firebaseConfig';
export * from './indexedDbService';
