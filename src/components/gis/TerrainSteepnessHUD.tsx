import React from 'react';
import { 
  Mountain, 
  X, 
  AlertTriangle, 
  Truck, 
  ShieldAlert, 
  Compass, 
  TrendingUp, 
  Activity, 
  Layers, 
  Navigation2,
  ChevronRight,
  Flame
} from 'lucide-react';
import { 
  TerrainSteepnessCell, 
  CriticalEscarpmentZone, 
  TerrainSteepnessSummary,
  CRITICAL_ESCARPMENT_ZONES 
} from '../../services/terrainSteepnessService';
import { Language } from '../../types';

export interface TerrainSteepnessHUDProps {
  summary: TerrainSteepnessSummary;
  selectedCell: TerrainSteepnessCell | null;
  selectedCriticalZone: CriticalEscarpmentZone | null;
  mode: 'all' | 'critical_only' | 'machinery_access' | 'ground_crew_safety';
  onChangeMode: (mode: 'all' | 'critical_only' | 'machinery_access' | 'ground_crew_safety') => void;
  opacity: number;
  onChangeOpacity: (val: number) => void;
  showContourBlobs: boolean;
  onToggleContourBlobs: () => void;
  showAspectVectors: boolean;
  onToggleAspectVectors: () => void;
  showHazardBadges: boolean;
  onToggleHazardBadges: () => void;
  onSelectCriticalZone: (zone: CriticalEscarpmentZone) => void;
  onClose: () => void;
  currentLang: Language;
}

export const TerrainSteepnessHUD: React.FC<TerrainSteepnessHUDProps> = ({
  summary,
  selectedCell,
  selectedCriticalZone,
  mode,
  onChangeMode,
  opacity,
  onChangeOpacity,
  showContourBlobs,
  onToggleContourBlobs,
  showAspectVectors,
  onToggleAspectVectors,
  showHazardBadges,
  onToggleHazardBadges,
  onSelectCriticalZone,
  onClose,
  currentLang
}) => {
  return (
    <div 
      id="terrain-steepness-hud"
      className="absolute inset-x-2 sm:inset-x-auto sm:end-4 bottom-2 sm:bottom-6 z-30 w-auto sm:w-[420px] max-h-[75vh] overflow-y-auto bg-slate-950/95 backdrop-blur-2xl border border-amber-500/40 rounded-2xl p-4 shadow-2xl text-xs space-y-3.5 animate-in fade-in slide-in-from-bottom-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-amber-900/40 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-rose-700 flex items-center justify-center shadow-lg shadow-orange-950/60">
            <Mountain className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-100 text-sm">
                {currentLang === 'ar' ? 'تحليل انحدار التضاريس والتنقل' : 'Terrain Steepness & Machinery Risk'}
              </span>
              <span className="px-1.5 py-0.2 text-[9px] rounded-full bg-amber-950 text-amber-300 border border-amber-500/40 font-mono font-bold">
                DEM 30M
              </span>
            </div>
            <div className="text-[10px] text-amber-300/80 font-mono">
              {currentLang === 'ar' 
                ? 'تقييم مخاطر انقلاب الآليات وتيارات النيران الصاعدة' 
                : 'Fire Machinery Rollover & Ground Crew Safety Assessment'}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          title="Close Terrain Steepness HUD"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Mode Switcher Pill Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 bg-slate-900/90 rounded-xl border border-slate-800 text-[10px] font-medium">
        <button
          onClick={() => onChangeMode('all')}
          className={`py-1.5 px-2 rounded-lg transition cursor-pointer text-center font-bold ${
            mode === 'all'
              ? 'bg-amber-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {currentLang === 'ar' ? 'كامل الطيف' : 'All Slopes'}
        </button>
        <button
          onClick={() => onChangeMode('critical_only')}
          className={`py-1.5 px-2 rounded-lg transition cursor-pointer text-center font-bold ${
            mode === 'critical_only'
              ? 'bg-rose-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {currentLang === 'ar' ? 'المنحدرات الحرجة' : 'Critical ≥18°'}
        </button>
        <button
          onClick={() => onChangeMode('machinery_access')}
          className={`py-1.5 px-2 rounded-lg transition cursor-pointer text-center font-bold ${
            mode === 'machinery_access'
              ? 'bg-orange-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {currentLang === 'ar' ? 'حركية الشاحنات' : 'Machinery'}
        </button>
        <button
          onClick={() => onChangeMode('ground_crew_safety')}
          className={`py-1.5 px-2 rounded-lg transition cursor-pointer text-center font-bold ${
            mode === 'ground_crew_safety'
              ? 'bg-purple-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {currentLang === 'ar' ? 'سلامة المشاة' : 'Crew Safety'}
        </button>
      </div>

      {/* Selected Cell or Escarpment Deep Dive Panel */}
      {selectedCell ? (
        <div className="p-3 rounded-xl bg-slate-900/90 border border-amber-500/50 space-y-2.5 shadow-inner">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-bold text-amber-300 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              {currentLang === 'ar' ? 'نقطة المسح التضاريسي المحددة' : 'Selected Point DEM Telemetry'}
            </span>
            <span className="font-mono text-[10px] text-slate-400">
              {selectedCell.lat.toFixed(3)}°N, {selectedCell.lng.toFixed(3)}°E
            </span>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-4 gap-1.5 text-center font-mono">
            <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-[9px] text-slate-400">{currentLang === 'ar' ? 'الارتفاع' : 'Elevation'}</div>
              <div className="text-xs font-bold text-emerald-400">{selectedCell.elevationMeters}m</div>
            </div>
            <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-[9px] text-slate-400">{currentLang === 'ar' ? 'زاوية الميل' : 'Slope'}</div>
              <div className={`text-xs font-bold ${selectedCell.slopeDegrees >= 20 ? 'text-rose-400' : 'text-amber-400'}`}>
                {selectedCell.slopeDegrees}°
              </div>
            </div>
            <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-[9px] text-slate-400">{currentLang === 'ar' ? 'الانحدار %' : 'Grade'}</div>
              <div className="text-xs font-bold text-slate-200">{selectedCell.slopePercent}%</div>
            </div>
            <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-[9px] text-slate-400">{currentLang === 'ar' ? 'اتجاه الصعود' : 'Aspect'}</div>
              <div className="text-xs font-bold text-sky-400">{selectedCell.aspectCardinal} ({selectedCell.aspectDegrees}°)</div>
            </div>
          </div>

          {/* Tactical Machinery & Ground Verdict */}
          <div className="space-y-1.5 pt-1 text-[11px]">
            <div className="flex items-start gap-2 p-2 rounded-lg bg-slate-950/80 border border-slate-800">
              <Truck className={`w-4 h-4 shrink-0 mt-0.5 ${
                selectedCell.machineryCategory === 'accessible_all' 
                  ? 'text-emerald-400' 
                  : selectedCell.machineryCategory === 'restricted_low_gear'
                  ? 'text-amber-400'
                  : selectedCell.machineryCategory === 'high_risk_winch'
                  ? 'text-orange-400'
                  : 'text-rose-500'
              }`} />
              <div>
                <div className="font-bold text-slate-200">
                  {currentLang === 'ar' ? 'تصنيف حركية الشاحنات والآليات:' : 'Machinery Access Verdict:'}
                </div>
                <div className="text-slate-300 text-[10px]">
                  {selectedCell.machineryCategory === 'accessible_all' && (
                    <span className="text-emerald-300">
                      {currentLang === 'ar'
                        ? 'مفتوح بالكامل أمام شاحنات الإطفاء الثقيلة (CCF/CCFS/CCFM).'
                        : 'Full clearance for Heavy Water Tankers (CCF/CCFS/CCFM) and support vehicles.'}
                    </span>
                  )}
                  {selectedCell.machineryCategory === 'restricted_low_gear' && (
                    <span className="text-amber-300">
                      {currentLang === 'ar'
                        ? 'حذر: يتطلب تعشيق الدفع الرباعي البطيء (4x4 Low). حظر المناورات العرضية لتفادي الانقلاب.'
                        : 'Caution: 4x4 Low-Gear required. Off-road lateral movement restricted due to rollover hazard.'}
                    </span>
                  )}
                  {selectedCell.machineryCategory === 'high_risk_winch' && (
                    <span className="text-orange-300 font-semibold">
                      {currentLang === 'ar'
                        ? 'خطر مرتفع: حظر تام للشاحنات خارج المسارات المعبدة! جرافات شق الطرق بالونش (D6/D8) فقط.'
                        : 'High Risk: Wheeled CCF tankers barred off-road! Tracked bulldozers with winches only.'}
                    </span>
                  )}
                  {selectedCell.machineryCategory === 'impassable_extreme' && (
                    <span className="text-rose-400 font-bold">
                      {currentLang === 'ar'
                        ? 'جرف مستحيل: غير سالك لجميع الآليات الأرضية. خطر انقلاب فوري وحتمي.'
                        : 'Impassable: Strictly no vehicle access. Immediate catastrophic rollover hazard.'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 p-2 rounded-lg bg-slate-950/80 border border-slate-800">
              <ShieldAlert className={`w-4 h-4 shrink-0 mt-0.5 ${
                selectedCell.groundCrewHazard === 'low_risk'
                  ? 'text-emerald-400'
                  : selectedCell.groundCrewHazard === 'moderate_caution'
                  ? 'text-amber-400'
                  : selectedCell.groundCrewHazard === 'severe_hazard'
                  ? 'text-orange-400'
                  : 'text-purple-400'
              }`} />
              <div>
                <div className="font-bold text-slate-200">
                  {currentLang === 'ar' ? 'سلامة فرق المشاة والتدخل المباشر:' : 'Ground Team Safety Protocol:'}
                </div>
                <div className="text-slate-300 text-[10px]">
                  {selectedCell.groundCrewHazard === 'extreme_prohibited' ? (
                    <span className="text-purple-300 font-bold">
                      {currentLang === 'ar'
                        ? `حظر الهجوم المباشر صعوداً! تسارع النيران عبر المداخن الطبيعية بمقدار ${selectedCell.chimneyFactor}x. إسناد جوي حتمي.`
                        : `Direct uphill attack prohibited! Natural chimney acceleration factor ${selectedCell.chimneyFactor}x. Aerial drop priority.`}
                    </span>
                  ) : selectedCell.groundCrewHazard === 'severe_hazard' ? (
                    <span className="text-orange-300">
                      {currentLang === 'ar'
                        ? `خطر تدحرج المخاريط المشتعلة والحجارة. زمن الإخلاء أطول بنسبة +250%. معامل تسارع النيران ${selectedCell.chimneyFactor}x.`
                        : `Rolling burning debris and rockfall hazard. Evacuation time buffer +250%. Fire speed multiplier ${selectedCell.chimneyFactor}x.`}
                    </span>
                  ) : (
                    <span className="text-slate-300">
                      {currentLang === 'ar'
                        ? 'تضاريس آمنة للتدخل المباشر ومد خراطيم المياه مع خطوط نجاة سالكة.'
                        : 'Safe terrain for direct assault hose-lays and anchor establishment.'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : selectedCriticalZone ? (
        <div className="p-3 rounded-xl bg-slate-900/90 border border-rose-500/50 space-y-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-bold text-rose-300 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              {currentLang === 'ar' ? selectedCriticalZone.nameAr : selectedCriticalZone.name}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {selectedCriticalZone.wilaya}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-xs">
            <div className="p-1 rounded bg-slate-950 border border-slate-800">
              <span className="text-[9px] text-slate-400 block">{currentLang === 'ar' ? 'أقصى ميل' : 'Peak Slope'}</span>
              <span className="font-bold text-rose-400">{selectedCriticalZone.maxSlopeDegrees}°</span>
            </div>
            <div className="p-1 rounded bg-slate-950 border border-slate-800">
              <span className="text-[9px] text-slate-400 block">{currentLang === 'ar' ? 'القمة' : 'Altitude'}</span>
              <span className="font-bold text-amber-400">{selectedCriticalZone.peakElevationM}m</span>
            </div>
            <div className="p-1 rounded bg-slate-950 border border-slate-800">
              <span className="text-[9px] text-slate-400 block">{currentLang === 'ar' ? 'الآليات' : 'Machinery'}</span>
              <span className="font-bold text-red-400">
                {selectedCriticalZone.machineryStatus === 'impassable_extreme' ? 'BARRED' : 'WINCH'}
              </span>
            </div>
          </div>

          <div className="p-2 rounded-lg bg-rose-950/40 border border-rose-800/40 text-[10px] text-rose-200">
            <span className="font-bold block mb-0.5">{currentLang === 'ar' ? 'التعليمات العملياتية:' : 'Tactical Directives:'}</span>
            {currentLang === 'ar' 
              ? selectedCriticalZone.tacticalAdvisory.ar 
              : currentLang === 'fr' 
              ? selectedCriticalZone.tacticalAdvisory.fr 
              : selectedCriticalZone.tacticalAdvisory.en}
          </div>
        </div>
      ) : (
        /* Regional Summary Overview */
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              {currentLang === 'ar' ? 'ملخص انحدار تضاريس شمال الجزائر' : 'Northern Algeria Topographic Summary'}
            </span>
            <span className="font-mono text-[10px] text-amber-300 font-bold">
              {summary.totalSampledPoints} {currentLang === 'ar' ? 'نقطة مسح' : 'Points'}
            </span>
          </div>

          {/* Proportions Bar */}
          <div className="space-y-1">
            <div className="h-2 w-full rounded-full bg-slate-800 flex overflow-hidden">
              <div 
                style={{ width: `${summary.accessibleVehiclesPercent}%` }} 
                className="bg-emerald-500 transition-all" 
                title={`Accessible: ${summary.accessibleVehiclesPercent}%`} 
              />
              <div 
                style={{ width: `${summary.restricted4x4Percent}%` }} 
                className="bg-amber-500 transition-all" 
                title={`4x4 Caution: ${summary.restricted4x4Percent}%`} 
              />
              <div 
                style={{ width: `${summary.winchOnlyPercent}%` }} 
                className="bg-orange-500 transition-all" 
                title={`Winch Only: ${summary.winchOnlyPercent}%`} 
              />
              <div 
                style={{ width: `${summary.impassablePercent}%` }} 
                className="bg-rose-600 transition-all" 
                title={`Impassable: ${summary.impassablePercent}%`} 
              />
            </div>

            <div className="grid grid-cols-4 gap-1 text-[9px] font-mono text-center pt-0.5">
              <div className="text-emerald-400">
                <span className="font-bold">{summary.accessibleVehiclesPercent}%</span>
                <span className="block text-[8px] text-slate-400">≤12° Free</span>
              </div>
              <div className="text-amber-400">
                <span className="font-bold">{summary.restricted4x4Percent}%</span>
                <span className="block text-[8px] text-slate-400">12-20° 4x4</span>
              </div>
              <div className="text-orange-400">
                <span className="font-bold">{summary.winchOnlyPercent}%</span>
                <span className="block text-[8px] text-slate-400">20-28° Dozer</span>
              </div>
              <div className="text-rose-400">
                <span className="font-bold">{summary.impassablePercent}%</span>
                <span className="block text-[8px] text-slate-400">&gt;28° Barred</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Critical Escarpment Quick Jumpers */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
          <span>{currentLang === 'ar' ? 'جروف ومنحدرات استثنائية الخطورة:' : 'High-Hazard Mountain Escarpments:'}</span>
          <span className="text-rose-400 font-mono font-bold">7 Hotspots</span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin">
          {CRITICAL_ESCARPMENT_ZONES.map((zone) => (
            <button
              key={zone.id}
              onClick={() => onSelectCriticalZone(zone)}
              className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 text-[10px] font-mono whitespace-nowrap text-slate-300 transition cursor-pointer flex items-center gap-1 shrink-0"
            >
              <Mountain className="w-3 h-3 text-amber-400" />
              <span>{zone.name.split(' ')[0]}</span>
              <span className="text-rose-400 font-bold">{zone.maxSlopeDegrees}°</span>
            </button>
          ))}
        </div>
      </div>

      {/* Controls & Visibility Toggles */}
      <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between gap-3 text-[10px]">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-slate-400 whitespace-nowrap">{currentLang === 'ar' ? 'الشفافية:' : 'Opacity:'}</span>
          <input
            type="range"
            min="0.2"
            max="1.0"
            step="0.05"
            value={opacity}
            onChange={(e) => onChangeOpacity(parseFloat(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
          <span className="font-mono text-slate-300 text-[10px] w-8">{Math.round(opacity * 100)}%</span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onToggleContourBlobs}
            className={`px-2 py-1 rounded text-[9px] font-bold transition cursor-pointer border ${
              showContourBlobs 
                ? 'bg-amber-600/80 text-white border-amber-400/60' 
                : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
            title="Toggle Gaussian heat contour blobs"
          >
            Blobs
          </button>
          <button
            onClick={onToggleAspectVectors}
            className={`px-2 py-1 rounded text-[9px] font-bold transition cursor-pointer border ${
              showAspectVectors 
                ? 'bg-amber-600/80 text-white border-amber-400/60' 
                : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
            title="Toggle chimney uphill draft vectors"
          >
            Vectors
          </button>
          <button
            onClick={onToggleHazardBadges}
            className={`px-2 py-1 rounded text-[9px] font-bold transition cursor-pointer border ${
              showHazardBadges 
                ? 'bg-rose-600/80 text-white border-rose-400/60' 
                : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
            title="Toggle escarpment warning badges"
          >
            Badges
          </button>
        </div>
      </div>
    </div>
  );
};
