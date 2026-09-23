export type Language = 'ar' | 'fr' | 'en';

export type RBACRole = 'Citizen' | 'FieldUnit' | 'CentralCommand';

export interface RBACPermissions {
  canDispatchResources: boolean;
  canConfirmRejectIncidents: boolean;
  canEditIncidentStatus: boolean;
  canAccessDroneRecon: boolean;
  canAccessFieldOps: boolean;
  canTriggerSimulations: boolean;
  canAccessAnalytics: boolean;
  canAccessPostFireReports: boolean;
  canSubmitCitizenReport: boolean;
  canAccessBurnRateModeling: boolean;
  canAccessSatelliteUplink: boolean;
  canDeclareNationalEmergency: boolean;
}

export interface UserProfile {
  id: string;
  uid: string;
  email?: string | null;
  displayName: string;
  photoURL?: string | null;
  role: RBACRole;
  fineRole?: UserRole;
  wilaya?: string;
  badgeNumber?: string;
  unitName?: string;
  clearanceLevel: 1 | 2 | 3; // 1: Citizen, 2: FieldUnit, 3: CentralCommand
  isAnonymous?: boolean;
  lastLoginAt?: string;
  updatedAt?: string;
}

export type UserRole = 
  | 'super_admin'
  | 'national_command'
  | 'wilaya_command'
  | 'civil_protection'
  | 'forestry_expert'
  | 'field_team'
  | 'data_analyst'
  | 'citizen';

export type RiskLevel = 'low' | 'moderate' | 'high' | 'extreme' | 'critical';

export type IncidentStatus = 
  | 'suspected'
  | 'under_verification'
  | 'confirmed'
  | 'active_response'
  | 'contained'
  | 'extinguished'
  | 'closed'
  | 'false_positive';

export type DetectionSourceType = 
  | 'satellite_firms'
  | 'satellite_sentinel'
  | 'alsat_remote'
  | 'watchtower_camera'
  | 'thermal_drone'
  | 'iot_sensor'
  | 'citizen_report'
  | 'field_patrol';

export interface GeoCoordinates {
  lat: number;
  lng: number;
}

export interface ContributingFactor {
  name: string;
  nameAr: string;
  nameFr: string;
  impact: number; // positive adds to risk
  value: string;
  category: 'weather' | 'fuel' | 'terrain' | 'human';
}

export interface RiskAssessment {
  score: number; // 0-100
  level: RiskLevel;
  trend: 'increasing' | 'stable' | 'decreasing';
  confidence: number; // 0-100%
  timestamp: string;
  modelVersion: string;
  humanValidated: boolean;
  validatedBy?: string;
  contributingFactors: ContributingFactor[];
}

export interface DetectionSignal {
  id: string;
  source: DetectionSourceType;
  sourceName: string;
  timestamp: string;
  confidence: number;
  location: GeoCoordinates;
  details: string;
  sensorMetadata?: {
    device?: string;
    temperatureReading?: number;
    smokeProbability?: number;
    thermalAnomalyMw?: number; // Megawatts radiative power for satellite
    imageUrl?: string;
  };
}

export interface SpreadIsochrone {
  timeHorizonMinutes: 30 | 60 | 180 | 360;
  perimeterPoints: GeoCoordinates[];
  areaHectares: number;
  probability: number; // e.g. 90%, 75%, 55%
  frontSpeedKmH: number;
}

export interface ExposedAsset {
  id: string;
  name: string;
  nameAr: string;
  type: 'village' | 'hospital' | 'school' | 'road' | 'electrical_grid' | 'agricultural';
  population?: number;
  distanceKm: number;
  estimatedWindowMinutes: string;
  evacuationStatus: 'monitoring' | 'advisory' | 'mandatory' | 'cleared';
  urgency: 'low' | 'moderate' | 'critical';
}

export interface EmergencyResource {
  id: string;
  code: string; // e.g. "CP-17", "WT-08", "DZ-04"
  name: string;
  nameAr: string;
  type: 'firetruck' | 'water_tanker' | 'drone' | 'aircraft' | 'medical' | 'ground_team';
  status: 'available' | 'dispatched' | 'en_route' | 'on_scene' | 'maintenance';
  baseLocation: GeoCoordinates;
  currentLocation: GeoCoordinates;
  wilaya: string;
  capacity?: string;
  estimatedArrivalMinutes?: number;
  assignedIncidentId?: string;
}

export interface IncidentTimelineEvent {
  id: string;
  timestamp: string;
  type: 'detection' | 'fusion' | 'verification' | 'dispatch' | 'spread_alert' | 'containment' | 'expert_note';
  title: string;
  description: string;
  author?: string;
  sourceBadge?: string;
}

export interface WildfireIncident {
  id: string; // e.g. "DZ-WF-2026-000421"
  code: string;
  title: string;
  titleAr: string;
  wilaya: string;
  wilayaAr: string;
  locationName: string;
  locationNameAr: string;
  coordinates: GeoCoordinates;
  status: IncidentStatus;
  riskLevel: RiskLevel;
  confidenceScore: number;
  detectionSources: DetectionSignal[];
  detectionTime: string;
  confirmationTime?: string;
  containedTime?: string;
  estimatedBurnedHectares: number;
  windSpeedKmH: number;
  windDirectionDegrees: number; // 0 = North, 90 = East, etc.
  windDirectionCardinal: string; // "NE", "NW", etc.
  temperatureC: number;
  humidityPercent: number;
  terrainSlopeDegrees: number;
  spreadPredictions: SpreadIsochrone[];
  exposedAssets: ExposedAsset[];
  assignedResources: string[]; // Resource IDs
  timeline: IncidentTimelineEvent[];
  expertValidation?: {
    verified: boolean;
    expertName: string;
    decision: 'confirmed' | 'rejected' | 'modified';
    notes: string;
    timestamp: string;
  };
}

export type NdviHealthCategory = 'critical_drought' | 'moisture_stressed' | 'moderate' | 'healthy_dense';

export interface ForestZone {
  id: string;
  forestId: string; // e.g. "DZ-FOR-TIZI-01"
  name: string;
  nameAr: string;
  nameFr: string;
  wilaya: string;
  wilayaAr: string;
  totalHectares: number;
  vegetationType: string;
  vegetationTypeAr: string;
  fuelMoistureIndex: number; // 0-100 (lower = drier)
  densityLevel: 'Sparse' | 'Medium' | 'Dense' | 'Very Dense';
  elevationMeters: number;
  slopeDegrees: number;
  coordinates: GeoCoordinates; // centroid
  polygonCoords?: GeoCoordinates[];
  waterPointsCount: number;
  watchtowersCount: number;
  droneStationsCount: number;
  civilProtectionBasesCount: number;
  historicalFireCount: number;
  lastBurnYear?: number;
  recoveryHealthPercent: number; // 0-100%
  currentRiskScore: number;
  riskLevel: RiskLevel;
  // Multi-Spectral NDVI & Fuel Biomass Satellite Telemetry (Copernicus Sentinel-2 MSI)
  ndviValue?: number; // -0.1 to 0.85
  ndviAnomalyPercent?: number; // e.g. -28% vs 10-year seasonal baseline
  vegetationHealthCategory?: NdviHealthCategory;
  canopyMoisturePercent?: number; // Foliar moisture (FMC) %
  combustibleBiomassTonsHa?: number; // Dry flammable matter t/ha
  sentinel2BandRatio?: string; // e.g. "B8(NIR): 0.42 / B4(Red): 0.18"
  lastSatellitePass?: string;
}

export interface WaterPoint {
  id: string;
  name: string;
  type: 'dam' | 'lake' | 'hydrant' | 'cistern' | 'river';
  capacityM3: number;
  coordinates: GeoCoordinates;
  status: 'operational' | 'depleted' | 'accessible';
}

export interface WatchtowerCamera {
  id: string;
  name: string;
  wilaya: string;
  coordinates: GeoCoordinates;
  hasOpticalCamera: boolean;
  hasThermalSensor: boolean;
  status: 'online' | 'offline';
  lastDetection?: string;
  bearingDegrees: number;
  rangeKm: number;
}

export interface PostFireReport {
  incidentId: string;
  incidentCode: string;
  wilaya: string;
  startTime: string;
  containmentTime: string;
  totalDurationHours: number;
  finalBurnedHectares: number;
  vegetationLost: string;
  infrastructureProtected: string;
  casualties: number;
  displacedCount: number;
  resourcesDeployedCount: number;
  waterUsedLiters: number;
  predictedVsActualSpreadAccuracyPercent: number;
  initialDetectionLatencyMinutes: number;
  responseArrivalLatencyMinutes: number;
  aiModelLessons: string[];
  reforestationPlanTimeline: string;
}

export interface CitizenFireReportSubmission {
  id: string;
  timestamp: string;
  reporterPhone?: string;
  location: GeoCoordinates;
  locationNameHint?: string;
  smokeDirection?: string;
  fireSizeEstimate?: 'small' | 'medium' | 'large';
  description?: string;
  imageUrl?: string;
  deviceInfo: string;
  status: 'pending' | 'correlated' | 'verified' | 'rejected';
}

// Tactical Drone Reconnaissance & Thermal/RGB Aerial Feeds
export type DroneCameraMode = 'thermal' | 'rgb';
export type DroneThermalPalette = 'ironbow' | 'white_hot' | 'black_hot' | 'rainbow';
export type DroneFlightPattern = 'orbit' | 'sweep' | 'hover' | 'grid';

export interface DroneTacticalAssessment {
  maxHotspotTempC: number;
  flameFrontTempC: number;
  ambientTempC: number;
  fireRadiativePowerMw: number;
  spreadRateMMin: number;
  intensityClass: 'Surface Low' | 'Surface High' | 'Crown Moderate' | 'Catastrophic Crown';
  recommendedDropPoint: GeoCoordinates;
  flameHeightMeters: number;
  isothermActive: boolean;
  deHazeActive: boolean;
}

export interface DroneMissionState {
  droneId: string;
  droneName: string;
  model: string;
  activeIncidentId: string;
  cameraMode: DroneCameraMode;
  thermalPalette: DroneThermalPalette;
  flightPattern: DroneFlightPattern;
  altitudeMeters: number;
  headingDegrees: number;
  speedKmH: number;
  batteryPercent: number;
  signalStrengthPercent: number;
  zoomLevel: number;
  gimbalPitch: number;
  isLayerVisibleOnMap: boolean;
  assessment: DroneTacticalAssessment;
}

// Smart Evacuation Routing & Road Network Types
export type RoadType = 'highway' | 'national' | 'wilaya' | 'mountain_pass' | 'firebreak';
export type RoadSafetyStatus = 'open_safe' | 'caution_smoke' | 'blocked_fire' | 'congested';

export interface RoadSegment {
  id: string;
  roadNumber: string;
  nameEn: string;
  nameAr: string;
  nameFr: string;
  type: RoadType;
  path: GeoCoordinates[];
  speedLimitKmH: number;
  lanes: number;
  capacityVehiclesPerHour: number;
  elevationGainMeters?: number;
}

export interface SafeEvacuationZone {
  id: string;
  nameEn: string;
  nameAr: string;
  nameFr: string;
  type: 'stadium_shelter' | 'field_hospital' | 'civil_protection_hub' | 'coastal_safe_zone' | 'public_hall';
  coordinates: GeoCoordinates;
  wilaya: string;
  capacityPersons: number;
  currentOccupancy: number;
  availableBeds: number;
  hasMedicalSupport: boolean;
  hasHelipad: boolean;
  hasFoodWaterSupply: boolean;
  emergencyVhfFrequency: string;
  contactPhone: string;
}

export interface EvacuationTurnInstruction {
  stepNumber: number;
  instructionEn: string;
  instructionAr: string;
  instructionFr: string;
  roadName: string;
  distanceKm: number;
  coordinates: GeoCoordinates;
  turnType: 'straight' | 'turn_left' | 'turn_right' | 'fork' | 'merge' | 'arrive';
  hazardWarning?: string;
}

export interface CalculatedEvacuationRoute {
  id: string;
  settlementId: string;
  settlementName: string;
  settlementNameAr: string;
  safeZone: SafeEvacuationZone;
  routeType: 'primary_optimal' | 'secondary_contingency' | 'compromised_blocked';
  status: RoadSafetyStatus;
  totalDistanceKm: number;
  estimatedTravelMinutes: number;
  estimatedEvacuationClearanceMinutes: number;
  minFireClearanceKm: number;
  smokeExposureRisk: 'none' | 'low' | 'moderate' | 'hazardous';
  bottleneckRiskIndex: number;
  waypoints: GeoCoordinates[];
  instructions: EvacuationTurnInstruction[];
  roadSegmentsUsed: string[];
  logisticsRequired: {
    ambulances: number;
    buses: number;
    policeEscorts: number;
    medicalStaff: number;
  };
}

export interface EvacuationPlanScenario {
  id: string;
  incidentId: string;
  generatedAt: string;
  activeFireCenter: GeoCoordinates;
  windHeadingDegrees: number;
  windSpeedKmH: number;
  smokePlumeCone: {
    origin: GeoCoordinates;
    headingDegrees: number;
    lengthKm: number;
    spreadAngleDegrees: number;
  };
  settlementRoutes: CalculatedEvacuationRoute[];
  blockedRoadIds: string[];
  totalPopulationAtRisk: number;
  totalEvacuatedCount: number;
  advisoryStatus: 'monitoring' | 'voluntary_standby' | 'mandatory_immediate';
}

// ==========================================
// AWIS Future Multi-Sensor Integration Models
// ==========================================

export interface MtgFciHotspotSignal {
  id: string; // e.g. "MTG-FCI-DZ-20260921-1240"
  timestampUtc: string;
  scanRepeatCycle: number;
  location: GeoCoordinates;
  wilayaId: number;
  wilayaNameAr: string;
  spectralChannels: {
    t38Kelvin: number;
    t105Kelvin: number;
    deltaTKelvin: number;
  };
  frpEstimatedMw: number;
  pixelFootprintKm2: number;
  cloudMaskStatus: 'clear' | 'partially_cloudy' | 'smoke_plume';
  confidenceLevel: 'low' | 'nominal' | 'high';
  isProcessedInCadence: boolean;
}

export interface SarRadarFirePerimeter {
  id: string; // e.g. "SAR-S1-DZ-2026-0042"
  orbitDirection: 'ASCENDING' | 'DESCENDING';
  acquisitionTimestamp: string;
  polarizationChannels: ['VV', 'VH'];
  perimeterGeoJson: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][];
  };
  totalBurnScarAreaHa: number;
  cloudPenetrationSuccess: true;
  backscatterDifferenceDbMean: number;
  confidenceMatrix: number[];
  derivedFireFrontLine: {
    type: 'LineString';
    coordinates: number[][];
    advancementBearingDeg: number;
  };
}

export interface IotForestNodeTelemetry {
  nodeId: string; // e.g. "LR-TEB-014"
  gatewayId: string;
  timestamp: string;
  batteryMillivolts: number;
  solarChargingCurrentMa: number;
  rssi: number;
  snr: number;
  telemetry: {
    gasCoPpm: number;
    gasVocIndex: number;
    ambientTempC: number;
    ambientHumidityPercent: number;
    pyrolysisProbability: number;
  };
  geoPosition: GeoCoordinates & {
    altitudeMeters: number;
    forestCompartment: string;
    wilaya: string;
  };
  alarmState: 'NOMINAL' | 'PRE_FIRE_PYROLYSIS' | 'ACTIVE_COMBUSTION';
}

export interface DroneEdgeVisionTelemetry {
  droneCallsign: string; // e.g. "DRONE-ALGER-ALPHA-02"
  flightSessionId: string;
  timestamp: string;
  dronePosition: GeoCoordinates & {
    altitudeAglMeters: number;
    headingDeg: number;
    gimbalPitchDeg: number;
  };
  visionDetections: {
    fireFrontDetected: boolean;
    flameCentroidGeo: GeoCoordinates;
    flamePerimeterCoordinates: number[][];
    measuredFlameHeightMeters: number;
    peakRadiometricTempC: number;
    smokeVectorDirectionDeg: number;
    smokeVelocityMps: number;
  };
  streamUrls: {
    thermalRtc: string;
    rgbRtc: string;
  };
  feedHealth: {
    fps: number;
    latencyMs: number;
    confidenceScorePercent: number;
  };
}

// ==========================================
// ASAL (Algerian Space Agency) ALSAT Fleet Models
// ==========================================

export type AlsatSatelliteId = 'ALSAT-1B' | 'ALSAT-2A' | 'ALSAT-2B';

export interface AlsatTleData {
  satelliteId: AlsatSatelliteId;
  name: string;
  nameAr: string;
  line1: string;
  line2: string;
  noradId: number;
  epochYear: number;
  epochDay: number;
  inclinationDeg: number;
  raanDeg: number;
  eccentricity: number;
  argOfPerigeeDeg: number;
  meanAnomalyDeg: number;
  meanMotionRevsPerDay: number;
  periodMinutes: number;
  altitudeKm: number;
  sensorResolutionMeters: number;
  swathWidthKm: number;
  spectralBands: string[];
  missionRoleEn: string;
  missionRoleAr: string;
  lastUpdatedUtc: string;
}

export interface AlsatRealtimePosition {
  satelliteId: AlsatSatelliteId;
  latitude: number;
  longitude: number;
  altitudeKm: number;
  velocityKmS: number;
  groundFootprintRadiusKm: number;
  isOverAlgeria: boolean;
  nextAlgeriaPassUtc: string;
  subSatellitePoint: GeoCoordinates;
  footprintPolygon: GeoCoordinates[];
  timestampUtc: string;
}

export interface AlsatOrbitalTrack {
  satelliteId: AlsatSatelliteId;
  pastTrack: GeoCoordinates[];
  currentPosition: GeoCoordinates;
  futureTrack: GeoCoordinates[];
  swathCorridor: GeoCoordinates[];
}

export interface AlsatNdviPassData {
  id: string;
  satelliteId: AlsatSatelliteId;
  acquisitionDate: string;
  cloudCoverPercent: number;
  wilayaTarget: string;
  wilayaTargetAr: string;
  bounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
  ndviStats: {
    minNdvi: number;
    maxNdvi: number;
    meanNdvi: number;
    droughtSeverityIndex: 'Severe' | 'Moderate' | 'Normal' | 'Lush';
    droughtSeverityIndexAr: string;
  };
  wmsLayerUrl: string;
  wmtsTileUrlTemplate: string;
  bandsUsed: {
    red: string;
    nir: string;
  };
  resolutionM: number;
  cachedInIndexedDb: boolean;
  timestampSaved: string;
}
