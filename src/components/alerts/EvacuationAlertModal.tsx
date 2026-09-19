import React, { useState } from 'react';
import { 
  X, 
  Radio, 
  Send, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  MapPin, 
  TowerControl, 
  Smartphone, 
  Users, 
  Clock, 
  Check, 
  Zap,
  Activity,
  PhoneCall,
  Lock
} from 'lucide-react';
import { Language, WildfireIncident } from '../../types';
import { ALGERIA_WILAYAS } from '../../data/algeriaData';
import { 
  sendEvacuationAlert, 
  EvacuationAlertResult, 
  AlgerianCarrier 
} from '../../services/smsGatewayService';
import { useRBAC } from '../../context/RBACContext';

interface EvacuationAlertModalProps {
  onClose: () => void;
  currentLang: Language;
  defaultIncident?: WildfireIncident | null;
}

export const EvacuationAlertModal: React.FC<EvacuationAlertModalProps> = ({
  onClose,
  currentLang,
  defaultIncident
}) => {
  const isAr = currentLang === 'ar';
  const { role, permissions, checkAndExecute } = useRBAC();

  // Find initial wilaya from incident if provided, otherwise default to Jijel ('18')
  const initialWilayaCode = defaultIncident
    ? ALGERIA_WILAYAS.find(w => w.nameEn.toLowerCase() === defaultIncident.wilaya.toLowerCase())?.code || '18'
    : '18';

  const [selectedWilayaCode, setSelectedWilayaCode] = useState<string>(initialWilayaCode);
  const selectedWilaya = ALGERIA_WILAYAS.find(w => w.code === selectedWilayaCode) || ALGERIA_WILAYAS[0];

  const defaultMsgAr = `[إنذار إخلاء عاجل - الحماية المدنية الجزائرية]
نظراً لاقتراب جبهة حريق الغابات في محيط (${selectedWilaya.nameAr})، نطلب من جميع المواطنين في القرى المحيطة الإخلاء الفوري باتجاه الطرق الآمنة المحددة نحو مراكز الإيواء وتفادي ممرات الدخان. 
لطلب النجدة والإسعاف: اتصلوا فوراً بالرقم الأخضر 14 أو 1021.`;

  const defaultMsgFr = `[ALERTE CIVILE - DIRECTION GÉNÉRALE DE LA PROTECTION CIVILE]
Menace imminente de feu de forêt zone ${selectedWilaya.nameFr}. Évacuation préventive et immédiate des populations exposées vers les zones sécurisées. Évitez les axes sous le vent. Urgences: 14 / 1021.`;

  const [message, setMessage] = useState<string>(isAr ? defaultMsgAr : defaultMsgFr);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<EvacuationAlertResult | null>(null);
  const [activeCarriers, setActiveCarriers] = useState<Record<AlgerianCarrier, boolean>>({
    Mobilis: true,
    Djezzy: true,
    Ooredoo: true
  });

  const handleWilayaChange = (code: string) => {
    setSelectedWilayaCode(code);
    const w = ALGERIA_WILAYAS.find(item => item.code === code);
    if (!w) return;
    
    if (isAr) {
      setMessage(`[إنذار إخلاء عاجل - الحماية المدنية الجزائرية]
نظراً لاقتراب جبهة حريق الغابات في محيط (${w.nameAr})، نطلب من جميع المواطنين في القرى المحيطة الإخلاء الفوري باتجاه الطرق الآمنة المحددة نحو مراكز الإيواء وتفادي ممرات الدخان. 
لطلب النجدة والإسعاف: اتصلوا فوراً بالرقم الأخضر 14 أو 1021.`);
    } else {
      setMessage(`[ALERTE CIVILE - DIRECTION GÉNÉRALE DE LA PROTECTION CIVILE]
Menace imminente de feu de forêt zone ${w.nameFr}. Évacuation préventive et immédiate des populations exposées vers les zones sécurisées. Évitez les axes sous le vent. Urgences: 14 / 1021.`);
    }
  };

  const handleDispatch = async () => {
    checkAndExecute(
      isAr ? 'بث إنذار الإخلاء الخلوي للطوارئ' : 'Dispatch Evacuation Cell Broadcast',
      'CentralCommand',
      async () => {
        setIsSending(true);
        try {
          const res = await sendEvacuationAlert(selectedWilayaCode, message);
          setLastResult(res);
        } catch (err) {
          console.error('Failed to send evacuation alert:', err);
        } finally {
          setIsSending(false);
        }
      }
    );
  };

  return (
    <div 
      id="evacuation-alert-modal-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto cursor-pointer"
    >
      <div 
        id="modal-sms-evacuation-gateway"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl bg-slate-900 border border-red-500/40 rounded-2xl shadow-2xl overflow-hidden my-8 cursor-default"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-red-500/20 bg-gradient-to-r from-red-950/70 via-slate-900 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400">
              <Radio className="w-5 h-5 animate-pulse text-red-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  {isAr ? 'بوابة إشعارات الإخلاء وبث الطوارئ الخلوي (Cell Broadcast)' : 'Carrier SMS & Cell Broadcast Evacuation Gateway'}
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40 font-bold">
                  PRIORITY: HIGH
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {isAr 
                  ? 'بث تحذيرات الإخلاء الفوري عبر شبكات متعاملي الهاتف النقال (Mobilis • Djezzy • Ooredoo)'
                  : 'Targeted civilian evacuation alerts interfacing with Algerian mobile carrier base stations'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6">
          {/* Target Selection & Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-red-400" />
                <span>{isAr ? 'الولاية المستهدفة (النطاق الجغرافي الخلوي):' : 'Targeted Wilaya (Geofence):'}</span>
              </label>
              <select
                value={selectedWilayaCode}
                onChange={(e) => handleWilayaChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 font-medium focus:outline-none focus:border-red-500 transition"
              >
                {ALGERIA_WILAYAS.map((w) => (
                  <option key={w.code} value={w.code}>
                    {w.code} - {isAr ? w.nameAr : w.nameEn} ({isAr ? `مؤشر خطر الغابات: ${w.currentRiskIndex}%` : `Forest Risk: ${w.currentRiskIndex}%`})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-amber-400" />
                <span>{isAr ? 'مجموعة المستلمين المبرمجة:' : 'Recipient Group Target:'}</span>
              </label>
              <div className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-amber-300 font-mono flex items-center justify-between">
                <span>ALL_CIVILIANS_IN_CELL</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-sans font-bold">
                  {isAr ? 'بث أبراج عام' : 'Cell Broadcast'}
                </span>
              </div>
            </div>
          </div>

          {/* Carrier Gateways Simulation Status */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
              <TowerControl className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isAr ? 'بوابات متعاملي الهاتف النقال المربوطة بالمنظومة:' : 'Connected Carrier Gateways (Algeria Telecom Grid):'}</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {/* Mobilis */}
              <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-950/20 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-emerald-300">ATM Mobilis</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div className="text-[11px] text-slate-400 font-mono">MCC/MNC: 603-01</div>
                <div className="text-[10px] text-emerald-400 font-medium mt-1">
                  {isAr ? 'بوابة البث الخلوي: نشطة' : 'CB Gateway: Active'}
                </div>
              </div>

              {/* Djezzy */}
              <div className="p-3 rounded-xl border border-red-500/30 bg-red-950/20 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-red-300">Djezzy (OTA)</span>
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                </div>
                <div className="text-[11px] text-slate-400 font-mono">MCC/MNC: 603-02</div>
                <div className="text-[10px] text-red-400 font-medium mt-1">
                  {isAr ? 'بوابة البث الخلوي: نشطة' : 'CB Gateway: Active'}
                </div>
              </div>

              {/* Ooredoo */}
              <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-950/20 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-amber-300">Ooredoo (WTA)</span>
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                </div>
                <div className="text-[11px] text-slate-400 font-mono">MCC/MNC: 603-03</div>
                <div className="text-[10px] text-amber-400 font-medium mt-1">
                  {isAr ? 'بوابة البث الخلوي: نشطة' : 'CB Gateway: Active'}
                </div>
              </div>
            </div>
          </div>

          {/* Payload Message Editor */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                <span>{isAr ? 'نص رسالة الإخلاء العاجلة (يصل كإشعار منبثق فوري لجميع الهواتف):' : 'Emergency Evacuation Message Content (Pops up directly on civilian screens):'}</span>
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                {message.length} {isAr ? 'حرف' : 'chars'}
              </span>
            </div>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 focus:outline-none focus:border-red-500 leading-relaxed font-sans"
              placeholder={isAr ? 'اكتب نص رسالة الإخلاء العاجلة هنا...' : 'Enter evacuation instructions...'}
            />
            <div className="flex items-center gap-4 text-[11px] text-slate-400 mt-1.5 font-mono">
              <span>GeofencedZoneID: DZ-ZONE-W{selectedWilayaCode}-HIGH-RISK</span>
              <span>•</span>
              <span className="text-red-400">Priority: High</span>
            </div>
          </div>

          {/* Dispatch Results Receipt Card */}
          {lastResult && (
            <div className="p-4 rounded-xl border border-emerald-500/50 bg-emerald-950/30 space-y-3">
              <div className="flex items-center justify-between border-b border-emerald-500/30 pb-2.5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="font-bold text-sm text-white">
                    {isAr ? 'تم إرسال بث الإخلاء بنجاح' : 'Evacuation Cell Broadcast Dispatched'}
                  </span>
                  <span className="text-xs font-mono text-emerald-300 font-bold bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-500/30">
                    {lastResult.alertId}
                  </span>
                </div>
                <span className="text-xs text-slate-300 font-mono">
                  {lastResult.executionTimeMs}ms latency
                </span>
              </div>

              <p className="text-xs text-emerald-200 leading-relaxed">
                {isAr ? lastResult.summaryAr : lastResult.summaryEn}
              </p>

              {/* Carrier Breakdown Grid */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                {lastResult.carrierReceipts.map((rcpt) => (
                  <div key={rcpt.carrier} className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-700 text-xs">
                    <div className="flex items-center justify-between text-slate-200 font-bold mb-1">
                      <span>{rcpt.carrier}</span>
                      <span className="text-emerald-400 text-[10px] font-mono font-bold">OK</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {isAr ? 'الأبراج المفعلة:' : 'Active Towers:'} <span className="text-white font-mono">{rcpt.targetedCellTowers}</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {isAr ? 'التغطية التقديرية:' : 'Civilians Reached:'} <span className="text-amber-300 font-mono font-semibold">{rcpt.estimatedReach.toLocaleString()}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono truncate mt-1">
                      {rcpt.trackingTicket}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            <span>
              {isAr 
                ? 'يتطلب صلاحية القيادة المركزية (L3 CentralCommand) لتفادي البلاغات العشوائية' 
                : 'Restricted to Central Command (L3) to prevent unauthorized alerts'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition"
            >
              {isAr ? 'إغلاق' : 'Close'}
            </button>

            <button
              id="btn-dispatch-evacuation-sms"
              onClick={handleDispatch}
              disabled={isSending || !message.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-red-600 to-amber-600 text-white hover:from-red-500 hover:to-amber-500 transition shadow-lg shadow-red-950/50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{isAr ? 'جارٍ الاتصال بأبراج البث الخلوي...' : 'Broadcasting across carrier towers...'}</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>{isAr ? 'إطلاق بث الإخلاء الطارئ لجميع الهواتف' : 'Dispatch Emergency Evacuation Broadcast'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
