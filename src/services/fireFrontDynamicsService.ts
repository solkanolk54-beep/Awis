import { GeoCoordinates, WildfireIncident, Language } from '../types';
import { getDEMDataAt, DEMSample } from './demElevationService';
import { degreesToCardinal } from './liveWeatherService';

export interface HistoricalWindVector {
  timestamp: string;
  timeOffsetMinutes: number; // e.g., -240, -180, -120, -60, 0
  windSpeedKmH: number;
  windDirectionDeg: number; // Meteorological (direction wind blows FROM, 0-360)
  windPushHeadingDeg: number; // Kinematic push heading: (windDirectionDeg + 180) % 360
  gustSpeedKmH: number;
  cardinal: string;
  tempC: number;
  humidityPct: number;
  uComponent: number; // Eastward vector component (km/h)
  vComponent: number; // Northward vector component (km/h)
}

export interface TerrainVectorSample {
  lat: number;
  lng: number;
  elevationMeters: number;
  slopeDegrees: number;
  slopeAspectDegrees: number; // 0-360, direction of steepest uphill ascent
  aspectCardinal: string;
  topographicFeature: string;
  slopeAccelerationMultiplier: number;
  topographicFunnelFactor: number;
}

export interface FireFrontPolylineVertex {
  id: string;
  index: number;
  lat: number;
  lng: number;
  spreadRateMMin: number; // Local physical rate of spread (m/min)
  spreadRateKmH: number; // Local physical rate of spread (km/h)
  flameLengthM: number; // Byram flame length in meters
  firelineIntensityKwM: number; // Byram fireline intensity in kW/m
  sector: 'head' | 'left_flank' | 'right_flank' | 'backing';
  normalHeadingDeg: number; // Outward expansion normal heading (0-360)
  expansionVector: {
    headingDeg: number;
    magnitudeMMin: number;
    windContributionPct: number;
    terrainContributionPct: number;
    dx: number;
    dy: number;
  };
  terrain: TerrainVectorSample;
  wind: {
    speedKmH: number;
    directionDeg: number;
    pushHeadingDeg: number;
  };
  historicalPositions: Array<{
    timeOffsetMinutes: number;
    lat: number;
    lng: number;
  }>;
  isLeadingHeadVertex: boolean;
}

export interface HistoricalFrontEdgeSnapshot {
  timeOffsetMinutes: number; // e.g., -180, -120, -60, 0
  timestamp: string;
  labelEn: string;
  labelAr: string;
  labelFr: string;
  polyline: Array<{ lat: number; lng: number }>;
  lengthKm: number;
  burnedAreaHectares: number;
  windAtTime: {
    speedKmH: number;
    directionDeg: number;
    cardinal: string;
  };
}

export interface FireFrontDynamicsConfig {
  origin: GeoCoordinates;
  timeHorizonMinutes?: number; // Default 60 mins
  baseFuelRateMMin?: number; // Base spread rate without wind/slope (default 2.4 m/min)
  fuelType?: 'cork_oak' | 'aleppo_pine' | 'maquis' | 'cedar' | 'grass';
  fuelMoisturePct?: number; // 4% to 30%
  updateIntervalMs?: number; // Auto update interval (e.g. 3000 ms)
  timeStepMinutesPerTick?: number; // Virtual progression minutes per tick (e.g. 10 mins)
}

export interface FireFrontDynamicsResult {
  incidentId?: string;
  incidentName: string;
  origin: GeoCoordinates;
  activeFrontPolyline: FireFrontPolylineVertex[]; // Primary active expansion edge polyline
  historicalSnapshots: HistoricalFrontEdgeSnapshot[]; // Multi-hour past progression edges
  activeFrontLengthKm: number;
  peakRateOfSpreadMMin: number;
  peakFlameLengthM: number;
  averageRateOfSpreadMMin: number;
  netSpreadHeadingDeg: number;
  netSpreadHeadingCardinal: string;
  activeHeadPosition: GeoCoordinates;
  historicalWindTimeline: HistoricalWindVector[];
  currentWindVector: HistoricalWindVector;
  terrainSummary: {
    averageSlopeDegrees: number;
    dominantAspectCardinal: string;
    maxElevationMeters: number;
    minElevationMeters: number;
    topographicClassification: string;
  };
  expansionHectaresPerHour: number;
  threatLevel: 'low' | 'moderate' | 'high' | 'critical' | 'extreme';
  lastUpdatedTimestamp: string;
  isPeriodicActive: boolean;
  updateCycleCount: number;
  simulationClockMinutes: number; // Current virtual progression elapsed
}

/**
 * Generates realistic historical wind vectors for Mediterranean Tell Atlas fire regimes
 * covering the last 4 hours up to current time (T-240m to T-0m).
 */
export function generateHistoricalWindTimeline(
  baseSpeed = 38,
  baseDir = 225,
  baseTemp = 36,
  baseHumidity = 14
): HistoricalWindVector[] {
  const offsets = [-240, -180, -120, -60, 0];
  const now = new Date();

  return offsets.map((offsetMin, idx) => {
    const time = new Date(now.getTime() + offsetMin * 60 * 1000);
    // Historical progression: wind typically starts moderate SSW and ramps up with Scirocco gusts towards WSW
    const speedVariation = [-14, -8, -2, +3, 0][idx];
    const dirVariation = [-30, -20, -10, -5, 0][idx];
    const gustMultiplier = [1.35, 1.4, 1.45, 1.5, 1.48][idx];

    const windSpeedKmH = Math.max(12, Math.round(baseSpeed + speedVariation));
    let windDirectionDeg = (baseDir + dirVariation + 360) % 360;
    const windPushHeadingDeg = (windDirectionDeg + 180) % 360;
    const gustSpeedKmH = Math.round(windSpeedKmH * gustMultiplier);

    const rad = (windPushHeadingDeg * Math.PI) / 180;
    const uComponent = Number((windSpeedKmH * Math.sin(rad)).toFixed(2));
    const vComponent = Number((windSpeedKmH * Math.cos(rad)).toFixed(2));

    const hours = time.getHours().toString().padStart(2, '0');
    const mins = time.getMinutes().toString().padStart(2, '0');

    return {
      timestamp: `${hours}:${mins}`,
      timeOffsetMinutes: offsetMin,
      windSpeedKmH,
      windDirectionDeg,
      windPushHeadingDeg,
      gustSpeedKmH,
      cardinal: degreesToCardinal(windDirectionDeg),
      tempC: Math.round(baseTemp + (idx * 0.8)),
      humidityPct: Math.max(8, Math.round(baseHumidity - (idx * 0.9))),
      uComponent,
      vComponent
    };
  });
}

/**
 * Calculates Rothermel's slope acceleration factor Phi_s:
 * Phi_s = 5.275 * (tan(theta))^2 + sin(theta)
 */
function calculateSlopeFactor(slopeDegrees: number): number {
  const thetaRad = (Math.max(0, Math.min(65, slopeDegrees)) * Math.PI) / 180;
  const tanTheta = Math.tan(thetaRad);
  const factor = 5.275 * Math.pow(tanTheta, 2) + Math.sin(thetaRad) * 0.85;
  return Math.max(0, Math.min(8.5, factor));
}

/**
 * Calculates wind acceleration factor Phi_w:
 * Phi_w = C * (U_mid)^B
 */
function calculateWindFactor(windSpeedKmH: number): number {
  const midflameMps = (windSpeedKmH * 0.2778) * 0.45; // 45% midflame ratio in forest canopy
  const factor = 0.045 * Math.pow(Math.max(0.5, midflameMps), 1.65);
  return Math.max(0.1, Math.min(12.0, factor));
}

/**
 * Converts geographic displacement (meters north, meters east) into GeoCoordinates.
 */
function addMetersToGeo(origin: GeoCoordinates, northMeters: number, eastMeters: number): GeoCoordinates {
  const kmPerDegLat = 111.132;
  const latRad = (origin.lat * Math.PI) / 180;
  const kmPerDegLng = 111.32 * Math.cos(latRad);

  return {
    lat: Number((origin.lat + (northMeters / 1000) / kmPerDegLat).toFixed(6)),
    lng: Number((origin.lng + (eastMeters / 1000) / kmPerDegLng).toFixed(6))
  };
}

/**
 * Primary calculation method of the Fire Front Dynamics Service.
 * Fuses multi-hour historical wind and local DEM terrain gradient vectors
 * to derive the continuous active expansion edge ('Fire Front' polyline).
 */
export function calculateFireFrontDynamics(
  origin: GeoCoordinates,
  incident?: WildfireIncident,
  customConfig?: Partial<FireFrontDynamicsConfig>,
  elapsedTickMinutes = 60,
  cycleCount = 0
): FireFrontDynamicsResult {
  const config: FireFrontDynamicsConfig = {
    origin,
    timeHorizonMinutes: elapsedTickMinutes,
    baseFuelRateMMin: 2.8,
    fuelType: 'cork_oak',
    fuelMoisturePct: 8.5,
    updateIntervalMs: 3000,
    timeStepMinutesPerTick: 10,
    ...customConfig
  };

  // 1. Collect historical wind vector time-series
  const historicalWindTimeline = generateHistoricalWindTimeline(
    incident ? 42 : 36,
    incident ? 230 : 225,
    37,
    11
  );
  const currentWind = historicalWindTimeline[historicalWindTimeline.length - 1];

  // 2. Sample origin DEM baseline
  const originDEM = getDEMDataAt(origin.lat, origin.lng);

  // 3. Compute net spread heading from coupled wind and terrain vectors
  const windPushRad = (currentWind.windPushHeadingDeg * Math.PI) / 180;
  const uphillRad = (originDEM.slopeAspectDegrees * Math.PI) / 180;

  const windWeight = calculateWindFactor(currentWind.windSpeedKmH) * 1.6;
  const slopeWeight = calculateSlopeFactor(originDEM.slopeDegrees) * 1.25;

  const netNorth = windWeight * Math.cos(windPushRad) + slopeWeight * Math.cos(uphillRad);
  const netEast = windWeight * Math.sin(windPushRad) + slopeWeight * Math.sin(uphillRad);

  let netSpreadHeadingDeg = Math.round((Math.atan2(netEast, netNorth) * 180) / Math.PI);
  netSpreadHeadingDeg = (netSpreadHeadingDeg + 360) % 360;

  // 4. Generate the active Fire Front polyline (active expansion edge)
  // The active expansion edge spans an arc of ~140° facing the propagation direction,
  // partitioned into 21 high-precision dynamic vertices.
  const NUM_FRONT_VERTICES = 21;
  const ARC_SPAN_DEG = 140;
  const halfArc = ARC_SPAN_DEG / 2;
  const startAngle = netSpreadHeadingDeg - halfArc;

  const activeFrontPolyline: FireFrontPolylineVertex[] = [];
  const terrainSamples: TerrainVectorSample[] = [];

  for (let i = 0; i < NUM_FRONT_VERTICES; i++) {
    const fraction = i / (NUM_FRONT_VERTICES - 1); // 0 (left flank) to 0.5 (head) to 1.0 (right flank)
    const vertexAngleDeg = (startAngle + fraction * ARC_SPAN_DEG + 360) % 360;
    const vertexAngleRad = (vertexAngleDeg * Math.PI) / 180;

    // Angle offset from the maximum forward propagation heading
    const angleDiffDeg = Math.abs(((vertexAngleDeg - netSpreadHeadingDeg + 180) % 360) - 180);
    const angleDiffRad = (angleDiffDeg * Math.PI) / 180;

    // Sector classification along the expanding edge
    let sector: FireFrontPolylineVertex['sector'] = 'head';
    if (fraction < 0.25) sector = 'left_flank';
    else if (fraction > 0.75) sector = 'right_flank';

    const isLeadingHead = Math.abs(fraction - 0.5) < 0.05;

    // 4.1 Historical cumulative displacement simulation
    // We integrate the expansion over the 4-hour historical wind timeline
    let cumulativeNorthMeters = 0;
    let cumulativeEastMeters = 0;
    const historicalPositions: FireFrontPolylineVertex['historicalPositions'] = [];

    // Base fuel forward rate (m/min)
    const r0 = config.baseFuelRateMMin || 2.8;

    // Iterate through past time intervals to compute progressive displacement
    for (let step = 0; step < historicalWindTimeline.length; step++) {
      const w = historicalWindTimeline[step];
      const stepDurationMin = 60; // 1 hour per step

      // Alignment with wind at this historical step
      const stepWindPushHeading = w.windPushHeadingDeg;
      const stepWindPushRad = (stepWindPushHeading * Math.PI) / 180;
      const windAlignment = Math.cos(vertexAngleRad - stepWindPushRad);

      const wFactor = calculateWindFactor(w.windSpeedKmH);
      const windSpreadBonus = windAlignment > 0 ? wFactor * Math.pow(windAlignment, 1.7) : 0.05;

      // Alignment with terrain slope uphill vector
      const slopeAlignment = Math.cos(vertexAngleRad - uphillRad);
      const sFactor = calculateSlopeFactor(originDEM.slopeDegrees);
      const slopeSpreadBonus = slopeAlignment > 0 ? sFactor * Math.pow(slopeAlignment, 1.4) : 0.02;

      // Local spread velocity at this historical step
      const stepROS_MMin = r0 * (1.0 + windSpreadBonus + slopeSpreadBonus);
      const stepDistanceMeters = stepROS_MMin * stepDurationMin * 0.72; // terrain tortuosity factor 0.72

      cumulativeNorthMeters += stepDistanceMeters * Math.cos(vertexAngleRad);
      cumulativeEastMeters += stepDistanceMeters * Math.sin(vertexAngleRad);

      const stepGeo = addMetersToGeo(origin, cumulativeNorthMeters, cumulativeEastMeters);
      historicalPositions.push({
        timeOffsetMinutes: w.timeOffsetMinutes,
        lat: stepGeo.lat,
        lng: stepGeo.lng
      });
    }

    // Additional virtual progression for live simulation ticks
    if (elapsedTickMinutes > 0) {
      const extraMinutes = elapsedTickMinutes;
      const wFactor = calculateWindFactor(currentWind.windSpeedKmH);
      const windAlignment = Math.cos(vertexAngleRad - windPushRad);
      const windBonus = windAlignment > 0 ? wFactor * Math.pow(windAlignment, 1.7) : 0.05;

      const slopeAlignment = Math.cos(vertexAngleRad - uphillRad);
      const sFactor = calculateSlopeFactor(originDEM.slopeDegrees);
      const slopeBonus = slopeAlignment > 0 ? sFactor * Math.pow(slopeAlignment, 1.4) : 0.02;

      const liveROS_MMin = r0 * (1.0 + windBonus + slopeBonus);
      const liveDistMeters = liveROS_MMin * extraMinutes * 0.72;

      cumulativeNorthMeters += liveDistMeters * Math.cos(vertexAngleRad);
      cumulativeEastMeters += liveDistMeters * Math.sin(vertexAngleRad);
    }

    // Current vertex geographic coordinate
    const vertexGeo = addMetersToGeo(origin, cumulativeNorthMeters, cumulativeEastMeters);

    // 4.2 Sample DEM terrain at the exact active front vertex location
    const vertexDEM = getDEMDataAt(vertexGeo.lat, vertexGeo.lng);
    const slopeAccel = 1.0 + (vertexDEM.slopeDegrees / 35.0) * 0.85;

    const terrainSample: TerrainVectorSample = {
      lat: vertexGeo.lat,
      lng: vertexGeo.lng,
      elevationMeters: vertexDEM.elevationMeters,
      slopeDegrees: vertexDEM.slopeDegrees,
      slopeAspectDegrees: vertexDEM.slopeAspectDegrees,
      aspectCardinal: vertexDEM.aspectCardinal,
      topographicFeature: vertexDEM.topographicFeature,
      slopeAccelerationMultiplier: Number(slopeAccel.toFixed(2)),
      topographicFunnelFactor: vertexDEM.topographicWindFunnelFactor
    };
    terrainSamples.push(terrainSample);

    // 4.3 Compute instantaneous rate of spread (ROS) and Byram flame metrics
    const localWindPushRad = (currentWind.windPushHeadingDeg * Math.PI) / 180;
    const localUphillRad = (vertexDEM.slopeAspectDegrees * Math.PI) / 180;

    const localWindAlignment = Math.cos(vertexAngleRad - localWindPushRad);
    const localSlopeAlignment = Math.cos(vertexAngleRad - localUphillRad);

    const wFactor = calculateWindFactor(currentWind.windSpeedKmH * vertexDEM.topographicWindFunnelFactor);
    const sFactor = calculateSlopeFactor(vertexDEM.slopeDegrees);

    const windExpBonus = localWindAlignment > 0 ? wFactor * Math.pow(localWindAlignment, 1.6) : 0.04;
    const slopeExpBonus = localSlopeAlignment > 0 ? sFactor * Math.pow(localSlopeAlignment, 1.3) : 0.02;

    // Fuel moisture dampening (eta_M)
    const fuelMoisture = config.fuelMoisturePct || 8.5;
    const moistureDamping = Math.max(0.12, 1.0 - 2.59 * (fuelMoisture / 30.0) + 1.11 * Math.pow(fuelMoisture / 30.0, 2));

    const instantaneousROS_MMin = Number(
      (r0 * moistureDamping * (1.0 + windExpBonus + slopeExpBonus)).toFixed(1)
    );
    const instantaneousROS_KmH = Number(((instantaneousROS_MMin * 60) / 1000).toFixed(2));

    // Fireline intensity I = H * w * R (Byram 1959)
    // H (heat content) ~ 18000 kJ/kg, w (fuel weight) ~ 1.2 kg/m^2
    const fuelLoadKgM2 = sector === 'head' ? 1.4 : 1.0;
    const firelineIntensityKwM = Math.round(18000 * (fuelLoadKgM2 * (instantaneousROS_MMin / 60)));

    // Byram flame length L = 0.0775 * I^0.46
    const flameLengthM = Number((0.0775 * Math.pow(Math.max(50, firelineIntensityKwM), 0.46)).toFixed(1));

    // Expansion vector normal (dx, dy)
    const normalRad = vertexAngleRad;
    const expMagnitude = instantaneousROS_MMin;
    const dx = Math.sin(normalRad) * expMagnitude;
    const dy = Math.cos(normalRad) * expMagnitude;

    const totalWeight = (windExpBonus + slopeExpBonus) || 1;
    const windPct = Math.round((windExpBonus / totalWeight) * 100);
    const terrainPct = 100 - windPct;

    activeFrontPolyline.push({
      id: `front-vertex-${i}`,
      index: i,
      lat: vertexGeo.lat,
      lng: vertexGeo.lng,
      spreadRateMMin: instantaneousROS_MMin,
      spreadRateKmH: instantaneousROS_KmH,
      flameLengthM,
      firelineIntensityKwM,
      sector,
      normalHeadingDeg: Math.round(vertexAngleDeg),
      expansionVector: {
        headingDeg: Math.round(vertexAngleDeg),
        magnitudeMMin: instantaneousROS_MMin,
        windContributionPct: windPct,
        terrainContributionPct: terrainPct,
        dx: Number(dx.toFixed(2)),
        dy: Number(dy.toFixed(2))
      },
      terrain: terrainSample,
      wind: {
        speedKmH: currentWind.windSpeedKmH,
        directionDeg: currentWind.windDirectionDeg,
        pushHeadingDeg: currentWind.windPushHeadingDeg
      },
      historicalPositions,
      isLeadingHeadVertex: isLeadingHead
    });
  }

  // 5. Generate Historical Expansion Edge Snapshots (T-180m, T-120m, T-60m, T-0m)
  const historicalSnapshots: HistoricalFrontEdgeSnapshot[] = [
    { offset: -180, labelEn: '3 Hours Ago (T-3h)', labelAr: 'منذ 3 ساعات (س-3)', labelFr: 'Il y a 3 heures' },
    { offset: -120, labelEn: '2 Hours Ago (T-2h)', labelAr: 'منذ ساعتين (س-2)', labelFr: 'Il y a 2 heures' },
    { offset: -60, labelEn: '1 Hour Ago (T-1h)', labelAr: 'منذ ساعة (س-1)', labelFr: 'Il y a 1 heure' },
    { offset: 0, labelEn: 'Current Baseline (T0)', labelAr: 'الخط المرجعي الحالي (س0)', labelFr: 'Ligne actuelle (T0)' }
  ].map(({ offset, labelEn, labelAr, labelFr }) => {
    // Extract coordinates for this historical offset across all vertices
    const polyline = activeFrontPolyline.map((v) => {
      const hist = v.historicalPositions.find((p) => p.timeOffsetMinutes === offset);
      return hist ? { lat: hist.lat, lng: hist.lng } : { lat: v.lat, lng: v.lng };
    });

    // Compute approximate perimeter length
    let lenKm = 0;
    for (let k = 0; k < polyline.length - 1; k++) {
      lenKm += calculateHaversineDistanceKm(
        polyline[k].lat,
        polyline[k].lng,
        polyline[k + 1].lat,
        polyline[k + 1].lng
      );
    }

    const windEntry = historicalWindTimeline.find((w) => w.timeOffsetMinutes === offset) || currentWind;

    // Approximate burned area up to that historical step
    const hourFactor = Math.max(0.5, (4 - Math.abs(offset / 60)));
    const areaHa = Math.round(18 * Math.pow(hourFactor, 1.85));

    return {
      timeOffsetMinutes: offset,
      timestamp: windEntry.timestamp,
      labelEn,
      labelAr,
      labelFr,
      polyline,
      lengthKm: Number(lenKm.toFixed(2)),
      burnedAreaHectares: areaHa,
      windAtTime: {
        speedKmH: windEntry.windSpeedKmH,
        directionDeg: windEntry.windDirectionDeg,
        cardinal: windEntry.cardinal
      }
    };
  });

  // 6. Calculate aggregate active front metrics
  let activeFrontLengthKm = 0;
  for (let k = 0; k < activeFrontPolyline.length - 1; k++) {
    activeFrontLengthKm += calculateHaversineDistanceKm(
      activeFrontPolyline[k].lat,
      activeFrontPolyline[k].lng,
      activeFrontPolyline[k + 1].lat,
      activeFrontPolyline[k + 1].lng
    );
  }
  activeFrontLengthKm = Number(activeFrontLengthKm.toFixed(2));

  const peakVertex = activeFrontPolyline.reduce((max, v) => (v.spreadRateMMin > max.spreadRateMMin ? v : max), activeFrontPolyline[0]);
  const avgROS = Number(
    (activeFrontPolyline.reduce((sum, v) => sum + v.spreadRateMMin, 0) / activeFrontPolyline.length).toFixed(1)
  );

  const headVertex = activeFrontPolyline.find((v) => v.isLeadingHeadVertex) || peakVertex;
  const activeHeadPosition: GeoCoordinates = {
    lat: headVertex.lat,
    lng: headVertex.lng
  };

  // Terrain summary
  const avgSlope = Math.round(terrainSamples.reduce((sum, s) => sum + s.slopeDegrees, 0) / terrainSamples.length);
  const maxElev = Math.max(...terrainSamples.map((s) => s.elevationMeters));
  const minElev = Math.min(...terrainSamples.map((s) => s.elevationMeters));

  // Hourly perimeter expansion & area growth estimation
  const expansionHectaresPerHour = Math.round((activeFrontLengthKm * (avgROS * 60) * 0.0001 * 100) / 10);

  // Threat level classification based on peak intensity and ROS
  let threatLevel: FireFrontDynamicsResult['threatLevel'] = 'moderate';
  if (peakVertex.spreadRateMMin > 28 || peakVertex.flameLengthM > 4.5) {
    threatLevel = 'extreme';
  } else if (peakVertex.spreadRateMMin > 18 || peakVertex.flameLengthM > 3.2) {
    threatLevel = 'critical';
  } else if (peakVertex.spreadRateMMin > 10 || peakVertex.flameLengthM > 2.0) {
    threatLevel = 'high';
  } else if (peakVertex.spreadRateMMin < 4) {
    threatLevel = 'low';
  }

  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

  return {
    incidentId: incident?.id,
    incidentName: incident?.title || 'Wildfire Sector Active Front',
    origin,
    activeFrontPolyline,
    historicalSnapshots,
    activeFrontLengthKm,
    peakRateOfSpreadMMin: peakVertex.spreadRateMMin,
    peakFlameLengthM: peakVertex.flameLengthM,
    averageRateOfSpreadMMin: avgROS,
    netSpreadHeadingDeg,
    netSpreadHeadingCardinal: degreesToCardinal(netSpreadHeadingDeg),
    activeHeadPosition,
    historicalWindTimeline,
    currentWindVector: currentWind,
    terrainSummary: {
      averageSlopeDegrees: avgSlope,
      dominantAspectCardinal: originDEM.aspectCardinal,
      maxElevationMeters: maxElev,
      minElevationMeters: minElev,
      topographicClassification: originDEM.topographicFeature.replace('_', ' ').toUpperCase()
    },
    expansionHectaresPerHour,
    threatLevel,
    lastUpdatedTimestamp: timeStr,
    isPeriodicActive: true,
    updateCycleCount: cycleCount,
    simulationClockMinutes: elapsedTickMinutes
  };
}

/**
 * Periodically steps the Fire Front Dynamics model forward in time,
 * shifting vertices outward along coupled wind and terrain normals.
 */
export function advanceFireFrontPeriodically(
  currentResult: FireFrontDynamicsResult,
  stepMinutes = 10,
  speedMultiplier = 1.0
): FireFrontDynamicsResult {
  const newClock = currentResult.simulationClockMinutes + (stepMinutes * speedMultiplier);
  const newCycle = currentResult.updateCycleCount + 1;

  return calculateFireFrontDynamics(
    currentResult.origin,
    undefined,
    undefined,
    newClock,
    newCycle
  );
}

/**
 * Haversine formula for calculating distance in kilometers between two geo coordinates.
 */
function calculateHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
