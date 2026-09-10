import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  BellOff, 
  BellRing, 
  ShieldAlert, 
  Flame, 
  Volume2, 
  VolumeX, 
  Smartphone, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Radio, 
  Clock, 
  Send,
  ExternalLink,
  Laptop
} from 'lucide-react';
import { WildfireIncident, Language } from '../../types';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  dispatchHighPriorityFireNotification,
  scheduleDelayedBackgroundAlert,
  getNotificationSettings,
  saveNotificationSettings,
  NotificationSettings,
  playEmergencyAlertSound
} from '../../services/notificationService';

interface PushNotificationModalProps {
  onClose: () => void;
  currentLang: Language;
  incidents: WildfireIncident[];
  onSelectIncident?: (incident: WildfireIncident) => void;
}

export const PushNotificationModal: React.FC<PushNotificationModalProps> = ({
  onClose,
  currentLang,
  incidents,
  onSelectIncident
}) => {
  const isAr = currentLang === 'ar';
  const isFr = currentLang === 'fr';

  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [supported, setSupported] = useState<boolean>(true);
  const [settings, setSettings] = useState<NotificationSettings>(getNotificationSettings);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>(incidents[0]?.id || '');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    setSupported(isNotificationSupported());
    setPermission(getNotificationPermission());
  }, []);

  // Handle countdown for delayed background test
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      setCountdown(null);
      setStatusMessage(
        isAr 
          ? 'تم إرسال الإنذار عبر Service Worker في الخلفية بنجاح!' 
          : 'High-priority alert dispatched via Service Worker in background!'
      );
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, isAr]);

  const handleRequestPermission = async () => {
    const perm = await requestNotificationPermission();
    setPermission(perm);
    if (perm === 'granted') {
      setStatusMessage(
        isAr
          ? 'تم تفعيل إشعارات المتصفح الفورية بنجاح!'
          : 'Browser push notifications successfully granted!'
      );
    } else if (perm === 'denied') {
      setStatusMessage(
        isAr
          ? 'تم رفض إذن الإشعارات من المتصفح. يمكنك تفعيله من شريط العنوان.'
          : 'Notifications blocked by browser. Please enable permissions from URL bar.'
      );
    }
  };

  const handleToggleSetting = (key: keyof NotificationSettings) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    saveNotificationSettings(updated);
  };

  const activeIncident = incidents.find((i) => i.id === selectedIncidentId) || incidents[0];

  const handleSendInstantAlert = async () => {
    if (!activeIncident) return;
    if (permission !== 'granted') {
      const p = await requestNotificationPermission();
      setPermission(p);
      if (p !== 'granted') return;
    }

    const success = await dispatchHighPriorityFireNotification(activeIncident, currentLang, true);
    if (success) {
      setStatusMessage(
        isAr 
          ? `تم إرسال إشعار أحمر عالي الخطورة لقطاع [${activeIncident.wilayaAr || activeIncident.wilaya}]` 
          : `High-priority red alert dispatched for [${activeIncident.wilaya}]`
      );
    }
  };

  const handleStartBackgroundTest = async () => {
    if (!activeIncident) return;
    if (permission !== 'granted') {
      const p = await requestNotificationPermission();
      setPermission(p);
      if (p !== 'granted') return;
    }

    setCountdown(5);
    setStatusMessage(
      isAr 
        ? 'قم بتصغير المتصفح أو الانتقال لتبويب آخر الآن لاختبار وصول الإنذار في الخلفية (Background)!' 
        : 'Minimize window or switch tabs now to test notification delivery while in the background!'
    );

    await scheduleDelayedBackgroundAlert(5, activeIncident, currentLang);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-red-950/80 via-slate-900 to-amber-950/60 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-600/20 border border-red-500/50 text-red-400">
              <BellRing className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-slate-100 text-base">
                  {isAr ? 'نظام إشعارات الدفع الفورية في الخلفية (Push Alerts)' : 'Background Wildfire Push Notification System'}
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-red-500/20 text-red-300 border border-red-500/30">
                  Service Worker API
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {isAr
                  ? 'تنبيهات فورية عالية الخطورة عبر Service Worker حتى عند تصغير المتصفح أو إغلاق التبويب'
                  : 'High-priority critical fire alarms delivered even when AWIS is minimized or tab is backgrounded'}
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

        {/* Modal Body */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* Permission Status Banner */}
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
            permission === 'granted'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              : permission === 'denied'
              ? 'bg-red-950/40 border-red-500/40 text-red-200'
              : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
          }`}>
            <div className="flex items-center gap-3">
              {permission === 'granted' ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
              ) : permission === 'denied' ? (
                <BellOff className="w-6 h-6 text-red-400 shrink-0" />
              ) : (
                <Bell className="w-6 h-6 text-amber-400 shrink-0 animate-bounce" />
              )}
              <div>
                <div className="font-bold text-sm text-slate-100 flex items-center gap-2">
                  <span>
                    {permission === 'granted'
                      ? (isAr ? 'إذن الإشعارات مفعّل بنجاح' : 'Push Notifications Granted & Ready')
                      : permission === 'denied'
                      ? (isAr ? 'إذن الإشعارات محظور في المتصفح' : 'Notifications Blocked by Browser')
                      : (isAr ? 'إذن الإشعارات بحاجة للتفعيل' : 'Push Notification Permission Required')}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    Status: {permission}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  {permission === 'granted'
                    ? (isAr
                      ? 'الخدمة مرتبطة بـ Service Worker (`sw.js`). ستتلقى إنذارات الحرائق القصوى فورياً.'
                      : 'Connected to Service Worker (`sw.js`). Critical fire alerts will pop up on your OS desktop.')
                    : permission === 'denied'
                    ? (isAr
                      ? 'يرجى النقر على أيقونة القفل في شريط عنوان المتصفح والسماح بالإشعارات.'
                      : 'Please click the site settings / lock icon in your browser URL bar and allow Notifications.')
                    : (isAr
                      ? 'اضغط على زر التفعيل أدناه لمنح المتصفح صلاحية إرسال التنبيهات في الخلفية.'
                      : 'Click the button below to allow the Service Worker to notify you of emergency fire outbreaks.')}
                </p>
              </div>
            </div>

            {permission !== 'granted' && (
              <button
                onClick={handleRequestPermission}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-lg transition shrink-0 cursor-pointer"
              >
                {isAr ? 'تفعيل إشعارات الطوارئ' : 'Enable Push Alerts'}
              </button>
            )}
          </div>

          {/* Countdown & Instructions for Background Test */}
          {countdown !== null && (
            <div className="p-4 rounded-xl bg-red-950/90 border-2 border-red-500 text-white shadow-2xl flex items-center justify-between gap-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center font-mono font-black text-lg text-white shadow-inner">
                  {countdown}s
                </div>
                <div>
                  <h4 className="font-bold text-sm text-red-200">
                    {isAr ? 'اختبار الإشعار في الخلفية جارٍ...' : 'Background Notification Test in Progress...'}
                  </h4>
                  <p className="text-xs text-red-100">
                    {isAr 
                      ? 'قم بالتبديل إلى نافذة أخرى أو تصغير المتصفح الآن لتشاهد ظهور إشعار النظام!' 
                      : 'Switch to another tab or minimize your browser now to see the OS banner pop up!'}
                  </p>
                </div>
              </div>
              <Laptop className="w-8 h-8 text-red-300 shrink-0" />
            </div>
          )}

          {statusMessage && countdown === null && (
            <div className="p-3 rounded-lg bg-slate-800/90 border border-slate-700 text-emerald-300 text-xs flex items-center justify-between">
              <span>{statusMessage}</span>
              <button 
                onClick={() => setStatusMessage(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Background Push Testing Sandbox */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-400" />
                <h3 className="font-bold text-slate-200 text-xs uppercase tracking-wider">
                  {isAr ? 'محاكاة إنذار حريق عالي الخطورة (Testing Console)' : 'High-Priority Wildfire Alert Sandbox'}
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">
                {isAr ? 'حدد البؤرة لاختبار الإنذار:' : 'Select incident to test:'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {incidents.slice(0, 4).map((inc) => (
                <button
                  key={inc.id}
                  onClick={() => setSelectedIncidentId(inc.id)}
                  className={`p-2.5 rounded-lg border text-left flex items-start justify-between transition cursor-pointer ${
                    selectedIncidentId === inc.id
                      ? 'bg-red-950/40 border-red-500 text-slate-100 shadow-md'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                  dir={isAr ? 'rtl' : 'ltr'}
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-xs text-slate-200 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span>{isAr ? inc.titleAr : inc.title}</span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      {isAr ? inc.wilayaAr : inc.wilaya} • {inc.windSpeedKmH} km/h • {inc.temperatureC}°C
                    </p>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase ${
                    inc.riskLevel === 'critical' ? 'bg-red-500 text-black font-extrabold' : 'bg-orange-500/20 text-orange-300'
                  }`}>
                    {inc.riskLevel}
                  </span>
                </button>
              ))}
            </div>

            {/* Test Action Buttons */}
            <div className="pt-2 flex flex-wrap gap-2.5">
              <button
                onClick={handleStartBackgroundTest}
                disabled={countdown !== null}
                className="flex-1 min-w-[200px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-xs shadow-lg transition cursor-pointer disabled:opacity-50"
              >
                <Clock className="w-4 h-4" />
                <span>
                  {isAr 
                    ? '⏱️ اختبار الإنذار في الخلفية (عد تنازلي 5 ثوانٍ)' 
                    : '⏱️ Test Background Alert (5-Second Delay)'}
                </span>
              </button>

              <button
                onClick={handleSendInstantAlert}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 text-amber-400" />
                <span>{isAr ? 'إرسال فوري الآن' : 'Dispatch Now'}</span>
              </button>

              <button
                onClick={playEmergencyAlertSound}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 transition cursor-pointer"
                title={isAr ? 'اختبار نغمة الإنذار التكتيكية' : 'Test emergency audio chime'}
              >
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isAr ? 'صوت التنبيه' : 'Test Siren'}</span>
              </button>
            </div>
          </div>

          {/* Configurable Alert Rules & Toggles */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <h3 className="font-bold text-slate-200 text-xs uppercase tracking-wider">
              {isAr ? 'إعدادات وقواعد الإنذار التكتيكية' : 'Tactical Alert Thresholds & Channels'}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition cursor-pointer">
                <div>
                  <div className="font-semibold text-slate-200">
                    {isAr ? 'حرائق قصوى وحرجة فقط' : 'Critical / Extreme Fires Only'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {isAr ? 'استبعاد الحرائق المنخفضة والمتوسطة لتجنب الإزعاج' : 'Filter out low & moderate risk signals'}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifyCriticalOnly}
                  onChange={() => handleToggleSetting('notifyCriticalOnly')}
                  className="w-4 h-4 rounded text-red-600 focus:ring-red-500 bg-slate-800 border-slate-700 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition cursor-pointer">
                <div>
                  <div className="font-semibold text-slate-200">
                    {isAr ? 'إنذار إخلاء التجمعات السكنية' : 'Settlement Evacuation Alerts'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {isAr ? 'إشعار فوري عند تهديد القرى والبنى التحتية' : 'Immediate notification if villages are exposed'}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifyEvacuations}
                  onChange={() => handleToggleSetting('notifyEvacuations')}
                  className="w-4 h-4 rounded text-red-600 focus:ring-red-500 bg-slate-800 border-slate-700 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition cursor-pointer">
                <div>
                  <div className="font-semibold text-slate-200">
                    {isAr ? 'نغمة إنذار صوتية (Web Audio Siren)' : 'Emergency Audio Chime'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {isAr ? 'صفارة إنذار عالية التردد عند وصول البلاغ' : 'Dual-tone synthesizer chime for field alerts'}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.soundEnabled}
                  onChange={() => handleToggleSetting('soundEnabled')}
                  className="w-4 h-4 rounded text-red-600 focus:ring-red-500 bg-slate-800 border-slate-700 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition cursor-pointer">
                <div>
                  <div className="font-semibold text-slate-200">
                    {isAr ? 'نمط اهتزاز الطوارئ (Vibration)' : 'Tactical Vibration Pattern'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {isAr ? 'اهتزاز قوي للهواتف والأجهزة الميدانية' : 'Siren pulse vibration for field tablets/phones'}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.vibrationEnabled}
                  onChange={() => handleToggleSetting('vibrationEnabled')}
                  className="w-4 h-4 rounded text-red-600 focus:ring-red-500 bg-slate-800 border-slate-700 cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Service Worker Technical Architecture Note */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 space-y-1.5 font-mono">
            <div className="flex items-center gap-2 text-slate-300 font-bold">
              <Radio className="w-3.5 h-3.5 text-cyan-400" />
              <span>Service Worker Push Architecture:</span>
            </div>
            <p className="text-slate-400 leading-relaxed font-sans">
              {isAr
                ? 'يعتمد نظام AWIS على مواصفة W3C Push & Notification API مع معالجة Service Worker الخلفية (`sw.js`). عند تصغير المتصفح، تظل طبقة المراقبة نشطة وتطلق إشعارات النظام المباشرة مع إجراءات سريعة: فتح البؤرة على الخريطة أو الاتصال الفوري برقم طوارئ الحماية المدنية 14.'
                : 'AWIS utilizes the W3C Push & Notification API backed by a background Service Worker (`sw.js`). When backgrounded or minimized, high-priority fire detection signals trigger OS-level notification cards with interactive quick-actions: focus the GIS incident or dial 14 Civil Protection.'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-mono">
            AWIS Background Service Worker v2 • Algerian Civil Protection
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition cursor-pointer"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
