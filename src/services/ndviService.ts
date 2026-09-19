import { ForestZone, GeoCoordinates, Language } from '../types';

export interface NdviColorStop {
  min: number;
  max: number;
  labelEn: string;
  labelAr: string;
  labelFr: string;
  hex: string;
  fillRgba: string;
  textColor: string;
  statusCategory: 'critical_drought' | 'moisture_stressed' | 'moderate' | 'healthy_dense';
  flammabilityIndex: 'Extreme' | 'High' | 'Moderate' | 'Low';
  flammabilityIndexAr: 'خطر اشتعال أقصى' | 'خطر اشتعال مرتفع' | 'خطر معتدل' | 'خطر منخفض';
}

export const NDVI_COLOR_SCALE: NdviColorStop[] = [
  {
    min: -0.2,
    max: 0.22,
    labelEn: 'Severe Drought Stress (< 0.22)',
    labelAr: 'إجهاد جفاف حاد (< 0.22)',
    labelFr: 'Stress Hydrique Sévère (< 0.22)',
    hex: '#ef4444',
    fillRgba: 'rgba(239, 68, 68, 0.55)',
    textColor: 'text-red-400',
    statusCategory: 'critical_drought',
    flammabilityIndex: 'Extreme',
    flammabilityIndexAr: 'خطر اشتعال أقصى'
  },
  {
    min: 0.22,
    max: 0.35,
    labelEn: 'Moisture Deficit (0.22 - 0.35)',
    labelAr: 'عجز رطوبي ملحوظ (0.22 - 0.35)',
    labelFr: 'Déficit Hydrique Modéré (0.22 - 0.35)',
    hex: '#f59e0b',
    fillRgba: 'rgba(245, 158, 11, 0.50)',
    textColor: 'text-amber-400',
    statusCategory: 'moisture_stressed',
    flammabilityIndex: 'High',
    flammabilityIndexAr: 'خطر اشتعال مرتفع'
  },
  {
    min: 0.35,
    max: 0.52,
    labelEn: 'Moderate Vigor (0.35 - 0.52)',
    labelAr: 'نشاط نباتي متوسط (0.35 - 0.52)',
    labelFr: 'Végétation Moyenne (0.35 - 0.52)',
    hex: '#84cc16',
    fillRgba: 'rgba(132, 204, 22, 0.45)',
    textColor: 'text-lime-400',
    statusCategory: 'moderate',
    flammabilityIndex: 'Moderate',
    flammabilityIndexAr: 'خطر معتدل'
  },
  {
    min: 0.52,
    max: 1.0,
    labelEn: 'Healthy Dense Canopy (> 0.52)',
    labelAr: 'غطاء كثيف ورطب (> 0.52)',
    labelFr: 'Canopée Dense & Humide (> 0.52)',
    hex: '#10b981',
    fillRgba: 'rgba(16, 185, 129, 0.45)',
    textColor: 'text-emerald-400',
    statusCategory: 'healthy_dense',
    flammabilityIndex: 'Low',
    flammabilityIndexAr: 'خطر منخفض'
  }
];

export function getNdviColorStop(ndviValue: number): NdviColorStop {
  const found = NDVI_COLOR_SCALE.find((s) => ndviValue >= s.min && ndviValue < s.max);
  return found || (ndviValue >= 0.52 ? NDVI_COLOR_SCALE[3] : NDVI_COLOR_SCALE[0]);
}

export function getNdviHexColor(ndviValue: number): string {
  return getNdviColorStop(ndviValue).hex;
}

export interface NdviRasterPixel {
  id: string;
  lat: number;
  lng: number;
  ndvi: number;
  color: string;
  fillRgba: string;
  stressCategory: 'critical_drought' | 'moisture_stressed' | 'moderate' | 'healthy_dense';
  radiusKm: number;
  forestNameAr: string;
  forestName: string;
  fuelMoistureFmc: number;
  nirReflectance?: number;
  redReflectance?: number;
  droughtAnomalyPercent?: number;
}

/**
 * Generates simulated Sentinel-2 MSI Multi-Spectral sub-pixels around each forest zone
 * to render a multi-spectral raster overlay representation on GIS canvas
 */
export function generateForestNdviPixels(forests: ForestZone[]): NdviRasterPixel[] {
  const pixels: NdviRasterPixel[] = [];

  forests.forEach((forest) => {
    const baseNdvi = forest.ndviValue ?? 0.35;
    const baseLat = forest.coordinates.lat;
    const baseLng = forest.coordinates.lng;

    // Center pixel
    const centerStop = getNdviColorStop(baseNdvi);
    pixels.push({
      id: `px-${forest.id}-center`,
      lat: baseLat,
      lng: baseLng,
      ndvi: Number(baseNdvi.toFixed(2)),
      color: centerStop.hex,
      fillRgba: centerStop.fillRgba,
      stressCategory: centerStop.statusCategory,
      radiusKm: 14,
      forestNameAr: forest.nameAr,
      forestName: forest.name,
      fuelMoistureFmc: forest.canopyMoisturePercent ?? 18
    });

    // Radial sub-clusters simulating microclimate elevation and slope vegetation variations
    const offsets = [
      { dLat: 0.08, dLng: 0.06, ndviDelta: -0.04, radius: 10 }, // ridge top (drier)
      { dLat: -0.07, dLng: 0.08, ndviDelta: +0.06, radius: 11 }, // valley / riverbed (moister)
      { dLat: 0.06, dLng: -0.08, ndviDelta: -0.03, radius: 9 }, // south-facing exposed slope (drier)
      { dLat: -0.08, dLng: -0.05, ndviDelta: +0.04, radius: 10 } // shaded north slope (greener)
    ];

    offsets.forEach((off, idx) => {
      const subNdvi = Math.max(0.12, Math.min(0.85, baseNdvi + off.ndviDelta));
      const stop = getNdviColorStop(subNdvi);
      const fmc = Math.max(8, Math.min(45, (forest.canopyMoisturePercent ?? 18) + (off.ndviDelta * 80)));
      pixels.push({
        id: `px-${forest.id}-sub-${idx}`,
        lat: baseLat + off.dLat,
        lng: baseLng + off.dLng,
        ndvi: Number(subNdvi.toFixed(2)),
        color: stop.hex,
        fillRgba: stop.fillRgba,
        stressCategory: stop.statusCategory,
        radiusKm: off.radius,
        forestNameAr: forest.nameAr,
        forestName: forest.name,
        fuelMoistureFmc: Number(fmc.toFixed(1))
      });
    });
  });

  return pixels;
}

export interface NationalNdviSummary {
  totalMassifs: number;
  totalHectares: number;
  criticalDroughtHectares: number;
  stressedHectares: number;
  healthyHectares: number;
  criticalPercent: number;
  averageNationalNdvi: number;
  averageCanopyMoisture: number;
}

export function computeNationalNdviSummary(forests: ForestZone[]): NationalNdviSummary {
  const totalMassifs = forests.length;
  let totalHectares = 0;
  let criticalDroughtHectares = 0;
  let stressedHectares = 0;
  let healthyHectares = 0;
  let ndviSum = 0;
  let moistureSum = 0;

  forests.forEach((f) => {
    totalHectares += f.totalHectares;
    const ndvi = f.ndviValue ?? 0.35;
    const fmc = f.canopyMoisturePercent ?? 20;
    ndviSum += ndvi;
    moistureSum += fmc;

    if (ndvi < 0.28 || f.vegetationHealthCategory === 'critical_drought') {
      criticalDroughtHectares += f.totalHectares;
    } else if (ndvi < 0.45 || f.vegetationHealthCategory === 'moisture_stressed') {
      stressedHectares += f.totalHectares;
    } else {
      healthyHectares += f.totalHectares;
    }
  });

  const criticalPercent = totalHectares > 0 ? Math.round((criticalDroughtHectares / totalHectares) * 100) : 0;
  const averageNationalNdvi = totalMassifs > 0 ? Number((ndviSum / totalMassifs).toFixed(2)) : 0.35;
  const averageCanopyMoisture = totalMassifs > 0 ? Number((moistureSum / totalMassifs).toFixed(1)) : 18;

  return {
    totalMassifs,
    totalHectares,
    criticalDroughtHectares,
    stressedHectares,
    healthyHectares,
    criticalPercent,
    averageNationalNdvi,
    averageCanopyMoisture
  };
}

export type DroughtScenarioKey = 'scirocco_heatwave' | 'late_summer' | 'baseline' | 'autumn_recovery' | 'spring_greenup' | 'custom';

export interface DroughtScenarioPreset {
  key: DroughtScenarioKey;
  labelEn: string;
  labelAr: string;
  labelFr: string;
  descriptionEn: string;
  descriptionAr: string;
  stressFactor: number; // -0.40 to +0.30
  nirMultiplier: number;
  redMultiplier: number;
}

export const DROUGHT_SCENARIO_PRESETS: DroughtScenarioPreset[] = [
  {
    key: 'scirocco_heatwave',
    labelEn: 'Scirocco Heatwave (Severe Aridity)',
    labelAr: 'موجة حر سيروكو (جفاف وتجفيف حاد)',
    labelFr: 'Canicule Sirocco (Sécheresse Extrême)',
    descriptionEn: 'Extreme southern dry desert winds; rapid leaf desiccation and extreme flammability',
    descriptionAr: 'رياح جنوبية لاهبة تسبب جفافاً سريعاً للأوراق ومحتوى رطوبي حرج',
    stressFactor: -0.18,
    nirMultiplier: 0.82,
    redMultiplier: 1.25
  },
  {
    key: 'late_summer',
    labelEn: 'Late Summer Dry Season',
    labelAr: 'ذروة الجفاف الصيفي المتأخر',
    labelFr: 'Pointe Estivale Sèche',
    descriptionEn: 'Cumulative seasonal water deficit; high ignition and ember spotting vulnerability',
    descriptionAr: 'عجز مائي تراكمي يرفع من حساسية الغابات للشرارات والنيران السريعة',
    stressFactor: -0.09,
    nirMultiplier: 0.91,
    redMultiplier: 1.12
  },
  {
    key: 'baseline',
    labelEn: '10-Yr Seasonal Baseline',
    labelAr: 'المعدل الفصلي المرجعي (10 سنوات)',
    labelFr: 'Référence Saisonnière Décennale',
    descriptionEn: 'Nominal Copernicus Sentinel-2 MSI Multi-Spectral calibration baseline',
    descriptionAr: 'المعدل الطبيعي للمعايرة الطيفية متعددة النطاقات لساتل سنتينل-2',
    stressFactor: 0.0,
    nirMultiplier: 1.0,
    redMultiplier: 1.0
  },
  {
    key: 'autumn_recovery',
    labelEn: 'Early Autumn Moisture Inflow',
    labelAr: 'انفراج خريفي رطب بعد الأمطار',
    labelFr: 'Réveil Automnal & Pluies',
    descriptionEn: 'Partial moisture replenishment; lowered fine fuel flammability in northern massifs',
    descriptionAr: 'تحسن طفيف في رطوبة الأوراق وانخفاض سرعة الاشتعال بالكتل الساحلية',
    stressFactor: +0.07,
    nirMultiplier: 1.08,
    redMultiplier: 0.94
  },
  {
    key: 'spring_greenup',
    labelEn: 'Spring Canopy Greenup',
    labelAr: 'نمو الربيع الخضري الكثيف',
    labelFr: 'Plein Rebond Printanier',
    descriptionEn: 'Active photosynthetic vigor and peak canopy moisture content (> 35% FMC)',
    descriptionAr: 'نشاط تمثيل ضوئي عالٍ ورطوبة أوراق قصوى تحد من انتشار الحرائق',
    stressFactor: +0.16,
    nirMultiplier: 1.18,
    redMultiplier: 0.85
  }
];

export interface NdviCalculationParams {
  droughtStressFactor: number; // -0.40 to +0.30
  scenarioKey: DroughtScenarioKey;
  sensorNirScale?: number; // default 1.0
  sensorRedScale?: number; // default 1.0
}

export interface DynamicForestAssessment {
  forestId: string;
  forestName: string;
  forestNameAr: string;
  baseNdvi: number;
  calculatedNdvi: number;
  nirReflectance: number;
  redReflectance: number;
  canopyMoistureFmc: number;
  anomalyPercent: number;
  stressCategory: 'critical_drought' | 'moisture_stressed' | 'moderate' | 'healthy_dense';
  colorStop: NdviColorStop;
  flammabilityIndex: 'Extreme' | 'High' | 'Moderate' | 'Low';
  flammabilityIndexAr: string;
  totalHectares: number;
}

export interface DynamicNdviCalculationResult {
  pixels: NdviRasterPixel[];
  assessments: Record<string, DynamicForestAssessment>;
  updatedForests: ForestZone[];
  nationalSummary: NationalNdviSummary;
  calculatedAt: string;
  appliedParams: NdviCalculationParams;
}

/**
 * Dynamically computes Sentinel-2 MSI Multi-Spectral NDVI and Drought Stress levels
 * across Algerian forest massifs based on user-driven climatic scenarios and drought sliders.
 */
export function calculateDynamicForestNdvi(
  forests: ForestZone[],
  params: NdviCalculationParams
): DynamicNdviCalculationResult {
  const pixels: NdviRasterPixel[] = [];
  const assessments: Record<string, DynamicForestAssessment> = {};
  const updatedForests: ForestZone[] = [];

  const nirScale = params.sensorNirScale ?? 1.0;
  const redScale = params.sensorRedScale ?? 1.0;
  const stress = Math.max(-0.40, Math.min(0.35, params.droughtStressFactor));

  forests.forEach((forest) => {
    const baseNdvi = forest.ndviValue ?? 0.35;
    const baseLat = forest.coordinates.lat;
    const baseLng = forest.coordinates.lng;

    // Calculate dynamic NDVI with realistic clamping
    const calculatedNdvi = Number(Math.max(0.08, Math.min(0.85, baseNdvi + stress)).toFixed(2));

    // Derive realistic Sentinel-2 MSI reflectance values (NIR B8 842nm and Red B4 665nm)
    // In physical vegetation reflectance, (NIR - Red)/(NIR + Red) = NDVI
    // Total surface reflectance (NIR + Red) ~ 0.46 for typical Mediterranean maquis/pines
    const totalReflectance = 0.46;
    const rawNir = ((totalReflectance * (1 + calculatedNdvi)) / 2) * nirScale;
    const rawRed = ((totalReflectance * (1 - calculatedNdvi)) / 2) * redScale;
    const nirReflectance = Number(Math.max(0.10, Math.min(0.85, rawNir)).toFixed(3));
    const redReflectance = Number(Math.max(0.02, Math.min(0.40, rawRed)).toFixed(3));

    // Dynamic Fuel Moisture Content (FMC %)
    const baseFmc = forest.canopyMoisturePercent ?? 18;
    const calculatedFmc = Number(Math.max(6, Math.min(50, baseFmc + (stress * 65))).toFixed(1));

    // Dynamic 10-year seasonal anomaly %
    const deltaPercent = Math.round(((calculatedNdvi - baseNdvi) / Math.max(0.15, baseNdvi)) * 100);
    const calculatedAnomaly = (forest.ndviAnomalyPercent ?? -15) + deltaPercent;

    const colorStop = getNdviColorStop(calculatedNdvi);

    const assessment: DynamicForestAssessment = {
      forestId: forest.id,
      forestName: forest.name,
      forestNameAr: forest.nameAr,
      baseNdvi,
      calculatedNdvi,
      nirReflectance,
      redReflectance,
      canopyMoistureFmc: calculatedFmc,
      anomalyPercent: calculatedAnomaly,
      stressCategory: colorStop.statusCategory,
      colorStop,
      flammabilityIndex: colorStop.flammabilityIndex,
      flammabilityIndexAr: colorStop.flammabilityIndexAr,
      totalHectares: forest.totalHectares
    };

    assessments[forest.id] = assessment;

    // Build updated forest zone with dynamic parameters
    updatedForests.push({
      ...forest,
      ndviValue: calculatedNdvi,
      ndviAnomalyPercent: calculatedAnomaly,
      vegetationHealthCategory: colorStop.statusCategory,
      canopyMoisturePercent: calculatedFmc
    });

    // Center pixel
    pixels.push({
      id: `px-${forest.id}-center`,
      lat: baseLat,
      lng: baseLng,
      ndvi: calculatedNdvi,
      color: colorStop.hex,
      fillRgba: colorStop.fillRgba,
      stressCategory: colorStop.statusCategory,
      radiusKm: 14,
      forestNameAr: forest.nameAr,
      forestName: forest.name,
      fuelMoistureFmc: calculatedFmc,
      nirReflectance,
      redReflectance,
      droughtAnomalyPercent: calculatedAnomaly
    });

    // Radial microclimate slope offsets
    const offsets = [
      { dLat: 0.08, dLng: 0.06, ndviDelta: -0.04, radius: 10 }, // ridge top (drier)
      { dLat: -0.07, dLng: 0.08, ndviDelta: +0.06, radius: 11 }, // valley / riverbed (moister)
      { dLat: 0.06, dLng: -0.08, ndviDelta: -0.03, radius: 9 },  // south-facing exposed slope (drier)
      { dLat: -0.08, dLng: -0.05, ndviDelta: +0.04, radius: 10 }  // shaded north slope (greener)
    ];

    offsets.forEach((off, idx) => {
      const subNdvi = Number(Math.max(0.08, Math.min(0.85, calculatedNdvi + off.ndviDelta)).toFixed(2));
      const stop = getNdviColorStop(subNdvi);
      const subFmc = Number(Math.max(6, Math.min(50, calculatedFmc + (off.ndviDelta * 70))).toFixed(1));
      const subNir = Number(Math.max(0.08, Math.min(0.85, (totalReflectance * (1 + subNdvi)) / 2)).toFixed(3));
      const subRed = Number(Math.max(0.02, Math.min(0.40, (totalReflectance * (1 - subNdvi)) / 2)).toFixed(3));

      pixels.push({
        id: `px-${forest.id}-sub-${idx}`,
        lat: baseLat + off.dLat,
        lng: baseLng + off.dLng,
        ndvi: subNdvi,
        color: stop.hex,
        fillRgba: stop.fillRgba,
        stressCategory: stop.statusCategory,
        radiusKm: off.radius,
        forestNameAr: forest.nameAr,
        forestName: forest.name,
        fuelMoistureFmc: subFmc,
        nirReflectance: subNir,
        redReflectance: subRed,
        droughtAnomalyPercent: calculatedAnomaly
      });
    });
  });

  const nationalSummary = computeNationalNdviSummary(updatedForests);

  return {
    pixels,
    assessments,
    updatedForests,
    nationalSummary,
    calculatedAt: new Date().toLocaleTimeString(),
    appliedParams: params
  };
}

