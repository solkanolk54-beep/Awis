import React, { useState, useMemo } from 'react';
import { 
  EmergencyResource, 
  WildfireIncident 
} from '../../types';
import { 
  evaluateResourceDeploymentAdvice, 
  AdvisorUnitRecommendation,
  TrafficLevel,
  RoadSurfaceType,
  PumpCondition
} from '../../services/resourceDeploymentAdvisorService';
import { 
  Sparkles, 
  Compass, 
  Truck, 
  Flame, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Gauge, 
  Droplets, 
  Wind, 
  Mountain, 
  Navigation, 
  Clock, 
  Radio, 
  Zap, 
  ChevronRight, 
  Filter, 
  Layers, 
  Users, 
  Check, 
  RefreshCw,
  Sliders,
  Car
} from 'lucide-react';

interface ResourceDeploymentAdvisorProps {
  incident: WildfireIncident;
  availableResources: EmergencyResource[];
  onDispatchResource: (incidentId: string, resourceId: string) => void;
  currentLang: 'en' | 'ar' | 'fr';
  onDeploySuccess?: (msg: string) => void;
}

export const ResourceDeploymentAdvisor: React.FC<ResourceDeploymentAdvisorProps> = ({
  incident,
  availableResources,
  onDispatchResource,
  currentLang,
  onDeploySuccess
}) => {
  // Scenario simulation state
  const [simulatedTraffic, setSimulatedTraffic] = useState<TrafficLevel>('moderate');
  const [terrainRoughness, setTerrainRoughness] = useState<'standard' | 'rugged' | 'extreme_slope'>('standard');
  const [minWaterFilter, setMinWaterFilter] = useState<number>(0);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [expandedUnitId, setExpandedUnitId] = useState<string | null>(null);
  const [dispatchedIds, setDispatchedIds] = useState<Set<string>>(
    new Set(incident.assignedResources || [])
  );
  const [isDeployingAll, setIsDeployingAll] = useState<boolean>(false);

  // Run automated evaluation engine
  const evaluation = useMemo(() => {
    return evaluateResourceDeploymentAdvice(incident, availableResources, {
      trafficOverride: simulatedTraffic,
      terrainRoughness,
      minWaterCapacity: minWaterFilter
    });
  }, [incident, availableResources, simulatedTraffic, terrainRoughness, minWaterFilter]);

  const handleSingleDispatch = (unit: AdvisorUnitRecommendation) => {
    if (dispatchedIds.has(unit.resource.id)) return;
    onDispatchResource(incident.id, unit.resource.id);
    setDispatchedIds(prev => new Set(prev).add(unit.resource.id));
    
    const msg = currentLang === 'ar'
      ? `تم إرسال الوحدة ${unit.resource.code} (${unit.resource.nameAr || unit.resource.name}) بناءً على توصية المستشار الذكي!`
      : currentLang === 'fr'
      ? `Unité ${unit.resource.code} déployée avec succès selon l'avis du Conseiller Tactique !`
      : `Unit ${unit.resource.code} successfully dispatched per Advisor recommendation!`;

    if (onDeploySuccess) onDeploySuccess(msg);
  };

  const handleDeployStrikeTeam = () => {
    setIsDeployingAll(true);
    const newSet = new Set(dispatchedIds);
    evaluation.recommendedStrikeTeam.units.forEach(u => {
      if (!newSet.has(u.resource.id)) {
        onDispatchResource(incident.id, u.resource.id);
        newSet.add(u.resource.id);
      }
    });
    setDispatchedIds(newSet);
    setTimeout(() => setIsDeployingAll(false), 800);

    const msg = currentLang === 'ar'
      ? `تم نشر حزمة التدخل التكتيكي المشترك (${evaluation.recommendedStrikeTeam.units.length} وحدات) بنجاح!`
      : currentLang === 'fr'
      ? `Équipe d'intervention combinée (${evaluation.recommendedStrikeTeam.units.length} unités) déployée avec succès !`
      : `Strike Team (${evaluation.recommendedStrikeTeam.units.length} units) successfully deployed!`;

    if (onDeploySuccess) onDeploySuccess(msg);
  };

  const topRec = evaluation.primaryRecommendation;

  // Localized text helper
  const isAr = currentLang === 'ar';
  const isFr = currentLang === 'fr';

  return (
    <div className="space-y-6 text-slate-200">
      {/* Advisor Top Banner: Automated Analysis & Live Telemetry */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/70 border border-indigo-500/40 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500/30 to-amber-500/20 border border-indigo-400/50 shadow-inner text-amber-300">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>{isAr ? 'مستشار نشر الموارد التكتيكي الآلي' : isFr ? 'Conseiller Automatisé de Déploiement des Ressources' : 'Automated Resource Deployment Advisor'}</span>
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  {isAr ? 'تحليل لحظي نشط' : isFr ? 'MCDA Temps Réel' : 'Real-Time MCDA Active'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                {isAr
                  ? 'يقوم المستشار الذكي بتحليل أسطول الحماية المدنية والغابات فورياً وفقاً لمعايير حركة المرور الآنية، تضاريس المنحدر الجبلي، ومواصفات العتاد ومستويات ضغط المضخات لتقديم التوصية التكتيكية المثلى.'
                  : isFr
                  ? 'Le conseiller évalue en temps réel la flotte disponible selon l’état du trafic, la topographie (pente/piste) et l’état du matériel (capacité d’eau, pression de pompe) pour recommander les unités les plus adaptées.'
                  : 'Automated multi-criteria decision engine (MCDA) evaluating fleet proximity, live corridor traffic, terrain slope/surface, and equipment telemetry (water payload, pump pressure, crew muster).'}
              </p>
            </div>
          </div>

          {/* Quick Scenario Controls Toggle Button */}
          <div className="flex items-center gap-2 self-start lg:self-center">
            <button
              id="advisor-toggle-scenario-filters"
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer border ${
                showFilters 
                  ? 'bg-indigo-600 text-white border-indigo-400 shadow-md' 
                  : 'bg-slate-800/90 text-slate-300 hover:text-white border-slate-700 hover:bg-slate-700'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span>{isAr ? 'محاكاة المتغيرات الميدانية' : isFr ? 'Simulateur de Conditions' : 'Live Scenario Controls'}</span>
              <span className="px-1.5 py-0.2 rounded bg-slate-900 text-[10px] font-mono text-indigo-300">
                {simulatedTraffic.toUpperCase()}
              </span>
            </button>
          </div>
        </div>

        {/* Real-time Environmental Baseline Badges */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-3 text-xs text-slate-400">
          <span className="text-[11px] font-semibold text-slate-300">
            {isAr ? 'محددات الحادث الميدانية:' : isFr ? 'Paramètres Sinistre :' : 'Incident Baseline:'}
          </span>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/60 border border-slate-700/60">
            <Mountain className="w-3.5 h-3.5 text-amber-400" />
            <span>{isAr ? 'الانحدار:' : 'Slope:'}</span>
            <span className="font-mono font-bold text-white">{evaluation.environmentalContext.incidentSlopeDegrees}° ({evaluation.environmentalContext.incidentSlopeDegrees > 20 ? (isAr ? 'شديد الوعورة' : 'Rugged Mountain') : (isAr ? 'معتدل' : 'Moderate')})</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/60 border border-slate-700/60">
            <Wind className="w-3.5 h-3.5 text-sky-400" />
            <span>{isAr ? 'الرياح:' : 'Wind:'}</span>
            <span className="font-mono font-bold text-white">{evaluation.environmentalContext.windSpeedKmH} km/h</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/60 border border-slate-700/60">
            <Flame className="w-3.5 h-3.5 text-red-400" />
            <span>{isAr ? 'مستوى الخطر:' : 'Risk:'}</span>
            <span className="font-mono font-bold uppercase text-red-300">{incident.riskLevel}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/60 border border-slate-700/60 ml-auto font-mono text-[11px]">
            <RefreshCw className="w-3 h-3 text-indigo-400" />
            <span>{isAr ? 'تم التحديث:' : 'Evaluated:'}</span>
            <span className="text-slate-300">{evaluation.evaluatedAt}</span>
          </div>
        </div>

        {/* Collapsible Simulation Controls Box */}
        {showFilters && (
          <div className="mt-4 p-4 rounded-xl bg-slate-950/80 border border-indigo-500/30 text-xs space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold text-amber-300 flex items-center gap-1.5">
                <Car className="w-4 h-4 text-amber-400" />
                {isAr ? 'محاكاة ظروف الطريق والتضاريس الحية' : isFr ? 'Simulation du Trafic et des Contraintes de Terrain' : 'Real-Time Traffic & Terrain Constraint Simulator'}
              </span>
              <button
                onClick={() => {
                  setSimulatedTraffic('moderate');
                  setTerrainRoughness('standard');
                  setMinWaterFilter(0);
                }}
                className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
              >
                {isAr ? 'إعادة ضبط للافتراضي' : isFr ? 'Réinitialiser' : 'Reset to Live Default'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Traffic Condition Toggle */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  {isAr ? 'حالة حركة المرور على الطرق:' : isFr ? 'Conditions de Circulation :' : 'Corridor Traffic Congestion:'}
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'clear', labelEn: 'Clear Highway', labelAr: 'طريق سالك', delay: '+0m' },
                    { id: 'moderate', labelEn: 'Moderate Flow', labelAr: 'حركة متوسطة', delay: '+4m' },
                    { id: 'heavy', labelEn: 'Heavy Evac Delay', labelAr: 'ازدحام إخلاء', delay: '+9m' },
                    { id: 'congested', labelEn: 'Blocked / Detour', labelAr: 'اختناق حاد', delay: '+16m' }
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => setSimulatedTraffic(t.id as TrafficLevel)}
                      className={`px-2.5 py-1.5 rounded-lg text-left transition cursor-pointer border flex items-center justify-between ${
                        simulatedTraffic === t.id
                          ? 'bg-indigo-600 text-white border-indigo-400 font-bold shadow'
                          : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      <span>{isAr ? t.labelAr : t.labelEn}</span>
                      <span className="text-[10px] font-mono text-amber-300 ml-1">{t.delay}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Terrain Roughness Toggle */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  {isAr ? 'تضاريس مسلك الوصول:' : isFr ? 'Topographie d’Accès :' : 'Terrain & Slope Severity:'}
                </label>
                <div className="space-y-1.5">
                  {[
                    { id: 'standard', labelEn: 'Standard Valley Road (12°)', labelAr: 'طريق الوادي المعتدل (12°)' },
                    { id: 'rugged', labelEn: 'Rugged Mountain Piste (22°)', labelAr: 'مسلك جبلي وعر (22°)' },
                    { id: 'extreme_slope', labelEn: 'Extreme Rocky Ridge (32° - 4x4 Only)', labelAr: 'انحدار صخري حاد (32° - دفع رباعي فقط)' }
                  ].map(tr => (
                    <button
                      key={tr.id}
                      onClick={() => setTerrainRoughness(tr.id as any)}
                      className={`w-full px-2.5 py-1.5 rounded-lg text-left transition cursor-pointer border flex items-center justify-between ${
                        terrainRoughness === tr.id
                          ? 'bg-amber-600 text-white border-amber-400 font-bold shadow'
                          : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      <span>{isAr ? tr.labelAr : tr.labelEn}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Minimum Water Payload Filter */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  {isAr ? 'الحد الأدنى لحمولة الماء:' : isFr ? 'Capacité d’Eau Minimale :' : 'Minimum Water Payload:'}
                </label>
                <div className="space-y-1.5">
                  {[
                    { val: 0, labelEn: 'All Units (Recon & Attack)', labelAr: 'كافة الوحدات (استطلاع وهجوم)' },
                    { val: 4000, labelEn: '≥ 4,000 Liters (Forest Trucks CCFM)', labelAr: '≥ 4,000 لتر (شاحنات غابات)' },
                    { val: 10000, labelEn: '≥ 10,000 Liters (Heavy Tankers / Be-200)', labelAr: '≥ 10,000 لتر (صهاريج كبرى / طائرات)' }
                  ].map(w => (
                    <button
                      key={w.val}
                      onClick={() => setMinWaterFilter(w.val)}
                      className={`w-full px-2.5 py-1.5 rounded-lg text-left transition cursor-pointer border flex items-center justify-between ${
                        minWaterFilter === w.val
                          ? 'bg-teal-600 text-white border-teal-400 font-bold shadow'
                          : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      <span>{isAr ? w.labelAr : w.labelEn}</span>
                      <Droplets className="w-3.5 h-3.5 text-sky-400" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* HERO SECTION: #1 TOP ADVISOR RECOMMENDATION */}
      {topRec && (
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-amber-950/20 to-slate-900 border-2 border-amber-500/70 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500/20 to-transparent w-72 h-full pointer-events-none" />
          
          {/* Header Badge */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-amber-500/30">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md">
                <Sparkles className="w-3.5 h-3.5 fill-current" />
                {isAr ? 'التوصية الأولى للمستشار الذكي #1' : isFr ? 'Recommandation N°1 du Conseiller' : 'Top Advisor Pick #1'}
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold">
                {isAr ? topRec.tacticalRoleAr : isFr ? topRec.tacticalRoleFr : topRec.tacticalRoleEn}
              </span>
            </div>

            {/* Composite Score Circle / Chip */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  {isAr ? 'مؤشر الملاءمة التكتيكية' : isFr ? 'Score d’Adéquation' : 'Suitability Score'}
                </div>
                <div className="text-2xl font-black font-mono text-emerald-400 leading-none">
                  {topRec.compositeScore}
                  <span className="text-xs text-slate-400 font-normal">/100</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-full border-4 border-emerald-500/40 bg-slate-950 flex items-center justify-center font-black text-emerald-300 text-base shadow-inner">
                {topRec.compositeScore}
              </div>
            </div>
          </div>

          {/* Unit Core Identity & High-Level Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-4 items-center">
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-amber-400">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>{isAr ? (topRec.resource.nameAr || topRec.resource.name) : topRec.resource.name}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-300 font-mono text-xs border border-slate-700">
                      {topRec.resource.code}
                    </span>
                  </h4>
                  <div className="text-xs text-slate-400 flex items-center gap-3 mt-0.5">
                    <span>{topRec.resource.capacity}</span>
                    <span>•</span>
                    <span className="font-mono text-slate-300">{topRec.resource.wilaya} Base</span>
                  </div>
                </div>
              </div>

              {/* Rationale Verdict Quote Box */}
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-amber-500/30 text-xs text-slate-200 leading-relaxed font-sans">
                <div className="font-bold text-amber-400 mb-1 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isAr ? 'مبررات المستشار التكتيكي الآلي:' : isFr ? 'Justification de l’Algorithme Conseiller :' : 'Automated Tactical Rationale:'}</span>
                </div>
                <p>{isAr ? topRec.verdictAr : isFr ? topRec.verdictFr : topRec.verdictEn}</p>
              </div>

              {/* Key Advantages Tags */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  {isAr ? 'المزايا التكتيكية المحسوبة:' : isFr ? 'Avantages Décisifs :' : 'Evaluated Key Advantages:'}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(isAr ? topRec.keyAdvantagesAr : isFr ? topRec.keyAdvantagesFr : topRec.keyAdvantagesEn).map((adv, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-emerald-950/50 text-emerald-300 border border-emerald-500/30 text-xs flex items-center gap-1.5"
                    >
                      <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span>{adv}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Sub-Scores Matrix & Big Dispatch Button */}
            <div className="lg:col-span-5 p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {/* Proximity & ETA */}
                <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" />
                      {isAr ? 'زمن الوصول' : 'Est. Arrival'}
                    </span>
                    <span className="font-mono font-bold text-white">{topRec.estimatedArrivalMinutes} min</span>
                  </div>
                  <div className="text-xs font-mono font-bold text-amber-300">
                    {topRec.directDistanceKm} km <span className="text-[10px] text-slate-500">({topRec.effectiveRouteKm}km road)</span>
                  </div>
                </div>

                {/* Real-Time Traffic Delay */}
                <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span className="flex items-center gap-1">
                      <Car className="w-3 h-3 text-sky-400" />
                      {isAr ? 'حركة المرور' : 'Corridor Flow'}
                    </span>
                    <span className={`font-mono font-bold ${topRec.traffic.level === 'clear' ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {topRec.traffic.level.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-300 truncate" title={topRec.traffic.corridorNameEn}>
                    {topRec.traffic.roadNumber} ({topRec.traffic.delayMinutes > 0 ? `+${topRec.traffic.delayMinutes}m delay` : 'Clear'})
                  </div>
                </div>

                {/* Terrain Compatibility */}
                <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span className="flex items-center gap-1">
                      <Mountain className="w-3 h-3 text-emerald-400" />
                      {isAr ? 'ملاءمة التضاريس' : 'Terrain Match'}
                    </span>
                    <span className="font-mono font-bold text-emerald-400">{topRec.scores.terrain}%</span>
                  </div>
                  <div className="text-[11px] text-slate-300 font-mono">
                    {topRec.terrain.incidentSlopeDegrees}° Slope ({topRec.equipment.isAllTerrain4x4 ? '4x4 OK' : 'Standard Road'})
                  </div>
                </div>

                {/* Equipment & Pump Status */}
                <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span className="flex items-center gap-1">
                      <Gauge className="w-3 h-3 text-purple-400" />
                      {isAr ? 'جاهزية العتاد' : 'Pump / Water'}
                    </span>
                    <span className="font-mono font-bold text-purple-400">{topRec.scores.equipment}%</span>
                  </div>
                  <div className="text-[11px] text-slate-300 font-mono">
                    {topRec.equipment.waterCapacityLiters > 0 ? `${topRec.equipment.currentWaterLiters.toLocaleString()}L • ${topRec.equipment.pumpPressureBar} bar` : 'Recon Pod'}
                  </div>
                </div>
              </div>

              {/* Sub-Score Bars Breakdown */}
              <div className="space-y-2 pt-2 border-t border-slate-800/80 text-[11px]">
                <div>
                  <div className="flex justify-between text-slate-400 mb-0.5">
                    <span>{isAr ? 'القرب والمسافة (30%):' : 'Proximity & ETA (30%):'}</span>
                    <span className="font-mono text-white">{topRec.scores.proximity}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${topRec.scores.proximity}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 mb-0.5">
                    <span>{isAr ? 'انسيابية المرور (25%):' : 'Traffic Clearance (25%):'}</span>
                    <span className="font-mono text-white">{topRec.scores.traffic}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-sky-500 rounded-full" style={{ width: `${topRec.scores.traffic}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 mb-0.5">
                    <span>{isAr ? 'تجاوز المنحدر والتضاريس (25%):' : 'Terrain Slope & Track (25%):'}</span>
                    <span className="font-mono text-white">{topRec.scores.terrain}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${topRec.scores.terrain}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 mb-0.5">
                    <span>{isAr ? 'سعة الماء وضغط المضخة (20%):' : 'Equipment Payload & Pump (20%):'}</span>
                    <span className="font-mono text-white">{topRec.scores.equipment}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${topRec.scores.equipment}%` }} />
                  </div>
                </div>
              </div>

              {/* Action Button: Confirm Advisor Top Pick */}
              <button
                id="advisor-dispatch-top-pick-btn"
                onClick={() => handleSingleDispatch(topRec)}
                disabled={dispatchedIds.has(topRec.resource.id)}
                className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-lg ${
                  dispatchedIds.has(topRec.resource.id)
                    ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-950/40'
                }`}
              >
                {dispatchedIds.has(topRec.resource.id) ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{isAr ? 'الوحدة قيد الانتشار بالفعل' : isFr ? 'Unité Déjà Déployée' : 'Unit Already Dispatched'}</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-current" />
                    <span>{isAr ? `تأكيد ونشر ${topRec.resource.code} بناءً على توصية المستشار` : isFr ? `Confirmer & Déployer ${topRec.resource.code}` : `Confirm & Deploy ${topRec.resource.code}`}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMBINED MULTI-UNIT STRIKE TEAM PACKAGE */}
      {evaluation.recommendedStrikeTeam && evaluation.recommendedStrikeTeam.units.length > 1 && (
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-teal-500/40 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 font-mono text-[11px] font-bold border border-teal-500/30">
                  {isAr ? 'حزمة التدخل التكتيكي المشترك' : isFr ? 'Équipe d’Intervention Combinée' : 'Automated Strike Team Package'}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {evaluation.recommendedStrikeTeam.units.length} {isAr ? 'وحدات متكاملة' : 'Coordinated Units'}
                </span>
              </div>
              <h4 className="text-sm font-bold text-white mt-1">
                {isAr ? evaluation.recommendedStrikeTeam.packageNameAr : isFr ? evaluation.recommendedStrikeTeam.packageNameFr : evaluation.recommendedStrikeTeam.packageNameEn}
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                {isAr ? evaluation.recommendedStrikeTeam.descriptionAr : isFr ? evaluation.recommendedStrikeTeam.descriptionFr : evaluation.recommendedStrikeTeam.descriptionEn}
              </p>
            </div>

            {/* Quick Deploy Strike Team Button */}
            <button
              id="advisor-deploy-strike-team-btn"
              onClick={handleDeployStrikeTeam}
              disabled={isDeployingAll || evaluation.recommendedStrikeTeam.units.every(u => dispatchedIds.has(u.resource.id))}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer whitespace-nowrap self-start sm:self-auto shadow-md ${
                evaluation.recommendedStrikeTeam.units.every(u => dispatchedIds.has(u.resource.id))
                  ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
                  : 'bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-black shadow-teal-950/40'
              }`}
            >
              {evaluation.recommendedStrikeTeam.units.every(u => dispatchedIds.has(u.resource.id)) ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{isAr ? 'تم نشر الحزمة بالكامل' : isFr ? 'Équipe Intégrale Déployée' : 'Full Strike Team Deployed'}</span>
                </>
              ) : (
                <>
                  <Layers className="w-4 h-4" />
                  <span>{isAr ? 'نشر كامل الحزمة التكتيكية المشتركة' : isFr ? 'Déployer l’Équipe Combinée' : 'Deploy Complete Strike Team'}</span>
                </>
              )}
            </button>
          </div>

          {/* Combined Metrics Ticker */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400">
                <Droplets className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400">{isAr ? 'إجمالي حمولة الماء' : 'Combined Water'}</div>
                <div className="font-mono font-bold text-white text-sm">
                  {evaluation.recommendedStrikeTeam.combinedWaterLiters.toLocaleString()} L
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400">{isAr ? 'قوة الأفراد الإجمالية' : 'Total Personnel'}</div>
                <div className="font-mono font-bold text-white text-sm">
                  {evaluation.recommendedStrikeTeam.combinedCrew} {isAr ? 'عنصراً' : 'Firefighters'}
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400">{isAr ? 'متوسط زمن الوصول' : 'Avg Arrival ETA'}</div>
                <div className="font-mono font-bold text-white text-sm">
                  ~{evaluation.recommendedStrikeTeam.averageArrivalMinutes} min
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400">{isAr ? 'معدل التآزر التكتيكي' : 'Synergy Score'}</div>
                <div className="font-mono font-bold text-emerald-400 text-sm">
                  {evaluation.recommendedStrikeTeam.synergyScore}%
                </div>
              </div>
            </div>
          </div>

          {/* Units in the package */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            {evaluation.recommendedStrikeTeam.units.map((u, idx) => (
              <div
                key={u.resource.id}
                className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-slate-800 text-amber-400 font-mono text-xs font-bold flex items-center justify-center">
                    #{idx + 1}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>{u.resource.code}</span>
                      <span className="text-[10px] font-normal text-slate-400">({u.resource.type})</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {u.directDistanceKm}km • {u.estimatedArrivalMinutes}m ETA
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleSingleDispatch(u)}
                  disabled={dispatchedIds.has(u.resource.id)}
                  className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    dispatchedIds.has(u.resource.id)
                      ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700'
                  }`}
                  title={dispatchedIds.has(u.resource.id) ? 'Dispatched' : 'Deploy unit'}
                >
                  {dispatchedIds.has(u.resource.id) ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ALL RANKED FLEET RECOMMENDATIONS LIST */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-white">
              {isAr ? 'ترتيب الأسطول الكامل وفقاً للملاءمة التكتيكية' : isFr ? 'Classement Intégral de la Flotte par Adéquation' : 'Complete Fleet Ranking & Multi-Criteria Analysis'}
            </h4>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-xs font-mono">
              {evaluation.rankedRecommendations.length} {isAr ? 'وحدات' : 'Units'}
            </span>
          </div>

          <span className="text-xs text-slate-400 font-mono hidden sm:inline-block">
            {isAr ? 'المسافة • المرور • التضاريس • العتاد' : 'Proximity • Traffic • Terrain • Equipment'}
          </span>
        </div>

        <div className="space-y-3">
          {evaluation.rankedRecommendations.map((unit) => {
            const isTop = unit.rank === 1;
            const isDispatched = dispatchedIds.has(unit.resource.id);
            const isExpanded = expandedUnitId === unit.resource.id;

            return (
              <div
                key={unit.resource.id}
                className={`rounded-2xl border transition overflow-hidden ${
                  isTop
                    ? 'bg-slate-900/90 border-amber-500/50 shadow-lg'
                    : isDispatched
                    ? 'bg-slate-900/60 border-emerald-500/30'
                    : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Main Card Header Bar */}
                <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left Identity & Rank */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-black font-mono text-sm shrink-0 border ${
                        unit.rank === 1
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : unit.rank === 2
                          ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                          : unit.rank === 3
                          ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      #{unit.rank}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-sm">
                          {isAr ? (unit.resource.nameAr || unit.resource.name) : unit.resource.name}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-300 font-mono text-xs border border-slate-700">
                          {unit.resource.code}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          • {isAr ? unit.tacticalRoleAr : isFr ? unit.tacticalRoleFr : unit.tacticalRoleEn}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{unit.resource.capacity}</span>
                        <span>•</span>
                        <span className="font-mono text-slate-300">{unit.resource.wilaya}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Telemetry Chips & Action */}
                  <div className="flex items-center gap-4 flex-wrap self-end md:self-auto">
                    {/* Scores & Metrics Summary */}
                    <div className="flex items-center gap-3 text-xs">
                      {/* ETA */}
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 justify-end">
                          <Clock className="w-3 h-3 text-amber-400" />
                          {isAr ? 'زمن الوصول' : 'Est. Arrival'}
                        </div>
                        <div className="font-mono font-bold text-white">
                          ~{unit.estimatedArrivalMinutes} min
                        </div>
                      </div>

                      {/* Distance */}
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400">
                          {isAr ? 'المسافة' : 'Distance'}
                        </div>
                        <div className="font-mono font-bold text-slate-300">
                          {unit.directDistanceKm} km
                        </div>
                      </div>

                      {/* Score */}
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400">
                          {isAr ? 'الدرجة' : 'Score'}
                        </div>
                        <div className={`font-mono font-black text-sm ${unit.compositeScore >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {unit.compositeScore}%
                        </div>
                      </div>
                    </div>

                    {/* Dispatch Button */}
                    <button
                      id={`advisor-dispatch-unit-${unit.resource.code.toLowerCase()}`}
                      onClick={() => handleSingleDispatch(unit)}
                      disabled={isDispatched}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer ${
                        isDispatched
                          ? 'bg-slate-800 text-emerald-400 border border-slate-700 cursor-not-allowed'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 shadow'
                      }`}
                    >
                      {isDispatched ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{isAr ? 'مُرسلة' : 'Dispatched'}</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5 text-amber-400" />
                          <span>{isAr ? 'إرسال' : 'Deploy'}</span>
                        </>
                      )}
                    </button>

                    {/* Details Accordion Toggle */}
                    <button
                      onClick={() => setExpandedUnitId(isExpanded ? null : unit.resource.id)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                      title="Toggle detailed analysis"
                    >
                      <ChevronRight className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Expanded Telemetry & Breakdown Section */}
                {isExpanded && (
                  <div className="p-4 bg-slate-950/80 border-t border-slate-800/80 text-xs space-y-4 animate-in fade-in duration-150">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Traffic Breakdown */}
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                        <div className="font-bold text-sky-400 flex items-center gap-1.5">
                          <Car className="w-3.5 h-3.5" />
                          <span>{isAr ? 'تحليل مسار حركة المرور' : 'Corridor & Traffic Telemetry'}</span>
                        </div>
                        <div className="text-slate-300">
                          <span className="text-slate-400">{isAr ? 'المسار:' : 'Corridor:'}</span> {unit.traffic.corridorNameEn} ({unit.traffic.roadNumber})
                        </div>
                        <div className="text-slate-300">
                          <span className="text-slate-400">{isAr ? 'حالة الطريق:' : 'Flow Status:'}</span>{' '}
                          <span className="font-mono uppercase font-bold text-amber-300">{unit.traffic.level}</span> ({unit.traffic.delayMinutes > 0 ? `+${unit.traffic.delayMinutes}m delay` : 'No delay'})
                        </div>
                        {unit.traffic.bottleneckDetected && (
                          <div className="p-2 rounded bg-amber-950/40 border border-amber-500/30 text-amber-300 text-[11px]">
                            ⚠️ {isAr ? unit.traffic.bottleneckReasonAr : unit.traffic.bottleneckReason}
                          </div>
                        )}
                      </div>

                      {/* Terrain Breakdown */}
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                        <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                          <Mountain className="w-3.5 h-3.5" />
                          <span>{isAr ? 'تحليل التضاريس والمسالك' : 'Terrain & Slope Analysis'}</span>
                        </div>
                        <div className="text-slate-300">
                          <span className="text-slate-400">{isAr ? 'انحدار الموقع:' : 'Incident Slope:'}</span> {unit.terrain.incidentSlopeDegrees}° (Max vehicle limit: {unit.equipment.maxNavigableSlopeDegrees}°)
                        </div>
                        <div className="text-slate-300">
                          <span className="text-slate-400">{isAr ? 'طبيعة المسلك:' : 'Surface Type:'}</span> {unit.terrain.roadSurface.replace('_', ' ')}
                        </div>
                        {unit.terrain.slopeWarning ? (
                          <div className="p-2 rounded bg-red-950/40 border border-red-500/30 text-red-300 text-[11px]">
                            ⚠️ {isAr ? unit.terrain.slopeWarningAr : unit.terrain.slopeWarning}
                          </div>
                        ) : (
                          <div className="text-[11px] text-emerald-300 flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            {isAr ? 'هيكل المركبة ملائم تماماً للانحدار والمسلك' : 'Chassis 100% compatible with terrain'}
                          </div>
                        )}
                      </div>

                      {/* Equipment Breakdown */}
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                        <div className="font-bold text-purple-400 flex items-center gap-1.5">
                          <Gauge className="w-3.5 h-3.5" />
                          <span>{isAr ? 'حالة العتاد والمضخات' : 'Equipment Status & Telemetry'}</span>
                        </div>
                        <div className="text-slate-300">
                          <span className="text-slate-400">{isAr ? 'خزان الماء:' : 'Water Tank:'}</span> {unit.equipment.waterCapacityLiters > 0 ? `${unit.equipment.currentWaterLiters.toLocaleString()}L / ${unit.equipment.waterCapacityLiters.toLocaleString()}L (${unit.equipment.waterPercentage}%)` : 'Recon Sensors'}
                        </div>
                        <div className="text-slate-300">
                          <span className="text-slate-400">{isAr ? 'ضغط المضخة:' : 'Pump Pressure:'}</span> {unit.equipment.pumpPressureBar} bar ({unit.equipment.pumpStatus})
                        </div>
                        <div className="text-slate-300">
                          <span className="text-slate-400">{isAr ? 'طاقم التدخل:' : 'Crew Muster:'}</span> {unit.equipment.crewSize} {isAr ? 'أفراد' : 'members'} ({unit.equipment.crewReadiness.replace('_', ' ')})
                        </div>
                      </div>
                    </div>

                    {/* Full Verdict */}
                    <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
                      <span className="font-bold text-amber-400">{isAr ? 'خلاصة المستشار:' : 'Advisor Summary:'} </span>
                      <span className="text-slate-200">{isAr ? unit.verdictAr : isFr ? unit.verdictFr : unit.verdictEn}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
