// AWIS — ALSAT Orbital Pass Predictor & Tactical Countdown HUD
// High-precision pass prediction over Mila Direct Sector & Northern Algeria Band

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Satellite, 
  Clock, 
  Compass, 
  Radio, 
  Bell, 
  BellRing, 
  CheckCircle2, 
  MapPin, 
  Layers, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp, 
  Crosshair, 
  Sparkles,
  ExternalLink,
  Info,
  Calendar,
  Eye,
  AlertTriangle
} from 'lucide-react';
import { 
  AlsatPredictedPass, 
  AlsatSatelliteId, 
  Language 
} from '../../types';
import { 
  predictAlsatPasses, 
  fetchAlsatPredictedPasses,
  getArmedPassIds, 
  setPassArmedState, 
  MILA_BBOX, 
  NORTHERN_ALGERIA_BBOX 
} from '../../services/alsatTrackingService';
import { 
  isNotificationSupported, 
  getNotificationPermission, 
  requestNotificationPermission,
  playEmergencyAlertSound
} from '../../services/notificationService';

export interface AlsatPassPredictorProps {
  currentLang?: Language;
  variant?: 'floating' | 'panel';
  initialSatelliteFilter?: AlsatSatelliteId | 'ALL';
  onSelectPassCoordinates?: (lat: number, lng: number) => void;
  onOpenFullHUD?: () => void;
  className?: string;
}

export const AlsatPassPredictor: React.FC<AlsatPassPredictorProps> = ({
  currentLang = 'ar',
  variant = 'floating',
  initialSatelliteFilter = 'ALL',
  onSelectPassCoordinates,
  onOpenFullHUD,
  className = ''
}) => {
  const isAr = currentLang === 'ar';
  
  const [selectedSatFilter, setSelectedSatFilter] = useState<AlsatSatelliteId | 'ALL'>(initialSatelliteFilter);
  const [targetZoneFilter, setTargetZoneFilter] = useState<'ALL' | 'MILA_ONLY'>('ALL');
  const [isExpanded, setIsExpanded] = useState<boolean>(variant === 'panel');
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());
  const [armedPassIds, setArmedPassIds] = useState<string[]>(() => getArmedPassIds());
  const [toastFeedback, setToastFeedback] = useState<string | null>(null);

  // Update clock every second for live countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Real-time synchronization with server API proxy & local propagator
  const [remotePasses, setRemotePasses] = useState<AlsatPredictedPass[] | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetchAlsatPredictedPasses(selectedSatFilter, 5).then((passes) => {
      if (isMounted && passes && passes.length > 0) {
        setRemotePasses(passes);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [selectedSatFilter]);

  // Compute 5-day predicted passes (using remote feed when ready, or local SGP4 propagator)
  const allPredictedPasses = useMemo<AlsatPredictedPass[]>(() => {
    if (remotePasses && remotePasses.length > 0) {
      return remotePasses;
    }
    return predictAlsatPasses(['ALSAT-1B', 'ALSAT-2A', 'ALSAT-2B'], currentTime, 5);
  }, [remotePasses, currentTime.getHours()]); // re-calculate hourly or when armed state updates

  // Filtered passes based on current UI filter
  const filteredPasses = useMemo(() => {
    return allPredictedPasses.filter((p) => {
      if (selectedSatFilter !== 'ALL' && p.satelliteId !== selectedSatFilter) {
        return false;
      }
      if (targetZoneFilter === 'MILA_ONLY' && !p.isDirectOverMila) {
        return false;
      }
      // Only show upcoming passes (ending in the future)
      const passEndTime = new Date(p.passEndTime).getTime();
      return passEndTime >= currentTime.getTime();
    });
  }, [allPredictedPasses, selectedSatFilter, targetZoneFilter, currentTime]);

  // Primary next upcoming pass
  const nextImmediatePass = filteredPasses[0] || allPredictedPasses[0] || null;

  // Real-time Countdown calculation for next immediate pass
  const countdownStats = useMemo(() => {
    if (!nextImmediatePass) {
      return { hours: 0, minutes: 0, seconds: 0, totalSeconds: 0, isPassActive: false, progressPercent: 0 };
    }

    const startMs = new Date(nextImmediatePass.nextPassTime).getTime();
    const endMs = new Date(nextImmediatePass.passEndTime).getTime();
    const nowMs = currentTime.getTime();

    // Check if pass is currently ongoing
    if (nowMs >= startMs && nowMs <= endMs) {
      const remainingInPass = Math.max(0, Math.floor((endMs - nowMs) / 1000));
      const elapsedInPass = Math.max(0, Math.floor((nowMs - startMs) / 1000));
      const totalDur = nextImmediatePass.durationSeconds || 600;
      const progress = Math.min(100, Math.round((elapsedInPass / totalDur) * 100));

      const minutes = Math.floor(remainingInPass / 60);
      const seconds = remainingInPass % 60;

      return {
        hours: 0,
        minutes,
        seconds,
        totalSeconds: remainingInPass,
        isPassActive: true,
        progressPercent: progress
      };
    }

    // Ingress is in the future
    const diffSeconds = Math.max(0, Math.floor((startMs - nowMs) / 1000));
    const hours = Math.floor(diffSeconds / 3600);
    const minutes = Math.floor((diffSeconds % 3600) / 60);
    const seconds = diffSeconds % 60;

    // Progress bar for upcoming 24h cycle
    const cycleWindow = 24 * 3600;
    const progress = Math.min(100, Math.max(5, Math.round(((cycleWindow - Math.min(cycleWindow, diffSeconds)) / cycleWindow) * 100)));

    return {
      hours,
      minutes,
      seconds,
      totalSeconds: diffSeconds,
      isPassActive: false,
      progressPercent: progress
    };
  }, [nextImmediatePass, currentTime]);

  // Arm/Disarm notification handler
  const handleToggleArmAlert = useCallback(async (pass: AlsatPredictedPass, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const isCurrentlyArmed = armedPassIds.includes(pass.id);
    const nextState = !isCurrentlyArmed;

    if (nextState && isNotificationSupported()) {
      const currentPerm = getNotificationPermission();
      if (currentPerm !== 'granted') {
        const requested = await requestNotificationPermission();
        if (requested !== 'granted') {
          setToastFeedback(
            isAr 
              ? 'يرجى السماح بالإشعارات لتلقي تنبيه اقتراب القمر' 
              : 'Please enable notifications for orbital pass alerts'
          );
          setTimeout(() => setToastFeedback(null), 4000);
        }
      }
    }

    const updated = setPassArmedState(pass.id, nextState);
    setArmedPassIds(updated);

    if (nextState) {
      try {
        playEmergencyAlertSound();
      } catch {
        // audio policy fallback
      }

      setToastFeedback(
        isAr 
          ? `تم تفعيل التنبيه الميداني: ${pass.satelliteId} قبل 15 دقيقة من المرور` 
          : `Field alert armed: ${pass.satelliteId} (15m before pass)`
      );
    } else {
      setToastFeedback(
        isAr ? `تم إلغاء تأهب التنبيه للقمر ${pass.satelliteId}` : `Pass alert disarmed for ${pass.satelliteId}`
      );
    }
    setTimeout(() => setToastFeedback(null), 4000);
  }, [armedPassIds, isAr]);

  const formatDuration = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPassDate = (isoStr: string) => {
    const d = new Date(isoStr);
    return d.toLocaleTimeString(isAr ? 'ar-DZ' : 'en-US', {
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  // Compact Floating Pill Mode (Top of GIS Map or mobile bottom bar)
  if (variant === 'floating' && !isExpanded) {
    return (
      <div 
        id="alsat-pass-predictor-pill"
        className={`bg-slate-950/90 hover:bg-slate-900 border border-emerald-500/50 hover:border-emerald-400 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-xl p-2 px-3 flex items-center gap-3 transition-all cursor-pointer pointer-events-auto touch-pan-y ${className}`}
        onClick={() => setIsExpanded(true)}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0">
            <Satellite className="w-3.5 h-3.5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono font-bold text-white">
                {nextImmediatePass ? nextImmediatePass.satelliteId : 'ALSAT'}
              </span>
              {nextImmediatePass?.isDirectOverMila ? (
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/50 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  {isAr ? 'ميلة 🎯' : 'Mila 🎯'}
                </span>
              ) : (
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                  {isAr ? 'الشمال 🌐' : 'North 🌐'}
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              {isAr ? 'المرور القادم' : 'Next Pass'}
            </div>
          </div>
        </div>

        {/* Live Countdown Display */}
        <div className="flex items-center gap-1 font-mono text-xs font-bold px-2 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-emerald-400">
          <Clock className="w-3.5 h-3.5 text-emerald-400 animate-spin" style={{ animationDuration: '6s' }} />
          <span>
            {countdownStats.isPassActive ? (
              <span className="text-amber-300 animate-pulse font-bold">{isAr ? 'جارٍ المرور الآن' : 'PASS IN PROGRESS'}</span>
            ) : (
              `${countdownStats.hours.toString().padStart(2, '0')}:${countdownStats.minutes.toString().padStart(2, '0')}:${countdownStats.seconds.toString().padStart(2, '0')}`
            )}
          </span>
        </div>

        <button 
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(true);
          }}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          title={isAr ? 'توسيع تفاصيل التنبؤ' : 'Expand Pass Predictor'}
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Full Panel / Expanded View (Tactical Cyber Glassmorphism)
  return (
    <div 
      id="alsat-pass-predictor-full"
      className={`relative w-full bg-slate-950/95 border border-emerald-500/40 rounded-2xl shadow-2xl backdrop-blur-2xl p-3.5 sm:p-4 font-sans text-slate-200 pointer-events-auto touch-pan-y overscroll-contain transition-all ${className}`}
    >
      {/* Toast Alert Banner */}
      {toastFeedback && (
        <div 
          id="alsat-predictor-toast"
          className="fixed top-3 left-1/2 -translate-x-1/2 z-[100020] max-w-[90vw] px-3.5 py-1.5 rounded-full bg-slate-950/98 border border-emerald-400 shadow-[0_10px_30px_rgba(16,185,129,0.35)] backdrop-blur-md flex items-center gap-2 text-xs text-white animate-in slide-in-from-top-2 duration-200"
        >
          <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-3 h-3" />
          </div>
          <span className="font-semibold text-emerald-200 truncate">{toastFeedback}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0 shadow-lg">
            <Satellite className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>{isAr ? 'حاسبة التنبؤ بالمرور المداري' : 'ALSAT Orbital Pass Predictor'}</span>
              </h4>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/50 font-bold">
                ASAL • SGP4
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              {isAr ? 'رصد أوقات استباق التغطية لولاية ميلة والشريط الشمالي' : 'Mila Sector & Northern Algeria Coverage Windows'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {variant === 'floating' && (
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition cursor-pointer"
              title={isAr ? 'تصغير' : 'Collapse'}
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          )}

          {onOpenFullHUD && (
            <button
              onClick={onOpenFullHUD}
              className="p-1.5 px-2 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 hover:text-emerald-100 border border-emerald-500/40 text-[10px] font-mono flex items-center gap-1 transition cursor-pointer"
              title={isAr ? 'فتح لوحة القيادة التكتيكية الشاملة' : 'Open Full ALSAT Fleet HUD'}
            >
              <ExternalLink className="w-3 h-3" />
              <span>{isAr ? 'لوحة القيادة' : 'Full HUD'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs (Satellite & Target Zone) */}
      <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
        <div className="flex bg-slate-900/90 p-0.5 rounded-xl border border-slate-800">
          {(['ALL', 'ALSAT-1B', 'ALSAT-2A'] as const).map((sat) => (
            <button
              key={sat}
              onClick={() => setSelectedSatFilter(sat)}
              className={`flex-1 py-1 text-[10px] font-mono font-bold rounded-lg transition cursor-pointer ${
                selectedSatFilter === sat 
                  ? 'bg-emerald-600 text-white shadow' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {sat}
            </button>
          ))}
        </div>

        <div className="flex bg-slate-900/90 p-0.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setTargetZoneFilter('ALL')}
            className={`flex-1 py-1 text-[10px] font-mono font-bold rounded-lg transition cursor-pointer ${
              targetZoneFilter === 'ALL' 
                ? 'bg-cyan-700 text-white shadow' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {isAr ? 'كل الجزائر' : 'All Band'}
          </button>
          <button
            onClick={() => setTargetZoneFilter('MILA_ONLY')}
            className={`flex-1 py-1 text-[10px] font-mono font-bold rounded-lg transition cursor-pointer ${
              targetZoneFilter === 'MILA_ONLY' 
                ? 'bg-emerald-600 text-white shadow' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {isAr ? '🎯 ميلة فقط' : '🎯 Mila Only'}
          </button>
        </div>
      </div>

      {/* NEXT IMMEDIATE PASS HERO CARD */}
      {nextImmediatePass ? (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900/95 via-slate-900/80 to-emerald-950/40 border border-emerald-500/60 p-3.5 mb-3.5 shadow-xl ring-1 ring-emerald-500/30">
          {/* Background Ambient Glow */}
          <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

          {/* Top Row: Satellite Identifier & Target Zone Badge */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-white tracking-wider">
                {nextImmediatePass.satelliteId}
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {nextImmediatePass.orbitDirection === 'Ascending' ? (isAr ? 'مدار صاعد ↗' : 'Ascending ↗') : (isAr ? 'مدار هابط ↘' : 'Descending ↘')}
              </span>
            </div>

            {/* Geographical Target Badge */}
            {nextImmediatePass.isDirectOverMila ? (
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)] text-[10px] font-mono font-bold animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>{isAr ? '🎯 مرور مباشر: قطاع ميلة' : '🎯 Direct Pass: Mila Sector'}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800 text-[10px] font-mono font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                <span>{isAr ? '🌐 مسح إقليمي: الشريط الشمالي' : '🌐 Regional Sweep: Northern Band'}</span>
              </span>
            )}
          </div>

          {/* Real-time Large Countdown Timer */}
          <div className="my-2.5 p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mb-1">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isAr ? 'العد التنازلي للمرور الفعلي' : 'Time Remaining to Pass:'}</span>
              </div>
              <div className="text-2xl sm:text-3xl font-mono font-black tracking-widest text-emerald-400 flex items-baseline gap-1">
                {countdownStats.isPassActive ? (
                  <span className="text-amber-300 animate-pulse text-xl sm:text-2xl">
                    {isAr ? 'القمر في الأفق الميداني' : 'ACTIVE IN OVERHEAD HORIZON'}
                  </span>
                ) : (
                  <>
                    <span>{countdownStats.hours.toString().padStart(2, '0')}</span>
                    <span className="text-emerald-600">:</span>
                    <span>{countdownStats.minutes.toString().padStart(2, '0')}</span>
                    <span className="text-emerald-600">:</span>
                    <span className="text-white text-xl sm:text-2xl">{countdownStats.seconds.toString().padStart(2, '0')}</span>
                  </>
                )}
              </div>
            </div>

            {/* Arm Alert CTA Button */}
            <button
              id={`btn-arm-alert-${nextImmediatePass.id}`}
              onClick={(e) => handleToggleArmAlert(nextImmediatePass, e)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-lg cursor-pointer ${
                armedPassIds.includes(nextImmediatePass.id)
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                  : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 hover:border-emerald-400'
              }`}
              title={isAr ? 'تفعيل تنبيه صوتي وميداني قبل 15 دقيقة من المرور' : 'Trigger alert 15 minutes before satellite pass'}
            >
              {armedPassIds.includes(nextImmediatePass.id) ? (
                <>
                  <BellRing className="w-4 h-4 text-amber-400 animate-bounce" />
                  <span className="text-[11px]">{isAr ? 'تنبيه مفعل (15ق)' : 'Alert Armed'}</span>
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4 text-emerald-400" />
                  <span className="text-[11px]">{isAr ? 'تنبيه قبل 15 دقيقة' : 'Notify 15m Before'}</span>
                </>
              )}
            </button>
          </div>

          {/* Glowing Emerald Progress Bar */}
          <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-emerald-500/40 mb-3 shadow-inner">
            <div 
              className={`h-full transition-all duration-1000 ${
                countdownStats.isPassActive 
                  ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-red-500 animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.95)]' 
                  : 'bg-gradient-to-r from-teal-500 via-emerald-400 to-emerald-300 shadow-[0_0_16px_rgba(16,185,129,0.95)]'
              }`}
              style={{ 
                width: `${countdownStats.progressPercent}%`,
                filter: countdownStats.isPassActive ? 'drop-shadow(0 0 8px rgba(245, 158, 11, 0.9))' : 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.9))'
              }}
            />
          </div>

          {/* Pass Telemetry Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
            <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-slate-500 block text-[9px] uppercase">{isAr ? 'زاوية الارتفاع القصوى' : 'Max Elevation'}</span>
              <span className="text-emerald-300 font-bold text-xs flex items-center gap-1 mt-0.5">
                <Compass className="w-3.5 h-3.5 text-emerald-400" />
                <span>{nextImmediatePass.maxElevationAngle}°</span>
              </span>
            </div>

            <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-slate-500 block text-[9px] uppercase">{isAr ? 'مدة التغطية' : 'Duration'}</span>
              <span className="text-slate-200 font-bold text-xs flex items-center gap-1 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{formatDuration(nextImmediatePass.durationSeconds)}</span>
              </span>
            </div>

            <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-slate-500 block text-[9px] uppercase">{isAr ? 'عرض المسح (Swath)' : 'Swath Width'}</span>
              <span className="text-slate-200 font-bold text-xs flex items-center gap-1 mt-0.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>{nextImmediatePass.swathWidthKm} km</span>
              </span>
            </div>

            <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-slate-500 block text-[9px] uppercase">{isAr ? 'المستشعر النشط' : 'Sensor'}</span>
              <span className="text-emerald-300 font-bold text-[10px] truncate block mt-0.5" title={nextImmediatePass.sensorType}>
                {nextImmediatePass.sensorType.split('/')[0]}
              </span>
            </div>
          </div>

          {/* Quick center on map coordinate button */}
          {onSelectPassCoordinates && (
            <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
              <span className="text-slate-400">
                {isAr ? 'إحداثيات المسار:' : 'Sub-Sat Peak:'} {nextImmediatePass.subSatelliteLatitude}°N, {nextImmediatePass.subSatelliteLongitude}°E
              </span>
              <button
                onClick={() => onSelectPassCoordinates(nextImmediatePass.subSatelliteLatitude, nextImmediatePass.subSatelliteLongitude)}
                className="flex items-center gap-1 text-emerald-400 hover:text-emerald-200 cursor-pointer font-bold"
              >
                <Crosshair className="w-3 h-3" />
                <span>{isAr ? 'تمركز على النقطة' : 'Center Coordinates'}</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="p-6 text-center text-slate-500 font-mono text-xs bg-slate-900/50 rounded-2xl border border-slate-800 mb-3">
          {isAr ? 'لا توجد مسارات مطابقة للمرشحات الحالية' : 'No upcoming passes matching filter criteria'}
        </div>
      )}

      {/* UPCOMING 5-DAY PASS SCHEDULE LIST */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 font-mono uppercase tracking-wider">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isAr ? 'جدول المدارات القادمة (5 أيام)' : 'Upcoming 5-Day Schedule'}</span>
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {filteredPasses.length} {isAr ? 'مرور متوقع' : 'Passes'}
          </span>
        </div>

        <div className="space-y-2 max-h-52 overflow-y-auto pr-1 text-xs font-mono overscroll-contain touch-pan-y">
          {filteredPasses.slice(1, 9).map((pass) => {
            const isArmed = armedPassIds.includes(pass.id);
            return (
              <div 
                key={pass.id}
                className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 flex items-center justify-between gap-3 transition"
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-2 h-2 rounded-full ${pass.isDirectOverMila ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.9)]' : 'bg-cyan-500'}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-[11px]">{pass.satelliteId}</span>
                      <span className="text-[10px] text-slate-400">{formatPassDate(pass.nextPassTime)}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-2">
                      <span>{pass.isDirectOverMila ? (isAr ? '🎯 ميلة مباشر' : '🎯 Mila Direct') : (isAr ? '🌐 مسح إقليمي' : '🌐 Regional')}</span>
                      <span>•</span>
                      <span>Elev: {pass.maxElevationAngle}°</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => handleToggleArmAlert(pass, e)}
                    className={`p-1.5 rounded-lg border transition cursor-pointer ${
                      isArmed 
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' 
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border-slate-700'
                    }`}
                    title={isArmed ? (isAr ? 'إلغاء التنبيه' : 'Disarm Alert') : (isAr ? 'تأهيل تنبيه قبل 15 دقيقة' : 'Arm 15m alert')}
                  >
                    <Bell className={`w-3.5 h-3.5 ${isArmed ? 'text-amber-400' : ''}`} />
                  </button>

                  {onSelectPassCoordinates && (
                    <button
                      onClick={() => onSelectPassCoordinates(pass.subSatelliteLatitude, pass.subSatelliteLongitude)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-emerald-300 border border-slate-700 transition cursor-pointer"
                      title={isAr ? 'تمركز على الخريطة' : 'Center on map'}
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
