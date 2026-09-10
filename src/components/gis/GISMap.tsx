import React, { useState, useRef, useMemo } from 'react';
import { 
  Plus, 
  Minus, 
  RotateCcw, 
  Layers, 
  Flame, 
  Wind, 
  Droplets, 
  Radio, 
  Eye, 
  Compass, 
  Maximize2,
  Shield,
  Trees,
  Navigation,
  Crosshair,
  MapPin,
  Locate,
  RadioTower,
  Sparkles,
  WifiOff,
  HardDrive,
  Camera,
  Target,
  Activity,
  ChevronRight
} from 'lucide-react';
import { 
  WildfireIncident, 
  ForestZone, 
  WaterPoint, 
  WatchtowerCamera, 
  EmergencyResource, 
  Language,
  RiskLevel,
  DroneMissionState,
  DroneCameraMode
} from '../../types';
import { ALGERIA_WILAYAS } from '../../data/algeriaData';
import { translations } from '../../i18n/translations';
import { UserLivePosition, computeDistanceKm } from '../../services/liveGeolocationService';
import { LiveWeatherData } from '../../services/liveWeatherService';
import { createInitialDroneMission, computeDroneTacticalAssessment } from '../../services/droneReconService';

interface GISMapProps {
  incidents: WildfireIncident[];
  forests: ForestZone[];
  waterPoints: WaterPoint[];
  watchtowers: WatchtowerCamera[];
  resources: EmergencyResource[];
  selectedIncident: WildfireIncident | null;
  onSelectIncident: (inc: WildfireIncident) => void;
  onSelectForest: (forest: ForestZone) => void;
  currentLang: Language;
  userPosition?: UserLivePosition | null;
  onLocateUser?: () => void;
  isLocating?: boolean;
  liveWeather?: LiveWeatherData | null;
  isOnline?: boolean;
  isSimulatedOffline?: boolean;
  onOpenOfflineManager?: () => void;
  droneMission?: DroneMissionState;
  onUpdateDroneMission?: (updated: Partial<DroneMissionState>) => void;
  onOpenDroneSimulation?: (incident?: WildfireIncident) => void;
}

export const GISMap: React.FC<GISMapProps> = ({
  incidents,
  forests,
  waterPoints,
  watchtowers,
  resources,
  selectedIncident,
  onSelectIncident,
  onSelectForest,
  currentLang,
  userPosition,
  onLocateUser,
  isLocating = false,
  liveWeather,
  isOnline = true,
  isSimulatedOffline = false,
  onOpenOfflineManager,
  droneMission,
  onUpdateDroneMission,
  onOpenDroneSimulation
}) => {
  const t = translations[currentLang];

  // Fallback drone mission state if not passed from parent
  const [internalDroneMission, setInternalDroneMission] = useState<DroneMissionState>(() => 
    createInitialDroneMission(selectedIncident || incidents[0])
  );

  const activeDroneMission = droneMission || internalDroneMission;
  const updateDroneMissionHandler = (updated: Partial<DroneMissionState>) => {
    if (onUpdateDroneMission) {
      onUpdateDroneMission(updated);
    } else {
      setInternalDroneMission(prev => ({ ...prev, ...updated }));
    }
  };

  // Find incident that drone is patrolling
  const dronePatrolIncident = incidents.find(i => i.id === activeDroneMission.activeIncidentId) || selectedIncident || incidents[0];
  const droneAssessment = useMemo(() => {
    return dronePatrolIncident ? computeDroneTacticalAssessment(dronePatrolIncident) : activeDroneMission.assessment;
  }, [dronePatrolIncident, activeDroneMission.assessment]);

  // Layer Visibility State
  const [layers, setLayers] = useState({
    wilayas: true,
    forests: true,
    riskHeatmap: true,
    incidents: true,
    spreadIsochrones: true,
    waterPoints: true,
    civilProtection: true,
    watchtowers: true,
    drones: true,
    windVectors: true
  });

  const [mapMode, setMapMode] = useState<'tactical_dark' | 'satellite' | 'topographic'>('tactical_dark');
  const [showLayerPanel, setShowLayerPanel] = useState(false);

  // Zoom and Pan State
  const [zoom, setZoom] = useState(1.4);
  const [pan, setPan] = useState({ x: -140, y: -40 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [mouseCoords, setMouseCoords] = useState<{ lat: number; lng: number } | null>({ lat: 36.78, lng: 5.72 });
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Geographic bounds conversion for Northern Algeria (Lat 34.0 to 37.5, Lng -2.0 to 9.0)
  // Maps to SVG coordinate viewport 0..1000 X and 0..650 Y
  const geoToSvg = (lat: number, lng: number) => {
    const minLng = -2.5;
    const maxLng = 9.5;
    const minLat = 34.0;
    const maxLat = 37.5;

    const x = ((lng - minLng) / (maxLng - minLng)) * 1000;
    // Invert Y because latitude goes north (up) but SVG Y goes down
    const y = ((maxLat - lat) / (maxLat - minLat)) * 600 + 30;
    return { x, y };
  };

  const svgToGeo = (x: number, y: number) => {
    const minLng = -2.5;
    const maxLng = 9.5;
    const minLat = 34.0;
    const maxLat = 37.5;

    const lng = (x / 1000) * (maxLng - minLng) + minLng;
    const lat = maxLat - ((y - 30) / 600) * (maxLat - minLat);
    return {
      lat: Number(lat.toFixed(4)),
      lng: Number(lng.toFixed(4))
    };
  };

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }

    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const rawX = e.clientX - rect.left;
      const rawY = e.clientY - rect.top;
      // Calculate SVG internal coordinate taking pan & zoom into account
      const svgX = (rawX - pan.x) / zoom;
      const svgY = (rawY - pan.y) / zoom;
      setMouseCoords(svgToGeo(svgX, svgY));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoom = (factor: number) => {
    setZoom((prev) => Math.min(3.5, Math.max(0.8, prev * factor)));
  };

  const handleResetView = () => {
    setZoom(1.4);
    setPan({ x: -140, y: -40 });
  };

  const handleCenterOnUser = () => {
    if (userPosition) {
      const pt = geoToSvg(userPosition.lat, userPosition.lng);
      setZoom(2.4);
      setPan({
        x: 500 - pt.x * 2.4,
        y: 325 - pt.y * 2.4
      });
    } else if (onLocateUser) {
      onLocateUser();
    }
  };

  const toggleLayer = (layerKey: keyof typeof layers) => {
    setLayers((prev) => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  const getRiskColor = (level: RiskLevel) => {
    switch (level) {
      case 'critical': return '#b91c1c';
      case 'extreme': return '#ef4444';
      case 'high': return '#f97316';
      case 'moderate': return '#eab308';
      case 'low': return '#10b981';
      default: return '#64748b';
    }
  };

  return (
    <div className="relative w-full h-full min-h-[580px] bg-[#070b13] overflow-hidden select-none border border-slate-800 rounded-xl shadow-2xl flex flex-col">
      {/* Top Map Operational Toolbar */}
      <div className="absolute top-3 left-3 right-3 z-30 flex flex-wrap items-center justify-between pointer-events-none gap-2">
        {/* Geographic Coordinate Inspector Readout */}
        <div className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-xs font-mono shadow-lg text-slate-300">
          <Crosshair className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>CURSOR:</span>
          {mouseCoords ? (
            <span className="text-emerald-300 font-bold">
              {mouseCoords.lat}°N, {mouseCoords.lng}°E
            </span>
          ) : (
            <span className="text-slate-500">Searching...</span>
          )}
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">ZONE: TELL ATLAS MARITIME</span>
        </div>

        {/* Live GPS & Weather Telemetry Readout & Offline Status */}
        <div className="pointer-events-auto flex items-center gap-2">
          {(!isOnline || isSimulatedOffline) && (
            <button
              onClick={onOpenOfflineManager}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-950/90 border border-amber-500 text-amber-300 text-xs font-mono shadow-lg transition cursor-pointer animate-pulse"
              title="Offline Forest Cache Mode Active - Click to Manage"
            >
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
              <span>OFFLINE CACHE (100% SVG GIS)</span>
            </button>
          )}

          {userPosition ? (
            <button
              onClick={handleCenterOnUser}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-950/80 border border-sky-500/50 text-sky-300 text-xs font-mono shadow-lg hover:bg-sky-900/60 transition cursor-pointer"
              title="Click to Center on your Live GPS"
            >
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
              <Locate className="w-3.5 h-3.5 text-sky-400" />
              <span>GPS: {userPosition.lat}°N, {userPosition.lng}°E</span>
              <span className="text-[10px] text-sky-400/80">±{userPosition.accuracyMeters}m</span>
            </button>
          ) : (
            <button
              onClick={onLocateUser}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700 text-slate-300 text-xs shadow-lg hover:bg-slate-800 transition cursor-pointer"
              title="Activate Live Device GPS"
            >
              <Locate className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin text-sky-400' : 'text-slate-400'}`} />
              <span>{isLocating ? (currentLang === 'ar' ? 'جاري تحديد GPS...' : 'Locating...') : (currentLang === 'ar' ? 'تفعيل GPS الفعلي' : 'Enable Live GPS')}</span>
            </button>
          )}
        </div>

        {/* Map Mode Buttons & Layer Control Toggle */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Map Base Mode */}
          <div className="flex bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setMapMode('tactical_dark')}
              className={`px-2.5 py-1 rounded transition ${mapMode === 'tactical_dark' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              Tactical GIS
            </button>
            <button
              onClick={() => setMapMode('satellite')}
              className={`px-2.5 py-1 rounded transition ${mapMode === 'satellite' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              Sentinel Hybrid
            </button>
            <button
              onClick={() => setMapMode('topographic')}
              className={`px-2.5 py-1 rounded transition ${mapMode === 'topographic' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              Topography
            </button>
          </div>

          {/* Tactical Airborne Drone Reconnaissance Toolbar Pill */}
          <div className="flex items-center bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => onOpenDroneSimulation?.(dronePatrolIncident)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 text-emerald-400 hover:bg-slate-700 font-bold transition cursor-pointer"
              title={currentLang === 'ar' ? 'فتح محاكاة قمرة قيادة الدرون' : 'Open Tactical Drone Cockpit'}
            >
              <Camera className="w-3.5 h-3.5 text-emerald-400" />
              <span>{currentLang === 'ar' ? 'درون DZ-04' : 'UAV DZ-04'}</span>
            </button>
            <div className="h-4 w-px bg-slate-700 mx-1" />
            <button
              onClick={() => {
                if (!layers.drones) toggleLayer('drones');
                updateDroneMissionHandler({ cameraMode: 'thermal' });
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded transition cursor-pointer ${
                layers.drones && activeDroneMission.cameraMode === 'thermal'
                  ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title={currentLang === 'ar' ? 'تفعيل طبقة الكاميرا الحرارية FLIR على الخريطة' : 'Display FLIR Thermal Feed Layer on Map'}
            >
              <Flame className="w-3 h-3 text-amber-300" />
              <span>{currentLang === 'ar' ? 'حراري (FLIR)' : 'Thermal'}</span>
            </button>
            <button
              onClick={() => {
                if (!layers.drones) toggleLayer('drones');
                updateDroneMissionHandler({ cameraMode: 'rgb' });
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded transition cursor-pointer ${
                layers.drones && activeDroneMission.cameraMode === 'rgb'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title={currentLang === 'ar' ? 'تفعيل طبقة الكاميرا البصرية RGB على الخريطة' : 'Display Optical RGB Feed Layer on Map'}
            >
              <Eye className="w-3 h-3 text-emerald-200" />
              <span>RGB</span>
            </button>
          </div>

          {/* Layer Controls Button */}
          <button
            onClick={() => setShowLayerPanel(!showLayerPanel)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold shadow-lg transition cursor-pointer ${
              showLayerPanel 
                ? 'bg-emerald-600 border-emerald-400 text-white' 
                : 'bg-slate-900/90 backdrop-blur-md border-slate-700/80 text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-emerald-300" />
            <span>GIS Layers ({Object.values(layers).filter(Boolean).length})</span>
          </button>
        </div>
      </div>

      {/* Layer Toggle Floating Panel */}
      {showLayerPanel && (
        <div className="absolute top-14 right-3 z-30 w-72 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-xl p-3 shadow-2xl text-xs space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-400" />
              GIS Layer Stack
            </span>
            <span className="text-[10px] text-emerald-400 font-mono">LIVE SYNC</span>
          </div>

          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            <label className="flex items-center justify-between p-1.5 rounded hover:bg-slate-800/60 cursor-pointer">
              <span className="flex items-center gap-2 text-slate-300">
                <Shield className="w-3.5 h-3.5 text-blue-400" />
                {t.layerWilayas}
              </span>
              <input 
                type="checkbox" 
                checked={layers.wilayas} 
                onChange={() => toggleLayer('wilayas')} 
                className="rounded accent-emerald-500"
              />
            </label>

            <label className="flex items-center justify-between p-1.5 rounded hover:bg-slate-800/60 cursor-pointer">
              <span className="flex items-center gap-2 text-slate-300">
                <Trees className="w-3.5 h-3.5 text-emerald-400" />
                {t.layerForests}
              </span>
              <input 
                type="checkbox" 
                checked={layers.forests} 
                onChange={() => toggleLayer('forests')} 
                className="rounded accent-emerald-500"
              />
            </label>

            <label className="flex items-center justify-between p-1.5 rounded hover:bg-slate-800/60 cursor-pointer">
              <span className="flex items-center gap-2 text-slate-300">
                <span className="w-3 h-3 rounded-full bg-gradient-to-r from-yellow-500 via-orange-500 to-red-600 inline-block" />
                {t.layerRiskHeatmap}
              </span>
              <input 
                type="checkbox" 
                checked={layers.riskHeatmap} 
                onChange={() => toggleLayer('riskHeatmap')} 
                className="rounded accent-emerald-500"
              />
            </label>

            <label className="flex items-center justify-between p-1.5 rounded hover:bg-slate-800/60 cursor-pointer">
              <span className="flex items-center gap-2 text-slate-300">
                <Flame className="w-3.5 h-3.5 text-red-500" />
                {t.layerActiveIncidents}
              </span>
              <input 
                type="checkbox" 
                checked={layers.incidents} 
                onChange={() => toggleLayer('incidents')} 
                className="rounded accent-emerald-500"
              />
            </label>

            <label className="flex items-center justify-between p-1.5 rounded hover:bg-slate-800/60 cursor-pointer">
              <span className="flex items-center gap-2 text-slate-300">
                <span className="w-3.5 h-3.5 border-2 border-dashed border-red-400 rounded-full inline-block" />
                {t.layerSpreadIsochrones}
              </span>
              <input 
                type="checkbox" 
                checked={layers.spreadIsochrones} 
                onChange={() => toggleLayer('spreadIsochrones')} 
                className="rounded accent-emerald-500"
              />
            </label>

            <label className="flex items-center justify-between p-1.5 rounded hover:bg-slate-800/60 cursor-pointer">
              <span className="flex items-center gap-2 text-slate-300">
                <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                {t.layerWaterPoints}
              </span>
              <input 
                type="checkbox" 
                checked={layers.waterPoints} 
                onChange={() => toggleLayer('waterPoints')} 
                className="rounded accent-emerald-500"
              />
            </label>

            <label className="flex items-center justify-between p-1.5 rounded hover:bg-slate-800/60 cursor-pointer">
              <span className="flex items-center gap-2 text-slate-300">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                {t.layerCivilProtection}
              </span>
              <input 
                type="checkbox" 
                checked={layers.civilProtection} 
                onChange={() => toggleLayer('civilProtection')} 
                className="rounded accent-emerald-500"
              />
            </label>

            <label className="flex items-center justify-between p-1.5 rounded hover:bg-slate-800/60 cursor-pointer">
              <span className="flex items-center gap-2 text-slate-300">
                <Eye className="w-3.5 h-3.5 text-indigo-400" />
                {t.layerWatchtowers}
              </span>
              <input 
                type="checkbox" 
                checked={layers.watchtowers} 
                onChange={() => toggleLayer('watchtowers')} 
                className="rounded accent-emerald-500"
              />
            </label>

            <label className="flex items-center justify-between p-1.5 rounded hover:bg-slate-800/60 cursor-pointer">
              <span className="flex items-center gap-2 text-slate-300">
                <Wind className="w-3.5 h-3.5 text-sky-400" />
                {t.layerWindVectors}
              </span>
              <input 
                type="checkbox" 
                checked={layers.windVectors} 
                onChange={() => toggleLayer('windVectors')} 
                className="rounded accent-emerald-500"
              />
            </label>

            <label className="flex items-center justify-between p-1.5 rounded hover:bg-slate-800/60 cursor-pointer bg-slate-800/30">
              <span className="flex items-center gap-2 text-slate-300">
                <Camera className="w-3.5 h-3.5 text-emerald-400" />
                <span className="flex items-center gap-1.5">
                  <span>{currentLang === 'ar' ? 'استطلاع الدرون (كاميرا حرارية/RGB)' : 'Drone Recon (Thermal/RGB Feed)'}</span>
                  <span className={`text-[10px] px-1 py-0.2 rounded font-mono font-bold ${activeDroneMission.cameraMode === 'thermal' ? 'bg-red-950 text-red-400 border border-red-800/50' : 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'}`}>
                    {activeDroneMission.cameraMode === 'thermal' ? 'FLIR' : 'RGB'}
                  </span>
                </span>
              </span>
              <input 
                type="checkbox" 
                checked={layers.drones} 
                onChange={() => toggleLayer('drones')} 
                className="rounded accent-emerald-500"
              />
            </label>
          </div>
        </div>
      )}

      {/* Floating Zoom and Navigation Controls */}
      <div className="absolute bottom-6 right-4 z-30 flex flex-col gap-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-1 shadow-2xl">
        <button
          onClick={handleCenterOnUser}
          className={`p-2 rounded-lg transition ${
            userPosition 
              ? 'bg-sky-500/20 text-sky-400 border border-sky-400/40 hover:bg-sky-500/30' 
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title={userPosition ? (currentLang === 'ar' ? 'التركيز على موقعي الفعلي GPS' : 'Focus on Live GPS') : (currentLang === 'ar' ? 'تحديد موقعي الفعلي GPS' : 'Acquire Live GPS')}
        >
          <Locate className={`w-4 h-4 ${isLocating ? 'animate-spin text-sky-400' : userPosition ? 'text-sky-300' : ''}`} />
        </button>
        <button
          onClick={() => handleZoom(1.25)}
          className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
          title="Zoom In"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleZoom(0.8)}
          className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
          title="Zoom Out"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetView}
          className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
          title="Reset Center"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Operational Risk Color Legend */}
      <div className="absolute bottom-6 left-4 z-30 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl px-3 py-2 text-xs shadow-2xl flex items-center gap-3">
        <span className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider">
          Risk Scale:
        </span>
        <div className="flex items-center gap-2 font-mono text-[10px]">
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> 0-35
          </span>
          <span className="flex items-center gap-1 text-yellow-400">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" /> 36-55
          </span>
          <span className="flex items-center gap-1 text-orange-400">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> 56-70
          </span>
          <span className="flex items-center gap-1 text-red-500">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> 71-85
          </span>
          <span className="flex items-center gap-1 text-rose-300 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-red-800 animate-ping" /> 86-100
          </span>
        </div>
      </div>

      {/* Interactive GIS SVG Canvas */}
      <svg
        ref={svgRef}
        className={`w-full h-full cursor-grab active:cursor-grabbing ${mapMode === 'satellite' ? 'bg-[#0b1424]' : mapMode === 'topographic' ? 'bg-[#0f172a]' : 'bg-[#060a12]'}`}
        viewBox="0 0 1000 650"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <defs>
          {/* Subtle Grid Pattern for High-Tech GIS feel */}
          <pattern id="gisGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(51, 65, 85, 0.15)" strokeWidth="0.8" />
          </pattern>

          {/* Radial Gradient for Active Fire Glow */}
          <radialGradient id="fireGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#f97316" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
          </radialGradient>

          {/* Isochrone Fills */}
          <radialGradient id="isochroneGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#dc2626" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0.1" />
          </radialGradient>

          {/* Camera Beam Filter */}
          <linearGradient id="cameraBeam" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
          </linearGradient>

          {/* Drone Thermal FLIR Ironbow Gradient */}
          <radialGradient id="droneThermalIronbow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="18%" stopColor="#feb078" stopOpacity="0.9" />
            <stop offset="42%" stopColor="#f1605d" stopOpacity="0.75" />
            <stop offset="70%" stopColor="#721f81" stopOpacity="0.5" />
            <stop offset="92%" stopColor="#000004" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#000004" stopOpacity="0" />
          </radialGradient>

          {/* Drone Thermal White-Hot Gradient */}
          <radialGradient id="droneThermalWhiteHot" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="35%" stopColor="#cbd5e1" stopOpacity="0.8" />
            <stop offset="70%" stopColor="#475569" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
          </radialGradient>

          {/* Drone Optical RGB Canopy Gradient */}
          <radialGradient id="droneRgbCanopy" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.85" />
            <stop offset="22%" stopColor="#f97316" stopOpacity="0.65" />
            <stop offset="50%" stopColor="#15803d" stopOpacity="0.55" />
            <stop offset="85%" stopColor="#14532d" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#052e16" stopOpacity="0" />
          </radialGradient>

          {/* Drone Sensor Camera Beam FOV */}
          <linearGradient id="droneCameraBeam" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
          </linearGradient>

          {/* Drone Billowing Smoke Plume Gradient */}
          <linearGradient id="droneSmokePlume" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(40, 40, 45, 0.75)" />
            <stop offset="50%" stopColor="rgba(100, 100, 105, 0.45)" />
            <stop offset="100%" stopColor="rgba(180, 185, 190, 0)" />
          </linearGradient>
        </defs>

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Background Grid */}
          <rect x="-500" y="-300" width="2000" height="1500" fill="url(#gisGrid)" />

          {/* Mediterranean Sea Coastline Guide */}
          <path
            d="M 50 140 Q 250 120 400 125 T 600 115 T 850 110 T 950 120 L 950 -100 L 50 -100 Z"
            fill="rgba(14, 116, 144, 0.08)"
            stroke="rgba(6, 182, 212, 0.25)"
            strokeWidth="1.2"
            strokeDasharray="4 4"
          />
          <text x="500" y="60" fill="rgba(6, 182, 212, 0.3)" fontSize="14" fontStyle="italic" letterSpacing="4">
            MEDITERRANEAN SEA (البحر الأبيض المتوسط)
          </text>

          {/* Dynamic AI Risk Heatmap Zones */}
          {layers.riskHeatmap && (
            <g id="layer-risk-heatmap" opacity="0.6">
              {/* Jijel Guerrouche Extreme Hotspot */}
              <circle cx="615" cy="140" r="55" fill="#ef4444" opacity="0.35" filter="blur(18px)" />
              <circle cx="615" cy="140" r="28" fill="#b91c1c" opacity="0.5" filter="blur(8px)" />

              {/* Tizi Ouzou Yakouren High Hotspot */}
              <circle cx="500" cy="145" r="48" fill="#f97316" opacity="0.35" filter="blur(16px)" />

              {/* Bejaia Akfadou High Hotspot */}
              <circle cx="560" cy="145" r="45" fill="#ea580c" opacity="0.32" filter="blur(15px)" />

              {/* El Tarf El Kala Hotspot */}
              <circle cx="795" cy="135" r="42" fill="#f59e0b" opacity="0.3" filter="blur(14px)" />
            </g>
          )}

          {/* Wilayas Administrative Boundaries */}
          {layers.wilayas && (
            <g id="layer-wilayas">
              {ALGERIA_WILAYAS.map((w) => {
                const pt = geoToSvg(w.lat, w.lng);
                return (
                  <g key={w.code} className="cursor-pointer group">
                    <path
                      d={w.svgPath}
                      fill={
                        mapMode === 'satellite'
                          ? 'rgba(30, 41, 59, 0.45)'
                          : 'rgba(15, 23, 42, 0.75)'
                      }
                      stroke={w.currentRiskIndex > 80 ? 'rgba(239, 68, 68, 0.6)' : 'rgba(71, 85, 105, 0.5)'}
                      strokeWidth="1.2"
                      className="transition-colors group-hover:fill-slate-800/90"
                    />
                    <text
                      x={pt.x}
                      y={pt.y}
                      fill="rgba(226, 232, 240, 0.75)"
                      fontSize="9"
                      fontWeight="600"
                      textAnchor="middle"
                      className="select-none pointer-events-none"
                    >
                      {currentLang === 'ar' ? w.nameAr : w.nameEn}
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          {/* National Forests and Biospheres */}
          {layers.forests && (
            <g id="layer-forests">
              {forests.map((f) => {
                const pt = geoToSvg(f.coordinates.lat, f.coordinates.lng);
                return (
                  <g
                    key={f.id}
                    onClick={() => onSelectForest(f)}
                    className="cursor-pointer group"
                  >
                    {/* Forest Area Polygon approximation */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="16"
                      fill="rgba(16, 185, 129, 0.25)"
                      stroke="#10b981"
                      strokeWidth="1.5"
                      strokeDasharray="3 2"
                      className="group-hover:fill-emerald-500/40 transition"
                    />
                    <Trees className="w-3.5 h-3.5 text-emerald-400" />
                    <text
                      x={pt.x}
                      y={pt.y + 24}
                      fill="#6ee7b7"
                      fontSize="8"
                      fontWeight="bold"
                      textAnchor="middle"
                      className="drop-shadow-md pointer-events-none"
                    >
                      {currentLang === 'ar' ? f.nameAr : f.name}
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          {/* Water Points & Reservoirs */}
          {layers.waterPoints && (
            <g id="layer-water-points">
              {waterPoints.map((wp) => {
                const pt = geoToSvg(wp.coordinates.lat, wp.coordinates.lng);
                return (
                  <g key={wp.id} className="cursor-pointer">
                    <circle cx={pt.x} cy={pt.y} r="5" fill="#06b6d4" stroke="#083344" strokeWidth="1.5" />
                    <circle cx={pt.x} cy={pt.y} r="8" fill="none" stroke="#22d3ee" strokeWidth="0.8" opacity="0.7" />
                    <text x={pt.x + 8} y={pt.y + 3} fill="#a5f3fc" fontSize="7.5" fontWeight="500">
                      💧 {wp.name.split(' ')[0]}
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          {/* Watchtowers & Scanning Cameras */}
          {layers.watchtowers && (
            <g id="layer-watchtowers">
              {watchtowers.map((wt) => {
                const pt = geoToSvg(wt.coordinates.lat, wt.coordinates.lng);
                return (
                  <g key={wt.id} className="cursor-pointer">
                    {/* Simulated Camera FOV Beam */}
                    <path
                      d={`M ${pt.x} ${pt.y} L ${pt.x + 25} ${pt.y - 35} A 30 30 0 0 0 ${pt.x + 42} ${pt.y - 12} Z`}
                      fill="url(#cameraBeam)"
                      opacity="0.7"
                    />
                    <circle cx={pt.x} cy={pt.y} r="4" fill="#6366f1" stroke="#ffffff" strokeWidth="1" />
                    <text x={pt.x - 10} y={pt.y - 7} fill="#c7d2fe" fontSize="7.5" fontWeight="bold">
                      📡 WT-{wt.id.split('-')[2] || '17'}
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          {/* Emergency Response Units (Civil Protection & Tankers) */}
          {layers.civilProtection && (
            <g id="layer-civil-protection">
              {resources.map((res) => {
                const pt = geoToSvg(res.currentLocation.lat, res.currentLocation.lng);
                return (
                  <g key={res.id} className="cursor-pointer">
                    <rect
                      x={pt.x - 7}
                      y={pt.y - 7}
                      width="14"
                      height="14"
                      rx="3"
                      fill="#eab308"
                      stroke="#0f172a"
                      strokeWidth="1.5"
                    />
                    <text
                      x={pt.x}
                      y={pt.y + 3.5}
                      fill="#000000"
                      fontSize="7"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      🚒
                    </text>
                    <text x={pt.x} y={pt.y + 16} fill="#fef08a" fontSize="7" fontWeight="bold" textAnchor="middle">
                      {res.code}
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          {/* Wind Streamlines Vector Layer */}
          {layers.windVectors && (
            <g id="layer-wind" opacity="0.75">
              {/* Representative Sirocco Vectors heading North-East */}
              {[
                { x: 580, y: 180 },
                { x: 620, y: 160 },
                { x: 530, y: 170 },
                { x: 470, y: 165 },
                { x: 670, y: 155 }
              ].map((w, idx) => (
                <g key={idx} transform={`translate(${w.x}, ${w.y}) rotate(-45)`}>
                  <line x1="0" y1="0" x2="28" y2="0" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="4 2" />
                  <polygon points="28,-3 34,0 28,3" fill="#38bdf8" />
                  <text x="36" y="3" fill="#bae6fd" fontSize="7" fontStyle="italic">
                    42 km/h NE
                  </text>
                </g>
              ))}
            </g>
          )}

          {/* Fire Spread Isochrones (30m, 1h, 3h, 6h) */}
          {layers.spreadIsochrones && selectedIncident && selectedIncident.spreadPredictions.length > 0 && (
            <g id="layer-spread-isochrones">
              {selectedIncident.spreadPredictions.map((iso, i) => {
                const pointsSvg = iso.perimeterPoints.map((p) => {
                  const s = geoToSvg(p.lat, p.lng);
                  return `${s.x},${s.y}`;
                }).join(' ');

                const colors = ['#dc2626', '#ea580c', '#f97316', '#fbbf24'];
                const strokeColor = colors[i] || '#ef4444';

                return (
                  <g key={iso.timeHorizonMinutes}>
                    <polygon
                      points={pointsSvg}
                      fill={strokeColor}
                      fillOpacity={0.12 - i * 0.02}
                      stroke={strokeColor}
                      strokeWidth="1.6"
                      strokeDasharray={i > 1 ? '4 3' : undefined}
                    />
                    {iso.perimeterPoints[0] && (
                      <text
                        x={geoToSvg(iso.perimeterPoints[0].lat, iso.perimeterPoints[0].lng).x}
                        y={geoToSvg(iso.perimeterPoints[0].lat, iso.perimeterPoints[0].lng).y - 4}
                        fill={strokeColor}
                        fontSize="7.5"
                        fontWeight="bold"
                      >
                        +{iso.timeHorizonMinutes}m ({iso.areaHectares} ha)
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          )}

          {/* Active Incidents Flame Markers */}
          {layers.incidents && (
            <g id="layer-incidents">
              {incidents.map((inc) => {
                const pt = geoToSvg(inc.coordinates.lat, inc.coordinates.lng);
                const isSelected = selectedIncident?.id === inc.id;

                return (
                  <g
                    key={inc.id}
                    onClick={() => onSelectIncident(inc)}
                    className="cursor-pointer group"
                  >
                    {/* Pulsing Radiation Halo */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isSelected ? 26 : 20}
                      fill="url(#fireGlow)"
                      className="animate-pulse"
                    />

                    {/* Outer Selection Ring */}
                    {isSelected && (
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="22"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                        strokeDasharray="4 2"
                      />
                    )}

                    {/* Central High-Intensity Flame Pin */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="9"
                      fill={getRiskColor(inc.riskLevel)}
                      stroke="#ffffff"
                      strokeWidth="2"
                    />

                    <Flame className="w-4 h-4 text-white" />

                    {/* Incident Code Badge */}
                    <g transform={`translate(${pt.x + 12}, ${pt.y - 12})`}>
                      <rect
                        x="0"
                        y="-8"
                        width="76"
                        height="16"
                        rx="4"
                        fill="rgba(15, 23, 42, 0.92)"
                        stroke={getRiskColor(inc.riskLevel)}
                        strokeWidth="1"
                      />
                      <text
                        x="38"
                        y="3"
                        fill="#ffffff"
                        fontSize="7.5"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {inc.code.replace('INCIDENT #', '')}
                      </text>
                    </g>
                  </g>
                );
              })}
            </g>
          )}

          {/* Tactical Airborne Drone Reconnaissance & Dual Camera (Thermal/RGB) Feed Layer */}
          {layers.drones && activeDroneMission.isLayerVisibleOnMap && dronePatrolIncident && (() => {
            const firePt = geoToSvg(dronePatrolIncident.coordinates.lat, dronePatrolIncident.coordinates.lng);
            const headingRad = (((activeDroneMission.headingDegrees ?? 42) - 90) * Math.PI) / 180;
            const orbitR = 54;
            const dronePt = {
              x: firePt.x + Math.cos(headingRad) * orbitR,
              y: firePt.y + Math.sin(headingRad) * orbitR
            };
            const dropPt = activeDroneMission.assessment?.recommendedDropPoint
              ? geoToSvg(activeDroneMission.assessment.recommendedDropPoint.lat, activeDroneMission.assessment.recommendedDropPoint.lng)
              : { x: firePt.x + 16, y: firePt.y - 12 };

            const isThermal = activeDroneMission.cameraMode === 'thermal';

            return (
              <g id="drone-recon-tactical-overlay" className="cursor-pointer" onClick={() => onOpenDroneSimulation?.(dronePatrolIncident)}>
                {/* 1. Camera FOV Sensor Projection Beam */}
                <polygon
                  points={`${dronePt.x},${dronePt.y} ${firePt.x - 38},${firePt.y - 26} ${firePt.x + 38},${firePt.y + 26}`}
                  fill="url(#droneCameraBeam)"
                  opacity="0.5"
                  className="transition-all duration-300"
                />

                {/* 2. Drone Orbit Patrol Perimeter */}
                <circle
                  cx={firePt.x}
                  cy={firePt.y}
                  r={orbitR}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="1.2"
                  strokeDasharray="4 3"
                  opacity="0.65"
                />

                {/* 3. Real-Time Camera Feed Ground Footprint Layer */}
                {isThermal ? (
                  /* --- THERMAL (FLIR) GROUND LAYER --- */
                  <g id="drone-flir-thermal-feed">
                    {/* Thermal Radiation Heat Footprint */}
                    <ellipse
                      cx={firePt.x}
                      cy={firePt.y}
                      rx="48"
                      ry="34"
                      fill="url(#droneThermalIronbow)"
                      className="animate-pulse"
                      opacity="0.9"
                    />

                    {/* High-Temperature Isotherm Boundary Contour */}
                    <ellipse
                      cx={firePt.x}
                      cy={firePt.y}
                      rx="38"
                      ry="26"
                      fill="none"
                      stroke="#f43f5e"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                      opacity="0.8"
                    />

                    {/* High-Temp Core Radiative Spot */}
                    <circle
                      cx={firePt.x}
                      cy={firePt.y}
                      r="9"
                      fill="#ffffff"
                      opacity="0.9"
                    />

                    {/* Water Drop Target Reticle (Canadair Air Support Guidance) */}
                    <g transform={`translate(${dropPt.x}, ${dropPt.y})`}>
                      <circle cx="0" cy="0" r="14" fill="none" stroke="#06b6d4" strokeWidth="1.6" strokeDasharray="3 2" className="animate-spin" style={{ transformOrigin: '0 0' }} />
                      <circle cx="0" cy="0" r="3" fill="#06b6d4" />
                      <line x1="-18" y1="0" x2="18" y2="0" stroke="#06b6d4" strokeWidth="1" />
                      <line x1="0" y1="-18" x2="0" y2="18" stroke="#06b6d4" strokeWidth="1" />
                      <rect x="-38" y="16" width="76" height="13" rx="3" fill="rgba(6, 182, 212, 0.95)" />
                      <text x="0" y="25.5" fill="#082f49" fontSize="6.5" fontWeight="900" textAnchor="middle">
                        💧 CANADAIR TARGET
                      </text>
                    </g>

                    {/* Thermal Hotspot Temperature Badges on Map */}
                    <g transform={`translate(${firePt.x + 8}, ${firePt.y - 34})`}>
                      <rect x="0" y="-12" width="88" height="15" rx="3.5" fill="rgba(15, 23, 42, 0.95)" stroke="#ef4444" strokeWidth="1.2" />
                      <text x="44" y="-2" fill="#fca5a5" fontSize="7" fontWeight="bold" textAnchor="middle">
                        🔥 {droneAssessment.maxHotspotTempC}°C MAX CORE
                      </text>
                    </g>

                    {/* Tactical Legend Stamp */}
                    <g transform={`translate(${firePt.x - 52}, ${firePt.y + 42})`}>
                      <rect x="0" y="-10" width="104" height="14" rx="3" fill="rgba(15, 23, 42, 0.9)" stroke="#10b981" strokeWidth="0.8" />
                      <text x="52" y="-1" fill="#34d399" fontSize="6.5" fontWeight="bold" textAnchor="middle">
                        FLIR THERMAL • FRP {droneAssessment.fireRadiativePowerMw} MW
                      </text>
                    </g>
                  </g>
                ) : (
                  /* --- OPTICAL RGB GROUND LAYER --- */
                  <g id="drone-optical-rgb-feed">
                    {/* Natural Forest Canopy Ground Footprint */}
                    <ellipse
                      cx={firePt.x}
                      cy={firePt.y}
                      rx="48"
                      ry="34"
                      fill="url(#droneRgbCanopy)"
                      opacity="0.88"
                    />

                    {/* Scorched Carbon Ash Scar Behind the Front */}
                    <ellipse
                      cx={firePt.x - 14}
                      cy={firePt.y + 6}
                      rx="26"
                      ry="16"
                      fill="#18181b"
                      opacity="0.85"
                    />

                    {/* Billowing Smoke Plume Vector drifting in wind */}
                    <path
                      d={`M ${firePt.x - 10} ${firePt.y - 8} Q ${firePt.x + 25} ${firePt.y - 35} ${firePt.x + 65} ${firePt.y - 50} Q ${firePt.x + 40} ${firePt.y - 15} ${firePt.x + 10} ${firePt.y + 8} Z`}
                      fill="url(#droneSmokePlume)"
                    />

                    {/* Glowing Active Flame Perimeter Line */}
                    <path
                      d={`M ${firePt.x - 24} ${firePt.y + 12} Q ${firePt.x} ${firePt.y - 6} ${firePt.x + 28} ${firePt.y - 18}`}
                      fill="none"
                      stroke="#f97316"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      className="animate-pulse"
                    />

                    {/* Optical Feed Legend Stamp */}
                    <g transform={`translate(${firePt.x - 48}, ${firePt.y + 42})`}>
                      <rect x="0" y="-10" width="96" height="14" rx="3" fill="rgba(15, 23, 42, 0.9)" stroke="#10b981" strokeWidth="0.8" />
                      <text x="48" y="-1" fill="#38bdf8" fontSize="6.5" fontWeight="bold" textAnchor="middle">
                        OPTICAL RGB • DE-HAZE ACTIVE
                      </text>
                    </g>
                  </g>
                )}

                {/* 4. Active UAV Aircraft Icon in Orbit */}
                <g transform={`translate(${dronePt.x}, ${dronePt.y}) rotate(${activeDroneMission.headingDegrees})`}>
                  {/* Rotor Thruster Wake Waves */}
                  <circle cx="0" cy="0" r="14" fill="none" stroke="#10b981" strokeWidth="0.8" opacity="0.4" />
                  
                  {/* Drone Airframe Graphic */}
                  <path
                    d="M 0 -9 L 7 6 L 0 3 L -7 6 Z"
                    fill="#10b981"
                    stroke="#ffffff"
                    strokeWidth="1.2"
                  />
                  {/* Quad-Rotor Arms */}
                  <line x1="-8" y1="-8" x2="8" y2="8" stroke="#10b981" strokeWidth="1.5" />
                  <line x1="-8" y1="8" x2="8" y2="-8" stroke="#10b981" strokeWidth="1.5" />
                  <circle cx="-8" cy="-8" r="2.2" fill="#34d399" />
                  <circle cx="8" cy="8" r="2.2" fill="#34d399" />
                  <circle cx="-8" cy="8" r="2.2" fill="#34d399" />
                  <circle cx="8" cy="-8" r="2.2" fill="#34d399" />
                  <circle cx="0" cy="0" r="2" fill="#ffffff" />
                </g>

                {/* Drone Callout Tag */}
                <g transform={`translate(${dronePt.x}, ${dronePt.y - 15})`}>
                  <rect x="-30" y="-11" width="60" height="13" rx="3" fill="rgba(15, 23, 42, 0.95)" stroke="#10b981" strokeWidth="1" />
                  <text x="0" y="-2" fill="#10b981" fontSize="6.5" fontWeight="black" textAnchor="middle">
                    DZ-04 ({activeDroneMission.altitudeMeters}m)
                  </text>
                </g>
              </g>
            );
          })()}

          {/* Real-Time User Device GPS Position Beacon & Tactical Vector Line */}
          {userPosition && (
            <g id="layer-live-user-gps" className="transition-all duration-500">
              {(() => {
                const userPt = geoToSvg(userPosition.lat, userPosition.lng);
                const selectedIncPt = selectedIncident 
                  ? geoToSvg(selectedIncident.coordinates.lat, selectedIncident.coordinates.lng) 
                  : null;
                const distanceToIncident = selectedIncident 
                  ? computeDistanceKm(userPosition, selectedIncident.coordinates) 
                  : null;

                return (
                  <>
                    {/* Tactical Vector Line to Selected Incident */}
                    {selectedIncPt && distanceToIncident !== null && (
                      <g id="vector-user-to-fire">
                        <line
                          x1={userPt.x}
                          y1={userPt.y}
                          x2={selectedIncPt.x}
                          y2={selectedIncPt.y}
                          stroke="#38bdf8"
                          strokeWidth="2"
                          strokeDasharray="6 4"
                          strokeOpacity="0.85"
                        />
                        {/* Midpoint Distance Badge */}
                        <g transform={`translate(${(userPt.x + selectedIncPt.x) / 2}, ${(userPt.y + selectedIncPt.y) / 2})`}>
                          <rect
                            x="-38"
                            y="-10"
                            width="76"
                            height="20"
                            rx="10"
                            fill="#0f172a"
                            stroke="#38bdf8"
                            strokeWidth="1.5"
                          />
                          <text
                            x="0"
                            y="3.5"
                            fill="#38bdf8"
                            fontSize="8"
                            fontWeight="bold"
                            textAnchor="middle"
                            fontFamily="monospace"
                          >
                            {distanceToIncident} km
                          </text>
                        </g>
                      </g>
                    )}

                    {/* GPS Accuracy Radius Circle */}
                    <circle
                      cx={userPt.x}
                      cy={userPt.y}
                      r={Math.min(45, Math.max(16, userPosition.accuracyMeters / 5))}
                      fill="rgba(56, 189, 248, 0.08)"
                      stroke="#38bdf8"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />

                    {/* Animated Radar Ping */}
                    <circle
                      cx={userPt.x}
                      cy={userPt.y}
                      r="22"
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="1.5"
                      className="animate-ping"
                      style={{ transformOrigin: `${userPt.x}px ${userPt.y}px` }}
                    />

                    {/* Outer Glow Halo */}
                    <circle
                      cx={userPt.x}
                      cy={userPt.y}
                      r="12"
                      fill="#0284c7"
                      fillOpacity="0.4"
                    />

                    {/* Central High-Intensity GPS Pin */}
                    <circle
                      cx={userPt.x}
                      cy={userPt.y}
                      r="6.5"
                      fill="#38bdf8"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                    <circle
                      cx={userPt.x}
                      cy={userPt.y}
                      r="2.5"
                      fill="#0369a1"
                    />

                    {/* Live GPS Identifier Tag */}
                    <g transform={`translate(${userPt.x}, ${userPt.y - 16})`}>
                      <rect
                        x="-52"
                        y="-14"
                        width="104"
                        height="18"
                        rx="5"
                        fill="rgba(15, 23, 42, 0.95)"
                        stroke="#38bdf8"
                        strokeWidth="1.2"
                      />
                      <text
                        x="0"
                        y="-2"
                        fill="#38bdf8"
                        fontSize="7.5"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {currentLang === 'ar' ? '📍 موقعك الفعلي (Live GPS)' : '📍 My Location (Live GPS)'}
                      </text>
                    </g>
                  </>
                );
              })()}
            </g>
          )}
        </g>
      </svg>

      {/* Floating On-Map Tactical Drone HUD Card (Bottom-Left) */}
      {layers.drones && activeDroneMission.isLayerVisibleOnMap && dronePatrolIncident && (
        <div className="absolute bottom-6 left-4 z-30 flex items-center gap-3 bg-slate-950/90 backdrop-blur-md border border-slate-700/90 rounded-xl p-2 px-3 shadow-2xl text-xs">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-100">{activeDroneMission.droneId}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[10px] text-emerald-400 font-mono">LIVE FEED</span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
                <span>ALT: {activeDroneMission.altitudeMeters}m</span>
                <span>•</span>
                <span className={activeDroneMission.cameraMode === 'thermal' ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                  {activeDroneMission.cameraMode === 'thermal' ? `🔥 ${droneAssessment.maxHotspotTempC}°C MAX` : '🌲 OPTICAL DE-HAZE'}
                </span>
              </div>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-800" />

          {/* Quick Mode Toggle on Map */}
          <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => updateDroneMissionHandler({ cameraMode: 'thermal' })}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 ${
                activeDroneMission.cameraMode === 'thermal'
                  ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Flame className="w-3 h-3 text-amber-300" />
              <span>Thermal</span>
            </button>
            <button
              onClick={() => updateDroneMissionHandler({ cameraMode: 'rgb' })}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 ${
                activeDroneMission.cameraMode === 'rgb'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eye className="w-3 h-3 text-emerald-300" />
              <span>RGB</span>
            </button>
          </div>

          <button
            onClick={() => onOpenDroneSimulation?.(dronePatrolIncident)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition shadow cursor-pointer ml-1"
          >
            <span>{currentLang === 'ar' ? 'القمرة كاملة' : 'Full Cockpit'}</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};
