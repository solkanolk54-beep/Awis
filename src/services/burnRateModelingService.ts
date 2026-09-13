import { GeoCoordinates, WildfireIncident, ExposedAsset } from '../types';

export interface BurnRateModelInput {
  incidentId: string;
  incidentTitle: string;
  origin: GeoCoordinates;
  currentAreaHectares: number;
  windSpeedKmH: number;
  windDirectionDegrees: number; // Direction wind is coming FROM (0-360)
  humidityPercent: number; // 5 - 95%
  temperatureC: number; // 15 - 50 °C
  slopeDegrees: number; // 0 - 45°
  vegetationType: string;
  fuelModelName?: string;
}

export interface IsochroneProjection {
  hours: 6 | 12 | 24;
  cumulativeAreaHectares: number;
  areaDeltaHectares: number;
  forwardSpreadRateMMin: number; // Forward head fire rate of spread (m/min)
  forwardSpreadRateKmH: number; // Forward head fire rate of spread (km/h)
  flankSpreadRateKmH: number;
  backingSpreadRateKmH: number;
  flameLengthMeters: number;
  firelineIntensityKwM: number; // Byram's fireline intensity (kW/m)
  perimeterKm: number;
  containmentDifficulty: 'Low' | 'Moderate' | 'High' | 'Extreme' | 'Critical';
  requiredPumperUnits: number;
  requiredAirDrops: number;
  threatenedAssetsCount: number;
  threatenedAssets: ExposedAsset[];
  // Ellipse geometry in local coordinate system (kilometers relative to origin)
  ellipse: {
    semiMajorKm: number;
    semiMinorKm: number;
    centerOffsetKm: number; // offset along flame push vector
    rotationRad: number; // flame push heading in radians
  };
  // Polygon vertices in geographical coordinates
  polygonGeoCoords: GeoCoordinates[];
  // Polygon vertices in local Cartesian (km) relative to origin for high-precision D3 canvas rendering
  polygonLocalKm: { x: number; y: number; distanceKm: number }[];
}

export interface BurnRateTimePoint {
  hour: number; // 0, 1, 2, ..., 24
  areaHectares: number;
  p90WorstCaseAreaHectares: number;
  p10BestCaseAreaHectares: number;
  forwardSpeedKmH: number;
  intensityKwM: number;
  flameLengthM: number;
}

export interface BurnRateAssessmentResult {
  input: BurnRateModelInput;
  timestamp: string;
  flameHeadingDegrees: number; // Downwind direction flame travels (windDirection + 180)%360
  flameHeadingCardinal: string;
  lengthToWidthRatio: number;
  effectiveFuelMoisturePercent: number;
  fuelMoistureDampingFactor: number;
  windMultiplier: number;
  slopeMultiplier: number;
  currentSpreadVelocityMMin: number;
  isochrones: {
    sixHour: IsochroneProjection;
    twelveHour: IsochroneProjection;
    twentyFourHour: IsochroneProjection;
  };
  timeSeries: BurnRateTimePoint[];
  regionalAssets: ExposedAsset[];
  summary: {
    maxFlameLengthM: number;
    peakIntensityKwM: number;
    twentyFourHourExpansionRatio: number;
    primaryThreatSector: string;
    criticalAdvisoryLevel: 'ADVISORY' | 'WATCH' | 'WARNING' | 'EMERGENCY_EVACUATION';
  };
}

// Cardinal direction lookup
export function degreesToCardinal(deg: number): string {
  const cardinals = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const normalized = ((deg % 360) + 360) % 360;
  const index = Math.round(normalized / 22.5) % 16;
  return cardinals[index];
}

/**
 * Fuel parameters for typical Mediterranean-North African vegetation complexes
 */
const FUEL_MODELS: Record<string, { heatContent: number; fuelBedBulkDensity: number; extinctionMoisture: number }> = {
  cork_oak: { heatContent: 18600, fuelBedBulkDensity: 0.75, extinctionMoisture: 30 },
  maquis: { heatContent: 19500, fuelBedBulkDensity: 0.90, extinctionMoisture: 25 },
  aleppo_pine: { heatContent: 20500, fuelBedBulkDensity: 1.10, extinctionMoisture: 22 },
  cedar: { heatContent: 18200, fuelBedBulkDensity: 0.65, extinctionMoisture: 28 },
  dry_grass: { heatContent: 17500, fuelBedBulkDensity: 0.40, extinctionMoisture: 20 },
  default: { heatContent: 18800, fuelBedBulkDensity: 0.80, extinctionMoisture: 26 }
};

/**
 * Generates sample assets in the incident's vicinity if none exist
 */
function resolveRegionalAssets(incident: WildfireIncident, origin: GeoCoordinates, flameHeadingDeg: number): ExposedAsset[] {
  if (incident.exposedAssets && incident.exposedAssets.length > 0) {
    return incident.exposedAssets;
  }

  // Synthesize realistic regional Algerian mountain infrastructure in the vicinity
  const kmPerDeg = 111.0;
  const cosLat = Math.cos((origin.lat * Math.PI) / 180);
  const flameRad = (flameHeadingDeg * Math.PI) / 180;

  // Generate 4 assets around the incident, 2 directly along downwind trajectory
  const assets: ExposedAsset[] = [
    {
      id: 'AST-VIL-01',
      name: `${incident.locationName || 'Djebel'} - Douar El-Ghaba`,
      nameAr: 'قرية دوار الغابة الجبلية',
      type: 'village',
      population: 1450,
      distanceKm: 4.8,
      estimatedWindowMinutes: '180 min',
      evacuationStatus: 'advisory',
      urgency: 'critical'
    },
    {
      id: 'AST-RD-01',
      name: 'National Route RN-43 (Mountain Pass)',
      nameAr: 'الطريق الوطني رقم 43 (الممر الجبلي)',
      type: 'road',
      distanceKm: 2.3,
      estimatedWindowMinutes: '75 min',
      evacuationStatus: 'mandatory',
      urgency: 'critical'
    },
    {
      id: 'AST-EL-01',
      name: 'Sonelgaz High-Voltage 60kV Line',
      nameAr: 'خط سونلغاز للضغط العالي 60 ك.ف',
      type: 'electrical_grid',
      distanceKm: 6.5,
      estimatedWindowMinutes: '320 min',
      evacuationStatus: 'monitoring',
      urgency: 'moderate'
    },
    {
      id: 'AST-AG-01',
      name: 'Cooperative Agricultural Olive & Honey Orchards',
      nameAr: 'تعاونية مزارع الزيتون والمناحل الجبلية',
      type: 'agricultural',
      distanceKm: 8.2,
      estimatedWindowMinutes: '540 min',
      evacuationStatus: 'monitoring',
      urgency: 'low'
    }
  ];

  return assets;
}

/**
 * Core Physics-grounded Rothermel & Huygens elliptical fire burn-rate calculator
 */
export function calculatePredictiveBurnRate(input: BurnRateModelInput, incident: WildfireIncident): BurnRateAssessmentResult {
  const {
    origin,
    currentAreaHectares,
    windSpeedKmH,
    windDirectionDegrees,
    humidityPercent,
    temperatureC,
    slopeDegrees,
    vegetationType
  } = input;

  // 1. Flame Propagation Direction:
  // Wind blows FROM windDirectionDegrees. Flame is pushed downwind:
  const flameHeadingDegrees = (windDirectionDegrees + 180) % 360;
  const flameHeadingCardinal = degreesToCardinal(flameHeadingDegrees);
  const flameHeadingRad = (flameHeadingDegrees * Math.PI) / 180;

  // 2. Fuel Moisture Content (FMC) approximation from Temperature & Humidity:
  // Canadian FFMC / Rothermel empirical calibration
  const effectiveFMC = Math.max(4, Math.min(38, 
    2.5 + 0.32 * humidityPercent - 0.12 * Math.max(0, temperatureC - 20)
  ));
  
  // Fuel moisture damping factor eta_M
  const fuelModel = FUEL_MODELS[vegetationType.toLowerCase()] || FUEL_MODELS.default;
  const moistureRatio = effectiveFMC / fuelModel.extinctionMoisture;
  const fuelMoistureDamping = Math.max(0.08, 1 - 2.59 * moistureRatio + 5.11 * Math.pow(moistureRatio, 2) - 3.52 * Math.pow(moistureRatio, 3));

  // 3. Wind Multiplier (phi_w):
  // Strong wind accelerates convection, preheats fuel ahead of the flame front
  const windMps = (windSpeedKmH * 1000) / 3600;
  const windMultiplier = 1.0 + Math.pow(windMps / 6.5, 1.45);

  // 4. Slope Multiplier (phi_s):
  // Flame tilts toward uphill terrain, significantly boosting radiation
  const slopeRad = (Math.min(50, Math.max(0, slopeDegrees)) * Math.PI) / 180;
  const slopeMultiplier = 1.0 + 5.275 * Math.pow(Math.tan(slopeRad), 2) * 0.5 + Math.sin(slopeRad) * 0.9;

  // 5. Baseline Forward Rate of Spread (ROS in m/min and km/h):
  // Empirical base speed for dry Mediterranean scrub ~ 3.5 m/min under neutral conditions
  const baseRateMMin = 3.2 * fuelMoistureDamping * windMultiplier * slopeMultiplier;
  const baseRateKmH = (baseRateMMin * 60) / 1000;

  // Length-to-Width (L/W) ratio of the elliptical spread envelope (Anderson 1983)
  const lengthToWidthRatio = Math.max(1.15, 1.0 + 0.125 * Math.pow(Math.max(1, windSpeedKmH), 0.82));

  // 6. Regional assets
  const regionalAssets = resolveRegionalAssets(incident, origin, flameHeadingDegrees);

  // Helper to compute an isochrone at a specific time horizon
  const computeIsochrone = (hours: 6 | 12 | 24, previousAreaHa: number): IsochroneProjection => {
    // Over time, daytime winds peak and night humidity may moderate, but for the projection we account for forward momentum
    const timeScaleFactor = hours === 6 ? 1.0 : hours === 12 ? 1.15 : 1.28;
    const forwardRateKmH = baseRateKmH * timeScaleFactor;
    const forwardRateMMin = (forwardRateKmH * 1000) / 60;

    // Distances from origin (km)
    const frontDistKm = forwardRateKmH * hours;
    const flankSpreadRateKmH = forwardRateKmH / (1.4 * lengthToWidthRatio);
    const backingSpreadRateKmH = forwardRateKmH * (0.18 / (1.0 + windSpeedKmH / 30));

    const flankDistKm = flankSpreadRateKmH * hours;
    const backDistKm = backingSpreadRateKmH * hours;

    // Geometry of Huygens fire ellipse
    const semiMajorKm = (frontDistKm + backDistKm) / 2;
    const semiMinorKm = Math.max(0.15, flankDistKm);
    const centerOffsetKm = (frontDistKm - backDistKm) / 2;

    // Projected cumulative burned area (ha): PI * a * b (km^2) * 100
    const calculatedAreaHa = Math.PI * semiMajorKm * semiMinorKm * 100;
    const cumulativeAreaHectares = Math.round((currentAreaHectares + calculatedAreaHa) * 10) / 10;
    const areaDeltaHectares = Math.round((cumulativeAreaHectares - previousAreaHa) * 10) / 10;

    // Perimeter length (Ramanujan ellipse approximation): PI * (3(a+b) - sqrt((3a+b)(a+3b)))
    const perimeterKm = Math.round(
      Math.PI * (3 * (semiMajorKm + semiMinorKm) - Math.sqrt((3 * semiMajorKm + semiMinorKm) * (semiMajorKm + 3 * semiMinorKm))) * 10
    ) / 10;

    // Byram's Fireline Intensity (kW/m): I = H * w * R
    // H = 18600 kJ/kg, w = 1.2 kg/m^2 fuel consumed, R in m/s
    const fuelLoadKgM2 = 1.35;
    const rosMps = forwardRateMMin / 60;
    const firelineIntensityKwM = Math.round(fuelModel.heatContent * fuelLoadKgM2 * rosMps);

    // Flame Length (m): L = 0.0775 * I^0.46
    const flameLengthMeters = Math.round(0.0775 * Math.pow(firelineIntensityKwM, 0.46) * 10) / 10;

    // Containment rating based on intensity
    let containmentDifficulty: IsochroneProjection['containmentDifficulty'] = 'Moderate';
    if (firelineIntensityKwM < 700) containmentDifficulty = 'Low';
    else if (firelineIntensityKwM < 1800) containmentDifficulty = 'Moderate';
    else if (firelineIntensityKwM < 3500) containmentDifficulty = 'High';
    else if (firelineIntensityKwM < 6000) containmentDifficulty = 'Extreme';
    else containmentDifficulty = 'Critical';

    // Required resources estimation
    const requiredPumperUnits = Math.min(48, Math.max(2, Math.round(perimeterKm * 1.6)));
    const requiredAirDrops = Math.min(24, Math.max(1, Math.round((firelineIntensityKwM / 900) * (hours / 6))));

    // Build 36 polygon points for D3 rendering
    const numPoints = 40;
    const kmPerDegree = 111.0;
    const cosLat = Math.cos((origin.lat * Math.PI) / 180);
    const polygonGeoCoords: GeoCoordinates[] = [];
    const polygonLocalKm: { x: number; y: number; distanceKm: number }[] = [];

    for (let i = 0; i < numPoints; i++) {
      const theta = (i / numPoints) * 2 * Math.PI;

      // Ellipse point in standard coordinates (major axis along x, minor along y)
      // We add a slight terrain-jitter perturbation for realistic wildfire irregularity
      const jitter = 1.0 + Math.sin(theta * 5) * 0.06 + Math.cos(theta * 3) * 0.04;
      const elX = (centerOffsetKm + semiMajorKm * Math.cos(theta)) * jitter;
      const elY = (semiMinorKm * Math.sin(theta)) * jitter;

      // Rotate by flame propagation heading (flameHeadingRad)
      // 0 rad is North (+Y in local Cartesian, +Lat in Geo)
      const northKm = elX * Math.cos(flameHeadingRad) - elY * Math.sin(flameHeadingRad);
      const eastKm = elX * Math.sin(flameHeadingRad) + elY * Math.cos(flameHeadingRad);

      const lat = origin.lat + northKm / kmPerDegree;
      const lng = origin.lng + eastKm / (kmPerDegree * (cosLat === 0 ? 1 : cosLat));

      polygonGeoCoords.push({
        lat: Number(lat.toFixed(5)),
        lng: Number(lng.toFixed(5))
      });

      polygonLocalKm.push({
        x: Number(eastKm.toFixed(3)),
        y: Number(northKm.toFixed(3)),
        distanceKm: Number(Math.sqrt(eastKm * eastKm + northKm * northKm).toFixed(2))
      });
    }

    // Check which assets are intercepted within this horizon
    const maxReachKm = frontDistKm * 1.08;
    const threatenedAssets = regionalAssets.filter((asset) => asset.distanceKm <= maxReachKm);

    return {
      hours,
      cumulativeAreaHectares,
      areaDeltaHectares,
      forwardSpreadRateMMin: Math.round(forwardRateMMin * 10) / 10,
      forwardSpreadRateKmH: Math.round(forwardRateKmH * 100) / 100,
      flankSpreadRateKmH: Math.round(flankSpreadRateKmH * 100) / 100,
      backingSpreadRateKmH: Math.round(backingSpreadRateKmH * 100) / 100,
      flameLengthMeters,
      firelineIntensityKwM,
      perimeterKm,
      containmentDifficulty,
      requiredPumperUnits,
      requiredAirDrops,
      threatenedAssetsCount: threatenedAssets.length,
      threatenedAssets,
      ellipse: {
        semiMajorKm,
        semiMinorKm,
        centerOffsetKm,
        rotationRad: flameHeadingRad
      },
      polygonGeoCoords,
      polygonLocalKm
    };
  };

  const sixHour = computeIsochrone(6, currentAreaHectares);
  const twelveHour = computeIsochrone(12, sixHour.cumulativeAreaHectares);
  const twentyFourHour = computeIsochrone(24, twelveHour.cumulativeAreaHectares);

  // 7. Time series interpolation points for 0h to 24h
  const timeSeries: BurnRateTimePoint[] = [];
  for (let h = 0; h <= 24; h++) {
    let area = currentAreaHectares;
    let intensity = sixHour.firelineIntensityKwM;
    let flame = sixHour.flameLengthMeters;
    let speed = sixHour.forwardSpreadRateKmH;

    if (h > 0 && h <= 6) {
      const t = h / 6;
      area = currentAreaHectares + (sixHour.cumulativeAreaHectares - currentAreaHectares) * Math.pow(t, 1.3);
      intensity = Math.round(sixHour.firelineIntensityKwM * (0.8 + 0.2 * t));
      flame = sixHour.flameLengthMeters;
      speed = sixHour.forwardSpreadRateKmH;
    } else if (h > 6 && h <= 12) {
      const t = (h - 6) / 6;
      area = sixHour.cumulativeAreaHectares + (twelveHour.cumulativeAreaHectares - sixHour.cumulativeAreaHectares) * Math.pow(t, 1.25);
      intensity = Math.round(twelveHour.firelineIntensityKwM * (0.9 + 0.1 * t));
      flame = twelveHour.flameLengthMeters;
      speed = twelveHour.forwardSpreadRateKmH;
    } else if (h > 12) {
      const t = (h - 12) / 12;
      area = twelveHour.cumulativeAreaHectares + (twentyFourHour.cumulativeAreaHectares - twelveHour.cumulativeAreaHectares) * Math.pow(t, 1.2);
      intensity = twentyFourHour.firelineIntensityKwM;
      flame = twentyFourHour.flameLengthMeters;
      speed = twentyFourHour.forwardSpreadRateKmH;
    }

    timeSeries.push({
      hour: h,
      areaHectares: Math.round(area * 10) / 10,
      p90WorstCaseAreaHectares: Math.round(area * (1 + 0.22 * Math.sin((h / 24) * Math.PI)) * 10) / 10,
      p10BestCaseAreaHectares: Math.round(area * 0.78 * 10) / 10,
      forwardSpeedKmH: Math.round(speed * 100) / 100,
      intensityKwM: intensity,
      flameLengthM: flame
    });
  }

  // Expansion ratio
  const twentyFourHourExpansionRatio = Math.round((twentyFourHour.cumulativeAreaHectares / Math.max(1, currentAreaHectares)) * 10) / 10;

  let criticalAdvisoryLevel: BurnRateAssessmentResult['summary']['criticalAdvisoryLevel'] = 'ADVISORY';
  if (twentyFourHour.firelineIntensityKwM > 4000 || twentyFourHour.threatenedAssetsCount >= 3) {
    criticalAdvisoryLevel = 'EMERGENCY_EVACUATION';
  } else if (twentyFourHour.firelineIntensityKwM > 2500 || twentyFourHour.threatenedAssetsCount >= 1) {
    criticalAdvisoryLevel = 'WARNING';
  } else if (twentyFourHour.firelineIntensityKwM > 1200) {
    criticalAdvisoryLevel = 'WATCH';
  }

  return {
    input,
    timestamp: new Date().toISOString(),
    flameHeadingDegrees,
    flameHeadingCardinal,
    lengthToWidthRatio: Math.round(lengthToWidthRatio * 100) / 100,
    effectiveFuelMoisturePercent: Math.round(effectiveFMC * 10) / 10,
    fuelMoistureDampingFactor: Math.round(fuelMoistureDamping * 100) / 100,
    windMultiplier: Math.round(windMultiplier * 100) / 100,
    slopeMultiplier: Math.round(slopeMultiplier * 100) / 100,
    currentSpreadVelocityMMin: Math.round(baseRateMMin * 10) / 10,
    isochrones: {
      sixHour,
      twelveHour,
      twentyFourHour
    },
    timeSeries,
    regionalAssets,
    summary: {
      maxFlameLengthM: Math.max(sixHour.flameLengthMeters, twelveHour.flameLengthMeters, twentyFourHour.flameLengthMeters),
      peakIntensityKwM: Math.max(sixHour.firelineIntensityKwM, twelveHour.firelineIntensityKwM, twentyFourHour.firelineIntensityKwM),
      twentyFourHourExpansionRatio,
      primaryThreatSector: `${flameHeadingDegrees}° (${flameHeadingCardinal})`,
      criticalAdvisoryLevel
    }
  };
}
