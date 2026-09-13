import React, { useState, useEffect } from 'react';
import { 
  Satellite, 
  Radio, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink, 
  RefreshCw, 
  Key, 
  MapPin, 
  Flame, 
  Wind, 
  Thermometer, 
  Droplets, 
  Compass, 
  Globe, 
  X,
  Layers,
  Sparkles,
  ShieldAlert
} from 'lucide-react';
import { 
  FirmsDetection, 
  getFirmsApiKey, 
  setFirmsApiKey, 
  getCoverageScope, 
  setCoverageScope, 
  testFirmsApiKey, 
  getFirmsUplinkStatus,
  FirmsUplinkStatus,
  SATELLITE_SOURCES,
  ALGERIA_NATIONAL_BBOX,
  ALGERIA_TELL_ATLAS_BBOX
} from '../../services/firmsService';
import { fetchAlgeriaLiveWeather, AlgeriaLiveWeather } from '../../services/weatherService';
import { Language } from '../../types';

interface LiveSatelliteModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLang: Language;
  onRefreshFirms: () => Promise<void>;
  isRefreshing: boolean;
  detections: FirmsDetection[];
  onSelectHotspot?: (hotspot: FirmsDetection) => void;
}

export const LiveSatelliteModal: React.FC<LiveSatelliteModalProps> = ({
  isOpen,
  onClose,
  currentLang,
  onRefreshFirms,
  isRefreshing,
  detections,
  onSelectHotspot
}) => {
  const isAr = currentLang === 'ar';
  const isFr = currentLang === 'fr';

  const [inputKey, setInputKey] = useState<string>('');
  const [coverage, setCoverage] = useState<'national' | 'tell_atlas'>('national');
  const [uplinkStatus, setUplinkStatus] = useState<FirmsUplinkStatus>(getFirmsUplinkStatus());
  const [testingKey, setTestingKey] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ valid: boolean; message: string; messageAr: string } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [liveWeather, setLiveWeather] = useState<AlgeriaLiveWeather | null>(null);
  const [loadingWeather, setLoadingWeather] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      const activeKey = getFirmsApiKey();
      setInputKey(activeKey);
      setCoverage(getCoverageScope());
      setUplinkStatus(getFirmsUplinkStatus());

      // Fetch live weather for Northern Algeria high-risk center (Jijel/Béjaïa forest coordinates)
      setLoadingWeather(true);
      fetchAlgeriaLiveWeather(36.78, 5.72, 'Guerrouche - Tell Atlas', 'كتلة قروش - الأطلس التلي')
        .then((w) => setLiveWeather(w))
        .finally(() => setLoadingWeather(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveKey = async () => {
    setFirmsApiKey(inputKey.trim());
    setCoverageScope(coverage);
    setSaveSuccess(true);
    setUplinkStatus(getFirmsUplinkStatus());
    setTimeout(() => setSaveSuccess(false), 4000);
    await onRefreshFirms();
  };

  const handleTestKey = async () => {
    if (!inputKey.trim()) {
      setTestResult({
        valid: false,
        message: 'Please paste your NASA MAP_KEY first.',
        messageAr: 'يرجى لصق مفتاح NASA MAP_KEY أولاً.'
      });
      return;
    }
    setTestingKey(true);
    setTestResult(null);
    try {
      const res = await testFirmsApiKey(inputKey.trim());
      setTestResult(res);
      if (res.valid) {
        setFirmsApiKey(inputKey.trim());
        setUplinkStatus(getFirmsUplinkStatus());
        await onRefreshFirms();
      }
    } finally {
      setTestingKey(false);
    }
  };

  const handleScopeChange = async (scope: 'national' | 'tell_atlas') => {
    setCoverage(scope);
    setCoverageScope(scope);
    setUplinkStatus(getFirmsUplinkStatus());
    await onRefreshFirms();
  };

  const totalFrp = Math.round(detections.reduce((sum, d) => sum + d.frpMw, 0));

  return (
    <div 
      id="live-satellite-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <div 
        id="live-satellite-modal-container"
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl text-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative p-2.5 rounded-xl bg-indigo-950 border border-indigo-500/30 text-indigo-400">
              <Satellite className="w-6 h-6 animate-pulse" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-ping" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  {isAr 
                    ? 'منظومة الاستشعار الفضائي اللحظي (NASA EOSDIS Live Uplink)' 
                    : isFr 
                    ? 'Centre de Réception Spatiale & Détection Satellitaire Directe' 
                    : 'NASA EOSDIS Live Satellite Wildfire Uplink Center'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  VIIRS 375m & MODIS
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {isAr
                  ? 'رصد واستشعار البؤر الحرارية وحرائق الغابات عبر كامل التراب الوطني الجزائري'
                  : 'Real-time thermal anomaly & wildfire detection across Algerian national territory'}
              </p>
            </div>
          </div>

          <button 
            id="btn-close-satellite-modal"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          
          {/* Status Uplink Banner */}
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            uplinkStatus.isLiveUplink
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              : uplinkStatus.hasApiKey
              ? 'bg-blue-950/40 border-blue-500/40 text-blue-200'
              : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
          }`}>
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg shrink-0 ${
                uplinkStatus.isLiveUplink 
                  ? 'bg-emerald-500/20 text-emerald-400' 
                  : 'bg-amber-500/20 text-amber-400'
              }`}>
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">
                    {uplinkStatus.isLiveUplink
                      ? (isAr ? '🟢 الاتصال الفضائي المباشر: نَشِط (بوابة ناسا الفورية)' : '🟢 LIVE SATELLITE UPLINK: CONNECTED TO NASA EOSDIS')
                      : (isAr ? '🟡 وضع المحاكاة المدارية المرجعية (جاهز للربط الحي)' : '🟡 REFERENCE ORBITAL PASS MODE (READY FOR LIVE UPLINK)')}
                  </span>
                </div>
                <p className="text-xs opacity-80 mt-0.5">
                  {isAr ? uplinkStatus.statusMessageAr : uplinkStatus.statusMessageEn}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                id="btn-modal-force-refresh"
                onClick={() => onRefreshFirms()}
                disabled={isRefreshing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-600 text-white font-semibold text-xs shadow transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? (isAr ? 'جارٍ المسح...' : 'Scanning...') : (isAr ? 'مسح فضائي فوري' : 'Scan Satellites Now')}</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-800/60 border border-slate-700/60 p-3 rounded-xl">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>{isAr ? 'البؤر المرصودة' : 'Active Hotspots'}</span>
                <Flame className="w-4 h-4 text-orange-400" />
              </div>
              <div className="text-xl font-black text-white">
                {detections.length}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {isAr ? 'بؤرة شذوذ حراري' : 'thermal detections'}
              </div>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/60 p-3 rounded-xl">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>{isAr ? 'طاقة الإشعاع (FRP)' : 'Total FRP'}</span>
                <Sparkles className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-xl font-black text-amber-300">
                {totalFrp} <span className="text-xs font-normal text-slate-400">MW</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {isAr ? 'ميغاوات حرارية' : 'megawatts radiant'}
              </div>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/60 p-3 rounded-xl">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>{isAr ? 'الأقمار النشطة' : 'Active Satellites'}</span>
                <Globe className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-xl font-black text-indigo-300">
                4 <span className="text-xs font-normal text-slate-400">Platforms</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                NOAA-20, 21, NPP, MODIS
              </div>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/60 p-3 rounded-xl">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>{isAr ? 'نطاق المسح' : 'Scan Coverage'}</span>
                <Layers className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-sm font-black text-emerald-300">
                {coverage === 'national' 
                  ? (isAr ? 'كامل الجزائر (58 ولاية)' : 'All Algeria (58 Wilayas)')
                  : (isAr ? 'الأطلس التلي الغابي' : 'Tell Atlas Forest Belt')}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {coverage === 'national' ? 'BBOX [-8.7..12.0]' : 'BBOX [-2.5..9.5]'}
              </div>
            </div>
          </div>

          {/* NASA FIRMS Key Management & Activation Form */}
          <div className="bg-slate-800/40 border border-slate-700/70 p-4 sm:p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-purple-400" />
                <h3 className="font-bold text-sm text-white">
                  {isAr ? 'إعداد مفتاح الاستشعار الفضائي المباشر (NASA MAP_KEY)' : 'NASA EOSDIS Direct Uplink Key Configuration'}
                </h3>
              </div>
              <a 
                href="https://firms.modaps.eosdis.nasa.gov/api/map_key" 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer"
              >
                <span>{isAr ? 'احصل على مفتاح ناسا مجاناً خلال 30 ثانية' : 'Get free NASA MAP_KEY in 30s'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              {isAr
                ? 'وكالة ناسا توفر مفتاح الاستشعار مجاناً وفورياً لأي باحث أو جهة دفاع مدني في العالم. بمجرد إدخال المفتاح، ستتصل الخريطة فوراً بالأقمار الصناعية وترصد كل حريق شاعل في الجزائر مباشرة دون محاكاة.'
                : 'NASA provides free Near-Real-Time active fire API keys without waiting. Once entered, AWIS connects directly to NASA EOSDIS servers to stream every active fire across Algeria.'}
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="relative flex-1 w-full">
                <input
                  id="input-nasa-firms-key"
                  type="text"
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  placeholder={isAr ? 'ألصق هنا مفتاح ناسا المكون من 32 رمزاً (مثال: c4e36bb55c4d02b544321689725f7710)' : 'Paste your 32-character NASA MAP_KEY here...'}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  id="btn-test-firms-key"
                  onClick={handleTestKey}
                  disabled={testingKey}
                  className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold border border-slate-600 transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Radio className={`w-3.5 h-3.5 ${testingKey ? 'animate-spin' : 'text-indigo-400'}`} />
                  <span>{testingKey ? (isAr ? 'جارٍ الفحص...' : 'Testing...') : (isAr ? 'فحص الاتصال' : 'Test Uplink')}</span>
                </button>

                <button
                  id="btn-save-firms-key"
                  onClick={handleSaveKey}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white text-xs font-bold shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isAr ? 'حفظ وتفعيل' : 'Save & Uplink'}</span>
                </button>
              </div>
            </div>

            {/* Test Result Feedback */}
            {testResult && (
              <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                testResult.valid 
                  ? 'bg-emerald-950/60 border border-emerald-500/50 text-emerald-200' 
                  : 'bg-rose-950/60 border border-rose-500/50 text-rose-200'
              }`}>
                {testResult.valid ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />}
                <span>{isAr ? testResult.messageAr : testResult.message}</span>
              </div>
            )}

            {saveSuccess && (
              <div className="p-3 rounded-xl text-xs bg-emerald-950/60 border border-emerald-500/50 text-emerald-200 flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{isAr ? 'تم حفظ المفتاح وتحديث بيانات الاستشعار الفضائي بنجاح!' : 'Map Key saved! Satellite feed updated successfully.'}</span>
              </div>
            )}

            {/* Coverage Scope Selector */}
            <div className="pt-2 border-t border-slate-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-300">
                {isAr ? 'نطاق التغطية الجغرافية المستهدفة:' : 'Geographical Coverage Target:'}
              </span>

              <div className="inline-flex rounded-xl bg-slate-900 p-1 border border-slate-700">
                <button
                  id="btn-scope-national"
                  onClick={() => handleScopeChange('national')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                    coverage === 'national' 
                      ? 'bg-indigo-700 text-white shadow' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>🇩🇿</span>
                  <span>{isAr ? 'كامل الجزائر (58 ولاية)' : 'All Algeria (58 Wilayas)'}</span>
                </button>

                <button
                  id="btn-scope-tell-atlas"
                  onClick={() => handleScopeChange('tell_atlas')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                    coverage === 'tell_atlas' 
                      ? 'bg-indigo-700 text-white shadow' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>🌲</span>
                  <span>{isAr ? 'حزام الغابات التلي' : 'Tell Atlas Forests'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Live Open-Meteo Weather Bar */}
          {liveWeather && (
            <div className="bg-slate-800/40 border border-slate-700/70 p-4 rounded-2xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Wind className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-xs font-bold text-slate-200">
                    {isAr ? 'الطقس اللحظي ومؤشر خطر انتشار النيران (Open-Meteo Live FWI)' : 'Live Meteorology & Rothermel Spread Index'}
                  </h4>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {liveWeather.isLive ? 'Live Sensor Data' : 'Model Simulation'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <div className="text-[10px] text-slate-400">{isAr ? 'الحرارة الحالية' : 'Air Temp'}</div>
                    <div className="font-bold text-white text-sm">{liveWeather.temperatureC}°C</div>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-blue-400 shrink-0" />
                  <div>
                    <div className="text-[10px] text-slate-400">{isAr ? 'الرطوبة النسبية' : 'Humidity'}</div>
                    <div className="font-bold text-white text-sm">{liveWeather.humidityPercent}%</div>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2">
                  <Compass className="w-4 h-4 text-teal-400 shrink-0" />
                  <div>
                    <div className="text-[10px] text-slate-400">{isAr ? 'سرعة واتجاه الرياح' : 'Wind Vector'}</div>
                    <div className="font-bold text-white text-sm">
                      {liveWeather.windSpeedKmH} km/h ({liveWeather.windDirectionCardinal})
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                  <div>
                    <div className="text-[10px] text-slate-400">{isAr ? 'مؤشر FWI لخطر الاشتعال' : 'FWI Danger Index'}</div>
                    <div className="font-bold text-rose-300 text-sm">
                      {liveWeather.fwiScore}/100 ({liveWeather.fwiCategory.toUpperCase()})
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Detections Telemetry Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Satellite className="w-4 h-4 text-indigo-400" />
                <span>{isAr ? 'جدول البؤر الحرارية المرصودة بالأقمار الصناعية' : 'Satellite Thermal Anomaly Telemetry'}</span>
                <span className="text-slate-500 font-normal">({detections.length})</span>
              </h3>
            </div>

            <div className="border border-slate-700/80 rounded-xl overflow-hidden">
              <div className="max-h-56 overflow-y-auto divide-y divide-slate-800">
                {detections.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    {isAr ? 'لا توجد بؤر حرارية مرصودة في هذا المدار حالياً.' : 'No thermal anomalies detected in current orbit pass.'}
                  </div>
                ) : (
                  detections.map((d) => (
                    <div 
                      key={d.id}
                      className="p-3 bg-slate-900/60 hover:bg-slate-800/80 transition flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`p-1.5 rounded-lg shrink-0 ${
                          d.frpMw >= 200 
                            ? 'bg-rose-500/20 text-rose-400' 
                            : d.frpMw >= 100 
                            ? 'bg-amber-500/20 text-amber-400' 
                            : 'bg-indigo-500/20 text-indigo-400'
                        }`}>
                          <Flame className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-white truncate flex items-center gap-1.5">
                            <span>{isAr ? d.wilayaAr : d.wilaya}</span>
                            <span className="text-slate-500">·</span>
                            <span className="text-slate-300 font-normal truncate">{isAr ? d.locationNameAr : d.locationName}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap">
                            <span className="text-indigo-300 font-mono">{d.satellite}</span>
                            <span>•</span>
                            <span>{d.latitude.toFixed(3)}°N, {d.longitude.toFixed(3)}°E</span>
                            <span>•</span>
                            <span>{d.acqTime}</span>
                            <span>•</span>
                            <span className="text-amber-300 font-semibold">{d.frpMw} MW</span>
                            <span>•</span>
                            <span>{Math.round(d.brightnessTempKelvin - 273.15)}°C</span>
                          </div>
                        </div>
                      </div>

                      {onSelectHotspot && (
                        <button
                          onClick={() => {
                            onSelectHotspot(d);
                            onClose();
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-700/80 hover:bg-indigo-600 text-white font-semibold text-[11px] transition cursor-pointer shrink-0 flex items-center gap-1"
                        >
                          <MapPin className="w-3 h-3" />
                          <span>{isAr ? 'تحديد' : 'Locate'}</span>
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            {isAr ? 'مصدر البيانات: NASA FIRMS EOSDIS & Open-Meteo' : 'Data sources: NASA FIRMS EOSDIS & Open-Meteo'}
          </div>

          <button
            id="btn-close-satellite-footer"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition cursor-pointer"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
};
