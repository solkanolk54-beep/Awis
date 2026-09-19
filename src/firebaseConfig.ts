import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  signInAnonymously,
  onAuthStateChanged,
  User as FirebaseUser
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

// 1. Initialize Firebase App (Singleton pattern)
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// 2. Initialize Firestore with Offline IndexedDB Persistence Enabled
// Enables multi-tab offline caching and background synchronization
let firestoreDb: Firestore;
try {
  firestoreDb = initializeFirestore(
    app,
    {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    },
    firebaseConfig.firestoreDatabaseId
  );
} catch {
  // If Firestore is already initialized with settings, reuse instance
  firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);
}

export const db: Firestore = firestoreDb;
export const auth = getAuth(app);

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
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return { connected: true, message: 'Cloud Firestore connected' };
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore is running in persistent offline-first mode.');
      return { connected: false, message: 'Offline mode active (IndexedDB persistence enabled)' };
    }
    return { connected: false, message: error instanceof Error ? error.message : 'Unknown connection state' };
  }
}

// Auto-run connection probe on module load
testFirestoreConnection().catch(() => {});

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
      onError?.(error);
      handleFirestoreError(error, OperationType.LIST, INCIDENTS_COLLECTION);
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
      onError?.(error);
      handleFirestoreError(error, OperationType.LIST, RESOURCES_COLLECTION);
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

// 6. Firebase Auth & Role-Based Access Control (RBAC) Cloud Sync

const USERS_COLLECTION = 'users';

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

/**
 * Sign in with Google Popup (Firebase Auth)
 */
export async function signInWithGoogle(): Promise<FirebaseUser> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Google Sign-In Error:', error);
    throw error;
  }
}

/**
 * Sign in Anonymously / Guest fallback
 */
export async function signInAnonymouslyUser(): Promise<FirebaseUser> {
  try {
    const result = await signInAnonymously(auth);
    return result.user;
  } catch (error) {
    console.error('Anonymous Sign-In Error:', error);
    throw error;
  }
}

/**
 * Sign out current Firebase Auth user
 */
export async function signOutCurrentUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign Out Error:', error);
    throw error;
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

