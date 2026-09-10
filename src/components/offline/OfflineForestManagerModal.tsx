import React, { useState } from 'react';
import { 
  WifiOff, 
  Wifi, 
  HardDrive, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Layers, 
  MapPin, 
  Flame, 
  Droplet, 
  Shield, 
  Trees, 
  UploadCloud, 
  Radio, 
  Smartphone,
  PhoneCall
} from 'lucide-react';
import { Language } from '../../types';
import { translations } from '../../i18n/translations';
import { 
  OfflineCacheStats, 
  QueuedOfflineReport, 
  clearQueuedOfflineReports 
} from '../../services/offlineCacheService';

interface OfflineForestManagerModalProps {
  onClose: () => void;
  isOnline: boolean;
  isSimulatedOffline: boolean;
  onToggleSimulateOffline: () => void;
  cacheStats: OfflineCacheStats;
  onRefreshCache: () => void;
  currentLang: Language;
  queuedReports: QueuedOfflineReport[];
  onSyncQueuedReports: () => void;
}

export const OfflineForestManagerModal: React.FC<OfflineForestManagerModalProps> = ({
  onClose,
  isOnline,
  isSimulatedOffline,
  onToggleSimulateOffline,
  cacheStats,
  onRefreshCache,
  currentLang,
  queuedReports,
  onSyncQueuedReports
}) => {
  const t = translations[currentLang];
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

  const effectiveOnline = isOnline && !isSimulatedOffline;

  const handleManualCache = () => {
    setSyncing(true);
    onRefreshCache();
    setTimeout(() => {
      setSyncing(false);
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 3000);
    }, 600);
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      dir={currentLang === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/40 p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${
              effectiveOnline 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse'
            }`}>
              {effectiveOnline ? <Wifi className="w-6 h-6" /> : <WifiOff className="w-6 h-6" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {currentLang === 'ar' ? 'إدارة العمليات دون اتصال بالإنترنت' : 'Offline Forest Operations & Cache Manager'}
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  effectiveOnline 
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-700' 
                    : 'bg-amber-950 text-amber-300 border-amber-700 animate-pulse'
                }`}>
                  {effectiveOnline 
                    ? (currentLang === 'ar' ? 'متصل بالشبكة' : 'ONLINE CLOUD') 
                    : (currentLang === 'ar' ? 'وضع الغابات المنعزلة أوفلاين' : 'OFFLINE FOREST ACTIVE')}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {currentLang === 'ar'
                  ? 'يضمن استمرار عمل الخريطة التفاعلية، بؤر الحرائق، ونقاط التزود بالمياه في أعالي الجبال والغابات المعزولة'
                  : 'Guarantees continuous GIS mapping, hotspots & water sources in remote mountain terrain'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-sm text-slate-300">

          {/* Offline Simulation Switch */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-white block">
                {currentLang === 'ar' ? 'محاكاة انقطاع الإنترنت الميداني (Field Simulation)' : 'Simulate Lost Connection in Forest'}
              </span>
              <p className="text-xs text-slate-400">
                {currentLang === 'ar'
                  ? 'اختبر تجاوب نظام الخرائط والبؤر وكأنك في عمق جبال جرجرة أو جيجل بدون تغطية 4G'
                  : 'Test GIS responsiveness as if operating in deep mountain valleys with zero cellular reception'}
              </p>
            </div>
            <button
              onClick={onToggleSimulateOffline}
              className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                isSimulatedOffline
                  ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {isSimulatedOffline ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
              {isSimulatedOffline 
                ? (currentLang === 'ar' ? 'الوضع المنعزل نشط' : 'OFFLINE ACTIVE') 
                : (currentLang === 'ar' ? 'محاكاة الانقطاع' : 'Simulate Cutoff')}
            </button>
          </div>

          {/* Cached GIS Markers Dashboard */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-emerald-400" />
                {currentLang === 'ar' ? 'حالة البيانات الجغرافية المخزنة محلياً (LocalStorage & ServiceWorker)' : 'Cached GIS Data in LocalStorage & ServiceWorker'}
              </span>
              {cacheStats.lastSyncFormatted && (
                <span className="text-[11px] text-slate-500 font-mono">
                  {currentLang === 'ar' ? 'آخر تخزين:' : 'Last cached:'} {cacheStats.lastSyncFormatted}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60">
                <div className="flex items-center gap-2 text-rose-400 mb-1">
                  <Flame className="w-4 h-4" />
                  <span className="text-xs font-medium">{currentLang === 'ar' ? 'بؤر الحرائق' : 'Fires / Incidents'}</span>
                </div>
                <div className="text-xl font-mono font-bold text-white">{cacheStats.incidentsCount}</div>
                <span className="text-[10px] text-slate-500 font-mono">SVG Geo-markers</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60">
                <div className="flex items-center gap-2 text-emerald-400 mb-1">
                  <Trees className="w-4 h-4" />
                  <span className="text-xs font-medium">{currentLang === 'ar' ? 'المناطق الغابية' : 'Forest Zones'}</span>
                </div>
                <div className="text-xl font-mono font-bold text-white">{cacheStats.forestsCount}</div>
                <span className="text-[10px] text-slate-500 font-mono">Vector Polygons</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60">
                <div className="flex items-center gap-2 text-sky-400 mb-1">
                  <Droplet className="w-4 h-4" />
                  <span className="text-xs font-medium">{currentLang === 'ar' ? 'نقاط المياه' : 'Water Cisterns'}</span>
                </div>
                <div className="text-xl font-mono font-bold text-white">{cacheStats.waterPointsCount}</div>
                <span className="text-[10px] text-slate-500 font-mono">Tactical Points</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60">
                <div className="flex items-center gap-2 text-amber-400 mb-1">
                  <Shield className="w-4 h-4" />
                  <span className="text-xs font-medium">{currentLang === 'ar' ? 'فرق الحماية المدنية' : 'Protection Units'}</span>
                </div>
                <div className="text-xl font-mono font-bold text-white">{cacheStats.resourcesCount}</div>
                <span className="text-[10px] text-slate-500 font-mono">Field Stations</span>
              </div>
            </div>
          </div>

          {/* Pending Offline Reports Queue */}
          {queuedReports.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                  <UploadCloud className="w-4 h-4 animate-bounce" />
                  <span>
                    {currentLang === 'ar' 
                      ? `تقارير ميدانية محفوظة أوفلاين بانتظار الرفع (${queuedReports.length})` 
                      : `Offline Reports Pending Upload (${queuedReports.length})`}
                  </span>
                </div>
                <button
                  onClick={onSyncQueuedReports}
                  disabled={!effectiveOnline}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                    effectiveOnline 
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow' 
                      : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <RefreshCw className="w-3 h-3" />
                  {currentLang === 'ar' ? 'مزامنة ورفع الآن' : 'Sync Now'}
                </button>
              </div>
              <p className="text-[11px] text-amber-200/80">
                {currentLang === 'ar'
                  ? 'تم حفظ هذه البلاغات بأمان في ذاكرة جهازك أثناء انقطاع الشبكة وسيتم إرسالها إلى غرفة القيادة المركزية فور عودة الاتصال.'
                  : 'These reports were securely stored on your device while offline and will dispatch to Central Command upon reconnect.'}
              </p>
            </div>
          )}

          {/* Tactical Offline Instructions for Forest Operators */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5">
            <span className="text-xs uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-emerald-400" />
              {currentLang === 'ar' ? 'إرشادات الاتصال اللاسلكي والطوارئ في المناطق المعزولة' : 'Remote Forest Field Guidelines'}
            </span>
            <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
              <li>
                <strong className="text-slate-200">
                  {currentLang === 'ar' ? 'تحديد الموقع GPS بدون شبكة:' : 'Offline GNSS Navigation:'}
                </strong>{' '}
                {currentLang === 'ar'
                  ? 'مستشعر الـ GPS في الهاتف متصل بالأقمار الصناعية مباشرة ولا يتطلب إنترنت. اضغط زر "GPS" على الخريطة لتحديد موقعك.'
                  : 'Phone GPS sensor connects directly to GNSS satellites and requires no cellular internet. Press GPS button to track.'}
              </li>
              <li>
                <strong className="text-slate-200">
                  {currentLang === 'ar' ? 'تخزين الخريطة المسبق (Pre-caching):' : 'Pre-Trip Caching:'}
                </strong>{' '}
                {currentLang === 'ar'
                  ? 'قم بالنقر على "تحديث التخزين المحلي" قبل الانطلاق نحو القطاع الغابي لحفظ آخر تحديثات البؤر والرياح.'
                  : 'Click "Cache All GIS Markers" before heading out into the field to cache the latest hotspots and wind vectors.'}
              </li>
              <li>
                <strong className="text-slate-200">
                  {currentLang === 'ar' ? 'أرقام الطوارئ الوطنية المباشرة:' : 'Emergency Hotlines:'}
                </strong>{' '}
                <span className="text-emerald-400 font-mono font-bold">14 / 1021</span> (الحماية المدنية) &mdash;{' '}
                <span className="text-emerald-400 font-mono font-bold">1070</span> (محافظة الغابات).
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              onClick={handleManualCache}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-lg shadow-emerald-900/40 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              <span>
                {syncSuccess 
                  ? (currentLang === 'ar' ? '✓ تم حفظ وتحديث الذاكرة المحلية بنجاح' : '✓ GIS Markers Cached Successfully') 
                  : (currentLang === 'ar' ? 'تحديث وحفظ كافة معالم الـ GIS للعمل أوفلاين' : 'Cache All GIS Markers for Offline Use')}
              </span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition cursor-pointer"
            >
              {currentLang === 'ar' ? 'إغلاق النافذة' : 'Close'}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
