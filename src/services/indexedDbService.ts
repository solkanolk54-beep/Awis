/**
 * AWIS Tactical Offline Storage Engine (IndexedDB)
 * Database: awis_tactical_db
 * Replaces the 5MB localStorage limitation with multi-gigabyte client-side persistence
 * for remote Algerian forest operations and civil protection field tablets.
 */

import { 
  WildfireIncident, 
  ForestZone, 
  WaterPoint, 
  EmergencyResource, 
  DetectionSignal 
} from '../types';
import { LiveWeatherData } from './liveWeatherService';

export const DB_NAME = 'awis_tactical_db';
export const DB_VERSION = 1;

export const STORES = {
  INCIDENTS: 'incidents',
  FORESTS: 'forests',
  WATER_POINTS: 'waterPoints',
  RESOURCES: 'resources',
  QUEUED_REPORTS: 'queuedReports',
  APP_META: 'appMeta'
} as const;

export interface IDBQueuedReport {
  id: string;
  timestamp: string;
  type: 'citizen_report' | 'field_note' | 'incident_update';
  payload: Record<string, unknown>;
  syncAttempts?: number;
  lastAttempt?: string;
}

export interface IDBStats {
  hasData: boolean;
  incidentsCount: number;
  forestsCount: number;
  waterPointsCount: number;
  resourcesCount: number;
  queuedReportsCount: number;
  lastSyncFormatted: string | null;
  estimatedStorageUsageMB?: number;
}

let dbInstance: IDBDatabase | null = null;
let dbOpeningPromise: Promise<IDBDatabase> | null = null;

/**
 * Initializes and upgrades the IndexedDB database instance
 */
export function getTacticalDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.reject(new Error('IndexedDB is not supported in this browser environment'));
  }

  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  if (dbOpeningPromise) {
    return dbOpeningPromise;
  }

  dbOpeningPromise = new Promise<IDBDatabase>((resolve, reject) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 1. Incidents Store
        if (!db.objectStoreNames.contains(STORES.INCIDENTS)) {
          const incStore = db.createObjectStore(STORES.INCIDENTS, { keyPath: 'id' });
          incStore.createIndex('by_wilaya', 'wilaya', { unique: false });
          incStore.createIndex('by_status', 'status', { unique: false });
          incStore.createIndex('by_riskLevel', 'riskLevel', { unique: false });
        }

        // 2. Forests & Reserves Store
        if (!db.objectStoreNames.contains(STORES.FORESTS)) {
          const forStore = db.createObjectStore(STORES.FORESTS, { keyPath: 'id' });
          forStore.createIndex('by_wilaya', 'wilaya', { unique: false });
          forStore.createIndex('by_riskLevel', 'riskLevel', { unique: false });
        }

        // 3. Water Points & Cisterns Store
        if (!db.objectStoreNames.contains(STORES.WATER_POINTS)) {
          const watStore = db.createObjectStore(STORES.WATER_POINTS, { keyPath: 'id' });
          watStore.createIndex('by_wilaya', 'wilaya', { unique: false });
          watStore.createIndex('by_type', 'type', { unique: false });
        }

        // 4. Resources & Fleet Store
        if (!db.objectStoreNames.contains(STORES.RESOURCES)) {
          const resStore = db.createObjectStore(STORES.RESOURCES, { keyPath: 'id' });
          resStore.createIndex('by_status', 'status', { unique: false });
          resStore.createIndex('by_type', 'type', { unique: false });
        }

        // 5. Offline Queued Reports Store (Ready for Cloud Sync)
        if (!db.objectStoreNames.contains(STORES.QUEUED_REPORTS)) {
          const queueStore = db.createObjectStore(STORES.QUEUED_REPORTS, { keyPath: 'id' });
          queueStore.createIndex('by_timestamp', 'timestamp', { unique: false });
          queueStore.createIndex('by_type', 'type', { unique: false });
        }

        // 6. Tactical App Metadata & Global GIS Signals
        if (!db.objectStoreNames.contains(STORES.APP_META)) {
          db.createObjectStore(STORES.APP_META, { keyPath: 'key' });
        }

        console.info('[AWIS Tactical IDB] Schema upgraded to version', DB_VERSION);
      };

      request.onsuccess = (event: Event) => {
        dbInstance = (event.target as IDBOpenDBRequest).result;
        dbInstance.onversionchange = () => {
          dbInstance?.close();
          dbInstance = null;
        };
        dbInstance.onerror = (errEvent) => {
          console.error('[AWIS Tactical IDB] Database runtime error:', errEvent);
        };
        resolve(dbInstance);
      };

      request.onerror = (event: Event) => {
        const error = (event.target as IDBOpenDBRequest).error;
        console.warn('[AWIS Tactical IDB] Failed to open IndexedDB:', error);
        dbOpeningPromise = null;
        reject(error || new Error('Unknown error opening IndexedDB'));
      };

      request.onblocked = () => {
        console.warn('[AWIS Tactical IDB] Database open request is blocked by an open connection elsewhere.');
      };
    } catch (e) {
      dbOpeningPromise = null;
      reject(e);
    }
  });

  return dbOpeningPromise;
}

/* ==========================================================================
   Bulk Data Persistence Helpers
   ========================================================================== */

/**
 * Persists an array of items into an object store within a single transaction
 */
export async function bulkPut<T extends { id: string }>(storeName: string, items: T[]): Promise<void> {
  const db = await getTacticalDB();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);

      // Clear existing records before replacing to maintain exact synchrony
      store.clear();

      for (const item of items) {
        store.put(item);
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(new Error(`Transaction aborted on ${storeName}`));
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Retrieves all items from a given store
 */
export async function getAllFromStore<T>(storeName: string): Promise<T[]> {
  const db = await getTacticalDB();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(request.error);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Counts the number of items in a given store
 */
export async function countStore(storeName: string): Promise<number> {
  try {
    const db = await getTacticalDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return 0;
  }
}

/* ==========================================================================
   Tactical Operations: GIS Entities
   ========================================================================== */

export async function saveAllGISDataIDB(data: {
  incidents: WildfireIncident[];
  forests: ForestZone[];
  waterPoints: WaterPoint[];
  resources: EmergencyResource[];
  signals?: DetectionSignal[];
  weather?: LiveWeatherData | null;
}): Promise<void> {
  const db = await getTacticalDB();

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(
        [STORES.INCIDENTS, STORES.FORESTS, STORES.WATER_POINTS, STORES.RESOURCES, STORES.APP_META],
        'readwrite'
      );

      // 1. Incidents
      const incStore = tx.objectStore(STORES.INCIDENTS);
      incStore.clear();
      data.incidents.forEach((item) => incStore.put(item));

      // 2. Forests
      const forStore = tx.objectStore(STORES.FORESTS);
      forStore.clear();
      data.forests.forEach((item) => forStore.put(item));

      // 3. Water Points
      const watStore = tx.objectStore(STORES.WATER_POINTS);
      watStore.clear();
      data.waterPoints.forEach((item) => watStore.put(item));

      // 4. Resources
      const resStore = tx.objectStore(STORES.RESOURCES);
      resStore.clear();
      data.resources.forEach((item) => resStore.put(item));

      // 5. Metadata (Signals, Weather, LastSync)
      const metaStore = tx.objectStore(STORES.APP_META);
      const nowIso = new Date().toISOString();
      metaStore.put({ key: 'last_sync_timestamp', value: nowIso });
      if (data.signals) {
        metaStore.put({ key: 'tactical_signals', value: data.signals });
      }
      if (data.weather) {
        metaStore.put({ key: 'live_weather', value: data.weather });
      }

      tx.oncomplete = () => {
        console.log(`[AWIS Tactical IDB] Saved ${data.incidents.length} incidents, ${data.forests.length} forests, ${data.waterPoints.length} water points, ${data.resources.length} resources.`);
        resolve();
      };

      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(new Error('Transaction aborted while saving GIS state to IndexedDB'));
    } catch (err) {
      reject(err);
    }
  });
}

export async function loadAllGISDataIDB(): Promise<{
  incidents: WildfireIncident[];
  forests: ForestZone[];
  waterPoints: WaterPoint[];
  resources: EmergencyResource[];
  signals: DetectionSignal[] | null;
  weather: LiveWeatherData | null;
  lastSync: string | null;
}> {
  const db = await getTacticalDB();

  const [incidents, forests, waterPoints, resources, metaItems] = await Promise.all([
    getAllFromStore<WildfireIncident>(STORES.INCIDENTS),
    getAllFromStore<ForestZone>(STORES.FORESTS),
    getAllFromStore<WaterPoint>(STORES.WATER_POINTS),
    getAllFromStore<EmergencyResource>(STORES.RESOURCES),
    getAllFromStore<{ key: string; value: unknown }>(STORES.APP_META)
  ]);

  const metaMap = new Map<string, unknown>();
  metaItems.forEach((m) => metaMap.set(m.key, m.value));

  return {
    incidents,
    forests,
    waterPoints,
    resources,
    signals: (metaMap.get('tactical_signals') as DetectionSignal[]) || null,
    weather: (metaMap.get('live_weather') as LiveWeatherData) || null,
    lastSync: (metaMap.get('last_sync_timestamp') as string) || null
  };
}

/* ==========================================================================
   Offline Queued Reports Pipeline (G-02 Cloud Sync Integration)
   ========================================================================== */

/**
 * Appends an offline report into the IndexedDB queue
 */
export async function queueReportIDB(report: {
  id?: string;
  type: 'citizen_report' | 'field_note' | 'incident_update';
  payload: Record<string, unknown>;
  timestamp?: string;
}): Promise<IDBQueuedReport> {
  const db = await getTacticalDB();
  const queuedItem: IDBQueuedReport = {
    id: report.id || `offline_rep_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    timestamp: report.timestamp || new Date().toISOString(),
    type: report.type,
    payload: report.payload,
    syncAttempts: 0
  };

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORES.QUEUED_REPORTS, 'readwrite');
      const store = tx.objectStore(STORES.QUEUED_REPORTS);
      store.put(queuedItem);

      tx.oncomplete = () => {
        console.log(`[AWIS Tactical IDB] Queued report ${queuedItem.id} stored in IndexedDB.`);
        resolve(queuedItem);
      };
      tx.onerror = () => reject(tx.error);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Retrieves all reports pending cloud synchronization
 */
export async function getQueuedReportsIDB(): Promise<IDBQueuedReport[]> {
  try {
    return await getAllFromStore<IDBQueuedReport>(STORES.QUEUED_REPORTS);
  } catch (e) {
    console.warn('[AWIS Tactical IDB] Error retrieving queued reports:', e);
    return [];
  }
}

/**
 * Empties the queued reports table after successful Firestore batch commit
 */
export async function clearQueuedReportsIDB(): Promise<void> {
  try {
    const db = await getTacticalDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.QUEUED_REPORTS, 'readwrite');
      const store = tx.objectStore(STORES.QUEUED_REPORTS);
      store.clear();

      tx.oncomplete = () => {
        console.log('[AWIS Tactical IDB] Offline reports queue successfully cleared.');
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[AWIS Tactical IDB] Failed to clear queued reports:', err);
  }
}

/**
 * Removes a specific report by ID after individual reconciliation
 */
export async function removeQueuedReportIDB(id: string): Promise<void> {
  try {
    const db = await getTacticalDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.QUEUED_REPORTS, 'readwrite');
      const store = tx.objectStore(STORES.QUEUED_REPORTS);
      store.delete(id);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn(`[AWIS Tactical IDB] Failed to delete item ${id}:`, err);
  }
}

/* ==========================================================================
   Storage Statistics & Diagnostics
   ========================================================================== */

export async function getTacticalStorageStatsIDB(): Promise<IDBStats> {
  try {
    const [incidentsCount, forestsCount, waterPointsCount, resourcesCount, queuedReportsCount] =
      await Promise.all([
        countStore(STORES.INCIDENTS),
        countStore(STORES.FORESTS),
        countStore(STORES.WATER_POINTS),
        countStore(STORES.RESOURCES),
        countStore(STORES.QUEUED_REPORTS)
      ]);

    const db = await getTacticalDB();
    const lastSync = await new Promise<string | null>((resolve) => {
      try {
        const tx = db.transaction(STORES.APP_META, 'readonly');
        const store = tx.objectStore(STORES.APP_META);
        const req = store.get('last_sync_timestamp');
        req.onsuccess = () => resolve(req.result ? req.result.value : null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });

    let lastSyncFormatted: string | null = null;
    if (lastSync) {
      const d = new Date(lastSync);
      lastSyncFormatted = `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }

    // Estimate storage usage via navigator.storage
    let estimatedStorageUsageMB: number | undefined = undefined;
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        if (estimate.usage) {
          estimatedStorageUsageMB = Number((estimate.usage / (1024 * 1024)).toFixed(2));
        }
      } catch {
        // Safe fallback
      }
    }

    return {
      hasData: incidentsCount > 0 || forestsCount > 0,
      incidentsCount,
      forestsCount,
      waterPointsCount,
      resourcesCount,
      queuedReportsCount,
      lastSyncFormatted,
      estimatedStorageUsageMB
    };
  } catch (err) {
    console.warn('[AWIS Tactical IDB] Failed to get stats:', err);
    return {
      hasData: false,
      incidentsCount: 0,
      forestsCount: 0,
      waterPointsCount: 0,
      resourcesCount: 0,
      queuedReportsCount: 0,
      lastSyncFormatted: null
    };
  }
}

/* ==========================================================================
   G-01 / G-03 Tactical Satellite Hotspot Cache (g01_cache in IndexedDB)
   ========================================================================== */

const IDB_HOTSPOTS_CACHE_KEY = 'g01_cache_firms_hotspots';

/**
 * Persists NASA FIRMS thermal hotspots into IndexedDB for offline access
 */
export async function saveCachedHotspotsIDB<T>(hotspots: T[]): Promise<void> {
  const db = await getTacticalDB();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORES.APP_META, 'readwrite');
      const store = tx.objectStore(STORES.APP_META);
      store.put({
        key: IDB_HOTSPOTS_CACHE_KEY,
        value: {
          timestamp: new Date().toISOString(),
          hotspots
        }
      });
      tx.oncomplete = () => {
        console.log(`[AWIS Tactical IDB] Successfully persisted ${hotspots.length} hotspots to g01_cache.`);
        resolve();
      };
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(new Error('Transaction aborted saving hotspots to IndexedDB'));
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Loads the latest saved NASA FIRMS thermal hotspots from IndexedDB when offline
 */
export async function loadCachedHotspotsIDB<T>(): Promise<T[] | null> {
  try {
    const db = await getTacticalDB();
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORES.APP_META, 'readonly');
        const store = tx.objectStore(STORES.APP_META);
        const req = store.get(IDB_HOTSPOTS_CACHE_KEY);
        req.onsuccess = () => {
          if (req.result && req.result.value && Array.isArray(req.result.value.hotspots)) {
            console.log(`[AWIS Tactical IDB] Loaded ${req.result.value.hotspots.length} hotspots from g01_cache (saved: ${req.result.value.timestamp}).`);
            resolve(req.result.value.hotspots as T[]);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  } catch {
    return null;
  }
}

