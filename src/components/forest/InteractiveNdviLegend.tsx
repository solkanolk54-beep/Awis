import React, { useState } from 'react';
import { 
  Trees, 
  Layers, 
  AlertTriangle, 
  Droplets, 
  ChevronDown, 
  ChevronUp, 
  Satellite, 
  Sliders,
  Sparkles,
  Info,
  Flame,
  Filter,
  Activity
} from 'lucide-react';
import { ForestZone, Language } from '../../types';
import { translations } from '../../i18n/translations';
import { 
  NDVI_COLOR_SCALE, 
  computeNationalNdviSummary,
  NdviColorStop 
} from '../../services/ndviService';

interface InteractiveNdviLegendProps {
  forests: ForestZone[];
  currentLang: Language;
  opacity: number;
  onOpacityChange: (newOpacity: number) => void;
  activeFilter: 'all' | 'critical_drought' | 'moisture_stressed' | 'moderate' | 'healthy_dense';
  onFilterChange: (filter: 'all' | 'critical_drought' | 'moisture_stressed' | 'moderate' | 'healthy_dense') => void;
  onSelectForest?: (forest: ForestZone) => void;
  onOpenCalculationPanel?: () => void;
  appliedScenarioLabel?: string;
  onClose?: () => void;
}

export const InteractiveNdviLegend: React.FC<InteractiveNdviLegendProps> = ({
  forests,
  currentLang,
  opacity,
  onOpacityChange,
  activeFilter,
  onFilterChange,
  onSelectForest,
  onOpenCalculationPanel,
  appliedScenarioLabel,
  onClose
}) => {
  const t = translations[currentLang];
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);

  const summary = computeNationalNdviSummary(forests);

  return (
    <div 
      id="interactive-ndvi-legend-hud" 
      className="absolute inset-x-2 sm:inset-x-auto bottom-14 sm:bottom-16 start-2 sm:start-4 z-20 w-auto sm:max-w-sm max-h-[70vh] overflow-y-auto bg-slate-950/92 backdrop-blur-md border border-emerald-500/40 rounded-xl shadow-2xl text-xs text-slate-200 transition-all duration-200 font-sans"
    >
      {/* Header Bar */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-3 py-2 bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between cursor-pointer select-none hover:bg-slate-900/90 transition"
      >
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Trees className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-100 text-[11px] leading-tight">
                {currentLang === 'ar' 
                  ? 'مؤشر صحة الغطاء النباتي (NDVI/VHI)' 
                  : currentLang === 'fr' 
                  ? 'Indice de Végétation & Stress Hydrique (NDVI)' 
                  : 'Vegetation Health & Moisture Index (NDVI)'}
              </span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-purple-950/80 text-purple-300 border border-purple-800 flex items-center gap-0.5">
                <Satellite className="w-2.5 h-2.5 text-purple-400" />
                Sentinel-2
              </span>
            </div>
            <p className="text-[9px] text-slate-400">
              {currentLang === 'ar'
                ? 'رصد رطوبة الكتلة الحيوية وقابلية الاشتعال'
                : currentLang === 'fr'
                ? 'Télédétection de l\'inflammabilité de la biomasse'
                : 'Satellite fuel dryness & canopy flammability'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {onOpenCalculationPanel && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenCalculationPanel();
              }}
              className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 rounded flex items-center gap-1 transition"
              title={currentLang === 'ar' ? 'حساب طيفي وإجهاد الجفاف' : 'Calculate & Assess Drought'}
            >
              <Activity className="w-3 h-3 text-emerald-400" />
              <span className="hidden sm:inline">{currentLang === 'ar' ? 'الحساب الطيفي' : 'Calculate'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowExplanation(!showExplanation);
            }}
            className="p-1 text-slate-400 hover:text-emerald-300 rounded hover:bg-slate-800/80 transition"
            title="Info"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] text-emerald-400 font-mono font-bold hidden sm:inline">
            {isExpanded ? (currentLang === 'ar' ? 'طي' : 'Collapse') : (currentLang === 'ar' ? 'توسيع' : 'Expand')}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
          {onClose && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition ml-1"
              title="Close"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-3 space-y-2.5">
          {/* Explanation Tooltip Drawer if toggled */}
          {showExplanation && (
            <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-[10px] text-slate-300 space-y-1">
              <p className="font-semibold text-emerald-300 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                {currentLang === 'ar' ? 'معادلة المؤشر الطيفي (Sentinel-2 MSI):' : 'Multi-Spectral Index Formula:'}
              </p>
              <p className="font-mono text-[9px] text-emerald-200">NDVI = (NIR B8 - Red B4) / (NIR B8 + Red B4)</p>
              <p className="text-slate-300 leading-relaxed">
                {currentLang === 'ar'
                  ? 'المناطق ذات القيم الأقل من 0.25 تشير إلى جفاف شديد وانخفاض محتوى الرطوبة الورقية (FMC < 15%)، مما يجعل الغابة وقوداً سريع الاشتعال وعرضة لقفزات الجمر الناري.'
                  : 'Values under 0.25 indicate critical canopy moisture deficit (FMC < 15%), producing extreme flammability and high vulnerability to explosive ember spotting.'}
              </p>
            </div>
          )}

          {/* Continuous Gradient Color Ramp Bar with Value Markers */}
          <div>
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1 px-0.5">
              <span className="text-red-400 font-bold">0.10 (جفاف حاد)</span>
              <span className="text-amber-400">0.25</span>
              <span className="text-lime-400">0.40</span>
              <span className="text-emerald-400">0.55</span>
              <span className="text-emerald-300 font-bold">0.75+ (كثيف ورطب)</span>
            </div>

            {/* Continuous Color Ramp */}
            <div className="relative h-3 w-full rounded-full overflow-hidden shadow-inner border border-slate-700/80 bg-gradient-to-r from-red-600 via-amber-500 via-lime-500 to-emerald-600">
              {/* Threshold tick dividers */}
              <div className="absolute top-0 bottom-0 left-[20%] w-[1px] bg-slate-900/60" />
              <div className="absolute top-0 bottom-0 left-[40%] w-[1px] bg-slate-900/60" />
              <div className="absolute top-0 bottom-0 left-[65%] w-[1px] bg-slate-900/60" />
              <div className="absolute top-0 bottom-0 left-[85%] w-[1px] bg-slate-900/60" />
            </div>
          </div>

          {/* Interactive Classification Filter Chips */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1 font-semibold text-slate-300">
                <Filter className="w-3 h-3 text-emerald-400" />
                {currentLang === 'ar' ? 'تصنيفات الكتلة الحيوية (اضغط للتصفية):' : 'Biomass Health Tiers (Click to isolate):'}
              </span>
              {activeFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => onFilterChange('all')}
                  className="text-[9px] text-amber-300 hover:underline font-bold"
                >
                  {currentLang === 'ar' ? 'عرض الكل' : 'Reset All'}
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {NDVI_COLOR_SCALE.map((stop: NdviColorStop) => {
                const isSelected = activeFilter === stop.statusCategory;
                const label = currentLang === 'ar' ? stop.labelAr : currentLang === 'fr' ? stop.labelFr : stop.labelEn;
                const riskLabel = currentLang === 'ar' ? stop.flammabilityIndexAr : `${stop.flammabilityIndex} Risk`;

                return (
                  <button
                    key={stop.statusCategory}
                    type="button"
                    onClick={() => onFilterChange(isSelected ? 'all' : stop.statusCategory)}
                    className={`p-1.5 rounded-lg border text-start transition flex flex-col gap-0.5 cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800 border-white text-white shadow-md ring-1 ring-emerald-400'
                        : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-850 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span 
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" 
                        style={{ backgroundColor: stop.hex }}
                      />
                      <span className="font-bold text-[10px] truncate leading-tight">
                        {label}
                      </span>
                    </div>
                    <span className={`text-[9px] font-mono px-1 py-0.2 rounded w-fit ${stop.textColor} bg-slate-950/80 border border-slate-800`}>
                      {riskLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* National Forest Survey Metrics Bar */}
          <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 grid grid-cols-3 gap-1 text-center font-mono">
            <div className="p-1 bg-slate-950/60 rounded border border-slate-800/80">
              <span className="text-[9px] text-slate-400 block font-sans">
                {currentLang === 'ar' ? 'متوسط المؤشر' : 'Avg NDVI'}
              </span>
              <span className="font-bold text-amber-300 text-xs">
                {summary.averageNationalNdvi}
              </span>
            </div>
            <div className="p-1 bg-slate-950/60 rounded border border-slate-800/80">
              <span className="text-[9px] text-slate-400 block font-sans">
                {currentLang === 'ar' ? 'إجهاد حرج' : 'Severe Deficit'}
              </span>
              <span className="font-bold text-red-400 text-xs">
                {summary.criticalPercent}%
              </span>
            </div>
            <div className="p-1 bg-slate-950/60 rounded border border-slate-800/80">
              <span className="text-[9px] text-slate-400 block font-sans">
                {currentLang === 'ar' ? 'رطوبة الأوراق' : 'Avg FMC'}
              </span>
              <span className="font-bold text-emerald-400 text-xs">
                {summary.averageCanopyMoisture}%
              </span>
            </div>
          </div>

          {appliedScenarioLabel && (
            <div className="flex items-center justify-between text-[10px] px-2 py-1 rounded bg-emerald-950/40 border border-emerald-800/40 text-emerald-300">
              <span className="flex items-center gap-1 text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {currentLang === 'ar' ? 'السيناريو المحسوب:' : 'Scenario:'}
              </span>
              <span className="font-semibold text-emerald-200 truncate max-w-[170px]">{appliedScenarioLabel}</span>
            </div>
          )}

          {/* Layer Opacity Slider */}
          <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between gap-3 text-[10px] text-slate-400">
            <span className="flex items-center gap-1 shrink-0 font-medium">
              <Sliders className="w-3 h-3 text-emerald-400" />
              {currentLang === 'ar' ? 'شفافية الطبقة:' : 'Layer Opacity:'}
            </span>
            <input 
              type="range"
              min="0.15"
              max="0.95"
              step="0.05"
              value={opacity}
              onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            <span className="font-mono text-slate-200 text-[10px] w-7 text-end font-bold">
              {Math.round(opacity * 100)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
