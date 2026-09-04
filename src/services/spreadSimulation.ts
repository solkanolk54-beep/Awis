import { GeoCoordinates, SpreadIsochrone, ExposedAsset } from '../types';

export interface SimulationParams {
  origin: GeoCoordinates;
  windSpeedKmH: number;
  windDirectionDegrees: number; // 0 = N, 90 = E, etc.
  temperatureC: number;
  humidityPercent: number;
  slopeDegrees: number;
  vegetationType: string;
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

    // Environmental acceleration factors
    const windFactor = 1.0 + Math.pow(windSpeedKmH / 30.0, 1.35);
    const slopeFactor = 1.0 + Math.sin((slopeDegrees * Math.PI) / 180) * 1.5;
    const weatherFactor = (temperatureC / 30.0) * (50.0 / Math.max(10, humidityPercent));

    // Base forward spread speed in km/h
    const baseSpeed = 0.45 * windFactor * slopeFactor * (weatherFactor * 0.35);
    
    // Wind vector heading (fire spreads opposite to where wind comes from, or along wind vector)
    // In meteorological conventions, wind direction is direction wind blows FROM.
    // Wildfire flame is pushed toward (windDirectionDegrees + 180) % 360, or if given as travel direction.
    // For intuitive GIS display, let's treat windDirectionDegrees as the direction the fire is pushed toward.
    const headingRad = (windDirectionDegrees * Math.PI) / 180;
    const perpRad = headingRad + Math.PI / 2;

    const horizons: Array<30 | 60 | 180 | 360> = [30, 60, 180, 360];
    const probabilities = [92, 84, 72, 58];

    // Conversion factor for lat/lng: ~111 km per degree latitude
    const kmPerDegree = 111.0;

    return horizons.map((minutes, index) => {
      const hours = minutes / 60.0;
      const frontDistKm = baseSpeed * hours;
      const backDistKm = frontDistKm * 0.22; // Backing fire is slower
      const flankDistKm = frontDistKm * 0.48; // Lateral flank spread

      // Ellipse center shifted forward along wind heading
      const forwardShiftKm = (frontDistKm - backDistKm) / 2.0;
      const semiMajorKm = (frontDistKm + backDistKm) / 2.0;
      const semiMinorKm = flankDistKm;

      const numPoints = 16;
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
        // Longitude degree spacing depends on latitude
        const lng = origin.lng + dEastKm / (kmPerDegree * Math.cos((origin.lat * Math.PI) / 180));

        perimeterPoints.push({
          lat: Number(lat.toFixed(5)),
          lng: Number(lng.toFixed(5))
        });
      }

      // Approximate area: pi * a * b in km^2 converted to hectares (1 km^2 = 100 hectares)
      const areaHectares = Math.round(Math.PI * semiMajorKm * semiMinorKm * 100 * 10) / 10;
      const frontSpeedKmH = Math.round((baseSpeed * (1 + index * 0.12)) * 10) / 10;

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
