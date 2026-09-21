import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Video,
  Camera,
  Layers,
  Crosshair,
  Flame,
  Wind,
  Compass,
  Battery,
  Wifi,
  Gauge,
  Sliders,
  Maximize2,
  Minimize2,
  RefreshCw,
  Download,
  AlertTriangle,
  Play,
  Pause,
  Shield,
  MapPin,
  Eye,
  CheckCircle,
  Clock,
  Radio,
  Sparkles,
  Zap,
  ChevronRight,
  Database
} from 'lucide-react';
import { 
  WildfireIncident, 
  DroneMissionState, 
  DroneCameraMode,
  DroneEdgeVisionTelemetry, 
  GeoCoordinates,
  Language 
} from '../../types';
import { 
  computeDroneTacticalAssessment, 
  THERMAL_PALETTES 
} from '../../services/droneReconService';
import { 
  saveDroneSnapshotIDB, 
  getDroneSnapshotsIDB, 
  deleteDroneSnapshotIDB, 
  DroneTacticalSnapshot 
} from '../../services/indexedDbService';

interface DroneMissionHUDProps {
  incident?: WildfireIncident | null;
  droneMissionState?: DroneMissionState | null;
  onUpdateDroneMission?: (updates: Partial<DroneMissionState>) => void;
  onClose?: () => void;
  currentLang?: Language;
  onSyncMapTarget?: (coords: GeoCoordinates) => void;
}

export type VideoStreamProtocol = 'WebRTC' | 'RTSP' | 'WHEP';

export const DroneMissionHUD: React.FC<DroneMissionHUDProps> = ({
  incident,
  droneMissionState,
  onUpdateDroneMission,
  onClose,
  currentLang = 'ar',
  onSyncMapTarget
}) => {
  // --- Stream & Camera States ---
  const [streamProtocol, setStreamProtocol] = useState<VideoStreamProtocol>('WebRTC');
  const [cameraMode, setCameraMode] = useState<DroneCameraMode>(
    droneMissionState?.cameraMode || 'thermal'
  );
  const [thermalPalette, setThermalPalette] = useState<keyof typeof THERMAL_PALETTES>(
    (droneMissionState?.thermalPalette as keyof typeof THERMAL_PALETTES) || 'ironbow'
  );
  const [isAiOverlayActive, setIsAiOverlayActive] = useState<boolean>(true);
  const [isIsothermActive, setIsIsothermActive] = useState<boolean>(true);
  const [isDeHazeActive, setIsDeHazeActive] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isFeedStreaming, setIsFeedStreaming] = useState<boolean>(true);

  // Optical Zoom state (1.0x to 8.0x)
  const [zoomLevel, setZoomLevel] = useState<number>(droneMissionState?.zoomLevel || 1.8);
  const [gimbalPitch, setGimbalPitch] = useState<number>(droneMissionState?.gimbalPitch || -42);
  const [gimbalRoll, setGimbalRoll] = useState<number>(0);
  const [gimbalYaw, setGimbalYaw] = useState<number>(18);

  // --- Snapshot Feedback & Drawer State ---
  const [isCapturingSnapshot, setIsCapturingSnapshot] = useState<boolean>(false);
  const [snapshotToast, setSnapshotToast] = useState<string | null>(null);
  const [showSnapshotsDrawer, setShowSnapshotsDrawer] = useState<boolean>(false);
  const [savedSnapshots, setSavedSnapshots] = useState<DroneTacticalSnapshot[]>([]);

  // Canvas & Simulation references
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hudContainerRef = useRef<HTMLDivElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Dynamic Telemetry Values (Simulated active flight telemetry)
  const [telemetryTick, setTelemetryTick] = useState<number>(0);
  const [activeAgl, setActiveAgl] = useState<number>(droneMissionState?.altitudeMeters || 320);
  const [activeSpeed, setActiveSpeed] = useState<number>(droneMissionState?.speedKmH || 46);
  const [activeHeading, setActiveHeading] = useState<number>(droneMissionState?.headingDegrees || 42);
  const [activeBattery, setActiveBattery] = useState<number>(droneMissionState?.batteryPercent || 87);
  const [activeSignal, setActiveSignal] = useState<number>(droneMissionState?.signalStrengthPercent || 96);

  // Simulated latency and FPS
  const [liveFps, setLiveFps] = useState<number>(streamProtocol === 'WebRTC' ? 59 : 30);
  const [liveLatencyMs, setLiveLatencyMs] = useState<number>(streamProtocol === 'WebRTC' ? 42 : streamProtocol === 'WHEP' ? 85 : 210);

  // Tactical Flame Assessment derived from D3 Flame Engine
  const tacticalAssessment = useMemo(() => {
    return computeDroneTacticalAssessment(incident);
  }, [incident]);

  // Compute Edge Vision AI Telemetry Object
  const edgeVisionTelemetry = useMemo<DroneEdgeVisionTelemetry>(() => {
    const coords = incident?.coordinates || { lat: 36.782, lng: 5.724 };
    const maxTemp = tacticalAssessment.maxHotspotTempC;
    const flameH = tacticalAssessment.flameHeightMeters;

    return {
      droneCallsign: droneMissionState?.droneId || 'DRONE-ALGER-ALPHA-02',
      flightSessionId: `DZ-RECON-${new Date().toISOString().slice(0, 10)}-${droneMissionState?.activeIncidentId || 'INC01'}`,
      timestamp: new Date().toISOString(),
      dronePosition: {
        lat: coords.lat - 0.0018,
        lng: coords.lng + 0.0012,
        altitudeAglMeters: activeAgl,
        headingDeg: activeHeading,
        gimbalPitchDeg: gimbalPitch
      },
      visionDetections: {
        fireFrontDetected: true,
        flameCentroidGeo: coords,
        flamePerimeterCoordinates: [
          [coords.lng - 0.0015, coords.lat - 0.0008],
          [coords.lng - 0.0005, coords.lat + 0.0012],
          [coords.lng + 0.0018, coords.lat + 0.0009],
          [coords.lng + 0.0012, coords.lat - 0.0011],
          [coords.lng - 0.0015, coords.lat - 0.0008]
        ],
        measuredFlameHeightMeters: flameH,
        peakRadiometricTempC: maxTemp,
        smokeVectorDirectionDeg: incident?.windDirectionDegrees ?? 225,
        smokeVelocityMps: Number(((incident?.windSpeedKmH ?? 28) / 3.6).toFixed(1))
      },
      streamUrls: {
        thermalRtc: 'wss://edge-vision.awis.dz/uav/ch4-lwir/webrtc',
        rgbRtc: 'wss://edge-vision.awis.dz/uav/ch4-optical/webrtc'
      },
      feedHealth: {
        fps: liveFps,
        latencyMs: liveLatencyMs,
        confidenceScorePercent: 94.6
      }
    };
  }, [incident, tacticalAssessment, activeAgl, activeHeading, gimbalPitch, liveFps, liveLatencyMs, droneMissionState]);

  // Load offline snapshots from IndexedDB
  const refreshStoredSnapshots = useCallback(async () => {
    try {
      const list = await getDroneSnapshotsIDB(incident?.id);
      setSavedSnapshots(list);
    } catch (err) {
      console.warn('Failed to load drone snapshots from IDB:', err);
    }
  }, [incident?.id]);

  useEffect(() => {
    refreshStoredSnapshots();
  }, [refreshStoredSnapshots]);

  // Periodic Telemetry Simulation Loop
  useEffect(() => {
    if (!isFeedStreaming) return;

    const interval = setInterval(() => {
      setTelemetryTick((prev) => prev + 1);
      setActiveHeading((prev) => (prev + 0.8) % 360);
      setActiveSpeed((prev) => Math.max(38, Math.min(54, prev + (Math.random() * 2 - 1))));
      setActiveAgl((prev) => Math.max(290, Math.min(350, prev + (Math.random() * 1.5 - 0.75))));

      // Battery slow drain
      setActiveBattery((prev) => Math.max(12, Number((prev - 0.01).toFixed(2))));

      // Slight jitter on latency
      setLiveLatencyMs(
        streamProtocol === 'WebRTC' 
          ? Math.round(38 + Math.random() * 8)
          : streamProtocol === 'WHEP'
          ? Math.round(80 + Math.random() * 14)
          : Math.round(200 + Math.random() * 25)
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [isFeedStreaming, streamProtocol]);

  // Synchronize cameraMode with parent if provided
  const handleToggleCameraMode = (mode: DroneCameraMode) => {
    setCameraMode(mode);
    onUpdateDroneMission?.({ cameraMode: mode });
  };

  const handlePaletteChange = (pal: keyof typeof THERMAL_PALETTES) => {
    setThermalPalette(pal);
    onUpdateDroneMission?.({ thermalPalette: pal });
  };

  // --- Real-Time Canvas Overlay & Video Simulation Engine ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      if (w === 0 || h === 0) return;

      ctx.clearRect(0, 0, w, h);

      // 1. Draw Base Video Stream Feed Representation
      const centerX = w / 2;
      const centerY = h / 2;
      const t = Date.now() / 1000;

      if (cameraMode === 'thermal') {
        // --- Radiometric LWIR Thermal Background Simulation ---
        const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
        if (thermalPalette === 'ironbow') {
          bgGrad.addColorStop(0, '#000004');
          bgGrad.addColorStop(0.3, '#1d0b38');
          bgGrad.addColorStop(0.7, '#3b0f53');
          bgGrad.addColorStop(1, '#05020c');
        } else if (thermalPalette === 'white_hot') {
          bgGrad.addColorStop(0, '#0f172a');
          bgGrad.addColorStop(0.5, '#1e293b');
          bgGrad.addColorStop(1, '#090d16');
        } else if (thermalPalette === 'black_hot') {
          bgGrad.addColorStop(0, '#e2e8f0');
          bgGrad.addColorStop(0.5, '#cbd5e1');
          bgGrad.addColorStop(1, '#94a3b8');
        } else {
          // Rainbow HC
          bgGrad.addColorStop(0, '#000033');
          bgGrad.addColorStop(0.5, '#000088');
          bgGrad.addColorStop(1, '#001144');
        }
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // Scanline & Sensor Noise Filter
        ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
        for (let y = 0; y < h; y += 4) {
          ctx.fillRect(0, y, w, 1.5);
        }

        // Draw Isothermal Heat Aura & Core Radiance
        const pulse = 1 + Math.sin(t * 4) * 0.05;
        const heatRad = Math.min(w, h) * 0.28 * pulse * (zoomLevel * 0.7);

        const flameGrad = ctx.createRadialGradient(
          centerX,
          centerY,
          5,
          centerX,
          centerY,
          heatRad
        );

        if (thermalPalette === 'ironbow') {
          flameGrad.addColorStop(0, '#ffffff'); // >800°C
          flameGrad.addColorStop(0.18, '#fef08a'); // 720°C
          flameGrad.addColorStop(0.38, '#f97316'); // 600°C
          flameGrad.addColorStop(0.65, '#b91c1c'); // 450°C
          flameGrad.addColorStop(0.85, '#6b21a8'); // 250°C
          flameGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        } else if (thermalPalette === 'white_hot') {
          flameGrad.addColorStop(0, '#ffffff');
          flameGrad.addColorStop(0.3, '#f1f5f9');
          flameGrad.addColorStop(0.6, '#94a3b8');
          flameGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
        } else if (thermalPalette === 'black_hot') {
          flameGrad.addColorStop(0, '#000000');
          flameGrad.addColorStop(0.3, '#1e293b');
          flameGrad.addColorStop(0.6, '#64748b');
          flameGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        } else {
          flameGrad.addColorStop(0, '#ffffff');
          flameGrad.addColorStop(0.2, '#ff0000');
          flameGrad.addColorStop(0.4, '#ffff00');
          flameGrad.addColorStop(0.7, '#00ff00');
          flameGrad.addColorStop(1, 'rgba(0, 0, 255, 0)');
        }

        ctx.fillStyle = flameGrad;
        ctx.beginPath();
        ctx.arc(centerX, centerY, heatRad, 0, Math.PI * 2);
        ctx.fill();

        // Secondary Hotspot embers
        const emberCount = 6;
        for (let i = 0; i < emberCount; i++) {
          const angle = (i * (Math.PI * 2) / emberCount) + t * 0.4;
          const dist = heatRad * (0.45 + (i % 3) * 0.2);
          const ex = centerX + Math.cos(angle) * dist;
          const ey = centerY + Math.sin(angle) * dist * 0.8;
          const eSize = (6 + (i % 4) * 4) * (zoomLevel * 0.6);

          ctx.fillStyle = thermalPalette === 'white_hot' ? '#ffffff' : thermalPalette === 'black_hot' ? '#0f172a' : '#fbbf24';
          ctx.beginPath();
          ctx.arc(ex, ey, eSize, 0, Math.PI * 2);
          ctx.fill();
        }

      } else {
        // --- 4K Optical RGB Natural Ground Footprint & Smoke De-Haze ---
        // Natural Forest Canopy Base
        const canopyGrad = ctx.createLinearGradient(0, 0, w, h);
        canopyGrad.addColorStop(0, '#1c2e1f');
        canopyGrad.addColorStop(0.5, '#142316');
        canopyGrad.addColorStop(1, '#0c160e');
        ctx.fillStyle = canopyGrad;
        ctx.fillRect(0, 0, w, h);

        // Scorched Carbon Ash Scar Behind
        ctx.fillStyle = 'rgba(15, 15, 18, 0.9)';
        ctx.beginPath();
        ctx.ellipse(centerX - 40, centerY + 20, 110, 60, Math.PI / 6, 0, Math.PI * 2);
        ctx.fill();

        // Billowing Smoke Plumes Drifting Downwind
        const smokePulse = Math.sin(t * 1.5) * 15;
        const smokeGrad = ctx.createRadialGradient(
          centerX + 50 + smokePulse,
          centerY - 60,
          10,
          centerX + 80,
          centerY - 90,
          160
        );
        smokeGrad.addColorStop(0, isDeHazeActive ? 'rgba(148, 163, 184, 0.42)' : 'rgba(148, 163, 184, 0.88)');
        smokeGrad.addColorStop(0.5, isDeHazeActive ? 'rgba(100, 116, 139, 0.28)' : 'rgba(100, 116, 139, 0.65)');
        smokeGrad.addColorStop(1, 'rgba(30, 41, 59, 0)');
        ctx.fillStyle = smokeGrad;
        ctx.beginPath();
        ctx.arc(centerX + 60, centerY - 70, 140, 0, Math.PI * 2);
        ctx.fill();

        // Optical Flame Base Glow
        const flameOptGrad = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, 90 * zoomLevel * 0.7);
        flameOptGrad.addColorStop(0, '#ffffff');
        flameOptGrad.addColorStop(0.2, '#fef08a');
        flameOptGrad.addColorStop(0.5, '#f97316');
        flameOptGrad.addColorStop(0.85, '#dc2626');
        flameOptGrad.addColorStop(1, 'rgba(220, 38, 38, 0)');
        ctx.fillStyle = flameOptGrad;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 90 * zoomLevel * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Draw Computer Vision Edge AI Overlay (Flame Base Polygon & Bounding Box)
      if (isAiOverlayActive) {
        const polyPoints = [
          { x: centerX - 85 * (zoomLevel * 0.8), y: centerY + 30 * (zoomLevel * 0.8) },
          { x: centerX - 30 * (zoomLevel * 0.8), y: centerY - 65 * (zoomLevel * 0.8) },
          { x: centerX + 75 * (zoomLevel * 0.8), y: centerY - 45 * (zoomLevel * 0.8) },
          { x: centerX + 95 * (zoomLevel * 0.8), y: centerY + 40 * (zoomLevel * 0.8) },
          { x: centerX + 15 * (zoomLevel * 0.8), y: centerY + 65 * (zoomLevel * 0.8) }
        ];

        // Animated Flame Base Polygon
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([8, 4]);
        ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';

        ctx.beginPath();
        polyPoints.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]); // Reset line dash

        // Draw Polygon Vertices with centimeter tags
        polyPoints.forEach((pt, idx) => {
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 9px monospace';
          ctx.fillText(`V${idx + 1}`, pt.x + 6, pt.y - 4);
        });

        // Phosphor Green Bounding Box with Edge Brackets
        const minX = Math.min(...polyPoints.map((p) => p.x)) - 14;
        const maxX = Math.max(...polyPoints.map((p) => p.x)) + 14;
        const minY = Math.min(...polyPoints.map((p) => p.y)) - 14;
        const maxY = Math.max(...polyPoints.map((p) => p.y)) + 14;
        const bW = maxX - minX;
        const bH = maxY - minY;
        const cornerLen = 14;

        ctx.strokeStyle = '#22c55e'; // Phosphor green
        ctx.lineWidth = 2;

        // Top-Left Bracket
        ctx.beginPath();
        ctx.moveTo(minX, minY + cornerLen);
        ctx.lineTo(minX, minY);
        ctx.lineTo(minX + cornerLen, minY);
        ctx.stroke();

        // Top-Right Bracket
        ctx.beginPath();
        ctx.moveTo(maxX - cornerLen, minY);
        ctx.lineTo(maxX, minY);
        ctx.lineTo(maxX, minY + cornerLen);
        ctx.stroke();

        // Bottom-Left Bracket
        ctx.beginPath();
        ctx.moveTo(minX, maxY - cornerLen);
        ctx.lineTo(minX, maxY);
        ctx.lineTo(minX + cornerLen, maxY);
        ctx.stroke();

        // Bottom-Right Bracket
        ctx.beginPath();
        ctx.moveTo(maxX - cornerLen, maxY);
        ctx.lineTo(maxX, maxY);
        ctx.lineTo(maxX, maxY - cornerLen);
        ctx.stroke();

        // Centroid AI Crosshair & Radiometric Tag
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 12, 0, Math.PI * 2);
        ctx.moveTo(centerX - 18, centerY);
        ctx.lineTo(centerX + 18, centerY);
        ctx.moveTo(centerX, centerY - 18);
        ctx.lineTo(centerX, centerY + 18);
        ctx.stroke();

        // AI Confidence & Flame Height Callout Badge
        const badgeX = minX;
        const badgeY = minY - 8;
        ctx.fillStyle = 'rgba(2, 6, 23, 0.9)';
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 1;
        ctx.fillRect(badgeX, badgeY - 24, 180, 22);
        ctx.strokeRect(badgeX, badgeY - 24, 180, 22);

        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(
          `AI: FLAME FRONT • ${(edgeVisionTelemetry.feedHealth.confidenceScorePercent).toFixed(1)}%`,
          badgeX + 6,
          badgeY - 12
        );

        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(
          `H: ${(edgeVisionTelemetry.visionDetections.measuredFlameHeightMeters).toFixed(1)}m | MAX: ${edgeVisionTelemetry.visionDetections.peakRadiometricTempC}°C`,
          badgeX + 6,
          badgeY - 2
        );
      }

      // 3. Central Tactical Telemetric Crosshair Reticle
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.65)';
      ctx.lineWidth = 1;

      // Outer Artificial Horizon Ring
      ctx.beginPath();
      ctx.arc(centerX, centerY, 70, 0, Math.PI * 2);
      ctx.stroke();

      // Pitch Ladder Marks (-20°, -10°, 0°, 10°, 20°)
      const pitchOffset = (gimbalPitch + 45) * 1.5;
      [-20, -10, 0, 10, 20].forEach((pMark) => {
        const lineY = centerY + (pMark * 2.2) + pitchOffset;
        if (lineY > centerY - 60 && lineY < centerY + 60) {
          ctx.beginPath();
          ctx.moveTo(centerX - 24, lineY);
          ctx.lineTo(centerX - 8, lineY);
          ctx.moveTo(centerX + 8, lineY);
          ctx.lineTo(centerX + 24, lineY);
          ctx.stroke();

          ctx.fillStyle = '#22c55e';
          ctx.font = '8px monospace';
          ctx.fillText(`${pMark}°`, centerX + 28, lineY + 3);
        }
      });

      // Roll indicator ticks
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate((gimbalRoll * Math.PI) / 180);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-16, 0);
      ctx.lineTo(16, 0);
      ctx.stroke();
      ctx.restore();

      if (isFeedStreaming) {
        animId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [
    cameraMode,
    thermalPalette,
    isAiOverlayActive,
    isDeHazeActive,
    zoomLevel,
    gimbalPitch,
    gimbalRoll,
    edgeVisionTelemetry,
    isFeedStreaming
  ]);

  // Adjust canvas resolution dynamically to match container bounding box
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = hudContainerRef.current;
      if (!canvas || !container) return;

      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isFullscreen]);

  // Handle Capture Tactical Snapshot & Save to IndexedDB
  const handleCaptureSnapshot = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsCapturingSnapshot(true);
    try {
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      const snapshotRecord: DroneTacticalSnapshot = {
        id: `SNAP-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString(),
        incidentId: incident?.id || 'INC-UNKNOWN',
        droneCallsign: edgeVisionTelemetry.droneCallsign,
        cameraMode,
        thermalPalette: cameraMode === 'thermal' ? thermalPalette : undefined,
        dataUrl,
        telemetry: {
          altitudeAglMeters: activeAgl,
          groundSpeedKmh: activeSpeed,
          gimbalPitchDeg: gimbalPitch,
          gimbalRollDeg: gimbalRoll,
          gimbalYawDeg: gimbalYaw,
          headingDeg: activeHeading,
          batteryPercent: activeBattery,
          signalPercent: activeSignal,
          peakRadiometricTempC: edgeVisionTelemetry.visionDetections.peakRadiometricTempC,
          flameHeightMeters: edgeVisionTelemetry.visionDetections.measuredFlameHeightMeters,
          confidenceScorePercent: edgeVisionTelemetry.feedHealth.confidenceScorePercent,
          fireFrontDetected: edgeVisionTelemetry.visionDetections.fireFrontDetected,
          streamProtocol,
          coordinates: {
            lat: edgeVisionTelemetry.dronePosition.lat,
            lng: edgeVisionTelemetry.dronePosition.lng
          }
        }
      };

      await saveDroneSnapshotIDB(snapshotRecord);
      await refreshStoredSnapshots();

      setSnapshotToast(
        currentLang === 'ar'
          ? `✓ تم حفظ اللقطة التكتيكية والتليمترية في قاعدة IndexedDB المحلية (${snapshotRecord.id})`
          : `✓ Tactical snapshot saved offline to IndexedDB (${snapshotRecord.id})`
      );
      setTimeout(() => setSnapshotToast(null), 4000);
    } catch (err) {
      console.error('Failed to capture and persist snapshot:', err);
    } finally {
      setIsCapturingSnapshot(false);
    }
  };

  const handleDeleteSnapshot = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteDroneSnapshotIDB(id);
    await refreshStoredSnapshots();
  };

  return (
    <div
      id="drone-mission-hud"
      ref={hudContainerRef}
      className={`relative flex flex-col bg-black text-slate-100 font-sans select-none overflow-hidden border border-emerald-950/80 shadow-2xl ${
        isFullscreen
          ? 'fixed inset-0 z-50 rounded-none'
          : 'w-full h-full min-h-[580px] rounded-xl'
      }`}
    >
      {/* --- TOP TACTICAL HUD STATUS BAR --- */}
      <div className="relative z-20 flex flex-wrap items-center justify-between px-3 py-2 bg-slate-950/90 border-b border-emerald-900/40 backdrop-blur-md text-xs font-mono">
        {/* Left: Callout & Aircraft ID */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/90 border border-emerald-500/50 text-emerald-400 font-bold">
            <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
            <span>{edgeVisionTelemetry.droneCallsign}</span>
          </div>

          <span className="hidden sm:inline-block text-slate-500">|</span>

          {/* Incident Association */}
          <div className="flex items-center gap-1 text-slate-300">
            <Flame className="w-3.5 h-3.5 text-rose-500" />
            <span className="font-semibold text-rose-300">
              {incident ? (currentLang === 'ar' ? incident.titleAr : incident.title) : 'DZ-HOTSPOT'}
            </span>
            <span className="text-[10px] px-1 py-0.2 rounded bg-rose-950 text-rose-400 border border-rose-800/40">
              {incident?.id || 'INC-01'}
            </span>
          </div>
        </div>

        {/* Center: Stream Protocol Toggle (WebRTC / RTSP / WHEP) */}
        <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
          {(['WebRTC', 'WHEP', 'RTSP'] as const).map((proto) => (
            <button
              key={proto}
              onClick={() => setStreamProtocol(proto)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                streamProtocol === proto
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {proto}
            </button>
          ))}
          <span className="text-[9px] text-emerald-400 px-1 font-mono">
            {liveFps}FPS • {liveLatencyMs}ms
          </span>
        </div>

        {/* Right: Camera Mode Toggle & Window Controls */}
        <div className="flex items-center gap-2">
          {/* Dual Channel Switch (Thermal LWIR vs Optical 4K) */}
          <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[11px]">
            <button
              onClick={() => handleToggleCameraMode('thermal')}
              className={`flex items-center gap-1 px-2.5 py-0.5 rounded font-bold transition cursor-pointer ${
                cameraMode === 'thermal'
                  ? 'bg-rose-700 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Zap className="w-3 h-3" />
              <span>LWIR Thermal</span>
            </button>
            <button
              onClick={() => handleToggleCameraMode('rgb')}
              className={`flex items-center gap-1 px-2.5 py-0.5 rounded font-bold transition cursor-pointer ${
                cameraMode === 'rgb'
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Camera className="w-3 h-3" />
              <span>4K Optical</span>
            </button>
          </div>

          {/* Fullscreen & Close Controls */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen HUD'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-300 border border-slate-700 transition cursor-pointer text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* --- MAIN HUD VIEWPORT CONTAINER --- */}
      <div className="relative flex-1 w-full bg-black overflow-hidden flex items-center justify-center">
        {/* Render Canvas Overlay */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* --- CORNER OSD (ON-SCREEN DISPLAY) OVERLAYS --- */}

        {/* 1. TOP-LEFT: AIRCRAFT FLIGHT DYNAMICS & KINEMATICS */}
        <div className="absolute top-3 left-3 z-20 p-2.5 bg-slate-950/85 border border-emerald-500/40 rounded-lg text-emerald-400 font-mono text-xs space-y-1 backdrop-blur-sm pointer-events-auto">
          <div className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider flex items-center gap-1 border-b border-emerald-950 pb-1">
            <Gauge className="w-3 h-3" />
            <span>FLIGHT TELEMETRY</span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 text-[11px]">
            <div>AGL: <strong className="text-white">{Math.round(activeAgl)}m</strong></div>
            <div>SPD: <strong className="text-white">{Math.round(activeSpeed)} km/h</strong></div>
            <div>HDG: <strong className="text-white">{Math.round(activeHeading)}°</strong></div>
            <div>ZOOM: <strong className="text-sky-300">{zoomLevel.toFixed(1)}x</strong></div>
          </div>
          <div className="flex items-center justify-between text-[10px] pt-1 text-slate-300 border-t border-emerald-950">
            <span className="flex items-center gap-1">
              <Battery className={`w-3 h-3 ${activeBattery < 25 ? 'text-rose-500 animate-pulse' : 'text-emerald-400'}`} />
              {activeBattery}%
            </span>
            <span className="flex items-center gap-1">
              <Wifi className="w-3 h-3 text-emerald-400" />
              {activeSignal}%
            </span>
          </div>
        </div>

        {/* 2. TOP-RIGHT: GIMBAL ORIENTATION & OPTICAL SENSORS */}
        <div className="absolute top-3 right-3 z-20 p-2.5 bg-slate-950/85 border border-sky-500/40 rounded-lg text-sky-400 font-mono text-xs space-y-1 backdrop-blur-sm pointer-events-auto">
          <div className="text-[10px] text-sky-500 font-bold uppercase tracking-wider flex items-center gap-1 border-b border-sky-950 pb-1">
            <Compass className="w-3 h-3" />
            <span>GIMBAL & OPTICS</span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 text-[11px]">
            <div>PITCH: <strong className="text-white">{gimbalPitch}°</strong></div>
            <div>ROLL: <strong className="text-white">{gimbalRoll}°</strong></div>
            <div>YAW: <strong className="text-white">{gimbalYaw}°</strong></div>
            <div>PALETTE: <strong className="text-emerald-300 uppercase">{thermalPalette}</strong></div>
          </div>
          <div className="flex items-center gap-2 pt-1 border-t border-sky-950 text-[10px]">
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={isIsothermActive}
                onChange={(e) => setIsIsothermActive(e.target.checked)}
                className="accent-sky-500 rounded"
              />
              <span>Isotherm</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={isDeHazeActive}
                onChange={(e) => setIsDeHazeActive(e.target.checked)}
                className="accent-sky-500 rounded"
              />
              <span>De-Haze</span>
            </label>
          </div>
        </div>

        {/* 3. BOTTOM-LEFT: THERMODYNAMICS & TARGET FIRE CORE INTENSITY */}
        <div className="absolute bottom-14 left-3 z-20 p-2.5 bg-slate-950/90 border border-rose-500/50 rounded-lg text-rose-300 font-mono text-xs space-y-1 backdrop-blur-sm pointer-events-auto">
          <div className="text-[10px] text-rose-400 font-bold uppercase tracking-wider flex items-center justify-between border-b border-rose-950 pb-1">
            <span className="flex items-center gap-1">
              <Flame className="w-3 h-3 text-rose-500" />
              FIRE DYNAMICS & INTENSITY
            </span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800">
              {tacticalAssessment.intensityClass}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 text-[11px]">
            <div>CORE TEMP: <strong className="text-rose-400 text-sm">{edgeVisionTelemetry.visionDetections.peakRadiometricTempC}°C</strong></div>
            <div>FRONT TEMP: <strong className="text-orange-300">{tacticalAssessment.flameFrontTempC}°C</strong></div>
            <div>FRP POWER: <strong className="text-amber-300">{tacticalAssessment.fireRadiativePowerMw} MW</strong></div>
            <div>SPREAD RATE: <strong className="text-emerald-300">{tacticalAssessment.spreadRateMMin} m/min</strong></div>
            <div>FLAME HEIGHT: <strong className="text-yellow-300">{tacticalAssessment.flameHeightMeters}m</strong></div>
            <div>SMOKE VEC: <strong className="text-slate-300">{edgeVisionTelemetry.visionDetections.smokeVectorDirectionDeg}° @ {edgeVisionTelemetry.visionDetections.smokeVelocityMps}m/s</strong></div>
          </div>

          {/* Sync With GIS Map Button */}
          {tacticalAssessment.recommendedDropPoint && onSyncMapTarget && (
            <button
              onClick={() => onSyncMapTarget(tacticalAssessment.recommendedDropPoint!)}
              className="mt-1 w-full flex items-center justify-center gap-1.5 py-1 px-2 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 font-bold text-[10px] transition cursor-pointer"
            >
              <MapPin className="w-3 h-3 text-cyan-400" />
              <span>{currentLang === 'ar' ? 'توجيه الهدف للخريطة (نقطة الإسقاط)' : 'Sync Canadair Drop Target to Map'}</span>
            </button>
          )}
        </div>

        {/* 4. BOTTOM-RIGHT: CAMERA & EDGE VISION CONTROLS */}
        <div className="absolute bottom-14 right-3 z-20 p-2.5 bg-slate-950/90 border border-slate-700 rounded-lg text-slate-300 font-mono text-xs space-y-2 backdrop-blur-sm pointer-events-auto w-64">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800 pb-1">
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3 text-emerald-400" />
              VISION CONTROLS
            </span>
            <button
              onClick={() => setIsAiOverlayActive(!isAiOverlayActive)}
              className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                isAiOverlayActive ? 'bg-emerald-950 text-emerald-300 border border-emerald-600' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {isAiOverlayActive ? 'AI ON' : 'AI OFF'}
            </button>
          </div>

          {/* Thermal Palette Selectors (Only shown in thermal mode) */}
          {cameraMode === 'thermal' && (
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400">Palette:</span>
              <div className="grid grid-cols-2 gap-1 text-[9px]">
                {(Object.keys(THERMAL_PALETTES) as Array<keyof typeof THERMAL_PALETTES>).map((key) => (
                  <button
                    key={key}
                    onClick={() => handlePaletteChange(key)}
                    className={`py-0.5 px-1 rounded border text-left truncate transition cursor-pointer ${
                      thermalPalette === key
                        ? 'border-emerald-500 text-emerald-300 bg-emerald-950/60 font-bold'
                        : 'border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {key.replace('_', ' ').toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Zoom Slider */}
          <div className="space-y-0.5">
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>Zoom Optics:</span>
              <span className="text-white font-bold">{zoomLevel.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="5.0"
              step="0.2"
              value={zoomLevel}
              onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
          </div>

          {/* Gimbal Pitch Slider */}
          <div className="space-y-0.5">
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>Gimbal Pitch:</span>
              <span className="text-white font-bold">{gimbalPitch}°</span>
            </div>
            <input
              type="range"
              min="-90"
              max="0"
              step="1"
              value={gimbalPitch}
              onChange={(e) => setGimbalPitch(parseInt(e.target.value, 10))}
              className="w-full accent-sky-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
          </div>
        </div>

        {/* Snapshot Notification Toast */}
        {snapshotToast && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-40 px-4 py-2 bg-emerald-950/95 border border-emerald-400 text-emerald-200 text-xs font-mono rounded-lg shadow-2xl backdrop-blur-md animate-in fade-in flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{snapshotToast}</span>
          </div>
        )}
      </div>

      {/* --- BOTTOM OPERATIONAL ACTION BAR --- */}
      <div className="relative z-20 flex flex-wrap items-center justify-between px-3 py-2 bg-slate-950 border-t border-slate-800 text-xs font-mono gap-2">
        {/* Play/Pause & Streaming Health */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFeedStreaming(!isFeedStreaming)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              isFeedStreaming
                ? 'bg-rose-950/80 text-rose-300 border border-rose-700/50 hover:bg-rose-900'
                : 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/50 hover:bg-emerald-900'
            }`}
          >
            {isFeedStreaming ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isFeedStreaming ? 'FREEZE FEED' : 'RESUME STREAM'}</span>
          </button>

          <div className="flex items-center gap-1.5 text-slate-400 text-[11px] px-2 py-1 rounded bg-slate-900 border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>UPLINK: 4G/LTE TACTICAL MILNET</span>
          </div>
        </div>

        {/* Offline Snapshot Capture & Local Storage Center */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCaptureSnapshot}
            disabled={isCapturingSnapshot}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition cursor-pointer shadow-md disabled:opacity-50"
            title="Take instantaneous snapshot and write frame & telemetry to IndexedDB"
          >
            <Camera className={`w-3.5 h-3.5 ${isCapturingSnapshot ? 'animate-spin' : ''}`} />
            <span>{currentLang === 'ar' ? 'التقاط لقطة تكتيكية' : 'Capture Snapshot'}</span>
          </button>

          <button
            onClick={() => setShowSnapshotsDrawer(!showSnapshotsDrawer)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 transition cursor-pointer"
            title="Open stored offline snapshots"
          >
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>Snapshots ({savedSnapshots.length})</span>
          </button>
        </div>
      </div>

      {/* --- OFFLINE SNAPSHOTS DRAWER (INDEXEDDB VIEWER) --- */}
      {showSnapshotsDrawer && (
        <div className="absolute inset-x-0 bottom-12 z-30 max-h-72 bg-slate-950/95 border-t border-emerald-800 backdrop-blur-xl p-3 text-xs overflow-y-auto space-y-2 shadow-2xl animate-in slide-in-from-bottom">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-white font-mono">
                {currentLang === 'ar' ? 'أرشيف اللقطات التكتيكية في IndexedDB (Offline Storage)' : 'Offline IndexedDB Tactical Snapshots'}
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                {savedSnapshots.length} {currentLang === 'ar' ? 'لقطات محفوظة' : 'frames stored'}
              </span>
            </div>
            <button
              onClick={() => setShowSnapshotsDrawer(false)}
              className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded hover:bg-slate-800"
            >
              ✕
            </button>
          </div>

          {savedSnapshots.length === 0 ? (
            <div className="p-6 text-center text-slate-500 font-mono text-xs">
              {currentLang === 'ar'
                ? 'لا توجد لقطات محفوظة حالياً في IndexedDB. اضغط على زر "التقاط لقطة تكتيكية" للحفظ الفوري.'
                : 'No snapshots stored in IndexedDB. Click "Capture Snapshot" to persist current frame.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {savedSnapshots.map((snap) => (
                <div
                  key={snap.id}
                  className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-emerald-500/60 transition space-y-1.5"
                >
                  <div className="relative aspect-video rounded overflow-hidden bg-black border border-slate-800">
                    <img
                      src={snap.dataUrl}
                      alt={snap.id}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-1 left-1 px-1 py-0.2 rounded bg-black/80 text-[9px] font-mono text-emerald-400 font-bold">
                      {snap.cameraMode.toUpperCase()}
                    </span>
                    <span className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-black/80 text-[9px] font-mono text-rose-300 font-bold">
                      {snap.telemetry.peakRadiometricTempC}°C
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>{new Date(snap.timestamp).toLocaleTimeString()}</span>
                    <span>AGL: {Math.round(snap.telemetry.altitudeAglMeters)}m</span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono pt-1 border-t border-slate-800">
                    <span className="text-slate-300 truncate max-w-[120px]">
                      {snap.id}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <a
                        href={snap.dataUrl}
                        download={`${snap.id}.jpg`}
                        className="p-1 rounded hover:bg-slate-800 text-sky-400 hover:text-sky-200"
                        title="Download Image"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={(e) => handleDeleteSnapshot(snap.id, e)}
                        className="p-1 rounded hover:bg-rose-950 text-rose-400 hover:text-rose-200"
                        title="Delete from IDB"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default DroneMissionHUD;
