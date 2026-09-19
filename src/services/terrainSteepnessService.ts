import { GeoCoordinates } from '../types';
import { getDEMDataAt, DEMSample } from './demElevationService';

export type MachineryMobilityCategory = 
  | 'accessible_all'      // 0° - 12° (<21%): Standard CCF, CCFM, CCFS, and supply pumpers
  | 'restricted_low_gear' // 12° - 20° (21%-36%): 4x4 Low-gear required; off-road rollover caution
  | 'high_risk_winch'     // 20° - 28° (36%-53%): CCF prohibited off cleared tracks; bulldozers with winch only
  | 'impassable_extreme'; // > 28° (>53%): Impassable for all vehicles; extreme rollover threat

export type GroundCrewHazardLevel = 
  | 'low_risk'            // 0° - 12°: Safe direct attack; standard anchor points
  | 'moderate_caution'    // 12° - 20°: Physical fatigue; loose footing; standard escape corridors
  | 'severe_hazard'       // 20° - 28°: Rolling burning debris risk; escape time +250%; anchor lines required
  | 'extreme_prohibited'; // > 28°: Direct uphill attack prohibited; chimney effect flashover danger; aerial drop required

export interface TerrainSteepnessCell {
  id: string;
  lat: number;
  lng: number;
  elevationMeters: number;
  slopeDegrees: number;
  slopePercent: number;
  aspectDegrees: number;
  aspectCardinal: string;
  topographicFeature: DEMSample['topographicFeature'];
  machineryCategory: MachineryMobilityCategory;
  groundCrewHazard: GroundCrewHazardLevel;
  heatColor: string;
  contourRadius: number;
  chimneyFactor: number; // Fire spread speed multiplier caused by slope (McArthur / Rothermel slope coefficient)
  warningNotes?: string;
}

export interface CriticalEscarpmentZone {
  id: string;
  name: string;
  nameAr: string;
  nameFr: string;
  wilaya: string;
  coordinates: GeoCoordinates;
  maxSlopeDegrees: number;
  peakElevationM: number;
  machineryStatus: MachineryMobilityCategory;
  groundHazard: GroundCrewHazardLevel;
  tacticalAdvisory: {
    en: string;
    ar: string;
    fr: string;
  };
}

export interface TerrainSteepnessSummary {
  totalSampledPoints: number;
  meanSlopeDegrees: number;
  maxSlopeDegrees: number;
  accessibleVehiclesPercent: number;
  restricted4x4Percent: number;
  winchOnlyPercent: number;
  impassablePercent: number;
  extremeChimneyZonesCount: number;
}

/**
 * Key historical high-hazard escarpments and mountain passes across Northern Algeria
 * known for extreme terrain steepness, machinery rollover accidents, and chimney-effect fire runs.
 */
export const CRITICAL_ESCARPMENT_ZONES: CriticalEscarpmentZone[] = [
  {
    id: 'escarp-djurdjura-north',
    name: 'Djurdjura North Face & Tikjda Ridge',
    nameAr: 'المنحدرات الشمالية لجرجرة وتيكجدة',
    nameFr: 'Face Nord du Djurdjura & Crête de Tikjda',
    wilaya: 'Tizi Ouzou / Bouira',
    coordinates: { lat: 36.468, lng: 4.142 },
    maxSlopeDegrees: 48,
    peakElevationM: 2160,
    machineryStatus: 'impassable_extreme',
    groundHazard: 'extreme_prohibited',
    tacticalAdvisory: {
      en: 'Vertical limestone cliffs. All heavy machinery strictly barred. High chimney updraft; indirect aerial suppression mandatory.',
      ar: 'جروف كلسية عمودية. منع تام لمرور الشاحنات الثقيلة. تسارع عنيف لتيارات النيران الصاعدة عبر المداخن الطبيعية.',
      fr: 'Falaises calcaires verticales. Accès engins lourds strictement interdit. Effet de cheminée critique; largages aériens requis.'
    }
  },
  {
    id: 'escarp-guerrouche-gorges',
    name: 'Guerrouche - Texanna Gorges',
    nameAr: 'مضائق غابة قروش - تاكسنة',
    nameFr: 'Gorges de Guerrouche - Texanna',
    wilaya: 'Jijel',
    coordinates: { lat: 36.715, lng: 5.762 },
    maxSlopeDegrees: 42,
    peakElevationM: 1140,
    machineryStatus: 'impassable_extreme',
    groundHazard: 'extreme_prohibited',
    tacticalAdvisory: {
      en: 'V-shaped densely forested ravines. Heavy CCF tankers limited to RN43; off-road rollover hazard extreme. Severe thermal draft.',
      ar: 'أودية غابية سحيقة على شكل V. الشاحنات مقيدة بالطرق المعبدة حصراً؛ خطر انقلاب مؤكد على المنحدرات.',
      fr: 'Ravins forestiers en V très encaissés. Camions citernes cantonnés à la RN43; risque de renversement critique.'
    }
  },
  {
    id: 'escarp-akfadou-crest',
    name: 'Akfadou Massif & Cedar Crestlines',
    nameAr: 'مرتفعات وأعالي غابة أكفادو',
    nameFr: 'Crêtes de l’Akfadou & Forêt des Cèdres',
    wilaya: 'Bejaia / Tizi Ouzou',
    coordinates: { lat: 36.685, lng: 4.620 },
    maxSlopeDegrees: 36,
    peakElevationM: 1620,
    machineryStatus: 'high_risk_winch',
    groundHazard: 'severe_hazard',
    tacticalAdvisory: {
      en: 'Steep lateral ridges. Bulldozers (D6/D8) with winch assist required for firebreak creation; roll-over danger on transversal tracks.',
      ar: 'منحدرات جانبية حادة. تتطلب جرافات شق الطرق المجهزة برافعة ونش؛ خطر الانقلاب العرضي مرتفع.',
      fr: 'Versants abrupts. Bulldozers avec treuil requis pour pare-feu; danger de dévers critique pour les engins.'
    }
  },
  {
    id: 'escarp-chrea-montee',
    name: 'Chréa Blidean Atlas Mountain Pass',
    nameAr: 'منحدرات ممر الشريعة - الأطلس البليدي',
    nameFr: 'Montée de Chréa & Atlas Blidéen',
    wilaya: 'Blida',
    coordinates: { lat: 36.435, lng: 2.875 },
    maxSlopeDegrees: 39,
    peakElevationM: 1510,
    machineryStatus: 'impassable_extreme',
    groundHazard: 'extreme_prohibited',
    tacticalAdvisory: {
      en: 'Hairpin bends and 39° drop-offs. Tanker access restricted to paved Route des Crêtes; rapid canyon updraft into cedar forest.',
      ar: 'منعرجات حادة وهوات بنسبة 39°. منع تقدم الشاحنات خارج الطريق الإسفلتي؛ صعود سريع للنيران عبر الأخاديد.',
      fr: 'Lacets serrés et ravins à 39°. Camions limités à la route goudronnée; aspiration thermique violente vers la cédraie.'
    }
  },
  {
    id: 'escarp-chenoua-coastal',
    name: 'Mount Chenoua Maritime Escarpment',
    nameAr: 'جرف جبل شنوة البحري',
    nameFr: 'Escarpement Maritime du Mont Chenoua',
    wilaya: 'Tipaza',
    coordinates: { lat: 36.625, lng: 2.415 },
    maxSlopeDegrees: 45,
    peakElevationM: 905,
    machineryStatus: 'impassable_extreme',
    groundHazard: 'extreme_prohibited',
    tacticalAdvisory: {
      en: 'Precipitous coastal drop straight into sea. Ground teams cannot secure downhill anchors; high wind turbulence and roll-down rocks.',
      ar: 'انحدار بحري شديد ومباشر. استحالة تثبيت خطوط دفاع برية في المنحدر; اضطرابات هوائية وتساقط حجارة محترقة.',
      fr: 'Falaise maritime tombant à pic. Équipes au sol incapables de tenir la pente; turbulences côtières et chutes de pierres.'
    }
  },
  {
    id: 'escarp-collo-peninsula',
    name: 'Collo Peninsula Cork Oak Ridges',
    nameAr: 'سلاسل غابات الفلين بشبه جزيرة القل',
    nameFr: 'Péninsule de Collo & Forêts de Chêne-Liège',
    wilaya: 'Skikda',
    coordinates: { lat: 36.945, lng: 6.540 },
    maxSlopeDegrees: 34,
    peakElevationM: 980,
    machineryStatus: 'high_risk_winch',
    groundHazard: 'severe_hazard',
    tacticalAdvisory: {
      en: 'Extremely rugged terrain with dense maquis. Machinery limited to coastal ridgelines; foot teams require extended hydration buffers.',
      ar: 'تضاريس وعرة جداً وأدغال كثيفة. الآليات مقيدة بخطوط القمم; إجهاد بدني شديد لفرق المشاة.',
      fr: 'Relief très tourmenté et maquis dense. Engins restreints aux crêtes; équipes à pied soumises à épuisement rapide.'
    }
  },
  {
    id: 'escarp-aures-chelia',
    name: 'Djebel Chélia Escarpment (Aurès)',
    nameAr: 'جدار جبل شيلية - الأوراس',
    nameFr: 'Escarpement du Djebel Chélia (Aurès)',
    wilaya: 'Khenchela / Batna',
    coordinates: { lat: 35.320, lng: 6.645 },
    maxSlopeDegrees: 44,
    peakElevationM: 2328,
    machineryStatus: 'impassable_extreme',
    groundHazard: 'extreme_prohibited',
    tacticalAdvisory: {
      en: 'Highest peak in northern Algeria. Thin air and sheer limestone talus. Tankers lose engine power on high grade; aerial ops required.',
      ar: 'أعلى قمة بشمال الجزائر. انخفاض أداء محركات الشاحنات في المرتفعات الشاهقة والمنحدرات الصخرية الحادة.',
      fr: 'Plus haut sommet du Nord. Perte de puissance moteur des engins lourds en forte pente; éboulis calcaires infranchissables.'
    }
  }
];

/**
 * Classifies machinery mobility category from slope in degrees.
 */
export function classifyMachineryMobility(slopeDeg: number): MachineryMobilityCategory {
  if (slopeDeg <= 12) return 'accessible_all';
  if (slopeDeg <= 20) return 'restricted_low_gear';
  if (slopeDeg <= 28) return 'high_risk_winch';
  return 'impassable_extreme';
}

/**
 * Classifies ground crew hazard level from slope in degrees.
 */
export function classifyGroundCrewHazard(slopeDeg: number): GroundCrewHazardLevel {
  if (slopeDeg <= 12) return 'low_risk';
  if (slopeDeg <= 20) return 'moderate_caution';
  if (slopeDeg <= 28) return 'severe_hazard';
  return 'extreme_prohibited';
}

/**
 * Computes color code for a given slope angle.
 * Green (gentle) -> Yellow (moderate) -> Orange (steep) -> Crimson/Purple (extreme cliff)
 */
export function getSlopeHeatColor(slopeDeg: number): string {
  if (slopeDeg <= 6) return '#10b981'; // Emerald 500 (Flat/gentle)
  if (slopeDeg <= 12) return '#34d399'; // Emerald 400 (Mild incline)
  if (slopeDeg <= 18) return '#eab308'; // Yellow 500 (Moderate slope)
  if (slopeDeg <= 24) return '#f97316'; // Orange 500 (Steep, machinery caution)
  if (slopeDeg <= 30) return '#ea580c'; // Orange 600 (Very steep, CCF rollover risk)
  if (slopeDeg <= 36) return '#ef4444'; // Red 500 (Severe escarpment, impassable)
  return '#9333ea'; // Purple 600 (Extreme vertical cliff > 36°)
}

/**
 * Rothermel / McArthur slope factor:
 * Fire spread rate uphill accelerates exponentially with slope angle:
 * Factor = e^(0.069 * slopeDeg)
 */
export function computeSlopeChimneyFactor(slopeDeg: number): number {
  return Number(Math.exp(0.069 * Math.min(45, slopeDeg)).toFixed(2));
}

/**
 * Samples a single point and returns a complete terrain steepness analysis.
 */
export function evaluateLocationSlopeSafety(lat: number, lng: number): TerrainSteepnessCell {
  const dem = getDEMDataAt(lat, lng);
  const slopeDeg = dem.slopeDegrees;
  const slopePercent = Number((Math.tan((slopeDeg * Math.PI) / 180) * 100).toFixed(1));
  const machineryCat = classifyMachineryMobility(slopeDeg);
  const groundHaz = classifyGroundCrewHazard(slopeDeg);
  const heatColor = getSlopeHeatColor(slopeDeg);
  const chimneyFactor = computeSlopeChimneyFactor(slopeDeg);

  let warningNotes: string | undefined;
  if (slopeDeg > 28) {
    warningNotes = 'Machinery Prohibited: Critical Rollover Danger • Direct Uphill Attack Prohibited';
  } else if (slopeDeg > 20) {
    warningNotes = 'CCF Wheeled Tankers Off-Road Banned • Winched Bulldozers Only';
  } else if (slopeDeg > 12) {
    warningNotes = '4x4 Low-Gear Required • Lateral Side-Hill Caution';
  }

  return {
    id: `slope-pt-${lat.toFixed(3)}-${lng.toFixed(3)}`,
    lat,
    lng,
    elevationMeters: dem.elevationMeters,
    slopeDegrees: slopeDeg,
    slopePercent,
    aspectDegrees: dem.slopeAspectDegrees,
    aspectCardinal: dem.aspectCardinal,
    topographicFeature: dem.topographicFeature,
    machineryCategory: machineryCat,
    groundCrewHazard: groundHaz,
    heatColor,
    contourRadius: Math.max(16, Math.min(44, 20 + slopeDeg * 0.5)),
    chimneyFactor,
    warningNotes
  };
}

/**
 * Generates a calibrated regional spatial grid of slope and terrain steepness
 * across Northern Algeria's wildfire-prone coastal and Tellian massifs.
 */
export function generateRegionalSteepnessGrid(): {
  cells: TerrainSteepnessCell[];
  summary: TerrainSteepnessSummary;
} {
  const cells: TerrainSteepnessCell[] = [];

  // Regional bounding box covering Northern Algeria:
  // Lat: 35.1 to 37.1 (South to North)
  // Lng: -0.8 to 8.6 (West to East)
  const latMin = 35.2;
  const latMax = 37.05;
  const lngMin = -0.8;
  const lngMax = 8.6;

  // Regular grid resolution (~14-16km spacing for fast smooth rendering)
  const latStep = 0.13;
  const lngStep = 0.22;

  let totalSlope = 0;
  let maxSlope = 0;
  let countAccessible = 0;
  let countRestricted = 0;
  let countWinch = 0;
  let countImpassable = 0;
  let countExtremeChimney = 0;

  for (let lat = latMin; lat <= latMax; lat += latStep) {
    for (let lng = lngMin; lng <= lngMax; lng += lngStep) {
      // Skip sea points (Mediterranean coastline approximately north of lat 36.95 where lng < 3 or lng > 8)
      if (lat > 36.95 && (lng < 1.0 || (lng > 3.0 && lng < 4.8))) {
        continue;
      }

      const cell = evaluateLocationSlopeSafety(lat, lng);
      cells.push(cell);

      totalSlope += cell.slopeDegrees;
      if (cell.slopeDegrees > maxSlope) {
        maxSlope = cell.slopeDegrees;
      }

      switch (cell.machineryCategory) {
        case 'accessible_all':
          countAccessible++;
          break;
        case 'restricted_low_gear':
          countRestricted++;
          break;
        case 'high_risk_winch':
          countWinch++;
          break;
        case 'impassable_extreme':
          countImpassable++;
          break;
      }

      if (cell.chimneyFactor >= 2.5) {
        countExtremeChimney++;
      }
    }
  }

  // Include critical mountain massif centers at high resolution
  CRITICAL_ESCARPMENT_ZONES.forEach((escarp) => {
    const cell = evaluateLocationSlopeSafety(escarp.coordinates.lat, escarp.coordinates.lng);
    cell.warningNotes = escarp.name;
    cells.push(cell);
  });

  const total = cells.length || 1;
  const summary: TerrainSteepnessSummary = {
    totalSampledPoints: total,
    meanSlopeDegrees: Math.round(totalSlope / total),
    maxSlopeDegrees: maxSlope,
    accessibleVehiclesPercent: Math.round((countAccessible / total) * 100),
    restricted4x4Percent: Math.round((countRestricted / total) * 100),
    winchOnlyPercent: Math.round((countWinch / total) * 100),
    impassablePercent: Math.round((countImpassable / total) * 100),
    extremeChimneyZonesCount: countExtremeChimney
  };

  return { cells, summary };
}
