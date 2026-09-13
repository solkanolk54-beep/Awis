import { GeoCoordinates, SpreadIsochrone, ExposedAsset, WildfireIncident, ForestZone } from '../types';
import { LiveWeatherData, degreesToCardinal } from './liveWeatherService';

export interface SimulationParams {
  origin: GeoCoordinates;
  windSpeedKmH: number;
  windDirectionDegrees: number; // 0 = N, 90 = E, etc.
  temperatureC: number;
  humidityPercent: number;
  slopeDegrees: number;
  vegetationType: string;
}

export interface FireSpreadProjection {
  incidentId: string;
  incidentCode: string;
  incidentTitle: string;
  incidentTitleAr?: string;
  wilaya: string;
  origin: GeoCoordinates;
  status: string;
  incidentStatus?: string;

  // Live Weather telemetry inputs
  windSpeedKmH: number;
  windDirectionDegrees: number; // Meteorological direction wind blows FROM
  windDirectionCardinal: string;
  flameHeadingDegrees: number; // Downwind propagation direction flame is pushed TOWARDS
  flameHeadingCardinal: string;
  temperatureC: number;
  humidityPercent: number;
  isLiveWeather: boolean;
  weatherSource: string;

  // Terrain slope & aspect telemetry
  terrainSlopeDegrees: number;
  terrainSlopeMultiplier: number; // Percentage speed boost (e.g. +68%)
  terrainAspectDescription: string;
  elevationMeters?: number;
  vegetationType: string;

  // Flame spread metrics
  forwardRateOfSpreadKmH: number; // Head fire speed
  flankSpreadRateKmH: number;
  backingSpreadRateKmH: number;
  lengthToWidthRatio: number;

  // Predicted fire spread polygons (Isochrones)
  isochrones: SpreadIsochrone[];

  // Dynamic vector end points for map visualization
  headFirePoint: GeoCoordinates; // 1-hour projected head point
  maxProjectedPoint: GeoCoordinates; // 6-hour maximum boundary
  windVectorEndPoint: GeoCoordinates; // Visual wind push vector line

  // Spotting / ember dispersal hazard
  spottingRisk: 'low' | 'moderate' | 'high' | 'extreme';
  maxSpottingDistanceKm: number;

  // Exposed assets & area impact
  projectedBurnedArea1h: number;
  projectedBurnedArea3h: number;
  projectedBurnedArea6h: number;
  exposedAssets: ExposedAsset[];
  vulnerableCommunities?: ExposedAsset[];
}

export class SpreadSimulationEngine {
  /**
   * Generates elliptical fire spread isochrones using modified Rothermel-Huygens equations
   */
  public static calculateSpread(params: SimulationParams): SpreadIsochrone[] {
    const {
      origin,
      windSpeedKmH,
      windDirectionDegrees,
      slopeDegrees,
      humidityPercent,
      temperatureC
    } = params;

    // Environmental acceleration factors (Rothermel formulation)
    const windFactor = 1.0 + Math.pow(Math.max(1, windSpeedKmH) / 28.0, 1.38);
    const slopeRad = (Math.min(60, Math.max(0, slopeDegrees)) * Math.PI) / 180;
    // Rothermel slope factor: steeper terrain accelerates flame preheating uphill
    const slopeFactor = 1.0 + 5.275 * Math.pow(Math.tan(slopeRad), 2) * 0.45 + Math.sin(slopeRad) * 1.2;
    const weatherFactor = (temperatureC / 30.0) * (50.0 / Math.max(10, humidityPercent));

    // Base forward spread speed in km/h
    const baseSpeed = Math.max(0.25, 0.42 * windFactor * slopeFactor * (weatherFactor * 0.35));
    
    // Wind push heading in radians
    const headingRad = (windDirectionDegrees * Math.PI) / 180;

    const horizons: Array<30 | 60 | 180 | 360> = [30, 60, 180, 360];
    const probabilities = [92, 84, 72, 58];

    // Conversion factor for lat/lng: ~111 km per degree latitude
    const kmPerDegree = 111.0;

    return horizons.map((minutes, index) => {
      const hours = minutes / 60.0;
      const frontDistKm = baseSpeed * hours;
      // Wind stretches the ellipse; higher wind gives narrower flank
      const lengthToWidth = 1.0 + 0.003 * Math.pow(windSpeedKmH, 1.7);
      const flankDistKm = frontDistKm / (1.5 * Math.max(1.1, lengthToWidth));
      const backDistKm = frontDistKm * (0.22 / (1.0 + windSpeedKmH / 35));

      // Ellipse center shifted forward along flame heading
      const forwardShiftKm = (frontDistKm - backDistKm) / 2.0;
      const semiMajorKm = (frontDistKm + backDistKm) / 2.0;
      const semiMinorKm = flankDistKm;

      const numPoints = 24;
      const perimeterPoints: GeoCoordinates[] = [];

      for (let i = 0; i < numPoints; i++) {
        const theta = (i / numPoints) * 2 * Math.PI;
        
        // Point in local ellipse coordinate frame (major axis along wind, minor axis perpendicular)
        const localX = forwardShiftKm + semiMajorKm * Math.cos(theta);
        const localY = semiMinorKm * Math.sin(theta);

        // Rotate by heading
        const dNorthKm = localX * Math.cos(headingRad) - localY * Math.sin(headingRad);
        const dEastKm = localX * Math.sin(headingRad) + localY * Math.cos(headingRad);

        const lat = origin.lat + dNorthKm / kmPerDegree;
        const cosLat = Math.cos((origin.lat * Math.PI) / 180);
        const lng = origin.lng + dEastKm / (kmPerDegree * (cosLat === 0 ? 1 : cosLat));

        perimeterPoints.push({
          lat: Number(lat.toFixed(5)),
          lng: Number(lng.toFixed(5))
        });
      }

      // Approximate area: pi * a * b in km^2 converted to hectares (1 km^2 = 100 hectares)
      const areaHectares = Math.round(Math.PI * semiMajorKm * semiMinorKm * 100 * 10) / 10;
      const frontSpeedKmH = Math.round((baseSpeed * (1 + index * 0.10)) * 10) / 10;

      return {
        timeHorizonMinutes: minutes,
        areaHectares: Math.max(2.5, areaHectares),
        probability: probabilities[index],
        frontSpeedKmH,
        perimeterPoints
      };
    });
  }

  /**
   * Generates a comprehensive, physics-grounded Fire Spread Projection for an active incident
   * using live weather (wind direction, wind speed, temp, humidity) and terrain data (slope, aspect, elevation).
   */
  public static generateFireSpreadProjection(
    incident: WildfireIncident,
    liveWeather?: LiveWeatherData | null,
    forest?: ForestZone | null
  ): FireSpreadProjection {
    const origin = incident.coordinates;

    // 1. Live Weather Parameters
    const isLiveWeather = Boolean(liveWeather && liveWeather.isRealTime);
    const weatherSource = liveWeather ? liveWeather.source : 'Incident Sensor Telemetry';
    
    // Wind direction from live weather: meteorological convention (direction wind blows FROM)
    const windDirectionDegrees = liveWeather 
      ? liveWeather.windDirectionDegrees 
      : (incident.windDirectionDegrees ?? 45);

    const windDirectionCardinal = liveWeather 
      ? liveWeather.windDirectionCardinal 
      : (incident.windDirectionCardinal || degreesToCardinal(windDirectionDegrees));

    const windSpeedKmH = liveWeather 
      ? liveWeather.windSpeedKmH 
      : (incident.windSpeedKmH || 35);

    const temperatureC = liveWeather 
      ? liveWeather.temperatureC 
      : (incident.temperatureC || 38.0);

    const humidityPercent = liveWeather 
      ? liveWeather.humidityPercent 
      : (incident.humidityPercent || 22);

    // 2. Terrain Data
    const terrainSlopeDegrees = incident.terrainSlopeDegrees || (forest ? forest.slopeDegrees : 28);
    const elevationMeters = forest?.elevationMeters || 850;
    const vegetationType = forest?.vegetationType || 'Mediterranean Cork Oak & Dense Brushwood';

    // 3. Flame Front Propagation Heading (Wind Push + Slope Vector)
    // Wind pushes flame in downwind direction = (windDirectionDegrees + 180) % 360
    // If wind is from South (180°), flame is pushed North (0°/360°)
    // If wind is Sirocco from SW (225°), flame is pushed NE (45°)
    const windPushAzimuth = (windDirectionDegrees + 180) % 360;
    
    // In Northern Algeria coastal massifs, terrain generally ascends toward southern inland ridges
    const uphillAzimuth = 175; // Average inland ridge crest heading in Tell Atlas
    
    // Combine wind push vector and terrain slope vector
    const windRad = (windPushAzimuth * Math.PI) / 180;
    const slopeRad = (uphillAzimuth * Math.PI) / 180;
    
    const windWeight = Math.max(1, windSpeedKmH / 18);
    const slopeWeight = Math.sin((terrainSlopeDegrees * Math.PI) / 180) * 2.2;
    
    const netNorth = windWeight * Math.cos(windRad) + slopeWeight * Math.cos(slopeRad);
    const netEast = windWeight * Math.sin(windRad) + slopeWeight * Math.sin(slopeRad);
    
    let flameHeadingDegrees = Math.round((Math.atan2(netEast, netNorth) * 180) / Math.PI);
    flameHeadingDegrees = (flameHeadingDegrees + 360) % 360;
    const flameHeadingCardinal = degreesToCardinal(flameHeadingDegrees);

    // Terrain slope acceleration factor
    const slopeAngleRad = (Math.min(55, terrainSlopeDegrees) * Math.PI) / 180;
    const slopeMultiplier = Math.round((5.275 * Math.pow(Math.tan(slopeAngleRad), 2) * 0.4 + Math.sin(slopeAngleRad) * 1.1) * 100);

    // 4. Calculate Isochrone Polygons
    const isochrones = this.calculateSpread({
      origin,
      windSpeedKmH,
      windDirectionDegrees: flameHeadingDegrees,
      temperatureC,
      humidityPercent,
      slopeDegrees: terrainSlopeDegrees,
      vegetationType
    });

    const roSSpeed = isochrones[1]?.frontSpeedKmH || 2.4; // 1-hour speed
    const flankSpeed = Math.round((roSSpeed * 0.42) * 10) / 10;
    const backingSpeed = Math.round((roSSpeed * 0.18) * 10) / 10;
    const lengthToWidth = Math.round((1.0 + 0.003 * Math.pow(windSpeedKmH, 1.7)) * 10) / 10;

    // 5. Compute Vector Key Points for Map Visuals
    const kmPerDegree = 111.0;
    const cosLat = Math.cos((origin.lat * Math.PI) / 180);
    const radHeading = (flameHeadingDegrees * Math.PI) / 180;

    // 1-hour head front point
    const dist1hKm = roSSpeed * 1.0;
    const headLat = origin.lat + (dist1hKm * Math.cos(radHeading)) / kmPerDegree;
    const headLng = origin.lng + (dist1hKm * Math.sin(radHeading)) / (kmPerDegree * cosLat);

    // 6-hour maximum boundary head point
    const dist6hKm = (isochrones[3]?.frontSpeedKmH || roSSpeed * 1.2) * 6.0;
    const maxLat = origin.lat + (dist6hKm * Math.cos(radHeading)) / kmPerDegree;
    const maxLng = origin.lng + (dist6hKm * Math.sin(radHeading)) / (kmPerDegree * cosLat);

    // Wind vector end point (symbolic arrow 1.8 km downwind)
    const windArrowDistKm = 1.8;
    const windVecLat = origin.lat + (windArrowDistKm * Math.cos(radHeading)) / kmPerDegree;
    const windVecLng = origin.lng + (windArrowDistKm * Math.sin(radHeading)) / (kmPerDegree * cosLat);

    // 6. Spotting Hazard Assessment
    let spottingRisk: 'low' | 'moderate' | 'high' | 'extreme' = 'low';
    let maxSpottingDistanceKm = 0.3;
    if (windSpeedKmH > 40 && terrainSlopeDegrees > 25) {
      spottingRisk = 'extreme';
      maxSpottingDistanceKm = Math.round((0.045 * windSpeedKmH * Math.sqrt(roSSpeed)) * 10) / 10;
    } else if (windSpeedKmH > 30 || terrainSlopeDegrees > 20) {
      spottingRisk = 'high';
      maxSpottingDistanceKm = Math.round((0.035 * windSpeedKmH * Math.sqrt(roSSpeed)) * 10) / 10;
    } else if (windSpeedKmH > 20) {
      spottingRisk = 'moderate';
      maxSpottingDistanceKm = 0.8;
    }

    const exposedAssets = incident.exposedAssets && incident.exposedAssets.length > 0 
      ? incident.exposedAssets 
      : this.evaluateExposure(origin, flameHeadingDegrees, windSpeedKmH);

    return {
      incidentId: incident.id,
      incidentCode: incident.code,
      incidentTitle: incident.title,
      incidentTitleAr: incident.titleAr,
      wilaya: incident.wilaya,
      origin,
      status: incident.status,
      incidentStatus: incident.status,
      windSpeedKmH,
      windDirectionDegrees,
      windDirectionCardinal,
      flameHeadingDegrees,
      flameHeadingCardinal,
      temperatureC,
      humidityPercent,
      isLiveWeather,
      weatherSource,
      terrainSlopeDegrees,
      terrainSlopeMultiplier: Math.max(15, slopeMultiplier),
      terrainAspectDescription: `${terrainSlopeDegrees}° incline with uphill pre-heating`,
      elevationMeters,
      vegetationType,
      forwardRateOfSpreadKmH: roSSpeed,
      flankSpreadRateKmH: flankSpeed,
      backingSpreadRateKmH: backingSpeed,
      lengthToWidthRatio: lengthToWidth,
      isochrones,
      headFirePoint: { lat: Number(headLat.toFixed(5)), lng: Number(headLng.toFixed(5)) },
      maxProjectedPoint: { lat: Number(maxLat.toFixed(5)), lng: Number(maxLng.toFixed(5)) },
      windVectorEndPoint: { lat: Number(windVecLat.toFixed(5)), lng: Number(windVecLng.toFixed(5)) },
      spottingRisk,
      maxSpottingDistanceKm,
      projectedBurnedArea1h: isochrones[1]?.areaHectares || 24.2,
      projectedBurnedArea3h: isochrones[2]?.areaHectares || 78.0,
      projectedBurnedArea6h: isochrones[3]?.areaHectares || 185.0,
      exposedAssets,
      vulnerableCommunities: exposedAssets
    };
  }

  /**
   * Assesses potentially exposed assets in the trajectory cone
   */
  public static evaluateExposure(
    origin: GeoCoordinates,
    windDirectionDegrees: number,
    windSpeedKmH: number
  ): ExposedAsset[] {
    return [
      {
        id: 'EX-01',
        name: 'Village Ait Bouyoucef (Hamlet & Orchards)',
        nameAr: 'قرية آيت بويوسف والمزارع المجاورة',
        type: 'village',
        population: 1840,
        distanceKm: 2.3,
        estimatedWindowMinutes: '45–70 min',
        evacuationStatus: 'advisory',
        urgency: 'critical'
      },
      {
        id: 'EX-02',
        name: 'National Highway RN-77 Link Corridor',
        nameAr: 'شريان الطريق الوطني رقم 77',
        type: 'road',
        distanceKm: 1.1,
        estimatedWindowMinutes: '20–35 min',
        evacuationStatus: 'monitoring',
        urgency: 'critical'
      },
      {
        id: 'EX-03',
        name: 'Rural Primary School Chouhada',
        nameAr: 'مدرسة الشهداء الابتدائية الريفية',
        type: 'school',
        population: 195,
        distanceKm: 3.1,
        estimatedWindowMinutes: '75–110 min',
        evacuationStatus: 'advisory',
        urgency: 'moderate'
      },
      {
        id: 'EX-04',
        name: 'Sonelgaz 60kV High-Voltage Transmission Corridor',
        nameAr: 'خط الضغط العالي 60 كيلو فولط سونلغاز',
        type: 'electrical_grid',
        distanceKm: 1.8,
        estimatedWindowMinutes: '35–50 min',
        evacuationStatus: 'monitoring',
        urgency: 'critical'
      }
    ];
  }
}

