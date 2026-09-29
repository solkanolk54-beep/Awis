// AWIS — ALSAT 3D Interactive WebGL Globe & Orbital Constellation Simulator
// High-Fidelity Three.js Visualization for ALSAT-1B, ALSAT-2A, and ALSAT-2B orbits over Algeria & Mila Sector

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { 
  Globe, 
  Play, 
  Pause, 
  FastForward, 
  RotateCcw, 
  Crosshair, 
  Eye, 
  EyeOff, 
  Layers, 
  Compass, 
  Sparkles, 
  Satellite, 
  ChevronRight,
  Maximize2,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { AlsatSatelliteId, Language } from '../../types';
import { ALSAT_FLEET_REGISTRY, MILA_BBOX } from '../../services/alsatTrackingService';

export interface Alsat3DGlobeProps {
  currentLang?: Language;
  selectedSatelliteId?: AlsatSatelliteId | 'ALL';
  onSelectSatellite?: (id: AlsatSatelliteId | 'ALL') => void;
  className?: string;
}

// Converts spherical geographic coordinates (Latitude, Longitude) to 3D Cartesian Vector3
function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

/**
 * Procedurally generates a high-resolution, dark tactical Earth texture on an offscreen HTML5 canvas.
 * Outlines continents, oceans, graticules, and enhances Algeria & Mila with tactical GIS styling.
 */
function createTacticalEarthTexture(isMobile: boolean = false): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = isMobile ? 1024 : 2048;
  canvas.height = isMobile ? 512 : 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const fallbackCanvas = document.createElement('canvas');
    fallbackCanvas.width = 16;
    fallbackCanvas.height = 16;
    return new THREE.CanvasTexture(fallbackCanvas);
  }

  const w = canvas.width;
  const h = canvas.height;

  // 1. Deep Oceanic Space Radar Background
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, h);
  oceanGrad.addColorStop(0, '#06101e');
  oceanGrad.addColorStop(0.5, '#08172c');
  oceanGrad.addColorStop(1, '#050c18');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, w, h);

  // 2. Graticules (Latitude & Longitude grid lines)
  ctx.strokeStyle = 'rgba(6, 182, 212, 0.12)';
  ctx.lineWidth = 1;
  // Longitudes every 30 deg
  for (let lon = -180; lon <= 180; lon += 30) {
    const x = ((lon + 180) / 360) * w;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  // Latitudes every 30 deg
  for (let lat = -90; lat <= 90; lat += 30) {
    const y = ((90 - lat) / 180) * h;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Highlight Equator & Prime Meridian
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.28)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, h / 2);
  ctx.lineTo(w, h / 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(w / 2, 0);
  ctx.lineTo(w / 2, h);
  ctx.stroke();

  // Helper coordinate mapper
  const toX = (lng: number) => ((lng + 180) / 360) * w;
  const toY = (lat: number) => ((90 - lat) / 180) * h;

  // 3. Simplified Major Continental Landmass Outlines (Vector paths)
  ctx.fillStyle = '#0f2420'; // Dark tactical forest terrain
  ctx.strokeStyle = '#1a3d34';
  ctx.lineWidth = 1.5;

  // Africa & Mediterranean Basins
  ctx.beginPath();
  ctx.moveTo(toX(-5), toY(36));    // Gibraltar / North Morocco
  ctx.lineTo(toX(11), toY(37));   // North Tunisia
  ctx.lineTo(toX(25), toY(31));   // Egypt Coast
  ctx.lineTo(toX(34), toY(27));   // Red Sea North
  ctx.lineTo(toX(43), toY(12));   // Horn of Africa
  ctx.lineTo(toX(40), toY(-4));   // East Africa
  ctx.lineTo(toX(32), toY(-26));  // Mozambique
  ctx.lineTo(toX(20), toY(-34));  // South Africa Cape
  ctx.lineTo(toX(12), toY(-16));  // West Africa South
  ctx.lineTo(toX(8), toY(4));     // Gulf of Guinea
  ctx.lineTo(toX(-14), toY(12));  // Dakar / Senegal
  ctx.lineTo(toX(-17), toY(21));  // Mauritania
  ctx.lineTo(toX(-13), toY(28));  // Western Sahara
  ctx.lineTo(toX(-5), toY(36));   // Back to Morocco
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Europe Landmass
  ctx.beginPath();
  ctx.moveTo(toX(-9), toY(36));   // Iberia South
  ctx.lineTo(toX(-9), toY(43));   // Iberia North
  ctx.lineTo(toX(2), toY(47));    // France
  ctx.lineTo(toX(8), toY(54));    // Denmark
  ctx.lineTo(toX(18), toY(68));   // Scandinavia
  ctx.lineTo(toX(30), toY(70));   // North Russia
  ctx.lineTo(toX(40), toY(50));   // Black Sea North
  ctx.lineTo(toX(28), toY(41));   // Greece / Balkans
  ctx.lineTo(toX(14), toY(37));   // Italy
  ctx.lineTo(toX(0), toY(38));    // Western Med
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Americas (Simplified Silhouette)
  ctx.beginPath();
  ctx.moveTo(toX(-125), toY(48));
  ctx.lineTo(toX(-70), toY(46));
  ctx.lineTo(toX(-80), toY(25));
  ctx.lineTo(toX(-105), toY(20));
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(toX(-80), toY(10));
  ctx.lineTo(toX(-35), toY(-6));
  ctx.lineTo(toX(-55), toY(-35));
  ctx.lineTo(toX(-70), toY(-54));
  ctx.lineTo(toX(-75), toY(-18));
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Asia (Simplified)
  ctx.beginPath();
  ctx.moveTo(toX(45), toY(40));
  ctx.lineTo(toX(80), toY(70));
  ctx.lineTo(toX(140), toY(60));
  ctx.lineTo(toX(120), toY(30));
  ctx.lineTo(toX(80), toY(15));
  ctx.lineTo(toX(55), toY(25));
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 4. Detailed Algeria Polygon & Tell Atlas Highlight
  // Algeria borders: [-2.2° W to 12.0° E, 18.9° N to 37.1° N]
  ctx.save();
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 2.5;
  ctx.fillStyle = '#17362a'; // Richer tactical emerald green

  ctx.beginPath();
  ctx.moveTo(toX(-2.1), toY(35.1)); // Western border coastal
  ctx.lineTo(toX(1.5), toY(36.5));  // Algiers Bay west
  ctx.lineTo(toX(3.1), toY(36.8));  // Algiers capital
  ctx.lineTo(toX(6.3), toY(36.9));  // Mila / Jijel / Skikda coast
  ctx.lineTo(toX(8.5), toY(36.9));  // Annaba / El Kala
  ctx.lineTo(toX(8.6), toY(34.2));  // East Tunisia border
  ctx.lineTo(toX(9.8), toY(30.2));  // East border south
  ctx.lineTo(toX(11.9), toY(23.5)); // Djanet / Ghat
  ctx.lineTo(toX(5.0), toY(19.0));  // In Guezzam south point
  ctx.lineTo(toX(-4.8), toY(25.0)); // Tindouf west border
  ctx.lineTo(toX(-2.1), toY(35.1));
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Sahara Desert Gradient Shading (Golden amber warmth in the south)
  const saharaGrad = ctx.createLinearGradient(0, toY(34), 0, toY(20));
  saharaGrad.addColorStop(0, 'rgba(56, 38, 16, 0.0)');
  saharaGrad.addColorStop(0.3, 'rgba(180, 83, 9, 0.35)');
  saharaGrad.addColorStop(1, 'rgba(217, 119, 6, 0.50)');
  ctx.fillStyle = saharaGrad;
  ctx.fill();

  // Northern Forest Band (Atlas Tellien - High vegetation biomass)
  ctx.fillStyle = '#059669';
  ctx.beginPath();
  ctx.rect(toX(-2.0), toY(37.2), toX(8.5) - toX(-2.0), toY(35.0) - toY(37.2));
  ctx.fill();

  // 5. Target Beacon for Wilaya of Mila [36.475° N, 6.275° E]
  const milaX = toX(6.275);
  const milaY = toY(36.475);

  // Concentric radar target rings
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(milaX, milaY, 8, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(milaX, milaY, 16, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#10b981';
  ctx.beginPath();
  ctx.arc(milaX, milaY, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // Label for Mila
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px monospace';
  ctx.fillText('MILA (ميلة)', milaX + 18, milaY + 4);

  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = true;
  return texture;
}

export const Alsat3DGlobe: React.FC<Alsat3DGlobeProps> = ({
  currentLang = 'ar',
  selectedSatelliteId = 'ALL',
  onSelectSatellite,
  className = ''
}) => {
  const isAr = currentLang === 'ar';
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Simulation controls state
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(5); // 1x, 5x, 25x
  const [showSwathCones, setShowSwathCones] = useState<boolean>(true);
  const [showOrbits, setShowOrbits] = useState<boolean>(true);
  const [showAtmosphere, setShowAtmosphere] = useState<boolean>(true);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [activeFocus, setActiveFocus] = useState<'global' | 'mila' | 'ALSAT-1B' | 'ALSAT-2A' | 'ALSAT-2B'>('mila');
  const [activeTelemetry, setActiveTelemetry] = useState<{
    satId: AlsatSatelliteId;
    lat: number;
    lng: number;
    alt: number;
    distToMilaKm: number;
  }>({
    satId: 'ALSAT-2A',
    lat: 36.48,
    lng: 6.28,
    alt: 680,
    distToMilaKm: 42
  });

  // Internal Three.js instance references
  const threeState = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    globeMesh: THREE.Mesh;
    atmosphereMesh: THREE.Mesh;
    atmosphereGlowMesh: THREE.Mesh;
    milaMarker: THREE.Group;
    satellites: Record<AlsatSatelliteId, {
      orbitLine: THREE.LineLoop;
      satMesh: THREE.Group;
      swathCone: THREE.Mesh;
      groundSpot: THREE.Mesh;
      inclinationDeg: number;
      raanDeg: number;
      periodMinutes: number;
      altitudeKm: number;
      color: number;
      swathRadiusKm: number;
      phaseOffset: number;
    }>;
    animFrameId: number;
    simTime: number; // simulated elapsed minutes
  } | null>(null);

  // Initialize Three.js scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;
    const isMobile = width < 640;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060b14);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    // Position camera initially looking directly down at Algeria/Mila (lat ~36° N, lng ~6° E)
    camera.position.set(2.5, 7.5, 9.5);

    const renderer = new THREE.WebGLRenderer({ 
      antialias: !isMobile,
      powerPreference: 'high-performance',
      alpha: false 
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 2. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.rotateSpeed = 0.8;
    controls.zoomSpeed = 1.0;
    controls.minDistance = 6.2;
    controls.maxDistance = 24.0;
    controls.target.set(0, 0, 0);

    // 3. Lighting (Sunlight from the side to create authentic terminator day/night line)
    const ambientLight = new THREE.AmbientLight(0x405570, 1.2);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff7e6, 2.5);
    sunLight.position.set(15, 10, 15);
    scene.add(sunLight);

    // Subtle blue rim light from opposite angle
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.1);
    rimLight.position.set(-15, -5, -15);
    scene.add(rimLight);

    // 4. 3D Earth Globe
    const globeRadius = 5.0;
    const sphereSegments = isMobile ? 36 : 64;
    const globeGeometry = new THREE.SphereGeometry(globeRadius, sphereSegments, sphereSegments);
    const earthTexture = createTacticalEarthTexture(isMobile);

    const globeMaterial = new THREE.MeshStandardMaterial({
      map: earthTexture,
      roughness: 0.75,
      metalness: 0.15,
      bumpScale: 0.05
    });

    const globeMesh = new THREE.Mesh(globeGeometry, globeMaterial);
    scene.add(globeMesh);

    // 5. Atmosphere Glow Shell (Atmospheric Scattering Simulation)
    const atmosphereGeometry = new THREE.SphereGeometry(globeRadius * 1.018, sphereSegments, sphereSegments);
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide
    });
    const atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    scene.add(atmosphereMesh);

    // Outer Atmospheric Corona Sphere
    const coronaGeo = new THREE.SphereGeometry(globeRadius * 1.12, 32, 32);
    const coronaMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.65 - dot(vNormal, vec3(0, 0, 1.0)), 2.0);
          gl_FragColor = vec4(0.2, 0.6, 1.0, 1.0) * intensity * 0.45;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true
    });
    const atmosphereGlowMesh = new THREE.Mesh(coronaGeo, coronaMat);
    scene.add(atmosphereGlowMesh);

    // 6. Mila Sector Tactical Beacon Pinpoint
    const milaGroup = new THREE.Group();
    const milaVec = latLngToVector3(36.475, 6.275, globeRadius);
    milaGroup.position.copy(milaVec);

    // Align marker perpendicular to surface
    milaGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), milaVec.clone().normalize());

    // Pulsing central beacon sphere
    const beaconGeo = new THREE.SphereGeometry(0.10, 16, 16);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
    milaGroup.add(beaconMesh);

    // Vertical holographic beacon beam
    const beamGeo = new THREE.CylinderGeometry(0.015, 0.04, 1.2, 8);
    beamGeo.translate(0, 0.6, 0);
    const beamMat = new THREE.MeshBasicMaterial({ 
      color: 0x34d399, 
      transparent: true, 
      opacity: 0.65,
      blending: THREE.AdditiveBlending 
    });
    const beamMesh = new THREE.Mesh(beamGeo, beamMat);
    milaGroup.add(beamMesh);

    // Concentric ground radar rings
    const ringGeo = new THREE.RingGeometry(0.08, 0.16, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ 
      color: 0xef4444, 
      side: THREE.DoubleSide, 
      transparent: true, 
      opacity: 0.85 
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    milaGroup.add(ringMesh);

    scene.add(milaGroup);

    // 7. ALSAT Fleet Orbits, Satellite Models, and Swath Cones
    // Scale: Real Earth R = 6371 km -> 3D scene R = 5.0
    const kmToScene = globeRadius / 6371;

    const satConfigs: Record<AlsatSatelliteId, {
      color: number;
      orbitColor: number;
      altitudeKm: number;
      swathKm: number;
      inclinationDeg: number;
      raanDeg: number;
      periodMinutes: number;
      phaseOffset: number;
    }> = {
      'ALSAT-1B': {
        color: 0x10b981,
        orbitColor: 0x10b981,
        altitudeKm: 670,
        swathKm: 150,
        inclinationDeg: 98.2,
        raanDeg: 312.44,
        periodMinutes: 97.7,
        phaseOffset: 0.12
      },
      'ALSAT-2A': {
        color: 0x06b6d4,
        orbitColor: 0x06b6d4,
        altitudeKm: 680,
        swathKm: 30,
        inclinationDeg: 98.2,
        raanDeg: 320.15,
        periodMinutes: 97.4,
        phaseOffset: 0.46
      },
      'ALSAT-2B': {
        color: 0xf59e0b,
        orbitColor: 0xf59e0b,
        altitudeKm: 680,
        swathKm: 30,
        inclinationDeg: 98.2,
        raanDeg: 318.91,
        periodMinutes: 97.5,
        phaseOffset: 0.80
      }
    };

    const satellitesMap: any = {};

    const satIds: AlsatSatelliteId[] = ['ALSAT-1B', 'ALSAT-2A', 'ALSAT-2B'];

    satIds.forEach((id) => {
      const cfg = satConfigs[id];
      const orbitRadius = globeRadius + (cfg.altitudeKm * kmToScene);
      const incRad = (cfg.inclinationDeg * Math.PI) / 180;
      const raanRad = (cfg.raanDeg * Math.PI) / 180;

      // Build 3D Orbit Polyline (Circle rotated by inclination and RAAN)
      const orbitPoints: THREE.Vector3[] = [];
      const numSegments = 128;
      for (let i = 0; i <= numSegments; i++) {
        const u = (i / numSegments) * Math.PI * 2;
        // Base polar orbit in Y-Z plane tilted by inclination
        const localPt = new THREE.Vector3(
          Math.cos(u) * orbitRadius,
          Math.sin(u) * orbitRadius * Math.sin(incRad),
          Math.sin(u) * orbitRadius * Math.cos(incRad)
        );
        // Apply RAAN longitude rotation around Y-axis
        localPt.applyAxisAngle(new THREE.Vector3(0, 1, 0), raanRad);
        orbitPoints.push(localPt);
      }

      const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPoints);
      const orbitMat = new THREE.LineBasicMaterial({
        color: cfg.orbitColor,
        transparent: true,
        opacity: 0.65,
        linewidth: 1.5
      });
      const orbitLine = new THREE.LineLoop(orbitGeo, orbitMat);
      scene.add(orbitLine);

      // Build Detailed 3D Satellite Model
      const satGroup = new THREE.Group();

      // Satellite Bus (Gold Foil Cube)
      const busGeo = new THREE.BoxGeometry(0.18, 0.18, 0.24);
      const busMat = new THREE.MeshStandardMaterial({
        color: cfg.color,
        metalness: 0.8,
        roughness: 0.25,
        emissive: cfg.color,
        emissiveIntensity: 0.2
      });
      const busMesh = new THREE.Mesh(busGeo, busMat);
      satGroup.add(busMesh);

      // Solar Panels (Blue Wings)
      const panelGeo = new THREE.BoxGeometry(0.55, 0.02, 0.16);
      const panelMat = new THREE.MeshStandardMaterial({
        color: 0x1e3a8a,
        roughness: 0.1,
        metalness: 0.9,
        emissive: 0x1d4ed8,
        emissiveIntensity: 0.3
      });
      const panelL = new THREE.Mesh(panelGeo, panelMat);
      panelL.position.x = -0.38;
      satGroup.add(panelL);

      const panelR = new THREE.Mesh(panelGeo, panelMat);
      panelR.position.x = 0.38;
      satGroup.add(panelR);

      // Earth-facing Multispectral Sensor Camera Cylinder
      const sensorGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.12, 12);
      sensorGeo.rotateX(Math.PI / 2);
      const sensorMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const sensorMesh = new THREE.Mesh(sensorGeo, sensorMat);
      sensorMesh.position.z = 0.14;
      satGroup.add(sensorMesh);

      scene.add(satGroup);

      // 8. Transparent Sensor Swath Cone (Projecting down onto the Earth)
      // Cone apex at satellite, base on globe surface
      const coneAltitude = cfg.altitudeKm * kmToScene;
      const coneBaseRadius = Math.max(0.15, (cfg.swathKm / 2) * kmToScene * 3.5); // Scaled for tactical visual clarity
      const coneGeo = new THREE.ConeGeometry(coneBaseRadius, coneAltitude, 24, 1, true);
      // Translate geometry so apex is at (0, 0, 0)
      coneGeo.translate(0, -coneAltitude / 2, 0);

      const coneMat = new THREE.MeshBasicMaterial({
        color: cfg.color,
        transparent: true,
        opacity: 0.20,
        wireframe: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
      });
      const swathCone = new THREE.Mesh(coneGeo, coneMat);
      scene.add(swathCone);

      // Sub-satellite Ground Footprint Disc
      const spotGeo = new THREE.RingGeometry(coneBaseRadius * 0.7, coneBaseRadius, 24);
      const spotMat = new THREE.MeshBasicMaterial({
        color: cfg.color,
        transparent: true,
        opacity: 0.75,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
      });
      const groundSpot = new THREE.Mesh(spotGeo, spotMat);
      scene.add(groundSpot);

      satellitesMap[id] = {
        orbitLine,
        satMesh: satGroup,
        swathCone,
        groundSpot,
        inclinationDeg: cfg.inclinationDeg,
        raanDeg: cfg.raanDeg,
        periodMinutes: cfg.periodMinutes,
        altitudeKm: cfg.altitudeKm,
        color: cfg.color,
        swathRadiusKm: cfg.swathKm / 2,
        phaseOffset: cfg.phaseOffset
      };
    });

    // Save threeState reference
    threeState.current = {
      scene,
      camera,
      renderer,
      controls,
      globeMesh,
      atmosphereMesh,
      atmosphereGlowMesh,
      milaMarker: milaGroup,
      satellites: satellitesMap,
      animFrameId: 0,
      simTime: 0
    };

    // 9. Resize Handling via ResizeObserver
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    // 10. Animation Loop
    let lastTimestamp = performance.now();

    const animate = (timestamp: number) => {
      const dtSeconds = (timestamp - lastTimestamp) / 1000;
      lastTimestamp = timestamp;

      const state = threeState.current;
      if (!state) return;

      // Update simulation time
      if (isPlaying) {
        state.simTime += (dtSeconds * simSpeed) / 60; // elapsed sim minutes
      }

      // Rotate Earth slowly if autoRotate is enabled
      if (autoRotate) {
        state.globeMesh.rotation.y += 0.0012;
        state.milaMarker.rotation.y += 0.0012;
      }

      // Pulse Mila marker radar ring
      const ringPulse = 1.0 + Math.sin(timestamp * 0.005) * 0.25;
      ringMesh.scale.set(ringPulse, ringPulse, 1);

      // Update positions of ALSAT satellites along their orbits
      const satIdsList: AlsatSatelliteId[] = ['ALSAT-1B', 'ALSAT-2A', 'ALSAT-2B'];

      satIdsList.forEach((id) => {
        const sat = state.satellites[id];
        if (!sat) return;

        const period = sat.periodMinutes;
        // Orbit angle based on simulated time and phase
        const orbitAngle = (((state.simTime / period) + sat.phaseOffset) % 1) * Math.PI * 2;
        const orbitRadius = globeRadius + (sat.altitudeKm * kmToScene);
        const incRad = (sat.inclinationDeg * Math.PI) / 180;
        const raanRad = (sat.raanDeg * Math.PI) / 180;

        // Position in orbital plane
        const localPos = new THREE.Vector3(
          Math.cos(orbitAngle) * orbitRadius,
          Math.sin(orbitAngle) * orbitRadius * Math.sin(incRad),
          Math.sin(orbitAngle) * orbitRadius * Math.cos(incRad)
        );
        localPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), raanRad);

        sat.satMesh.position.copy(localPos);

        // Sub-satellite ground position on Earth's surface
        const groundPos = localPos.clone().normalize().multiplyScalar(globeRadius * 1.002);

        // Orient satellite so sensor points towards Earth center
        sat.satMesh.lookAt(0, 0, 0);

        // Update Swath Cone
        sat.swathCone.position.copy(localPos);
        // Direct cone from satellite to ground point
        sat.swathCone.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), groundPos.clone().sub(localPos).normalize());

        // Update Sub-satellite ground spot
        sat.groundSpot.position.copy(groundPos);
        sat.groundSpot.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), groundPos.clone().normalize());

        // Update active telemetry for currently highlighted satellite
        if (id === (selectedSatelliteId !== 'ALL' ? selectedSatelliteId : 'ALSAT-2A')) {
          // Calculate approx sub-satellite lat/lng
          const normGround = groundPos.clone().normalize();
          const latDeg = Math.asin(normGround.y) * (180 / Math.PI);
          const lngDeg = Math.atan2(normGround.z, -normGround.x) * (180 / Math.PI) - 180;
          const normalizedLng = ((((lngDeg + 180) % 360) + 360) % 360) - 180;

          // Distance to Mila in 3D
          const distScene = groundPos.distanceTo(milaVec);
          const distKm = Math.round(distScene * (6371 / globeRadius));

          setActiveTelemetry({
            satId: id,
            lat: Number(latDeg.toFixed(2)),
            lng: Number(normalizedLng.toFixed(2)),
            alt: sat.altitudeKm,
            distToMilaKm: distKm
          });
        }
      });

      state.controls.update();
      state.renderer.render(state.scene, state.camera);

      state.animFrameId = requestAnimationFrame(animate);
    };

    threeState.current.animFrameId = requestAnimationFrame(animate);

    // Cleanup on unmount
    return () => {
      resizeObserver.disconnect();
      if (threeState.current) {
        cancelAnimationFrame(threeState.current.animFrameId);
        threeState.current.renderer.dispose();
      }
      if (container) {
        container.innerHTML = '';
      }
    };
  }, []);

  // Toggle Visibility of Swath Cones
  useEffect(() => {
    const state = threeState.current;
    if (!state) return;
    const satIds: AlsatSatelliteId[] = ['ALSAT-1B', 'ALSAT-2A', 'ALSAT-2B'];
    satIds.forEach((id) => {
      const sat = state.satellites[id];
      if (sat) {
        sat.swathCone.visible = showSwathCones;
        sat.groundSpot.visible = showSwathCones;
      }
    });
  }, [showSwathCones]);

  // Toggle Visibility of Orbit Tracks
  useEffect(() => {
    const state = threeState.current;
    if (!state) return;
    const satIds: AlsatSatelliteId[] = ['ALSAT-1B', 'ALSAT-2A', 'ALSAT-2B'];
    satIds.forEach((id) => {
      const sat = state.satellites[id];
      if (sat) {
        sat.orbitLine.visible = showOrbits;
      }
    });
  }, [showOrbits]);

  // Toggle Atmosphere Glow
  useEffect(() => {
    const state = threeState.current;
    if (!state) return;
    state.atmosphereMesh.visible = showAtmosphere;
    state.atmosphereGlowMesh.visible = showAtmosphere;
  }, [showAtmosphere]);

  // Camera presets / Focus targets
  const handleFocus = useCallback((target: 'global' | 'mila' | AlsatSatelliteId) => {
    const state = threeState.current;
    if (!state) return;
    setActiveFocus(target);

    if (target === 'mila') {
      // Position camera focusing on Algeria / Mila
      state.controls.target.set(0.3, 3.0, 3.8);
      state.camera.position.set(1.8, 6.0, 7.5);
    } else if (target === 'global') {
      state.controls.target.set(0, 0, 0);
      state.camera.position.set(0, 10, 14);
    } else {
      // Focus on specific satellite
      const sat = state.satellites[target];
      if (sat) {
        const satPos = sat.satMesh.position;
        state.controls.target.copy(satPos);
        state.camera.position.set(satPos.x * 1.5, satPos.y * 1.5, satPos.z * 1.5);
      }
      if (onSelectSatellite) {
        onSelectSatellite(target);
      }
    }
  }, [onSelectSatellite]);

  return (
    <div className={`relative w-full h-[520px] sm:h-[600px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col ${className}`}>
      {/* 3D WebGL Canvas Viewport */}
      <div 
        ref={mountRef} 
        className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
      />

      {/* Floating Tactical Header Bar */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none gap-2">
        {/* Left: Tactical Mission Badge */}
        <div className="pointer-events-auto flex items-center gap-2 p-2 px-3 rounded-xl bg-slate-900/85 backdrop-blur-md border border-emerald-500/40 shadow-lg text-xs">
          <Globe className="w-4 h-4 text-emerald-400 animate-pulse" />
          <div className="flex flex-col">
            <span className="font-bold text-white font-mono text-[11px] sm:text-xs">
              {isAr ? 'محاكاة مدارات ALSAT ثلاثية الأبعاد (ASAL 3D Globe)' : 'ALSAT 3D Orbital Constellation'}
            </span>
            <span className="text-[9px] text-slate-400 font-mono">
              SSO Polar Orbit • 98.2° Inclination • Mila Sector [36.48°N, 6.28°E]
            </span>
          </div>
        </div>

        {/* Right: Quick Camera View Presets */}
        <div className="pointer-events-auto flex items-center gap-1 p-1 rounded-xl bg-slate-900/85 backdrop-blur-md border border-slate-700/70 shadow-lg text-xs">
          <button
            onClick={() => handleFocus('mila')}
            className={`px-2.5 py-1.5 rounded-lg font-mono font-bold text-[10px] sm:text-xs transition flex items-center gap-1 cursor-pointer ${
              activeFocus === 'mila' 
                ? 'bg-emerald-500 text-slate-950 shadow-sm' 
                : 'text-slate-300 hover:text-emerald-300 hover:bg-slate-800'
            }`}
            title={isAr ? 'التركيز على قطاع ميلة والجزائر' : 'Focus on Mila Sector'}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>{isAr ? 'قطاع ميلة' : 'Mila Sector'}</span>
          </button>

          <button
            onClick={() => handleFocus('ALSAT-2A')}
            className={`px-2 py-1.5 rounded-lg font-mono font-bold text-[10px] sm:text-xs transition cursor-pointer ${
              activeFocus === 'ALSAT-2A' 
                ? 'bg-cyan-500 text-slate-950 shadow-sm' 
                : 'text-slate-300 hover:text-cyan-300 hover:bg-slate-800'
            }`}
          >
            2A (2.5m)
          </button>

          <button
            onClick={() => handleFocus('ALSAT-1B')}
            className={`px-2 py-1.5 rounded-lg font-mono font-bold text-[10px] sm:text-xs transition cursor-pointer ${
              activeFocus === 'ALSAT-1B' 
                ? 'bg-emerald-500 text-slate-950 shadow-sm' 
                : 'text-slate-300 hover:text-emerald-300 hover:bg-slate-800'
            }`}
          >
            1B (12m)
          </button>

          <button
            onClick={() => handleFocus('global')}
            className={`px-2.5 py-1.5 rounded-lg font-mono font-bold text-[10px] sm:text-xs transition cursor-pointer ${
              activeFocus === 'global' 
                ? 'bg-slate-200 text-slate-950 shadow-sm' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title={isAr ? 'منظور مداري شامل للكرة الأرضية' : 'Global Earth View'}
          >
            {isAr ? 'شامل' : 'Global'}
          </button>
        </div>
      </div>

      {/* Floating Bottom Left: Real-time Telemetry Readout HUD Card */}
      <div className="absolute bottom-16 sm:bottom-4 left-3 pointer-events-auto max-w-[280px] p-2.5 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 shadow-xl font-mono text-[10px] text-slate-300 space-y-1">
        <div className="flex items-center justify-between pb-1 border-b border-slate-800 text-[11px] font-bold text-white">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{activeTelemetry.satId}</span>
          </div>
          <span className="text-emerald-400 text-[10px]">
            {activeTelemetry.distToMilaKm < 150 ? (isAr ? '🎯 فوق ميلة' : '🎯 Over Mila') : (isAr ? 'في المسار' : 'In Track')}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1 pt-0.5 text-slate-400">
          <div>{isAr ? 'خط العرض' : 'Sub-Sat Lat'}: <span className="text-white font-semibold">{activeTelemetry.lat}°</span></div>
          <div>{isAr ? 'خط الطول' : 'Sub-Sat Lng'}: <span className="text-white font-semibold">{activeTelemetry.lng}°</span></div>
          <div>{isAr ? 'الارتفاع' : 'Altitude'}: <span className="text-white font-semibold">{activeTelemetry.alt} km</span></div>
          <div>{isAr ? 'البعد عن ميلة' : 'Dist to Mila'}: <span className="text-cyan-300 font-bold">{activeTelemetry.distToMilaKm} km</span></div>
        </div>
      </div>

      {/* Floating Bottom Right: Simulation Speed & Layer Controls Toolbar */}
      <div className="absolute bottom-3 right-3 pointer-events-auto flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 shadow-xl text-xs">
        {/* Play / Pause simulation */}
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`p-2 rounded-lg font-mono font-bold transition cursor-pointer ${
            isPlaying ? 'bg-slate-800 text-emerald-400 hover:bg-slate-700' : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
          }`}
          title={isPlaying ? (isAr ? 'إيقاف مؤقت' : 'Pause') : (isAr ? 'تشغيل' : 'Play')}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>

        {/* Speed multiplier selector */}
        <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800">
          {[1, 5, 25].map((spd) => (
            <button
              key={spd}
              onClick={() => setSimSpeed(spd)}
              className={`px-2 py-1 text-[10px] font-mono font-bold rounded transition cursor-pointer ${
                simSpeed === spd ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>

        <div className="h-4 w-[1px] bg-slate-800 mx-0.5" />

        {/* Toggle Swath Cones */}
        <button
          onClick={() => setShowSwathCones(!showSwathCones)}
          className={`p-1.5 sm:px-2 sm:py-1 rounded-lg text-[10px] font-mono transition flex items-center gap-1 cursor-pointer ${
            showSwathCones ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-slate-400 hover:bg-slate-800'
          }`}
          title={isAr ? 'إظهار/إخفاء مخروط حزام المسح الاستشعاري' : 'Toggle Sensor Swath Cone'}
        >
          <Layers className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{isAr ? 'المخاريط' : 'Cones'}</span>
        </button>

        {/* Toggle Orbit Tracks */}
        <button
          onClick={() => setShowOrbits(!showOrbits)}
          className={`p-1.5 sm:px-2 sm:py-1 rounded-lg text-[10px] font-mono transition flex items-center gap-1 cursor-pointer ${
            showOrbits ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:bg-slate-800'
          }`}
          title={isAr ? 'إظهار/إخفاء مسارات المدارات' : 'Toggle Orbit Lines'}
        >
          <Compass className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{isAr ? 'المدارات' : 'Tracks'}</span>
        </button>

        {/* Toggle Atmosphere Glow */}
        <button
          onClick={() => setShowAtmosphere(!showAtmosphere)}
          className={`p-1.5 sm:px-2 sm:py-1 rounded-lg text-[10px] font-mono transition flex items-center gap-1 cursor-pointer ${
            showAtmosphere ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' : 'text-slate-400 hover:bg-slate-800'
          }`}
          title={isAr ? 'إظهار/إخفاء هالة الغلاف الجوي' : 'Toggle Atmosphere Glow'}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{isAr ? 'الغلاف' : 'Aura'}</span>
        </button>

        {/* Reset Camera to Mila */}
        <button
          onClick={() => handleFocus('mila')}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          title={isAr ? 'إعادة ضبط المنظور' : 'Reset View'}
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
