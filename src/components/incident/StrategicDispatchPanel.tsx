import React, { useState, useMemo, useEffect } from 'react';
import { 
  Sparkles, 
  Clock, 
  MapPin, 
  Truck, 
  Droplets, 
  Plane, 
  Radio, 
  CheckCircle2, 
  Award, 
  Route, 
  Send, 
  ChevronRight,
  ShieldCheck,
  Compass,
  Layers,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Navigation,
  Mountain,
  Wind,
  Play,
  Pause,
  Info,
  ShieldAlert
} from 'lucide-react';
import { WildfireIncident, EmergencyResource, Language, WaterPoint } from '../../types';
import { evaluateOptimalUnits, OptimalUnitRecommendation } from '../../services/aiDispatchEngine';
import { SAMPLE_WATER_POINTS } from '../../data/algeriaData';

interface StrategicDispatchPanelProps {
  incident: WildfireIncident;
  availableResources: EmergencyResource[];
  onDispatchResource: (incidentId: string, resourceId: string) => void;
  currentLang: Language;
  onDeploySuccess?: (message: string) => void;
  waterPoints?: WaterPoint[];
}

export const StrategicDispatchPanel: React.FC<StrategicDispatchPanelProps> = ({
  incident,
  availableResources,
  onDispatchResource,
  currentLang,
  onDeploySuccess,
  waterPoints = SAMPLE_WATER_POINTS
}) => {
  const [selectedRouteRank, setSelectedRouteRank] = useState<number | 'all'>('all');
  const [mapTheme, setMapTheme] = useState<'tactical' | 'topographic' | 'satellite'>('tactical');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [showContours, setShowContours] = useState<boolean>(true);
  const [showWaterPoints, setShowWaterPoints] = useState<boolean>(true);
  const [showWindVector, setShowWindVector] = useState<boolean>(true);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationProgress, setSimulationProgress] = useState<number>(0);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [calculationTimestamp, setCalculationTimestamp] = useState<string>('Live (Auto-Optimized)');
  const [activeWaypointModal, setActiveWaypointModal] = useState<string | null>(null);

  // Compute Top 3 optimal units
  const topOptimalUnits = useMemo(() => {
    return evaluateOptimalUnits(incident, availableResources);
  }, [incident, availableResources]);

  // Simulation loop
  useEffect(() => {
    let timer: any;
    if (isSimulating) {
      timer = setInterval(() => {
        setSimulationProgress((prev) => {
          if (prev >= 1) {
            setIsSimulating(false);
            return 1;
          }
          return prev + 0.02;
        });
      }, 60);
    }
    return () => clearInterval(timer);
  }, [isSimulating]);

  const handleStartSimulation = () => {
    setSimulationProgress(0);
    setIsSimulating(true);
  };

  const handleResetAiMatrix = () => {
    setIsCalculating(true);
    setTimeout(() => {
      setIsCalculating(false);
      setCalculationTimestamp(new Date().toLocaleTimeString());
      if (onDeploySuccess) {
        onDeploySuccess(
          currentLang === 'ar'
            ? 'تم تحديث مصفوفة المسارات التكتيكية وزمن الوصول بالذكاء الاصطناعي.'
            : 'AI Strategic Route Matrix & ETA recalculation completed.'
        );
      }
    }, 450);
  };

  // Deploy all 3 recommended units
  const handleDeployTaskForce = () => {
    let count = 0;
    topOptimalUnits.forEach((rec) => {
      if (!incident.assignedResources.includes(rec.resource.id)) {
        onDispatchResource(incident.id, rec.resource.id);
        count++;
      }
    });
    if (onDeploySuccess) {
      onDeploySuccess(
        currentLang === 'ar'
          ? `تم إرسال كامل الرتل الاستراتيجي الموصى به (${count} وحدات جديدة) عبر المسارات المحددة.`
          : `Deployed Strategic Task Force (${count} units mobilized along computed corridors).`
      );
    }
  };

  const allTop3Deployed = topOptimalUnits.length > 0 && topOptimalUnits.every((rec) =>
    incident.assignedResources.includes(rec.resource.id)
  );

  // -------------------------------------------------------------
  // GEOSPATIAL PROJECTION TO MINIATURE SVG MAP (800 x 480)
  // -------------------------------------------------------------
  const mapWidth = 800;
  const mapHeight = 460;
  const paddingX = 70;
  const paddingY = 60;

  const geoBounds = useMemo(() => {
    const lats = [incident.coordinates.lat];
    const lngs = [incident.coordinates.lng];

    topOptimalUnits.forEach((u) => {
      const loc = u.resource.currentLocation || u.resource.baseLocation;
      lats.push(loc.lat);
      lngs.push(loc.lng);
    });

    // Nearby water points within local radius
    const nearbyWater = waterPoints.filter((wp) => {
      const d = Math.sqrt(
        Math.pow(wp.coordinates.lat - incident.coordinates.lat, 2) +
        Math.pow(wp.coordinates.lng - incident.coordinates.lng, 2)
      );
      return d < 0.35;
    }).slice(0, 3);

    nearbyWater.forEach((wp) => {
      lats.push(wp.coordinates.lat);
      lngs.push(wp.coordinates.lng);
    });

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latDelta = Math.max(maxLat - minLat, 0.06);
    const lngDelta = Math.max(maxLng - minLng, 0.08);

    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;

    const spanLat = latDelta * (1.3 / zoomLevel);
    const spanLng = lngDelta * (1.35 / zoomLevel);

    return {
      minLat: centerLat - spanLat / 2,
      maxLat: centerLat + spanLat / 2,
      minLng: centerLng - spanLng / 2,
      maxLng: centerLng + spanLng / 2,
      nearbyWater
    };
  }, [incident.coordinates, topOptimalUnits, waterPoints, zoomLevel]);

  // Project lat/lng to SVG (X, Y)
  const project = (lat: number, lng: number) => {
    const normX = (lng - geoBounds.minLng) / (geoBounds.maxLng - geoBounds.minLng || 1);
    const normY = (lat - geoBounds.minLat) / (geoBounds.maxLat - geoBounds.minLat || 1);
    const x = paddingX + normX * (mapWidth - 2 * paddingX);
    const y = mapHeight - (paddingY + normY * (mapHeight - 2 * paddingY));
    return { x, y };
  };

  const incidentPoint = project(incident.coordinates.lat, incident.coordinates.lng);

  // Compute realistic route paths & waypoints for the 3 recommended units
  const unitRoutes = useMemo(() => {
    return topOptimalUnits.map((item, idx) => {
      const loc = item.resource.currentLocation || item.resource.baseLocation;
      const startPt = project(loc.lat, loc.lng);
      const endPt = incidentPoint;

      // Delta
      const dx = endPt.x - startPt.x;
      const dy = endPt.y - startPt.y;

      // Perpendicular vector for realistic road winding curve
      const dist = Math.sqrt(dx * dx + dy * dy);
      const nx = dist > 0 ? -dy / dist : 0;
      const ny = dist > 0 ? dx / dist : 0;

      // Curve curvature modifier based on rank and vehicle type
      const isAirAsset = item.resource.type === 'aircraft' || item.resource.type === 'drone';
      const curveMag = isAirAsset ? 10 : (idx === 0 ? 40 : idx === 1 ? -45 : 35);

      // Intermediate Waypoint 1 (Departure Access Pass)
      const wp1 = {
        x: startPt.x + dx * 0.35 + nx * curveMag,
        y: startPt.y + dy * 0.35 + ny * curveMag,
        name: idx === 0 
          ? 'RN-77 Junction Checkpoint' 
          : idx === 1 
          ? 'Aviation Air Corridor Beacon' 
          : 'W135 Valley Mountain Pass',
        nameAr: idx === 0 ? 'نقطة تفتيش مفترق الطريق RN-77' : idx === 1 ? 'منارة الممر الجوي العسكري' : 'ممر الوادي الجبلي W135',
        distanceKm: (item.distanceKm * 0.35).toFixed(1),
        etaMin: Math.max(1, Math.round(item.estimatedTravelTimeMinutes * 0.35))
      };

      // Intermediate Waypoint 2 (Tactical Staging / Refill area)
      const wp2 = {
        x: startPt.x + dx * 0.72 + nx * (curveMag * 0.7),
        y: startPt.y + dy * 0.72 + ny * (curveMag * 0.7),
        name: idx === 0 
          ? 'Ridge Access Point (Sector Alpha)' 
          : idx === 1 
          ? 'Target Approach Descent Fix' 
          : 'Taksebt Hydrant Fill Station',
        nameAr: idx === 0 ? 'مدخل المرتفع التكتيكي (قطاع ألفا)' : idx === 1 ? 'نقطة الانحدار نحو بؤرة الحريق' : 'نقطة التزود المائي بالخزان',
        distanceKm: (item.distanceKm * 0.72).toFixed(1),
        etaMin: Math.max(2, Math.round(item.estimatedTravelTimeMinutes * 0.72))
      };

      // Construct SVG curve path
      let svgPath = '';
      if (isAirAsset) {
        // Direct flight vector with smooth arc
        svgPath = `M ${startPt.x} ${startPt.y} Q ${startPt.x + dx * 0.5 + nx * 15} ${startPt.y + dy * 0.5 + ny * 15} ${endPt.x} ${endPt.y}`;
      } else {
        // Realistic mountain road spline through waypoints
        svgPath = `M ${startPt.x} ${startPt.y} C ${wp1.x} ${wp1.y}, ${wp2.x} ${wp2.y}, ${endPt.x} ${endPt.y}`;
      }

      // Calculation of current simulated vehicle coordinate along the path
      const t = simulationProgress;
      // Quadratic/cubic interpolation for animated position
      const currX = startPt.x + (endPt.x - startPt.x) * t + nx * curveMag * 4 * t * (1 - t);
      const currY = startPt.y + (endPt.y - startPt.y) * t + ny * curveMag * 4 * t * (1 - t);

      // Color pallete based on Rank
      const rankTheme = {
        1: {
          color: '#F59E0B', // Amber
          glow: 'rgba(245, 158, 11, 0.4)',
          textColor: 'text-amber-400',
          bgBadge: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
          strokeClass: 'stroke-amber-400',
          fillClass: 'fill-amber-400'
        },
        2: {
          color: '#06B6D4', // Cyan
          glow: 'rgba(6, 182, 212, 0.4)',
          textColor: 'text-cyan-400',
          bgBadge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50',
          strokeClass: 'stroke-cyan-400',
          fillClass: 'fill-cyan-400'
        },
        3: {
          color: '#10B981', // Emerald
          glow: 'rgba(16, 185, 129, 0.4)',
          textColor: 'text-emerald-400',
          bgBadge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50',
          strokeClass: 'stroke-emerald-400',
          fillClass: 'fill-emerald-400'
        }
      }[item.rank];

      return {
        item,
        startPt,
        endPt,
        wp1,
        wp2,
        svgPath,
        currPos: { x: currX, y: currY },
        rankTheme,
        isAirAsset
      };
    });
  }, [topOptimalUnits, incidentPoint, simulationProgress]);

  const getVehicleIcon = (type: EmergencyResource['type']) => {
    switch (type) {
      case 'drone':
        return <Radio className="w-3.5 h-3.5" />;
      case 'aircraft':
        return <Plane className="w-3.5 h-3.5" />;
      case 'water_tanker':
        return <Droplets className="w-3.5 h-3.5" />;
      default:
        return <Truck className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div 
      id="strategic-dispatch-panel"
      data-testid="strategic-dispatch-panel"
      className="space-y-4"
      dir={currentLang === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* 1. Header Banner & Tactical Action Deck */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-amber-500/30 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-slate-950 font-black shadow-lg shadow-amber-900/30 shrink-0">
              <Navigation className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                  {currentLang === 'ar' 
                    ? 'لوحة الإرسال الاستراتيجي ومسارات الانتشار (Strategic Dispatch)' 
                    : 'Strategic Dispatch: Optimal Deployment Routes'}
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold">
                  GIS MINIATURE MAP
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                  {calculationTimestamp}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                {currentLang === 'ar'
                  ? 'خريطة مصغرة تعرض المسار التكتيكي الأمثل وزمن السفر الدقيق لأفضل 3 وحدات تدخل ميداني نحو بؤرة الحريق.'
                  : 'Miniature GIS map visualizing optimal road and aerial deployment corridors, waypoint checkpoints, and ETA progression for recommended units.'}
              </p>
            </div>
          </div>

          {/* Action Trigger Buttons */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {/* Run Simulation */}
            <button
              id="btn-simulate-deployment"
              onClick={() => {
                if (isSimulating) {
                  setIsSimulating(false);
                } else {
                  handleStartSimulation();
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              title="Simulate vehicle deployment along corridors"
            >
              {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>
                {isSimulating 
                  ? (currentLang === 'ar' ? 'إيقاف المحاكاة' : 'Pause Run') 
                  : (currentLang === 'ar' ? 'محاكاة التحرك' : 'Simulate Run')}
              </span>
            </button>

            {/* Recalculate Matrix */}
            <button
              id="btn-recalculate-strategic-routes"
              onClick={handleResetAiMatrix}
              disabled={isCalculating}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-medium text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 text-amber-400 ${isCalculating ? 'animate-spin' : ''}`} />
              <span>{currentLang === 'ar' ? 'تحديث المسارات' : 'Optimize Routes'}</span>
            </button>

            {/* Deploy Entire Task Force */}
            <button
              id="btn-deploy-taskforce"
              onClick={handleDeployTaskForce}
              disabled={allTop3Deployed}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md ${
                allTop3Deployed
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-600/50 cursor-default'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/40'
              }`}
            >
              {allTop3Deployed ? <CheckCircle2 className="w-4 h-4" /> : <Send className="w-3.5 h-3.5" />}
              <span>
                {allTop3Deployed
                  ? (currentLang === 'ar' ? 'تم إرسال الرتل الثلاثي' : 'All 3 Routes Dispatched')
                  : (currentLang === 'ar' ? 'إرسال الرتل الثلاثي معاً' : 'Mobilize Strategic Task Force')}
              </span>
            </button>
          </div>
        </div>

        {/* Task Force Quick Summary Telemetry */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">
              {currentLang === 'ar' ? 'أول وصول مقدّر (First Water ETA)' : 'Earliest On-Scene ETA'}
            </span>
            <span className="text-base font-black font-mono text-emerald-400">
              {topOptimalUnits[0] ? `${topOptimalUnits[0].estimatedTravelTimeMinutes} min` : 'N/A'}
            </span>
            <span className="text-[10px] text-slate-500 block truncate">
              {topOptimalUnits[0] ? topOptimalUnits[0].resource.name : ''}
            </span>
          </div>

          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">
              {currentLang === 'ar' ? 'زمن إحكام التطويق (Full Containment)' : 'Full Containment ETA'}
            </span>
            <span className="text-base font-black font-mono text-amber-400">
              {topOptimalUnits[2] ? `${topOptimalUnits[2].estimatedTravelTimeMinutes} min` : 'N/A'}
            </span>
            <span className="text-[10px] text-slate-500 block truncate">
              {topOptimalUnits[2] ? topOptimalUnits[2].resource.name : ''}
            </span>
          </div>

          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">
              {currentLang === 'ar' ? 'معامل تعرج الطرق الجبلية' : 'Mountain Road Factor'}
            </span>
            <span className="text-base font-black font-mono text-cyan-400">
              1.38x
            </span>
            <span className="text-[10px] text-slate-500 block">
              RN-77 & W135 Tell Atlas
            </span>
          </div>

          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">
              {currentLang === 'ar' ? 'الرياح المؤثرة على الإطفاء' : 'Incident Head Wind'}
            </span>
            <span className="text-base font-black font-mono text-rose-400">
              {incident.windSpeedKmH} km/h
            </span>
            <span className="text-[10px] text-slate-500 block">
              Vector: {incident.windDirectionCardinal} ({incident.windDirectionDegrees}°)
            </span>
          </div>
        </div>
      </div>

      {/* 2. THE MINIATURE MAP VIEW COMPONENT */}
      <div 
        id="strategic-mini-map-container"
        data-testid="strategic-mini-map-container"
        className="rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl overflow-hidden relative"
      >
        {/* Map Header Controls Bar */}
        <div className="px-3.5 py-2.5 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Route Isolation Filters */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 px-1 font-bold uppercase tracking-wider flex items-center gap-1">
              <Route className="w-3 h-3 text-amber-400" />
              {currentLang === 'ar' ? 'مسار العرض:' : 'View Route:'}
            </span>
            <button
              onClick={() => setSelectedRouteRank('all')}
              className={`px-2 py-0.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                selectedRouteRank === 'all'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              {currentLang === 'ar' ? 'جميع المسارات (3)' : 'All Corridors (3)'}
            </button>
            {unitRoutes.map(({ item, rankTheme }) => (
              <button
                key={item.rank}
                onClick={() => setSelectedRouteRank(item.rank)}
                className={`px-2 py-0.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer flex items-center gap-1 ${
                  selectedRouteRank === item.rank
                    ? `${rankTheme.bgBadge} font-black ring-1 ring-amber-400/50`
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: rankTheme.color }} />
                <span>#{item.rank} {item.resource.code}</span>
              </button>
            ))}
          </div>

          {/* Layer and Map Mode Toggles */}
          <div className="flex items-center gap-2">
            {/* Topo Relief Toggle */}
            <button
              onClick={() => setShowContours(!showContours)}
              className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition cursor-pointer ${
                showContours 
                  ? 'bg-slate-800 border-amber-500/40 text-amber-300' 
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
              title="Toggle Topographic Elevation Contours"
            >
              <Mountain className="w-3.5 h-3.5" />
              <span className="hidden md:inline text-[11px]">{currentLang === 'ar' ? 'التضاريس' : 'Contours'}</span>
            </button>

            {/* Water Points Toggle */}
            <button
              onClick={() => setShowWaterPoints(!showWaterPoints)}
              className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition cursor-pointer ${
                showWaterPoints 
                  ? 'bg-slate-800 border-cyan-500/40 text-cyan-300' 
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
              title="Toggle Water Points along routes"
            >
              <Droplets className="w-3.5 h-3.5" />
              <span className="hidden md:inline text-[11px]">{currentLang === 'ar' ? 'نقاط المياه' : 'Water'}</span>
            </button>

            {/* Wind Vector Toggle */}
            <button
              onClick={() => setShowWindVector(!showWindVector)}
              className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition cursor-pointer ${
                showWindVector 
                  ? 'bg-slate-800 border-rose-500/40 text-rose-300' 
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
              title="Toggle Wind Spread Vector"
            >
              <Wind className="w-3.5 h-3.5" />
              <span className="hidden md:inline text-[11px]">{currentLang === 'ar' ? 'الرياح' : 'Wind'}</span>
            </button>

            {/* Zoom Controls */}
            <div className="flex items-center bg-slate-950 rounded-lg border border-slate-800 p-0.5">
              <button
                onClick={() => setZoomLevel((z) => Math.min(2.2, z + 0.2))}
                className="p-1 hover:bg-slate-800 text-slate-300 rounded cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoomLevel((z) => Math.max(0.8, z - 0.2))}
                className="p-1 hover:bg-slate-800 text-slate-300 rounded cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoomLevel(1)}
                className="p-1 hover:bg-slate-800 text-slate-300 rounded cursor-pointer"
                title="Reset View"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* SVG Tactical Miniature Map Canvas */}
        <div className="relative w-full aspect-[16/9] min-h-[380px] sm:min-h-[440px] max-h-[500px] bg-gradient-to-b from-[#060D1A] via-[#091322] to-[#040812] select-none overflow-hidden">
          <svg
            id="strategic-mini-map"
            data-testid="strategic-mini-map"
            viewBox={`0 0 ${mapWidth} ${mapHeight}`}
            className="w-full h-full"
          >
            <defs>
              {/* Gradients for deployment routes */}
              <linearGradient id="route-amber-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#EF4444" stopOpacity="1" />
              </linearGradient>

              <linearGradient id="route-cyan-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="1" />
              </linearGradient>

              <linearGradient id="route-emerald-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#059669" stopOpacity="1" />
              </linearGradient>

              {/* Fire hazard pulse glow filter */}
              <filter id="fire-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Route line glow filter */}
              <filter id="corridor-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Subtle background grid pattern */}
              <pattern id="tactical-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(51, 65, 85, 0.25)" strokeWidth="0.8" />
                <circle cx="0" cy="0" r="1" fill="rgba(148, 163, 184, 0.4)" />
              </pattern>
            </defs>

            {/* 1. Base Tactical Grid */}
            <rect width={mapWidth} height={mapHeight} fill="url(#tactical-grid)" />

            {/* 2. Topographic relief & forest massif shading (Yakouren / Djurdjura reserve) */}
            {showContours && (
              <g id="mini-map-topography" opacity="0.35">
                {/* Natural elevation contour isobaths */}
                <path
                  d="M 50 140 Q 200 90 380 130 T 720 100"
                  fill="none"
                  stroke="#334155"
                  strokeWidth="1.2"
                  strokeDasharray="4 4"
                />
                <path
                  d="M 40 220 Q 240 180 430 240 T 760 190"
                  fill="none"
                  stroke="#334155"
                  strokeWidth="1.2"
                  strokeDasharray="4 4"
                />
                <path
                  d="M 60 340 Q 280 290 510 330 T 740 310"
                  fill="none"
                  stroke="#334155"
                  strokeWidth="1.2"
                  strokeDasharray="4 4"
                />
                {/* Forest reserve terrain polygon */}
                <polygon
                  points="180,80 340,60 520,110 650,220 580,380 320,410 160,320 140,190"
                  fill="rgba(16, 185, 129, 0.05)"
                  stroke="rgba(16, 185, 129, 0.25)"
                  strokeWidth="1.2"
                />
                <text x="360" y="95" fill="rgba(52, 211, 153, 0.6)" fontSize="9" fontFamily="monospace" fontWeight="bold">
                  TELL ATLAS FOREST RESERVE (SLOPE {incident.terrainSlopeDegrees}°)
                </text>
              </g>
            )}

            {/* 3. Base Road Network Infrastructure (RN-12, RN-77) */}
            <g id="mini-map-road-infrastructure" opacity="0.28">
              <path
                d="M 20 280 Q 220 260 410 210 T 780 260"
                fill="none"
                stroke="#64748B"
                strokeWidth="2.5"
              />
              <text x="70" y="272" fill="#94A3B8" fontSize="8" fontFamily="monospace">RN-12 HIGHWAY</text>

              <path
                d="M 380 20 Q 420 210 440 450"
                fill="none"
                stroke="#64748B"
                strokeWidth="2"
              />
              <text x="390" y="440" fill="#94A3B8" fontSize="8" fontFamily="monospace">RN-77 AXIS</text>
            </g>

            {/* 4. Nearby Water Points / Replenishment Hydrants along corridors */}
            {showWaterPoints && (
              <g id="mini-map-water-points">
                {geoBounds.nearbyWater.map((wp) => {
                  const pt = project(wp.coordinates.lat, wp.coordinates.lng);
                  return (
                    <g key={wp.id} className="cursor-pointer">
                      <circle cx={pt.x} cy={pt.y} r="8" fill="rgba(6, 182, 212, 0.2)" stroke="#06B6D4" strokeWidth="1.5" />
                      <circle cx={pt.x} cy={pt.y} r="3" fill="#38BDF8" />
                      {/* Tooltip text */}
                      <text
                        x={pt.x + 10}
                        y={pt.y + 3}
                        fill="#38BDF8"
                        fontSize="9"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        {wp.name} ({wp.capacityM3} m³)
                      </text>
                    </g>
                  );
                })}
              </g>
            )}

            {/* 5. Wind Vector Overlay and Spread Ellipse */}
            {showWindVector && (
              <g id="mini-map-wind-vector">
                {/* Projected wind arrow from fire center */}
                {(() => {
                  const rad = (incident.windDirectionDegrees * Math.PI) / 180;
                  const arrowLen = 55;
                  const targetX = incidentPoint.x + Math.sin(rad) * arrowLen;
                  const targetY = incidentPoint.y - Math.cos(rad) * arrowLen;

                  return (
                    <g opacity="0.85">
                      {/* Fire convective spread ellipse cone */}
                      <ellipse
                        cx={incidentPoint.x + Math.sin(rad) * 22}
                        cy={incidentPoint.y - Math.cos(rad) * 22}
                        rx="38"
                        ry="20"
                        transform={`rotate(${incident.windDirectionDegrees}, ${incidentPoint.x + Math.sin(rad) * 22}, ${incidentPoint.y - Math.cos(rad) * 22})`}
                        fill="rgba(239, 68, 68, 0.12)"
                        stroke="rgba(239, 68, 68, 0.4)"
                        strokeWidth="1.2"
                        strokeDasharray="3 3"
                      />

                      {/* Wind velocity vector line */}
                      <line
                        x1={incidentPoint.x}
                        y1={incidentPoint.y}
                        x2={targetX}
                        y2={targetY}
                        stroke="#F43F5E"
                        strokeWidth="2"
                        strokeDasharray="4 2"
                      />
                      <polygon
                        points={`${targetX},${targetY} ${targetX - 5},${targetY + 4} ${targetX + 5},${targetY + 4}`}
                        fill="#F43F5E"
                        transform={`rotate(${incident.windDirectionDegrees + 90}, ${targetX}, ${targetY})`}
                      />
                      <text
                        x={targetX + 8}
                        y={targetY}
                        fill="#FDA4AF"
                        fontSize="9"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {incident.windSpeedKmH} km/h {incident.windDirectionCardinal}
                      </text>
                    </g>
                  );
                })()}
              </g>
            )}

            {/* 6. OPTIMAL DEPLOYMENT ROUTES (The 3 Recommended Units) */}
            <g id="mini-map-optimal-routes">
              {unitRoutes.map(({ item, svgPath, wp1, wp2, rankTheme, isAirAsset }) => {
                const isSelected = selectedRouteRank === 'all' || selectedRouteRank === item.rank;
                const isAssigned = incident.assignedResources.includes(item.resource.id);
                const opacity = isSelected ? 1 : 0.2;

                return (
                  <g key={item.resource.id} opacity={opacity} className="transition-opacity duration-300">
                    {/* Glowing under-stroke */}
                    <path
                      d={svgPath}
                      fill="none"
                      stroke={rankTheme.color}
                      strokeWidth={isSelected ? 6 : 3}
                      strokeOpacity={isSelected ? 0.35 : 0.15}
                      filter="url(#corridor-glow)"
                    />

                    {/* Main Corridor Stroke */}
                    <path
                      d={svgPath}
                      fill="none"
                      stroke={rankTheme.color}
                      strokeWidth={isSelected ? 3 : 2}
                      strokeDasharray={isAirAsset ? '8 6' : isAssigned ? 'none' : '6 4'}
                      strokeLinecap="round"
                      className={isAssigned ? 'animate-pulse' : ''}
                    />

                    {/* Directional animated flow along the route */}
                    <path
                      d={svgPath}
                      fill="none"
                      stroke="#FFFFFF"
                      strokeWidth={isSelected ? 2 : 1}
                      strokeDasharray="4 16"
                      strokeLinecap="round"
                      opacity={isSelected ? 0.8 : 0.3}
                      style={{
                        animation: 'dashMove 2s linear infinite'
                      }}
                    />

                    {/* Intermediate Waypoints along the route */}
                    {isSelected && (
                      <g>
                        {/* Waypoint 1 */}
                        <g 
                          className="cursor-pointer"
                          onClick={() => setActiveWaypointModal(wp1.name)}
                        >
                          <circle cx={wp1.x} cy={wp1.y} r="5" fill="#0F172A" stroke={rankTheme.color} strokeWidth="1.8" />
                          <circle cx={wp1.x} cy={wp1.y} r="2" fill={rankTheme.color} />
                          <text
                            x={wp1.x}
                            y={wp1.y - 8}
                            fill="#E2E8F0"
                            fontSize="8"
                            fontFamily="monospace"
                            fontWeight="bold"
                            textAnchor="middle"
                            className="bg-slate-950 px-1"
                          >
                            WP1: {wp1.name} (+{wp1.etaMin}m)
                          </text>
                        </g>

                        {/* Waypoint 2 */}
                        <g 
                          className="cursor-pointer"
                          onClick={() => setActiveWaypointModal(wp2.name)}
                        >
                          <circle cx={wp2.x} cy={wp2.y} r="5" fill="#0F172A" stroke={rankTheme.color} strokeWidth="1.8" />
                          <circle cx={wp2.x} cy={wp2.y} r="2" fill={rankTheme.color} />
                          <text
                            x={wp2.x}
                            y={wp2.y - 8}
                            fill="#E2E8F0"
                            fontSize="8"
                            fontFamily="monospace"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            WP2: {wp2.name} (+{wp2.etaMin}m)
                          </text>
                        </g>
                      </g>
                    )}
                  </g>
                );
              })}
            </g>

            {/* 7. ANIMATED VEHICLE POSITION ALONG ROUTE DURING SIMULATION */}
            {isSimulating && (
              <g id="mini-map-simulated-vehicles">
                {unitRoutes.map(({ item, currPos, rankTheme }) => {
                  const isSelected = selectedRouteRank === 'all' || selectedRouteRank === item.rank;
                  if (!isSelected) return null;

                  return (
                    <g key={`sim-${item.resource.id}`}>
                      {/* Vehicle pulse ring */}
                      <circle
                        cx={currPos.x}
                        cy={currPos.y}
                        r="12"
                        fill={rankTheme.glow}
                        className="animate-ping"
                      />
                      {/* Vehicle node */}
                      <circle
                        cx={currPos.x}
                        cy={currPos.y}
                        r="8"
                        fill="#0F172A"
                        stroke={rankTheme.color}
                        strokeWidth="2.5"
                      />
                      <circle
                        cx={currPos.x}
                        cy={currPos.y}
                        r="3.5"
                        fill={rankTheme.color}
                      />
                      <text
                        x={currPos.x}
                        y={currPos.y + 16}
                        fill="#FFFFFF"
                        fontSize="8"
                        fontFamily="monospace"
                        fontWeight="black"
                        textAnchor="middle"
                      >
                        {item.resource.code} ({Math.round(item.estimatedTravelTimeMinutes * (1 - simulationProgress))}m)
                      </text>
                    </g>
                  );
                })}
              </g>
            )}

            {/* 8. UNIT STARTING BASES / ORIGIN MARKERS */}
            <g id="mini-map-unit-origins">
              {unitRoutes.map(({ item, startPt, rankTheme }) => {
                const isSelected = selectedRouteRank === 'all' || selectedRouteRank === item.rank;
                const isAssigned = incident.assignedResources.includes(item.resource.id);

                return (
                  <g
                    key={`origin-${item.resource.id}`}
                    className="cursor-pointer"
                    onClick={() => setSelectedRouteRank(item.rank)}
                    opacity={isSelected ? 1 : 0.4}
                  >
                    {/* Base Node Circle */}
                    <circle
                      cx={startPt.x}
                      cy={startPt.y}
                      r="14"
                      fill="#020617"
                      stroke={rankTheme.color}
                      strokeWidth="2.5"
                      filter="url(#fire-glow)"
                    />

                    {/* Rank Number Inside Marker */}
                    <text
                      x={startPt.x}
                      y={startPt.y + 4}
                      fill={rankTheme.color}
                      fontSize="11"
                      fontWeight="black"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      #{item.rank}
                    </text>

                    {/* Origin Tactical Badge Card */}
                    <g transform={`translate(${startPt.x - 55}, ${startPt.y - 38})`}>
                      <rect
                        width="110"
                        height="26"
                        rx="6"
                        fill="#0F172A"
                        stroke={rankTheme.color}
                        strokeWidth="1.2"
                        opacity="0.95"
                      />
                      <text
                        x="55"
                        y="12"
                        fill="#FFFFFF"
                        fontSize="9"
                        fontWeight="bold"
                        fontFamily="monospace"
                        textAnchor="middle"
                      >
                        {item.resource.code} • {item.distanceKm} km
                      </text>
                      <text
                        x="55"
                        y="22"
                        fill={isAssigned ? '#34D399' : rankTheme.color}
                        fontSize="8"
                        fontWeight="bold"
                        fontFamily="monospace"
                        textAnchor="middle"
                      >
                        {isAssigned 
                          ? (currentLang === 'ar' ? 'بالطريق EN ROUTE' : 'EN ROUTE') 
                          : `ETA: ${item.estimatedTravelTimeMinutes} MIN`}
                      </text>
                    </g>
                  </g>
                );
              })}
            </g>

            {/* 9. INCIDENT FIREFRONT TARGET (THE DESTINATION) */}
            <g id="mini-map-incident-target">
              {/* Concentric expanding shockwave rings */}
              <circle
                cx={incidentPoint.x}
                cy={incidentPoint.y}
                r="34"
                fill="none"
                stroke="rgba(239, 68, 68, 0.2)"
                strokeWidth="1.5"
                className="animate-ping"
              />
              <circle
                cx={incidentPoint.x}
                cy={incidentPoint.y}
                r="22"
                fill="none"
                stroke="rgba(239, 68, 68, 0.4)"
                strokeWidth="2"
              />
              <circle
                cx={incidentPoint.x}
                cy={incidentPoint.y}
                r="12"
                fill="#EF4444"
                filter="url(#fire-glow)"
              />
              <circle
                cx={incidentPoint.x}
                cy={incidentPoint.y}
                r="5"
                fill="#FEF08A"
              />

              {/* Firefront Beacon Label Box */}
              <g transform={`translate(${incidentPoint.x - 75}, ${incidentPoint.y + 18})`}>
                <rect
                  width="150"
                  height="34"
                  rx="7"
                  fill="#1C1917"
                  stroke="#DC2626"
                  strokeWidth="1.5"
                  opacity="0.95"
                />
                <text
                  x="75"
                  y="14"
                  fill="#F87171"
                  fontSize="9"
                  fontWeight="black"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  🔥 TARGET: {incident.locationName.toUpperCase()}
                </text>
                <text
                  x="75"
                  y="26"
                  fill="#FCD34D"
                  fontSize="8"
                  fontWeight="bold"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  {incident.estimatedBurnedHectares} ha • SLOPE {incident.terrainSlopeDegrees}° • {incident.riskLevel.toUpperCase()}
                </text>
              </g>
            </g>

            {/* Map Frame Coordinates Labels */}
            <g fill="#64748B" fontSize="8" fontFamily="monospace">
              <text x="10" y="20">{geoBounds.maxLat.toFixed(3)}°N</text>
              <text x="10" y={mapHeight - 10}>{geoBounds.minLat.toFixed(3)}°N</text>
              <text x={mapWidth - 65} y={mapHeight - 10}>{geoBounds.maxLng.toFixed(3)}°E</text>
            </g>
          </svg>

          {/* Map Compass Rose Watermark */}
          <div className="absolute bottom-3 right-3 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800 text-[10px] font-mono text-slate-400 flex items-center gap-1.5 pointer-events-none">
            <Compass className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
            <span>N 000° GIS</span>
          </div>

          {/* Legend Overlay on bottom left */}
          <div className="absolute bottom-3 left-3 bg-slate-950/90 p-2 rounded-xl border border-slate-800 text-[10px] font-mono space-y-1 backdrop-blur-sm pointer-events-none">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-slate-300">Target Firefront Epicenter</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-0.5 bg-amber-400" />
              <span className="text-amber-300">#1 CCFM Rapid Attack (RN-77)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-0.5 bg-cyan-400" />
              <span className="text-cyan-300">#2 Air Support Corridor</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-0.5 bg-emerald-400" />
              <span className="text-emerald-300">#3 Hydraulic Tanker Logistics</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. DETAILED TURN-BY-TURN CORRIDOR & DEPLOYMENT ACTION CARDS */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between text-xs text-slate-400 uppercase tracking-wider font-bold px-1">
          <span className="flex items-center gap-1.5 text-amber-400">
            <Route className="w-4 h-4 text-amber-400" />
            {currentLang === 'ar' 
              ? 'تفاصيل المسار التكتيكي والوحدات الموصى بها' 
              : 'Recommended Unit Corridors & Action Protocol'}
          </span>
          <span className="text-[11px] font-mono text-slate-500">
            Click any unit to focus its deployment route on the map
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {unitRoutes.map(({ item, wp1, wp2, rankTheme, isAirAsset }) => {
            const isAssigned = incident.assignedResources.includes(item.resource.id);
            const isFocused = selectedRouteRank === item.rank;

            return (
              <div
                key={item.resource.id}
                onClick={() => setSelectedRouteRank(item.rank)}
                className={`rounded-2xl border ${
                  isFocused ? 'ring-2 ring-amber-400/80 border-amber-400' : 'border-slate-800'
                } bg-slate-900/90 shadow-lg flex flex-col justify-between overflow-hidden transition-all duration-200 cursor-pointer hover:border-slate-700`}
              >
                {/* Card Header */}
                <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-black font-mono px-2 py-0.5 rounded-full border ${rankTheme.bgBadge}`}>
                      #{item.rank} {currentLang === 'ar' ? item.tacticalRoleAr : item.tacticalRole}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                    {item.resource.wilaya}
                  </span>
                </div>

                {/* Unit Details */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start gap-2.5">
                      <div className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-white shrink-0">
                        {getVehicleIcon(item.resource.type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-emerald-400 text-xs px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700">
                            {item.resource.code}
                          </span>
                          <span className="text-xs font-bold text-white leading-snug">
                            {currentLang === 'ar' ? item.resource.nameAr : item.resource.name}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{item.resource.capacity || 'Tactical Suppression Unit'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Prominent ETA and Distance Row */}
                    <div className="mt-3 p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">
                          {currentLang === 'ar' ? 'زمن السفر التقديري' : 'Estimated Travel Time'}
                        </span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-xl font-black font-mono text-emerald-400">
                            {item.estimatedTravelTimeMinutes}
                          </span>
                          <span className="text-xs font-bold text-slate-300">
                            {currentLang === 'ar' ? 'دقيقة (min)' : 'minutes'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">
                          {currentLang === 'ar' ? 'مسافة الطريق' : 'Corridor Distance'}
                        </span>
                        <span className="text-sm font-black font-mono text-white mt-0.5 block">
                          {item.distanceKm} km
                        </span>
                      </div>
                    </div>

                    {/* Turn-by-Turn Waypoints Mini List */}
                    <div className="mt-3 space-y-1.5 text-[11px] bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                      <div className="text-[10px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1">
                        <Route className="w-3 h-3 text-amber-400" />
                        {currentLang === 'ar' ? 'محطات المسار ونقاط التفتيش' : 'Key Corridor Waypoints'}
                      </div>
                      <div className="space-y-1 text-slate-300 text-[10px] font-mono">
                        <div className="flex items-center justify-between text-slate-400">
                          <span>1. Base Departure:</span>
                          <span className="text-white">0.0 km (0 min)</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-400">
                          <span className="truncate max-w-[150px]">2. {wp1.name}:</span>
                          <span className="text-amber-300">+{wp1.etaMin} min</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-400">
                          <span className="truncate max-w-[150px]">3. {wp2.name}:</span>
                          <span className="text-cyan-300">+{wp2.etaMin} min</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-400 font-bold border-t border-slate-800/80 pt-1">
                          <span>4. Target Arrival:</span>
                          <span className="text-emerald-400">ETA {item.estimatedTravelTimeMinutes} min</span>
                        </div>
                      </div>
                    </div>

                    {/* AI Justification */}
                    <p className="text-[11px] text-slate-300 mt-2.5 leading-relaxed bg-slate-800/40 p-2 rounded-lg border border-slate-700/50">
                      {currentLang === 'ar' ? item.aiJustificationAr : item.aiJustification}
                    </p>
                  </div>

                  {/* Deploy Action Button */}
                  <div className="pt-3 border-t border-slate-800">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDispatchResource(incident.id, item.resource.id);
                        if (onDeploySuccess) {
                          onDeploySuccess(
                            currentLang === 'ar'
                              ? `تم إرسال ${item.resource.code} عبر مسار ${wp1.name}. زمن الوصول: ${item.estimatedTravelTimeMinutes} دقيقة.`
                              : `Unit ${item.resource.code} dispatched along designated corridor. ETA: ${item.estimatedTravelTimeMinutes} min.`
                          );
                        }
                      }}
                      disabled={isAssigned}
                      className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md ${
                        isAssigned
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-600/50 cursor-default'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40'
                      }`}
                    >
                      {isAssigned ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>{currentLang === 'ar' ? 'الوحدة بالطريق / تدخّل نشط' : 'En Route / Mobilized'}</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>
                            {currentLang === 'ar' 
                              ? `إرسال الوحدة عبر هذا المسار (${item.estimatedTravelTimeMinutes} دقيقة)` 
                              : `Deploy Along Route (${item.estimatedTravelTimeMinutes} min)`}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
