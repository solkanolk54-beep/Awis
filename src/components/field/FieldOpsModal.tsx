import React, { useState } from 'react';
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
  FileText
} from 'lucide-react';
import { WildfireIncident, WaterPoint, Language } from '../../types';
import { translations } from '../../i18n/translations';

interface FieldOpsModalProps {
  incident: WildfireIncident;
  waterPoints: WaterPoint[];
  onClose: () => void;
  currentLang: Language;
}

export const FieldOpsModal: React.FC<FieldOpsModalProps> = ({
  incident,
  waterPoints,
  onClose,
  currentLang
}) => {
  const t = translations[currentLang];
  const [isOffline, setIsOffline] = useState(false);
  const [fieldNote, setFieldNote] = useState('');
  const [sentReportsCount, setSentReportsCount] = useState(2);
  const [waterTankLevel, setWaterTankLevel] = useState(78); // percentage

  const handleSendFieldUpdate = () => {
    if (!fieldNote.trim()) return;
    setSentReportsCount((c) => c + 1);
    setFieldNote('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-emerald-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
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
              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">
                ASSIGNED TACTICAL MISSION
              </span>
              <div className="text-sm font-bold text-white mt-0.5">
                Establish Defensive Line along RN-77 / Protect Ait Bouyoucef Flank
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Incident: {incident.code} | Head wind: {incident.windSpeedKmH} km/h {incident.windDirectionCardinal}
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs px-2 py-1 rounded bg-red-950 text-red-300 font-mono font-bold border border-red-800">
                DIST: 1.8 KM
              </span>
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
