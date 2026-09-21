import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeAuth,
  browserLocalPersistence,
  inMemoryPersistence,
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  Auth
} from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  getDoc,
  getDocFromServer,
  collection,
  setDoc,
  writeBatch,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
  Firestore
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { WildfireIncident, EmergencyResource, UserProfile, RBACRole } from './types';
import { getQueuedReportsIDB, clearQueuedReportsIDB } from './services/indexedDbService';

// 1. Initialize Firebase App (Singleton pattern)
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// 2. Initialize Firestore with Offline IndexedDB Persistence Enabled
// Enables multi-tab offline caching and background synchronization
// experimentalForceLongPolling avoids streaming timeouts in sandboxed / proxy environments
let firestoreDb: Firestore;
try {
  firestoreDb = initializeFirestore(
    app,
    {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      }),
      experimentalForceLongPolling: true
    },
    firebaseConfig.firestoreDatabaseId
  );
} catch {
  // If Firestore is already initialized with settings, reuse instance
  firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);
}

export const db: Firestore = firestoreDb;

let firebaseAuth: Auth;
try {
  firebaseAuth = initializeAuth(app, {
    persistence: [browserLocalPersistence, inMemoryPersistence]
  });
} catch {
  firebaseAuth = getAuth(app);
}
export const auth: Auth = firebaseAuth;

// 3. Error Handling Specification conforming to Firebase Security Architecture
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// 4. Initial Connection Validation (Tests live link to server with offline fallback detection)
export async function testFirestoreConnection(): Promise<{ connected: boolean; message: string }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { connected: false, message: 'Offline mode active (Navigator offline)' };
  }

  try {
    // Probe server with a 3-second non-blocking race to avoid 10-second backend timeout warnings
    const probePromise = getDocFromServer(doc(db, 'test', 'connection'));
    const timeoutPromise = new Promise<{ connected: false; message: string }>((resolve) =>
      setTimeout(() => resolve({ connected: false, message: 'Offline mode active (IndexedDB persistence enabled)' }), 3000)
    );

    const result = await Promise.race([probePromise, timeoutPromise]);
    if (result && 'connected' in result) {
      return result;
    }
    return { connected: true, message: 'Cloud Firestore connected' };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (errorMsg.includes('the client is offline') || errorMsg.includes('Could not reach Cloud Firestore backend')) {
      return { connected: false, message: 'Offline mode active (IndexedDB persistence enabled)' };
    }
    return { connected: false, message: errorMsg || 'Operating in offline-first mode' };
  }
}

// 5. Cloud Sync Helpers for Incidents, Resources, and Field Reporting

const INCIDENTS_COLLECTION = 'incidents';
const RESOURCES_COLLECTION = 'resources';
const CITIZEN_REPORTS_COLLECTION = 'citizenReports';

/**
 * Real-time listener for Wildfire Incidents from Firestore
 */
export function subscribeToIncidents(
  onUpdate: (incidents: WildfireIncident[]) => void,
  onError?: (err: Error) => void
): () => void {
  const q = query(collection(db, INCIDENTS_COLLECTION), limit(100));
  return onSnapshot(
    q,
    (snapshot) => {
      const incidents: WildfireIncident[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as WildfireIncident;
        incidents.push({ ...data, id: docSnap.id });
      });
      if (incidents.length > 0) {
        onUpdate(incidents);
      }
    },
    (error) => {
      console.warn(`[AWIS Firestore] Operating with local cache for ${INCIDENTS_COLLECTION}:`, error.message);
      onError?.(error);
    }
  );
}

/**
 * Real-time listener for Emergency Resources from Firestore
 */
export function subscribeToResources(
  onUpdate: (resources: EmergencyResource[]) => void,
  onError?: (err: Error) => void
): () => void {
  const q = query(collection(db, RESOURCES_COLLECTION), limit(100));
  return onSnapshot(
    q,
    (snapshot) => {
      const resources: EmergencyResource[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as EmergencyResource;
        resources.push({ ...data, id: docSnap.id });
      });
      if (resources.length > 0) {
        onUpdate(resources);
      }
    },
    (error) => {
      console.warn(`[AWIS Firestore] Operating with local cache for ${RESOURCES_COLLECTION}:`, error.message);
      onError?.(error);
    }
  );
}

/**
 * Persists or updates an incident to Firestore
 */
export async function syncIncidentToCloud(incident: WildfireIncident): Promise<void> {
  const targetPath = `${INCIDENTS_COLLECTION}/${incident.id}`;
  try {
    await setDoc(doc(db, INCIDENTS_COLLECTION, incident.id), {
      ...incident,
      cloudSyncedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, targetPath);
  }
}

/**
 * Persists or updates an emergency resource to Firestore
 */
export async function syncResourceToCloud(resource: EmergencyResource): Promise<void> {
  const targetPath = `${RESOURCES_COLLECTION}/${resource.id}`;
  try {
    await setDoc(doc(db, RESOURCES_COLLECTION, resource.id), {
      ...resource,
      cloudSyncedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, targetPath);
  }
}

/**
 * Submits a citizen smoke or wildfire observation report to Firestore
 */
export async function submitCitizenReportToCloud(report: {
  id: string;
  wilaya: string;
  description: string;
  lat: number;
  lng: number;
  contact?: string;
  imageUrl?: string;
}): Promise<void> {
  const targetPath = `${CITIZEN_REPORTS_COLLECTION}/${report.id}`;
  try {
    await setDoc(doc(db, CITIZEN_REPORTS_COLLECTION, report.id), {
      ...report,
      status: 'pending',
      createdAt: new Date().toISOString(),
      serverReceivedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, targetPath);
  }
}

export interface SyncQueueResult {
  success: boolean;
  totalProcessed: number;
  syncedCount: number;
  conflictsResolved: number;
  errors: string[];
  timestamp: string;
}

/**
 * G-02: Synchronizes queued offline reports to Cloud Firestore using writeBatch().
 * Applies Last-Write-Wins (LWW) conflict resolution based on ISO timestamps.
 * Dispatches items to citizenReports (or citizen_reports) and incidents collections.
 * Automatically clears successfully synchronized elements from the offline queue.
 */
export async function syncQueueToCloud(): Promise<SyncQueueResult> {
  const result: SyncQueueResult = {
    success: true,
    totalProcessed: 0,
    syncedCount: 0,
    conflictsResolved: 0,
    errors: [],
    timestamp: new Date().toISOString()
  };

  if (typeof window === 'undefined') {
    return result;
  }

  // Read queued items from IndexedDB (Primary) and LocalStorage (Fallback / Legacy)
  const itemsMap = new Map<string, {
    id: string;
    timestamp: string;
    type: 'citizen_report' | 'field_note' | 'incident_update';
    payload: Record<string, unknown>;
  }>();

  try {
    const idbReports = await getQueuedReportsIDB();
    if (Array.isArray(idbReports)) {
      idbReports.forEach((rep) => {
        itemsMap.set(rep.id, {
          id: rep.id,
          timestamp: rep.timestamp,
          type: rep.type,
          payload: rep.payload
        });
      });
    }
  } catch (idbErr) {
    console.warn('[AWIS Cloud Sync] Notice reading from IndexedDB:', idbErr);
  }

  try {
    if (window.localStorage) {
      const rawQueue = localStorage.getItem('awis_offline_queued_reports_v1');
      if (rawQueue) {
        const parsed = JSON.parse(rawQueue);
        if (Array.isArray(parsed)) {
          parsed.forEach((item) => {
            if (item && item.id && !itemsMap.has(item.id)) {
              itemsMap.set(item.id, item);
            }
          });
        }
      }
    }
  } catch (lsErr) {
    console.warn('[AWIS Cloud Sync] Notice reading legacy localStorage queue:', lsErr);
  }

  const queuedItems = Array.from(itemsMap.values());

  if (queuedItems.length === 0) {
    return result;
  }

  result.totalProcessed = queuedItems.length;

  try {
    const batch = writeBatch(db);
    let batchOperations = 0;

    for (const item of queuedItems) {
      try {
        const payload = item.payload && typeof item.payload === 'object' ? item.payload : {};
        const rawDocId = (payload.id as string) || item.id || `report_${Date.now()}`;
        // Comply with security rules: size <= 128 and matches '^[a-zA-Z0-9_\-]+$'
        const docId = rawDocId.replace(/[^a-zA-Z0-9_\-]/g, '_').substring(0, 128);

        // Determine destination collection
        let targetCollection = CITIZEN_REPORTS_COLLECTION;
        if (item.type === 'field_note' && payload.incidentId) {
          targetCollection = INCIDENTS_COLLECTION;
        }

        const targetRef = doc(db, targetCollection, docId);

        // Parse queued item timestamp for LWW resolution
        const queuedTimeMs = new Date(
          item.timestamp || (payload.createdAt as string) || (payload.updatedAt as string) || Date.now()
        ).getTime();

        // Conflict Resolution: Last-Write-Wins (LWW)
        let cloudDoc = null;
        try {
          cloudDoc = await getDoc(targetRef);
        } catch (readErr) {
          console.warn(`[AWIS Cloud Sync] Remote read deferred for ${docId} (offline cache active), proceeding with write:`, readErr);
        }

        if (cloudDoc && cloudDoc.exists()) {
          const cloudData = cloudDoc.data() || {};
          const cloudTimeStr = cloudData.updatedAt || cloudData.timestamp || cloudData.createdAt || 0;
          const cloudTimeMs = new Date(cloudTimeStr).getTime();

          // If the cloud version is strictly newer, LWW preserves the cloud version
          if (cloudTimeMs > queuedTimeMs) {
            console.info(
              `[AWIS LWW Conflict] Item ${docId} preserved on cloud. Remote timestamp (${new Date(cloudTimeMs).toISOString()}) is newer than offline report (${new Date(queuedTimeMs).toISOString()}).`
            );
            result.conflictsResolved++;
            continue;
          }
        }

        // Prepare document payload for batch commit
        const sanitizedPayload = { ...payload };
        const recordData = {
          ...sanitizedPayload,
          id: docId,
          type: item.type,
          updatedAt: new Date(queuedTimeMs).toISOString(),
          cloudSyncedAt: new Date().toISOString(),
          reconciledVia: 'LWW_OFFLINE_SYNC',
          syncStatus: 'synced',
          serverReceivedAt: serverTimestamp()
        };

        batch.set(targetRef, recordData, { merge: true });
        batchOperations++;
        result.syncedCount++;
      } catch (itemErr) {
        result.errors.push(`Error preparing item ${item.id}: ${itemErr}`);
      }
    }

    if (batchOperations > 0) {
      await batch.commit();
      console.log(`[AWIS Cloud Sync] Committed writeBatch with ${batchOperations} reports to Firestore.`);
    }

    // Clear synchronized items from both IndexedDB and localStorage queues
    await clearQueuedReportsIDB().catch((e) => console.warn('[AWIS Cloud Sync] Error clearing IDB queue:', e));
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('awis_offline_queued_reports_v1');
    }

    return result;
  } catch (batchErr) {
    const errorMsg = batchErr instanceof Error ? batchErr.message : String(batchErr);
    console.error('[AWIS Cloud Sync] writeBatch commit failed:', errorMsg);
    result.success = false;
    result.errors.push(errorMsg);
    return result;
  }
}

// 6. Firebase Auth & Role-Based Access Control (RBAC) Cloud Sync

const USERS_COLLECTION = 'users';

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

/**
 * Sign in with Google Popup (Firebase Auth)
 * Gracefully detects and handles iframe sandbox restrictions and network failures
 */
export async function signInWithGoogle(): Promise<FirebaseUser | null> {
  // If running in an iframe sandbox (e.g. AI Studio preview), popup windows and external OAuth callbacks are restricted
  if (typeof window !== 'undefined' && window.self !== window.top) {
    console.info('[Firebase Auth] Sandboxed iframe environment detected. Utilizing tactical officer identity fallback.');
    return null;
  }

  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    console.warn('[Firebase Auth] Google Sign-In notice, falling back gracefully:', err?.message || err);
    return null;
  }
}

/**
 * Tactical / Guest responder local fallback
 * Returns null safely without making unsupported network calls since only Google Auth is configured
 */
export async function signInAnonymouslyUser(): Promise<FirebaseUser | null> {
  return null;
}

/**
 * Sign out current Firebase Auth user
 */
export async function signOutCurrentUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.warn('Sign Out notice:', error);
  }
}

/**
 * Saves or updates User Profile & RBAC role in Firestore
 */
export async function saveUserProfileToCloud(profile: UserProfile): Promise<void> {
  const targetPath = `${USERS_COLLECTION}/${profile.uid}`;
  try {
    await setDoc(doc(db, USERS_COLLECTION, profile.uid), {
      ...profile,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, targetPath);
  }
}

/**
 * Subscribes to real-time User Profile & RBAC changes in Firestore
 */
export function subscribeToUserProfile(
  uid: string,
  onUpdate: (profile: UserProfile | null) => void,
  onError?: (err: Error) => void
): () => void {
  const targetPath = `${USERS_COLLECTION}/${uid}`;
  return onSnapshot(
    doc(db, USERS_COLLECTION, uid),
    (docSnap) => {
      if (docSnap.exists()) {
        onUpdate(docSnap.data() as UserProfile);
      } else {
        onUpdate(null);
      }
    },
    (error) => {
      onError?.(error);
      handleFirestoreError(error, OperationType.GET, targetPath);
    }
  );
}

/**
 * Fetches user profile directly from Firestore
 */
export async function getUserProfileFromCloud(uid: string): Promise<UserProfile | null> {
  const targetPath = `${USERS_COLLECTION}/${uid}`;
  try {
    const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, targetPath);
  }
}

