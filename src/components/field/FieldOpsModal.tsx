import React, { useState, useMemo } from 'react';
import { 
  X, 
  Wifi, 
  WifiOff, 
  Navigation, 
  Droplets, 
  Shield, 
  Flame, 
  Radio, 
  Camera, 
  Mic, 
  CheckCircle2, 
  ArrowUpRight, 
  MapPin, 
  Layers,
  Compass,
  FileText,
  Truck,
  Send,
  Zap,
  Clock
} from 'lucide-react';
import { WildfireIncident, WaterPoint, EmergencyResource, Language } from '../../types';
import { SAMPLE_RESOURCES } from '../../data/algeriaData';
import { translations } from '../../i18n/translations';
import { UserLivePosition, computeDistanceKm } from '../../services/liveGeolocationService';
import { LiveWeatherData } from '../../services/liveWeatherService';

interface FieldOpsModalProps {
  incident: WildfireIncident;
  waterPoints: WaterPoint[];
  resources?: EmergencyResource[];
  onClose: () => void;
  currentLang: Language;
  userPosition?: UserLivePosition | null;
  liveWeather?: LiveWeatherData | null;
}

export const FieldOpsModal: React.FC<FieldOpsModalProps> = ({
  incident,
  waterPoints,
  resources = SAMPLE_RESOURCES,
  onClose,
  currentLang,
  userPosition,
  liveWeather
}) => {
  const t = translations[currentLang];
  const [isOffline, setIsOffline] = useState(false);
  const [fieldNote, setFieldNote] = useState('');
  const [sentReportsCount, setSentReportsCount] = useState(2);
  const [waterTankLevel, setWaterTankLevel] = useState(78); // percentage
  const [dispatchedUnitIds, setDispatchedUnitIds] = useState<Set<string>>(new Set());

  const realDistanceKm = userPosition 
    ? computeDistanceKm(userPosition, incident.coordinates)
    : 1.8;

  // Tactical Resource Suggestion Engine:
  // Identifies and ranks 'Ready' (available) resources closest to the incident and the operative's live GPS position
  const suggestedReadyResources = useMemo(() => {
    return resources
      .filter((r) => r.status === 'available')
      .map((r) => {
        const coords = r.currentLocation || r.baseLocation;
        const distIncident = computeDistanceKm(coords, incident.coordinates);
        const distUser = userPosition ? computeDistanceKm(userPosition, coords) : null;
        // Estimated travel time (average response speed ~45 km/h on mountain terrain)
        const etaMinutes = Math.max(3, Math.round(distIncident * 1.4 + 3));
        return {
          ...r,
          distIncident,
          distUser,
          etaMinutes
        };
      })
      .sort((a, b) => a.distIncident - b.distIncident);
  }, [resources, incident.coordinates, userPosition]);

  const handleRequestDispatch = (unitId: string) => {
    setDispatchedUnitIds((prev) => {
      const next = new Set(prev);
      if (next.has(unitId)) {
        next.delete(unitId);
      } else {
        next.add(unitId);
      }
      return next;
    });
  };

  const handleSendFieldUpdate = () => {
    if (!fieldNote.trim()) return;
    setSentReportsCount((c) => c + 1);
    setFieldNote('');
  };

  return (
    <div 
      id="field-ops-modal-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto cursor-pointer"
    >
      <div 
        id="field-ops-modal-content"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-slate-900 border border-emerald-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] cursor-default"
      >
        {/* Tactical Header */}
        <div className="p-4 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 border-b border-slate-700 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
              <Navigation className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-900 text-emerald-200">
                  UNIT: CP-17 RAPID INTERVENTION
                </span>
                <button
                  onClick={() => setIsOffline(!isOffline)}
                  className={`flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded border transition cursor-pointer ${
                    isOffline
                      ? 'bg-amber-950 text-amber-300 border-amber-600'
                      : 'bg-emerald-950 text-emerald-300 border-emerald-600'
                  }`}
                >
                  {isOffline ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
                  <span>{isOffline ? 'OFFLINE (CACHED VECTORS)' : 'ONLINE (LIVE SYNCHRONIZED)'}</span>
                </button>
              </div>
              <h2 className="text-sm font-bold text-white mt-1">
                Field Operations Terminal — {incident.locationName}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-slate-200 text-xs">
          {/* Mission Objective Card */}
          <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block flex items-center gap-1.5">
                ASSIGNED TACTICAL MISSION
                {userPosition && (
                  <span className="text-[9px] text-sky-400 bg-sky-950 px-1.5 py-0.2 rounded border border-sky-800 font-mono">
                    LIVE GPS FIX
                  </span>
                )}
              </span>
              <div className="text-sm font-bold text-white mt-0.5">
                Establish Defensive Line along RN-77 / Protect Ait Bouyoucef Flank
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Incident: {incident.code} | Live Wind: {liveWeather?.windSpeedKmH ?? incident.windSpeedKmH} km/h {liveWeather?.windDirectionCardinal ?? incident.windDirectionCardinal} | Temp: {liveWeather?.temperatureC ?? 39.5}°C
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs px-2.5 py-1 rounded bg-red-950 text-red-300 font-mono font-bold border border-red-800 block">
                DIST: {realDistanceKm} KM
              </span>
              {userPosition && (
                <span className="text-[9px] text-slate-400 font-mono block mt-1">
                  ±{userPosition.accuracyMeters}m GPS
                </span>
              )}
            </div>
          </div>

          {/* Tactical Tanker Telemetry & Water Point Distances */}
          <div className="grid grid-cols-2 gap-3">
            {/* Water Tank Status */}
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-slate-400 font-bold flex items-center gap-1">
                  <Droplets className="w-3.5 h-3.5 text-cyan-400" /> On-Board Water Tank
                </span>
                <span className="font-mono font-bold text-cyan-300">{waterTankLevel}%</span>
              </div>
              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div 
                  className="h-full bg-cyan-500 transition-all duration-500" 
                  style={{ width: `${waterTankLevel}%` }} 
                />
              </div>
              <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                <span>Capacity: 6,000L</span>
                <span>Foam Ready: YES</span>
              </div>
            </div>

            {/* Compass & Wind Heading */}
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 font-bold flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 text-sky-400" /> Tactical Wind Vector
                </span>
                <div className="text-sm font-bold text-white mt-1">
                  {incident.windDirectionCardinal} ({incident.windDirectionDegrees}°)
                </div>
                <div className="text-[10px] text-red-400">Flame pushing uphill</div>
              </div>
              <div className="w-10 h-10 rounded-full border border-slate-700 flex items-center justify-center font-mono text-xs font-bold text-sky-400">
                {incident.windDirectionCardinal}
              </div>
            </div>
          </div>

          {/* Tactical Resource Suggestion Engine: Closest Ready Units */}
          <div className="p-3.5 rounded-2xl bg-slate-800/70 border border-amber-500/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-amber-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                {currentLang === 'ar' ? 'محرك الاقتراح التكتيكي: أقرب وحدات التدخل الجاهزة' : 'Tactical Suggestion Engine: Closest Ready Units'}
              </h4>
              <span className="text-[10px] text-amber-400/90 font-mono bg-amber-950/80 px-2 py-0.5 rounded border border-amber-600/40">
                {suggestedReadyResources.length} {currentLang === 'ar' ? 'وحدات جاهزة' : 'Ready Units'}
              </span>
            </div>

            <div className="space-y-2">
              {suggestedReadyResources.slice(0, 3).map((res, i) => {
                const isDispatched = dispatchedUnitIds.has(res.id);
                const isPrimary = i === 0;

                return (
                  <div
                    key={res.id}
                    className={`p-3 rounded-xl border transition-all ${
                      isPrimary 
                        ? 'bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border-amber-500/50 shadow-md' 
                        : 'bg-slate-900/80 border-slate-700/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isPrimary 
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                            : 'bg-slate-800 text-slate-300'
                        }`}>
                          <Truck className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-white text-xs">{res.name}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              {res.code}
                            </span>
                            {isPrimary && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/50">
                                {currentLang === 'ar' ? '★ الخيار الأمثل' : '★ Top Choice'}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                            <span>{res.type.replace('_', ' ').toUpperCase()}</span>
                            <span>•</span>
                            <span>{res.capacity ?? 'Ready Unit'}</span>
                            <span>•</span>
                            <span>{res.wilaya}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-mono font-bold text-amber-300 flex items-center justify-end gap-1">
                          <Clock className="w-3 h-3 text-amber-400" />
                          <span>~{res.etaMinutes} min ETA</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {res.distIncident.toFixed(1)} km {currentLang === 'ar' ? 'من الحريق' : 'to Fire'}
                        </div>
                        {res.distUser !== null && (
                          <div className="text-[9px] text-sky-400 font-mono">
                            {res.distUser.toFixed(1)} km {currentLang === 'ar' ? 'من موقعك' : 'to GPS'}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between">
                      <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{currentLang === 'ar' ? 'جاهزية قتالية كاملة (خزان ممتلئ)' : 'Full Readiness (Water Tanks 100%)'}</span>
                      </div>
                      <button
                        onClick={() => handleRequestDispatch(res.id)}
                        className={`px-3 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                          isDispatched
                            ? 'bg-emerald-600 text-white shadow-lg'
                            : 'bg-amber-600 hover:bg-amber-500 text-white shadow'
                        }`}
                      >
                        {isDispatched ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-white" />
                            <span>{currentLang === 'ar' ? 'تم طلب الإسناد ✓' : 'Dispatched ✓'}</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3 h-3" />
                            <span>{currentLang === 'ar' ? 'طلب إسناد فوري' : 'Request Dispatch'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Nearby Water Points List */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Droplets className="w-3.5 h-3.5 text-cyan-400" />
              Nearest Accessible Water Refill Stations
            </h4>
            <div className="space-y-1.5">
              {waterPoints.slice(0, 3).map((wp, i) => (
                <div
                  key={wp.id}
                  className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/80 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-400 flex items-center justify-center text-[10px] font-mono font-bold">
                      {i + 1}
                    </span>
                    <div>
                      <div className="font-bold text-white">{wp.name}</div>
                      <div className="text-[10px] text-slate-400 capitalize">
                        Type: {wp.type} | Status: <span className="text-emerald-400">{wp.status}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-cyan-300 font-mono font-bold">
                      {(2.1 + i * 1.8).toFixed(1)} km
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Field Reporting & Photo Transmit */}
          <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700 space-y-2.5">
            <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              Field Recon & Situation Report (SITREP)
            </h4>
            <textarea
              value={fieldNote}
              onChange={(e) => setFieldNote(e.target.value)}
              placeholder="Record ground observation (e.g. 'Defensive retardant line laid along northern track. Wind shifted slightly to 050°. 2 civilians safely escorted')..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 min-h-[60px]"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <button
                  type="button"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Attach Thermal Shot</span>
                </button>
                <button
                  type="button"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 cursor-pointer"
                >
                  <Mic className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Voice Memo</span>
                </button>
              </div>
              <button
                type="button"
                onClick={handleSendFieldUpdate}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
              >
                Send SITREP ({sentReportsCount} sent)
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="font-mono">GPS LOCK: 36.7801°N, 5.7229°E (Accuracy: 1.2m)</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition cursor-pointer"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
