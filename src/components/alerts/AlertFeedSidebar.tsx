import React, { useState } from 'react';
import { 
  Bell, 
  AlertTriangle, 
  Flame, 
  Satellite, 
  Camera, 
  Smartphone, 
  Filter, 
  Clock, 
  ChevronRight,
  ShieldAlert,
  Sparkles,
  Volume2,
  VolumeX
} from 'lucide-react';
import { DetectionSignal, WildfireIncident, Language } from '../../types';
import { translations } from '../../i18n/translations';

interface AlertFeedSidebarProps {
  signals: DetectionSignal[];
  incidents: WildfireIncident[];
  onSelectIncident: (incident: WildfireIncident) => void;
  currentLang: Language;
}

export const AlertFeedSidebar: React.FC<AlertFeedSidebarProps> = ({
  signals,
  incidents,
  onSelectIncident,
  currentLang
}) => {
  const t = translations[currentLang];
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [soundEnabled, setSoundEnabled] = useState(true);

  const filteredSignals = signals.filter((s) => {
    if (sourceFilter === 'all') return true;
    if (sourceFilter === 'satellite') return s.source.includes('satellite');
    if (sourceFilter === 'camera') return s.source === 'watchtower_camera';
    if (sourceFilter === 'citizen') return s.source === 'citizen_app';
    return true;
  });

  const getSourceIcon = (source: string) => {
    if (source.includes('satellite')) return <Satellite className="w-3.5 h-3.5 text-cyan-400" />;
    if (source === 'watchtower_camera') return <Camera className="w-3.5 h-3.5 text-amber-400" />;
    return <Smartphone className="w-3.5 h-3.5 text-emerald-400" />;
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl text-xs">
      {/* Feed Header */}
      <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bell className="w-4 h-4 text-amber-400" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 animate-ping" />
          </div>
          <h3 className="font-bold text-slate-200 uppercase tracking-wider text-xs">
            {t.alertFeed}
          </h3>
          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
            {filteredSignals.length} Active
          </span>
        </div>
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          title={soundEnabled ? 'Mute Alert Chime' : 'Unmute Alert Chime'}
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="p-2 border-b border-slate-800/80 flex items-center gap-1 bg-slate-900/60 overflow-x-auto">
        {[
          { id: 'all', label: 'All Signals' },
          { id: 'satellite', label: 'Satellites' },
          { id: 'camera', label: 'Watchtowers' },
          { id: 'citizen', label: 'Citizen App' }
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setSourceFilter(f.id)}
            className={`px-2 py-1 rounded-md text-[11px] whitespace-nowrap transition cursor-pointer ${
              sourceFilter === f.id
                ? 'bg-slate-800 text-emerald-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Signals Scroll List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {filteredSignals.map((signal) => {
          // Find matching incident if correlated
          const matchedIncident = incidents.find((inc) => 
            inc.detectionSources.some((s) => s.id === signal.id)
          );

          return (
            <div
              key={signal.id}
              onClick={() => matchedIncident && onSelectIncident(matchedIncident)}
              className={`p-2.5 rounded-xl border transition cursor-pointer ${
                matchedIncident
                  ? 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/90'
                  : 'bg-slate-900/50 border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  {getSourceIcon(signal.source)}
                  <span className="font-bold text-slate-200 text-xs">
                    {signal.sourceName}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800">
                  Conf: {signal.confidence}%
                </span>
              </div>

              <p className="text-[11px] text-slate-300 leading-tight">
                {signal.details}
              </p>

              <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-800/80 text-[10px] text-slate-500 font-mono">
                <span>{signal.timestamp}</span>
                {matchedIncident && (
                  <span className="text-amber-400 font-bold flex items-center gap-0.5">
                    View Incident <ChevronRight className="w-3 h-3" />
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* System Ingestion Health Footer */}
      <div className="p-2.5 bg-slate-950 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Ingestion Hub: Sentinel, VIIRS, MeteoDZ OK</span>
        </span>
        <span className="font-mono text-slate-500">Latency: 1.2s</span>
      </div>
    </div>
  );
};
