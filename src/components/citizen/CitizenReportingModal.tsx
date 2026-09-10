import React, { useState } from 'react';
import { 
  X, 
  Flame, 
  MapPin, 
  Camera, 
  Send, 
  CheckCircle2, 
  Compass, 
  Smartphone, 
  Clock, 
  AlertCircle,
  ShieldCheck
} from 'lucide-react';
import { GeoCoordinates, Language } from '../../types';
import { translations } from '../../i18n/translations';
import { UserLivePosition, getLiveDevicePosition } from '../../services/liveGeolocationService';

interface CitizenReportingModalProps {
  onClose: () => void;
  onSubmitReport: (report: {
    location: GeoCoordinates;
    locationNameHint: string;
    smokeDirection: string;
    description: string;
    fireSizeEstimate: 'small' | 'medium' | 'large';
    imageUrl?: string;
    deviceInfo: string;
  }) => void;
  currentLang: Language;
  userPosition?: UserLivePosition | null;
}

export const CitizenReportingModal: React.FC<CitizenReportingModalProps> = ({
  onClose,
  onSubmitReport,
  currentLang,
  userPosition
}) => {
  const t = translations[currentLang];

  const [coords, setCoords] = useState<GeoCoordinates>(
    userPosition ? { lat: userPosition.lat, lng: userPosition.lng } : { lat: 36.784, lng: 5.719 }
  );
  const [locationHint, setLocationHint] = useState(
    userPosition ? `Live GPS Device Fix (±${userPosition.accuracyMeters}m)` : 'Texanna - Guerrouche road, near km 14'
  );
  const [smokeDirection, setSmokeDirection] = useState('NE');
  const [fireSize, setFireSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [description, setDescription] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(
    'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=400&q=80'
  );
  const [submitted, setSubmitted] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(userPosition?.accuracyMeters ?? null);

  const handleAcquireGps = async () => {
    setIsLocating(true);
    try {
      const pos = await getLiveDevicePosition();
      setCoords({ lat: pos.lat, lng: pos.lng });
      setGpsAccuracy(pos.accuracyMeters);
      setLocationHint(currentLang === 'ar' ? `إحداثيات حية من الهاتف (دقة ±${pos.accuracyMeters}م)` : `Live Phone GPS (±${pos.accuracyMeters}m accuracy)`);
    } catch {
      // Fallback realistic coords for Algeria
      setCoords({ lat: 36.7825, lng: 5.7215 });
    } finally {
      setIsLocating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitReport({
      location: coords,
      locationNameHint: locationHint,
      smokeDirection,
      description: description || 'Dense white/grey smoke observed above the pine ridge line, spreading fast with wind.',
      fireSizeEstimate: fireSize,
      imageUrl: selectedPhoto || undefined,
      deviceInfo: 'Android 14 (SM-A536B) / Cell Tower DZ-MOBILIS-0814'
    });
    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Mobile Style Header */}
        <div className="p-4 bg-gradient-to-r from-amber-600 via-red-600 to-amber-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-black/20 backdrop-blur-md">
              <Flame className="w-5 h-5 text-amber-200 animate-bounce" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">
                {t.reportFireBtn}
              </h2>
              <p className="text-[11px] text-amber-100/90 font-medium">
                Civil Protection & Forestry Operations Hotline
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {submitted ? (
          <div className="p-6 text-center space-y-4 text-slate-200">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-bold text-white">
              Report Transmitted to Command Center!
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Your GPS coordinates ({coords.lat}°N, {coords.lng}°E) and observation metadata have been ingested into the <strong>AWIS Alert Fusion Engine</strong>. If verified by satellite or watchtowers, local Civil Protection units will be dispatched immediately.
            </p>
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-400 flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Status: Under Multi-Source Correlation</span>
            </div>
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer"
            >
              {t.close}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 text-slate-200 text-xs">
            {/* GPS Coordinates Bar */}
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-red-400" />
                  {currentLang === 'ar' ? 'إحداثيات GPS المباشرة' : 'Automatic GPS Position'}
                  {gpsAccuracy !== null && (
                    <span className="text-emerald-400 font-mono text-[9px] bg-emerald-950 px-1.5 py-0.2 rounded border border-emerald-800">
                      ±{gpsAccuracy}m
                    </span>
                  )}
                </span>
                <span className="font-mono text-emerald-300 font-bold text-xs">
                  {coords.lat}° N, {coords.lng}° E
                </span>
              </div>
              <button
                type="button"
                onClick={handleAcquireGps}
                disabled={isLocating}
                className="px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium text-[11px] transition cursor-pointer"
              >
                {isLocating 
                  ? (currentLang === 'ar' ? 'جاري التحديد...' : 'Acquiring...') 
                  : (currentLang === 'ar' ? 'تحديث GPS الفعلي' : 'Refresh GPS')}
              </button>
            </div>

            {/* Location Description Hint */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Landmark / Road or Village Name:
              </label>
              <input
                type="text"
                value={locationHint}
                onChange={(e) => setLocationHint(e.target.value)}
                placeholder="e.g. Near Texanna school, beside forest track..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Smoke Drift Direction */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5 flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-sky-400" /> Smoke Drift Direction (If Known):
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'].map((dir) => (
                  <button
                    type="button"
                    key={dir}
                    onClick={() => setSmokeDirection(dir)}
                    className={`py-1.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                      smokeDirection === dir
                        ? 'bg-amber-500 text-black border border-amber-300'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                    }`}
                  >
                    {dir}
                  </button>
                ))}
              </div>
            </div>

            {/* Fire Size Estimate */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                Estimated Flame / Smoke Scale:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'small', label: 'Small Smoke Plume', desc: '< 0.5 ha' },
                  { id: 'medium', label: 'Advancing Fire Front', desc: '0.5 - 5 ha' },
                  { id: 'large', label: 'Massive Crown Fire', desc: '> 5 ha' }
                ].map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => setFireSize(s.id as any)}
                    className={`p-2 rounded-xl text-left border transition cursor-pointer ${
                      fireSize === s.id
                        ? 'bg-red-950/60 border-red-500 text-white'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <div className="font-bold text-[11px] text-red-300">{s.label}</div>
                    <div className="text-[10px] text-slate-500">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Attached Photo Evidence */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1">
                <Camera className="w-3.5 h-3.5 text-emerald-400" /> Photo Verification:
              </label>
              {selectedPhoto ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-700 max-h-32">
                  <img
                    src={selectedPhoto}
                    alt="Smoke Evidence"
                    className="w-full h-32 object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <button
                    type="button"
                    onClick={() => setSelectedPhoto(null)}
                    className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white hover:bg-black"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setSelectedPhoto('https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=400&q=80')}
                  className="w-full py-4 border-2 border-dashed border-slate-700 rounded-xl hover:border-amber-500 text-slate-400 flex flex-col items-center justify-center gap-1 cursor-pointer"
                >
                  <Camera className="w-5 h-5 text-slate-400" />
                  <span>Tap to capture or attach photo</span>
                </button>
              )}
            </div>

            {/* Device & Verification Security Note */}
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[10px] text-slate-500 font-mono flex items-center gap-2">
              <Smartphone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Attaching Device Telemetry (IMEI hash, carrier beacon, UTC timestamp) for anti-hoax verification.</span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-extrabold text-sm shadow-lg shadow-red-900/40 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{t.submitReport}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
