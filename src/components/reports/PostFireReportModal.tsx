import React, { useState } from 'react';
import { 
  X, 
  FileText, 
  Download, 
  Printer,
  CheckCircle2, 
  Trees, 
  ShieldCheck, 
  Clock, 
  Sparkles,
  GitCompare,
  Calendar,
  Layers,
  QrCode,
  BadgeCheck,
  Building2
} from 'lucide-react';
import { PostFireReport, Language } from '../../types';
import { SAMPLE_POST_FIRE_REPORT } from '../../data/algeriaData';
import { translations } from '../../i18n/translations';
import { generatePostFireReportPDF } from '../../utils/pdfGenerator';

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
  const [activeSubTab, setActiveSubTab] = useState<'metrics' | 'review' | 'recovery' | 'full'>('metrics');
  const [printSuccess, setPrintSuccess] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfDownloaded, setPdfDownloaded] = useState(false);

  const isAr = currentLang === 'ar';
  const isFr = currentLang === 'fr';

  const handlePrint = () => {
    setPrintSuccess(true);
    setTimeout(() => {
      try {
        window.print();
      } catch (err) {
        console.error('Print trigger error:', err);
      }
    }, 250);
    setTimeout(() => setPrintSuccess(false), 5000);
  };

  const handleDownloadPDF = () => {
    setIsGeneratingPDF(true);
    try {
      generatePostFireReportPDF(report, currentLang);
      setPdfDownloaded(true);
      setTimeout(() => setPdfDownloaded(false), 5000);
    } catch (err) {
      console.error('Error generating PDF document:', err);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div 
      id="post-fire-report-modal-backdrop" 
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto cursor-pointer"
    >
      <div 
        id="post-fire-report-dossier" 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] cursor-default"
      >
        {/* =========================================================================
            1. PRINT-ONLY OFFICIAL GOVERNMENT LETTERHEAD & LEGAL ARCHIVE BANNER
            ========================================================================= */}
        <div className="print-only mb-4 border-b-2 border-slate-900 pb-3 text-slate-900">
          {/* Official Emblem & State Heading */}
          <div className="flex items-center justify-between border-b border-slate-300 pb-3 mb-3">
            <div className="flex items-center gap-3">
              {/* Algerian National Emblem / Crest Representation */}
              <div className="w-14 h-14 rounded-full border-2 border-slate-800 flex items-center justify-center bg-slate-50 text-slate-900 font-bold shrink-0 p-1 text-center shadow-xs">
                <div className="text-[10px] leading-tight font-serif uppercase">
                  <span className="text-emerald-700 font-extrabold block">DZ</span>
                  <span className="text-[7.5px] text-red-700 font-bold block">★ ☾</span>
                  <span className="text-[6.5px] text-slate-600 block">AWIS</span>
                </div>
              </div>
              <div>
                <div className="text-xs font-bold font-serif uppercase tracking-wider text-slate-900">
                  {isAr 
                    ? 'الجمهورية الجزائرية الديمقراطية الشعبية' 
                    : "RÉPUBLIQUE ALGÉRIENNE DÉMOCRATIQUE ET POPULAIRE"}
                </div>
                <div className="text-[10px] text-slate-700 font-medium">
                  {isAr 
                    ? 'وزارة الداخلية والجماعات المحلية والتهيئة العمرانية • وزارة الفلاحة والتنمية الريفية' 
                    : "Ministère de l'Intérieur et des Collectivités Locales • Ministère de l'Agriculture"}
                </div>
                <div className="text-[10px] text-slate-800 font-bold flex items-center gap-2">
                  <span>
                    {isAr 
                      ? 'المديرية العامة للحماية المدنية (DGPC)' 
                      : 'Direction Générale de la Protection Civile (DGPC)'}
                  </span>
                  <span>•</span>
                  <span>
                    {isAr 
                      ? 'المديرية العامة للغابات (DGF)' 
                      : 'Direction Générale des Forêts (DGF)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Classification & Stamp Block */}
            <div className="text-right font-mono text-[9px] text-slate-700 border border-slate-400 p-2 rounded bg-slate-50">
              <div className="font-bold text-red-800 uppercase tracking-wider">
                {isAr ? 'وثيقة رسمية مصنفة • أرشيف دائم' : 'ARCHIVE OFFICIELLE NATIONALE'}
              </div>
              <div>RÉF: <strong className="text-slate-900">DZ-RETEX-2026-000389</strong></div>
              <div>Wilaya: <strong className="text-slate-900">{report.wilaya}</strong></div>
              <div>Date dépôt: <strong className="text-slate-900">{report.containmentTime}</strong></div>
            </div>
          </div>

          {/* Document Title Header */}
          <div className="text-center my-2">
            <h1 className="text-base font-extrabold uppercase tracking-wide text-slate-950 font-serif">
              {isAr 
                ? 'محضر المعاينة والتحقيق التقني لما بعد إخماد الحريق الغابي (RETEX)' 
                : "RAPPORT TECHNIQUE POST-INCENDIE ET RETOUR D'EXPÉRIENCE (RETEX)"}
            </h1>
            <p className="text-[10px] text-slate-600 mt-0.5">
              {isAr 
                ? 'تقييم شامل للأضرار البيئية، دقة خوارزميات الانتشار، والجدول الزمني لإعادة التأهيل الغابي' 
                : "Évaluation de l'impact écologique, validation des modèles de propagation IA et plan de régénération forestière"}
            </p>
          </div>

          {/* Quick Incident Metadata Table */}
          <table className="print-table text-[9px] mt-2 mb-3">
            <tbody>
              <tr>
                <th style={{ width: '20%' }}>{isAr ? 'رمز الحريق' : 'Code Incident'}</th>
                <td style={{ width: '30%' }} className="font-mono font-bold">{report.incidentCode}</td>
                <th style={{ width: '20%' }}>{isAr ? 'الولاية والقطاع' : 'Wilaya / Secteur'}</th>
                <td style={{ width: '30%' }}>Wilaya de {report.wilaya} (Secteur Forêt Nationale)</td>
              </tr>
              <tr>
                <th>{isAr ? 'تاريخ وساعة الإشعال' : "Début d'Ignition"}</th>
                <td className="font-mono">{report.startTime}</td>
                <th>{isAr ? 'تاريخ الإخماد النهائي' : 'Maîtrise Complète'}</th>
                <td className="font-mono">{report.containmentTime}</td>
              </tr>
              <tr>
                <th>{isAr ? 'مدة التدخل الإجمالية' : 'Durée des Opérations'}</th>
                <td className="font-bold">{report.totalDurationHours} Heures</td>
                <th>{isAr ? 'المساحة النهائية المحترقة' : 'Superficie Brûlée'}</th>
                <td className="font-bold text-red-900">{report.finalBurnedHectares} Hectares</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* =========================================================================
            2. SCREEN-ONLY INTERACTIVE HEADER
            ========================================================================= */}
        <div className="no-print p-4 bg-gradient-to-r from-slate-900 via-purple-950/60 to-slate-900 border-b border-slate-700 flex items-center justify-between text-white shrink-0">
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
                  {isAr ? 'حريق مغلق ومؤرشف' : 'INCIDENT CONCLUDED & ARCHIVED'}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Wilaya de {report.wilaya}
                </span>
              </div>
              <h2 className="text-base font-bold text-white mt-0.5">
                {isAr 
                  ? 'التقرير الرسمي لما بعد الحريق والتحقق من دقة الذكاء الاصطناعي' 
                  : isFr
                  ? "Rapport Officiel Post-Incendie & Vérification IA"
                  : "Official Post-Fire Intelligence & Machine Learning Verification Report"}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Preview Print Button */}
            <button
              id="btn-preview-print"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-600 hover:border-slate-500 shadow-sm transition cursor-pointer"
              title={isAr ? 'معاينة وطباعة المحضر A4' : 'Preview & Print official document (window.print)'}
            >
              <Printer className="w-3.5 h-3.5 text-indigo-300" />
              <span>{isAr ? 'معاينة الطباعة (Preview Print)' : 'Preview Print'}</span>
            </button>

            {/* Download PDF Button */}
            <button
              id="btn-download-pdf"
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-50"
              title={isAr ? 'تحميل وثيقة PDF الرسمية' : 'Download official PDF document'}
            >
              <Download className="w-3.5 h-3.5 text-white" />
              <span>
                {isGeneratingPDF 
                  ? (isAr ? 'جارٍ المعالجة...' : 'Exporting...') 
                  : (isAr ? 'تحميل PDF (Download PDF)' : 'Download PDF')}
              </span>
            </button>

            {/* Modal Close Button */}
            <button
              id="btn-close-post-fire-modal"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* =========================================================================
            3. SCREEN-ONLY TAB NAVIGATION
            ========================================================================= */}
        <div className="no-print flex border-b border-slate-800 bg-slate-950/60 text-xs px-4 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('metrics')}
            className={`flex items-center gap-1.5 px-3 py-2.5 font-medium border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeSubTab === 'metrics'
                ? 'border-purple-500 text-purple-300 bg-slate-800/40 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{isAr ? 'المؤشرات الزمنية والأثر' : isFr ? 'Délais & Impact Opérationnel' : 'Operational Timings & Impact'}</span>
          </button>
          <button
            onClick={() => setActiveSubTab('review')}
            className={`flex items-center gap-1.5 px-3 py-2.5 font-medium border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeSubTab === 'review'
                ? 'border-purple-500 text-purple-300 bg-slate-800/40 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>{isAr ? 'تقييم دقة انتشار الذكاء الاصطناعي' : isFr ? 'Précision de Propagation IA' : 'AI Spread Accuracy Review'}</span>
          </button>
          <button
            onClick={() => setActiveSubTab('recovery')}
            className={`flex items-center gap-1.5 px-3 py-2.5 font-medium border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeSubTab === 'recovery'
                ? 'border-purple-500 text-purple-300 bg-slate-800/40 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Trees className="w-3.5 h-3.5" />
            <span>{isAr ? 'التعافي والتجدد الغابي' : isFr ? 'Régénération & Succession' : 'Long-Term Forest Succession'}</span>
          </button>
          <button
            onClick={() => setActiveSubTab('full')}
            className={`flex items-center gap-1.5 px-3 py-2.5 font-medium border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeSubTab === 'full'
                ? 'border-emerald-500 text-emerald-300 bg-emerald-950/30 font-bold'
                : 'border-transparent text-slate-400 hover:text-emerald-300'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isAr ? 'عرض المحضر كاملاً (معاينة الطباعة)' : isFr ? 'Dossier Complet (Aperçu Print)' : 'Full Dossier View (Print Preview)'}</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-900/80 text-emerald-300 border border-emerald-700">A4</span>
          </button>
        </div>

        {/* Screen Alert Banner when print is triggered */}
        {printSuccess && (
          <div className="no-print bg-purple-950/80 border-b border-purple-600/40 px-4 py-2 text-xs text-purple-200 flex items-center justify-between animate-in fade-in duration-200">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
              <span>
                {isAr
                  ? 'تم فتح نافذة المعاينة والطباعة الرسمية. اختر "حفظ بتنسيق PDF" أو طابعتك المحلية.'
                  : isFr
                  ? "Aperçu d'impression ouvert. Sélectionnez 'Enregistrer au format PDF' ou votre imprimante."
                  : "Print preview opened. Select 'Save as PDF' or your physical printer in the print dialog."}
              </span>
            </span>
          </div>
        )}

        {/* Screen Alert Banner when PDF document is downloaded */}
        {pdfDownloaded && (
          <div className="no-print bg-emerald-950/80 border-b border-emerald-600/40 px-4 py-2 text-xs text-emerald-200 flex items-center justify-between animate-in fade-in duration-200">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                {isAr
                  ? 'تم إنشاء وتحميل محضر التحقيق الرسمي (RETEX) بصيغة PDF بنجاح.'
                  : isFr
                  ? "Rapport officiel RETEX généré avec succès et téléchargé au format PDF."
                  : "Official post-fire incident dossier (RETEX) compiled and downloaded as PDF."}
              </span>
            </span>
          </div>
        )}

        {/* =========================================================================
            4. DOSSIER BODY (STRUCTURED FOR BOTH SCREEN & PRINT)
            ========================================================================= */}
        <div className="p-5 overflow-y-auto space-y-6 text-slate-200 text-xs">
          {/* -----------------------------------------------------------------------
              SECTION 1: OPERATIONAL TIMINGS & IMPACT METRICS
              (Visible if subTab === 'metrics' OR 'full', and ALWAYS in print)
              ----------------------------------------------------------------------- */}
          <div 
            id="print-section-metrics" 
            className={`${activeSubTab === 'metrics' || activeSubTab === 'full' ? 'block' : 'hidden'} print-dossier-section`}
          >
            <div className="space-y-4">
              {/* Section Header */}
              <div className="flex items-center justify-between border-b border-slate-700 pb-2 print:border-slate-400">
                <h3 className="font-bold text-white text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 print:text-slate-900">
                  <Clock className="w-4 h-4 text-purple-400 print:text-slate-800" />
                  <span>
                    {isAr 
                      ? '1. المؤشرات الزمنية والفعالية العملياتية' 
                      : isFr
                      ? '1. Délais Opérationnels & Efficacité des Interventions'
                      : '1. Operational Timings & Response Performance'}
                  </span>
                </h3>
                <span className="text-[10px] text-slate-400 font-mono print:text-slate-600">
                  SECTION REF: AWIS-METRICS-01
                </span>
              </div>

              {/* 4 Primary Operational Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 print-card">
                  <div className="text-[11px] text-slate-400 print:text-slate-600 font-medium">
                    {isAr ? 'المدة الإجمالية للحريق' : 'Total Duration'}
                  </div>
                  <div className="text-base font-bold text-white mt-1 font-mono print:text-slate-950">
                    {report.totalDurationHours} Hours
                  </div>
                  <div className="text-[10px] text-slate-400 print:text-slate-500 mt-0.5">
                    {isAr ? 'من الإشعال حتى الإخماد التام' : 'Ignition to Full Mop-up'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 print-card">
                  <div className="text-[11px] text-slate-400 print:text-slate-600 font-medium">
                    {isAr ? 'المساحة النهائية المحترقة' : 'Final Burned Area'}
                  </div>
                  <div className="text-base font-bold text-amber-300 mt-1 font-mono print:text-red-800">
                    {report.finalBurnedHectares} Hectares
                  </div>
                  <div className="text-[10px] text-emerald-400 print:text-emerald-700 mt-0.5">
                    {isAr ? 'تم الحصر داخل خط الدفاع الثاني' : 'Contained within zone B'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 print-card">
                  <div className="text-[11px] text-slate-400 print:text-slate-600 font-medium">
                    {isAr ? 'زمن الرصد المبكر' : 'Detection Latency'}
                  </div>
                  <div className="text-base font-bold text-cyan-300 mt-1 font-mono print:text-slate-900">
                    {report.initialDetectionLatencyMinutes} Minutes
                  </div>
                  <div className="text-[10px] text-slate-400 print:text-slate-500 mt-0.5">
                    {isAr ? 'كاميرات الأبراج والذكاء الاصطناعي' : 'Watchtower CV + Satellite'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 print-card">
                  <div className="text-[11px] text-slate-400 print:text-slate-600 font-medium">
                    {isAr ? 'زمن وصول أول رتل' : 'Response Arrival'}
                  </div>
                  <div className="text-base font-bold text-emerald-300 mt-1 font-mono print:text-slate-900">
                    {report.responseArrivalLatencyMinutes} Minutes
                  </div>
                  <div className="text-[10px] text-slate-400 print:text-slate-500 mt-0.5">
                    {isAr ? 'رتل الحماية المدنية CP-17' : 'Civil Protection Unit CP-17'}
                  </div>
                </div>
              </div>

              {/* Environmental & Asset Impact Details */}
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700 space-y-3 print-card print-avoid-break">
                <h4 className="font-bold text-white text-xs uppercase tracking-wider print:text-slate-900">
                  {isAr 
                    ? 'تقييم الأضرار البيئية وحماية المنشآت الحيوية' 
                    : 'Environmental Damage & Asset Preservation Analysis'}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 print:bg-white print:border-slate-300">
                    <span className="text-amber-400 font-bold block mb-1 print:text-red-800">
                      {isAr ? 'خسائر الغطاء النباتي والكتلة الحيوية:' : 'Vegetation Canopy Loss:'}
                    </span>
                    <p className="text-slate-200 print:text-slate-800">{report.vegetationLost}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 print:bg-white print:border-slate-300">
                    <span className="text-emerald-400 font-bold block mb-1 print:text-emerald-800">
                      {isAr ? 'التجمعات السكانية والمنشآت المحمية:' : 'Protected Settlements & Infrastructure:'}
                    </span>
                    <p className="text-slate-200 print:text-slate-800">{report.infrastructureProtected}</p>
                  </div>
                </div>

                {/* Secondary Tactical Stats Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1 font-mono print:text-slate-800 border-t border-slate-700/60 print:border-slate-300 mt-2">
                  <div className="p-2 rounded bg-slate-900/40 print:bg-slate-50 print:border print:border-slate-200">
                    <span className="text-slate-400 print:text-slate-600 block text-[10px]">{isAr ? 'الضحايا البشرية' : 'Casualties'}:</span>
                    <strong className="text-emerald-400 print:text-emerald-800 text-xs font-bold">{report.casualties} (Zero)</strong>
                  </div>
                  <div className="p-2 rounded bg-slate-900/40 print:bg-slate-50 print:border print:border-slate-200">
                    <span className="text-slate-400 print:text-slate-600 block text-[10px]">{isAr ? 'المدنيون الذين تم إجلاؤهم' : 'Evacuated Civilians'}:</span>
                    <strong className="text-white print:text-slate-900 text-xs font-bold">{report.displacedCount} Persons</strong>
                  </div>
                  <div className="p-2 rounded bg-slate-900/40 print:bg-slate-50 print:border print:border-slate-200">
                    <span className="text-slate-400 print:text-slate-600 block text-[10px]">{isAr ? 'المياه المستخدمة للإخماد' : 'Water Dropped'}:</span>
                    <strong className="text-cyan-300 print:text-slate-900 text-xs font-bold">{report.waterUsedLiters.toLocaleString()} Liters</strong>
                  </div>
                  <div className="p-2 rounded bg-slate-900/40 print:bg-slate-50 print:border print:border-slate-200">
                    <span className="text-slate-400 print:text-slate-600 block text-[10px]">{isAr ? 'الأرتال والوحدات المشاركة' : 'Tactical Units'}:</span>
                    <strong className="text-white print:text-slate-900 text-xs font-bold">{report.resourcesDeployedCount} Units Deployed</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* -----------------------------------------------------------------------
              SECTION 2: AI SPREAD ACCURACY REVIEW & CONTINUOUS FEEDBACK
              (Visible if subTab === 'review' OR 'full', and ALWAYS in print)
              ----------------------------------------------------------------------- */}
          <div 
            id="print-section-review" 
            className={`${activeSubTab === 'review' || activeSubTab === 'full' ? 'block' : 'hidden'} print-dossier-section`}
          >
            <div className="space-y-4">
              {/* Section Header */}
              <div className="flex items-center justify-between border-b border-slate-700 pb-2 print:border-slate-400">
                <h3 className="font-bold text-white text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 print:text-slate-900">
                  <GitCompare className="w-4 h-4 text-purple-400 print:text-slate-800" />
                  <span>
                    {isAr 
                      ? '2. التحقق من دقة نماذج الذكاء الاصطناعي ومعايرة الأوزان' 
                      : isFr
                      ? "2. Rétro-Validation des Modèles d'IA & Recalibrage"
                      : '2. AI Spread Prediction Accuracy Review & Weight Recalibration'}
                  </span>
                </h3>
                <span className="text-[10px] text-slate-400 font-mono print:text-slate-600">
                  SECTION REF: AWIS-AI-RETEX-02
                </span>
              </div>

              {/* Accuracy Score Card */}
              <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/40 flex items-center justify-between print-card print-avoid-break">
                <div>
                  <span className="text-xs font-bold text-white uppercase tracking-wider block print:text-slate-900">
                    {isAr ? 'دقة التنبؤ بالانتشار مقابل واقع جبهة النيران' : 'AI Spread Prediction vs Actual Fire Front Reality'}
                  </span>
                  <span className="text-xs text-slate-300 print:text-slate-700">
                    {isAr 
                      ? 'مقارنة قطع ناقص روثرميل-هويجنز مع خريطة أثر الحريق عبر القمر الصناعي Sentinel-2' 
                      : 'Comparing Rothermel-Huygens ellipse forecast against Post-Incident Sentinel-2 Burn Scar Analysis'}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-2xl font-extrabold text-purple-300 font-mono print:text-indigo-900">
                    {report.predictedVsActualSpreadAccuracyPercent}%
                  </span>
                  <div className="text-[10px] text-emerald-400 font-bold print:text-emerald-700">
                    {isAr ? 'درجة المطابقة والاعتماد' : 'Model Accuracy Score'}
                  </div>
                </div>
              </div>

              {/* Machine Learning Continuous Feedback Lessons */}
              <div className="space-y-2 print-avoid-break">
                <h4 className="font-bold text-slate-200 uppercase tracking-wider text-xs flex items-center gap-1.5 print:text-slate-900">
                  <Sparkles className="w-4 h-4 text-purple-400 print:text-slate-800" />
                  <span>
                    {isAr 
                      ? 'دروس التعلم الآلي المستخلصة والتحديث الذاتي للنموذج' 
                      : 'Key Machine Learning Lessons & Weight Recalibration'}
                  </span>
                </h4>
                <div className="space-y-2">
                  {report.aiModelLessons.map((lesson, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 flex items-start gap-2.5 text-xs text-slate-300 print-card"
                    >
                      <span className="w-5 h-5 rounded-full bg-purple-950 text-purple-300 flex items-center justify-center font-mono font-bold shrink-0 mt-0.5 print:bg-slate-200 print:text-slate-900 print:border print:border-slate-400">
                        {idx + 1}
                      </span>
                      <p className="leading-relaxed print:text-slate-800">{lesson}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* -----------------------------------------------------------------------
              SECTION 3: POST-FIRE FOREST SUCCESSION & RECOVERY PLAN
              (Visible if subTab === 'recovery' OR 'full', and ALWAYS in print)
              ----------------------------------------------------------------------- */}
          <div 
            id="print-section-recovery" 
            className={`${activeSubTab === 'recovery' || activeSubTab === 'full' ? 'block' : 'hidden'} print-dossier-section`}
          >
            <div className="space-y-4">
              {/* Section Header */}
              <div className="flex items-center justify-between border-b border-slate-700 pb-2 print:border-slate-400">
                <h3 className="font-bold text-white text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 print:text-slate-900">
                  <Trees className="w-4 h-4 text-emerald-400 print:text-slate-800" />
                  <span>
                    {isAr 
                      ? '3. خطة إعادة التأهيل والتعافي البيئي للغابة (محافظة الغابات)' 
                      : isFr
                      ? '3. Plan de Restauration & Suivi Écologique Post-Incendie'
                      : '3. Long-Term Forest Succession & Restoration Action Plan'}
                  </span>
                </h3>
                <span className="text-[10px] text-slate-400 font-mono print:text-slate-600">
                  SECTION REF: DGF-RECOVERY-03
                </span>
              </div>

              {/* 5-Stage Ecological Succession Table / Cards */}
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700 space-y-3 print-card print-avoid-break">
                <h4 className="font-bold text-slate-200 uppercase tracking-wider text-xs flex items-center gap-1.5 print:text-slate-900">
                  <Calendar className="w-4 h-4 text-emerald-400 print:text-emerald-800" />
                  <span>
                    {isAr 
                      ? 'مراحل المراقبة الوطنية للتعافي الغابي (Post-Fire Succession)' 
                      : 'National Forest Monitoring Timeline (Post-Fire Succession)'}
                  </span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 print:bg-white print:border print:border-slate-300">
                    <span className="text-[10px] font-bold text-red-400 print:text-red-700 uppercase block">
                      {isAr ? 'فور الإخماد' : 'Immediately After'}
                    </span>
                    <span className="text-xs text-slate-300 print:text-slate-800 font-mono mt-1 block">
                      {isAr ? 'تثبيت الرماد وقشرة التربة' : 'Ash & Soil Crusting'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 print:bg-white print:border print:border-slate-300">
                    <span className="text-[10px] font-bold text-amber-400 print:text-amber-800 uppercase block">
                      {isAr ? 'خلال شهر' : '1 Month'}
                    </span>
                    <span className="text-xs text-slate-300 print:text-slate-800 font-mono mt-1 block">
                      {isAr ? 'حواجز مكافحة الانجراف' : 'Erosion Barriers Laid'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 print:bg-white print:border print:border-slate-300">
                    <span className="text-[10px] font-bold text-yellow-400 print:text-yellow-800 uppercase block">
                      {isAr ? '6 أشهر' : '6 Months'}
                    </span>
                    <span className="text-xs text-slate-300 print:text-slate-800 font-mono mt-1 block">
                      {isAr ? 'النباتات العشبية الرائدة' : 'Herbaceous Pioneers'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 print:bg-white print:border print:border-slate-300">
                    <span className="text-[10px] font-bold text-emerald-400 print:text-emerald-800 uppercase block">
                      {isAr ? 'سنة واحدة' : '1 Year'}
                    </span>
                    <span className="text-xs text-slate-300 print:text-slate-800 font-mono mt-1 block">
                      {isAr ? 'تجدد براعم البلوط الفليني' : 'Cork Oak Epicormic'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-600 print:bg-emerald-50 print:border print:border-emerald-500">
                    <span className="text-[10px] font-bold text-emerald-300 print:text-emerald-900 uppercase block">
                      {isAr ? '4 سنوات' : '4 Years'}
                    </span>
                    <span className="text-xs text-emerald-200 print:text-emerald-950 font-mono mt-1 block">
                      {isAr ? 'استعادة التاج الغابي الكامل' : 'Full Canopy Restored'}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 print:bg-slate-50 print:border-slate-300 print:text-slate-900">
                  <strong className="text-emerald-400 print:text-emerald-800 block mb-1">
                    {isAr ? 'برنامج التشجير المعتمد من محافظة الغابات:' : 'Reforestation Plan by Conservation des Forêts:'}
                  </strong>
                  {report.reforestationPlanTimeline}
                </div>
              </div>
            </div>
          </div>

          {/* -----------------------------------------------------------------------
              SECTION 4: OFFICIAL STAMPS, VISAS & SIGNATURE BLOCK
              (Crucial for physical record-keeping and ministerial filing)
              ----------------------------------------------------------------------- */}
          <div 
            id="print-section-sign-off" 
            className={`${activeSubTab === 'full' ? 'block' : 'hidden'} print-dossier-section print-avoid-break mt-6 pt-4 border-t-2 border-slate-700 print:border-slate-900`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5 print:text-slate-900">
                  <BadgeCheck className="w-4 h-4 text-emerald-400 print:text-slate-800" />
                  <span>
                    {isAr 
                      ? '4. التأشيرات الرسمية وسلسلة الاعتماد الإداري والعملياتي' 
                      : isFr
                      ? "4. Visas Réglementaires & Signatures de Clôture d'Opération"
                      : '4. Regulatory Visas & Operational Sign-Off Protocol'}
                  </span>
                </h4>
                <span className="text-[10px] text-slate-400 font-mono print:text-slate-600">
                  REF: DZ-VISA-DGF-DGPC-2026
                </span>
              </div>

              {/* 3 Verification Stamp Boxes */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Box 1: DGF Conservateur */}
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700 print-stamp-box flex flex-col justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-emerald-400 print:text-slate-900 uppercase">
                      {isAr ? 'محافظ الغابات للولاية' : 'Le Conservateur des Forêts'}
                    </div>
                    <div className="text-[9px] text-slate-400 print:text-slate-600 mt-0.5">
                      Direction Générale des Forêts
                    </div>
                    <div className="text-[9px] text-slate-400 print:text-slate-500 italic mt-1">
                      {isAr ? 'صودق عليه لتنفيذ خطة الراحة البيولوجية والتجديد' : 'Vu pour exécution du plan de repos biologique'}
                    </div>
                  </div>
                  <div className="mt-8 pt-2 border-t border-slate-600 print:border-slate-400 flex items-center justify-between text-[9px] text-slate-400 print:text-slate-600">
                    <span>{isAr ? 'التوقيع والختم الرسمي' : 'Signature & Cachet'}</span>
                    <span className="font-mono">[ DGF-SKK-OK ]</span>
                  </div>
                </div>

                {/* Box 2: DGPC Commandant */}
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700 print-stamp-box flex flex-col justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-amber-400 print:text-slate-900 uppercase">
                      {isAr ? 'مدير الحماية المدنية للولاية' : 'Directeur Protection Civile'}
                    </div>
                    <div className="text-[9px] text-slate-400 print:text-slate-600 mt-0.5">
                      Direction Générale de la Protection Civile
                    </div>
                    <div className="text-[9px] text-slate-400 print:text-slate-500 italic mt-1">
                      {isAr ? 'صودق عليه لإنهاء العمليات وتسريح الأرتال' : 'Vu pour clôture opérationnelle et repli'}
                    </div>
                  </div>
                  <div className="mt-8 pt-2 border-t border-slate-600 print:border-slate-400 flex items-center justify-between text-[9px] text-slate-400 print:text-slate-600">
                    <span>{isAr ? 'التوقيع والختم الدائري' : 'Signature & Visa'}</span>
                    <span className="font-mono">[ DGPC-OPS-VISA ]</span>
                  </div>
                </div>

                {/* Box 3: Digital System Verification & QR Code */}
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700 print-stamp-box flex flex-col justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-cyan-400 print:text-slate-900 uppercase flex items-center justify-between">
                      <span>{isAr ? 'التصديق الرقمي الوطني' : 'Certification AWIS'}</span>
                      <QrCode className="w-4 h-4 text-cyan-300 print:text-slate-800" />
                    </div>
                    <div className="text-[9px] text-slate-400 print:text-slate-600 mt-0.5 font-mono break-all">
                      SHA256: 8f4e2b19c83a70e281...0421
                    </div>
                    <div className="text-[8.5px] text-slate-400 print:text-slate-600 mt-1">
                      Horodatage: {report.containmentTime} UTC
                    </div>
                  </div>
                  <div className="mt-6 pt-2 border-t border-slate-600 print:border-slate-400 flex items-center justify-between text-[9px] text-slate-400 print:text-slate-600">
                    <span className="font-bold text-emerald-400 print:text-slate-900">
                      {isAr ? 'وثيقة أصلية معتمدة' : 'CONFORME AU REGISTRE'}
                    </span>
                    <span className="font-mono">#0421-ARCH</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            5. PRINT-ONLY LEGAL ARCHIVE FOOTER
            ========================================================================= */}
        <div className="print-only mt-4 pt-3 border-t border-slate-400 text-[8.5px] text-slate-600 flex items-center justify-between">
          <span>
            {isAr 
              ? 'وثيقة رسمية صادرة بموجب المرسوم التنفيذي رقم 21-344 المحدد للتدابير الوقائية ضد حرائق الغابات.'
              : 'Dossier officiel délivré en conformité avec le Décret Exécutif n° 21-344 relatif à la prévention des feux de forêts.'}
          </span>
          <span className="font-mono font-bold">
            AWIS-NATIONAL-REPORT • PAGE 1/1
          </span>
        </div>

        {/* =========================================================================
            6. SCREEN-ONLY MODAL FOOTER
            ========================================================================= */}
        <div className="no-print p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-slate-500">
              Official Reference: DZ-FOR-DOC-2026-POSTFIRE-0421
            </span>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400">
              {isAr ? 'جاهز للطباعة A4' : 'A4 Print Ready'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              id="btn-footer-preview-print"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition cursor-pointer flex items-center gap-1.5 border border-slate-700"
              title="Preview & Print"
            >
              <Printer className="w-3.5 h-3.5 text-indigo-300" />
              <span>{isAr ? 'معاينة الطباعة' : 'Preview Print'}</span>
            </button>
            <button
              id="btn-footer-download-pdf"
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white font-medium transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              title="Download official PDF document"
            >
              <Download className="w-3.5 h-3.5 text-white" />
              <span>{isGeneratingPDF ? (isAr ? 'جارٍ التحميل...' : 'Exporting...') : (isAr ? 'تحميل PDF' : 'Download PDF')}</span>
            </button>
            <button
              id="btn-footer-close-post-fire"
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
