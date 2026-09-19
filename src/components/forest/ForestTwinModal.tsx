import React from 'react';
import { 
  X, 
  Trees, 
  Droplets, 
  Eye, 
  Shield, 
  History, 
  TrendingUp, 
  Mountain, 
  MapPin, 
  Sparkles,
  Activity,
  Layers,
  ThermometerSnowflake,
  AlertTriangle
} from 'lucide-react';
import { ForestZone, Language } from '../../types';
import { translations } from '../../i18n/translations';

interface ForestTwinModalProps {
  forest: ForestZone;
  onClose: () => void;
  currentLang: Language;
}

export const ForestTwinModal: React.FC<ForestTwinModalProps> = ({
  forest,
  onClose,
  currentLang
}) => {
  const t = translations[currentLang];

  return (
    <div 
      id="forest-twin-modal-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md overflow-y-auto cursor-pointer"
    >
      <div 
        id="forest-twin-modal-content"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] cursor-default"
      >
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
              <Trees className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  {forest.forestId}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded uppercase bg-slate-800 text-slate-300 border border-slate-700">
                  {forest.wilaya}
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded uppercase bg-red-950/80 text-red-300 border border-red-800">
                  Risk: {forest.currentRiskScore}/100
                </span>
              </div>
              <h2 className="text-lg font-bold text-white mt-0.5">
                {currentLang === 'ar' ? forest.nameAr : forest.name}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-slate-200 text-sm">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700">
              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-emerald-400" /> Total Area
              </div>
              <div className="text-base font-bold text-white mt-1">
                {forest.totalHectares.toLocaleString()} ha
              </div>
              <div className="text-[11px] text-slate-400">Canopy Classified</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700">
              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <Mountain className="w-3.5 h-3.5 text-sky-400" /> Topography
              </div>
              <div className="text-base font-bold text-sky-300 mt-1">
                {forest.elevationMeters} m
              </div>
              <div className="text-[11px] text-slate-400">Slope: {forest.slopeDegrees}° gradient</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700">
              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <ThermometerSnowflake className="w-3.5 h-3.5 text-amber-400" /> Fuel Moisture (FMI)
              </div>
              <div className="text-base font-bold text-amber-300 mt-1">
                {forest.fuelMoistureIndex} / 100
              </div>
              <div className="text-[11px] text-red-400">Critical Dryness</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700">
              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> NDVI Index
              </div>
              <div className="text-base font-bold text-emerald-400 mt-1 font-mono">
                {forest.ndviValue ?? ((forest.recoveryHealthPercent / 100) * 0.7).toFixed(2)}
              </div>
              <div className="text-[11px] text-amber-400 font-mono">
                Anomaly: {forest.ndviAnomalyPercent ?? -20}%
              </div>
            </div>
          </div>

          {/* Sentinel-2 Multi-Spectral NDVI & Vegetation Health Analysis Panel */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-500/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    {currentLang === 'ar' ? 'التحليل الطيفي لصحة الغطاء النباتي (Sentinel-2 MSI)' : 'Sentinel-2 Multi-Spectral NDVI & Fuel Biomass'}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    {forest.lastSatellitePass || 'Copernicus Sentinel-2 • 10-Day Multi-Spectral Composite'}
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold font-mono border ${
                (forest.ndviValue ?? 0.35) < 0.25
                  ? 'bg-red-950/80 text-red-300 border-red-700'
                  : (forest.ndviValue ?? 0.35) < 0.40
                  ? 'bg-amber-950/80 text-amber-300 border-amber-700'
                  : 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
              }`}>
                {(forest.ndviValue ?? 0.35) < 0.25 
                  ? (currentLang === 'ar' ? 'إجهاد جفاف حاد' : 'Critical Drought')
                  : (forest.ndviValue ?? 0.35) < 0.40
                  ? (currentLang === 'ar' ? 'عجز رطوبي' : 'Moisture Deficit')
                  : (currentLang === 'ar' ? 'غطاء نباتي صحي' : 'Healthy Canopy')}
              </span>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">
                  {currentLang === 'ar' ? 'محتوى رطوبة الأوراق (FMC)' : 'Foliar Moisture Content (FMC)'}
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-base font-bold font-mono text-cyan-300">
                    {forest.canopyMoisturePercent ?? 16}%
                  </span>
                  <span className="text-[10px] text-red-400">
                    (Ignition Threshold: &lt; 20%)
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">
                  {currentLang === 'ar' ? 'الكتلة الحيوية القابلة للاشتعال' : 'Combustible Live Fuel Load'}
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-base font-bold font-mono text-amber-300">
                    {forest.combustibleBiomassTonsHa ?? 24} t/ha
                  </span>
                  <span className="text-[10px] text-slate-400">
                    (Dry-matter load)
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">
                  {currentLang === 'ar' ? 'انحراف المقارنة التاريخية' : '10-Year Anomaly Departure'}
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className={`text-base font-bold font-mono ${
                    (forest.ndviAnomalyPercent ?? 0) < -20 ? 'text-red-400' : 'text-emerald-400'
                  }`}>
                    {forest.ndviAnomalyPercent ?? -15}%
                  </span>
                  <span className="text-[10px] text-slate-400">
                    vs Seasonal Median
                  </span>
                </div>
              </div>
            </div>

            {/* Continuous Color Bar Scale representation */}
            <div className="pt-1">
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1">
                <span>NDVI Index: <strong className="text-white">{forest.ndviValue ?? 0.35}</strong></span>
                <span className="text-[9px] text-slate-500">{forest.sentinel2BandRatio || 'B8(NIR) / B4(Red)'}</span>
              </div>
              <div className="relative h-2.5 w-full rounded-full bg-gradient-to-r from-red-600 via-amber-500 via-lime-500 to-emerald-600 overflow-hidden border border-slate-700">
                {/* Needle pointer */}
                <div 
                  className="absolute top-0 bottom-0 w-1.5 bg-white border border-slate-900 rounded-full shadow-lg transform -translate-x-1/2"
                  style={{ 
                    left: `${Math.max(5, Math.min(95, (((forest.ndviValue ?? 0.35) - 0.1) / 0.7) * 100))}%` 
                  }}
                />
              </div>
            </div>

            {/* Tactical Forest Flammability Guidance */}
            <div className="p-2 rounded bg-slate-950/60 border border-slate-800 text-[11px] text-slate-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                {currentLang === 'ar'
                  ? `توصية العمليات: نظراً لعجز الرطوبة الورقية (${forest.canopyMoisturePercent ?? 16}%) في كتلة ${forest.nameAr}، يُوصى بتكثيف دوريات الرصد بأبراج المراقبة (${forest.watchtowersCount}) وتجهيز خزانات التزود بالمياه القريبة (${forest.waterPointsCount} نقاط).`
                  : `Operational Advice: With canopy foliar moisture at ${forest.canopyMoisturePercent ?? 16}%, heightened flame-front velocities and crown ignition vulnerability require pre-positioning tactical tankers at nearby water points (${forest.waterPointsCount}) and proactive watchtower rotation.`}
              </p>
            </div>
          </div>

          {/* Vegetation & Biomass Profile */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700 space-y-2">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Trees className="w-4 h-4 text-emerald-400" />
              Vegetation Type & Fuel Load
            </h3>
            <div className="text-sm font-semibold text-emerald-300">
              {currentLang === 'ar' ? forest.vegetationTypeAr : forest.vegetationType}
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Density level: <strong className="text-slate-200">{forest.densityLevel}</strong>. Deep organic litter layer with flammable understory (Erica arborea, Calicotome spinosa) prone to rapid ember spotting during dry southern Sirocco wind conditions.
            </p>
          </div>

          {/* Infrastructure & Emergency Readiness */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Emergency Infrastructure Grid
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-800/70 border border-slate-700 flex items-center gap-2.5">
                <Droplets className="w-5 h-5 text-cyan-400" />
                <div>
                  <div className="font-bold text-white text-base font-mono">{forest.waterPointsCount}</div>
                  <div className="text-[11px] text-slate-400">Water Points & Dams</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/70 border border-slate-700 flex items-center gap-2.5">
                <Eye className="w-5 h-5 text-indigo-400" />
                <div>
                  <div className="font-bold text-white text-base font-mono">{forest.watchtowersCount}</div>
                  <div className="text-[11px] text-slate-400">Watchtower Posts</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/70 border border-slate-700 flex items-center gap-2.5">
                <Activity className="w-5 h-5 text-purple-400" />
                <div>
                  <div className="font-bold text-white text-base font-mono">{forest.droneStationsCount}</div>
                  <div className="text-[11px] text-slate-400">Drone Relays</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/70 border border-slate-700 flex items-center gap-2.5">
                <Shield className="w-5 h-5 text-amber-400" />
                <div>
                  <div className="font-bold text-white text-base font-mono">{forest.civilProtectionBasesCount}</div>
                  <div className="text-[11px] text-slate-400">CP Stations</div>
                </div>
              </div>
            </div>
          </div>

          {/* Historical Fire Record & Recovery */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700 space-y-2">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-4 h-4 text-amber-400" />
              Wildfire Recurrence & Post-Fire Succession
            </h3>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300">Total Historical Ignition Events Logged:</span>
              <span className="font-bold text-white font-mono">{forest.historicalFireCount} incidents</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300">Last Major Ignition Event:</span>
              <span className="font-bold text-amber-400 font-mono">Summer {forest.lastBurnYear || '2021'}</span>
            </div>
            {/* Progress bar for recovery */}
            <div className="pt-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                <span>Canopy Regeneration: {forest.recoveryHealthPercent}%</span>
                <span>Target: 100% (Pre-fire baseline)</span>
              </div>
              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div 
                  className="h-full bg-gradient-to-r from-yellow-500 via-emerald-500 to-emerald-400" 
                  style={{ width: `${forest.recoveryHealthPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="font-mono">Centroid: {forest.coordinates.lat}°N, {forest.coordinates.lng}°E</span>
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
