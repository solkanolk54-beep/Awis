import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Flame, 
  Eye, 
  Maximize2, 
  Minimize2, 
  Camera, 
  Compass, 
  Battery, 
  Wifi, 
  Radio, 
  Crosshair, 
  Layers, 
  RotateCw, 
  Sparkles, 
  AlertTriangle, 
  Target, 
  ZoomIn, 
  ZoomOut, 
  Sliders, 
  ShieldAlert, 
  Download, 
  CheckCircle2, 
  Navigation, 
  Wind, 
  Thermometer, 
  Activity, 
  Move3d,
  ChevronDown
} from 'lucide-react';
import { 
  WildfireIncident, 
  DroneMissionState, 
  DroneCameraMode, 
  DroneThermalPalette, 
  DroneFlightPattern,
  Language 
} from '../../types';
import { 
  computeDroneTacticalAssessment, 
  generateHotspotPoints, 
  THERMAL_PALETTES,
  HotspotPoint 
} from '../../services/droneReconService';
import { translations } from '../../i18n/translations';

interface DroneViewSimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  incidents: WildfireIncident[];
  selectedIncident: WildfireIncident;
  onSelectIncident: (inc: WildfireIncident) => void;
  missionState: DroneMissionState;
  onUpdateMission: (updated: Partial<DroneMissionState>) => void;
  currentLang: Language;
}

export const DroneViewSimulationModal: React.FC<DroneViewSimulationModalProps> = ({
  isOpen,
  onClose,
  incidents,
  selectedIncident,
  onSelectIncident,
  missionState,
  onUpdateMission,
  currentLang
}) => {
  const t = translations[currentLang];
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [snapshotTaken, setSnapshotTaken] = useState(false);
  const [dropTagged, setDropTagged] = useState(false);
  const [selectedHotspot, setSelectedHotspot] = useState<HotspotPoint | null>(null);

  // Animated canvas reference for dynamic thermal / RGB simulation
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const tickRef = useRef<number>(0);

  // Compute live assessment for the current incident
  const assessment = computeDroneTacticalAssessment(selectedIncident);
  const hotspots = generateHotspotPoints(selectedIncident, assessment);

  // Flight simulation state (heading animation during orbit)
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      tickRef.current += 1;
      if (missionState.flightPattern === 'orbit') {
        const newHeading = (missionState.headingDegrees + 1) % 360;
        onUpdateMission({ headingDegrees: newHeading });
      }
    }, 150);

    return () => clearInterval(interval);
  }, [isOpen, missionState.flightPattern, missionState.headingDegrees, onUpdateMission]);

  // Render animated thermal or RGB drone camera feed
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isSubscribed = true;

    const renderFeed = () => {
      if (!isSubscribed) return;
      const width = canvas.width;
      const height = canvas.height;
      const t = tickRef.current * 0.05;

      const isThermal = missionState.cameraMode === 'thermal';
      const windAngleRad = ((selectedIncident.windDirectionDegrees - 90) * Math.PI) / 180;
      const windStrength = selectedIncident.windSpeedKmH;

      ctx.clearRect(0, 0, width, height);

      if (isThermal) {
        // --- 1. THERMAL FLIR SIMULATION ---
        // Base dark cool ambient background (cool ground: 25-35°C)
        const currentPalette = THERMAL_PALETTES[missionState.thermalPalette] || THERMAL_PALETTES.ironbow;
        const bgColors = currentPalette.mapColors;

        const bgGrad = ctx.createLinearGradient(0, 0, width, height);
        bgGrad.addColorStop(0, bgColors[0]);
        bgGrad.addColorStop(1, bgColors[1] || bgColors[0]);
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        // Subtle topographic / vegetation coolness contours
        ctx.fillStyle = bgColors[1] || '#1a0b38';
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const rx = width * (0.2 + i * 0.15) + Math.sin(t + i) * 6;
          const ry = height * (0.3 + (i % 3) * 0.2) + Math.cos(t * 0.8 + i) * 5;
          ctx.ellipse(rx, ry, 60 + i * 15, 40 + i * 10, i * 0.3, 0, Math.PI * 2);
        }
        ctx.fill();

        // Main Radiative Thermal Core (High temperature plume)
        const centerX = width * 0.5;
        const centerY = height * 0.52;

        // Thermal radiation rings (Isotherms)
        const rings = [
          { r: 160, color: bgColors[1], opacity: 0.35 },
          { r: 120, color: bgColors[2], opacity: 0.55 },
          { r: 85, color: bgColors[3], opacity: 0.75 },
          { r: 48, color: bgColors[4] || '#ffffff', opacity: 0.95 }
        ];

        rings.forEach((ring, idx) => {
          const driftX = centerX + Math.cos(windAngleRad) * (idx * 14) + Math.sin(t * 2 + idx) * 3;
          const driftY = centerY + Math.sin(windAngleRad) * (idx * 14) + Math.cos(t * 1.5 + idx) * 3;

          const radGrad = ctx.createRadialGradient(driftX, driftY, 4, driftX, driftY, ring.r);
          radGrad.addColorStop(0, ring.color);
          radGrad.addColorStop(0.7, ring.color);
          radGrad.addColorStop(1, 'transparent');

          ctx.save();
          ctx.globalAlpha = ring.opacity;
          ctx.fillStyle = radGrad;
          ctx.beginPath();
          ctx.ellipse(
            driftX,
            driftY,
            ring.r * (1 + (windStrength / 80)),
            ring.r * (0.85),
            windAngleRad,
            0,
            Math.PI * 2
          );
          ctx.fill();
          ctx.restore();
        });

        // Flame front teeth / hotspots (800°C+ thermal spikes)
        const spikeCount = 7;
        for (let s = 0; s < spikeCount; s++) {
          const angle = windAngleRad + ((s - spikeCount / 2) * 0.25);
          const dist = 55 + Math.sin(t * 4 + s * 1.5) * 8;
          const sx = centerX + Math.cos(angle) * dist;
          const sy = centerY + Math.sin(angle) * dist;

          const spikeGrad = ctx.createRadialGradient(sx, sy, 2, sx, sy, 18);
          spikeGrad.addColorStop(0, '#ffffff');
          spikeGrad.addColorStop(0.5, bgColors[4] || '#fff7b2');
          spikeGrad.addColorStop(1, 'transparent');

          ctx.fillStyle = spikeGrad;
          ctx.beginPath();
          ctx.arc(sx, sy, 20, 0, Math.PI * 2);
          ctx.fill();
        }

        // Isotherm high-intensity pulsing threshold (> 600°C)
        if (assessment.isothermActive) {
          ctx.save();
          ctx.strokeStyle = Math.sin(t * 6) > 0 ? '#ec4899' : '#a855f7';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.ellipse(
            centerX + Math.cos(windAngleRad) * 20,
            centerY + Math.sin(windAngleRad) * 20,
            75,
            50,
            windAngleRad,
            0,
            Math.PI * 2
          );
          ctx.stroke();
          ctx.restore();
        }

        // Simulated FLIR digital scanlines & sensor noise
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
        for (let y = 0; y < height; y += 4) {
          ctx.fillRect(0, y, width, 1.5);
        }
        ctx.restore();

      } else {
        // --- 2. RGB TRUE-COLOR OPTICAL SIMULATION ---
        // Natural Mediterranean Algerian forest terrain (Aleppo pine green, rock ridges)
        const forestGrad = ctx.createRadialGradient(width * 0.5, height * 0.4, 80, width * 0.5, height * 0.5, width * 0.8);
        forestGrad.addColorStop(0, '#1c3d25');
        forestGrad.addColorStop(0.6, '#142e1c');
        forestGrad.addColorStop(1, '#0e1f13');
        ctx.fillStyle = forestGrad;
        ctx.fillRect(0, 0, width, height);

        // Mountain ridge and terrain road (RN-77 corridor)
        ctx.save();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(0, height * 0.85);
        ctx.bezierCurveTo(width * 0.3, height * 0.75, width * 0.6, height * 0.9, width, height * 0.7);
        ctx.stroke();
        ctx.restore();

        // Burnt charcoal scar behind the advancing flame line
        ctx.save();
        ctx.fillStyle = 'rgba(23, 23, 23, 0.85)';
        ctx.beginPath();
        const scarX = width * 0.5 - Math.cos(windAngleRad) * 35;
        const scarY = height * 0.52 - Math.sin(windAngleRad) * 35;
        ctx.ellipse(scarX, scarY, 70, 48, windAngleRad, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Billowing Pyrocumulus Smoke Plume (drifting along wind vector)
        const smokePuffs = 12;
        ctx.save();
        for (let p = 0; p < smokePuffs; p++) {
          const progress = p / smokePuffs;
          const puffX = width * 0.5 + Math.cos(windAngleRad) * (progress * 260) + Math.sin(t * 1.5 + p) * (15 * progress);
          const puffY = height * 0.52 + Math.sin(windAngleRad) * (progress * 260) + Math.cos(t * 1.2 + p) * (12 * progress);
          const puffRadius = 30 + progress * 75;

          const smokeGrad = ctx.createRadialGradient(puffX, puffY, 4, puffX, puffY, puffRadius);
          smokeGrad.addColorStop(0, 'rgba(80, 80, 85, 0.75)');
          smokeGrad.addColorStop(0.6, 'rgba(120, 125, 130, 0.45)');
          smokeGrad.addColorStop(1, 'rgba(160, 165, 170, 0)');

          ctx.fillStyle = smokeGrad;
          ctx.beginPath();
          ctx.arc(puffX, puffY, puffRadius, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        // Vibrant flame front line (orange, red, yellow tongues)
        const flameCount = 14;
        ctx.save();
        for (let f = 0; f < flameCount; f++) {
          const flameAngle = windAngleRad + ((f - flameCount / 2) * 0.18);
          const fDist = 45 + Math.sin(t * 5 + f * 2) * 10;
          const fx = width * 0.5 + Math.cos(flameAngle) * fDist;
          const fy = height * 0.52 + Math.sin(flameAngle) * fDist;

          const fGrad = ctx.createRadialGradient(fx, fy, 1, fx, fy, 16);
          fGrad.addColorStop(0, '#ffffff');
          fGrad.addColorStop(0.3, '#fbbf24');
          fGrad.addColorStop(0.7, '#f97316');
          fGrad.addColorStop(1, 'transparent');

          ctx.fillStyle = fGrad;
          ctx.beginPath();
          ctx.arc(fx, fy, 18, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        // Atmospheric haze reduction filter toggle
        if (assessment.deHazeActive) {
          ctx.save();
          ctx.fillStyle = 'rgba(16, 185, 129, 0.04)';
          ctx.fillRect(0, 0, width, height);
          ctx.restore();
        }
      }

      animationFrameRef.current = requestAnimationFrame(renderFeed);
    };

    renderFeed();

    return () => {
      isSubscribed = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isOpen, missionState.cameraMode, missionState.thermalPalette, selectedIncident, assessment]);

  if (!isOpen) return null;

  const handleToggleCamera = (mode: DroneCameraMode) => {
    onUpdateMission({ cameraMode: mode });
  };

  const handleTagWaterDrop = () => {
    setDropTagged(true);
    setTimeout(() => setDropTagged(false), 4000);
  };

  const handleTakeSnapshot = () => {
    setSnapshotTaken(true);
    setTimeout(() => setSnapshotTaken(false), 3000);
  };

  const currentPaletteConfig = THERMAL_PALETTES[missionState.thermalPalette] || THERMAL_PALETTES.ironbow;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-hidden ${isFullscreen ? 'p-0' : ''}`}>
      <div 
        id="drone-simulation-modal-container"
        className={`relative w-full bg-slate-950 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${
          isFullscreen ? 'h-screen w-screen rounded-none max-w-none border-none' : 'max-w-6xl max-h-[95vh] h-[92vh]'
        }`}
      >
        {/* TOP COMMAND & TELEMETRY HEADER */}
        <div className="px-4 py-2.5 bg-slate-900/95 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 z-20">
          <div className="flex items-center gap-3">
            {/* Drone Icon with Pulsing Recon Indicator */}
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-mono font-bold tracking-wider">
                {missionState.droneId} • TACTICAL UAV
              </span>
            </div>

            {/* Incident Switcher Dropdown */}
            <div className="relative flex items-center">
              <select
                id="drone-incident-selector"
                value={selectedIncident.id}
                onChange={(e) => {
                  const target = incidents.find(i => i.id === e.target.value);
                  if (target) onSelectIncident(target);
                }}
                className="bg-slate-800/90 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg px-2.5 py-1.5 border border-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer pr-8"
              >
                {incidents.map((inc) => (
                  <option key={inc.id} value={inc.id}>
                    {inc.code} - {currentLang === 'ar' ? inc.wilayaAr : inc.wilaya}: {currentLang === 'ar' ? inc.locationNameAr : inc.locationName}
                  </option>
                ))}
              </select>
            </div>

            <span className="hidden sm:inline text-slate-500 text-xs font-mono">
              GPS: {selectedIncident.coordinates.lat.toFixed(4)}°N, {selectedIncident.coordinates.lng.toFixed(4)}°E
            </span>
          </div>

          {/* Quick Camera Mode Segmented Switch & Actions */}
          <div className="flex items-center gap-2">
            {/* CAMERA FEED TOGGLE (Thermal vs RGB) */}
            <div className="flex bg-slate-950 p-0.5 rounded-xl border border-slate-700 shadow-inner">
              <button
                id="drone-toggle-thermal-btn"
                onClick={() => handleToggleCamera('thermal')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  missionState.cameraMode === 'thermal'
                    ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Switch to FLIR Infrared Thermal Camera"
              >
                <Flame className="w-3.5 h-3.5 text-amber-300" />
                <span>{currentLang === 'ar' ? 'حراري (FLIR)' : 'FLIR Thermal'}</span>
              </button>
              <button
                id="drone-toggle-rgb-btn"
                onClick={() => handleToggleCamera('rgb')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  missionState.cameraMode === 'rgb'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Switch to True-Color Optical RGB Camera"
              >
                <Eye className="w-3.5 h-3.5 text-emerald-200" />
                <span>{currentLang === 'ar' ? 'مرئي (RGB)' : 'Optical RGB'}</span>
              </button>
            </div>

            {/* PROJECT AS LAYER ON GIS MAP TOGGLE */}
            <button
              id="drone-toggle-gis-layer-btn"
              onClick={() => onUpdateMission({ isLayerVisibleOnMap: !missionState.isLayerVisibleOnMap })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                missionState.isLayerVisibleOnMap
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-950/40'
                  : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
              title="Project live drone footprint & feed directly onto GIS Map"
            >
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">
                {missionState.isLayerVisibleOnMap
                  ? (currentLang === 'ar' ? 'طبقة الخريطة: مفعّلة' : 'GIS Layer: Active')
                  : (currentLang === 'ar' ? 'إسقاط كطبقة خريطة' : 'Project to Map')}
              </span>
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Close Drone View"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MAIN BODY: VIEWPORT + HUD + CONTROL PANEL */}
        <div className="flex-1 relative flex flex-col lg:flex-row overflow-hidden min-h-0">
          
          {/* LEFT/CENTER: DRONE SIMULATION CANVAS & MILITARY HUD */}
          <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden select-none">
            {/* 60FPS Video Feed Simulation Canvas */}
            <canvas
              ref={canvasRef}
              width={960}
              height={580}
              className="w-full h-full object-cover pointer-events-none"
            />

            {/* HUD OVERLAY LAYER */}
            <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between z-10 text-white font-mono text-xs">
              
              {/* TOP HUD BAR: Compass Heading Ribbon & Recording Indicator */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-lg border border-slate-700/60">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  <span className="text-red-400 font-bold tracking-widest text-[11px]">REC • LIVE FEED</span>
                  <span className="text-slate-400">|</span>
                  <span className="text-emerald-400">ALGIS-UAV NET-01</span>
                </div>

                {/* Top Compass Heading Tape */}
                <div className="flex items-center gap-3 bg-black/60 backdrop-blur-sm px-4 py-1 rounded-lg border border-slate-700/60">
                  <Compass className="w-4 h-4 text-emerald-400" />
                  <span className="text-slate-400">020</span>
                  <span className="text-slate-400">030</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                    {String(missionState.headingDegrees).padStart(3, '0')}° {selectedIncident.windDirectionCardinal || 'NE'}
                  </span>
                  <span className="text-slate-400">050</span>
                  <span className="text-slate-400">060</span>
                </div>

                {/* Battery & RF Link Quality */}
                <div className="flex items-center gap-3 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-lg border border-slate-700/60">
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <Battery className="w-4 h-4" />
                    <span className="font-bold">{missionState.batteryPercent}%</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sky-400">
                    <Wifi className="w-3.5 h-3.5" />
                    <span>{missionState.signalStrengthPercent}%</span>
                  </div>
                </div>
              </div>

              {/* CENTER HUD: Reticle, Artificial Horizon & Target Box */}
              <div className="relative flex-1 flex items-center justify-center">
                {/* Center Crosshair Reticle */}
                <div className="relative flex items-center justify-center">
                  <div className="w-16 h-16 border border-white/40 rounded-full flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                  </div>
                  <div className="absolute w-24 h-0.5 bg-white/30" />
                  <div className="absolute h-24 w-0.5 bg-white/30" />
                  
                  {/* Artificial Horizon Pitch Marks */}
                  <div className="absolute -top-12 text-[10px] text-white/50 font-bold">+10°</div>
                  <div className="absolute -bottom-12 text-[10px] text-white/50 font-bold">-10°</div>
                </div>

                {/* Interactive Hotspot Temperature Overlays */}
                {hotspots.map((spot) => (
                  <div
                    key={spot.id}
                    style={{ left: `${spot.xPercent}%`, top: `${spot.yPercent}%` }}
                    className="absolute pointer-events-auto -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                    onClick={() => setSelectedHotspot(spot)}
                  >
                    <div className={`p-1 rounded border flex items-center gap-1 shadow-lg transition-all ${
                      spot.type === 'core'
                        ? 'bg-red-950/90 border-red-500 text-red-200 animate-pulse'
                        : spot.type === 'front'
                        ? 'bg-amber-950/90 border-amber-500 text-amber-200'
                        : 'bg-slate-900/90 border-slate-600 text-slate-300'
                    }`}>
                      <Target className="w-3 h-3 text-red-400" />
                      <span className="font-black text-[11px]">{spot.tempC}°C</span>
                    </div>
                    <div className="hidden group-hover:block absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-0.5 rounded bg-black/90 border border-slate-700 text-[10px] text-slate-200 whitespace-nowrap z-20">
                      {currentLang === 'ar' ? spot.labelAr : spot.label} ({spot.tempC}°C)
                    </div>
                  </div>
                ))}

                {/* WATER BOMBING DROP POINT TARGET RETICLE */}
                <div 
                  style={{ left: '62%', top: '38%' }}
                  className="absolute pointer-events-auto -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                >
                  <div className={`w-10 h-10 rounded-full border-2 border-dashed flex items-center justify-center ${
                    dropTagged ? 'border-cyan-400 bg-cyan-950/40 animate-spin' : 'border-cyan-500/70 bg-cyan-950/20'
                  }`}>
                    <Crosshair className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div className="mt-1 px-2 py-0.5 rounded bg-slate-900/90 border border-cyan-500 text-[10px] text-cyan-300 font-bold shadow-lg">
                    {currentLang === 'ar' ? 'نقطة الإنزال المقترحة (Drop Zone)' : 'Optimum Retardant Drop'}
                  </div>
                </div>
              </div>

              {/* BOTTOM HUD READOUT: Flight Telemetry & Zoom/Gimbal */}
              <div className="flex items-center justify-between">
                {/* Left Telemetry (Altitude & Speed) */}
                <div className="space-y-0.5 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-700/60">
                  <div className="text-slate-400 text-[11px]">
                    ALT: <span className="text-emerald-300 font-bold">{missionState.altitudeMeters} m AGL</span>
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    SPD: <span className="text-emerald-300 font-bold">{missionState.speedKmH} km/h</span>
                  </div>
                </div>

                {/* Center Warning or Tag Confirmation */}
                {dropTagged && (
                  <div className="px-4 py-1.5 rounded-lg bg-cyan-950/95 border border-cyan-400 text-cyan-200 font-bold text-xs flex items-center gap-2 shadow-lg animate-bounce">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                    <span>COORDINATES TRANSMITTED TO CANADAIR BE-200 (BEJAIA AIRBASE)</span>
                  </div>
                )}
                {snapshotTaken && (
                  <div className="px-4 py-1.5 rounded-lg bg-emerald-950/95 border border-emerald-400 text-emerald-200 font-bold text-xs flex items-center gap-2 shadow-lg">
                    <Camera className="w-4 h-4 text-emerald-400" />
                    <span>TACTICAL RECON SNAPSHOT CAPTURED & ARCHIVED</span>
                  </div>
                )}

                {/* Right Telemetry (Gimbal & Zoom) */}
                <div className="space-y-0.5 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-700/60 text-right">
                  <div className="text-slate-400 text-[11px]">
                    GIMBAL: <span className="text-sky-300 font-bold">{missionState.gimbalPitch}°</span>
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    OPTICAL ZOOM: <span className="text-sky-300 font-bold">{missionState.zoomLevel.toFixed(1)}x</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Floating Zoom / Pitch Overlay Controls */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1.5 bg-slate-900/80 backdrop-blur-md p-1.5 rounded-xl border border-slate-700 shadow-xl pointer-events-auto">
              <button
                onClick={() => onUpdateMission({ zoomLevel: Math.min(20, missionState.zoomLevel + 1) })}
                className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => onUpdateMission({ zoomLevel: Math.max(1, missionState.zoomLevel - 1) })}
                className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <div className="h-px bg-slate-700 my-0.5" />
              <button
                onClick={() => onUpdateMission({ gimbalPitch: missionState.gimbalPitch === -90 ? -45 : -90 })}
                className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title={missionState.gimbalPitch === -90 ? 'Switch to Oblique View (-45°)' : 'Switch to Nadir View (-90°)'}
              >
                <Move3d className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* RIGHT SIDEBAR: TACTICAL WILDFIRE INTENSITY & RECON INTELLIGENCE */}
          <div className="w-full lg:w-96 bg-slate-900/95 border-t lg:border-t-0 lg:border-l border-slate-800 p-4 flex flex-col justify-between overflow-y-auto space-y-4">
            
            {/* 1. FLIGHT PATTERN MANEUVERS */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>{currentLang === 'ar' ? 'نمط الطيران التكتيكي' : 'Tactical Flight Pattern'}</span>
                <span className="text-[10px] text-emerald-400 font-mono">AUTOPILOT LOCK</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'orbit', label: currentLang === 'ar' ? 'دوران تكتيكي' : 'Incident Orbit', icon: RotateCw },
                  { id: 'sweep', label: currentLang === 'ar' ? 'مسح جبهة النار' : 'Front Sweep', icon: Wind },
                  { id: 'hover', label: currentLang === 'ar' ? 'تثبيت الموقع' : 'Hover Stationary', icon: Target },
                  { id: 'grid', label: currentLang === 'ar' ? 'مسح شبكي' : 'Grid Perimeter', icon: Layers }
                ].map((pat) => {
                  const Icon = pat.icon;
                  const isActive = missionState.flightPattern === pat.id;
                  return (
                    <button
                      key={pat.id}
                      onClick={() => onUpdateMission({ flightPattern: pat.id as DroneFlightPattern })}
                      className={`flex items-center gap-2 p-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                        isActive
                          ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                          : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                      <span>{pat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. THERMAL PALETTES (When in Thermal Mode) */}
            {missionState.cameraMode === 'thermal' && (
              <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>{currentLang === 'ar' ? 'لوحة الألوان الحرارية (FLIR Palette)' : 'Thermal Palette'}</span>
                  <span className="text-[10px] text-amber-400 font-mono">CALIBRATED</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['ironbow', 'white_hot', 'black_hot', 'rainbow'] as DroneThermalPalette[]).map((pal) => (
                    <button
                      key={pal}
                      onClick={() => onUpdateMission({ thermalPalette: pal })}
                      className={`p-2 rounded-lg text-xs font-medium border text-left flex flex-col gap-1 transition cursor-pointer ${
                        missionState.thermalPalette === pal
                          ? 'bg-slate-800 border-amber-500 text-amber-300 font-bold'
                          : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span className="capitalize">{pal.replace('_', ' ')}</span>
                      <div 
                        className="w-full h-2 rounded" 
                        style={{ background: THERMAL_PALETTES[pal].gradient }} 
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 3. TACTICAL WILDFIRE INTENSITY ASSESSMENT */}
            <div className="space-y-2.5 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                  <Activity className="w-4 h-4 text-red-400" />
                  <span>{currentLang === 'ar' ? 'تقييم شدة الحريق الحرارية' : 'Wildfire Intensity Assessment'}</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                  assessment.intensityClass === 'Catastrophic Crown'
                    ? 'bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}>
                  {assessment.intensityClass}
                </span>
              </div>

              {/* Metric Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Max Flame Temp */}
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Thermometer className="w-3.5 h-3.5 text-red-400" />
                    <span>{currentLang === 'ar' ? 'أقصى حرارة لهب' : 'Max Flame Temp'}</span>
                  </div>
                  <div className="text-base font-bold text-red-400 mt-0.5">
                    {assessment.maxHotspotTempC}°C
                  </div>
                </div>

                {/* Advancing Front Temp */}
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    <span>{currentLang === 'ar' ? 'حرارة الجبهة' : 'Front Line Temp'}</span>
                  </div>
                  <div className="text-base font-bold text-amber-300 mt-0.5">
                    {assessment.flameFrontTempC}°C
                  </div>
                </div>

                {/* Fire Radiative Power */}
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                    <span>FRP (Power)</span>
                  </div>
                  <div className="text-base font-bold text-yellow-300 mt-0.5">
                    {assessment.fireRadiativePowerMw} MW
                  </div>
                </div>

                {/* Rate of Spread */}
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Wind className="w-3.5 h-3.5 text-sky-400" />
                    <span>{currentLang === 'ar' ? 'سرعة الانتشار' : 'Rate of Spread'}</span>
                  </div>
                  <div className="text-base font-bold text-sky-300 mt-0.5">
                    {assessment.spreadRateMMin} m/min
                  </div>
                </div>
              </div>

              {/* Flame Height & Canopy Leap Danger */}
              <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">{currentLang === 'ar' ? 'ارتفاع ألسنة اللهب المقدر:' : 'Estimated Flame Height:'}</span>
                <span className="font-bold text-white">{assessment.flameHeightMeters} meters</span>
              </div>
            </div>

            {/* 4. TACTICAL ACTIONS: DROP TARGETING & SNAPSHOT */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              {/* Tag Water Drop Button */}
              <button
                id="btn-tag-drop-zone"
                onClick={handleTagWaterDrop}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-950/50 transition cursor-pointer"
              >
                <Target className="w-4 h-4 text-cyan-200" />
                <span>
                  {currentLang === 'ar' 
                    ? 'تحديد إحداثيات الإنزال الجوي للطائرات' 
                    : 'Designate Canadair Drop Coordinates'}
                </span>
              </button>

              {/* Capture Snapshot Button */}
              <button
                id="btn-capture-snapshot"
                onClick={handleTakeSnapshot}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition cursor-pointer"
              >
                <Camera className="w-4 h-4 text-slate-300" />
                <span>
                  {currentLang === 'ar'
                    ? 'التقاط صورة استطلاع وإرفاقها بالتقرير'
                    : 'Capture Recon Telemetry Snapshot'}
                </span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
