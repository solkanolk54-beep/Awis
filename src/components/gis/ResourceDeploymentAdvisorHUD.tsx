import React, { useState } from 'react';
import { 
  WildfireIncident, 
  EmergencyResource, 
  Language 
} from '../../types';
import { ResourceDeploymentAdvisor } from '../incident/ResourceDeploymentAdvisor';
import { 
  Sparkles, 
  X, 
  Maximize2, 
  Minimize2, 
  Flame, 
  ChevronDown, 
  CheckCircle2, 
  Navigation,
  Layers,
  Truck
} from 'lucide-react';

interface ResourceDeploymentAdvisorHUDProps {
  incidents: WildfireIncident[];
  selectedIncident: WildfireIncident;
  onSelectIncident: (inc: WildfireIncident) => void;
  availableResources: EmergencyResource[];
  onDispatchResource: (incidentId: string, resourceId: string) => void;
  currentLang: Language;
  onClose: () => void;
  onCenterMap?: (coords: { lat: number; lng: number }) => void;
}

export const ResourceDeploymentAdvisorHUD: React.FC<ResourceDeploymentAdvisorHUDProps> = ({
  incidents,
  selectedIncident,
  onSelectIncident,
  availableResources,
  onDispatchResource,
  currentLang,
  onClose,
  onCenterMap
}) => {
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');

  const isAr = currentLang === 'ar';
  const isFr = currentLang === 'fr';

  const handleToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4500);
  };

  return (
    <div
      id="resource-deployment-advisor-hud"
      className={`fixed z-50 transition-all duration-300 shadow-2xl flex flex-col bg-slate-950/95 backdrop-blur-xl border border-indigo-500/40 rounded-2xl overflow-hidden ${
        isMinimized
          ? 'bottom-6 left-6 w-96 h-16'
          : isExpanded
          ? 'inset-4 lg:inset-8 z-50'
          : 'bottom-6 left-6 right-6 sm:left-auto sm:right-6 sm:w-[680px] lg:w-[760px] max-h-[85vh]'
      }`}
    >
      {/* Toast Alert Banner */}
      {toastMessage && (
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage('')} className="text-white/80 hover:text-white cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="p-3.5 bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border-b border-indigo-500/30 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
            <Sparkles className="w-4 h-4 animate-pulse text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                <span>{isAr ? 'مستشار نشر الموارد الآلي' : isFr ? 'Conseiller de Déploiement IA' : 'Resource Deployment Advisor'}</span>
              </h3>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-amber-400 text-slate-950">
                LIVE MCDA
              </span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
              <span>{isAr ? 'حركة المرور • التضاريس • جاهزية العتاد' : 'Real-time Traffic • Terrain • Equipment'}</span>
            </div>
          </div>
        </div>

        {/* Incident Switcher & Window Actions */}
        <div className="flex items-center gap-2">
          {/* Incident Selector Dropdown */}
          <div className="relative">
            <select
              value={selectedIncident.id}
              onChange={(e) => {
                const found = incidents.find(inc => inc.id === e.target.value);
                if (found) {
                  onSelectIncident(found);
                  if (onCenterMap) onCenterMap(found.coordinates);
                }
              }}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-indigo-400 cursor-pointer max-w-[170px] sm:max-w-[210px] truncate"
              title="Select incident to evaluate"
            >
              {incidents.map((inc) => (
                <option key={inc.id} value={inc.id}>
                  {inc.code} - {isAr ? (inc.titleAr || inc.title) : inc.title}
                </option>
              ))}
            </select>
          </div>

          {/* Center Map on Incident */}
          {onCenterMap && (
            <button
              onClick={() => onCenterMap(selectedIncident.coordinates)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              title={isAr ? 'توسيط الخريطة على الحريق' : 'Center map on incident'}
            >
              <Navigation className="w-3.5 h-3.5 text-amber-400" />
            </button>
          )}

          {/* Minimize / Maximize */}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer hidden sm:inline-flex"
            title={isMinimized ? 'Restore' : 'Minimize'}
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              setIsExpanded(!isExpanded);
              setIsMinimized(false);
            }}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer hidden sm:inline-flex"
            title={isExpanded ? 'Compress' : 'Expand'}
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          {/* Close HUD */}
          <button
            id="btn-close-resource-advisor-hud"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-900/60 text-slate-400 hover:text-white transition cursor-pointer"
            title="Close Advisor HUD"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Scrollable Content */}
      {!isMinimized && (
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 custom-scrollbar space-y-6">
          <ResourceDeploymentAdvisor
            incident={selectedIncident}
            availableResources={availableResources}
            onDispatchResource={onDispatchResource}
            currentLang={currentLang}
            onDeploySuccess={handleToast}
          />
        </div>
      )}
    </div>
  );
};
