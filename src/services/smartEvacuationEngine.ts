import { 
  GeoCoordinates, 
  CalculatedEvacuationRoute, 
  SafeEvacuationZone, 
  RoadSegment, 
  EvacuationPlanScenario, 
  EvacuationTurnInstruction,
  RoadSafetyStatus,
  Language 
} from '../types';
import { 
  ALGERIAN_ROAD_SEGMENTS, 
  SAFE_EVACUATION_ZONES, 
  AT_RISK_SETTLEMENTS, 
  CivilianSettlement 
} from '../data/algerianRoadNetwork';

// Haversine distance in kilometers
export function computeGeoDistanceKm(coord1: GeoCoordinates, coord2: GeoCoordinates): number {
  const R = 6371; // Earth radius in km
  const dLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const dLng = ((coord2.lng - coord1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coord1.lat * Math.PI) / 180) *
      Math.cos((coord2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

// Distance from a point to a road path (minimum distance to any vertex on the road)
export function computeMinDistanceToRoad(point: GeoCoordinates, road: RoadSegment): number {
  let minDistance = Infinity;
  for (const vertex of road.path) {
    const d = computeGeoDistanceKm(point, vertex);
    if (d < minDistance) {
      minDistance = d;
    }
  }
  return minDistance;
}

// Calculate bearing between two coordinates in degrees (0 = North, 90 = East, 180 = South, 270 = West)
export function computeBearingDegrees(from: GeoCoordinates, to: GeoCoordinates): number {
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

// Cardinal direction string from bearing
export function getCardinalDirection(bearing: number, lang: Language = 'en'): string {
  const directionsEn = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const directionsAr = ['شمال', 'شمال-شرق', 'شرق', 'جنوب-شرق', 'جنوب', 'جنوب-غرب', 'غرب', 'شمال-غرب'];
  const directionsFr = ['Nord', 'Nord-Est', 'Est', 'Sud-Est', 'Sud', 'Sud-Ouest', 'Ouest', 'Nord-Ouest'];
  
  const index = Math.round(bearing / 45) % 8;
  if (lang === 'ar') return directionsAr[index];
  if (lang === 'fr') return directionsFr[index];
  return directionsEn[index];
}

// Check if a point is inside the downwind smoke plume cone
export function isPointInsideSmokePlume(
  point: GeoCoordinates,
  fireOrigin: GeoCoordinates,
  flamePushHeadingDegrees: number, // Direction smoke is traveling
  plumeLengthKm: number = 8.5,
  plumeSpreadAngleDegrees: number = 42
): boolean {
  const distance = computeGeoDistanceKm(fireOrigin, point);
  if (distance > plumeLengthKm || distance < 0.2) return false;

  const bearing = computeBearingDegrees(fireOrigin, point);
  let angleDiff = Math.abs(bearing - flamePushHeadingDegrees);
  if (angleDiff > 180) angleDiff = 360 - angleDiff;

  return angleDiff <= plumeSpreadAngleDegrees / 2;
}

/**
 * Evaluates the safety status of a road segment given wildfire coordinates and wind
 */
export function evaluateRoadSafety(
  road: RoadSegment,
  fireCenter: GeoCoordinates,
  flamePushHeadingDegrees: number,
  fireDangerRadiusKm: number = 1.4
): { status: RoadSafetyStatus; minFireDistanceKm: number; isSmokeCompromised: boolean } {
  let minFireDistanceKm = Infinity;
  let isSmokeCompromised = false;

  for (const pt of road.path) {
    const dist = computeGeoDistanceKm(fireCenter, pt);
    if (dist < minFireDistanceKm) {
      minFireDistanceKm = dist;
    }

    if (!isSmokeCompromised && isPointInsideSmokePlume(pt, fireCenter, flamePushHeadingDegrees)) {
      isSmokeCompromised = true;
    }
  }

  // If directly encroached by flames or critical radiant heat (< 1.4 km)
  if (minFireDistanceKm <= fireDangerRadiusKm) {
    return { status: 'blocked_fire', minFireDistanceKm, isSmokeCompromised };
  }

  // If inside smoke plume, caution needed
  if (isSmokeCompromised || minFireDistanceKm < 2.5) {
    return { status: 'caution_smoke', minFireDistanceKm, isSmokeCompromised };
  }

  return { status: 'open_safe', minFireDistanceKm, isSmokeCompromised };
}

/**
 * Generates turn-by-turn navigation instructions for civilians
 */
function buildTurnInstructions(
  waypoints: GeoCoordinates[],
  roadName: string,
  safeZone: SafeEvacuationZone
): EvacuationTurnInstruction[] {
  const instructions: EvacuationTurnInstruction[] = [];
  if (waypoints.length < 2) return instructions;

  // Step 1: Initial departure
  const initialDist = computeGeoDistanceKm(waypoints[0], waypoints[1]);
  const bearing1 = computeBearingDegrees(waypoints[0], waypoints[1]);
  const card1 = getCardinalDirection(bearing1, 'en');
  const card1Ar = getCardinalDirection(bearing1, 'ar');
  const card1Fr = getCardinalDirection(bearing1, 'fr');

  instructions.push({
    stepNumber: 1,
    roadName,
    distanceKm: initialDist,
    coordinates: waypoints[0],
    turnType: 'straight',
    instructionEn: `Depart village along ${roadName} heading ${card1} away from smoke line`,
    instructionAr: `الانطلاق من القرية عبر ${roadName} باتجاه ${card1Ar} بعيداً عن عمود الدخان`,
    instructionFr: `Quitter le village par ${roadName} en direction ${card1Fr}, loin des fumées`
  });

  // Intermediate waypoints
  for (let i = 1; i < waypoints.length - 1; i++) {
    const fromPt = waypoints[i - 1];
    const currPt = waypoints[i];
    const nextPt = waypoints[i + 1];

    const segDist = computeGeoDistanceKm(currPt, nextPt);
    const bBefore = computeBearingDegrees(fromPt, currPt);
    const bAfter = computeBearingDegrees(currPt, nextPt);

    let angleDelta = bAfter - bBefore;
    if (angleDelta > 180) angleDelta -= 360;
    if (angleDelta < -180) angleDelta += 360;

    let turnType: 'straight' | 'turn_left' | 'turn_right' | 'fork' = 'straight';
    let turnEn = 'Continue straight on';
    let turnAr = 'مواصلة السير مباشرة عبر';
    let turnFr = 'Continuer tout droit sur';

    if (angleDelta > 28) {
      turnType = 'turn_right';
      turnEn = 'Turn right onto safety corridor';
      turnAr = 'الانعطاف يميناً نحو الممر الآمن';
      turnFr = 'Tourner à droite sur le corridor sécurisé';
    } else if (angleDelta < -28) {
      turnType = 'turn_left';
      turnEn = 'Turn left avoiding ridge crest';
      turnAr = 'الانعطاف يساراً وتجنب قمة المنحدر';
      turnFr = 'Tourner à gauche en évitant les crêtes';
    }

    instructions.push({
      stepNumber: i + 1,
      roadName,
      distanceKm: segDist,
      coordinates: currPt,
      turnType,
      instructionEn: `${turnEn} (${segDist} km)`,
      instructionAr: `${turnAr} (${segDist} كم)`,
      instructionFr: `${turnFr} (${segDist} km)`
    });
  }

  // Final step: Arrival at safe hub
  const lastIndex = waypoints.length - 1;
  instructions.push({
    stepNumber: instructions.length + 1,
    roadName: safeZone.nameEn,
    distanceKm: 0.3,
    coordinates: waypoints[lastIndex],
    turnType: 'arrive',
    instructionEn: `Arrive at Safe Haven: ${safeZone.nameEn} (Reception & Medical Triage)`,
    instructionAr: `الوصول إلى الملاذ الآمن: ${safeZone.nameAr} (مركز الاستقبال والفرز الطبي)`,
    instructionFr: `Arrivée au Refuge Sécurisé: ${safeZone.nameFr} (Accueil et Triage Médical)`
  });

  return instructions;
}

/**
 * Main Smart Evacuation Routing Optimizer:
 * Calculates Primary, Secondary, and Compromised routes for all settlements near a fire.
 */
export function calculateSmartEvacuationPlan(
  fireCenter: GeoCoordinates,
  windHeadingDegrees: number, // 0-360
  windSpeedKmH: number = 38,
  incidentId: string = 'ACTIVE-INCIDENT'
): EvacuationPlanScenario {
  // 1. Calculate downwind smoke plume cone
  // Plume pushes along (windHeadingDegrees + 180)%360 or direct push
  const flamePushHeadingDegrees = windHeadingDegrees;
  const plumeLengthKm = Math.min(16, 5 + (windSpeedKmH / 10) * 2.2);

  // 2. Evaluate all roads in the network
  const evaluatedRoads = ALGERIAN_ROAD_SEGMENTS.map((road) => {
    const safety = evaluateRoadSafety(road, fireCenter, flamePushHeadingDegrees);
    return {
      road,
      ...safety
    };
  });

  const blockedRoadIds = evaluatedRoads
    .filter((r) => r.status === 'blocked_fire')
    .map((r) => r.road.id);

  // 3. Find routes for all settlements within 30km radius of the fire
  const relevantSettlements = AT_RISK_SETTLEMENTS.filter((settlement) => {
    const dist = computeGeoDistanceKm(settlement.coordinates, fireCenter);
    return dist <= 35; // Relevant perimeter
  });

  const settlementRoutes: CalculatedEvacuationRoute[] = [];
  let totalPopulationAtRisk = 0;

  for (const settlement of relevantSettlements) {
    totalPopulationAtRisk += settlement.population;

    // Find closest safe evacuation zones in the same or neighboring wilayas
    const candidateSafeZones = SAFE_EVACUATION_ZONES.map((zone) => {
      const distFromSettlement = computeGeoDistanceKm(settlement.coordinates, zone.coordinates);
      const distFromFire = computeGeoDistanceKm(fireCenter, zone.coordinates);
      return {
        zone,
        distFromSettlement,
        distFromFire
      };
    })
    // Safe zones must be far enough from fire (> 5 km)
    .filter((z) => z.distFromFire >= 4.5)
    .sort((a, b) => a.distFromSettlement - b.distFromSettlement);

    const primarySafeZone = candidateSafeZones[0]?.zone || SAFE_EVACUATION_ZONES[0];
    const secondarySafeZone = candidateSafeZones[1]?.zone || candidateSafeZones[0]?.zone || SAFE_EVACUATION_ZONES[1];

    // Find roads connecting settlement to safe zone
    // Find matching road segments
    const primaryRoad = evaluatedRoads.find((r) => r.road.id === settlement.primaryRoadAccessId);
    const secondaryRoad = evaluatedRoads.find((r) => r.road.id === settlement.secondaryRoadAccessId);

    // Build Route A (Primary)
    // Waypoints start at settlement, follow connecting roads, terminate at SafeZone
    const primaryWaypoints: GeoCoordinates[] = [
      settlement.coordinates,
      ...(primaryRoad ? primaryRoad.road.path : []),
      primarySafeZone.coordinates
    ];

    // Clean duplicate consecutive coordinates
    const filteredPrimaryWaypoints = primaryWaypoints.filter((pt, idx, arr) => {
      if (idx === 0) return true;
      return computeGeoDistanceKm(pt, arr[idx - 1]) > 0.15;
    });

    // Calculate metrics for primary route
    let primaryTotalDist = 0;
    let primaryMinFireClearance = Infinity;
    let hasSmoke = false;

    for (let i = 0; i < filteredPrimaryWaypoints.length; i++) {
      const pt = filteredPrimaryWaypoints[i];
      const fireDist = computeGeoDistanceKm(fireCenter, pt);
      if (fireDist < primaryMinFireClearance) primaryMinFireClearance = fireDist;
      if (isPointInsideSmokePlume(pt, fireCenter, flamePushHeadingDegrees, plumeLengthKm)) {
        hasSmoke = true;
      }

      if (i > 0) {
        primaryTotalDist += computeGeoDistanceKm(filteredPrimaryWaypoints[i - 1], pt);
      }
    }

    primaryTotalDist = Number(primaryTotalDist.toFixed(1));
    const avgSpeedKmH = primaryRoad ? primaryRoad.road.speedLimitKmH * 0.75 : 55;
    const baseTravelMinutes = Math.round((primaryTotalDist / avgSpeedKmH) * 60);

    // Evacuation Clearance Time formula:
    // Takes vehicle convoy throughput and vulnerable evacuation into account
    const vehicleCount = Math.ceil(settlement.population / 3.4);
    const roadCapacityPerHour = primaryRoad ? primaryRoad.road.capacityVehiclesPerHour : 1000;
    const bottleneckFactor = Math.min(100, Math.round((vehicleCount / roadCapacityPerHour) * 85));
    const estimatedClearanceMinutes = baseTravelMinutes + Math.round(bottleneckFactor * 0.45) + 15;

    const isPrimaryBlocked = primaryMinFireClearance <= 1.4 || (primaryRoad && primaryRoad.status === 'blocked_fire');

    const primaryStatus: RoadSafetyStatus = isPrimaryBlocked
      ? 'blocked_fire'
      : hasSmoke
      ? 'caution_smoke'
      : 'open_safe';

    const primaryRoute: CalculatedEvacuationRoute = {
      id: `ROUTE-${settlement.id}-PRIMARY`,
      settlementId: settlement.id,
      settlementName: settlement.nameEn,
      settlementNameAr: settlement.nameAr,
      safeZone: primarySafeZone,
      routeType: isPrimaryBlocked ? 'compromised_blocked' : 'primary_optimal',
      status: primaryStatus,
      totalDistanceKm: primaryTotalDist,
      estimatedTravelMinutes: baseTravelMinutes,
      estimatedEvacuationClearanceMinutes: estimatedClearanceMinutes,
      minFireClearanceKm: Number(primaryMinFireClearance.toFixed(1)),
      smokeExposureRisk: hasSmoke ? 'moderate' : 'none',
      bottleneckRiskIndex: bottleneckFactor,
      waypoints: filteredPrimaryWaypoints,
      instructions: buildTurnInstructions(
        filteredPrimaryWaypoints,
        primaryRoad ? primaryRoad.road.nameEn : 'Primary Evacuation Corridor',
        primarySafeZone
      ),
      roadSegmentsUsed: primaryRoad ? [primaryRoad.road.id] : [],
      logisticsRequired: {
        ambulances: Math.max(2, Math.ceil(settlement.vulnerableCount * 0.04)),
        buses: Math.max(3, Math.ceil(settlement.vulnerableCount / 38)),
        policeEscorts: Math.max(2, Math.ceil(settlement.population / 750)),
        medicalStaff: Math.max(4, Math.ceil(settlement.vulnerableCount * 0.06))
      }
    };

    settlementRoutes.push(primaryRoute);

    // Build Route B (Contingency Alternative Corridor)
    const secondaryWaypoints: GeoCoordinates[] = [
      settlement.coordinates,
      ...(secondaryRoad ? secondaryRoad.road.path : []),
      secondarySafeZone.coordinates
    ];

    const filteredSecondaryWaypoints = secondaryWaypoints.filter((pt, idx, arr) => {
      if (idx === 0) return true;
      return computeGeoDistanceKm(pt, arr[idx - 1]) > 0.15;
    });

    let secTotalDist = 0;
    let secMinFireClearance = Infinity;
    let secHasSmoke = false;

    for (let i = 0; i < filteredSecondaryWaypoints.length; i++) {
      const pt = filteredSecondaryWaypoints[i];
      const fireDist = computeGeoDistanceKm(fireCenter, pt);
      if (fireDist < secMinFireClearance) secMinFireClearance = fireDist;
      if (isPointInsideSmokePlume(pt, fireCenter, flamePushHeadingDegrees, plumeLengthKm)) {
        secHasSmoke = true;
      }

      if (i > 0) {
        secTotalDist += computeGeoDistanceKm(filteredSecondaryWaypoints[i - 1], pt);
      }
    }

    secTotalDist = Number(secTotalDist.toFixed(1));
    const secAvgSpeedKmH = secondaryRoad ? secondaryRoad.road.speedLimitKmH * 0.65 : 45;
    const secTravelMinutes = Math.round((secTotalDist / secAvgSpeedKmH) * 60);

    const isSecBlocked = secMinFireClearance <= 1.4 || (secondaryRoad && secondaryRoad.status === 'blocked_fire');

    const secondaryRoute: CalculatedEvacuationRoute = {
      id: `ROUTE-${settlement.id}-SECONDARY`,
      settlementId: settlement.id,
      settlementName: settlement.nameEn,
      settlementNameAr: settlement.nameAr,
      safeZone: secondarySafeZone,
      routeType: isSecBlocked ? 'compromised_blocked' : 'secondary_contingency',
      status: isSecBlocked ? 'blocked_fire' : secHasSmoke ? 'caution_smoke' : 'open_safe',
      totalDistanceKm: secTotalDist,
      estimatedTravelMinutes: secTravelMinutes,
      estimatedEvacuationClearanceMinutes: secTravelMinutes + 25,
      minFireClearanceKm: Number(secMinFireClearance.toFixed(1)),
      smokeExposureRisk: secHasSmoke ? 'moderate' : 'none',
      bottleneckRiskIndex: Math.min(80, Math.round(bottleneckFactor * 1.15)),
      waypoints: filteredSecondaryWaypoints,
      instructions: buildTurnInstructions(
        filteredSecondaryWaypoints,
        secondaryRoad ? secondaryRoad.road.nameEn : 'Contingency Bypass Axis',
        secondarySafeZone
      ),
      roadSegmentsUsed: secondaryRoad ? [secondaryRoad.road.id] : [],
      logisticsRequired: {
        ambulances: Math.max(2, Math.ceil(settlement.vulnerableCount * 0.04)),
        buses: Math.max(3, Math.ceil(settlement.vulnerableCount / 38)),
        policeEscorts: Math.max(2, Math.ceil(settlement.population / 750)),
        medicalStaff: Math.max(4, Math.ceil(settlement.vulnerableCount * 0.06))
      }
    };

    settlementRoutes.push(secondaryRoute);
  }

  return {
    id: `EVAC-PLAN-${Date.now()}`,
    incidentId,
    generatedAt: new Date().toISOString(),
    activeFireCenter: fireCenter,
    windHeadingDegrees,
    windSpeedKmH,
    smokePlumeCone: {
      origin: fireCenter,
      headingDegrees: flamePushHeadingDegrees,
      lengthKm: plumeLengthKm,
      spreadAngleDegrees: 42
    },
    settlementRoutes,
    blockedRoadIds,
    totalPopulationAtRisk,
    totalEvacuatedCount: Math.round(totalPopulationAtRisk * 0.18),
    advisoryStatus: 'mandatory_immediate'
  };
}

/**
 * Generates an official Civil Protection Emergency SMS / Radio Broadcast Dispatch Alert
 */
export function generateCivilDefenseEvacuationBroadcast(
  route: CalculatedEvacuationRoute,
  settlement: CivilianSettlement,
  lang: Language = 'ar'
): { title: string; body: string; urgentActionText: string } {
  if (lang === 'ar') {
    return {
      title: `إنذار إخلاء استعجالي فوري — الحماية المدنية الجزائرية`,
      body: `إلى كافة مواطني ${settlement.nameAr}: نظراً لسرعة انتشار ألسنة اللهب باتجاه التجمعات السكنية، تقرر الإخلاء الفوري والمنظم. يرجى سلك المسار الآمن المحدد: ${route.instructions[0]?.roadName || 'الممر الرئيسي'} وصولاً إلى ${route.safeZone.nameAr}. تم تجهيز المركز بفرق طبية ومؤن. يمنع منعاً باتاً التوجه نحو الطرق المتاخمة للغابة لتفادي الاختناق بالدخان وسقوط الأشجار.`,
      urgentActionText: `أرقام الطوارئ المجانية: 14 (الحماية المدنية) • 1021 (الرقم الأخضر) • تردد الراديو المحلي: ${route.safeZone.emergencyVhfFrequency}`
    };
  }

  if (lang === 'fr') {
    return {
      title: `ALERTE D'ÉVACUATION IMMÉDIATE — PROTECTION CIVILE`,
      body: `À l'attention des résidents de ${settlement.nameFr}: En raison de la propagation rapide du front de flamme, l'évacuation immédiate est ordonnée. Empruntez l'itinéraire sécurisé via ${route.instructions[0]?.roadName || 'Axe Principal'} vers le refuge: ${route.safeZone.nameFr}. Évitez impérativement les pistes forestières compromises par les fumées toxiques.`,
      urgentActionText: `Urgences: 14 (Protection Civile) • 1021 • Fréquence VHF: ${route.safeZone.emergencyVhfFrequency}`
    };
  }

  return {
    title: `IMMEDIATE EVACUATION ORDER — CIVIL PROTECTION ALGERIA`,
    body: `To all residents of ${settlement.nameEn}: Due to rapid wildfire advance, mandatory evacuation is in effect. Proceed immediately along designated safe corridor ${route.instructions[0]?.roadName || 'Primary Axis'} to safe shelter: ${route.safeZone.nameEn}. Avoid forest roads due to toxic smoke plumes and flame entrapment risk.`,
    urgentActionText: `Emergency Hotline: 14 / 1021 • VHF Emergency Channel: ${route.safeZone.emergencyVhfFrequency}`
  };
}
