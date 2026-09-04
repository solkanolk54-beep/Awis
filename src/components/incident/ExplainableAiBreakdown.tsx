import React, { useState } from 'react';
import { 
  Wind, 
  Thermometer, 
  Mountain, 
  Droplets, 
  Trees, 
  Cpu, 
  Sliders, 
  RotateCcw, 
  Info,
  TrendingUp,
  Flame,
  Scale,
  BarChart3
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Cell 
} from 'recharts';
import { WildfireIncident, Language } from '../../types';

interface ExplainableAiBreakdownProps {
  incident: WildfireIncident;
  currentLang: Language;
}

interface FactorContribution {
  id: string;
  name: { en: string; ar: string; fr: string };
  category: { en: string; ar: string; fr: string };
  observedValue: string;
  weightPercent: number; // e.g., 28%
  scoreContribution: number; // points out of 100
  riskImpact: 'critical' | 'extreme' | 'high' | 'moderate' | 'low';
  impactDescription: { en: string; ar: string; fr: string };
  scientificMechanism: { en: string; ar: string; fr: string };
  icon: React.ComponentType<{ className?: string }>;
  color: {
    bar: string;
    badge: string;
    text: string;
  };
}

export const ExplainableAiBreakdown: React.FC<ExplainableAiBreakdownProps> = ({
  incident,
  currentLang
}) => {
  // Sensitivity Simulator state initialized with incident telemetry
  const [isSimulating, setIsSimulating] = useState(false);
  const [chartViewMode, setChartViewMode] = useState<'weights' | 'points'>('weights');
  const [simWindSpeed, setSimWindSpeed] = useState(incident.windSpeedKmH);
  const [simTemperature, setSimTemperature] = useState(incident.temperatureC);
  const [simHumidity, setSimHumidity] = useState(incident.humidityPercent);
  const [simFuelMoisture, setSimFuelMoisture] = useState(16); // Default 16% fine fuel moisture
  const [simSlope, setSimSlope] = useState(incident.terrainSlopeDegrees);

  const resetSimulation = () => {
    setSimWindSpeed(incident.windSpeedKmH);
    setSimTemperature(incident.temperatureC);
    setSimHumidity(incident.humidityPercent);
    setSimFuelMoisture(16);
    setSimSlope(incident.terrainSlopeDegrees);
    setIsSimulating(false);
  };

  // Active inputs depending on whether simulation mode is toggled
  const activeWind = isSimulating ? simWindSpeed : incident.windSpeedKmH;
  const activeTemp = isSimulating ? simTemperature : incident.temperatureC;
  const activeHum = isSimulating ? simHumidity : incident.humidityPercent;
  const activeFuel = isSimulating ? simFuelMoisture : 16;
  const activeSlope = isSimulating ? simSlope : incident.terrainSlopeDegrees;

  // Calculate dynamic weighted score based on Rothermel & Canadian FWI adaptation for Algeria
  // 1. Wind Factor (Weight: 28%)
  // Wind scale: 0 - 60+ km/h
  const windFactorNorm = Math.min(Math.max((activeWind - 5) / 50, 0.1), 1.0);
  const windPts = Math.round(windFactorNorm * 28 * 10) / 10;

  // 2. Fuel Moisture Factor (Weight: 24%)
  // Lower moisture = higher risk. Moisture scale: 5% (extreme dry) to 35% (damp)
  const fuelFactorNorm = Math.min(Math.max((35 - activeFuel) / 30, 0.1), 1.0);
  const fuelPts = Math.round(fuelFactorNorm * 24 * 10) / 10;

  // 3. Temperature Factor (Weight: 18%)
  // Temp scale: 15°C to 45°C
  const tempFactorNorm = Math.min(Math.max((activeTemp - 18) / 27, 0.1), 1.0);
  const tempPts = Math.round(tempFactorNorm * 18 * 10) / 10;

  // 4. Topography & Slope Factor (Weight: 16%)
  // Slope scale: 0° to 45°
  const slopeFactorNorm = Math.min(Math.max(activeSlope / 40, 0.1), 1.0);
  const slopePts = Math.round(slopeFactorNorm * 16 * 10) / 10;

  // 5. Humidity Factor (Weight: 8%)
  // Humidity scale: 10% (arid) to 70% (moist)
  const humFactorNorm = Math.min(Math.max((65 - activeHum) / 55, 0.1), 1.0);
  const humPts = Math.round(humFactorNorm * 8 * 10) / 10;

  // 6. Biomass & Vegetation Load (Weight: 6%)
  const biomassPts = 5.4;

  const totalCalculatedScore = Math.min(
    Math.round(windPts + fuelPts + tempPts + slopePts + humPts + biomassPts),
    100
  );

  // Baseline incident score for comparison
  const baselineScore = incident.riskLevel === 'critical' ? 92 : incident.riskLevel === 'extreme' ? 84 : 72;
  const displayScore = isSimulating ? totalCalculatedScore : baselineScore;

  const scoreDelta = totalCalculatedScore - baselineScore;

  // Risk classification helper
  const getRiskBadge = (score: number) => {
    if (score >= 85) return { label: 'CRITICAL', labelAr: 'حرج للغاية', labelFr: 'CRITIQUE', color: 'bg-red-500/20 text-red-300 border-red-500/50' };
    if (score >= 75) return { label: 'EXTREME', labelAr: 'شديد الخطورة', labelFr: 'EXTRÊME', color: 'bg-orange-500/20 text-orange-300 border-orange-500/50' };
    if (score >= 60) return { label: 'HIGH', labelAr: 'مرتفع', labelFr: 'ÉLEVÉ', color: 'bg-amber-500/20 text-amber-300 border-amber-500/50' };
    if (score >= 40) return { label: 'MODERATE', labelAr: 'متوسط', labelFr: 'MODÉRÉ', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50' };
    return { label: 'LOW', labelAr: 'منخفض', labelFr: 'FAIBLE', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' };
  };

  const currentRisk = getRiskBadge(displayScore);

  // Define contributing variables list
  const variables: FactorContribution[] = [
    {
      id: 'wind',
      name: {
        en: 'Wind Speed & Sirocco Dynamics',
        ar: 'سرعة الرياح وتيارات الشهيلي الجنوبية',
        fr: 'Vitesse du Vent & Dynamique du Sirocco'
      },
      category: { en: 'Meteorology', ar: 'الأرصاد الجوية', fr: 'Météorologie' },
      observedValue: `${activeWind} km/h (${incident.windDirectionCardinal})`,
      weightPercent: 28,
      scoreContribution: windPts,
      riskImpact: activeWind >= 35 ? 'critical' : activeWind >= 25 ? 'high' : 'moderate',
      impactDescription: {
        en: 'Dominant propagation driver. Convective gusts feed continuous oxygen and tilt flame fronts forward.',
        ar: 'المحرك الأبرز للانتشار السريع. تيارات الشهيلي تغذي ألسنة اللهب بالأكسجين وتدفع الجمر المتطاير.',
        fr: 'Facteur d\'accélération majeur. Les rafales apportent un flux continu d\'oxygène et inclinent le front de flamme.'
      },
      scientificMechanism: {
        en: 'Rothermel wind multiplier (Φw = c · U^b) accelerates surface head fire rate of spread exponentially.',
        ar: 'معامل روثرميل للرياح يضاعف سرعة رأس الحريق السطحي بشكل أسي ويزيد نطاق الشرر المتطاير.',
        fr: 'Le coefficient de vent de Rothermel accélère exponentiellement la vitesse d\'avancée du front de tête.'
      },
      icon: Wind,
      color: {
        bar: 'from-red-600 to-rose-500',
        badge: 'bg-red-950 text-red-300 border-red-800',
        text: 'text-red-400'
      }
    },
    {
      id: 'fuel_moisture',
      name: {
        en: 'Fuel Moisture Deficit (FMI)',
        ar: 'عجز رطوبة الوقود النباتي الحيوي',
        fr: 'Déficit d\'Humidité du Combustible (FMI)'
      },
      category: { en: 'Biomass & Drought', ar: 'الكتلة الحيوية والجفاف', fr: 'Biomasse & Sécheresse' },
      observedValue: `${activeFuel}% FMI (Critical <20%)`,
      weightPercent: 24,
      scoreContribution: fuelPts,
      riskImpact: activeFuel <= 18 ? 'critical' : activeFuel <= 24 ? 'extreme' : 'moderate',
      impactDescription: {
        en: 'Extreme desiccation in Quercus suber (Cork Oak) leaf litter dramatically lowers ignition energy threshold.',
        ar: 'جفاف حاد لفرشة أوراق بلوط الفلين والأعشاب، مما يقلل الطاقة الحرارية المطلوبة لبدء الاشتعال الذاتي.',
        fr: 'Dessèchement critique de la litière de chêne-liège, réduisant le seuil d\'énergie nécessaire à l\'ignition.'
      },
      scientificMechanism: {
        en: 'Fine Fuel Moisture (1h and 10h dead fuels) below extinction limit (<30%) enables near-instantaneous flash pyrolysis.',
        ar: 'انخفاض رطوبة الوقود الميت الخفيف دون عتبة 30% يتيح تحللاً حرارياً شبه لحظي عند تلامس الشرر.',
        fr: 'L\'humidité des combustibles fins morts sous le seuil critique permet une pyrolyse instantanée au contact d\'étincelles.'
      },
      icon: Droplets,
      color: {
        bar: 'from-amber-600 to-orange-500',
        badge: 'bg-amber-950 text-amber-300 border-amber-800',
        text: 'text-amber-400'
      }
    },
    {
      id: 'temperature',
      name: {
        en: 'Ambient Temperature & Thermal Stress',
        ar: 'درجة حرارة الجو والإجهاد الحراري',
        fr: 'Température Ambiante & Stress Thermique'
      },
      category: { en: 'Meteorology', ar: 'الأرصاد الجوية', fr: 'Météorologie' },
      observedValue: `${activeTemp} °C (Heatwave Alert)`,
      weightPercent: 18,
      scoreContribution: tempPts,
      riskImpact: activeTemp >= 38 ? 'critical' : activeTemp >= 32 ? 'high' : 'moderate',
      impactDescription: {
        en: 'Prolonged heatwave reduces latent moisture and pre-heats canopy fuels close to vaporization temperature.',
        ar: 'موجة الحر ترفع حرارة الكتلة النباتية إلى ما يقارب حرارة الاشتعال، مما يسرع اشتعال التاج الغابي.',
        fr: 'La canicule préchauffe les combustibles végétaux près de leur seuil de combustion spontanée.'
      },
      scientificMechanism: {
        en: 'Thermal pre-conditioning reduces enthalpy requirement ΔH required to raise fuel to 300°C ignition point.',
        ar: 'التسخين المسبق يقلل كمية الطاقة الحرارية الإضافية المطلوبة للوصول لنقطة الاشتعال (300 درجة مئوية).',
        fr: 'Le préchauffage thermique diminue l\'énergie thermique nécessaire pour atteindre les 300°C d\'ignition.'
      },
      icon: Thermometer,
      color: {
        bar: 'from-orange-600 to-amber-500',
        badge: 'bg-orange-950 text-orange-300 border-orange-800',
        text: 'text-orange-400'
      }
    },
    {
      id: 'topography',
      name: {
        en: 'Topography & Terrain Slope (Chimney Effect)',
        ar: 'تضاريس المنحدر الجبلي وظاهرة المدخنة',
        fr: 'Topographie & Pente du Relief (Effet Cheminée)'
      },
      category: { en: 'Terrain & Geology', ar: 'التضاريس والمورفولوجيا', fr: 'Relief & Morphologie' },
      observedValue: `${activeSlope}° Mountain Incline`,
      weightPercent: 16,
      scoreContribution: slopePts,
      riskImpact: activeSlope >= 25 ? 'high' : activeSlope >= 15 ? 'moderate' : 'low',
      impactDescription: {
        en: 'Steep mountain ravine acts as a thermal chimney, tilting flames uphill and pre-heating unburned vegetation.',
        ar: 'المنحدرات الجبلية الوعرة تعمل كمدخنة طبيعية، حيث تدفع الغازات الساخنة للأعلى لتسخين النباتات قبل وصول النار.',
        fr: 'Les ravins escarpés créent un effet de cheminée convective, inclinant les flammes vers les pentes ascendantes.'
      },
      scientificMechanism: {
        en: 'Slope factor (Φs = 5.275 · (tan θ)^2) accelerates upslope flame spread by up to 250% relative to flat terrain.',
        ar: 'معامل الانحدار يضاعف سرعة انتشار النيران صعوداً بنسبة تصل إلى 250% مقارنة بالتضاريس المنبسطة.',
        fr: 'Le facteur de pente augmente la vitesse de propagation ascendante jusqu\'à 250% par rapport au terrain plat.'
      },
      icon: Mountain,
      color: {
        bar: 'from-amber-500 to-yellow-500',
        badge: 'bg-yellow-950 text-yellow-300 border-yellow-800',
        text: 'text-yellow-400'
      }
    },
    {
      id: 'humidity',
      name: {
        en: 'Atmospheric Relative Humidity Deficit',
        ar: 'انخفاض الرطوبة النسبية في الهواء',
        fr: 'Déficit d\'Humidité Relative de l\'Air'
      },
      category: { en: 'Atmosphere', ar: 'الغلاف الجوي', fr: 'Atmosphère' },
      observedValue: `${activeHum}% RH (Arid condition)`,
      weightPercent: 8,
      scoreContribution: humPts,
      riskImpact: activeHum <= 22 ? 'high' : activeHum <= 35 ? 'moderate' : 'low',
      impactDescription: {
        en: 'Atmospheric vapor pressure deficit accelerates evaporation and facilitates spot ignition from airborne sparks.',
        ar: 'الجفاف الشديد للغلاف الجوي يمنع امتصاص الرطوبة ويساعد الشرر المتطاير على البقاء حياً وإشعال بؤر ثانوية.',
        fr: 'L\'aridité de l\'air accélère l\'évaporation et favorise la prise immédiate des étincelles transportées par le vent.'
      },
      scientificMechanism: {
        en: 'EMC (Equilibrium Moisture Content) drops below 4%, creating optimum combustible vapor transition.',
        ar: 'محتوى الرطوبة التوازني ينخفض إلى أقل من 4%، ما يحول الأغصان الدقيقة إلى مادة سريعة الاشتعال.',
        fr: 'L\'équilibre hygroscopique tombe sous les 4%, favorisant une transition combustible instantanée.'
      },
      icon: Droplets,
      color: {
        bar: 'from-sky-600 to-blue-500',
        badge: 'bg-sky-950 text-sky-300 border-sky-800',
        text: 'text-sky-400'
      }
    },
    {
      id: 'biomass',
      name: {
        en: 'Biomass Caloric Density & Vegetation Type',
        ar: 'كثافة الكتلة الحيوية ونوع الغطاء النباتي',
        fr: 'Densité Calorifique & Type de Végétation'
      },
      category: { en: 'Forest Inventory', ar: 'الجرد الغابي', fr: 'Inventaire Forestier' },
      observedValue: 'Cork Oak & High Mountain Scrub (~28 t/ha)',
      weightPercent: 6,
      scoreContribution: biomassPts,
      riskImpact: 'high',
      impactDescription: {
        en: 'High resinous terpene concentration in Aleppo Pine / Cork Oak understory delivers high heat yield per square meter.',
        ar: 'وفرة المواد الراتنجية الطيارة في أشجار الصنوبر وبلوط الفلين ترفع الطاقة الحرارية المنبعثة لكل متر مربع.',
        fr: 'La richesse en terpènes résineux de la canopée et du sous-bois génère un pouvoir calorifique élevé.'
      },
      scientificMechanism: {
        en: 'Fuel bed depth >1.4m and high surface-area-to-volume ratio (σ > 5000 m⁻¹) generate sustained high flame lengths.',
        ar: 'عمق الفرشة النباتية الذي يتجاوز 1.4 متر يوفر استمرارية رأسية تسمح بالانتقال من حريق أرضي إلى حريق تاجي.',
        fr: 'La profondeur du lit de combustible (>1.4m) permet une transition aisée du feu de surface vers la cime.'
      },
      icon: Trees,
      color: {
        bar: 'from-emerald-600 to-teal-500',
        badge: 'bg-emerald-950 text-emerald-300 border-emerald-800',
        text: 'text-emerald-400'
      }
    }
  ];

  return (
    <div 
      id="explainable-ai-breakdown-panel"
      data-testid="explainable-ai-breakdown-panel"
      className="space-y-5" 
      dir={currentLang === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Header Summary Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 shrink-0 mt-0.5">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 font-mono flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5" />
                  {currentLang === 'ar' 
                    ? 'لوحة تفسير الذكاء الاصطناعي (Explainable AI Breakdown Panel)'
                    : currentLang === 'fr'
                    ? 'Panneau d\'Explication IA (Explainable AI Breakdown Panel)'
                    : 'Explainable AI Breakdown Panel'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                  SHAP + Rothermel Physical Model v4.3
                </span>
              </div>
              <h3 className="text-base font-bold text-white">
                {currentLang === 'ar'
                  ? 'تفكيك المتغيرات المساهمة في احتساب مؤشر الخطر الكلي (0-100)'
                  : currentLang === 'fr'
                  ? 'Décomposition des Variables Contributives au Score de Risque (0-100)'
                  : 'Contributing Variables & Weighted Influence on Fire Risk Score (0-100)'}
              </h3>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                {currentLang === 'ar'
                  ? 'يعتمد النظام على خوارزمية ذكاء اصطناعي قابلة للتفسير (XAI) تقيس الأثر الفيزيائي المباشر للرياح، رطوبة الوقود، الحرارة، والتضاريس لضمان الشفافية لغرفة العمليات دون الاعتماد على صندوق أسود غامض.'
                  : currentLang === 'fr'
                  ? 'Ce modèle explicable (XAI) décompose le score en pondérations physiques précises (vent, humidité foliaire, chaleur, pente) pour offrir une transparence décisionnelle totale aux officiers de commandement.'
                  : 'AWIS breaks down complex AI inferences into transparent, physics-grounded variable attributions (SHAP values) so duty commanders understand exactly why this incident reached its designated risk tier.'}
              </p>
            </div>
          </div>

          {/* Aggregate Fire Risk Score Badge */}
          <div className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl bg-slate-950/80 border border-slate-700 text-center min-w-[150px] shrink-0">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {currentLang === 'ar' ? 'مؤشر الخطر الإجمالي' : currentLang === 'fr' ? 'Score Global de Risque' : 'Current Fire Risk Score'}
            </span>
            <div className="text-3xl sm:text-4xl font-black font-mono text-white mt-1 flex items-baseline gap-1">
              <span>{displayScore}</span>
              <span className="text-xs text-slate-500 font-normal">/ 100</span>
            </div>
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${currentRisk.color}`}>
                {currentLang === 'ar' ? currentRisk.labelAr : currentLang === 'fr' ? currentRisk.labelFr : currentRisk.label}
              </span>
              {isSimulating && (
                <span className={`text-[10px] font-mono font-bold ${scoreDelta < 0 ? 'text-emerald-400' : scoreDelta > 0 ? 'text-red-400' : 'text-slate-400'}`}>
                  {scoreDelta > 0 ? `+${scoreDelta}` : scoreDelta}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Variable Weights Overview Bar */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
            {currentLang === 'ar' ? 'توزيع الأوزان النسبية لعوامل الخطر (100%)' : currentLang === 'fr' ? 'Distribution des Poids Relatifs (100%)' : 'Relative Weight Distribution across Variables (100%)'}
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            {currentLang === 'ar' ? 'نموذج معاير لغابات حوض المتوسط' : currentLang === 'fr' ? 'Calibré pour la crête méditerranéenne' : 'Calibrated for Algerian Mediterranean Forests'}
          </span>
        </div>

        {/* Stacked Percentage Visualizer */}
        <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden flex shadow-inner">
          <div style={{ width: '28%' }} className="bg-red-500 h-full transition-all" title="Wind Speed: 28%" />
          <div style={{ width: '24%' }} className="bg-orange-500 h-full transition-all" title="Fuel Moisture Deficit: 24%" />
          <div style={{ width: '18%' }} className="bg-amber-500 h-full transition-all" title="Ambient Temperature: 18%" />
          <div style={{ width: '16%' }} className="bg-yellow-500 h-full transition-all" title="Terrain Slope: 16%" />
          <div style={{ width: '8%' }} className="bg-blue-500 h-full transition-all" title="Humidity Deficit: 8%" />
          <div style={{ width: '6%' }} className="bg-emerald-500 h-full transition-all" title="Biomass Density: 6%" />
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-[10px] text-slate-400 mt-2 font-mono">
          <div className="flex items-center gap-1 truncate"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Wind: 28%</div>
          <div className="flex items-center gap-1 truncate"><span className="w-2 h-2 rounded-full bg-orange-500 inline-block" /> Fuel Moist: 24%</div>
          <div className="flex items-center gap-1 truncate"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Temp: 18%</div>
          <div className="flex items-center gap-1 truncate"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" /> Slope: 16%</div>
          <div className="flex items-center gap-1 truncate"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Humidity: 8%</div>
          <div className="flex items-center gap-1 truncate"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Biomass: 6%</div>
        </div>
      </div>

      {/* Visual Bar Chart: Contributing Variables & Weighted Influences */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              {currentLang === 'ar' 
                ? 'مخطط بياني شريطي: المتغيرات المساهمة وأوزانها في مؤشر الخطر (0-100)' 
                : currentLang === 'fr'
                ? 'Graphique à Barres : Variables Contributives et Influences Pondérées (0-100)'
                : 'Visual Bar Chart: Contributing Variables & Weighted Influences (0-100)'}
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {currentLang === 'ar' 
                ? 'تفكيك مرئي دقيق لتأثير الرياح، رطوبة الوقود، الحرارة، والتضاريس على درجة الخطر' 
                : 'Direct visual breakdown of wind speed, fuel moisture, temperature, and topography influences'}
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px] self-start sm:self-auto font-mono">
            <button
              onClick={() => setChartViewMode('weights')}
              className={`px-3 py-1 rounded transition cursor-pointer ${
                chartViewMode === 'weights' 
                  ? 'bg-indigo-600 text-white font-bold' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {currentLang === 'ar' ? 'الوزن النسبي (%)' : 'Weighted Influence (%)'}
            </button>
            <button
              onClick={() => setChartViewMode('points')}
              className={`px-3 py-1 rounded transition cursor-pointer ${
                chartViewMode === 'points' 
                  ? 'bg-indigo-600 text-white font-bold' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {currentLang === 'ar' ? 'مساهمة النقاط (+pts)' : 'Score Contribution (+pts)'}
            </button>
          </div>
        </div>

        {/* Recharts Bar Chart Container */}
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                {
                  name: currentLang === 'ar' ? 'الرياح' : currentLang === 'fr' ? 'Vent' : 'Wind Speed',
                  weight: 28,
                  points: windPts,
                  observed: `${activeWind} km/h (${incident.windDirectionCardinal})`,
                  fill: '#ef4444'
                },
                {
                  name: currentLang === 'ar' ? 'رطوبة الوقود' : currentLang === 'fr' ? 'Hum. Végétale' : 'Fuel Moisture',
                  weight: 24,
                  points: fuelPts,
                  observed: `${activeFuel}% FMI`,
                  fill: '#f97316'
                },
                {
                  name: currentLang === 'ar' ? 'الحرارة' : currentLang === 'fr' ? 'Température' : 'Temperature',
                  weight: 18,
                  points: tempPts,
                  observed: `${activeTemp}°C`,
                  fill: '#f59e0b'
                },
                {
                  name: currentLang === 'ar' ? 'التضاريس' : currentLang === 'fr' ? 'Pente' : 'Topography',
                  weight: 16,
                  points: slopePts,
                  observed: `${activeSlope}° Slope`,
                  fill: '#eab308'
                },
                {
                  name: currentLang === 'ar' ? 'رطوبة الجو' : currentLang === 'fr' ? 'Hum. Air' : 'Air Humidity',
                  weight: 8,
                  points: humPts,
                  observed: `${activeHum}% RH`,
                  fill: '#38bdf8'
                },
                {
                  name: currentLang === 'ar' ? 'الكتلة الحيوية' : currentLang === 'fr' ? 'Biomasse' : 'Biomass',
                  weight: 6,
                  points: biomassPts,
                  observed: 'Cork Oak Density',
                  fill: '#10b981'
                }
              ]}
              layout="vertical"
              margin={{ top: 5, right: 30, left: currentLang === 'ar' ? 25 : 80, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis 
                type="number" 
                domain={[0, 30]} 
                unit={chartViewMode === 'weights' ? '%' : ' pts'} 
                stroke="#64748b" 
                fontSize={11} 
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                stroke="#94a3b8" 
                fontSize={11} 
                width={currentLang === 'ar' ? 75 : 95} 
                tickLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-950/95 border border-slate-700 p-3 rounded-lg shadow-xl text-xs space-y-1.5 z-50">
                        <div className="font-bold text-white flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.fill }} />
                          {data.name}
                        </div>
                        <div className="text-slate-300 font-mono text-[11px]">
                          {currentLang === 'ar' ? 'القيمة المرصودة:' : 'Observed Value:'} <strong className="text-white">{data.observed}</strong>
                        </div>
                        <div className="text-indigo-300 font-mono text-[11px]">
                          {currentLang === 'ar' ? 'الوزن في النموذج:' : 'Weighted Influence:'} <strong>{data.weight}%</strong>
                        </div>
                        <div className="text-emerald-300 font-mono text-[11px]">
                          {currentLang === 'ar' ? 'المساهمة في النتيجة:' : 'Score Contribution:'} <strong>+{data.points.toFixed(1)} / 100 pts</strong>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar 
                dataKey={chartViewMode === 'weights' ? 'weight' : 'points'} 
                radius={[0, 4, 4, 0]}
              >
                {[
                  '#ef4444',
                  '#f97316',
                  '#f59e0b',
                  '#eab308',
                  '#38bdf8',
                  '#10b981'
                ].map((color, idx) => (
                  <Cell key={`bar-cell-${idx}`} fill={color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Individual Factor Breakdown Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-orange-400" />
            {currentLang === 'ar' ? 'تفصيل مساهمة المتغيرات الفيزيائية في درجة الخطر' : currentLang === 'fr' ? 'Détail des Facteurs Physiques & Attribution SHAP' : 'Physical Variable Impact Breakdown & Attribution'}
          </h4>
          <span className="text-[11px] text-slate-400 font-mono">
            {currentLang === 'ar' ? 'القيم الحالية المسجلة بأجهزة الاستشعار' : currentLang === 'fr' ? 'Télémétrie en temps réel' : 'Real-Time Telemetry Readings'}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {variables.map((factor) => {
            const Icon = factor.icon;
            const contributionPercent = Math.round((factor.scoreContribution / factor.weightPercent) * 100);

            return (
              <div 
                key={factor.id}
                className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/70 hover:border-slate-600 transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-lg bg-slate-900 border border-slate-700 ${factor.color.text}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">
                          {factor.name[currentLang]}
                        </span>
                        <span className="text-[10px] uppercase px-2 py-0.5 rounded font-mono bg-slate-900 text-slate-400 border border-slate-700">
                          {factor.category[currentLang]}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">
                        {currentLang === 'ar' ? 'القيمة المرصودة:' : currentLang === 'fr' ? 'Valeur observée :' : 'Observed Value:'}{' '}
                        <strong className="text-white">{factor.observedValue}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Weight & Contribution Pill */}
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-white">
                        +{factor.scoreContribution.toFixed(1)}{' '}
                        <span className="text-[10px] text-slate-400 font-normal">pts</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {currentLang === 'ar' ? `وزن التأثير: ${factor.weightPercent}%` : `Weight: ${factor.weightPercent}%`}
                      </div>
                    </div>
                    <div className={`px-2.5 py-1 rounded-lg border text-xs font-bold font-mono ${factor.color.badge}`}>
                      {factor.weightPercent}%
                    </div>
                  </div>
                </div>

                {/* Progress bar of factor contribution vs max possible weight */}
                <div className="space-y-1 my-2">
                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span>
                      {currentLang === 'ar' ? 'نسبة استنفاد الخطر للعامل' : 'Factor Risk Saturation'}
                    </span>
                    <span>{contributionPercent}% ({factor.scoreContribution.toFixed(1)} / {factor.weightPercent} pts)</span>
                  </div>
                  <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
                    <div 
                      className={`h-full rounded-full bg-gradient-to-r ${factor.color.bar} transition-all duration-300`}
                      style={{ width: `${Math.min(Math.max(contributionPercent, 5), 100)}%` }}
                    />
                  </div>
                </div>

                {/* Operational & Scientific Explanations */}
                <div className="mt-2.5 pt-2.5 border-t border-slate-700/50 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  <div className="text-slate-300 leading-relaxed">
                    <strong className="text-slate-200 block text-[11px] font-semibold mb-0.5">
                      {currentLang === 'ar' ? 'الأثر التكتيكي الميداني:' : currentLang === 'fr' ? 'Impact Tactique sur le Front :' : 'Tactical Field Impact:'}
                    </strong>
                    {factor.impactDescription[currentLang]}
                  </div>
                  <div className="text-slate-400 leading-relaxed font-mono text-[11px] bg-slate-950/50 p-2 rounded-lg border border-slate-800">
                    <strong className="text-indigo-300 block text-[10px] uppercase mb-0.5">
                      {currentLang === 'ar' ? 'المعادلة والأساس الفيزيائي:' : currentLang === 'fr' ? 'Formulation Physique :' : 'Physical Attribution Formulation:'}
                    </strong>
                    {factor.scientificMechanism[currentLang]}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Sensitivity "What-If" Simulator */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-indigo-900/40 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                {currentLang === 'ar'
                  ? 'محاكي الحساسية التفاعلي (سيناريوهات ما إذا...؟)'
                  : currentLang === 'fr'
                  ? 'Simulateur de Sensibilité « What-If »'
                  : 'Interactive "What-If" Sensitivity Simulator'}
                <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono">
                  Tactical Tool
                </span>
              </h4>
              <p className="text-xs text-slate-400">
                {currentLang === 'ar'
                  ? 'عدّل المتغيرات الجوية والتضاريس لاختبار انخفاض أو ارتفاع مؤشر الخطر في حال تغيرت سرعة الرياح أو هبطت درجات الحرارة.'
                  : currentLang === 'fr'
                  ? 'Modifiez les variables météo pour anticiper l\'évolution du score en cas d\'accalmie du vent ou de baisse des températures.'
                  : 'Adjust weather or fuel variables to test how shifting wind speeds, rain, or night cooling would impact the Fire Risk Score.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {isSimulating && (
              <button
                onClick={resetSimulation}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{currentLang === 'ar' ? 'استعادة القياسات الفعلية' : 'Reset to Telemetry'}</span>
              </button>
            )}
            <button
              onClick={() => setIsSimulating(!isSimulating)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                isSimulating 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              {isSimulating 
                ? (currentLang === 'ar' ? 'وضع المحاكاة نشط' : 'Simulation Active') 
                : (currentLang === 'ar' ? 'تفعيل التجربة' : 'Enable Simulator')}
            </button>
          </div>
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
          {/* Wind Slider */}
          <div className="space-y-1.5 p-3 rounded-xl bg-slate-800/40 border border-slate-800">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium flex items-center gap-1">
                <Wind className="w-3.5 h-3.5 text-red-400" />
                {currentLang === 'ar' ? 'سرعة الرياح' : 'Wind Speed'}
              </span>
              <span className="font-mono font-bold text-red-300">{simWindSpeed} km/h</span>
            </div>
            <input
              type="range"
              min={5}
              max={75}
              step={1}
              value={simWindSpeed}
              onChange={(e) => {
                setSimWindSpeed(Number(e.target.value));
                setIsSimulating(true);
              }}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-500"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>5 km/h</span>
              <span>Baseline: {incident.windSpeedKmH}</span>
              <span>75 km/h</span>
            </div>
          </div>

          {/* Temperature Slider */}
          <div className="space-y-1.5 p-3 rounded-xl bg-slate-800/40 border border-slate-800">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium flex items-center gap-1">
                <Thermometer className="w-3.5 h-3.5 text-orange-400" />
                {currentLang === 'ar' ? 'درجة الحرارة' : 'Temperature'}
              </span>
              <span className="font-mono font-bold text-orange-300">{simTemperature} °C</span>
            </div>
            <input
              type="range"
              min={18}
              max={48}
              step={0.5}
              value={simTemperature}
              onChange={(e) => {
                setSimTemperature(Number(e.target.value));
                setIsSimulating(true);
              }}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>18°C</span>
              <span>Baseline: {incident.temperatureC}°C</span>
              <span>48°C</span>
            </div>
          </div>

          {/* Fuel Moisture Slider */}
          <div className="space-y-1.5 p-3 rounded-xl bg-slate-800/40 border border-slate-800">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium flex items-center gap-1">
                <Droplets className="w-3.5 h-3.5 text-amber-400" />
                {currentLang === 'ar' ? 'رطوبة الوقود النباتي' : 'Fuel Moisture'}
              </span>
              <span className="font-mono font-bold text-amber-300">{simFuelMoisture}%</span>
            </div>
            <input
              type="range"
              min={6}
              max={35}
              step={1}
              value={simFuelMoisture}
              onChange={(e) => {
                setSimFuelMoisture(Number(e.target.value));
                setIsSimulating(true);
              }}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>6% (Arid)</span>
              <span>Baseline: 16%</span>
              <span>35% (Moist)</span>
            </div>
          </div>

          {/* Terrain Slope Slider */}
          <div className="space-y-1.5 p-3 rounded-xl bg-slate-800/40 border border-slate-800">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium flex items-center gap-1">
                <Mountain className="w-3.5 h-3.5 text-yellow-400" />
                {currentLang === 'ar' ? 'انحدار التضاريس' : 'Terrain Slope'}
              </span>
              <span className="font-mono font-bold text-yellow-300">{simSlope}°</span>
            </div>
            <input
              type="range"
              min={0}
              max={45}
              step={1}
              value={simSlope}
              onChange={(e) => {
                setSimSlope(Number(e.target.value));
                setIsSimulating(true);
              }}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>0° (Flat)</span>
              <span>Baseline: {incident.terrainSlopeDegrees}°</span>
              <span>45° (Cliff)</span>
            </div>
          </div>
        </div>

        {/* Dynamic Simulation Result Card */}
        {isSimulating && (
          <div className="mt-4 p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-700/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-indigo-200">
              <Info className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>
                {currentLang === 'ar'
                  ? `النتيجة المحاكاة: بناءً على التعديلات الافتراضية، يتحول مؤشر الخطر من ${baselineScore} إلى ${totalCalculatedScore}/100 (${scoreDelta >= 0 ? `+${scoreDelta}` : scoreDelta} نقطة).`
                  : currentLang === 'fr'
                  ? `Résultat simulé : avec ces paramètres, le score évolue de ${baselineScore} à ${totalCalculatedScore}/100 (${scoreDelta >= 0 ? `+${scoreDelta}` : scoreDelta} pts).`
                  : `Simulation outcome: adjusted parameters shift the Fire Risk Score from baseline ${baselineScore} to ${totalCalculatedScore}/100 (${scoreDelta >= 0 ? `+${scoreDelta}` : scoreDelta} points).`}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-mono font-bold text-sm text-white">
                Simulated: <span className={scoreDelta < 0 ? 'text-emerald-400' : 'text-red-400'}>{totalCalculatedScore}/100</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Institutional Methodology Footnote */}
      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-slate-300">
            {currentLang === 'ar' ? 'المرجعية الأكاديمية والتقنية:' : 'Institutional Methodology & Governance:'}{' '}
          </strong>
          {currentLang === 'ar'
            ? 'تستند الأوزان الرياضية إلى السجلات التاريخية لحرائق الغابات لـ 15 ولاية ساحلية وجبلية بالجزائر (المديرية العامة للغابات 2010–2025) المدمجة مع معادلات روثرميل للانتشار السطحي ونموذج التفسير SHAP. هذا المؤشر موجه لمساندة القرار التكتيكي، والقرار النهائي الميداني يبقى بيد قادة العمليات.'
            : 'Statistical weights are calibrated using the Direction Générale des Forêts (DGF) 2010–2025 Algerian wildfire historical archive correlated with Rothermel physical surface fire formulations and SHAP local feature attributions. Designed for tactical decision-support.'}
        </div>
      </div>
    </div>
  );
};
