// AWIS — Dynamic Cellular Automata Wildfire Propagation Engine
// Models fire spread velocity and elliptical wavefront growth based on Rothermel-Huygens equations
// Coupled with wind vectors, topographic mountain slope, and ALSAT NDVI fuel moisture

export interface PropagationParams {
  origin: { lat: number; lng: number };
  originName?: string;
  originNameAr?: string;
  windSpeedKmH: number;         // Wind speed (km/h)
  windDirectionDegrees: number; // Meteorological direction wind blows FROM (0=N, 90=E, 180=S, 270=W)
  slopeDegrees: number;         // Topographic slope angle (0° to 45°)
  slopeAspectDegrees: number;   // Direction the mountain slope climbs uphill (0° to 360°)
  ndvi: number;                 // ALSAT NDVI index (0.10 to 0.70)
  ambientTempC?: number;        // Temperature °C
  relativeHumidity?: number;    // Humidity %
}

export interface IsochroneZone {
  timeMinutes: number;          // 15, 30, 60, 120
  labelEn: string;
  labelAr: string;
  color: string;
  strokeColor: string;
  fillColor: string;
  fillOpacity: number;
  polygon: Array<{ lat: number; lng: number }>;
  burnedHectares: number;
  perimeterKm: number;
  headDistanceKm: number;
  headRateOfSpreadMMin: number;
}

export interface ThreatenedAsset {
  id: string;
  name: string;
  nameAr: string;
  category: 'village' | 'highway' | 'infrastructure' | 'water' | 'hospital';
  coordinates: { lat: number; lng: number };
  distanceKm: number;
  bearingDeg: number;
  timeToImpactMinutes: number | null; // null if outside fire cone
  urgency: 'critical' | 'high' | 'moderate' | 'safe';
  evacuationRecommended: boolean;
  evacuationRouteDescriptionAr: string;
  evacuationRouteDescriptionEn: string;
}

export interface DynamicMinuteState {
  minute: number;
  activeFrontPolygon: Array<{ lat: number; lng: number }>;
  headFireFrontPoint: { lat: number; lng: number };
  burnedHectares: number;
  perimeterKm: number;
  rateOfSpreadMMin: number;
  flameHeightMeters: number;
}

export interface PropagationSimulationResult {
  params: PropagationParams;
  flameHeadingDegrees: number;        // Direction fire moves TOWARDS
  flameHeadingCardinal: string;
  forwardRosKmH: number;              // Head fire spread speed (km/h)
  flankRosKmH: number;
  backingRosKmH: number;
  lengthToWidthRatio: number;
  effectiveSlopeMultiplier: number;
  effectiveWindMultiplier: number;
  effectiveMoistureMultiplier: number;
  isochrones: IsochroneZone[];
  threatenedAssets: ThreatenedAsset[];
  totalThreatenedPopulation: number;
  getStateAtMinute: (minute: number) => DynamicMinuteState;
}

// Fixed catalog of strategic assets and communities across Mila Operational Sector
export const MILA_STRATEGIC_ASSETS = [
  {
    id: 'ASSET-01',
    name: 'Beni Haroun Main Water Pumping Station',
    nameAr: 'محطة الضخ الرئيسية لسد بني هارون',
    category: 'infrastructure' as const,
    coordinates: { lat: 36.542, lng: 6.278 },
    population: 85,
    evacRouteAr: 'الإخلاء الفوري جنوباً عبر المسلك المحمي نحو القرارم قوقة',
    evacRouteEn: 'Evacuate south via protected corridor toward Grarem Gouga'
  },
  {
    id: 'ASSET-02',
    name: 'Grarem Gouga Residential Northern Edge',
    nameAr: 'الأحياء الشمالية لبلدية القرارم قوقة',
    category: 'village' as const,
    coordinates: { lat: 36.525, lng: 6.265 },
    population: 4200,
    evacRouteAr: 'مسار الإخلاء الإلزامي: الطريق الوطني RN27 باتجاه قسنطينة',
    evacRouteEn: 'Mandatory evacuation axis: RN27 highway toward Constantine'
  },
  {
    id: 'ASSET-03',
    name: 'Douar Ouled Aoun Mountain Village',
    nameAr: 'قرية أولاد عون (سفح جبل قروز)',
    category: 'village' as const,
    coordinates: { lat: 36.435, lng: 6.195 },
    population: 650,
    evacRouteAr: 'الإخلاء الاستعجالي عبر الطريق الولائي CW105 نحو وادي النجاء',
    evacRouteEn: 'Emergency evacuation via CW105 road toward Oued Endja'
  },
  {
    id: 'ASSET-04',
    name: 'National Highway RN27 Corridor (Mila-Constantine)',
    nameAr: 'محور الطريق الوطني RN27 (ميلة - قسنطينة)',
    category: 'highway' as const,
    coordinates: { lat: 36.485, lng: 6.310 },
    population: 0,
    evacRouteAr: 'غلق فوري لحركة السير وتحويل المركبات عبر الطريق الوطني RN79',
    evacRouteEn: 'Immediate road closure; divert traffic toward RN79'
  },
  {
    id: 'ASSET-05',
    name: 'Tessala Lemtai Agricultural Cooperatives',
    nameAr: 'التعاونيات الفلاحية ومداشر تسالة لمطاعي',
    category: 'village' as const,
    coordinates: { lat: 36.585, lng: 6.155 },
    population: 1850,
    evacRouteAr: 'المسار الوقائي نحو باينان والقرارم غرباً',
    evacRouteEn: 'Precautionary evacuation westward toward Bainan'
  },
  {
    id: 'ASSET-06',
    name: 'Mountain Highway RN105 Pass',
    nameAr: 'محور الطريق الوطني الجبلي RN105',
    category: 'highway' as const,
    coordinates: { lat: 36.505, lng: 6.210 },
    population: 0,
    evacRouteAr: 'تنبيه أرتال الحماية المدنية وقطع حركة الشاحنات',
    evacRouteEn: 'Alert DGPC mobile columns and restrict heavy truck traffic'
  },
  {
    id: 'ASSET-07',
    name: 'Sonelgaz High-Voltage Electrical Substation',
    nameAr: 'محطة سونلغاز للضغط العالي لتحويل الكهرباء',
    category: 'infrastructure' as const,
    coordinates: { lat: 36.460, lng: 6.250 },
    population: 40,
    evacRouteAr: 'تفعيل نظام الإخماد الرغوي الذاتي وعزل الخطوط',
    evacRouteEn: 'Trigger autonomous foam suppression; isolate power grid'
  },
  {
    id: 'ASSET-08',
    name: 'Sidi Maarouf Forest Outskirts',
    nameAr: 'التجمعات الغابية بسيدي معروف',
    category: 'village' as const,
    coordinates: { lat: 36.635, lng: 6.120 },
    population: 920,
    evacRouteAr: 'الإخلاء شمالاً نحو الميلية والنزول لجيجل',
    evacRouteEn: 'Evacuate north toward El Milia / Jijel'
  }
];

// Helper converting degrees to cardinal string
export function degreesToCardinal(deg: number): string {
  const normalized = ((deg % 360) + 360) % 360;
  const cardinals = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(normalized / 22.5) % 16;
  return cardinals[index];
}

/**
 * Calculates Haversine ground distance and bearing between two points
 */
export function calculateDistanceAndBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): { distanceKm: number; bearingDeg: number } {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = Number((R * c).toFixed(2));

  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  const bearingRad = Math.atan2(y, x);
  const bearingDeg = ((bearingRad * 180) / Math.PI + 360) % 360;

  return { distanceKm, bearingDeg: Math.round(bearingDeg) };
}

/**
 * Computes an elliptical fire wavefront polygon for a specific duration in minutes
 */
function computeWavefrontPolygon(
  origin: { lat: number; lng: number },
  headingDeg: number,
  forwardRosKmH: number,
  flankRosKmH: number,
  backingRosKmH: number,
  durationMinutes: number
): {
  polygon: Array<{ lat: number; lng: number }>;
  headPoint: { lat: number; lng: number };
  burnedHectares: number;
  perimeterKm: number;
  headDistanceKm: number;
} {
  const timeHours = durationMinutes / 60;
  const headDistKm = forwardRosKmH * timeHours;
  const backDistKm = backingRosKmH * timeHours;
  const flankDistKm = flankRosKmH * timeHours;

  // Center offset from origin in heading direction
  const centerOffsetKm = (headDistKm - backDistKm) / 2;
  const semiMajorAxisKm = (headDistKm + backDistKm) / 2;
  const semiMinorAxisKm = flankDistKm;

  const headingRad = (headingDeg * Math.PI) / 180;
  const cosLat = Math.cos((origin.lat * Math.PI) / 180);
  const kmPerLat = 111.13;
  const kmPerLng = 111.13 * (cosLat > 0.05 ? cosLat : 0.05);

  // Center of ellipse in geographical space
  const centerLat = origin.lat + (centerOffsetKm * Math.cos(headingRad)) / kmPerLat;
  const centerLng = origin.lng + (centerOffsetKm * Math.sin(headingRad)) / kmPerLng;

  const numPoints = 36;
  const polygon: Array<{ lat: number; lng: number }> = [];

  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * 2 * Math.PI;
    // Local ellipse coordinates (x = flank/minor, y = head/major)
    const localX = semiMinorAxisKm * Math.cos(angle);
    const localY = semiMajorAxisKm * Math.sin(angle);

    // Rotate local coordinates by heading angle
    const rotatedX = localX * Math.cos(headingRad) + localY * Math.sin(headingRad);
    const rotatedY = -localX * Math.sin(headingRad) + localY * Math.cos(headingRad);

    const ptLat = centerLat + rotatedY / kmPerLat;
    const ptLng = centerLng + rotatedX / kmPerLng;

    polygon.push({
      lat: Number(ptLat.toFixed(5)),
      lng: Number(ptLng.toFixed(5))
    });
  }

  // Exact head fire tip point (maximum advance)
  const headLat = origin.lat + (headDistKm * Math.cos(headingRad)) / kmPerLat;
  const headLng = origin.lng + (headDistKm * Math.sin(headingRad)) / kmPerLng;

  // Approximate Ramanujan ellipse perimeter
  const a = semiMajorAxisKm;
  const b = semiMinorAxisKm;
  const h = Math.pow(a - b, 2) / Math.pow(a + b, 2);
  const perimeterKm = Number((Math.PI * (a + b) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)))).toFixed(2));

  // Burned area: pi * a * b (in km^2) * 100 = hectares
  const burnedHectares = Math.max(0.2, Number((Math.PI * a * b * 100).toFixed(1)));

  return {
    polygon,
    headPoint: { lat: Number(headLat.toFixed(5)), lng: Number(headLng.toFixed(5)) },
    burnedHectares,
    perimeterKm,
    headDistanceKm: Number(headDistKm.toFixed(2))
  };
}

/**
 * Executes the complete Rothermel-Huygens dynamic simulation engine
 */
export function simulateWildfirePropagation(params: PropagationParams): PropagationSimulationResult {
  const {
    origin,
    windSpeedKmH,
    windDirectionDegrees,
    slopeDegrees,
    slopeAspectDegrees,
    ndvi,
    ambientTempC = 36,
    relativeHumidity = 20
  } = params;

  // 1. Vector 1: Wind push vector (Direction wind pushes flames TOWARDS)
  // Meteorological direction 180 (South) pushes flames North (0 / 360)
  const windPushHeadingDeg = (windDirectionDegrees + 180) % 360;
  const windPushRad = (windPushHeadingDeg * Math.PI) / 180;
  // Non-linear wind power exponent (Rothermel wind factor)
  const phiW = 0.042 * Math.pow(Math.max(2, windSpeedKmH), 1.35);

  // 2. Vector 2: Topographic Slope Vector (Flames accelerate uphill)
  // Rothermel mountain slope acceleration: phi_s = 5.275 * tan(slope)^2
  const slopeRad = (Math.max(0, Math.min(48, slopeDegrees)) * Math.PI) / 180;
  const slopeAspectRad = (slopeAspectDegrees * Math.PI) / 180;
  const phiS = 5.275 * Math.pow(Math.tan(slopeRad), 2);

  // 3. Combined Resultant Vector (Wind + Topography)
  const vx = phiW * Math.sin(windPushRad) + phiS * Math.sin(slopeAspectRad);
  const vy = phiW * Math.cos(windPushRad) + phiS * Math.cos(slopeAspectRad);

  const flameHeadingRad = Math.atan2(vx, vy);
  const flameHeadingDegrees = Math.round(((flameHeadingRad * 180) / Math.PI + 360) % 360);
  const flameHeadingCardinal = degreesToCardinal(flameHeadingDegrees);
  const phiCombined = Math.sqrt(vx * vx + vy * vy);

  // 4. ALSAT Spectral Fuel Moisture Coefficient (F_d)
  // Lower NDVI (< 0.25) represents extreme cured summer dryness in Mila
  let phiM = 1.0;
  if (ndvi < 0.22) {
    phiM = 2.45; // Critical flammability boost
  } else if (ndvi < 0.32) {
    phiM = 1.85;
  } else if (ndvi < 0.45) {
    phiM = 1.35;
  } else {
    phiM = 0.85; // Moist lush forest buffers spread
  }

  // Weather humidity correction
  if (relativeHumidity < 15) phiM *= 1.25;
  if (ambientTempC > 38) phiM *= 1.20;

  // 5. Rates of Spread (ROS) in km/h
  const baseRosKmH = 0.22; // Base spread in calm conditions
  const forwardRosKmH = Number((baseRosKmH * (1 + phiCombined) * phiM).toFixed(2));

  // Length-to-Width Ratio (LWR) determines elliptical elongation
  const lengthToWidthRatio = Math.max(1.15, Number((1.0 + 0.11 * windSpeedKmH + 0.05 * slopeDegrees).toFixed(2)));
  const flankRosKmH = Number((forwardRosKmH / lengthToWidthRatio).toFixed(2));
  const backingRosKmH = Number((forwardRosKmH / (lengthToWidthRatio * 2.8)).toFixed(2));

  // 6. Generate Discrete Isochrone Zones (0-15m, 15-30m, 30-60m, 60-120m)
  const isochroneTiers = [
    {
      timeMinutes: 15,
      labelEn: '0 - 15 min: Active Front',
      labelAr: '0 - 15 دقيقة: جبهة النار المباشرة',
      color: '#ef4444',
      strokeColor: '#f87171',
      fillColor: '#ef4444',
      fillOpacity: 0.38
    },
    {
      timeMinutes: 30,
      labelEn: '15 - 30 min: Primary Expansion',
      labelAr: '15 - 30 دقيقة: نطاق التمدد الأول',
      color: '#f97316',
      strokeColor: '#fb923c',
      fillColor: '#f97316',
      fillOpacity: 0.26
    },
    {
      timeMinutes: 60,
      labelEn: '30 - 60 min: Defense Line & Alert',
      labelAr: '30 - 60 دقيقة: خط الدفاع والتنبيه',
      color: '#eab308',
      strokeColor: '#facc15',
      fillColor: '#eab308',
      fillOpacity: 0.18
    },
    {
      timeMinutes: 120,
      labelEn: '60 - 120 min: Maximum Projected Boundary',
      labelAr: '60 - 120 دقيقة: النطاق الأقصى المتوقع',
      color: '#06b6d4',
      strokeColor: '#22d3ee',
      fillColor: '#06b6d4',
      fillOpacity: 0.12
    }
  ];

  const isochrones: IsochroneZone[] = isochroneTiers.map(tier => {
    const res = computeWavefrontPolygon(
      origin,
      flameHeadingDegrees,
      forwardRosKmH,
      flankRosKmH,
      backingRosKmH,
      tier.timeMinutes
    );

    const headRosMMin = Math.round((forwardRosKmH * 1000) / 60);

    return {
      ...tier,
      polygon: res.polygon,
      burnedHectares: res.burnedHectares,
      perimeterKm: res.perimeterKm,
      headDistanceKm: res.headDistanceKm,
      headRateOfSpreadMMin: headRosMMin
    };
  });

  // 7. Threatened Assets & Evacuation Corridor Intersection
  let totalThreatenedPopulation = 0;

  const threatenedAssets: ThreatenedAsset[] = MILA_STRATEGIC_ASSETS.map(asset => {
    const { distanceKm, bearingDeg } = calculateDistanceAndBearing(
      origin.lat,
      origin.lng,
      asset.coordinates.lat,
      asset.coordinates.lng
    );

    // Calculate angular deviation from fire propagation heading
    let angleDiff = Math.abs(bearingDeg - flameHeadingDegrees);
    if (angleDiff > 180) angleDiff = 360 - angleDiff;

    // Fire expansion cone aperture angle (typically ~45° each side)
    const coneAngle = Math.max(30, Math.min(65, 80 / lengthToWidthRatio));
    const isDownwindCone = angleDiff <= coneAngle;

    let timeToImpactMinutes: number | null = null;
    let urgency: 'critical' | 'high' | 'moderate' | 'safe' = 'safe';
    let evacuationRecommended = false;

    if (isDownwindCone) {
      // Effective speed in the direction of the asset
      const cosDev = Math.cos((angleDiff * Math.PI) / 180);
      const effectiveSpeedKmH = Math.max(flankRosKmH, forwardRosKmH * cosDev);
      const ttiHours = distanceKm / effectiveSpeedKmH;
      const ttiMins = Math.round(ttiHours * 60);

      if (ttiMins <= 120) {
        timeToImpactMinutes = ttiMins;

        if (ttiMins <= 20) {
          urgency = 'critical';
          evacuationRecommended = true;
          totalThreatenedPopulation += asset.population;
        } else if (ttiMins <= 45) {
          urgency = 'high';
          evacuationRecommended = true;
          totalThreatenedPopulation += asset.population;
        } else {
          urgency = 'moderate';
          evacuationRecommended = false;
        }
      }
    }

    return {
      id: asset.id,
      name: asset.name,
      nameAr: asset.nameAr,
      category: asset.category,
      coordinates: asset.coordinates,
      distanceKm,
      bearingDeg,
      timeToImpactMinutes,
      urgency,
      evacuationRecommended,
      evacuationRouteDescriptionAr: asset.evacRouteAr,
      evacuationRouteDescriptionEn: asset.evacRouteEn
    };
  }).sort((a, b) => (a.timeToImpactMinutes ?? 999) - (b.timeToImpactMinutes ?? 999));

  // 8. Continuous Time-Scrubber State Generator (Minute 0 to 120)
  const getStateAtMinute = (minute: number): DynamicMinuteState => {
    const clampedMin = Math.max(1, Math.min(120, minute));
    const res = computeWavefrontPolygon(
      origin,
      flameHeadingDegrees,
      forwardRosKmH,
      flankRosKmH,
      backingRosKmH,
      clampedMin
    );

    const rosMMin = Math.round((forwardRosKmH * 1000) / 60);
    // Estimated flame height based on Byram intensity
    const flameHeightMeters = Number((0.0775 * Math.pow(rosMMin * 3.5, 0.46)).toFixed(1));

    return {
      minute: clampedMin,
      activeFrontPolygon: res.polygon,
      headFireFrontPoint: res.headPoint,
      burnedHectares: res.burnedHectares,
      perimeterKm: res.perimeterKm,
      rateOfSpreadMMin: rosMMin,
      flameHeightMeters
    };
  };

  return {
    params,
    flameHeadingDegrees,
    flameHeadingCardinal,
    forwardRosKmH,
    flankRosKmH,
    backingRosKmH,
    lengthToWidthRatio,
    effectiveSlopeMultiplier: Number(phiS.toFixed(2)),
    effectiveWindMultiplier: Number(phiW.toFixed(2)),
    effectiveMoistureMultiplier: Number(phiM.toFixed(2)),
    isochrones,
    threatenedAssets,
    totalThreatenedPopulation,
    getStateAtMinute
  };
}
