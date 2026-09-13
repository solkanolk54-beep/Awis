import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Flame, 
  ShieldAlert, 
  Navigation, 
  Radio, 
  ChevronRight, 
  X, 
  Volume2, 
  VolumeX, 
  Clock, 
  Users, 
  MapPin,
  CheckCircle2,
  BellRing
} from 'lucide-react';
import { CalculatedEvacuationRoute, Language } from '../../types';
import { CivilianSettlement } from '../../data/algerianRoadNetwork';

interface AlertBannerProps {
  route: CalculatedEvacuationRoute | null;
  settlement: CivilianSettlement;
  currentLang: Language;
  onOpenEvacHUD?: () => void;
  onCenterMapOnRoute?: () => void;
  onDismiss?: () => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  route,
  settlement,
  currentLang,
  onOpenEvacHUD,
  onCenterMapOnRoute,
  onDismiss
}) => {
  const [isFlashing, setIsFlashing] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const isRtl = currentLang === 'ar';

  // Determine urgency level and colors based on fire clearance and status
  const isBlocked = route?.status === 'blocked_fire' || route?.routeType === 'compromised_blocked';
  const isCritical = isBlocked || (route && route.minFireClearanceKm < 2.0);
  const isCaution = route?.status === 'caution_smoke' || (route && route.minFireClearanceKm < 4.0);

  const urgencyBadge = isCritical 
    ? { en: 'CRITICAL EVACUATION ORDER', ar: 'أمر إخلاء استعجالي حرج', fr: 'ORDRE D’ÉVACUATION CRITIQUE', level: 'critical' }
    : isCaution
    ? { en: 'URGENT EVACUATION ADVISORY', ar: 'تنبيه إخلاء استعجالي', fr: 'AVIS D’ÉVACUATION URGENT', level: 'warning' }
    : { en: 'ACTIVE SAFE CORRIDOR READY', ar: 'المسار الآمن مفعل وجاهز', fr: 'CORRIDOR SÉCURISÉ ACTIF', level: 'safe' };

  // Trigger flashing beacon when a new route is selected/calculated
  useEffect(() => {
    setIsFlashing(true);
    setDismissed(false);
    const timer = setTimeout(() => {
      setIsFlashing(false);
    }, 6000);
    return () => clearTimeout(timer);
  }, [route?.id, settlement.id]);

  // Audio beacon synth tone when critical and audio enabled
  useEffect(() => {
    if (!isAudioEnabled || !isCritical) return;

    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      const audioCtx = new AudioContextClass();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.15); // E5

      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.45);
    } catch {
      // Audio context silently ignored in restricted environments
    }
  }, [route?.id, isAudioEnabled, isCritical]);

  if (dismissed || !route) return null;

  // Immediate instruction text from primary step
  const immediateInstruction = route.instructions[0];
  const stepText = immediateInstruction
    ? currentLang === 'ar'
      ? immediateInstruction.instructionAr
      : currentLang === 'fr'
      ? immediateInstruction.instructionFr
      : immediateInstruction.instructionEn
    : currentLang === 'ar'
    ? `سلوك طريق ${route.safeZone.nameAr} فوراً`
    : `Proceed towards ${route.safeZone.nameEn} immediately`;

  return (
    <div
      id="gis-evac-alert-banner"
      dir={isRtl ? 'rtl' : 'ltr'}
      className={`absolute top-16 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-4xl transition-all duration-300 transform rounded-2xl border shadow-2xl backdrop-blur-xl ${
        isCritical
          ? 'bg-gradient-to-r from-red-950/95 via-red-900/90 to-slate-950/95 border-red-500/70 text-red-50 shadow-red-950/70'
          : isCaution
          ? 'bg-gradient-to-r from-amber-950/95 via-orange-950/90 to-slate-950/95 border-amber-500/70 text-amber-50 shadow-amber-950/70'
          : 'bg-gradient-to-r from-emerald-950/95 via-teal-950/90 to-slate-950/95 border-emerald-500/70 text-emerald-50 shadow-emerald-950/70'
      } ${
        isFlashing
          ? 'ring-4 ring-offset-2 ring-offset-slate-950 ' +
            (isCritical ? 'ring-red-500 animate-pulse' : isCaution ? 'ring-amber-400 animate-pulse' : 'ring-emerald-400')
          : ''
      }`}
      style={{
        boxShadow: isCritical
          ? '0 0 45px rgba(239, 68, 68, 0.45), 0 10px 30px rgba(0,0,0,0.8)'
          : isCaution
          ? '0 0 35px rgba(245, 158, 11, 0.35), 0 10px 30px rgba(0,0,0,0.8)'
          : '0 0 35px rgba(16, 185, 129, 0.35), 0 10px 30px rgba(0,0,0,0.8)'
      }}
    >
      {/* Visual Emergency Flashing Strobe Bar */}
      <div
        className={`h-1.5 w-full rounded-t-2xl overflow-hidden ${
          isCritical
            ? 'bg-red-500 animate-[pulse_1s_infinite]'
            : isCaution
            ? 'bg-amber-400 animate-[pulse_1.5s_infinite]'
            : 'bg-emerald-400'
        }`}
      />

      <div className="px-4 py-3 sm:px-5 sm:py-3.5 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Left Side: Flashing Emergency Icon + Context Header */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div
            className={`relative p-2.5 rounded-xl flex items-center justify-center shrink-0 ${
              isCritical
                ? 'bg-red-600/30 border border-red-400 text-red-300 shadow-inner'
                : isCaution
                ? 'bg-amber-600/30 border border-amber-400 text-amber-300'
                : 'bg-emerald-600/30 border border-emerald-400 text-emerald-300'
            }`}
          >
            {isCritical ? (
              <Flame className="w-5 h-5 animate-bounce text-red-300" />
            ) : isCaution ? (
              <AlertTriangle className="w-5 h-5 animate-pulse text-amber-300" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-emerald-300" />
            )}

            {isFlashing && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`px-2 py-0.5 text-[10px] font-black tracking-wider uppercase rounded font-mono flex items-center gap-1 ${
                  isCritical
                    ? 'bg-red-500 text-white animate-pulse'
                    : isCaution
                    ? 'bg-amber-500 text-black font-extrabold'
                    : 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/40'
                }`}
              >
                <BellRing className="w-3 h-3" />
                {currentLang === 'ar' ? urgencyBadge.ar : currentLang === 'fr' ? urgencyBadge.fr : urgencyBadge.en}
              </span>

              <span className="text-xs font-semibold text-slate-200 truncate">
                👥 {currentLang === 'ar' ? settlement.nameAr : settlement.nameEn} ({settlement.population} {currentLang === 'ar' ? 'نسمة' : 'civilians'})
              </span>
            </div>

            {/* Immediate Action Directive */}
            <div className="mt-1 flex items-center gap-2 text-xs font-medium text-slate-100">
              <span className="shrink-0 font-bold text-amber-300">
                {currentLang === 'ar' ? 'الإجراء الفوري:' : 'Immediate Action:'}
              </span>
              <p className="truncate text-slate-200 font-sans">{stepText}</p>
            </div>
          </div>
        </div>

        {/* Center / Stats Pill */}
        <div className="hidden sm:flex items-center gap-3 shrink-0 px-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] font-mono text-slate-300">
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {currentLang === 'ar' ? 'زمن الإخلاء:' : 'Clearance:'}{' '}
              <strong className="text-white">{route.estimatedEvacuationClearanceMinutes}m</strong>
            </span>
          </div>
          <div className="w-px h-3 bg-slate-700" />
          <div className="flex items-center gap-1">
            <Navigation className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              <strong className="text-white">{route.totalDistanceKm}km</strong>
            </span>
          </div>
          <div className="w-px h-3 bg-slate-700" />
          <div className="flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {currentLang === 'ar' ? 'هامش الأمان:' : 'Fire Margin:'}{' '}
              <strong className={route.minFireClearanceKm < 2.5 ? 'text-red-400' : 'text-emerald-400'}>
                {route.minFireClearanceKm}km
              </strong>
            </span>
          </div>
        </div>

        {/* Right Side: Quick Action Buttons & Dismiss */}
        <div className="flex items-center gap-1.5 w-full md:w-auto justify-end">
          {/* Audio Beep Toggle */}
          <button
            onClick={() => setIsAudioEnabled(!isAudioEnabled)}
            className={`p-2 rounded-xl transition cursor-pointer text-xs border ${
              isAudioEnabled
                ? 'bg-red-500/20 text-red-300 border-red-500/40'
                : 'bg-slate-900/60 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title={isAudioEnabled ? 'Mute Alert Sound' : 'Enable Emergency Siren Tone'}
          >
            {isAudioEnabled ? <Volume2 className="w-3.5 h-3.5 text-red-400 animate-pulse" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* Center Map on Safe Route */}
          {onCenterMapOnRoute && (
            <button
              onClick={onCenterMapOnRoute}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-1 transition cursor-pointer shadow"
              title={currentLang === 'ar' ? 'توسيط الخريطة على المسار' : 'Center on Evacuation Route'}
            >
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden lg:inline">{currentLang === 'ar' ? 'توسيط الخريطة' : 'Center Map'}</span>
            </button>
          )}

          {/* Open Full Evacuation HUD */}
          {onOpenEvacHUD && (
            <button
              onClick={onOpenEvacHUD}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-lg ${
                isCritical
                  ? 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white shadow-red-950/60'
                  : isCaution
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-amber-950/60'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/60'
              }`}
            >
              <span>{currentLang === 'ar' ? 'عرض خطة الإخلاء' : 'View Evac Plan'}</span>
              <ChevronRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
            </button>
          )}

          {/* Dismiss Alert */}
          <button
            onClick={() => {
              setDismissed(true);
              onDismiss?.();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition cursor-pointer"
            title="Dismiss Alert Banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
