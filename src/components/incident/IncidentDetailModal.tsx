import React, { useState, useMemo } from 'react';
import { 
  X, 
  Flame, 
  Wind, 
  Clock, 
  MapPin, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Truck, 
  Users, 
  AlertTriangle, 
  Radio, 
  Satellite, 
  Camera, 
  Send,
  Sparkles,
  Thermometer,
  Compass,
  FileCheck,
  Cpu,
  Scale,
  Mountain,
  Droplets,
  Sliders,
  BarChart3,
  ChevronRight,
  Navigation,
  Route
} from 'lucide-react';
import { WildfireIncident, EmergencyResource, Language } from '../../types';
import { translations } from '../../i18n/translations';
import { ExplainableAiBreakdown } from './ExplainableAiBreakdown';
import { AiAssistedDispatchPanel } from './AiAssistedDispatchPanel';
import { StrategicDispatchPanel } from './StrategicDispatchPanel';
import { computeDistanceKm, computeTravelTimeMinutes, evaluateOptimalUnits } from '../../services/aiDispatchEngine';

interface IncidentDetailModalProps {
  incident: WildfireIncident;
  onClose: () => void;
  onConfirmIncident: (id: string, notes: string) => void;
  onRejectIncident: (id: string, reason: string) => void;
  onDispatchResource: (incidentId: string, resourceId: string) => void;
  availableResources: EmergencyResource[];
  currentLang: Language;
}

export const IncidentDetailModal: React.FC<IncidentDetailModalProps> = ({
  incident,
  onClose,
  onConfirmIncident,
  onRejectIncident,
  onDispatchResource,
  availableResources,
  currentLang
}) => {
  const t = translations[currentLang];
  const [activeTab, setActiveTab] = useState<'overview' | 'xai' | 'detection' | 'spread' | 'strategic-dispatch' | 'dispatch' | 'validation'>('overview');
  const [expertNote, setExpertNote] = useState('');
  const [actionSuccessMessage, setActionSuccessMessage] = useState('');

  // Proximity-based AI dispatch optimization for top 3 units
  const topOptimalUnits = useMemo(() => {
    return evaluateOptimalUnits(incident, availableResources);
  }, [incident, availableResources]);

  const handleConfirm = () => {
    onConfirmIncident(incident.id, expertNote || 'Validated by Human Duty Commander based on multi-sensor convergence.');
    setActionSuccessMessage('Incident confirmed and escalated to Active Response.');
  };

  const handleReject = () => {
    onRejectIncident(incident.id, expertNote || 'Classified as controlled agricultural clearing / false positive.');
    setActionSuccessMessage('Incident rejected and logged as false positive for AI model fine-tuning.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Bar */}
        <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400">
              <Flame className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800">
                  {incident.code}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {incident.status.replace('_', ' ')}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Confidence: {incident.confidenceScore}%
                </span>
              </div>
              <h2 className="text-lg font-bold text-white mt-0.5">
                {currentLang === 'ar' ? incident.titleAr : incident.title}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              id="header-ai-assisted-dispatch-btn"
              onClick={() => setActiveTab('strategic-dispatch')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-950/40 transition cursor-pointer"
              title="Open Strategic Dispatch (Optimal Routes Map)"
            >
              <Navigation className="w-3.5 h-3.5 text-slate-950 fill-current" />
              <span>{currentLang === 'ar' ? 'الإرسال الاستراتيجي (Strategic Dispatch)' : 'Strategic Dispatch'}</span>
              <span className="px-1.5 py-0.2 rounded bg-amber-700/40 text-slate-950 text-[10px] font-mono font-black">
                MINI MAP
              </span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 text-xs px-4 overflow-x-auto">
          {[
            { id: 'overview', label: currentLang === 'ar' ? 'نظرة عامة تكتيكية' : currentLang === 'fr' ? 'Aperçu Tactique' : 'Tactical Overview', icon: Flame },
            { id: 'strategic-dispatch', label: currentLang === 'ar' ? 'الإرسال الاستراتيجي (Strategic Dispatch)' : currentLang === 'fr' ? 'Déploiement Stratégique' : 'Strategic Dispatch', icon: Navigation },
            { id: 'xai', label: currentLang === 'ar' ? 'تفسير الذكاء الاصطناعي (Explainable AI)' : currentLang === 'fr' ? 'IA Explicable (Explainable AI)' : 'Explainable AI', icon: Cpu },
            { id: 'detection', label: currentLang === 'ar' ? `دمج الإشارات (${incident.detectionSources.length})` : `Multi-Source Fusion (${incident.detectionSources.length})`, icon: Radio },
            { id: 'spread', label: currentLang === 'ar' ? 'مسار الانتشار والمحيط' : 'Spread Prediction & Exposure', icon: Wind },
            { id: 'validation', label: currentLang === 'ar' ? 'التحقق البشري' : 'Expert-in-the-Loop', icon: FileCheck }
          ].map((tab) => {
            const Icon = tab.icon;
            const isTabActive = activeTab === tab.id || (tab.id === 'strategic-dispatch' && activeTab === 'dispatch');
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-2.5 font-medium border-b-2 transition whitespace-nowrap cursor-pointer ${
                  isTabActive
                    ? 'border-emerald-500 text-emerald-400 bg-slate-800/40 font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Action Message Banner */}
        {actionSuccessMessage && (
          <div className="bg-emerald-950/80 border-b border-emerald-600/40 px-4 py-2 text-xs text-emerald-200 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              {actionSuccessMessage}
            </span>
            <button onClick={() => setActionSuccessMessage('')} className="text-emerald-400 hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-slate-200 text-sm">
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Quick Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-red-400" /> Wilaya & Zone
                  </div>
                  <div className="text-sm font-bold text-white mt-1">
                    {incident.wilaya}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {incident.locationName}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Thermometer className="w-3.5 h-3.5 text-orange-400" /> Meteorology
                  </div>
                  <div className="text-sm font-bold text-orange-300 mt-1">
                    {incident.temperatureC}°C | {incident.humidityPercent}% RH
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Sirocco Heat Index High
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Wind className="w-3.5 h-3.5 text-sky-400" /> Wind Velocity
                  </div>
                  <div className="text-sm font-bold text-sky-300 mt-1">
                    {incident.windSpeedKmH} km/h ({incident.windDirectionCardinal})
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Heading {incident.windDirectionDegrees}°
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-amber-400" /> Burned Extent
                  </div>
                  <div className="text-sm font-bold text-amber-300 mt-1">
                    ~{incident.estimatedBurnedHectares} Hectares
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Initial front expanding
                  </div>
                </div>
              </div>

              {/* AI-Assisted Dispatch: Immediate Top 3 Optimal Units Recommendation Box */}
              <div 
                id="overview-ai-assisted-dispatch-card"
                className="p-4 rounded-xl bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-900 border border-amber-500/40 shadow-xl space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-300 font-mono">
                          {currentLang === 'ar' ? 'الإرسال التكتيكي الذكي (AI-Assisted Dispatch)' : 'AI-Assisted Dispatch'}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold">
                          TOP 3 OPTIMAL UNITS
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">
                        {currentLang === 'ar'
                          ? 'حساب القرب الميداني وتقدير زمن الوصول (ETA) لاقتراح أفضل 3 وحدات تدخل ميداني نحو بؤرة الحريق.'
                          : 'Evaluates real-time proximity and estimated travel time to suggest the top 3 optimal units for immediate deployment.'}
                      </p>
                    </div>
                  </div>

                  <button
                    id="overview-ai-assisted-dispatch-btn"
                    onClick={() => setActiveTab('strategic-dispatch')}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-amber-950/40 whitespace-nowrap self-start sm:self-auto"
                  >
                    <Navigation className="w-3.5 h-3.5 fill-current" />
                    <span>{currentLang === 'ar' ? 'عرض خريطة الإرسال الاستراتيجي' : 'Strategic Dispatch Map'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Top 3 Optimal Units Cards Grid with Highlighted ETA */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  {topOptimalUnits.map((rec, idx) => {
                    const isAssigned = incident.assignedResources.includes(rec.resource.id);
                    return (
                      <div 
                        key={rec.resource.id}
                        className={`p-3 rounded-xl border flex flex-col justify-between space-y-2 transition ${
                          isAssigned
                            ? 'bg-emerald-950/40 border-emerald-600 text-emerald-100'
                            : 'bg-slate-800/80 border-slate-700 text-slate-200 hover:border-amber-500/50'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded ${
                              idx === 0 
                                ? 'bg-amber-500 text-slate-950' 
                                : idx === 1 
                                ? 'bg-sky-500 text-slate-950' 
                                : 'bg-indigo-500 text-slate-950'
                            }`}>
                              #{idx + 1} {idx === 0 ? 'RAPID ATTACK' : idx === 1 ? 'AIR SUPPORT' : 'CONTAINMENT'}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-amber-300">
                              {rec.distanceKm} km
                            </span>
                          </div>

                          <div className="font-bold text-xs text-white mt-1.5 flex items-center gap-1.5">
                            <Truck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span className="font-mono text-emerald-400">{rec.resource.code}</span>
                            <span className="truncate">{currentLang === 'ar' ? rec.resource.nameAr : rec.resource.name}</span>
                          </div>

                          {/* Highlighted Estimated Travel Time (ETA) */}
                          <div className="mt-1.5 p-1.5 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-400" />
                              {t.etaArrival}
                            </span>
                            <span className="text-xs font-black font-mono text-amber-300">
                              {rec.travelTimeMinutes} min
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            onDispatchResource(incident.id, rec.resource.id);
                            setActionSuccessMessage(
                              currentLang === 'ar'
                                ? `تم إرسال ${rec.resource.code} نحو موقع الحريق. زمن الوصول المقدر: ${rec.travelTimeMinutes} دقيقة.`
                                : `Dispatched unit ${rec.resource.code}. Estimated travel time: ${rec.travelTimeMinutes} min.`
                            );
                          }}
                          disabled={isAssigned}
                          className={`w-full py-1.5 rounded-lg font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
                            isAssigned
                              ? 'bg-emerald-700/40 text-emerald-300 cursor-default'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                          }`}
                        >
                          {isAssigned ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{currentLang === 'ar' ? 'تم الإرسال' : 'Dispatched'}</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              <span>{currentLang === 'ar' ? 'إرسال الوحدة' : 'Deploy Unit'}</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Explainable AI (XAI) Section: Fire Risk Score & Contributing Variables Horizontal Bar Charts */}
              <div 
                id="explainable-ai-breakdown-panel"
                data-testid="explainable-ai-breakdown-panel"
                className="p-4 rounded-xl bg-slate-900/90 border border-indigo-500/40 shadow-xl space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                      <Cpu className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 font-mono">
                          {currentLang === 'ar' ? 'لوحة تفسير الذكاء الاصطناعي (Explainable AI Breakdown)' : 'Explainable AI Breakdown Panel'}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono">
                          Fire Risk Score: {incident.riskLevel === 'critical' ? '92' : '84'}/100
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">
                        {currentLang === 'ar'
                          ? 'تفكيك مرئي للعوامل المساهمة (الرياح، رطوبة الوقود، الحرارة، والتضاريس) وأوزانها النسبية في مؤشر الخطر (0-100)'
                          : 'Visual breakdown of contributing variables and their weighted influences on the Fire Risk Score (0-100)'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveTab('xai')}
                    className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer shadow-md self-start sm:self-auto"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>{currentLang === 'ar' ? 'محاكي الحساسية التفاعلي (What-If)' : currentLang === 'fr' ? 'Simulateur What-If' : 'What-If Sensitivity Simulator'}</span>
                  </button>
                </div>

                {/* Fire Risk Score (0-100) Summary Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-slate-950/70 border border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl font-black font-mono text-white flex items-baseline gap-1">
                      <span className="text-red-400">{incident.riskLevel === 'critical' ? '92' : '84'}</span>
                      <span className="text-xs text-slate-500 font-normal">/ 100</span>
                    </div>
                    <div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold uppercase bg-red-500/20 text-red-300 border border-red-500/40">
                        {incident.riskLevel === 'critical' ? 'CRITICAL RISK (حرج للغاية)' : 'EXTREME RISK (شديد)'}
                      </span>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {currentLang === 'ar' ? 'نموذج روثيرميل المعاير لغابات الجزائر' : 'Calibrated Rothermel + Canadian FWI Multi-Factor Engine'}
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-slate-400 flex items-center gap-4 font-mono">
                    <div>{currentLang === 'ar' ? 'إجمالي الأوزان:' : 'Total Weight:'} <strong className="text-emerald-400">100%</strong></div>
                    <div>{currentLang === 'ar' ? 'المتغيرات النشطة:' : 'Active Inputs:'} <strong className="text-white">6 Telemetry Sensors</strong></div>
                  </div>
                </div>

                {/* Visual Horizontal Bar Charts for Contributing Variables */}
                <div className="space-y-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
                      {currentLang === 'ar' ? 'مخطط بياني شريطي أفقي للأوزان المساهمة' : 'Horizontal Bar Charts: Weighted Influence on Risk Score'}
                    </span>
                    <span>{currentLang === 'ar' ? 'الوزن النسبي (%) والمساهمة (نقاط)' : 'Weighted Influence (%) & Contribution (+pts)'}</span>
                  </div>

                  {/* 1. Wind Speed Horizontal Bar */}
                  <div 
                    id="xai-row-wind-speed"
                    data-testid="xai-row-wind-speed"
                    className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/60 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Wind className="w-4 h-4 text-red-400" />
                        <span className="font-semibold text-white">
                          {currentLang === 'ar' ? 'سرعة الرياح (Wind Speed)' : 'Wind Speed'}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">({incident.windSpeedKmH} km/h • {incident.windDirectionCardinal})</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-xs font-bold text-red-400">28% Weighted Influence</span>
                        <span className="text-[11px] text-slate-300 font-bold bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">+25.8 pts</span>
                      </div>
                    </div>
                    {/* Horizontal Bar Chart */}
                    <div className="space-y-1">
                      <div className="w-full h-3.5 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800 shadow-inner">
                        <div 
                          className="h-full bg-gradient-to-r from-red-600 to-rose-400 rounded-full transition-all duration-500" 
                          style={{ width: '28%' }} 
                          role="progressbar"
                          aria-label="Wind speed weighted influence on Fire Risk Score"
                          aria-valuenow={28}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        />
                      </div>
                      <div className="flex justify-between text-[9px] text-slate-500 font-mono px-0.5">
                        <span>0%</span>
                        <span>10%</span>
                        <span>20%</span>
                        <span className="text-red-400 font-bold">▲ 28% (Dominant)</span>
                        <span>40%</span>
                        <span>100%</span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Fuel Moisture Horizontal Bar */}
                  <div 
                    id="xai-row-fuel-moisture"
                    data-testid="xai-row-fuel-moisture"
                    className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/60 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Droplets className="w-4 h-4 text-orange-400" />
                        <span className="font-semibold text-white">
                          {currentLang === 'ar' ? 'رطوبة الوقود (Fuel Moisture)' : 'Fuel Moisture'}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">(16% FMI • Desiccated)</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-xs font-bold text-orange-400">24% Weighted Influence</span>
                        <span className="text-[11px] text-slate-300 font-bold bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">+22.1 pts</span>
                      </div>
                    </div>
                    {/* Horizontal Bar Chart */}
                    <div className="space-y-1">
                      <div className="w-full h-3.5 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800 shadow-inner">
                        <div 
                          className="h-full bg-gradient-to-r from-orange-600 to-amber-400 rounded-full transition-all duration-500" 
                          style={{ width: '24%' }} 
                          role="progressbar"
                          aria-label="Fuel moisture weighted influence on Fire Risk Score"
                          aria-valuenow={24}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        />
                      </div>
                      <div className="flex justify-between text-[9px] text-slate-500 font-mono px-0.5">
                        <span>0%</span>
                        <span>10%</span>
                        <span>20%</span>
                        <span className="text-orange-400 font-bold">▲ 24% (Severe Drought)</span>
                        <span>40%</span>
                        <span>100%</span>
                      </div>
                    </div>
                  </div>

                  {/* 3. Temperature Horizontal Bar */}
                  <div 
                    id="xai-row-temperature"
                    data-testid="xai-row-temperature"
                    className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/60 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Thermometer className="w-4 h-4 text-amber-400" />
                        <span className="font-semibold text-white">
                          {currentLang === 'ar' ? 'درجة الحرارة (Temperature)' : 'Temperature'}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">({incident.temperatureC}°C)</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-xs font-bold text-amber-400">18% Weighted Influence</span>
                        <span className="text-[11px] text-slate-300 font-bold bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">+16.6 pts</span>
                      </div>
                    </div>
                    {/* Horizontal Bar Chart */}
                    <div className="space-y-1">
                      <div className="w-full h-3.5 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800 shadow-inner">
                        <div 
                          className="h-full bg-gradient-to-r from-amber-600 to-yellow-400 rounded-full transition-all duration-500" 
                          style={{ width: '18%' }} 
                          role="progressbar"
                          aria-label="Temperature weighted influence on Fire Risk Score"
                          aria-valuenow={18}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        />
                      </div>
                      <div className="flex justify-between text-[9px] text-slate-500 font-mono px-0.5">
                        <span>0%</span>
                        <span>10%</span>
                        <span className="text-amber-400 font-bold">▲ 18% (Heatwave)</span>
                        <span>30%</span>
                        <span>40%</span>
                        <span>100%</span>
                      </div>
                    </div>
                  </div>

                  {/* 4. Topography / Slope Horizontal Bar */}
                  <div 
                    id="xai-row-topography"
                    data-testid="xai-row-topography"
                    className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/60 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Mountain className="w-4 h-4 text-yellow-400" />
                        <span className="font-semibold text-white">
                          {currentLang === 'ar' ? 'التضاريس (Topography)' : 'Topography'}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">({incident.terrainSlopeDegrees}° Incline)</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-xs font-bold text-yellow-400">16% Weighted Influence</span>
                        <span className="text-[11px] text-slate-300 font-bold bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">+14.7 pts</span>
                      </div>
                    </div>
                    {/* Horizontal Bar Chart */}
                    <div className="space-y-1">
                      <div className="w-full h-3.5 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800 shadow-inner">
                        <div 
                          className="h-full bg-gradient-to-r from-yellow-600 to-lime-400 rounded-full transition-all duration-500" 
                          style={{ width: '16%' }} 
                          role="progressbar"
                          aria-label="Topography weighted influence on Fire Risk Score"
                          aria-valuenow={16}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        />
                      </div>
                      <div className="flex justify-between text-[9px] text-slate-500 font-mono px-0.5">
                        <span>0%</span>
                        <span>10%</span>
                        <span className="text-yellow-400 font-bold">▲ 16% (Chimney Slope)</span>
                        <span>30%</span>
                        <span>40%</span>
                        <span>100%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Multi-Signal Correlation Summary */}
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Radio className="w-4 h-4 text-cyan-400" />
                    Alert Fusion Engine Correlation
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700 text-xs font-mono font-bold">
                    Confidence: {incident.confidenceScore}% (Multi-Sensor Fused)
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  The system fused {incident.detectionSources.length} independent real-time signals: Satellite Infrared Radiative Power (340 MW), Watchtower Camera #17 Computer Vision smoke recognition (93.4%), and a verified Citizen GPS transmission. No single signal is treated as ground truth until verified.
                </p>
              </div>

              {/* AI-Assisted Dispatch: Top 3 Optimal Units Deployment Panel */}
              <div className="pt-1">
                <AiAssistedDispatchPanel
                  incident={incident}
                  availableResources={availableResources}
                  onDispatchResource={onDispatchResource}
                  currentLang={currentLang}
                  onDeploySuccess={(msg) => setActionSuccessMessage(msg)}
                />
              </div>

              {/* Timeline of Incident Progress */}
              <div>
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Incident Chronology
                </h3>
                <div className="space-y-2 border-l-2 border-slate-700 pl-3">
                  {incident.timeline.map((event) => (
                    <div key={event.id} className="relative text-xs">
                      <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-slate-900" />
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-emerald-400 font-bold">{event.timestamp}</span>
                        <span className="font-semibold text-white">{event.title}</span>
                        {event.sourceBadge && (
                          <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 text-[10px]">
                            {event.sourceBadge}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-400 text-[11px] mt-0.5">{event.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* EXPLAINABLE AI TAB */}
          {activeTab === 'xai' && (
            <ExplainableAiBreakdown 
              incident={incident} 
              currentLang={currentLang} 
            />
          )}

          {/* DETECTION TAB */}
          {activeTab === 'detection' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-400">
                AWIS Alert Fusion Engine integrates remote sensing and ground sensors to eliminate false alarms and detect wildfire candidates before standard polar orbit overpasses.
              </div>

              <div className="space-y-3">
                {incident.detectionSources.map((sig) => (
                  <div key={sig.id} className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {sig.source.includes('satellite') ? (
                          <Satellite className="w-4 h-4 text-cyan-400" />
                        ) : sig.source === 'watchtower_camera' ? (
                          <Camera className="w-4 h-4 text-amber-400" />
                        ) : (
                          <Users className="w-4 h-4 text-emerald-400" />
                        )}
                        <span className="font-bold text-white text-xs">{sig.sourceName}</span>
                      </div>
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-900 text-emerald-400 border border-slate-700">
                        Confidence: {sig.confidence}%
                      </span>
                    </div>

                    <p className="text-xs text-slate-300">{sig.details}</p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 font-mono pt-1 border-t border-slate-700/60">
                      <span>Coordinates: {sig.location.lat}°N, {sig.location.lng}°E</span>
                      <span>Time: {sig.timestamp}</span>
                      {sig.sensorMetadata?.thermalAnomalyMw && (
                        <span className="text-orange-300">FRP: {sig.sensorMetadata.thermalAnomalyMw} MW</span>
                      )}
                      {sig.sensorMetadata?.smokeProbability && (
                        <span className="text-amber-300">CV Smoke Prob: {sig.sensorMetadata.smokeProbability}%</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SPREAD PREDICTION TAB */}
          {activeTab === 'spread' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-800/40 p-3 rounded-xl border border-slate-700">
                <div>
                  <span className="text-xs font-bold text-white uppercase tracking-wider block">
                    Huygens Elliptical Wildfire Spread Simulation
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Decision-Support Model (Includes Terrain Slope {incident.terrainSlopeDegrees}° & Wind {incident.windSpeedKmH} km/h)
                  </span>
                </div>
                <span className="text-xs font-mono text-amber-400 bg-amber-950/60 px-2 py-1 rounded border border-amber-800">
                  Model v4.3 Rothermel-DZ
                </span>
              </div>

              {/* Isochrones Table */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {incident.spreadPredictions.map((iso) => (
                  <div key={iso.timeHorizonMinutes} className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-center">
                    <div className="text-xs font-bold text-red-400 uppercase">
                      +{iso.timeHorizonMinutes} Minutes
                    </div>
                    <div className="text-lg font-extrabold text-white my-1 font-mono">
                      {iso.areaHectares} ha
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Front Speed: {iso.frontSpeedKmH} km/h
                    </div>
                    <div className="text-[10px] text-emerald-400 font-mono mt-1">
                      Probability: {iso.probability}%
                    </div>
                  </div>
                ))}
              </div>

              {/* Exposed Assets Warning Panel */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  {t.populationExposureAlert} (Intercepted In Spread Cone)
                </h4>
                <div className="space-y-2">
                  {incident.exposedAssets.map((asset) => (
                    <div
                      key={asset.id}
                      className="p-3 rounded-xl bg-red-950/20 border border-red-800/40 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                          <span>{currentLang === 'ar' ? asset.nameAr : asset.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-mono bg-red-900 text-red-200">
                            {asset.type}
                          </span>
                        </div>
                        <div className="text-slate-400 text-[11px] mt-0.5">
                          Distance: {asset.distanceKm} km | {t.timeWindow}: <strong className="text-amber-300">{asset.estimatedWindowMinutes}</strong>
                          {asset.population && ` | Pop: ~${asset.population}`}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                          {asset.evacuationStatus.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STRATEGIC DISPATCH & OPTIMAL ROUTES TAB */}
          {(activeTab === 'strategic-dispatch' || activeTab === 'dispatch') && (
            <div className="space-y-6">
              {/* Strategic Dispatch Panel with Miniature Map View */}
              <StrategicDispatchPanel
                incident={incident}
                availableResources={availableResources}
                onDispatchResource={onDispatchResource}
                currentLang={currentLang}
                onDeploySuccess={(msg) => setActionSuccessMessage(msg)}
              />

              {/* Complete Fleet Resources Inventory */}
              <div className="space-y-3 pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <h4 className="font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-slate-400" />
                    {currentLang === 'ar' ? 'جميع موارد الأسطول الميداني بالولاية' : 'All Available Fleet Resources (Wilaya Operational Reserve)'}
                  </h4>
                  <span className="font-mono text-[11px] text-slate-500">
                    {availableResources.length} units active
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {availableResources.map((res) => {
                    const isAssigned = incident.assignedResources.includes(res.id);
                    const loc = res.currentLocation || res.baseLocation;
                    const distanceKm = computeDistanceKm(loc, incident.coordinates);
                    const { travelTimeMinutes } = computeTravelTimeMinutes(
                      distanceKm,
                      res.type,
                      incident.terrainSlopeDegrees
                    );

                    return (
                      <div
                        key={res.id}
                        className={`p-3 rounded-xl border flex items-center justify-between text-xs transition ${
                          isAssigned
                            ? 'bg-emerald-950/30 border-emerald-600 text-emerald-100'
                            : 'bg-slate-800/60 border-slate-700 text-slate-200 hover:border-slate-600'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="font-bold flex items-center gap-1.5">
                            <Truck className="w-3.5 h-3.5 text-amber-400" />
                            <span className="font-mono text-emerald-400">{res.code}</span>
                            <span className="truncate max-w-[180px]">{currentLang === 'ar' ? res.nameAr : res.name}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 font-mono">
                            <span className="text-amber-300 font-bold">ETA: {travelTimeMinutes} min</span>
                            <span>•</span>
                            <span>{distanceKm} km away</span>
                            <span>•</span>
                            <span className="capitalize">{res.wilaya}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 truncate max-w-[240px]">
                            {res.capacity}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            onDispatchResource(incident.id, res.id);
                            setActionSuccessMessage(
                              currentLang === 'ar'
                                ? `تم إرسال ${res.code} نحو موقع الحريق.`
                                : `Dispatched unit ${res.code}. ETA: ${travelTimeMinutes} min.`
                            );
                          }}
                          disabled={isAssigned}
                          className={`px-3 py-1.5 rounded-lg font-bold text-xs cursor-pointer transition shrink-0 ml-2 ${
                            isAssigned
                              ? 'bg-emerald-700/50 text-emerald-200 cursor-default'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                          }`}
                        >
                          {isAssigned ? (currentLang === 'ar' ? 'تم الإرسال' : 'Dispatched') : (currentLang === 'ar' ? 'إرسال' : 'Deploy')}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* VALIDATION TAB */}
          {activeTab === 'validation' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700 text-xs">
                <h4 className="font-bold text-white text-sm mb-1">Human Expert-in-the-Loop Authority</h4>
                <p className="text-slate-300">
                  AI estimates probabilities and correlates data. Final tactical confirmation, fire perimeter revisions, and civil evacuation mandates require qualified Human Commander authorization.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Commander Field Notes / Decision Justification:
                </label>
                <textarea
                  value={expertNote}
                  onChange={(e) => setExpertNote(e.target.value)}
                  placeholder="Enter observations: e.g. 'Confirmed optical smoke sighting from Texanna post. Requesting Beriev Be-200 aerial drop on ridge flank'..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 min-h-[90px]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={handleConfirm}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg transition cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t.verifyIncident}</span>
                </button>

                <button
                  onClick={handleReject}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-900/60 hover:bg-red-800 text-red-200 border border-red-700 text-xs font-bold transition cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                  <span>{t.rejectFalseAlarm}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="font-mono">GEOLOC: {incident.coordinates.lat}°N, {incident.coordinates.lng}°E</span>
          <div className="flex items-center gap-2">
            <button
              id="footer-ai-assisted-dispatch-btn"
              onClick={() => setActiveTab('strategic-dispatch')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md transition cursor-pointer"
              title="Open Strategic Dispatch (Optimal Routes Map)"
            >
              <Navigation className="w-3.5 h-3.5 fill-current" />
              <span>{currentLang === 'ar' ? 'الإرسال الاستراتيجي (Strategic Dispatch)' : 'Strategic Dispatch'}</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition cursor-pointer"
            >
              {t.close}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
