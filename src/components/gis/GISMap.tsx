import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Plus, 
  Minus, 
  RotateCcw, 
  Layers, 
  Flame, 
  Wind, 
  Droplets, 
  Radio, 
  Eye, 
  Compass, 
  Maximize2,
  Shield,
  Trees,
  Navigation,
  Crosshair,
  MapPin,
  Locate,
  RadioTower,
  Sparkles,
  WifiOff,
  HardDrive,
  Camera,
  Target,
  Activity,
  ChevronRight,
  Satellite,
  RefreshCw,
  AlertTriangle,
  SlidersHorizontal,
  Clock,
  TrendingUp,
  Mountain,
  Gauge,
  Info,
  X,
  CheckCircle2,
  Truck,
  Zap
} from 'lucide-react';
import { 
  WildfireIncident, 
  ForestZone, 
  WaterPoint, 
  WatchtowerCamera, 
  EmergencyResource, 
  Language,
  RiskLevel,
  DroneMissionState,
  DroneCameraMode
} from '../../types';
import { ALGERIA_WILAYAS } from '../../data/algeriaData';
import { translations } from '../../i18n/translations';
import { UserLivePosition, computeDistanceKm } from '../../services/liveGeolocationService';
import { LiveWeatherData } from '../../services/liveWeatherService';
import { createInitialDroneMission, computeDroneTacticalAssessment } from '../../services/droneReconService';
import { 
  fetchFirmsHotspots, 
  startFirmsPolling, 
  transformFirmsToIncidents, 
  FirmsDetection 
} from '../../services/firmsService';
import { LiveSatelliteModal } from './LiveSatelliteModal';
import { 
  SpreadSimulationEngine, 
  FireSpreadProjection 
} from '../../services/spreadSimulation';
import {
  clusterFirmsHotspots,
  promoteClusterToIncident,
  ActiveIncidentZone
} from '../../services/spatialClusteringService';
import { 
  generateForestNdviPixels, 
  getNdviColorStop, 
  NdviRasterPixel,
  DroughtScenarioKey,
  DROUGHT_SCENARIO_PRESETS,
  calculateDynamicForestNdvi,
  DynamicForestAssessment,
  DynamicNdviCalculationResult
} from '../../services/ndviService';
import { InteractiveNdviLegend } from '../forest/InteractiveNdviLegend';
import { 
  computeWilayaResourceBalances,
  computeNationalResourceSummary,
  WilayaResourceBalance,
  InterWilayaRecommendation,
  ResourceHeatmapMode
} from '../../services/resourceOptimizationService';
import { ResourceOptimizationHUD } from './ResourceOptimizationHUD';
import { EvacuationRoutesLayer } from './EvacuationRoutesLayer';
import { SmartEvacuationPlannerHUD } from './SmartEvacuationPlannerHUD';
import { AlertBanner } from './AlertBanner';
import { calculateSmartEvacuationPlan } from '../../services/smartEvacuationEngine';
import { AT_RISK_SETTLEMENTS, CivilianSettlement } from '../../data/algerianRoadNetwork';
import { CalculatedEvacuationRoute } from '../../types';
import { DynamicFireFrontLayer } from './DynamicFireFrontLayer';
import { FireFrontSimulationHUD } from './FireFrontSimulationHUD';
import { FireFrontDynamicsLayer } from './FireFrontDynamicsLayer';
import { FireFrontDynamicsHUD } from './FireFrontDynamicsHUD';
import { 
  calculateFireFrontDynamics, 
  FireFrontDynamicsResult, 
  FireFrontPolylineVertex 
} from '../../services/fireFrontDynamicsService';
import { ResourceDeploymentAdvisorHUD } from './ResourceDeploymentAdvisorHUD';
import { 
  FireFrontPhysicsEngine, 
  FireFrontSimulationConfig, 
  FireFrontVertex, 
  PhysicalFireFrontSimulationResult 
} from '../../services/fireFrontPhysicsEngine';
import { TerrainSteepnessOverlay } from './TerrainSteepnessOverlay';
import { TerrainSteepnessHUD } from './TerrainSteepnessHUD';
import { DroneMissionHUD } from './DroneMissionHUD';
import { AlsatFleetOverlay } from './AlsatFleetOverlay';
import { AlsatFleetHUD } from './AlsatFleetHUD';
import { AlSatControlModal } from './AlSatControlModal';
import { SatelliteStreamCard } from './SatelliteStreamCard';
import { 
  fetchAlsatFleetPositions, 
  computeAlsatPositionAtTime,
  computeAlsatOrbitalTrack, 
  fetchAlsatPasses, 
  initializeAlsatOfflineStorage 
} from '../../services/alsatTrackingService';
import { 
  AlsatSatelliteId, 
  AlsatRealtimePosition, 
  AlsatOrbitalTrack, 
  AlsatNdviPassData 
} from '../../types';
import { 
  generateRegionalSteepnessGrid, 
  CRITICAL_ESCARPMENT_ZONES, 
  TerrainSteepnessCell, 
  CriticalEscarpmentZone 
} from '../../services/terrainSteepnessService';

interface GISMapProps {
  incidents: WildfireIncident[];
  forests: ForestZone[];
  waterPoints: WaterPoint[];
  watchtowers: WatchtowerCamera[];
  resources: EmergencyResource[];
  selectedIncident: WildfireIncident | null;
  onSelectIncident: (inc: WildfireIncident) => void;
  onSelectForest: (forest: ForestZone) => void;
  onDispatchResource?: (incidentId: string, resourceId: string) => void;
  currentLang: Language;
  userPosition?: UserLivePosition | null;
  onLocateUser?: () => void;
  isLocating?: boolean;
  liveWeather?: LiveWeatherData | null;
  isOnline?: boolean;
  isSimulatedOffline?: boolean;
  onOpenOfflineManager?: () => void;
  droneMission?: DroneMissionState;
  onUpdateDroneMission?: (updated: Partial<DroneMissionState>) => void;
  onOpenDroneSimulation?: (incident?: WildfireIncident) => void;
  firmsDetections?: FirmsDetection[];
  onSelectFirmsDetection?: (detection: FirmsDetection) => void;
  onForceRefreshFirms?: () => Promise<void> | void;
  isFirmsRefreshing?: boolean;
  lastFirmsSyncTime?: Date | null;
  onPromoteClusterToIncident?: (incident: WildfireIncident) => void;
  isModalActive?: boolean;
  onDismissModal?: () => void;
}

export const GISMap: React.FC<GISMapProps> = ({
  incidents,
  forests,
  waterPoints,
  watchtowers,
  resources,
  selectedIncident,
  onSelectIncident,
  onSelectForest,
  onDispatchResource,
  currentLang,
  userPosition,
  onLocateUser,
  isLocating = false,
  liveWeather,
  isOnline = true,
  isSimulatedOffline = false,
  onOpenOfflineManager,
  droneMission,
  onUpdateDroneMission,
  onOpenDroneSimulation,
  firmsDetections,
  onSelectFirmsDetection,
  onForceRefreshFirms,
  isFirmsRefreshing = false,
  lastFirmsSyncTime,
  onPromoteClusterToIncident,
  isModalActive: isModalActiveProp,
  onDismissModal
}) => {
  const t = translations[currentLang];

  // NASA FIRMS Satellite Detections State
  const [internalFirmsHotspots, setInternalFirmsHotspots] = useState<FirmsDetection[]>([]);
  const [isFirmsLoading, setIsFirmsLoading] = useState<boolean>(false);
  const [selectedFirmsHotspot, setSelectedFirmsHotspot] = useState<FirmsDetection | null>(null);
  const [isSatelliteModalOpen, setIsSatelliteModalOpen] = useState<boolean>(false);
  const [localLastSyncTime, setLocalLastSyncTime] = useState<Date>(() => lastFirmsSyncTime || new Date());
  const [syncToastMessage, setSyncToastMessage] = useState<string | null>(null);
  const [secondsSinceSync, setSecondsSinceSync] = useState<number>(0);

  const handleSelectHotspotFromModal = (hotspot: FirmsDetection) => {
    setSelectedFirmsHotspot(hotspot);
    setLayers((prev) => ({ ...prev, nasaFirms: true }));
    const pt = geoToSvg(hotspot.latitude, hotspot.longitude);
    setZoom(2.2);
    setPan({ x: 500 - pt.x * 2.2, y: 325 - pt.y * 2.2 });
  };

  const activeFirmsHotspots = firmsDetections || internalFirmsHotspots;
  const effectiveIsLoading = isFirmsLoading || Boolean(isFirmsRefreshing);
  const activeSyncTime = lastFirmsSyncTime || localLastSyncTime;

  // Track seconds since last sync for live display & countdown to 60s
  useEffect(() => {
    const updateSeconds = () => {
      const elapsed = Math.max(0, Math.floor((Date.now() - activeSyncTime.getTime()) / 1000));
      setSecondsSinceSync(elapsed);
    };
    updateSeconds();
    const interval = setInterval(updateSeconds, 1000);
    return () => clearInterval(interval);
  }, [activeSyncTime]);

  // Poll NASA FIRMS satellite data periodically (fallback if parent isn't polling)
  useEffect(() => {
    if (firmsDetections && firmsDetections.length > 0) return;
    setIsFirmsLoading(true);
    const unsubscribe = startFirmsPolling((detections) => {
      setInternalFirmsHotspots(detections);
      setLocalLastSyncTime(new Date());
      setIsFirmsLoading(false);
    }, 45000);
    return () => unsubscribe();
  }, [firmsDetections]);

  // Force manual refresh of NASA FIRMS data (bypasses the 60-second periodic poll)
  const handleForceRefreshFirms = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsFirmsLoading(true);
    try {
      if (onForceRefreshFirms) {
        await onForceRefreshFirms();
      } else {
        const detections = await fetchFirmsHotspots(true);
        setInternalFirmsHotspots(detections);
      }
      const now = new Date();
      setLocalLastSyncTime(now);
      setSecondsSinceSync(0);
      const count = activeFirmsHotspots.length;
      setSyncToastMessage(
        currentLang === 'ar'
          ? `✓ تم تحديث بيانات NASA FIRMS فوراً (${count} بؤرة شذوذ حراري) — تم تجاوز مؤقت 60 ثانية`
          : currentLang === 'fr'
          ? `✓ Données NASA FIRMS actualisées immédiatement (${count} détections) — Sondage 60s réinitialisé`
          : `✓ NASA FIRMS data updated immediately (${count} hotspots active) — 60s auto-poll timer bypassed`
      );
      setTimeout(() => {
        setSyncToastMessage(null);
      }, 4500);
    } catch (err) {
      console.warn('FIRMS force refresh error:', err);
    } finally {
      setIsFirmsLoading(false);
    }
  };

  // Fallback drone mission state if not passed from parent
  const [internalDroneMission, setInternalDroneMission] = useState<DroneMissionState>(() => 
    createInitialDroneMission(selectedIncident || incidents[0])
  );

  const activeDroneMission = droneMission || internalDroneMission;
  const updateDroneMissionHandler = (updated: Partial<DroneMissionState>) => {
    if (onUpdateDroneMission) {
      onUpdateDroneMission(updated);
    } else {
      setInternalDroneMission(prev => ({ ...prev, ...updated }));
    }
  };

  // Find incident that drone is patrolling
  const dronePatrolIncident = incidents.find(i => i.id === activeDroneMission.activeIncidentId) || selectedIncident || incidents[0];
  const droneAssessment = useMemo(() => {
    return dronePatrolIncident ? computeDroneTacticalAssessment(dronePatrolIncident) : activeDroneMission.assessment;
  }, [dronePatrolIncident, activeDroneMission.assessment]);

  // Layer Visibility State (Prioritizes fast, non-cluttered base layers by default)
  const [layers, setLayers] = useState({
    wilayas: true,
    forests: true,
    ndvi: false, // Toggleable Sentinel-2 NDVI Vegetation Health Layer
    riskHeatmap: true,
    incidents: true,
    nasaFirms: true, // Toggleable NASA FIRMS Satellite Layer
    firmsHeatmap: false, // Toggleable Satellite Wildfire Risk Density Heatmap Layer
    firmsClusters: false, // Toggleable Active Incident Zones (Spatial Clusters) Layer
    spreadIsochrones: false, // Toggleable Fire Spread Projection Layer
    waterPoints: true,
    civilProtection: true,
    watchtowers: true,
    drones: false,
    windVectors: true,
    resourceHeatmap: false, // Toggleable Emergency Resources Available vs Needed Heatmap Layer
    evacuationPlanner: false, // Toggleable Smart Evacuation Planner & Safe Corridors Layer
    physicalFireFront: false, // Toggleable Rothermel Physical Fire Front Simulation Layer
    fireFrontDynamics: false, // Toggleable Fire Front Dynamics Service & Active Expansion Edge Polyline
    terrainSteepnessHeatmap: false, // Toggleable Terrain Steepness & Firefighting Machinery Mobility Heatmap Layer (DEM)
    alsatFleet: true // Toggleable Algerian Satellite Fleet (ALSAT-1B, ALSAT-2A, ALSAT-2B) Layer
  });

  // Centralized Mutual-Exclusivity Tactical HUD Manager:
  // Guarantees that at most ONE tactical analytical HUD is displayed at any time,
  // completely preventing visual clutter and overlapping stacked panels ("المواد المتراكمة فوق بعضها").
  type ActiveTacticalHUD = 'none' | 'projection' | 'evac' | 'frontDynamics' | 'rothermel' | 'advisor' | 'steepness' | 'resources' | 'drone' | 'alsat';
  const [activeHUD, setActiveHUD] = useState<ActiveTacticalHUD>('none');

  const showDroneHUD = activeHUD === 'drone';
  const setShowDroneHUD = useCallback((action: boolean | ((prev: boolean) => boolean)) => {
    setActiveHUD((curr) => {
      const isCurr = curr === 'drone';
      const next = typeof action === 'function' ? action(isCurr) : action;
      return next ? 'drone' : (isCurr ? 'none' : curr);
    });
  }, []);

  const showProjectionHUD = activeHUD === 'projection';
  const setShowProjectionHUD = useCallback((action: boolean | ((prev: boolean) => boolean)) => {
    setActiveHUD((curr) => {
      const isCurr = curr === 'projection';
      const next = typeof action === 'function' ? action(isCurr) : action;
      return next ? 'projection' : (isCurr ? 'none' : curr);
    });
  }, []);

  const showEvacHUD = activeHUD === 'evac';
  const setShowEvacHUD = useCallback((action: boolean | ((prev: boolean) => boolean)) => {
    setActiveHUD((curr) => {
      const isCurr = curr === 'evac';
      const next = typeof action === 'function' ? action(isCurr) : action;
      return next ? 'evac' : (isCurr ? 'none' : curr);
    });
  }, []);

  const showFireFrontDynamicsHUD = activeHUD === 'frontDynamics';
  const setShowFireFrontDynamicsHUD = useCallback((action: boolean | ((prev: boolean) => boolean)) => {
    setActiveHUD((curr) => {
      const isCurr = curr === 'frontDynamics';
      const next = typeof action === 'function' ? action(isCurr) : action;
      return next ? 'frontDynamics' : (isCurr ? 'none' : curr);
    });
  }, []);

  const showFireFrontHUD = activeHUD === 'rothermel';
  const setShowFireFrontHUD = useCallback((action: boolean | ((prev: boolean) => boolean)) => {
    setActiveHUD((curr) => {
      const isCurr = curr === 'rothermel';
      const next = typeof action === 'function' ? action(isCurr) : action;
      return next ? 'rothermel' : (isCurr ? 'none' : curr);
    });
  }, []);

  const showAdvisorHUD = activeHUD === 'advisor';
  const setShowAdvisorHUD = useCallback((action: boolean | ((prev: boolean) => boolean)) => {
    setActiveHUD((curr) => {
      const isCurr = curr === 'advisor';
      const next = typeof action === 'function' ? action(isCurr) : action;
      return next ? 'advisor' : (isCurr ? 'none' : curr);
    });
  }, []);

  const showSteepnessHUD = activeHUD === 'steepness';
  const setShowSteepnessHUD = useCallback((action: boolean | ((prev: boolean) => boolean)) => {
    setActiveHUD((curr) => {
      const isCurr = curr === 'steepness';
      const next = typeof action === 'function' ? action(isCurr) : action;
      return next ? 'steepness' : (isCurr ? 'none' : curr);
    });
  }, []);

  const showResourceHUD = activeHUD === 'resources';
  const setShowResourceHUD = useCallback((action: boolean | ((prev: boolean) => boolean)) => {
    setActiveHUD((curr) => {
      const isCurr = curr === 'resources';
      const next = typeof action === 'function' ? action(isCurr) : action;
      return next ? 'resources' : (isCurr ? 'none' : curr);
    });
  }, []);

  const showAlsatHUD = activeHUD === 'alsat';
  const setShowAlsatHUD = useCallback((action: boolean | ((prev: boolean) => boolean)) => {
    setActiveHUD((curr) => {
      const isCurr = curr === 'alsat';
      const next = typeof action === 'function' ? action(isCurr) : action;
      return next ? 'alsat' : (isCurr ? 'none' : curr);
    });
  }, []);

  // --- Smart Evacuation Planner State & Calculations ---
  const [selectedEvacSettlement, setSelectedEvacSettlement] = useState<CivilianSettlement>(AT_RISK_SETTLEMENTS[0]);
  const [selectedEvacRoute, setSelectedEvacRoute] = useState<CalculatedEvacuationRoute | null>(null);
  const [showEvacRoadNetwork, setShowEvacRoadNetwork] = useState<boolean>(true);
  const [showEvacSmokeCone, setShowEvacSmokeCone] = useState<boolean>(true);
  const [showEvacShelters, setShowEvacShelters] = useState<boolean>(true);

  // Temporary Dynamic Evacuation Path Lifecycle State
  const [evacGenerationTriggerKey, setEvacGenerationTriggerKey] = useState<number>(() => Date.now());
  const [isTemporaryDynamicActive, setIsTemporaryDynamicActive] = useState<boolean>(false);
  const [temporaryCountdownSeconds, setTemporaryCountdownSeconds] = useState<number>(45);
  const [isTemporaryPinned, setIsTemporaryPinned] = useState<boolean>(false);
  const [showAlertBanner, setShowAlertBanner] = useState<boolean>(false);

  // Identify confirmed fire incident for evacuation routing
  const confirmedFireIncident = useMemo(() => {
    if (
      selectedIncident &&
      (selectedIncident.status === 'confirmed' ||
        selectedIncident.status === 'active_response' ||
        selectedIncident.riskLevel === 'critical' ||
        selectedIncident.riskLevel === 'extreme')
    ) {
      return selectedIncident;
    }
    const foundConfirmed = incidents.find(
      (inc) => inc.status === 'confirmed' || inc.status === 'active_response'
    );
    return foundConfirmed || selectedIncident || incidents[0] || null;
  }, [selectedIncident, incidents]);

  // Active fire origin for evacuation routing calculation
  const evacFireCenter = useMemo(() => {
    if (confirmedFireIncident?.coordinates) return confirmedFireIncident.coordinates;
    return { lat: 36.781, lng: 5.722 };
  }, [confirmedFireIncident]);

  const evacWindHeading = useMemo(() => {
    return liveWeather?.windDirectionDegrees !== undefined 
      ? (liveWeather.windDirectionDegrees + 180) % 360 
      : 42;
  }, [liveWeather]);

  const evacWindSpeed = useMemo(() => {
    return liveWeather?.windSpeedKmH || 38;
  }, [liveWeather]);

  // Trigger temporary dynamic path & AlertBanner when recalculating or switching settlements
  const handleGenerateOrRecalculateRoute = (settlement?: CivilianSettlement) => {
    if (settlement) {
      setSelectedEvacSettlement(settlement);
    }
    setSelectedEvacRoute(null);
    const newKey = Date.now();
    setEvacGenerationTriggerKey(newKey);
    setIsTemporaryDynamicActive(true);
    setTemporaryCountdownSeconds(45);
    setIsTemporaryPinned(false);
    setShowAlertBanner(true);
    setLayers((l) => ({ ...l, evacuationPlanner: true }));
  };

  const handleExtendTemporary = () => {
    setTemporaryCountdownSeconds((prev) => prev + 30);
    setIsTemporaryDynamicActive(true);
  };

  const handlePinPermanent = () => {
    setIsTemporaryPinned(true);
    setIsTemporaryDynamicActive(true);
  };

  // Countdown timer for temporary dynamic path
  useEffect(() => {
    if (!isTemporaryDynamicActive || isTemporaryPinned) return;
    if (temporaryCountdownSeconds <= 0) {
      setIsTemporaryDynamicActive(false);
      return;
    }

    const timer = setInterval(() => {
      setTemporaryCountdownSeconds((prev) => {
        if (prev <= 1) {
          setIsTemporaryDynamicActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isTemporaryDynamicActive, isTemporaryPinned, temporaryCountdownSeconds]);

  // If confirmed fire incident changes, dynamically align with the nearest at-risk settlement
  useEffect(() => {
    if (!confirmedFireIncident?.coordinates) return;
    const fireLat = confirmedFireIncident.coordinates.lat;
    const fireLng = confirmedFireIncident.coordinates.lng;

    let closestSettlement = AT_RISK_SETTLEMENTS[0];
    let minDistance = Infinity;
    AT_RISK_SETTLEMENTS.forEach((settle) => {
      const dist = computeDistanceKm(
        { lat: fireLat, lng: fireLng },
        settle.coordinates
      );
      if (dist < minDistance) {
        minDistance = dist;
        closestSettlement = settle;
      }
    });

    if (closestSettlement && closestSettlement.id !== selectedEvacSettlement.id) {
      setSelectedEvacSettlement(closestSettlement);
      handleGenerateOrRecalculateRoute(closestSettlement);
    }
  }, [confirmedFireIncident?.id]);

  // Compute dynamic smart evacuation scenario using Algerian road network
  const evacuationPlan = useMemo(() => {
    return calculateSmartEvacuationPlan(
      evacFireCenter,
      evacWindHeading,
      evacWindSpeed,
      confirmedFireIncident?.id || selectedIncident?.id || 'INC-ACTIVE'
    );
  }, [evacFireCenter, evacWindHeading, evacWindSpeed, confirmedFireIncident, selectedIncident]);

  // Active evacuation route (either user-selected or the primary route for the selected settlement)
  const activeEvacRoute = useMemo(() => {
    if (selectedEvacRoute) return selectedEvacRoute;
    const currentSettlementRoutes = evacuationPlan.settlementRoutes.filter(
      (r) => r.settlementId === selectedEvacSettlement.id
    );
    return currentSettlementRoutes[0] || evacuationPlan.settlementRoutes[0] || null;
  }, [selectedEvacRoute, evacuationPlan, selectedEvacSettlement]);

  // --- Rothermel Physical Fire Front Simulation State ---
  const [fireFrontTimeMinutes, setFireFrontTimeMinutes] = useState<number>(60);
  const [fireFrontIsPlaying, setFireFrontIsPlaying] = useState<boolean>(false);
  const [showFireFrontVectors, setShowFireFrontVectors] = useState<boolean>(true);
  const [showFireFrontIsochrones, setShowFireFrontIsochrones] = useState<boolean>(true);
  const [showFireFrontDemBadges, setShowFireFrontDemBadges] = useState<boolean>(true);
  const [selectedFireFrontVertex, setSelectedFireFrontVertex] = useState<FireFrontVertex | null>(null);

  const [fireFrontConfig, setFireFrontConfig] = useState<FireFrontSimulationConfig>({
    origin: { lat: 36.781, lng: 5.722 },
    windSpeedKmH: 38,
    windDirectionDegrees: 225,
    fuelMoisturePercent: 9.5,
    fuelType: 'cork_oak',
    timeHorizonMinutes: 60,
    slopeMultiplierWeight: 1.15
  });

  useEffect(() => {
    if (selectedIncident?.coordinates) {
      setFireFrontConfig((prev) => ({
        ...prev,
        origin: selectedIncident.coordinates
      }));
    }
  }, [selectedIncident]);

  const fireFrontSimulation = useMemo(() => {
    return FireFrontPhysicsEngine.simulate(
      {
        ...fireFrontConfig,
        timeHorizonMinutes: fireFrontTimeMinutes
      },
      selectedIncident || undefined,
      forests[0] || undefined
    );
  }, [fireFrontConfig, fireFrontTimeMinutes, selectedIncident, forests]);

  // --- Fire Front Dynamics Service & Periodic Vector Engine State ---
  const [isDynamicsPeriodicActive, setIsDynamicsPeriodicActive] = useState<boolean>(true);
  const [dynamicsPeriodicIntervalSeconds, setDynamicsPeriodicIntervalSeconds] = useState<number>(3);
  const [dynamicsSimulationClockMinutes, setDynamicsSimulationClockMinutes] = useState<number>(60);
  const [dynamicsCycleCount, setDynamicsCycleCount] = useState<number>(0);
  const [showDynamicsVectors, setShowDynamicsVectors] = useState<boolean>(true);
  const [showDynamicsHistoricalTrails, setShowDynamicsHistoricalTrails] = useState<boolean>(true);
  const [showDynamicsVertexNodes, setShowDynamicsVertexNodes] = useState<boolean>(true);
  const [selectedDynamicsVertex, setSelectedDynamicsVertex] = useState<FireFrontPolylineVertex | null>(null);

  // Compute Fire Front Dynamics Result (Fused Multi-hour Wind + DEM Terrain Normal Kinematics)
  const fireFrontDynamicsResult = useMemo<FireFrontDynamicsResult>(() => {
    const origin = selectedIncident?.coordinates || { lat: 36.781, lng: 5.722 };
    return calculateFireFrontDynamics(
      origin,
      selectedIncident || undefined,
      {
        fuelMoisturePct: 8.5,
        baseFuelRateMMin: 2.8
      },
      dynamicsSimulationClockMinutes,
      dynamicsCycleCount
    );
  }, [selectedIncident, dynamicsSimulationClockMinutes, dynamicsCycleCount]);

  // Periodic Dynamic Update Loop: advances active front polyline periodically
  useEffect(() => {
    if (!layers.fireFrontDynamics || !isDynamicsPeriodicActive) return;

    const interval = setInterval(() => {
      setDynamicsSimulationClockMinutes((prev) => prev + 5);
      setDynamicsCycleCount((prev) => prev + 1);
    }, dynamicsPeriodicIntervalSeconds * 1000);

    return () => clearInterval(interval);
  }, [layers.fireFrontDynamics, isDynamicsPeriodicActive, dynamicsPeriodicIntervalSeconds]);

  // Manual step forward
  const handleDynamicsStepForward = (minutes = 10) => {
    setDynamicsSimulationClockMinutes((prev) => prev + minutes);
    setDynamicsCycleCount((prev) => prev + 1);
  };

  // Reset dynamics baseline
  const handleResetDynamics = () => {
    setDynamicsSimulationClockMinutes(60);
    setDynamicsCycleCount(0);
  };

  // Emergency Resource Heatmap & Asset Optimization State
  const [resourceHeatmapMode, setResourceHeatmapMode] = useState<ResourceHeatmapMode>('balance');
  const [resourceHeatmapOpacity, setResourceHeatmapOpacity] = useState<number>(0.75);
  const [selectedWilayaBalance, setSelectedWilayaBalance] = useState<WilayaResourceBalance | null>(null);
  const [resourceFilter, setResourceFilter] = useState<'all' | 'deficit_only' | 'surplus_only'>('all');
  const [transferredResources, setTransferredResources] = useState<EmergencyResource[]>(resources);

  // --- Terrain Steepness Heatmap & Machinery Mobility State (DEM Analysis) ---
  const [terrainSteepnessOpacity, setTerrainSteepnessOpacity] = useState<number>(0.75);
  const [terrainSteepnessMode, setTerrainSteepnessMode] = useState<'all' | 'critical_only' | 'machinery_access' | 'ground_crew_safety'>('all');
  const [showSteepnessBlobs, setShowSteepnessBlobs] = useState<boolean>(true);
  const [showSteepnessVectors, setShowSteepnessVectors] = useState<boolean>(true);
  const [showSteepnessBadges, setShowSteepnessBadges] = useState<boolean>(true);
  const [selectedSteepnessCell, setSelectedSteepnessCell] = useState<TerrainSteepnessCell | null>(null);
  const [selectedCriticalEscarpment, setSelectedCriticalEscarpment] = useState<CriticalEscarpmentZone | null>(null);

  // Pre-generate regional terrain steepness grid from DEM data
  const regionalSteepnessData = useMemo(() => {
    return generateRegionalSteepnessGrid();
  }, []);

  // Synchronize internal transferred resources when external resources change
  useEffect(() => {
    setTransferredResources(resources);
  }, [resources]);

  // Dynamically calculate Wilaya resource balances (Available vs Needed)
  const wilayaResourceBalances = useMemo(() => {
    return computeWilayaResourceBalances(ALGERIA_WILAYAS, transferredResources, incidents, forests, resourceHeatmapMode);
  }, [transferredResources, incidents, forests, resourceHeatmapMode]);

  // National Fleet summary and AI inter-wilaya transfer recommendations
  const nationalResourceSummary = useMemo(() => {
    return computeNationalResourceSummary(wilayaResourceBalances);
  }, [wilayaResourceBalances]);

  // Filtered Wilayas according to commander selection
  const displayedWilayaBalances = useMemo(() => {
    if (resourceFilter === 'deficit_only') {
      return wilayaResourceBalances.filter(b => b.status === 'critical_deficit' || b.status === 'moderate_deficit');
    }
    if (resourceFilter === 'surplus_only') {
      return wilayaResourceBalances.filter(b => b.status === 'surplus');
    }
    return wilayaResourceBalances;
  }, [wilayaResourceBalances, resourceFilter]);

  // Execute recommendation dispatch simulation
  const handleExecuteRecommendation = (rec: InterWilayaRecommendation) => {
    setTransferredResources((prev) => {
      const idx = prev.findIndex(
        (r) =>
          (r.wilaya.toLowerCase() === rec.fromWilaya.toLowerCase() ||
            r.wilaya.toLowerCase() === rec.fromWilayaAr.toLowerCase()) &&
          r.status === 'available'
      );
      if (idx !== -1) {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          status: 'dispatched',
          wilaya: rec.toWilaya,
          estimatedArrivalMinutes: rec.estimatedTransitMinutes
        };
        return updated;
      }
      return prev;
    });
  };

  // Multi-Spectral NDVI & Drought Stress Layer Dynamic State
  const [ndviOpacity, setNdviOpacity] = useState<number>(0.70);
  const [ndviFilter, setNdviFilter] = useState<'all' | 'critical_drought' | 'moisture_stressed' | 'moderate' | 'healthy_dense'>('all');
  const [hoveredNdviPixel, setHoveredNdviPixel] = useState<NdviRasterPixel | null>(null);
  const [showNdviControl, setShowNdviControl] = useState<boolean>(false);
  const [isCalculatingNdvi, setIsCalculatingNdvi] = useState<boolean>(false);
  const [droughtStressFactor, setDroughtStressFactor] = useState<number>(-0.09); // Default: Late Summer Aridity
  const [selectedScenarioKey, setSelectedScenarioKey] = useState<DroughtScenarioKey>('late_summer');
  const [sensorNirScale, setSensorNirScale] = useState<number>(0.91);
  const [sensorRedScale, setSensorRedScale] = useState<number>(1.12);
  const [lastNdviCalcTimestamp, setLastNdviCalcTimestamp] = useState<string>(() => new Date().toLocaleTimeString());

  // Dynamic NDVI & Drought Stress Calculation Engine
  const dynamicNdviResult = useMemo(() => {
    return calculateDynamicForestNdvi(forests, {
      droughtStressFactor,
      scenarioKey: selectedScenarioKey,
      sensorNirScale,
      sensorRedScale
    });
  }, [forests, droughtStressFactor, selectedScenarioKey, sensorNirScale, sensorRedScale]);

  const filteredNdviPixels = useMemo(() => {
    if (ndviFilter === 'all') return dynamicNdviResult.pixels;
    return dynamicNdviResult.pixels.filter(p => p.stressCategory === ndviFilter);
  }, [dynamicNdviResult.pixels, ndviFilter]);

  const handleApplyScenario = (scenario: typeof DROUGHT_SCENARIO_PRESETS[number]) => {
    setSelectedScenarioKey(scenario.key);
    setDroughtStressFactor(scenario.stressFactor);
    setSensorNirScale(scenario.nirMultiplier);
    setSensorRedScale(scenario.redMultiplier);
    setLastNdviCalcTimestamp(new Date().toLocaleTimeString());
    if (!layers.ndvi) {
      setLayers(prev => ({ ...prev, ndvi: true }));
    }
  };

  const handleTriggerNdviRecalculation = () => {
    setIsCalculatingNdvi(true);
    if (!layers.ndvi) {
      setLayers(prev => ({ ...prev, ndvi: true }));
    }
    setTimeout(() => {
      setIsCalculatingNdvi(false);
      setLastNdviCalcTimestamp(new Date().toLocaleTimeString());
    }, 380);
  };

  const currentScenarioObj = DROUGHT_SCENARIO_PRESETS.find(s => s.key === selectedScenarioKey);
  const appliedScenarioLabel = currentScenarioObj 
    ? (currentLang === 'ar' ? currentScenarioObj.labelAr : currentLang === 'fr' ? currentScenarioObj.labelFr : currentScenarioObj.labelEn)
    : (currentLang === 'ar' ? 'مخصص' : 'Custom');

  // FIRMS Satellite Wildfire Risk Density Heatmap Opacity State
  const [firmsHeatmapOpacity, setFirmsHeatmapOpacity] = useState<number>(0.65);
  const [showHeatmapControl, setShowHeatmapControl] = useState<boolean>(false);

  // Computed FIRMS Thermal Density Analytics
  const firmsHeatmapStats = useMemo(() => {
    const totalFrp = Math.round(activeFirmsHotspots.reduce((acc, h) => acc + (h.frpMw || 0), 0));
    const avgTempC = activeFirmsHotspots.length > 0
      ? Math.round(activeFirmsHotspots.reduce((acc, h) => acc + (h.brightnessTempKelvin - 273.15), 0) / activeFirmsHotspots.length)
      : 0;
    return { totalFrp, avgTempC, count: activeFirmsHotspots.length };
  }, [activeFirmsHotspots]);

  // Quick toggle/cycle FIRMS heatmap opacity: 0% -> 35% -> 65% -> 90% -> 0%
  const toggleFirmsHeatmapOpacity = () => {
    setFirmsHeatmapOpacity((prev) => {
      if (prev <= 0 || !layers.firmsHeatmap) {
        setLayers((l) => ({ ...l, firmsHeatmap: true }));
        return 0.35;
      }
      if (prev <= 0.35) return 0.65;
      if (prev <= 0.65) return 0.90;
      // Cycle to off (0)
      return 0;
    });
  };

  const handleHeatmapOpacityChange = (val: number) => {
    setFirmsHeatmapOpacity(val);
    if (val > 0 && !layers.firmsHeatmap) {
      setLayers((l) => ({ ...l, firmsHeatmap: true }));
    }
  };

  // --- Algerian Space Agency (ASAL) ALSAT Satellite Fleet Integration State ---
  const [alsatPositions, setAlsatPositions] = useState<Record<AlsatSatelliteId, AlsatRealtimePosition>>(() => {
    const now = new Date();
    return {
      'ALSAT-1B': computeAlsatPositionAtTime('ALSAT-1B', now),
      'ALSAT-2A': computeAlsatPositionAtTime('ALSAT-2A', now),
      'ALSAT-2B': computeAlsatPositionAtTime('ALSAT-2B', now)
    };
  });

  const [alsatPasses, setAlsatPasses] = useState<AlsatNdviPassData[]>([]);
  const [selectedAlsatSatellite, setSelectedAlsatSatellite] = useState<AlsatSatelliteId | 'ALL'>('ALL');
  const [selectedAlsatPass, setSelectedAlsatPass] = useState<AlsatNdviPassData | null>(null);
  const [showAlsatOrbitalTracks, setShowAlsatOrbitalTracks] = useState<boolean>(true);
  const [showAlsatSwathCorridors, setShowAlsatSwathCorridors] = useState<boolean>(true);
  const [showAlsatNdviFootprints, setShowAlsatNdviFootprints] = useState<boolean>(true);

  // Compute instantaneous orbital tracks and swaths
  const alsatTracks = useMemo<Record<AlsatSatelliteId, AlsatOrbitalTrack>>(() => {
    const now = new Date();
    return {
      'ALSAT-1B': computeAlsatOrbitalTrack('ALSAT-1B', now),
      'ALSAT-2A': computeAlsatOrbitalTrack('ALSAT-2A', now),
      'ALSAT-2B': computeAlsatOrbitalTrack('ALSAT-2B', now)
    };
  }, []);

  // Initialize offline IndexedDB passes and fetch realtime ALSAT positions
  useEffect(() => {
    let isMounted = true;

    async function initAlsat() {
      // 1. Initialize offline storage with default ASAL passes
      const offlinePasses = await initializeAlsatOfflineStorage();
      if (isMounted && offlinePasses && offlinePasses.length > 0) {
        setAlsatPasses(offlinePasses);
      }

      // 2. Refresh passes from API proxy
      const remotePasses = await fetchAlsatPasses();
      if (isMounted && remotePasses && remotePasses.length > 0) {
        setAlsatPasses(remotePasses);
      }

      // 3. Initial fleet positions
      const positions = await fetchAlsatFleetPositions();
      if (isMounted && positions) {
        setAlsatPositions(positions);
      }
    }

    initAlsat();

    // Periodic telemetry update every 12 seconds
    const interval = setInterval(async () => {
      const positions = await fetchAlsatFleetPositions();
      if (isMounted && positions) {
        setAlsatPositions(positions);
      }
    }, 12000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleRefreshAlsatTelemetry = async () => {
    const positions = await fetchAlsatFleetPositions();
    if (positions) {
      setAlsatPositions(positions);
    }
  };

  // Fire Spread Projection State (Dynamic Live Weather & Terrain Model)
  const [projectionHorizon, setProjectionHorizon] = useState<30 | 60 | 180 | 360 | 'all'>('all');
  const [projectionTargetMode, setProjectionTargetMode] = useState<'confirmed_active' | 'selected' | 'all'>('confirmed_active');
  const [selectedProjectionIncidentId, setSelectedProjectionIncidentId] = useState<string | null>(null);

  // Compute dynamic Fire Spread Projections using Live Weather (wind direction/speed) and Terrain data
  const fireSpreadProjections = useMemo<FireSpreadProjection[]>(() => {
    // 1. Identify target active incidents based on mode
    let targetIncidents = incidents.filter((inc) => {
      if (projectionTargetMode === 'confirmed_active') {
        return (
          inc.status === 'confirmed' ||
          inc.status === 'active_response' ||
          Boolean(inc.confirmationTime) ||
          (selectedIncident && selectedIncident.id === inc.id && inc.status !== 'extinguished' && inc.status !== 'closed')
        );
      } else if (projectionTargetMode === 'selected') {
        return selectedIncident ? inc.id === selectedIncident.id : false;
      } else {
        return inc.status !== 'extinguished' && inc.status !== 'closed' && inc.status !== 'false_positive';
      }
    });

    // 2. Fallback: if no active incident is matched, project the selected incident or highest risk active incident
    if (targetIncidents.length === 0 && incidents.length > 0) {
      const fallback = selectedIncident || incidents.find((i) => i.status === 'active_response' || i.status === 'confirmed') || incidents[0];
      if (fallback) targetIncidents = [fallback];
    }

    // 3. Generate physics-grounded projection for each target incident
    return targetIncidents.map((inc) => {
      // Find matching forest zone for terrain slope and vegetation context
      const matchingForest = forests.find((f) =>
        f.wilaya.toLowerCase() === inc.wilaya.toLowerCase() ||
        computeDistanceKm(f.coordinates, inc.coordinates) < 25
      );

      return SpreadSimulationEngine.generateFireSpreadProjection(
        inc,
        liveWeather,
        matchingForest
      );
    });
  }, [incidents, selectedIncident, liveWeather, forests, projectionTargetMode]);

  // The active projection displayed in the tactical HUD panel
  const activeHUDProjection = useMemo(() => {
    if (selectedProjectionIncidentId) {
      const found = fireSpreadProjections.find((p) => p.incidentId === selectedProjectionIncidentId);
      if (found) return found;
    }
    if (selectedIncident) {
      const found = fireSpreadProjections.find((p) => p.incidentId === selectedIncident.id);
      if (found) return found;
    }
    return fireSpreadProjections[0] || null;
  }, [fireSpreadProjections, selectedProjectionIncidentId, selectedIncident]);

  // Active Incident Zones (Spatial Clustering) State
  const [clusterThresholdKm, setClusterThresholdKm] = useState<number>(24);
  const [selectedClusterZone, setSelectedClusterZone] = useState<ActiveIncidentZone | null>(null);
  const [showClusterInspector, setShowClusterInspector] = useState<boolean>(false);
  const [promotionFeedback, setPromotionFeedback] = useState<{ code: string; title: string } | null>(null);

  // Spatially cluster NASA FIRMS satellite anomalies into Active Incident Zones
  const activeIncidentZones: ActiveIncidentZone[] = useMemo(() => {
    return clusterFirmsHotspots(activeFirmsHotspots, incidents, clusterThresholdKm);
  }, [activeFirmsHotspots, incidents, clusterThresholdKm]);

  // Promote a spatial cluster into a formal monitored WildfireIncident
  const handlePromoteCluster = (cluster: ActiveIncidentZone, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const newIncident = promoteClusterToIncident(cluster);
    
    if (onPromoteClusterToIncident) {
      onPromoteClusterToIncident(newIncident);
    }
    onSelectIncident(newIncident);
    
    setSelectedClusterZone((prev) => 
      prev && prev.id === cluster.id 
        ? { ...prev, isPromoted: true, promotedIncidentId: newIncident.id } 
        : prev
    );

    setPromotionFeedback({
      code: newIncident.code,
      title: currentLang === 'ar' ? newIncident.titleAr : newIncident.title
    });
    setTimeout(() => setPromotionFeedback(null), 5000);
  };

  // Helper to generate regular hexagon points for tactical cluster pins
  const getHexagonPoints = (cx: number, cy: number, r: number) => {
    const pts: string[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (i * 60 * Math.PI) / 180;
      pts.push(`${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`);
    }
    return pts.join(' ');
  };

  const [mapMode, setMapMode] = useState<'tactical_dark' | 'satellite' | 'topographic'>('tactical_dark');
  const [showLayerPanel, setShowLayerPanel] = useState(false);

  // Zoom and Pan State
  const [zoom, setZoom] = useState(1.4);
  const [pan, setPan] = useState({ x: -140, y: -40 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [mouseCoords, setMouseCoords] = useState<{ lat: number; lng: number } | null>({ lat: 36.78, lng: 5.72 });
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Geographic bounds conversion for Northern Algeria (Lat 34.0 to 37.5, Lng -2.0 to 9.0)
  // Maps to SVG coordinate viewport 0..1000 X and 0..650 Y
  const geoToSvg = (lat: number, lng: number) => {
    const minLng = -2.5;
    const maxLng = 9.5;
    const minLat = 34.0;
    const maxLat = 37.5;

    const x = ((lng - minLng) / (maxLng - minLng)) * 1000;
    // Invert Y because latitude goes north (up) but SVG Y goes down
    const y = ((maxLat - lat) / (maxLat - minLat)) * 600 + 30;
    return { x, y };
  };

  const svgToGeo = (x: number, y: number) => {
    const minLng = -2.5;
    const maxLng = 9.5;
    const minLat = 34.0;
    const maxLat = 37.5;

    const lng = (x / 1000) * (maxLng - minLng) + minLng;
    const lat = maxLat - ((y - 30) / 600) * (maxLat - minLat);
    return {
      lat: Number(lat.toFixed(4)),
      lng: Number(lng.toFixed(4))
    };
  };

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }

    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const rawX = e.clientX - rect.left;
      const rawY = e.clientY - rect.top;
      // Calculate SVG internal coordinate taking pan & zoom into account
      const svgX = (rawX - pan.x) / zoom;
      const svgY = (rawY - pan.y) / zoom;
      setMouseCoords(svgToGeo(svgX, svgY));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoom = (factor: number) => {
    setZoom((prev) => Math.min(3.5, Math.max(0.8, prev * factor)));
  };

  const handleResetView = () => {
    setZoom(1.4);
    setPan({ x: -140, y: -40 });
  };

  const handleCenterOnUser = () => {
    if (userPosition) {
      const pt = geoToSvg(userPosition.lat, userPosition.lng);
      setZoom(2.4);
      setPan({
        x: 500 - pt.x * 2.4,
        y: 325 - pt.y * 2.4
      });
    } else if (onLocateUser) {
      onLocateUser();
    }
  };

  const toggleLayer = (layerKey: keyof typeof layers) => {
    setLayers((prev) => {
      const willBeActive = !prev[layerKey];
      if (!willBeActive) {
        if (layerKey === 'spreadIsochrones') setShowProjectionHUD(false);
        if (layerKey === 'evacuationPlanner') setShowEvacHUD(false);
        if (layerKey === 'fireFrontDynamics') setShowFireFrontDynamicsHUD(false);
        if (layerKey === 'resourceHeatmap') setShowResourceHUD(false);
        if (layerKey === 'physicalFireFront') setShowFireFrontHUD(false);
        if (layerKey === 'terrainSteepnessHeatmap') setShowSteepnessHUD(false);
        if (layerKey === 'alsatFleet') setShowAlsatHUD(false);
      } else {
        if (layerKey === 'spreadIsochrones') setShowProjectionHUD(true);
        if (layerKey === 'evacuationPlanner') setShowEvacHUD(true);
        if (layerKey === 'fireFrontDynamics') setShowFireFrontDynamicsHUD(true);
        if (layerKey === 'resourceHeatmap') setShowResourceHUD(true);
        if (layerKey === 'physicalFireFront') setShowFireFrontHUD(true);
        if (layerKey === 'terrainSteepnessHeatmap') setShowSteepnessHUD(true);
      }
      return { ...prev, [layerKey]: willBeActive };
    });
  };

  const getRiskColor = (level: RiskLevel) => {
    switch (level) {
      case 'critical': return '#b91c1c';
      case 'extreme': return '#ef4444';
      case 'high': return '#f97316';
      case 'moderate': return '#eab308';
      case 'low': return '#10b981';
      default: return '#64748b';
    }
  };

  // Active modal detection & dismiss handling (both internal GISMap modals and external parent modals)
  // NOTE: Lightweight Leaflet on-map marker popups must NEVER trigger screen dimming or backdrops
  const isInternalModalActive = Boolean(
    isSatelliteModalOpen ||
    showNdviControl ||
    showHeatmapControl ||
    showAlsatHUD ||
    (showClusterInspector && selectedClusterZone)
  );
  const isAnyModalActive = Boolean(isModalActiveProp || isInternalModalActive);

  // Dedicated clean dismiss handler for ALSAT HUD that guarantees full brightness & reactivates map
  const handleCloseAlsatHUD = useCallback(() => {
    setShowAlsatHUD(false);
    setSelectedAlsatSatellite('ALL');
    setSelectedAlsatPass(null);
    // Instant map reactivation & viewport invalidation
    window.dispatchEvent(new Event('resize'));
    const container = document.getElementById('gis-map-container');
    if (container) {
      container.style.pointerEvents = 'auto';
      container.style.filter = 'none';
      container.focus();
    }
  }, [setShowAlsatHUD]);

  const handleDismissActiveModal = useCallback(() => {
    if (isSatelliteModalOpen) setIsSatelliteModalOpen(false);
    if (showNdviControl) setShowNdviControl(false);
    if (showHeatmapControl) setShowHeatmapControl(false);
    if (showClusterInspector) setShowClusterInspector(false);
    if (showAlsatHUD) setShowAlsatHUD(false);
    if (selectedAlsatSatellite !== 'ALL') setSelectedAlsatSatellite('ALL');
    if (selectedAlsatPass) setSelectedAlsatPass(null);
    if (onDismissModal) onDismissModal();

    // Invalidate map size & guarantee 100% natural brightness & immediate pointer interactivity
    window.dispatchEvent(new Event('resize'));
    const container = document.getElementById('gis-map-container');
    if (container) {
      container.style.pointerEvents = 'auto';
      container.style.filter = 'none';
    }
  }, [isSatelliteModalOpen, showNdviControl, showHeatmapControl, showClusterInspector, showAlsatHUD, setShowAlsatHUD, selectedAlsatSatellite, selectedAlsatPass, onDismissModal]);

  // Immediate reactivation & brightness restoration whenever modals or HUD close
  useEffect(() => {
    if (!isAnyModalActive && !showAlsatHUD) {
      const container = document.getElementById('gis-map-container');
      if (container) {
        container.style.pointerEvents = 'auto';
        container.style.filter = 'none';
      }
      window.dispatchEvent(new Event('resize'));
    }
  }, [isAnyModalActive, showAlsatHUD]);

  // Dismiss active modal on ESC key press
  useEffect(() => {
    if (!isAnyModalActive && selectedAlsatSatellite === 'ALL' && !selectedAlsatPass) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismissActiveModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAnyModalActive, selectedAlsatSatellite, selectedAlsatPass, handleDismissActiveModal]);

  return (
    <div 
      id="gis-map-container"
      className={`relative ${isAnyModalActive || showAlsatHUD ? 'z-40 overflow-visible' : 'z-10 overflow-hidden'} w-full h-full min-h-[580px] bg-[#070b13] select-none border border-slate-800 rounded-xl shadow-2xl flex flex-col pointer-events-auto transition-[filter] duration-150`}
      style={{
        pointerEvents: 'auto',
        filter: 'none'
      }}
    >
      {/* Top Map Operational Toolbar */}
      <div className={`absolute top-3 left-3 right-3 ${isInternalModalActive ? 'z-50' : 'z-30'} flex flex-wrap items-center justify-between pointer-events-none gap-2`}>
        {/* Geographic Coordinate Inspector Readout */}
        <div className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-xs font-mono shadow-lg text-slate-300">
          <Crosshair className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>CURSOR:</span>
          {mouseCoords ? (
            <span className="text-emerald-300 font-bold">
              {mouseCoords.lat}°N, {mouseCoords.lng}°E
            </span>
          ) : (
            <span className="text-slate-500">Searching...</span>
          )}
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">ZONE: TELL ATLAS MARITIME</span>
        </div>

        {/* Live GPS & Weather Telemetry Readout & Offline Status */}
        <div className="pointer-events-auto flex items-center gap-2">
          {(!isOnline || isSimulatedOffline) && (
            <button
              onClick={onOpenOfflineManager}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-950/90 border border-amber-500 text-amber-300 text-xs font-mono shadow-lg transition cursor-pointer animate-pulse"
              title="Offline Forest Cache Mode Active - Click to Manage"
            >
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
              <span>OFFLINE CACHE (100% SVG GIS)</span>
            </button>
          )}

          {userPosition ? (
            <button
              onClick={handleCenterOnUser}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-950/80 border border-sky-500/50 text-sky-300 text-xs font-mono shadow-lg hover:bg-sky-900/60 transition cursor-pointer"
              title="Click to Center on your Live GPS"
            >
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
              <Locate className="w-3.5 h-3.5 text-sky-400" />
              <span>GPS: {userPosition.lat}°N, {userPosition.lng}°E</span>
              <span className="text-[10px] text-sky-400/80">±{userPosition.accuracyMeters}m</span>
            </button>
          ) : (
            <button
              onClick={onLocateUser}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700 text-slate-300 text-xs shadow-lg hover:bg-slate-800 transition cursor-pointer"
              title="Activate Live Device GPS"
            >
              <Locate className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin text-sky-400' : 'text-slate-400'}`} />
              <span>{isLocating ? (currentLang === 'ar' ? 'جاري تحديد GPS...' : 'Locating...') : (currentLang === 'ar' ? 'تفعيل GPS الفعلي' : 'Enable Live GPS')}</span>
            </button>
          )}
        </div>

        {/* Map Mode Buttons & Layer Control Toggle */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Map Base Mode */}
          <div className="flex bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setMapMode('tactical_dark')}
              className={`px-2.5 py-1 rounded transition ${mapMode === 'tactical_dark' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              Tactical GIS
            </button>
            <button
              onClick={() => setMapMode('satellite')}
              className={`px-2.5 py-1 rounded transition ${mapMode === 'satellite' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              Sentinel Hybrid
            </button>
            <button
              onClick={() => setMapMode('topographic')}
              className={`px-2.5 py-1 rounded transition ${mapMode === 'topographic' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              Topography
            </button>
          </div>

          {/* Tactical Airborne Drone Reconnaissance Toolbar Pill */}
          <div className="flex items-center bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => onOpenDroneSimulation?.(dronePatrolIncident)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 text-emerald-400 hover:bg-slate-700 font-bold transition cursor-pointer"
              title={currentLang === 'ar' ? 'فتح محاكاة قمرة قيادة الدرون' : 'Open Tactical Drone Cockpit'}
            >
              <Camera className="w-3.5 h-3.5 text-emerald-400" />
              <span>{currentLang === 'ar' ? 'درون DZ-04' : 'UAV DZ-04'}</span>
            </button>
            <div className="h-4 w-px bg-slate-700 mx-1" />
            <button
              onClick={() => {
                if (!layers.drones) toggleLayer('drones');
                updateDroneMissionHandler({ cameraMode: 'thermal' });
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded transition cursor-pointer ${
                layers.drones && activeDroneMission.cameraMode === 'thermal'
                  ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title={currentLang === 'ar' ? 'تفعيل طبقة الكاميرا الحرارية FLIR على الخريطة' : 'Display FLIR Thermal Feed Layer on Map'}
            >
              <Flame className="w-3 h-3 text-amber-300" />
              <span>{currentLang === 'ar' ? 'حراري (FLIR)' : 'Thermal'}</span>
            </button>
            <button
              onClick={() => {
                if (!layers.drones) toggleLayer('drones');
                updateDroneMissionHandler({ cameraMode: 'rgb' });
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded transition cursor-pointer ${
                layers.drones && activeDroneMission.cameraMode === 'rgb'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title={currentLang === 'ar' ? 'تفعيل طبقة الكاميرا البصرية RGB على الخريطة' : 'Display Optical RGB Feed Layer on Map'}
            >
              <Eye className="w-3 h-3 text-emerald-200" />
              <span>RGB</span>
            </button>
          </div>

          {/* NASA FIRMS Live Satellite Detections Quick-Toggle Pill & Manual Force Refresh */}
          <div className="flex items-center bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => toggleLayer('nasaFirms')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition cursor-pointer font-semibold ${
                layers.nasaFirms
                  ? 'bg-gradient-to-r from-purple-800 to-indigo-800 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title={
                currentLang === 'ar'
                  ? 'تبديل طبقة رصد الأقمار الصناعية NASA FIRMS (VIIRS/MODIS)'
                  : 'Toggle NASA FIRMS Satellite Detections Layer (VIIRS/MODIS)'
              }
            >
              <Satellite className={`w-3.5 h-3.5 ${layers.nasaFirms ? 'text-purple-300 animate-pulse' : 'text-slate-400'}`} />
              <span>{currentLang === 'ar' ? 'أقمار NASA FIRMS' : 'NASA FIRMS Sat'}</span>
              <span
                className={`px-1.5 py-0.2 text-[10px] rounded-full font-mono font-bold ${
                  layers.nasaFirms
                    ? 'bg-purple-950/80 text-purple-200 border border-purple-400/50'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {activeFirmsHotspots.length}
              </span>
            </button>
            <div className="h-4 w-px bg-slate-700 mx-1" />

            {/* Manual Force-Update Control Button (Bypasses 60-Second Periodic Polling) */}
            <button
              id="btn-force-firms-refresh"
              onClick={handleForceRefreshFirms}
              disabled={effectiveIsLoading}
              className={`flex items-center gap-1 px-2.5 py-1 rounded transition cursor-pointer font-semibold ${
                effectiveIsLoading
                  ? 'bg-purple-900/90 text-purple-200 shadow-inner'
                  : 'text-slate-300 hover:text-white hover:bg-purple-950/70'
              }`}
              title={t.firmsAutoPollInfo || (currentLang === 'ar' ? 'تحديث فوري لبيانات الأقمار الصناعية — تجاوز مؤقت 60 ثانية' : 'Force immediate NASA FIRMS update (bypasses 60s poll timer)')}
            >
              <RefreshCw className={`w-3.5 h-3.5 text-purple-400 ${effectiveIsLoading ? 'animate-spin text-purple-300' : 'hover:rotate-180 transition-transform duration-300'}`} />
              <span className="text-[11px] font-bold text-purple-200 whitespace-nowrap">
                {effectiveIsLoading 
                  ? (t.firmsUpdating || (currentLang === 'ar' ? 'جارِ الجلب...' : 'Fetching...')) 
                  : (currentLang === 'ar' ? 'تحديث فوري' : 'Force Sync')}
              </span>
              <span 
                className="text-[9px] font-mono text-purple-300/90 bg-purple-950/90 px-1.5 py-0.2 rounded border border-purple-800/60"
                title={currentLang === 'ar' ? `آخر تحديث: منذ ${secondsSinceSync} ثانية (يتم الفحص الدوري كل 60ثا)` : `Last sync: ${secondsSinceSync}s ago (Auto-polls every 60s)`}
              >
                {effectiveIsLoading ? '...' : `${secondsSinceSync}s`}
              </span>
            </button>

            <div className="h-4 w-px bg-slate-700 mx-1" />

            {/* Live NASA Satellite Uplink Center Trigger */}
            <button
              id="btn-open-satellite-uplink"
              onClick={() => setIsSatelliteModalOpen(true)}
              className="flex items-center gap-1.5 px-2 py-1 rounded transition cursor-pointer font-bold bg-indigo-950/80 hover:bg-indigo-900/90 text-indigo-200 border border-indigo-500/30"
              title={
                currentLang === 'ar'
                  ? 'محطة الاستشعار الفضائي اللحظي ومفتاح NASA FIRMS (رصد كل حرائق الجزائر)'
                  : 'NASA EOSDIS Live Satellite Wildfire Uplink Center'
              }
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-bold text-indigo-300 whitespace-nowrap">
                {currentLang === 'ar' ? 'الاستشعار الحي' : 'Live Uplink'}
              </span>
            </button>
          </div>

          {/* NASA FIRMS Satellite Density Heatmap Opacity UI Control */}
          <div className="relative flex items-center bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-lg p-0.5 text-xs">
            {/* Quick click-to-cycle Opacity Button */}
            <button
              onClick={toggleFirmsHeatmapOpacity}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition cursor-pointer font-semibold ${
                layers.firmsHeatmap && firmsHeatmapOpacity > 0
                  ? 'bg-gradient-to-r from-rose-700 via-pink-700 to-purple-800 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title={
                currentLang === 'ar'
                  ? 'تبديل شفافية خريطة كثافة الرصد الحراري (اضغط للتبديل: 0% / 35% / 65% / 90%)'
                  : 'Cycle NASA FIRMS satellite heatmap density opacity (0% / 35% / 65% / 90%)'
              }
            >
              <Flame className={`w-3.5 h-3.5 ${layers.firmsHeatmap && firmsHeatmapOpacity > 0 ? 'text-amber-300 animate-pulse' : 'text-slate-400'}`} />
              <span>{t.firmsHeatmapDensity || (currentLang === 'ar' ? 'كثافة الرصد' : 'FIRMS Heatmap')}</span>
              <span
                className={`px-1.5 py-0.2 text-[10px] rounded-full font-mono font-bold ${
                  layers.firmsHeatmap && firmsHeatmapOpacity > 0
                    ? 'bg-rose-950/80 text-rose-200 border border-rose-400/50'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {layers.firmsHeatmap && firmsHeatmapOpacity > 0 ? `${Math.round(firmsHeatmapOpacity * 100)}%` : 'OFF'}
              </span>
            </button>

            <div className="h-4 w-px bg-slate-700 mx-1" />

            {/* Slider Popover Trigger Button */}
            <button
              onClick={() => setShowHeatmapControl(!showHeatmapControl)}
              className={`p-1 rounded transition cursor-pointer ${
                showHeatmapControl ? 'bg-purple-900/80 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title={currentLang === 'ar' ? 'ضبط دقيق لشفافية خريطة الكثافة الحرارية' : 'Fine-tune Heatmap Density Opacity'}
            >
              <SlidersHorizontal className="w-3 h-3 text-pink-300" />
            </button>

            {/* Heatmap Opacity Adjustment Dropdown Popover */}
            {showHeatmapControl && (
              <div 
                id="heatmap-opacity-modal"
                className="absolute top-full mt-2 left-0 z-50 w-72 p-3 bg-slate-950/95 backdrop-blur-xl border border-rose-500/50 rounded-xl shadow-2xl space-y-3 animate-in fade-in slide-in-from-top-2 pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-slate-100 text-xs">
                    <Flame className="w-4 h-4 text-rose-400" />
                    <span>{t.layerFirmsHeatmap || (currentLang === 'ar' ? 'كثافة الرصد الفضائي' : 'FIRMS Heatmap Density')}</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-rose-300 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-500/40">
                    {layers.firmsHeatmap ? `${Math.round(firmsHeatmapOpacity * 100)}%` : 'OFF'}
                  </span>
                </div>

                {/* Opacity Slider Control */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>{t.firmsHeatmapOpacity || (currentLang === 'ar' ? 'شفافية الكثافة' : 'Opacity')}</span>
                    <span className="font-mono text-slate-300">
                      {layers.firmsHeatmap && firmsHeatmapOpacity > 0 ? (currentLang === 'ar' ? 'مفعّل' : 'Active') : (currentLang === 'ar' ? 'معطّل' : 'Disabled')}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={layers.firmsHeatmap ? firmsHeatmapOpacity : 0}
                    onChange={(e) => handleHeatmapOpacityChange(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                  />
                </div>

                {/* Quick Opacity Preset Buttons */}
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: currentLang === 'ar' ? 'إيقاف' : 'Off', value: 0 },
                    { label: '30%', value: 0.3 },
                    { label: '65%', value: 0.65 },
                    { label: '90%', value: 0.9 }
                  ].map((preset) => {
                    const isSelected = preset.value === 0 
                      ? (!layers.firmsHeatmap || firmsHeatmapOpacity === 0)
                      : (layers.firmsHeatmap && Math.abs(firmsHeatmapOpacity - preset.value) < 0.08);

                    return (
                      <button
                        key={preset.value}
                        onClick={() => handleHeatmapOpacityChange(preset.value)}
                        className={`py-1 text-[10px] font-bold rounded-lg border transition cursor-pointer ${
                          isSelected
                            ? 'bg-rose-600 border-rose-400 text-white shadow'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>

                {/* Thermal Density Gradient Spectrum Ramp */}
                <div className="space-y-1">
                  <div className="h-2 rounded-full bg-gradient-to-r from-purple-900 via-rose-600 via-amber-500 to-yellow-200 border border-slate-700/60 shadow-inner" />
                  <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                    <span>{currentLang === 'ar' ? 'طاقة إشعاع منخفضة' : 'Low FRP (Aura)'}</span>
                    <span>{currentLang === 'ar' ? 'بؤرة حرارية قصوى' : 'Extreme Core'}</span>
                  </div>
                </div>

                {/* Telemetry metadata footer */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                  <span className="flex items-center gap-1 font-mono text-purple-300">
                    <Satellite className="w-3 h-3 text-purple-400" />
                    {activeFirmsHotspots.length} {currentLang === 'ar' ? 'بؤر مدمجة' : 'Detections'}
                  </span>
                  <span className="font-mono text-amber-300">
                    {firmsHeatmapStats.totalFrp} MW Total FRP
                  </span>
                </div>

                {/* Manual Force-Update Action in Heatmap Opacity Popover */}
                <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-mono flex items-center gap-1 text-slate-300">
                      <Clock className="w-3 h-3 text-purple-400" />
                      <span>{t.firmsLastSync || (currentLang === 'ar' ? 'آخر تحديث' : 'Last sync')}:</span>
                      <span className="text-purple-300 font-bold">{secondsSinceSync}s {currentLang === 'ar' ? 'مضت' : 'ago'}</span>
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono">
                      (Auto-poll: 60s)
                    </span>
                  </div>

                  <button
                    id="btn-heatmap-popover-force-refresh"
                    onClick={handleForceRefreshFirms}
                    disabled={effectiveIsLoading}
                    className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg bg-gradient-to-r from-purple-800 via-indigo-700 to-purple-900 hover:from-purple-700 hover:to-indigo-600 text-white font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border border-purple-500/40"
                    title={t.firmsAutoPollInfo}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-purple-300 ${effectiveIsLoading ? 'animate-spin' : ''}`} />
                    <span>
                      {effectiveIsLoading ? (t.firmsUpdating || 'Updating...') : (t.forceFirmsUpdate || 'Force Immediate Update')}
                    </span>
                  </button>

                  <p className="text-[9px] text-slate-400 text-center font-mono leading-tight">
                    {t.firmsAutoPollInfo || (currentLang === 'ar' ? 'تحديث فوري وتجاوز مؤقت 60 ثانية' : 'Bypasses 60s periodic poll cycle')}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Normalized Difference Vegetation Index (NDVI) & Drought Health Dynamic Calculation Pill */}
          <div className="relative flex items-center bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-lg p-0.5 text-xs">
            <button
              id="btn-toggle-ndvi-overlay"
              onClick={() => toggleLayer('ndvi')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition cursor-pointer font-semibold ${
                layers.ndvi
                  ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-lime-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title={
                currentLang === 'ar'
                  ? 'حساب وتراكب مؤشر صحة الغطاء النباتي وإجهاد الجفاف (Sentinel-2 NDVI)'
                  : 'Calculate and overlay Normalized Difference Vegetation Index (Sentinel-2 NDVI) to assess forest health and drought stress'
              }
            >
              <Trees className={`w-3.5 h-3.5 ${layers.ndvi ? 'text-emerald-100 animate-pulse' : 'text-slate-400'}`} />
              <span>{t.ndviCalculateOverlay || (currentLang === 'ar' ? 'مؤشر الغطاء (NDVI)' : 'NDVI Health')}</span>
              <span
                className={`px-1.5 py-0.2 text-[10px] rounded-full font-mono font-bold ${
                  layers.ndvi
                    ? dynamicNdviResult.nationalSummary.criticalPercent > 25
                      ? 'bg-red-950/90 text-red-200 border border-red-400/60'
                      : dynamicNdviResult.nationalSummary.criticalPercent > 12
                      ? 'bg-amber-950/90 text-amber-200 border border-amber-400/50'
                      : 'bg-emerald-950/90 text-emerald-200 border border-emerald-400/50'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {layers.ndvi ? `${dynamicNdviResult.nationalSummary.averageNationalNdvi} NDVI` : 'OFF'}
              </span>
            </button>

            <div className="h-4 w-px bg-slate-700 mx-1" />

            {/* Popover trigger button for dynamic calculation parameters */}
            <button
              id="btn-toggle-ndvi-settings"
              onClick={() => setShowNdviControl(!showNdviControl)}
              className={`p-1 rounded transition cursor-pointer ${
                showNdviControl ? 'bg-emerald-900/90 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
              title={
                currentLang === 'ar'
                  ? 'ضبط معايير الحساب الطيفي ومستوى إجهاد الجفاف'
                  : 'Configure Spectral Parameters & Drought Stress Assessment'
              }
            >
              <SlidersHorizontal className="w-3 h-3 text-emerald-300" />
            </button>

            {/* Dynamic NDVI Calculation & Assessment Popover Dropdown */}
            {showNdviControl && (
              <div 
                id="ndvi-calculation-modal"
                className="absolute top-full mt-2 left-0 z-50 w-80 sm:w-96 p-4 bg-slate-950/95 backdrop-blur-xl border border-emerald-500/50 rounded-xl shadow-2xl space-y-3.5 animate-in fade-in slide-in-from-top-2 text-slate-200 pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header with Sentinel-2 MSI branding */}
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-400">
                      <Satellite className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-100 text-xs flex items-center gap-1.5">
                        <span>{t.ndviCalculateOverlay || (currentLang === 'ar' ? 'حساب وتراكب مؤشر الغطاء النباتي' : 'NDVI Spectral Calculation & Overlay')}</span>
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                          Sentinel-2 MSI
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        {t.ndviCalculateOverlayDesc || (currentLang === 'ar' ? 'معايرة النطاقات الطيفية وتقييم إجهاد الجفاف' : 'Spectral reflectance calibration & drought stress modeling')}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowNdviControl(false)}
                    className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Sentinel-2 Spectral Formula Display */}
                <div className="p-2 rounded-lg bg-slate-900/90 border border-emerald-500/20 flex items-center justify-between text-[10px] font-mono">
                  <div className="flex items-center gap-1.5 text-emerald-300">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>NDVI = (NIR B8 - Red B4) / (NIR B8 + Red B4)</span>
                  </div>
                  <span className="text-[9px] text-slate-400 font-sans">10m Res</span>
                </div>

                {/* Layer Toggle & Opacity Slider */}
                <div className="flex items-center justify-between gap-2 p-2 bg-slate-900/60 rounded-lg border border-slate-800">
                  <button
                    onClick={() => toggleLayer('ndvi')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded flex items-center gap-1.5 transition cursor-pointer ${
                      layers.ndvi
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{layers.ndvi ? (currentLang === 'ar' ? 'الطبقة مفعّلة' : 'Layer Active') : (currentLang === 'ar' ? 'تفعيل الطبقة' : 'Enable Layer')}</span>
                  </button>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400 text-[11px] font-mono">{Math.round(ndviOpacity * 100)}%</span>
                    <input 
                      type="range"
                      min="0.15"
                      max="0.95"
                      step="0.05"
                      value={ndviOpacity}
                      onChange={(e) => setNdviOpacity(parseFloat(e.target.value))}
                      className="w-24 accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                      title="Overlay Opacity"
                    />
                  </div>
                </div>

                {/* Climatic Scenario Presets */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                    <span>{t.ndviScenarioLabel || (currentLang === 'ar' ? 'السيناريو المناخي الموسمي:' : 'Seasonal Climatic Scenario:')}</span>
                    <span className="text-[10px] font-mono text-emerald-400">
                      {selectedScenarioKey !== 'custom' ? selectedScenarioKey : 'Custom'}
                    </span>
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                    {DROUGHT_SCENARIO_PRESETS.map((sc) => (
                      <button
                        key={sc.key}
                        onClick={() => handleApplyScenario(sc)}
                        className={`p-1.5 text-left rounded border transition cursor-pointer ${
                          selectedScenarioKey === sc.key
                            ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200 shadow-sm'
                            : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="font-semibold truncate">
                          {currentLang === 'ar' ? sc.labelAr : currentLang === 'fr' ? sc.labelFr : sc.labelEn}
                        </div>
                        <div className="text-[9px] font-mono opacity-80">
                          {sc.stressFactor > 0 ? `+${sc.stressFactor}` : sc.stressFactor} ΔNDVI
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dynamic Drought Stress Slider */}
                <div className="space-y-1.5 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-medium text-slate-300 flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-amber-400" />
                      {t.ndviDroughtSeverity || (currentLang === 'ar' ? 'عامل إجهاد الجفاف والحرارة:' : 'Drought Stress Severity Factor:')}
                    </span>
                    <span className={`font-mono font-bold text-xs ${
                      droughtStressFactor < -0.15 ? 'text-red-400' : droughtStressFactor < 0 ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {droughtStressFactor > 0 ? `+${droughtStressFactor.toFixed(2)}` : droughtStressFactor.toFixed(2)}
                    </span>
                  </div>
                  <input 
                    type="range"
                    min="-0.35"
                    max="0.25"
                    step="0.01"
                    value={droughtStressFactor}
                    onChange={(e) => {
                      setSelectedScenarioKey('custom');
                      setDroughtStressFactor(parseFloat(e.target.value));
                      if (!layers.ndvi) setLayers(prev => ({ ...prev, ndvi: true }));
                    }}
                    className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  />
                  <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                    <span className="text-red-400/80">{currentLang === 'ar' ? 'جفاف حاد' : 'Severe Aridity (-0.35)'}</span>
                    <span>{currentLang === 'ar' ? 'مرجعي (0.0)' : 'Baseline'}</span>
                    <span className="text-emerald-400/80">{currentLang === 'ar' ? 'رطوبة عالية' : 'High Moisture (+0.25)'}</span>
                  </div>
                </div>

                {/* Recalculate & Overlay Execution Button */}
                <div className="pt-1">
                  <button
                    id="btn-recalculate-ndvi-overlay"
                    onClick={handleTriggerNdviRecalculation}
                    disabled={isCalculatingNdvi}
                    className="w-full py-2 px-3 rounded-lg font-bold text-xs bg-gradient-to-r from-emerald-600 via-teal-600 to-lime-600 hover:from-emerald-500 hover:to-lime-500 text-white shadow-lg flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCalculatingNdvi ? 'animate-spin' : ''}`} />
                    <span>
                      {isCalculatingNdvi
                        ? (t.ndviCalculating || (currentLang === 'ar' ? 'جاري الحساب الطيفي...' : 'Calculating Spectral NDVI...'))
                        : (t.ndviRecalculateBtn || (currentLang === 'ar' ? 'حساب وتحديث طبقة NDVI' : 'Recalculate & Overlay NDVI Layer'))}
                    </span>
                  </button>
                  <div className="text-center text-[9px] text-slate-500 mt-1 font-mono">
                    {currentLang === 'ar' ? 'آخر حساب طيفي:' : 'Last calculated:'} {lastNdviCalcTimestamp}
                  </div>
                </div>

                {/* Dynamic Summary Cards */}
                <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-[10px]">
                  <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                    <div className="text-[9px] text-slate-400 font-sans">{currentLang === 'ar' ? 'المعدل الوطني' : 'Avg NDVI'}</div>
                    <div className="font-bold text-amber-300 text-xs">{dynamicNdviResult.nationalSummary.averageNationalNdvi}</div>
                  </div>
                  <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                    <div className="text-[9px] text-slate-400 font-sans">{currentLang === 'ar' ? 'إجهاد حرج' : 'Crit Drought'}</div>
                    <div className="font-bold text-red-400 text-xs">{dynamicNdviResult.nationalSummary.criticalPercent}%</div>
                  </div>
                  <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                    <div className="text-[9px] text-slate-400 font-sans">{currentLang === 'ar' ? 'رطوبة الوقود' : 'Canopy FMC'}</div>
                    <div className="font-bold text-emerald-400 text-xs">{dynamicNdviResult.nationalSummary.averageCanopyMoisture}%</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Active Incident Zones (Spatial Clustering) Quick-Toggle Pill */}
          <div className="flex items-center bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-lg p-0.5 text-xs">
            <button
              id="btn-toggle-firms-clusters"
              onClick={() => toggleLayer('firmsClusters')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition cursor-pointer font-semibold ${
                layers.firmsClusters
                  ? 'bg-gradient-to-r from-rose-700 via-pink-700 to-rose-900 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title={t.firmsClustersTitle || (currentLang === 'ar' ? 'تجميع بؤر الأقمار الصناعية في مناطق حريق نشطة' : 'Spatial clustering of satellite thermal anomalies')}
            >
              <Radio className={`w-3.5 h-3.5 ${layers.firmsClusters ? 'text-rose-200 animate-pulse' : 'text-slate-400'}`} />
              <span>{t.firmsClustersLayer || (currentLang === 'ar' ? 'مناطق البؤر النشطة' : 'Incident Zones')}</span>
              <span
                className={`px-1.5 py-0.2 text-[10px] rounded-full font-mono font-bold ${
                  layers.firmsClusters
                    ? activeIncidentZones.some(z => !z.isPromoted)
                      ? 'bg-rose-950/90 text-rose-200 border border-rose-400/60 animate-pulse'
                      : 'bg-emerald-950/90 text-emerald-200 border border-emerald-400/50'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {activeIncidentZones.length}
              </span>
            </button>
            {layers.firmsClusters && activeIncidentZones.length > 0 && (
              <>
                <div className="h-4 w-px bg-slate-700 mx-1" />
                <button
                  onClick={() => {
                    const firstUnpromoted = activeIncidentZones.find(z => !z.isPromoted) || activeIncidentZones[0];
                    if (firstUnpromoted) {
                      setSelectedClusterZone(firstUnpromoted);
                      setShowClusterInspector(true);
                      const pt = geoToSvg(firstUnpromoted.centroid.lat, firstUnpromoted.centroid.lng);
                      setZoom(2.2);
                      setPan({ x: 500 - pt.x * 2.2, y: 325 - pt.y * 2.2 });
                    }
                  }}
                  className="px-1.5 py-0.5 rounded text-[10px] font-bold text-rose-300 hover:text-white bg-rose-950/60 border border-rose-800/60 hover:bg-rose-900/60 transition cursor-pointer"
                  title={currentLang === 'ar' ? 'التركيز على أكبر منطقة تجمع نشطة' : 'Focus largest active cluster'}
                >
                  {activeIncidentZones.filter(z => !z.isPromoted).length > 0
                    ? `${activeIncidentZones.filter(z => !z.isPromoted).length} ${currentLang === 'ar' ? 'غير مراقبة' : 'Pending'}`
                    : (currentLang === 'ar' ? 'الكل مراقب' : 'All Monitored')}
                </button>
              </>
            )}
          </div>

          {/* Fire Spread Projection Control (Live Weather Wind & Terrain Dynamic Model) */}
          <div className="relative flex items-center bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-lg p-0.5 text-xs">
            <button
              id="btn-toggle-spread-projection"
              onClick={() => toggleLayer('spreadIsochrones')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition cursor-pointer font-semibold ${
                layers.spreadIsochrones
                  ? 'bg-gradient-to-r from-amber-600 via-orange-600 to-red-700 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title={
                currentLang === 'ar'
                  ? 'إسقاط مسار انتشار النيران الحي بناءً على اتجاه وسرعة الرياح وتضاريس الأرض للحرائق المؤكدة'
                  : 'Fire Spread Projection: live Rothermel-Huygens simulation powered by live weather wind & terrain slope'
              }
            >
              <TrendingUp className={`w-3.5 h-3.5 ${layers.spreadIsochrones ? 'text-amber-200 animate-pulse' : 'text-slate-400'}`} />
              <span>{t.fireSpreadProjection || (currentLang === 'ar' ? 'إسقاط الانتشار' : 'Spread Projection')}</span>
              <span
                className={`px-1.5 py-0.2 text-[10px] rounded-full font-mono font-bold ${
                  layers.spreadIsochrones
                    ? 'bg-amber-950/80 text-amber-200 border border-amber-400/50'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {layers.spreadIsochrones ? `${fireSpreadProjections.length} ${currentLang === 'ar' ? 'حرائق' : 'Active'}` : 'OFF'}
              </span>
            </button>

            {layers.spreadIsochrones && (
              <>
                <div className="h-4 w-px bg-slate-700 mx-1" />
                
                {/* Quick Horizon Buttons */}
                <div className="flex items-center gap-0.5">
                  {(['all', 30, 60, 180, 360] as const).map((h) => (
                    <button
                      key={String(h)}
                      onClick={() => setProjectionHorizon(h)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition cursor-pointer ${
                        projectionHorizon === h
                          ? 'bg-orange-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                      title={h === 'all' ? 'All horizons overlaid' : `Projection for +${h} minutes`}
                    >
                      {h === 'all' ? 'All' : h === 60 ? '1h' : h === 180 ? '3h' : h === 360 ? '6h' : `${h}m`}
                    </button>
                  ))}
                </div>

                <div className="h-4 w-px bg-slate-700 mx-1" />

                {/* Tactical HUD Drawer Toggle */}
                <button
                  id="btn-toggle-spread-hud"
                  onClick={() => setShowProjectionHUD(!showProjectionHUD)}
                  className={`p-1 rounded transition cursor-pointer ${
                    showProjectionHUD ? 'bg-orange-950/90 text-amber-300 border border-amber-600/40' : 'text-slate-400 hover:text-white'
                  }`}
                  title={currentLang === 'ar' ? 'عرض لوحة تحليل انتشار النيران والطقس الحي' : 'Toggle Fire Spread Analysis HUD'}
                >
                  <Gauge className="w-3 h-3 text-amber-400" />
                </button>
              </>
            )}
          </div>

          {/* Emergency Resource Heatmap Quick-Toggle Pill */}
          <div className="flex items-center bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-lg p-0.5 text-xs">
            <button
              id="btn-toggle-resource-heatmap"
              onClick={() => toggleLayer('resourceHeatmap')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition cursor-pointer font-semibold ${
                layers.resourceHeatmap
                  ? 'bg-gradient-to-r from-red-600 via-amber-600 to-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title={
                currentLang === 'ar'
                  ? 'الخريطة الحرارية للموارد: التوفر مقابل الاحتياج بالولايات'
                  : 'Toggle Resource Heatmap: Available vs Needed by Wilaya'
              }
            >
              <Truck className={`w-3.5 h-3.5 ${layers.resourceHeatmap ? 'text-amber-200 animate-pulse' : 'text-slate-400'}`} />
              <span>{t.layerResourceHeatmap || (currentLang === 'ar' ? 'حرارية الموارد' : 'Resource Heatmap')}</span>
              <span
                className={`px-1.5 py-0.2 text-[10px] rounded-full font-mono font-bold ${
                  layers.resourceHeatmap
                    ? nationalResourceSummary.criticalDeficitWilayasCount > 0
                      ? 'bg-red-950/90 text-red-200 border border-red-400/60 animate-pulse'
                      : 'bg-emerald-950/90 text-emerald-200 border border-emerald-400/50'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {nationalResourceSummary.criticalDeficitWilayasCount > 0
                  ? `${nationalResourceSummary.criticalDeficitWilayasCount} ${currentLang === 'ar' ? 'عجز' : 'Deficit'}`
                  : (currentLang === 'ar' ? 'متوازن' : 'Balanced')}
              </span>
            </button>

            {layers.resourceHeatmap && (
              <>
                <div className="h-4 w-px bg-slate-700 mx-1" />
                <button
                  id="btn-toggle-resource-hud"
                  onClick={() => setShowResourceHUD(!showResourceHUD)}
                  className={`p-1 rounded transition cursor-pointer ${
                    showResourceHUD ? 'bg-red-950/90 text-red-300 border border-red-600/40' : 'text-slate-400 hover:text-white'
                  }`}
                  title={currentLang === 'ar' ? 'لوحة تحكم وتوزيع الموارد' : 'Toggle Resource Optimization HUD'}
                >
                  <SlidersHorizontal className="w-3 h-3 text-red-400" />
                </button>
              </>
            )}
          </div>

          {/* Smart Civilian Evacuation Planner Quick-Toggle Pill */}
          <div className="flex items-center bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-lg p-0.5 text-xs">
            <button
              id="btn-toggle-evac-planner"
              onClick={() => toggleLayer('evacuationPlanner')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition cursor-pointer font-semibold ${
                layers.evacuationPlanner
                  ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title={
                currentLang === 'ar'
                  ? 'مخطط الإخلاء الذكي: مسارات النجاة الآمنة والملاجئ'
                  : 'Toggle Smart Evacuation Planner: Safe Routes & Havens'
              }
            >
              <Navigation className={`w-3.5 h-3.5 ${layers.evacuationPlanner ? 'text-emerald-200 animate-pulse' : 'text-slate-400'}`} />
              <span>{currentLang === 'ar' ? 'مخطط الإخلاء' : 'Evac Planner'}</span>
              <span
                className={`px-1.5 py-0.2 text-[10px] rounded-full font-mono font-bold ${
                  layers.evacuationPlanner
                    ? 'bg-emerald-950/90 text-emerald-200 border border-emerald-400/50'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {layers.evacuationPlanner ? `${evacuationPlan.settlementRoutes.length} ${currentLang === 'ar' ? 'مسار' : 'Routes'}` : 'OFF'}
              </span>
            </button>

            {layers.evacuationPlanner && (
              <>
                <div className="h-4 w-px bg-slate-700 mx-1" />
                <button
                  id="btn-recalculate-evac-route"
                  onClick={() => handleGenerateOrRecalculateRoute()}
                  className="px-1.5 py-0.5 rounded transition cursor-pointer text-emerald-300 hover:text-white hover:bg-emerald-900/60 flex items-center gap-1 font-mono text-[11px]"
                  title={
                    currentLang === 'ar'
                      ? 'إعادة توليد وتفعيل المسار المؤقت عبر خوارزمية الرسم البياني'
                      : 'Trigger / Recalculate Temporary Dynamic Evacuation Path via Graph Pathfinding'
                  }
                >
                  <Zap className="w-3 h-3 text-amber-400 animate-pulse" />
                  <span className="hidden sm:inline font-bold">
                    {isTemporaryDynamicActive ? `${temporaryCountdownSeconds}s` : 'RE-CALC'}
                  </span>
                </button>
                <button
                  id="btn-toggle-evac-hud"
                  onClick={() => setShowEvacHUD(!showEvacHUD)}
                  className={`p-1 rounded transition cursor-pointer ${
                    showEvacHUD ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-600/40' : 'text-slate-400 hover:text-white'
                  }`}
                  title={currentLang === 'ar' ? 'لوحة تحكم وتوجيه الإخلاء' : 'Toggle Evacuation Guidance HUD'}
                >
                  <Compass className="w-3 h-3 text-emerald-400" />
                </button>
              </>
            )}
          </div>

          {/* Fire Front Dynamics Quick-Toggle Pill (Active Expansion Edge Polyline) */}
          <div className="flex items-center bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-lg p-0.5 text-xs">
            <button
              id="btn-toggle-fire-front-dynamics"
              onClick={() => {
                const next = !layers.fireFrontDynamics;
                toggleLayer('fireFrontDynamics');
                if (next) setShowFireFrontDynamicsHUD(true);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition cursor-pointer font-semibold ${
                layers.fireFrontDynamics
                  ? 'bg-gradient-to-r from-orange-600 via-red-600 to-amber-600 text-white shadow ring-1 ring-orange-400/40'
                  : 'text-slate-400 hover:text-white'
              }`}
              title={
                currentLang === 'ar'
                  ? 'خدمة ديناميكيات جبهة النيران (حساب وتصيير بوليلاين الحافة النشطة بمتجهات الرياح والتضاريس والتحديث الدوري)'
                  : 'Toggle Fire Front Dynamics (Active Expansion Edge Polyline with Periodic Updates)'
              }
            >
              <div className="relative flex items-center justify-center">
                <Flame className={`w-3.5 h-3.5 ${layers.fireFrontDynamics ? 'text-amber-200 animate-pulse' : 'text-slate-400'}`} />
                {layers.fireFrontDynamics && isDynamicsPeriodicActive && (
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                )}
              </div>
              <span>{currentLang === 'ar' ? 'ديناميكيات الجبهة' : 'Front Dynamics'}</span>
              <span
                className={`px-1.5 py-0.2 text-[10px] rounded-full font-mono font-bold ${
                  layers.fireFrontDynamics
                    ? 'bg-orange-950/90 text-orange-200 border border-orange-400/50'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {layers.fireFrontDynamics ? `${fireFrontDynamicsResult.peakRateOfSpreadMMin}m/m` : 'OFF'}
              </span>
            </button>

            {layers.fireFrontDynamics && (
              <>
                <div className="h-4 w-px bg-slate-700 mx-1" />
                <button
                  id="btn-toggle-dynamics-hud"
                  onClick={() => setShowFireFrontDynamicsHUD(!showFireFrontDynamicsHUD)}
                  className={`p-1 rounded transition cursor-pointer ${
                    showFireFrontDynamicsHUD ? 'bg-orange-950/90 text-orange-300 border border-orange-600/40' : 'text-slate-400 hover:text-white'
                  }`}
                  title={currentLang === 'ar' ? 'لوحة تحكم ديناميكيات الجبهة' : 'Toggle Front Dynamics HUD'}
                >
                  <Activity className="w-3 h-3 text-orange-400" />
                </button>
              </>
            )}
          </div>

          {/* Physical Fire Front Simulation Quick-Toggle Pill */}
          <div className="flex items-center bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-lg p-0.5 text-xs">
            <button
              id="btn-toggle-physical-fire-front"
              onClick={() => {
                const next = !layers.physicalFireFront;
                toggleLayer('physicalFireFront');
                if (next) setShowFireFrontHUD(true);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition cursor-pointer font-semibold ${
                layers.physicalFireFront
                  ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title={
                currentLang === 'ar'
                  ? 'محاكاة فيزياء جبهة النيران (نموذج روثيرميل وتضاريس DEM)'
                  : 'Toggle Rothermel Physical Fire Front & DEM Wavefront'
              }
            >
              <Flame className={`w-3.5 h-3.5 ${layers.physicalFireFront ? 'text-amber-200 animate-pulse' : 'text-slate-400'}`} />
              <span>{currentLang === 'ar' ? 'فيزياء الجبهة' : 'Physics Front'}</span>
              <span
                className={`px-1.5 py-0.2 text-[10px] rounded-full font-mono font-bold ${
                  layers.physicalFireFront
                    ? 'bg-red-950/90 text-red-200 border border-red-400/50'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {layers.physicalFireFront ? `${fireFrontTimeMinutes}m` : 'OFF'}
              </span>
            </button>

            {layers.physicalFireFront && (
              <>
                <div className="h-4 w-px bg-slate-700 mx-1" />
                <button
                  id="btn-toggle-firefront-hud"
                  onClick={() => setShowFireFrontHUD(!showFireFrontHUD)}
                  className={`p-1 rounded transition cursor-pointer ${
                    showFireFrontHUD ? 'bg-red-950/90 text-red-300 border border-red-600/40' : 'text-slate-400 hover:text-white'
                  }`}
                  title={currentLang === 'ar' ? 'لوحة تحكم فيزياء الجبهة' : 'Toggle Physics Front HUD'}
                >
                  <Gauge className="w-3 h-3 text-amber-400" />
                </button>
              </>
            )}
          </div>

          {/* Terrain Steepness Heatmap Quick-Toggle Pill (DEM Elevation & Machinery Risk) */}
          <div className="flex items-center bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-lg p-0.5 text-xs">
            <button
              id="btn-toggle-terrain-steepness"
              onClick={() => {
                const next = !layers.terrainSteepnessHeatmap;
                toggleLayer('terrainSteepnessHeatmap');
                if (next) setShowSteepnessHUD(true);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition cursor-pointer font-semibold ${
                layers.terrainSteepnessHeatmap
                  ? 'bg-gradient-to-r from-emerald-600 via-amber-600 to-rose-600 text-white shadow ring-1 ring-amber-400/40'
                  : 'text-slate-400 hover:text-white'
              }`}
              title={
                currentLang === 'ar'
                  ? 'الخريطة الحرارية لانحدار التضاريس: تقييم مخاطر حركية الشاحنات وتدحرج النيران'
                  : 'Toggle Terrain Steepness Heatmap: Elevation DEM Slope & Fire Machinery Safety'
              }
            >
              <Mountain className={`w-3.5 h-3.5 ${layers.terrainSteepnessHeatmap ? 'text-amber-200 animate-pulse' : 'text-slate-400'}`} />
              <span>{currentLang === 'ar' ? 'انحدار التضاريس' : 'Terrain Steepness'}</span>
              <span
                className={`px-1.5 py-0.2 text-[10px] rounded-full font-mono font-bold ${
                  layers.terrainSteepnessHeatmap
                    ? 'bg-amber-950/90 text-amber-200 border border-amber-400/50'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {layers.terrainSteepnessHeatmap ? `Max ${regionalSteepnessData.summary.maxSlopeDegrees}°` : 'DEM'}
              </span>
            </button>

            {layers.terrainSteepnessHeatmap && (
              <>
                <div className="h-4 w-px bg-slate-700 mx-1" />
                <button
                  id="btn-toggle-steepness-hud"
                  onClick={() => setShowSteepnessHUD(!showSteepnessHUD)}
                  className={`p-1 rounded transition cursor-pointer ${
                    showSteepnessHUD ? 'bg-amber-950/90 text-amber-300 border border-amber-600/40' : 'text-slate-400 hover:text-white'
                  }`}
                  title={currentLang === 'ar' ? 'لوحة تحليل انحدار التضاريس ومخاطر الآليات' : 'Toggle Terrain Steepness HUD'}
                >
                  <Gauge className="w-3 h-3 text-amber-400" />
                </button>
              </>
            )}
          </div>

          {/* Resource Deployment Advisor Quick-Launch Pill */}
          <div className="flex items-center bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-lg p-0.5 text-xs">
            <button
              id="btn-toggle-resource-advisor"
              onClick={() => setShowAdvisorHUD(!showAdvisorHUD)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition cursor-pointer font-semibold ${
                showAdvisorHUD
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow ring-1 ring-amber-400/50'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title={
                currentLang === 'ar'
                  ? 'مستشار نشر الموارد الآلي: تقييم الوحدات الأقرب بناءً على المرور والتضاريس والعتاد'
                  : currentLang === 'fr'
                  ? 'Conseiller de Déploiement IA: Recommandations basées sur trafic, relief et équipement'
                  : 'Automated Resource Deployment Advisor: Optimal units based on traffic, terrain & equipment'
              }
            >
              <Sparkles className={`w-3.5 h-3.5 ${showAdvisorHUD ? 'text-amber-300 animate-pulse fill-current' : 'text-amber-400'}`} />
              <span>{currentLang === 'ar' ? 'مستشار النشر' : currentLang === 'fr' ? 'Conseiller IA' : 'Deployment Advisor'}</span>
              <span className="px-1.5 py-0.2 text-[9px] rounded-full font-mono font-bold bg-amber-400 text-slate-950">
                AI
              </span>
            </button>
          </div>

          {/* Tactical Airborne Drone Reconnaissance HUD Quick-Launch Pill */}
          <div className="flex items-center bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-lg p-0.5 text-xs">
            <button
              id="btn-toggle-drone-recon-hud"
              onClick={() => {
                if (!layers.drones) {
                  setLayers(prev => ({ ...prev, drones: true }));
                }
                setShowDroneHUD(!showDroneHUD);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition cursor-pointer font-semibold ${
                showDroneHUD
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow ring-1 ring-emerald-400/60'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title={
                currentLang === 'ar'
                  ? 'شاشة استطلاع الدرون التكتيكية (بث حراري/بصري، كشف جبهة اللهب بالذكاء الاصطناعي، وتخزين دون اتصال)'
                  : 'Tactical Drone Recon HUD (Thermal/Optical Stream, Edge AI Flame Front, Offline Snapshots)'
              }
            >
              <Camera className={`w-3.5 h-3.5 ${showDroneHUD ? 'text-emerald-300 animate-pulse' : 'text-emerald-400'}`} />
              <span>{currentLang === 'ar' ? 'استطلاع الدرون' : 'Drone HUD'}</span>
              <span className="px-1.5 py-0.2 text-[9px] rounded-full font-mono font-bold bg-rose-600 text-white">
                FLIR
              </span>
            </button>
          </div>

          {/* ASAL ALSAT Fleet Integration HUD Quick-Launch Pill */}
          <div className="flex items-center bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-lg p-0.5 text-xs">
            <button
              id="btn-toggle-alsat-fleet-hud"
              onClick={() => {
                if (!layers.alsatFleet) {
                  setLayers(prev => ({ ...prev, alsatFleet: true }));
                }
                setShowAlsatHUD(!showAlsatHUD);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition cursor-pointer font-semibold ${
                showAlsatHUD
                  ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow ring-1 ring-teal-400/60'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title={
                currentLang === 'ar'
                  ? 'منظومة الأقمار الصناعية الجزائرية: تتبع المدارات اللحظية، بصمات NDVI، والتخزين المحلي في وضع الأوفلاين'
                  : 'Algerian Space Agency (ASAL) Satellite Fleet: Orbital tracks, NDVI footprints, and offline sync'
              }
            >
              <Satellite className={`w-3.5 h-3.5 ${showAlsatHUD ? 'text-teal-300 animate-pulse' : 'text-teal-400'}`} />
              <span>{currentLang === 'ar' ? 'أقمار ALSAT' : 'ALSAT Fleet'}</span>
              <span className="px-1.5 py-0.2 text-[9px] rounded-full font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                ASAL
              </span>
            </button>
          </div>

          {/* Layer Controls Button */}
          <button
            onClick={() => setShowLayerPanel(!showLayerPanel)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold shadow-lg transition cursor-pointer ${
              showLayerPanel 
                ? 'bg-emerald-600 border-emerald-400 text-white' 
                : 'bg-slate-900/90 backdrop-blur-md border-slate-700/80 text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-emerald-300" />
            <span>GIS Layers ({Object.values(layers).filter(Boolean).length})</span>
          </button>
        </div>
      </div>

      {/* Layer Toggle Floating Panel */}
      {showLayerPanel && (
        <div className="absolute top-14 right-3 z-30 w-72 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-xl p-3 shadow-2xl text-xs space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-400" />
              GIS Layer Stack
            </span>
            <span className="text-[10px] text-emerald-400 font-mono">LIVE SYNC</span>
          </div>

          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            <label className="flex items-center justify-between p-1.5 rounded hover:bg-slate-800/60 cursor-pointer">
              <span className="flex items-center gap-2 text-slate-300">
                <Shield className="w-3.5 h-3.5 text-blue-400" />
                {t.layerWilayas}
              </span>
              <input 
                type="checkbox" 
                checked={layers.wilayas} 
                onChange={() => toggleLayer('wilayas')} 
                className="rounded accent-emerald-500"
              />
            </label>

            <label className="flex items-center justify-between p-1.5 rounded hover:bg-slate-800/60 cursor-pointer">
              <span className="flex items-center gap-2 text-slate-300">
                <Trees className="w-3.5 h-3.5 text-emerald-400" />
                {t.layerForests}
              </span>
              <input 
                type="checkbox" 
                checked={layers.forests} 
                onChange={() => toggleLayer('forests')} 
                className="rounded accent-emerald-500"
              />
            </label>

            {/* Sentinel-2 NDVI Multi-Spectral Layer Item */}
            <div className="p-2 rounded bg-emerald-950/20 border border-emerald-900/40 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <span className="w-3.5 h-3.5 rounded bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500 shrink-0 inline-block border border-slate-700" />
                  <span className="flex flex-col">
                    <span className="font-semibold text-emerald-200">{t.layerNdvi || 'NDVI & Biomass Moisture'}</span>
                    <span className="text-[9px] text-emerald-400/80 font-mono">
                      Sentinel-2 MSI • {layers.ndvi ? `${Math.round(ndviOpacity * 100)}% ${currentLang === 'ar' ? 'شفافية' : 'Opacity'}` : 'OFF'}
                    </span>
                  </span>
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowNdviControl(true);
                      setShowLayerPanel(false);
                    }}
                    className="p-1 text-emerald-400 hover:text-white rounded hover:bg-emerald-900/60 transition cursor-pointer"
                    title={currentLang === 'ar' ? 'حساب طيفي وإجهاد الجفاف' : 'Calculate & Assess Drought'}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                  </button>
                  <input 
                    type="checkbox" 
                    checked={layers.ndvi} 
                    onChange={() => toggleLayer('ndvi')} 
                    className="rounded accent-emerald-500 cursor-pointer"
                  />
                </div>
              </div>

              {layers.ndvi && (
                <div className="pt-1 flex items-center gap-2">
                  <input
                    type="range"
                    min="0.15"
                    max="0.95"
                    step="0.05"
                    value={ndviOpacity}
                    onChange={(e) => setNdviOpacity(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  />
                  <span className="text-[9px] font-mono text-emerald-300 font-bold shrink-0">
                    {Math.round(ndviOpacity * 100)}%
                  </span>
                </div>
              )}
            </div>

            <label className="flex items-center justify-between p-1.5 rounded hover:bg-slate-800/60 cursor-pointer">
              <span className="flex items-center gap-2 text-slate-300">
                <span className="w-3 h-3 rounded-full bg-gradient-to-r from-yellow-500 via-orange-500 to-red-600 inline-block" />
                {t.layerRiskHeatmap}
              </span>
              <input 
                type="checkbox" 
                checked={layers.riskHeatmap} 
                onChange={() => toggleLayer('riskHeatmap')} 
                className="rounded accent-emerald-500"
              />
            </label>

            <label className="flex items-center justify-between p-1.5 rounded hover:bg-slate-800/60 cursor-pointer">
              <span className="flex items-center gap-2 text-slate-300">
                <Flame className="w-3.5 h-3.5 text-red-500" />
                {t.layerActiveIncidents}
              </span>
              <input 
                type="checkbox" 
                checked={layers.incidents} 
                onChange={() => toggleLayer('incidents')} 
                className="rounded accent-emerald-500"
              />
            </label>

            {/* NASA FIRMS Satellite Detections Layer Item */}
            <div className="p-2 rounded bg-purple-950/25 border border-purple-900/50 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <Satellite className="w-3.5 h-3.5 text-purple-400" />
                  <span className="flex flex-col">
                    <span className="font-semibold text-purple-200">{t.layerNasaFirms}</span>
                    <span className="text-[9px] text-purple-400/80 font-mono">
                      VIIRS 375m NRT • {activeFirmsHotspots.length} {currentLang === 'ar' ? 'بؤر ملتقطة' : 'hotspots'}
                    </span>
                  </span>
                </label>
                <input 
                  type="checkbox" 
                  checked={layers.nasaFirms} 
                  onChange={() => toggleLayer('nasaFirms')} 
                  className="rounded accent-purple-500 cursor-pointer"
                />
              </div>

              {/* In-Panel Force Update Action */}
              <div className="pt-1 flex items-center justify-between border-t border-purple-900/40 text-[10px]">
                <span className="text-[9px] text-slate-400 font-mono flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5 text-slate-500" />
                  <span>{secondsSinceSync}s {currentLang === 'ar' ? 'مضت' : 'ago'}</span>
                </span>
                <button
                  id="btn-layer-drawer-force-firms"
                  onClick={handleForceRefreshFirms}
                  disabled={effectiveIsLoading}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-purple-900/80 hover:bg-purple-800 text-purple-200 text-[10px] font-bold border border-purple-500/40 transition cursor-pointer disabled:opacity-50"
                  title={t.firmsAutoPollInfo}
                >
                  <RefreshCw className={`w-2.5 h-2.5 ${effectiveIsLoading ? 'animate-spin' : ''}`} />
                  <span>{effectiveIsLoading ? (t.firmsUpdating || 'Syncing...') : (currentLang === 'ar' ? 'تحديث فوري' : 'Force Update')}</span>
                </button>
              </div>
            </div>

            {/* NASA FIRMS Satellite Density Heatmap Layer Item */}
            <div className="p-2 rounded bg-rose-950/20 border border-rose-900/40 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <Flame className="w-3.5 h-3.5 text-rose-400" />
                  <span className="flex flex-col">
                    <span className="font-semibold text-rose-200">{t.layerFirmsHeatmap}</span>
                    <span className="text-[9px] text-rose-400/80 font-mono">
                      {layers.firmsHeatmap && firmsHeatmapOpacity > 0 ? `${Math.round(firmsHeatmapOpacity * 100)}% ${t.firmsHeatmapOpacity}` : 'OFF'}
                    </span>
                  </span>
                </label>
                <input 
                  type="checkbox" 
                  checked={layers.firmsHeatmap && firmsHeatmapOpacity > 0} 
                  onChange={() => {
                    if (layers.firmsHeatmap && firmsHeatmapOpacity > 0) {
                      setFirmsHeatmapOpacity(0);
                    } else {
                      setLayers(l => ({ ...l, firmsHeatmap: true }));
                      setFirmsHeatmapOpacity(0.65);
                    }
                  }} 
                  className="rounded accent-rose-500 cursor-pointer"
                />
              </div>

              {/* In-Panel Opacity Quick Slider */}
              <div className="pt-1 flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={layers.firmsHeatmap ? firmsHeatmapOpacity : 0}
                  onChange={(e) => handleHeatmapOpacityChange(parseFloat(e.target.value))}
                  className="flex-1 h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-rose-500"
                />
                <span className="text-[10px] font-mono font-bold text-rose-300 w-8 text-right">
                  {layers.firmsHeatmap ? `${Math.round(firmsHeatmapOpacity * 100)}%` : '0%'}
                </span>
              </div>
            </div>

            {/* Active Incident Zones (Spatial Clusters) Layer Item */}
            <div className="p-2 rounded bg-rose-950/25 border border-rose-800/50 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <Radio className="w-3.5 h-3.5 text-rose-400" />
                  <span className="flex flex-col">
                    <span className="font-semibold text-rose-200">
                      {t.firmsClustersLayer || (currentLang === 'ar' ? 'تجمعات البؤر (Active Zones)' : 'Active Incident Zones')}
                    </span>
                    <span className="text-[9px] text-rose-300/80 font-mono">
                      {activeIncidentZones.length} {currentLang === 'ar' ? 'تجمعات مكانية' : 'spatial clusters'} • {activeIncidentZones.filter(z => !z.isPromoted).length} {currentLang === 'ar' ? 'غير مراقبة' : 'unpromoted'}
                    </span>
                  </span>
                </label>
                <input 
                  type="checkbox" 
                  checked={layers.firmsClusters} 
                  onChange={() => toggleLayer('firmsClusters')} 
                  className="rounded accent-rose-500 cursor-pointer"
                />
              </div>

              {layers.firmsClusters && (
                <div className="pt-1.5 space-y-1.5 border-t border-rose-900/40 text-[10px]">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>{t.clusterDistanceThreshold || (currentLang === 'ar' ? 'نطاق التجميع المكاني' : 'Clustering Radius')}:</span>
                    <span className="font-mono text-rose-300 font-bold">{clusterThresholdKm} km</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="40"
                    step="2"
                    value={clusterThresholdKm}
                    onChange={(e) => setClusterThresholdKm(parseInt(e.target.value, 10))}
                    className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-rose-500"
                  />
                  <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                    <span>10 km (Fine)</span>
                    <span>24 km (Standard)</span>
                    <span>40 km (Broad)</span>
                  </div>
                </div>
              )}
            </div>

            {/* Fire Spread Projection Layer Item */}
            <div className="p-2 rounded bg-amber-950/20 border border-amber-900/40 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <TrendingUp className="w-3.5 h-3.5 text-orange-400" />
                  <span className="flex flex-col">
                    <span className="font-semibold text-slate-200">
                      {t.layerFireSpreadProjection || t.layerSpreadIsochrones}
                    </span>
                    <span className="text-[9px] text-amber-400/80 font-mono">
                      Rothermel-Huygens • {fireSpreadProjections.length} {currentLang === 'ar' ? 'حرائق نشطة' : 'active fire fronts'}
                    </span>
                  </span>
                </label>
                <input 
                  type="checkbox" 
                  checked={layers.spreadIsochrones} 
                  onChange={() => toggleLayer('spreadIsochrones')} 
                  className="rounded accent-amber-500 cursor-pointer"
                />
              </div>

              {layers.spreadIsochrones && (
                <div className="pt-1 space-y-1.5 border-t border-amber-900/30 text-[10px]">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>{t.spreadProjectionHorizon || 'Time Horizon'}:</span>
                    <div className="flex gap-1">
                      {(['all', 30, 60, 180, 360] as const).map((h) => (
                        <button
                          key={String(h)}
                          onClick={() => setProjectionHorizon(h)}
                          className={`px-1.5 py-0.2 rounded font-mono text-[9px] font-bold transition cursor-pointer ${
                            projectionHorizon === h 
                              ? 'bg-amber-600 text-white shadow-sm' 
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {h === 'all' ? 'All' : h === 60 ? '1h' : h === 180 ? '3h' : h === 360 ? '6h' : `${h}m`}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono">
                    <span className="flex items-center gap-1">
                      <Wind className="w-2.5 h-2.5 text-amber-400" />
                      <span>{liveWeather ? `${liveWeather.windSpeedKmH} km/h ${liveWeather.windDirectionCardinal}` : 'Live Wind Synced'}</span>
                    </span>
                    <span className="text-amber-300 font-semibold">
                      Tell Atlas Topography
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Wilaya Emergency Resource Heatmap Layer Control */}
            <div className="p-2 rounded bg-red-950/20 border border-red-900/40 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <Truck className="w-3.5 h-3.5 text-red-400" />
                  <span className="flex flex-col">
                    <span className="font-semibold text-red-200">{t.layerResourceHeatmap || 'Resource Heatmap (Supply vs Demand)'}</span>
                    <span className="text-[9px] text-red-400/80 font-mono">
                      {layers.resourceHeatmap ? `${nationalResourceSummary.criticalDeficitWilayasCount} Deficit Wilayas • ${Math.round(resourceHeatmapOpacity * 100)}% Opacity` : 'OFF'}
                    </span>
                  </span>
                </label>
                <input 
                  type="checkbox" 
                  checked={layers.resourceHeatmap} 
                  onChange={() => toggleLayer('resourceHeatmap')} 
                  className="rounded accent-red-500 cursor-pointer"
                />
              </div>

              {layers.resourceHeatmap && (
                <div className="pt-1 space-y-1">
                  <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded border border-slate-800 text-[9px]">
                    <button
                      onClick={() => setResourceHeatmapMode('balance')}
                      className={`flex-1 py-0.5 rounded font-bold transition cursor-pointer ${resourceHeatmapMode === 'balance' ? 'bg-red-600 text-white' : 'text-slate-400'}`}
                    >
                      {currentLang === 'ar' ? 'الميزان' : 'Balance'}
                    </button>
                    <button
                      onClick={() => setResourceHeatmapMode('needed')}
                      className={`flex-1 py-0.5 rounded font-bold transition cursor-pointer ${resourceHeatmapMode === 'needed' ? 'bg-amber-600 text-white' : 'text-slate-400'}`}
                    >
                      {currentLang === 'ar' ? 'الطلب' : 'Needed'}
                    </button>
                    <button
                      onClick={() => setResourceHeatmapMode('available')}
                      className={`flex-1 py-0.5 rounded font-bold transition cursor-pointer ${resourceHeatmapMode === 'available' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
                    >
                      {currentLang === 'ar' ? 'المتاح' : 'Ready'}
                    </button>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="0.95"
                    step="0.05"
                    value={resourceHeatmapOpacity}
                    onChange={(e) => setResourceHeatmapOpacity(parseFloat(e.target.value))}
                    className="w-full accent-red-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  />
                </div>
              )}
            </div>

            {/* Terrain Steepness Heatmap Layer Control (DEM Slope & Machinery Mobility) */}
            <div className="p-2 rounded bg-amber-950/20 border border-amber-900/40 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <Mountain className="w-3.5 h-3.5 text-amber-400" />
                  <span className="flex flex-col">
                    <span className="font-semibold text-amber-200">
                      {t.layerTerrainSteepnessHeatmap || (currentLang === 'ar' ? 'الخريطة الحرارية لانحدار التضاريس' : 'Terrain Steepness Heatmap')}
                    </span>
                    <span className="text-[9px] text-amber-400/80 font-mono">
                      {layers.terrainSteepnessHeatmap 
                        ? `${regionalSteepnessData.summary.impassablePercent}% Impassable (>28°) • ${Math.round(terrainSteepnessOpacity * 100)}% Opacity` 
                        : 'OFF'}
                    </span>
                  </span>
                </label>
                <input 
                  type="checkbox" 
                  id="layer-toggle-terrain-steepness"
                  checked={layers.terrainSteepnessHeatmap} 
                  onChange={() => toggleLayer('terrainSteepnessHeatmap')} 
                  className="rounded accent-amber-500 cursor-pointer"
                />
              </div>

              {layers.terrainSteepnessHeatmap && (
                <div className="pt-1 space-y-1.5 border-t border-amber-900/30">
                  <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded border border-slate-800 text-[9px]">
                    <button
                      onClick={() => setTerrainSteepnessMode('all')}
                      className={`flex-1 py-0.5 rounded font-bold transition cursor-pointer ${
                        terrainSteepnessMode === 'all' ? 'bg-amber-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      {currentLang === 'ar' ? 'الكل' : 'All'}
                    </button>
                    <button
                      onClick={() => setTerrainSteepnessMode('critical_only')}
                      className={`flex-1 py-0.5 rounded font-bold transition cursor-pointer ${
                        terrainSteepnessMode === 'critical_only' ? 'bg-rose-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      {currentLang === 'ar' ? 'حرجة ≥18°' : 'Crit ≥18°'}
                    </button>
                    <button
                      onClick={() => setTerrainSteepnessMode('machinery_access')}
                      className={`flex-1 py-0.5 rounded font-bold transition cursor-pointer ${
                        terrainSteepnessMode === 'machinery_access' ? 'bg-orange-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      {currentLang === 'ar' ? 'آليات' : 'Machinery'}
                    </button>
                    <button
                      onClick={() => setTerrainSteepnessMode('ground_crew_safety')}
                      className={`flex-1 py-0.5 rounded font-bold transition cursor-pointer ${
                        terrainSteepnessMode === 'ground_crew_safety' ? 'bg-purple-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      {currentLang === 'ar' ? 'مشاة' : 'Crews'}
                    </button>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="1.0"
                    step="0.05"
                    value={terrainSteepnessOpacity}
                    onChange={(e) => setTerrainSteepnessOpacity(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  />
                  <div className="flex items-center justify-between text-[9px] text-slate-400">
                    <span>
                      {currentLang === 'ar' ? 'متوسط الانحدار:' : 'Mean Slope:'}{' '}
                      <strong className="text-amber-300">{regionalSteepnessData.summary.meanSlopeDegrees}°</strong>
                    </span>
                    <button
                      onClick={() => setShowSteepnessHUD(true)}
                      className="text-amber-400 hover:text-amber-200 underline font-mono text-[9px] cursor-pointer"
                    >
                      {currentLang === 'ar' ? 'فتح لوحة التحليل' : 'Open HUD'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Algerian Space Agency (ASAL) ALSAT Fleet Integration Layer Control */}
            <div className="p-2 rounded bg-teal-950/20 border border-teal-800/40 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <Satellite className="w-3.5 h-3.5 text-teal-400" />
                  <span className="flex flex-col">
                    <span className="font-semibold text-teal-200">
                      {currentLang === 'ar' ? 'كوكبة ALSAT الجزائرية' : 'ALSAT Satellite Fleet'}
                    </span>
                    <span className="text-[9px] text-teal-400/80 font-mono">
                      {layers.alsatFleet 
                        ? `${Object.values(alsatPositions).filter(p => p.isOverAlgeria).length}/3 Over Algeria • ${alsatPasses.length} Passes` 
                        : 'OFF'}
                    </span>
                  </span>
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAlsatHUD(true);
                      setShowLayerPanel(false);
                    }}
                    className="p-1 text-teal-400 hover:text-white rounded hover:bg-teal-900/60 transition cursor-pointer"
                    title={currentLang === 'ar' ? 'فتح لوحة تحكم أقمار ALSAT' : 'Open ALSAT Fleet HUD'}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                  </button>
                  <input 
                    type="checkbox" 
                    id="layer-toggle-alsat-fleet"
                    checked={layers.alsatFleet} 
                    onChange={() => toggleLayer('alsatFleet')} 
                    className="rounded accent-teal-500 cursor-pointer"
                  />
                </div>
              </div>

              {layers.alsatFleet && (
                <div className="pt-1 space-y-1.5 border-t border-teal-900/30 text-[10px]">
                  <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded border border-slate-800">
                    <button
                      onClick={() => setShowAlsatOrbitalTracks(!showAlsatOrbitalTracks)}
                      className={`flex-1 py-0.5 rounded font-mono font-bold transition cursor-pointer ${
                        showAlsatOrbitalTracks ? 'bg-teal-700 text-white' : 'text-slate-500'
                      }`}
                    >
                      Tracks
                    </button>
                    <button
                      onClick={() => setShowAlsatSwathCorridors(!showAlsatSwathCorridors)}
                      className={`flex-1 py-0.5 rounded font-mono font-bold transition cursor-pointer ${
                        showAlsatSwathCorridors ? 'bg-teal-700 text-white' : 'text-slate-500'
                      }`}
                    >
                      Swath
                    </button>
                    <button
                      onClick={() => setShowAlsatNdviFootprints(!showAlsatNdviFootprints)}
                      className={`flex-1 py-0.5 rounded font-mono font-bold transition cursor-pointer ${
                        showAlsatNdviFootprints ? 'bg-emerald-700 text-white' : 'text-slate-500'
                      }`}
                    >
                      NDVI
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-slate-400">
                    <span className="font-mono text-teal-300 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping" />
                      ALSAT-1B / 2A / 2B
                    </span>
                    <button
                      onClick={() => setShowAlsatHUD(true)}
                      className="text-teal-400 hover:text-teal-200 underline font-mono text-[9px] cursor-pointer"
                    >
                      {currentLang === 'ar' ? 'عرض التغطيات والأوفلاين' : 'Passes & Offline'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <label className="flex items-center justify-between p-1.5 rounded hover:bg-slate-800/60 cursor-pointer">
              <span className="flex items-center gap-2 text-slate-300">
                <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                {t.layerWaterPoints}
              </span>
              <input 
                type="checkbox" 
                checked={layers.waterPoints} 
                onChange={() => toggleLayer('waterPoints')} 
                className="rounded accent-emerald-500"
              />
            </label>

            <label className="flex items-center justify-between p-1.5 rounded hover:bg-slate-800/60 cursor-pointer">
              <span className="flex items-center gap-2 text-slate-300">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                {t.layerCivilProtection}
              </span>
              <input 
                type="checkbox" 
                checked={layers.civilProtection} 
                onChange={() => toggleLayer('civilProtection')} 
                className="rounded accent-emerald-500"
              />
            </label>

            <label className="flex items-center justify-between p-1.5 rounded hover:bg-slate-800/60 cursor-pointer">
              <span className="flex items-center gap-2 text-slate-300">
                <Eye className="w-3.5 h-3.5 text-indigo-400" />
                {t.layerWatchtowers}
              </span>
              <input 
                type="checkbox" 
                checked={layers.watchtowers} 
                onChange={() => toggleLayer('watchtowers')} 
                className="rounded accent-emerald-500"
              />
            </label>

            <label className="flex items-center justify-between p-1.5 rounded hover:bg-slate-800/60 cursor-pointer">
              <span className="flex items-center gap-2 text-slate-300">
                <Wind className="w-3.5 h-3.5 text-sky-400" />
                {t.layerWindVectors}
              </span>
              <input 
                type="checkbox" 
                checked={layers.windVectors} 
                onChange={() => toggleLayer('windVectors')} 
                className="rounded accent-emerald-500"
              />
            </label>

            <div className="flex items-center justify-between p-1.5 rounded hover:bg-slate-800/60 bg-slate-800/30">
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer flex-1">
                <Camera className="w-3.5 h-3.5 text-emerald-400" />
                <span className="flex items-center gap-1.5">
                  <span>{currentLang === 'ar' ? 'استطلاع الدرون (كاميرا حرارية/RGB)' : 'Drone Recon (Thermal/RGB Feed)'}</span>
                  <span className={`text-[10px] px-1 py-0.2 rounded font-mono font-bold ${activeDroneMission.cameraMode === 'thermal' ? 'bg-red-950 text-red-400 border border-red-800/50' : 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'}`}>
                    {activeDroneMission.cameraMode === 'thermal' ? 'FLIR' : 'RGB'}
                  </span>
                </span>
                <input 
                  type="checkbox" 
                  checked={layers.drones} 
                  onChange={() => toggleLayer('drones')} 
                  className="rounded accent-emerald-500 ml-auto mr-2"
                />
              </label>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDroneHUD(true);
                }}
                className="px-2 py-0.5 rounded bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold transition cursor-pointer"
                title="Launch Drone Mission HUD"
              >
                HUD
              </button>
            </div>

            {/* Smart Evacuation Planner Layer Toggle */}
            <label className="flex items-center justify-between p-1.5 rounded hover:bg-slate-800/60 cursor-pointer bg-emerald-950/20 border border-emerald-500/20">
              <span className="flex items-center gap-2 text-emerald-200">
                <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                <span>{currentLang === 'ar' ? 'مخطط الإخلاء الذكي ومسارات النجاة' : 'Smart Evacuation Planner & Routes'}</span>
              </span>
              <input 
                type="checkbox" 
                checked={layers.evacuationPlanner} 
                onChange={() => toggleLayer('evacuationPlanner')} 
                className="rounded accent-emerald-500"
              />
            </label>

            {/* Fire Front Dynamics Vector Layer Toggle */}
            <label className="flex items-center justify-between p-1.5 rounded hover:bg-slate-800/60 cursor-pointer bg-orange-950/20 border border-orange-500/20">
              <span className="flex items-center gap-2 text-orange-200">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                <span>{t.layerFireFrontDynamics || (currentLang === 'ar' ? 'ديناميكيات جبهة النيران (Fire Front Dynamics)' : 'Fire Front Dynamics (Active Edge)')}</span>
              </span>
              <input 
                type="checkbox" 
                checked={layers.fireFrontDynamics} 
                onChange={() => toggleLayer('fireFrontDynamics')} 
                className="rounded accent-orange-500"
              />
            </label>

            {/* Physical Fire Front Simulation Layer Toggle */}
            <label className="flex items-center justify-between p-1.5 rounded hover:bg-slate-800/60 cursor-pointer bg-red-950/20 border border-red-500/20">
              <span className="flex items-center gap-2 text-amber-200">
                <Flame className="w-3.5 h-3.5 text-red-400" />
                <span>{currentLang === 'ar' ? 'فيزياء جبهة النيران (روثيرميل/DEM)' : 'Rothermel Physical Fire Front (DEM)'}</span>
              </span>
              <input 
                type="checkbox" 
                checked={layers.physicalFireFront} 
                onChange={() => toggleLayer('physicalFireFront')} 
                className="rounded accent-red-500"
              />
            </label>
          </div>
        </div>
      )}

      {/* Floating Zoom and Navigation Controls */}
      <div className="absolute bottom-6 right-4 z-30 flex flex-col gap-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-1 shadow-2xl">
        <button
          onClick={handleCenterOnUser}
          className={`p-2 rounded-lg transition ${
            userPosition 
              ? 'bg-sky-500/20 text-sky-400 border border-sky-400/40 hover:bg-sky-500/30' 
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title={userPosition ? (currentLang === 'ar' ? 'التركيز على موقعي الفعلي GPS' : 'Focus on Live GPS') : (currentLang === 'ar' ? 'تحديد موقعي الفعلي GPS' : 'Acquire Live GPS')}
        >
          <Locate className={`w-4 h-4 ${isLocating ? 'animate-spin text-sky-400' : userPosition ? 'text-sky-300' : ''}`} />
        </button>
        <button
          onClick={() => handleZoom(1.25)}
          className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
          title="Zoom In"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleZoom(0.8)}
          className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
          title="Zoom Out"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetView}
          className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
          title="Reset Center"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Operational Risk Color Legend */}
      <div className="absolute bottom-6 left-4 z-30 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl px-3 py-2 text-xs shadow-2xl flex items-center gap-3">
        <span className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider">
          Risk Scale:
        </span>
        <div className="flex items-center gap-2 font-mono text-[10px]">
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> 0-35
          </span>
          <span className="flex items-center gap-1 text-yellow-400">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" /> 36-55
          </span>
          <span className="flex items-center gap-1 text-orange-400">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> 56-70
          </span>
          <span className="flex items-center gap-1 text-red-500">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> 71-85
          </span>
          <span className="flex items-center gap-1 text-rose-300 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-red-800 animate-ping" /> 86-100
          </span>
        </div>
      </div>

      {/* Interactive GIS SVG Canvas */}
      <svg
        ref={svgRef}
        className={`w-full h-full cursor-grab active:cursor-grabbing ${mapMode === 'satellite' ? 'bg-[#0b1424]' : mapMode === 'topographic' ? 'bg-[#0f172a]' : 'bg-[#060a12]'}`}
        viewBox="0 0 1000 650"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <defs>
          {/* Subtle Grid Pattern for High-Tech GIS feel */}
          <pattern id="gisGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(51, 65, 85, 0.15)" strokeWidth="0.8" />
          </pattern>

          {/* Radial Gradient for Active Fire Glow */}
          <radialGradient id="fireGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#f97316" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
          </radialGradient>

          {/* Isochrone Fills */}
          <radialGradient id="isochroneGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#dc2626" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0.1" />
          </radialGradient>

          {/* Camera Beam Filter */}
          <linearGradient id="cameraBeam" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
          </linearGradient>

          {/* Drone Thermal FLIR Ironbow Gradient */}
          <radialGradient id="droneThermalIronbow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="18%" stopColor="#feb078" stopOpacity="0.9" />
            <stop offset="42%" stopColor="#f1605d" stopOpacity="0.75" />
            <stop offset="70%" stopColor="#721f81" stopOpacity="0.5" />
            <stop offset="92%" stopColor="#000004" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#000004" stopOpacity="0" />
          </radialGradient>

          {/* Drone Thermal White-Hot Gradient */}
          <radialGradient id="droneThermalWhiteHot" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="35%" stopColor="#cbd5e1" stopOpacity="0.8" />
            <stop offset="70%" stopColor="#475569" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
          </radialGradient>

          {/* Drone Optical RGB Canopy Gradient */}
          <radialGradient id="droneRgbCanopy" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.85" />
            <stop offset="22%" stopColor="#f97316" stopOpacity="0.65" />
            <stop offset="50%" stopColor="#15803d" stopOpacity="0.55" />
            <stop offset="85%" stopColor="#14532d" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#052e16" stopOpacity="0" />
          </radialGradient>

          {/* Drone Sensor Camera Beam FOV */}
          <linearGradient id="droneCameraBeam" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
          </linearGradient>

          {/* Drone Billowing Smoke Plume Gradient */}
          <linearGradient id="droneSmokePlume" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(40, 40, 45, 0.75)" />
            <stop offset="50%" stopColor="rgba(100, 100, 105, 0.45)" />
            <stop offset="100%" stopColor="rgba(180, 185, 190, 0)" />
          </linearGradient>

          {/* NASA FIRMS Satellite Thermal Anomaly Gradient */}
          <radialGradient id="firmsThermalGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.9" />
            <stop offset="30%" stopColor="#c026d3" stopOpacity="0.75" />
            <stop offset="65%" stopColor="#7c3aed" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
          </radialGradient>

          {/* NASA FIRMS Heatmap Radial Gradients & Thermal Density Filters */}
          <filter id="firmsHeatmapBlurFilter" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="15" result="blur" />
          </filter>

          <radialGradient id="firmsHeatmapCoreGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="18%" stopColor="#fef08a" stopOpacity="0.9" />
            <stop offset="40%" stopColor="#f97316" stopOpacity="0.8" />
            <stop offset="68%" stopColor="#e11d48" stopOpacity="0.65" />
            <stop offset="88%" stopColor="#9333ea" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#6b21a8" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="firmsHeatmapWideGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.75" />
            <stop offset="35%" stopColor="#c026d3" stopOpacity="0.55" />
            <stop offset="70%" stopColor="#6366f1" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
          </radialGradient>

          {/* Fire Spread Vector Arrow Markers */}
          <marker id="windArrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#f97316" />
          </marker>
          <marker id="flameHeadArrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#ef4444" />
          </marker>
          
          {/* Fire Spread Isochrone Radial Glow */}
          <radialGradient id="projectionCoreGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffedd5" stopOpacity="0.95" />
            <stop offset="25%" stopColor="#f97316" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#dc2626" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#7f1d1d" stopOpacity="0.05" />
          </radialGradient>

          {/* Active Incident Zone Cluster Gradients & Patterns */}
          <radialGradient id="clusterEnclosureGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.22" />
            <stop offset="60%" stopColor="#e11d48" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#881337" stopOpacity="0.05" />
          </radialGradient>
          <radialGradient id="clusterCoreHalo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.85" />
            <stop offset="35%" stopColor="#db2777" stopOpacity="0.5" />
            <stop offset="70%" stopColor="#9d174d" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#881337" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="clusterPromotedHalo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
            <stop offset="40%" stopColor="#059669" stopOpacity="0.45" />
            <stop offset="75%" stopColor="#047857" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#064e3b" stopOpacity="0" />
          </radialGradient>
          <pattern id="clusterHatchPattern" width="12" height="12" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="12" stroke="#f43f5e" strokeWidth="1.2" opacity="0.15" />
          </pattern>

          {/* Emergency Resource Heatmap Deficit / Surplus Gradients */}
          <radialGradient id="resourceDeficitGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.85" />
            <stop offset="40%" stopColor="#dc2626" stopOpacity="0.5" />
            <stop offset="75%" stopColor="#991b1b" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#7f1d1d" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="resourceSurplusGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.85" />
            <stop offset="40%" stopColor="#059669" stopOpacity="0.45" />
            <stop offset="75%" stopColor="#047857" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#064e3b" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="resourceNeededGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.85" />
            <stop offset="40%" stopColor="#d97706" stopOpacity="0.5" />
            <stop offset="75%" stopColor="#b45309" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#78350f" stopOpacity="0" />
          </radialGradient>

          {/* Marker for Inter-Wilaya Mutual Aid Logistics Transfer */}
          <marker id="logisticsArrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <polygon points="0 0, 8 4, 0 8" fill="#f59e0b" />
          </marker>
        </defs>

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Background Grid */}
          <rect x="-500" y="-300" width="2000" height="1500" fill="url(#gisGrid)" />

          {/* Mediterranean Sea Coastline Guide */}
          <path
            d="M 50 140 Q 250 120 400 125 T 600 115 T 850 110 T 950 120 L 950 -100 L 50 -100 Z"
            fill="rgba(14, 116, 144, 0.08)"
            stroke="rgba(6, 182, 212, 0.25)"
            strokeWidth="1.2"
            strokeDasharray="4 4"
          />
          <text x="500" y="60" fill="rgba(6, 182, 212, 0.3)" fontSize="14" fontStyle="italic" letterSpacing="4">
            MEDITERRANEAN SEA (البحر الأبيض المتوسط)
          </text>

          {/* Dynamic AI Risk Heatmap Zones */}
          {layers.riskHeatmap && (
            <g id="layer-risk-heatmap" opacity="0.6">
              {/* Jijel Guerrouche Extreme Hotspot */}
              <circle cx="615" cy="140" r="55" fill="#ef4444" opacity="0.35" filter="blur(18px)" />
              <circle cx="615" cy="140" r="28" fill="#b91c1c" opacity="0.5" filter="blur(8px)" />

              {/* Tizi Ouzou Yakouren High Hotspot */}
              <circle cx="500" cy="145" r="48" fill="#f97316" opacity="0.35" filter="blur(16px)" />

              {/* Bejaia Akfadou High Hotspot */}
              <circle cx="560" cy="145" r="45" fill="#ea580c" opacity="0.32" filter="blur(15px)" />

              {/* El Tarf El Kala Hotspot */}
              <circle cx="795" cy="135" r="42" fill="#f59e0b" opacity="0.3" filter="blur(14px)" />
            </g>
          )}

          {/* NASA FIRMS Satellite Wildfire Risk Density Heatmap Layer */}
          {layers.firmsHeatmap && firmsHeatmapOpacity > 0 && activeFirmsHotspots.length > 0 && (
            <g
              id="layer-firms-satellite-density-heatmap"
              opacity={firmsHeatmapOpacity}
              className="pointer-events-none transition-opacity duration-300"
            >
              {/* Wide Dispersion Ambient Thermal Signature Blobs */}
              {activeFirmsHotspots.map((hotspot, idx) => {
                const pt = geoToSvg(hotspot.latitude, hotspot.longitude);
                const frp = hotspot.frpMw || 25;
                const rWide = Math.min(85, Math.max(34, 28 + Math.sqrt(frp) * 4.8));

                return (
                  <circle
                    key={`firms-wide-dispersion-${hotspot.id}-${idx}`}
                    cx={pt.x}
                    cy={pt.y}
                    r={rWide}
                    fill="url(#firmsHeatmapWideGrad)"
                    filter="url(#firmsHeatmapBlurFilter)"
                  />
                );
              })}

              {/* Core High-Intensity Radiant Density Heatmap */}
              {activeFirmsHotspots.map((hotspot, idx) => {
                const pt = geoToSvg(hotspot.latitude, hotspot.longitude);
                const frp = hotspot.frpMw || 25;
                const rCore = Math.min(52, Math.max(20, 16 + Math.sqrt(frp) * 3.2));
                const confFactor = Math.max(0.5, Math.min(1, hotspot.confidencePercent / 100));

                return (
                  <g key={`firms-density-cluster-${hotspot.id}-${idx}`}>
                    {/* Concentrated Radiative Thermal Energy Bloom */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={rCore}
                      fill="url(#firmsHeatmapCoreGrad)"
                      opacity={confFactor}
                      filter="url(#firmsHeatmapBlurFilter)"
                    />
                    {/* Anomaly Core White/Yellow Peak */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={Math.max(5, Math.round(rCore * 0.32))}
                      fill="#ffffff"
                      opacity={0.85}
                      filter="blur(3px)"
                    />
                    {/* Dynamic Density Isoline Ring */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={rCore * 1.12}
                      fill="none"
                      stroke="#f472b6"
                      strokeWidth="0.8"
                      strokeDasharray="4 3"
                      opacity={0.55}
                    />
                  </g>
                );
              })}
            </g>
          )}

          {/* Wilayas Administrative Boundaries */}
          {layers.wilayas && (
            <g id="layer-wilayas">
              {ALGERIA_WILAYAS.map((w) => {
                const pt = geoToSvg(w.lat, w.lng);
                return (
                  <g key={w.code} className="cursor-pointer group">
                    <path
                      d={w.svgPath}
                      fill={
                        mapMode === 'satellite'
                          ? 'rgba(30, 41, 59, 0.45)'
                          : 'rgba(15, 23, 42, 0.75)'
                      }
                      stroke={w.currentRiskIndex > 80 ? 'rgba(239, 68, 68, 0.6)' : 'rgba(71, 85, 105, 0.5)'}
                      strokeWidth="1.2"
                      className="transition-colors group-hover:fill-slate-800/90"
                    />
                    <text
                      x={pt.x}
                      y={pt.y}
                      fill="rgba(226, 232, 240, 0.75)"
                      fontSize="9"
                      fontWeight="600"
                      textAnchor="middle"
                      className="select-none pointer-events-none"
                    >
                      {currentLang === 'ar' ? w.nameAr : w.nameEn}
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          {/* Terrain Steepness Heatmap & Machinery Mobility Hazard Layer (DEM Elevation Analysis) */}
          {layers.terrainSteepnessHeatmap && (
            <TerrainSteepnessOverlay
              geoToSvg={geoToSvg}
              cells={regionalSteepnessData.cells}
              criticalZones={CRITICAL_ESCARPMENT_ZONES}
              opacity={terrainSteepnessOpacity}
              mode={terrainSteepnessMode}
              showContourBlobs={showSteepnessBlobs}
              showHazardBadges={showSteepnessBadges}
              showAspectVectors={showSteepnessVectors}
              selectedCellId={selectedSteepnessCell?.id || null}
              onSelectCell={(cell) => {
                setSelectedSteepnessCell(cell);
                setSelectedCriticalEscarpment(null);
                if (cell) setShowSteepnessHUD(true);
              }}
              onSelectCriticalZone={(zone) => {
                setSelectedCriticalEscarpment(zone);
                setSelectedSteepnessCell(null);
                setShowSteepnessHUD(true);
                const pt = geoToSvg(zone.coordinates.lat, zone.coordinates.lng);
                setZoom(2.4);
                setPan({ x: 500 - pt.x * 2.4, y: 325 - pt.y * 2.4 });
              }}
              currentLang={currentLang}
            />
          )}

          {/* Wilaya Resource Heatmap & Asset Optimization Layer */}
          {layers.resourceHeatmap && (
            <g id="layer-resource-heatmap" opacity={resourceHeatmapOpacity} className="transition-opacity duration-300">
              {displayedWilayaBalances.map((b) => {
                const w = ALGERIA_WILAYAS.find((wilaya) => wilaya.code === b.wilayaCode);
                if (!w) return null;
                const pt = geoToSvg(w.lat, w.lng);

                let polyFill = b.color;
                let polyStroke = b.strokeColor;
                let polyOpacity = 0.45;
                let glowGrad = 'url(#resourceDeficitGlow)';
                let glowRadius = 38;

                if (resourceHeatmapMode === 'balance') {
                  if (b.status === 'critical_deficit') {
                    polyFill = '#ef4444';
                    polyStroke = '#f87171';
                    polyOpacity = 0.55;
                    glowGrad = 'url(#resourceDeficitGlow)';
                    glowRadius = Math.min(65, 30 + Math.abs(b.gap) * 6);
                  } else if (b.status === 'moderate_deficit') {
                    polyFill = '#f97316';
                    polyStroke = '#fb923c';
                    polyOpacity = 0.40;
                    glowGrad = 'url(#resourceNeededGlow)';
                    glowRadius = Math.min(50, 25 + Math.abs(b.gap) * 5);
                  } else if (b.status === 'surplus') {
                    polyFill = '#10b981';
                    polyStroke = '#34d399';
                    polyOpacity = 0.35;
                    glowGrad = 'url(#resourceSurplusGlow)';
                    glowRadius = Math.min(50, 25 + b.gap * 4);
                  } else {
                    polyFill = '#3b82f6';
                    polyStroke = '#60a5fa';
                    polyOpacity = 0.22;
                    glowGrad = 'url(#resourceSurplusGlow)';
                    glowRadius = 24;
                  }
                } else if (resourceHeatmapMode === 'needed') {
                  polyFill = b.needed.total > 5 ? '#ef4444' : b.needed.total > 2 ? '#f97316' : '#eab308';
                  polyStroke = '#f97316';
                  polyOpacity = Math.min(0.65, 0.18 + (b.needed.total / 10) * 0.45);
                  glowGrad = 'url(#resourceDeficitGlow)';
                  glowRadius = Math.min(65, 20 + b.needed.total * 4.5);
                } else {
                  polyFill = b.available.ready > 6 ? '#10b981' : b.available.ready > 3 ? '#06b6d4' : '#64748b';
                  polyStroke = '#10b981';
                  polyOpacity = Math.min(0.65, 0.18 + (b.available.ready / 12) * 0.45);
                  glowGrad = 'url(#resourceSurplusGlow)';
                  glowRadius = Math.min(65, 20 + b.available.ready * 4);
                }

                const isSelected = selectedWilayaBalance?.wilayaCode === b.wilayaCode;

                return (
                  <g
                    key={`res-heat-${b.wilayaCode}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedWilayaBalance(b);
                    }}
                    className="cursor-pointer group"
                  >
                    {/* Wilaya Shading according to Resource Status */}
                    <path
                      d={w.svgPath}
                      fill={polyFill}
                      fillOpacity={polyOpacity}
                      stroke={isSelected ? '#ffffff' : polyStroke}
                      strokeWidth={isSelected ? 2.5 : b.status === 'critical_deficit' ? 2 : 1.2}
                      strokeDasharray={b.status === 'critical_deficit' ? '4 2' : undefined}
                      className="transition-all duration-200 group-hover:fill-opacity-75"
                    />

                    {/* Centroid Heatmap Thermal Radial Bloom */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={glowRadius}
                      fill={glowGrad}
                      opacity={0.65}
                      filter="blur(12px)"
                      className="pointer-events-none"
                    />

                    {/* Pulsing Alert Ring for Critical Deficit Wilayas */}
                    {b.status === 'critical_deficit' && (
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="18"
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="1.5"
                        opacity="0.8"
                        className="animate-ping"
                      />
                    )}

                    {/* Tactical Commander Wilaya Asset Badge */}
                    <g transform={`translate(${pt.x}, ${pt.y})`}>
                      <rect
                        x="-38"
                        y="-16"
                        width="76"
                        height="32"
                        rx="6"
                        fill="#090d16"
                        fillOpacity="0.92"
                        stroke={isSelected ? '#38bdf8' : polyStroke}
                        strokeWidth={isSelected ? 2 : 1}
                        className="shadow-2xl transition group-hover:fill-[#0f172a]"
                      />

                      {/* Wilaya Name */}
                      <text
                        x="0"
                        y="-4"
                        fill="#f8fafc"
                        fontSize="7.5"
                        fontWeight="bold"
                        textAnchor="middle"
                        className="select-none pointer-events-none"
                      >
                        {currentLang === 'ar' ? b.nameAr : b.nameEn}
                      </text>

                      {/* Primary Balance / Demand / Supply Metric */}
                      <text
                        x="0"
                        y="6"
                        fill={
                          b.status === 'critical_deficit'
                            ? '#f87171'
                            : b.status === 'moderate_deficit'
                            ? '#fb923c'
                            : b.status === 'surplus'
                            ? '#4ade80'
                            : '#93c5fd'
                        }
                        fontSize="7"
                        fontWeight="800"
                        fontFamily="monospace"
                        textAnchor="middle"
                        className="select-none pointer-events-none"
                      >
                        {resourceHeatmapMode === 'balance'
                          ? b.gap < 0
                            ? `⚠️ -${Math.abs(b.gap)} ${currentLang === 'ar' ? 'عجز' : 'DEFICIT'}`
                            : b.gap > 0
                            ? `🛡️ +${b.gap} ${currentLang === 'ar' ? 'فائض' : 'SURPLUS'}`
                            : `✓ ${currentLang === 'ar' ? 'متوازن' : 'BALANCED'}`
                          : resourceHeatmapMode === 'needed'
                          ? `🔥 ${b.needed.total} ${currentLang === 'ar' ? 'مطلوب' : 'NEEDED'}`
                          : `🛡️ ${b.available.ready} ${currentLang === 'ar' ? 'جاهز' : 'READY'}`}
                      </text>

                      {/* Micro Fleet Summary */}
                      <text
                        x="0"
                        y="13"
                        fill="#94a3b8"
                        fontSize="5.5"
                        fontFamily="monospace"
                        textAnchor="middle"
                        className="select-none pointer-events-none"
                      >
                        {b.available.ready} {currentLang === 'ar' ? 'متاح' : 'avail'} • {b.needed.total} {currentLang === 'ar' ? 'طلب' : 'req'}
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* Inter-Wilaya Mutual Aid Logistics Transfer Routes */}
              {nationalResourceSummary.recommendations.map((rec) => {
                const src = ALGERIA_WILAYAS.find(
                  (w) =>
                    w.nameEn.toLowerCase() === rec.fromWilaya.toLowerCase() ||
                    w.nameAr === rec.fromWilayaAr
                );
                const dst = ALGERIA_WILAYAS.find(
                  (w) =>
                    w.nameEn.toLowerCase() === rec.toWilaya.toLowerCase() ||
                    w.nameAr === rec.toWilayaAr
                );
                if (!src || !dst) return null;

                const p1 = geoToSvg(src.lat, src.lng);
                const p2 = geoToSvg(dst.lat, dst.lng);
                const midX = (p1.x + p2.x) / 2;
                const midY = (p1.y + p2.y) / 2 - 28;

                return (
                  <g
                    key={`rec-route-${rec.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExecuteRecommendation(rec);
                    }}
                    className="cursor-pointer group"
                  >
                    <path
                      d={`M ${p1.x} ${p1.y} Q ${midX} ${midY} ${p2.x} ${p2.y}`}
                      fill="none"
                      stroke="#000000"
                      strokeWidth="5"
                      opacity="0.6"
                    />
                    <path
                      d={`M ${p1.x} ${p1.y} Q ${midX} ${midY} ${p2.x} ${p2.y}`}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2.2"
                      strokeDasharray="6 4"
                      className="animate-pulse"
                      markerEnd="url(#logisticsArrow)"
                    />
                    <g transform={`translate(${midX}, ${midY + 4})`}>
                      <rect
                        x="-38"
                        y="-9"
                        width="76"
                        height="18"
                        rx="4"
                        fill="#18181b"
                        stroke="#f59e0b"
                        strokeWidth="1.2"
                        className="shadow-xl group-hover:fill-amber-950 transition"
                      />
                      <text
                        x="0"
                        y="3"
                        fill="#fde047"
                        fontSize="7"
                        fontWeight="bold"
                        fontFamily="monospace"
                        textAnchor="middle"
                      >
                        🚚 {rec.transitCorridor} • {rec.estimatedTransitMinutes}m
                      </text>
                    </g>
                  </g>
                );
              })}
            </g>
          )}

          {/* Copernicus Sentinel-2 MSI Multi-Spectral NDVI Vegetation Health Layer */}
          {layers.ndvi && (
            <g id="layer-ndvi-vegetation-health" opacity={ndviOpacity} className="transition-opacity duration-300">
              {filteredNdviPixels.map((pixel) => {
                const pt = geoToSvg(pixel.lat, pixel.lng);
                const rSvg = Math.max(12, pixel.radiusKm * 1.5);
                const isCritical = pixel.stressCategory === 'critical_drought';
                const isHovered = hoveredNdviPixel?.id === pixel.id;

                return (
                  <g
                    key={pixel.id}
                    className="cursor-pointer group"
                    onMouseEnter={() => setHoveredNdviPixel(pixel)}
                    onMouseLeave={() => setHoveredNdviPixel(null)}
                    onClick={() => {
                      const match = forests.find(f => f.nameAr === pixel.forestNameAr || f.name === pixel.forestName);
                      if (match) onSelectForest(match);
                    }}
                  >
                    {/* Multi-spectral soft glow */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={rSvg * 1.25}
                      fill={pixel.color}
                      opacity={isCritical ? 0.38 : 0.20}
                      filter="blur(6px)"
                    />

                    {/* Outer Pulsing Aura for Critical Drought Stress */}
                    {isCritical && (
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={rSvg * 1.45}
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="1.3"
                        strokeDasharray="4 3"
                        opacity={0.8}
                        className="animate-pulse"
                      />
                    )}

                    {/* Main NDVI Raster Cell */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={rSvg}
                      fill={pixel.fillRgba}
                      stroke={isHovered ? '#ffffff' : isCritical ? '#ef4444' : pixel.color}
                      strokeWidth={isHovered ? 2.5 : isCritical ? 1.8 : 1}
                      strokeDasharray={isCritical ? '3 2' : undefined}
                      className="transition-all duration-200"
                    />

                    {/* Internal Core Spot */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? 4 : 2.5}
                      fill={isCritical ? '#fca5a5' : '#a7f3d0'}
                      opacity={0.85}
                    />

                    {/* NDVI Value readout in cell */}
                    <text
                      x={pt.x}
                      y={pt.y + 3}
                      fill="#ffffff"
                      fontSize={isHovered ? '8.5' : '7.5'}
                      fontWeight="bold"
                      fontFamily="monospace"
                      textAnchor="middle"
                      className="drop-shadow-md pointer-events-none select-none"
                    >
                      {pixel.ndvi}
                    </text>
                  </g>
                );
              })}

              {/* Hover Tooltip Overlay in SVG */}
              {hoveredNdviPixel && (() => {
                const pt = geoToSvg(hoveredNdviPixel.lat, hoveredNdviPixel.lng);
                const stop = getNdviColorStop(hoveredNdviPixel.ndvi);
                const riskLabel = currentLang === 'ar' ? stop.flammabilityIndexAr : `${stop.flammabilityIndex} Flammability`;

                return (
                  <g pointerEvents="none" className="z-30">
                    {/* Tooltip Card Box */}
                    <rect
                      x={pt.x - 78}
                      y={pt.y - 56}
                      width="156"
                      height="48"
                      rx="6"
                      fill="#020617"
                      stroke={stop.hex}
                      strokeWidth="1.2"
                      opacity="0.96"
                      filter="drop-shadow(0 4px 6px rgba(0,0,0,0.6))"
                    />
                    {/* Forest Name */}
                    <text
                      x={pt.x}
                      y={pt.y - 44}
                      fill="#f8fafc"
                      fontSize="8"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {currentLang === 'ar' ? hoveredNdviPixel.forestNameAr : hoveredNdviPixel.forestName}
                    </text>
                    {/* Values line */}
                    <text
                      x={pt.x}
                      y={pt.y - 33}
                      fill={stop.hex}
                      fontSize="7.5"
                      fontFamily="monospace"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      NDVI {hoveredNdviPixel.ndvi} • FMC {hoveredNdviPixel.fuelMoistureFmc}%
                    </text>
                    {/* Spectral Bands Readout */}
                    <text
                      x={pt.x}
                      y={pt.y - 22}
                      fill="#94a3b8"
                      fontSize="6.5"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      B8(NIR): {hoveredNdviPixel.nirReflectance ?? '0.38'} • B4(Red): {hoveredNdviPixel.redReflectance ?? '0.14'}
                    </text>
                    {/* Flammability Status & Anomaly */}
                    <text
                      x={pt.x}
                      y={pt.y - 12}
                      fill="#cbd5e1"
                      fontSize="6.5"
                      fontWeight="500"
                      textAnchor="middle"
                    >
                      {riskLabel} {hoveredNdviPixel.droughtAnomalyPercent !== undefined ? `• ${hoveredNdviPixel.droughtAnomalyPercent > 0 ? '+' : ''}${hoveredNdviPixel.droughtAnomalyPercent}% Δ` : ''}
                    </text>
                  </g>
                );
              })()}
            </g>
          )}

          {/* National Forests and Biospheres */}
          {layers.forests && (
            <g id="layer-forests">
              {forests.map((f) => {
                const pt = geoToSvg(f.coordinates.lat, f.coordinates.lng);
                return (
                  <g
                    key={f.id}
                    onClick={() => onSelectForest(f)}
                    className="cursor-pointer group"
                  >
                    {/* Forest Area Polygon approximation */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="16"
                      fill="rgba(16, 185, 129, 0.25)"
                      stroke="#10b981"
                      strokeWidth="1.5"
                      strokeDasharray="3 2"
                      className="group-hover:fill-emerald-500/40 transition"
                    />
                    <Trees className="w-3.5 h-3.5 text-emerald-400" />
                    <text
                      x={pt.x}
                      y={pt.y + 24}
                      fill="#6ee7b7"
                      fontSize="8"
                      fontWeight="bold"
                      textAnchor="middle"
                      className="drop-shadow-md pointer-events-none"
                    >
                      {currentLang === 'ar' ? f.nameAr : f.name}
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          {/* Water Points & Reservoirs */}
          {layers.waterPoints && (
            <g id="layer-water-points">
              {waterPoints.map((wp) => {
                const pt = geoToSvg(wp.coordinates.lat, wp.coordinates.lng);
                return (
                  <g key={wp.id} className="cursor-pointer">
                    <circle cx={pt.x} cy={pt.y} r="5" fill="#06b6d4" stroke="#083344" strokeWidth="1.5" />
                    <circle cx={pt.x} cy={pt.y} r="8" fill="none" stroke="#22d3ee" strokeWidth="0.8" opacity="0.7" />
                    <text x={pt.x + 8} y={pt.y + 3} fill="#a5f3fc" fontSize="7.5" fontWeight="500">
                      💧 {wp.name.split(' ')[0]}
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          {/* Watchtowers & Scanning Cameras */}
          {layers.watchtowers && (
            <g id="layer-watchtowers">
              {watchtowers.map((wt) => {
                const pt = geoToSvg(wt.coordinates.lat, wt.coordinates.lng);
                return (
                  <g key={wt.id} className="cursor-pointer">
                    {/* Simulated Camera FOV Beam */}
                    <path
                      d={`M ${pt.x} ${pt.y} L ${pt.x + 25} ${pt.y - 35} A 30 30 0 0 0 ${pt.x + 42} ${pt.y - 12} Z`}
                      fill="url(#cameraBeam)"
                      opacity="0.7"
                    />
                    <circle cx={pt.x} cy={pt.y} r="4" fill="#6366f1" stroke="#ffffff" strokeWidth="1" />
                    <text x={pt.x - 10} y={pt.y - 7} fill="#c7d2fe" fontSize="7.5" fontWeight="bold">
                      📡 WT-{wt.id.split('-')[2] || '17'}
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          {/* Emergency Response Units (Civil Protection & Tankers) */}
          {layers.civilProtection && (
            <g id="layer-civil-protection">
              {resources.map((res) => {
                const pt = geoToSvg(res.currentLocation.lat, res.currentLocation.lng);
                return (
                  <g key={res.id} className="cursor-pointer">
                    <rect
                      x={pt.x - 7}
                      y={pt.y - 7}
                      width="14"
                      height="14"
                      rx="3"
                      fill="#eab308"
                      stroke="#0f172a"
                      strokeWidth="1.5"
                    />
                    <text
                      x={pt.x}
                      y={pt.y + 3.5}
                      fill="#000000"
                      fontSize="7"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      🚒
                    </text>
                    <text x={pt.x} y={pt.y + 16} fill="#fef08a" fontSize="7" fontWeight="bold" textAnchor="middle">
                      {res.code}
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          {/* Wind Streamlines Vector Layer */}
          {layers.windVectors && (
            <g id="layer-wind" opacity="0.75">
              {/* Representative Sirocco Vectors heading North-East */}
              {[
                { x: 580, y: 180 },
                { x: 620, y: 160 },
                { x: 530, y: 170 },
                { x: 470, y: 165 },
                { x: 670, y: 155 }
              ].map((w, idx) => (
                <g key={idx} transform={`translate(${w.x}, ${w.y}) rotate(-45)`}>
                  <line x1="0" y1="0" x2="28" y2="0" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="4 2" />
                  <polygon points="28,-3 34,0 28,3" fill="#38bdf8" />
                  <text x="36" y="3" fill="#bae6fd" fontSize="7" fontStyle="italic">
                    42 km/h NE
                  </text>
                </g>
              ))}
            </g>
          )}

          {/* Fire Spread Projection Layer (Live Weather Wind & Terrain Dynamic Model) */}
          {layers.spreadIsochrones && fireSpreadProjections.length > 0 && (
            <g id="layer-fire-spread-projections">
              {fireSpreadProjections.map((proj) => {
                const originSvg = geoToSvg(proj.origin.lat, proj.origin.lng);
                const headSvg = geoToSvg(proj.headFirePoint.lat, proj.headFirePoint.lng);
                const maxSvg = geoToSvg(proj.maxProjectedPoint.lat, proj.maxProjectedPoint.lng);
                const windVecSvg = geoToSvg(proj.windVectorEndPoint.lat, proj.windVectorEndPoint.lng);
                const isSelected = selectedIncident?.id === proj.incidentId || selectedProjectionIncidentId === proj.incidentId;

                // Color configuration for time horizons
                const horizonConfig: Record<number, { stroke: string; fill: string; fillOpacity: number; strokeWidth: number; dash?: string; label: string }> = {
                  30: { stroke: '#ef4444', fill: '#dc2626', fillOpacity: 0.32, strokeWidth: 2.2, label: '+30m' },
                  60: { stroke: '#f97316', fill: '#ea580c', fillOpacity: 0.22, strokeWidth: 2.0, label: '+1h' },
                  180: { stroke: '#f59e0b', fill: '#d97706', fillOpacity: 0.16, strokeWidth: 1.8, dash: '5 3', label: '+3h' },
                  360: { stroke: '#eab308', fill: '#ca8a04', fillOpacity: 0.10, strokeWidth: 1.5, dash: '4 4', label: '+6h' }
                };

                return (
                  <g 
                    key={`proj-${proj.incidentId}`}
                    onClick={() => {
                      setSelectedProjectionIncidentId(proj.incidentId);
                      const matching = incidents.find((i) => i.id === proj.incidentId);
                      if (matching) onSelectIncident(matching);
                    }}
                    className="cursor-pointer transition-opacity"
                    opacity={isSelected ? 1 : 0.88}
                  >
                    {/* Isochrone Spread Polygons */}
                    {proj.isochrones.map((iso) => {
                      // Filter by horizon if specified
                      if (projectionHorizon !== 'all' && iso.timeHorizonMinutes !== projectionHorizon) {
                        return null;
                      }

                      const cfg = horizonConfig[iso.timeHorizonMinutes] || horizonConfig[60];
                      const pointsSvg = iso.perimeterPoints.map((p) => {
                        const s = geoToSvg(p.lat, p.lng);
                        return `${s.x},${s.y}`;
                      }).join(' ');

                      // Label position (furthest point along heading)
                      const labelPt = iso.perimeterPoints[0] 
                        ? geoToSvg(iso.perimeterPoints[0].lat, iso.perimeterPoints[0].lng) 
                        : originSvg;

                      return (
                        <g key={`iso-${proj.incidentId}-${iso.timeHorizonMinutes}`} className="hover:opacity-100 transition-opacity">
                          {/* Outer glow aura for 1h or selected */}
                          {(iso.timeHorizonMinutes === 60 || projectionHorizon === iso.timeHorizonMinutes) && (
                            <polygon
                              points={pointsSvg}
                              fill="none"
                              stroke={cfg.stroke}
                              strokeWidth={cfg.strokeWidth + 4}
                              strokeOpacity={0.25}
                            />
                          )}

                          {/* Primary Isochrone Polygon */}
                          <polygon
                            points={pointsSvg}
                            fill={cfg.fill}
                            fillOpacity={cfg.fillOpacity}
                            stroke={cfg.stroke}
                            strokeWidth={cfg.strokeWidth}
                            strokeDasharray={cfg.dash}
                            className="hover:stroke-white transition-colors"
                          />

                          {/* Horizon & Area Label */}
                          <g transform={`translate(${labelPt.x}, ${labelPt.y - 4})`}>
                            <rect
                              x="-28"
                              y="-10"
                              width="56"
                              height="12"
                              rx="3"
                              fill="rgba(15, 23, 42, 0.88)"
                              stroke={cfg.stroke}
                              strokeWidth="0.8"
                            />
                            <text
                              x="0"
                              y="-1.5"
                              fill="#f8fafc"
                              fontSize="7"
                              fontWeight="bold"
                              fontFamily="monospace"
                              textAnchor="middle"
                            >
                              {cfg.label} ({iso.areaHectares}ha)
                            </text>
                          </g>
                        </g>
                      );
                    })}

                    {/* Ember Spotting Hazard Cone (if spotting risk is high or extreme) */}
                    {(proj.spottingRisk === 'high' || proj.spottingRisk === 'extreme') && (
                      <g opacity={0.65}>
                        {/* Projected ember cone line */}
                        <line
                          x1={headSvg.x}
                          y1={headSvg.y}
                          x2={maxSvg.x}
                          y2={maxSvg.y}
                          stroke="#fb923c"
                          strokeWidth="1.2"
                          strokeDasharray="3 3"
                        />
                        {/* Ember particle dots */}
                        <circle cx={headSvg.x + (maxSvg.x - headSvg.x) * 0.4} cy={headSvg.y + (maxSvg.y - headSvg.y) * 0.4} r="2" fill="#fbbf24" className="animate-ping" />
                        <circle cx={headSvg.x + (maxSvg.x - headSvg.x) * 0.7} cy={headSvg.y + (maxSvg.y - headSvg.y) * 0.7} r="1.5" fill="#f97316" />
                        <circle cx={maxSvg.x} cy={maxSvg.y} r="2.2" fill="#ef4444" />
                        
                        <text
                          x={maxSvg.x + 4}
                          y={maxSvg.y + 3}
                          fill="#fbbf24"
                          fontSize="6.5"
                          fontWeight="bold"
                          fontFamily="monospace"
                        >
                          Spotting: {proj.maxSpottingDistanceKm}km
                        </text>
                      </g>
                    )}

                    {/* Live Weather Wind Vector Push Line */}
                    <g>
                      {/* Push line with arrowhead */}
                      <line
                        x1={originSvg.x}
                        y1={originSvg.y}
                        x2={windVecSvg.x}
                        y2={windVecSvg.y}
                        stroke="#f97316"
                        strokeWidth="2.2"
                        strokeDasharray="4 2"
                        markerEnd="url(#windArrow)"
                      />

                      {/* Wind & Flame Heading Badge */}
                      <g transform={`translate(${(originSvg.x + windVecSvg.x) / 2 + 10}, ${(originSvg.y + windVecSvg.y) / 2})`}>
                        <rect
                          x="-34"
                          y="-9"
                          width="68"
                          height="13"
                          rx="3"
                          fill="rgba(2, 6, 23, 0.92)"
                          stroke="#f97316"
                          strokeWidth="0.8"
                        />
                        <text
                          x="0"
                          y="0"
                          fill="#fdba74"
                          fontSize="6.5"
                          fontWeight="bold"
                          fontFamily="monospace"
                          textAnchor="middle"
                        >
                          Wind {proj.windSpeedKmH}k/h {proj.windDirectionCardinal} ➔ {proj.flameHeadingCardinal}
                        </text>
                      </g>
                    </g>

                    {/* Terrain Slope & Acceleration Indicator */}
                    <g transform={`translate(${originSvg.x - 30}, ${originSvg.y + 16})`}>
                      <rect
                        x="-24"
                        y="-8"
                        width="48"
                        height="12"
                        rx="3"
                        fill="rgba(15, 23, 42, 0.90)"
                        stroke="#10b981"
                        strokeWidth="0.7"
                      />
                      <text
                        x="0"
                        y="0.5"
                        fill="#6ee7b7"
                        fontSize="6.5"
                        fontWeight="bold"
                        fontFamily="monospace"
                        textAnchor="middle"
                      >
                        ⛰ {proj.terrainSlopeDegrees}° (+{proj.terrainSlopeMultiplier}%)
                      </text>
                    </g>

                    {/* Leading Flame Front Marker */}
                    <g transform={`translate(${headSvg.x}, ${headSvg.y})`}>
                      <circle cx="0" cy="0" r="4.5" fill="#ef4444" fillOpacity="0.8" className="animate-ping" />
                      <circle cx="0" cy="0" r="3" fill="#ffffff" />
                      <text
                        x="6"
                        y="3"
                        fill="#fee2e2"
                        fontSize="6.5"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        RoS: {proj.forwardRateOfSpreadKmH} km/h
                      </text>
                    </g>
                  </g>
                );
              })}
            </g>
          )}

          {/* Active Incidents Flame Markers */}
          {layers.incidents && (
            <g id="layer-incidents">
              {incidents.map((inc) => {
                const pt = geoToSvg(inc.coordinates.lat, inc.coordinates.lng);
                const isSelected = selectedIncident?.id === inc.id;

                return (
                  <g
                    key={inc.id}
                    onClick={() => onSelectIncident(inc)}
                    className="cursor-pointer group"
                  >
                    {/* Pulsing Radiation Halo */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isSelected ? 26 : 20}
                      fill="url(#fireGlow)"
                      className="animate-pulse"
                    />

                    {/* Outer Selection Ring */}
                    {isSelected && (
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="22"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                        strokeDasharray="4 2"
                      />
                    )}

                    {/* Central High-Intensity Flame Pin */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="9"
                      fill={getRiskColor(inc.riskLevel)}
                      stroke="#ffffff"
                      strokeWidth="2"
                    />

                    <Flame className="w-4 h-4 text-white" />

                    {/* Ground Confirmed Incident Code Badge */}
                    <g transform={`translate(${pt.x + 12}, ${pt.y - 14})`}>
                      <rect
                        x="0"
                        y="-8"
                        width="88"
                        height="24"
                        rx="4"
                        fill="rgba(15, 23, 42, 0.94)"
                        stroke={getRiskColor(inc.riskLevel)}
                        strokeWidth="1.2"
                      />
                      <text
                        x="44"
                        y="2"
                        fill="#ffffff"
                        fontSize="7"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {inc.code.replace('INCIDENT #', '')}
                      </text>
                      <text
                        x="44"
                        y="11"
                        fill="#4ade80"
                        fontSize="5.5"
                        fontWeight="black"
                        textAnchor="middle"
                      >
                        {currentLang === 'ar' ? '✓ مؤكد ميدانياً' : '✓ GROUND CONFIRMED'}
                      </text>
                    </g>
                  </g>
                );
              })}
            </g>
          )}

          {/* NASA FIRMS Live Satellite Detections Layer (VIIRS 375m & MODIS) */}
          {layers.nasaFirms && (
            <g id="layer-nasa-firms-satellite">
              {activeFirmsHotspots.map((hotspot, idx) => {
                const pt = geoToSvg(hotspot.latitude, hotspot.longitude);
                const isSelected = selectedFirmsHotspot?.id === hotspot.id || selectedIncident?.id === `SAT-FIRMS-${hotspot.id}`;

                return (
                  <g
                    key={`firms-${hotspot.id}-${idx}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFirmsHotspot(hotspot);
                      const incList = transformFirmsToIncidents([hotspot]);
                      if (incList.length > 0) {
                        onSelectIncident(incList[0]);
                      }
                      onSelectFirmsDetection?.(hotspot);
                    }}
                    className="cursor-pointer group"
                  >
                    {/* Pulsing Satellite Anomaly Halo */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isSelected ? 30 : 22}
                      fill="url(#firmsThermalGlow)"
                      className="animate-pulse"
                    />

                    {/* Orbit Radar Scan Concentric Reticle */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="16"
                      fill="none"
                      stroke="#c084fc"
                      strokeWidth="1.2"
                      strokeDasharray="4 3"
                      opacity="0.85"
                    />

                    {/* Tactical Satellite Crosshair Lines */}
                    <line
                      x1={pt.x - 18}
                      y1={pt.y}
                      x2={pt.x + 18}
                      y2={pt.y}
                      stroke="#e879f9"
                      strokeWidth="0.8"
                      strokeDasharray="2 2"
                      opacity="0.75"
                    />
                    <line
                      x1={pt.x}
                      y1={pt.y - 18}
                      x2={pt.x}
                      y2={pt.y + 18}
                      stroke="#e879f9"
                      strokeWidth="0.8"
                      strokeDasharray="2 2"
                      opacity="0.75"
                    />

                    {/* Selection Ring */}
                    {isSelected && (
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="22"
                        fill="none"
                        stroke="#f0abfc"
                        strokeWidth="2"
                        strokeDasharray="3 2"
                      />
                    )}

                    {/* Diamond Satellite Pin - Distinctive shape from circular ground flame pin */}
                    <rect
                      x={pt.x - 7.5}
                      y={pt.y - 7.5}
                      width="15"
                      height="15"
                      transform={`rotate(45, ${pt.x}, ${pt.y})`}
                      fill="#86198f"
                      stroke="#f472b6"
                      strokeWidth="1.6"
                      className="transition-transform group-hover:scale-110"
                    />

                    {/* Center High-Thermal Dot */}
                    <circle cx={pt.x} cy={pt.y} r="3" fill="#ffffff" />

                    {/* Satellite Callout & Telemetry Tag */}
                    <g transform={`translate(${pt.x + 14}, ${pt.y - 18})`}>
                      <rect
                        x="0"
                        y="-10"
                        width="112"
                        height="26"
                        rx="4"
                        fill="rgba(15, 23, 42, 0.94)"
                        stroke="#c084fc"
                        strokeWidth="1.2"
                      />
                      {/* Sensor & Pass Time */}
                      <text
                        x="6"
                        y="-1"
                        fill="#e9d5ff"
                        fontSize="6.5"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        🛰️ {hotspot.satellite} • {hotspot.acqTime}
                      </text>
                      {/* Unconfirmed Warning & FRP */}
                      <text
                        x="6"
                        y="10"
                        fill="#f0abfc"
                        fontSize="6"
                        fontWeight="bold"
                      >
                        {currentLang === 'ar' ? '⚠️ رصد فضائي غير مؤكد' : '⚠️ SAT UNCONFIRMED'} • {hotspot.frpMw}MW
                      </text>
                    </g>
                  </g>
                );
              })}
            </g>
          )}

          {/* Active Incident Zones (Spatial Clusters of Satellite Detections) Layer */}
          {layers.firmsClusters && activeIncidentZones.length > 0 && (
            <g id="layer-firms-active-incident-zones">
              {activeIncidentZones.map((zone) => {
                const centroidSvg = geoToSvg(zone.centroid.lat, zone.centroid.lng);
                const isSelected = selectedClusterZone?.id === zone.id;

                // Enclosure polygon points from convex hull
                const hullSvgPoints = zone.hullCoordinates.map((pt) => geoToSvg(pt.lat, pt.lng));
                const polygonPointsStr = hullSvgPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

                const riskBorderColor = zone.isPromoted
                  ? '#10b981'
                  : zone.riskLevel === 'critical'
                  ? '#ef4444'
                  : zone.riskLevel === 'extreme'
                  ? '#f97316'
                  : '#e11d48';

                return (
                  <g
                    key={`aiz-${zone.id}`}
                    className="cursor-pointer group"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedClusterZone(zone);
                      setShowClusterInspector(true);
                      if (zone.isPromoted && zone.promotedIncidentId) {
                        const matched = incidents.find((i) => i.id === zone.promotedIncidentId);
                        if (matched) onSelectIncident(matched);
                      }
                    }}
                  >
                    {/* Spatial Envelope Convex Hull Polygon */}
                    {polygonPointsStr && (
                      <g>
                        {/* Shaded Area Fill */}
                        <polygon
                          points={polygonPointsStr}
                          fill={zone.isPromoted ? 'rgba(16, 185, 129, 0.12)' : 'url(#clusterEnclosureGrad)'}
                          className="transition-all duration-300 group-hover:opacity-90"
                        />
                        {/* High-Tech Tactical Hatching */}
                        <polygon
                          points={polygonPointsStr}
                          fill="url(#clusterHatchPattern)"
                        />
                        {/* Outer Cluster Boundary Line */}
                        <polygon
                          points={polygonPointsStr}
                          fill="none"
                          stroke={riskBorderColor}
                          strokeWidth={isSelected ? 2.8 : 1.8}
                          strokeDasharray={zone.isPromoted ? 'none' : '6 4'}
                          opacity={isSelected ? 0.95 : 0.75}
                          className={zone.isPromoted ? '' : 'animate-pulse'}
                        />
                      </g>
                    )}

                    {/* Spider Connection Lines from Cluster Centroid to Each Member Hotspot */}
                    {zone.hotspots.map((hotspot) => {
                      const hSvg = geoToSvg(hotspot.latitude, hotspot.longitude);
                      return (
                        <g key={`spider-${zone.id}-${hotspot.id}`}>
                          <line
                            x1={centroidSvg.x}
                            y1={centroidSvg.y}
                            x2={hSvg.x}
                            y2={hSvg.y}
                            stroke={riskBorderColor}
                            strokeWidth="1.2"
                            strokeDasharray="3 3"
                            opacity="0.65"
                          />
                          <circle cx={hSvg.x} cy={hSvg.y} r="2.5" fill={riskBorderColor} opacity="0.85" />
                        </g>
                      );
                    })}

                    {/* Centroid Tactical Hub Pin & Badge */}
                    <g transform={`translate(${centroidSvg.x}, ${centroidSvg.y})`}>
                      {/* Pulsing Core Radar Halo */}
                      <circle
                        cx="0"
                        cy="0"
                        r={isSelected ? 30 : 22}
                        fill={zone.isPromoted ? 'url(#clusterPromotedHalo)' : 'url(#clusterCoreHalo)'}
                        className="animate-pulse"
                      />

                      {/* Tactical Rotating Ring when selected */}
                      {isSelected && (
                        <circle
                          cx="0"
                          cy="0"
                          r="25"
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                          strokeDasharray="4 3"
                          className="animate-spin"
                          style={{ transformOrigin: '0 0', animationDuration: '9s' }}
                        />
                      )}

                      {/* Tactical Hexagonal Enclosure */}
                      <polygon
                        points={getHexagonPoints(0, 0, 16)}
                        fill="rgba(10, 15, 30, 0.95)"
                        stroke={riskBorderColor}
                        strokeWidth={isSelected ? 2.5 : 1.8}
                        className="transition-transform group-hover:scale-110"
                      />

                      {/* Hotspot Count Inside Hexagon Pin */}
                      <text
                        x="0"
                        y="4"
                        fill="#ffffff"
                        fontSize="9"
                        fontWeight="900"
                        fontFamily="monospace"
                        textAnchor="middle"
                      >
                        {zone.hotspotCount}
                      </text>

                      {/* Satellite Cluster Callout Banner */}
                      <g transform="translate(18, -14)">
                        <rect
                          x="0"
                          y="-10"
                          width="126"
                          height="27"
                          rx="4"
                          fill="rgba(15, 23, 42, 0.95)"
                          stroke={riskBorderColor}
                          strokeWidth="1"
                        />
                        <text
                          x="6"
                          y="1"
                          fill="#f1f5f9"
                          fontSize="7"
                          fontWeight="bold"
                        >
                          {zone.clusterCode} • {zone.totalFrpMw} MW
                        </text>
                        <text
                          x="6"
                          y="11"
                          fill={zone.isPromoted ? '#34d399' : '#fb7185'}
                          fontSize="6.2"
                          fontWeight="bold"
                          fontFamily="monospace"
                        >
                          {zone.isPromoted
                            ? (currentLang === 'ar' ? '✓ مراقب رسمياً' : '✓ MONITORED')
                            : (currentLang === 'ar' ? '⚡ اضغط للترقية' : '⚡ CLICK TO PROMOTE')}
                        </text>
                      </g>
                    </g>
                  </g>
                );
              })}
            </g>
          )}

          {/* Tactical Airborne Drone Reconnaissance & Dual Camera (Thermal/RGB) Feed Layer */}
          {layers.drones && activeDroneMission.isLayerVisibleOnMap && dronePatrolIncident && (() => {
            const firePt = geoToSvg(dronePatrolIncident.coordinates.lat, dronePatrolIncident.coordinates.lng);
            const headingRad = (((activeDroneMission.headingDegrees ?? 42) - 90) * Math.PI) / 180;
            const orbitR = 54;
            const dronePt = {
              x: firePt.x + Math.cos(headingRad) * orbitR,
              y: firePt.y + Math.sin(headingRad) * orbitR
            };
            const dropPt = activeDroneMission.assessment?.recommendedDropPoint
              ? geoToSvg(activeDroneMission.assessment.recommendedDropPoint.lat, activeDroneMission.assessment.recommendedDropPoint.lng)
              : { x: firePt.x + 16, y: firePt.y - 12 };

            const isThermal = activeDroneMission.cameraMode === 'thermal';

            return (
              <g 
                id="drone-recon-tactical-overlay" 
                className="cursor-pointer" 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDroneHUD(true);
                  onOpenDroneSimulation?.(dronePatrolIncident);
                }}
              >
                {/* 1. Camera FOV Sensor Projection Beam */}
                <polygon
                  points={`${dronePt.x},${dronePt.y} ${firePt.x - 38},${firePt.y - 26} ${firePt.x + 38},${firePt.y + 26}`}
                  fill="url(#droneCameraBeam)"
                  opacity="0.5"
                  className="transition-all duration-300"
                />

                {/* 2. Drone Orbit Patrol Perimeter */}
                <circle
                  cx={firePt.x}
                  cy={firePt.y}
                  r={orbitR}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="1.2"
                  strokeDasharray="4 3"
                  opacity="0.65"
                />

                {/* 3. Real-Time Camera Feed Ground Footprint Layer */}
                {isThermal ? (
                  /* --- THERMAL (FLIR) GROUND LAYER --- */
                  <g id="drone-flir-thermal-feed">
                    {/* Thermal Radiation Heat Footprint */}
                    <ellipse
                      cx={firePt.x}
                      cy={firePt.y}
                      rx="48"
                      ry="34"
                      fill="url(#droneThermalIronbow)"
                      className="animate-pulse"
                      opacity="0.9"
                    />

                    {/* High-Temperature Isotherm Boundary Contour */}
                    <ellipse
                      cx={firePt.x}
                      cy={firePt.y}
                      rx="38"
                      ry="26"
                      fill="none"
                      stroke="#f43f5e"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                      opacity="0.8"
                    />

                    {/* High-Temp Core Radiative Spot */}
                    <circle
                      cx={firePt.x}
                      cy={firePt.y}
                      r="9"
                      fill="#ffffff"
                      opacity="0.9"
                    />

                    {/* Water Drop Target Reticle (Canadair Air Support Guidance) */}
                    <g transform={`translate(${dropPt.x}, ${dropPt.y})`}>
                      <circle cx="0" cy="0" r="14" fill="none" stroke="#06b6d4" strokeWidth="1.6" strokeDasharray="3 2" className="animate-spin" style={{ transformOrigin: '0 0' }} />
                      <circle cx="0" cy="0" r="3" fill="#06b6d4" />
                      <line x1="-18" y1="0" x2="18" y2="0" stroke="#06b6d4" strokeWidth="1" />
                      <line x1="0" y1="-18" x2="0" y2="18" stroke="#06b6d4" strokeWidth="1" />
                      <rect x="-38" y="16" width="76" height="13" rx="3" fill="rgba(6, 182, 212, 0.95)" />
                      <text x="0" y="25.5" fill="#082f49" fontSize="6.5" fontWeight="900" textAnchor="middle">
                        💧 CANADAIR TARGET
                      </text>
                    </g>

                    {/* Thermal Hotspot Temperature Badges on Map */}
                    <g transform={`translate(${firePt.x + 8}, ${firePt.y - 34})`}>
                      <rect x="0" y="-12" width="88" height="15" rx="3.5" fill="rgba(15, 23, 42, 0.95)" stroke="#ef4444" strokeWidth="1.2" />
                      <text x="44" y="-2" fill="#fca5a5" fontSize="7" fontWeight="bold" textAnchor="middle">
                        🔥 {droneAssessment.maxHotspotTempC}°C MAX CORE
                      </text>
                    </g>

                    {/* Tactical Legend Stamp */}
                    <g transform={`translate(${firePt.x - 52}, ${firePt.y + 42})`}>
                      <rect x="0" y="-10" width="104" height="14" rx="3" fill="rgba(15, 23, 42, 0.9)" stroke="#10b981" strokeWidth="0.8" />
                      <text x="52" y="-1" fill="#34d399" fontSize="6.5" fontWeight="bold" textAnchor="middle">
                        FLIR THERMAL • FRP {droneAssessment.fireRadiativePowerMw} MW
                      </text>
                    </g>
                  </g>
                ) : (
                  /* --- OPTICAL RGB GROUND LAYER --- */
                  <g id="drone-optical-rgb-feed">
                    {/* Natural Forest Canopy Ground Footprint */}
                    <ellipse
                      cx={firePt.x}
                      cy={firePt.y}
                      rx="48"
                      ry="34"
                      fill="url(#droneRgbCanopy)"
                      opacity="0.88"
                    />

                    {/* Scorched Carbon Ash Scar Behind the Front */}
                    <ellipse
                      cx={firePt.x - 14}
                      cy={firePt.y + 6}
                      rx="26"
                      ry="16"
                      fill="#18181b"
                      opacity="0.85"
                    />

                    {/* Billowing Smoke Plume Vector drifting in wind */}
                    <path
                      d={`M ${firePt.x - 10} ${firePt.y - 8} Q ${firePt.x + 25} ${firePt.y - 35} ${firePt.x + 65} ${firePt.y - 50} Q ${firePt.x + 40} ${firePt.y - 15} ${firePt.x + 10} ${firePt.y + 8} Z`}
                      fill="url(#droneSmokePlume)"
                    />

                    {/* Glowing Active Flame Perimeter Line */}
                    <path
                      d={`M ${firePt.x - 24} ${firePt.y + 12} Q ${firePt.x} ${firePt.y - 6} ${firePt.x + 28} ${firePt.y - 18}`}
                      fill="none"
                      stroke="#f97316"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      className="animate-pulse"
                    />

                    {/* Optical Feed Legend Stamp */}
                    <g transform={`translate(${firePt.x - 48}, ${firePt.y + 42})`}>
                      <rect x="0" y="-10" width="96" height="14" rx="3" fill="rgba(15, 23, 42, 0.9)" stroke="#10b981" strokeWidth="0.8" />
                      <text x="48" y="-1" fill="#38bdf8" fontSize="6.5" fontWeight="bold" textAnchor="middle">
                        OPTICAL RGB • DE-HAZE ACTIVE
                      </text>
                    </g>
                  </g>
                )}

                {/* 4. Active UAV Aircraft Icon in Orbit */}
                <g transform={`translate(${dronePt.x}, ${dronePt.y}) rotate(${activeDroneMission.headingDegrees})`}>
                  {/* Rotor Thruster Wake Waves */}
                  <circle cx="0" cy="0" r="14" fill="none" stroke="#10b981" strokeWidth="0.8" opacity="0.4" />
                  
                  {/* Drone Airframe Graphic */}
                  <path
                    d="M 0 -9 L 7 6 L 0 3 L -7 6 Z"
                    fill="#10b981"
                    stroke="#ffffff"
                    strokeWidth="1.2"
                  />
                  {/* Quad-Rotor Arms */}
                  <line x1="-8" y1="-8" x2="8" y2="8" stroke="#10b981" strokeWidth="1.5" />
                  <line x1="-8" y1="8" x2="8" y2="-8" stroke="#10b981" strokeWidth="1.5" />
                  <circle cx="-8" cy="-8" r="2.2" fill="#34d399" />
                  <circle cx="8" cy="8" r="2.2" fill="#34d399" />
                  <circle cx="-8" cy="8" r="2.2" fill="#34d399" />
                  <circle cx="8" cy="-8" r="2.2" fill="#34d399" />
                  <circle cx="0" cy="0" r="2" fill="#ffffff" />
                </g>

                {/* Drone Callout Tag */}
                <g transform={`translate(${dronePt.x}, ${dronePt.y - 15})`}>
                  <rect x="-30" y="-11" width="60" height="13" rx="3" fill="rgba(15, 23, 42, 0.95)" stroke="#10b981" strokeWidth="1" />
                  <text x="0" y="-2" fill="#10b981" fontSize="6.5" fontWeight="black" textAnchor="middle">
                    DZ-04 ({activeDroneMission.altitudeMeters}m)
                  </text>
                </g>
              </g>
            );
          })()}

          {/* Real-Time User Device GPS Position Beacon & Tactical Vector Line */}
          {userPosition && (
            <g id="layer-live-user-gps" className="transition-all duration-500">
              {(() => {
                const userPt = geoToSvg(userPosition.lat, userPosition.lng);
                const selectedIncPt = selectedIncident 
                  ? geoToSvg(selectedIncident.coordinates.lat, selectedIncident.coordinates.lng) 
                  : null;
                const distanceToIncident = selectedIncident 
                  ? computeDistanceKm(userPosition, selectedIncident.coordinates) 
                  : null;

                return (
                  <>
                    {/* Tactical Vector Line to Selected Incident */}
                    {selectedIncPt && distanceToIncident !== null && (
                      <g id="vector-user-to-fire">
                        <line
                          x1={userPt.x}
                          y1={userPt.y}
                          x2={selectedIncPt.x}
                          y2={selectedIncPt.y}
                          stroke="#38bdf8"
                          strokeWidth="2"
                          strokeDasharray="6 4"
                          strokeOpacity="0.85"
                        />
                        {/* Midpoint Distance Badge */}
                        <g transform={`translate(${(userPt.x + selectedIncPt.x) / 2}, ${(userPt.y + selectedIncPt.y) / 2})`}>
                          <rect
                            x="-38"
                            y="-10"
                            width="76"
                            height="20"
                            rx="10"
                            fill="#0f172a"
                            stroke="#38bdf8"
                            strokeWidth="1.5"
                          />
                          <text
                            x="0"
                            y="3.5"
                            fill="#38bdf8"
                            fontSize="8"
                            fontWeight="bold"
                            textAnchor="middle"
                            fontFamily="monospace"
                          >
                            {distanceToIncident} km
                          </text>
                        </g>
                      </g>
                    )}

                    {/* GPS Accuracy Radius Circle */}
                    <circle
                      cx={userPt.x}
                      cy={userPt.y}
                      r={Math.min(45, Math.max(16, userPosition.accuracyMeters / 5))}
                      fill="rgba(56, 189, 248, 0.08)"
                      stroke="#38bdf8"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />

                    {/* Animated Radar Ping */}
                    <circle
                      cx={userPt.x}
                      cy={userPt.y}
                      r="22"
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="1.5"
                      className="animate-ping"
                      style={{ transformOrigin: `${userPt.x}px ${userPt.y}px` }}
                    />

                    {/* Outer Glow Halo */}
                    <circle
                      cx={userPt.x}
                      cy={userPt.y}
                      r="12"
                      fill="#0284c7"
                      fillOpacity="0.4"
                    />

                    {/* Central High-Intensity GPS Pin */}
                    <circle
                      cx={userPt.x}
                      cy={userPt.y}
                      r="6.5"
                      fill="#38bdf8"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                    <circle
                      cx={userPt.x}
                      cy={userPt.y}
                      r="2.5"
                      fill="#0369a1"
                    />

                    {/* Live GPS Identifier Tag */}
                    <g transform={`translate(${userPt.x}, ${userPt.y - 16})`}>
                      <rect
                        x="-52"
                        y="-14"
                        width="104"
                        height="18"
                        rx="5"
                        fill="rgba(15, 23, 42, 0.95)"
                        stroke="#38bdf8"
                        strokeWidth="1.2"
                      />
                      <text
                        x="0"
                        y="-2"
                        fill="#38bdf8"
                        fontSize="7.5"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {currentLang === 'ar' ? '📍 موقعك الفعلي (Live GPS)' : '📍 My Location (Live GPS)'}
                      </text>
                    </g>
                  </>
                );
              })()}
            </g>
          )}

          {/* 14. Rothermel Physical Fire Front Simulation Layer (Isochrones & DEM Velocity Vectors) */}
          {layers.physicalFireFront && fireFrontSimulation && (
            <DynamicFireFrontLayer
              simulation={fireFrontSimulation}
              geoToSvg={geoToSvg}
              showVectors={showFireFrontVectors}
              showIsochrones={showFireFrontIsochrones}
              showDemBadges={showFireFrontDemBadges}
              activeTimeMinutes={fireFrontTimeMinutes}
              selectedVertex={selectedFireFrontVertex}
              onSelectVertex={setSelectedFireFrontVertex}
              currentLang={currentLang}
            />
          )}

          {/* 14b. Fire Front Dynamics Vector Layer (Active Expansion Edge Polyline & Historical Wind/Terrain Trails) */}
          {layers.fireFrontDynamics && fireFrontDynamicsResult && (
            <FireFrontDynamicsLayer
              dynamics={fireFrontDynamicsResult}
              geoToSvg={geoToSvg}
              showActiveFront={true}
              showHistoricalTrails={showDynamicsHistoricalTrails}
              showExpansionVectors={showDynamicsVectors}
              showVertexNodes={showDynamicsVertexNodes}
              selectedVertexId={selectedDynamicsVertex?.id || null}
              onSelectVertex={setSelectedDynamicsVertex}
              currentLang={currentLang}
            />
          )}

          {/* 15. Smart Evacuation Routing & Road Network Layer */}
          {layers.evacuationPlanner && evacuationPlan && (
            <EvacuationRoutesLayer
              geoToSvg={geoToSvg}
              routes={evacuationPlan.settlementRoutes}
              selectedRouteId={activeEvacRoute?.id || null}
              onSelectRoute={setSelectedEvacRoute}
              selectedSettlementId={selectedEvacSettlement.id}
              onSelectSettlement={(s) => {
                handleGenerateOrRecalculateRoute(s);
              }}
              fireCenter={evacuationPlan.activeFireCenter}
              smokePlumeCone={evacuationPlan.smokePlumeCone}
              showRoadNetwork={showEvacRoadNetwork}
              showSmokeCone={showEvacSmokeCone}
              showShelters={showEvacShelters}
              currentLang={currentLang}
              isTemporaryDynamicActive={isTemporaryDynamicActive}
              temporaryCountdownSeconds={temporaryCountdownSeconds}
              onExtendTemporary={handleExtendTemporary}
              onPinPermanent={handlePinPermanent}
            />
          )}

          {/* 16. Algerian Space Agency (ASAL) ALSAT Fleet Overlay (Orbital Tracks, Swath Corridors, NDVI Footprints) */}
          {layers.alsatFleet && (
            <AlsatFleetOverlay
              positions={alsatPositions}
              tracks={alsatTracks}
              passes={alsatPasses}
              selectedSatellite={selectedAlsatSatellite}
              selectedPassId={selectedAlsatPass?.id || null}
              showTracks={showAlsatOrbitalTracks}
              showSwaths={showAlsatSwathCorridors}
              showFootprints={showAlsatNdviFootprints}
              geoToSvg={geoToSvg}
              onSelectSatellite={(satId) => {
                setSelectedAlsatSatellite(satId);
                setShowAlsatHUD(true);
              }}
              onSelectPass={(pass) => {
                setSelectedAlsatPass(pass);
                setShowAlsatHUD(true);
              }}
              currentLang={currentLang}
            />
          )}
        </g>
      </svg>

      {/* --------------------------------------------------------------------------------- */}
      {/* Algerian Space Agency (ASAL) ALSAT Fleet Leaflet/MapLibre Marker Popup Pane       */}
      {/* Explicitly rendered in 'leaflet-pane leaflet-popup-pane' at z-index: 9999        */}
      {/* --------------------------------------------------------------------------------- */}
      {layers.alsatFleet && ((selectedAlsatSatellite !== 'ALL' && alsatPositions[selectedAlsatSatellite]) || selectedAlsatPass) && (() => {
        let popupLat = 36.7;
        let popupLng = 3.2;
        let satName: AlsatSatelliteId = 'ALSAT-1B';
        let isOverAlgeria = false;
        let altitude = 680;
        let velocity = 7.5;
        let swath = 140;

        if (selectedAlsatPass) {
          popupLat = (selectedAlsatPass.bounds.minLat + selectedAlsatPass.bounds.maxLat) / 2;
          popupLng = (selectedAlsatPass.bounds.minLng + selectedAlsatPass.bounds.maxLng) / 2;
          satName = selectedAlsatPass.satelliteId;
          const pos = alsatPositions[satName];
          if (pos) {
            isOverAlgeria = pos.isOverAlgeria;
            altitude = pos.altitudeKm;
            velocity = pos.velocityKmS || 7.5;
            swath = pos.groundFootprintRadiusKm ? Math.round(pos.groundFootprintRadiusKm * 0.45) : 140;
          }
        } else if (selectedAlsatSatellite !== 'ALL') {
          satName = selectedAlsatSatellite;
          const pos = alsatPositions[satName];
          if (pos) {
            popupLat = Number(pos.subSatellitePoint?.lat ?? pos.latitude);
            popupLng = Number(pos.subSatellitePoint?.lng ?? pos.longitude);
            isOverAlgeria = pos.isOverAlgeria;
            altitude = pos.altitudeKm;
            velocity = pos.velocityKmS || 7.5;
            swath = pos.groundFootprintRadiusKm ? Math.round(pos.groundFootprintRadiusKm * 0.45) : 140;
          }
        }

        const rawPt = geoToSvg(popupLat, popupLng);
        const screenX = rawPt.x * zoom + pan.x;
        const screenY = rawPt.y * zoom + pan.y;

        return (
          <div 
            id="alsat-leaflet-popup-pane"
            className="leaflet-pane leaflet-popup-pane pointer-events-none absolute inset-0 z-[9999]"
            style={{ zIndex: 9999 }}
          >
            <div
              className="leaflet-popup pointer-events-auto absolute transition-all duration-150 animate-in fade-in zoom-in-95"
              style={{
                left: `${screenX}px`,
                top: `${screenY - 14}px`,
                transform: 'translate(-50%, -100%)',
                zIndex: 9999
              }}
            >
              <div className="relative">
                <SatelliteStreamCard
                  satelliteId={satName}
                  position={alsatPositions[satName]}
                  pass={selectedAlsatPass}
                  isOverAlgeria={isOverAlgeria}
                  currentLang={currentLang}
                  onOpenHud={() => {
                    setShowAlsatHUD(true);
                  }}
                  onCenter={() => {
                    setZoom(2.4);
                    setPan({ x: 500 - rawPt.x * 2.4, y: 325 - rawPt.y * 2.4 });
                  }}
                  onClose={() => {
                    setSelectedAlsatSatellite('ALL');
                    setSelectedAlsatPass(null);
                    setShowAlsatHUD(false);
                    window.dispatchEvent(new Event('resize'));
                    const container = document.getElementById('gis-map-container');
                    if (container) {
                      container.style.pointerEvents = 'auto';
                      container.style.filter = 'none';
                    }
                  }}
                />

                {/* Leaflet Popup Tip (Anchor Arrow pointing to satellite marker) */}
                <div 
                  className="leaflet-popup-tip-container absolute left-1/2 -bottom-2 -translate-x-1/2 w-4 h-2 overflow-hidden pointer-events-none"
                >
                  <div className="w-2.5 h-2.5 bg-slate-900 border-r border-b border-emerald-500/70 transform rotate-45 mx-auto -translate-y-1.5 shadow-md" />
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Floating On-Map Tactical Drone HUD Card (Bottom-Left) */}
      {layers.drones && activeDroneMission.isLayerVisibleOnMap && dronePatrolIncident && (
        <div className="absolute bottom-6 left-4 z-30 flex items-center gap-3 bg-slate-950/90 backdrop-blur-md border border-slate-700/90 rounded-xl p-2 px-3 shadow-2xl text-xs">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-100">{activeDroneMission.droneId}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[10px] text-emerald-400 font-mono">LIVE FEED</span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
                <span>ALT: {activeDroneMission.altitudeMeters}m</span>
                <span>•</span>
                <span className={activeDroneMission.cameraMode === 'thermal' ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                  {activeDroneMission.cameraMode === 'thermal' ? `🔥 ${droneAssessment.maxHotspotTempC}°C MAX` : '🌲 OPTICAL DE-HAZE'}
                </span>
              </div>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-800" />

          {/* Quick Mode Toggle on Map */}
          <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => updateDroneMissionHandler({ cameraMode: 'thermal' })}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 ${
                activeDroneMission.cameraMode === 'thermal'
                  ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Flame className="w-3 h-3 text-amber-300" />
              <span>Thermal</span>
            </button>
            <button
              onClick={() => updateDroneMissionHandler({ cameraMode: 'rgb' })}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 ${
                activeDroneMission.cameraMode === 'rgb'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eye className="w-3 h-3 text-emerald-300" />
              <span>RGB</span>
            </button>
          </div>

          <button
            onClick={() => onOpenDroneSimulation?.(dronePatrolIncident)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition shadow cursor-pointer ml-1"
          >
            <span>{currentLang === 'ar' ? 'القمرة كاملة' : 'Full Cockpit'}</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Floating NASA FIRMS Satellite Hotspot Telemetry Card */}
      {selectedFirmsHotspot && layers.nasaFirms && (
        <div className="absolute top-16 left-4 z-30 w-80 bg-slate-950/95 backdrop-blur-xl border border-purple-500/60 rounded-xl p-3 shadow-2xl text-xs space-y-2.5 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between border-b border-purple-900/50 pb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-purple-950 border border-purple-500/50 flex items-center justify-center text-purple-300">
                <Satellite className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <div className="font-bold text-slate-100 flex items-center gap-1.5">
                  <span>{selectedFirmsHotspot.satellite}</span>
                  <span className="px-1.5 py-0.2 text-[9px] rounded bg-purple-900/80 text-purple-200 border border-purple-500/40 font-mono">
                    {selectedFirmsHotspot.instrument} 375m
                  </span>
                </div>
                <div className="text-[10px] text-purple-300/80 font-mono">
                  {selectedFirmsHotspot.acqDate} • {selectedFirmsHotspot.acqTime} UTC
                </div>
              </div>
            </div>
            <button
              onClick={() => setSelectedFirmsHotspot(null)}
              className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Distinction Warning Banner */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-200 text-[11px]">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="leading-tight">
              {currentLang === 'ar'
                ? 'رصد حراري فضائي — غير مؤكد ميدانياً حتى الآن من فرق الحماية أو الغابات'
                : 'Satellite thermal anomaly — Pending ground/drone tactical confirmation'}
            </span>
          </div>

          {/* Telemetry Grid */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2">
              <span className="text-[10px] text-slate-400 block">Fire Radiative Power (FRP)</span>
              <span className="font-mono font-bold text-purple-300 text-sm">
                {selectedFirmsHotspot.frpMw} MW
              </span>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2">
              <span className="text-[10px] text-slate-400 block">Brightness Temp</span>
              <span className="font-mono font-bold text-amber-300 text-sm">
                {Math.round(selectedFirmsHotspot.brightnessTempKelvin - 273.15)}°C
              </span>
              <span className="text-[9px] text-slate-500 font-mono ml-1">({selectedFirmsHotspot.brightnessTempKelvin}K)</span>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2">
              <span className="text-[10px] text-slate-400 block">Sensor Confidence</span>
              <span className="font-mono font-bold text-emerald-400">
                {selectedFirmsHotspot.confidencePercent}% ({selectedFirmsHotspot.confidence})
              </span>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2">
              <span className="text-[10px] text-slate-400 block">Coordinates</span>
              <span className="font-mono text-slate-300 text-[10px]">
                {selectedFirmsHotspot.latitude.toFixed(3)}°N, {selectedFirmsHotspot.longitude.toFixed(3)}°E
              </span>
            </div>
          </div>

          {/* Action to dispatch Drone Recon to verify */}
          <div className="pt-1 flex gap-2">
            <button
              onClick={() => {
                const inc = transformFirmsToIncidents([selectedFirmsHotspot])[0];
                updateDroneMissionHandler({
                  activeIncidentId: inc.id,
                  flightPattern: 'orbit',
                  isLayerVisibleOnMap: true
                });
                onOpenDroneSimulation?.(inc);
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-600 hover:to-indigo-500 text-white font-bold text-[11px] shadow-lg cursor-pointer transition"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{currentLang === 'ar' ? 'إرسال درون DZ-04 للتحقق' : 'Dispatch Drone DZ-04'}</span>
            </button>
            <button
              onClick={() => {
                const inc = transformFirmsToIncidents([selectedFirmsHotspot])[0];
                onSelectIncident(inc);
              }}
              className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-[11px] border border-slate-700 cursor-pointer transition"
            >
              {currentLang === 'ar' ? 'البلاغ الكامل' : 'Full Report'}
            </button>
          </div>

          {/* Hotspot Card Manual Force Update */}
          <div className="pt-1.5 border-t border-purple-900/40 flex items-center justify-between text-[10px] text-slate-400">
            <span className="font-mono flex items-center gap-1">
              <Clock className="w-2.5 h-2.5 text-purple-400" />
              <span>{currentLang === 'ar' ? `آخر تحديث: منذ ${secondsSinceSync}ثا` : `Synced ${secondsSinceSync}s ago`}</span>
            </span>
            <button
              id="btn-hotspot-card-force-firms"
              onClick={handleForceRefreshFirms}
              disabled={effectiveIsLoading}
              className="flex items-center gap-1 text-purple-300 hover:text-white font-medium cursor-pointer transition disabled:opacity-50"
              title={t.firmsAutoPollInfo}
            >
              <RefreshCw className={`w-2.5 h-2.5 ${effectiveIsLoading ? 'animate-spin text-purple-400' : ''}`} />
              <span>{effectiveIsLoading ? (t.firmsUpdating || 'Syncing...') : (currentLang === 'ar' ? 'تحديث فضائي فوري' : 'Force Refresh')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Floating Active Incident Zone (Spatial Cluster) Inspector Card */}
      {selectedClusterZone && layers.firmsClusters && showClusterInspector && (
        <div 
          id="cluster-inspector-card"
          className="absolute top-16 left-4 z-50 w-92 max-w-[calc(100vw-2rem)] bg-slate-950/95 backdrop-blur-xl border border-rose-500/70 rounded-xl p-3.5 shadow-2xl text-xs space-y-3 animate-in fade-in slide-in-from-top-2"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-rose-900/60 pb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-rose-950/90 border border-rose-500/60 flex items-center justify-center text-rose-300">
                <Radio className="w-4 h-4 animate-pulse text-rose-400" />
              </div>
              <div>
                <div className="font-bold text-slate-100 flex items-center gap-1.5">
                  <span>{selectedClusterZone.clusterCode}</span>
                  <span className={`px-1.5 py-0.2 text-[9px] rounded font-bold uppercase font-mono ${
                    selectedClusterZone.isPromoted 
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50' 
                      : 'bg-rose-950 text-rose-200 border border-rose-500/40'
                  }`}>
                    {selectedClusterZone.isPromoted 
                      ? (currentLang === 'ar' ? 'مراقب رسمياً' : 'MONITORED') 
                      : (currentLang === 'ar' ? 'تجمع غير مراقب' : 'UNPROMOTED')}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {currentLang === 'ar' ? selectedClusterZone.nameAr : selectedClusterZone.name}
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowClusterInspector(false)}
              className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Promotion Status / Callout */}
          {selectedClusterZone.isPromoted ? (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-[11px]">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="leading-tight">
                <span className="font-bold">{t.clusterPromotedBadge || (currentLang === 'ar' ? 'تمت ترقية التجمع إلى حادث مراقب' : 'Promoted to Monitored Incident')}</span>
                <span className="block text-[10px] text-emerald-300/80 font-mono">
                  ID: {selectedClusterZone.promotedIncidentId}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-rose-950/30 border border-rose-500/40 text-rose-200 text-[11px]">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <div className="leading-tight">
                <span className="font-bold">
                  {currentLang === 'ar' 
                    ? `تجمع مكاني لـ ${selectedClusterZone.hotspotCount} بؤر شواذ حرارية فضائية` 
                    : `Spatial cluster of ${selectedClusterZone.hotspotCount} satellite thermal anomalies`}
                </span>
                <span className="block text-[10px] text-rose-300/80">
                  {t.clusterPromoteDesc || (currentLang === 'ar' ? 'قم بترقية هذا التجمع المكاني لاعتماده كحادث رسمي وتفعيل مسارات التدخل' : 'Promote this spatial cluster into the national registry to initiate live tracking and dispatch.')}
                </span>
              </div>
            </div>
          )}

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2">
              <span className="text-[10px] text-slate-400 block">{t.clusterTotalFrp || (currentLang === 'ar' ? 'طاقة الإشعاع المجمعة' : 'Combined FRP')}</span>
              <span className="font-mono font-bold text-rose-300 text-sm">
                {selectedClusterZone.totalFrpMw} MW
              </span>
              <span className="text-[9px] text-slate-500 font-mono block">
                (Peak: {selectedClusterZone.maxFrpMw} MW)
              </span>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2">
              <span className="text-[10px] text-slate-400 block">{t.clusterMaxTemp || (currentLang === 'ar' ? 'أقصى حرارة نواة' : 'Max Temperature')}</span>
              <span className="font-mono font-bold text-amber-300 text-sm">
                {selectedClusterZone.maxBrightnessTempC}°C
              </span>
              <span className="text-[9px] text-slate-500 font-mono block">
                (Avg: {selectedClusterZone.avgBrightnessTempC}°C)
              </span>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2">
              <span className="text-[10px] text-slate-400 block">{currentLang === 'ar' ? 'الامتداد المكاني (نصف القطر)' : 'Spatial Span (Radius)'}</span>
              <span className="font-mono font-bold text-slate-200">
                {selectedClusterZone.radiusKm} km (~{selectedClusterZone.areaHectares} ha)
              </span>
              <span className="text-[9px] text-slate-500 font-mono block">
                {selectedClusterZone.hotspotCount} {currentLang === 'ar' ? 'بؤرة حرارية' : 'hotspots'}
              </span>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2">
              <span className="text-[10px] text-slate-400 block">{currentLang === 'ar' ? 'الأقمار والمستشعرات' : 'Satellites / Sensors'}</span>
              <span className="font-mono font-bold text-purple-300">
                {selectedClusterZone.satellites.join(' • ')}
              </span>
              <span className="text-[9px] text-purple-400/80 font-mono block">
                Conf: {selectedClusterZone.highestConfidencePercent}%
              </span>
            </div>
          </div>

          {/* Member Hotspots List */}
          <div className="space-y-1 bg-slate-900/60 border border-slate-800/80 rounded-lg p-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              {currentLang === 'ar' ? 'البؤر الحرارية المترابطة بالتجمع:' : 'Constituent Satellite Telemetry:'}
            </span>
            <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
              {selectedClusterZone.hotspots.map((h, i) => (
                <div key={h.id} className="flex items-center justify-between text-[10px] p-1 rounded bg-slate-950/70 border border-slate-800">
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="text-slate-500">#{i + 1}</span>
                    <span className="text-purple-300 font-bold">{h.satellite.replace('VIIRS_', '')}</span>
                    <span className="text-slate-400">({h.instrument})</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-amber-300">{h.frpMw} MW</span>
                    <span className="text-slate-400">{Math.round(h.brightnessTempKelvin - 273.15)}°C</span>
                    <span className="text-emerald-400">{h.confidencePercent}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action CTAs */}
          <div className="pt-1 flex flex-col gap-2">
            {!selectedClusterZone.isPromoted ? (
              <button
                id="btn-promote-cluster-to-incident"
                onClick={(e) => handlePromoteCluster(selectedClusterZone, e)}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs shadow-lg shadow-rose-950/50 cursor-pointer transition transform active:scale-95"
              >
                <Flame className="w-4 h-4 text-amber-200 animate-pulse" />
                <span>{t.promoteToIncident || (currentLang === 'ar' ? '⚡ ترقية التجمع إلى حادث مراقب رسمياً' : 'Promote Cluster to Monitored Incident')}</span>
              </button>
            ) : (
              <button
                id="btn-view-promoted-incident"
                onClick={() => {
                  const matched = incidents.find((i) => i.id === selectedClusterZone.promotedIncidentId);
                  if (matched) {
                    onSelectIncident(matched);
                  }
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs shadow-lg cursor-pointer transition"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                <span>{t.clusterViewPromotedIncident || (currentLang === 'ar' ? 'فتح ملف إدارة الحادث المراقب' : 'View Monitored Incident')}</span>
              </button>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => {
                  const centroidIncident = promoteClusterToIncident(selectedClusterZone);
                  updateDroneMissionHandler({
                    activeIncidentId: centroidIncident.id,
                    flightPattern: 'orbit',
                    isLayerVisibleOnMap: true
                  });
                  onOpenDroneSimulation?.(centroidIncident);
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-[11px] border border-slate-700 cursor-pointer transition"
              >
                <Camera className="w-3.5 h-3.5 text-emerald-400" />
                <span>{currentLang === 'ar' ? 'استطلاع درون للمنطقة' : 'Dispatch UAV Recon'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Cluster Promotion Toast Notification */}
      {promotionFeedback && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 bg-emerald-950/95 border border-emerald-400/80 rounded-xl shadow-2xl text-emerald-100 text-xs font-semibold backdrop-blur-xl animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
          <span>
            {currentLang === 'ar'
              ? `✓ تمت ترقية التجمع الفضائي بنجاح إلى حادث مراقب: ${promotionFeedback.title}`
              : `✓ Satellite cluster promoted to monitored incident: ${promotionFeedback.title}`}
          </span>
        </div>
      )}

      {/* Floating Immediate Sync Toast Feedback Banner */}
      {syncToastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 bg-purple-950/95 border border-purple-400/80 rounded-xl shadow-2xl text-purple-100 text-xs font-semibold backdrop-blur-xl animate-in fade-in slide-in-from-top-3">
          <RefreshCw className="w-3.5 h-3.5 text-purple-300" />
          <span>{syncToastMessage}</span>
        </div>
      )}

      {/* Floating Ground vs Satellite Distinction Legend Bar (Bottom-Center/Right) */}
      <div className="absolute bottom-6 right-4 z-20 hidden md:flex items-center gap-3 bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-xl px-3 py-2 text-[11px] text-slate-300 shadow-xl">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          {currentLang === 'ar' ? 'دليل الخريطة:' : 'Legend:'}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-600 border border-white flex items-center justify-center">
            <span className="w-1 h-1 rounded-full bg-white" />
          </span>
          <span className="text-slate-200 font-medium">
            {currentLang === 'ar' ? 'حريق مؤكد ميدانياً' : 'Ground-Confirmed Fire'}
          </span>
        </div>
        <div className="h-3 w-px bg-slate-800" />
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rotate-45 bg-purple-600 border border-pink-300 flex items-center justify-center">
            <span className="w-1 h-1 rounded-full bg-white" />
          </span>
          <span className="text-purple-300 font-medium">
            {currentLang === 'ar' ? 'رصد أقمار NASA (غير مؤكد)' : 'NASA FIRMS Sat (Unconfirmed)'}
          </span>
        </div>
        <div className="h-3 w-px bg-slate-800" />
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-emerald-400 font-medium">
            {currentLang === 'ar' ? 'استطلاع درون DZ-04' : 'Drone DZ-04'}
          </span>
        </div>

        {layers.spreadIsochrones && (
          <>
            <div className="h-3 w-px bg-slate-800" />
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded border border-amber-400 bg-amber-500/30 flex items-center justify-center">
                <TrendingUp className="w-2 h-2 text-amber-300" />
              </span>
              <span className="text-amber-300 font-medium font-mono text-[10px]">
                {currentLang === 'ar' ? 'إسقاط انتشار النيران الحي' : 'Live Spread Model'}
              </span>
            </div>
          </>
        )}

        {layers.firmsHeatmap && firmsHeatmapOpacity > 0 && (
          <>
            <div className="h-3 w-px bg-slate-800" />
            <div className="flex items-center gap-1.5">
              <div className="w-10 h-2.5 rounded-full bg-gradient-to-r from-purple-800 via-rose-500 to-amber-300 border border-slate-700 shadow-sm" />
              <span className="text-rose-300 font-medium font-mono text-[10px]">
                {currentLang === 'ar' 
                  ? `كثافة الخطر (${Math.round(firmsHeatmapOpacity * 100)}%)` 
                  : `Risk Density (${Math.round(firmsHeatmapOpacity * 100)}%)`}
              </span>
            </div>
          </>
        )}

        {layers.firmsClusters && activeIncidentZones.length > 0 && (
          <>
            <div className="h-3 w-px bg-slate-800" />
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-rose-950 border border-rose-500 flex items-center justify-center text-[7.5px] font-bold text-rose-300 font-mono">
                AIZ
              </span>
              <span className="text-rose-300 font-medium">
                {currentLang === 'ar' ? 'تجمعات حرارية نشطة' : 'Active Zones'}
              </span>
            </div>
          </>
        )}

        {layers.resourceHeatmap && (
          <>
            <div className="h-3 w-px bg-slate-800" />
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-gradient-to-r from-red-600 via-amber-500 to-emerald-500 border border-slate-600 flex items-center justify-center">
                <Truck className="w-2.5 h-2.5 text-white" />
              </span>
              <span className="text-amber-300 font-medium font-mono text-[10px]">
                {currentLang === 'ar' ? 'حرارية الموارد' : 'Resource Heatmap'} ({resourceHeatmapMode})
              </span>
            </div>
          </>
        )}

        {layers.evacuationPlanner && (
          <>
            <div className="h-3 w-px bg-slate-800" />
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-emerald-950 border border-emerald-400 flex items-center justify-center">
                <Navigation className="w-2.5 h-2.5 text-emerald-400" />
              </span>
              <span className="text-emerald-300 font-medium font-mono text-[10px]">
                {currentLang === 'ar' ? 'مسارات الإخلاء الذكية' : 'Evac Corridors'}
              </span>
            </div>
          </>
        )}

        {layers.physicalFireFront && (
          <>
            <div className="h-3 w-px bg-slate-800" />
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-red-950 border border-red-500 flex items-center justify-center">
                <Flame className="w-2.5 h-2.5 text-red-400" />
              </span>
              <span className="text-red-300 font-medium font-mono text-[10px]">
                {currentLang === 'ar' ? 'فيزياء روثيرميل DEM' : 'Rothermel DEM Front'} ({fireFrontTimeMinutes}m)
              </span>
            </div>
          </>
        )}

        {layers.terrainSteepnessHeatmap && (
          <>
            <div className="h-3 w-px bg-slate-800" />
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-amber-950 border border-amber-400 flex items-center justify-center">
                <Mountain className="w-2.5 h-2.5 text-amber-400" />
              </span>
              <span className="text-amber-300 font-medium font-mono text-[10px]">
                {currentLang === 'ar' ? 'انحدار التضاريس DEM' : 'DEM Steepness'} (Max {regionalSteepnessData.summary.maxSlopeDegrees}°)
              </span>
            </div>
          </>
        )}
      </div>

      {/* Floating Tactical Fire Spread Projection HUD Panel */}
      {layers.spreadIsochrones && showProjectionHUD && activeHUDProjection && (
        <div 
          id="fire-spread-projection-hud"
          className="absolute inset-x-2 sm:inset-x-auto sm:start-4 bottom-2 sm:bottom-6 z-30 w-auto sm:w-96 max-h-[75vh] overflow-y-auto bg-slate-950/95 backdrop-blur-2xl border border-amber-500/50 rounded-2xl p-3.5 shadow-2xl text-xs space-y-3 animate-in fade-in slide-in-from-bottom-3"
        >
          {/* Header with Title & Incident Select */}
          <div className="flex items-center justify-between border-b border-amber-900/40 pb-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-600 to-red-700 flex items-center justify-center shadow-lg shadow-orange-950/60">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-100 text-sm">
                    {t.fireSpreadProjection || (currentLang === 'ar' ? 'إسقاط انتشار النيران' : 'Fire Spread Projection')}
                  </span>
                  <span className="px-1.5 py-0.2 text-[9px] rounded-full bg-red-950 text-red-200 border border-red-500/40 font-mono font-bold">
                    {(activeHUDProjection.status || activeHUDProjection.incidentStatus || 'active').replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <div className="text-[10px] text-amber-300/90 font-mono truncate max-w-[210px]">
                  {activeHUDProjection.incidentTitle} • {activeHUDProjection.wilaya}
                </div>
              </div>
            </div>

            {/* Close / Minimize HUD */}
            <button
              onClick={() => setShowProjectionHUD(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Minimize projection HUD"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Incident Selector Pill Tabs if multiple fires */}
          {fireSpreadProjections.length > 1 && (
            <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin">
              {fireSpreadProjections.map((p) => {
                const isCurrent = activeHUDProjection.incidentId === p.incidentId;
                return (
                  <button
                    key={p.incidentId}
                    onClick={() => {
                      setSelectedProjectionIncidentId(p.incidentId);
                      const matched = incidents.find(i => i.id === p.incidentId);
                      if (matched) onSelectIncident(matched);
                    }}
                    className={`px-2 py-1 rounded-lg text-[10px] font-mono whitespace-nowrap transition cursor-pointer border ${
                      isCurrent
                        ? 'bg-amber-600/90 border-amber-400 text-white font-bold shadow'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    🔥 {p.incidentTitle.slice(0, 16)}...
                  </button>
                );
              })}
            </div>
          )}

          {/* Environmental Physics Telemetry Grid (Live Weather Wind + Terrain Slope) */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            {/* Live Weather Wind Telemetry Card */}
            <div className="bg-slate-900/90 border border-amber-900/40 rounded-xl p-2.5 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-amber-400/90">
                <span className="flex items-center gap-1 font-semibold">
                  <Wind className="w-3 h-3 text-amber-400" />
                  <span>{t.windTelemetry || (currentLang === 'ar' ? 'الرياح الحية' : 'Live Wind Push')}</span>
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" title="Live Weather API Verified" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-mono text-base font-extrabold text-slate-100">
                  {activeHUDProjection.windSpeedKmH}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">km/h</span>
                <span className="text-xs font-bold text-amber-300 ml-auto font-mono">
                  {activeHUDProjection.windDirectionCardinal} ({activeHUDProjection.windDirectionDegrees}°)
                </span>
              </div>
              <div className="text-[9px] text-slate-400 font-mono flex items-center justify-between border-t border-slate-800/80 pt-1">
                <span>Front Vector:</span>
                <span className="text-amber-200 font-semibold">{activeHUDProjection.flameHeadingDegrees}° {activeHUDProjection.flameHeadingCardinal}</span>
              </div>
            </div>

            {/* Terrain Topography & Rothermel Slope Boost Card */}
            <div className="bg-slate-900/90 border border-emerald-900/40 rounded-xl p-2.5 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-emerald-400/90">
                <span className="flex items-center gap-1 font-semibold">
                  <Mountain className="w-3 h-3 text-emerald-400" />
                  <span>{t.terrainSlopeEffect || (currentLang === 'ar' ? 'تأثير التضاريس' : 'Terrain Slope')}</span>
                </span>
                <span className="font-mono text-[9px] text-emerald-300">{activeHUDProjection.elevationMeters}m ASL</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-mono text-base font-extrabold text-emerald-200">
                  {activeHUDProjection.terrainSlopeDegrees}°
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Incline</span>
                <span className="text-xs font-bold text-emerald-400 ml-auto font-mono">
                  +{activeHUDProjection.terrainSlopeMultiplier}%
                </span>
              </div>
              <div className="text-[9px] text-slate-400 font-mono flex items-center justify-between border-t border-slate-800/80 pt-1">
                <span>Fuel Model:</span>
                <span className="text-slate-300 truncate max-w-[90px]">{activeHUDProjection.vegetationType}</span>
              </div>
            </div>
          </div>

          {/* Time Horizon Isochrone Cards */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>{t.spreadProjectionHorizon || (currentLang === 'ar' ? 'أفق انتشار النيران المتوقع' : 'Projected Spread Horizons')}</span>
              </span>
              <span className="font-mono text-[9px] text-amber-400">
                Head RoS: {activeHUDProjection.forwardRateOfSpreadKmH} km/h
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: '+30m', horizon: 30 as const, area: activeHUDProjection.isochrones[0]?.areaHectares || 6.2, prob: 94, color: 'border-red-500/50 bg-red-950/30 text-red-200' },
                { label: '+1h', horizon: 60 as const, area: activeHUDProjection.projectedBurnedArea1h, prob: 86, color: 'border-orange-500/50 bg-orange-950/30 text-orange-200' },
                { label: '+3h', horizon: 180 as const, area: activeHUDProjection.projectedBurnedArea3h, prob: 74, color: 'border-amber-500/50 bg-amber-950/30 text-amber-200' },
                { label: '+6h', horizon: 360 as const, area: activeHUDProjection.projectedBurnedArea6h, prob: 58, color: 'border-yellow-500/50 bg-yellow-950/30 text-yellow-200' }
              ].map((h) => {
                const isSelected = projectionHorizon === h.horizon;
                return (
                  <button
                    key={h.label}
                    onClick={() => setProjectionHorizon(projectionHorizon === h.horizon ? 'all' : h.horizon)}
                    className={`p-1.5 rounded-xl border text-center transition cursor-pointer ${h.color} ${
                      isSelected ? 'ring-2 ring-white shadow-lg' : 'opacity-85 hover:opacity-100'
                    }`}
                  >
                    <div className="font-mono font-bold text-[10px]">{h.label}</div>
                    <div className="font-mono text-xs font-extrabold">{h.area} ha</div>
                    <div className="text-[9px] text-slate-400 font-mono">{h.prob}% prob</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ember Spotting Risk Banner */}
          <div className="p-2 rounded-xl bg-gradient-to-r from-amber-950/40 via-red-950/30 to-amber-950/40 border border-amber-600/30 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2">
              <AlertTriangle className={`w-3.5 h-3.5 ${
                activeHUDProjection.spottingRisk === 'extreme' ? 'text-red-400 animate-bounce' : 'text-amber-400'
              }`} />
              <div>
                <span className="font-bold text-slate-200 block leading-tight">
                  {t.spottingRisk || (currentLang === 'ar' ? 'خطر تطاير الشظايا' : 'Ember Spotting Risk')}:{' '}
                  <span className={`uppercase font-mono font-extrabold ${
                    activeHUDProjection.spottingRisk === 'extreme' ? 'text-red-400' :
                    activeHUDProjection.spottingRisk === 'high' ? 'text-amber-400' : 'text-yellow-400'
                  }`}>
                    {activeHUDProjection.spottingRisk}
                  </span>
                </span>
                <span className="text-[9px] text-slate-400 font-mono">
                  {t.spottingDistance || 'Max jump distance'}: <span className="text-amber-300 font-bold">{activeHUDProjection.maxSpottingDistanceKm} km downwind</span>
                </span>
              </div>
            </div>
            <div className="font-mono text-[9px] text-slate-400 text-right">
              {activeHUDProjection.temperatureC}°C • {activeHUDProjection.humidityPercent}% RH
            </div>
          </div>

          {/* Vulnerable Communities & Infrastructure Threatened In Path */}
          {((activeHUDProjection.exposedAssets || activeHUDProjection.vulnerableCommunities)?.length ?? 0) > 0 && (
            <div className="space-y-1 border-t border-slate-800/80 pt-2">
              <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider block">
                {t.threatenedAssetsInPath || (currentLang === 'ar' ? 'المناطق السكنية والمنشآت المهددة في المسار:' : 'Assets & Settlements in Spread Path:')}
              </span>
              <div className="flex flex-wrap gap-1">
                {(activeHUDProjection.exposedAssets || activeHUDProjection.vulnerableCommunities || []).map((asset, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-md bg-red-950/70 border border-red-700/50 text-red-200 text-[10px] font-mono flex items-center gap-1"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span>{currentLang === 'ar' && asset.nameAr ? asset.nameAr : asset.name}</span>
                    <span className="text-amber-300 font-bold">
                      ({asset.estimatedWindowMinutes || `${asset.distanceKm}km`})
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-400">
                {currentLang === 'ar' ? 'الهدف:' : 'Target:'}
              </span>
              <select
                value={projectionTargetMode}
                onChange={(e) => setProjectionTargetMode(e.target.value as any)}
                className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] text-slate-200 font-mono cursor-pointer"
              >
                <option value="confirmed_active">{currentLang === 'ar' ? 'الحرائق المؤكدة' : 'Confirmed Active Fires'}</option>
                <option value="selected">{currentLang === 'ar' ? 'الحريق المحدد فقط' : 'Selected Incident Only'}</option>
                <option value="all">{currentLang === 'ar' ? 'جميع البلاغات' : 'All Active Incidents'}</option>
              </select>
            </div>

            <button
              onClick={() => {
                const targetSvg = geoToSvg(activeHUDProjection.origin.lat, activeHUDProjection.origin.lng);
                setPan({ x: 500 - targetSvg.x * zoom, y: 325 - targetSvg.y * zoom });
              }}
              className="px-2 py-1 rounded bg-amber-600/90 hover:bg-amber-500 text-white font-bold text-[10px] transition cursor-pointer flex items-center gap-1 shadow"
            >
              <Target className="w-3 h-3 text-amber-200" />
              <span>{currentLang === 'ar' ? 'توسيط الخريطة' : 'Center on Front'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Interactive Sentinel-2 NDVI & Biomass Legend HUD */}
      {layers.ndvi && (
        <InteractiveNdviLegend
          forests={dynamicNdviResult.updatedForests}
          currentLang={currentLang}
          opacity={ndviOpacity}
          onOpacityChange={setNdviOpacity}
          activeFilter={ndviFilter}
          onFilterChange={setNdviFilter}
          onSelectForest={onSelectForest}
          onOpenCalculationPanel={() => setShowNdviControl(true)}
          appliedScenarioLabel={appliedScenarioLabel}
          onClose={() => toggleLayer('ndvi')}
        />
      )}

      {/* Wilaya Resource Optimization & Heatmap Tactical HUD */}
      {layers.resourceHeatmap && showResourceHUD && (
        <ResourceOptimizationHUD
          balances={displayedWilayaBalances}
          summary={nationalResourceSummary}
          currentLang={currentLang}
          heatmapMode={resourceHeatmapMode}
          onModeChange={setResourceHeatmapMode}
          opacity={resourceHeatmapOpacity}
          onOpacityChange={setResourceHeatmapOpacity}
          selectedWilaya={selectedWilayaBalance}
          onSelectWilaya={(b) => {
            setSelectedWilayaBalance(b);
            if (b) {
              const pt = geoToSvg(b.lat, b.lng);
              setZoom(2.2);
              setPan({ x: 500 - pt.x * 2.2, y: 325 - pt.y * 2.2 });
            }
          }}
          onExecuteRecommendation={handleExecuteRecommendation}
          activeFilter={resourceFilter}
          onFilterChange={setResourceFilter}
          onClose={() => setShowResourceHUD(false)}
        />
      )}

      {/* Floating Tactical Alert Banner for Real-Time Evacuation Instructions & Urgency */}
      {layers.evacuationPlanner && activeEvacRoute && showAlertBanner && (
        <AlertBanner
          route={activeEvacRoute}
          settlement={selectedEvacSettlement}
          currentLang={currentLang}
          generationKey={evacGenerationTriggerKey}
          isTemporaryActive={isTemporaryDynamicActive}
          temporaryCountdownSeconds={temporaryCountdownSeconds}
          onExtendTemporary={handleExtendTemporary}
          onPinPermanent={handlePinPermanent}
          onOpenEvacHUD={() => setShowEvacHUD(true)}
          onCenterMapOnRoute={() => {
            if (activeEvacRoute.waypoints && activeEvacRoute.waypoints.length > 0) {
              const midIndex = Math.floor(activeEvacRoute.waypoints.length / 2);
              const midWp = activeEvacRoute.waypoints[midIndex];
              const pt = geoToSvg(midWp.lat, midWp.lng);
              setZoom(2.2);
              setPan({ x: 500 - pt.x * 2.2, y: 325 - pt.y * 2.2 });
            }
          }}
          onDismiss={() => setShowAlertBanner(false)}
        />
      )}

      {/* Smart Civilian Evacuation Planner Tactical HUD */}
      {layers.evacuationPlanner && showEvacHUD && evacuationPlan && (
        <SmartEvacuationPlannerHUD
          plan={evacuationPlan}
          selectedSettlement={selectedEvacSettlement}
          onSelectSettlement={(s) => {
            handleGenerateOrRecalculateRoute(s);
            const pt = geoToSvg(s.coordinates.lat, s.coordinates.lng);
            setZoom(2.0);
            setPan({ x: 500 - pt.x * 2.0, y: 325 - pt.y * 2.0 });
          }}
          selectedRoute={activeEvacRoute}
          onSelectRoute={(r) => {
            setSelectedEvacRoute(r);
            if (r) {
              setIsTemporaryDynamicActive(true);
              setTemporaryCountdownSeconds(45);
              setShowAlertBanner(true);
              setEvacGenerationTriggerKey(Date.now());
              const pt = geoToSvg(r.safeZone.coordinates.lat, r.safeZone.coordinates.lng);
              setZoom(2.2);
              setPan({ x: 500 - pt.x * 2.2, y: 325 - pt.y * 2.2 });
            }
          }}
          showRoadNetwork={showEvacRoadNetwork}
          onToggleRoadNetwork={() => setShowEvacRoadNetwork(!showEvacRoadNetwork)}
          showSmokeCone={showEvacSmokeCone}
          onToggleSmokeCone={() => setShowEvacSmokeCone(!showEvacSmokeCone)}
          showShelters={showEvacShelters}
          onToggleShelters={() => setShowEvacShelters(!showEvacShelters)}
          onClose={() => setShowEvacHUD(false)}
          currentLang={currentLang}
        />
      )}

      {/* Fire Front Dynamics Tactical HUD (Active Expansion Edge & Periodic Vector Updates) */}
      {layers.fireFrontDynamics && showFireFrontDynamicsHUD && fireFrontDynamicsResult && (
        <FireFrontDynamicsHUD
          dynamics={fireFrontDynamicsResult}
          isPeriodicActive={isDynamicsPeriodicActive}
          onTogglePeriodic={() => setIsDynamicsPeriodicActive(!isDynamicsPeriodicActive)}
          onStepForward={handleDynamicsStepForward}
          onResetSimulation={handleResetDynamics}
          periodicIntervalSeconds={dynamicsPeriodicIntervalSeconds}
          onChangeIntervalSeconds={setDynamicsPeriodicIntervalSeconds}
          showVectors={showDynamicsVectors}
          onToggleVectors={() => setShowDynamicsVectors(!showDynamicsVectors)}
          showHistoricalTrails={showDynamicsHistoricalTrails}
          onToggleHistoricalTrails={() => setShowDynamicsHistoricalTrails(!showDynamicsHistoricalTrails)}
          showVertexNodes={showDynamicsVertexNodes}
          onToggleVertexNodes={() => setShowDynamicsVertexNodes(!showDynamicsVertexNodes)}
          selectedVertex={selectedDynamicsVertex}
          onSelectVertex={(v) => {
            setSelectedDynamicsVertex(v);
            if (v) {
              const pt = geoToSvg(v.lat, v.lng);
              setZoom(2.4);
              setPan({ x: 500 - pt.x * 2.4, y: 325 - pt.y * 2.4 });
            }
          }}
          onClose={() => setShowFireFrontDynamicsHUD(false)}
          currentLang={currentLang}
        />
      )}

      {/* Rothermel Physical Fire Front Simulation Tactical HUD */}
      {layers.physicalFireFront && showFireFrontHUD && fireFrontSimulation && (
        <FireFrontSimulationHUD
          simulation={fireFrontSimulation}
          config={fireFrontConfig}
          onConfigChange={setFireFrontConfig}
          activeTimeMinutes={fireFrontTimeMinutes}
          onTimeChange={setFireFrontTimeMinutes}
          isPlaying={fireFrontIsPlaying}
          onTogglePlay={() => setFireFrontIsPlaying(!fireFrontIsPlaying)}
          showVectors={showFireFrontVectors}
          onToggleVectors={() => setShowFireFrontVectors(!showFireFrontVectors)}
          showIsochrones={showFireFrontIsochrones}
          onToggleIsochrones={() => setShowFireFrontIsochrones(!showFireFrontIsochrones)}
          showDemBadges={showFireFrontDemBadges}
          onToggleDemBadges={() => setShowFireFrontDemBadges(!showFireFrontDemBadges)}
          selectedVertex={selectedFireFrontVertex}
          onSelectVertex={(v) => {
            setSelectedFireFrontVertex(v);
            if (v) {
              const pt = geoToSvg(v.lat, v.lng);
              setZoom(2.4);
              setPan({ x: 500 - pt.x * 2.4, y: 325 - pt.y * 2.4 });
            }
          }}
          onClose={() => setShowFireFrontHUD(false)}
          currentLang={currentLang}
        />
      )}

      {/* Automated Resource Deployment Advisor Tactical HUD */}
      {showAdvisorHUD && (
        <ResourceDeploymentAdvisorHUD
          incidents={incidents}
          selectedIncident={selectedIncident || incidents[0]}
          onSelectIncident={onSelectIncident}
          availableResources={resources}
          onDispatchResource={onDispatchResource || (() => {})}
          currentLang={currentLang}
          onClose={() => setShowAdvisorHUD(false)}
          onCenterMap={(coords) => {
            const pt = geoToSvg(coords.lat, coords.lng);
            setZoom(2.4);
            setPan({ x: 500 - pt.x * 2.4, y: 325 - pt.y * 2.4 });
          }}
        />
      )}

      {/* Tactical Airborne Drone Reconnaissance Mission HUD */}
      {showDroneHUD && (
        <div className="absolute inset-0 z-30 p-2 sm:p-4 bg-black/60 backdrop-blur-sm flex items-center justify-center animate-in fade-in">
          <div className="w-full h-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl">
            <DroneMissionHUD
              incident={dronePatrolIncident}
              droneMissionState={activeDroneMission}
              onUpdateDroneMission={updateDroneMissionHandler}
              currentLang={currentLang}
              onClose={() => setShowDroneHUD(false)}
              onSyncMapTarget={(coords) => {
                const pt = geoToSvg(coords.lat, coords.lng);
                setZoom(2.6);
                setPan({ x: 500 - pt.x * 2.6, y: 325 - pt.y * 2.6 });
              }}
            />
          </div>
        </div>
      )}

      {/* Terrain Steepness & Machinery Mobility Tactical HUD (DEM Analysis) */}
      {layers.terrainSteepnessHeatmap && showSteepnessHUD && (
        <TerrainSteepnessHUD
          summary={regionalSteepnessData.summary}
          selectedCell={selectedSteepnessCell}
          selectedCriticalZone={selectedCriticalEscarpment}
          mode={terrainSteepnessMode}
          onChangeMode={setTerrainSteepnessMode}
          opacity={terrainSteepnessOpacity}
          onChangeOpacity={setTerrainSteepnessOpacity}
          showContourBlobs={showSteepnessBlobs}
          onToggleContourBlobs={() => setShowSteepnessBlobs(!showSteepnessBlobs)}
          showAspectVectors={showSteepnessVectors}
          onToggleAspectVectors={() => setShowSteepnessVectors(!showSteepnessVectors)}
          showHazardBadges={showSteepnessBadges}
          onToggleHazardBadges={() => setShowSteepnessBadges(!showSteepnessBadges)}
          onSelectCriticalZone={(zone) => {
            setSelectedCriticalEscarpment(zone);
            setSelectedSteepnessCell(null);
            const pt = geoToSvg(zone.coordinates.lat, zone.coordinates.lng);
            setZoom(2.4);
            setPan({ x: 500 - pt.x * 2.4, y: 325 - pt.y * 2.4 });
          }}
          onClose={() => setShowSteepnessHUD(false)}
          currentLang={currentLang}
        />
      )}

      {/* Backdrop Overlay for Active Modals: Strictly conditioned on modals and cleaned up automatically */}
      {(showAlsatHUD || isSatelliteModalOpen || showNdviControl || showHeatmapControl || (showClusterInspector && selectedClusterZone)) && (
        <div
          id="gis-map-modal-backdrop"
          onClick={handleDismissActiveModal}
          className={`${showAlsatHUD ? 'fixed inset-0 z-[9990]' : 'absolute inset-0 z-40'} bg-black/40 backdrop-blur-[1px] transition-all duration-150 animate-in fade-in cursor-pointer`}
          role="button"
          tabIndex={0}
          aria-label={currentLang === 'ar' ? 'إغلاق النافذة المنبثقة والنقر في الخارج' : 'Dismiss active modal by clicking outside'}
          onKeyDown={(e) => {
            if (e.key === 'Escape' || e.key === 'Enter') {
              handleDismissActiveModal();
            }
          }}
        />
      )}

      {/* Algerian Space Agency (ASAL) ALSAT Fleet Command HUD (rendered in front of backdrop at z-index: 9999) */}
      {showAlsatHUD && (
        <AlSatControlModal
          isOpen={showAlsatHUD}
          positions={alsatPositions}
          passes={alsatPasses}
          selectedSatellite={selectedAlsatSatellite}
          onSelectSatellite={setSelectedAlsatSatellite}
          selectedPassId={selectedAlsatPass?.id || null}
          onSelectPass={(pass) => {
            if (pass) {
              setSelectedAlsatPass(pass);
              const centerLat = (pass.bounds.minLat + pass.bounds.maxLat) / 2;
              const centerLng = (pass.bounds.minLng + pass.bounds.maxLng) / 2;
              const pt = geoToSvg(centerLat, centerLng);
              setZoom(2.2);
              setPan({ x: 500 - pt.x * 2.2, y: 325 - pt.y * 2.2 });
            } else {
              setSelectedAlsatPass(null);
            }
          }}
          showTracks={showAlsatOrbitalTracks}
          onToggleTracks={() => setShowAlsatOrbitalTracks(!showAlsatOrbitalTracks)}
          showSwaths={showAlsatSwathCorridors}
          onToggleSwaths={() => setShowAlsatSwathCorridors(!showAlsatSwathCorridors)}
          showFootprints={showAlsatNdviFootprints}
          onToggleFootprints={() => setShowAlsatNdviFootprints(!showAlsatNdviFootprints)}
          onRefreshTelemetry={handleRefreshAlsatTelemetry}
          onClose={handleCloseAlsatHUD}
          currentLang={currentLang}
          isOnline={isOnline}
        />
      )}

      {/* Real-Time NASA FIRMS Satellite Uplink Center Modal */}
      <LiveSatelliteModal
        isOpen={isSatelliteModalOpen}
        onClose={() => setIsSatelliteModalOpen(false)}
        currentLang={currentLang}
        onRefreshFirms={handleForceRefreshFirms}
        isRefreshing={effectiveIsLoading}
        detections={activeFirmsHotspots}
        onSelectHotspot={handleSelectHotspotFromModal}
      />
    </div>
  );
};
