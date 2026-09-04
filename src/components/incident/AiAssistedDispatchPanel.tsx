import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  Clock, 
  MapPin, 
  Truck, 
  Droplets, 
  Plane, 
  Radio, 
  CheckCircle2, 
  Award, 
  Route, 
  Send, 
  ChevronRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { WildfireIncident, EmergencyResource, Language } from '../../types';
import { evaluateOptimalUnits, OptimalUnitRecommendation } from '../../services/aiDispatchEngine';

interface AiAssistedDispatchPanelProps {
  incident: WildfireIncident;
  availableResources: EmergencyResource[];
  onDispatchResource: (incidentId: string, resourceId: string) => void;
  currentLang: Language;
  onDeploySuccess?: (message: string) => void;
  compact?: boolean;
}

export const AiAssistedDispatchPanel: React.FC<AiAssistedDispatchPanelProps> = ({
  incident,
  availableResources,
  onDispatchResource,
  currentLang,
  onDeploySuccess,
  compact = false
}) => {
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationTimestamp, setCalculationTimestamp] = useState<string>('Live (Auto-Synced)');

  // Evaluate top 3 optimal units based on current incident coordinates and resource GPS
  const topOptimalUnits = useMemo(() => {
    return evaluateOptimalUnits(incident, availableResources);
  }, [incident, availableResources]);

  // Handler to simulate re-running the AI Dispatch optimization
  const handleRefreshAiAnalysis = () => {
    setIsCalculating(true);
    setTimeout(() => {
      setIsCalculating(false);
      setCalculationTimestamp(new Date().toLocaleTimeString());
      if (onDeploySuccess) {
        onDeploySuccess(
          currentLang === 'ar'
            ? 'تم تحديث مصفوفة المسافات واقتراح أفضل 3 وحدات ميدانية بنجاح.'
            : 'AI Proximity & Travel Time matrix recalculated for top 3 units.'
        );
      }
    }, 450);
  };

  // Deploy all 3 recommended units in batch
  const handleDeployAll = () => {
    let count = 0;
    topOptimalUnits.forEach((rec) => {
      if (!incident.assignedResources.includes(rec.resource.id)) {
        onDispatchResource(incident.id, rec.resource.id);
        count++;
      }
    });
    if (onDeploySuccess) {
      onDeploySuccess(
        currentLang === 'ar'
          ? `تم إرسال الرتل التكتيكي الموصى به (${count} وحدات جديدة) نحو الحريق.`
          : `Deployed full recommended task force (${count} units mobilized).`
      );
    }
  };

  const allTop3Deployed = topOptimalUnits.length > 0 && topOptimalUnits.every((rec) => 
    incident.assignedResources.includes(rec.resource.id)
  );

  const getResourceIcon = (type: EmergencyResource['type']) => {
    switch (type) {
      case 'drone':
        return <Radio className="w-4 h-4 text-cyan-400" />;
      case 'aircraft':
        return <Plane className="w-4 h-4 text-sky-400" />;
      case 'water_tanker':
        return <Droplets className="w-4 h-4 text-blue-400" />;
      default:
        return <Truck className="w-4 h-4 text-amber-400" />;
    }
  };

  return (
    <div 
      id="ai-assisted-dispatch-panel"
      className="space-y-4"
      dir={currentLang === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* AI-Assisted Dispatch Banner & Primary Trigger */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/40 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-slate-950 font-black shadow-lg shadow-amber-900/30 shrink-0">
              <Sparkles className="w-5 h-5 fill-current animate-pulse" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                  {currentLang === 'ar' 
                    ? 'نظام الإرسال الذكي بالذكاء الاصطناعي (AI-Assisted Dispatch)' 
                    : 'AI-Assisted Dispatch Engine'}
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold">
                  TOP 3 OPTIMAL UNITS
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                  {calculationTimestamp}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                {currentLang === 'ar'
                  ? 'تحليل مكاني فوري يحدد أفضل 3 وحدات تدخل ميداني بالاعتماد على إحداثيات GPS ونمذجة زمن السفر التضاريسي.'
                  : 'Real-time spatial analysis suggesting the top 3 optimal units based on live GPS coordinates, road tortuosity, and estimated travel time.'}
              </p>
            </div>
          </div>

          {/* Action Buttons: AI-Assisted Dispatch Trigger + Deploy All */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <button
              id="ai-assisted-dispatch-btn"
              onClick={handleRefreshAiAnalysis}
              disabled={isCalculating}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-950/40 transition cursor-pointer disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 text-slate-950 ${isCalculating ? 'animate-spin' : ''}`} />
              <span>
                {isCalculating
                  ? (currentLang === 'ar' ? 'جاري تحليل القرب الجغرافي...' : 'Calculating ETA...')
                  : (currentLang === 'ar' ? 'تشغيل التحليل الذكي (AI Dispatch)' : 'AI-Assisted Dispatch')}
              </span>
            </button>

            {!compact && (
              <button
                onClick={handleDeployAll}
                disabled={allTop3Deployed}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md ${
                  allTop3Deployed
                    ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/50 cursor-default'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {allTop3Deployed
                    ? (currentLang === 'ar' ? 'تم إرسال كامل الرتل الثلاثي' : 'All 3 Top Units Dispatched')
                    : (currentLang === 'ar' ? 'إرسال الرتل الثلاثي معاً' : 'Deploy All 3 Optimal Units')}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Incident Proximity Context Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-mono text-slate-300">
              <MapPin className="w-3.5 h-3.5 text-red-400" />
              <span>Target: {incident.locationName} ({incident.coordinates.lat}°N, {incident.coordinates.lng}°E)</span>
            </span>
            <span className="hidden sm:inline-block text-slate-600">•</span>
            <span className="hidden sm:inline-block text-slate-300 font-mono">
              Slope: {incident.terrainSlopeDegrees}° | Wind: {incident.windSpeedKmH} km/h {incident.windDirectionCardinal}
            </span>
          </div>
          <div className="text-[11px] font-mono text-amber-300 bg-amber-950/50 px-2 py-0.5 rounded border border-amber-800/60">
            {currentLang === 'ar' ? 'معايير التحسين: سرعة الوصول + التكامل التكتيكي' : 'Criteria: Travel Time + Tactical Complementarity'}
          </div>
        </div>
      </div>

      {/* Top 3 Optimal Units Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400 uppercase tracking-wider font-bold px-1">
          <span className="flex items-center gap-1.5 text-amber-400">
            <Award className="w-4 h-4 text-amber-400" />
            {currentLang === 'ar' ? 'أفضل 3 وحدات مقترحة وفق القرب الجغرافي وسرعة الوصول' : 'Top 3 Optimal Deployment Units (Ranked by Proximity & Travel Time)'}
          </span>
          <span className="text-[11px] font-mono lowercase text-slate-500">
            {topOptimalUnits.length} units prioritized from active fleet
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {topOptimalUnits.map((item) => {
            const isAssigned = incident.assignedResources.includes(item.resource.id);
            const rankColors = {
              1: {
                badge: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
                border: 'border-amber-500/40 hover:border-amber-500/70',
                headerBg: 'from-amber-950/30 to-slate-900',
                etaBg: 'bg-amber-950 text-amber-300 border-amber-500/60'
              },
              2: {
                badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50',
                border: 'border-cyan-500/40 hover:border-cyan-500/70',
                headerBg: 'from-cyan-950/30 to-slate-900',
                etaBg: 'bg-cyan-950 text-cyan-300 border-cyan-500/60'
              },
              3: {
                badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50',
                border: 'border-emerald-500/40 hover:border-emerald-500/70',
                headerBg: 'from-emerald-950/30 to-slate-900',
                etaBg: 'bg-emerald-950 text-emerald-300 border-emerald-500/60'
              }
            }[item.rank];

            return (
              <div
                key={item.resource.id}
                className={`rounded-2xl border ${rankColors.border} bg-slate-900/90 shadow-lg flex flex-col justify-between overflow-hidden transition-all duration-200 hover:shadow-2xl relative ${
                  isAssigned ? 'ring-1 ring-emerald-500/50' : ''
                }`}
              >
                {/* Top Rank Badge Header */}
                <div className={`p-3.5 bg-gradient-to-r ${rankColors.headerBg} border-b border-slate-800 flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-black font-mono px-2 py-0.5 rounded-full border ${rankColors.badge}`}>
                      #{item.rank} {currentLang === 'ar' ? 'الوحدة المقترحة' : 'OPTIMAL UNIT'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Score: <strong className="text-white">{item.suitabilityScore}%</strong>
                    </span>
                  </div>

                  <span className="text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    {item.resource.wilaya}
                  </span>
                </div>

                {/* Unit Details & HIGHLIGHTED TRAVEL TIME */}
                <div className="p-4 space-y-3.5 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Unit Identity */}
                    <div className="flex items-start gap-2.5">
                      <div className="p-2 rounded-xl bg-slate-800 border border-slate-700 shrink-0 mt-0.5">
                        {getResourceIcon(item.resource.type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-white text-xs px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700">
                            {item.resource.code}
                          </span>
                          <span className="text-xs font-bold text-white leading-snug">
                            {currentLang === 'ar' ? item.resource.nameAr : item.resource.name}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{item.resource.capacity || 'Tactical Intervention Unit'}</span>
                        </div>
                      </div>
                    </div>

                    {/* PROMINENTLY HIGHLIGHTED ESTIMATED TRAVEL TIME */}
                    <div className="mt-3.5 p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                        <span className="flex items-center gap-1 text-amber-300">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          {currentLang === 'ar' ? 'زمن السفر المتوقع (ETA)' : 'Estimated Travel Time'}
                        </span>
                        <span className="font-mono text-slate-500">
                          {item.accessibilityStatus}
                        </span>
                      </div>

                      {/* Large Travel Time Display */}
                      <div className="flex items-baseline justify-between">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl font-black font-mono text-emerald-400 tracking-tight">
                            {item.estimatedTravelTimeMinutes}
                          </span>
                          <span className="text-xs font-bold text-slate-300">
                            {currentLang === 'ar' ? 'دقيقة (min)' : 'minutes'}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-mono font-bold text-white flex items-center gap-1 justify-end">
                            <MapPin className="w-3 h-3 text-red-400" />
                            {item.distanceKm} km
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {item.resource.type === 'drone' || item.resource.type === 'aircraft' 
                              ? 'air corridor' 
                              : `~${(item.distanceKm * 1.38).toFixed(1)} km road run`}
                          </span>
                        </div>
                      </div>

                      {/* Travel Time Progress Meter */}
                      <div className="space-y-1 pt-1">
                        <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden flex border border-slate-800">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              item.estimatedTravelTimeMinutes <= 6
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                : item.estimatedTravelTimeMinutes <= 12
                                ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                                : 'bg-gradient-to-r from-blue-500 to-cyan-400'
                            }`}
                            style={{
                              width: `${Math.max(15, Math.min(100, 100 - (item.estimatedTravelTimeMinutes / 30) * 100))}%`
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-[9px] font-mono text-slate-500">
                          <span>{currentLang === 'ar' ? 'فوري' : 'Immediate'}</span>
                          <span>15 min</span>
                          <span>30+ min</span>
                        </div>
                      </div>
                    </div>

                    {/* Route Corridor & AI Justification */}
                    <div className="mt-3 space-y-1.5 text-[11px] text-slate-300">
                      <div className="flex items-center gap-1 text-slate-400 font-mono text-[10px]">
                        <Route className="w-3 h-3 text-cyan-400 shrink-0" />
                        <span className="truncate">
                          {currentLang === 'ar' ? item.routeCorridorAr : item.routeCorridor}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed bg-slate-800/40 p-2 rounded-lg border border-slate-700/50">
                        {currentLang === 'ar' ? item.aiJustificationAr : item.aiJustification}
                      </p>
                    </div>
                  </div>

                  {/* Deploy Action Button */}
                  <div className="pt-2 border-t border-slate-800/80">
                    <button
                      onClick={() => {
                        onDispatchResource(incident.id, item.resource.id);
                        if (onDeploySuccess) {
                          onDeploySuccess(
                            currentLang === 'ar'
                              ? `تم إرسال الوحدة ${item.resource.code} بنجاح. زمن الوصول المتوقع: ${item.estimatedTravelTimeMinutes} دقيقة.`
                              : `Dispatched unit ${item.resource.code}. ETA: ${item.estimatedTravelTimeMinutes} min.`
                          );
                        }
                      }}
                      disabled={isAssigned}
                      className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md ${
                        isAssigned
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-600/50 cursor-default'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40'
                      }`}
                    >
                      {isAssigned ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>{currentLang === 'ar' ? 'الوحدة في حالة تدخّل / بالطريق' : 'Dispatched / En Route'}</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>
                            {currentLang === 'ar' 
                              ? `إرسال الوحدة (${item.estimatedTravelTimeMinutes} دقيقة)` 
                              : `Deploy Unit (${item.estimatedTravelTimeMinutes} min ETA)`}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
