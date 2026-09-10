// AWIS — Browser Push Notification & Background Service Worker Alert Engine
// Handles High-Priority Wildfire Alerts even when the app is in the background or minimized

import { WildfireIncident, Language } from '../types';

export interface NotificationSettings {
  pushEnabled: boolean;
  notifyCriticalOnly: boolean;
  notifyEvacuations: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

export interface ExtendedNotificationOptions extends NotificationOptions {
  renotify?: boolean;
  actions?: Array<{ action: string; title: string; icon?: string }>;
  vibrate?: number | number[];
  timestamp?: number;
}

const SETTINGS_STORAGE_KEY = 'awis_notification_settings_v1';
const NOTIFIED_INCIDENTS_KEY = 'awis_notified_incidents_v1';

// Default settings
const DEFAULT_SETTINGS: NotificationSettings = {
  pushEnabled: true,
  notifyCriticalOnly: true,
  notifyEvacuations: true,
  soundEnabled: true,
  vibrationEnabled: true
};

export function getNotificationSettings(): NotificationSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
}

export function saveNotificationSettings(settings: NotificationSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save notification settings:', e);
  }
}

export function isNotificationSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator
  );
}

export function getNotificationPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) {
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const settings = getNotificationSettings();
      settings.pushEnabled = true;
      saveNotificationSettings(settings);
    }
    return permission;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return 'denied';
  }
}

// Tactical Emergency Siren Tone Generator using Web Audio API
export function playEmergencyAlertSound(): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    const now = ctx.currentTime;

    // Siren chirp pattern: 800Hz -> 1200Hz -> 800Hz
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.3);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.45);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.6);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.7);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.75);
  } catch (err) {
    // AudioContext may be restricted by browser autoplay policy
    console.warn('Tactical audio playback skipped:', err);
  }
}

// Build localized title and body for high-priority wildfire incident
export function formatIncidentNotificationPayload(
  incident: WildfireIncident,
  lang: Language = 'ar'
): { title: string; body: string; options: ExtendedNotificationOptions } {
  let title = '';
  let body = '';

  const isExtreme = incident.riskLevel === 'extreme' || incident.riskLevel === 'critical';
  const hasEvacuations = incident.exposedAssets?.some(
    (a) => a.evacuationStatus === 'mandatory' || a.urgency === 'critical'
  );

  if (lang === 'ar') {
    title = isExtreme
      ? `🔥 إنذار أحمر: حريق غابات عالي الخطورة [${incident.wilayaAr || incident.wilaya}]`
      : `⚠️ إنذار عملياتي: بؤرة حريق جديدة [${incident.wilayaAr || incident.wilaya}]`;
    
    body = `📍 قطاع ${incident.locationNameAr || incident.locationName} | الرياح: ${incident.windSpeedKmH} كم/سا (${incident.windDirectionCardinal}) | الحرارة: ${incident.temperatureC}°م. ${
      hasEvacuations ? '🚨 تحذير: إخلاء عاجل للمناطق السكنية المجاورة!' : 'انتشار سريع مرصود عبر الأقمار الصناعية.'
    }`;
  } else if (lang === 'fr') {
    title = isExtreme
      ? `🔥 ALERTE ROUGE: Incendie de Forêt Majeur [${incident.wilaya}]`
      : `⚠️ ALERTE OPÉRATIONNELLE: Foyer d'Incendie [${incident.wilaya}]`;

    body = `📍 Secteur ${incident.locationName} | Vent: ${incident.windSpeedKmH} km/h (${incident.windDirectionCardinal}) | ${incident.temperatureC}°C. ${
      hasEvacuations ? '🚨 Évacuation préventive requise!' : 'Propagation rapide détectée par satellite.'
    }`;
  } else {
    title = isExtreme
      ? `🔥 RED ALERT: High-Priority Wildfire Incident [${incident.wilaya}]`
      : `⚠️ OPERATIONAL ALERT: Active Fire Outbreak [${incident.wilaya}]`;

    body = `📍 Sector ${incident.locationName} | Wind: ${incident.windSpeedKmH} km/h (${incident.windDirectionCardinal}) | ${incident.temperatureC}°C. ${
      hasEvacuations ? '🚨 Urgent evacuation required for exposed settlements!' : 'Rapid spread detected via Sentinel & thermal sensors.'
    }`;
  }

  const options: ExtendedNotificationOptions = {
    body,
    icon: '/fire-alert.svg',
    badge: '/fire-alert.svg',
    tag: `fire-alert-${incident.id}`,
    renotify: true,
    requireInteraction: true,
    vibrate: [300, 150, 300, 150, 450, 200, 600],
    timestamp: Date.now(),
    data: {
      incidentId: incident.id,
      coordinates: incident.coordinates,
      wilaya: incident.wilaya,
      riskLevel: incident.riskLevel,
      url: `/?incidentId=${encodeURIComponent(incident.id)}`
    },
    actions: [
      {
        action: 'view_incident',
        title: lang === 'ar' ? '📍 فتح مركز القيادة (Open GIS)' : lang === 'fr' ? '📍 Ouvrir SIG' : '📍 Open GIS Map'
      },
      {
        action: 'call_14',
        title: lang === 'ar' ? '📞 طوارئ 14 (الحماية المدنية)' : '📞 Call 14 Emergency'
      }
    ]
  };

  return { title, body, options };
}

// Dispatch High-Priority Fire Notification via Service Worker
export async function dispatchHighPriorityFireNotification(
  incident: WildfireIncident,
  lang: Language = 'ar',
  force: boolean = false
): Promise<boolean> {
  if (!isNotificationSupported()) {
    console.warn('Notifications not supported in this environment');
    return false;
  }

  const permission = Notification.permission;
  if (permission !== 'granted') {
    console.log('Notification permission not granted (state:', permission, ')');
    return false;
  }

  const settings = getNotificationSettings();
  if (!force && !settings.pushEnabled) {
    return false;
  }

  if (!force && settings.notifyCriticalOnly && incident.riskLevel !== 'extreme' && incident.riskLevel !== 'critical') {
    return false;
  }

  const { title, options } = formatIncidentNotificationPayload(incident, lang);

  // Play audible tactical alert if enabled
  if (settings.soundEnabled) {
    playEmergencyAlertSound();
  }

  try {
    // 1. Prefer Service Worker registration showNotification (vital for background handling)
    const registration = await navigator.serviceWorker.ready;
    if (registration && registration.showNotification) {
      await registration.showNotification(title, options as NotificationOptions);
      console.log('[AWIS Push] Dispatched high-priority alert via Service Worker:', incident.id);
      return true;
    }

    // 2. Fallback to Service Worker postMessage
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SHOW_FIRE_ALERT',
        title,
        options
      });
      return true;
    }

    // 3. Fallback to classic window Notification API
    new Notification(title, options as NotificationOptions);
    return true;
  } catch (err) {
    console.error('Failed to show notification:', err);
    return false;
  }
}

// Schedule a delayed background notification
// This lets the operator minimize the tab or switch away to verify background alerting
export async function scheduleDelayedBackgroundAlert(
  seconds: number,
  incident: WildfireIncident,
  lang: Language = 'ar'
): Promise<void> {
  const { title, options } = formatIncidentNotificationPayload(incident, lang);
  const delayMs = seconds * 1000;

  try {
    const registration = await navigator.serviceWorker.ready;
    if (registration.active) {
      registration.active.postMessage({
        type: 'SCHEDULE_BACKGROUND_ALERT',
        delayMs,
        title,
        options
      });
      console.log(`[AWIS Push] Scheduled Service Worker background alert in ${seconds}s`);
    } else {
      setTimeout(() => {
        dispatchHighPriorityFireNotification(incident, lang, true);
      }, delayMs);
    }
  } catch (e) {
    setTimeout(() => {
      dispatchHighPriorityFireNotification(incident, lang, true);
    }, delayMs);
  }
}

// Listen for messages from Service Worker (e.g. when user clicks a notification)
export function registerNotificationMessageListener(
  onSelectIncident: (incidentId: string) => void
): () => void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return () => {};
  }

  const handler = (event: MessageEvent) => {
    if (event.data && event.data.type === 'SELECT_INCIDENT_FROM_NOTIFICATION') {
      const id = event.data.incidentId;
      if (id) {
        console.log('[AWIS Push] Received focus request for incident:', id);
        onSelectIncident(id);
      }
    }
  };

  navigator.serviceWorker.addEventListener('message', handler);
  return () => {
    navigator.serviceWorker.removeEventListener('message', handler);
  };
}

// Manage notified cache to avoid spamming the same incident repeatedly
export function markIncidentAsNotified(incidentId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getNotifiedIncidentIds();
    current.add(incidentId);
    localStorage.setItem(NOTIFIED_INCIDENTS_KEY, JSON.stringify(Array.from(current)));
  } catch (e) {}
}

export function getNotifiedIncidentIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(NOTIFIED_INCIDENTS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch (e) {
    return new Set();
  }
}

export function resetNotifiedIncidentsCache(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(NOTIFIED_INCIDENTS_KEY);
  } catch (e) {}
}
