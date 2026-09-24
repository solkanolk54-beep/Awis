// AWIS — Tactical UAV Drone Reconnaissance & Wildfire Thermal/RGB Feed Engine
// Algerian Civil Protection & DGF Wildfire Airborne Surveillance

import { 
  WildfireIncident, 
  DroneMissionState, 
  DroneCameraMode, 
  DroneThermalPalette, 
  DroneFlightPattern,
  DroneTacticalAssessment,
  GeoCoordinates 
} from '../types';

export interface HotspotPoint {
  id: string;
  xPercent: number; // 0-100 on screen/feed
  yPercent: number;
  tempC: number;
  label: string;
  labelAr: string;
  type: 'core' | 'front' | 'ember' | 'unburned' | 'structure';
}

// Compute tactical wildfire intensity assessment based on incident thermodynamics
export function computeDroneTacticalAssessment(incident?: Partial<WildfireIncident> | null): DroneTacticalAssessment {
  const safeInc = incident || {};
  const riskLevel = safeInc.riskLevel || 'high';
  const isExtreme = riskLevel === 'extreme' || riskLevel === 'critical';
  const isHigh = riskLevel === 'high';

  const tempC = safeInc.temperatureC ?? 36;
  const windSpeed = safeInc.windSpeedKmH ?? 28;
  const slope = safeInc.terrainSlopeDegrees ?? 18;
  const burnedHa = safeInc.estimatedBurnedHectares ?? 24;
  const coords = safeInc.coordinates || { lat: 36.784, lng: 5.719 };
  const windDegrees = safeInc.windDirectionDegrees ?? 225;

  // Base flame temperature calculation based on temperature, slope, wind
  const baseTemp = 450 + (tempC * 4.5) + (windSpeed * 3.2) + (slope * 2.8);
  const maxHotspotTempC = Math.round(isExtreme ? Math.max(780, baseTemp) : isHigh ? Math.max(620, baseTemp) : 520);
  const flameFrontTempC = Math.round(maxHotspotTempC * 0.82);
  const ambientTempC = Math.round(tempC || 36);

  // Fire Radiative Power (MW) based on burned hectares & wind
  const frpBase = (burnedHa * 8.5) + (windSpeed * 3.4);
  const fireRadiativePowerMw = Math.round(isExtreme ? Math.max(240, frpBase) : Math.max(90, frpBase));

  // Rate of spread (meters / minute)
  const spreadRateMMin = Number(
    (0.4 * Math.exp(0.069 * windSpeed) * (1 + Math.sin((slope * Math.PI) / 180))).toFixed(1)
  );

  // Fire intensity classification
  let intensityClass: DroneTacticalAssessment['intensityClass'] = 'Surface Moderate' as any;
  if (fireRadiativePowerMw > 220 || maxHotspotTempC > 750) {
    intensityClass = 'Catastrophic Crown';
  } else if (fireRadiativePowerMw > 120 || maxHotspotTempC > 600) {
    intensityClass = 'Crown Moderate';
  } else if (maxHotspotTempC > 450) {
    intensityClass = 'Surface High';
  } else {
    intensityClass = 'Surface Low';
  }

  // Flame height estimate (m)
  const flameHeightMeters = Number(
    (0.0775 * Math.pow(fireRadiativePowerMw * 2.5, 0.46)).toFixed(1)
  );

  // Optimal Water Dropping Point: Advance 120-200 meters ahead of fire center in the wind direction
  // to establish a wet retardant firebreak line ahead of the active front
  const windRad = (windDegrees * Math.PI) / 180;
  const advanceDistDeg = 0.0022; // approx 240 meters
  const dropLat = coords.lat + Math.cos(windRad) * advanceDistDeg;
  const dropLng = coords.lng + Math.sin(windRad) * advanceDistDeg;

  return {
    maxHotspotTempC,
    flameFrontTempC,
    ambientTempC,
    fireRadiativePowerMw,
    spreadRateMMin,
    intensityClass,
    recommendedDropPoint: {
      lat: Number(dropLat.toFixed(5)),
      lng: Number(dropLng.toFixed(5))
    },
    flameHeightMeters: Math.max(4.5, flameHeightMeters),
    isothermActive: true,
    deHazeActive: true
  };
}

// Generate realistic simulated hotspot telemetry points for an incident's camera feed
export function generateHotspotPoints(
  incident?: Partial<WildfireIncident> | null,
  assessment?: DroneTacticalAssessment | null
): HotspotPoint[] {
  const safeInc = incident || {};
  const safeAssessment = assessment || computeDroneTacticalAssessment(safeInc);
  // Offset relative to wind direction
  const windDir = safeInc.windDirectionDegrees ?? 225;
  const windAngleRad = ((windDir - 90) * Math.PI) / 180;

  const coreX = 50 + Math.cos(windAngleRad) * 4;
  const coreY = 50 + Math.sin(windAngleRad) * 4;

  const frontX = 50 + Math.cos(windAngleRad) * 18;
  const frontY = 50 + Math.sin(windAngleRad) * 18;

  const rearX = 50 - Math.cos(windAngleRad) * 16;
  const rearY = 50 - Math.sin(windAngleRad) * 16;

  return [
    {
      id: 'spot-core',
      xPercent: Math.min(85, Math.max(15, coreX)),
      yPercent: Math.min(85, Math.max(15, coreY)),
      tempC: safeAssessment.maxHotspotTempC,
      label: 'MAX CORE FLAME',
      labelAr: 'بؤرة اللهب القصوى',
      type: 'core'
    },
    {
      id: 'spot-front',
      xPercent: Math.min(85, Math.max(15, frontX)),
      yPercent: Math.min(85, Math.max(15, frontY)),
      tempC: safeAssessment.flameFrontTempC,
      label: 'ACTIVE FRONT',
      labelAr: 'جبهة التقدم النشطة',
      type: 'front'
    },
    {
      id: 'spot-flank',
      xPercent: Math.min(85, Math.max(15, coreX - 18)),
      yPercent: Math.min(85, Math.max(15, coreY + 12)),
      tempC: Math.round(safeAssessment.flameFrontTempC * 0.76),
      label: 'LEFT FLANK',
      labelAr: 'الجناح الأيسر',
      type: 'front'
    },
    {
      id: 'spot-ember',
      xPercent: Math.min(85, Math.max(15, rearX)),
      yPercent: Math.min(85, Math.max(15, rearY)),
      tempC: Math.round(safeAssessment.maxHotspotTempC * 0.38),
      label: 'SMOLDERING SCAR',
      labelAr: 'رماد وجمر مشتعل',
      type: 'ember'
    },
    {
      id: 'spot-ambient',
      xPercent: 22,
      yPercent: 78,
      tempC: safeAssessment.ambientTempC,
      label: 'CANOPY AMBIENT',
      labelAr: 'حرارة الغابة الطبيعية',
      type: 'unburned'
    }
  ];
}

// Default initial drone mission state
export function createInitialDroneMission(incident?: Partial<WildfireIncident> | null): DroneMissionState {
  const safeInc = incident || {};
  const assessment = computeDroneTacticalAssessment(safeInc);

  return {
    droneId: 'UAV-DZ-04',
    droneName: 'Tactical Recon Thermal Drone DZ-04',
    model: 'ALGIS-CH4 Dual Thermal/RGB UAV',
    activeIncidentId: safeInc.id || 'INC-01',
    cameraMode: 'thermal',
    thermalPalette: 'ironbow',
    flightPattern: 'orbit',
    altitudeMeters: 320,
    headingDegrees: 42,
    speedKmH: 48,
    batteryPercent: 86,
    signalStrengthPercent: 97,
    zoomLevel: 1.0,
    gimbalPitch: -45,
    isLayerVisibleOnMap: true,
    assessment
  };
}

// Thermal palette CSS gradient representations
export const THERMAL_PALETTES = {
  ironbow: {
    name: 'Ironbow (قوس قزح حديدي)',
    gradient: 'linear-gradient(to right, #000004, #2c115f, #721f81, #b63679, #f1605d, #feb078, #fcfdbf)',
    mapColors: ['#000004', '#721f81', '#f1605d', '#feb078', '#fff7b2']
  },
  white_hot: {
    name: 'White-Hot (أبيض حراري)',
    gradient: 'linear-gradient(to right, #0f172a, #334155, #64748b, #cbd5e1, #ffffff)',
    mapColors: ['#090d16', '#334155', '#94a3b8', '#e2e8f0', '#ffffff']
  },
  black_hot: {
    name: 'Black-Hot (أسود حراري)',
    gradient: 'linear-gradient(to right, #ffffff, #cbd5e1, #64748b, #334155, #000000)',
    mapColors: ['#f8fafc', '#94a3b8', '#475569', '#1e293b', '#000000']
  },
  rainbow: {
    name: 'Rainbow HC (عالي التباين)',
    gradient: 'linear-gradient(to right, #0000ff, #00ffff, #00ff00, #ffff00, #ff0000, #ffffff)',
    mapColors: ['#0000ff', '#00ffcc', '#00ff00', '#ffff00', '#ff0000', '#ffffff']
  }
};

/**
 * Builds real-time DroneEdgeVisionTelemetry from a live incident or mission state
 * for calibration of flame intensity and Rothermel/Byram physical models
 */
export function getDroneEdgeVisionTelemetry(incident: WildfireIncident): import('../types').DroneEdgeVisionTelemetry {
  const assessment = computeDroneTacticalAssessment(incident);
  const coords = incident.coordinates || { lat: 36.784, lng: 5.719 };

  return {
    droneCallsign: 'DRONE-ALGER-ALPHA-04',
    flightSessionId: `SESSION-DZ-${incident.id}`,
    timestamp: new Date().toISOString(),
    dronePosition: {
      lat: coords.lat + 0.0035,
      lng: coords.lng + 0.0028,
      altitudeAglMeters: 340,
      headingDeg: (incident.windDirectionDegrees || 225) + 180,
      gimbalPitchDeg: -45
    },
    visionDetections: {
      fireFrontDetected: true,
      flameCentroidGeo: coords,
      flamePerimeterCoordinates: [
        [coords.lat + 0.002, coords.lng - 0.002],
        [coords.lat + 0.003, coords.lng + 0.001],
        [coords.lat - 0.001, coords.lng + 0.003],
        [coords.lat - 0.002, coords.lng - 0.001]
      ],
      measuredFlameHeightMeters: assessment.flameHeightMeters,
      peakRadiometricTempC: assessment.maxHotspotTempC,
      smokeVectorDirectionDeg: incident.windDirectionDegrees || 225,
      smokeVelocityMps: Number(((incident.windSpeedKmH || 30) / 3.6).toFixed(1))
    },
    streamUrls: {
      thermalRtc: `webrtc://stream.awis.dz/live/uav04-flir-${incident.id}`,
      rgbRtc: `webrtc://stream.awis.dz/live/uav04-rgb-${incident.id}`
    },
    feedHealth: {
      fps: 30,
      latencyMs: 142,
      confidenceScorePercent: 98.4
    }
  };
}

export interface TacticalDropCoordinates {
  wgs84DMS: string;
  wgs84Decimal: string;
  utmGrid: string;
  dropPoint: GeoCoordinates;
  frpMw: number;
  coreTempC: number;
  recommendedRetardantLiters: number;
  dispatchTimestamp: string;
  targetSectorId: string;
  airOpsRadioFrequency: string;
}

export function formatCoordinateDMS(val: number, isLat: boolean): string {
  const dir = isLat ? (val >= 0 ? 'N' : 'S') : (val >= 0 ? 'E' : 'W');
  const abs = Math.abs(val);
  const deg = Math.floor(abs);
  const minFloat = (abs - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = ((minFloat - min) * 60).toFixed(1);
  return `${deg}°${min.toString().padStart(2, '0')}'${sec.padStart(4, '0')}"${dir}`;
}

export function computeTacticalDropCoordinates(
  incident: WildfireIncident,
  assessment: DroneTacticalAssessment
): TacticalDropCoordinates {
  const lat = assessment.recommendedDropPoint.lat;
  const lng = assessment.recommendedDropPoint.lng;
  const wgs84DMS = `${formatCoordinateDMS(lat, true)}, ${formatCoordinateDMS(lng, false)}`;
  const wgs84Decimal = `${lat.toFixed(5)}°N, ${lng.toFixed(5)}°E`;

  // Standard UTM projection for Algeria (Zones 30N, 31N, 32N)
  const zone = Math.max(30, Math.min(32, Math.floor((lng + 180) / 6) + 1));
  const approxEasting = Math.round(500000 + ((lng - (zone * 6 - 183)) * 88200));
  const approxNorthing = Math.round(lat * 111130);
  const utmGrid = `UTM ${zone}N ${approxEasting}m E, ${approxNorthing}m N`;

  const recommendedRetardantLiters = Math.min(12000, Math.max(3000, Math.round(assessment.fireRadiativePowerMw * 45)));
  const wilayaCode = (incident.wilaya || 'DZ').slice(0, 3).toUpperCase();
  const targetSectorId = `DZ-DROP-${wilayaCode}-${Math.floor(100 + Math.random() * 900)}`;

  return {
    wgs84DMS,
    wgs84Decimal,
    utmGrid,
    dropPoint: { lat, lng },
    frpMw: assessment.fireRadiativePowerMw,
    coreTempC: assessment.maxHotspotTempC,
    recommendedRetardantLiters,
    dispatchTimestamp: new Date().toISOString(),
    targetSectorId,
    airOpsRadioFrequency: '123.450 MHz (DGPC AIR-OPS)'
  };
}

