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
  GeoCoordinates 
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
import { translations } from './i18n/translations';

export default function App() {
  const [currentLang, setCurrentLang] = useState<Language>('ar');
  const [incidents, setIncidents] = useState<WildfireIncident[]>(SAMPLE_INCIDENTS);
  const [forests, setForests] = useState<ForestZone[]>(SAMPLE_FORESTS);
  const [waterPoints, setWaterPoints] = useState<WaterPoint[]>(SAMPLE_WATER_POINTS);
  const [watchtowers, setWatchtowers] = useState<WatchtowerCamera[]>(SAMPLE_WATCHTOWERS);
  const [resources, setResources] = useState<EmergencyResource[]>(SAMPLE_RESOURCES);
  const [signals, setSignals] = useState<DetectionSignal[]>(SAMPLE_DETECTION_SIGNALS);

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

  const t = translations[currentLang];

  // Set RTL direction on root document when Arabic is selected
  useEffect(() => {
    document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLang;
  }, [currentLang]);

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
      />

      {/* Main Command Dashboard */}
      <main className="flex-1 flex flex-col p-3 sm:p-4 gap-3 max-w-[1920px] w-full mx-auto">
        {/* Top Meteorological Alert & KPI Metrics Bar */}
        <KPISummaryBar
          incidents={incidents}
          forests={forests}
          resources={resources}
          currentLang={currentLang}
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
            />
          </div>

          {/* Real-Time Alert Fusion Feed & Signal Stack (4 cols on lg, 3 on xl) */}
          <div className="lg:col-span-4 xl:col-span-3 h-full min-h-[580px]">
            <AlertFeedSidebar
              signals={signals}
              incidents={incidents}
              onSelectIncident={handleSelectIncident}
              currentLang={currentLang}
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
        />
      )}

      {/* Offline Field Operations Terminal */}
      {showFieldOpsModal && selectedIncident && (
        <FieldOpsModal
          incident={selectedIncident}
          waterPoints={waterPoints}
          onClose={() => setShowFieldOpsModal(false)}
          currentLang={currentLang}
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
    </div>
  );
}
