// AWIS — ALSAT Active Hazards & Early Warning Panel (FWI Integration)
// Evaluates fire weather indices and biomass moisture for Mila forest massifs
// Directly correlates threatened zones with upcoming ALSAT orbital imaging passes

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Flame, 
  AlertTriangle, 
  Wind, 
  Droplets, 
  Thermometer, 
  Satellite, 
  Radio, 
  Bell, 
  CheckCircle2, 
  Clock, 
  Eye, 
  Compass, 
  ShieldAlert, 
  MapPin, 
  ExternalLink,
  Volume2,
  RefreshCw,
  Zap,
  TrendingUp,
  ChevronRight
} from 'lucide-react';
import { 
  MilaForestMassif, 
  EarlyWarningRiskTier, 
  evaluateMilaEarlyWarningHotspots, 
  broadcastTacticalFieldAlert,
  FieldAlertBroadcastReceipt
} from '../../services/AlsatEarlyWarningEngine';
import { AlsatSatelliteId, Language } from '../../types';

export interface AlsatEarlyWarningPanelProps {
  currentLang?: Language;
  onFocusCoordinates?: (lat: number, lng: number) => void;
  onSelectSatellite?: (satId: AlsatSatelliteId) => void;
  onSimulatePropagation?: (massif: MilaForestMassif) => void;
  className?: string;
}

export const AlsatEarlyWarningPanel: React.FC<AlsatEarlyWarningPanelProps> = ({
  currentLang = 'ar',
  onFocusCoordinates,
  onSelectSatellite,
  onSimulatePropagation,
  className = ''
}) => {
  const isAr = currentLang === 'ar';
  const [hotspots, setHotspots] = useState<MilaForestMassif[]>([]);
  const [selectedTier, setSelectedTier] = useState<EarlyWarningRiskTier | 'ALL'>('ALL');
  const [lastAlertReceipt, setLastAlertReceipt] = useState<FieldAlertBroadcastReceipt | null>(null);
  const [alertingId, setAlertingId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Initial evaluation
  useEffect(() => {
    setHotspots(evaluateMilaEarlyWarningHotspots());
    const interval = setInterval(() => {
      setHotspots(evaluateMilaEarlyWarningHotspots());
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Filtered hotspots
  const filteredHotspots = useMemo(() => {
    if (selectedTier === 'ALL') return hotspots;
    return hotspots.filter(h => h.riskTier === selectedTier);
  }, [hotspots, selectedTier]);

  // Overall metrics summary
  const summary = useMemo(() => {
    const extremeCount = hotspots.filter(h => h.riskTier === 'extreme').length;
    const highCount = hotspots.filter(h => h.riskTier === 'high').length;
    const avgFwi = hotspots.length > 0 
      ? (hotspots.reduce((acc, h) => acc + h.fwiIndices.fwi, 0) / hotspots.length).toFixed(1)
      : '0.0';
    const maxFfmc = hotspots.length > 0 
      ? Math.max(...hotspots.map(h => h.fwiIndices.ffmc)).toFixed(1)
      : '0.0';

    return { extremeCount, highCount, avgFwi, maxFfmc };
  }, [hotspots]);

  // Handle tactical alert broadcast
  const handleBroadcastAlert = (hotspot: MilaForestMassif) => {
    setAlertingId(hotspot.id);
    const receipt = broadcastTacticalFieldAlert(hotspot);
    setLastAlertReceipt(receipt);

    setTimeout(() => {
      setAlertingId(null);
    }, 1200);

    // Auto-dismiss receipt after 8 seconds
    setTimeout(() => {
      setLastAlertReceipt(prev => prev?.alertId === receipt.alertId ? null : prev);
    }, 8000);
  };

  // Helper to format remaining time to next pass
  const getPassTimeRemaining = (passTimeIso: string): string => {
    const diffMs = new Date(passTimeIso).getTime() - currentTime.getTime();
    if (diffMs <= 0) return isAr ? 'الآن في المجال' : 'Now in window';
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`space-y-3.5 text-xs ${className}`}>
      {/* 1. Header KPI Summary & Alert Status Bar */}
      <div className="p-3 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 shadow-lg space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-sm">
                  {isAr ? 'منظومة الإنذار المبكر ومؤشرات جو الحرائق (FWI)' : 'Intelligent Early Warning & FWI Engine'}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-rose-950/80 text-rose-300 border border-rose-500/40 font-bold animate-pulse">
                  {summary.extremeCount} {isAr ? 'خطر وشيك' : 'EXTREME'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                {isAr ? 'دمج رطوبة الغطاء النباتي الفضائي (ALSAT NDVI) مع النماذج المناخية الكندية (FFMC/ISI)' : 'Coupled ALSAT satellite moisture & Canadian Fire Weather Index'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setHotspots(evaluateMilaEarlyWarningHotspots())}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
            title={isAr ? 'إعادة تقييم المؤشرات' : 'Re-evaluate'}
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] font-mono font-semibold hidden sm:inline">{isAr ? 'تحديث' : 'Refresh'}</span>
          </button>
        </div>

        {/* 4 Metric Pill Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono">
          <div className="p-2 rounded-xl bg-slate-900/90 border border-rose-500/30">
            <span className="text-[10px] text-slate-400 block">{isAr ? 'بؤر الخطر الوشيك' : 'Extreme Hotspots'}</span>
            <span className="text-base font-bold text-rose-400">{summary.extremeCount} {isAr ? 'كتل' : 'zones'}</span>
          </div>

          <div className="p-2 rounded-xl bg-slate-900/90 border border-amber-500/30">
            <span className="text-[10px] text-slate-400 block">{isAr ? 'إجهاد مائي حرج' : 'High Risk Massifs'}</span>
            <span className="text-base font-bold text-amber-400">{summary.highCount} {isAr ? 'كتل' : 'zones'}</span>
          </div>

          <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">{isAr ? 'متوسط مؤشر FWI' : 'Average FWI'}</span>
            <span className="text-base font-bold text-cyan-300">{summary.avgFwi}</span>
          </div>

          <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">{isAr ? 'أعلى جفاف وقود FFMC' : 'Peak FFMC'}</span>
            <span className="text-base font-bold text-emerald-400">{summary.maxFfmc}</span>
          </div>
        </div>

        {/* Risk Level Filter Buttons */}
        <div className="flex items-center gap-1.5 pt-1 overflow-x-auto text-[11px] font-mono">
          <span className="text-slate-400 text-[10px] mr-1">{isAr ? 'تصفية حسب الخطر:' : 'Filter Risk:'}</span>
          <button
            onClick={() => setSelectedTier('ALL')}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer font-bold ${
              selectedTier === 'ALL' ? 'bg-slate-200 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {isAr ? 'الكل' : 'All'} ({hotspots.length})
          </button>
          <button
            onClick={() => setSelectedTier('extreme')}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer font-bold flex items-center gap-1 ${
              selectedTier === 'extreme' ? 'bg-rose-500 text-white shadow-sm' : 'bg-rose-950/40 text-rose-300 hover:bg-rose-900/50 border border-rose-500/30'
            }`}
          >
            <span>🔴 {isAr ? 'خطر وشيك' : 'Extreme'}</span>
            <span>({hotspots.filter(h => h.riskTier === 'extreme').length})</span>
          </button>
          <button
            onClick={() => setSelectedTier('high')}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer font-bold flex items-center gap-1 ${
              selectedTier === 'high' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'bg-amber-950/40 text-amber-300 hover:bg-amber-900/50 border border-amber-500/30'
            }`}
          >
            <span>🟠 {isAr ? 'مرتفع' : 'High'}</span>
            <span>({hotspots.filter(h => h.riskTier === 'high').length})</span>
          </button>
          <button
            onClick={() => setSelectedTier('moderate')}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer font-bold flex items-center gap-1 ${
              selectedTier === 'moderate' ? 'bg-yellow-500 text-slate-950 shadow-sm' : 'bg-yellow-950/40 text-yellow-300 hover:bg-yellow-900/50 border border-yellow-500/30'
            }`}
          >
            <span>🟡 {isAr ? 'متوسط' : 'Moderate'}</span>
          </button>
        </div>
      </div>

      {/* Broadcast Success Receipt Toast */}
      {lastAlertReceipt && (
        <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 border border-emerald-500/60 shadow-xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div className="truncate font-mono">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-xs">{isAr ? 'تم إرسال الإنذار الميداني بنجاح' : 'Field Alert Dispatched'}</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-900 text-emerald-200 border border-emerald-500/40">
                  {lastAlertReceipt.civilProtectionCode}
                </span>
              </div>
              <div className="text-[10px] text-slate-300 truncate mt-0.5">
                {isAr ? 'إشعار فوري للرتل المتنقل للحماية المدنية بقطاع ميلة وسد بني هارون' : `Alert dispatched to DGPC Mila units for ${lastAlertReceipt.hotspotName}`}
              </div>
            </div>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 font-bold px-2 py-1 rounded bg-emerald-950 border border-emerald-500/40 shrink-0">
            {lastAlertReceipt.alertId}
          </span>
        </div>
      )}

      {/* 2. Hotspots Cards Grid */}
      <div className="space-y-3">
        {filteredHotspots.map((massif) => {
          const isExtreme = massif.riskTier === 'extreme';
          const isHigh = massif.riskTier === 'high';
          const isCorrelated = !!massif.correlatedPass;

          return (
            <div
              key={massif.id}
              className={`p-3.5 sm:p-4 rounded-2xl border transition-all shadow-md flex flex-col justify-between gap-3 ${
                isExtreme
                  ? 'bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-950 border-rose-500/60 ring-1 ring-rose-500/40'
                  : isHigh
                  ? 'bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-950 border-amber-500/50'
                  : 'bg-slate-950/70 border-slate-800'
              }`}
            >
              {/* Card Top: Title, Risk Badge, Location */}
              <div>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${isExtreme ? 'bg-rose-500 animate-ping' : isHigh ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                      <h4 className="font-bold text-white text-sm sm:text-base font-mono">
                        {isAr ? massif.nameAr : massif.name}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
                      <span>{isAr ? massif.communeAr : massif.commune}</span>
                      <span>•</span>
                      <span>{massif.coordinates.lat.toFixed(3)}°N, {massif.coordinates.lng.toFixed(3)}°E</span>
                      <span>•</span>
                      <span>{massif.elevationMeters}m ({massif.slopeDegrees}° {isAr ? 'انحدار' : 'slope'})</span>
                    </div>
                  </div>

                  {/* Risk Tier Badge */}
                  <div className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold border flex items-center gap-1.5 shadow-sm ${
                    isExtreme
                      ? 'bg-rose-950 text-rose-200 border-rose-500/70 animate-pulse'
                      : isHigh
                      ? 'bg-amber-950 text-amber-200 border-amber-500/60'
                      : 'bg-yellow-950 text-yellow-200 border-yellow-500/40'
                  }`}>
                    <Flame className="w-3.5 h-3.5" />
                    <span>{isAr ? massif.riskTierLabelAr : massif.riskTierLabelEn}</span>
                  </div>
                </div>

                {/* 4 FWI & Spectral Metric Boxes */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 font-mono">
                  {/* Metric 1: Fire Weather Index (FWI) */}
                  <div className={`p-2 rounded-xl border flex flex-col justify-between ${
                    isExtreme ? 'bg-rose-950/30 border-rose-500/40' : 'bg-slate-900/80 border-slate-800'
                  }`}>
                    <span className="text-[10px] text-slate-400 block">{isAr ? 'مؤشر جو الحرائق (FWI)' : 'Fire Weather Index'}</span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className={`text-base font-bold ${isExtreme ? 'text-rose-400' : isHigh ? 'text-amber-400' : 'text-cyan-300'}`}>
                        {massif.fwiIndices.fwi}
                      </span>
                      <span className="text-[9px] text-slate-500">/ 68.0</span>
                    </div>
                  </div>

                  {/* Metric 2: Fine Fuel Moisture Code (FFMC) */}
                  <div className={`p-2 rounded-xl border flex flex-col justify-between ${
                    massif.fwiIndices.ffmc > 91 ? 'bg-rose-950/30 border-rose-500/40' : 'bg-slate-900/80 border-slate-800'
                  }`}>
                    <span className="text-[10px] text-slate-400 block">{isAr ? 'رطوبة الوقود السطحي (FFMC)' : 'Fine Fuel Moisture'}</span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-base font-bold text-white">{massif.fwiIndices.ffmc}</span>
                      <span className={`text-[9px] ${massif.fwiIndices.ffmc > 91 ? 'text-rose-400 font-bold' : 'text-slate-500'}`}>
                        {massif.fwiIndices.ffmc > 91 ? (isAr ? 'حرج > 91' : 'Crit') : ''}
                      </span>
                    </div>
                  </div>

                  {/* Metric 3: ALSAT Spectral NDVI & Foliar Moisture (FMC) */}
                  <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
                    <span className="text-[10px] text-slate-400 block">{isAr ? 'مؤشر NDVI والرطوبة الورقية' : 'ALSAT NDVI / FMC'}</span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-base font-bold text-emerald-400">{massif.currentNdvi.toFixed(2)}</span>
                      <span className="text-[9px] text-slate-400">({massif.fwiIndices.fmcPercent}% FMC)</span>
                    </div>
                  </div>

                  {/* Metric 4: Ambient Weather & Sirocco */}
                  <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
                    <span className="text-[10px] text-slate-400 block">{isAr ? 'الحرارة والرياح (شهيلي)' : 'Temp / Sirocco Wind'}</span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-base font-bold text-amber-300">{massif.weather.tempC}°C</span>
                      <span className="text-[9px] text-slate-400">/{massif.weather.windSpeedKmH} km/h</span>
                    </div>
                  </div>
                </div>

                {/* Threatened Assets List */}
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                  <span className="text-slate-400">{isAr ? 'الأهداف المهددة بالخطر:' : 'Threatened Assets:'}</span>
                  {(isAr ? massif.threatenedAssetsAr : massif.threatenedAssets).map((asset, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md bg-slate-800/90 text-slate-300 border border-slate-700/80">
                      {asset}
                    </span>
                  ))}
                </div>

                {/* Tactical Recommendation Directive */}
                <div className="mt-2 p-2 rounded-xl bg-slate-900/90 border border-slate-800/80 text-[11px] text-slate-300 flex items-start gap-2">
                  <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-200">{isAr ? 'التوجيه الميداني:' : 'Tactical Directive:'} </span>
                    <span>{isAr ? massif.recommendedActionAr : massif.recommendedActionEn}</span>
                  </div>
                </div>

                {/* 3. Pass Correlation Card (ربط الإنذار بجدول العبور القادم) */}
                {isCorrelated && massif.correlatedPass && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-gradient-to-r from-emerald-950/40 via-cyan-950/30 to-slate-900 border border-emerald-500/40 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
                        <Satellite className="w-4 h-4 animate-pulse" />
                      </div>
                      <div className="font-mono truncate">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-emerald-300 text-xs">
                            {isAr ? 'أول مرور مداري قادم للاستشعار عالي الدقة:' : 'Next High-Resolution Sensor Revisit:'}
                          </span>
                          <span className="text-[10px] font-bold text-white px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-500/50">
                            {massif.correlatedPass.satelliteId}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-300 mt-0.5 truncate">
                          {isAr ? 'حساس' : 'Sensor'}: {massif.correlatedPass.sensorResolution} • {isAr ? 'عرض المسار' : 'Swath'}: {massif.correlatedPass.swathWidthKm}km • {isAr ? 'زاوية الارتفاع' : 'Elevation'}: {massif.correlatedPass.maxElevationAngle}°
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 font-mono shrink-0">
                      <div className="text-right">
                        <span className="text-[9px] text-slate-400 block">{isAr ? 'الوقت المتبقي للعبور' : 'Countdown to Pass'}</span>
                        <span className="text-xs font-bold text-emerald-400">
                          ⏱️ {getPassTimeRemaining(massif.correlatedPass.nextPassTime)}
                        </span>
                      </div>

                      {onSelectSatellite && (
                        <button
                          onClick={() => onSelectSatellite(massif.correlatedPass!.satelliteId)}
                          className="px-2 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold transition cursor-pointer"
                          title={isAr ? 'تتبع القمر في المدار' : 'Track Satellite'}
                        >
                          {isAr ? 'تتبع' : 'Track'}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer Action Buttons */}
              <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>{isAr ? 'تم التقييم اللحظي عبر الذكاء الاصطناعي و' : 'Realtime AI Evaluation & ALSAT Pass'}</span>
                </div>

                <div className="flex items-center gap-2">
                  {onSimulatePropagation && (
                    <button
                      onClick={() => onSimulatePropagation(massif)}
                      className="px-2.5 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-500/50 font-mono text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                      title={isAr ? 'محاكاة ديناميكية لانتشار الحريق في هذه البؤرة' : 'Simulate fire propagation for this massif'}
                    >
                      <Flame className="w-3.5 h-3.5 text-rose-400" />
                      <span>{isAr ? 'محاكاة الانتشار' : 'Propagation'}</span>
                    </button>
                  )}

                  {onFocusCoordinates && (
                    <button
                      onClick={() => onFocusCoordinates(massif.coordinates.lat, massif.coordinates.lng)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-mono text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{isAr ? 'تركيز الخريطة' : 'Focus Map'}</span>
                    </button>
                  )}

                  {/* Broadcast Tactical Field Alert Button */}
                  <button
                    onClick={() => handleBroadcastAlert(massif)}
                    disabled={alertingId === massif.id}
                    className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md disabled:opacity-50 ${
                      isExtreme
                        ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/50'
                        : isHigh
                        ? 'bg-amber-600 hover:bg-amber-500 text-slate-950'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                    <span>
                      {alertingId === massif.id
                        ? (isAr ? 'جاري الإرسال...' : 'Broadcasting...')
                        : (isAr ? 'إرسال إنذار ميداني للفرق' : 'Broadcast Field Alert')}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
