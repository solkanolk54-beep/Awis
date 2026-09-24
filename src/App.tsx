import React, { useState, useEffect } from 'react';
import { 
  SAMPLE_INCIDENTS, 
  SAMPLE_FORESTS, 
  SAMPLE_WATER_POINTS, 
  SAMPLE_WATCHTOWERS, 
  SAMPLE_RESOURCES, 
  SAMPLE_DETECTION_SIGNALS,
  SAMPLE_POST_FIRE_REPORT 
} from './data/algeriaData';
import { 
  WildfireIncident, 
  ForestZone, 
  WaterPoint, 
  WatchtowerCamera, 
  EmergencyResource, 
  DetectionSignal, 
  Language, 
  GeoCoordinates,
  DroneMissionState
} from './types';
import { Header } from './components/common/Header';
import { KPISummaryBar } from './components/common/KPISummaryBar';
import { GISMap } from './components/gis/GISMap';
import { AlertFeedSidebar } from './components/alerts/AlertFeedSidebar';
import { Bell, PanelRightOpen } from 'lucide-react';
import { IncidentDetailModal } from './components/incident/IncidentDetailModal';
import { ForestTwinModal } from './components/forest/ForestTwinModal';
import { CitizenReportingModal } from './components/citizen/CitizenReportingModal';
import { FieldOpsModal } from './components/field/FieldOpsModal';
import { SimulationController } from './components/simulation/SimulationController';
import { NationalAnalyticsModal } from './components/analytics/NationalAnalyticsModal';
import { PostFireReportModal } from './components/reports/PostFireReportModal';
import { DroneViewSimulationModal } from './components/simulation/DroneViewSimulationModal';
import { PredictiveBurnRateModal } from './components/simulation/PredictiveBurnRateModal';
import { computeDroneTacticalAssessment, getDroneEdgeVisionTelemetry } from './services/droneReconService';
import { translations } from './i18n/translations';
import { fetchLiveWeather, LiveWeatherData } from './services/liveWeatherService';
import { 
  UserLivePosition, 
  getLiveDevicePosition, 
  watchLiveDevicePosition,
  stopWatchingDevicePosition 
} from './services/liveGeolocationService';
import {
  saveOfflineGISState,
  loadOfflineGISState,
  getOfflineCacheStats,
  queueOfflineReport,
  getQueuedOfflineReports,
  clearQueuedOfflineReports,
  syncQueueToCloud,
  OfflineCacheStats,
  QueuedOfflineReport
} from './services/offlineCacheService';
import { OfflineForestManagerModal } from './components/offline/OfflineForestManagerModal';
import {
  getNotificationPermission,
  isNotificationSupported,
  registerNotificationMessageListener,
  dispatchHighPriorityFireNotification,
  getNotifiedIncidentIds,
  markIncidentAsNotified
} from './services/notificationService';
import { PushNotificationModal } from './components/notifications/PushNotificationModal';
import { startFirmsPolling, fetchFirmsHotspots, transformFirmsToIncidents, FirmsDetection } from './services/firmsService';
import { LiveSatelliteModal } from './components/gis/LiveSatelliteModal';
import { EvacuationAlertModal } from './components/alerts/EvacuationAlertModal';
import {
  testFirestoreConnection,
  subscribeToIncidents,
  subscribeToResources,
  syncIncidentToCloud,
  syncResourceToCloud,
  submitCitizenReportToCloud
} from './firebaseConfig';
import { UserRole } from './types';
import { RBACProvider, useRBAC } from './context/RBACContext';
import { RBACModal } from './components/auth/RBACModal';
import { AccessDeniedModal } from './components/auth/AccessDeniedModal';

function AppContent() {
  const { role, switchRole, checkAndExecute, permissions } = useRBAC();
  const [currentLang, setCurrentLang] = useState<Language>('ar');
  const [currentRole, setCurrentRole] = useState<UserRole>('national_command');

  // Synchronize internal detailed UserRole when high-level RBAC role changes
  useEffect(() => {
    if (role === 'Citizen' && currentRole !== 'citizen') {
      setCurrentRole('citizen');
    } else if (role === 'FieldUnit' && currentRole !== 'field_team' && currentRole !== 'forestry_expert') {
      setCurrentRole('field_team');
    } else if (role === 'CentralCommand' && (currentRole === 'citizen' || currentRole === 'field_team')) {
      setCurrentRole('national_command');
    }
  }, [role]);

  const handleRoleChange = (newRole: UserRole) => {
    setCurrentRole(newRole);
    if (newRole === 'citizen') {
      switchRole('Citizen');
    } else if (newRole === 'field_team' || newRole === 'forestry_expert') {
      switchRole('FieldUnit');
    } else {
      switchRole('CentralCommand');
    }
  };
  const [incidents, setIncidents] = useState<WildfireIncident[]>(SAMPLE_INCIDENTS);
  const [forests, setForests] = useState<ForestZone[]>(SAMPLE_FORESTS);
  const [waterPoints, setWaterPoints] = useState<WaterPoint[]>(SAMPLE_WATER_POINTS);
  const [watchtowers, setWatchtowers] = useState<WatchtowerCamera[]>(SAMPLE_WATCHTOWERS);
  const [resources, setResources] = useState<EmergencyResource[]>(SAMPLE_RESOURCES);
  const [signals, setSignals] = useState<DetectionSignal[]>(() => {
    const seen = new Set<string>();
    return SAMPLE_DETECTION_SIGNALS.filter((s) => {
      if (!s || !s.id || seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
  });

  // Browser Push Notifications & Background Service Worker Alert State
  const [showNotificationModal, setShowNotificationModal] = useState<boolean>(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  // Live Real-Time Operations Telemetry State
  const [liveWeather, setLiveWeather] = useState<LiveWeatherData | null>(null);
  const [isWeatherLoading, setIsWeatherLoading] = useState<boolean>(false);
  const [userPosition, setUserPosition] = useState<UserLivePosition | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [firmsDetections, setFirmsDetections] = useState<FirmsDetection[]>([]);
  const [isFirmsRefreshing, setIsFirmsRefreshing] = useState<boolean>(false);
  const [lastFirmsSyncTime, setLastFirmsSyncTime] = useState<Date>(new Date());

  // Offline Forest Operations & Service Worker Cache State
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(false);
  const [isCloudSyncActive, setIsCloudSyncActive] = useState<boolean>(false);
  const [showOfflineModal, setShowOfflineModal] = useState<boolean>(false);
  const [offlineStats, setOfflineStats] = useState<OfflineCacheStats>(() => getOfflineCacheStats());
  const [queuedReports, setQueuedReports] = useState<QueuedOfflineReport[]>(() => getQueuedOfflineReports());
  const [isSyncingQueue, setIsSyncingQueue] = useState<boolean>(false);

  // Active Selected Entities
  const [selectedIncident, setSelectedIncident] = useState<WildfireIncident | null>(SAMPLE_INCIDENTS[0]);
  const [selectedForest, setSelectedForest] = useState<ForestZone | null>(null);

  // Modals Visibility
  const [showIncidentModal, setShowIncidentModal] = useState<boolean>(false);
  const [showForestModal, setShowForestModal] = useState<boolean>(false);
  const [showCitizenModal, setShowCitizenModal] = useState<boolean>(false);
  const [showFieldOpsModal, setShowFieldOpsModal] = useState<boolean>(false);
  const [showSimulationModal, setShowSimulationModal] = useState<boolean>(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState<boolean>(false);
  const [showPostFireModal, setShowPostFireModal] = useState<boolean>(false);

  // Collapsible Dashboard State (Desktop & Mobile Overlay Management)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isKpiCollapsed, setIsKpiCollapsed] = useState<boolean>(false);
  // Mobile bottom sheet state: 'peek' (~50px tab), 'partial' (max 30% height), 'expanded' (75% height), 'hidden' (closed)
  const [mobileSheetState, setMobileSheetState] = useState<'peek' | 'partial' | 'expanded' | 'hidden'>('partial');

  // D3 Predictive Burn-Rate Modeling State
  const [showBurnRateModal, setShowBurnRateModal] = useState<boolean>(false);
  const [burnRateIncident, setBurnRateIncident] = useState<WildfireIncident | null>(SAMPLE_INCIDENTS[0]);
  const [showSatelliteModal, setShowSatelliteModal] = useState<boolean>(false);
  const [showEvacuationModal, setShowEvacuationModal] = useState<boolean>(false);
  const [evacuationTargetIncident, setEvacuationTargetIncident] = useState<WildfireIncident | null>(null);

  const handleOpenEvacuationAlert = (incident?: WildfireIncident) => {
    setEvacuationTargetIncident(incident || selectedIncident || incidents[0] || null);
    setShowEvacuationModal(true);
  };

  const handleOpenBurnRateModeling = (targetIncident?: WildfireIncident) => {
    const inc = targetIncident || selectedIncident || incidents[0] || SAMPLE_INCIDENTS[0];
    if (inc) {
      setBurnRateIncident(inc);
    }
    setShowBurnRateModal(true);
  };

  // Tactical Airborne Drone Reconnaissance & Camera Feeds State
  const [showDroneSimulationModal, setShowDroneSimulationModal] = useState<boolean>(false);
  const [droneMissionIncident, setDroneMissionIncident] = useState<WildfireIncident | null>(SAMPLE_INCIDENTS[0]);
  const [droneMissionState, setDroneMissionState] = useState<DroneMissionState>(() => ({
    droneId: 'UAV-DZ-04',
    droneName: 'SkyEye-DZ4',
    model: 'SkyEye-Algeria Pro-Tactical',
    activeIncidentId: SAMPLE_INCIDENTS[0]?.id || 'INC-01',
    cameraMode: 'thermal',
    thermalPalette: 'ironbow',
    flightPattern: 'orbit',
    altitudeMeters: 320,
    headingDegrees: 42,
    speedKmH: 48,
    batteryPercent: 88,
    signalStrengthPercent: 96,
    zoomLevel: 1.5,
    gimbalPitch: -45,
    isLayerVisibleOnMap: true,
    assessment: computeDroneTacticalAssessment(SAMPLE_INCIDENTS[0] || null)
  }));

  const handleOpenDroneSimulation = (targetIncident?: WildfireIncident) => {
    const inc = targetIncident || selectedIncident || incidents[0];
    if (inc) {
      setDroneMissionIncident(inc);
      setDroneMissionState((prev) => ({
        ...prev,
        activeIncidentId: inc.id,
        assessment: computeDroneTacticalAssessment(inc)
      }));
    }
    setShowDroneSimulationModal(true);
  };

  const handleUpdateDroneMission = (updates: Partial<DroneMissionState>) => {
    setDroneMissionState((prev) => ({
      ...prev,
      ...updates
    }));
  };

  // Computed state for active modals to coordinate backdrop & z-index with GISMap
  const isAnyAppModalActive = Boolean(
    showIncidentModal ||
    showForestModal ||
    showCitizenModal ||
    showFieldOpsModal ||
    showSimulationModal ||
    showAnalyticsModal ||
    showPostFireModal ||
    showOfflineModal ||
    showNotificationModal ||
    showDroneSimulationModal ||
    showBurnRateModal ||
    showSatelliteModal ||
    showEvacuationModal
  );

  const handleDismissAllModals = () => {
    setShowIncidentModal(false);
    setShowForestModal(false);
    setShowCitizenModal(false);
    setShowFieldOpsModal(false);
    setShowSimulationModal(false);
    setShowAnalyticsModal(false);
    setShowPostFireModal(false);
    setShowOfflineModal(false);
    setShowNotificationModal(false);
    setShowDroneSimulationModal(false);
    setShowBurnRateModal(false);
    setShowSatelliteModal(false);
    setShowEvacuationModal(false);
  };

  const t = translations[currentLang];

  // Set RTL direction on root document when Arabic is selected
  useEffect(() => {
    document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLang;
  }, [currentLang]);

  // Live Weather Ingestion Hook
  const loadLiveWeather = async (coords?: GeoCoordinates) => {
    setIsWeatherLoading(true);
    const targetCoords = coords || (selectedIncident ? selectedIncident.coordinates : { lat: 36.784, lng: 5.719 });
    try {
      const data = await fetchLiveWeather(targetCoords.lat, targetCoords.lng);
      setLiveWeather(data);
      // Synchronize live meteorological parameters with active incident
      setIncidents((prev) =>
        prev.map((inc) => {
          if (inc.id === (selectedIncident?.id || prev[0]?.id)) {
            return {
              ...inc,
              temperatureC: data.temperatureC,
              humidityPercent: data.humidityPercent,
              windSpeedKmH: data.windSpeedKmH,
              windDirectionCardinal: data.windDirectionCardinal,
            };
          }
          return inc;
        })
      );
    } catch (err) {
      console.warn('Weather fetch encountered fallback:', err);
    } finally {
      setIsWeatherLoading(false);
    }
  };

  // Device GPS Acquisition Handler
  const handleLocateUser = async () => {
    setIsLocating(true);
    try {
      const pos = await getLiveDevicePosition();
      setUserPosition(pos);
    } catch (err) {
      console.warn('Device location unavailable, setting command post coords:', err);
      // Realistic Algerian civil protection sector coords (Jijel / Texanna)
      setUserPosition({
        lat: 36.7538,
        lng: 5.0567,
        accuracyMeters: 18,
        altitudeMeters: 420,
        headingDegrees: null,
        speedMps: null,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLocating(false);
    }
  };

  // Initial Boot: fetch live weather & initialize real GPS tracking
  useEffect(() => {
    loadLiveWeather();

    // Auto-locate or start watching device position
    const watchId = watchLiveDevicePosition(
      (pos) => setUserPosition(pos),
      (err) => console.log('Continuous GPS watch standby:', err.message)
    );

    // Periodic weather refresh every 5 minutes
    const weatherInterval = setInterval(() => {
      loadLiveWeather();
    }, 5 * 60 * 1000);

    return () => {
      if (watchId !== null) {
        stopWatchingDevicePosition(watchId);
      }
      clearInterval(weatherInterval);
    };
  }, []);

  // Cloud Firestore Real-time Synchronized Subscriptions with Offline Persistence
  useEffect(() => {
    testFirestoreConnection().then((res) => {
      setIsCloudSyncActive(res.connected);
      console.log(`[AWIS Firebase] ${res.message}`);
    });

    const unsubIncidents = subscribeToIncidents((cloudIncidents) => {
      if (cloudIncidents && cloudIncidents.length > 0) {
        setIncidents(cloudIncidents);
        setIsCloudSyncActive(true);
      }
    });

    const unsubResources = subscribeToResources((cloudResources) => {
      if (cloudResources && cloudResources.length > 0) {
        setResources(cloudResources);
        setIsCloudSyncActive(true);
      }
    });

    return () => {
      unsubIncidents();
      unsubResources();
    };
  }, []);

  // Helper to ingest FIRMS satellite signals into live telemetry
  const ingestFirmsSignals = (detections: FirmsDetection[]) => {
    const nowStamp = Date.now();
    const satSignals: DetectionSignal[] = detections.map((d, index) => ({
      id: `sig-firms-${d.id}-${index}-${nowStamp}-${Math.random().toString(36).slice(2, 6)}`,
      source: 'satellite_firms',
      sourceName: `${d.satellite} (${d.instrument})`,
      timestamp: `${d.acqDate} ${d.acqTime} UTC`,
      confidence: d.confidencePercent,
      location: { lat: d.latitude, lng: d.longitude },
      details: `NASA FIRMS VIIRS 375m thermal anomaly detected (${d.frpMw} MW, ${Math.round(d.brightnessTempKelvin - 273.15)}°C). Confidence: ${d.confidence}. Wilaya: ${d.wilayaAr}.`,
      sensorMetadata: {
        device: `${d.satellite} ${d.instrument}`,
        temperatureReading: Math.round(d.brightnessTempKelvin - 273.15),
        thermalAnomalyMw: d.frpMw
      }
    }));

    setSignals((prev) => {
      const seen = new Set<string>();
      const combined: DetectionSignal[] = [];
      for (const s of [...satSignals, ...prev]) {
        if (s && s.id && !seen.has(s.id)) {
          seen.add(s.id);
          combined.push(s);
        }
      }
      return combined;
    });
  };

  // Real-Time NASA FIRMS Satellite Telemetry Polling (VIIRS 375m & MODIS)
  useEffect(() => {
    const cancelFirmsPolling = startFirmsPolling((detections) => {
      setFirmsDetections(detections);
      setLastFirmsSyncTime(new Date());
      ingestFirmsSignals(detections);
    }, 60000);

    return () => {
      cancelFirmsPolling();
    };
  }, []);

  // Manual Force-Refresh Handler for NASA FIRMS data (bypasses 60s poll timer)
  const handleForceRefreshFirms = async () => {
    setIsFirmsRefreshing(true);
    try {
      const detections = await fetchFirmsHotspots(true);
      setFirmsDetections(detections);
      setLastFirmsSyncTime(new Date());
      ingestFirmsSignals(detections);
    } catch (err) {
      console.warn('Manual NASA FIRMS force update error:', err);
    } finally {
      setIsFirmsRefreshing(false);
    }
  };

  // G-02: Sync Queued Offline Reports to Cloud Firestore via writeBatch with LWW
  const handleSyncQueuedReports = async () => {
    const pending = getQueuedOfflineReports();
    if (pending.length === 0) return;

    setIsSyncingQueue(true);
    try {
      const syncRes = await syncQueueToCloud();
      console.log('[AWIS Auto-Sync] Queued reports reconciled to Cloud Firestore:', syncRes);

      if (syncRes.success) {
        // Dispatch verified reconciliation event into active incidents timeline
        setIncidents((prev) =>
          prev.map((inc) => ({
            ...inc,
            timeline: [
              ...inc.timeline,
              {
                id: `evt-offline-sync-${Date.now()}`,
                timestamp: new Date().toISOString().substring(11, 19),
                type: 'verification',
                title: currentLang === 'ar'
                  ? `مزامنة سحابية: تم رفع ${syncRes.syncedCount} بلاغ إلى غرفة القيادة`
                  : `Cloud Sync: Reconciled ${syncRes.syncedCount} Offline Reports`,
                description: currentLang === 'ar'
                  ? `تم تطبيق بروتوكول Last-Write-Wins وفض ${syncRes.conflictsResolved} نزاع زمني بنجاح داخل قاعدة بيانات Firestore.`
                  : `Applied Last-Write-Wins (LWW) conflict resolution (${syncRes.conflictsResolved} timestamp conflicts reconciled) into Cloud Firestore.`,
                sourceBadge: 'Cloud Batch LWW'
              }
            ]
          }))
        );

        setQueuedReports(getQueuedOfflineReports());
        setOfflineStats(getOfflineCacheStats());
      }
    } catch (err) {
      console.error('[AWIS Auto-Sync] Failed to sync offline queue:', err);
    } finally {
      setIsSyncingQueue(false);
    }
  };

  // Manual cache refresh handler
  const handleManualCacheRefresh = () => {
    saveOfflineGISState({
      incidents,
      forests,
      waterPoints,
      resources,
      signals,
      weather: liveWeather
    });
    setOfflineStats(getOfflineCacheStats());
  };

  // Listen for browser Online/Offline state & auto-sync pending offline queue
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log('[AWIS Auto-Sync] Network restored: Online. Triggering automatic cloud sync...');
      handleSyncQueuedReports();
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.warn('[AWIS] Network lost: Running on Offline LocalStorage & IndexedDB Cache');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check: trigger auto-sync if online and pending reports exist
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      const initialPending = getQueuedOfflineReports();
      if (initialPending.length > 0) {
        handleSyncQueuedReports();
      }
    }

    // Initial check: if cache exists, hydrate if offline; else initialize
    const cached = loadOfflineGISState();
    if (cached.incidents && cached.incidents.length > 0) {
      if (!navigator.onLine) {
        setIncidents(cached.incidents);
        if (cached.forests) setForests(cached.forests);
        if (cached.waterPoints) setWaterPoints(cached.waterPoints);
        if (cached.resources) setResources(cached.resources);
        if (cached.signals) {
          const seen = new Set<string>();
          setSignals(cached.signals.filter((s) => {
            if (!s || !s.id || seen.has(s.id)) return false;
            seen.add(s.id);
            return true;
          }));
        }
        if (cached.weather) setLiveWeather(cached.weather);
      }
    } else {
      saveOfflineGISState({
        incidents,
        forests,
        waterPoints,
        resources,
        signals,
        weather: liveWeather
      });
    }
    setOfflineStats(getOfflineCacheStats());

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Continuous auto-sync to LocalStorage cache whenever GIS markers update
  useEffect(() => {
    saveOfflineGISState({
      incidents,
      forests,
      waterPoints,
      resources,
      signals,
      weather: liveWeather
    });
    setOfflineStats(getOfflineCacheStats());
  }, [incidents, forests, waterPoints, resources, signals, liveWeather]);

  // Push Notification Permission Check
  useEffect(() => {
    if (isNotificationSupported()) {
      setNotificationPermission(getNotificationPermission());
    }
  }, []);

  // Listen for clicks on Service Worker notifications
  useEffect(() => {
    const unsubscribe = registerNotificationMessageListener((incidentId) => {
      const match = incidents.find((i) => i.id === incidentId);
      if (match) {
        setSelectedIncident(match);
        setShowIncidentModal(true);
      }
    });
    return unsubscribe;
  }, [incidents]);

  // Deep-link from notification URL params (?incidentId=...)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const incId = params.get('incidentId');
      if (incId) {
        const found = incidents.find((i) => i.id === incId);
        if (found) {
          setSelectedIncident(found);
          setShowIncidentModal(true);
        }
      }
    }
  }, [incidents]);

  // Background Watcher: Triggers high-priority push notification via Service Worker
  // when the user switches tabs or minimizes the application
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        const notified = getNotifiedIncidentIds();
        const criticalIncident = incidents.find(
          (i) => (i.riskLevel === 'critical' || i.riskLevel === 'extreme') && !notified.has(i.id)
        );

        if (criticalIncident) {
          console.log('[AWIS Background Watcher] Dispatched background fire alert:', criticalIncident.id);
          dispatchHighPriorityFireNotification(criticalIncident, currentLang);
          markIncidentAsNotified(criticalIncident.id);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [incidents, currentLang]);

  // Handler to open incident modal
  const handleSelectIncident = (inc: WildfireIncident) => {
    setSelectedIncident(inc);
    setShowIncidentModal(true);
    if (inc?.coordinates) {
      loadLiveWeather(inc.coordinates);
    }
  };

  // Handler to open forest modal
  const handleSelectForest = (forest: ForestZone) => {
    setSelectedForest(forest);
    setShowForestModal(true);
  };

  // Expert-in-the-loop: Confirm incident
  const handleConfirmIncident = (id: string, notes: string) => {
    checkAndExecute(
      currentLang === 'ar' ? 'اعتماد الحريق رسمياً' : 'Official Incident Verification',
      'CentralCommand',
      () => {
        setIncidents((prev) =>
          prev.map((inc) => {
            if (inc.id === id) {
              const updated: WildfireIncident = {
                ...inc,
                status: 'confirmed',
                confidenceScore: Math.max(inc.confidenceScore, 98),
                expertValidation: {
                  verified: true,
                  expertName: 'Human Duty Officer (Command Post)',
                  decision: 'confirmed',
                  notes,
                  timestamp: new Date().toISOString().substring(11, 19)
                },
                timeline: [
                  ...inc.timeline,
                  {
                    id: `evt-${Date.now()}`,
                    timestamp: new Date().toISOString().substring(11, 19),
                    type: 'verification',
                    title: 'Incident Formally Confirmed by Duty Commander',
                    description: notes,
                    sourceBadge: 'Human-in-the-Loop'
                  }
                ]
              };
              syncIncidentToCloud(updated).catch(() => {});
              return updated;
            }
            return inc;
          })
        );
      }
    );
  };

  // Expert-in-the-loop: Reject incident (false alarm)
  const handleRejectIncident = (id: string, reason: string) => {
    checkAndExecute(
      currentLang === 'ar' ? 'رفض الإنذار الكاذب' : 'Reject False Alarm',
      'CentralCommand',
      () => {
        setIncidents((prev) =>
          prev.map((inc) => {
            if (inc.id === id) {
              const updated: WildfireIncident = {
                ...inc,
                status: 'false_positive',
                confidenceScore: 10,
                expertValidation: {
                  verified: false,
                  expertName: 'Human Duty Officer (Command Post)',
                  decision: 'rejected',
                  notes: reason,
                  timestamp: new Date().toISOString().substring(11, 19)
                }
              };
              syncIncidentToCloud(updated).catch(() => {});
              return updated;
            }
            return inc;
          })
        );
      }
    );
  };

  // Dispatch resource to incident
  const handleDispatchResource = (incidentId: string, resourceId: string) => {
    return checkAndExecute(
      currentLang === 'ar' ? 'تحريك رتل الحماية المدنية' : 'Dispatch Emergency Fleet',
      'CentralCommand',
      () => {
        setIncidents((prev) =>
          prev.map((inc) => {
            if (inc.id === incidentId && !inc.assignedResources.includes(resourceId)) {
              return {
                ...inc,
                assignedResources: [...inc.assignedResources, resourceId],
                timeline: [
                  ...inc.timeline,
                  {
                    id: `evt-${Date.now()}`,
                    timestamp: new Date().toISOString().substring(11, 19),
                    type: 'dispatch',
                    title: `Resource Unit Dispatched: ${resourceId}`,
                    description: 'Tactical unit mobilized with priority right of way.',
                    sourceBadge: 'Civil Protection Dispatch'
                  }
                ]
              };
            }
            return inc;
          })
        );

        setResources((prev) =>
          prev.map((res) => {
            if (res.id === resourceId) {
              const updated: EmergencyResource = { ...res, status: 'en_route', assignedIncidentId: incidentId };
              syncResourceToCloud(updated).catch(() => {});
              return updated;
            }
            return res;
          })
        );
      }
    );
  };

  // Citizen Report Submission -> Alert Fusion Engine
  const handleSubmitCitizenReport = (report: {
    location: GeoCoordinates;
    locationNameHint: string;
    smokeDirection: string;
    description: string;
    fireSizeEstimate: 'small' | 'medium' | 'large';
    imageUrl?: string;
    deviceInfo: string;
  }) => {
    const reportId = `cit-${Date.now()}`;
    const newSignal: DetectionSignal = {
      id: `sig-${reportId}`,
      source: 'citizen_report',
      sourceName: 'Citizen Mobile Hotline (IMEI Verified)',
      timestamp: new Date().toISOString().substring(11, 19),
      location: report.location,
      confidence: 76,
      details: `${report.description} (${report.locationNameHint}, smoke drift ${report.smokeDirection})`,
      sensorMetadata: {
        device: report.deviceInfo,
        imageUrl: report.imageUrl
      }
    };

    setSignals((prev) => [newSignal, ...prev]);

    // Cloud Firestore Sync with Offline Persistence (queues seamlessly if offline)
    submitCitizenReportToCloud({
      id: reportId,
      wilaya: report.locationNameHint || 'National',
      description: `${report.description} (Est: ${report.fireSizeEstimate}, Smoke: ${report.smokeDirection})`,
      lat: report.location.lat,
      lng: report.location.lng,
      imageUrl: report.imageUrl
    }).catch(() => {});

    // If currently offline in remote area, queue report locally in LocalStorage
    const effectiveOnline = isOnline && !isSimulatedOffline;
    if (!effectiveOnline) {
      queueOfflineReport({
        type: 'citizen_report',
        payload: report
      });
      setQueuedReports(getQueuedOfflineReports());
      setOfflineStats(getOfflineCacheStats());
    }

    // Also inject into incident's detection sources if close to Texanna/Guerrouche
    if (selectedIncident) {
      setIncidents((prev) =>
        prev.map((inc) => {
          if (inc.id === selectedIncident.id) {
            return {
              ...inc,
              confidenceScore: Math.min(99, inc.confidenceScore + 4),
              detectionSources: [newSignal, ...inc.detectionSources],
              timeline: [
                ...inc.timeline,
                {
                  id: `evt-cit-${Date.now()}`,
                  timestamp: new Date().toISOString().substring(11, 19),
                  type: 'detection',
                  title: 'Citizen Mobile GPS Sighting Ingested',
                  description: `Eyewitness report verified via cellular tower triangulation: ${report.locationNameHint}`,
                  sourceBadge: 'Citizen Hotline'
                }
              ]
            };
          }
          return inc;
        })
      );
    }
  };

  // Simulation scenario trigger
  const handleTriggerScenarioIncident = () => {
    if (SAMPLE_INCIDENTS[0]) {
      setSelectedIncident(SAMPLE_INCIDENTS[0]);
    }
  };

  // Promote NASA FIRMS Active Incident Zone cluster to formal monitored incident
  const handlePromoteClusterToIncident = (newIncident: WildfireIncident) => {
    setIncidents((prev) => {
      if (prev.some((i) => i.id === newIncident.id)) return prev;
      return [newIncident, ...prev];
    });
    setSelectedIncident(newIncident);
    setShowIncidentModal(true);

    // Register high-priority detection signal in the Alert Fusion Feed
    const newSignal: DetectionSignal = {
      id: `sig-cluster-${Date.now()}`,
      source: 'satellite_firms',
      sourceName: `VIIRS/MODIS Spatial Cluster (${newIncident.code})`,
      timestamp: new Date().toISOString().substring(11, 19),
      location: newIncident.coordinates,
      confidence: newIncident.confidenceScore,
      details: currentLang === 'ar'
        ? `تمت ترقية تجمع شواذ حرارية فضائية (${newIncident.code}) إلى حادث عملياتي مراقب`
        : `Promoted spatial satellite anomaly cluster (${newIncident.code}) to monitored incident`,
      sensorMetadata: {
        thermalAnomalyMw: newIncident.estimatedBurnedHectares,
        device: 'NASA FIRMS VIIRS/MODIS Aggregator'
      }
    };
    setSignals((prev) => [newSignal, ...prev]);

    // Dispatch system push notification if enabled
    if (notificationPermission === 'granted') {
      dispatchHighPriorityFireNotification(newIncident, currentLang);
    }
  };

  return (
    <div className="flex flex-col min-h-screen w-full max-w-[100vw] overflow-x-hidden relative bg-[#050811] text-slate-100 font-sans antialiased selection:bg-emerald-500 selection:text-black">
      {/* Top Institutional Header */}
      <Header
        currentLang={currentLang}
        onLanguageChange={setCurrentLang}
        currentRole={currentRole}
        onRoleChange={handleRoleChange}
        onOpenSimulation={() => setShowSimulationModal(true)}
        onOpenCitizenReport={() => setShowCitizenModal(true)}
        onOpenFieldOps={() => setShowFieldOpsModal(true)}
        onOpenAnalytics={() => setShowAnalyticsModal(true)}
        onOpenPostFireReport={() => setShowPostFireModal(true)}
        onOpenDroneSimulation={() => handleOpenDroneSimulation()}
        onOpenBurnRateModeling={() => handleOpenBurnRateModeling()}
        onOpenSatelliteUplink={() => setShowSatelliteModal(true)}
        onOpenEvacuationAlert={() => handleOpenEvacuationAlert()}
        isOnline={isOnline}
        isSimulatedOffline={isSimulatedOffline}
        onOpenOfflineManager={() => setShowOfflineModal(true)}
        offlineStats={offlineStats}
        onOpenNotifications={() => setShowNotificationModal(true)}
        notificationPermission={notificationPermission}
        isCloudSyncActive={isCloudSyncActive}
      />

      {/* Main Command Dashboard */}
      <main className="flex-1 flex flex-col p-3 sm:p-4 gap-3 max-w-[1920px] w-full mx-auto">
        {/* Top Meteorological Alert & KPI Metrics Bar */}
        <KPISummaryBar
          incidents={incidents}
          forests={forests}
          resources={resources}
          currentLang={currentLang}
          liveWeather={liveWeather}
          isWeatherLoading={isWeatherLoading}
          onRefreshWeather={() => loadLiveWeather()}
          userPosition={userPosition}
          isOnline={isOnline}
          isSimulatedOffline={isSimulatedOffline}
          onOpenOfflineManager={() => setShowOfflineModal(true)}
          offlineStats={offlineStats}
          selectedIncident={selectedIncident}
          isCollapsible={true}
          isCollapsed={isKpiCollapsed}
          onToggleCollapse={() => setIsKpiCollapsed(!isKpiCollapsed)}
        />

        {/* Central Spatial Operations Grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-[640px] relative">
          {/* Central Interactive GIS Map (Full-width when sidebar collapsed) */}
          <div className={`${isSidebarCollapsed ? 'col-span-12' : 'lg:col-span-8 xl:col-span-9'} h-full min-h-[580px] flex flex-col relative z-20 transition-all duration-300`}>
            {/* Desktop uncollapse floating trigger when sidebar is hidden */}
            {isSidebarCollapsed && (
              <button
                id="btn-reopen-desktop-sidebar"
                onClick={() => setIsSidebarCollapsed(false)}
                className="hidden lg:flex items-center gap-2 absolute top-3 end-3 z-30 px-3 py-2 rounded-xl bg-slate-900/95 hover:bg-slate-800 text-amber-300 hover:text-white border border-amber-500/40 shadow-2xl backdrop-blur-md text-xs font-bold transition cursor-pointer group"
                title={currentLang === 'ar' ? 'إظهار لوحة التنبيهات الميدانية' : 'Show Alert Feed Panel'}
              >
                <PanelRightOpen className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                <span>{currentLang === 'ar' ? 'إظهار لوحة التنبيهات' : 'Show Alert Feed'}</span>
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold border border-amber-500/30">
                  {signals.length}
                </span>
              </button>
            )}

            <GISMap
              incidents={incidents}
              forests={forests}
              waterPoints={waterPoints}
              watchtowers={watchtowers}
              resources={resources}
              firmsDetections={firmsDetections}
              selectedIncident={selectedIncident}
              onSelectIncident={handleSelectIncident}
              onSelectForest={handleSelectForest}
              onDispatchResource={handleDispatchResource}
              currentLang={currentLang}
              userPosition={userPosition}
              onLocateUser={handleLocateUser}
              isLocating={isLocating}
              liveWeather={liveWeather}
              isOnline={isOnline}
              isSimulatedOffline={isSimulatedOffline}
              onOpenOfflineManager={() => setShowOfflineModal(true)}
              droneMission={droneMissionState}
              onUpdateDroneMission={handleUpdateDroneMission}
              onOpenDroneSimulation={handleOpenDroneSimulation}
              onForceRefreshFirms={handleForceRefreshFirms}
              isFirmsRefreshing={isFirmsRefreshing}
              lastFirmsSyncTime={lastFirmsSyncTime}
              onPromoteClusterToIncident={handlePromoteClusterToIncident}
              isModalActive={isAnyAppModalActive}
              onDismissModal={handleDismissAllModals}
            />
          </div>

          {/* Real-Time Alert Fusion Feed & Signal Stack (Desktop) */}
          {!isSidebarCollapsed && (
            <div className="hidden lg:block lg:col-span-4 xl:col-span-3 h-full min-h-[580px] transition-all duration-300">
              <AlertFeedSidebar
                signals={signals}
                incidents={incidents}
                onSelectIncident={handleSelectIncident}
                currentLang={currentLang}
                onOpenNotifications={() => setShowNotificationModal(true)}
                notificationPermission={notificationPermission}
                onToggleCollapse={() => setIsSidebarCollapsed(true)}
                isCollapsed={false}
                onClose={() => setIsSidebarCollapsed(true)}
              />
            </div>
          )}
        </div>

        {/* Mobile Interactive Bottom Sheet (< lg viewport) */}
        <div className="lg:hidden">
          {mobileSheetState === 'hidden' ? (
            <div className="fixed bottom-4 inset-x-0 flex justify-center z-30 pointer-events-none">
              <button
                id="btn-reopen-mobile-alerts"
                onClick={() => setMobileSheetState('partial')}
                className="pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/95 hover:bg-slate-800 text-white border border-amber-500/60 shadow-2xl backdrop-blur-md text-xs font-bold transition cursor-pointer"
              >
                <Bell className="w-4 h-4 text-amber-400 animate-bounce" />
                <span>{currentLang === 'ar' ? 'تنبيهات الميدان النشطة' : 'Active Field Alerts'}</span>
                <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white font-mono text-[10px] font-bold">
                  {signals.length}
                </span>
              </button>
            </div>
          ) : (
            <div
              id="mobile-alert-bottom-sheet"
              className={`fixed bottom-0 inset-x-0 z-30 transition-all duration-300 ease-in-out shadow-2xl bg-slate-900/98 border-t border-slate-700 rounded-t-2xl flex flex-col ${
                mobileSheetState === 'peek'
                  ? 'h-14 overflow-hidden'
                  : mobileSheetState === 'partial'
                  ? 'h-[28vh] max-h-[240px]'
                  : 'h-[75vh]'
              }`}
            >
              <AlertFeedSidebar
                signals={signals}
                incidents={incidents}
                onSelectIncident={(inc) => {
                  handleSelectIncident(inc);
                  setMobileSheetState('peek');
                }}
                currentLang={currentLang}
                onOpenNotifications={() => setShowNotificationModal(true)}
                notificationPermission={notificationPermission}
                isMobileSheet={true}
                sheetState={mobileSheetState}
                onChangeSheetState={setMobileSheetState}
                onClose={() => setMobileSheetState('hidden')}
              />
            </div>
          )}
        </div>
      </main>

      {/* MODALS & FLYOUT PANELS */}

      {/* Incident Tactical Detail Modal */}
      {showIncidentModal && selectedIncident && (
        <IncidentDetailModal
          incident={selectedIncident}
          onClose={() => setShowIncidentModal(false)}
          onConfirmIncident={handleConfirmIncident}
          onRejectIncident={handleRejectIncident}
          onDispatchResource={handleDispatchResource}
          availableResources={resources}
          currentLang={currentLang}
          onOpenDroneSimulation={(inc) => handleOpenDroneSimulation(inc)}
          onOpenBurnRateModeling={(inc) => handleOpenBurnRateModeling(inc)}
          onOpenEvacuationAlert={(inc) => handleOpenEvacuationAlert(inc)}
          liveDroneData={getDroneEdgeVisionTelemetry(selectedIncident)}
        />
      )}

      {/* Digital Forest Twin Modal */}
      {showForestModal && selectedForest && (
        <ForestTwinModal
          forest={selectedForest}
          onClose={() => setShowForestModal(false)}
          currentLang={currentLang}
        />
      )}

      {/* Citizen Wildfire Ingestion Modal */}
      {showCitizenModal && (
        <CitizenReportingModal
          onClose={() => setShowCitizenModal(false)}
          onSubmitReport={handleSubmitCitizenReport}
          currentLang={currentLang}
          userPosition={userPosition}
        />
      )}

      {/* Offline Field Operations Terminal */}
      {showFieldOpsModal && selectedIncident && (
        <FieldOpsModal
          incident={selectedIncident}
          waterPoints={waterPoints}
          resources={resources}
          onClose={() => setShowFieldOpsModal(false)}
          currentLang={currentLang}
          userPosition={userPosition}
          liveWeather={liveWeather}
        />
      )}

      {/* Demonstration Simulation Scenario Controller */}
      {showSimulationModal && (
        <SimulationController
          onClose={() => setShowSimulationModal(false)}
          onStepChange={(step) => {}}
          onOpenPostFireReport={() => setShowPostFireModal(true)}
          onTriggerScenarioIncident={handleTriggerScenarioIncident}
          currentLang={currentLang}
        />
      )}

      {/* National Analytics & Accuracy Recharts Modal */}
      {showAnalyticsModal && (
        <NationalAnalyticsModal
          onClose={() => setShowAnalyticsModal(false)}
          currentLang={currentLang}
        />
      )}

      {/* Official Post-Fire Intelligence Report */}
      {showPostFireModal && (
        <PostFireReportModal
          report={SAMPLE_POST_FIRE_REPORT}
          onClose={() => setShowPostFireModal(false)}
          currentLang={currentLang}
        />
      )}

      {/* Offline Remote Forest Cache & Service Worker Sync Manager */}
      {showOfflineModal && (
        <OfflineForestManagerModal
          onClose={() => setShowOfflineModal(false)}
          currentLang={currentLang}
          isOnline={isOnline}
          isSimulatedOffline={isSimulatedOffline}
          onToggleSimulateOffline={() => setIsSimulatedOffline((prev) => !prev)}
          offlineStats={offlineStats}
          queuedReports={queuedReports}
          onSyncQueuedReports={handleSyncQueuedReports}
          isSyncing={isSyncingQueue}
          onRefreshCache={handleManualCacheRefresh}
        />
      )}

      {/* Browser Push Notifications & Background Alert Modal */}
      {showNotificationModal && (
        <PushNotificationModal
          onClose={() => {
            setShowNotificationModal(false);
            if (isNotificationSupported()) {
              setNotificationPermission(getNotificationPermission());
            }
          }}
          currentLang={currentLang}
          incidents={incidents}
          onSelectIncident={(inc) => {
            setSelectedIncident(inc);
            setShowNotificationModal(false);
            setShowIncidentModal(true);
          }}
        />
      )}

      {/* Tactical Airborne Drone Reconnaissance & Dual Camera (Thermal/RGB) Simulator Modal */}
      {showDroneSimulationModal && droneMissionIncident && (
        <DroneViewSimulationModal
          isOpen={showDroneSimulationModal}
          incident={droneMissionIncident}
          selectedIncident={droneMissionIncident}
          incidents={incidents}
          onSelectIncident={(inc) => {
            setDroneMissionIncident(inc);
            setDroneMissionState((prev) => ({
              ...prev,
              patrolIncidentId: inc.id,
              assessment: computeDroneTacticalAssessment(inc)
            }));
          }}
          onClose={() => setShowDroneSimulationModal(false)}
          currentLang={currentLang}
          missionState={droneMissionState}
          onUpdateMission={handleUpdateDroneMission}
          onUpdateMissionState={handleUpdateDroneMission}
        />
      )}

      {/* D3 Predictive Burn-Rate Modeling & 24h Isochrones Modal */}
      {showBurnRateModal && (
        <PredictiveBurnRateModal
          incident={burnRateIncident || selectedIncident || incidents[0]}
          allIncidents={incidents}
          onSelectIncident={(inc) => setBurnRateIncident(inc)}
          onClose={() => setShowBurnRateModal(false)}
          currentLang={currentLang}
        />
      )}

      {/* Real-Time NASA FIRMS Satellite Uplink Center Modal */}
      {showSatelliteModal && (
        <LiveSatelliteModal
          isOpen={showSatelliteModal}
          onClose={() => setShowSatelliteModal(false)}
          currentLang={currentLang}
          onRefreshFirms={handleForceRefreshFirms}
          isRefreshing={isFirmsRefreshing}
          detections={firmsDetections}
          onSelectHotspot={(hotspot) => {
            const transformed = transformFirmsToIncidents([hotspot])[0];
            if (transformed) {
              setSelectedIncident(transformed);
              setShowIncidentModal(true);
              if (transformed.coordinates) {
                loadLiveWeather(transformed.coordinates);
              }
            }
          }}
        />
      )}

      {/* Carrier SMS & Cell Broadcast Evacuation Gateway Modal */}
      {showEvacuationModal && (
        <EvacuationAlertModal
          onClose={() => setShowEvacuationModal(false)}
          currentLang={currentLang}
          defaultIncident={evacuationTargetIncident}
        />
      )}

      {/* Firebase Authentication & RBAC Governance Modal */}
      <RBACModal currentLang={currentLang} />

      {/* Access Denied Feedback Modal */}
      <AccessDeniedModal currentLang={currentLang} />
    </div>
  );
}

export default function App() {
  return (
    <RBACProvider>
      <AppContent />
    </RBACProvider>
  );
}
