import React, { useState, useEffect, useMemo } from 'react';
import { 
  Truck, 
  MapPin, 
  Clock, 
  Navigation, 
  Radio, 
  CheckCircle2, 
  AlertTriangle, 
  Play, 
  Pause, 
  RotateCcw, 
  Compass, 
  Droplets, 
  Plane, 
  Camera, 
  Users, 
  ShieldAlert, 
  ChevronRight, 
  Send,
  Zap,
  Activity,
  Copy,
  Check,
  Fuel,
  Volume2
} from 'lucide-react';
import { WildfireIncident, EmergencyResource, Language, GeoCoordinates } from '../../types';
import { computeDistanceKm, computeTravelTimeMinutes, evaluateOptimalUnits } from '../../services/aiDispatchEngine';

interface DispatchedUnitsTimelineTabProps {
  incident: WildfireIncident;
  availableResources: EmergencyResource[];
  onDispatchResource: (incidentId: string, resourceId: string) => void;
  currentLang: Language;
  onDeploySuccess?: (message: string) => void;
}

export const DispatchedUnitsTimelineTab: React.FC<DispatchedUnitsTimelineTabProps> = ({
  incident,
  availableResources,
  onDispatchResource,
  currentLang,
  onDeploySuccess
}) => {
  const isRtl = currentLang === 'ar';

  // State for active filter & selected unit for focused view
  const [selectedUnitId, setSelectedUnitId] = useState<string | 'all'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Real-time animated simulation state for dynamic GPS updates & ETA countdown
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [simElapsedSeconds, setSimElapsedSeconds] = useState<number>(120); // starts 2 minutes in

  // Advance simulation clock every 2 seconds
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isSimulating) {
      timer = setInterval(() => {
        setSimElapsedSeconds((prev) => prev + 4);
      }, 2000);
    }
    return () => clearInterval(timer);
  }, [isSimulating]);

  // Identify all resources dispatched to this incident
  const dispatchedResources = useMemo(() => {
    const list = availableResources.filter((res) => 
      incident.assignedResources.includes(res.id)
    );
    // If none assigned in incident.assignedResources, also check for any resources marked dispatched/en_route in the same wilaya
    if (list.length === 0) {
      const activeUnits = availableResources.filter(
        (r) => (r.status === 'dispatched' || r.status === 'en_route' || r.status === 'on_scene') &&
               (r.wilaya === incident.wilaya || r.type === 'aircraft')
      );
      if (activeUnits.length > 0) return activeUnits;
    }
    return list;
  }, [availableResources, incident.assignedResources, incident.wilaya]);

  // Optimal units available to dispatch (for quick-dispatch if none or more needed)
  const candidateRecommendations = useMemo(() => {
    return evaluateOptimalUnits(incident, availableResources);
  }, [incident, availableResources]);

  // Calculate telemetry & timeline for a resource
  const getUnitTelemetry = (res: EmergencyResource, index: number) => {
    const baseLoc = res.baseLocation || { lat: 36.81, lng: 5.75 };
    const targetLoc = incident.coordinates;
    const totalDistKm = computeDistanceKm(baseLoc, targetLoc);
    const { travelTimeMinutes, averageSpeedKmh } = computeTravelTimeMinutes(
      totalDistKm,
      res.type,
      incident.terrainSlopeDegrees
    );

    // Dynamic progress computation based on time + base status
    // Offset each unit slightly so they aren't at the exact same fraction
    const unitTimeOffset = (index * 140);
    const totalDurationSec = Math.max(180, travelTimeMinutes * 60);
    const elapsedForUnit = (simElapsedSeconds + unitTimeOffset) % (totalDurationSec + 300);
    
    // Progress fraction 0.0 -> 1.0
    let progressRatio = Math.min(1.0, elapsedForUnit / totalDurationSec);
    if (res.status === 'on_scene') progressRatio = 1.0;

    // Interpolate live GPS position
    // Slight curve offset based on sine to simulate road curves
    const curveOffsetLat = Math.sin(progressRatio * Math.PI) * 0.006 * (index % 2 === 0 ? 1 : -1);
    const curveOffsetLng = Math.cos(progressRatio * Math.PI) * 0.005 * (index % 2 === 0 ? -1 : 1);

    const currentLat = Number((baseLoc.lat + (targetLoc.lat - baseLoc.lat) * progressRatio + curveOffsetLat).toFixed(5));
    const currentLng = Number((baseLoc.lng + (targetLoc.lng - baseLoc.lng) * progressRatio + curveOffsetLng).toFixed(5));
    const currentGPS: GeoCoordinates = { lat: currentLat, lng: currentLng };

    const remainingDistKm = Math.max(0, Number((totalDistKm * (1 - progressRatio)).toFixed(1)));
    const remainingEtaMinutes = Math.max(0, Math.round(travelTimeMinutes * (1 - progressRatio)));

    // Road corridor / sector name
    const corridorName = res.type === 'aircraft'
      ? 'Air Corridor Alpha-9 (Alt: 1,450m ASL)'
      : res.type === 'drone'
      ? 'Low-Altitude Direct Vector (Alt: 120m AGL)'
      : `RN-43 / CW-137 Mountain Access (PK ${(22 + progressRatio * 18).toFixed(1)})`;

    // Dynamic operational status
    let currentStatusText = currentLang === 'ar' ? 'في الطريق إلى الموقع' : 'En Route to Firefront';
    let statusBadgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    if (progressRatio >= 0.98) {
      currentStatusText = currentLang === 'ar' ? 'وصل إلى مسرح العمليات (في الميدان)' : 'On-Scene (Direct Attack)';
      statusBadgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    } else if (progressRatio <= 0.15) {
      currentStatusText = currentLang === 'ar' ? 'مغادرة الثكنة وتفعيل الإنذار' : 'Departing Base Station';
      statusBadgeColor = 'bg-blue-500/20 text-blue-300 border-blue-500/40';
    }

    // Calculated arrival time string
    const now = new Date();
    const arrivalTime = new Date(now.getTime() + remainingEtaMinutes * 60000);
    const etaTimestampStr = `${String(arrivalTime.getHours()).padStart(2, '0')}:${String(arrivalTime.getMinutes()).padStart(2, '0')}`;

    // Timeline Events
    const timelineEvents = [
      {
        stage: 1,
        titleEn: 'CODIS Dispatch Order Issued',
        titleAr: 'صدور أمر التكليف من مركز التنسيق والعمليات (CODIS)',
        titleFr: 'Ordre de déploiement émis par le CODIS',
        timeStr: 'T - 18 min',
        completed: true,
        active: false,
        detailEn: `Tactical mobilization authorized by Human Duty Commander for incident ${incident.code}. Encrypted VHF Channel 04 established.`,
        detailAr: `تمت المصادقة على الإرسال التكتيكي من قائد العمليات للحريق ${incident.code}. تم تفعيل القناة اللاسلكية المشفرة.`,
        icon: Radio
      },
      {
        stage: 2,
        titleEn: 'Base Station Rollout & Telemetry Sync',
        titleAr: 'مغادرة قاعدة الإسناد ومزامنة التموضع التلقائي',
        titleFr: 'Départ caserne et synchronisation télémétrique',
        timeStr: 'T - 14 min',
        completed: progressRatio >= 0.15,
        active: progressRatio < 0.15,
        detailEn: `Departed ${res.wilaya} Central Depot (${baseLoc.lat.toFixed(4)}°N, ${baseLoc.lng.toFixed(4)}°E). Full payload verified: ${res.capacity || 'Standard Kit'}.`,
        detailAr: `غادرت ثكنة الحماية المدنية (${baseLoc.lat.toFixed(4)}°N, ${baseLoc.lng.toFixed(4)}°E). جاهزية المعدات والعتاد: ${res.capacity || 'عتاد كامل'}.`,
        icon: Truck
      },
      {
        stage: 3,
        titleEn: 'Active Tactical Corridor Transit (Live GPS Tracking)',
        titleAr: 'التحرك عبر المحور التكتيكي (تتبع إحداثيات GPS الحي)',
        titleFr: 'Transit corridor tactique (Localisation GPS temps réel)',
        timeStr: remainingEtaMinutes > 0 ? `ETA: ${remainingEtaMinutes} min` : 'Completed',
        completed: progressRatio >= 0.85,
        active: progressRatio >= 0.15 && progressRatio < 0.85,
        detailEn: `Current GPS: ${currentLat}° N, ${currentLng}° E along ${corridorName}. Speed: ${averageSpeedKmh} km/h. Remaining: ${remainingDistKm} km.`,
        detailAr: `الموقع اللحظي: ${currentLat}° N, ${currentLng}° E على ${corridorName}. السرعة: ${averageSpeedKmh} كم/سا. المتبقي: ${remainingDistKm} كم.`,
        icon: Navigation
      },
      {
        stage: 4,
        titleEn: 'Forward Command Staging (PCO Ingress)',
        titleAr: 'الاقتراب من نقطة التمركز المتقدمة (Ingress PCO)',
        titleFr: 'Ingress Poste de Commandement Opérationnel',
        timeStr: progressRatio >= 0.85 ? 'Now' : `~${Math.round(remainingEtaMinutes * 0.75)} min`,
        completed: progressRatio >= 0.95,
        active: progressRatio >= 0.85 && progressRatio < 0.95,
        detailEn: `Ingress through fire buffer perimeter (~1.5 km). Wind alignment: ${incident.windSpeedKmH} km/h ${incident.windDirectionCardinal}. Safe approach confirmed.`,
        detailAr: `عبور محيط الأمان الخارجي (~1.5 كم). الرياح: ${incident.windSpeedKmH} كم/سا باتجاه ${incident.windDirectionCardinal}. مسار اقتراب آمن.`,
        icon: ShieldAlert
      },
      {
        stage: 5,
        titleEn: 'On-Scene Firefront Engagement & Suppression',
        titleAr: 'الوصول إلى مسرح العمليات ومباشرة الإخماد',
        titleFr: 'Arrivée sur les lieux et attaque du foyer',
        timeStr: progressRatio >= 0.98 ? 'Engaged' : `Est. ${etaTimestampStr}`,
        completed: progressRatio >= 0.98,
        active: progressRatio >= 0.95 && progressRatio < 0.98,
        detailEn: `Target Site: ${incident.locationName} (${targetLoc.lat.toFixed(4)}°N, ${targetLoc.lng.toFixed(4)}°E). Operational objective: Head flame containment and perimeter defense.`,
        detailAr: `الهدف الميداني: ${incident.locationNameAr || incident.locationName} (${targetLoc.lat.toFixed(4)}°N, ${targetLoc.lng.toFixed(4)}°E). المهمة: إخماد ألسنة اللهب وحماية الأصول المجاورة.`,
        icon: CheckCircle2
      }
    ];

    return {
      resource: res,
      baseLoc,
      targetLoc,
      totalDistKm,
      remainingDistKm,
      travelTimeMinutes,
      remainingEtaMinutes,
      averageSpeedKmh,
      progressRatio,
      currentGPS,
      corridorName,
      currentStatusText,
      statusBadgeColor,
      etaTimestampStr,
      timelineEvents
    };
  };

  const processedDispatchedUnits = useMemo(() => {
    return dispatchedResources.map((res, index) => getUnitTelemetry(res, index));
  }, [dispatchedResources, incident, currentLang, simElapsedSeconds]);

  // Copy GPS handler
  const handleCopyGPS = (gpsStr: string, id: string) => {
    navigator.clipboard?.writeText(gpsStr);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered unit list
  const visibleUnits = useMemo(() => {
    if (selectedUnitId === 'all') return processedDispatchedUnits;
    return processedDispatchedUnits.filter((u) => u.resource.id === selectedUnitId);
  }, [processedDispatchedUnits, selectedUnitId]);

  return (
    <div id="dispatched-units-timeline-tab" className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Top Telemetry Operations Header Bar */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                LIVE GPS TELEMETRY
              </span>
              <span className="text-xs text-slate-400 font-mono">
                CODIS Wilaya {incident.wilaya}
              </span>
            </div>
            <h3 className="text-base font-bold text-white mt-1 flex items-center gap-2">
              <span>
                {currentLang === 'ar' 
                  ? 'التتبع اللحظي ومسار وصول الوحدات الميدانية'
                  : currentLang === 'fr'
                  ? 'Suivi en Temps Réel et Chronologie des Unités'
                  : 'Real-Time Telemetry & Dispatched Units Timeline'}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold">
                {dispatchedResources.length} {currentLang === 'ar' ? 'وحدات' : 'Units'}
              </span>
            </h3>
          </div>
        </div>

        {/* Real-time Controls & Simulation Toggles */}
        <div className="flex items-center gap-2 self-end md:self-center">
          <button
            id="btn-toggle-timeline-sim"
            onClick={() => setIsSimulating(!isSimulating)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
              isSimulating
                ? 'bg-emerald-600/30 border-emerald-500 text-emerald-200'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
            title="Toggle Live GPS Telemetry Simulation Clock"
          >
            {isSimulating ? <Pause className="w-3.5 h-3.5 text-emerald-400" /> : <Play className="w-3.5 h-3.5 text-slate-300" />}
            <span>{isSimulating ? (currentLang === 'ar' ? 'بث GPS مباشر' : 'Live Sync Active') : (currentLang === 'ar' ? 'استئناف البث' : 'Resume Sync')}</span>
          </button>

          <button
            onClick={() => setSimElapsedSeconds(0)}
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            title="Reset Timeline Simulation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Unit Selector Pills (if multiple units) */}
      {processedDispatchedUnits.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setSelectedUnitId('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${
              selectedUnitId === 'all'
                ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {currentLang === 'ar' ? `جميع الوحدات (${processedDispatchedUnits.length})` : `All Units (${processedDispatchedUnits.length})`}
          </button>

          {processedDispatchedUnits.map((u) => {
            const isSelected = selectedUnitId === u.resource.id;
            return (
              <button
                key={u.resource.id}
                onClick={() => setSelectedUnitId(u.resource.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-mono transition whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-slate-800 border-amber-400 text-amber-300 shadow-md'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {u.resource.type === 'aircraft' ? (
                  <Plane className="w-3.5 h-3.5 text-sky-400" />
                ) : u.resource.type === 'drone' ? (
                  <Camera className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Truck className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span className="font-bold">{u.resource.code}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-950 text-slate-300">
                  {u.remainingEtaMinutes > 0 ? `${u.remainingEtaMinutes}m` : 'On-Site'}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* NO UNITS DISPATCHED EMPTY STATE */}
      {processedDispatchedUnits.length === 0 && (
        <div className="p-8 rounded-2xl bg-slate-900/60 border border-dashed border-slate-700 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Truck className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h4 className="text-base font-bold text-white">
              {currentLang === 'ar' ? 'لم يتم إرسال وحدات إلى هذا الحريق بعد' : 'No Emergency Units Dispatched Yet'}
            </h4>
            <p className="text-xs text-slate-400">
              {currentLang === 'ar'
                ? 'قم بإرسال الوحدات التكتيكية الموصى بها لمتابعة مسار تحركها، إحداثيات GPS اللحظية، والزمن المقدر للوصول (ETA) في هذا الخط الزمني.'
                : 'Dispatch frontline tactical units from the strategic reserve to track their live GPS positioning and estimated time of arrival here.'}
            </p>
          </div>

          {/* Quick Dispatch Recommendation Cards */}
          <div className="pt-2 text-left">
            <div className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5 justify-center">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>{currentLang === 'ar' ? 'الوحدات الأقرب الجاهزة للإرسال الفوري:' : 'Recommended Units Ready for Immediate Dispatch:'}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
              {candidateRecommendations.slice(0, 3).map((rec) => (
                <div
                  key={rec.resource.id}
                  className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 flex flex-col justify-between text-xs space-y-2"
                >
                  <div>
                    <div className="flex items-center justify-between font-mono font-bold text-amber-300">
                      <span>{rec.resource.code}</span>
                      <span className="text-[10px] text-emerald-400 font-sans">{rec.suitabilityScore}% Match</span>
                    </div>
                    <div className="text-white font-semibold truncate text-[11px] mt-0.5">
                      {currentLang === 'ar' ? rec.resource.nameAr : rec.resource.name}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" />
                      <span>ETA: {rec.estimatedTravelTimeMinutes} min ({rec.distanceKm} km)</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onDispatchResource(incident.id, rec.resource.id);
                      onDeploySuccess?.(
                        currentLang === 'ar'
                          ? `تم إرسال ${rec.resource.code} وتفعيل التتبع اللحظي.`
                          : `Dispatched ${rec.resource.code} with live telemetry timeline activated.`
                      );
                    }}
                    className="w-full py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer shadow"
                  >
                    <Send className="w-3 h-3" />
                    <span>{currentLang === 'ar' ? 'إرسال الوحدة وتفعيل التتبع' : 'Dispatch Unit Now'}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* DISPATCHED UNITS TIMELINES LIST */}
      <div className="space-y-6">
        {visibleUnits.map((u) => {
          const gpsStr = `${u.currentGPS.lat.toFixed(5)}, ${u.currentGPS.lng.toFixed(5)}`;
          const isUnitCopied = copiedId === u.resource.id;

          return (
            <div
              key={u.resource.id}
              className="rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-2xl overflow-hidden"
            >
              {/* Unit Card Header */}
              <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-800/80 to-slate-900 border-b border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-amber-400 shrink-0">
                    {u.resource.type === 'aircraft' ? (
                      <Plane className="w-5 h-5 text-sky-400" />
                    ) : u.resource.type === 'drone' ? (
                      <Camera className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Truck className="w-5 h-5 text-amber-400" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-base text-amber-300">
                        {u.resource.code}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${u.statusBadgeColor}`}>
                        {u.currentStatusText}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {u.corridorName}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-white">
                      {currentLang === 'ar' ? u.resource.nameAr : u.resource.name}
                    </h4>
                  </div>
                </div>

                {/* Primary Real-Time Metric Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Current GPS Location Pill with Copy */}
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700/80 text-xs font-mono">
                    <MapPin className="w-3.5 h-3.5 text-red-400 animate-bounce" />
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-400 leading-none">
                        {currentLang === 'ar' ? 'إحداثيات GPS اللحظية' : 'Live GPS Coordinates'}
                      </span>
                      <span className="text-white font-bold tracking-tight">{gpsStr}</span>
                    </div>
                    <button
                      onClick={() => handleCopyGPS(gpsStr, u.resource.id)}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer ml-1"
                      title="Copy GPS coordinates"
                    >
                      {isUnitCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>

                  {/* Estimated Time of Arrival (ETA) Pill */}
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-950/60 to-slate-950 border border-amber-500/40 text-xs font-mono">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-400 leading-none">
                        {currentLang === 'ar' ? 'زمن الوصول المقدر (ETA)' : 'Estimated Arrival (ETA)'}
                      </span>
                      <span className="text-amber-300 font-black text-sm leading-none mt-0.5">
                        {u.remainingEtaMinutes > 0 ? `${u.remainingEtaMinutes} MIN` : 'ON-SCENE'}
                        <span className="text-[10px] font-normal text-slate-400 ml-1">
                          ({u.remainingDistKm} km left)
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transit Progress Bar & Linear Route Map */}
              <div className="px-5 py-3.5 bg-slate-950/70 border-b border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    <span>
                      {currentLang === 'ar' ? 'القاعدة:' : 'Base Station:'} {u.resource.wilaya} ({u.baseLoc.lat.toFixed(3)}°N, {u.baseLoc.lng.toFixed(3)}°E)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 font-bold">
                      {Math.round(u.progressRatio * 100)}% {currentLang === 'ar' ? 'المسافة المقطوعة' : 'Transit Completed'}
                    </span>
                    <span className="text-slate-600">•</span>
                    <span>Speed: {u.averageSpeedKmh} km/h</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                    <span>
                      {currentLang === 'ar' ? 'موقع الحريق:' : 'Incident Site:'} {incident.locationName}
                    </span>
                  </div>
                </div>

                {/* Progress Visual Track */}
                <div className="relative h-3 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700/60">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 via-amber-500 to-emerald-500 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${Math.min(100, Math.max(5, u.progressRatio * 100))}%` }}
                  />
                  {/* Moving Unit Marker Indicator */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white border-2 border-amber-500 shadow-md flex items-center justify-center transition-all duration-500"
                    style={{ left: `${Math.min(98, Math.max(2, u.progressRatio * 100))}%` }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                  </div>
                </div>
              </div>

              {/* Detailed Real-Time Multi-Stage Timeline */}
              <div className="p-5 space-y-4">
                <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {currentLang === 'ar' ? 'التسلسل الزمني والمراحل الميدانية' : 'Operational Progression Timeline'}
                  </span>
                </h5>

                <div className="relative border-l-2 border-slate-800 ml-4 pl-5 space-y-5">
                  {u.timelineEvents.map((evt) => {
                    const EvtIcon = evt.icon;
                    return (
                      <div key={evt.stage} className="relative group">
                        {/* Status Icon Node */}
                        <div
                          className={`absolute -left-[31px] top-0.5 w-6 h-6 rounded-full flex items-center justify-center border-2 transition ${
                            evt.completed
                              ? 'bg-emerald-950 border-emerald-500 text-emerald-400'
                              : evt.active
                              ? 'bg-amber-950 border-amber-400 text-amber-300 ring-4 ring-amber-400/20 animate-pulse'
                              : 'bg-slate-900 border-slate-700 text-slate-500'
                          }`}
                        >
                          <EvtIcon className="w-3 h-3" />
                        </div>

                        {/* Event Content Box */}
                        <div
                          className={`p-3 rounded-xl border transition ${
                            evt.active
                              ? 'bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-900 border-amber-500/50 shadow-lg'
                              : evt.completed
                              ? 'bg-slate-900/40 border-slate-800'
                              : 'bg-slate-950/30 border-slate-900 opacity-60'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-sm">
                                {currentLang === 'ar' ? evt.titleAr : evt.titleEn}
                              </span>
                              {evt.active && (
                                <span className="px-2 py-0.2 rounded-full text-[10px] font-mono font-bold bg-amber-500 text-slate-950">
                                  {currentLang === 'ar' ? 'المرحلة النشطة الآن' : 'ACTIVE NOW'}
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-slate-400 text-[11px] shrink-0 font-semibold">
                              {evt.timeStr}
                            </span>
                          </div>

                          <p className="mt-1 text-xs text-slate-300 font-sans leading-relaxed">
                            {currentLang === 'ar' ? evt.detailAr : evt.detailEn}
                          </p>

                          {/* Extra Telemetry Details inside Stage 3 */}
                          {evt.stage === 3 && (
                            <div className="mt-2 pt-2 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                              <div className="p-2 rounded bg-slate-950 border border-slate-800">
                                <span className="text-slate-400 block text-[10px]">
                                  {currentLang === 'ar' ? 'السرعة الحالية:' : 'Current Velocity:'}
                                </span>
                                <span className="text-white font-bold">{u.averageSpeedKmh} km/h</span>
                              </div>
                              <div className="p-2 rounded bg-slate-950 border border-slate-800">
                                <span className="text-slate-400 block text-[10px]">
                                  {currentLang === 'ar' ? 'المسافة المتبقية:' : 'Distance Remaining:'}
                                </span>
                                <span className="text-amber-300 font-bold">{u.remainingDistKm} km</span>
                              </div>
                              <div className="p-2 rounded bg-slate-950 border border-slate-800">
                                <span className="text-slate-400 block text-[10px]">
                                  {currentLang === 'ar' ? 'الوصول المتوقع:' : 'ETA Clock:'}
                                </span>
                                <span className="text-emerald-400 font-bold">~{u.etaTimestampStr}</span>
                              </div>
                              <div className="p-2 rounded bg-slate-950 border border-slate-800">
                                <span className="text-slate-400 block text-[10px]">
                                  {currentLang === 'ar' ? 'حالة المسار:' : 'Corridor Status:'}
                                </span>
                                <span className="text-sky-300 font-bold">Cleared (RN-43)</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Tactical Unit Hardware & Communications Panel */}
                <div className="mt-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs flex flex-wrap items-center justify-between gap-3 text-slate-300 font-mono">
                  <div className="flex items-center gap-2">
                    <Droplets className="w-3.5 h-3.5 text-blue-400" />
                    <span>{u.resource.capacity || 'Water Supply Active'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Crew: 6 Firefighters + Off-road Commander</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Radio className="w-3.5 h-3.5 text-amber-400" />
                    <span>Tactical VHF: 154.600 MHz (CODIS Ch-04)</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick-Deploy Additional Units Panel */}
      {candidateRecommendations.length > 0 && (
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <h4 className="font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {currentLang === 'ar'
                  ? 'إرسال وحدات دعم إضافية إلى مسرح العمليات'
                  : 'Dispatch Additional Support Units to Incident'}
              </span>
            </h4>
            <span className="font-mono text-[11px] text-slate-500">
              {candidateRecommendations.length} units available
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {candidateRecommendations.slice(0, 3).map((rec) => {
              const isAlreadyDispatched = incident.assignedResources.includes(rec.resource.id);
              return (
                <div
                  key={rec.resource.id}
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs transition ${
                    isAlreadyDispatched
                      ? 'bg-emerald-950/20 border-emerald-600/50 text-emerald-200'
                      : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <div className="space-y-1 min-w-0 pr-2">
                    <div className="flex items-center gap-1.5 font-bold font-mono">
                      <span className="text-amber-300">{rec.resource.code}</span>
                      <span className="text-white text-xs truncate font-sans">
                        {currentLang === 'ar' ? rec.resource.nameAr : rec.resource.name}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 font-mono">
                      <span className="text-amber-300">ETA: {rec.estimatedTravelTimeMinutes}m</span>
                      <span>•</span>
                      <span>{rec.distanceKm} km</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onDispatchResource(incident.id, rec.resource.id);
                      onDeploySuccess?.(
                        currentLang === 'ar'
                          ? `تم إرسال ${rec.resource.code} ومزامنة التتبع اللحظي.`
                          : `Dispatched ${rec.resource.code} and initiated real-time timeline tracking.`
                      );
                    }}
                    disabled={isAlreadyDispatched}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs cursor-pointer transition shrink-0 ${
                      isAlreadyDispatched
                        ? 'bg-emerald-800/40 text-emerald-300 cursor-default'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow'
                    }`}
                  >
                    {isAlreadyDispatched
                      ? (currentLang === 'ar' ? 'مرسلة ✓' : 'Dispatched ✓')
                      : (currentLang === 'ar' ? 'إرسال' : 'Deploy')}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
