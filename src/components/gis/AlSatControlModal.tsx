// AWIS — ALSAT Satellite Fleet Tactical Control Modal & HUD Host
// Manages real-time/simulation state and provides resilient fallback handling with toast notifications

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  AlsatSatelliteId, 
  AlsatRealtimePosition, 
  AlsatNdviPassData, 
  Language 
} from '../../types';
import { 
  computeAlsatPositionAtTime, 
  DEFAULT_ALSAT_PASSES 
} from '../../services/alsatTrackingService';
import { AlsatFleetHUD, AlsatFleetHUDProps } from './AlsatFleetHUD';
import { CheckCircle2, ShieldCheck, X } from 'lucide-react';

export interface AlSatControlModalProps {
  isOpen?: boolean;
  onClose: () => void;
  currentLang?: Language;
  satellite?: AlsatSatelliteId | 'ALL';
  selectedSat?: AlsatSatelliteId | 'ALL';
  positions?: Record<AlsatSatelliteId, AlsatRealtimePosition> | null;
  passes?: AlsatNdviPassData[] | null;
  selectedSatellite?: AlsatSatelliteId | 'ALL';
  selectedSatelliteId?: AlsatSatelliteId | 'ALL';
  onSelectSatellite?: (id: AlsatSatelliteId | 'ALL') => void;
  selectedPassId?: string | null;
  selectedPass?: AlsatNdviPassData | null;
  onSelectPass?: (pass: AlsatNdviPassData | null) => void;
  showTracks?: boolean;
  showOrbitalTracks?: boolean;
  onToggleTracks?: () => void;
  onToggleOrbitalTracks?: () => void;
  showSwaths?: boolean;
  showSwathCorridors?: boolean;
  onToggleSwaths?: () => void;
  onToggleSwathCorridors?: () => void;
  showFootprints?: boolean;
  showNdviFootprints?: boolean;
  onToggleFootprints?: () => void;
  onToggleNdviFootprints?: () => void;
  onRefreshTelemetry?: () => void;
  isOnline?: boolean;
  toastFeedback?: string | null;
}

export const AlSatControlModal: React.FC<AlSatControlModalProps> = ({
  isOpen = false,
  onClose,
  currentLang = 'ar',
  satellite,
  selectedSat,
  positions,
  passes,
  selectedSatellite,
  selectedSatelliteId,
  onSelectSatellite,
  selectedPassId,
  selectedPass,
  onSelectPass,
  showTracks,
  showOrbitalTracks,
  onToggleTracks,
  onToggleOrbitalTracks,
  showSwaths,
  showSwathCorridors,
  onToggleSwaths,
  onToggleSwathCorridors,
  showFootprints,
  showNdviFootprints,
  onToggleFootprints,
  onToggleNdviFootprints,
  onRefreshTelemetry,
  isOnline = true,
  toastFeedback = null
}) => {
  const isAr = currentLang === 'ar';
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const activeSatellite = satellite ?? selectedSat ?? selectedSatellite ?? selectedSatelliteId ?? 'ALL';

  // Fallback Telemetry Generation (Ensures HUD NEVER fails even if parent feed is undefined/empty)
  const safePositions = useMemo(() => {
    const now = new Date();
    const fallback: Record<AlsatSatelliteId, AlsatRealtimePosition> = {
      'ALSAT-1B': computeAlsatPositionAtTime('ALSAT-1B', now),
      'ALSAT-2A': computeAlsatPositionAtTime('ALSAT-2A', now),
      'ALSAT-2B': computeAlsatPositionAtTime('ALSAT-2B', now)
    };

    if (!positions || Object.keys(positions).length === 0) {
      return fallback;
    }

    return {
      'ALSAT-1B': positions['ALSAT-1B'] || fallback['ALSAT-1B'],
      'ALSAT-2A': positions['ALSAT-2A'] || fallback['ALSAT-2A'],
      'ALSAT-2B': positions['ALSAT-2B'] || fallback['ALSAT-2B']
    };
  }, [positions]);

  const safePasses = useMemo(() => {
    if (!passes || passes.length === 0) {
      return DEFAULT_ALSAT_PASSES;
    }
    return passes;
  }, [passes]);

  const displayedToast = toastFeedback || toastMessage;

  if (!isOpen) return null;

  const content = (
    <div 
      id="alsat-hud-modal-root" 
      className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 touch-none will-change-transform transform-gpu"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Toast Feedback Notification Banner */}
      {displayedToast && (
        <div 
          id="alsat-tactical-toast-banner"
          className="fixed top-3 left-1/2 -translate-x-1/2 z-[100010] max-w-[90vw] px-3.5 py-1.5 rounded-full bg-slate-950/95 border border-emerald-500/90 shadow-[0_10px_25px_rgba(16,185,129,0.3)] backdrop-blur-md flex items-center gap-2 text-xs text-white animate-in slide-in-from-top-2 duration-200 pointer-events-auto"
        >
          <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-3 h-3" />
          </div>
          <span className="font-semibold text-emerald-200 truncate">{displayedToast}</span>
          <button 
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white p-0.5 ml-1 transition cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* صندوق المودال الرئيسي */}
      <div 
        id="alsat-hud-modal-content"
        className="relative w-full max-w-2xl max-h-[85dvh] bg-slate-900 border border-emerald-500/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden pointer-events-auto ring-1 ring-emerald-500/30 will-change-transform transform-gpu"
        onClick={(e) => e.stopPropagation()}
      >
        <AlsatFleetHUD
          positions={safePositions}
          passes={safePasses}
          selectedSatellite={activeSatellite}
          selectedSatelliteId={activeSatellite}
          selectedPassId={selectedPassId ?? (selectedPass?.id || null)}
          selectedPass={selectedPass ?? null}
          onSelectSatellite={onSelectSatellite || (() => {})}
          onSelectPass={onSelectPass || (() => {})}
          showTracks={showTracks ?? showOrbitalTracks ?? true}
          showOrbitalTracks={showOrbitalTracks ?? showTracks ?? true}
          onToggleTracks={onToggleTracks || onToggleOrbitalTracks || (() => {})}
          onToggleOrbitalTracks={onToggleOrbitalTracks || onToggleTracks || (() => {})}
          showSwaths={showSwaths ?? showSwathCorridors ?? true}
          showSwathCorridors={showSwathCorridors ?? showSwaths ?? true}
          onToggleSwaths={onToggleSwaths || onToggleSwathCorridors || (() => {})}
          onToggleSwathCorridors={onToggleSwathCorridors || onToggleSwaths || (() => {})}
          showFootprints={showFootprints ?? showNdviFootprints ?? true}
          showNdviFootprints={showNdviFootprints ?? showFootprints ?? true}
          onToggleFootprints={onToggleFootprints || onToggleNdviFootprints || (() => {})}
          onToggleNdviFootprints={onToggleNdviFootprints || onToggleFootprints || (() => {})}
          onRefreshTelemetry={onRefreshTelemetry || (() => {})}
          onClose={onClose}
          currentLang={currentLang}
          isOnline={isOnline}
        />
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(content, document.body);
  }
  return content;
};

// Tactical Aliases for interoperability across modules
export const SatelliteHudModal = AlSatControlModal;
export const HUDOverlay = AlSatControlModal;
