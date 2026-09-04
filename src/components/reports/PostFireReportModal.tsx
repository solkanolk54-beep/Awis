import React, { useState } from 'react';
import { 
  X, 
  FileText, 
  Download, 
  CheckCircle2, 
  TrendingUp, 
  AlertTriangle, 
  Trees, 
  ShieldCheck, 
  Clock, 
  Sparkles,
  GitCompare,
  Calendar,
  Layers
} from 'lucide-react';
import { PostFireReport, Language } from '../../types';
import { SAMPLE_POST_FIRE_REPORT } from '../../data/algeriaData';
import { translations } from '../../i18n/translations';

interface PostFireReportModalProps {
  report?: PostFireReport;
  onClose: () => void;
  currentLang: Language;
}

export const PostFireReportModal: React.FC<PostFireReportModalProps> = ({
  report = SAMPLE_POST_FIRE_REPORT,
  onClose,
  currentLang
}) => {
  const t = translations[currentLang];
  const [activeSubTab, setActiveSubTab] = useState<'metrics' | 'review' | 'recovery'>('metrics');
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const handleExportPdf = () => {
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-slate-900 via-purple-950/60 to-slate-900 border-b border-slate-700 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-purple-950 text-purple-200 border border-purple-700">
                  {report.incidentCode}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded uppercase bg-emerald-950 text-emerald-300 border border-emerald-700">
                  INCIDENT CONCLUDED & ARCHIVED
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Wilaya de {report.wilaya}
                </span>
              </div>
              <h2 className="text-base font-bold text-white mt-0.5">
                Official Post-Fire Intelligence & Machine Learning Verification Report
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs shadow-md transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t.exportReport}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 text-xs px-4">
          <button
            onClick={() => setActiveSubTab('metrics')}
            className={`flex items-center gap-1.5 px-3 py-2.5 font-medium border-b-2 transition cursor-pointer ${
              activeSubTab === 'metrics'
                ? 'border-purple-500 text-purple-300 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Operational Timings & Impact</span>
          </button>
          <button
            onClick={() => setActiveSubTab('review')}
            className={`flex items-center gap-1.5 px-3 py-2.5 font-medium border-b-2 transition cursor-pointer ${
              activeSubTab === 'review'
                ? 'border-purple-500 text-purple-300 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>AI Spread Accuracy Review</span>
          </button>
          <button
            onClick={() => setActiveSubTab('recovery')}
            className={`flex items-center gap-1.5 px-3 py-2.5 font-medium border-b-2 transition cursor-pointer ${
              activeSubTab === 'recovery'
                ? 'border-purple-500 text-purple-300 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Trees className="w-3.5 h-3.5" />
            <span>Long-Term Forest Succession & Recovery</span>
          </button>
        </div>

        {downloadSuccess && (
          <div className="bg-purple-950/80 border-b border-purple-600/40 px-4 py-2 text-xs text-purple-200 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-purple-400" />
              Official National Post-Fire Incident Dossier compiled and exported to PDF format.
            </span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-slate-200 text-xs">
          {/* TAB 1: METRICS */}
          {activeSubTab === 'metrics' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700">
                  <div className="text-[11px] text-slate-400">Total Duration</div>
                  <div className="text-base font-bold text-white mt-1 font-mono">
                    {report.totalDurationHours} Hours
                  </div>
                  <div className="text-[10px] text-slate-400">Ignition to Full Mop-up</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700">
                  <div className="text-[11px] text-slate-400">Final Burned Area</div>
                  <div className="text-base font-bold text-amber-300 mt-1 font-mono">
                    {report.finalBurnedHectares} Hectares
                  </div>
                  <div className="text-[10px] text-emerald-400">Contained within zone B</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700">
                  <div className="text-[11px] text-slate-400">Detection Latency</div>
                  <div className="text-base font-bold text-cyan-300 mt-1 font-mono">
                    {report.initialDetectionLatencyMinutes} Minutes
                  </div>
                  <div className="text-[10px] text-slate-400">Watchtower CV + Satellite</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700">
                  <div className="text-[11px] text-slate-400">Response Arrival</div>
                  <div className="text-base font-bold text-emerald-300 mt-1 font-mono">
                    {report.responseArrivalLatencyMinutes} Minutes
                  </div>
                  <div className="text-[10px] text-slate-400">Civil Protection Unit CP-17</div>
                </div>
              </div>

              {/* Environmental & Asset Impact */}
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700 space-y-3">
                <h3 className="font-bold text-white text-xs uppercase tracking-wider">
                  Environmental Damage & Asset Preservation
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-slate-400 font-bold block mb-1">Vegetation Canopy Loss:</span>
                    <p className="text-slate-200">{report.vegetationLost}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-emerald-400 font-bold block mb-1">Protected Settlements & Infrastructure:</span>
                    <p className="text-slate-200">{report.infrastructureProtected}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-1 font-mono">
                  <span>Casualties: <strong className="text-emerald-400 font-bold">{report.casualties}</strong></span>
                  <span>Evacuated / Escorted Civilians: <strong className="text-white font-bold">{report.displacedCount}</strong></span>
                  <span>Firefighting Water Dropped: <strong className="text-cyan-300 font-bold">{report.waterUsedLiters.toLocaleString()} L</strong></span>
                  <span>Tactical Ground & Aerial Units: <strong className="text-white font-bold">{report.resourcesDeployedCount} Units</strong></span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AI SPREAD REVIEW */}
          {activeSubTab === 'review' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/40 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white uppercase tracking-wider block">
                    AI Spread Prediction vs Actual Fire Front Reality
                  </span>
                  <span className="text-xs text-slate-300">
                    Comparing Rothermel-Huygens ellipse forecast against Post-Incident Sentinel-2 Burn Scar Analysis
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-extrabold text-purple-300 font-mono">
                    {report.predictedVsActualSpreadAccuracyPercent}%
                  </span>
                  <div className="text-[10px] text-emerald-400 font-bold">Accuracy Score</div>
                </div>
              </div>

              {/* Machine Learning Continuous Feedback Lessons */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-200 uppercase tracking-wider text-xs flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  Key Machine Learning Lessons & Weight Recalibration
                </h4>
                <div className="space-y-2">
                  {report.aiModelLessons.map((lesson, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 flex items-start gap-2.5 text-xs text-slate-300"
                    >
                      <span className="w-5 h-5 rounded-full bg-purple-950 text-purple-300 flex items-center justify-center font-mono font-bold shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <p className="leading-relaxed">{lesson}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FOREST RECOVERY */}
          {activeSubTab === 'recovery' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700 space-y-3">
                <h4 className="font-bold text-slate-200 uppercase tracking-wider text-xs flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  National Forest Monitoring Timeline (Post-Fire Succession)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
                    <span className="text-[10px] font-bold text-red-400 uppercase block">Immediately After</span>
                    <span className="text-xs text-slate-300 font-mono mt-1 block">Ash & Soil Crusting</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
                    <span className="text-[10px] font-bold text-amber-400 uppercase block">1 Month</span>
                    <span className="text-xs text-slate-300 font-mono mt-1 block">Erosion Barriers Laid</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
                    <span className="text-[10px] font-bold text-yellow-400 uppercase block">6 Months</span>
                    <span className="text-xs text-slate-300 font-mono mt-1 block">Herbaceous Pioneers</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase block">1 Year</span>
                    <span className="text-xs text-slate-300 font-mono mt-1 block">Cork Oak Epicormic Sprouts</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-600">
                    <span className="text-[10px] font-bold text-emerald-300 uppercase block">4 Years</span>
                    <span className="text-xs text-emerald-200 font-mono mt-1 block">Full Canopy Reestablished</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
                  <strong className="text-emerald-400 block mb-1">Reforestation Plan by Conservation des Forêts:</strong>
                  {report.reforestationPlanTimeline}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="font-mono">Official Reference: DZ-FOR-DOC-2026-POSTFIRE-0421</span>
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
