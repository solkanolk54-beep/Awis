import React, { useState } from 'react';
import { 
  Truck, 
  Flame, 
  ShieldAlert, 
  ArrowRight, 
  CheckCircle2, 
  AlertOctagon, 
  AlertTriangle, 
  TrendingDown, 
  Send, 
  Maximize2, 
  Minimize2, 
  X, 
  Droplets, 
  Plane, 
  Navigation,
  Info,
  Clock,
  Layers,
  Sparkles
} from 'lucide-react';
import { 
  WilayaResourceBalance, 
  InterWilayaRecommendation, 
  NationalResourceSummary,
  ResourceHeatmapMode 
} from '../../services/resourceOptimizationService';
import { Language, EmergencyResource } from '../../types';
import { translations } from '../../i18n/translations';

interface ResourceOptimizationHUDProps {
  balances: WilayaResourceBalance[];
  summary: NationalResourceSummary;
  currentLang: Language;
  heatmapMode: ResourceHeatmapMode;
  onModeChange: (mode: ResourceHeatmapMode) => void;
  opacity: number;
  onOpacityChange: (opacity: number) => void;
  selectedWilaya: WilayaResourceBalance | null;
  onSelectWilaya: (wilaya: WilayaResourceBalance | null) => void;
  onExecuteRecommendation?: (rec: InterWilayaRecommendation) => void;
  activeFilter: 'all' | 'deficit_only' | 'surplus_only';
  onFilterChange: (filter: 'all' | 'deficit_only' | 'surplus_only') => void;
}

export const ResourceOptimizationHUD: React.FC<ResourceOptimizationHUDProps> = ({
  balances,
  summary,
  currentLang,
  heatmapMode,
  onModeChange,
  opacity,
  onOpacityChange,
  selectedWilaya,
  onSelectWilaya,
  onExecuteRecommendation,
  activeFilter,
  onFilterChange
}) => {
  const t = translations[currentLang];
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [showRecommendationsDrawer, setShowRecommendationsDrawer] = useState<boolean>(false);
  const [dispatchedIds, setDispatchedIds] = useState<Record<string, boolean>>({});

  const handleDispatch = (rec: InterWilayaRecommendation) => {
    setDispatchedIds((prev) => ({ ...prev, [rec.id]: true }));
    onExecuteRecommendation?.(rec);
  };

  const isRtl = currentLang === 'ar';

  return (
    <>
      {/* Floating Tactical Commander Control Dock (Top Left, beneath Header) */}
      <div 
        className={`absolute top-16 ${isRtl ? 'right-4' : 'left-4'} z-20 w-80 md:w-96 bg-slate-950/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl transition-all duration-300 overflow-hidden select-none text-slate-100 text-xs font-sans`}
      >
        {/* Dock Header */}
        <div className="p-3 bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-red-950/80 border border-red-500/50 flex items-center justify-center text-red-400">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-slate-100 tracking-wide text-xs">
                {t.resourceHeatmapTitle || 'Wilaya Fleet & Demand Heatmap'}
              </div>
              <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                <span>{balances.length} Wilayas Analyzed</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="p-3 space-y-3">
            {/* Heatmap Visualization Mode Switcher */}
            <div>
              <div className="text-[10px] text-slate-400 font-semibold mb-1.5 flex items-center justify-between">
                <span>{currentLang === 'ar' ? 'نمط الخريطة الحرارية' : 'Heatmap Layer Mode'}</span>
                <span className="font-mono text-slate-500">{Math.round(opacity * 100)}% Opacity</span>
              </div>
              <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => onModeChange('balance')}
                  className={`py-1.5 px-2 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                    heatmapMode === 'balance'
                      ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <AlertTriangle className="w-3 h-3" />
                  <span>{currentLang === 'ar' ? 'الميزان' : 'Balance'}</span>
                </button>
                <button
                  onClick={() => onModeChange('needed')}
                  className={`py-1.5 px-2 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                    heatmapMode === 'needed'
                      ? 'bg-gradient-to-r from-amber-600 to-red-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Flame className="w-3 h-3 text-orange-300" />
                  <span>{currentLang === 'ar' ? 'الطلب' : 'Demand'}</span>
                </button>
                <button
                  onClick={() => onModeChange('available')}
                  className={`py-1.5 px-2 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                    heatmapMode === 'available'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ShieldAlert className="w-3 h-3 text-emerald-300" />
                  <span>{currentLang === 'ar' ? 'المتاح' : 'Supply'}</span>
                </button>
              </div>
            </div>

            {/* Opacity Slider */}
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-slate-400 font-mono shrink-0">
                {currentLang === 'ar' ? 'الشفافية' : 'Opacity'}
              </span>
              <input
                type="range"
                min="0.15"
                max="0.95"
                step="0.05"
                value={opacity}
                onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
                className="w-full accent-red-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <span className="text-[10px] font-mono font-bold text-red-400 shrink-0">
                {Math.round(opacity * 100)}%
              </span>
            </div>

            {/* National Fleet KPI Matrix */}
            <div className="grid grid-cols-4 gap-1.5 text-center">
              <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-[9px] text-slate-400 font-medium">{currentLang === 'ar' ? 'الجاهزة' : 'Ready'}</div>
                <div className="text-sm font-black text-emerald-400 font-mono">{summary.totalReady}</div>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-[9px] text-slate-400 font-medium">{currentLang === 'ar' ? 'ميدانية' : 'Deployed'}</div>
                <div className="text-sm font-black text-amber-400 font-mono">{summary.totalDispatched}</div>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-[9px] text-slate-400 font-medium">{currentLang === 'ar' ? 'مطلوبة' : 'Needed'}</div>
                <div className="text-sm font-black text-red-400 font-mono">{summary.totalNeeded}</div>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-[9px] text-slate-400 font-medium">{currentLang === 'ar' ? 'ولايات عجز' : 'Deficit'}</div>
                <div className="text-sm font-black text-rose-500 font-mono">{summary.criticalDeficitWilayasCount}</div>
              </div>
            </div>

            {/* Filter Chips */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => onFilterChange('all')}
                className={`px-2 py-1 rounded text-[10px] font-medium transition cursor-pointer ${
                  activeFilter === 'all'
                    ? 'bg-slate-700 text-white font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                {currentLang === 'ar' ? 'الكل' : 'All'}
              </button>
              <button
                onClick={() => onFilterChange('deficit_only')}
                className={`px-2 py-1 rounded text-[10px] font-medium transition flex items-center gap-1 cursor-pointer ${
                  activeFilter === 'deficit_only'
                    ? 'bg-red-900/80 border border-red-500 text-red-200 font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-red-300'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <span>{currentLang === 'ar' ? 'ولايات العجز فقط' : 'Deficit Only'}</span>
              </button>
              <button
                onClick={() => onFilterChange('surplus_only')}
                className={`px-2 py-1 rounded text-[10px] font-medium transition flex items-center gap-1 cursor-pointer ${
                  activeFilter === 'surplus_only'
                    ? 'bg-emerald-900/80 border border-emerald-500 text-emerald-200 font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-emerald-300'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>{currentLang === 'ar' ? 'ولايات الفائض' : 'Surplus Only'}</span>
              </button>
            </div>

            {/* Mutual Aid Optimizer Button Banner */}
            {summary.recommendations.length > 0 && (
              <button
                onClick={() => setShowRecommendationsDrawer(true)}
                className="w-full p-2 rounded-xl bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-xs shadow-lg transition flex items-center justify-between cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-200 animate-pulse" />
                  <span className="text-left font-bold">
                    {t.mutualAidRecommendations || 'Inter-Wilaya Mutual Aid Logistics'}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-black/40 text-amber-200 text-[10px] font-mono font-black">
                  {summary.recommendations.length} {currentLang === 'ar' ? 'اقتراح' : 'Routes'}
                </span>
              </button>
            )}

            {/* Quick Map Legend */}
            <div className="pt-2 border-t border-slate-800 text-[9px] text-slate-400 space-y-1">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block shadow-sm shadow-red-500" />
                  <span>{currentLang === 'ar' ? 'عجز حرج (طلب ملح > 50%)' : 'Critical Deficit (Severe Gap)'}</span>
                </span>
                <span className="font-mono text-red-400 font-bold">-3 to -8</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                  <span>{currentLang === 'ar' ? 'ضغط تشغيلي متوسط' : 'Moderate Strain'}</span>
                </span>
                <span className="font-mono text-amber-400 font-bold">-1 to -2</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-sm shadow-emerald-500" />
                  <span>{currentLang === 'ar' ? 'فائض واحتياطي استراتيجي' : 'Surplus & Mobile Reserve'}</span>
                </span>
                <span className="font-mono text-emerald-400 font-bold">+2 to +8</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Inter-Wilaya Mutual Aid Drawer / Modal */}
      {showRecommendationsDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-2xl bg-slate-950 border border-red-500/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-red-950 via-slate-900 to-slate-950 border-b border-red-900/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-900/60 border border-red-500/60 flex items-center justify-center text-red-300">
                  <Navigation className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">
                    {currentLang === 'ar' 
                      ? 'مصفوفة إعادة التوزيع اللوجستي والإسناد بين الولايات' 
                      : 'National Inter-Wilaya Mutual Aid Dispatch Matrix'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {currentLang === 'ar'
                      ? 'تحسين توزيع الأرتال والموارد الشاغرة نحو بؤر الحرائق الحرجة'
                      : 'AI-optimized redeployment of surplus fleet to critical wildfire zones'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRecommendationsDrawer(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Recommendations List */}
            <div className="p-4 overflow-y-auto space-y-3">
              {summary.recommendations.map((rec) => {
                const isDispatched = dispatchedIds[rec.id];

                return (
                  <div
                    key={rec.id}
                    className={`p-3.5 rounded-xl border transition ${
                      isDispatched
                        ? 'bg-emerald-950/20 border-emerald-500/40'
                        : rec.priority === 'urgent'
                        ? 'bg-red-950/20 border-red-900/50 hover:border-red-500/60'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Wilaya From ➔ To Flow */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-300 font-bold text-xs">
                            {currentLang === 'ar' ? rec.fromWilayaAr : rec.fromWilaya} (+Surplus)
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                          <span className="px-2 py-0.5 rounded bg-red-950 border border-red-500/40 text-red-300 font-bold text-xs">
                            {currentLang === 'ar' ? rec.toWilayaAr : rec.toWilaya} (-Deficit)
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            rec.priority === 'urgent' 
                              ? 'bg-red-600 text-white animate-pulse' 
                              : 'bg-amber-600 text-white'
                          }`}>
                            {rec.priority.toUpperCase()}
                          </span>
                        </div>

                        {/* Resource Unit & Logistics Highway Corridor */}
                        <div className="text-xs font-semibold text-slate-200">
                          {rec.unitsCount}x {currentLang === 'ar' ? rec.resourceTypeNameAr : rec.resourceTypeName}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-3">
                          <span className="flex items-center gap-1 text-slate-300">
                            <Navigation className="w-3 h-3 text-cyan-400" />
                            <span>{rec.transitCorridor}</span>
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 font-mono text-amber-300">
                            <Clock className="w-3 h-3" />
                            <span>{rec.estimatedTransitMinutes} min ({rec.transitDistanceKm} km)</span>
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 italic">
                          {currentLang === 'ar' ? rec.reasonAr : rec.reason}
                        </p>
                      </div>

                      {/* Action Button */}
                      <div className="shrink-0">
                        {isDispatched ? (
                          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-900/60 border border-emerald-500/60 text-emerald-300 font-bold text-xs">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>{currentLang === 'ar' ? 'تم توجيه الرتل' : 'Dispatched En Route'}</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleDispatch(rec)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-xs shadow-lg transition cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>{t.dispatchTransfer || 'Dispatch Support Column'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>{currentLang === 'ar' ? 'يتم تحديث التقديرات زمنياً وفق حركة المرور ونشاط الحرائق' : 'Calculations dynamically factor highway distance and fire front intensity'}</span>
              <button
                onClick={() => setShowRecommendationsDrawer(false)}
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold transition cursor-pointer"
              >
                {currentLang === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Wilaya Resource Detail Inspector Card (Bottom-Center or Floating) */}
      {selectedWilaya && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 w-full max-w-lg bg-slate-950/95 backdrop-blur-xl border border-slate-700/90 rounded-2xl p-4 shadow-2xl text-xs space-y-3 animate-in fade-in slide-in-from-bottom-2">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <span className={`w-3.5 h-3.5 rounded-full ${
                selectedWilaya.status === 'critical_deficit' 
                  ? 'bg-red-500 shadow-sm shadow-red-500' 
                  : selectedWilaya.status === 'moderate_deficit' 
                  ? 'bg-amber-500' 
                  : 'bg-emerald-500'
              }`} />
              <div>
                <span className="text-sm font-bold text-slate-100">
                  {currentLang === 'ar' ? `ولاية ${selectedWilaya.nameAr}` : `Wilaya of ${selectedWilaya.nameEn}`}
                </span>
                <span className="ml-2 font-mono text-[10px] text-slate-400">Code {selectedWilaya.wilayaCode}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                selectedWilaya.status === 'critical_deficit'
                  ? 'bg-red-950 border border-red-500 text-red-300'
                  : selectedWilaya.status === 'moderate_deficit'
                  ? 'bg-amber-950 border border-amber-500 text-amber-300'
                  : 'bg-emerald-950 border border-emerald-500 text-emerald-300'
              }`}>
                {selectedWilaya.status === 'critical_deficit'
                  ? (currentLang === 'ar' ? `عجز (${selectedWilaya.gap})` : `Deficit (${selectedWilaya.gap})`)
                  : selectedWilaya.status === 'moderate_deficit'
                  ? (currentLang === 'ar' ? `عجز خفيف (${selectedWilaya.gap})` : `Strain (${selectedWilaya.gap})`)
                  : (currentLang === 'ar' ? `فائض (+${selectedWilaya.gap})` : `Surplus (+${selectedWilaya.gap})`)}
              </span>

              <button
                onClick={() => onSelectWilaya(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-[10px] text-slate-400">{currentLang === 'ar' ? 'الموارد الجاهزة' : 'Ready Units'}</div>
              <div className="text-base font-black text-emerald-400 font-mono">
                {selectedWilaya.available.ready} / {selectedWilaya.available.total}
              </div>
              <div className="text-[9px] text-slate-500">{selectedWilaya.available.dispatched} dispatched</div>
            </div>
            <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-[10px] text-slate-400">{currentLang === 'ar' ? 'المطلوب ميدانياً' : 'Required Demand'}</div>
              <div className="text-base font-black text-red-400 font-mono">
                {selectedWilaya.needed.total}
              </div>
              <div className="text-[9px] text-slate-500">{selectedWilaya.needed.activeFiresCount} active fires</div>
            </div>
            <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-[10px] text-slate-400">{currentLang === 'ar' ? 'نسبة التغطية' : 'Coverage'}</div>
              <div className={`text-base font-black font-mono ${
                selectedWilaya.fulfillmentRatio < 60 ? 'text-red-400' : 'text-emerald-400'
              }`}>
                {selectedWilaya.fulfillmentRatio}%
              </div>
              <div className="text-[9px] text-slate-500">Risk idx: {selectedWilaya.currentRiskIndex}</div>
            </div>
          </div>

          {/* Unit Inventory */}
          <div className="bg-slate-900/50 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
            <div className="text-[10px] text-slate-400 font-semibold flex items-center justify-between">
              <span>{currentLang === 'ar' ? 'تفصيل الأسطول بالولاية' : 'Wilaya Fleet Breakdown'}</span>
              <span className="font-mono text-cyan-400">💧 {(selectedWilaya.available.totalWaterCapacityLiters / 1000).toLocaleString()}k Liters Capacity</span>
            </div>
            <div className="grid grid-cols-4 gap-1 text-[10px]">
              <div className="p-1 rounded bg-slate-800/60 text-slate-300 text-center">
                🚛 {selectedWilaya.available.firetrucks} CCFM
              </div>
              <div className="p-1 rounded bg-slate-800/60 text-slate-300 text-center">
                💧 {selectedWilaya.available.waterTankers} Tankers
              </div>
              <div className="p-1 rounded bg-slate-800/60 text-slate-300 text-center">
                🛡️ {selectedWilaya.available.groundTeams} Columns
              </div>
              <div className="p-1 rounded bg-slate-800/60 text-slate-300 text-center">
                🚁 {selectedWilaya.available.drones + selectedWilaya.available.aircraft} Air/Drones
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
