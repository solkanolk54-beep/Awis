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
import { IncidentDetailModal } from './components/incident/IncidentDetailModal';
import { ForestTwinModal } from './components/forest/ForestTwinModal';
import { CitizenReportingModal } from './components/citizen/CitizenReportingModal';
import { FieldOpsModal } from './components/field/FieldOpsModal';
import { SimulationController } from './components/simulation/SimulationController';
import { NationalAnalyticsModal } from './components/analytics/NationalAnalyticsModal';
import { PostFireReportModal } from './components/reports/PostFireReportModal';
import { DroneViewSimulationModal } from './components/simulation/DroneViewSimulationModal';
import { computeDroneTacticalAssessment } from './services/droneReconService';
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

export default function App() {
  const [currentLang, setCurrentLang] = useState<Language>('ar');
  const [incidents, setIncidents] = useState<WildfireIncident[]>(SAMPLE_INCIDENTS);
  const [forests, setForests] = useState<ForestZone[]>(SAMPLE_FORESTS);
  const [waterPoints, setWaterPoints] = useState<WaterPoint[]>(SAMPLE_WATER_POINTS);
  const [watchtowers, setWatchtowers] = useState<WatchtowerCamera[]>(SAMPLE_WATCHTOWERS);
  const [resources, setResources] = useState<EmergencyResource[]>(SAMPLE_RESOURCES);
  const [signals, setSignals] = useState<DetectionSignal[]>(SAMPLE_DETECTION_SIGNALS);

  // Browser Push Notifications & Background Service Worker Alert State
  const [showNotificationModal, setShowNotificationModal] = useState<boolean>(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  // Live Real-Time Operations Telemetry State
  const [liveWeather, setLiveWeather] = useState<LiveWeatherData | null>(null);
  const [isWeatherLoading, setIsWeatherLoading] = useState<boolean>(false);
  const [userPosition, setUserPosition] = useState<UserLivePosition | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // Offline Forest Operations & Service Worker Cache State
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(false);
  const [showOfflineModal, setShowOfflineModal] = useState<boolean>(false);
  const [offlineStats, setOfflineStats] = useState<OfflineCacheStats>(getOfflineCacheStats);
  const [queuedReports, setQueuedReports] = useState<QueuedOfflineReport[]>(getQueuedOfflineReports);

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

  // Tactical Airborne Drone Reconnaissance & Camera Feeds State
  const [showDroneSimulationModal, setShowDroneSimulationModal] = useState<boolean>(false);
  const [droneMissionIncident, setDroneMissionIncident] = useState<WildfireIncident | null>(SAMPLE_INCIDENTS[0]);
  const [droneMissionState, setDroneMissionState] = useState<DroneMissionState>(() => ({
    droneId: 'UAV-DZ-04',
    model: 'SkyEye-Algeria Pro-Tactical',
    patrolIncidentId: SAMPLE_INCIDENTS[0]?.id || 'INC-01',
    cameraMode: 'thermal',
    altitudeMeters: 320,
    headingDegrees: 42,
    batteryPercent: 88,
    gimbalPitchDegrees: -45,
    zoomLevel: 1.5,
    isLayerVisibleOnMap: true,
    isDehazeActive: true,
    assessment: computeDroneTacticalAssessment(SAMPLE_INCIDENTS[0] || ({} as WildfireIncident))
  }));

  const handleOpenDroneSimulation = (targetIncident?: WildfireIncident) => {
    const inc = targetIncident || selectedIncident || incidents[0];
    if (inc) {
      setDroneMissionIncident(inc);
      setDroneMissionState((prev) => ({
        ...prev,
        patrolIncidentId: inc.id,
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
        timestamp: Date.now(),
        isSimulated: false
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

  // Sync Queued Offline Reports when internet is restored
  const handleSyncQueuedReports = () => {
    const pending = getQueuedOfflineReports();
    if (pending.length === 0) return;

    // Dispatch queued items into active incidents timeline
    setIncidents((prev) =>
      prev.map((inc) => ({
        ...inc,
        timeline: [
          ...inc.timeline,
          {
            id: `evt-offline-sync-${Date.now()}`,
            timestamp: new Date().toISOString().substring(11, 19),
            title: `Synced ${pending.length} Offline Field Reports`,
            description: 'Cached field intelligence successfully reconciled with Central Command.',
            sourceBadge: 'Offline Buffer Reconciled'
          }
        ]
      }))
    );

    clearQueuedOfflineReports();
    setQueuedReports([]);
    setOfflineStats(getOfflineCacheStats());
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

  // Listen for browser Online/Offline state & hydrate offline cache
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log('[AWIS] Network restored: Online');
      handleSyncQueuedReports();
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.warn('[AWIS] Network lost: Running on Offline LocalStorage & ServiceWorker Cache');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check: if cache exists, hydrate if offline; else initialize
    const cached = loadOfflineGISState();
    if (cached.incidents && cached.incidents.length > 0) {
      if (!navigator.onLine) {
        setIncidents(cached.incidents);
        if (cached.forests) setForests(cached.forests);
        if (cached.waterPoints) setWaterPoints(cached.waterPoints);
        if (cached.resources) setResources(cached.resources);
        if (cached.signals) setSignals(cached.signals);
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
  };

  // Handler to open forest modal
  const handleSelectForest = (forest: ForestZone) => {
    setSelectedForest(forest);
    setShowForestModal(true);
  };

  // Expert-in-the-loop: Confirm incident
  const handleConfirmIncident = (id: string, notes: string) => {
    setIncidents((prev) =>
      prev.map((inc) => {
        if (inc.id === id) {
          return {
            ...inc,
            status: 'confirmed',
            confidenceScore: Math.max(inc.confidenceScore, 98),
            expertValidation: {
              validatedBy: 'Human Duty Officer (Command Post)',
              validationTimestamp: new Date().toISOString().substring(11, 19),
              verdict: 'confirmed',
              notes
            },
            timeline: [
              ...inc.timeline,
              {
                id: `evt-${Date.now()}`,
                timestamp: new Date().toISOString().substring(11, 19),
                title: 'Incident Formally Confirmed by Duty Commander',
                description: notes,
                sourceBadge: 'Human-in-the-Loop'
              }
            ]
          };
        }
        return inc;
      })
    );
  };

  // Expert-in-the-loop: Reject incident (false alarm)
  const handleRejectIncident = (id: string, reason: string) => {
    setIncidents((prev) =>
      prev.map((inc) => {
        if (inc.id === id) {
          return {
            ...inc,
            status: 'controlled',
            confidenceScore: 10,
            expertValidation: {
              validatedBy: 'Human Duty Officer (Command Post)',
              validationTimestamp: new Date().toISOString().substring(11, 19),
              verdict: 'rejected_false_alarm',
              notes: reason
            }
          };
        }
        return inc;
      })
    );
  };

  // Dispatch resource to incident
  const handleDispatchResource = (incidentId: string, resourceId: string) => {
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
          return { ...res, status: 'en_route', assignedIncidentId: incidentId };
        }
        return res;
      })
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
    const newSignal: DetectionSignal = {
      id: `sig-cit-${Date.now()}`,
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

  return (
    <div className="flex flex-col min-h-screen bg-[#050811] text-slate-100 font-sans antialiased selection:bg-emerald-500 selection:text-black">
      {/* Top Institutional Header */}
      <Header
        currentLang={currentLang}
        onLanguageChange={setCurrentLang}
        onOpenSimulation={() => setShowSimulationModal(true)}
        onOpenCitizenReport={() => setShowCitizenModal(true)}
        onOpenFieldOps={() => setShowFieldOpsModal(true)}
        onOpenAnalytics={() => setShowAnalyticsModal(true)}
        onOpenPostFireReport={() => setShowPostFireModal(true)}
        onOpenDroneSimulation={() => handleOpenDroneSimulation()}
        isOnline={isOnline}
        isSimulatedOffline={isSimulatedOffline}
        onOpenOfflineManager={() => setShowOfflineModal(true)}
        offlineStats={offlineStats}
        onOpenNotifications={() => setShowNotificationModal(true)}
        notificationPermission={notificationPermission}
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
        />

        {/* Central Spatial Operations Grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-[640px]">
          {/* Central Interactive GIS Map (8 cols on lg, 9 on xl) */}
          <div className="lg:col-span-8 xl:col-span-9 h-full min-h-[580px] flex flex-col">
            <GISMap
              incidents={incidents}
              forests={forests}
              waterPoints={waterPoints}
              watchtowers={watchtowers}
              resources={resources}
              selectedIncident={selectedIncident}
              onSelectIncident={handleSelectIncident}
              onSelectForest={handleSelectForest}
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
            />
          </div>

          {/* Real-Time Alert Fusion Feed & Signal Stack (4 cols on lg, 3 on xl) */}
          <div className="lg:col-span-4 xl:col-span-3 h-full min-h-[580px]">
            <AlertFeedSidebar
              signals={signals}
              incidents={incidents}
              onSelectIncident={handleSelectIncident}
              currentLang={currentLang}
              onOpenNotifications={() => setShowNotificationModal(true)}
              notificationPermission={notificationPermission}
            />
          </div>
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
          incident={droneMissionIncident}
          onClose={() => setShowDroneSimulationModal(false)}
          currentLang={currentLang}
          missionState={droneMissionState}
          onUpdateMissionState={handleUpdateDroneMission}
        />
      )}
    </div>
  );
}
