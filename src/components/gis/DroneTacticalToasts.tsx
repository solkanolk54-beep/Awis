import React, { useState } from 'react';
import { 
  Target, 
  Camera, 
  CheckCircle2, 
  Copy, 
  Check, 
  FileText, 
  X, 
  Flame, 
  Radio, 
  ShieldAlert,
  Send
} from 'lucide-react';
import { TacticalDropCoordinates } from '../../services/droneReconService';
import { DroneReconSnapshotData, generateExecutiveIncidentReport } from '../../services/incidentReportGenerator';
import { Language, WildfireIncident } from '../../types';

interface DroneAirDropToastProps {
  isOpen: boolean;
  onClose: () => void;
  dropInfo: TacticalDropCoordinates | null;
  incident: WildfireIncident;
  currentLang: Language;
}

export const DroneAirDropToast: React.FC<DroneAirDropToastProps> = ({
  isOpen,
  onClose,
  dropInfo,
  incident,
  currentLang
}) => {
  const [copied, setCopied] = useState(false);
  const isAr = currentLang === 'ar';

  if (!isOpen || !dropInfo) return null;

  const handleCopy = () => {
    const text = `[AWIS TACTICAL AIR-DROP TARGET]
Sector: ${dropInfo.targetSectorId}
Incident: ${incident.code || incident.id} (${incident.wilaya || 'DZ'})
WGS84: ${dropInfo.wgs84DMS}
Decimal: ${dropInfo.wgs84Decimal}
UTM Grid: ${dropInfo.utmGrid}
Target FRP: ${dropInfo.frpMw} MW | Core Temp: ${dropInfo.coreTempC}°C
Payload: ${dropInfo.recommendedRetardantLiters.toLocaleString()} Liters
Channel: ${dropInfo.airOpsRadioFrequency}
Status: TRANSMITTED TO AIR OPS ROOM L3`;

    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div 
      id="tactical-air-drop-toast"
      className="absolute top-16 left-1/2 -translate-x-1/2 z-[60] w-[94%] max-w-lg bg-slate-950/95 border-2 border-cyan-400 rounded-2xl shadow-[0_15px_40px_rgba(6,182,212,0.4)] backdrop-blur-xl p-4 text-white animate-in slide-in-from-top duration-300 pointer-events-auto"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-cyan-500/30 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 animate-pulse">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-cyan-200 flex items-center gap-2">
              <span>{isAr ? 'تم تحديد وتثبيت إحداثيات الإنزال الجوي' : 'Air-Drop Target Coordinates Locked'}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-900/80 text-cyan-300 border border-cyan-500/50">
                L3 AIR OPS
              </span>
            </h4>
            <p className="text-[11px] text-slate-300">
              {isAr ? 'تم الإرسال الفوري لغرفة العمليات الجوية L3 وأسراب Canadair / BE-200' : 'Directly transmitted to Air Ops Room L3 & Canadair Firefighting Fleet'}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          title={isAr ? 'إغلاق الإشعار' : 'Dismiss'}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Coordinate Details Grid */}
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
          <span className="text-slate-400 block text-[10px]">
            {isAr ? 'إحداثيات الملاحة WGS84 (DMS):' : 'WGS84 Navigation DMS:'}
          </span>
          <span className="text-cyan-300 font-bold break-all">{dropInfo.wgs84DMS}</span>
          <span className="text-[10px] text-slate-500 block mt-0.5 font-sans">
            ({dropInfo.wgs84Decimal})
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
          <span className="text-slate-400 block text-[10px]">
            {isAr ? 'الإسقاط التكتيكي العسكري (UTM):' : 'Military Grid (UTM):'}
          </span>
          <span className="text-emerald-300 font-bold break-all">{dropInfo.utmGrid}</span>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            {dropInfo.targetSectorId}
          </span>
        </div>
      </div>

      {/* Thermodynamic Metrics & Payload */}
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-xs">
        <div className="flex items-center gap-1.5 text-amber-300">
          <Flame className="w-3.5 h-3.5 text-red-400" />
          <span>FRP: <strong>{dropInfo.frpMw} MW</strong></span>
          <span className="text-slate-500">•</span>
          <span>{dropInfo.coreTempC}°C</span>
        </div>

        <div className="text-cyan-200">
          <span>{isAr ? 'الحمولة الموصى بها:' : 'Retardant Volume:'} </span>
          <strong className="text-white">{dropInfo.recommendedRetardantLiters.toLocaleString()} L</strong>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-800 text-xs">
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span>{isAr ? 'جاهز للتنفيذ التكتيكي الفوري' : 'Actionable in Air Operations Map'}</span>
        </div>

        <button
          id="btn-copy-drop-coords"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition shadow cursor-pointer text-xs"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? (isAr ? 'تم نسخ الإحداثيات' : 'Copied!') : (isAr ? 'نسخ الإحداثيات التكتيكية' : 'Copy Coordinates')}</span>
        </button>
      </div>
    </div>
  );
};

interface DroneSnapshotToastProps {
  isOpen: boolean;
  onClose: () => void;
  snapshotInfo: DroneReconSnapshotData | null;
  incident: WildfireIncident;
  currentLang: Language;
}

export const DroneSnapshotToast: React.FC<DroneSnapshotToastProps> = ({
  isOpen,
  onClose,
  snapshotInfo,
  incident,
  currentLang
}) => {
  const isAr = currentLang === 'ar';

  if (!isOpen || !snapshotInfo) return null;

  const handleDownloadReport = () => {
    generateExecutiveIncidentReport(
      {
        incident,
        droneReconSnapshotBase64: snapshotInfo.imageBase64,
        droneReconSnapshotMetadata: snapshotInfo
      },
      currentLang
    );
  };

  return (
    <div 
      id="tactical-snapshot-toast"
      className="absolute top-16 left-1/2 -translate-x-1/2 z-[60] w-[94%] max-w-lg bg-slate-950/95 border-2 border-emerald-500 rounded-2xl shadow-[0_15px_40px_rgba(16,185,129,0.4)] backdrop-blur-xl p-4 text-white animate-in slide-in-from-top duration-300 pointer-events-auto"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-emerald-500/30 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
            <Camera className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-emerald-300 flex items-center gap-2">
              <span>
                {isAr ? 'تم التقاط صك الاستطلاع الحراري وإرفاقه بالتقرير السيادي بنجاح' : 'Recon Telemetry Snapshot Attached to Sovereign Report'}
              </span>
            </h4>
            <p className="text-[11px] text-slate-300">
              {isAr ? 'الصورة التكتيكية مؤرخة ومدمجة تلقائياً في ملف التقرير التنفيذي الاستراتيجي (PDF)' : 'Snapshot automatically archived & embedded in sovereign executive incident dossier'}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          title={isAr ? 'إغلاق الإشعار' : 'Dismiss'}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Snapshot Thumbnail Preview & Metadata */}
      <div className="mt-3 flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl p-2.5">
        {snapshotInfo.imageBase64 && (
          <div className="relative w-28 h-20 rounded-lg overflow-hidden border border-emerald-500/50 flex-shrink-0 bg-black">
            <img 
              src={snapshotInfo.imageBase64} 
              alt="Tactical Drone Recon" 
              className="w-full h-full object-cover"
            />
            <div className="absolute top-1 left-1 px-1 py-0.2 rounded bg-black/70 font-mono text-[8px] text-emerald-300 font-bold">
              {snapshotInfo.mode.toUpperCase()}
            </div>
          </div>
        )}

        <div className="space-y-1 text-xs font-mono">
          <div className="text-slate-300">
            <span className="text-slate-500">{isAr ? 'المركبة: ' : 'UAV: '}</span>
            <span className="text-emerald-400 font-bold">{snapshotInfo.callsign}</span>
          </div>
          <div className="text-slate-300 text-[11px]">
            <span className="text-slate-500">{isAr ? 'البؤرة الحرارية: ' : 'Core: '}</span>
            <span className="text-red-400 font-bold">{snapshotInfo.coreTempC}°C</span>
            <span className="text-slate-500 mx-1">•</span>
            <span className="text-amber-300 font-bold">{snapshotInfo.frpMw} MW</span>
          </div>
          <div className="text-slate-400 text-[10px]">
            <span>{isAr ? 'إحداثيات نقطة الإنزال: ' : 'Drop Target: '}</span>
            <span className="text-cyan-300">{snapshotInfo.waterDropTarget.lat.toFixed(4)}°N, {snapshotInfo.waterDropTarget.lng.toFixed(4)}°E</span>
          </div>
        </div>
      </div>

      {/* Footer Buttons */}
      <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-800 text-xs">
        <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>{isAr ? 'محفوظ محلياً ومرفق بالتقرير' : 'Saved & Attached'}</span>
        </div>

        <button
          id="btn-generate-report-with-snapshot"
          onClick={handleDownloadReport}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition shadow cursor-pointer text-xs"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>{isAr ? 'توليد التقرير السيادي الآن (PDF)' : 'Generate Sovereign PDF Now'}</span>
        </button>
      </div>
    </div>
  );
};
