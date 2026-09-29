// AWIS — ALSAT Dual-Period Multispectral NDVI Split Screen Slider
// High-performance comparative analysis for Mila Sector & Northern Algeria Tell Atlas forests

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Split, 
  Calendar, 
  Satellite, 
  TrendingDown, 
  TrendingUp, 
  Droplets, 
  Layers, 
  Info, 
  Sparkles, 
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Maximize2,
  Eye,
  Sliders,
  Trees
} from 'lucide-react';
import { AlsatSatelliteId, Language } from '../../types';

export interface NdviComparePeriod {
  id: string;
  labelEn: string;
  labelAr: string;
  dateStrEn: string;
  dateStrAr: string;
  satelliteId: AlsatSatelliteId;
  resolutionM: number;
  cloudCoverPercent: number;
  meanNdvi: number;
  minNdvi: number;
  maxNdvi: number;
  droughtLevelEn: string;
  droughtLevelAr: string;
  sectorNameEn: string;
  sectorNameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  visualTheme: 'healthy' | 'stressed' | 'severe';
}

export const PRESET_NDVI_PERIODS: NdviComparePeriod[] = [
  {
    id: 'mila-2025-jul',
    labelEn: 'Summer 2025 Baseline (Lush Biomass)',
    labelAr: 'صيف 2025 المرجعي (كتلة حيوية رطبة)',
    dateStrEn: '15 July 2025',
    dateStrAr: '15 جويلية 2025',
    satelliteId: 'ALSAT-2A',
    resolutionM: 2.5,
    cloudCoverPercent: 1.2,
    meanNdvi: 0.58,
    minNdvi: 0.14,
    maxNdvi: 0.84,
    droughtLevelEn: 'Normal / Healthy Biomass',
    droughtLevelAr: 'طبيعي / رطوبة حيوية ممتازة',
    sectorNameEn: 'Mila Sector & Beni Haroun Forest',
    sectorNameAr: 'قطاع ميلة وغابات سد بني هارون',
    descriptionEn: 'High chlorophyll reflectance and healthy soil moisture prior to seasonal drought wave.',
    descriptionAr: 'انعكاس كلوروفيلي ممتاز ومستوى رطوبة تربة مرتفع قبيل موجة الجفاف الصيفية.',
    visualTheme: 'healthy'
  },
  {
    id: 'mila-2026-may',
    labelEn: 'Spring 2026 Peak Bloom',
    labelAr: 'ربيع 2026 ذروة الازدهار النباتي',
    dateStrEn: '18 May 2026',
    dateStrAr: '18 ماي 2026',
    satelliteId: 'ALSAT-1B',
    resolutionM: 12,
    cloudCoverPercent: 2.8,
    meanNdvi: 0.65,
    minNdvi: 0.19,
    maxNdvi: 0.89,
    droughtLevelEn: 'Peak Lush Biomass',
    droughtLevelAr: 'ذروة الكثافة الخضراء',
    sectorNameEn: 'Mila & Tell Atlas Mountain Rim',
    sectorNameAr: 'ميلة والشريط الجبلي للأطلس التلي',
    descriptionEn: 'Optimal spring agricultural foliage and deep water reservoir recharge in Beni Haroun.',
    descriptionAr: 'أقصى كثافة ورقية ربيعية وتغذية مائية عالية لحوض سد بني هارون.',
    visualTheme: 'healthy'
  },
  {
    id: 'mila-2026-aug',
    labelEn: 'Late Summer 2026 (Severe Drought Wave)',
    labelAr: 'أواخر صيف 2026 (موجة جفاف حرجة)',
    dateStrEn: '20 August 2026',
    dateStrAr: '20 أوت 2026',
    satelliteId: 'ALSAT-1B',
    resolutionM: 12,
    cloudCoverPercent: 0.8,
    meanNdvi: 0.40,
    minNdvi: 0.08,
    maxNdvi: 0.68,
    droughtLevelEn: 'Severe Moisture Stress (-31%)',
    droughtLevelAr: 'إجهاد مائي حاد (-31%)',
    sectorNameEn: 'Mila Sector & Beni Haroun Basin',
    sectorNameAr: 'قطاع ميلة وحوض بني هارون',
    descriptionEn: 'Significant foliage moisture depletion, brown senescence, and heightened wildfire ignition risk.',
    descriptionAr: 'انخفاض حاد في رطوبة الأوراق وجفاف الأعشاب الحولية وتصاعد احتمالية اشتعال الحرائق.',
    visualTheme: 'severe'
  },
  {
    id: 'mila-2026-sep',
    labelEn: 'Current Telemetry (Tell Atlas High Risk)',
    labelAr: 'الرصد الحالي (مخاطر حرائق الأطلس التلي)',
    dateStrEn: '28 September 2026',
    dateStrAr: '28 سبتمبر 2026',
    satelliteId: 'ALSAT-2A',
    resolutionM: 2.5,
    cloudCoverPercent: 0.4,
    meanNdvi: 0.44,
    minNdvi: 0.11,
    maxNdvi: 0.72,
    droughtLevelEn: 'Moderate Stress / Fire Risk',
    droughtLevelAr: 'إجهاد مائي متوسط / قابل للاشتعال',
    sectorNameEn: 'Tell Atlas Northern Band',
    sectorNameAr: 'الشريط الشمالي للأطلس التلي',
    descriptionEn: 'Dry summer conditions with localized dry biomass fuel loading over 18 tons/hectare.',
    descriptionAr: 'ظروف حرارية جافة مع تراكم وقود نباتي جاف يتجاوز 18 طن/هكتار في السفوح المعرضة للرياح.',
    visualTheme: 'stressed'
  }
];

export interface NdviSplitSliderProps {
  currentLang?: Language;
  className?: string;
  onCenterOnMap?: (lat: number, lng: number) => void;
}

export const NdviSplitSlider: React.FC<NdviSplitSliderProps> = ({
  currentLang = 'ar',
  className = '',
  onCenterOnMap
}) => {
  const isAr = currentLang === 'ar';

  // State: Selected Periods for Left (Before) and Right (After)
  const [beforePeriodId, setBeforePeriodId] = useState<string>('mila-2025-jul');
  const [afterPeriodId, setAfterPeriodId] = useState<string>('mila-2026-aug');

  // Split Divider Position in percentage (0 to 100), default 50%
  const [sliderPosition, setSliderPosition] = useState<number>(50);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [colorMode, setColorMode] = useState<'ndvi' | 'false_color'>('ndvi');

  const containerRef = useRef<HTMLDivElement | null>(null);

  const beforePeriod = PRESET_NDVI_PERIODS.find((p) => p.id === beforePeriodId) || PRESET_NDVI_PERIODS[0];
  const afterPeriod = PRESET_NDVI_PERIODS.find((p) => p.id === afterPeriodId) || PRESET_NDVI_PERIODS[2];

  // Calculate Delta NDVI: ((After - Before) / Before) * 100
  const deltaPercent = Math.round(
    ((afterPeriod.meanNdvi - beforePeriod.meanNdvi) / beforePeriod.meanNdvi) * 100
  );
  const absoluteDiff = Number((afterPeriod.meanNdvi - beforePeriod.meanNdvi).toFixed(2));
  const isVegetationDrop = deltaPercent < 0;

  // Handle pointer down on slider divider
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  // Compute slider percentage from clientX
  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = Math.max(5, Math.min(95, (x / rect.width) * 100));
    setSliderPosition(Number(percent.toFixed(1)));
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    updatePosition(e.clientX);
  }, [isDragging, updatePosition]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // fallback
    }
  }, []);

  // Global window listeners for resilient dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleWindowMove = (e: PointerEvent) => {
      updatePosition(e.clientX);
    };

    const handleWindowUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('pointermove', handleWindowMove);
    window.addEventListener('pointerup', handleWindowUp);

    return () => {
      window.removeEventListener('pointermove', handleWindowMove);
      window.removeEventListener('pointerup', handleWindowUp);
    };
  }, [isDragging, updatePosition]);

  return (
    <div 
      className={`w-full bg-slate-950/95 border border-emerald-500/40 rounded-2xl p-3 sm:p-4 shadow-2xl backdrop-blur-2xl font-sans text-slate-200 pointer-events-auto touch-pan-y overscroll-contain transition-all ${className}`}
    >
      {/* Top Header & Context */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 mb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0 shadow-lg">
            <Split className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-white">
                {isAr ? 'المقارنة الزمنية لمؤشر NDVI (Split Slider)' : 'Time-Series NDVI Split Comparison'}
              </h3>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/50 font-bold">
                ASAL • Dual Pass
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              {isAr ? 'تحليل تغير الكتلة الحيوية ورصد بؤر الإجهاد المائي لقطاع ميلة' : 'Biomass change & moisture stress analysis for Mila sector'}
            </p>
          </div>
        </div>

        {/* Color Palette Switcher & Reset Button */}
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs font-mono">
            <button
              onClick={() => setColorMode('ndvi')}
              className={`px-2 py-1 rounded text-[10px] font-bold transition cursor-pointer ${
                colorMode === 'ndvi' 
                  ? 'bg-emerald-600 text-white shadow' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {isAr ? 'مؤشر NDVI' : 'NDVI Heatmap'}
            </button>
            <button
              onClick={() => setColorMode('false_color')}
              className={`px-2 py-1 rounded text-[10px] font-bold transition cursor-pointer ${
                colorMode === 'false_color' 
                  ? 'bg-cyan-700 text-white shadow' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {isAr ? 'طيف كاذب (NIR/Red)' : 'False-Color NIR'}
            </button>
          </div>

          <button
            onClick={() => setSliderPosition(50)}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition cursor-pointer text-xs"
            title={isAr ? 'إعادة توسيط الشريط عند 50%' : 'Reset Split at 50%'}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* DUAL SELECTOR OVERLAY CONTROL BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3">
        {/* Left Side: Before / Previous Period */}
        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-bold text-emerald-400 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isAr ? 'الطرف الأيسر (الفترة السابقة - Before)' : 'Left: Previous Baseline (Before)'}</span>
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
              {beforePeriod.satelliteId} • {beforePeriod.resolutionM}m
            </span>
          </div>

          <select
            value={beforePeriodId}
            onChange={(e) => setBeforePeriodId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none cursor-pointer"
          >
            {PRESET_NDVI_PERIODS.map((period) => (
              <option key={period.id} value={period.id} disabled={period.id === afterPeriodId}>
                {isAr ? period.dateStrAr : period.dateStrEn} — {period.satelliteId} ({isAr ? period.labelAr : period.labelEn})
              </option>
            ))}
          </select>
        </div>

        {/* Right Side: After / Target Period */}
        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-bold text-amber-400 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>{isAr ? 'الطرف الأيمن (الفترة الحالية - After)' : 'Right: Target Period (After)'}</span>
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
              {afterPeriod.satelliteId} • {afterPeriod.resolutionM}m
            </span>
          </div>

          <select
            value={afterPeriodId}
            onChange={(e) => setAfterPeriodId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:border-amber-500 focus:outline-none cursor-pointer"
          >
            {PRESET_NDVI_PERIODS.map((period) => (
              <option key={period.id} value={period.id} disabled={period.id === beforePeriodId}>
                {isAr ? period.dateStrAr : period.dateStrEn} — {period.satelliteId} ({isAr ? period.labelAr : period.labelEn})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* DYNAMIC SPECTRAL DIFFERENCE INDICATOR (Δ NDVI Tactical Badge) */}
      <div className="flex items-center justify-between flex-wrap gap-2 px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-800 mb-3 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">{isAr ? 'الفارق الطيفي:' : 'Spectral Shift:'}</span>
          {isVegetationDrop ? (
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/50 font-bold animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.3)]">
              <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
              <span>{deltaPercent}% {isAr ? 'إجهاد مائي/جفاف' : 'Moisture Stress Drop'}</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 font-bold shadow-[0_0_12px_rgba(16,185,129,0.3)]">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>+{Math.abs(deltaPercent)}% {isAr ? 'نمو الكتلة الحيوية' : 'Biomass Expansion'}</span>
            </span>
          )}
          <span className="text-slate-500 text-[10px]">
            (Δ {absoluteDiff > 0 ? `+${absoluteDiff}` : absoluteDiff} NDVI)
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-300">
          <span>{isAr ? 'قبل:' : 'Before:'} <strong className="text-emerald-400">{beforePeriod.meanNdvi.toFixed(2)}</strong></span>
          <span className="text-slate-600">→</span>
          <span>{isAr ? 'بعد:' : 'After:'} <strong className={isVegetationDrop ? 'text-rose-400' : 'text-emerald-400'}>{afterPeriod.meanNdvi.toFixed(2)}</strong></span>
        </div>
      </div>

      {/* INTERACTIVE SPLIT CANVAS VIEWER */}
      <div 
        ref={containerRef}
        id="ndvi-split-slider-container"
        className="relative w-full h-[320px] sm:h-[420px] rounded-2xl overflow-hidden border border-emerald-500/40 select-none bg-slate-950 shadow-inner group"
        onPointerMove={handlePointerMove}
        style={{ touchAction: 'pan-y' }}
      >
        {/* ========================================================================= */}
        {/* LAYER 1: BEFORE IMAGERY (Left / Base Layer)                              */}
        {/* ========================================================================= */}
        <div className="absolute inset-0 w-full h-full pointer-events-none">
          <svg className="w-full h-full" viewBox="0 0 600 400" preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id="before-water" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#082f49" />
                <stop offset="100%" stopColor="#0369a1" />
              </linearGradient>
              <linearGradient id="before-forest-dense" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#065f46" />
                <stop offset="50%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#047857" />
              </linearGradient>
              <linearGradient id="before-agri-parcels" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="50%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
            </defs>

            {/* Terrain Background */}
            <rect width="600" height="400" fill="#0f172a" />

            {/* Simulated Mila Beni Haroun Dam Reservoir */}
            <path
              d="M 120 40 Q 220 90 280 180 T 420 280 T 540 360 L 580 400 L 80 400 Z"
              fill="url(#before-water)"
              opacity="0.85"
            />

            {/* Forest Zones - Lush & Dense in Baseline */}
            <circle cx="180" cy="140" r="90" fill="url(#before-forest-dense)" opacity={colorMode === 'ndvi' ? '0.75' : '0.85'} />
            <circle cx="340" cy="110" r="110" fill="url(#before-forest-dense)" opacity={colorMode === 'ndvi' ? '0.8' : '0.9'} />
            <circle cx="480" cy="210" r="95" fill="url(#before-forest-dense)" opacity={colorMode === 'ndvi' ? '0.7' : '0.8'} />

            {/* Agricultural parcels around Mila (Healthy Green in Before) */}
            <rect x="60" y="80" width="70" height="60" rx="6" fill="url(#before-agri-parcels)" opacity="0.7" />
            <rect x="140" y="240" width="90" height="70" rx="8" fill="url(#before-agri-parcels)" opacity="0.75" />
            <rect x="360" y="220" width="100" height="80" rx="8" fill="url(#before-agri-parcels)" opacity="0.65" />

            {/* Contour & Grid Lines */}
            <path d="M 0 100 Q 300 80 600 120" stroke="#334155" strokeWidth="0.8" fill="none" opacity="0.4" />
            <path d="M 0 200 Q 300 190 600 220" stroke="#334155" strokeWidth="0.8" fill="none" opacity="0.4" />
            <path d="M 0 300 Q 300 310 600 300" stroke="#334155" strokeWidth="0.8" fill="none" opacity="0.4" />

            {/* Landmark Label */}
            <text x="30" y="40" fill="#34d399" fontSize="13" fontWeight="bold" fontFamily="monospace">
              📍 {isAr ? 'قطاع ميلة وسد بني هارون' : 'Mila Sector & Beni Haroun Basin'}
            </text>
            <text x="30" y="60" fill="#94a3b8" fontSize="10" fontFamily="monospace">
              NDVI: ~0.58 • {beforePeriod.dateStrAr}
            </text>
          </svg>

          {/* Left Watermark Stamp */}
          <div className="absolute bottom-4 left-4 z-10 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-emerald-500/50 backdrop-blur-md text-xs font-mono">
            <span className="text-emerald-400 font-bold block">{isAr ? 'الفترة السابقة (Before)' : 'BEFORE BASELINE'}</span>
            <span className="text-[10px] text-slate-300">{beforePeriod.satelliteId} • {beforePeriod.dateStrAr}</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* LAYER 2: AFTER IMAGERY (Right / Clipped Overlay)                         */}
        {/* ========================================================================= */}
        <div 
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{
            clipPath: `inset(0 0 0 ${sliderPosition}%)`,
            willChange: 'clip-path'
          }}
        >
          <svg className="w-full h-full" viewBox="0 0 600 400" preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id="after-water" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0f172a" />
                <stop offset="100%" stopColor="#0369a1" />
              </linearGradient>
              {/* Drought Stressed Foliage: Amber, Orange, and Red Anomaly */}
              <linearGradient id="after-forest-stressed" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#78350f" />
                <stop offset="50%" stopColor="#d97706" />
                <stop offset="100%" stopColor="#b45309" />
              </linearGradient>
              <linearGradient id="after-drought-burn-scars" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#b91c1c" />
              </linearGradient>
            </defs>

            {/* Terrain Background (Darker drought tones) */}
            <rect width="600" height="400" fill="#090d16" />

            {/* Shrunken Water Line due to heat & summer demand */}
            <path
              d="M 140 60 Q 230 100 290 190 T 430 290 T 530 370 L 560 400 L 100 400 Z"
              fill="url(#after-water)"
              opacity="0.8"
            />

            {/* Forest Zones - Stressed & Yellow/Red Anomaly */}
            <circle cx="180" cy="140" r="90" fill="url(#after-forest-stressed)" opacity="0.8" />
            <circle cx="340" cy="110" r="110" fill="url(#after-drought-burn-scars)" opacity="0.75" />
            <circle cx="480" cy="210" r="95" fill="url(#after-forest-stressed)" opacity="0.85" />

            {/* Agricultural Parcels - Dried Out (Yellow / Red Stress in After) */}
            <rect x="60" y="80" width="70" height="60" rx="6" fill="#f59e0b" opacity="0.75" />
            <rect x="140" y="240" width="90" height="70" rx="8" fill="#ef4444" opacity="0.7" />
            <rect x="360" y="220" width="100" height="80" rx="8" fill="#b45309" opacity="0.8" />

            {/* Landmark Label */}
            <text x="30" y="40" fill="#f87171" fontSize="13" fontWeight="bold" fontFamily="monospace">
              ⚠️ {isAr ? 'رصد الجفاف الحاد — قطاع ميلة' : 'Drought Anomaly — Mila Sector'}
            </text>
            <text x="30" y="60" fill="#fca5a5" fontSize="10" fontFamily="monospace">
              NDVI: ~0.40 • {afterPeriod.dateStrAr} (إجهاد حراري)
            </text>
          </svg>

          {/* Right Watermark Stamp */}
          <div className="absolute bottom-4 right-4 z-10 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-amber-500/50 backdrop-blur-md text-xs font-mono text-right">
            <span className="text-amber-400 font-bold block">{isAr ? 'الفترة الحالية (After)' : 'AFTER PERIOD'}</span>
            <span className="text-[10px] text-slate-300">{afterPeriod.satelliteId} • {afterPeriod.dateStrAr}</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* DRAGGABLE DIVIDER HANDLE & TOUCH INTERACTION                             */}
        {/* ========================================================================= */}
        <div
          id="ndvi-split-divider"
          className="absolute top-0 bottom-0 z-30 flex items-center justify-center pointer-events-auto"
          style={{
            left: `${sliderPosition}%`,
            transform: 'translateX(-50%)',
            touchAction: 'none' // CRITICAL: Isolates touch gesture from page/map scroll
          }}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
        >
          {/* Vertical Neon Divider Line */}
          <div className="w-1 h-full bg-gradient-to-b from-emerald-400 via-white to-emerald-400 shadow-[0_0_12px_rgba(255,255,255,0.9)]" />

          {/* Circular Cyber Handle */}
          <div 
            className={`w-10 h-10 rounded-full bg-slate-900 border-2 border-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.9)] flex items-center justify-center text-white cursor-ew-resize transition-transform ${
              isDragging ? 'scale-110 ring-4 ring-emerald-500/40' : 'hover:scale-105'
            }`}
          >
            <div className="flex items-center gap-0.5 text-emerald-300 text-xs font-black select-none pointer-events-none">
              <span>◀</span>
              <span>▶</span>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM TELEMETRY COMPARISON BAR */}
      <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
        <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-slate-500 block text-[9px] uppercase">{isAr ? 'حالة الجفاف المقارنة' : 'Drought Severity'}</span>
          <span className={`font-bold mt-0.5 block ${isVegetationDrop ? 'text-rose-400' : 'text-emerald-400'}`}>
            {isAr ? afterPeriod.droughtLevelAr : afterPeriod.droughtLevelEn}
          </span>
        </div>

        <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-slate-500 block text-[9px] uppercase">{isAr ? 'دقة الرصد الطيفي' : 'Sensor Resolution'}</span>
          <span className="text-slate-200 font-bold mt-0.5 block">
            {beforePeriod.resolutionM}m → {afterPeriod.resolutionM}m
          </span>
        </div>

        <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-slate-500 block text-[9px] uppercase">{isAr ? 'نسبة الغيوم' : 'Cloud Cover'}</span>
          <span className="text-slate-200 font-bold mt-0.5 block">
            {beforePeriod.cloudCoverPercent}% vs {afterPeriod.cloudCoverPercent}%
          </span>
        </div>

        <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-slate-500 block text-[9px] uppercase">{isAr ? 'موضع السحب' : 'Split Slider Pos'}</span>
          <span className="text-emerald-400 font-bold mt-0.5 block">
            {sliderPosition}%
          </span>
        </div>
      </div>

      {/* NDVI COLOR SPECTRUM LEGEND */}
      <div className="mt-2.5 p-2 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-[10px] font-mono text-slate-400">
        <span>{isAr ? 'دليل ألوان NDVI:' : 'NDVI Legend:'}</span>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-600" /> -0.2 {isAr ? 'مياه/سد' : 'Water'}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600" /> 0.1 {isAr ? 'تربة/جفاف' : 'Bare/Dry'}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> 0.3 {isAr ? 'إجهاد' : 'Stress'}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> 0.6+ {isAr ? 'كثيف' : 'Lush'}
          </span>
        </div>
      </div>
    </div>
  );
};
