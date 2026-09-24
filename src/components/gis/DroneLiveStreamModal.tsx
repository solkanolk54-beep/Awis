import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Video, 
  Maximize2, 
  Minimize2, 
  Camera, 
  Radio, 
  Thermometer, 
  Wind, 
  Compass, 
  Flame, 
  Crosshair, 
  Eye, 
  ShieldAlert, 
  Layers, 
  Activity, 
  Cpu, 
  Volume2, 
  VolumeX, 
  RefreshCw,
  Target
} from 'lucide-react';
import { WildfireIncident, Language, DroneEdgeVisionTelemetry, DroneTacticalAssessment } from '../../types';
import { 
  computeDroneTacticalAssessment,
  computeTacticalDropCoordinates,
  TacticalDropCoordinates
} from '../../services/droneReconService';
import { 
  saveDroneReconSnapshot, 
  DroneReconSnapshotData 
} from '../../services/incidentReportGenerator';
import { DroneAirDropToast, DroneSnapshotToast } from './DroneTacticalToasts';

interface DroneLiveStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
  incident: WildfireIncident;
  liveDroneData?: DroneEdgeVisionTelemetry;
  currentLang: Language;
}

export const DroneLiveStreamModal: React.FC<DroneLiveStreamModalProps> = ({
  isOpen,
  onClose,
  incident,
  liveDroneData,
  currentLang
}) => {
  const [streamMode, setStreamMode] = useState<'thermal_flir' | 'optical_rgb' | 'fused_pip'>('thermal_flir');
  const [thermalPalette, setThermalPalette] = useState<'ironbow' | 'white_hot' | 'rainbow'>('ironbow');
  const [isAudioMuted, setIsAudioMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDeHazeActive, setIsDeHazeActive] = useState(true);
  const [showTacticalReticle, setShowTacticalReticle] = useState(true);
  const [streamHealth, setStreamHealth] = useState({ fps: 30, bitrateMbps: 4.8, latencyMs: 135 });
  const [liveClock, setLiveClock] = useState(new Date().toTimeString().slice(0, 8));

  // Tactical Actions State
  const [dropTagged, setDropTagged] = useState(false);
  const [snapshotTaken, setSnapshotTaken] = useState(false);
  const [dropTacticalInfo, setDropTacticalInfo] = useState<TacticalDropCoordinates | null>(null);
  const [snapshotCapturedInfo, setSnapshotCapturedInfo] = useState<DroneReconSnapshotData | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const isAr = currentLang === 'ar';

  const assessment: DroneTacticalAssessment = computeDroneTacticalAssessment(incident);

  // Live telemetry metrics either from active live drone prop or real-time calculated
  const flameHeight = liveDroneData?.visionDetections.measuredFlameHeightMeters ?? assessment.flameHeightMeters;
  const coreTemp = liveDroneData?.visionDetections.peakRadiometricTempC ?? assessment.maxHotspotTempC;
  const altitudeAgl = liveDroneData?.dronePosition.altitudeAglMeters ?? 340;
  const windSpd = incident.windSpeedKmH || 35;
  const windDir = incident.windDirectionDegrees || 225;
  const droneCallsign = liveDroneData?.droneCallsign || 'DRONE-DZ-UAV-04';

  const handleTagWaterDrop = () => {
    const coords = computeTacticalDropCoordinates(incident, assessment);
    setDropTacticalInfo(coords);
    setDropTagged(true);
    setSnapshotTaken(false);
  };

  const handleTakeSnapshot = () => {
    const offCanvas = document.createElement('canvas');
    offCanvas.width = 800;
    offCanvas.height = 480;
    const ctx = offCanvas.getContext('2d');
    if (!ctx) return;

    const w = offCanvas.width;
    const h = offCanvas.height;

    if (streamMode === 'thermal_flir' || streamMode === 'fused_pip') {
      const bgGrad = ctx.createRadialGradient(w * 0.52, h * 0.48, 10, w * 0.52, h * 0.48, w * 0.6);
      if (thermalPalette === 'white_hot') {
        bgGrad.addColorStop(0, '#ffffff');
        bgGrad.addColorStop(0.2, '#d1d5db');
        bgGrad.addColorStop(0.55, '#4b5563');
        bgGrad.addColorStop(1, '#0b0f19');
      } else if (thermalPalette === 'rainbow') {
        bgGrad.addColorStop(0, '#ffffff');
        bgGrad.addColorStop(0.15, '#ff0000');
        bgGrad.addColorStop(0.35, '#ffff00');
        bgGrad.addColorStop(0.55, '#00ff00');
        bgGrad.addColorStop(0.75, '#00ffff');
        bgGrad.addColorStop(1, '#000033');
      } else {
        bgGrad.addColorStop(0, '#ffffff');
        bgGrad.addColorStop(0.14, '#facc15');
        bgGrad.addColorStop(0.32, '#ea580c');
        bgGrad.addColorStop(0.55, '#991b1b');
        bgGrad.addColorStop(0.78, '#3b0764');
        bgGrad.addColorStop(1, '#030712');
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(w * 0.52, h * 0.48, 48, 32, 0.2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const optGrad = ctx.createLinearGradient(0, 0, 0, h);
      optGrad.addColorStop(0, '#292524');
      optGrad.addColorStop(0.5, '#451a03');
      optGrad.addColorStop(1, '#064e3b');
      ctx.fillStyle = optGrad;
      ctx.fillRect(0, 0, w, h);

      const fireGrad = ctx.createRadialGradient(w * 0.5, h * 0.45, 5, w * 0.5, h * 0.45, 70);
      fireGrad.addColorStop(0, '#fef08a');
      fireGrad.addColorStop(0.4, '#f97316');
      fireGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = fireGrad;
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.45, 80, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(16, 185, 129, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.5, 75, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(w * 0.62, h * 0.42, 28, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(0, 0, w, 32);
    ctx.fillRect(0, h - 34, w, 34);

    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#10b981';
    ctx.fillText(`AWIS AIR-RECON: ${droneCallsign} | STREAM: ${streamMode.toUpperCase()}`, 14, 21);

    ctx.fillStyle = '#f87171';
    ctx.fillText(`CORE: ${coreTemp}°C | FRP: ${assessment.fireRadiativePowerMw} MW`, w - 240, 21);

    const nowIso = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
    ctx.font = '10px monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`WATER DROP TARGET: ${assessment.recommendedDropPoint.lat}°N, ${assessment.recommendedDropPoint.lng}°E`, 14, h - 13);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(nowIso, w - 180, h - 13);

    const base64 = offCanvas.toDataURL('image/jpeg', 0.92);
    const dropCoords = computeTacticalDropCoordinates(incident, assessment);

    const snapshotData: DroneReconSnapshotData = {
      incidentId: incident.id,
      imageBase64: base64,
      timestamp: new Date().toISOString(),
      mode: streamMode,
      coreTempC: coreTemp,
      flameHeightM: flameHeight,
      frpMw: assessment.fireRadiativePowerMw,
      waterDropTarget: {
        lat: dropCoords.dropPoint.lat,
        lng: dropCoords.dropPoint.lng,
        wgs84: dropCoords.wgs84DMS,
        utm: dropCoords.utmGrid
      },
      callsign: droneCallsign
    };

    saveDroneReconSnapshot(snapshotData);
    setSnapshotCapturedInfo(snapshotData);
    setSnapshotTaken(true);
    setDropTagged(false);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveClock(new Date().toTimeString().slice(0, 8));
      // Subtle realistic jitter in streaming telemetry
      setStreamHealth({
        fps: Math.floor(29 + Math.random() * 2),
        bitrateMbps: Number((4.6 + Math.random() * 0.5).toFixed(1)),
        latencyMs: Math.floor(130 + Math.random() * 15)
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!isOpen) return null;

  const toggleFullscreen = () => {
    if (!modalRef.current) return;
    if (!isFullscreen) {
      if (modalRef.current.requestFullscreen) {
        modalRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  return (
    <div 
      id="drone-live-stream-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md cursor-pointer animate-in fade-in"
    >
      <div 
        ref={modalRef}
        id="drone-live-stream-viewport"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-5xl bg-slate-950 border border-emerald-500/50 rounded-2xl shadow-[0_0_50px_rgba(16,185,129,0.25)] overflow-hidden flex flex-col max-h-[95vh] cursor-default"
      >
        {/* Tactical Air-Drop & Snapshot Toasts */}
        <DroneAirDropToast
          isOpen={dropTagged}
          onClose={() => setDropTagged(false)}
          dropInfo={dropTacticalInfo}
          incident={incident}
          currentLang={currentLang}
        />
        <DroneSnapshotToast
          isOpen={snapshotTaken}
          onClose={() => setSnapshotTaken(false)}
          snapshotInfo={snapshotCapturedInfo}
          incident={incident}
          currentLang={currentLang}
        />
        {/* Stream Top Header Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-emerald-500/30">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
              </span>
              <span className="font-mono text-xs font-black uppercase text-red-400 tracking-wider">
                LIVE RTSP / WebRTC FEED
              </span>
            </div>
            <div className="h-4 w-[1px] bg-slate-700 hidden sm:block" />
            <div className="font-mono text-xs text-emerald-400 font-bold hidden sm:flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
              <span>{droneCallsign}</span>
              <span className="text-[10px] text-slate-400 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">
                1080p60 FLIR E10T
              </span>
            </div>
          </div>

          {/* Quick HUD Controls */}
          <div className="flex items-center gap-2">
            {/* View Mode Selector */}
            <div className="flex rounded-lg bg-slate-950 border border-slate-800 p-0.5 text-[11px] font-mono">
              <button
                id="drone-stream-thermal-btn"
                onClick={() => setStreamMode('thermal_flir')}
                className={`px-2 py-1 rounded transition cursor-pointer ${
                  streamMode === 'thermal_flir'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {isAr ? 'حراري FLIR' : 'FLIR Thermal'}
              </button>
              <button
                id="drone-stream-optical-btn"
                onClick={() => setStreamMode('optical_rgb')}
                className={`px-2 py-1 rounded transition cursor-pointer ${
                  streamMode === 'optical_rgb'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {isAr ? 'بصري RGB' : 'Optical RGB'}
              </button>
              <button
                id="drone-stream-pip-btn"
                onClick={() => setStreamMode('fused_pip')}
                className={`px-2 py-1 rounded transition cursor-pointer ${
                  streamMode === 'fused_pip'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {isAr ? 'مزدوج PiP' : 'Fused PiP'}
              </button>
            </div>

            {/* Thermal Palette Toggle (Only in Thermal/PiP mode) */}
            {streamMode !== 'optical_rgb' && (
              <select
                value={thermalPalette}
                onChange={(e) => setThermalPalette(e.target.value as any)}
                className="bg-slate-950 border border-slate-700 text-xs font-mono text-emerald-300 rounded px-2 py-1 cursor-pointer"
              >
                <option value="ironbow">Ironbow (حراري موصى)</option>
                <option value="white_hot">White-Hot (أبيض)</option>
                <option value="rainbow">Rainbow HC (ألوان طيفية)</option>
              </select>
            )}

            <button
              onClick={() => setIsDeHazeActive(!isDeHazeActive)}
              className={`p-1.5 rounded-lg border text-xs transition cursor-pointer ${
                isDeHazeActive
                  ? 'bg-teal-500/20 text-teal-300 border-teal-500/50'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
              title="De-Haze AI Smoke Filter"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIsAudioMuted(!isAudioMuted)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              title={isAudioMuted ? 'Unmute telemetry audio' : 'Mute telemetry audio'}
            >
              {isAudioMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-red-900/50 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video Canvas & Live HUD Overlay */}
        <div className="relative flex-1 bg-black min-h-[380px] sm:min-h-[480px] overflow-hidden select-none">
          {/* Simulated RTSP/WebRTC Video Layer */}
          <div className="absolute inset-0">
            {streamMode === 'thermal_flir' && (
              <div 
                className="w-full h-full relative"
                style={{
                  background: thermalPalette === 'white_hot'
                    ? 'radial-gradient(ellipse at 52% 48%, rgba(255,255,255,0.95) 0%, rgba(180,180,180,0.8) 18%, rgba(60,60,70,0.95) 50%, rgba(10,12,18,1) 100%)'
                    : thermalPalette === 'rainbow'
                    ? 'radial-gradient(ellipse at 52% 48%, #ffffff 0%, #ff0000 15%, #ffff00 32%, #00ff00 50%, #00ffff 70%, #000033 100%)'
                    : 'radial-gradient(ellipse at 52% 48%, #ffffff 0%, #facc15 14%, #ea580c 30%, #991b1b 52%, #3b0764 78%, #030712 100%)'
                }}
              >
                {/* Simulated thermal noise and convection currents */}
                <div className="absolute inset-0 opacity-20 mix-blend-overlay bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] animate-pulse" />
              </div>
            )}

            {streamMode === 'optical_rgb' && (
              <div className="w-full h-full relative bg-gradient-to-b from-stone-900 via-amber-950/70 to-emerald-950/90">
                {/* Simulated smoke haze / mountain forest view */}
                <div 
                  className={`absolute inset-0 transition-opacity duration-300 ${
                    isDeHazeActive ? 'opacity-30' : 'opacity-75'
                  } bg-gradient-to-t from-gray-400/50 via-gray-600/40 to-transparent`} 
                />
                <div className="absolute top-[40%] left-[45%] w-36 h-28 rounded-full bg-orange-600/60 blur-2xl animate-pulse" />
                <div className="absolute top-[38%] left-[48%] w-16 h-12 rounded-full bg-yellow-300/80 blur-md animate-ping" />
              </div>
            )}

            {streamMode === 'fused_pip' && (
              <div className="w-full h-full relative bg-stone-900">
                {/* Primary Optical Feed */}
                <div className="w-full h-full bg-gradient-to-b from-stone-900 via-amber-950/60 to-emerald-950/80" />
                {/* Secondary Thermal PiP Window */}
                <div className="absolute bottom-4 right-4 w-64 h-44 rounded-xl border-2 border-emerald-400 overflow-hidden shadow-2xl bg-black">
                  <div 
                    className="w-full h-full relative"
                    style={{
                      background: 'radial-gradient(ellipse at 50% 50%, #ffffff 0%, #facc15 15%, #ea580c 35%, #991b1b 60%, #030712 100%)'
                    }}
                  >
                    <div className="absolute top-1 left-2 font-mono text-[9px] font-bold text-emerald-300 bg-black/60 px-1 rounded">
                      FLIR THERMAL PiP
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* HUD OVERLAY LAYER (Heads-Up Display) */}
          <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
            {/* Top HUD Telemetry Ribbon */}
            <div className="flex items-start justify-between">
              {/* Left Top: Coordinates & Flight Telemetry */}
              <div className="p-2.5 rounded-xl bg-black/60 backdrop-blur-md border border-emerald-500/40 font-mono text-[11px] text-emerald-400 space-y-1 shadow-lg">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="font-bold text-white uppercase tracking-wider">{incident.code || 'INCIDENT DZ'}</span>
                  <span className="text-slate-400">|</span>
                  <span className="text-amber-300">{incident.wilaya}</span>
                </div>
                <div>
                  <span className="text-slate-400">LAT/LNG: </span>
                  <span className="text-white font-bold">{incident.coordinates.lat.toFixed(5)}°N, {incident.coordinates.lng.toFixed(5)}°E</span>
                </div>
                <div>
                  <span className="text-slate-400">ALTITUDE: </span>
                  <span className="text-emerald-300 font-bold">{altitudeAgl} m AGL</span>
                  <span className="text-slate-400 ml-2">HEADING: </span>
                  <span className="text-emerald-300 font-bold">{windDir}°</span>
                </div>
              </div>

              {/* Right Top: Radiometric Core Temperature & Flame Height */}
              <div className="p-2.5 rounded-xl bg-black/60 backdrop-blur-md border border-red-500/50 font-mono text-[11px] text-right space-y-1 shadow-lg">
                <div className="flex items-center justify-end gap-1.5 text-red-400 font-bold">
                  <Flame className="w-4 h-4 animate-bounce text-red-500" />
                  <span className="text-xs uppercase">{isAr ? 'حرارة البؤرة المركزية' : 'PEAK THERMAL CORE'}</span>
                </div>
                <div className="text-2xl font-black text-red-400 tracking-tight">
                  {coreTemp}°C
                </div>
                <div className="text-slate-300 text-[10px]">
                  <span>FLAME HT: </span>
                  <span className="text-amber-300 font-bold">{flameHeight} m</span>
                  <span className="text-slate-500 mx-1">•</span>
                  <span>FRP: </span>
                  <span className="text-amber-300 font-bold">{assessment.fireRadiativePowerMw} MW</span>
                </div>
              </div>
            </div>

            {/* Central Tactical Reticle / Targeting Crosshair */}
            {showTacticalReticle && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-48 h-48 border border-emerald-500/40 rounded-full flex items-center justify-center">
                  {/* Outer corner ticks */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-3 bg-emerald-400" />
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1px] h-3 bg-emerald-400" />
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[1px] w-3 bg-emerald-400" />
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 h-[1px] w-3 bg-emerald-400" />
                  
                  {/* Target lock box around fire centroid */}
                  <div className="w-16 h-16 border-2 border-dashed border-red-500/80 animate-pulse rounded flex items-center justify-center">
                    <Crosshair className="w-6 h-6 text-red-500" />
                  </div>
                  
                  <div className="absolute -bottom-6 font-mono text-[10px] text-emerald-400 font-bold bg-black/60 px-2 py-0.5 rounded">
                    THERMAL LOCK: 98.4% CONF
                  </div>
                </div>
              </div>
            )}

            {/* Bottom HUD Bar */}
            <div className="flex items-end justify-between font-mono text-[10px]">
              {/* Bottom Left: Environmental Wind & Spread Vector */}
              <div className="p-2 rounded-lg bg-black/60 backdrop-blur-md border border-slate-700 text-slate-300 flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-sky-400">
                  <Wind className="w-4 h-4" />
                  <span>WIND: {windSpd} km/h</span>
                </div>
                <div className="h-3 w-[1px] bg-slate-700" />
                <div className="flex items-center gap-1.5 text-amber-300">
                  <Compass className="w-4 h-4" />
                  <span>DIR: {windDir}° ({incident.windDirectionCardinal || 'SW'})</span>
                </div>
                <div className="h-3 w-[1px] bg-slate-700" />
                <div className="text-emerald-400">
                  <span>SPREAD: {assessment.spreadRateMMin} m/min</span>
                </div>
              </div>

              {/* Bottom Right: Stream Metrics & Water Drop Point */}
              <div className="p-2 rounded-lg bg-black/60 backdrop-blur-md border border-slate-700 text-slate-400 flex items-center gap-3">
                <span className="text-white font-bold">{liveClock} UTC</span>
                <span className="text-emerald-400">{streamHealth.fps} FPS</span>
                <span>{streamHealth.latencyMs}ms LAT</span>
                <span className="text-cyan-400">AIR-DROP: {assessment.recommendedDropPoint.lat}°N</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Mission Actions Footer */}
        <div className="px-4 py-3 bg-slate-900/90 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>
              {isAr 
                ? 'البث المباشر مشفر ومربوط بنموذج التنبؤ الذاتي لتقدير شدة خط النار فورياً.'
                : 'Direct encrypted downlink streaming; continuously auto-calibrating physical Rothermel flame model.'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Tag Water Drop Button */}
            <button
              id="btn-tag-drop-zone-live"
              onClick={handleTagWaterDrop}
              className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-950/40 transition cursor-pointer"
            >
              <Target className="w-3.5 h-3.5 text-cyan-200" />
              <span>
                {isAr 
                  ? 'تحديد إحداثيات الإنزال الجوي للطائرات' 
                  : 'Designate Canadair Drop Coordinates'}
              </span>
            </button>

            {/* Capture Snapshot Button */}
            <button
              id="btn-capture-snapshot-live"
              onClick={handleTakeSnapshot}
              className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 text-slate-300" />
              <span>
                {isAr
                  ? 'التقاط صورة استطلاع وإرفاقها بالتقرير'
                  : 'Capture Recon Telemetry Snapshot'}
              </span>
            </button>

            <button
              onClick={() => setShowTacticalReticle(!showTacticalReticle)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px] transition cursor-pointer"
            >
              {showTacticalReticle ? (isAr ? 'إخفاء التقاطع' : 'Hide Crosshair') : (isAr ? 'إظهار التقاطع' : 'Show Crosshair')}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition cursor-pointer shadow-md"
            >
              {isAr ? 'إغلاق نافذة البث' : 'Close Stream'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
