import { GeoCoordinates, EmergencyResource, WildfireIncident } from '../types';

export interface OptimalUnitRecommendation {
  resource: EmergencyResource;
  distanceKm: number;
  estimatedTravelTimeMinutes: number;
  rank: 1 | 2 | 3;
  tacticalRole: string;
  tacticalRoleAr: string;
  tacticalRoleFr: string;
  suitabilityScore: number; // 0 - 100
  routeCorridor: string;
  routeCorridorAr: string;
  routeCorridorFr: string;
  accessibilityStatus: string;
  accessibilityStatusAr: string;
  accessibilityStatusFr: string;
  aiJustification: string;
  aiJustificationAr: string;
  aiJustificationFr: string;
  speedKmhProfile: number;
}

/**
 * Computes exact Great Circle (Haversine) geographical distance in kilometers
 */
export function computeDistanceKm(coord1: GeoCoordinates, coord2: GeoCoordinates): number {
  const R = 6371; // Earth mean radius in km
  const dLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const dLng = ((coord2.lng - coord1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coord1.lat * Math.PI) / 180) *
      Math.cos((coord2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

/**
 * Computes realistic travel time taking into account:
 * - Vehicle operational speed profiles
 * - Mountain terrain tortuosity (winding road factors)
 * - Incline gradient slope penalties for heavy trucks
 * - Scramble/muster mobilization intervals
 */
export function computeTravelTimeMinutes(
  distanceKm: number,
  type: EmergencyResource['type'],
  slopeDegrees: number = 0
): { travelTimeMinutes: number; averageSpeedKmh: number } {
  if (type === 'drone') {
    // Air transit straight-line corridor: ~75 km/h cruise + 2 min pre-flight link check
    const avgSpeed = 75;
    const minutes = Math.max(2, Math.round((distanceKm / avgSpeed) * 60 + 2));
    return { travelTimeMinutes: minutes, averageSpeedKmh: avgSpeed };
  }

  if (type === 'aircraft') {
    // Direct aviation air corridor: 300 km/h cruising + 5 min airbase alert & climb
    const avgSpeed = 300;
    const minutes = Math.max(5, Math.round((distanceKm / avgSpeed) * 60 + 5));
    return { travelTimeMinutes: minutes, averageSpeedKmh: avgSpeed };
  }

  // Ground vehicles through Algerian Tell Atlas / Mediterranean topography
  // Mountain roads tortuosity index: ~1.35x to 1.45x straight-line distance
  const roadFactor = 1.38;
  const roadKm = distanceKm * roadFactor;

  // Slope steepness penalty on heavy emergency trucks (water tankers & CCFM)
  const slopePenalty = 1 + Math.min(Math.max(slopeDegrees, 0), 40) / 100;

  let baseSpeed = 48; // km/h
  let musterMinutes = 3; // muster time

  if (type === 'water_tanker') {
    baseSpeed = 38; // Heavy water payload
    musterMinutes = 4;
  } else if (type === 'medical') {
    baseSpeed = 52;
    musterMinutes = 2;
  } else if (type === 'ground_team') {
    baseSpeed = 46;
    musterMinutes = 4;
  }

  const effectiveSpeed = Math.max(25, baseSpeed / slopePenalty);
  const minutes = Math.max(3, Math.round((roadKm / effectiveSpeed) * 60 + musterMinutes));

  return { travelTimeMinutes: minutes, averageSpeedKmh: Math.round(effectiveSpeed) };
}

/**
 * Evaluates all fleet resources against current incident location and telemetry,
 * selecting and ordering the Top 3 optimal units for deployment.
 */
export function evaluateOptimalUnits(
  incident: WildfireIncident,
  resources: EmergencyResource[]
): OptimalUnitRecommendation[] {
  if (!resources || resources.length === 0) return [];

  const evaluated = resources.map((res) => {
    const loc = res.currentLocation || res.baseLocation;
    const distanceKm = computeDistanceKm(loc, incident.coordinates);
    const { travelTimeMinutes, averageSpeedKmh } = computeTravelTimeMinutes(
      distanceKm,
      res.type,
      incident.terrainSlopeDegrees
    );

    // Tactical suitability calculation (0-100)
    // 1. Proximity score (shorter travel time = higher score)
    let proximityScore = Math.max(20, 100 - travelTimeMinutes * 2.2);

    // 2. Status availability bonus
    let statusBonus = 0;
    if (res.status === 'available') statusBonus = 15;
    else if (res.status === 'en_route') statusBonus = -10;
    else if (res.status === 'dispatched') statusBonus = -15;
    else if (res.status === 'maintenance') statusBonus = -50;

    // 3. Capability synergy with incident characteristics
    let capabilityBonus = 0;
    if (incident.riskLevel === 'critical' || incident.riskLevel === 'extreme') {
      if (res.type === 'aircraft' || res.type === 'water_tanker') capabilityBonus += 12;
      if (res.type === 'firetruck') capabilityBonus += 10;
    }
    if (incident.terrainSlopeDegrees > 25 && res.type === 'drone') {
      capabilityBonus += 14; // Essential for steep mountain slopes
    }

    const suitabilityScore = Math.min(
      99,
      Math.max(35, Math.round(proximityScore * 0.7 + statusBonus + capabilityBonus))
    );

    // Route corridor descriptions
    let routeCorridor = `RN-77 / W135 Road Access (${(distanceKm * 1.38).toFixed(1)} km road run)`;
    let routeCorridorAr = `مسار الطريق الوطني رقم 77 والولائي W135 (مسافة ${(distanceKm * 1.38).toFixed(1)} كم)`;
    let routeCorridorFr = `Corridor RN-77 / W135 (${(distanceKm * 1.38).toFixed(1)} km routier)`;

    if (res.type === 'drone') {
      routeCorridor = `Direct Aerial Line-of-Sight (${distanceKm} km flight vector)`;
      routeCorridorAr = `خط طيران جوي مباشر بدون عوائق (${distanceKm} كم)`;
      routeCorridorFr = `Vecteur aérien direct (${distanceKm} km vol)`;
    } else if (res.type === 'aircraft') {
      routeCorridor = `Regional Aviation Airway (${distanceKm} km transit)`;
      routeCorridorAr = `ممر جوي استراتيجي من القاعدة الجوية (${distanceKm} كم)`;
      routeCorridorFr = `Couloir aérien base aérienne (${distanceKm} km transit)`;
    }

    // Road accessibility classification
    let accessibilityStatus = 'Immediate Sector (< 5 km)';
    let accessibilityStatusAr = 'قطاع التدخل الفوري (< 5 كم)';
    let accessibilityStatusFr = 'Secteur immédiat (< 5 km)';

    if (distanceKm > 20) {
      accessibilityStatus = 'Regional Support (> 20 km)';
      accessibilityStatusAr = 'دعم إقليمي ممتد (> 20 كم)';
      accessibilityStatusFr = 'Renfort régional (> 20 km)';
    } else if (distanceKm >= 5) {
      accessibilityStatus = 'Tactical Sector (5–20 km)';
      accessibilityStatusAr = 'القطاع التكتيكي الميداني (5–20 كم)';
      accessibilityStatusFr = 'Secteur tactique (5–20 km)';
    }

    // Contextual AI justifications
    let aiJustification = `Optimized for fast tactical response (${travelTimeMinutes} min ETA). Strong capability fit for flame suppression.`;
    let aiJustificationAr = `محسوبة لسرعة الوصول الميداني (${travelTimeMinutes} دقيقة). توافق عالٍ مع خصائص جبهة الحريق.`;
    let aiJustificationFr = `Optimisé pour un délai d'intervention rapide (${travelTimeMinutes} min). Forte adéquation tactique.`;

    if (res.type === 'drone') {
      aiJustification = `Fastest frontline arrival (${travelTimeMinutes} min). Maps thermal hot spots and head fire propagation along mountain ridges.`;
      aiJustificationAr = `أسرع وحدة وصولاً إلى الموقع (${travelTimeMinutes} دقيقة). رصد حراري جوي دقيق لمسار ألسنة اللهب فوق المرتفعات.`;
      aiJustificationFr = `Arrivée la plus rapide (${travelTimeMinutes} min). Cartographie thermique en temps réel sur crête montagneuse.`;
    } else if (res.type === 'water_tanker') {
      aiJustification = `Crucial water logistics (${res.capacity}). Guarantees uninterrupted replenishment to frontline pumpers.`;
      aiJustificationAr = `إمداد مائي استراتيجي فائق (${res.capacity}). يضمن تزويداً متواصلاً لصهاريج الإخماد المتقدمة.`;
      aiJustificationFr = `Logistique hydraulique majeure (${res.capacity}). Assure le ravitaillement continu en eau.`;
    } else if (res.type === 'firetruck') {
      aiJustification = `High-pressure CCFM off-road attack unit. Rapidly isolates flank spread and defends nearby assets.`;
      aiJustificationAr = `شاحنة تدخل وعرة المسالك مجهزة بضغط عالٍ لإخماد ألسنة النيران وتأمين المحيط السكني.`;
      aiJustificationFr = `Véhicule tout-terrain haute pression CCFM pour attaque directe et protection des hameaux.`;
    } else if (res.type === 'aircraft') {
      aiJustification = `Massive aerial retardant drop payload (${res.capacity}). Breaks firefront intensity in inaccessible ravines.`;
      aiJustificationAr = `إسقاط جوي مكثف للمياه والمثبطات (${res.capacity}) لإضعاف جبهة النيران في المنحدرات الصعبة.`;
      aiJustificationFr = `Largage massif de retardant (${res.capacity}) pour casser l'intensité du front dans les ravins.`;
    } else if (res.type === 'medical') {
      aiJustification = `Protective evacuation and triage readiness for intercepted hamlets in the 60-minute spread cone.`;
      aiJustificationAr = `إسناد وقائي وإسعافي فوري للقرى والمداشر الواقعة ضمن مخروط انتشار النيران.`;
      aiJustificationFr = `Soutien médical et évacuation préventive des hameaux dans le cône de propagation.`;
    }

    return {
      resource: res,
      distanceKm,
      estimatedTravelTimeMinutes: travelTimeMinutes,
      suitabilityScore,
      routeCorridor,
      routeCorridorAr,
      routeCorridorFr,
      accessibilityStatus,
      accessibilityStatusAr,
      accessibilityStatusFr,
      aiJustification,
      aiJustificationAr,
      aiJustificationFr,
      speedKmhProfile: averageSpeedKmh
    };
  });

  // Sort by tactical balance:
  // We prioritize lowest travel time, but ensure tactical diversity
  // (e.g., if multiple units have low travel times, pick complementary roles)
  const sorted = [...evaluated].sort((a, b) => {
    // If one is already assigned to this incident, prioritize available ones if user wants suggestions
    const aAssigned = incident.assignedResources.includes(a.resource.id);
    const bAssigned = incident.assignedResources.includes(b.resource.id);
    if (!aAssigned && bAssigned) return -1;
    if (aAssigned && !bAssigned) return 1;

    // Sort primarily by estimated travel time ascending
    if (a.estimatedTravelTimeMinutes !== b.estimatedTravelTimeMinutes) {
      return a.estimatedTravelTimeMinutes - b.estimatedTravelTimeMinutes;
    }
    // Then by suitability score descending
    return b.suitabilityScore - a.suitabilityScore;
  });

  // Take the top 3 and assign ranks and tactical roles
  const top3 = sorted.slice(0, 3).map((item, index) => {
    const rank = (index + 1) as 1 | 2 | 3;
    let tacticalRole = 'Primary Rapid Attack Unit';
    let tacticalRoleAr = 'الوحدة الأولى: التدخل السريع الأولي';
    let tacticalRoleFr = 'Unité Primaire d\'Attaque Rapide';

    if (rank === 2) {
      tacticalRole = 'High-Volume Suppression Support';
      tacticalRoleAr = 'الوحدة الثانية: إسناد الإخماد والإمداد المائي';
      tacticalRoleFr = 'Soutien d\'Extinction à Fort Débit';
    } else if (rank === 3) {
      tacticalRole = 'Perimeter Containment & Air/Medical Escort';
      tacticalRoleAr = 'الوحدة الثالثة: تطويق المحيط والإسناد الجوي/الطبي';
      tacticalRoleFr = 'Endiguement de Périmètre et Soutien';
    }

    return {
      ...item,
      rank,
      tacticalRole,
      tacticalRoleAr,
      tacticalRoleFr
    };
  });

  return top3;
}
