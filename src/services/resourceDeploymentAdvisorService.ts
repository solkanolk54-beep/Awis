import { EmergencyResource, WildfireIncident, GeoCoordinates } from '../types';
import { ALGERIAN_ROAD_SEGMENTS } from '../data/algerianRoadNetwork';

export type TrafficLevel = 'clear' | 'moderate' | 'heavy' | 'congested';
export type RoadSurfaceType = 'highway_paved' | 'secondary_asphalt' | 'mountain_paved' | 'unpaved_forest_track' | 'steep_rocky';
export type PumpCondition = 'optimal' | 'nominal' | 'degraded';
export type CrewReadiness = 'immediate_scramble' | 'ready_standby' | 'delayed_muster';

export interface ResourceEquipmentTelemetry {
  waterCapacityLiters: number;
  currentWaterLiters: number;
  waterPercentage: number;
  pumpPressureBar: number;
  pumpStatus: PumpCondition;
  foamSystemReady: boolean;
  crewSize: number;
  crewReadiness: CrewReadiness;
  crewMusterMinutes: number;
  maintenanceScore: number; // 0 - 100
  fuelRangeKm: number;
  isAllTerrain4x4: boolean;
  maxNavigableSlopeDegrees: number;
  specializedGear: string[];
}

export interface TrafficAssessment {
  level: TrafficLevel;
  delayMinutes: number;
  speedMultiplier: number;
  corridorNameEn: string;
  corridorNameAr: string;
  corridorNameFr: string;
  roadNumber: string;
  sirenClearanceActive: boolean;
  bottleneckDetected: boolean;
  bottleneckReason?: string;
  bottleneckReasonAr?: string;
  bottleneckReasonFr?: string;
}

export interface TerrainAssessment {
  elevationDeltaMeters: number;
  incidentSlopeDegrees: number;
  roadSurface: RoadSurfaceType;
  tortuosityIndex: number; // 1.1x (straight highway) to 1.6x (mountain switchbacks)
  terrainSuitabilityScore: number; // 0 - 100
  chassisCompatible: boolean;
  slopeWarning?: string;
  slopeWarningAr?: string;
  slopeWarningFr?: string;
  recommendedPositioningEn: string;
  recommendedPositioningAr?: string;
  recommendedPositioningFr?: string;
}

export interface EquipmentAssessment {
  readinessScore: number; // 0 - 100
  waterPayloadScore: number; // 0 - 100
  pumpReadinessScore: number; // 0 - 100
  crewReadinessScore: number; // 0 - 100
  isFullyMissionCapable: boolean;
  equipmentSummaryEn: string;
  equipmentSummaryAr: string;
  equipmentSummaryFr: string;
  equipmentAlerts: string[];
}

export interface AdvisorUnitRecommendation {
  resource: EmergencyResource;
  rank: number;
  compositeScore: number; // 0 - 100 (weighted multi-criteria score)
  directDistanceKm: number;
  effectiveRouteKm: number;
  estimatedArrivalMinutes: number;
  baseTravelMinutes: number;
  
  // Tactical classifications
  tacticalRoleEn: string;
  tacticalRoleAr: string;
  tacticalRoleFr: string;
  recommendationTier: 'primary_attack' | 'secondary_supply' | 'recon_support' | 'reserve';

  // Sub-scores (0 - 100 each)
  scores: {
    proximity: number;
    traffic: number;
    terrain: number;
    equipment: number;
  };

  // Detailed telemetry evaluations
  equipment: ResourceEquipmentTelemetry;
  traffic: TrafficAssessment;
  terrain: TerrainAssessment;

  // Automated rationale
  verdictEn: string;
  verdictAr: string;
  verdictFr: string;
  
  keyAdvantagesEn: string[];
  keyAdvantagesAr: string[];
  keyAdvantagesFr: string[];

  warningsEn: string[];
  warningsAr: string[];
  warningsFr: string[];
}

export interface StrikeTeamRecommendation {
  packageNameEn: string;
  packageNameAr: string;
  packageNameFr: string;
  descriptionEn: string;
  descriptionAr: string;
  descriptionFr: string;
  combinedWaterLiters: number;
  combinedCrew: number;
  averageArrivalMinutes: number;
  units: AdvisorUnitRecommendation[];
  synergyScore: number;
}

export interface AdvisorEvaluationResult {
  incidentId: string;
  incidentTitle: string;
  incidentLocation: string;
  evaluatedAt: string;
  totalFleetEvaluated: number;
  availableFleetCount: number;
  primaryRecommendation: AdvisorUnitRecommendation;
  rankedRecommendations: AdvisorUnitRecommendation[];
  recommendedStrikeTeam: StrikeTeamRecommendation;
  environmentalContext: {
    incidentSlopeDegrees: number;
    fireRisk: string;
    windSpeedKmH: number;
    temperatureC: number;
  };
  filterApplied?: {
    simulatedTrafficModifier: TrafficLevel;
    terrainRoughness: 'standard' | 'rugged' | 'extreme_slope';
    minWaterCapacity: number;
  };
}

/**
 * Calculates Great-Circle distance in km using Haversine formula
 */
export function haversineDistanceKm(p1: GeoCoordinates, p2: GeoCoordinates): number {
  const R = 6371;
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

/**
 * Derives rich real-time equipment telemetry for any resource unit.
 * Uses realistic specifications modeled on Algerian Civil Protection & DGF forestry units.
 */
export function deriveEquipmentTelemetry(resource: EmergencyResource): ResourceEquipmentTelemetry {
  const code = resource.code || '';
  const type = resource.type;

  if (type === 'firetruck') {
    // Forest firefighting heavy truck (CCFM 4x4 / 6000L or 4000L)
    const isHeavy = code.includes('17') || resource.capacity?.includes('6000');
    const waterCap = isHeavy ? 6000 : 4000;
    const currentWater = Math.round(waterCap * (code.includes('17') ? 1.0 : 0.9));
    return {
      waterCapacityLiters: waterCap,
      currentWaterLiters: currentWater,
      waterPercentage: Math.round((currentWater / waterCap) * 100),
      pumpPressureBar: 16.0, // High-pressure dual stage centrifugal pump
      pumpStatus: 'optimal',
      foamSystemReady: true,
      crewSize: 4,
      crewReadiness: 'immediate_scramble',
      crewMusterMinutes: 2,
      maintenanceScore: 98,
      fuelRangeKm: 420,
      isAllTerrain4x4: true,
      maxNavigableSlopeDegrees: 28, // High off-road hill climb ability
      specializedGear: ['4x4 Off-Road Chassis', 'Self-Protection Water Curtain', 'Class A Bio-Foam Mixer', 'Chainsaws']
    };
  }

  if (type === 'water_tanker') {
    // High-capacity strategic water supply tanker (CCFS 10,000L - 14,000L)
    const waterCap = 12000;
    const currentWater = 11500;
    return {
      waterCapacityLiters: waterCap,
      currentWaterLiters: currentWater,
      waterPercentage: Math.round((currentWater / waterCap) * 100),
      pumpPressureBar: 10.5,
      pumpStatus: 'optimal',
      foamSystemReady: true,
      crewSize: 3,
      crewReadiness: 'ready_standby',
      crewMusterMinutes: 3,
      maintenanceScore: 94,
      fuelRangeKm: 580,
      isAllTerrain4x4: false, // Heavy axle road chassis
      maxNavigableSlopeDegrees: 14, // Restricted on steep mountain tracks
      specializedGear: ['High-Volume Water Transfer Pump', 'Hydrant Quick-Coupling', 'Portable Reservoir (15kL)', 'Monitor Nozzle']
    };
  }

  if (type === 'aircraft') {
    // Beriev Be-200 / Canadair CL-415 Amphibious Water Bomber
    const waterCap = 12000;
    return {
      waterCapacityLiters: waterCap,
      currentWaterLiters: waterCap,
      waterPercentage: 100,
      pumpPressureBar: 0,
      pumpStatus: 'optimal',
      foamSystemReady: true,
      crewSize: 2,
      crewReadiness: 'ready_standby',
      crewMusterMinutes: 5,
      maintenanceScore: 99,
      fuelRangeKm: 2100,
      isAllTerrain4x4: false,
      maxNavigableSlopeDegrees: 90, // Aerial vector
      specializedGear: ['Multi-Drop Retardant Doors', 'Scooping Probe (Kissir/Beni Haroun)', 'Infrared FLIR Turret', 'Aviation VHF Relay']
    };
  }

  if (type === 'drone') {
    // Tactical Recon Drone DZ-04
    return {
      waterCapacityLiters: 0,
      currentWaterLiters: 0,
      waterPercentage: 0,
      pumpPressureBar: 0,
      pumpStatus: 'optimal',
      foamSystemReady: false,
      crewSize: 2,
      crewReadiness: 'immediate_scramble',
      crewMusterMinutes: 1,
      maintenanceScore: 100,
      fuelRangeKm: 85,
      isAllTerrain4x4: false,
      maxNavigableSlopeDegrees: 90,
      specializedGear: ['Radiometric FLIR 640x512', 'Laser Rangefinder', 'AES-256 Downlink', 'RTK Centimeter GPS']
    };
  }

  if (type === 'medical') {
    // Evacuation Ambulance & Field Medic Unit
    return {
      waterCapacityLiters: 500,
      currentWaterLiters: 500,
      waterPercentage: 100,
      pumpPressureBar: 3,
      pumpStatus: 'nominal',
      foamSystemReady: false,
      crewSize: 3,
      crewReadiness: 'immediate_scramble',
      crewMusterMinutes: 2,
      maintenanceScore: 96,
      fuelRangeKm: 620,
      isAllTerrain4x4: true,
      maxNavigableSlopeDegrees: 20,
      specializedGear: ['Advanced Life Support', 'Smoke Inhalation Oxygen Therapy', 'Burn Trauma Kits', 'Evacuation Stretcher']
    };
  }

  // ground_team / Commandos Feux de Forêts
  return {
    waterCapacityLiters: 1200,
    currentWaterLiters: 1200,
    waterPercentage: 100,
    pumpPressureBar: 8.0,
    pumpStatus: 'optimal',
    foamSystemReady: false,
    crewSize: 8,
    crewReadiness: 'ready_standby',
    crewMusterMinutes: 4,
    maintenanceScore: 95,
    fuelRangeKm: 350,
    isAllTerrain4x4: true,
    maxNavigableSlopeDegrees: 45, // Capable of foot scrambling up ridges
    specializedGear: ['Pulaski Axes', 'Drip Torches (Backfire)', 'High-Pressure Portable Backpack Pumps', 'Chainsaws', 'Fire Shelters']
  };
}

/**
 * Evaluates real-time traffic and corridor congestion between resource origin and incident
 */
export function evaluateRealTimeTraffic(
  from: GeoCoordinates,
  to: GeoCoordinates,
  resourceType: EmergencyResource['type'],
  simulatedLevelOverride?: TrafficLevel
): TrafficAssessment {
  // Aerial resources bypass ground traffic entirely
  if (resourceType === 'aircraft' || resourceType === 'drone') {
    return {
      level: 'clear',
      delayMinutes: 0,
      speedMultiplier: 1.0,
      corridorNameEn: 'Unrestricted Aviation Air Corridor (VFR/IFR)',
      corridorNameAr: 'ممر جوي مباشر مفتوح (خالٍ من العوائق)',
      corridorNameFr: 'Couloir Aérien Dégagé (VFR)',
      roadNumber: 'AIR-CORRIDOR-DIRECT',
      sirenClearanceActive: true,
      bottleneckDetected: false
    };
  }

  // Determine closest known road segment
  const midLat = (from.lat + to.lat) / 2;
  const midLng = (from.lng + to.lng) / 2;
  
  let bestRoad = ALGERIAN_ROAD_SEGMENTS[0];
  let minDistance = 9999;
  for (const seg of ALGERIAN_ROAD_SEGMENTS) {
    for (const pt of seg.path) {
      const d = haversineDistanceKm({ lat: midLat, lng: midLng }, pt);
      if (d < minDistance) {
        minDistance = d;
        bestRoad = seg;
      }
    }
  }

  // Determine traffic level based on override or geographical factors
  let trafficLevel: TrafficLevel = simulatedLevelOverride || 'moderate';
  
  if (!simulatedLevelOverride) {
    // RN43 coastal road often experiences summer beach/evacuation congestion
    if (bestRoad.roadNumber.includes('RN 43')) {
      trafficLevel = 'heavy';
    } else if (bestRoad.type === 'highway') {
      trafficLevel = 'clear';
    } else if (bestRoad.roadNumber.includes('RN 77')) {
      trafficLevel = 'moderate';
    } else {
      trafficLevel = 'clear';
    }
  }

  let delayMinutes = 0;
  let speedMultiplier = 1.0;
  let bottleneckDetected = false;
  let bottleneckReason: string | undefined;
  let bottleneckReasonAr: string | undefined;
  let bottleneckReasonFr: string | undefined;

  switch (trafficLevel) {
    case 'clear':
      speedMultiplier = 1.05; // Emergency siren priority gives slight speed gain
      delayMinutes = 0;
      break;
    case 'moderate':
      speedMultiplier = 0.85;
      delayMinutes = 4;
      bottleneckDetected = false;
      break;
    case 'heavy':
      speedMultiplier = 0.65;
      delayMinutes = 9;
      bottleneckDetected = true;
      bottleneckReason = 'Civilian evacuation traffic and bottleneck near junction; Civil Protection priority escort active.';
      bottleneckReasonAr = 'ازدحام ناتج عن حركة إخلاء المواطنين عند التقاطع؛ مرافقة الحماية المدنية نشطة لفتح الطريق.';
      bottleneckReasonFr = 'Ralentissement dû au flux d’évacuation civile; escorte prioritaire de la Protection Civile activée.';
      break;
    case 'congested':
      speedMultiplier = 0.45;
      delayMinutes = 16;
      bottleneckDetected = true;
      bottleneckReason = 'Severe bottleneck or debris on mountain axis; tactical bypass route advised.';
      bottleneckReasonAr = 'اختناق مروري حاد أو ركام على المحور الجبلي؛ يُنصح بسلوك مسار فرعي تكتيكي.';
      bottleneckReasonFr = 'Engorgement sévère sur l’axe montagneux; déviation tactique recommandée.';
      break;
  }

  return {
    level: trafficLevel,
    delayMinutes,
    speedMultiplier,
    corridorNameEn: bestRoad.nameEn,
    corridorNameAr: bestRoad.nameAr,
    corridorNameFr: bestRoad.nameFr,
    roadNumber: bestRoad.roadNumber,
    sirenClearanceActive: true,
    bottleneckDetected,
    bottleneckReason,
    bottleneckReasonAr,
    bottleneckReasonFr
  };
}

/**
 * Evaluates terrain profile, road surface, elevation changes, and slope climb suitability
 */
export function evaluateTerrainProfile(
  resource: EmergencyResource,
  incident: WildfireIncident,
  telemetry: ResourceEquipmentTelemetry,
  terrainRoughnessOverride?: 'standard' | 'rugged' | 'extreme_slope'
): TerrainAssessment {
  const type = resource.type;

  // Aerial units ignore surface topography penalties
  if (type === 'aircraft' || type === 'drone') {
    return {
      elevationDeltaMeters: 450,
      incidentSlopeDegrees: incident.terrainSlopeDegrees || 12,
      roadSurface: 'highway_paved',
      tortuosityIndex: 1.0,
      terrainSuitabilityScore: 100,
      chassisCompatible: true,
      recommendedPositioningEn: type === 'aircraft' ? 'Aerial perimeter water/retardant drop corridor' : 'Orbital line-of-sight thermal scan altitude 150m AGL',
      recommendedPositioningAr: type === 'aircraft' ? 'ممر إسقاط جوي للماء ومثبطات اللهب فوق خط النار' : 'مسح حراري جوي على ارتفاع 150 متراً فوق سطح الأرض',
      recommendedPositioningFr: type === 'aircraft' ? 'Couloir de largage aérien d’eau et retardant sur le front' : 'Balayage thermique en vol stationnaire à 150m sol'
    };
  }

  // Base slope from incident telemetry or test simulation override
  let slopeDeg = incident.terrainSlopeDegrees || 15;
  if (terrainRoughnessOverride === 'rugged') slopeDeg = Math.max(slopeDeg, 22);
  if (terrainRoughnessOverride === 'extreme_slope') slopeDeg = Math.max(slopeDeg, 32);

  // Surface type inference based on slope and wilaya topography
  let roadSurface: RoadSurfaceType = 'mountain_paved';
  let tortuosityIndex = 1.35; // Standard winding mountain coefficient

  if (slopeDeg > 24) {
    roadSurface = 'unpaved_forest_track';
    tortuosityIndex = 1.55;
  } else if (slopeDeg > 18) {
    roadSurface = 'mountain_paved';
    tortuosityIndex = 1.42;
  } else if (slopeDeg < 10) {
    roadSurface = 'highway_paved';
    tortuosityIndex = 1.15;
  }

  const elevationDelta = Math.round(slopeDeg * 28); // Approx meters climb
  const chassisCompatible = slopeDeg <= telemetry.maxNavigableSlopeDegrees;

  // Compute terrain suitability score (0 - 100)
  let suitabilityScore = 100;
  let slopeWarning: string | undefined;
  let slopeWarningAr: string | undefined;
  let slopeWarningFr: string | undefined;

  if (!chassisCompatible) {
    suitabilityScore = Math.max(25, 100 - (slopeDeg - telemetry.maxNavigableSlopeDegrees) * 5);
    slopeWarning = `Incident slope (${slopeDeg}°) exceeds safe chassis limit (${telemetry.maxNavigableSlopeDegrees}°). Unit restricted to paved access road or valley water shuttle.`;
    slopeWarningAr = `انحدار الموقع (${slopeDeg}°) يتجاوز حد أمان هيكل المركبة (${telemetry.maxNavigableSlopeDegrees}°). تقتصر على طريق الإمداد المعبد أو أسفل الوادي.`;
    slopeWarningFr = `Pente du sinistre (${slopeDeg}°) supérieure à la limite châssis (${telemetry.maxNavigableSlopeDegrees}°). Positionnement limité aux axes carrossables en fond de vallée.`;
  } else if (slopeDeg > 18 && !telemetry.isAllTerrain4x4) {
    suitabilityScore = 65;
    slopeWarning = 'Steep mountain grade requires 4x4 engagement and slow transit speed.';
    slopeWarningAr = 'الانحدار الجبلي الشديد يتطلب تشغيل الدفع الرباعي 4x4 وسرعة تقدم بطيئة.';
    slopeWarningFr = 'Forte déclivité nécessitant crabotage 4x4 et allure de progression réduite.';
  } else if (telemetry.isAllTerrain4x4) {
    suitabilityScore = 95;
  }

  let positioningEn = 'Direct ridge fireline assault with 4x4 high-clearance pump feed';
  let positioningAr = 'هجوم مباشر على خط النار في المنحدر بفضل نظام الدفع الرباعي';
  let positioningFr = 'Attaque directe en crête avec motopompe haute pression tout-terrain';

  if (type === 'water_tanker') {
    positioningEn = 'Strategic water relay depot at intersection of paved corridor & forest track';
    positioningAr = 'نقطة إمداد وتزويد مائي استراتيجي عند تقاطع الطريق المعبد مع المسلك الغابي';
    positioningFr = 'Point de ravitaillement en eau au carrefour de la route bitumée et de la piste';
  } else if (type === 'medical') {
    positioningEn = 'Forward triage & casualty collection point in protected wind-safe clearing';
    positioningAr = 'نقطة فرز وإسعاف متقدمة في فسحة آمنة ومحمية من اتجاه الرياح';
    positioningFr = 'Poste Médical Avancé (PMA) en zone dégagée hors de l’axe des fumées';
  }

  return {
    elevationDeltaMeters: elevationDelta,
    incidentSlopeDegrees: slopeDeg,
    roadSurface,
    tortuosityIndex,
    terrainSuitabilityScore: Math.round(suitabilityScore),
    chassisCompatible,
    slopeWarning,
    slopeWarningAr,
    slopeWarningFr,
    recommendedPositioningEn: positioningEn,
    recommendedPositioningAr: positioningAr,
    recommendedPositioningFr: positioningFr
  };
}

/**
 * Evaluates current equipment status, water volume, pump pressure, and crew readiness
 */
export function evaluateEquipmentStatus(telemetry: ResourceEquipmentTelemetry, type: EmergencyResource['type']): EquipmentAssessment {
  const alerts: string[] = [];
  
  // Water payload score (aircraft and tankers score high on water, drones/medical evaluated on their specialty)
  let waterScore = telemetry.waterPercentage;
  if (type === 'drone' || type === 'medical') {
    waterScore = 100; // Not a water carrier, don't penalize
  }

  if (telemetry.waterPercentage < 50 && (type === 'firetruck' || type === 'water_tanker')) {
    alerts.push(`Water payload degraded (${telemetry.waterPercentage}%) - refill required before long assault`);
  }

  // Pump score
  let pumpScore = 100;
  if (telemetry.pumpStatus === 'nominal') pumpScore = 80;
  if (telemetry.pumpStatus === 'degraded') {
    pumpScore = 50;
    alerts.push('Centrifugal pump pressure running below standard tolerance (requires throttle monitoring)');
  }

  // Crew readiness score
  let crewScore = 100;
  if (telemetry.crewReadiness === 'ready_standby') crewScore = 85;
  if (telemetry.crewReadiness === 'delayed_muster') {
    crewScore = 60;
    alerts.push(`Crew muster delay estimated at +${telemetry.crewMusterMinutes} min`);
  }

  // Composite equipment score
  const readinessScore = Math.round(
    waterScore * 0.35 +
    pumpScore * 0.25 +
    crewScore * 0.20 +
    telemetry.maintenanceScore * 0.20
  );

  const isFullyMissionCapable = readinessScore >= 80 && alerts.length === 0;

  let summaryEn = `${telemetry.waterCapacityLiters > 0 ? `${telemetry.currentWaterLiters.toLocaleString()}L (${telemetry.waterPercentage}%)` : 'Recon Telemetry'}, Pump: ${telemetry.pumpPressureBar} bar, Crew: ${telemetry.crewSize} (${telemetry.crewReadiness.replace('_', ' ')})`;
  let summaryAr = `${telemetry.waterCapacityLiters > 0 ? `${telemetry.currentWaterLiters.toLocaleString()} لتر (${telemetry.waterPercentage}%)` : 'استطلاع حراري'}, مضخة: ${telemetry.pumpPressureBar} بار, الطاقم: ${telemetry.crewSize} أفراد (${telemetry.crewReadiness === 'immediate_scramble' ? 'جاهزية فورية' : 'جاهزية عادية'})`;
  let summaryFr = `${telemetry.waterCapacityLiters > 0 ? `${telemetry.currentWaterLiters.toLocaleString()}L (${telemetry.waterPercentage}%)` : 'Télémétrie Recon'}, Pompe: ${telemetry.pumpPressureBar} bar, Équipage: ${telemetry.crewSize}`;

  return {
    readinessScore,
    waterPayloadScore: Math.round(waterScore),
    pumpReadinessScore: pumpScore,
    crewReadinessScore: crewScore,
    isFullyMissionCapable,
    equipmentSummaryEn: summaryEn,
    equipmentSummaryAr: summaryAr,
    equipmentSummaryFr: summaryFr,
    equipmentAlerts: alerts
  };
}

/**
 * Automated Multi-Criteria Decision Analysis (MCDA) Algorithm
 * Evaluates all fleet units against current incident, real-time traffic, terrain, and equipment status.
 */
export function evaluateResourceDeploymentAdvice(
  incident: WildfireIncident,
  availableResources: EmergencyResource[],
  options?: {
    trafficOverride?: TrafficLevel;
    terrainRoughness?: 'standard' | 'rugged' | 'extreme_slope';
    minWaterCapacity?: number;
  }
): AdvisorEvaluationResult {
  const directDistances = availableResources.map(res => ({
    res,
    distKm: haversineDistanceKm(res.currentLocation || res.baseLocation, incident.coordinates)
  }));

  const recommendations: AdvisorUnitRecommendation[] = directDistances.map(({ res, distKm }) => {
    const telemetry = deriveEquipmentTelemetry(res);
    const traffic = evaluateRealTimeTraffic(res.currentLocation || res.baseLocation, incident.coordinates, res.type, options?.trafficOverride);
    const terrain = evaluateTerrainProfile(res, incident, telemetry, options?.terrainRoughness);
    const equipment = evaluateEquipmentStatus(telemetry, res.type);

    // Compute effective route distance factoring road tortuosity
    const effectiveRouteKm = Number((distKm * (res.type === 'aircraft' || res.type === 'drone' ? 1.0 : terrain.tortuosityIndex)).toFixed(1));

    // Base speed profiles
    let baseSpeedKmh = 50;
    if (res.type === 'aircraft') baseSpeedKmh = 300;
    else if (res.type === 'drone') baseSpeedKmh = 75;
    else if (res.type === 'water_tanker') baseSpeedKmh = 38;
    else if (res.type === 'medical') baseSpeedKmh = 52;
    else if (res.type === 'firetruck') baseSpeedKmh = 46;

    // Effective speed with traffic and terrain slope
    const effectiveSpeed = Math.max(20, (baseSpeedKmh * traffic.speedMultiplier) / (1 + Math.min(terrain.incidentSlopeDegrees, 35) / 100));
    
    // Travel time
    const baseTravelMinutes = Math.round((effectiveRouteKm / (baseSpeedKmh || 40)) * 60);
    const travelTimeMinutes = Math.max(2, Math.round((effectiveRouteKm / effectiveSpeed) * 60 + telemetry.crewMusterMinutes + traffic.delayMinutes));

    // Sub-scores (0 - 100)
    // Proximity score: max score 100 at 0km, decays smoothly
    const proximityScore = Math.max(10, Math.round(100 - Math.min(distKm * 2.2, 90)));
    
    // Traffic score: 100 for clear/aerial, penalized for congestion
    const trafficScore = Math.max(20, Math.round(100 - traffic.delayMinutes * 4.5));

    // Terrain score directly from terrain assessment
    const terrainScore = terrain.terrainSuitabilityScore;

    // Equipment score directly from equipment assessment
    const equipmentScore = equipment.readinessScore;

    // Weighted Multi-Criteria Composite Score:
    // Proximity (30%), Traffic (25%), Terrain (25%), Equipment (20%)
    let weightProximity = 0.30;
    let weightTraffic = 0.25;
    let weightTerrain = 0.25;
    let weightEquipment = 0.20;

    // Tailor weights depending on incident severity and resource type
    if (incident.riskLevel === 'extreme' || incident.riskLevel === 'high') {
      // Speed to initial attack is critical
      weightProximity = 0.35;
      weightTraffic = 0.25;
      weightTerrain = 0.20;
      weightEquipment = 0.20;
    }

    let compositeScore = Math.round(
      proximityScore * weightProximity +
      trafficScore * weightTraffic +
      terrainScore * weightTerrain +
      equipmentScore * weightEquipment
    );

    // Apply filter adjustments if user requested minimum water capacity
    if (options?.minWaterCapacity && telemetry.waterCapacityLiters < options.minWaterCapacity) {
      compositeScore = Math.max(15, compositeScore - 30);
    }

    // Availability penalty
    if (res.status === 'dispatched') compositeScore = Math.max(10, compositeScore - 25);
    if (res.status === 'maintenance') compositeScore = Math.max(5, compositeScore - 50);

    // Tactical roles
    let tacticalRoleEn = 'Primary Direct Suppression (CCFM 4x4)';
    let tacticalRoleAr = 'هجوم وتطويق مباشر (شاحنة غابية 4x4)';
    let tacticalRoleFr = 'Attaque Directe du Front (CCFM 4x4)';
    let tier: AdvisorUnitRecommendation['recommendationTier'] = 'primary_attack';

    if (res.type === 'water_tanker') {
      tacticalRoleEn = 'Continuous Water Shuttle & Relay Supply';
      tacticalRoleAr = 'تزويد مائي متواصل ونقل صهاريج الإمداد';
      tacticalRoleFr = 'Alimentation Continue et Navette d’Eau';
      tier = 'secondary_supply';
    } else if (res.type === 'aircraft') {
      tacticalRoleEn = 'Heavy Retardant Bombing & Flank Containment';
      tacticalRoleAr = 'إسقاط مثبطات اللهب الثقيلة وتطويق الأجنحة الجوية';
      tacticalRoleFr = 'Largage Retardant Massif et Fixation d’Ailes';
      tier = 'recon_support';
    } else if (res.type === 'drone') {
      tacticalRoleEn = 'Real-Time Thermal Hotspot Reconnaissance';
      tacticalRoleAr = 'استطلاع حراري ورصد النقاط الساخنة بالزمن الحقيقي';
      tacticalRoleFr = 'Reconnaissance Thermique et Guidage en Temps Réel';
      tier = 'recon_support';
    } else if (res.type === 'medical') {
      tacticalRoleEn = 'Forward Triage & First Responder Escort';
      tacticalRoleAr = 'مفرزة إسعاف أولي ومرافقة الإخلاء المتقدمة';
      tacticalRoleFr = 'Poste Médical Avancé et Évacuation';
      tier = 'reserve';
    }

    // Rationale & Verdicts
    const advantagesEn: string[] = [];
    const advantagesAr: string[] = [];
    const advantagesFr: string[] = [];

    const warningsEn: string[] = [];
    const warningsAr: string[] = [];
    const warningsFr: string[] = [];

    if (proximityScore > 75) {
      advantagesEn.push(`Exceptional proximity (${distKm} km) guaranteeing rapid response under ${travelTimeMinutes} min`);
      advantagesAr.push(`قرب استثنائي (${distKm} كم) يضمن سرعة الوصول في أقل من ${travelTimeMinutes} دقيقة`);
      advantagesFr.push(`Proximité remarquable (${distKm} km) garantissant une arrivée en moins de ${travelTimeMinutes} min`);
    }

    if (traffic.level === 'clear') {
      advantagesEn.push(`Clear corridor via ${traffic.roadNumber} with no civilian congestion delays`);
      advantagesAr.push(`مسار خالٍ تماماً عبر ${traffic.roadNumber} بدون اختناقات مرورية`);
      advantagesFr.push(`Axe fluide via ${traffic.roadNumber} sans ralentissement`);
    } else if (traffic.bottleneckDetected) {
      warningsEn.push(traffic.bottleneckReason || 'Traffic delay detected along transit corridor');
      if (traffic.bottleneckReasonAr) warningsAr.push(traffic.bottleneckReasonAr);
      if (traffic.bottleneckReasonFr) warningsFr.push(traffic.bottleneckReasonFr);
    }

    if (terrain.chassisCompatible && telemetry.isAllTerrain4x4) {
      advantagesEn.push(`4x4 all-terrain chassis capable of handling ${terrain.incidentSlopeDegrees}° slope and forest tracks`);
      advantagesAr.push(`هيكل دفع رباعي 4x4 مهيأ بالكامل لتجاوز انحدار ${terrain.incidentSlopeDegrees}° والمسالك الجبلية`);
      advantagesFr.push(`Châssis 4x4 tout-terrain apte à franchir les pentes de ${terrain.incidentSlopeDegrees}° et les pistes`);
    } else if (terrain.slopeWarning) {
      warningsEn.push(terrain.slopeWarning);
      if (terrain.slopeWarningAr) warningsAr.push(terrain.slopeWarningAr);
      if (terrain.slopeWarningFr) warningsFr.push(terrain.slopeWarningFr);
    }

    if (equipment.isFullyMissionCapable) {
      advantagesEn.push(`100% mission-capable: ${equipment.equipmentSummaryEn}`);
      advantagesAr.push(`جاهزية تشغيلية كاملة: ${equipment.equipmentSummaryAr}`);
      advantagesFr.push(`Capacité opérationnelle maximale: ${equipment.equipmentSummaryFr}`);
    }

    equipment.equipmentAlerts.forEach(alert => warningsEn.push(alert));

    // Automated verdict summary
    const verdictEn = `Recommended for ${tacticalRoleEn}. Proximity: ${distKm} km (${travelTimeMinutes}m ETA) via ${traffic.roadNumber}. Terrain compatibility: ${terrain.terrainSuitabilityScore}%. Equipment readiness: ${equipment.readinessScore}%.`;
    const verdictAr = `يوصى بنشر الوحدة لـ: ${tacticalRoleAr}. المسافة: ${distKm} كم (وصول خلال ${travelTimeMinutes} دقيقة) عبر ${traffic.roadNumber}. ملاءمة التضاريس: ${terrain.terrainSuitabilityScore}%. جاهزية العتاد: ${equipment.readinessScore}%.`;
    const verdictFr = `Recommandé pour: ${tacticalRoleFr}. Distance: ${distKm} km (ETA ${travelTimeMinutes} min) via ${traffic.roadNumber}. Compatibilité relief: ${terrain.terrainSuitabilityScore}%. Préparation matériel: ${equipment.readinessScore}%.`;

    return {
      resource: res,
      rank: 1, // Will be set after sort
      compositeScore,
      directDistanceKm: distKm,
      effectiveRouteKm,
      estimatedArrivalMinutes: travelTimeMinutes,
      baseTravelMinutes,
      tacticalRoleEn,
      tacticalRoleAr,
      tacticalRoleFr,
      recommendationTier: tier,
      scores: {
        proximity: proximityScore,
        traffic: trafficScore,
        terrain: terrainScore,
        equipment: equipmentScore
      },
      equipment: telemetry,
      traffic,
      terrain,
      verdictEn,
      verdictAr,
      verdictFr,
      keyAdvantagesEn: advantagesEn,
      keyAdvantagesAr: advantagesAr,
      keyAdvantagesFr: advantagesFr,
      warningsEn,
      warningsAr,
      warningsFr
    };
  });

  // Sort descending by composite score
  recommendations.sort((a, b) => b.compositeScore - a.compositeScore);

  // Set explicit ranks (1, 2, 3, 4...)
  recommendations.forEach((rec, idx) => {
    rec.rank = idx + 1;
    if (idx === 0) rec.recommendationTier = 'primary_attack';
    else if (idx === 1) rec.recommendationTier = 'secondary_supply';
    else if (idx === 2) rec.recommendationTier = 'recon_support';
    else rec.recommendationTier = 'reserve';
  });

  // Synthesize an optimal Combined Strike Team (e.g. 1 fast attack + 1 water supply + 1 air/drone recon)
  const primaryUnit = recommendations[0] || recommendations[0];
  const waterUnit = recommendations.find(r => r.resource.type === 'water_tanker') || recommendations[1];
  const reconOrAirUnit = recommendations.find(r => r.resource.type === 'drone' || r.resource.type === 'aircraft') || recommendations[2];

  const strikeTeamUnits = Array.from(new Set([primaryUnit, waterUnit, reconOrAirUnit].filter(Boolean)));
  
  const combinedWater = strikeTeamUnits.reduce((sum, u) => sum + u.equipment.currentWaterLiters, 0);
  const combinedCrew = strikeTeamUnits.reduce((sum, u) => sum + u.equipment.crewSize, 0);
  const avgArrival = Math.round(strikeTeamUnits.reduce((sum, u) => sum + u.estimatedArrivalMinutes, 0) / (strikeTeamUnits.length || 1));

  const recommendedStrikeTeam: StrikeTeamRecommendation = {
    packageNameEn: 'Combined Tactical Fire Suppression Strike Team',
    packageNameAr: 'حزمة التدخل التكتيكي المشترك لإخماد الحرائق',
    packageNameFr: 'Équipe d’Intervention Tactique Combinée',
    descriptionEn: 'Synergistic deployment pairing rapid initial 4x4 frontline assault, high-capacity water tanker relay, and real-time aerial recon.',
    descriptionAr: 'نشر تكتيكي متكامل يجمع بين هجوم سريع بشاحنة دفع رباعي 4x4، وصهريج تزويد مائي ضخم، ورصد جوي حراري مباشر.',
    descriptionFr: 'Déploiement synergique associant attaque initiale tout-terrain 4x4, soutien citerne lourd et reconnaissance aérienne.',
    combinedWaterLiters: combinedWater,
    combinedCrew,
    averageArrivalMinutes: avgArrival,
    units: strikeTeamUnits,
    synergyScore: 97
  };

  return {
    incidentId: incident.id,
    incidentTitle: incident.title,
    incidentLocation: incident.locationName,
    evaluatedAt: new Date().toLocaleTimeString(),
    totalFleetEvaluated: availableResources.length,
    availableFleetCount: availableResources.filter(r => r.status === 'available').length,
    primaryRecommendation: primaryUnit,
    rankedRecommendations: recommendations,
    recommendedStrikeTeam,
    environmentalContext: {
      incidentSlopeDegrees: incident.terrainSlopeDegrees || 15,
      fireRisk: incident.riskLevel,
      windSpeedKmH: incident.windSpeedKmH || 24,
      temperatureC: incident.temperatureC || 36
    },
    filterApplied: {
      simulatedTrafficModifier: options?.trafficOverride || 'moderate',
      terrainRoughness: options?.terrainRoughness || 'standard',
      minWaterCapacity: options?.minWaterCapacity || 0
    }
  };
}
