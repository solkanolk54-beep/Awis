import React, { useState } from 'react';
import { 
  Flame, 
  Wind, 
  Mountain, 
  Compass, 
  Activity, 
  Play, 
  Pause, 
  RotateCcw, 
  Sliders, 
  Eye, 
  EyeOff, 
  Radio, 
  Timer, 
  FastForward, 
  X, 
  Maximize2, 
  Minimize2,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Clock,
  TrendingUp,
  MapPin
} from 'lucide-react';
import { 
  FireFrontDynamicsResult, 
  FireFrontPolylineVertex 
} from '../../services/fireFrontDynamicsService';
import { Language } from '../../types';

interface FireFrontDynamicsHUDProps {
  dynamics: FireFrontDynamicsResult;
  isPeriodicActive: boolean;
  onTogglePeriodic: () => void;
  onStepForward: (minutes?: number) => void;
  onResetSimulation: () => void;
  periodicIntervalSeconds: number;
  onChangeIntervalSeconds: (seconds: number) => void;
  showVectors: boolean;
  onToggleVectors: () => void;
  showHistoricalTrails: boolean;
  onToggleHistoricalTrails: () => void;
  showVertexNodes: boolean;
  onToggleVertexNodes: () => void;
  selectedVertex: FireFrontPolylineVertex | null;
  onSelectVertex: (vertex: FireFrontPolylineVertex | null) => void;
  onClose: () => void;
  currentLang: Language;
}

export const FireFrontDynamicsHUD: React.FC<FireFrontDynamicsHUDProps> = ({
  dynamics,
  isPeriodicActive,
  onTogglePeriodic,
  onStepForward,
  onResetSimulation,
  periodicIntervalSeconds,
  onChangeIntervalSeconds,
  showVectors,
  onToggleVectors,
  showHistoricalTrails,
  onToggleHistoricalTrails,
  showVertexNodes,
  onToggleVertexNodes,
  selectedVertex,
  onSelectVertex,
  onClose,
  currentLang
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<'dynamics' | 'wind_history' | 'terrain'>('dynamics');

  const {
    activeFrontLengthKm,
    peakRateOfSpreadMMin,
    peakFlameLengthM,
    averageRateOfSpreadMMin,
    netSpreadHeadingDeg,
    netSpreadHeadingCardinal,
    historicalWindTimeline,
    currentWindVector,
    terrainSummary,
    expansionHectaresPerHour,
    threatLevel,
    lastUpdatedTimestamp,
    updateCycleCount,
    simulationClockMinutes,
    incidentName
  } = dynamics;

  const threatBadgeColors = {
    extreme: 'bg-red-950/90 text-red-300 border-red-500/80 animate-pulse',
    critical: 'bg-orange-950/90 text-orange-300 border-orange-500/70',
    high: 'bg-amber-950/90 text-amber-300 border-amber-500/60',
    moderate: 'bg-yellow-950/90 text-yellow-300 border-yellow-500/50',
    low: 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50'
  }[threatLevel] || 'bg-slate-800 text-slate-300 border-slate-700';

  return (
    <div 
      id="fire-front-dynamics-hud"
      className="absolute inset-x-2 sm:inset-x-auto sm:end-4 top-14 sm:top-16 z-30 w-auto sm:w-96 max-h-[75vh] overflow-y-auto bg-slate-950/95 backdrop-blur-xl border border-orange-500/50 rounded-2xl shadow-2xl text-slate-200 animate-in fade-in slide-in-from-top-4 transition-all"
    >
      {/* Header Banner */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-gradient-to-r from-orange-950/80 via-slate-900 to-slate-950 border-b border-orange-500/30">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-orange-600/30 border border-orange-500/50 text-orange-400">
            <Flame className="w-4 h-4 animate-pulse text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs text-white">
                {currentLang === 'ar' ? 'ديناميكيات جبهة النيران النشطة' : 'Fire Front Dynamics'}
              </span>
              <span className={`px-1.5 py-0.2 text-[9px] rounded font-mono font-bold uppercase border ${threatBadgeColors}`}>
                {threatLevel}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 truncate max-w-[190px]">
              {incidentName}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 text-slate-400">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:text-white rounded hover:bg-slate-800 transition cursor-pointer"
            title={isMinimized ? 'Expand HUD' : 'Minimize HUD'}
          >
            {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:text-white rounded hover:bg-slate-800 transition cursor-pointer"
            title="Close Dynamics HUD"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Minimized Quick Telemetry Strip */}
      {isMinimized && (
        <div className="p-2.5 flex items-center justify-between text-xs font-mono bg-slate-900/60">
          <div className="flex items-center gap-2">
            <span className="text-orange-400 font-bold">Front: {activeFrontLengthKm}km</span>
            <span className="text-slate-500">|</span>
            <span className="text-red-400 font-bold">ROS: {peakRateOfSpreadMMin}m/min</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isPeriodicActive ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
            <button
              onClick={() => setIsMinimized(false)}
              className="text-[10px] text-sky-400 hover:underline cursor-pointer"
            >
              {currentLang === 'ar' ? 'عرض التفاصيل' : 'Expand'}
            </button>
          </div>
        </div>
      )}

      {/* Expanded Content Body */}
      {!isMinimized && (
        <div className="p-3.5 space-y-3">
          {/* Periodic Dynamic Update Controller & Status Bar */}
          <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  {isPeriodicActive && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                  )}
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isPeriodicActive ? 'bg-orange-500' : 'bg-slate-500'}`} />
                </span>
                <span className="font-semibold text-slate-200 text-[11px]">
                  {isPeriodicActive 
                    ? (currentLang === 'ar' ? 'التحديث الدوري التلقائي (نشط)' : 'Periodic Dynamic Vector Engine')
                    : (currentLang === 'ar' ? 'المحاكي متوقف مؤقتاً' : 'Periodic Update Paused')}
                </span>
              </div>

              {/* Virtual Clock & Cycle indicator */}
              <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-orange-400" />
                <span>+{simulationClockMinutes}m</span>
                <span className="text-slate-600">({updateCycleCount}cyc)</span>
              </div>
            </div>

            {/* Playback Controls & Step Advance */}
            <div className="flex items-center justify-between gap-1.5 pt-1">
              <button
                id="btn-toggle-periodic-dynamics"
                onClick={onTogglePeriodic}
                className={`flex-1 py-1.5 px-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow ${
                  isPeriodicActive
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white'
                }`}
              >
                {isPeriodicActive ? (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    <span>{currentLang === 'ar' ? 'إيقاف مؤقت' : 'Pause Live'}</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>{currentLang === 'ar' ? 'تشغيل التحديث' : 'Start Auto-Update'}</span>
                  </>
                )}
              </button>

              <button
                id="btn-step-forward-dynamics"
                onClick={() => onStepForward(10)}
                className="py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 transition cursor-pointer"
                title="Advance 10 Minutes"
              >
                <FastForward className="w-3.5 h-3.5 text-sky-400" />
                <span>+10m</span>
              </button>

              <button
                id="btn-reset-dynamics"
                onClick={onResetSimulation}
                className="p-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition cursor-pointer"
                title="Reset to Ignition Baseline"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              {/* Update Interval Selector */}
              <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 text-[10px] font-mono">
                <Timer className="w-3 h-3 text-slate-400" />
                <select
                  value={periodicIntervalSeconds}
                  onChange={(e) => onChangeIntervalSeconds(Number(e.target.value))}
                  className="bg-transparent text-slate-200 outline-none cursor-pointer text-[10px]"
                  title="Periodic Interval"
                >
                  <option value={2} className="bg-slate-900">2s</option>
                  <option value={3} className="bg-slate-900">3s</option>
                  <option value={5} className="bg-slate-900">5s</option>
                </select>
              </div>
            </div>
          </div>

          {/* Primary Key Metrics Bento Grid */}
          <div className="grid grid-cols-3 gap-1.5 text-center font-mono">
            {/* Front Length */}
            <div className="p-2 bg-slate-900/80 rounded-xl border border-slate-800">
              <div className="text-[9px] text-slate-400 font-sans">{currentLang === 'ar' ? 'طول الجبهة' : 'Front Length'}</div>
              <div className="font-bold text-orange-400 text-xs mt-0.5">{activeFrontLengthKm} km</div>
              <div className="text-[8px] text-slate-500 font-sans">{currentLang === 'ar' ? 'حافة نشطة' : 'Active Edge'}</div>
            </div>

            {/* Peak Rate of Spread */}
            <div className="p-2 bg-slate-900/80 rounded-xl border border-slate-800">
              <div className="text-[9px] text-slate-400 font-sans">{currentLang === 'ar' ? 'أقصى سرعة' : 'Peak ROS'}</div>
              <div className="font-bold text-red-400 text-xs mt-0.5">{peakRateOfSpreadMMin} <span className="text-[9px]">m/min</span></div>
              <div className="text-[8px] text-slate-500 font-sans">{((peakRateOfSpreadMMin * 60) / 1000).toFixed(1)} km/h</div>
            </div>

            {/* Flame Length */}
            <div className="p-2 bg-slate-900/80 rounded-xl border border-slate-800">
              <div className="text-[9px] text-slate-400 font-sans">{currentLang === 'ar' ? 'طول اللهب' : 'Flame Length'}</div>
              <div className="font-bold text-amber-300 text-xs mt-0.5">{peakFlameLengthM} m</div>
              <div className="text-[8px] text-slate-500 font-sans">{currentLang === 'ar' ? 'لهب المقدمة' : 'Head Flame'}</div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('dynamics')}
              className={`flex-1 py-1.5 text-center border-b-2 transition cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'dynamics'
                  ? 'border-orange-500 text-orange-400 bg-orange-950/20'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3 h-3" />
              <span>{currentLang === 'ar' ? 'المتجهات' : 'Dynamics'}</span>
            </button>
            <button
              onClick={() => setActiveTab('wind_history')}
              className={`flex-1 py-1.5 text-center border-b-2 transition cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'wind_history'
                  ? 'border-orange-500 text-orange-400 bg-orange-950/20'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Wind className="w-3 h-3" />
              <span>{currentLang === 'ar' ? 'تاريخ الرياح' : 'Wind Vectors'}</span>
            </button>
            <button
              onClick={() => setActiveTab('terrain')}
              className={`flex-1 py-1.5 text-center border-b-2 transition cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'terrain'
                  ? 'border-orange-500 text-orange-400 bg-orange-950/20'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Mountain className="w-3 h-3" />
              <span>{currentLang === 'ar' ? 'التضاريس' : 'Terrain'}</span>
            </button>
          </div>

          {/* Tab 1: Dynamics & Coupled Spread Vector */}
          {activeTab === 'dynamics' && (
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Compass className="w-3.5 h-3.5 text-orange-400" />
                    {currentLang === 'ar' ? 'اتجاه الانتشار المقترن:' : 'Coupled Spread Heading:'}
                  </span>
                  <span className="font-mono font-bold text-white">
                    {netSpreadHeadingDeg}° ({netSpreadHeadingCardinal})
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-red-400" />
                    {currentLang === 'ar' ? 'معدل التوسع المساحي:' : 'Area Expansion Rate:'}
                  </span>
                  <span className="font-mono font-bold text-red-400">
                    +{expansionHectaresPerHour} ha/hr
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    {currentLang === 'ar' ? 'متوسط سرعة الجبهة:' : 'Mean Front Velocity:'}
                  </span>
                  <span className="font-mono font-bold text-emerald-300">
                    {averageRateOfSpreadMMin} m/min
                  </span>
                </div>
              </div>

              {/* Layer Display Toggles */}
              <div className="grid grid-cols-3 gap-1 pt-1">
                <button
                  onClick={onToggleVectors}
                  className={`p-1.5 rounded text-[10px] font-semibold border transition cursor-pointer flex items-center justify-center gap-1 ${
                    showVectors
                      ? 'bg-orange-950/60 border-orange-500 text-orange-200'
                      : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}
                >
                  <Wind className="w-3 h-3" />
                  <span>{currentLang === 'ar' ? 'المتجهات' : 'Vectors'}</span>
                </button>

                <button
                  onClick={onToggleHistoricalTrails}
                  className={`p-1.5 rounded text-[10px] font-semibold border transition cursor-pointer flex items-center justify-center gap-1 ${
                    showHistoricalTrails
                      ? 'bg-orange-950/60 border-orange-500 text-orange-200'
                      : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}
                >
                  <Timer className="w-3 h-3" />
                  <span>{currentLang === 'ar' ? 'الآثار السابقة' : 'Trails'}</span>
                </button>

                <button
                  onClick={onToggleVertexNodes}
                  className={`p-1.5 rounded text-[10px] font-semibold border transition cursor-pointer flex items-center justify-center gap-1 ${
                    showVertexNodes
                      ? 'bg-orange-950/60 border-orange-500 text-orange-200'
                      : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}
                >
                  <MapPin className="w-3 h-3" />
                  <span>{currentLang === 'ar' ? 'العقد' : 'Nodes'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: Historical Wind Vectors Timeline */}
          {activeTab === 'wind_history' && (
            <div className="space-y-1.5 text-xs">
              <div className="text-[10px] text-slate-400">
                {currentLang === 'ar'
                  ? 'سجل متجهات الرياح التاريخية المساهمة في تشكيل وتوجيه الحريق:'
                  : 'Historical wind vector timeline driving perimeter displacement:'}
              </div>

              <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                {historicalWindTimeline.map((w, idx) => {
                  const isCurrent = idx === historicalWindTimeline.length - 1;
                  return (
                    <div
                      key={`wind-hist-${w.timeOffsetMinutes}`}
                      className={`p-1.5 rounded-lg border text-[11px] font-mono flex items-center justify-between ${
                        isCurrent
                          ? 'bg-orange-950/70 border-orange-500/80 text-orange-200'
                          : 'bg-slate-900/60 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-sans w-12">
                          {w.timeOffsetMinutes === 0 ? 'Now' : `${w.timeOffsetMinutes}m`}
                        </span>
                        <span className="font-bold">{w.windSpeedKmH} km/h</span>
                        <span className="text-[10px] opacity-75">Gust {w.gustSpeedKmH}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400 text-[10px]">
                        <span>{w.cardinal} ({w.windDirectionDeg}°)</span>
                        <span>•</span>
                        <span>{w.tempC}°C</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 3: Terrain Vector Summary */}
          {activeTab === 'terrain' && (
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{currentLang === 'ar' ? 'التصنيف التضاريسي:' : 'Topographic Feature:'}</span>
                  <span className="font-mono font-bold text-amber-300">{terrainSummary.topographicClassification}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{currentLang === 'ar' ? 'متوسط انحدار السطح:' : 'Mean Slope Gradient:'}</span>
                  <span className="font-mono font-bold text-slate-200">{terrainSummary.averageSlopeDegrees}°</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{currentLang === 'ar' ? 'الواجهة الجبلية السائدة:' : 'Dominant Aspect:'}</span>
                  <span className="font-mono font-bold text-emerald-300">{terrainSummary.dominantAspectCardinal}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{currentLang === 'ar' ? 'نطاق الارتفاع الطوبوغرافي:' : 'Elevation Range:'}</span>
                  <span className="font-mono font-bold text-sky-300">
                    {terrainSummary.minElevationMeters}m - {terrainSummary.maxElevationMeters}m ASL
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Footer Timestamp */}
          <div className="pt-1 flex items-center justify-between text-[9px] text-slate-500 font-mono border-t border-slate-800/80">
            <span>{currentLang === 'ar' ? 'آخر تحديث ديناميكي:' : 'Last dynamic cycle:'} {lastUpdatedTimestamp}</span>
            <span className="text-orange-400 font-semibold">{incidentName.slice(0, 16)}</span>
          </div>
        </div>
      )}
    </div>
  );
};
