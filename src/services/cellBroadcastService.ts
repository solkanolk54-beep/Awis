import { WildfireIncident, GeoCoordinates, Language } from '../types';

export interface HazardBoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  center: GeoCoordinates;
  radiusKm: number;
  projectedFrontBearingDeg: number;
  estimatedAffectedPopulation: number;
  cellTowersCount: number;
  riskTier: 'CRITICAL_EVACUATION' | 'IMMINENT_DANGER' | 'ADVISORY_WATCH';
}

export interface CellBroadcastDispatchResult {
  dispatchId: string;
  timestamp: string;
  incidentId: string;
  incidentCode: string;
  hazardArea: HazardBoundingBox;
  targetWilaya: string;
  targetWilayaAr: string;
  affectedCommunes: string[];
  affectedCommunesAr: string[];
  capAlertMessage: {
    titleAr: string;
    titleFr: string;
    titleEn: string;
    bodyAr: string;
    bodyFr: string;
    bodyEn: string;
    instructionAr: string;
    instructionFr: string;
    instructionEn: string;
  };
  telecomProviders: {
    provider: 'Mobilis' | 'Djezzy' | 'Ooredoo' | 'Algerie Telecom';
    towersAlerted: number;
    subscribersReachedEstimated: number;
    status: 'DISPATCHED' | 'ACKNOWLEDGED';
    latencyMs: number;
  }[];
  totalEstimatedRecipients: number;
  securityAuthLevel: 'L3_CENTRAL_COMMAND' | 'OFFICER_CONFIRMED';
  capChannel: 'PRESIDENTIAL_PRIORITY_CELL_BROADCAST' | 'CIVIL_PROTECTION_EMERGENCY';
}

/**
 * Calculates a dynamic, wind-propagated hazard bounding box based on Rothermel/Byram model metrics
 */
export function computeRothermelHazardArea(
  incident: WildfireIncident,
  burnHoursProjection: number = 6
): HazardBoundingBox {
  const coords = incident.coordinates || { lat: 36.784, lng: 5.719 };
  const windDirDeg = incident.windDirectionDegrees ?? 225; // Blowing towards opposite or along heading
  const windSpeedKmH = incident.windSpeedKmH || 35;
  const burnedHa = incident.estimatedBurnedHectares || 45;

  // Forward rate of spread influenced by wind velocity
  const baseSpreadRateKmH = Math.max(0.6, (windSpeedKmH * 0.065));
  const projectionDistanceKm = Number((baseSpreadRateKmH * burnHoursProjection).toFixed(2));
  
  // Angle of propagation along wind vector (radians)
  const bearingRad = (windDirDeg * Math.PI) / 180;
  
  // Geographic delta (1 degree lat ~= 111.32 km, 1 deg lng ~= 111.32 * cos(lat))
  const cosLat = Math.cos((coords.lat * Math.PI) / 180);
  const deltaLat = (projectionDistanceKm * Math.cos(bearingRad)) / 111.32;
  const deltaLng = (projectionDistanceKm * Math.sin(bearingRad)) / (111.32 * (cosLat > 0.1 ? cosLat : 0.8));

  // Elliptical safety corridor expansion factor
  const lateralFlankRadiusKm = Math.max(1.8, Math.sqrt(burnedHa) * 0.4 + 1.2);
  const flankLatDelta = lateralFlankRadiusKm / 111.32;
  const flankLngDelta = lateralFlankRadiusKm / (111.32 * (cosLat > 0.1 ? cosLat : 0.8));

  // Min and max bounds enclosing the fire perimeter and projected downwind evacuation cone
  const p1Lat = coords.lat;
  const p1Lng = coords.lng;
  const p2Lat = coords.lat + deltaLat;
  const p2Lng = coords.lng + deltaLng;

  const minLat = Math.min(p1Lat, p2Lat) - flankLatDelta;
  const maxLat = Math.max(p1Lat, p2Lat) + flankLatDelta;
  const minLng = Math.min(p1Lng, p2Lng) - flankLngDelta;
  const maxLng = Math.max(p1Lng, p2Lng) + flankLngDelta;

  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;
  const totalRadiusKm = Number((projectionDistanceKm / 2 + lateralFlankRadiusKm).toFixed(2));

  // Approximate population density in Algerian forested mountains (Kabylie/Tell Atlas: ~80-140 hab/km²)
  const boxAreaKm2 = (maxLat - minLat) * 111.32 * (maxLng - minLng) * 111.32 * cosLat;
  const closestAsset = incident.exposedAssets?.[0];
  const proximityKm = closestAsset?.distanceKm ?? 8;
  const populationDensity = proximityKm <= 5 ? 160 : 75;
  const estimatedAffectedPopulation = Math.max(350, Math.round(Math.abs(boxAreaKm2) * populationDensity));
  const cellTowersCount = Math.max(3, Math.round(estimatedAffectedPopulation / 650));

  const riskTier: HazardBoundingBox['riskTier'] = 
    incident.riskLevel === 'critical' || projectionDistanceKm > 6
      ? 'CRITICAL_EVACUATION'
      : incident.riskLevel === 'high' || projectionDistanceKm > 3
      ? 'IMMINENT_DANGER'
      : 'ADVISORY_WATCH';

  return {
    minLat: Number(minLat.toFixed(4)),
    maxLat: Number(maxLat.toFixed(4)),
    minLng: Number(minLng.toFixed(4)),
    maxLng: Number(maxLng.toFixed(4)),
    center: { lat: Number(centerLat.toFixed(4)), lng: Number(centerLng.toFixed(4)) },
    radiusKm: totalRadiusKm,
    projectedFrontBearingDeg: windDirDeg,
    estimatedAffectedPopulation,
    cellTowersCount,
    riskTier
  };
}

/**
 * Dispatches simulated Emergency Cell Broadcast (CAP v1.2 / GSM Cell Broadcast 3GPP TS 23.041)
 * directly targeted to telecommunication base transceiver stations (BTS) covering the hazard cone
 */
export async function dispatchCellBroadcastAlert(
  incident: WildfireIncident,
  customInstructions?: { ar?: string; fr?: string; en?: string }
): Promise<CellBroadcastDispatchResult> {
  // Artificial network transmission delay simulating direct SMPP / CAP relay handshake
  await new Promise((resolve) => setTimeout(resolve, 600));

  const hazardArea = computeRothermelHazardArea(incident, 6);
  const wilaya = incident.wilaya || 'Skikda';
  const commune = incident.locationName || 'Beni Oulbane';

  // Compute realistic provider BTS distribution across Mobilis, Djezzy, Ooredoo
  const mobilisTowers = Math.ceil(hazardArea.cellTowersCount * 0.45);
  const djezzyTowers = Math.ceil(hazardArea.cellTowersCount * 0.30);
  const ooredooTowers = Math.max(1, hazardArea.cellTowersCount - mobilisTowers - djezzyTowers);

  const totalPop = hazardArea.estimatedAffectedPopulation;
  const mobilisSubscribers = Math.round(totalPop * 0.48);
  const djezzySubscribers = Math.round(totalPop * 0.28);
  const ooredooSubscribers = Math.round(totalPop * 0.24);

  const alertResult: CellBroadcastDispatchResult = {
    dispatchId: `CAP-DZ-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
    timestamp: new Date().toISOString(),
    incidentId: incident.id,
    incidentCode: incident.code || `WF-${incident.id}`,
    hazardArea,
    targetWilaya: wilaya,
    targetWilayaAr: getWilayaArabic(wilaya),
    affectedCommunes: [commune, `${commune} Rural North`, 'Forestry Perimeters Zone'],
    affectedCommunesAr: [getCommuneArabic(commune), `شمال ${getCommuneArabic(commune)}`, 'نطاق الأحراش والغابات المجاورة'],
    capAlertMessage: {
      titleAr: '⚠️ إنذار إخلاء عاجل - الحماية المدنية الجزائرية (AWIS)',
      titleFr: '⚠️ ALERTE D\'ÉVACUATION IMMÉDIATE - PROTECTION CIVILE',
      titleEn: '⚠️ IMMEDIATE EVACUATION ORDER - CIVIL PROTECTION ALGERIA',
      bodyAr: `أمر إخلاء فوري لسكان بلدية ${getCommuneArabic(commune)} والقرى المجاورة (${getWilayaArabic(wilaya)}). تقدم سريع لجبهة حريق الغابات باتجاه الرياح. غادروا المنطقة فوراً عبر الممرات الآمنة.`,
      bodyFr: `Avis d'évacuation immédiate pour les résidents de ${commune} (${wilaya}). Progression rapide du front de feu. Évacuez immédiatement via les axes sécurisés.`,
      bodyEn: `Immediate evacuation order for residents of ${commune} (${wilaya}). Wildfire spreading rapidly along the wind vector. Vacate perimeter immediately via designated safe routes.`,
      instructionAr: customInstructions?.ar || 'اتبعوا تعليمات الحماية المدنية ورجال الدرك الوطني فوراً. تجنبوا الطرق المغلقة بدخان الغابات. الرقم الأخضر: 1021 / 14.',
      instructionFr: customInstructions?.fr || 'Suivez les instructions des équipes de la Protection Civile. Évitez les axes saturés de fumée. Ligne verte: 1021 / 14.',
      instructionEn: customInstructions?.en || 'Follow instructions of Algerian Civil Protection & Gendarmerie. Avoid smoke-obscured trails. Emergency Hotline: 1021 / 14.'
    },
    telecomProviders: [
      {
        provider: 'Mobilis',
        towersAlerted: mobilisTowers,
        subscribersReachedEstimated: mobilisSubscribers,
        status: 'ACKNOWLEDGED',
        latencyMs: 142
      },
      {
        provider: 'Djezzy',
        towersAlerted: djezzyTowers,
        subscribersReachedEstimated: djezzySubscribers,
        status: 'ACKNOWLEDGED',
        latencyMs: 185
      },
      {
        provider: 'Ooredoo',
        towersAlerted: ooredooTowers,
        subscribersReachedEstimated: ooredooSubscribers,
        status: 'ACKNOWLEDGED',
        latencyMs: 168
      }
    ],
    totalEstimatedRecipients: totalPop,
    securityAuthLevel: 'L3_CENTRAL_COMMAND',
    capChannel: 'PRESIDENTIAL_PRIORITY_CELL_BROADCAST'
  };

  // Cache alert history in localStorage for persistent offline logging
  try {
    const existing = JSON.parse(localStorage.getItem('awis_dispatched_alerts') || '[]');
    existing.unshift(alertResult);
    localStorage.setItem('awis_dispatched_alerts', JSON.stringify(existing.slice(0, 50)));
  } catch (err) {
    console.warn('Could not store dispatched alert in localStorage', err);
  }

  return alertResult;
}

function getWilayaArabic(wilaya: string): string {
  const map: Record<string, string> = {
    'Skikda': 'سكيكدة',
    'Tizi Ouzou': 'تيزي وزو',
    'Béjaïa': 'بجاية',
    'Jijel': 'جيجل',
    'El Tarf': 'الطارف',
    'Bouira': 'البويرة',
    'Blida': 'البليدة',
    'Tipaza': 'تيبازة',
    'Guelma': 'قالمة',
    'Chlef': 'الشلف',
    'Khenchela': 'خنشلة',
    'Médéa': 'المدية'
  };
  return map[wilaya] || wilaya;
}

function getCommuneArabic(commune: string): string {
  const map: Record<string, string> = {
    'Beni Oulbane': 'بني ولبان',
    'Larbaâ Nath Irathen': 'الأربعاء نATH إيراثن',
    'Adekar': 'أدكار',
    'El Aouana': 'العوانة',
    'El Kala': 'القالة',
    'Zbarbar': 'زبربر',
    'Chréa': 'الشريعة',
    'Sidi Amar': 'سيدي عمار',
    'Bougous': 'بوقوس',
    'Beni Yenni': 'بني يني'
  };
  return map[commune] || commune;
}
