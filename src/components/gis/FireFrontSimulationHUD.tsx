import React, { useState, useEffect } from 'react';
import { 
  Flame, 
  Wind, 
  Droplets, 
  Mountain, 
  Play, 
  Pause, 
  RotateCcw, 
  Sliders, 
  Layers, 
  Activity, 
  AlertTriangle, 
  X, 
  ChevronRight, 
  ChevronDown, 
  Compass, 
  ShieldAlert, 
  Info,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { 
  PhysicalFireFrontSimulationResult, 
  FireFrontVertex, 
  FireFrontSimulationConfig 
} from '../../services/fireFrontPhysicsEngine';
import { Language } from '../../types';

interface FireFrontSimulationHUDProps {
  simulation: PhysicalFireFrontSimulationResult;
  config: FireFrontSimulationConfig;
  onConfigChange: (newConfig: FireFrontSimulationConfig) => void;
  activeTimeMinutes: number;
  onTimeChange: (time: number | ((prev: number) => number)) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  showVectors: boolean;
  onToggleVectors: () => void;
  showIsochrones: boolean;
  onToggleIsochrones: () => void;
  showDemBadges: boolean;
  onToggleDemBadges: () => void;
  selectedVertex: FireFrontVertex | null;
  onSelectVertex: (vertex: FireFrontVertex | null) => void;
  onClose: () => void;
  currentLang: Language;
}

export const FireFrontSimulationHUD: React.FC<FireFrontSimulationHUDProps> = ({
  simulation,
  config,
  onConfigChange,
  activeTimeMinutes,
  onTimeChange,
  isPlaying,
  onTogglePlay,
  showVectors,
  onToggleVectors,
  showIsochrones,
  onToggleIsochrones,
  showDemBadges,
  onToggleDemBadges,
  selectedVertex,
  onSelectVertex,
  onClose,
  currentLang
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<'controls' | 'physics' | 'transect'>('controls');
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 5>(1);

  // Auto playback animation timer
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      onTimeChange((prev) => {
        const next = prev + 5 * playbackSpeed;
        if (next > 240) {
          return 15; // Loop back or stop
        }
        return next;
      });
    }, 450);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, onTimeChange]);

  const activeWavefront = simulation.activeWavefront;
  const isRtl = currentLang === 'ar';

  // Weather scenario presets
  const applyPreset = (preset: 'sirocco' | 'coastal' | 'night_calm' | 'telemetry') => {
    if (preset === 'sirocco') {
      onConfigChange({
        ...config,
        windSpeedKmH: 52,
        windDirectionDegrees: 225, // SW Sirocco
        fuelMoisturePercent: 8, // Very dry
        slopeMultiplierWeight: 1.3
      });
    } else if (preset === 'coastal') {
      onConfigChange({
        ...config,
        windSpeedKmH: 34,
        windDirectionDegrees: 45, // NE Sea Breeze
        fuelMoisturePercent: 18,
        slopeMultiplierWeight: 1.0
      });
    } else if (preset === 'night_calm') {
      onConfigChange({
        ...config,
        windSpeedKmH: 12,
        windDirectionDegrees: 180, // S Mountain Draught
        fuelMoisturePercent: 24,
        slopeMultiplierWeight: 0.8
      });
    } else {
      onConfigChange({
        ...config,
        windSpeedKmH: 38,
        windDirectionDegrees: 45,
        fuelMoisturePercent: 14,
        slopeMultiplierWeight: 1.0
      });
    }
  };

  return (
    <div 
      className={`absolute bottom-6 right-6 z-30 flex flex-col bg-slate-900/95 backdrop-blur-md border border-red-500/40 rounded-xl shadow-2xl transition-all duration-200 text-white ${
        isMinimized ? 'w-80 h-14 overflow-hidden' : 'w-[440px] max-h-[85vh] overflow-y-auto'
      }`}
      dir={isRtl ? 'rtl' : 'ltr'}
      style={{
        boxShadow: '0 0 25px rgba(220, 38, 38, 0.25), 0 20px 25px -5px rgba(0, 0, 0, 0.5)'
      }}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-red-950/80 via-slate-900 to-slate-900 border-b border-red-500/30">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-red-600/30 border border-red-500/50 rounded-lg text-red-400">
            <Flame className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100">
                {currentLang === 'ar' ? 'محاكي جبهة النيران الفيزيائي' : currentLang === 'fr' ? 'Simulateur Front de Flamme Physique' : 'Physical Fire Front Engine'}
              </h3>
              <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-red-500/20 text-red-300 border border-red-500/40 rounded">
                DEM + FMC + WIND
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              {simulation.originDEM.elevationMeters}m ASL • {simulation.originDEM.slopeDegrees}° Incline ({simulation.originDEM.aspectCardinal})
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
            className="p-1 hover:bg-red-500/20 rounded text-slate-400 hover:text-red-300"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="p-4 space-y-4 text-xs">
          {/* Key KPI Metrics Bar */}
          <div className="grid grid-cols-4 gap-2">
            <div className="p-2 bg-slate-800/80 border border-slate-700/60 rounded-lg">
              <span className="text-[10px] text-slate-400 uppercase tracking-tight block">
                {currentLang === 'ar' ? 'أقصى سرعة' : 'Max RoS'}
              </span>
              <span className="text-sm font-bold font-mono text-red-400">
                {activeWavefront.maxSpreadVelocityKmH} <span className="text-[10px] font-normal text-slate-400">km/h</span>
              </span>
              <span className="text-[9px] text-slate-500 block font-mono">
                {activeWavefront.maxSpreadVelocityMMin} m/min
              </span>
            </div>

            <div className="p-2 bg-slate-800/80 border border-slate-700/60 rounded-lg">
              <span className="text-[10px] text-slate-400 uppercase tracking-tight block">
                {currentLang === 'ar' ? 'المساحة المحترقة' : 'Area Burned'}
              </span>
              <span className="text-sm font-bold font-mono text-amber-400">
                {activeWavefront.burnedAreaHectares} <span className="text-[10px] font-normal text-slate-400">ha</span>
              </span>
              <span className="text-[9px] text-slate-500 block font-mono">
                Perim: {activeWavefront.perimeterKm} km
              </span>
            </div>

            <div className="p-2 bg-slate-800/80 border border-slate-700/60 rounded-lg">
              <span className="text-[10px] text-slate-400 uppercase tracking-tight block">
                {currentLang === 'ar' ? 'شدة الخط الناري' : 'Intensity'}
              </span>
              <span className="text-sm font-bold font-mono text-orange-400">
                {activeWavefront.peakFirelineIntensityKwM} <span className="text-[10px] font-normal text-slate-400">kW/m</span>
              </span>
              <span className="text-[9px] text-slate-500 block font-mono">
                Flame: {activeWavefront.peakFlameLengthMeters}m
              </span>
            </div>

            <div className="p-2 bg-slate-800/80 border border-slate-700/60 rounded-lg">
              <span className="text-[10px] text-slate-400 uppercase tracking-tight block">
                {currentLang === 'ar' ? 'تطاير الشظايا' : 'Spotting Max'}
              </span>
              <span className="text-sm font-bold font-mono text-purple-400">
                {simulation.maxSpottingPotentialDistanceKm} <span className="text-[10px] font-normal text-slate-400">km</span>
              </span>
              <span className="text-[9px] text-slate-500 block font-mono">
                {simulation.containmentUrgency.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Timeline & Playback Controls */}
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={onTogglePlay}
                  className={`p-1.5 rounded-lg flex items-center gap-1 font-bold text-xs ${
                    isPlaying 
                      ? 'bg-amber-600 hover:bg-amber-500 text-white' 
                      : 'bg-red-600 hover:bg-red-500 text-white'
                  }`}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isPlaying ? (currentLang === 'ar' ? 'إيقاف' : 'Pause') : (currentLang === 'ar' ? 'تشغيل' : 'Simulate')}</span>
                </button>

                <button
                  onClick={() => onTimeChange(15)}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                  title="Reset to T+15m"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                {/* Speed buttons */}
                <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-[10px] font-mono">
                  {([1, 2, 5] as const).map((spd) => (
                    <button
                      key={spd}
                      onClick={() => setPlaybackSpeed(spd)}
                      className={`px-1.5 py-0.5 rounded ${playbackSpeed === spd ? 'bg-red-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-right font-mono">
                <span className="text-red-400 font-bold text-sm">+{activeTimeMinutes} min</span>
                <span className="text-[10px] text-slate-400 block">
                  ({(activeTimeMinutes / 60).toFixed(1)} hrs elapsed)
                </span>
              </div>
            </div>

            {/* Scrubber slider */}
            <div className="space-y-1">
              <input
                type="range"
                min="15"
                max="240"
                step="5"
                value={activeTimeMinutes}
                onChange={(e) => onTimeChange(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-500"
              />
              <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                <span>+15m</span>
                <span>+30m</span>
                <span>+1h</span>
                <span>+2h</span>
                <span>+3h</span>
                <span>+4h</span>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('controls')}
              className={`pb-2 px-3 font-semibold border-b-2 transition-colors ${
                activeTab === 'controls' 
                  ? 'border-red-500 text-red-400' 
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              {currentLang === 'ar' ? 'المعايير الفيزيائية' : 'Physics Parameters'}
            </button>
            <button
              onClick={() => setActiveTab('physics')}
              className={`pb-2 px-3 font-semibold border-b-2 transition-colors ${
                activeTab === 'physics' 
                  ? 'border-red-500 text-red-400' 
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              {currentLang === 'ar' ? 'معادلات روثرميل' : 'Rothermel Formulation'}
            </button>
            <button
              onClick={() => setActiveTab('transect')}
              className={`pb-2 px-3 font-semibold border-b-2 transition-colors ${
                activeTab === 'transect' 
                  ? 'border-red-500 text-red-400' 
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              {currentLang === 'ar' ? 'مقطع التضاريس DEM' : 'DEM Elevation Profile'}
            </button>
          </div>

          {/* TAB 1: Controls & Environmental Sliders */}
          {activeTab === 'controls' && (
            <div className="space-y-3.5">
              {/* Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-slate-400 uppercase">Presets:</span>
                <button
                  onClick={() => applyPreset('sirocco')}
                  className="px-2 py-0.5 text-[10px] bg-red-950/70 hover:bg-red-900 border border-red-700/60 rounded text-red-200"
                >
                  🔥 Sirocco 52km/h (SW)
                </button>
                <button
                  onClick={() => applyPreset('coastal')}
                  className="px-2 py-0.5 text-[10px] bg-blue-950/70 hover:bg-blue-900 border border-blue-700/60 rounded text-blue-200"
                >
                  🌊 Coastal 34km/h (NE)
                </button>
                <button
                  onClick={() => applyPreset('night_calm')}
                  className="px-2 py-0.5 text-[10px] bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-slate-200"
                >
                  🌙 Night 12km/h (S)
                </button>
              </div>

              {/* Slider 1: Fuel Moisture Content (FMC) */}
              <div className="p-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-200">
                    <Droplets className="w-3.5 h-3.5 text-blue-400" />
                    <span className="font-semibold text-xs">
                      {currentLang === 'ar' ? 'رطوبة الوقود النباتي (FMC)' : 'Fuel Moisture Content (FMC)'}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-blue-400 text-xs">
                    {config.fuelMoisturePercent}%{' '}
                    <span className="text-[10px] font-normal text-slate-400">
                      (η_M: {simulation.fuelMoistureDampingFactor})
                    </span>
                  </span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="32"
                  step="1"
                  value={config.fuelMoisturePercent}
                  onChange={(e) => onConfigChange({ ...config, fuelMoisturePercent: Number(e.target.value) })}
                  className="w-full h-1.5 bg-slate-700 rounded appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                  <span className="text-red-400">4% Critical Drought</span>
                  <span>14% High Flammability</span>
                  <span className="text-emerald-400">26% Extinction Limit</span>
                </div>
              </div>

              {/* Slider 2: Wind Speed & Direction */}
              <div className="p-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-200">
                    <Wind className="w-3.5 h-3.5 text-amber-400" />
                    <span className="font-semibold text-xs">
                      {currentLang === 'ar' ? 'سرعة الرياح واتجاهها' : 'Wind Velocity & Heading'}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-amber-400 text-xs">
                    {config.windSpeedKmH} km/h • {simulation.windDirectionCardinal} ({config.windDirectionDegrees}°)
                  </span>
                </div>
                
                {/* Wind speed slider */}
                <input
                  type="range"
                  min="0"
                  max="75"
                  step="1"
                  value={config.windSpeedKmH}
                  onChange={(e) => onConfigChange({ ...config, windSpeedKmH: Number(e.target.value) })}
                  className="w-full h-1.5 bg-slate-700 rounded appearance-none cursor-pointer accent-amber-500"
                />

                {/* Wind direction selector */}
                <div className="pt-1 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-400">From Direction:</span>
                  <input
                    type="range"
                    min="0"
                    max="359"
                    step="5"
                    value={config.windDirectionDegrees}
                    onChange={(e) => onConfigChange({ ...config, windDirectionDegrees: Number(e.target.value) })}
                    className="flex-1 h-1.5 bg-slate-700 rounded appearance-none cursor-pointer accent-amber-500"
                  />
                  <span className="text-[10px] font-mono font-bold text-slate-200 min-w-[32px] text-right">
                    {config.windDirectionDegrees}°
                  </span>
                </div>
              </div>

              {/* Slider 3: DEM Slope Weight Sensitivity */}
              <div className="p-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-200">
                    <Mountain className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="font-semibold text-xs">
                      {currentLang === 'ar' ? 'تأثير انحدار السطح (DEM Slope)' : 'DEM Slope Coupling Multiplier'}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-emerald-400 text-xs">
                    {config.slopeMultiplierWeight || 1.0}x{' '}
                    <span className="text-[10px] font-normal text-slate-400">
                      (+{simulation.slopeAccelerationPercent}% uphill)
                    </span>
                  </span>
                </div>
                <input
                  type="range"
                  min="0.4"
                  max="2.0"
                  step="0.1"
                  value={config.slopeMultiplierWeight || 1.0}
                  onChange={(e) => onConfigChange({ ...config, slopeMultiplierWeight: Number(e.target.value) })}
                  className="w-full h-1.5 bg-slate-700 rounded appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                  <span>0.5x Damped</span>
                  <span>1.0x Standard Rothermel</span>
                  <span>2.0x Extreme Channeled</span>
                </div>
              </div>

              {/* Layer Display Toggles */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800 text-[11px]">
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={showVectors}
                    onChange={onToggleVectors}
                    className="rounded bg-slate-800 border-slate-700 text-red-600 focus:ring-0"
                  />
                  <span>Vectors</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={showIsochrones}
                    onChange={onToggleIsochrones}
                    className="rounded bg-slate-800 border-slate-700 text-red-600 focus:ring-0"
                  />
                  <span>Isochrones</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={showDemBadges}
                    onChange={onToggleDemBadges}
                    className="rounded bg-slate-800 border-slate-700 text-red-600 focus:ring-0"
                  />
                  <span>DEM Badges</span>
                </label>
              </div>
            </div>
          )}

          {/* TAB 2: Physical Equations & Rothermel Breakdown */}
          {activeTab === 'physics' && (
            <div className="space-y-3 text-xs">
              <div className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-lg font-mono text-[11px] space-y-1.5">
                <div className="text-red-400 font-bold border-b border-slate-800 pb-1">
                  ROTHERMEL SURFACE FIRE SPREAD MODEL:
                </div>
                <div className="text-slate-300">
                  R = R₀ · η_M · (1 + φ_w + φ_s)
                </div>
                <div className="text-slate-400 text-[10px] space-y-0.5 pt-1">
                  <div>• R₀ (Base ROS) = 3.2 m/min</div>
                  <div>• η_M (Moisture Damping) = {simulation.fuelMoistureDampingFactor}</div>
                  <div>• φ_w (Wind Factor) = {(Math.pow(config.windSpeedKmH / 15, 1.45)).toFixed(2)}</div>
                  <div>• φ_s (Slope Factor) = {(5.275 * Math.pow(Math.tan((simulation.originDEM.slopeDegrees * Math.PI) / 180), 2)).toFixed(2)}</div>
                  <div>• L/W Elliptical Ratio = {simulation.lengthToWidthRatio}</div>
                </div>
              </div>

              {/* Byram Fireline Intensity */}
              <div className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-lg font-mono text-[11px] space-y-1">
                <div className="text-orange-400 font-bold">
                  BYRAM FIRELINE INTENSITY (I_B):
                </div>
                <div className="text-slate-300">
                  I_B = H · w · R = {activeWavefront.peakFirelineIntensityKwM} kW/m
                </div>
                <div className="text-slate-400 text-[10px]">
                  Flame Length L_f = 0.0775 · I_B^0.46 = <span className="text-white font-bold">{activeWavefront.peakFlameLengthMeters} meters</span>
                </div>
              </div>

              {/* Clicked Vertex Inspection Card */}
              {selectedVertex ? (
                <div className="p-2.5 bg-slate-800/80 border border-blue-500/50 rounded-lg space-y-1">
                  <div className="flex items-center justify-between text-blue-300 font-bold text-[11px]">
                    <span>Vertex #{selectedVertex.index} ({selectedVertex.sectorType.toUpperCase()})</span>
                    <button onClick={() => onSelectVertex(null)} className="text-slate-400 hover:text-white text-[10px]">Close</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-300 pt-1">
                    <div>Velocity: <span className="text-red-400 font-bold">{selectedVertex.spreadVelocityKmH} km/h</span></div>
                    <div>Elevation: <span className="text-emerald-400 font-bold">{selectedVertex.demElevationMeters} m</span></div>
                    <div>Slope: <span className="text-amber-400 font-bold">{selectedVertex.demSlopeDegrees}° ({selectedVertex.demAspectCardinal})</span></div>
                    <div>Intensity: <span className="text-orange-400 font-bold">{selectedVertex.firelineIntensityKwM} kW/m</span></div>
                  </div>
                </div>
              ) : (
                <div className="text-[10px] text-slate-500 italic text-center py-1">
                  Click any vertex node or velocity arrow on the map to inspect localized physical telemetry.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DEM Transect Elevation Cross-Section */}
          {activeTab === 'transect' && (
            <div className="space-y-3">
              <div className="text-[11px] text-slate-300">
                Topographic cross-section along the head fire front propagation vector (from ignition origin along azimuth {simulation.effectiveSpreadHeadingDegrees}°):
              </div>

              {/* Mini SVG Elevation Chart */}
              <div className="h-28 bg-slate-950 border border-slate-800 rounded-lg p-2 relative">
                <svg className="w-full h-full" viewBox="0 0 360 80" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="demAreaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.6" />
                      <stop offset="100%" stopColor="#064e3b" stopOpacity="0.1" />
                    </linearGradient>
                  </defs>

                  {/* Render elevation profile area */}
                  {(() => {
                    const profile = simulation.demTransectProfile;
                    if (!profile || profile.length < 2) return null;

                    const minElev = Math.min(...profile.map((p) => p.elevationMeters)) - 50;
                    const maxElev = Math.max(...profile.map((p) => p.elevationMeters)) + 50;
                    const elevRange = Math.max(100, maxElev - minElev);

                    const points = profile.map((p, idx) => {
                      const x = (idx / (profile.length - 1)) * 360;
                      const y = 80 - ((p.elevationMeters - minElev) / elevRange) * 70;
                      return `${x.toFixed(1)},${y.toFixed(1)}`;
                    });

                    const areaPoints = `0,80 ${points.join(' ')} 360,80`;

                    return (
                      <g>
                        <polygon points={areaPoints} fill="url(#demAreaGradient)" />
                        <polyline
                          points={points.join(' ')}
                          fill="none"
                          stroke="#34d399"
                          strokeWidth="2"
                        />

                        {/* Fire head point marker */}
                        <circle cx="160" cy="35" r="3.5" fill="#ef4444" className="animate-ping" />
                        <circle cx="160" cy="35" r="2.5" fill="#ffffff" />
                      </g>
                    );
                  })()}
                </svg>

                <div className="flex justify-between text-[9px] text-slate-400 font-mono mt-1">
                  <span>Origin (0 km)</span>
                  <span className="text-red-400">Head Fire Front</span>
                  <span>Transect Bound</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-300">
                <div className="p-1.5 bg-slate-800/60 rounded border border-slate-700">
                  <span className="text-slate-400 block">Peak Massif:</span>
                  {simulation.originDEM.topographicFeature.toUpperCase()}
                </div>
                <div className="p-1.5 bg-slate-800/60 rounded border border-slate-700">
                  <span className="text-slate-400 block">Thermal Updraft:</span>
                  +{simulation.originDEM.thermalUpdraftVelocityMps} m/s
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
