import React, { useState, useMemo, useEffect } from 'react';
import { 
  Flame, 
  Trees, 
  Truck, 
  Clock, 
  AlertTriangle, 
  Wind, 
  ShieldAlert, 
  ShieldCheck,
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
  HardDrive,
  HeartPulse,
  Eye,
  AlertOctagon,
  Compass
} from 'lucide-react';
import { WildfireIncident, ForestZone, EmergencyResource, Language, RiskLevel } from '../../types';
import { translations } from '../../i18n/translations';
import { MiniSparkline } from './MiniSparkline';
import { LiveWeatherData } from '../../services/liveWeatherService';
import { UserLivePosition } from '../../services/liveGeolocationService';
import { OfflineCacheStats } from '../../services/offlineCacheService';
import { 
  fetchLiveAirQuality, 
  AirQualityData 
} from '../../services/airQualityService';
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
  selectedIncident?: WildfireIncident | null;
  isCollapsible?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
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
  offlineStats,
  selectedIncident,
  isCollapsible = true,
  isCollapsed = false,
  onToggleCollapse
}) => {
  const t = translations[currentLang];

  // Operational scenario for command staff testing: 'accelerating' (active Sirocco) or 'subsiding'
  const [scenario, setScenario] = useState<'accelerating' | 'subsiding'>('accelerating');
  const [showExpandedTrajectory, setShowExpandedTrajectory] = useState<boolean>(false);

  // Real-Time Air Quality & Emergency Crew Smoke Inhalation State
  const [airQuality, setAirQuality] = useState<AirQualityData | null>(null);
  const [isAqiLoading, setIsAqiLoading] = useState<boolean>(false);
  const [showAqiDetail, setShowAqiDetail] = useState<boolean>(false);
  const [selectedAqiSectorId, setSelectedAqiSectorId] = useState<string>('active');

  // Compute live 24-hour trend profiles
  const fireRiskTrend = useMemo(() => get24HourFireRiskTrend(scenario), [scenario]);
  const activeFiresTrend = useMemo(() => get24HourActiveFiresTrend(scenario), [scenario]);
  const forestZonesTrend = useMemo(() => get24HourForestZonesTrend(scenario), [scenario]);
  const fleetTrend = useMemo(() => get24HourFleetMobilizationTrend(scenario), [scenario]);

  const activeIncident = selectedIncident || incidents.find((i) => i.status !== 'extinguished') || incidents[0];

  // Preset Wilaya Fire-Prone Hotspots for quick AQI analysis across Algeria's high-risk sectors
  const aqiPresets = useMemo(() => [
    {
      id: 'active',
      nameEn: activeIncident ? `Active: ${activeIncident.title}` : 'Active Incident Line',
      nameAr: activeIncident ? `النشط: ${activeIncident.titleAr}` : 'بؤرة الحريق النشطة',
      nameFr: activeIncident ? `Actif: ${activeIncident.title}` : 'Front Actif',
      lat: activeIncident?.coordinates.lat ?? 36.784,
      lng: activeIncident?.coordinates.lng ?? 5.719,
      risk: activeIncident?.riskLevel ?? ('critical' as RiskLevel),
      frp: activeIncident?.confidenceScore ? Math.round(activeIncident.confidenceScore * 0.9) : 55
    },
    {
      id: 'tizi_ouzou',
      nameEn: 'Tizi Ouzou (Yakouren Massif)',
      nameAr: 'تيزي وزو (كتلة يعكورن الغابية)',
      nameFr: 'Tizi Ouzou (Massif de Yakouren)',
      lat: 36.73,
      lng: 4.41,
      risk: 'critical' as RiskLevel,
      frp: 70
    },
    {
      id: 'bejaia',
      nameEn: 'Béjaïa (Akfadou / Gouraya)',
      nameAr: 'بجاية (أكفادو / قورايا)',
      nameFr: 'Béjaïa (Akfadou / Gouraya)',
      lat: 36.75,
      lng: 5.05,
      risk: 'extreme' as RiskLevel,
      frp: 65
    },
    {
      id: 'jijel',
      nameEn: 'Jijel (Guerrouche / Texanna)',
      nameAr: 'جيجل (غابة قرّوش / تاكسنة)',
      nameFr: 'Jijel (Guerrouche / Texanna)',
      lat: 36.80,
      lng: 5.76,
      risk: 'high' as RiskLevel,
      frp: 48
    },
    {
      id: 'el_tarf',
      nameEn: 'El Tarf (El Kala Reserve)',
      nameAr: 'الطارف (محمية القالة الوطنية)',
      nameFr: 'El Tarf (Parc National d\'El Kala)',
      lat: 36.89,
      lng: 8.44,
      risk: 'high' as RiskLevel,
      frp: 40
    },
    {
      id: 'blida',
      nameEn: 'Blida (Chréa Cedar Forest)',
      nameAr: 'البليدة (غابة أرز الشريعة)',
      nameFr: 'Blida (Cèdres de Chréa)',
      lat: 36.42,
      lng: 2.88,
      risk: 'moderate' as RiskLevel,
      frp: 25
    }
  ], [activeIncident]);

  // Load Air Quality Telemetry via Secondary Service
  const loadAirQualityData = async (presetId = selectedAqiSectorId) => {
    setIsAqiLoading(true);
    try {
      const preset = aqiPresets.find((p) => p.id === presetId) || aqiPresets[0];
      const locName = currentLang === 'ar' ? preset.nameAr : currentLang === 'fr' ? preset.nameFr : preset.nameEn;
      
      const data = await fetchLiveAirQuality(preset.lat, preset.lng, {
        locationName: locName,
        incidentRisk: preset.risk,
        fireFrpMw: preset.frp,
        incidentStatus: preset.id === 'active' ? activeIncident?.status : 'active'
      });
      setAirQuality(data);
    } catch (err) {
      console.warn('Failed to load live air quality telemetry:', err);
    } finally {
      setIsAqiLoading(false);
    }
  };

  useEffect(() => {
    loadAirQualityData(selectedAqiSectorId);
  }, [selectedAqiSectorId, activeIncident?.id, isOnline]);

  const handleSelectSector = (sectorId: string) => {
    setSelectedAqiSectorId(sectorId);
    loadAirQualityData(sectorId);
  };

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
    ? resources.filter((r) => r.status === 'dispatched' || r.status === 'on_scene' || r.status === 'en_route').length
    : Math.max(1, Math.round(resources.length * 0.3));

  const isAccelerating = fireRiskTrend.status === 'accelerating';

  // Compact Minimal Collapsed Bar (Allows full GIS Map visibility)
  if (isCollapsed) {
    return (
      <div 
        id="kpi-summary-collapsed"
        className="w-full bg-slate-900/95 border border-slate-800 rounded-xl px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs shadow-md transition-all duration-200"
        dir={currentLang === 'ar' ? 'rtl' : 'ltr'}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-white font-bold">
            <Flame className="w-4 h-4 text-red-500 animate-pulse" />
            <span>{currentLang === 'ar' ? 'حرائق نشطة:' : 'Active Fires:'}</span>
            <span className="font-mono text-red-400 font-bold">{activeCount}</span>
            {criticalCount > 0 && (
              <span className="text-[10px] text-red-300 font-sans font-bold">({criticalCount} {currentLang === 'ar' ? 'حرجة' : 'Critical'})</span>
            )}
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="text-slate-400">{currentLang === 'ar' ? 'مؤشر الخطر:' : 'Risk Index:'}</span>
            <span className={`font-mono font-bold ${isAccelerating ? 'text-rose-400' : 'text-emerald-400'}`}>
              {fireRiskTrend.currentValue}/100
            </span>
          </div>
          <span className="text-slate-700 hidden sm:inline">|</span>
          <div className="hidden sm:flex items-center gap-1.5 text-slate-300">
            <Trees className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400">{currentLang === 'ar' ? 'غابات مهددة:' : 'Danger Zones:'}</span>
            <span className="font-mono font-bold text-amber-300">{highRiskForests}/{forests.length}</span>
          </div>
          <span className="text-slate-700 hidden md:inline">|</span>
          <div className="hidden md:flex items-center gap-1.5 text-slate-300">
            <Truck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">{currentLang === 'ar' ? 'الوحدات الميدانية:' : 'Fleet:'}</span>
            <span className="font-mono font-bold text-emerald-300">{deployedResources}/{resources.length}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Weather compact badge */}
          <div className="hidden lg:flex items-center gap-1.5 font-mono text-[11px] text-slate-300 bg-slate-950/70 px-2 py-0.5 rounded border border-slate-800">
            <Wind className="w-3 h-3 text-sky-400" />
            <span>{liveWeather?.windSpeedKmH ?? 42} km/h {liveWeather?.windDirectionCardinal ?? 'NE'}</span>
            <span className="text-red-400 font-bold ml-1">{liveWeather?.temperatureC ?? 40.5}°C</span>
          </div>

          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold transition cursor-pointer"
              title={currentLang === 'ar' ? 'توسيع لوحة المؤشرات الكاملة' : 'Expand full KPI dashboard'}
            >
              <span>{currentLang === 'ar' ? 'عرض المؤشرات الكاملة' : 'Expand KPI Panel'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
            </button>
          )}
        </div>
      </div>
    );
  }

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
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[11px] font-medium transition cursor-pointer ml-1"
              title={currentLang === 'ar' ? 'طي لوحة المؤشرات لتوسيع مساحة الخريطة' : 'Collapse KPI panel to maximize map space'}
            >
              <ChevronUp className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">{currentLang === 'ar' ? 'طي' : 'Collapse'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Real-Time Air Quality Index (AQI) & Wildfire Smoke Inhalation Risk Ribbon */}
      <div 
        id="kpi-aqi-smoke-inhalation-banner"
        className={`w-full rounded-xl border px-3.5 py-2 flex flex-col gap-2.5 shadow-md transition-all duration-300 ${
          airQuality?.smokeAssessment.badgeBg ?? 'bg-slate-900/90'
        } ${
          airQuality?.smokeAssessment.badgeBorder ?? 'border-slate-800'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Left: Active Incident Region & AQI Status */}
          <div className="flex flex-wrap items-center gap-2.5 min-w-[280px]">
            {/* Real-Time Source Indicator */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800/90 border border-slate-700 text-[10px] font-bold text-slate-300">
              <span className={`w-2 h-2 rounded-full ${airQuality?.isRealTime ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span>{airQuality?.isRealTime ? 'OPEN-METEO AQI LIVE' : 'PLUME TELEMETRY MODEL'}</span>
            </div>

            {/* US AQI Metric Badge */}
            <div 
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border font-mono font-bold text-xs"
              style={{
                borderColor: airQuality?.smokeAssessment.color ?? '#f59e0b',
                backgroundColor: `${airQuality?.smokeAssessment.color ?? '#f59e0b'}20`,
                color: airQuality?.smokeAssessment.color ?? '#f59e0b'
              }}
            >
              <HeartPulse className="w-3.5 h-3.5 animate-pulse" />
              <span>AQI {airQuality?.usAqi ?? 145}</span>
              <span className="text-[11px] font-sans font-semibold">
                • {currentLang === 'ar' 
                    ? airQuality?.smokeAssessment.labelAr 
                    : currentLang === 'fr' 
                      ? airQuality?.smokeAssessment.labelFr 
                      : airQuality?.smokeAssessment.labelEn}
              </span>
            </div>

            {/* Monitored Incident Sector */}
            <span className="text-slate-300 font-medium text-[11px] flex items-center gap-1 truncate">
              <Compass className="w-3 h-3 text-sky-400 shrink-0" />
              <span className="text-slate-400">{currentLang === 'ar' ? 'القطاع الميداني:' : 'Incident Sector:'}</span>
              <span className="text-white font-semibold">{airQuality?.locationName}</span>
              {airQuality?.firePlumeAdjusted && (
                <span className="px-1.5 py-0.2 rounded bg-red-950/80 text-red-400 text-[9px] font-bold border border-red-800/60 ml-1">
                  {currentLang === 'ar' ? 'تأثير مباشر لدخان النيران' : 'Direct Plume Impact'}
                </span>
              )}
            </span>
          </div>

          {/* Right: Particulate Metrics (PM2.5, PM10, CO) & Controls */}
          <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-slate-200 shrink-0">
            {/* PM2.5 (Fine Pulmonary Particulates) */}
            <div 
              className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-950/70 border border-slate-800"
              title={currentLang === 'ar' ? 'الجسيمات الدقيقة القابلة للاستنشاق الرئوي العميق (PM2.5)' : 'Fine Inhalable Particulate Matter (PM2.5)'}
            >
              <span className="text-slate-400 font-sans text-[10px]">PM2.5:</span>
              <span className="font-bold text-amber-300">{airQuality?.pm25 ?? 64.2}</span>
              <span className="text-[9px] text-slate-400">µg/m³</span>
            </div>

            {/* PM10 (Ash, Soot & Coarse Particulates) */}
            <div 
              className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-950/70 border border-slate-800"
              title={currentLang === 'ar' ? 'الرماد والسخام المعلق (PM10)' : 'Coarse Ash & Soot Particles (PM10)'}
            >
              <span className="text-slate-400 font-sans text-[10px]">PM10:</span>
              <span className="font-bold text-sky-300">{airQuality?.pm10 ?? 112.5}</span>
              <span className="text-[9px] text-slate-400">µg/m³</span>
            </div>

            {/* CO (Carbon Monoxide) */}
            <div 
              className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-950/70 border border-slate-800"
              title={currentLang === 'ar' ? 'غاز أول أكسيد الكربون الناتج عن احتراق الغابات (CO)' : 'Carbon Monoxide Concentration from Biomass Combustion (CO)'}
            >
              <span className="text-slate-400 font-sans text-[10px]">CO:</span>
              <span className={`font-bold ${(airQuality?.carbonMonoxidePpm ?? 0) > 15 ? 'text-rose-400 animate-pulse' : 'text-slate-200'}`}>
                {airQuality?.carbonMonoxidePpm ?? 8.4}
              </span>
              <span className="text-[9px] text-slate-400">ppm</span>
            </div>

            {/* Crew PPE Tactical Quick Pill */}
            <div 
              className="hidden lg:flex items-center gap-1 px-2.5 py-0.5 rounded-md border text-[10px] font-sans font-bold"
              style={{
                borderColor: airQuality?.smokeAssessment.color ?? '#f59e0b',
                color: airQuality?.smokeAssessment.textColor ?? 'text-amber-300',
                backgroundColor: 'rgba(0,0,0,0.4)'
              }}
            >
              <ShieldAlert className="w-3 h-3 shrink-0" />
              <span className="truncate max-w-[220px]">
                {currentLang === 'ar' 
                  ? airQuality?.smokeAssessment.recommendedPpeAr.split('.')[0] 
                  : currentLang === 'fr' 
                    ? airQuality?.smokeAssessment.recommendedPpeFr.split('.')[0] 
                    : airQuality?.smokeAssessment.recommendedPpeEn.split('.')[0]}
              </span>
            </div>

            {/* Toggle Full Smoke Protocol Inspector */}
            <button
              onClick={() => setShowAqiDetail(!showAqiDetail)}
              className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-[11px] font-sans font-medium transition cursor-pointer"
            >
              <Eye className="w-3 h-3 text-sky-400" />
              <span>{showAqiDetail ? (currentLang === 'ar' ? 'إخفاء البروتوكول' : 'Hide Protocol') : (currentLang === 'ar' ? 'بروتوكول السلامة والتنفس' : 'Smoke Safety Protocol')}</span>
              {showAqiDetail ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {/* Refresh Live AQI Telemetry */}
            <button
              onClick={() => loadAirQualityData(selectedAqiSectorId)}
              disabled={isAqiLoading}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              title={currentLang === 'ar' ? 'تحديث جودة الهواء الآن' : 'Refresh live air quality now'}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAqiLoading ? 'animate-spin text-sky-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Collapsible Deep-Dive: Emergency Crew Smoke Inhalation Risk Assessment & Health Protocol */}
        {showAqiDetail && airQuality && (
          <div className="mt-1 pt-3 border-t border-slate-800/80 space-y-3 animate-in fade-in duration-200">
            {/* Sector Quick Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-slate-400 font-medium">
                <Compass className="w-3.5 h-3.5 text-sky-400" />
                <span>{currentLang === 'ar' ? 'اختر قطاع الغابات لمراقبة جودة الهواء والدخان:' : 'Select Wildfire Sector for Air Quality & Smoke Telemetry:'}</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {aqiPresets.map((preset) => {
                  const isSelected = selectedAqiSectorId === preset.id;
                  const label = currentLang === 'ar' ? preset.nameAr : currentLang === 'fr' ? preset.nameFr : preset.nameEn;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => handleSelectSector(preset.id)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer border ${
                        isSelected 
                          ? 'bg-sky-600 text-white border-sky-400 shadow-sm' 
                          : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tactical Protocol Cards Grid (4 Columns) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {/* Card 1: Respiratory Protection (PPE) */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{currentLang === 'ar' ? 'معدات الوقاية التنفسية (PPE)' : 'Respiratory Protection (PPE)'}</span>
                </div>
                <p className="text-slate-200 text-xs leading-relaxed">
                  {currentLang === 'ar' 
                    ? airQuality.smokeAssessment.recommendedPpeAr 
                    : currentLang === 'fr' 
                      ? airQuality.smokeAssessment.recommendedPpeFr 
                      : airQuality.smokeAssessment.recommendedPpeEn}
                </p>
                <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-900 flex items-center justify-between">
                  <span>{currentLang === 'ar' ? 'المعيار: الحماية المدنية' : 'Standard: Protection Civile'}</span>
                  <span className="font-mono text-amber-300">PM2.5: {airQuality.pm25} µg/m³</span>
                </div>
              </div>

              {/* Card 2: Crew Exposure Limit & Shift Rotation */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between space-y-2">
                <div className="flex items-center gap-2 text-sky-400 font-bold text-xs">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>{currentLang === 'ar' ? 'أقصى مدة بقاء وتناوب الفرق' : 'Shift & Frontline Exposure'}</span>
                </div>
                <p className="text-slate-200 text-xs leading-relaxed">
                  {currentLang === 'ar' 
                    ? airQuality.smokeAssessment.maxCrewExposureAr 
                    : currentLang === 'fr' 
                      ? airQuality.smokeAssessment.maxCrewExposureFr 
                      : airQuality.smokeAssessment.maxCrewExposureEn}
                </p>
                <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-900 flex items-center justify-between">
                  <span>{currentLang === 'ar' ? 'حالة التناوب الإلزامي' : 'Crew Rotation Status'}</span>
                  <span className="font-bold text-sky-300">
                    {airQuality.usAqi > 200 ? (currentLang === 'ar' ? 'عاجل < 30 د' : 'Urgent < 30m') : (currentLang === 'ar' ? 'عادي 60-90 د' : 'Normal 60-90m')}
                  </span>
                </div>
              </div>

              {/* Card 3: Tactical Operations & Smoke Plume Advisory */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between space-y-2">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                  <Wind className="w-4 h-4 shrink-0" />
                  <span>{currentLang === 'ar' ? 'توجيهات العمليات وحركة الدخان' : 'Plume Behavior & Tactical Warning'}</span>
                </div>
                <p className="text-slate-200 text-xs leading-relaxed">
                  {currentLang === 'ar' 
                    ? airQuality.smokeAssessment.tacticalAdvisoryAr 
                    : currentLang === 'fr' 
                      ? airQuality.smokeAssessment.tacticalAdvisoryFr 
                      : airQuality.smokeAssessment.tacticalAdvisoryEn}
                </p>
                <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-900 flex items-center justify-between">
                  <span>{currentLang === 'ar' ? 'الرؤية الميدانية' : 'Field Visibility'}</span>
                  <span className="font-mono text-rose-300">
                    {airQuality.pm10 > 250 ? '< 150m' : airQuality.pm10 > 100 ? '200m - 500m' : '> 1000m'}
                  </span>
                </div>
              </div>

              {/* Card 4: Medical Triage & Field Health Care */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <HeartPulse className="w-4 h-4 shrink-0" />
                  <span>{currentLang === 'ar' ? 'السلامة الطبية والترياج الميداني' : 'Medical Triage & Field Care'}</span>
                </div>
                <p className="text-slate-200 text-xs leading-relaxed">
                  {currentLang === 'ar' 
                    ? airQuality.smokeAssessment.crewHealthActionAr 
                    : currentLang === 'fr' 
                      ? airQuality.smokeAssessment.crewHealthActionFr 
                      : airQuality.smokeAssessment.crewHealthActionEn}
                </p>
                <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-900 flex items-center justify-between">
                  <span>{currentLang === 'ar' ? 'أول أكسيد الكربون CO' : 'CO Level'}</span>
                  <span className={`font-mono font-bold ${airQuality.carbonMonoxidePpm > 15 ? 'text-rose-400' : 'text-emerald-300'}`}>
                    {airQuality.carbonMonoxidePpm} ppm ({airQuality.carbonMonoxideUgM3} µg/m³)
                  </span>
                </div>
              </div>
            </div>

            {/* Atmospheric Particulate Concentration vs Health Benchmarks */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-bold text-slate-200">
                  {currentLang === 'ar' ? 'مقارنة تركيز الجسيمات مع معايير منظمة الصحة العالمية (WHO) والوكالة الأمريكية (EPA):' : 'Particulate Density vs WHO / EPA Air Quality Benchmarks:'}
                </span>
                <span className="text-[10px] text-slate-400">
                  {currentLang === 'ar' ? 'الحد الأقصى اليومي الآمن لمنظمة الصحة: 15 µg/m³ لـ PM2.5 و 45 µg/m³ لـ PM10' : 'WHO 24h Guideline: 15 µg/m³ for PM2.5 & 45 µg/m³ for PM10'}
                </span>
              </div>

              {/* PM2.5 Bar Meter */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-300 font-medium">
                    {currentLang === 'ar' ? 'الجسيمات الدقيقة PM2.5 (تغلغل رئوي عميق):' : 'Fine Particulates PM2.5 (Deep Lung Penetration):'}
                  </span>
                  <span className="font-mono font-bold text-amber-300">
                    {airQuality.pm25} µg/m³ ({Math.round((airQuality.pm25 / 15) * 10) / 10}x WHO threshold)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden flex">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-600 transition-all duration-500 rounded-full"
                    style={{ width: `${Math.min(100, Math.max(5, (airQuality.pm25 / 250) * 100))}%` }}
                  />
                </div>
              </div>

              {/* PM10 Bar Meter */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-300 font-medium">
                    {currentLang === 'ar' ? 'الرماد والسخام PM10 (تهيج الشعب الهوائية والعينين):' : 'Coarse Ash & Soot PM10 (Bronchial & Eye Irritation):'}
                  </span>
                  <span className="font-mono font-bold text-sky-300">
                    {airQuality.pm10} µg/m³ ({Math.round((airQuality.pm10 / 45) * 10) / 10}x WHO threshold)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden flex">
                  <div 
                    className="h-full bg-gradient-to-r from-teal-500 via-sky-500 to-red-600 transition-all duration-500 rounded-full"
                    style={{ width: `${Math.min(100, Math.max(5, (airQuality.pm10 / 350) * 100))}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
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
                {t.kpiActiveIncidents}
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
                {t.kpiCriticalZones}
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
                {t.kpiUnitsAvailable}
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
