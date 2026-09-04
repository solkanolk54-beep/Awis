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
  Crosshair
} from 'lucide-react';
import { 
  WildfireIncident, 
  ForestZone, 
  WaterPoint, 
  WatchtowerCamera, 
  EmergencyResource, 
  Language,
  RiskLevel
} from '../../types';
import { ALGERIA_WILAYAS } from '../../data/algeriaData';
import { translations } from '../../i18n/translations';

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
  currentLang
}) => {
  const t = translations[currentLang];

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
          </div>
        </div>
      )}

      {/* Floating Zoom and Navigation Controls */}
      <div className="absolute bottom-6 right-4 z-30 flex flex-col gap-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-1 shadow-2xl">
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
        </g>
      </svg>
    </div>
  );
};
