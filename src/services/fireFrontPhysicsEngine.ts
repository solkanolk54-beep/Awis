import { GeoCoordinates, WildfireIncident, ForestZone } from '../types';
import { getDEMDataAt, sampleDEMProfile, DEMSample, DEMElevationProfilePoint } from './demElevationService';
import { degreesToCardinal } from './liveWeatherService';

export interface FireFrontSimulationConfig {
  origin: GeoCoordinates;
  windSpeedKmH: number;
  windDirectionDegrees: number; // Meteorological direction wind blows FROM (0-360°)
  fuelMoisturePercent: number; // 4% - 35%
  fuelType?: 'cork_oak' | 'aleppo_pine' | 'maquis' | 'cedar' | 'grass' | 'mixed';
  slopeMultiplierWeight?: number; // 0.5 to 2.0 (allows testing slope sensitivity)
  timeHorizonMinutes?: number; // Target simulation time horizon in minutes (e.g. 60 min)
}

export interface FireFrontVertex {
  index: number;
  angleDegrees: number; // Polar angle from origin (0 = North, 90 = East, etc.)
  lat: number;
  lng: number;
  distanceMeters: number;
  spreadVelocityKmH: number; // Local physical rate of spread in km/h
  spreadVelocityMMin: number; // Local physical rate of spread in m/min
  demElevationMeters: number;
  demSlopeDegrees: number;
  demAspectDegrees: number;
  demAspectCardinal: string;
  demFeature: string;
  firelineIntensityKwM: number; // Byram's Fireline Intensity (kW/m)
  flameLengthMeters: number; // Byram's flame length in meters
  sectorType: 'head' | 'left_flank' | 'right_flank' | 'backing';
  velocityVector: {
    headingDeg: number;
    magnitudeKmH: number;
    dx: number;
    dy: number;
  };
}

export interface FireFrontPolygonWavefront {
  timeMinutes: number;
  burnedAreaHectares: number;
  perimeterKm: number;
  vertices: FireFrontVertex[];
  headVertices: FireFrontVertex[]; // The high-intensity leading flame front arc
  maxSpreadVelocityKmH: number;
  maxSpreadVelocityMMin: number;
  peakFirelineIntensityKwM: number;
  peakFlameLengthMeters: number;
  averageVelocityKmH: number;
}

export interface PhysicalFireFrontSimulationResult {
  incidentId?: string;
  origin: GeoCoordinates;
  timestamp: string;

  // Environmental and Physics Inputs
  windSpeedKmH: number;
  windDirectionDegrees: number;
  windDirectionCardinal: string;
  flamePushHeadingDegrees: number; // Direction wind pushes flames towards
  flamePushHeadingCardinal: string;
  fuelMoisturePercent: number;
  fuelMoistureDampingFactor: number; // eta_M (0.05 to 0.98)
  fuelExtinctionMoisturePercent: number;
  fuelModelName: string;

  // Origin DEM Telemetry
  originDEM: DEMSample;

  // Multi-Horizon Wavefront Polygons
  isochrones: FireFrontPolygonWavefront[]; // Default horizons: [15, 30, 45, 60, 90, 120, 180, 240] min
  activeWavefront: FireFrontPolygonWavefront; // The wavefront at the requested timeHorizonMinutes

  // Vector Directional Summary
  effectiveSpreadHeadingDegrees: number; // Coupled wind + slope heading
  effectiveSpreadHeadingCardinal: string;
  slopeAccelerationPercent: number; // e.g. +68% uphill boost
  lengthToWidthRatio: number;

  // Topographic cross-section along the head fire propagation vector
  demTransectProfile: DEMElevationProfilePoint[];

  // Key tactical milestones
  containmentUrgency: 'low' | 'moderate' | 'high' | 'critical' | 'extreme';
  headFireFrontPosition: GeoCoordinates;
  maxSpottingPotentialDistanceKm: number;
}

/**
 * Fuel parameters for typical Mediterranean forest complexes in northern Algeria
 */
const MEDITERRANEAN_FUEL_MODELS: Record<string, {
  heatContentKjKg: number;
  extinctionMoisture: number;
  fuelBedBulkDensity: number;
  surfaceAreaToVolumeRatio: number;
  baseRateOfSpreadMMin: number;
  nameEn: string;
  nameAr: string;
}> = {
  cork_oak: {
    heatContentKjKg: 18600,
    extinctionMoisture: 26,
    fuelBedBulkDensity: 0.75,
    surfaceAreaToVolumeRatio: 1800,
    baseRateOfSpreadMMin: 3.2,
    nameEn: 'Cork Oak (Quercus suber) & Zeen Oak',
    nameAr: 'بلوط الفلين وبلوط الزان'
  },
  aleppo_pine: {
    heatContentKjKg: 20500,
    extinctionMoisture: 22,
    fuelBedBulkDensity: 1.10,
    surfaceAreaToVolumeRatio: 2200,
    baseRateOfSpreadMMin: 3.8,
    nameEn: 'Aleppo Pine (Pinus halepensis) High Resin',
    nameAr: 'الصنوبر الحلبي عالي الراتنج'
  },
  maquis: {
    heatContentKjKg: 19500,
    extinctionMoisture: 24,
    fuelBedBulkDensity: 0.90,
    surfaceAreaToVolumeRatio: 2400,
    baseRateOfSpreadMMin: 3.5,
    nameEn: 'Dense Mediterranean Maquis & Heather',
    nameAr: 'أدغال البحر المتوسط وأحراش الديس'
  },
  cedar: {
    heatContentKjKg: 18200,
    extinctionMoisture: 28,
    fuelBedBulkDensity: 0.65,
    surfaceAreaToVolumeRatio: 1600,
    baseRateOfSpreadMMin: 2.7,
    nameEn: 'Atlas Cedar Mountain Forest',
    nameAr: 'أرز الأطلس الجبلي'
  },
  grass: {
    heatContentKjKg: 17500,
    extinctionMoisture: 18,
    fuelBedBulkDensity: 0.40,
    surfaceAreaToVolumeRatio: 3500,
    baseRateOfSpreadMMin: 5.2,
    nameEn: 'Dry Mountain Grass & Bracken',
    nameAr: 'الحلفاء والأعشاب الجافة والسرخس'
  },
  mixed: {
    heatContentKjKg: 18800,
    extinctionMoisture: 25,
    fuelBedBulkDensity: 0.80,
    surfaceAreaToVolumeRatio: 2000,
    baseRateOfSpreadMMin: 3.3,
    nameEn: 'Mixed Mediterranean Woodland',
    nameAr: 'غابات البحر الأبيض المتوسط المختلطة'
  }
};

export class FireFrontPhysicsEngine {
  /**
   * Evaluates fuel moisture content damping factor eta_M using Rothermel formulation
   */
  public static calculateFuelMoistureDamping(fuelMoisturePercent: number, extinctionMoisture: number): number {
    const clampedMoisture = Math.max(2, Math.min(45, fuelMoisturePercent));
    const moistureRatio = clampedMoisture / extinctionMoisture;

    if (moistureRatio >= 1.0) {
      // Saturated fuel: smoldering combustion only, minimal spread
      return Math.max(0.02, 0.08 * (1.1 - moistureRatio));
    }

    // Rothermel empirical polynomial for fine fuel moisture damping
    const etaM = 1.0 - 2.59 * moistureRatio + 5.11 * Math.pow(moistureRatio, 2) - 3.52 * Math.pow(moistureRatio, 3);
    return Math.max(0.04, Math.min(0.98, etaM));
  }

  /**
   * Computes the directional slope acceleration factor phi_s based on DEM slope and aspect
   */
  public static calculateSlopeFactor(
    slopeDegrees: number,
    aspectDegrees: number,
    propagationHeadingDegrees: number,
    slopeSensitivity = 1.0
  ): { factor: number; isUphill: boolean; relativeAngleDeg: number } {
    const slopeRad = (Math.min(55, Math.max(0, slopeDegrees)) * Math.PI) / 180;
    
    // Relative angle between propagation direction and steepest uphill direction
    let diffDeg = Math.abs(propagationHeadingDegrees - aspectDegrees) % 360;
    if (diffDeg > 180) diffDeg = 360 - diffDeg;
    const diffRad = (diffDeg * Math.PI) / 180;

    const cosAlignment = Math.cos(diffRad);
    const isUphill = cosAlignment > 0;

    let phiS = 0;
    if (isUphill) {
      // Preheating uphill: flames tilt closer to unburned fuel bed
      // Rothermel: phi_s = 5.275 * tan^2(phi) * cos(theta)
      phiS = 5.275 * Math.pow(Math.tan(slopeRad), 2) * Math.pow(cosAlignment, 1.2) * slopeSensitivity;
    } else {
      // Downhill backing spread: flame stands upright or tilts away from unburned fuel
      phiS = -0.42 * Math.sin(slopeRad) * Math.abs(cosAlignment) * slopeSensitivity;
    }

    return {
      factor: phiS,
      isUphill,
      relativeAngleDeg: Math.round(diffDeg)
    };
  }

  /**
   * Computes the directional wind factor phi_w
   */
  public static calculateWindFactor(
    windSpeedKmH: number,
    windPushHeadingDegrees: number,
    propagationHeadingDegrees: number,
    topographicFunnelFactor = 1.0
  ): { factor: number; alignment: number } {
    const effectiveWindSpeed = windSpeedKmH * topographicFunnelFactor;
    const windMps = (effectiveWindSpeed * 1000) / 3600;

    let diffDeg = Math.abs(propagationHeadingDegrees - windPushHeadingDegrees) % 360;
    if (diffDeg > 180) diffDeg = 360 - diffDeg;
    const diffRad = (diffDeg * Math.PI) / 180;

    const cosAlign = Math.cos(diffRad);

    let factor = 0;
    if (cosAlign > 0) {
      // Forward and flanking downwind propagation
      const baseWindMultiplier = Math.pow(Math.max(0.5, windMps) / 4.2, 1.45);
      factor = baseWindMultiplier * Math.pow(cosAlign, 1.5);
    } else {
      // Backing propagation against wind
      factor = -0.65 * Math.abs(cosAlign);
    }

    return {
      factor,
      alignment: cosAlign
    };
  }

  /**
   * Generates a single fire front polygonal wavefront at a specified time horizon
   */
  public static generateWavefront(
    origin: GeoCoordinates,
    timeMinutes: number,
    config: FireFrontSimulationConfig,
    originDEM: DEMSample,
    fuelModel: typeof MEDITERRANEAN_FUEL_MODELS['cork_oak']
  ): FireFrontPolygonWavefront {
    const {
      windSpeedKmH,
      windDirectionDegrees,
      fuelMoisturePercent,
      slopeMultiplierWeight = 1.0
    } = config;

    const windPushHeading = (windDirectionDegrees + 180) % 360;
    const moistureDamping = this.calculateFuelMoistureDamping(fuelMoisturePercent, fuelModel.extinctionMoisture);

    // Number of radial rays around the perimeter
    const numRays = 36;
    const kmPerDegree = 111.0;
    const cosLat = Math.cos((origin.lat * Math.PI) / 180);

    const vertices: FireFrontVertex[] = [];
    let maxVelKmH = 0;
    let maxVelMMin = 0;
    let totalVelKmH = 0;
    let peakIntensity = 0;
    let peakFlameLength = 0;

    // Time in hours
    const hours = timeMinutes / 60.0;

    for (let i = 0; i < numRays; i++) {
      const angleDeg = (i * 360) / numRays;
      const angleRad = (angleDeg * Math.PI) / 180;

      // 1. First order estimation of distance along this ray to sample local DEM
      const crudeDistKm = Math.max(0.05, hours * (fuelModel.baseRateOfSpreadMMin * 60 / 1000) * 1.5);
      const testLat = origin.lat + (crudeDistKm * Math.cos(angleRad)) / kmPerDegree;
      const testLng = origin.lng + (crudeDistKm * Math.sin(angleRad)) / (kmPerDegree * cosLat);

      // 2. Query DEM at the advancing front point
      const dem = getDEMDataAt(testLat, testLng);

      // 3. Slope factor calculation for this ray
      const slopeAnalysis = this.calculateSlopeFactor(
        dem.slopeDegrees,
        dem.slopeAspectDegrees,
        angleDeg,
        slopeMultiplierWeight
      );

      // 4. Wind factor calculation for this ray
      const windAnalysis = this.calculateWindFactor(
        windSpeedKmH,
        windPushHeading,
        angleDeg,
        dem.topographicWindFunnelFactor
      );

      // 5. Total Rate of Spread velocity calculation
      // Rothermel formulation: R = R0 * eta_M * (1 + phi_w + phi_s)
      const combinedMultiplier = Math.max(0.12, 1.0 + windAnalysis.factor + slopeAnalysis.factor);
      const velocityMMin = fuelModel.baseRateOfSpreadMMin * moistureDamping * combinedMultiplier;
      const velocityKmH = (velocityMMin * 60) / 1000;

      // Cumulative propagation distance at time t
      const distanceMeters = Math.max(15, velocityMMin * timeMinutes);
      const distanceKm = distanceMeters / 1000.0;

      // Precise geographical coordinates of the vertex
      const vertexLat = origin.lat + (distanceKm * Math.cos(angleRad)) / kmPerDegree;
      const vertexLng = origin.lng + (distanceKm * Math.sin(angleRad)) / (kmPerDegree * cosLat);

      // Byram's Fireline Intensity I_B = H * w * R (kW/m)
      // Fuel consumed load w ~ 1.35 kg/m^2
      const fuelConsumedKgM2 = 1.35;
      const rosMps = velocityMMin / 60.0;
      const firelineIntensityKwM = Math.round(fuelModel.heatContentKjKg * fuelConsumedKgM2 * rosMps);

      // Flame Length L_f = 0.0775 * I_B^0.46
      const flameLengthMeters = Math.round(0.0775 * Math.pow(firelineIntensityKwM, 0.46) * 10) / 10;

      // Sector classification based on alignment with wind push heading
      let relHeading = Math.abs(angleDeg - windPushHeading) % 360;
      if (relHeading > 180) relHeading = 360 - relHeading;

      let sectorType: FireFrontVertex['sectorType'] = 'backing';
      if (relHeading <= 45) {
        sectorType = 'head';
      } else if (relHeading <= 135) {
        // Distinguish left vs right flank
        const cross = Math.sin((angleDeg - windPushHeading) * Math.PI / 180);
        sectorType = cross > 0 ? 'right_flank' : 'left_flank';
      } else {
        sectorType = 'backing';
      }

      // Velocity vector for visualization
      const vecHeading = angleDeg;
      const vecRad = (vecHeading * Math.PI) / 180;
      const dx = Math.sin(vecRad) * velocityKmH;
      const dy = Math.cos(vecRad) * velocityKmH;

      if (velocityKmH > maxVelKmH) {
        maxVelKmH = velocityKmH;
        maxVelMMin = velocityMMin;
      }
      if (firelineIntensityKwM > peakIntensity) {
        peakIntensity = firelineIntensityKwM;
        peakFlameLength = flameLengthMeters;
      }
      totalVelKmH += velocityKmH;

      vertices.push({
        index: i,
        angleDegrees: angleDeg,
        lat: Number(vertexLat.toFixed(5)),
        lng: Number(vertexLng.toFixed(5)),
        distanceMeters: Math.round(distanceMeters),
        spreadVelocityKmH: Number(velocityKmH.toFixed(2)),
        spreadVelocityMMin: Number(velocityMMin.toFixed(1)),
        demElevationMeters: dem.elevationMeters,
        demSlopeDegrees: dem.slopeDegrees,
        demAspectDegrees: dem.slopeAspectDegrees,
        demAspectCardinal: dem.aspectCardinal,
        demFeature: dem.topographicFeature,
        firelineIntensityKwM,
        flameLengthMeters,
        sectorType,
        velocityVector: {
          headingDeg: vecHeading,
          magnitudeKmH: Number(velocityKmH.toFixed(2)),
          dx: Number(dx.toFixed(2)),
          dy: Number(dy.toFixed(2))
        }
      });
    }

    // Identify the head fire arc (vertices with sectorType === 'head')
    const headVertices = vertices.filter((v) => v.sectorType === 'head');

    // Approximate polygonal area using Green's theorem on Cartesian projection
    let polygonAreaKm2 = 0;
    let perimeterMeters = 0;

    for (let j = 0; j < vertices.length; j++) {
      const nextJ = (j + 1) % vertices.length;
      const v1 = vertices[j];
      const v2 = vertices[nextJ];

      const x1 = (v1.lng - origin.lng) * kmPerDegree * cosLat;
      const y1 = (v1.lat - origin.lat) * kmPerDegree;
      const x2 = (v2.lng - origin.lng) * kmPerDegree * cosLat;
      const y2 = (v2.lat - origin.lat) * kmPerDegree;

      polygonAreaKm2 += (x1 * y2 - x2 * y1);

      const edgeDistKm = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
      perimeterMeters += edgeDistKm * 1000;
    }

    polygonAreaKm2 = Math.abs(polygonAreaKm2) / 2.0;
    const burnedAreaHectares = Math.max(0.5, Math.round(polygonAreaKm2 * 100 * 10) / 10);
    const perimeterKm = Math.round((perimeterMeters / 1000) * 10) / 10;
    const averageVelocityKmH = Number((totalVelKmH / vertices.length).toFixed(2));

    return {
      timeMinutes,
      burnedAreaHectares,
      perimeterKm,
      vertices,
      headVertices,
      maxSpreadVelocityKmH: Number(maxVelKmH.toFixed(2)),
      maxSpreadVelocityMMin: Number(maxVelMMin.toFixed(1)),
      peakFirelineIntensityKwM: peakIntensity,
      peakFlameLengthMeters: peakFlameLength,
      averageVelocityKmH
    };
  }

  /**
   * Main simulation execution method. Produces full physical assessment with multi-horizon
   * wavefronts, DEM transect profiles, and spotting estimates.
   */
  public static simulate(
    config: FireFrontSimulationConfig,
    incident?: WildfireIncident,
    forest?: ForestZone
  ): PhysicalFireFrontSimulationResult {
    const origin = config.origin;
    const originDEM = getDEMDataAt(origin.lat, origin.lng);

    // Resolve vegetation fuel model
    const fuelKey = config.fuelType || (forest?.vegetationType?.toLowerCase().includes('pine') ? 'aleppo_pine' : 'cork_oak');
    const fuelModel = MEDITERRANEAN_FUEL_MODELS[fuelKey] || MEDITERRANEAN_FUEL_MODELS.cork_oak;

    const windPushHeading = (config.windDirectionDegrees + 180) % 360;
    const moistureDamping = this.calculateFuelMoistureDamping(config.fuelMoisturePercent, fuelModel.extinctionMoisture);

    // Couple wind push heading with origin terrain uphill slope vector
    const windPushRad = (windPushHeading * Math.PI) / 180;
    const slopeUphillRad = (originDEM.slopeAspectDegrees * Math.PI) / 180;

    const windWeight = Math.max(1, config.windSpeedKmH / 16);
    const slopeWeight = Math.sin((originDEM.slopeDegrees * Math.PI) / 180) * 2.4 * (config.slopeMultiplierWeight || 1.0);

    const netNorth = windWeight * Math.cos(windPushRad) + slopeWeight * Math.cos(slopeUphillRad);
    const netEast = windWeight * Math.sin(windPushRad) + slopeWeight * Math.sin(slopeUphillRad);

    let effectiveSpreadHeading = Math.round((Math.atan2(netEast, netNorth) * 180) / Math.PI);
    effectiveSpreadHeading = (effectiveSpreadHeading + 360) % 360;

    // Standard simulation time horizons (minutes)
    const horizons = [15, 30, 45, 60, 90, 120, 180, 240];
    const isochrones = horizons.map((mins) => this.generateWavefront(origin, mins, config, originDEM, fuelModel));

    // Determine target active wavefront
    const requestedMins = config.timeHorizonMinutes || 60;
    const activeWavefront = isochrones.find((w) => w.timeMinutes === requestedMins) || 
      this.generateWavefront(origin, requestedMins, config, originDEM, fuelModel);

    // Sample DEM profile along head fire propagation trajectory (up to 5 km)
    const kmPerDeg = 111.0;
    const cosLat = Math.cos((origin.lat * Math.PI) / 180);
    const headRad = (effectiveSpreadHeading * Math.PI) / 180;
    const transectDistKm = Math.max(2.5, activeWavefront.maxSpreadVelocityKmH * 1.5);

    const targetHeadPoint: GeoCoordinates = {
      lat: origin.lat + (transectDistKm * Math.cos(headRad)) / kmPerDeg,
      lng: origin.lng + (transectDistKm * Math.sin(headRad)) / (kmPerDeg * cosLat)
    };

    const demTransectProfile = sampleDEMProfile(origin, targetHeadPoint, 14);

    // Spotting distance estimation (Albini 1979 / Rothermel 1991)
    const spottingDistKm = Math.round(
      (0.038 * config.windSpeedKmH * Math.sqrt(activeWavefront.maxSpreadVelocityKmH) * (1 + originDEM.slopeDegrees / 60)) * 10
    ) / 10;

    // Containment urgency rating
    let containmentUrgency: PhysicalFireFrontSimulationResult['containmentUrgency'] = 'moderate';
    if (activeWavefront.peakFirelineIntensityKwM > 4500 || config.windSpeedKmH > 45) {
      containmentUrgency = 'extreme';
    } else if (activeWavefront.peakFirelineIntensityKwM > 2500 || config.windSpeedKmH > 32) {
      containmentUrgency = 'critical';
    } else if (activeWavefront.peakFirelineIntensityKwM > 1200) {
      containmentUrgency = 'high';
    } else if (activeWavefront.peakFirelineIntensityKwM < 500) {
      containmentUrgency = 'low';
    }

    // Head fire front tip point
    const headVertex = activeWavefront.headVertices[Math.floor(activeWavefront.headVertices.length / 2)] || activeWavefront.vertices[0];
    const headFireFrontPosition: GeoCoordinates = {
      lat: headVertex.lat,
      lng: headVertex.lng
    };

    // Calculate slope acceleration percentage
    const slopeAngleRad = (originDEM.slopeDegrees * Math.PI) / 180;
    const slopeAccelPct = Math.round((5.275 * Math.pow(Math.tan(slopeAngleRad), 2) * 0.45 + Math.sin(slopeAngleRad) * 0.9) * 100);

    // Length to width ratio
    const lwr = Number((1.0 + 0.12 * Math.pow(config.windSpeedKmH, 0.85)).toFixed(2));

    return {
      incidentId: incident?.id,
      origin,
      timestamp: new Date().toISOString(),
      windSpeedKmH: config.windSpeedKmH,
      windDirectionDegrees: config.windDirectionDegrees,
      windDirectionCardinal: degreesToCardinal(config.windDirectionDegrees),
      flamePushHeadingDegrees: windPushHeading,
      flamePushHeadingCardinal: degreesToCardinal(windPushHeading),
      fuelMoisturePercent: config.fuelMoisturePercent,
      fuelMoistureDampingFactor: Number(moistureDamping.toFixed(3)),
      fuelExtinctionMoisturePercent: fuelModel.extinctionMoisture,
      fuelModelName: fuelModel.nameEn,
      originDEM,
      isochrones,
      activeWavefront,
      effectiveSpreadHeadingDegrees: effectiveSpreadHeading,
      effectiveSpreadHeadingCardinal: degreesToCardinal(effectiveSpreadHeading),
      slopeAccelerationPercent: Math.max(10, slopeAccelPct),
      lengthToWidthRatio: lwr,
      demTransectProfile,
      containmentUrgency,
      headFireFrontPosition,
      maxSpottingPotentialDistanceKm: Math.max(0.2, spottingDistKm)
    };
  }
}
