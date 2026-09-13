import { 
  EmergencyResource, 
  WildfireIncident, 
  ForestZone 
} from '../types';
import { WilayaGeographicData, ALGERIA_WILAYAS } from '../data/algeriaData';

export type ResourceHeatmapMode = 'balance' | 'needed' | 'available';

export interface WilayaResourceBalance {
  wilayaCode: string;
  nameEn: string;
  nameAr: string;
  nameFr: string;
  lat: number;
  lng: number;
  svgPath: string;
  forestCoverageHectares: number;
  currentRiskIndex: number;
  
  available: {
    total: number;
    ready: number;
    dispatched: number;
    maintenance: number;
    firetrucks: number;
    waterTankers: number;
    aircraft: number;
    drones: number;
    groundTeams: number;
    medical: number;
    totalWaterCapacityLiters: number;
    personnelEstimate: number;
  };
  
  needed: {
    total: number;
    firetrucks: number;
    waterTankers: number;
    aircraft: number;
    groundTeams: number;
    drones: number;
    activeFiresCount: number;
    extremeIncidentsCount: number;
    criticalDroughtForestsCount: number;
    urgencyScore: number; // 0 - 100
  };

  gap: number; // ready - needed.total. Negative = deficit, Positive = surplus
  fulfillmentRatio: number; // (ready / needed) * 100
  status: 'critical_deficit' | 'moderate_deficit' | 'balanced' | 'surplus';
  
  // Heatmap styling properties
  color: string;
  fillRgba: string;
  strokeColor: string;
  glowColor: string;
  heatmapIntensity: number; // 0.0 to 1.0 for radial gradient
}

export interface InterWilayaRecommendation {
  id: string;
  fromWilaya: string;
  fromWilayaAr: string;
  fromWilayaCode: string;
  toWilaya: string;
  toWilayaAr: string;
  toWilayaCode: string;
  resourceType: EmergencyResource['type'];
  resourceTypeName: string;
  resourceTypeNameAr: string;
  unitsCount: number;
  estimatedTransitMinutes: number;
  transitDistanceKm: number;
  transitCorridor: string;
  priority: 'urgent' | 'high' | 'strategic';
  reason: string;
  reasonAr: string;
}

export interface NationalResourceSummary {
  totalUnits: number;
  totalReady: number;
  totalDispatched: number;
  totalNeeded: number;
  netNationalGap: number;
  criticalDeficitWilayasCount: number;
  surplusWilayasCount: number;
  topDeficitWilayas: WilayaResourceBalance[];
  topSurplusWilayas: WilayaResourceBalance[];
  recommendations: InterWilayaRecommendation[];
}

/**
 * Compute Haversine distance in km between two lat/lng coordinates
 */
function computeDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Normalize wilaya string to match between datasets (e.g. 'Tizi Ouzou', 'tizi ouzou', code '15')
 */
export function normalizeWilayaName(nameOrCode: string): string {
  return nameOrCode.toLowerCase().replace(/^(wilaya\s+de\s+|ولاية\s+)/, '').trim();
}

/**
 * Compute comprehensive available versus needed resource balance for each Wilaya in Algeria
 */
export function computeWilayaResourceBalances(
  wilayas: WilayaGeographicData[],
  resources: EmergencyResource[],
  incidents: WildfireIncident[],
  forests: ForestZone[],
  heatmapMode: ResourceHeatmapMode = 'balance'
): WilayaResourceBalance[] {
  return wilayas.map((wilaya) => {
    const normW = normalizeWilayaName(wilaya.nameEn);
    const normAr = normalizeWilayaName(wilaya.nameAr);

    // 1. Gather all resources registered in this Wilaya
    const wilayaResources = resources.filter((r) => {
      const rWilayaNorm = normalizeWilayaName(r.wilaya);
      return (
        rWilayaNorm.includes(normW) ||
        normW.includes(rWilayaNorm) ||
        rWilayaNorm.includes(normAr) ||
        r.wilaya === wilaya.code
      );
    });

    const readyResources = wilayaResources.filter((r) => r.status === 'available');
    const dispatchedResources = wilayaResources.filter((r) => 
      r.status === 'dispatched' || r.status === 'en_route' || r.status === 'on_scene'
    );
    const maintenanceResources = wilayaResources.filter((r) => r.status === 'maintenance');

    // Counts by type
    let firetrucks = 0;
    let waterTankers = 0;
    let aircraft = 0;
    let drones = 0;
    let groundTeams = 0;
    let medical = 0;
    let totalWaterCapacityLiters = 0;
    let personnelEstimate = 0;

    wilayaResources.forEach((r) => {
      if (r.type === 'firetruck') {
        firetrucks++;
        totalWaterCapacityLiters += 6000;
        personnelEstimate += 4;
      } else if (r.type === 'water_tanker') {
        waterTankers++;
        totalWaterCapacityLiters += 12000;
        personnelEstimate += 2;
      } else if (r.type === 'aircraft') {
        aircraft++;
        totalWaterCapacityLiters += 8000;
        personnelEstimate += 3;
      } else if (r.type === 'drone') {
        drones++;
        personnelEstimate += 2;
      } else if (r.type === 'ground_team') {
        groundTeams++;
        totalWaterCapacityLiters += 8000;
        personnelEstimate += 45; // Mobile Column detachment
      } else if (r.type === 'medical') {
        medical++;
        personnelEstimate += 6;
      }
    });

    // 2. Compute dynamic Demand / Needed Resources
    const activeIncidents = incidents.filter((i) => {
      if (i.status === 'contained' || i.status === 'extinguished') return false;
      const iWilayaNorm = normalizeWilayaName(i.wilaya);
      return iWilayaNorm.includes(normW) || normW.includes(iWilayaNorm) || i.wilaya === wilaya.nameAr;
    });

    const extremeIncidents = activeIncidents.filter(
      (i) => i.riskLevel === 'extreme' || i.riskLevel === 'critical'
    );

    const wilayaForests = forests.filter((f) => {
      const fWilayaNorm = normalizeWilayaName(f.wilaya);
      return fWilayaNorm.includes(normW) || normW.includes(fWilayaNorm);
    });

    const criticalDroughtForests = wilayaForests.filter(
      (f) => f.vegetationHealthCategory === 'critical_drought' || (f.ndviValue !== undefined && f.ndviValue < 0.25)
    );

    // Dynamic requirements based on wildfire mechanics
    let neededTrucks = 0;
    let neededTankers = 0;
    let neededAircraft = 0;
    let neededGroundTeams = 0;
    let neededDrones = 0;

    // Minimum baseline readiness for any forested Wilaya
    const baseRequirement = wilaya.forestCoverageHectares > 80000 ? 3 : 2;
    neededTrucks += baseRequirement;
    neededTankers += 1;

    // For every active fire front
    activeIncidents.forEach((inc) => {
      neededTrucks += 2;
      neededTankers += 1;
      neededDrones += 1;

      // Heavy multiplier for raging or critical fire fronts
      if (inc.riskLevel === 'extreme' || inc.riskLevel === 'critical') {
        neededTrucks += 3;
        neededTankers += 2;
        neededGroundTeams += 1;
        neededAircraft += 1;
      }

      if (inc.estimatedBurnedHectares > 10) {
        neededTrucks += 2;
      }

      if (inc.windSpeedKmH > 32) {
        neededTankers += 1;
      }
    });

    // Standby patrol for dry high-NDVI deficit massifs
    if (criticalDroughtForests.length > 0) {
      neededTrucks += criticalDroughtForests.length;
      neededDrones += 1;
    }

    const totalNeeded = neededTrucks + neededTankers + neededAircraft + neededGroundTeams + neededDrones;

    // 3. Operational Gap & Fulfillment Ratio
    // Gap considers units that are READY to deploy
    const readyCount = readyResources.length;
    const gap = readyCount - totalNeeded;
    const fulfillmentRatio = totalNeeded > 0 ? Math.round((readyCount / totalNeeded) * 100) : 100;

    let status: WilayaResourceBalance['status'];
    if (gap <= -3 || fulfillmentRatio < 50) {
      status = 'critical_deficit';
    } else if (gap < 0 || fulfillmentRatio < 80) {
      status = 'moderate_deficit';
    } else if (gap <= 2) {
      status = 'balanced';
    } else {
      status = 'surplus';
    }

    // 4. Color & Heatmap Intensity Mapping
    let color = '#06b6d4';
    let fillRgba = 'rgba(6, 182, 212, 0.25)';
    let strokeColor = '#06b6d4';
    let glowColor = '#22d3ee';
    let heatmapIntensity = 0.5;

    if (heatmapMode === 'balance') {
      if (status === 'critical_deficit') {
        color = '#ef4444';
        fillRgba = 'rgba(239, 68, 68, 0.45)';
        strokeColor = '#f87171';
        glowColor = '#ef4444';
        heatmapIntensity = Math.min(1.0, 0.65 + Math.abs(gap) * 0.07);
      } else if (status === 'moderate_deficit') {
        color = '#f59e0b';
        fillRgba = 'rgba(245, 158, 11, 0.35)';
        strokeColor = '#fbbf24';
        glowColor = '#f59e0b';
        heatmapIntensity = 0.55;
      } else if (status === 'balanced') {
        color = '#0ea5e9';
        fillRgba = 'rgba(14, 165, 233, 0.25)';
        strokeColor = '#38bdf8';
        glowColor = '#0ea5e9';
        heatmapIntensity = 0.40;
      } else { // surplus
        color = '#10b981';
        fillRgba = 'rgba(16, 185, 129, 0.35)';
        strokeColor = '#34d399';
        glowColor = '#10b981';
        heatmapIntensity = Math.min(0.9, 0.45 + gap * 0.08);
      }
    } else if (heatmapMode === 'needed') {
      // Density according to demand intensity
      heatmapIntensity = Math.min(1.0, Math.max(0.15, totalNeeded / 14));
      if (totalNeeded >= 8) {
        color = '#ef4444';
        fillRgba = 'rgba(239, 68, 68, 0.50)';
        strokeColor = '#f87171';
        glowColor = '#ef4444';
      } else if (totalNeeded >= 4) {
        color = '#f97316';
        fillRgba = 'rgba(249, 115, 22, 0.38)';
        strokeColor = '#fb923c';
        glowColor = '#f97316';
      } else {
        color = '#eab308';
        fillRgba = 'rgba(234, 179, 8, 0.25)';
        strokeColor = '#fde047';
        glowColor = '#eab308';
      }
    } else { // 'available' mode
      heatmapIntensity = Math.min(1.0, Math.max(0.15, readyCount / 10));
      if (readyCount >= 6) {
        color = '#10b981';
        fillRgba = 'rgba(16, 185, 129, 0.45)';
        strokeColor = '#34d399';
        glowColor = '#10b981';
      } else if (readyCount >= 3) {
        color = '#06b6d4';
        fillRgba = 'rgba(6, 182, 212, 0.35)';
        strokeColor = '#22d3ee';
        glowColor = '#06b6d4';
      } else {
        color = '#64748b';
        fillRgba = 'rgba(100, 116, 139, 0.25)';
        strokeColor = '#94a3b8';
        glowColor = '#64748b';
      }
    }

    return {
      wilayaCode: wilaya.code,
      nameEn: wilaya.nameEn,
      nameAr: wilaya.nameAr,
      nameFr: wilaya.nameFr,
      lat: wilaya.lat,
      lng: wilaya.lng,
      svgPath: wilaya.svgPath,
      forestCoverageHectares: wilaya.forestCoverageHectares,
      currentRiskIndex: wilaya.currentRiskIndex,
      available: {
        total: wilayaResources.length,
        ready: readyCount,
        dispatched: dispatchedResources.length,
        maintenance: maintenanceResources.length,
        firetrucks,
        waterTankers,
        aircraft,
        drones,
        groundTeams,
        medical,
        totalWaterCapacityLiters,
        personnelEstimate
      },
      needed: {
        total: totalNeeded,
        firetrucks: neededTrucks,
        waterTankers: neededTankers,
        aircraft: neededAircraft,
        groundTeams: neededGroundTeams,
        drones: neededDrones,
        activeFiresCount: activeIncidents.length,
        extremeIncidentsCount: extremeIncidents.length,
        criticalDroughtForestsCount: criticalDroughtForests.length,
        urgencyScore: Math.min(100, (activeIncidents.length * 28) + (extremeIncidents.length * 35) + (wilaya.currentRiskIndex * 0.3))
      },
      gap,
      fulfillmentRatio,
      status,
      color,
      fillRgba,
      strokeColor,
      glowColor,
      heatmapIntensity
    };
  });
}

/**
 * Generate tactical inter-Wilaya mutual aid recommendations
 * Pairs surplus Wilayas with urgent deficit Wilayas and calculates realistic logistics route/time
 */
export function generateInterWilayaRecommendations(
  balances: WilayaResourceBalance[]
): InterWilayaRecommendation[] {
  const deficits = balances
    .filter((b) => b.gap < 0)
    .sort((a, b) => a.gap - b.gap); // most deficient first

  const surpluses = balances
    .filter((b) => b.gap > 0 && b.available.ready > 2)
    .sort((a, b) => b.gap - a.gap); // most surplus first

  const recommendations: InterWilayaRecommendation[] = [];

  if (deficits.length === 0 || surpluses.length === 0) {
    return recommendations;
  }

  // Iterate over deficit wilayas and find the best nearby surplus Wilaya
  deficits.forEach((def) => {
    // Find closest surplus wilaya
    let bestSurplus: WilayaResourceBalance | null = null;
    let minDistance = Infinity;

    surpluses.forEach((sur) => {
      const dist = computeDistanceKm(sur.lat, sur.lng, def.lat, def.lng);
      if (dist < minDistance && dist < 350) { // realistic operational radius
        minDistance = dist;
        bestSurplus = sur;
      }
    });

    if (bestSurplus) {
      const surplus = bestSurplus as WilayaResourceBalance;
      // Determine what to transfer based on deficit type
      let transferType: EmergencyResource['type'] = 'firetruck';
      let typeName = 'Heavy Forest Firetruck CCFM';
      let typeNameAr = 'شاحنة إطفاء غابات ثقيلة CCFM 6000L';
      let units = Math.min(2, Math.abs(def.gap));

      if (def.needed.waterTankers > def.available.waterTankers && surplus.available.waterTankers > 0) {
        transferType = 'water_tanker';
        typeName = 'High-Capacity Water Tanker';
        typeNameAr = 'شاحنة صهريج إمداد مائي كبرى 12,000L';
        units = 1;
      } else if (def.needed.groundTeams > def.available.groundTeams && surplus.available.groundTeams > 0) {
        transferType = 'ground_team';
        typeName = 'Civil Protection Mobile Column Section';
        typeNameAr = 'فصيلة دعم من الرتل المتحرك للحماية المدنية';
        units = 1;
      }

      // Highway corridors in Algeria
      let corridor = 'National Highway Network';
      if ((surplus.nameEn === 'Algiers' || surplus.nameEn === 'Blida') && def.nameEn === 'Tizi Ouzou') {
        corridor = 'Autoroute Est-Ouest A1 ➔ RN12';
      } else if ((surplus.nameEn === 'Algiers' || surplus.nameEn === 'Blida') && def.nameEn === 'Béjaïa') {
        corridor = 'Autoroute A1 ➔ Pénétrante de Béjaïa RN26';
      } else if (surplus.nameEn === 'Skikda' && def.nameEn === 'Jijel') {
        corridor = 'Route Côtière RN43 (Corniche)';
      } else if (surplus.nameEn === 'Blida' && def.nameEn === 'Médéa') {
        corridor = 'Autoroute Nord-Sud (Chiffa Gorges Tunnel)';
      } else if (surplus.nameEn === 'Algiers' && def.nameEn === 'Bouira') {
        corridor = 'Autoroute Est-Ouest A1 (Lakhdaria)';
      }

      // Highway speed ~70 km/h average with siren escort
      const transitMinutes = Math.round((minDistance / 70) * 60);

      const isUrgent = def.status === 'critical_deficit';

      recommendations.push({
        id: `REC-${surplus.wilayaCode}-${def.wilayaCode}`,
        fromWilaya: surplus.nameEn,
        fromWilayaAr: surplus.nameAr,
        fromWilayaCode: surplus.wilayaCode,
        toWilaya: def.nameEn,
        toWilayaAr: def.nameAr,
        toWilayaCode: def.wilayaCode,
        resourceType: transferType,
        resourceTypeName: typeName,
        resourceTypeNameAr: typeNameAr,
        unitsCount: units,
        estimatedTransitMinutes: transitMinutes,
        transitDistanceKm: minDistance,
        transitCorridor: corridor,
        priority: isUrgent ? 'urgent' : 'high',
        reason: `${def.needed.activeFiresCount} active fires, deficit of ${Math.abs(def.gap)} units against extreme risk.`,
        reasonAr: `${def.needed.activeFiresCount} بؤر نيران نشطة، وعجز قدره ${Math.abs(def.gap)} وحدات مقارنة بالخطر المتوقع.`
      });
    }
  });

  return recommendations;
}

/**
 * Compute the complete national summary
 */
export function computeNationalResourceSummary(
  balances: WilayaResourceBalance[]
): NationalResourceSummary {
  let totalUnits = 0;
  let totalReady = 0;
  let totalDispatched = 0;
  let totalNeeded = 0;
  let criticalDeficitWilayasCount = 0;
  let surplusWilayasCount = 0;

  balances.forEach((b) => {
    totalUnits += b.available.total;
    totalReady += b.available.ready;
    totalDispatched += b.available.dispatched;
    totalNeeded += b.needed.total;
    if (b.status === 'critical_deficit') criticalDeficitWilayasCount++;
    if (b.status === 'surplus') surplusWilayasCount++;
  });

  const netNationalGap = totalReady - totalNeeded;

  const topDeficitWilayas = [...balances]
    .filter((b) => b.gap < 0)
    .sort((a, b) => a.gap - b.gap)
    .slice(0, 5);

  const topSurplusWilayas = [...balances]
    .filter((b) => b.gap > 0)
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 5);

  const recommendations = generateInterWilayaRecommendations(balances);

  return {
    totalUnits,
    totalReady,
    totalDispatched,
    totalNeeded,
    netNationalGap,
    criticalDeficitWilayasCount,
    surplusWilayasCount,
    topDeficitWilayas,
    topSurplusWilayas,
    recommendations
  };
}
