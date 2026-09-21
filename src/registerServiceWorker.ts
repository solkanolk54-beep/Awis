/**
 * AWIS Service Worker Registration & Tactical PWA Controller
 * Handles progressive web app registration with safety guards for iframe preview environments.
 */

export interface SWRegistrationStatus {
  registered: boolean;
  active: boolean;
  scope?: string;
  reason?: string;
}

/**
 * Registers the tactical Service Worker if running in a production or standalone environment.
 * Bypasses registration in embedded preview iframes (window.self !== window.top) to preserve Vite HMR.
 */
export async function registerTacticalServiceWorker(): Promise<SWRegistrationStatus> {
  if (typeof window === 'undefined') {
    return { registered: false, active: false, reason: 'SSR environment' };
  }

  // 1. Guard against embedded preview iframes (AI Studio preview iframe sandbox)
  if (window.self !== window.top) {
    console.info('[AWIS PWA] Embedded iframe sandbox detected. Skipping Service Worker registration to preserve live HMR & preview integrity.');
    return { 
      registered: false, 
      active: false, 
      reason: 'Bypassed in embedded preview iframe' 
    };
  }

  // 2. Check Service Worker browser support
  if (!('serviceWorker' in navigator)) {
    console.warn('[AWIS PWA] Service Worker is not supported by this browser.');
    return { 
      registered: false, 
      active: false, 
      reason: 'Browser unsupported' 
    };
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });

    console.info('[AWIS PWA] Tactical Service Worker successfully registered with scope:', registration.scope);

    // Listen for updates
    registration.onupdatefound = () => {
      const installingWorker = registration.installing;
      if (installingWorker) {
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              console.info('[AWIS PWA] New tactical cache content is available; please refresh to update.');
            } else {
              console.info('[AWIS PWA] Content is cached for offline tactical use.');
            }
          }
        };
      }
    };

    return {
      registered: true,
      active: !!registration.active,
      scope: registration.scope
    };
  } catch (error) {
    console.warn('[AWIS PWA] Tactical Service Worker registration notice:', error);
    return {
      registered: false,
      active: false,
      reason: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Safely unregisters all Service Workers (used for resets / cleanups)
 */
export async function unregisterTacticalServiceWorker(): Promise<boolean> {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        await reg.unregister();
      }
      return true;
    } catch {
      return false;
    }
  }
  return false;
}
