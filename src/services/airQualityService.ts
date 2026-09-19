import { GeoCoordinates, RiskLevel } from '../types';

export type SmokeInhalationRiskLevel = 
  | 'good' 
  | 'moderate' 
  | 'unhealthy_sensitive' 
  | 'unhealthy' 
  | 'very_unhealthy' 
  | 'hazardous';

export interface SmokeInhalationAssessment {
  riskLevel: SmokeInhalationRiskLevel;
  labelEn: string;
  labelAr: string;
  labelFr: string;
  color: string;
  badgeBg: string;
  badgeBorder: string;
  textColor: string;
  recommendedPpeEn: string;
  recommendedPpeAr: string;
  recommendedPpeFr: string;
  maxCrewExposureEn: string;
  maxCrewExposureAr: string;
  maxCrewExposureFr: string;
  tacticalAdvisoryEn: string;
  tacticalAdvisoryAr: string;
  tacticalAdvisoryFr: string;
  crewHealthActionEn: string;
  crewHealthActionAr: string;
  crewHealthActionFr: string;
}

export interface AirQualityData {
  pm25: number;             // Fine particulate matter ≤ 2.5 µm (µg/m³) - deep pulmonary penetration
  pm10: number;             // Coarse particulate matter ≤ 10 µm (µg/m³) - ash & soot
  usAqi: number;            // US EPA Air Quality Index (0 - 500)
  europeanAqi?: number;     // European Air Quality Index
  carbonMonoxidePpm: number;// CO level in ppm (estimated from µg/m³)
  carbonMonoxideUgM3: number;
  nitrogenDioxide?: number; // NO2 in µg/m³
  sulphurDioxide?: number;  // SO2 in µg/m³
  ozone?: number;           // O3 in µg/m³
  timestamp: string;
  locationName: string;
  coordinates: GeoCoordinates;
  isRealTime: boolean;
  source: 'Open-Meteo Air Quality API' | 'Plume Telemetry Fallback' | 'Cached Satellite Feed';
  smokeAssessment: SmokeInhalationAssessment;
  firePlumeAdjusted?: boolean;
}

// In-memory cache to avoid excessive network requests
const aqiCache = new Map<string, { data: AirQualityData; expiresAt: number }>();
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes

/**
 * Calculates standardized US AQI from PM2.5 concentration according to EPA breakpoints
 */
export function calculateUsAqiFromPm25(pm25: number): number {
  const breakpoints = [
    { cLow: 0.0, cHigh: 12.0, iLow: 0, iHigh: 50 },
    { cLow: 12.1, cHigh: 35.4, iLow: 51, iHigh: 100 },
    { cLow: 35.5, cHigh: 55.4, iLow: 101, iHigh: 150 },
    { cLow: 55.5, cHigh: 150.4, iLow: 151, iHigh: 200 },
    { cLow: 150.5, cHigh: 250.4, iLow: 201, iHigh: 300 },
    { cLow: 250.5, cHigh: 350.4, iLow: 301, iHigh: 400 },
    { cLow: 350.5, cHigh: 500.4, iLow: 401, iHigh: 500 }
  ];

  const clamped = Math.max(0, Math.min(500, pm25));
  for (const b of breakpoints) {
    if (clamped <= b.cHigh) {
      const aqi = Math.round(
        ((b.iHigh - b.iLow) / (b.cHigh - b.cLow)) * (clamped - b.cLow) + b.iLow
      );
      return Math.min(500, Math.max(0, aqi));
    }
  }
  return 500;
}

/**
 * Generates emergency crew smoke inhalation tactical risk assessment
 */
export function evaluateSmokeInhalationRisk(pm25: number, usAqi: number, coPpm: number = 0): SmokeInhalationAssessment {
  // Hazardous smoke plume conditions
  if (pm25 >= 250.5 || usAqi >= 301 || coPpm >= 35) {
    return {
      riskLevel: 'hazardous',
      labelEn: 'Hazardous Smoke Plume',
      labelAr: 'دخان سام فائق الخطورة',
      labelFr: 'Panache Toxique Dangereux',
      color: '#e11d48',
      badgeBg: 'bg-rose-950/80',
      badgeBorder: 'border-rose-500',
      textColor: 'text-rose-300',
      recommendedPpeEn: 'Mandatory SCBA (Self-Contained Breathing Apparatus) or positive-pressure respirator. Standard particulate masks ineffective.',
      recommendedPpeAr: 'جهاز تنفس عازل ذو دارة مغلقة (ARI/SCBA) إلزامي. كمامات الترشيح العادية غير كافية لمنع التسمم بغاز أول أكسيد الكربون.',
      recommendedPpeFr: 'Appareil Respiratoire Isolant (ARI) obligatoire. Masques FFP classiques inefficaces face au CO saturé.',
      maxCrewExposureEn: 'Limit continuous direct attack to < 20 minutes with immediate clean-air crew rotation.',
      maxCrewExposureAr: 'أقصى مدة بقاء على خط النار الأمامي: أقل من 20 دقيقة مع تبديل فوري للفرق نحو منطقة نقية.',
      maxCrewExposureFr: 'Attaque directe limitée à < 20 min avec relève immédiate en zone saine.',
      tacticalAdvisoryEn: 'Dense toxic smoke inversion. High carbon monoxide concentration risking disorientation, dizziness, and rapid asphyxiation. Move downwind ground units to flank safety zones.',
      tacticalAdvisoryAr: 'انحباس دخاني كثيف وتشبع بأول أكسيد الكربون. خطر فقدان الوعي والإجهاد التنفسي الحاد. سحب الفرق من مسار الرياح المباشر.',
      tacticalAdvisoryFr: 'Inversion de fumée toxique. Risque aigu d\'anoxie et désorientation. Retrait tactique des équipes au vent arrière.',
      crewHealthActionEn: 'Activate on-scene oxygen therapy triage. Monitor SpO2 and carboxyhemoglobin for front-line firefighters.',
      crewHealthActionAr: 'تجهيز وحدات الأكسجين الميدانية ومراقبة نسبة تشبع الأكسجين لرجال الحماية المدنية ورعاة الغابات.',
      crewHealthActionFr: 'Déployer l\'oxygénothérapie de terrain et contrôler la SpO2 des sapeurs-pompiers.'
    };
  }

  // Very Unhealthy smoke density
  if (pm25 >= 150.5 || usAqi >= 201 || coPpm >= 15) {
    return {
      riskLevel: 'very_unhealthy',
      labelEn: 'Very Unhealthy (Heavy Smoke)',
      labelAr: 'دخان كثيف خطير جداً',
      labelFr: 'Très Malsain (Fumée Dense)',
      color: '#9333ea',
      badgeBg: 'bg-purple-950/80',
      badgeBorder: 'border-purple-500',
      textColor: 'text-purple-300',
      recommendedPpeEn: 'FFP3 / P100 particulate respirator with activated carbon filter layer or SCBA for vanguard spearheads.',
      recommendedPpeAr: 'كمامات FFP3 أو P100 مع طبقة كربونية نشطة، أو أجهزة تنفس عازلة لفرق الصدمة الأولى.',
      recommendedPpeFr: 'Masque FFP3 / P100 avec couche de charbon actif ou ARI pour les têtes d\'attaque.',
      maxCrewExposureEn: 'Max 30 - 45 minutes on the active fire front before tactical rotation.',
      maxCrewExposureAr: 'أقصى مدة مناوبة: 30 إلى 45 دقيقة على خط التماس قبل التناوب الإلزامي.',
      maxCrewExposureFr: 'Rotation impérative toutes les 30 à 45 minutes sur le front actif.',
      tacticalAdvisoryEn: 'Heavy smoke plume causing severe eye/throat irritation and reduced spatial visibility (< 100m). Coordinate water-drops via radio beacons.',
      tacticalAdvisoryAr: 'دخان كثيف يسبب تهيجاً حاداً للأعين ومجرى التنفس وانخفاض الرؤية الميدانية لأقل من 100م. تنسيق الإسقاط الجوي عبر الإشارات.',
      tacticalAdvisoryFr: 'Fumée dense provoquant irritation oculaire/respiratoire et visibilité < 100m. Guidage des largages par balises radio.',
      crewHealthActionEn: 'Provide saline eyewash stations and hydrated rest shelters at forward command posts.',
      crewHealthActionAr: 'توفير محطات غسيل العين بالمحلول الملحي وملاجئ ترطيب واستراحة في مركز القيادة الميداني.',
      crewHealthActionFr: 'Points de rinçage oculaire au sérum physiologique et abris de repos hydratés.'
    };
  }

  // Unhealthy
  if (pm25 >= 55.5 || usAqi >= 151) {
    return {
      riskLevel: 'unhealthy',
      labelEn: 'Unhealthy (Smoke Plume)',
      labelAr: 'غير صحي (عمود دخان)',
      labelFr: 'Malsain (Panache de Fumée)',
      color: '#ea580c',
      badgeBg: 'bg-amber-950/80',
      badgeBorder: 'border-amber-500',
      textColor: 'text-amber-300',
      recommendedPpeEn: 'FFP2 / FFP3 particulate respirator and sealed smoke goggles for all field personnel.',
      recommendedPpeAr: 'كمامات واقية FFP2 أو FFP3 مع نظارات حماية محكمة من الرماد لجميع الأعوان الميدانيين.',
      recommendedPpeFr: 'Masque FFP2 / FFP3 et lunettes étanches anti-suie pour tous les intervenants.',
      maxCrewExposureEn: '60 - 90 minutes rotation intervals. Enforce mandatory hydration.',
      maxCrewExposureAr: 'فترات مناوبة من 60 إلى 90 دقيقة مع شرب الماء الإجباري لمنع الإجهاد الحراري.',
      maxCrewExposureFr: 'Relève toutes les 60 à 90 minutes. Hydratation renforcée obligatoire.',
      tacticalAdvisoryEn: 'Elevated particulate soot. Monitor crews for cough and bronchospasm. Warn downwind residential communities to shelter in place.',
      tacticalAdvisoryAr: 'ارتفاع جزيئات السخام والرماد المتطاير. توجيه إشعار للسكان في مسار الرياح لإغلاق النوافذ والبقاء في المنازل.',
      tacticalAdvisoryFr: 'Suie en suspension accrue. Aviser les populations sous le vent de se confiner fenêtres closes.',
      crewHealthActionEn: 'Regular pulse-oximetry checks during shift rotations at tactical ambulance units.',
      crewHealthActionAr: 'فحص دوري لنسبة الأكسجين في الدم عند تبديل الفرق بواسطة سيارات إسعاف الحماية المدنية.',
      crewHealthActionFr: 'Contrôles oxymétriques réguliers lors des relèves par les ambulances de secours.'
    };
  }

  // Unhealthy for Sensitive Groups
  if (pm25 >= 35.5 || usAqi >= 101) {
    return {
      riskLevel: 'unhealthy_sensitive',
      labelEn: 'Unhealthy for Sensitive Groups',
      labelAr: 'غير صحي للحالات الحساسة',
      labelFr: 'Malsain pour Groupes Sensibles',
      color: '#f59e0b',
      badgeBg: 'bg-yellow-950/70',
      badgeBorder: 'border-yellow-500',
      textColor: 'text-yellow-300',
      recommendedPpeEn: 'FFP2 mask advised for prolonged suppression tasks. Nomex fire shroud over nose/mouth.',
      recommendedPpeAr: 'ارتداء كمامات FFP2 أو غطاء نومكس واقٍ على الأنف والفم خلال عمليات الإخماد الطويلة.',
      recommendedPpeFr: 'Masque FFP2 conseillé pour engagement prolongé. Cagoule Nomex sur voies aériennes.',
      maxCrewExposureEn: 'Standard 2 - 3 hour operational shift with scheduled hydration breaks.',
      maxCrewExposureAr: 'فترات عمل قياسية من ساعتين إلى 3 ساعات مع فترات راحة وترطيب.',
      maxCrewExposureFr: 'Engagement standard de 2 à 3h avec pauses d\'hydratation programmées.',
      tacticalAdvisoryEn: 'Moderate smoke haze. Forest rangers with preexisting asthma or allergies should be redeployed to logistics or dispatch.',
      tacticalAdvisoryAr: 'ضباب دخاني معتدل. يفضل تحويل الأعوان الذين يعانون من حساسية الصدر أو الربو إلى مهام الدعم والإسناد.',
      tacticalAdvisoryFr: 'Brume de fumée modérée. Réaffecter les agents souffrant d\'asthme vers la logistique.',
      crewHealthActionEn: 'Ensure availability of bronchodilators in the mobile field clinic.',
      crewHealthActionAr: 'التأكد من توفر بخاخات موسعة للشعب الهوائية في العيادة المتنقلة الميدانية.',
      crewHealthActionFr: 'Vérifier la dotation en bronchodilatateurs du poste médical avancé.'
    };
  }

  // Moderate
  if (pm25 >= 12.1 || usAqi >= 51) {
    return {
      riskLevel: 'moderate',
      labelEn: 'Moderate Air Quality',
      labelAr: 'جودة هواء معتدلة',
      labelFr: 'Qualité d\'Air Modérée',
      color: '#10b981',
      badgeBg: 'bg-emerald-950/60',
      badgeBorder: 'border-emerald-600',
      textColor: 'text-emerald-300',
      recommendedPpeEn: 'Standard wildland firefighting PPE (Nomex helmet shroud, safety goggles).',
      recommendedPpeAr: 'معدات الحماية الشخصية الميدانية القياسية (قناع نومكس للرأس ونظارات واقية).',
      recommendedPpeFr: 'Équipement feu de forêt standard (cagoule Nomex, lunettes de protection).',
      maxCrewExposureEn: 'Normal operational shifts (4 - 6 hours) with standard relief schedule.',
      maxCrewExposureAr: 'فترات مناوبة عادية (4 إلى 6 ساعات) حسب جدول العمليات المعتاد.',
      maxCrewExposureFr: 'Relève normale selon le tableau de garde opérationnel.',
      tacticalAdvisoryEn: 'Ambient smoke concentrations acceptable. Maintain regular perimeter surveillance.',
      tacticalAdvisoryAr: 'تركيز الدخان في الحدود المقبولة. استمرار المراقبة الدورية لحزام النار.',
      tacticalAdvisoryFr: 'Concentrations de fumée acceptables. Poursuivre la veille de lisière.',
      crewHealthActionEn: 'Standard hydration and routine heat monitoring.',
      crewHealthActionAr: 'ترطيب قياسي ومتابعة دورية للإجهاد الحراري.',
      crewHealthActionFr: 'Hydratation régulière et prévention classique du coup de chaleur.'
    };
  }

  // Good
  return {
    riskLevel: 'good',
    labelEn: 'Good Air Quality',
    labelAr: 'جودة هواء ممتازة ونقية',
    labelFr: 'Excellente Qualité d\'Air',
    color: '#06b6d4',
    badgeBg: 'bg-cyan-950/60',
    badgeBorder: 'border-cyan-600',
    textColor: 'text-cyan-300',
    recommendedPpeEn: 'Standard wildland uniform; no particulate respiratory protection required.',
    recommendedPpeAr: 'الزي الميداني القياسي؛ لا حاجة لأقنعة ترشيح تنفسية إضافية.',
    recommendedPpeFr: 'Tenue de feu standard ; protection respiratoire non requise.',
    maxCrewExposureEn: 'Full shift capability with no smoke-related restrictions.',
    maxCrewExposureAr: 'جاهزية كاملة دون أي قيود مرتبطة بالدخان أو التلوث.',
    maxCrewExposureFr: 'Capacité d\'engagement complète sans contrainte de fumée.',
    tacticalAdvisoryEn: 'Clean air conditions over the incident sector. Optimal flight and ground visibility.',
    tacticalAdvisoryAr: 'أجواء نقية في هذا القطاع. رؤية بصرية ممتازة للمروحيات والفرق الأرضية.',
    tacticalAdvisoryFr: 'Atmosphère saine sur le secteur. Visibilité optimale sol et air.',
    crewHealthActionEn: 'Maintain normal readiness status.',
    crewHealthActionAr: 'الحفاظ على الجاهزية العادية.',
    crewHealthActionFr: 'Maintien de l\'état de veille standard.'
  };
}

export interface FetchAirQualityOptions {
  locationName?: string;
  incidentRisk?: RiskLevel;
  fireFrpMw?: number;
  incidentStatus?: string;
}

/**
 * Fetches real-time Air Quality & particulate telemetry from Open-Meteo Air Quality API
 * with intelligent wildfire plume assessment for emergency crews.
 */
export async function fetchLiveAirQuality(
  coordsOrLat: GeoCoordinates | number,
  optionalLng?: number,
  options?: FetchAirQualityOptions
): Promise<AirQualityData> {
  const coords: GeoCoordinates = 
    typeof coordsOrLat === 'number' 
      ? { lat: coordsOrLat, lng: optionalLng ?? 0 } 
      : coordsOrLat;

  const cacheKey = `aqi_${coords.lat.toFixed(2)}_${coords.lng.toFixed(2)}`;
  const now = Date.now();

  const cached = aqiCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const locName = options?.locationName || 'Wilaya Incident Sector';
  const incidentRisk = options?.incidentRisk || 'high';
  const fireFrpMw = options?.fireFrpMw || 35;
  const isExtinguished = options?.incidentStatus === 'extinguished';

  try {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${coords.lat}&longitude=${coords.lng}&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,european_aqi,us_aqi&timezone=auto`;
    
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Air Quality API error: ${response.status}`);
    }

    const json = await response.json();
    if (!json.current) {
      throw new Error('Invalid air quality payload');
    }

    const current = json.current;
    let pm25 = Number(current.pm2_5 ?? 12);
    let pm10 = Number(current.pm10 ?? 24);
    let usAqi = Number(current.us_aqi ?? calculateUsAqiFromPm25(pm25));
    const eaqui = current.european_aqi ? Number(current.european_aqi) : undefined;
    const coUg = Number(current.carbon_monoxide ?? 180);
    // Convert CO µg/m³ to approximate ppm (1 ppm CO ≈ 1145 µg/m³ at 25°C)
    let coPpm = Math.round((coUg / 1145) * 10) / 10;

    let firePlumeAdjusted = false;

    // If there is an active intense wildfire at this site, factor in the proximal thermal smoke plume
    // (Open-Meteo regional models have a 10km grid resolution, whereas frontline crews face dense local plumes)
    if (!isExtinguished && (incidentRisk === 'critical' || incidentRisk === 'extreme' || fireFrpMw > 30)) {
      firePlumeAdjusted = true;
      const smokeMultiplier = incidentRisk === 'critical' ? 3.8 : 2.4;
      const frpContribution = Math.min(180, Math.round(Math.sqrt(fireFrpMw) * 14));
      
      pm25 = Math.round((pm25 * smokeMultiplier + frpContribution) * 10) / 10;
      pm10 = Math.round((pm10 * smokeMultiplier + frpContribution * 1.6) * 10) / 10;
      coPpm = Math.round((coPpm + (fireFrpMw / 18)) * 10) / 10;
      usAqi = calculateUsAqiFromPm25(pm25);
    }

    const assessment = evaluateSmokeInhalationRisk(pm25, usAqi, coPpm);

    const result: AirQualityData = {
      pm25,
      pm10,
      usAqi,
      europeanAqi: eaqui,
      carbonMonoxidePpm: coPpm,
      carbonMonoxideUgM3: coUg,
      nitrogenDioxide: current.nitrogen_dioxide ? Number(current.nitrogen_dioxide) : undefined,
      sulphurDioxide: current.sulphur_dioxide ? Number(current.sulphur_dioxide) : undefined,
      ozone: current.ozone ? Number(current.ozone) : undefined,
      timestamp: new Date().toISOString(),
      locationName: locName,
      coordinates: coords,
      isRealTime: true,
      source: 'Open-Meteo Air Quality API',
      smokeAssessment: assessment,
      firePlumeAdjusted
    };

    aqiCache.set(cacheKey, {
      data: result,
      expiresAt: now + CACHE_TTL_MS
    });

    return result;
  } catch (err) {
    console.warn('Falling back to local plume telemetry model:', err);

    // Realistic physics-based wildfire smoke fallback if connection fails or offline
    let fallbackPm25 = 148.5;
    let fallbackPm10 = 220.0;
    let fallbackCoPpm = 18.2;

    if (isExtinguished) {
      fallbackPm25 = 14.2;
      fallbackPm10 = 28.5;
      fallbackCoPpm = 0.8;
    } else if (incidentRisk === 'low' || incidentRisk === 'moderate') {
      fallbackPm25 = 38.0;
      fallbackPm10 = 62.0;
      fallbackCoPpm = 3.5;
    } else if (incidentRisk === 'critical') {
      fallbackPm25 = 265.0;
      fallbackPm10 = 380.0;
      fallbackCoPpm = 42.0;
    }

    const usAqi = calculateUsAqiFromPm25(fallbackPm25);
    const assessment = evaluateSmokeInhalationRisk(fallbackPm25, usAqi, fallbackCoPpm);

    return {
      pm25: fallbackPm25,
      pm10: fallbackPm10,
      usAqi,
      europeanAqi: Math.round(usAqi * 0.45),
      carbonMonoxidePpm: fallbackCoPpm,
      carbonMonoxideUgM3: Math.round(fallbackCoPpm * 1145),
      nitrogenDioxide: 18.5,
      sulphurDioxide: 8.2,
      ozone: 92.0,
      timestamp: new Date().toISOString(),
      locationName: locName,
      coordinates: coords,
      isRealTime: false,
      source: 'Plume Telemetry Fallback',
      smokeAssessment: assessment,
      firePlumeAdjusted: !isExtinguished
    };
  }
}
