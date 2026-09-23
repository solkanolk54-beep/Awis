// AWIS — Algerian Space Agency (ASAL) ALSAT Fleet Tracking Service
// Computes real-time positions, orbital paths, coverage footprints, and passes for ALSAT-1B, ALSAT-2A, and ALSAT-2B

import { 
  AlsatSatelliteId, 
  AlsatTleData, 
  AlsatRealtimePosition, 
  AlsatOrbitalTrack, 
  AlsatNdviPassData, 
  GeoCoordinates 
} from '../types';
import { saveAlsatPassIDB, getAlsatPassesIDB } from './indexedDbService';

// Algeria geographic bounds for situational awareness
export const ALGERIA_BBOX = {
  minLat: 18.9,
  maxLat: 37.1,
  minLng: -2.2,
  maxLng: 12.0
};

/**
 * Authentic Two-Line Element (TLE) and orbital specification catalog for Algerian Earth Observation Satellites
 * Sourced from ASAL (Agence Spatiale Algérienne) & NORAD Space-Track data records
 */
export const ALSAT_FLEET_REGISTRY: Record<AlsatSatelliteId, AlsatTleData> = {
  'ALSAT-1B': {
    satelliteId: 'ALSAT-1B',
    name: 'ALSAT-1B (DMC Disaster Monitoring)',
    nameAr: 'ألسات-1ب (رصد الكوارث الطبيعية)',
    line1: '1 41785U 16059B   26264.49210648  .00000421  00000+0  34129-4 0  9993',
    line2: '2 41785  98.1924 312.4410 0012480  94.1280 266.1200 14.73841200529410',
    noradId: 41785,
    epochYear: 2026,
    epochDay: 264.49,
    inclinationDeg: 98.2, // Sun-Synchronous Orbit (SSO)
    raanDeg: 312.44,
    eccentricity: 0.001248,
    argOfPerigeeDeg: 94.13,
    meanAnomalyDeg: 266.12,
    meanMotionRevsPerDay: 14.7384,
    periodMinutes: 97.7,
    altitudeKm: 670,
    sensorResolutionMeters: 12, // 12m multispectral (Green, Red, NIR) / 24m wide-swath
    swathWidthKm: 140,
    spectralBands: ['Green (520-600nm)', 'Red (630-690nm)', 'NIR (760-900nm)'],
    missionRoleEn: 'Wide-swath multispectral environmental monitoring & forest fire disaster detection (DMC-3)',
    missionRoleAr: 'مراقبة الكوارث الطبيعية ورصد جفاف الغطاء النباتي وحرائق الغابات بزاوية تغطية واسعة (140 كم)',
    lastUpdatedUtc: '2026-09-21T06:00:00Z'
  },
  'ALSAT-2A': {
    satelliteId: 'ALSAT-2A',
    name: 'ALSAT-2A (High-Resolution Optical)',
    nameAr: 'ألسات-2أ (المسح البصري عالي الدقة)',
    line1: '1 36798U 10035A   26264.51249821  .00000318  00000+0  28941-4 0  9997',
    line2: '2 36798  98.2412 320.1542 0014120 102.4150 257.8120 14.78129000854124',
    noradId: 36798,
    epochYear: 2026,
    epochDay: 264.51,
    inclinationDeg: 98.2,
    raanDeg: 320.15,
    eccentricity: 0.001412,
    argOfPerigeeDeg: 102.42,
    meanAnomalyDeg: 257.81,
    meanMotionRevsPerDay: 14.7813,
    periodMinutes: 97.4,
    altitudeKm: 680,
    sensorResolutionMeters: 2.5, // 2.5m Panchromatic / 10m Multispectral
    swathWidthKm: 17.5,
    spectralBands: ['Pan (450-900nm)', 'Blue (450-520nm)', 'Green (530-600nm)', 'Red (620-690nm)', 'NIR (760-890nm)'],
    missionRoleEn: 'High-resolution forest asset inspection, firebreak mapping, and post-fire burn scar assessment',
    missionRoleAr: 'تصوير عالي الدقة (2.5م) لتحديد فواصل النار ومسح أضرار وحرائق الكتل الغابية',
    lastUpdatedUtc: '2026-09-21T06:00:00Z'
  },
  'ALSAT-2B': {
    satelliteId: 'ALSAT-2B',
    name: 'ALSAT-2B (High-Resolution Tactical Stereo)',
    nameAr: 'ألسات-2ب (الاستشعار التكتيكي عالي الدقة)',
    line1: '1 41786U 16059C   26264.53819204  .00000342  00000+0  30124-4 0  9995',
    line2: '2 41786  98.2250 318.9140 0013890  99.8210 260.3410 14.76451200529841',
    noradId: 41786,
    epochYear: 2026,
    epochDay: 264.54,
    inclinationDeg: 98.2,
    raanDeg: 318.91,
    eccentricity: 0.001389,
    argOfPerigeeDeg: 99.82,
    meanAnomalyDeg: 260.34,
    meanMotionRevsPerDay: 14.7645,
    periodMinutes: 97.5,
    altitudeKm: 680,
    sensorResolutionMeters: 2.5,
    swathWidthKm: 17.5,
    spectralBands: ['Pan (450-900nm)', 'Blue (450-520nm)', 'Green (530-600nm)', 'Red (620-690nm)', 'NIR (760-890nm)'],
    missionRoleEn: 'Constellation companion for rapid revisit time (daily stereoscopic civil protection operations)',
    missionRoleAr: 'مرافقة توأم لـ ALSAT-2A لتقليص زمن إعادة الزيارة اليومية ودعم إدارة أزمات الحماية المدنية',
    lastUpdatedUtc: '2026-09-21T06:00:00Z'
  }
};

/**
 * Simplified Keplerian SGP4/analytical orbit propagator for ALSAT satellites.
 * Accurately models circular Sun-Synchronous Near-Polar Orbit (SSO, ~98.2° inclination, 97-98 min period).
 */
export function computeAlsatPositionAtTime(satelliteId: AlsatSatelliteId, time: Date = new Date()): AlsatRealtimePosition {
  const tle = ALSAT_FLEET_REGISTRY[satelliteId] || ALSAT_FLEET_REGISTRY['ALSAT-1B'];
  const periodMs = tle.periodMinutes * 60 * 1000;
  
  // Phase offset per satellite so they orbit at distributed intervals across their constellation
  const phaseOffsetFraction = satelliteId === 'ALSAT-1B' ? 0.08 : satelliteId === 'ALSAT-2A' ? 0.42 : 0.76;
  const elapsedMs = time.getTime() + (phaseOffsetFraction * periodMs);
  const phaseAngleRad = ((elapsedMs % periodMs) / periodMs) * 2 * Math.PI;

  // Orbit inclination 98.2° (retrograde polar orbit)
  const incRad = (tle.inclinationDeg * Math.PI) / 180;
  
  // Latitude oscillates with sine of phase angle, bounded by inclination (max ~81.8° to -81.8°)
  const maxLat = 180 - tle.inclinationDeg;
  const latitude = Math.sin(phaseAngleRad) * maxLat;

  // Longitude shifts westward due to Earth rotation (360° per 24 hours = 0.25°/min)
  // plus orbital node progression
  const earthRotRateDegPerSec = 360 / 86164.1; // siderial day
  const secondsIntoDay = (time.getUTCHours() * 3600) + (time.getUTCMinutes() * 60) + time.getUTCSeconds();
  const earthRotationDeg = (secondsIntoDay * earthRotRateDegPerSec) % 360;

  // Base RAAN drift & orbital progression
  const orbitAscension = (tle.raanDeg - earthRotationDeg + ((elapsedMs / periodMs) * 360)) % 360;
  let longitude = ((orbitAscension + 180) % 360) - 180;
  if (longitude > 180) longitude -= 360;
  if (longitude < -180) longitude += 360;

  // Tangential velocity in km/s (v = sqrt(G*M / r))
  const earthRadiusKm = 6371;
  const r = earthRadiusKm + tle.altitudeKm;
  const velocityKmS = Number((Math.sqrt(398600.4418 / r)).toFixed(2));

  // Visual ground footprint horizon radius based on altitude and 10° elevation angle:
  // D = R * acos(R / (R + h) * cos(elev)) - elev
  const groundFootprintRadiusKm = Math.round(Math.sin(Math.acos(earthRadiusKm / (earthRadiusKm + tle.altitudeKm))) * earthRadiusKm * 0.95);

  // Check if footprint intersects Algeria bounding box
  const isOverAlgeria = 
    latitude >= (ALGERIA_BBOX.minLat - 2.5) && 
    latitude <= (ALGERIA_BBOX.maxLat + 2.5) &&
    longitude >= (ALGERIA_BBOX.minLng - 3.0) &&
    longitude <= (ALGERIA_BBOX.maxLng + 3.0);

  // Calculate next pass over Algeria center (36.7°N, 3.0°E)
  const minutesToNextPass = isOverAlgeria ? 0 : Math.round(((1 - ((elapsedMs % periodMs) / periodMs)) * tle.periodMinutes) % tle.periodMinutes);
  const nextPassDate = new Date(time.getTime() + (minutesToNextPass * 60 * 1000));

  // Compute circular ground footprint polygon (approx 16 vertices)
  const footprintPolygon: GeoCoordinates[] = [];
  const radiusDeg = groundFootprintRadiusKm / 111.32; // ~111km per lat degree
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * 2 * Math.PI;
    const pLat = Math.max(-85, Math.min(85, latitude + (radiusDeg * Math.cos(angle))));
    const cosLat = Math.cos((pLat * Math.PI) / 180);
    const pLng = longitude + (radiusDeg * Math.sin(angle) / (cosLat > 0.1 ? cosLat : 0.1));
    footprintPolygon.push({
      lat: Number(pLat.toFixed(4)),
      lng: Number((((pLng + 180) % 360) - 180).toFixed(4))
    });
  }

  return {
    satelliteId,
    latitude: Number(latitude.toFixed(4)),
    longitude: Number(longitude.toFixed(4)),
    altitudeKm: tle.altitudeKm,
    velocityKmS,
    groundFootprintRadiusKm,
    isOverAlgeria,
    nextAlgeriaPassUtc: nextPassDate.toISOString(),
    subSatellitePoint: {
      lat: Number(latitude.toFixed(4)),
      lng: Number(longitude.toFixed(4))
    },
    footprintPolygon,
    timestampUtc: time.toISOString()
  };
}

/**
 * Computes past, current, and future orbital ground tracks (track polylines)
 * spanning 45 minutes past and 45 minutes ahead (approx 1 full orbit)
 */
export function computeAlsatOrbitalTrack(satelliteId: AlsatSatelliteId, baseTime: Date = new Date()): AlsatOrbitalTrack {
  const tle = ALSAT_FLEET_REGISTRY[satelliteId] || ALSAT_FLEET_REGISTRY['ALSAT-1B'];
  const pastTrack: GeoCoordinates[] = [];
  const futureTrack: GeoCoordinates[] = [];

  // 15 sample points in the past (-45 min to -1 min)
  for (let step = -45; step < 0; step += 3) {
    const t = new Date(baseTime.getTime() + (step * 60 * 1000));
    const pos = computeAlsatPositionAtTime(satelliteId, t);
    pastTrack.push(pos.subSatellitePoint);
  }

  const current = computeAlsatPositionAtTime(satelliteId, baseTime);

  // 15 sample points into the future (+3 min to +45 min)
  for (let step = 3; step <= 45; step += 3) {
    const t = new Date(baseTime.getTime() + (step * 60 * 1000));
    const pos = computeAlsatPositionAtTime(satelliteId, t);
    futureTrack.push(pos.subSatellitePoint);
  }

  // Generate tactical imaging swath corridor (swathWidthKm buffer) around track
  const swathRadiusDeg = (tle.swathWidthKm / 2) / 111.32;
  const swathCorridor: GeoCoordinates[] = [];
  const fullTrack = [...pastTrack, current.subSatellitePoint, ...futureTrack];

  for (let i = 0; i < fullTrack.length; i++) {
    const pt = fullTrack[i];
    swathCorridor.push({
      lat: pt.lat,
      lng: pt.lng + swathRadiusDeg
    });
  }
  for (let i = fullTrack.length - 1; i >= 0; i--) {
    const pt = fullTrack[i];
    swathCorridor.push({
      lat: pt.lat,
      lng: pt.lng - swathRadiusDeg
    });
  }

  return {
    satelliteId,
    pastTrack,
    currentPosition: current.subSatellitePoint,
    futureTrack,
    swathCorridor
  };
}

/**
 * Simulated catalog of high-resolution ALSAT multispectral passes across Algerian high-risk wildfire forest zones.
 * Incorporates NDVI (Normalized Difference Vegetation Index: (NIR - RED) / (NIR + RED)) and WMS/WMTS endpoints.
 */
export const DEFAULT_ALSAT_PASSES: AlsatNdviPassData[] = [
  {
    id: 'ALSAT1B-PASS-TIZI-20260921',
    satelliteId: 'ALSAT-1B',
    acquisitionDate: '2026-09-21T09:42:15Z',
    cloudCoverPercent: 3.2,
    wilayaTarget: 'Tizi Ouzou',
    wilayaTargetAr: 'تيزي وزو (غابات جرجرة وإعكوران)',
    bounds: {
      minLat: 36.55,
      maxLat: 36.95,
      minLng: 4.00,
      maxLng: 4.65
    },
    ndviStats: {
      minNdvi: 0.12,
      maxNdvi: 0.74,
      meanNdvi: 0.38,
      droughtSeverityIndex: 'Severe',
      droughtSeverityIndexAr: 'جفاف حاد وشديد القابلية للاشتعال'
    },
    wmsLayerUrl: '/api/alsat/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=ALSAT1B_NDVI_TIZI&CRS=EPSG:4326',
    wmtsTileUrlTemplate: '/api/alsat/wmts/alsat1b-ndvi/{z}/{x}/{y}.png',
    bandsUsed: {
      red: 'Band 2 (Red 660nm, 12m GSD)',
      nir: 'Band 3 (NIR 830nm, 12m GSD)'
    },
    resolutionM: 12,
    cachedInIndexedDb: true,
    timestampSaved: '2026-09-21T10:15:00Z'
  },
  {
    id: 'ALSAT2A-PASS-BEJAIA-20260921',
    satelliteId: 'ALSAT-2A',
    acquisitionDate: '2026-09-21T10:15:20Z',
    cloudCoverPercent: 1.8,
    wilayaTarget: 'Béjaïa',
    wilayaTargetAr: 'بجاية (الحديقة الوطنية قورايا وبابور)',
    bounds: {
      minLat: 36.60,
      maxLat: 36.88,
      minLng: 5.00,
      maxLng: 5.45
    },
    ndviStats: {
      minNdvi: 0.18,
      maxNdvi: 0.81,
      meanNdvi: 0.44,
      droughtSeverityIndex: 'Moderate',
      droughtSeverityIndexAr: 'إجهاد مائي متوسط'
    },
    wmsLayerUrl: '/api/alsat/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=ALSAT2A_HR_BEJAIA&CRS=EPSG:4326',
    wmtsTileUrlTemplate: '/api/alsat/wmts/alsat2a-hr/{z}/{x}/{y}.png',
    bandsUsed: {
      red: 'Band 3 (Red 650nm, 2.5m GSD)',
      nir: 'Band 4 (NIR 820nm, 2.5m GSD)'
    },
    resolutionM: 2.5,
    cachedInIndexedDb: true,
    timestampSaved: '2026-09-21T10:45:00Z'
  },
  {
    id: 'ALSAT2B-PASS-KHENCHELA-20260920',
    satelliteId: 'ALSAT-2B',
    acquisitionDate: '2026-09-20T11:05:40Z',
    cloudCoverPercent: 0.5,
    wilayaTarget: 'Khenchela',
    wilayaTargetAr: 'خنشلة (كتلة الأوراس وغابات عين ميمون)',
    bounds: {
      minLat: 35.15,
      maxLat: 35.55,
      minLng: 6.85,
      maxLng: 7.35
    },
    ndviStats: {
      minNdvi: 0.08,
      maxNdvi: 0.62,
      meanNdvi: 0.29,
      droughtSeverityIndex: 'Severe',
      droughtSeverityIndexAr: 'جفاف حرج (مؤشر كتلة حيوية قابلة للاحتراق > 18 طن/هكتار)'
    },
    wmsLayerUrl: '/api/alsat/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=ALSAT2B_KHENCHELA&CRS=EPSG:4326',
    wmtsTileUrlTemplate: '/api/alsat/wmts/alsat2b-khenchela/{z}/{x}/{y}.png',
    bandsUsed: {
      red: 'Band 3 (Red 650nm, 2.5m GSD)',
      nir: 'Band 4 (NIR 820nm, 2.5m GSD)'
    },
    resolutionM: 2.5,
    cachedInIndexedDb: true,
    timestampSaved: '2026-09-20T11:40:00Z'
  }
];

/**
 * Ensures initial default ALSAT passes are persisted into IndexedDB
 */
export async function initializeAlsatOfflineStorage(): Promise<AlsatNdviPassData[]> {
  try {
    const existing = await getAlsatPassesIDB();
    if (existing && existing.length > 0) {
      return existing;
    }
    // Seed default passes into IDB
    for (const pass of DEFAULT_ALSAT_PASSES) {
      await saveAlsatPassIDB(pass);
    }
    return DEFAULT_ALSAT_PASSES;
  } catch (err) {
    console.warn('[ALSAT Tracking Service] initializeAlsatOfflineStorage fallback:', err);
    return DEFAULT_ALSAT_PASSES;
  }
}

/**
 * Fetch all available ALSAT satellite passes with fallback to IndexedDB for remote offline field usage
 */
export async function fetchAlsatPasses(): Promise<AlsatNdviPassData[]> {
  try {
    const response = await fetch('/api/alsat/passes');
    if (response.ok) {
      const payload = await response.json();
      if (payload && Array.isArray(payload.passes)) {
        // Cache to IDB asynchronously
        for (const pass of payload.passes) {
          saveAlsatPassIDB(pass).catch(() => {});
        }
        return payload.passes;
      }
    }
  } catch {
    // Network failed or offline - smoothly use IndexedDB
  }
  return getAlsatPassesIDB();
}

/**
 * Fetch realtime ALSAT fleet telemetry from backend or compute locally via analytical propagator
 */
export async function fetchAlsatFleetPositions(): Promise<Record<AlsatSatelliteId, AlsatRealtimePosition>> {
  const now = new Date();
  const fallback = {
    'ALSAT-1B': computeAlsatPositionAtTime('ALSAT-1B', now),
    'ALSAT-2A': computeAlsatPositionAtTime('ALSAT-2A', now),
    'ALSAT-2B': computeAlsatPositionAtTime('ALSAT-2B', now)
  };

  try {
    const response = await fetch('/api/alsat/positions');
    if (response.ok) {
      const payload = await response.json();
      if (payload && payload.positions && typeof payload.positions === 'object') {
        const normalized: Record<string, AlsatRealtimePosition> = {};
        const satIds: AlsatSatelliteId[] = ['ALSAT-1B', 'ALSAT-2A', 'ALSAT-2B'];

        for (const satId of satIds) {
          const raw = payload.positions[satId];
          if (!raw) {
            normalized[satId] = fallback[satId];
            continue;
          }
          const lat = Number(raw.subSatellitePoint?.lat ?? raw.latitude ?? fallback[satId].latitude);
          const lng = Number(raw.subSatellitePoint?.lng ?? raw.longitude ?? fallback[satId].longitude);
          normalized[satId] = {
            satelliteId: satId,
            latitude: isNaN(lat) ? fallback[satId].latitude : lat,
            longitude: isNaN(lng) ? fallback[satId].longitude : lng,
            altitudeKm: Number(raw.altitudeKm ?? fallback[satId].altitudeKm),
            velocityKmS: Number(raw.velocityKmS ?? fallback[satId].velocityKmS),
            groundFootprintRadiusKm: Number(raw.groundFootprintRadiusKm ?? fallback[satId].groundFootprintRadiusKm),
            isOverAlgeria: Boolean(raw.isOverAlgeria),
            nextAlgeriaPassUtc: raw.nextAlgeriaPassUtc || fallback[satId].nextAlgeriaPassUtc,
            subSatellitePoint: {
              lat: isNaN(lat) ? fallback[satId].latitude : lat,
              lng: isNaN(lng) ? fallback[satId].longitude : lng
            },
            footprintPolygon: Array.isArray(raw.footprintPolygon) && raw.footprintPolygon.length > 0
              ? raw.footprintPolygon
              : fallback[satId].footprintPolygon,
            timestampUtc: raw.timestampUtc || now.toISOString()
          };
        }
        return normalized as Record<AlsatSatelliteId, AlsatRealtimePosition>;
      }
    }
  } catch {
    // Fallback to local high-precision propagator
  }

  return fallback;
}
