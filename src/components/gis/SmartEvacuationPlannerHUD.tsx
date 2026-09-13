import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Navigation, 
  AlertTriangle, 
  Users, 
  Truck, 
  CheckCircle2, 
  X, 
  Maximize2, 
  Minimize2, 
  Share2, 
  Radio, 
  Layers, 
  MapPin, 
  Compass, 
  PhoneCall, 
  Building2, 
  Flame, 
  Wind,
  Copy,
  Check
} from 'lucide-react';
import { 
  CalculatedEvacuationRoute, 
  SafeEvacuationZone, 
  Language, 
  EvacuationPlanScenario 
} from '../../types';
import { 
  AT_RISK_SETTLEMENTS, 
  CivilianSettlement 
} from '../../data/algerianRoadNetwork';
import { 
  generateCivilDefenseEvacuationBroadcast 
} from '../../services/smartEvacuationEngine';

interface SmartEvacuationPlannerHUDProps {
  plan: EvacuationPlanScenario;
  selectedSettlement: CivilianSettlement;
  onSelectSettlement: (settlement: CivilianSettlement) => void;
  selectedRoute: CalculatedEvacuationRoute | null;
  onSelectRoute: (route: CalculatedEvacuationRoute | null) => void;
  showRoadNetwork: boolean;
  onToggleRoadNetwork: () => void;
  showSmokeCone: boolean;
  onToggleSmokeCone: () => void;
  showShelters: boolean;
  onToggleShelters: () => void;
  onClose: () => void;
  currentLang: Language;
}

export const SmartEvacuationPlannerHUD: React.FC<SmartEvacuationPlannerHUDProps> = ({
  plan,
  selectedSettlement,
  onSelectSettlement,
  selectedRoute,
  onSelectRoute,
  showRoadNetwork,
  onToggleRoadNetwork,
  showSmokeCone,
  onToggleSmokeCone,
  showShelters,
  onToggleShelters,
  onClose,
  currentLang
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<'routes' | 'navigation' | 'logistics' | 'broadcast'>('routes');
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchedSuccess, setDispatchedSuccess] = useState(false);
  const [copiedBroadcast, setCopiedBroadcast] = useState(false);

  const isRtl = currentLang === 'ar';

  // Routes associated with selected settlement
  const settlementRoutes = plan.settlementRoutes.filter(
    (r) => r.settlementId === selectedSettlement.id
  );

  const primaryRoute = settlementRoutes.find((r) => r.routeType === 'primary_optimal') || settlementRoutes[0];
  const secondaryRoute = settlementRoutes.find((r) => r.routeType === 'secondary_contingency') || settlementRoutes[1];

  const currentActiveRoute = selectedRoute || primaryRoute;

  // Handle convoy dispatch action
  const handleDispatchConvoys = () => {
    setIsDispatching(true);
    setTimeout(() => {
      setIsDispatching(false);
      setDispatchedSuccess(true);
      setTimeout(() => setDispatchedSuccess(false), 5000);
    }, 1200);
  };

  // Generate broadcast text
  const broadcastData = currentActiveRoute 
    ? generateCivilDefenseEvacuationBroadcast(currentActiveRoute, selectedSettlement, currentLang)
    : null;

  const handleCopyBroadcast = () => {
    if (!broadcastData) return;
    navigator.clipboard.writeText(`${broadcastData.title}\n\n${broadcastData.body}\n\n${broadcastData.urgentActionText}`);
    setCopiedBroadcast(true);
    setTimeout(() => setCopiedBroadcast(false), 3000);
  };

  return (
    <div
      id="smart-evacuation-planner-hud"
      className={`absolute bottom-6 left-6 z-30 flex flex-col bg-slate-900/95 backdrop-blur-md border border-emerald-500/40 rounded-xl shadow-2xl transition-all duration-200 text-white ${
        isMinimized ? 'w-80 h-14 overflow-hidden' : 'w-[460px] max-h-[85vh] overflow-y-auto'
      }`}
      dir={isRtl ? 'rtl' : 'ltr'}
      style={{
        boxShadow: '0 0 30px rgba(16, 185, 129, 0.25), 0 20px 25px -5px rgba(0, 0, 0, 0.6)'
      }}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border-b border-emerald-500/30">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-600/30 border border-emerald-500/50 rounded-lg text-emerald-400">
            <Navigation className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100">
                {currentLang === 'ar' 
                  ? 'مخطط الإخلاء الذكي للمدنيين' 
                  : currentLang === 'fr' 
                  ? 'Planificateur d’Évacuation Intelligent' 
                  : 'Smart Civilian Evacuation Planner'}
              </h3>
              <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded">
                GIS + ROAD GRAPH
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              {currentLang === 'ar' ? 'شبكة الطرق الوطنية • الممرات الآمنة • مراكز الإيواء' : 'Algeria Road Corridors • Safe Havens • Convoys'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-emerald-500/20 rounded text-slate-400 hover:text-emerald-300"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="p-4 space-y-4 text-xs">
          {/* Target Community / Settlement Selector Dropdown */}
          <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-lg space-y-1.5">
            <label className="text-[10px] text-slate-400 uppercase font-semibold flex items-center justify-between">
              <span>{currentLang === 'ar' ? 'المجتمع السكني المعرض للخطر:' : 'At-Risk Civilian Community:'}</span>
              <span className="text-amber-400 font-mono">
                👥 {selectedSettlement.population} {currentLang === 'ar' ? 'نسمة' : 'residents'}
              </span>
            </label>
            <select
              value={selectedSettlement.id}
              onChange={(e) => {
                const found = AT_RISK_SETTLEMENTS.find((s) => s.id === e.target.value);
                if (found) {
                  onSelectSettlement(found);
                  onSelectRoute(null);
                }
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-medium focus:outline-none focus:border-emerald-500"
            >
              {AT_RISK_SETTLEMENTS.map((settlement) => (
                <option key={settlement.id} value={settlement.id}>
                  {currentLang === 'ar' ? settlement.nameAr : settlement.nameEn} ({settlement.wilaya} • {settlement.population} pop)
                </option>
              ))}
            </select>
          </div>

          {/* Operational Safety KPIs */}
          {currentActiveRoute && (
            <div className="grid grid-cols-4 gap-2">
              <div className="p-2 bg-slate-800/80 border border-slate-700/60 rounded-lg">
                <span className="text-[10px] text-slate-400 uppercase tracking-tight block">
                  {currentLang === 'ar' ? 'وقت الإخلاء' : 'Clearance Time'}
                </span>
                <span className="text-sm font-bold font-mono text-emerald-400">
                  {currentActiveRoute.estimatedEvacuationClearanceMinutes} <span className="text-[10px] font-normal text-slate-400">min</span>
                </span>
                <span className="text-[9px] text-slate-500 block font-mono">
                  Transit: {currentActiveRoute.estimatedTravelMinutes}m
                </span>
              </div>

              <div className="p-2 bg-slate-800/80 border border-slate-700/60 rounded-lg">
                <span className="text-[10px] text-slate-400 uppercase tracking-tight block">
                  {currentLang === 'ar' ? 'المسافة' : 'Distance'}
                </span>
                <span className="text-sm font-bold font-mono text-cyan-400">
                  {currentActiveRoute.totalDistanceKm} <span className="text-[10px] font-normal text-slate-400">km</span>
                </span>
                <span className="text-[9px] text-slate-500 block font-mono">
                  {currentActiveRoute.instructions.length} steps
                </span>
              </div>

              <div className="p-2 bg-slate-800/80 border border-slate-700/60 rounded-lg">
                <span className="text-[10px] text-slate-400 uppercase tracking-tight block">
                  {currentLang === 'ar' ? 'الأمان عن النار' : 'Fire Margin'}
                </span>
                <span className={`text-sm font-bold font-mono ${
                  currentActiveRoute.minFireClearanceKm > 3.0 ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {currentActiveRoute.minFireClearanceKm} <span className="text-[10px] font-normal text-slate-400">km</span>
                </span>
                <span className="text-[9px] text-slate-500 block font-mono">
                  Plume: {currentActiveRoute.smokeExposureRisk.toUpperCase()}
                </span>
              </div>

              <div className="p-2 bg-slate-800/80 border border-slate-700/60 rounded-lg">
                <span className="text-[10px] text-slate-400 uppercase tracking-tight block">
                  {currentLang === 'ar' ? 'قوافل الإسناد' : 'Convoys'}
                </span>
                <span className="text-sm font-bold font-mono text-amber-400">
                  {currentActiveRoute.logisticsRequired.ambulances + currentActiveRoute.logisticsRequired.buses} <span className="text-[10px] font-normal text-slate-400">units</span>
                </span>
                <span className="text-[9px] text-slate-500 block font-mono">
                  {currentActiveRoute.logisticsRequired.ambulances} Amb • {currentActiveRoute.logisticsRequired.buses} Bus
                </span>
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex border-b border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('routes')}
              className={`pb-2 px-3 font-semibold border-b-2 transition-colors ${
                activeTab === 'routes'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              {currentLang === 'ar' ? 'المسارات الآمنة' : 'Safe Routes'}
            </button>
            <button
              onClick={() => setActiveTab('navigation')}
              className={`pb-2 px-3 font-semibold border-b-2 transition-colors ${
                activeTab === 'navigation'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              {currentLang === 'ar' ? 'إرشادات التوجيه' : 'Turn-by-Turn'}
            </button>
            <button
              onClick={() => setActiveTab('logistics')}
              className={`pb-2 px-3 font-semibold border-b-2 transition-colors ${
                activeTab === 'logistics'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              {currentLang === 'ar' ? 'اللوجستيات والإسناد' : 'Logistics & Convoys'}
            </button>
            <button
              onClick={() => setActiveTab('broadcast')}
              className={`pb-2 px-3 font-semibold border-b-2 transition-colors ${
                activeTab === 'broadcast'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              {currentLang === 'ar' ? 'بث الإنذار' : 'Alert Broadcast'}
            </button>
          </div>

          {/* TAB 1: Route Selection & Comparison */}
          {activeTab === 'routes' && (
            <div className="space-y-3">
              {/* Primary Optimal Route Card */}
              {primaryRoute && (
                <div
                  onClick={() => onSelectRoute(primaryRoute)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    currentActiveRoute?.id === primaryRoute.id
                      ? 'bg-emerald-950/40 border-emerald-500 shadow-md shadow-emerald-950/50'
                      : 'bg-slate-800/60 border-slate-700/80 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                      <span className="font-bold text-slate-100 text-xs">
                        {currentLang === 'ar' ? 'المسار الأساسي الأمثل' : 'Primary Optimal Route'}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      RECOMMENDED
                    </span>
                  </div>

                  <div className="mt-2 text-[11px] text-slate-300 flex items-center justify-between">
                    <span>
                      🎯 {currentLang === 'ar' ? primaryRoute.safeZone.nameAr : primaryRoute.safeZone.nameEn}
                    </span>
                    <span className="font-mono font-bold text-emerald-300">
                      {primaryRoute.totalDistanceKm} km • {primaryRoute.estimatedTravelMinutes} min
                    </span>
                  </div>

                  <div className="mt-1.5 flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                    <span>Clearance: {primaryRoute.minFireClearanceKm} km from fire</span>
                    <span>Smoke: {primaryRoute.smokeExposureRisk}</span>
                  </div>
                </div>
              )}

              {/* Secondary Contingency Route Card */}
              {secondaryRoute && (
                <div
                  onClick={() => onSelectRoute(secondaryRoute)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    currentActiveRoute?.id === secondaryRoute.id
                      ? 'bg-amber-950/40 border-amber-500 shadow-md shadow-amber-950/50'
                      : 'bg-slate-800/60 border-slate-700/80 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <span className="font-bold text-slate-100 text-xs">
                        {currentLang === 'ar' ? 'المسار الاحتياطي البديل' : 'Secondary Contingency Route'}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      BACKUP AXIS
                    </span>
                  </div>

                  <div className="mt-2 text-[11px] text-slate-300 flex items-center justify-between">
                    <span>
                      🎯 {currentLang === 'ar' ? secondaryRoute.safeZone.nameAr : secondaryRoute.safeZone.nameEn}
                    </span>
                    <span className="font-mono font-bold text-amber-300">
                      {secondaryRoute.totalDistanceKm} km • {secondaryRoute.estimatedTravelMinutes} min
                    </span>
                  </div>

                  <div className="mt-1.5 flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                    <span>Clearance: {secondaryRoute.minFireClearanceKm} km from fire</span>
                    <span>Smoke: {secondaryRoute.smokeExposureRisk}</span>
                  </div>
                </div>
              )}

              {/* Designated Safe Shelter Info Box */}
              {currentActiveRoute && (
                <div className="p-3 bg-slate-950/80 border border-emerald-500/30 rounded-lg space-y-1.5">
                  <div className="flex items-center justify-between text-emerald-400 font-bold">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>{currentLang === 'ar' ? 'مركز الاستقبال والإيواء المحدد:' : 'Designated Reception Haven:'}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      {currentActiveRoute.safeZone.wilaya}
                    </span>
                  </div>

                  <div className="text-slate-200 font-medium text-xs">
                    {currentLang === 'ar' ? currentActiveRoute.safeZone.nameAr : currentActiveRoute.safeZone.nameEn}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400 pt-1">
                    <div>Capacity: <span className="text-white">{currentActiveRoute.safeZone.capacityPersons} persons</span></div>
                    <div>Available Beds: <span className="text-emerald-400">{currentActiveRoute.safeZone.availableBeds} beds</span></div>
                    <div>Medical Team: <span className="text-emerald-400">{currentActiveRoute.safeZone.hasMedicalSupport ? '✓ Deployed' : 'No'}</span></div>
                    <div>Helipad: <span className="text-cyan-400">{currentActiveRoute.safeZone.hasHelipad ? '✓ Ready' : 'No'}</span></div>
                  </div>

                  <div className="text-[10px] text-slate-400 flex items-center gap-1 pt-1 border-t border-slate-800">
                    <Radio className="w-3 h-3 text-amber-400" />
                    <span>VHF Radio: <span className="font-mono text-amber-300">{currentActiveRoute.safeZone.emergencyVhfFrequency}</span></span>
                  </div>
                </div>
              )}

              {/* GIS Overlay Layer Controls */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800 text-[11px]">
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={showRoadNetwork}
                    onChange={onToggleRoadNetwork}
                    className="rounded bg-slate-800 border-slate-700 text-emerald-600 focus:ring-0"
                  />
                  <span>Road Corridors</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={showSmokeCone}
                    onChange={onToggleSmokeCone}
                    className="rounded bg-slate-800 border-slate-700 text-emerald-600 focus:ring-0"
                  />
                  <span>Smoke Plume</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={showShelters}
                    onChange={onToggleShelters}
                    className="rounded bg-slate-800 border-slate-700 text-emerald-600 focus:ring-0"
                  />
                  <span>Safe Shelters</span>
                </label>
              </div>
            </div>
          )}

          {/* TAB 2: Turn-by-Turn Guidance Instructions */}
          {activeTab === 'navigation' && currentActiveRoute && (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              <div className="text-[11px] text-slate-300 font-semibold mb-1">
                {currentLang === 'ar' ? 'خطوات التوجيه الميداني خطوة بخطوة:' : 'Field Navigation & Evacuation Steps:'}
              </div>

              {currentActiveRoute.instructions.map((step) => (
                <div
                  key={step.stepNumber}
                  className="p-2.5 bg-slate-800/70 border border-slate-700/60 rounded-lg flex items-start gap-2.5 text-xs"
                >
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center font-bold text-[10px] text-emerald-300 shrink-0 mt-0.5">
                    {step.stepNumber}
                  </div>
                  <div className="space-y-0.5 flex-1">
                    <p className="text-slate-100 font-medium leading-relaxed">
                      {currentLang === 'ar' 
                        ? step.instructionAr 
                        : currentLang === 'fr' 
                        ? step.instructionFr 
                        : step.instructionEn}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>{step.roadName}</span>
                      <span>{step.distanceKm} km</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: Logistics & Convoy Dispatch */}
          {activeTab === 'logistics' && currentActiveRoute && (
            <div className="space-y-3">
              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg space-y-2">
                <div className="text-slate-300 font-bold text-xs flex items-center justify-between">
                  <span>{currentLang === 'ar' ? 'توزيع الفئات السكانية:' : 'Civilian Population Breakdown:'}</span>
                  <span className="text-amber-400 font-mono">{selectedSettlement.population} pop</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                  <div className="p-2 bg-slate-800/80 rounded border border-slate-700">
                    <span className="text-slate-400 block">General Population:</span>
                    <span className="text-sm font-bold text-white">
                      {selectedSettlement.population - selectedSettlement.vulnerableCount}
                    </span>
                  </div>
                  <div className="p-2 bg-slate-800/80 rounded border border-slate-700">
                    <span className="text-amber-400 block">Elderly / Reduced Mobility:</span>
                    <span className="text-sm font-bold text-amber-300">
                      {selectedSettlement.vulnerableCount}
                    </span>
                  </div>
                </div>
              </div>

              {/* Escort Fleet Requirements */}
              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg space-y-2">
                <div className="text-slate-300 font-bold text-xs">
                  {currentLang === 'ar' ? 'عتاد الإسناد المطلوب تجهيزه فوراً:' : 'Civil Defense Escort Assets Required:'}
                </div>

                <div className="grid grid-cols-3 gap-2 text-[10px] font-mono text-center">
                  <div className="p-2 bg-slate-800/80 rounded border border-slate-700">
                    <Truck className="w-4 h-4 mx-auto text-blue-400 mb-1" />
                    <span className="text-slate-400 block">Evac Buses</span>
                    <span className="text-sm font-bold text-white">{currentActiveRoute.logisticsRequired.buses}</span>
                  </div>
                  <div className="p-2 bg-slate-800/80 rounded border border-slate-700">
                    <PhoneCall className="w-4 h-4 mx-auto text-red-400 mb-1" />
                    <span className="text-slate-400 block">Ambulances</span>
                    <span className="text-sm font-bold text-red-400">{currentActiveRoute.logisticsRequired.ambulances}</span>
                  </div>
                  <div className="p-2 bg-slate-800/80 rounded border border-slate-700">
                    <ShieldAlert className="w-4 h-4 mx-auto text-emerald-400 mb-1" />
                    <span className="text-slate-400 block">Police Escorts</span>
                    <span className="text-sm font-bold text-emerald-400">{currentActiveRoute.logisticsRequired.policeEscorts}</span>
                  </div>
                </div>
              </div>

              {/* One-Click Dispatch Button */}
              <button
                onClick={handleDispatchConvoys}
                disabled={isDispatching || dispatchedSuccess}
                className={`w-full py-2.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
                  dispatchedSuccess
                    ? 'bg-emerald-600 text-white shadow-emerald-900/50'
                    : isDispatching
                    ? 'bg-slate-700 text-slate-300'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/60'
                }`}
              >
                {dispatchedSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-white animate-bounce" />
                    <span>
                      {currentLang === 'ar' ? '✓ تم إرسال الأرتال وأوامر الإخلاء بنجاح' : '✓ Evacuation Convoys Successfully Dispatched'}
                    </span>
                  </>
                ) : isDispatching ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{currentLang === 'ar' ? 'جاري توجيه الأرتال...' : 'Dispatching Tactical Convoys...'}</span>
                  </>
                ) : (
                  <>
                    <Truck className="w-4 h-4" />
                    <span>
                      {currentLang === 'ar' ? 'إرسال أرتال الإخلاء والإسعاف فوراً' : 'Dispatch Evacuation & Escort Convoys'}
                    </span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* TAB 4: Official Civil Protection Emergency Broadcast */}
          {activeTab === 'broadcast' && broadcastData && (
            <div className="space-y-3">
              <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-red-300 text-xs flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                    {broadcastData.title}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-red-500/20 text-red-200 border border-red-500/40">
                    CELL BROADCAST
                  </span>
                </div>

                <p className="text-slate-200 text-xs leading-relaxed bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  {broadcastData.body}
                </p>

                <div className="text-[10px] text-amber-300 font-mono bg-amber-950/40 p-2 rounded border border-amber-500/30">
                  {broadcastData.urgentActionText}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyBroadcast}
                  className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer text-slate-200 hover:text-white"
                >
                  {copiedBroadcast ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{currentLang === 'ar' ? 'تم النسخ للحافظة' : 'Copied to Clipboard'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>{currentLang === 'ar' ? 'نسخ نص الإنذار الرسمي' : 'Copy Alert Text'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
