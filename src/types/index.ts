export type Language = 'ar' | 'fr' | 'en';

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
