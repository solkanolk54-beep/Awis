import React from 'react';
import { 
  X, 
  BarChart3, 
  TrendingDown, 
  ShieldCheck, 
  Clock, 
  Satellite, 
  Camera, 
  Flame, 
  MapPin,
  Sparkles
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  Legend
} from 'recharts';
import { Language } from '../../types';
import { translations } from '../../i18n/translations';

interface NationalAnalyticsModalProps {
  onClose: () => void;
  currentLang: Language;
}

export const NationalAnalyticsModal: React.FC<NationalAnalyticsModalProps> = ({
  onClose,
  currentLang
}) => {
  const t = translations[currentLang];

  const wilayaIncidentsData = [
    { wilaya: 'Jijel', incidents: 38, burnedHa: 420 },
    { wilaya: 'Tizi Ouzou', incidents: 44, burnedHa: 680 },
    { wilaya: 'Béjaïa', incidents: 35, burnedHa: 510 },
    { wilaya: 'El Tarf', incidents: 29, burnedHa: 340 },
    { wilaya: 'Skikda', incidents: 26, burnedHa: 290 },
    { wilaya: 'Blida', incidents: 19, burnedHa: 180 },
    { wilaya: 'Bouira', incidents: 22, burnedHa: 210 },
    { wilaya: 'Souk Ahras', incidents: 18, burnedHa: 195 }
  ];

  const monthlySeasonalityData = [
    { month: 'May', count: 4 },
    { month: 'Jun', count: 18 },
    { month: 'Jul', count: 72 },
    { month: 'Aug', count: 96 },
    { month: 'Sep', count: 48 },
    { month: 'Oct', count: 12 }
  ];

  const sourcePerformanceData = [
    { name: 'Satellites (FIRMS/ALSAT)', share: 42, color: '#38bdf8' },
    { name: 'Watchtower Optical CV', share: 28, color: '#f59e0b' },
    { name: 'Thermal Drones', share: 18, color: '#a855f7' },
    { name: 'Citizen Mobile App', share: 12, color: '#10b981' }
  ];

  const modelAccuracyTrend = [
    { version: 'v1.0 (2022)', accuracy: 68, falsePositives: 34 },
    { version: 'v2.1 (2023)', accuracy: 76, falsePositives: 25 },
    { version: 'v3.5 (2024)', accuracy: 84, falsePositives: 16 },
    { version: 'v4.1 (2025)', accuracy: 89, falsePositives: 11 },
    { version: 'v4.3 (2026)', accuracy: 94, falsePositives: 6 }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-purple-950 text-purple-200 border border-purple-700">
                  NATIONAL EXECUTIVE ANALYTICS
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Multi-Wilaya Temporal & Geospatial Intelligence
                </span>
              </div>
              <h2 className="text-base font-bold text-white mt-0.5">
                Algerian Wildfire Statistics, AI Accuracy & Response Latency Benchmarks
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

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-slate-200 text-xs">
          {/* Top High-Level Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700">
              <span className="text-[11px] text-slate-400">Total Ignitions (Season)</span>
              <div className="text-xl font-bold text-white mt-1 font-mono">250 Events</div>
              <div className="text-[10px] text-emerald-400 font-bold">↓ 14% vs 2024 Season</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700">
              <span className="text-[11px] text-slate-400">Avg Detection Latency</span>
              <div className="text-xl font-bold text-cyan-300 mt-1 font-mono">4.2 min</div>
              <div className="text-[10px] text-slate-400">Down from 28m pre-AWIS</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700">
              <span className="text-[11px] text-slate-400">False Positive Rate</span>
              <div className="text-xl font-bold text-purple-300 mt-1 font-mono">5.8%</div>
              <div className="text-[10px] text-emerald-400 font-bold">Multi-Sensor Crosscheck</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700">
              <span className="text-[11px] text-slate-400">Total Burned Canopy</span>
              <div className="text-xl font-bold text-amber-300 mt-1 font-mono">2,825 ha</div>
              <div className="text-[10px] text-emerald-400 font-bold">62% Contained early</div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Chart 1: Wilaya Breakdown */}
            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700 space-y-2">
              <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-red-400" />
                Wildfire Incidents & Burned Extent per Wilaya
              </h3>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={wilayaIncidentsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="wilaya" stroke="#94a3b8" fontSize={10} />
                    <YAxis stroke="#94a3b8" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }} />
                    <Bar dataKey="incidents" fill="#ef4444" name="Incidents" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="burnedHa" fill="#f59e0b" name="Burned Ha" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Monthly Seasonality */}
            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700 space-y-2">
              <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                Wildfire Seasonality Curve (Algerian Mediterranean Tell)
              </h3>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlySeasonalityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} />
                    <YAxis stroke="#94a3b8" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }} />
                    <Line type="monotone" dataKey="count" stroke="#f97316" strokeWidth={3} dot={{ fill: '#ea580c', r: 4 }} name="Incidents" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3: Detection Source Contribution */}
            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700 space-y-2">
              <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Satellite className="w-3.5 h-3.5 text-cyan-400" />
                Detection Source Distribution (%)
              </h3>
              <div className="h-52 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sourcePerformanceData}
                      dataKey="share"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      innerRadius={40}
                      paddingAngle={3}
                      label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                    >
                      {sourcePerformanceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 4: AI Model Evolution & False Positive Reduction */}
            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700 space-y-2">
              <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                Model Iteration: Accuracy vs False Positive Suppression
              </h3>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={modelAccuracyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="version" stroke="#94a3b8" fontSize={9} />
                    <YAxis stroke="#94a3b8" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }} />
                    <Line type="monotone" dataKey="accuracy" stroke="#10b981" strokeWidth={2.5} name="AI Accuracy %" />
                    <Line type="monotone" dataKey="falsePositives" stroke="#ef4444" strokeWidth={2.5} name="False Positive %" />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="font-mono">DATASET REFRESHED: REAL-TIME INGESTION LAYER ACTIVE</span>
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
