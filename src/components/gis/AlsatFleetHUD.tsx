// AWIS — ALSAT Fleet Control HUD Panel & Multispectral Pass Explorer
// Algerian Space Agency (ASAL) Satellite Integration Control Interface

import React, { useState, useEffect } from 'react';
import { 
  Satellite, 
  Orbit, 
  Layers, 
  HardDrive, 
  RefreshCw, 
  Sliders, 
  Info, 
  ExternalLink, 
  X, 
  Activity, 
  ShieldCheck, 
  Eye,
  CheckCircle2,
  Calendar,
  CloudSun
} from 'lucide-react';
import { 
  AlsatSatelliteId, 
  AlsatRealtimePosition, 
  AlsatNdviPassData, 
  Language 
} from '../../types';
import { ALSAT_FLEET_REGISTRY } from '../../services/alsatTrackingService';

export interface AlsatFleetHUDProps {
  positions: Record<AlsatSatelliteId, AlsatRealtimePosition>;
  passes: AlsatNdviPassData[];
  selectedSatelliteId?: AlsatSatelliteId | 'ALL';
  selectedSatellite?: AlsatSatelliteId | 'ALL';
  selectedPassId?: string | null;
  selectedPass?: AlsatNdviPassData | null;
  onSelectSatellite: (id: AlsatSatelliteId | 'ALL') => void;
  onSelectPass: (pass: AlsatNdviPassData | null) => void;
  showOrbitalTracks?: boolean;
  showTracks?: boolean;
  onToggleOrbitalTracks?: () => void;
  onToggleTracks?: () => void;
  showSwathCorridors?: boolean;
  showSwaths?: boolean;
  onToggleSwathCorridors?: () => void;
  onToggleSwaths?: () => void;
  showNdviFootprints?: boolean;
  showFootprints?: boolean;
  onToggleNdviFootprints?: () => void;
  onToggleFootprints?: () => void;
  onRefreshTelemetry: () => void;
  onClose: () => void;
  currentLang: Language;
  isOnline?: boolean;
}

export const AlsatFleetHUD: React.FC<AlsatFleetHUDProps> = ({
  positions,
  passes,
  selectedSatelliteId: satIdProp,
  selectedSatellite: satProp,
  selectedPass: passProp,
  selectedPassId,
  onSelectSatellite,
  onSelectPass,
  showOrbitalTracks: tracksProp,
  showTracks,
  onToggleOrbitalTracks,
  onToggleTracks,
  showSwathCorridors: swathsProp,
  showSwaths,
  onToggleSwathCorridors,
  onToggleSwaths,
  showNdviFootprints: footprintsProp,
  showFootprints,
  onToggleNdviFootprints,
  onToggleFootprints,
  onRefreshTelemetry,
  onClose,
  currentLang,
  isOnline = true
}) => {
  const isAr = currentLang === 'ar';
  const [activeTab, setActiveTab] = useState<'fleet' | 'passes' | 'specifications'>('fleet');
  const satellites: AlsatSatelliteId[] = ['ALSAT-1B', 'ALSAT-2A', 'ALSAT-2B'];

  const activeSatelliteId = satIdProp ?? satProp ?? 'ALL';
  const effectiveShowTracks = tracksProp ?? showTracks ?? true;
  const effectiveToggleTracks = onToggleOrbitalTracks ?? onToggleTracks ?? (() => {});
  const effectiveShowSwaths = swathsProp ?? showSwaths ?? true;
  const effectiveToggleSwaths = onToggleSwathCorridors ?? onToggleSwaths ?? (() => {});
  const effectiveShowFootprints = footprintsProp ?? showFootprints ?? true;
  const effectiveToggleFootprints = onToggleNdviFootprints ?? onToggleFootprints ?? (() => {});

  const currentSelectedPass = passProp ?? (selectedPassId ? passes.find(p => p.id === selectedPassId) || null : null);

  // Tactical keyboard shortcut: Dismiss ALSAT HUD on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div 
      id="alsat-fleet-hud-modal"
      className="fixed top-16 md:top-20 end-4 sm:end-6 z-[9999] w-[calc(100vw-2rem)] sm:w-96 max-h-[85vh] bg-slate-900/98 border border-emerald-500/60 rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 ring-1 ring-emerald-500/40 relative"
      style={{ zIndex: 9999 }}
    >
      {/* HUD Header */}
      <div className="p-3.5 bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border-b border-emerald-500/30 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
            <Satellite className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">
                {isAr ? 'منظومة الأقمار الجزائرية (ALSAT Fleet)' : 'ALSAT Satellite Fleet'}
              </h3>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                ASAL
              </span>
              {!isOnline && (
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/40">
                  {isAr ? 'أوفلاين (IndexedDB)' : 'Offline (IDB)'}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              {isAr ? 'رصد الاستشعار عن بعد ومؤشرات جفاف الغابات (NDVI)' : 'Remote Sensing & Forest Biomass Moisture'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onRefreshTelemetry}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-emerald-300 border border-transparent hover:border-slate-700 transition cursor-pointer"
            title={isAr ? 'تحديث الموقع اللحظي' : 'Refresh Telemetry'}
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Explicit Tactical Close Button (X) */}
          <button
            id="btn-close-alsat-hud"
            onClick={onClose}
            aria-label={isAr ? 'إغلاق نافذة أقمار ألسات (مفتاح Esc)' : 'Close ALSAT HUD (Esc)'}
            className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-slate-800/90 hover:bg-rose-950/80 text-slate-300 hover:text-rose-200 border border-slate-700 hover:border-rose-500/70 transition-all shadow-md cursor-pointer group"
            title={isAr ? 'إغلاق النافذة التفاعلية (Esc)' : 'Close Telemetry HUD (Esc)'}
          >
            <span className="text-[9px] font-mono font-bold text-slate-400 group-hover:text-rose-300 hidden sm:inline">ESC</span>
            <X className="w-4 h-4 text-slate-300 group-hover:text-rose-300 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-950/60 text-xs">
        <button
          onClick={() => setActiveTab('fleet')}
          className={`flex-1 py-2 font-semibold text-center transition cursor-pointer ${
            activeTab === 'fleet' ? 'text-emerald-400 border-b-2 border-emerald-500 bg-emerald-500/10' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {isAr ? 'الموقع اللحظي' : 'Real-Time'}
        </button>
        <button
          onClick={() => setActiveTab('passes')}
          className={`flex-1 py-2 font-semibold text-center transition cursor-pointer ${
            activeTab === 'passes' ? 'text-emerald-400 border-b-2 border-emerald-500 bg-emerald-500/10' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {isAr ? 'تغطيات NDVI' : 'NDVI Passes'}
        </button>
        <button
          onClick={() => setActiveTab('specifications')}
          className={`flex-1 py-2 font-semibold text-center transition cursor-pointer ${
            activeTab === 'specifications' ? 'text-emerald-400 border-b-2 border-emerald-500 bg-emerald-500/10' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {isAr ? 'البيانات المدارية' : 'Orbital Specs'}
        </button>
      </div>

      {/* Content Body */}
      <div className="p-3 space-y-3 overflow-y-auto max-h-[60vh] text-xs">
        {/* Layer Display Controls */}
        <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5 font-mono text-[11px]">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
            {isAr ? 'طبقات العرض على الخريطة' : 'Map Layers Display'}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-300">{isAr ? 'رسم مسار المدار (Orbital Tracks)' : 'Orbital Tracks'}</span>
            <input 
              type="checkbox" 
              checked={effectiveShowTracks} 
              onChange={effectiveToggleTracks} 
              className="rounded accent-emerald-500 cursor-pointer"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-300">{isAr ? 'نطاق المسح والتغطية (Swath Corridor)' : 'Swath Corridors'}</span>
            <input 
              type="checkbox" 
              checked={effectiveShowSwaths} 
              onChange={effectiveToggleSwaths} 
              className="rounded accent-emerald-500 cursor-pointer"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-300">{isAr ? 'بصمات صور NDVI المخزنة' : 'Stored NDVI Footprints'}</span>
            <input 
              type="checkbox" 
              checked={effectiveShowFootprints} 
              onChange={effectiveToggleFootprints} 
              className="rounded accent-emerald-500 cursor-pointer"
            />
          </div>
        </div>

        {/* TAB 1: FLEET REALTIME STATUS */}
        {activeTab === 'fleet' && (
          <div className="space-y-2.5">
            {satellites.map((satId) => {
              const pos = positions[satId];
              const tle = ALSAT_FLEET_REGISTRY[satId];
              const isSelected = activeSatelliteId === satId;

              return (
                <div
                  key={satId}
                  onClick={() => onSelectSatellite(isSelected ? 'ALL' : satId)}
                  className={`p-2.5 rounded-xl border transition cursor-pointer ${
                    isSelected 
                      ? 'bg-emerald-950/40 border-emerald-500/70 shadow-lg' 
                      : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${pos?.isOverAlgeria ? 'bg-emerald-400 animate-ping' : 'bg-cyan-400'}`} />
                      <span className="font-bold text-white font-mono">{satId}</span>
                    </div>
                    {pos?.isOverAlgeria ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold font-mono">
                        {isAr ? 'فوق الجزائر' : 'Over Algeria'}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 font-mono">
                        {isAr ? 'في المدار العالمي' : 'Global Orbit'}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px] text-slate-300">
                    <div>
                      <span className="text-slate-500 block">{isAr ? 'خط العرض/الطول' : 'Sub-Sat Point'}:</span>
                      <span>
                        {(pos?.subSatellitePoint?.lat ?? pos?.latitude ?? 0).toFixed(2)}°, {(pos?.subSatellitePoint?.lng ?? pos?.longitude ?? 0).toFixed(2)}°
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">{isAr ? 'الارتفاع المداري' : 'Altitude'}:</span>
                      <span>{pos?.altitudeKm ?? tle.altitudeKm} km</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">{isAr ? 'السرعة المدارية' : 'Velocity'}:</span>
                      <span>{(pos?.velocityKmS ?? 7.51).toFixed(2)} km/s</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">{isAr ? 'دقة الحساس' : 'Resolution'}:</span>
                      <span className="text-emerald-400 font-bold">{tle.sensorResolutionMeters}m</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: NDVI PASSES OVER ALGERIAN FORESTS */}
        {activeTab === 'passes' && (
          <div className="space-y-2">
            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>{isAr ? 'التغطيات الفضائية المتاحة في IndexedDB' : 'Cached ALSAT NDVI Passes in IDB'}:</span>
              <span className="text-emerald-400 font-mono font-bold">{passes.length} {isAr ? 'تغطية' : 'passes'}</span>
            </div>

            {passes.map((pass) => {
              const isSelected = currentSelectedPass?.id === pass.id;
              const meanVal = pass.ndviStats?.meanNdvi ?? 0.4;
              const ndviColor = meanVal < 0.35 ? 'text-red-400' : meanVal < 0.50 ? 'text-amber-400' : 'text-emerald-400';

              return (
                <div
                  key={pass.id}
                  onClick={() => onSelectPass(isSelected ? null : pass)}
                  className={`p-2.5 rounded-xl border transition cursor-pointer ${
                    isSelected 
                      ? 'bg-emerald-950/40 border-emerald-500 shadow-md' 
                      : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white font-mono">{pass.satelliteId}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{new Date(pass.acquisitionDate).toLocaleDateString()}</span>
                  </div>
                  <div className="text-xs text-slate-300 font-semibold mt-0.5">
                    {isAr ? pass.wilayaTargetAr : pass.wilayaTarget}
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-800/80 text-[10px] font-mono">
                    <span className={ndviColor}>
                      NDVI: <strong>{meanVal.toFixed(2)}</strong> ({isAr ? pass.ndviStats?.droughtSeverityIndexAr || 'مؤشر الجفاف' : pass.ndviStats?.droughtSeverityIndex || 'Drought Index'})
                    </span>
                    <span className="text-slate-400">
                      ☁️ {pass.cloudCoverPercent}% {isAr ? 'غيوم' : 'cloud'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 3: ASAL TLE SPECIFICATIONS */}
        {activeTab === 'specifications' && (
          <div className="space-y-3">
            {satellites.map((satId) => {
              const tle = ALSAT_FLEET_REGISTRY[satId];
              return (
                <div key={satId} className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-400 font-mono text-sm">{satId}</span>
                    <span className="text-[10px] text-slate-400 font-mono">NORAD: #{tle.noradId}</span>
                  </div>
                  <div className="text-xs text-slate-200">{isAr ? tle.nameAr : tle.name}</div>
                  <div className="text-[11px] text-slate-400 leading-relaxed">{isAr ? tle.missionRoleAr : tle.missionRoleEn}</div>
                  <div className="grid grid-cols-2 gap-1.5 pt-1.5 text-[10px] font-mono border-t border-slate-800 text-slate-300">
                    <div>{isAr ? 'عرض المسار' : 'Swath'}: <span className="text-cyan-300">{tle.swathWidthKm} km</span></div>
                    <div>{isAr ? 'الدقة' : 'Resolution'}: <span className="text-cyan-300">{tle.sensorResolutionMeters} m</span></div>
                    <div>{isAr ? 'الميل المداري' : 'Inclination'}: {tle.inclinationDeg}°</div>
                    <div>{isAr ? 'الفترة' : 'Period'}: {tle.periodMinutes} min</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
