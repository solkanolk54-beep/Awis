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
export function computeDroneTacticalAssessment(incident: WildfireIncident): DroneTacticalAssessment {
  const isExtreme = incident.riskLevel === 'extreme' || incident.riskLevel === 'critical';
  const isHigh = incident.riskLevel === 'high';

  // Base flame temperature calculation based on temperature, slope, wind
  const baseTemp = 450 + (incident.temperatureC * 4.5) + (incident.windSpeedKmH * 3.2) + (incident.terrainSlopeDegrees * 2.8);
  const maxHotspotTempC = Math.round(isExtreme ? Math.max(780, baseTemp) : isHigh ? Math.max(620, baseTemp) : 520);
  const flameFrontTempC = Math.round(maxHotspotTempC * 0.82);
  const ambientTempC = Math.round(incident.temperatureC || 36);

  // Fire Radiative Power (MW) based on burned hectares & wind
  const frpBase = (incident.estimatedBurnedHectares * 8.5) + (incident.windSpeedKmH * 3.4);
  const fireRadiativePowerMw = Math.round(isExtreme ? Math.max(240, frpBase) : Math.max(90, frpBase));

  // Rate of spread (meters / minute)
  const spreadRateMMin = Number(
    (0.4 * Math.exp(0.069 * incident.windSpeedKmH) * (1 + Math.sin((incident.terrainSlopeDegrees * Math.PI) / 180))).toFixed(1)
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
  const windRad = (incident.windDirectionDegrees * Math.PI) / 180;
  const advanceDistDeg = 0.0022; // approx 240 meters
  const dropLat = incident.coordinates.lat + Math.cos(windRad) * advanceDistDeg;
  const dropLng = incident.coordinates.lng + Math.sin(windRad) * advanceDistDeg;

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
  incident: WildfireIncident,
  assessment: DroneTacticalAssessment
): HotspotPoint[] {
  // Offset relative to wind direction
  const windDir = incident.windDirectionDegrees;
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
      tempC: assessment.maxHotspotTempC,
      label: 'MAX CORE FLAME',
      labelAr: 'بؤرة اللهب القصوى',
      type: 'core'
    },
    {
      id: 'spot-front',
      xPercent: Math.min(85, Math.max(15, frontX)),
      yPercent: Math.min(85, Math.max(15, frontY)),
      tempC: assessment.flameFrontTempC,
      label: 'ACTIVE FRONT',
      labelAr: 'جبهة التقدم النشطة',
      type: 'front'
    },
    {
      id: 'spot-flank',
      xPercent: Math.min(85, Math.max(15, coreX - 18)),
      yPercent: Math.min(85, Math.max(15, coreY + 12)),
      tempC: Math.round(assessment.flameFrontTempC * 0.76),
      label: 'LEFT FLANK',
      labelAr: 'الجناح الأيسر',
      type: 'front'
    },
    {
      id: 'spot-ember',
      xPercent: Math.min(85, Math.max(15, rearX)),
      yPercent: Math.min(85, Math.max(15, rearY)),
      tempC: Math.round(assessment.maxHotspotTempC * 0.38),
      label: 'SMOLDERING SCAR',
      labelAr: 'رماد وجمر مشتعل',
      type: 'ember'
    },
    {
      id: 'spot-ambient',
      xPercent: 22,
      yPercent: 78,
      tempC: assessment.ambientTempC,
      label: 'CANOPY AMBIENT',
      labelAr: 'حرارة الغابة الطبيعية',
      type: 'unburned'
    }
  ];
}

// Default initial drone mission state
export function createInitialDroneMission(incident: WildfireIncident): DroneMissionState {
  const assessment = computeDroneTacticalAssessment(incident);

  return {
    droneId: 'UAV-DZ-04',
    droneName: 'Tactical Recon Thermal Drone DZ-04',
    model: 'ALGIS-CH4 Dual Thermal/RGB UAV',
    activeIncidentId: incident.id,
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
