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
