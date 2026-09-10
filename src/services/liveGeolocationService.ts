import { GeoCoordinates } from '../types';

export interface UserLivePosition {
  lat: number;
  lng: number;
  accuracyMeters: number;
  altitudeMeters: number | null;
  headingDegrees: number | null;
  speedMps: number | null;
  timestamp: string;
}

/**
 * Calculates Great-Circle distance in kilometers between two geo coordinates using Haversine formula
 */
export function computeDistanceKm(coord1: GeoCoordinates, coord2: GeoCoordinates): number {
  const R = 6371; // Earth radius in km
  const dLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const dLng = ((coord2.lng - coord1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coord1.lat * Math.PI) / 180) *
      Math.cos((coord2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Calculates initial compass bearing from start to target (0-360 degrees)
 */
export function computeBearingDegrees(start: GeoCoordinates, target: GeoCoordinates): number {
  const startLat = (start.lat * Math.PI) / 180;
  const startLng = (start.lng * Math.PI) / 180;
  const targetLat = (target.lat * Math.PI) / 180;
  const targetLng = (target.lng * Math.PI) / 180;

  const y = Math.sin(targetLng - startLng) * Math.cos(targetLat);
  const x =
    Math.cos(startLat) * Math.sin(targetLat) -
    Math.sin(startLat) * Math.cos(targetLat) * Math.cos(targetLng - startLng);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return Math.round(((brng + 360) % 360));
}

/**
 * Requests high-accuracy current position from browser Geolocation API
 */
export function getLiveDevicePosition(): Promise<UserLivePosition> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation is not supported by your browser or device.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: Number(pos.coords.latitude.toFixed(5)),
          lng: Number(pos.coords.longitude.toFixed(5)),
          accuracyMeters: Math.round(pos.coords.accuracy),
          altitudeMeters: pos.coords.altitude !== null ? Math.round(pos.coords.altitude) : null,
          headingDegrees: pos.coords.heading !== null ? Math.round(pos.coords.heading) : null,
          speedMps: pos.coords.speed !== null ? Math.round(pos.coords.speed * 10) / 10 : null,
          timestamp: new Date(pos.timestamp).toLocaleTimeString()
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
      }
    );
  });
}

/**
 * Subscribes to live GPS updates as the user moves
 */
export function watchLiveDevicePosition(
  onUpdate: (position: UserLivePosition) => void,
  onError?: (err: GeolocationPositionError) => void
): number | null {
  if (!('geolocation' in navigator)) {
    return null;
  }

  return navigator.geolocation.watchPosition(
    (pos) => {
      onUpdate({
        lat: Number(pos.coords.latitude.toFixed(5)),
        lng: Number(pos.coords.longitude.toFixed(5)),
        accuracyMeters: Math.round(pos.coords.accuracy),
        altitudeMeters: pos.coords.altitude !== null ? Math.round(pos.coords.altitude) : null,
        headingDegrees: pos.coords.heading !== null ? Math.round(pos.coords.heading) : null,
        speedMps: pos.coords.speed !== null ? Math.round(pos.coords.speed * 10) / 10 : null,
        timestamp: new Date(pos.timestamp).toLocaleTimeString()
      });
    },
    (err) => {
      if (onError) onError(err);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 12000
    }
  );
}

/**
 * Clears an active GPS position watcher
 */
export function stopWatchingDevicePosition(watchId: number): void {
  if ('geolocation' in navigator && watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
  }
}
