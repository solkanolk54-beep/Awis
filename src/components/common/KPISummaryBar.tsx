import React, { useState, useMemo } from 'react';
import { 
  Flame, 
  Trees, 
  Truck, 
  Clock, 
  AlertTriangle, 
  Wind, 
  ShieldAlert, 
  Activity,
  TrendingUp,
  TrendingDown,
  Sparkles,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  RadioTower,
  Gauge,
  WifiOff,
  HardDrive
} from 'lucide-react';
import { WildfireIncident, ForestZone, EmergencyResource, Language } from '../../types';
import { translations } from '../../i18n/translations';
import { MiniSparkline } from './MiniSparkline';
import { LiveWeatherData } from '../../services/liveWeatherService';
import { UserLivePosition } from '../../services/liveGeolocationService';
import { OfflineCacheStats } from '../../services/offlineCacheService';
import { 
  get24HourFireRiskTrend, 
  get24HourActiveFiresTrend, 
  get24HourForestZonesTrend, 
  get24HourFleetMobilizationTrend 
} from '../../data/kpiTrendData';

interface KPISummaryBarProps {
  incidents: WildfireIncident[];
  forests: ForestZone[];
  resources: EmergencyResource[];
  currentLang: Language;
  liveWeather?: LiveWeatherData | null;
  isWeatherLoading?: boolean;
  onRefreshWeather?: () => void;
  userPosition?: UserLivePosition | null;
  isOnline?: boolean;
  isSimulatedOffline?: boolean;
  onOpenOfflineManager?: () => void;
  offlineStats?: OfflineCacheStats | null;
}

export const KPISummaryBar: React.FC<KPISummaryBarProps> = ({
  incidents,
  forests,
  resources,
  currentLang,
  liveWeather,
  isWeatherLoading = false,
  onRefreshWeather,
  userPosition,
  isOnline = true,
  isSimulatedOffline = false,
  onOpenOfflineManager,
  offlineStats
}) => {
  const t = translations[currentLang];

  // Operational scenario for command staff testing: 'accelerating' (active Sirocco) or 'subsiding'
  const [scenario, setScenario] = useState<'accelerating' | 'subsiding'>('accelerating');
  const [showExpandedTrajectory, setShowExpandedTrajectory] = useState<boolean>(false);

  // Compute live 24-hour trend profiles
  const fireRiskTrend = useMemo(() => get24HourFireRiskTrend(scenario), [scenario]);
  const activeFiresTrend = useMemo(() => get24HourActiveFiresTrend(scenario), [scenario]);
  const forestZonesTrend = useMemo(() => get24HourForestZonesTrend(scenario), [scenario]);
  const fleetTrend = useMemo(() => get24HourFleetMobilizationTrend(scenario), [scenario]);

  const activeCount = scenario === 'accelerating'
    ? incidents.filter((i) => i.status !== 'extinguished').length
    : Math.max(1, Math.round(incidents.filter((i) => i.status !== 'extinguished').length / 2));

  const criticalCount = scenario === 'accelerating'
    ? incidents.filter((i) => i.riskLevel === 'critical' || i.riskLevel === 'extreme').length
    : 0;

  const highRiskForests = scenario === 'accelerating'
    ? forests.filter((f) => f.currentRiskScore > 70).length
    : 1;

  const deployedResources = scenario === 'accelerating'
    ? resources.filter((r) => r.status === 'deployed' || r.status === 'en_route').length
    : Math.max(1, Math.round(resources.length * 0.3));

  const isAccelerating = fireRiskTrend.status === 'accelerating';

  return (
    <div 
      id="kpi-summary-container"
      className="w-full space-y-2.5"
      dir={currentLang === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Tactical Offline Forest Operations Advisory Banner */}
      {(!isOnline || isSimulatedOffline) && (
        <div className="w-full bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950/80 border-2 border-amber-500/80 rounded-xl px-3.5 py-2 flex flex-wrap items-center justify-between text-xs shadow-2xl gap-2 animate-in fade-in duration-300">
          <div className="flex items-center gap-2.5 overflow-hidden flex-1 min-w-[280px]">
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-amber-500 text-black font-extrabold text-[10px] tracking-wider uppercase shrink-0 animate-pulse">
              <WifiOff className="w-3.5 h-3.5 text-black" />
              {currentLang === 'ar' ? 'وضع الغابات المنعزلة (أوفلاين نشط)' : 'OFFLINE FOREST MODE ACTIVE'}
            </span>
            <span className="text-amber-200 font-medium text-[11px] truncate">
              {currentLang === 'ar'
                ? 'تم فقدان الاتصال بالإنترنت في هذا القطاع. نظام الخرائط التفاعلي يعمل بكامل معالمه من الذاكرة المحلية (LocalStorage & ServiceWorker Cache).'
                : 'No internet connection detected. GIS spatial layers, fire perimeters & water points are operating from Local Cache.'}
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px] text-amber-300 shrink-0">
            <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-emerald-300">
              {offlineStats?.incidentsCount ?? incidents.length} Hotspots Cached
            </span>
            {onOpenOfflineManager && (
              <button
                onClick={onOpenOfflineManager}
                className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 text-[11px] font-bold transition cursor-pointer"
              >
                {currentLang === 'ar' ? 'إدارة التخزين' : 'Manage Cache'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Real-Time Meteorological & Civil Protection Advisory Banner */}
      <div className="w-full bg-gradient-to-r from-red-950 via-amber-950/80 to-slate-900 border border-red-800/60 rounded-xl px-3.5 py-1.5 flex flex-wrap items-center justify-between text-xs shadow-lg gap-2">
        <div className="flex items-center gap-2.5 overflow-hidden flex-1 min-w-[280px]">
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-600 text-white font-extrabold text-[10px] tracking-wider uppercase shrink-0 animate-pulse">
            <AlertTriangle className="w-3 h-3" />
            {liveWeather?.isRealTime ? 'MÉTÉO DIRECTE (LIVE API)' : 'MÉTÉO-DZ SIROCCO ALERT'}
          </span>
          <span className="text-slate-200 font-medium truncate text-[11px]">
            {currentLang === 'ar'
              ? (liveWeather?.isRealTime
                  ? `بيانات الأرصاد الجوية اللحظية الحقيقية (Open-Meteo): رياح بسرعة ${liveWeather.windSpeedKmH} كم/سا باتجاه ${liveWeather.windDirectionCardinal}، حرارة ${liveWeather.temperatureC}°C ورطوبة ${liveWeather.humidityPercent}%. مؤشر FWI: ${liveWeather.fwiScore}/100.`
                  : 'إنذار جوي برتقالي: موجة حر شديدة ورياح جنوبية جافة (الشهيلي) بسرعة تتجاوز 45 كم/سا عبر ولايات تيزي وزو، بجاية، جيجل، سكيكدة والطارف. مؤشر الجفاف في مستوى حرج.')
              : (liveWeather?.isRealTime
                  ? `Live Open-Meteo Station Telemetry: Wind ${liveWeather.windSpeedKmH} km/h ${liveWeather.windDirectionCardinal}, Temp ${liveWeather.temperatureC}°C, Humidity ${liveWeather.humidityPercent}%. FWI: ${liveWeather.fwiScore}/100.`
                  : 'CRITICAL WEATHER ADVISORY: Severe southerly Sirocco heatwave with gusts exceeding 45 km/h across Tizi Ouzou, Béjaïa, Jijel, Skikda & El Tarf. Fuel moisture < 12%.')}
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px] text-amber-300 shrink-0">
          <Wind className="w-3.5 h-3.5 text-sky-400" />
          <span>{liveWeather?.windSpeedKmH ?? 42} km/h {liveWeather?.windDirectionCardinal ?? 'NE'}</span>
          <span className="text-slate-600">|</span>
          <span className="text-red-400 font-bold">{liveWeather?.temperatureC ?? 40.5}°C / {liveWeather?.humidityPercent ?? 18}% RH</span>
          {onRefreshWeather && (
            <button
              onClick={onRefreshWeather}
              disabled={isWeatherLoading}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              title={currentLang === 'ar' ? 'تحديث بيانات الطقس الحية الآن' : 'Refresh live weather now'}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isWeatherLoading ? 'animate-spin text-amber-400' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* 24-Hour National Wildfire Risk Velocity & Trend Summary Ribbon */}
      <div className={`w-full rounded-2xl border px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md transition-all duration-300 ${
        isAccelerating
          ? 'bg-gradient-to-r from-rose-950/40 via-amber-950/30 to-slate-900 border-rose-600/40'
          : 'bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-slate-900 border-emerald-600/40'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl flex items-center justify-center shrink-0 border ${
            isAccelerating
              ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
              : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
          }`}>
            {isAccelerating ? (
              <TrendingUp className="w-5 h-5 animate-bounce" />
            ) : (
              <TrendingDown className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                {t.nationalFireRiskIndex}
              </span>
              {/* Prominent Acceleration / Subsiding Pill */}
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black font-mono flex items-center gap-1.5 border shadow-sm ${
                isAccelerating
                  ? 'bg-rose-600 text-white border-rose-400 animate-pulse'
                  : 'bg-emerald-600 text-white border-emerald-400'
              }`}>
                {isAccelerating ? '▲ ' : '▼ '}
                {currentLang === 'ar' 
                  ? fireRiskTrend.statusLabelAr 
                  : currentLang === 'fr' 
                  ? fireRiskTrend.statusLabelFr 
                  : fireRiskTrend.statusLabelEn}
              </span>

              <span className="text-[11px] font-mono text-slate-300 px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700">
                {t.trendPeak}: <strong className="text-amber-300">{fireRiskTrend.peakValue}/100</strong> ({fireRiskTrend.peakHour})
              </span>

              <span className="text-[11px] font-mono text-slate-400 px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700 hidden md:inline-block">
                {t.trendLow}: <strong className="text-slate-300">{fireRiskTrend.lowValue}/100</strong> ({fireRiskTrend.lowHour})
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 line-clamp-1">
              {currentLang === 'ar' 
                ? fireRiskTrend.statusReasonAr 
                : currentLang === 'fr' 
                ? fireRiskTrend.statusReasonFr 
                : fireRiskTrend.statusReasonEn}
            </p>
          </div>
        </div>

        {/* Command Staff Drill & Scenario Simulator Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <div className="flex items-center rounded-xl bg-slate-900 border border-slate-700 p-0.5 text-[11px] font-mono">
            <button
              onClick={() => setScenario('accelerating')}
              className={`px-2.5 py-1 rounded-lg transition font-bold flex items-center gap-1 cursor-pointer ${
                scenario === 'accelerating'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="View live accelerating fire risk conditions under Sirocco winds"
            >
              <TrendingUp className="w-3 h-3" />
              <span>{currentLang === 'ar' ? 'تصاعد (الشهيلي)' : 'Accelerating'}</span>
            </button>
            <button
              onClick={() => setScenario('subsiding')}
              className={`px-2.5 py-1 rounded-lg transition font-bold flex items-center gap-1 cursor-pointer ${
                scenario === 'subsiding'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Simulate subsiding risk trend under nighttime humidity or marine cooling"
            >
              <TrendingDown className="w-3 h-3" />
              <span>{currentLang === 'ar' ? 'انحسار (ليلي/بحري)' : 'Subsiding'}</span>
            </button>
          </div>

          <button
            onClick={() => setShowExpandedTrajectory(!showExpandedTrajectory)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer border border-slate-700"
            title={showExpandedTrajectory ? 'Collapse 24h curve' : 'Expand 24h curve'}
          >
            {showExpandedTrajectory ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded 24-Hour Fire-Risk Trajectory Inspector (Optional Collapsible View) */}
      {showExpandedTrajectory && (
        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 shadow-xl space-y-2.5 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-300 border-b border-slate-800/80 pb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400" />
              <span className="font-bold uppercase tracking-wider font-mono">
                {currentLang === 'ar' ? 'التحليل التفصيلي لمؤشر الخطر الوطني (24 ساعة)' : 'National Wildfire Risk Trajectory (24-Hour Hourly Curve)'}
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-400 flex items-center gap-3">
              <span>T-24h (Yesterday 08:00)</span>
              <span>→</span>
              <span className="text-white font-bold">Current Hour (Now)</span>
            </div>
          </div>

          {/* Full-width 24h Fire Risk Sparkline with Hourly Scrubber */}
          <div className="pt-1 pb-1">
            <MiniSparkline
              data={fireRiskTrend.history}
              height={56}
              trend={fireRiskTrend.status}
              strokeColor={isAccelerating ? '#f43f5e' : '#10b981'}
              fillColor={isAccelerating ? '#e11d48' : '#059669'}
              unit="pts"
              interactive={true}
              id="expanded-24h-fire-risk-sparkline"
            />
          </div>

          {/* Hourly Timeline Axis Milestones */}
          <div className="flex justify-between text-[10px] font-mono text-slate-400 px-1 pt-1 border-t border-slate-800/60">
            <span>08:00 (-24h)</span>
            <span>12:00</span>
            <span className="text-amber-400 font-bold">16:00 (Peak Sirocco)</span>
            <span>20:00</span>
            <span>00:00</span>
            <span className="text-cyan-400">04:00 (Night Low)</span>
            <span>07:00</span>
            <span className="text-rose-400 font-bold">Now ({fireRiskTrend.currentValue} pts)</span>
          </div>
        </div>
      )}

      {/* KPI Cards Grid with Embedded 24-Hour Sparklines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1: Active Incidents with 24h Outbreak Trend */}
        <div 
          id="kpi-card-active-incidents"
          className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between shadow-lg hover:border-slate-700 transition"
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                {t.activeFires}
              </div>
              <div className="p-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30">
                <Flame className="w-4 h-4 animate-pulse" />
              </div>
            </div>

            {/* Big Metric Display */}
            <div className="text-2xl font-black text-white mt-1 font-mono flex items-baseline gap-2">
              <span>{activeCount}</span>
              {criticalCount > 0 ? (
                <span className="text-xs text-red-400 font-sans font-bold">
                  ({criticalCount} Critical)
                </span>
              ) : (
                <span className="text-xs text-emerald-400 font-sans font-bold">
                  ({currentLang === 'ar' ? 'تحت السيطرة' : 'Controlled'})
                </span>
              )}
            </div>

            {/* Subtitle */}
            <div className="text-[10px] text-slate-400 mt-0.5">
              {currentLang === 'ar' ? 'عبر 3 ولايات ساحلية' : 'Across 3 Maritime Wilayas'}
            </div>
          </div>

          {/* 24-Hour Sparkline & Trend Badge */}
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" />
                24h Trend
              </span>
              <span className={`font-bold flex items-center gap-0.5 ${
                activeFiresTrend.status === 'accelerating' ? 'text-rose-400' : 'text-emerald-400'
              }`}>
                {activeFiresTrend.status === 'accelerating' ? '▲' : '▼'} {activeFiresTrend.statusLabelEn}
              </span>
            </div>

            <div className="h-9 w-full">
              <MiniSparkline
                data={activeFiresTrend.history}
                height={36}
                trend={activeFiresTrend.status}
                strokeColor={activeFiresTrend.status === 'accelerating' ? '#f43f5e' : '#10b981'}
                fillColor={activeFiresTrend.status === 'accelerating' ? '#e11d48' : '#059669'}
                unit="fires"
                interactive={true}
                id="sparkline-active-incidents"
              />
            </div>
          </div>
        </div>

        {/* Metric 2: National Wildfire Risk Index (PRIMARY SPARKLINE COMPONENT) */}
        <div 
          id="kpi-card-national-risk-index"
          className={`bg-slate-900/90 backdrop-blur-md border rounded-2xl p-3.5 flex flex-col justify-between shadow-lg transition ${
            isAccelerating
              ? 'border-rose-500/40 shadow-rose-950/20 ring-1 ring-rose-500/20'
              : 'border-emerald-500/40 shadow-emerald-950/20 ring-1 ring-emerald-500/20'
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span>{currentLang === 'ar' ? 'المؤشر الوطني للخطر' : 'National Fire Risk'}</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-slate-800 text-amber-400 border border-slate-700">
                  24H INDEX
                </span>
              </div>
              <div className={`p-2 rounded-xl border ${
                isAccelerating
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              }`}>
                {isAccelerating ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              </div>
            </div>

            {/* Big Risk Score Display */}
            <div className="text-2xl font-black mt-1 font-mono flex items-baseline gap-2">
              <span className={isAccelerating ? 'text-rose-400' : 'text-emerald-400'}>
                {fireRiskTrend.currentValue}
              </span>
              <span className="text-xs text-slate-400 font-sans">
                / 100 ({isAccelerating ? 'Critical' : 'Moderate'})
              </span>
            </div>

            {/* Subtitle */}
            <div className="text-[10px] text-slate-400 mt-0.5 flex items-center justify-between">
              <span>{isAccelerating ? 'Sirocco wind surge' : 'Humidity recovery'}</span>
              <span className="font-mono text-slate-500">
                Δ {fireRiskTrend.delta24h > 0 ? `+${fireRiskTrend.delta24h}` : fireRiskTrend.delta24h} pts
              </span>
            </div>
          </div>

          {/* 24-Hour Sparkline & Prominent Accelerating/Subsiding Badge */}
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" />
                24h Trajectory
              </span>
              <span className={`px-2 py-0.5 rounded font-black text-[10px] tracking-wide flex items-center gap-1 ${
                isAccelerating
                  ? 'bg-rose-950 text-rose-300 border border-rose-600/60'
                  : 'bg-emerald-950 text-emerald-300 border border-emerald-600/60'
              }`}>
                {isAccelerating ? '▲ ' : '▼ '}
                {isAccelerating
                  ? (currentLang === 'ar' ? 'خطر متسارع' : 'ACCELERATING')
                  : (currentLang === 'ar' ? 'خطر متراجع' : 'SUBSIDING')}
              </span>
            </div>

            <div className="h-9 w-full">
              <MiniSparkline
                data={fireRiskTrend.history}
                height={36}
                trend={fireRiskTrend.status}
                strokeColor={isAccelerating ? '#f43f5e' : '#10b981'}
                fillColor={isAccelerating ? '#e11d48' : '#059669'}
                unit="pts"
                interactive={true}
                id="sparkline-national-fire-risk"
              />
            </div>
          </div>
        </div>

        {/* Metric 3: Forest Massifs Under High Risk */}
        <div 
          id="kpi-card-forest-massifs"
          className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between shadow-lg hover:border-slate-700 transition"
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                {t.highRiskZones}
              </div>
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Trees className="w-4 h-4" />
              </div>
            </div>

            {/* Big Metric Display */}
            <div className="text-2xl font-black text-amber-300 mt-1 font-mono flex items-baseline gap-2">
              <span>{highRiskForests}</span>
              <span className="text-xs text-slate-400 font-sans">
                / {forests.length} Zones
              </span>
            </div>

            {/* Subtitle */}
            <div className="text-[10px] text-amber-400 mt-0.5">
              {currentLang === 'ar' ? 'نقص رطوبة المادة القابلة للاشتعال' : 'Fuel Moisture Deficit Flagged'}
            </div>
          </div>

          {/* 24-Hour Sparkline & Trend Badge */}
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" />
                24h Danger Zones
              </span>
              <span className={`font-bold flex items-center gap-0.5 ${
                forestZonesTrend.status === 'accelerating' ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {forestZonesTrend.status === 'accelerating' ? '▲' : '▼'} {forestZonesTrend.statusLabelEn}
              </span>
            </div>

            <div className="h-9 w-full">
              <MiniSparkline
                data={forestZonesTrend.history}
                height={36}
                trend={forestZonesTrend.status}
                strokeColor={forestZonesTrend.status === 'accelerating' ? '#f59e0b' : '#10b981'}
                fillColor={forestZonesTrend.status === 'accelerating' ? '#d97706' : '#059669'}
                unit="zones"
                interactive={true}
                id="sparkline-forest-massifs"
              />
            </div>
          </div>
        </div>

        {/* Metric 4: Emergency Resource Fleet & Response */}
        <div 
          id="kpi-card-fleet-mobilization"
          className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between shadow-lg hover:border-slate-700 transition"
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                {t.activeResources}
              </div>
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Truck className="w-4 h-4" />
              </div>
            </div>

            {/* Big Metric Display */}
            <div className="text-2xl font-black text-emerald-300 mt-1 font-mono flex items-baseline gap-2">
              <span>{deployedResources}</span>
              <span className="text-xs text-slate-400 font-sans">
                / {resources.length} Units
              </span>
            </div>

            {/* Subtitle */}
            <div className="text-[10px] text-slate-400 mt-0.5 truncate">
              {currentLang === 'ar' ? '1 Beriev Be-200 + 4 صهاريج + 2 درون' : '1 Beriev Be-200 + 4 Tankers + 2 Drones'}
            </div>
          </div>

          {/* 24-Hour Sparkline & Trend Badge */}
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" />
                24h Task Force
              </span>
              <span className={`font-bold flex items-center gap-0.5 ${
                fleetTrend.status === 'accelerating' ? 'text-cyan-400' : 'text-slate-400'
              }`}>
                {fleetTrend.status === 'accelerating' ? '▲' : '▼'} {fleetTrend.statusLabelEn}
              </span>
            </div>

            <div className="h-9 w-full">
              <MiniSparkline
                data={fleetTrend.history}
                height={36}
                trend={fleetTrend.status}
                strokeColor="#06b6d4"
                fillColor="#0891b2"
                unit="units"
                interactive={true}
                id="sparkline-fleet-mobilization"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
