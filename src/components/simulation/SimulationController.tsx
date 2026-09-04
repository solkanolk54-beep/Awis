import React, { useState, useEffect } from 'react';
import { 
  X, 
  Play, 
  Pause, 
  RotateCcw, 
  SkipForward, 
  Flame, 
  Satellite, 
  Wind, 
  Camera, 
  Smartphone, 
  Radio, 
  CheckCircle2, 
  FileText, 
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { Language } from '../../types';
import { translations } from '../../i18n/translations';

interface SimulationControllerProps {
  onClose: () => void;
  onStepChange: (step: number) => void;
  onOpenPostFireReport: () => void;
  onTriggerScenarioIncident: () => void;
  currentLang: Language;
}

export const SimulationController: React.FC<SimulationControllerProps> = ({
  onClose,
  onStepChange,
  onOpenPostFireReport,
  onTriggerScenarioIncident,
  currentLang
}) => {
  const t = translations[currentLang];
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Steps definition based on the prompt's Demonstration Scenario
  const steps = [
    {
      time: 'T0',
      title: 'Satellite Thermal Anomaly Ingested',
      titleAr: 'رصد بؤرة حرارية بواسطة القمر الصناعي',
      source: 'NASA FIRMS VIIRS & Sentinel-3 SLSTR',
      desc: 'VIIRS satellite registers 340 MW Radiative Power (FRP) anomaly in Jijel Guerrouche canopy.',
      icon: Satellite,
      badge: 'Satellite Stream',
      confidence: '65%'
    },
    {
      time: 'T+2',
      title: 'Meteorological Sirocco Surge Ingested',
      titleAr: 'تحديث بيانات الأرصاد: رياح الشهيلي وجفاف حاد',
      source: 'National Meteorological Office Telemetry',
      desc: 'Severe dry wind gusts at 42 km/h NE, humidity drops to 19%, ambient temp 40.5°C. Risk engine flags Extreme Risk.',
      icon: Wind,
      badge: 'Weather Telemetry',
      confidence: '78%'
    },
    {
      time: 'T+4',
      title: 'Watchtower Optical CV Confirms Smoke',
      titleAr: 'كاميرا برج المراقبة ترصد عمود دخان بالرؤية الحاسوبية',
      source: 'Watchtower #17 AI Camera (Texanna Summit)',
      desc: 'Deep learning vision model flags rising dense smoke column with 93.4% probability at azimuth 042°.',
      icon: Camera,
      badge: 'Computer Vision',
      confidence: '88%'
    },
    {
      time: 'T+5',
      title: 'Citizen Mobile App Report Transmitted',
      titleAr: 'وصول بلاغ مواطن موثق عبر تطبيق الهاتف',
      source: 'Citizen Mobile App (IMEI Verified)',
      desc: 'Citizen submits photo and coordinates near RN-77 corridor, reporting rapidly advancing flames in bracken.',
      icon: Smartphone,
      badge: 'Citizen Ingestion',
      confidence: '94%'
    },
    {
      time: 'T+6',
      title: 'Alert Fusion & AI Spread Prediction Computed',
      titleAr: 'محرك دمج الإنذارات يؤكد الحريق ويطلق نموذج الانتشار',
      source: 'AWIS Alert Fusion Engine',
      desc: 'Signals correlated; Incident DZ-WF-2026-00421 created. Spread isochrones (30m, 1h, 3h, 6h) calculated. Village Ait Bouyoucef flagged for advisory evacuation.',
      icon: Radio,
      badge: 'Fusion Correlated',
      confidence: '94%'
    },
    {
      time: 'T+12',
      title: 'Smart Dispatch & Active Response Deployed',
      titleAr: 'انتشار الأرتال والتطويق: وحدة 17 وصهاريج الإمداد وطائرة بيريف',
      source: 'Civil Protection Operational Command',
      desc: 'Unit CP-17 dispatched with Water Tanker WT-08. Drone DZ-04 launches thermal scouting. Beriev Be-200 placed on airborne standby.',
      icon: Flame,
      badge: 'Response Active',
      confidence: '98%'
    },
    {
      time: 'T+18h',
      title: 'Containment Achieved & Post-Fire Intelligence Ready',
      titleAr: 'السيطرة الكاملة على الحريق وتوليد تقرير ما بعد الحريق',
      source: 'Post-Fire Learning Engine',
      desc: 'Wildfire perimeter contained at 84.5 hectares. AI accuracy validated at 88.4%. Post-fire intelligence report compiled.',
      icon: FileText,
      badge: 'Incident Closed',
      confidence: '100%'
    }
  ];

  useEffect(() => {
    let timer: any;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev < steps.length - 1) {
            const next = prev + 1;
            onStepChange(next);
            return next;
          } else {
            setIsPlaying(false);
            return prev;
          }
        });
      }, 4000);
    }
    return () => clearInterval(timer);
  }, [isPlaying, onStepChange, steps.length]);

  const handleStepSelect = (idx: number) => {
    setCurrentStep(idx);
    onStepChange(idx);
    if (idx >= 4) {
      onTriggerScenarioIncident();
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStep(0);
    onStepChange(0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-amber-500/50 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-slate-900 via-amber-950/70 to-slate-900 border-b border-slate-700 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-200 border border-amber-700">
                  NATIONAL SIMULATION ENGINE
                </span>
                <span className="text-[10px] text-amber-400 font-mono">
                  {t.simulationNotice}
                </span>
              </div>
              <h2 className="text-sm font-bold text-white mt-0.5">
                Demonstration Scenario: Thermal Anomaly to Post-Fire Intelligence (T0 → T+18h)
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Playback Controls */}
        <div className="p-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                isPlaying
                  ? 'bg-amber-600 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'Pause Simulation' : 'Auto Play Scenario'}</span>
            </button>

            <button
              onClick={() => handleStepSelect(Math.min(steps.length - 1, currentStep + 1))}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
              title="Next Step"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            <button
              onClick={handleReset}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
              title="Reset"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-mono">
              Step: <strong className="text-amber-400">{currentStep + 1}</strong> of {steps.length}
            </span>
            {currentStep >= 5 && (
              <button
                onClick={() => {
                  onClose();
                  onOpenPostFireReport();
                }}
                className="flex items-center gap-1 px-3 py-1 rounded-xl bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-700 font-bold transition cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>View Post-Fire Report</span>
              </button>
            )}
          </div>
        </div>

        {/* Steps List */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 text-slate-200 text-xs">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isCurrent = currentStep === idx;
            const isCompleted = currentStep > idx;

            return (
              <div
                key={step.time}
                onClick={() => handleStepSelect(idx)}
                className={`p-3.5 rounded-2xl border transition cursor-pointer ${
                  isCurrent
                    ? 'bg-amber-950/40 border-amber-500 text-white ring-2 ring-amber-500/20'
                    : isCompleted
                    ? 'bg-slate-800/40 border-slate-700 text-slate-300 hover:bg-slate-800/80'
                    : 'bg-slate-900/40 border-slate-800 text-slate-500 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-2 rounded-xl ${
                        isCurrent
                          ? 'bg-amber-500 text-black font-bold'
                          : isCompleted
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-amber-400 text-xs">
                          [{step.time}]
                        </span>
                        <span className="font-bold text-white text-xs">
                          {currentLang === 'ar' ? step.titleAr : step.title}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Source: {step.source}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                        isCurrent
                          ? 'bg-amber-500 text-black'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {step.badge}
                    </span>
                    <div className="text-[10px] text-emerald-400 font-mono mt-1">
                      Conf: {step.confidence}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed mt-2 pl-9">
                  {step.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="font-mono text-amber-400/80">
            Algorithmic Pipeline: Detection → Verification → Spread Prediction → Resource Dispatch → Recovery
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition cursor-pointer"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
