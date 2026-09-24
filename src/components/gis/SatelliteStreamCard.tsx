// AWIS — ALSAT Satellite Stream Card Component
// Interactive marker popup and telemetry telemetry stream card with HUD launch trigger and fallback resilience

import React, { useState, useMemo, useRef } from 'react';
import { 
  Satellite, 
  SlidersHorizontal, 
  Crosshair, 
  X, 
  CheckCircle2, 
  Activity, 
  Layers 
} from 'lucide-react';
import { 
  AlsatSatelliteId, 
  AlsatRealtimePosition, 
  AlsatNdviPassData, 
  Language 
} from '../../types';
import { 
  computeAlsatPositionAtTime 
} from '../../services/alsatTrackingService';
import { SatelliteHudModal } from './AlSatControlModal';

export interface SatelliteStreamCardProps {
  satelliteId: AlsatSatelliteId;
  position?: AlsatRealtimePosition | null;
  pass?: AlsatNdviPassData | null;
  isOverAlgeria?: boolean;
  currentLang: Language;
  onOpenHud?: () => void;
  onCenter?: () => void;
  onClose?: () => void;
  showDismissButton?: boolean;
  isEmbedded?: boolean;
}

export const SatelliteStreamCard: React.FC<SatelliteStreamCardProps> = ({
  satelliteId,
  position,
  pass,
  isOverAlgeria = false,
  currentLang,
  onOpenHud,
  onCenter,
  onClose,
  showDismissButton = true,
  isEmbedded = false
}) => {
  const isAr = currentLang === 'ar';
  const [isHudOpen, setIsHudOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Guarantee valid position telemetry even if feed is undefined
  const safePosition = useMemo(() => {
    if (position && !isNaN(Number(position.latitude ?? position.subSatellitePoint?.lat))) {
      return position;
    }
    return computeAlsatPositionAtTime(satelliteId);
  }, [position, satelliteId]);

  const popupLat = Number(safePosition.subSatellitePoint?.lat ?? safePosition.latitude ?? 36.7);
  const popupLng = Number(safePosition.subSatellitePoint?.lng ?? safePosition.longitude ?? 3.2);
  const altitude = safePosition.altitudeKm ?? 680;
  const velocity = safePosition.velocityKmS ?? 7.5;
  const swath = safePosition.groundFootprintRadiusKm 
    ? Math.round(safePosition.groundFootprintRadiusKm * 0.45) 
    : 140;

  const lastLaunchTimeRef = useRef<number>(0);

  const handleLaunchHud = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.stopPropagation();
    }
    const now = Date.now();
    if (now - lastLaunchTimeRef.current < 350) {
      return;
    }
    lastLaunchTimeRef.current = now;

    // 1. إظهار إشعار التأكيد
    const text = isAr
      ? 'تم فتح لوحة القيادة التكتيكية (HUD) لمحاكاة السطح الميداني لأقمار ALSAT'
      : 'ALSAT Tactical Surface HUD Activated';
    setToastMessage(text);
    setTimeout(() => setToastMessage(null), 3500);

    // 2. تغيير الحالة لفتح اللوحة
    setIsHudOpen(true);

    // 3. إعلام المكون الأب إذا توفر
    if (typeof onOpenHud === 'function') {
      onOpenHud();
    }
  };

  return (
    <>
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div 
          id="satellite-stream-card-toast"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[10005] px-4 py-2 rounded-xl bg-slate-950/95 border border-emerald-500/80 shadow-[0_10px_30px_rgba(16,185,129,0.35)] backdrop-blur-md flex items-center gap-2.5 text-xs text-white animate-in slide-in-from-top duration-300"
        >
          <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-emerald-200">{toastMessage}</span>
        </div>
      )}

      {/* Main Satellite Card */}
      <div 
        id={`satellite-stream-card-${satelliteId}`}
        className={`bg-slate-900/98 text-slate-100 border border-emerald-500/70 rounded-2xl shadow-[0_25px_60px_-10px_rgba(0,0,0,0.9)] backdrop-blur-2xl p-3.5 w-76 sm:w-84 font-sans relative z-40 pointer-events-auto touch-auto select-auto ring-1 ring-emerald-500/50 ${
          isEmbedded ? 'w-full' : ''
        }`}
        style={{ pointerEvents: 'auto' }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        {/* Header with Satellite badge & Dismiss button */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center">
              <Satellite className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-white text-xs">{satelliteId}</span>
                <span className="text-[9px] px-1 py-0.2 rounded font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                  ASAL
                </span>
              </div>
              <span className="text-[10px] text-slate-400">
                {isAr ? 'الوكالة الفضائية الجزائرية' : 'Algerian Space Agency'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {isOverAlgeria ? (
              <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                {isAr ? 'فوق الجزائر' : 'Over Algeria'}
              </span>
            ) : (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-950/70 text-cyan-300 border border-cyan-800 font-mono">
                {isAr ? 'في المدار LEO' : 'In LEO Orbit'}
              </span>
            )}

            {showDismissButton && onClose && (
              <button
                id="btn-close-satellite-stream-card"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800/90 hover:bg-rose-950/80 border border-slate-700/80 hover:border-rose-500/70 text-slate-300 hover:text-rose-200 transition-all shadow cursor-pointer group"
                title={isAr ? 'إغلاق النافذة التفاعلية (مفتاح Esc)' : 'Close Popup (Esc key)'}
                aria-label={isAr ? 'إغلاق نافذة القمر' : 'Close satellite card'}
              >
                <span className="text-[9px] font-mono font-bold text-slate-400 group-hover:text-rose-300">ESC</span>
                <X className="w-3.5 h-3.5 text-slate-300 group-hover:text-rose-300 group-hover:scale-110 transition-transform" />
              </button>
            )}
          </div>
        </div>

        {/* Sub-satellite coordinates & instantaneous telemetry */}
        <div className="grid grid-cols-2 gap-1.5 p-2 rounded-xl bg-slate-950/70 border border-slate-800/80 font-mono text-[10px] mb-2.5">
          <div>
            <span className="text-slate-500 block">{isAr ? 'الموقع الفضائي' : 'Sub-Sat Point'}:</span>
            <span className="text-emerald-300 font-semibold">{popupLat.toFixed(2)}°N, {popupLng.toFixed(2)}°E</span>
          </div>
          <div>
            <span className="text-slate-500 block">{isAr ? 'الارتفاع المداري' : 'Altitude'}:</span>
            <span className="text-slate-200">{altitude} km</span>
          </div>
          <div>
            <span className="text-slate-500 block">{isAr ? 'السرعة اللحظية' : 'Velocity'}:</span>
            <span className="text-slate-200">{velocity} km/s</span>
          </div>
          <div>
            <span className="text-slate-500 block">{isAr ? 'عرض المسح (Swath)' : 'Swath Width'}:</span>
            <span className="text-slate-200">{swath} km</span>
          </div>
        </div>

        {/* Selected NDVI Pass Info (if pass is provided) */}
        {pass && (
          <div className="p-2 rounded-xl bg-emerald-950/30 border border-emerald-600/30 text-[10px] mb-2.5 space-y-1">
            <div className="flex items-center justify-between text-slate-300">
              <span className="font-semibold">{isAr ? 'بصمة مسح الغابات (NDVI):' : 'Forest NDVI Pass:'}</span>
              <span className="font-mono text-emerald-300">
                {isAr ? (pass.wilayaTargetAr || pass.wilayaTarget) : pass.wilayaTarget}
              </span>
            </div>
            <div className="flex items-center justify-between font-mono">
              <span className="text-slate-400">Mean NDVI:</span>
              <span className={`font-bold ${
                (pass.ndviStats?.meanNdvi ?? 0.4) < 0.35 
                  ? 'text-red-400' 
                  : (pass.ndviStats?.meanNdvi ?? 0.4) < 0.50 
                  ? 'text-amber-400' 
                  : 'text-emerald-400'
              }`}>
                {(pass.ndviStats?.meanNdvi ?? 0.4).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between font-mono text-slate-400">
              <span>Cloud Cover:</span>
              <span>{pass.cloudCoverPercent}%</span>
            </div>
          </div>
        )}

        {/* Action CTA Buttons */}
        <div className="flex items-center gap-1.5 pt-0.5 relative z-50">
          <button
            id="btn-open-alsat-hud"
            onClick={handleLaunchHud}
            onTouchEnd={(e) => {
              e.stopPropagation();
              handleLaunchHud(e);
            }}
            className="relative z-50 pointer-events-auto touch-manipulation cursor-pointer flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/50 transition transform active:scale-95"
            style={{ zIndex: 50, pointerEvents: 'auto' }}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>{isAr ? 'فتح لوحة القيادة (HUD)' : 'Open ALSAT HUD'}</span>
          </button>

          {onCenter && (
            <button
              id="btn-center-alsat"
              onClick={(e) => {
                e.stopPropagation();
                onCenter();
              }}
              className="p-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[10px] font-mono transition cursor-pointer"
              title={isAr ? 'تمركز على القمر' : 'Center on Satellite'}
            >
              <Crosshair className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Tactical ALSAT Surface Simulation HUD Modal (Mounted via Portal at fixed z-index: 9999) */}
      {isHudOpen && (
        <SatelliteHudModal
          isOpen={isHudOpen}
          onClose={() => setIsHudOpen(false)}
          satellite={satelliteId}
          selectedSat={satelliteId}
          selectedPass={pass}
          currentLang={currentLang}
        />
      )}
    </>
  );
};
