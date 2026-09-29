// AWIS — Tactical Offline Mesh Coordination Panel (WebRTC / P2P FFT)
// Provides decentralized field coordination, Friendly Force Tracking (FFT),
// emergency SOS distress alerts, and zero-latency local radio messaging.

import React, { useState, useEffect, useRef } from 'react';
import { 
  Radio, 
  WifiOff, 
  ShieldAlert, 
  Send, 
  MapPin, 
  Users, 
  Flame, 
  Truck, 
  AlertTriangle, 
  Volume2, 
  VolumeX, 
  CheckCircle2, 
  Clock, 
  Battery, 
  Droplets, 
  Compass, 
  X, 
  RefreshCw,
  Signal,
  Shield,
  LifeBuoy
} from 'lucide-react';
import { 
  tacticalMeshService, 
  TacticalPeerUnit, 
  TacticalMessage, 
  MeshNetworkStats,
  UnitType,
  MessageType
} from '../../services/TacticalMeshService';
import { Language } from '../../types';

interface TacticalMeshPanelProps {
  currentLang?: Language;
  onClose: () => void;
  onFocusUnit?: (coords: { lat: number; lng: number }) => void;
  className?: string;
}

export const TacticalMeshPanel: React.FC<TacticalMeshPanelProps> = ({
  currentLang = 'ar',
  onClose,
  onFocusUnit,
  className = ''
}) => {
  const isAr = currentLang === 'ar';
  const [activeTab, setActiveTab] = useState<'fft' | 'messages' | 'sos'>('fft');
  const [units, setUnits] = useState<TacticalPeerUnit[]>([]);
  const [messages, setMessages] = useState<TacticalMessage[]>([]);
  const [stats, setStats] = useState<MeshNetworkStats>(tacticalMeshService.getStats());
  const [messageInput, setMessageInput] = useState<string>('');
  const [isSirenActive, setIsSirenActive] = useState<boolean>(false);
  const [sosArmed, setSosArmed] = useState<boolean>(false);
  const [sosCooldownSeconds, setSosCooldownSeconds] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncSuccessToast, setSyncSuccessToast] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync state from service
  const updateStateFromService = () => {
    setUnits(tacticalMeshService.getAllPeers());
    setMessages(tacticalMeshService.getMessages());
    setStats(tacticalMeshService.getStats());
    setIsSirenActive(tacticalMeshService.isSirenPlaying());
  };

  useEffect(() => {
    updateStateFromService();
    const unsubscribe = tacticalMeshService.subscribe(updateStateFromService);
    return () => unsubscribe();
  }, []);

  // Auto-scroll messages
  useEffect(() => {
    if (activeTab === 'messages') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  // Handle Send Message
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageInput.trim()) return;

    tacticalMeshService.sendMessage(messageInput, 'chat', 'routine');
    setMessageInput('');
  };

  // Quick Tactical Message Presets
  const sendQuickTemplate = (text: string, type: MessageType = 'chat', priority: 'routine' | 'urgent' = 'urgent') => {
    tacticalMeshService.sendMessage(text, type, priority);
  };

  // SOS Trigger
  const handleTriggerSOS = () => {
    tacticalMeshService.triggerEmergencySOS();
    setSosArmed(false);
    setSosCooldownSeconds(10);
    const interval = setInterval(() => {
      setSosCooldownSeconds(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleCancelSOS = () => {
    tacticalMeshService.clearEmergencySOS();
    setSosArmed(false);
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    const count = await tacticalMeshService.syncPendingMessagesToServer();
    setIsSyncing(false);
    setSyncSuccessToast(
      isAr 
        ? `تمت مزامنة ${count} بلاغات مع السيرفر الرئيسي بنجاح!` 
        : `Successfully synced ${count} reports to central server!`
    );
    setTimeout(() => setSyncSuccessToast(null), 3500);
  };

  const localUnit = units.find(u => u.isLocalDevice);
  const isLocalSosActive = localUnit?.status === 'sos';
  const anyUnitInSos = units.some(u => u.status === 'sos');

  const getUnitTypeBadge = (type: UnitType) => {
    switch (type) {
      case 'protection_civile':
        return { label: isAr ? 'حماية مدنية' : 'DGPC Unit', color: 'bg-red-500/20 text-red-300 border-red-500/40' };
      case 'forets':
        return { label: isAr ? 'غابات' : 'Forestry', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
      case 'command_truck':
        return { label: isAr ? 'قيادة وتحكم' : 'Command Truck', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
      case 'ambulance':
        return { label: isAr ? 'إسعاف طبي' : 'Ambulance', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' };
      default:
        return { label: isAr ? 'فرقة ميدانية' : 'Field Team', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' };
    }
  };

  return (
    <div 
      id="tactical-mesh-panel-root"
      className={`fixed bottom-4 left-3 right-3 sm:left-auto sm:right-4 sm:w-[500px] z-[9990] bg-slate-950/95 backdrop-blur-xl border border-cyan-500/50 rounded-2xl shadow-2xl overflow-hidden font-mono flex flex-col pointer-events-auto ring-1 ring-cyan-500/30 max-h-[85vh] ${className}`}
    >
      {/* Top Header Bar */}
      <div className="shrink-0 p-3 bg-gradient-to-r from-cyan-950/80 via-slate-900 to-slate-950 border-b border-cyan-500/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-white text-xs sm:text-sm">
                {isAr ? 'الشبكة التكتيكية الميدانية (P2P Mesh)' : 'Tactical Field Mesh Coordination'}
              </h3>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-200 border border-cyan-500/40 font-bold">
                OFFLINE
              </span>
            </div>
            <p className="text-[10px] text-cyan-300/80">
              {isAr ? 'تنسيق مباشر بدون إنترنت 4G • WebRTC DataChannel' : 'Direct Decentralized Comms • No 4G Required'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Siren toggle */}
          {isSirenActive && (
            <button
              onClick={() => tacticalMeshService.stopSirenAlarm()}
              className="p-1.5 rounded-lg bg-red-600 text-white animate-bounce cursor-pointer"
              title={isAr ? 'كتم صوت صافرة الإنذار' : 'Silence Alarm Siren'}
            >
              <Volume2 className="w-4 h-4" />
            </button>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mesh Network Status Banner */}
      <div className="shrink-0 px-3 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </span>
          <span className="text-slate-300 font-semibold">
            {isAr 
              ? `📡 شبكة حية: ${stats.connectedPeersCount} أجهزة متصلة`
              : `📡 Live Mesh: ${stats.connectedPeersCount} Connected Nodes`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400">
            {stats.pendingSyncCount > 0 
              ? (isAr ? `${stats.pendingSyncCount} معلقة للمزامنة` : `${stats.pendingSyncCount} pending sync`)
              : (isAr ? '✓ متزامن بالكامل' : '✓ Fully Synced')}
          </span>
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
            title={isAr ? 'مزامنة مع السيرفر الرئيسي' : 'Sync to Central Server'}
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* SOS Active Emergency Warning Banner */}
      {anyUnitInSos && (
        <div className="shrink-0 p-2.5 bg-red-950/90 border-b border-red-500/60 flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2 text-red-200 text-xs font-bold">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span>
              {isAr ? '⚠️ إنذار استغاثة (SOS) نشط داخل الشبكة الميدانية!' : '⚠️ Active SOS Distress Signal on Mesh!'}
            </span>
          </div>
          <button
            onClick={() => setActiveTab('sos')}
            className="px-2 py-0.5 rounded bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold cursor-pointer"
          >
            {isAr ? 'عرض الطوارئ' : 'View Emergency'}
          </button>
        </div>
      )}

      {/* Sync Success Toast */}
      {syncSuccessToast && (
        <div className="shrink-0 p-2 bg-emerald-950/90 border-b border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>{syncSuccessToast}</span>
        </div>
      )}

      {/* Tabs Bar */}
      <div className="shrink-0 flex border-b border-slate-800 bg-slate-900/60 p-1 gap-1">
        <button
          onClick={() => setActiveTab('fft')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'fft'
              ? 'bg-cyan-600 text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>{isAr ? 'القوات الصديقة (FFT)' : 'Friendly Forces (FFT)'}</span>
          <span className="text-[10px] px-1 rounded bg-black/30 font-mono">
            {units.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('messages')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'messages'
              ? 'bg-cyan-600 text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          <span>{isAr ? 'البلاغات اللاسلكية' : 'Radio Feed'}</span>
          <span className="text-[10px] px-1 rounded bg-black/30 font-mono">
            {messages.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('sos')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'sos'
              ? 'bg-red-600 text-white shadow'
              : 'text-red-400 hover:text-red-300 hover:bg-red-950/40'
          }`}
        >
          <LifeBuoy className="w-3.5 h-3.5 animate-pulse" />
          <span>{isAr ? 'نداء النجدة (SOS)' : 'SOS Distress'}</span>
        </button>
      </div>

      {/* TAB 1: Friendly Force Tracking (FFT) */}
      {activeTab === 'fft' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 max-h-[380px]">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>{isAr ? 'فرق الحماية المدنية ومحافظة الغابات المتصلة:' : 'Connected Protection & Forestry Units:'}</span>
            <span className="text-[10px] text-cyan-400">تحديث GPS لحظي</span>
          </div>

          {units.map((unit) => {
            const badge = getUnitTypeBadge(unit.type);
            const isSos = unit.status === 'sos';

            return (
              <div 
                key={unit.id}
                className={`p-2.5 rounded-xl border transition ${
                  isSos 
                    ? 'bg-red-950/80 border-red-500 ring-1 ring-red-500' 
                    : unit.isLocalDevice 
                    ? 'bg-cyan-950/40 border-cyan-500/60' 
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[9px] px-1.5 py-0.2 rounded border font-bold ${badge.color}`}>
                        {badge.label}
                      </span>
                      {unit.isLocalDevice && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-900 text-cyan-200 border border-cyan-400 font-bold">
                          {isAr ? 'جهازك' : 'YOU'}
                        </span>
                      )}
                      {isSos && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-600 text-white font-bold animate-ping">
                          SOS
                        </span>
                      )}
                    </div>
                    <h4 className="text-white text-xs font-bold mt-1">
                      {isAr ? unit.callsign : unit.callsignEn}
                    </h4>
                  </div>

                  <button
                    onClick={() => onFocusUnit?.(unit.coordinates)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-cyan-600 text-slate-300 hover:text-white transition cursor-pointer"
                    title={isAr ? 'تحديد الموقع على الخريطة' : 'Locate on GIS Map'}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Telemetry Grid */}
                <div className="grid grid-cols-4 gap-1.5 mt-2 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400">
                  <div className="flex items-center gap-1">
                    <Battery className="w-3 h-3 text-emerald-400" />
                    <span>{unit.batteryLevel}%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Droplets className="w-3 h-3 text-cyan-400" />
                    <span>{unit.waterTankLevelPct}%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Compass className="w-3 h-3 text-amber-400" />
                    <span>{unit.altitude}m</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-indigo-400" />
                    <span>{unit.personnelCount}</span>
                  </div>
                </div>

                {/* Coordinates footer */}
                <div className="mt-1 text-[9px] text-slate-400 font-mono">
                  {unit.coordinates.lat.toFixed(4)}° N, {unit.coordinates.lng.toFixed(4)}° E
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: Tactical Radio Feed & Messages */}
      {activeTab === 'messages' && (
        <div className="flex-1 flex flex-col max-h-[420px]">
          {/* Quick Tactical Templates Bar */}
          <div className="p-2 bg-slate-900 border-b border-slate-800 flex gap-1.5 overflow-x-auto text-[10px] shrink-0">
            <button
              onClick={() => sendQuickTemplate(
                isAr ? 'طلب دعم صهريج مياه إضافي (10,000L) لخط الدفاع المائي.' : 'Requesting 10kL water tanker backup.'
              )}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 whitespace-nowrap cursor-pointer border border-cyan-900"
            >
              🚒 {isAr ? 'طلب صهريج مياه' : 'Water Tanker'}
            </button>
            <button
              onClick={() => sendQuickTemplate(
                isAr ? 'تأكيد تطويق بؤرة النيران بنجاح. الوضع تحت السيطرة.' : 'Fire perimeter secured. Under control.',
                'chat',
                'routine'
              )}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 whitespace-nowrap cursor-pointer border border-emerald-900"
            >
              ✅ {isAr ? 'تأكيد السيطرة' : 'Controlled'}
            </button>
            <button
              onClick={() => sendQuickTemplate(
                isAr ? 'تحذير: الرياح تدفع ألسنة اللهب نحو المنحدر الجنوبي.' : 'Warning: Wind pushing fire down south slope.'
              )}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 whitespace-nowrap cursor-pointer border border-amber-900"
            >
              ⚠️ {isAr ? 'امتداد المنحدر' : 'Slope Advance'}
            </button>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[260px]">
            {messages.map((msg) => {
              const isSos = msg.priority === 'sos';
              const isUrgent = msg.priority === 'urgent';
              const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

              return (
                <div 
                  key={msg.id}
                  className={`p-2.5 rounded-xl border text-xs ${
                    isSos 
                      ? 'bg-red-950/80 border-red-500 text-red-100'
                      : isUrgent 
                      ? 'bg-amber-950/40 border-amber-500/50 text-amber-100'
                      : 'bg-slate-900/70 border-slate-800 text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <span className="font-bold text-cyan-300">{msg.senderCallsign}</span>
                    <div className="flex items-center gap-1">
                      <span>{timeStr}</span>
                      {msg.syncedToServer ? (
                        <span title="Synced to 4G Server">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        </span>
                      ) : (
                        <span title="Stored in Local IndexedDB">
                          <Clock className="w-3 h-3 text-amber-400" />
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="leading-relaxed">{msg.text}</p>
                  {msg.coordinates && (
                    <div className="mt-1 flex items-center justify-between text-[9px] text-slate-400 pt-1 border-t border-slate-800/60 font-mono">
                      <span>📍 {msg.coordinates.lat.toFixed(4)}° N, {msg.coordinates.lng.toFixed(4)}° E</span>
                      <button
                        onClick={() => onFocusUnit?.(msg.coordinates!)}
                        className="text-cyan-400 hover:underline cursor-pointer"
                      >
                        {isAr ? 'إظهار الموقع' : 'Show on Map'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input Form */}
          <form onSubmit={handleSendMessage} className="p-2 bg-slate-900/90 border-t border-slate-800 flex gap-1.5 shrink-0">
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder={isAr ? 'اكتب بلاغاً لاسلكياً للشبكة الميدانية...' : 'Type tactical message...'}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1 transition cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isAr ? 'إرسال' : 'Send'}</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: Emergency Distress Signal (SOS) */}
      {activeTab === 'sos' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[380px]">
          <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-xs text-red-200 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-red-400 text-sm">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
              <span>{isAr ? 'بروتوكول طلب النجدة الميداني (SOS MESH)' : 'Field Emergency Distress Protocol'}</span>
            </div>
            <p className="text-[11px] text-red-300/80 leading-relaxed">
              {isAr 
                ? 'استخدم هذا الزر فقط عند انحصار الفرقة أو شاحنة الإطفاء داخل ألسنة اللهب، أو عند وقوع إصابات حرجة تتطلب إخلاءً فورياً. سيتم بث إحداثيات موقعك اللحظي وإطلاق صافرة الإنذار على كافة أجهزة الشبكة.'
                : 'Use only when trapped by fire or facing imminent danger. Broadcasts live GPS coordinates and sounds siren on all connected mesh devices.'}
            </p>
          </div>

          {/* SOS Trigger Actions */}
          <div className="flex flex-col items-center justify-center p-4 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-3">
            {isLocalSosActive ? (
              <div className="w-full space-y-3 text-center">
                <div className="p-3 rounded-xl bg-red-600 text-white font-bold animate-pulse text-sm">
                  🚨 {isAr ? 'نداء الاستغاثة نشط حالياً لجهازك!' : 'SOS DISTRESS ACTIVELY BROADCASTING!'}
                </div>
                <button
                  onClick={handleCancelSOS}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition cursor-pointer"
                >
                  {isAr ? 'إلغاء نداء الاستغاثة وتأمين الفرقة' : 'Clear Emergency SOS (Secure Site)'}
                </button>
              </div>
            ) : sosArmed ? (
              <div className="w-full space-y-2 text-center">
                <p className="text-xs text-red-400 font-bold">
                  {isAr ? '⚠️ تأكيد إطلاق نداء الاستغاثة لجميع الفرق الميدانية؟' : '⚠️ Confirm SOS broadcast to all units?'}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleTriggerSOS}
                    className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-sm shadow-xl animate-pulse cursor-pointer"
                  >
                    {isAr ? 'تأكيد إطلاق SOS الآن' : 'CONFIRM SOS NOW'}
                  </button>
                  <button
                    onClick={() => setSosArmed(false)}
                    className="py-3 px-4 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
                  >
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setSosArmed(true)}
                disabled={sosCooldownSeconds > 0}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black text-sm shadow-2xl transition flex items-center justify-center gap-2 cursor-pointer ring-2 ring-red-500/50 hover:ring-red-400 disabled:opacity-50"
              >
                <LifeBuoy className="w-5 h-5 animate-spin" />
                <span>
                  {sosCooldownSeconds > 0 
                    ? `${isAr ? 'انتظر' : 'Wait'} ${sosCooldownSeconds}s` 
                    : (isAr ? '🆘 طلب نجدة عاجل (SOS MESH)' : '🆘 EMERGENCY DISTRESS (SOS)')}
                </span>
              </button>
            )}

            {/* Siren test button */}
            <div className="w-full pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800">
              <span>{isAr ? 'اختبار صافرة الإنذار الصوتية:' : 'Test Audio Siren:'}</span>
              <button
                onClick={() => {
                  if (isSirenActive) {
                    tacticalMeshService.stopSirenAlarm();
                  } else {
                    tacticalMeshService.triggerSirenAlarm(true);
                  }
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5 cursor-pointer"
              >
                {isSirenActive ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
                <span>{isSirenActive ? (isAr ? 'إيقاف الصافرة' : 'Stop Siren') : (isAr ? 'تجربة الصافرة' : 'Play Siren')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="shrink-0 p-2 bg-slate-950 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
        <span>Channel: {stats.networkChannelName}</span>
        <span>IndexedDB: Active</span>
      </div>
    </div>
  );
};
