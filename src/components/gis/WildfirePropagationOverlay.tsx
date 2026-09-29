// AWIS — Dynamic Cellular Automata Wildfire Propagation Overlay & Time-Scrubber HUD
// Visualizes Rothermel-Huygens isochrones, active flame wavefront, wind vectors, and evacuation corridors

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Flame, 
  Wind, 
  Mountain, 
  Droplets, 
  Play, 
  Pause, 
  RotateCcw, 
  FastForward, 
  Clock, 
  AlertTriangle, 
  ShieldAlert, 
  Navigation, 
  Sliders, 
  X, 
  ChevronRight, 
  Layers, 
  Eye, 
  MapPin, 
  Zap, 
  Sparkles,
  ArrowRight,
  Maximize2
} from 'lucide-react';
import { 
  PropagationParams, 
  PropagationSimulationResult, 
  IsochroneZone, 
  ThreatenedAsset, 
  simulateWildfirePropagation,
  degreesToCardinal,
  MILA_STRATEGIC_ASSETS
} from '../../services/WildfirePropagationEngine';
import { Language } from '../../types';

export interface WildfirePropagationSVGProps {
  geoToSvg: (lat: number, lng: number) => { x: number; y: number };
  simulationResult: PropagationSimulationResult;
  currentMinute: number;
  showIsochrones?: boolean;
  showWindVector?: boolean;
  showEvacuationCorridors?: boolean;
  onSelectAsset?: (asset: ThreatenedAsset) => void;
}

/**
 * SVG Map Layer rendering the fire propagation isochrones, dynamic flame front, wind vectors,
 * and evacuation corridors directly into the GIS map SVG space.
 */
export const WildfirePropagationSVG: React.FC<WildfirePropagationSVGProps> = ({
  geoToSvg,
  simulationResult,
  currentMinute,
  showIsochrones = true,
  showWindVector = true,
  showEvacuationCorridors = true,
  onSelectAsset
}) => {
  const { origin, windDirectionDegrees, windSpeedKmH, slopeDegrees } = simulationResult.params;
  const flameHeading = simulationResult.flameHeadingDegrees;

  // Compute minute state (0 to 120)
  const minuteState = useMemo(() => {
    return simulationResult.getStateAtMinute(currentMinute);
  }, [simulationResult, currentMinute]);

  const originSvg = geoToSvg(origin.lat, origin.lng);

  // SVG points string builder
  const buildSvgPoints = (polygon: Array<{ lat: number; lng: number }>): string => {
    return polygon
      .map(pt => {
        const svgPt = geoToSvg(pt.lat, pt.lng);
        return `${svgPt.x.toFixed(1)},${svgPt.y.toFixed(1)}`;
      })
      .join(' ');
  };

  // Wind push vector line (pointing downwind)
  const windVectorLengthKm = Math.max(3.5, windSpeedKmH * 0.16);
  const windRad = (flameHeading * Math.PI) / 180;
  const windHeadLat = origin.lat + (windVectorLengthKm * Math.cos(windRad)) / 111.13;
  const windHeadLng = origin.lng + (windVectorLengthKm * Math.sin(windRad)) / (111.13 * Math.cos((origin.lat * Math.PI) / 180));
  const windHeadSvg = geoToSvg(windHeadLat, windHeadLng);

  return (
    <g id="wildfire-propagation-layer" className="transition-opacity duration-200 pointer-events-auto">
      <defs>
        {/* Glowing Fire Gradient for active front */}
        <radialGradient id="fireOriginGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="30%" stopColor="#ef4444" stopOpacity="0.85" />
          <stop offset="70%" stopColor="#f97316" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#b91c1c" stopOpacity="0" />
        </radialGradient>

        <linearGradient id="activeFrontFlameGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f97316" stopOpacity="0.75" />
          <stop offset="50%" stopColor="#ef4444" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#7f1d1d" stopOpacity="0.25" />
        </linearGradient>

        {/* Marker for Wind Heading Arrow */}
        <marker
          id="windArrowHead"
          markerWidth="8"
          markerHeight="8"
          refX="6"
          refY="4"
          orient="auto"
        >
          <path d="M 0 0 L 8 4 L 0 8 Z" fill="#38bdf8" />
        </marker>

        {/* Marker for Evacuation Corridor Arrow */}
        <marker
          id="evacArrowHead"
          markerWidth="7"
          markerHeight="7"
          refX="5"
          refY="3.5"
          orient="auto"
        >
          <path d="M 0 0 L 7 3.5 L 0 7 Z" fill="#10b981" />
        </marker>
      </defs>

      {/* 1. Isochrone Waves (0-15m, 15-30m, 30-60m, 60-120m) */}
      {showIsochrones && (
        <g id="isochrone-zones" opacity={0.88}>
          {simulationResult.isochrones
            .slice()
            .reverse() // Render largest first so smaller stack on top
            .map((zone) => {
              const pointsStr = buildSvgPoints(zone.polygon);
              return (
                <g key={zone.timeMinutes} className="transition-all duration-300">
                  <polygon
                    points={pointsStr}
                    fill={zone.fillColor}
                    fillOpacity={zone.fillOpacity}
                    stroke={zone.strokeColor}
                    strokeWidth={1.5}
                    strokeDasharray={zone.timeMinutes >= 60 ? '4 3' : undefined}
                    className="hover:stroke-white cursor-pointer"
                  />
                </g>
              );
            })}
        </g>
      )}

      {/* 2. Active Animated Dynamic Front at currentMinute */}
      {minuteState.activeFrontPolygon.length > 0 && (
        <g id="dynamic-active-wavefront">
          {/* Active burned perimeter polygon */}
          <polygon
            points={buildSvgPoints(minuteState.activeFrontPolygon)}
            fill="url(#activeFrontFlameGrad)"
            stroke="#f97316"
            strokeWidth={2.4}
            className="filter drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]"
          />

          {/* Glowing head fire leading tip */}
          {(() => {
            const headSvg = geoToSvg(minuteState.headFireFrontPoint.lat, minuteState.headFireFrontPoint.lng);
            return (
              <g className="animate-pulse">
                <circle
                  cx={headSvg.x}
                  cy={headSvg.y}
                  r={5}
                  fill="#ffffff"
                  stroke="#ef4444"
                  strokeWidth={2}
                />
                <circle
                  cx={headSvg.x}
                  cy={headSvg.y}
                  r={9}
                  fill="none"
                  stroke="#f97316"
                  strokeWidth={1.5}
                  strokeDasharray="2 2"
                />
              </g>
            );
          })()}
        </g>
      )}

      {/* 3. Evacuation Corridors & Threatened Assets Connectors */}
      {showEvacuationCorridors && (
        <g id="evacuation-corridors">
          {simulationResult.threatenedAssets
            .filter(a => a.urgency === 'critical' || a.urgency === 'high')
            .map(asset => {
              const assetSvg = geoToSvg(asset.coordinates.lat, asset.coordinates.lng);
              const isCrit = asset.urgency === 'critical';

              return (
                <g key={asset.id} onClick={() => onSelectAsset && onSelectAsset(asset)} className="cursor-pointer">
                  {/* Dashed connector line from fire origin to threatened asset */}
                  <line
                    x1={originSvg.x}
                    y1={originSvg.y}
                    x2={assetSvg.x}
                    y2={assetSvg.y}
                    stroke={isCrit ? '#ef4444' : '#f59e0b'}
                    strokeWidth={1.4}
                    strokeDasharray="4 3"
                    opacity={0.75}
                  />

                  {/* Asset marker beacon */}
                  <circle
                    cx={assetSvg.x}
                    cy={assetSvg.y}
                    r={isCrit ? 6.5 : 5}
                    fill={isCrit ? '#ef4444' : '#f59e0b'}
                    stroke="#ffffff"
                    strokeWidth={1.5}
                    className={isCrit ? 'animate-ping' : ''}
                    opacity={isCrit ? 0.6 : 1}
                  />
                  <circle
                    cx={assetSvg.x}
                    cy={assetSvg.y}
                    r={isCrit ? 5 : 4}
                    fill={isCrit ? '#ef4444' : '#f59e0b'}
                    stroke="#ffffff"
                    strokeWidth={1.2}
                  />

                  {/* Asset label tag */}
                  <text
                    x={assetSvg.x + 8}
                    y={assetSvg.y + 3}
                    fill="#ffffff"
                    fontSize="9.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                    className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
                  >
                    {asset.nameAr.split('(')[0]} ({asset.timeToImpactMinutes}m)
                  </text>
                </g>
              );
            })}
        </g>
      )}

      {/* 4. Wind & Slope Push Vector Arrow */}
      {showWindVector && (
        <g id="wind-propagation-vector" className="pointer-events-none">
          <line
            x1={originSvg.x}
            y1={originSvg.y}
            x2={windHeadSvg.x}
            y2={windHeadSvg.y}
            stroke="#38bdf8"
            strokeWidth={2.2}
            markerEnd="url(#windArrowHead)"
            className="filter drop-shadow-[0_0_4px_rgba(56,189,248,0.8)]"
          />
          <text
            x={windHeadSvg.x + 6}
            y={windHeadSvg.y - 4}
            fill="#38bdf8"
            fontSize="9"
            fontFamily="monospace"
            fontWeight="bold"
            className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
          >
            {flameHeading}° {simulationResult.flameHeadingCardinal} ({simulationResult.forwardRosKmH} km/h)
          </text>
        </g>
      )}

      {/* 5. Ignition Origin Point Marker */}
      <g id="ignition-origin-marker" className="pointer-events-none">
        <circle cx={originSvg.x} cy={originSvg.y} r={14} fill="url(#fireOriginGlow)" />
        <circle cx={originSvg.x} cy={originSvg.y} r={4.5} fill="#ef4444" stroke="#ffffff" strokeWidth={1.5} />
        <text
          x={originSvg.x}
          y={originSvg.y - 9}
          textAnchor="middle"
          fill="#fca5a5"
          fontSize="9"
          fontFamily="monospace"
          fontWeight="bold"
          className="drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]"
        >
          {simulationResult.params.originNameAr || 'نقطة الاشتعال'}
        </text>
      </g>
    </g>
  );
};

export interface WildfirePropagationHUDProps {
  currentLang?: Language;
  simulationResult: PropagationSimulationResult;
  currentMinute: number;
  onMinuteChange: (minute: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  playbackSpeed: number;
  onSpeedChange: (speed: number) => void;
  params: PropagationParams;
  onParamsChange: (newParams: Partial<PropagationParams>) => void;
  onClose: () => void;
  onFocusOrigin?: (lat: number, lng: number) => void;
  className?: string;
}

/**
 * Floating Interactive HUD Control Panel featuring the Time-Scrubber slider (0 to 120 min),
 * simulation transport buttons, parameters tuner (Wind, Slope, NDVI), and threatened assets corridor.
 */
export const WildfirePropagationHUD: React.FC<WildfirePropagationHUDProps> = ({
  currentLang = 'ar',
  simulationResult,
  currentMinute,
  onMinuteChange,
  isPlaying,
  onTogglePlay,
  playbackSpeed,
  onSpeedChange,
  params,
  onParamsChange,
  onClose,
  onFocusOrigin,
  className = ''
}) => {
  const isAr = currentLang === 'ar';
  const [showConfigDrawer, setShowConfigDrawer] = useState<boolean>(false);
  const [showAssetsDrawer, setShowAssetsDrawer] = useState<boolean>(false);

  // Compute minute metrics
  const currentMetricState = useMemo(() => {
    return simulationResult.getStateAtMinute(currentMinute);
  }, [simulationResult, currentMinute]);

  const criticalAssets = useMemo(() => {
    return simulationResult.threatenedAssets.filter(a => a.urgency === 'critical' || a.urgency === 'high');
  }, [simulationResult]);

  return (
    <div 
      id="wildfire-propagation-hud-root"
      className={`fixed bottom-4 left-3 right-3 sm:left-auto sm:right-4 sm:w-[480px] z-[9990] bg-slate-950/95 backdrop-blur-xl border border-rose-500/50 rounded-2xl shadow-2xl overflow-hidden font-mono flex flex-col pointer-events-auto ring-1 ring-rose-500/30 ${className}`}
    >
      {/* Top Header Bar */}
      <div className="shrink-0 p-3 bg-gradient-to-r from-rose-950/80 via-slate-900 to-slate-950 border-b border-rose-500/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40">
            <Flame className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-white text-xs sm:text-sm">
                {isAr ? 'محاكاة انتشار ألسنة النيران (Cellular Automata)' : 'Dynamic Wildfire Propagation Simulation'}
              </h3>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-900/80 text-rose-200 border border-rose-500/40 font-bold">
                ROTHERMEL
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              {params.originNameAr || 'جبل قروز - ولاية ميلة'} • {params.windSpeedKmH} km/h ({degreesToCardinal(params.windDirectionDegrees)})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowConfigDrawer(!showConfigDrawer)}
            className={`p-1.5 rounded-lg border transition cursor-pointer ${
              showConfigDrawer ? 'bg-rose-500 text-white border-rose-400' : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
            title={isAr ? 'ضبط معاملات الرياح والتضاريس' : 'Parameters Tuner'}
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/80 text-slate-400 hover:text-rose-200 border border-slate-700 transition cursor-pointer"
            title={isAr ? 'إغلاق المحاكاة' : 'Close'}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Time-Scrubber Section */}
      <div className="p-3 space-y-2.5 text-xs">
        {/* Real-time calculated metrics at current minute */}
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="p-1.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-[9px] text-slate-400 block">{isAr ? 'الوقت المحاكى' : 'Sim Time'}</span>
            <span className="text-sm font-bold text-rose-400">+{currentMinute} m</span>
          </div>

          <div className="p-1.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-[9px] text-slate-400 block">{isAr ? 'المساحة المحترقة' : 'Burned Area'}</span>
            <span className="text-sm font-bold text-amber-400">{currentMetricState.burnedHectares} ha</span>
          </div>

          <div className="p-1.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-[9px] text-slate-400 block">{isAr ? 'سرعة التقدم' : 'Spread Rate'}</span>
            <span className="text-sm font-bold text-cyan-300">{currentMetricState.rateOfSpreadMMin} m/min</span>
          </div>

          <div className="p-1.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-[9px] text-slate-400 block">{isAr ? 'المحيط الحرج' : 'Perimeter'}</span>
            <span className="text-sm font-bold text-emerald-400">{currentMetricState.perimeterKm} km</span>
          </div>
        </div>

        {/* The Time-Scrubber Slider Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>{isAr ? 'خط الاشتعال (0 دقيقة)' : 'Ignition (0m)'}</span>
            <span className="text-rose-400 font-bold">⏱️ +{currentMinute} {isAr ? 'دقيقة' : 'minutes'}</span>
            <span>{isAr ? 'الأفق الأقصى (+120 دقيقة)' : 'Horizon (+120m)'}</span>
          </div>

          <div className="relative flex items-center">
            <input
              type="range"
              min="0"
              max="120"
              step="1"
              value={currentMinute}
              onChange={(e) => onMinuteChange(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
            />
          </div>

          {/* Isochrone Markers Legend */}
          <div className="flex items-center justify-between text-[8px] sm:text-[9px] text-slate-400 pt-0.5">
            <span className="text-rose-400 font-bold">🔴 0-15m (جبهة النار)</span>
            <span className="text-orange-400 font-bold">🟠 30m (التمدد)</span>
            <span className="text-yellow-400 font-bold">🟡 60m (الدفاع)</span>
            <span className="text-cyan-400 font-bold">🔵 120m (الحد الأقصى)</span>
          </div>
        </div>

        {/* Transport Controls Bar */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
          <div className="flex items-center gap-1">
            {/* Play / Pause Button */}
            <button
              onClick={onTogglePlay}
              className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md ${
                isPlaying ? 'bg-amber-600 hover:bg-amber-500 text-slate-950' : 'bg-rose-600 hover:bg-rose-500 text-white'
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span className="text-xs">{isPlaying ? (isAr ? 'إيقاف' : 'Pause') : (isAr ? 'تشغيل' : 'Play')}</span>
            </button>

            {/* Step -5m and +5m */}
            <button
              onClick={() => onMinuteChange(Math.max(0, currentMinute - 5))}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer text-[10px]"
              title="-5 minutes"
            >
              -5m
            </button>
            <button
              onClick={() => onMinuteChange(Math.min(120, currentMinute + 5))}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer text-[10px]"
              title="+5 minutes"
            >
              +5m
            </button>

            {/* Reset to 0 */}
            <button
              onClick={() => onMinuteChange(0)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
              title={isAr ? 'إعادة للبداية' : 'Reset to 0m'}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Speed Selector (1x, 2x, 5x) */}
          <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800 text-[10px]">
            {[1, 2, 5].map((spd) => (
              <button
                key={spd}
                onClick={() => onSpeedChange(spd)}
                className={`px-2 py-1 rounded transition cursor-pointer font-bold ${
                  playbackSpeed === spd ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>

        {/* Collapsible: Threatened Assets Evacuation Strip */}
        {criticalAssets.length > 0 && (
          <div className="pt-1.5 border-t border-slate-800/80">
            <button
              onClick={() => setShowAssetsDrawer(!showAssetsDrawer)}
              className="w-full flex items-center justify-between text-left p-1.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 hover:bg-rose-950/60 transition cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                <span className="font-bold text-[11px]">
                  {isAr ? `المحتجزات والقرى المهددة بالإخلاء (${criticalAssets.length})` : `Threatened Evacuation Targets (${criticalAssets.length})`}
                </span>
              </div>
              <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showAssetsDrawer ? 'rotate-90' : ''}`} />
            </button>

            {showAssetsDrawer && (
              <div className="mt-1.5 space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {criticalAssets.map(asset => (
                  <div key={asset.id} className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 text-[10px] space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">{isAr ? asset.nameAr : asset.name}</span>
                      <span className="text-rose-400 font-bold">
                        {isAr ? `خلال ${asset.timeToImpactMinutes} دقيقة` : `Impact: ${asset.timeToImpactMinutes}m`}
                      </span>
                    </div>
                    <div className="text-slate-400 text-[9px]">
                      {isAr ? asset.evacuationRouteDescriptionAr : asset.evacuationRouteDescriptionEn}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Collapsible: Simulation Parameters Tuner Drawer */}
        {showConfigDrawer && (
          <div className="pt-2 border-t border-slate-800/80 space-y-2.5 bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
            <div className="text-[11px] font-bold text-white flex items-center justify-between">
              <span>{isAr ? 'ضبط معاملات روثرميل والمناخ' : 'Rothermel & Climate Inputs'}</span>
              <span className="text-[10px] text-cyan-300 font-bold">{params.windSpeedKmH} km/h • {params.slopeDegrees}°</span>
            </div>

            {/* Wind Speed Slider */}
            <div className="space-y-0.5">
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span className="flex items-center gap-1"><Wind className="w-3 h-3 text-cyan-400" /> {isAr ? 'سرعة الرياح والشهيلي' : 'Wind Speed'}</span>
                <span className="text-white font-bold">{params.windSpeedKmH} km/h</span>
              </div>
              <input
                type="range"
                min="0"
                max="80"
                value={params.windSpeedKmH}
                onChange={(e) => onParamsChange({ windSpeedKmH: Number(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded appearance-none accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Wind Direction Slider */}
            <div className="space-y-0.5">
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span className="flex items-center gap-1"><Navigation className="w-3 h-3 text-cyan-400" /> {isAr ? 'اتجاه هبوب الرياح' : 'Wind Origin'}</span>
                <span className="text-white font-bold">{params.windDirectionDegrees}° ({degreesToCardinal(params.windDirectionDegrees)})</span>
              </div>
              <input
                type="range"
                min="0"
                max="359"
                value={params.windDirectionDegrees}
                onChange={(e) => onParamsChange({ windDirectionDegrees: Number(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded appearance-none accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Mountain Slope Angle Slider */}
            <div className="space-y-0.5">
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span className="flex items-center gap-1"><Mountain className="w-3 h-3 text-amber-400" /> {isAr ? 'زاوية انحدار الجبل (تسارع صاعد)' : 'Slope Angle'}</span>
                <span className="text-white font-bold">{params.slopeDegrees}° (+{Math.round(5.275 * Math.pow(Math.tan(params.slopeDegrees * Math.PI / 180), 2) * 100)}%)</span>
              </div>
              <input
                type="range"
                min="0"
                max="45"
                value={params.slopeDegrees}
                onChange={(e) => onParamsChange({ slopeDegrees: Number(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded appearance-none accent-amber-400 cursor-pointer"
              />
            </div>

            {/* ALSAT NDVI Fuel Moisture Slider */}
            <div className="space-y-0.5">
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span className="flex items-center gap-1"><Droplets className="w-3 h-3 text-emerald-400" /> {isAr ? 'مؤشر ALSAT NDVI (جفاف الوقود)' : 'ALSAT NDVI'}</span>
                <span className="text-white font-bold">{params.ndvi.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.10"
                max="0.65"
                step="0.01"
                value={params.ndvi}
                onChange={(e) => onParamsChange({ ndvi: Number(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded appearance-none accent-emerald-400 cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
