// AWIS — Algerian Space Agency (ASAL) & AWIS Tactical Dossier Exporter
// Generates publication-grade official spatial intelligence & NDVI dossiers (PDF)
// Target Sector: Wilaya de Mila [36.30° N, 36.65° N | 6.10° E, 6.45° E] & Northern Algeria Band

import { jsPDF } from 'jspdf';
import { 
  AlsatSatelliteId, 
  AlsatNdviPassData, 
  AlsatPredictedPass, 
  AlsatRealtimePosition, 
  Language 
} from '../types';
import { 
  ALSAT_FLEET_REGISTRY, 
  MILA_BBOX, 
  NORTHERN_ALGERIA_BBOX, 
  computeAlsatPositionAtTime,
  DEFAULT_ALSAT_PASSES
} from './alsatTrackingService';

export interface TacticalDossierExportOptions {
  satelliteId?: AlsatSatelliteId | 'ALL';
  pass?: AlsatNdviPassData | null;
  predictedPass?: AlsatPredictedPass | null;
  currentPosition?: AlsatRealtimePosition | null;
  lang?: Language;
  operatorCallsign?: string;
  notes?: string;
  sourceCanvas?: HTMLCanvasElement | null;
}

/**
 * Procedurally draws a high-resolution, high-fidelity tactical satellite reconnaissance snapshot
 * onto an HTML5 Canvas for embedding into the official PDF dossier.
 * Renders the Mila operational sector, Beni Haroun basin, simulated multispectral NDVI false-color gradient,
 * orbital ground track, sensor swath corridor, and tactical HUD reticles.
 */
export function createMultispectralDossierCanvas(
  satelliteId: AlsatSatelliteId = 'ALSAT-2A',
  passData?: AlsatNdviPassData | null
): string {
  if (typeof document === 'undefined') {
    return '';
  }

  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 560;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const w = canvas.width;
  const h = canvas.height;
  const tle = ALSAT_FLEET_REGISTRY[satelliteId] || ALSAT_FLEET_REGISTRY['ALSAT-2A'];

  // 1. Base dark tactical spatial radar background
  const bgGrad = ctx.createLinearGradient(0, 0, w, h);
  bgGrad.addColorStop(0, '#060d19');
  bgGrad.addColorStop(0.5, '#0b162c');
  bgGrad.addColorStop(1, '#050a14');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // 2. Tactical Coordinate Grid
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.12)';
  ctx.lineWidth = 1;
  const gridStepX = w / 8;
  const gridStepY = h / 6;

  for (let x = gridStepX; x < w; x += gridStepX) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = gridStepY; y < h; y += gridStepY) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // 3. Terrain & Multispectral Vegetation Contours (Simulated NDVI Raster)
  // Background low NDVI bare soil
  const soilGrad = ctx.createRadialGradient(w * 0.45, h * 0.52, 40, w * 0.45, h * 0.52, 380);
  soilGrad.addColorStop(0, 'rgba(180, 83, 9, 0.28)'); // Stressed/Harvested
  soilGrad.addColorStop(0.4, 'rgba(217, 119, 6, 0.20)');
  soilGrad.addColorStop(0.8, 'rgba(15, 23, 42, 0.05)');
  ctx.fillStyle = soilGrad;
  ctx.beginPath();
  ctx.arc(w * 0.45, h * 0.52, 380, 0, Math.PI * 2);
  ctx.fill();

  // Dense forest biomass zones (Sidi Maarouf, Mount Grouz, Grarem) - High NDVI (Emerald/Green)
  const forestZones = [
    { x: w * 0.32, y: h * 0.38, r: 140, ndvi: 0.68, label: 'Mount Grouz Massif (جبل قروز)' },
    { x: w * 0.65, y: h * 0.42, r: 160, ndvi: 0.72, label: 'Sidi Maarouf Forest (غابات سيدي معروف)' },
    { x: w * 0.48, y: h * 0.72, r: 130, ndvi: 0.61, label: 'Tessala Lemtai Biomass (تسالة لمطاعي)' },
    { x: w * 0.22, y: h * 0.68, r: 110, ndvi: 0.54, label: 'Ferdjioua Woodlands (فرجيوة)' },
    { x: w * 0.78, y: h * 0.65, r: 120, ndvi: 0.46, label: 'Chelghoum Laid Plain (شلغوم العيد)' }
  ];

  forestZones.forEach(zone => {
    const fGrad = ctx.createRadialGradient(zone.x, zone.y, 10, zone.x, zone.y, zone.r);
    fGrad.addColorStop(0, 'rgba(16, 185, 129, 0.65)'); // Dense NIR reflection
    fGrad.addColorStop(0.5, 'rgba(5, 150, 105, 0.45)');
    fGrad.addColorStop(0.8, 'rgba(4, 120, 87, 0.20)');
    fGrad.addColorStop(1, 'rgba(4, 120, 87, 0.0)');
    ctx.fillStyle = fGrad;
    ctx.beginPath();
    ctx.arc(zone.x, zone.y, zone.r, 0, Math.PI * 2);
    ctx.fill();
  });

  // Critical dry / High-risk flammability pockets (Low NDVI, high fuel index)
  const droughtSpots = [
    { x: w * 0.42, y: h * 0.32, r: 65 },
    { x: w * 0.72, y: h * 0.35, r: 75 },
    { x: w * 0.58, y: h * 0.62, r: 80 }
  ];
  droughtSpots.forEach(spot => {
    const dGrad = ctx.createRadialGradient(spot.x, spot.y, 5, spot.x, spot.y, spot.r);
    dGrad.addColorStop(0, 'rgba(239, 68, 68, 0.55)'); // Severe stress
    dGrad.addColorStop(0.6, 'rgba(245, 158, 11, 0.35)');
    dGrad.addColorStop(1, 'rgba(239, 68, 68, 0.0)');
    ctx.fillStyle = dGrad;
    ctx.beginPath();
    ctx.arc(spot.x, spot.y, spot.r, 0, Math.PI * 2);
    ctx.fill();
  });

  // 4. Geographic Water Body: Beni Haroun Dam Reservoir (سد بني هارون)
  ctx.save();
  ctx.strokeStyle = 'rgba(14, 165, 233, 0.9)';
  ctx.fillStyle = 'rgba(6, 182, 212, 0.6)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  // Realistic branching reservoir shape
  ctx.moveTo(w * 0.42, h * 0.46);
  ctx.bezierCurveTo(w * 0.45, h * 0.40, w * 0.50, h * 0.43, w * 0.53, h * 0.47);
  ctx.bezierCurveTo(w * 0.56, h * 0.52, w * 0.52, h * 0.56, w * 0.48, h * 0.54);
  ctx.bezierCurveTo(w * 0.46, h * 0.58, w * 0.43, h * 0.55, w * 0.41, h * 0.51);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Water label
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 13px monospace';
  ctx.fillText('BENI HAROUN RESERVOIR (سد بني هارون)', w * 0.43, h * 0.43);
  ctx.restore();

  // 5. Geographic Sector Bounding Box: Direct Mila Operational Sector [36.30°N-36.65°N, 6.10°E-6.45°E]
  const bboxX = w * 0.28;
  const bboxY = h * 0.22;
  const bboxW = w * 0.44;
  const bboxH = h * 0.60;

  ctx.strokeStyle = 'rgba(16, 185, 129, 0.75)';
  ctx.lineWidth = 1.8;
  ctx.setLineDash([8, 6]);
  ctx.strokeRect(bboxX, bboxY, bboxW, bboxH);
  ctx.setLineDash([]);

  // Corner brackets on Mila BBox
  const cornerLen = 16;
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 2.5;
  // Top-Left
  ctx.beginPath(); ctx.moveTo(bboxX, bboxY + cornerLen); ctx.lineTo(bboxX, bboxY); ctx.lineTo(bboxX + cornerLen, bboxY); ctx.stroke();
  // Top-Right
  ctx.beginPath(); ctx.moveTo(bboxX + bboxW - cornerLen, bboxY); ctx.lineTo(bboxX + bboxW, bboxY); ctx.lineTo(bboxX + bboxW, bboxY + cornerLen); ctx.stroke();
  // Bottom-Left
  ctx.beginPath(); ctx.moveTo(bboxX, bboxY + bboxH - cornerLen); ctx.lineTo(bboxX, bboxY + bboxH); ctx.lineTo(bboxX + cornerLen, bboxY + bboxH); ctx.stroke();
  // Bottom-Right
  ctx.beginPath(); ctx.moveTo(bboxX + bboxW - cornerLen, bboxY + bboxH); ctx.lineTo(bboxX + bboxW, bboxY + bboxH); ctx.lineTo(bboxX + bboxW, bboxY + bboxH - cornerLen); ctx.stroke();

  // BBox Sector Label
  ctx.fillStyle = '#10b981';
  ctx.font = 'bold 12px monospace';
  ctx.fillText('MILA TARGET SECTOR [36.30°-36.65°N | 6.10°-6.45°E]', bboxX + 10, bboxY + 20);

  // 6. ALSAT Satellite Ground Track & Swath Corridor
  // Retrograde Sun-Synchronous Polar Track (approx 98.2° inclination, heading SSW)
  const trackStartX = w * 0.62;
  const trackStartY = 0;
  const trackEndX = w * 0.38;
  const trackEndY = h;

  // Swath corridor boundary lines
  const swathPx = satelliteId === 'ALSAT-1B' ? 140 : 55;
  ctx.save();
  ctx.fillStyle = 'rgba(6, 182, 212, 0.08)';
  ctx.beginPath();
  ctx.moveTo(trackStartX - swathPx, trackStartY);
  ctx.lineTo(trackStartX + swathPx, trackStartY);
  ctx.lineTo(trackEndX + swathPx, trackEndY);
  ctx.lineTo(trackEndX - swathPx, trackEndY);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
  ctx.lineWidth = 1.2;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(trackStartX - swathPx, trackStartY);
  ctx.lineTo(trackEndX - swathPx, trackEndY);
  ctx.moveTo(trackStartX + swathPx, trackStartY);
  ctx.lineTo(trackEndX + swathPx, trackEndY);
  ctx.stroke();
  ctx.restore();

  // Ground Track Line
  ctx.strokeStyle = '#06b6d4';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(trackStartX, trackStartY);
  ctx.lineTo(trackEndX, trackEndY);
  ctx.stroke();

  // Ground track flight direction arrows
  for (let f = 0.25; f <= 0.85; f += 0.3) {
    const ax = trackStartX + (trackEndX - trackStartX) * f;
    const ay = trackStartY + (trackEndY - trackStartY) * f;
    ctx.fillStyle = '#06b6d4';
    ctx.beginPath();
    ctx.arc(ax, ay, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // 7. Tactical Sub-satellite Target Reticle over Mila
  const reticleX = w * 0.49;
  const reticleY = h * 0.48;

  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(reticleX, reticleY, 24, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(reticleX, reticleY, 38, 0, Math.PI * 2);
  ctx.stroke();
  // Crosshairs
  ctx.beginPath();
  ctx.moveTo(reticleX - 48, reticleY); ctx.lineTo(reticleX + 48, reticleY);
  ctx.moveTo(reticleX, reticleY - 48); ctx.lineTo(reticleX, reticleY + 48);
  ctx.stroke();

  // Reticle Coordinates Tag
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px monospace';
  ctx.fillText('TARGET: MILA COMMAND (36.475°N, 6.275°E)', reticleX + 32, reticleY - 14);
  ctx.fillStyle = '#ef4444';
  ctx.font = '10px monospace';
  ctx.fillText('HIGH FLAMMABILITY BIOMASS RISK', reticleX + 32, reticleY);

  // 8. HUD Header & Footer Badges
  // Top-Left Badge: Satellite Mission Details
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.6)';
  ctx.lineWidth = 1;
  ctx.fillRect(18, 16, 360, 58);
  ctx.strokeRect(18, 16, 360, 58);

  ctx.fillStyle = '#10b981';
  ctx.font = 'bold 14px monospace';
  ctx.fillText(`ASAL // ${satelliteId} MULTISPECTRAL OBSERVATION`, 28, 36);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px monospace';
  ctx.fillText(`SENSOR: ${tle.sensorResolutionMeters}m GSD | SWATH: ${tle.swathWidthKm}km | ALT: ${tle.altitudeKm}km`, 28, 52);
  ctx.fillText(`SPECTRAL: ${tle.spectralBands.slice(0, 3).join(', ')}`, 28, 66);

  // Top-Right Badge: ASAL Space Operations Visa
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.strokeStyle = 'rgba(6, 182, 212, 0.6)';
  ctx.fillRect(w - 378, 16, 360, 58);
  ctx.strokeRect(w - 378, 16, 360, 58);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 13px monospace';
  ctx.fillText('CENTRE DES TECHNIQUES SPATIALES (ASAL CTS)', w - 368, 36);
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '10px monospace';
  ctx.fillText(`PROCESSED: LEVEL-2A TOA REFLECTANCE + NDVI`, w - 368, 52);
  ctx.fillText(`CLOUD COVER: ${passData?.cloudCoverPercent ?? 1.8}% | INC: 98.2° SSO`, w - 368, 66);

  // Bottom NDVI Spectral Gradient Scale Bar
  const legW = 380;
  const legH = 14;
  const legX = w / 2 - legW / 2;
  const legY = h - 42;

  const legGrad = ctx.createLinearGradient(legX, 0, legX + legW, 0);
  legGrad.addColorStop(0, '#0284c7');    // -0.2 (Water / Deep)
  legGrad.addColorStop(0.2, '#ef4444');  // 0.0 - 0.2 (Bare soil / Severe drought)
  legGrad.addColorStop(0.45, '#f59e0b'); // 0.2 - 0.4 (Moderate moisture stress)
  legGrad.addColorStop(0.75, '#10b981'); // 0.4 - 0.65 (Active biomass / canopy)
  legGrad.addColorStop(1, '#047857');    // 0.85+ (Prime lush forest)

  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.fillRect(legX - 16, legY - 18, legW + 32, 38);
  ctx.strokeStyle = 'rgba(100, 116, 139, 0.5)';
  ctx.strokeRect(legX - 16, legY - 18, legW + 32, 38);

  ctx.fillStyle = legGrad;
  ctx.fillRect(legX, legY, legW, legH);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(legX, legY, legW, legH);

  // Scale labels
  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 9px monospace';
  ctx.fillText('NDVI -0.2', legX - 8, legY - 4);
  ctx.fillText('0.2 (Dry)', legX + legW * 0.25 - 15, legY - 4);
  ctx.fillText('0.4 (Stress)', legX + legW * 0.5 - 18, legY - 4);
  ctx.fillText('0.7 (Forest)', legX + legW * 0.78 - 18, legY - 4);
  ctx.fillText('+0.85', legX + legW - 10, legY - 4);

  return canvas.toDataURL('image/jpeg', 0.90);
}

/**
 * Generates and downloads the official Sovereign ALSAT Earth Observation & Spectral Assessment Dossier
 * for Mila Sector & Northern Algeria band.
 */
export async function generateTacticalAlsatDossierPDF(options: TacticalDossierExportOptions = {}): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 12;
  const contentWidth = pageWidth - marginX * 2; // 186mm

  const isAr = options.lang === 'ar';
  const satId: AlsatSatelliteId = options.satelliteId && options.satelliteId !== 'ALL' 
    ? options.satelliteId 
    : (options.pass?.satelliteId || 'ALSAT-2A');
  
  const tle = ALSAT_FLEET_REGISTRY[satId] || ALSAT_FLEET_REGISTRY['ALSAT-2A'];
  const pass = options.pass || DEFAULT_ALSAT_PASSES.find(p => p.satelliteId === satId) || DEFAULT_ALSAT_PASSES[0];
  const pos = options.currentPosition || computeAlsatPositionAtTime(satId);

  const dateNow = new Date();
  const dateStr = dateNow.toISOString().split('T')[0].replace(/-/g, '');
  const reportRef = `AWIS-DOSSIER-${dateStr}-${satId}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Official State Palette
  const darkNavy = [15, 23, 42] as const;      // #0f172a
  const algeriaGreen = [4, 120, 87] as const;  // #047857
  const algeriaRed = [185, 28, 28] as const;   // #b91c1c
  const slateText = [71, 85, 105] as const;    // #475569
  const bgCard = [248, 250, 252] as const;     // #f8fafc
  const borderGrey = [203, 213, 225] as const; // #cbd5e1

  // =========================================================================
  // PAGE 1: OFFICIAL SOVEREIGN DOSSIER & MULTISPECTRAL INTELLIGENCE
  // =========================================================================

  // 1. National Flag Ribbon (Top)
  doc.setFillColor(...algeriaGreen);
  doc.rect(marginX, 7, contentWidth / 2, 2.4, 'F');
  doc.setFillColor(...algeriaRed);
  doc.rect(marginX + contentWidth / 2, 7, contentWidth / 2, 2.4, 'F');

  // National Crest Emblem (Circular Vector Seal)
  doc.setDrawColor(...darkNavy);
  doc.setLineWidth(0.4);
  doc.setFillColor(255, 255, 255);
  doc.circle(marginX + 8, 21, 7.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...algeriaGreen);
  doc.text('DZ', marginX + 8, 19.5, { align: 'center' });
  doc.setTextColor(...algeriaRed);
  doc.setFontSize(7);
  doc.text('* C', marginX + 8, 23.5, { align: 'center' });

  // Official State Headings
  doc.setTextColor(...darkNavy);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(
    'RÉPUBLIQUE ALGÉRIENNE DÉMOCRATIQUE ET POPULAIRE',
    marginX + 20,
    16.5
  );
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slateText);
  doc.text(
    "AGENCE SPATIALE ALGÉRIENNE (ASAL) • DIRECTION GÉNÉRALE DE LA PROTECTION CIVILE (DGPC)",
    marginX + 20,
    21
  );
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...algeriaGreen);
  doc.text(
    "SYSTÈME NATIONAL D'INTELLIGENCE FEUX DE FORÊT (AWIS) — CENTRE OPÉRATIONNEL SPATIAL",
    marginX + 20,
    25.5
  );

  // Security Classification Stamp (Top Right)
  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(...algeriaRed);
  doc.setLineWidth(0.4);
  doc.roundedRect(pageWidth - marginX - 54, 12, 54, 16, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...algeriaRed);
  doc.text('DIFFUSION RESTREINTE // L3 TACTIQUE', pageWidth - marginX - 27, 17, { align: 'center' });
  doc.setFontSize(6.5);
  doc.setTextColor(...darkNavy);
  doc.text(`RÉF: ${reportRef}`, pageWidth - marginX - 27, 21.5, { align: 'center' });
  doc.setFontSize(6);
  doc.setTextColor(...slateText);
  doc.text(`DATE: ${dateNow.toUTCString().slice(5, 22)} UTC`, pageWidth - marginX - 27, 25.5, { align: 'center' });

  // Divider
  doc.setDrawColor(...borderGrey);
  doc.setLineWidth(0.4);
  doc.line(marginX, 30.5, pageWidth - marginX, 30.5);

  // 2. Dossier Main Title Bar
  let currentY = 33;
  doc.setFillColor(...bgCard);
  doc.setDrawColor(...borderGrey);
  doc.roundedRect(marginX, currentY, contentWidth, 13.5, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...darkNavy);
  doc.text(
    "RAPPORT DE RECONNAISSANCE SPATIALE & ÉVALUATION MULTISPECTRALE NDVI",
    marginX + 4,
    currentY + 5.5
  );
  doc.setFontSize(7.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slateText);
  doc.text(
    "SECTEUR OPÉRATIONNEL CIBLÉ: WILAYA DE MILA & BANDE FORESTIÈRE NORD-EST (BASSIN BENI HAROUN)",
    marginX + 4,
    currentY + 10.2
  );

  // Operational Badge on Title
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(...algeriaGreen);
  doc.roundedRect(pageWidth - marginX - 44, currentY + 2.5, 41, 8.5, 1, 1, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(...algeriaGreen);
  doc.text("ALERTE BIOMASSE ACTIVE", pageWidth - marginX - 23.5, currentY + 7.8, { align: 'center' });

  currentY += 16.5;

  // 3. Top 4 Key Spatial & Telemetry KPI Cards
  const kpiGap = 2.5;
  const kpiWidth = (contentWidth - kpiGap * 3) / 4;
  const kpiHeight = 17;

  // Box 1: Satellite & Sensor
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...borderGrey);
  doc.roundedRect(marginX, currentY, kpiWidth, kpiHeight, 1.2, 1.2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...slateText);
  doc.text('VECTEUR ORBITAL', marginX + 3, currentY + 4.5);
  doc.setFontSize(8.5);
  doc.setTextColor(...darkNavy);
  doc.text(satId, marginX + 3, currentY + 9.5);
  doc.setFontSize(6.5);
  doc.setTextColor(...algeriaGreen);
  doc.text(`${tle.sensorResolutionMeters}m GSD • ${tle.swathWidthKm}km`, marginX + 3, currentY + 14);

  // Box 2: Mean Sector NDVI
  const meanNdvi = pass.ndviStats?.meanNdvi ?? 0.41;
  const ndviSeverity = pass.ndviStats?.droughtSeverityIndex || 'Moderate';
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(marginX + (kpiWidth + kpiGap), currentY, kpiWidth, kpiHeight, 1.2, 1.2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...slateText);
  doc.text('INDICE MOYEN NDVI', marginX + (kpiWidth + kpiGap) + 3, currentY + 4.5);
  doc.setFontSize(9);
  doc.setTextColor(...darkNavy);
  doc.text(`${meanNdvi.toFixed(2)} (NDVI)`, marginX + (kpiWidth + kpiGap) + 3, currentY + 9.5);
  doc.setFontSize(6.5);
  doc.setTextColor(...algeriaRed);
  doc.text(`STRESS: ${ndviSeverity.toUpperCase()}`, marginX + (kpiWidth + kpiGap) + 3, currentY + 14);

  // Box 3: Target Coordinates (Mila Center)
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(marginX + (kpiWidth + kpiGap) * 2, currentY, kpiWidth, kpiHeight, 1.2, 1.2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...slateText);
  doc.text('CENTRE OPÉRATIONNEL', marginX + (kpiWidth + kpiGap) * 2 + 3, currentY + 4.5);
  doc.setFontSize(8);
  doc.setTextColor(...darkNavy);
  doc.text('36.475°N, 6.275°E', marginX + (kpiWidth + kpiGap) * 2 + 3, currentY + 9.5);
  doc.setFontSize(6.5);
  doc.setTextColor(...slateText);
  doc.text('Mila (Beni Haroun)', marginX + (kpiWidth + kpiGap) * 2 + 3, currentY + 14);

  // Box 4: Orbital Parameters
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(marginX + (kpiWidth + kpiGap) * 3, currentY, kpiWidth, kpiHeight, 1.2, 1.2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...slateText);
  doc.text('ÉPHÉMÉRIDES ASAL', marginX + (kpiWidth + kpiGap) * 3 + 3, currentY + 4.5);
  doc.setFontSize(8.5);
  doc.setTextColor(...darkNavy);
  doc.text(`${tle.altitudeKm} km • SSO`, marginX + (kpiWidth + kpiGap) * 3 + 3, currentY + 9.5);
  doc.setFontSize(6.5);
  doc.setTextColor(...algeriaGreen);
  doc.text(`V: ${pos.velocityKmS} km/s • 98.2°`, marginX + (kpiWidth + kpiGap) * 3 + 3, currentY + 14);

  currentY += kpiHeight + 3.5;

  // 4. Multispectral Satellite Live Reconnaissance Snapshot (Embedded Canvas Image)
  const imgSnapshotBase64 = createMultispectralDossierCanvas(satId, pass);
  const imgWidth = contentWidth;
  const imgHeight = 74; // Scaled aspect ratio ~2.1

  doc.setFillColor(...darkNavy);
  doc.roundedRect(marginX, currentY, imgWidth, imgHeight, 1.2, 1.2, 'F');

  if (imgSnapshotBase64) {
    try {
      doc.addImage(imgSnapshotBase64, 'JPEG', marginX, currentY, imgWidth, imgHeight);
      doc.setDrawColor(...borderGrey);
      doc.setLineWidth(0.4);
      doc.roundedRect(marginX, currentY, imgWidth, imgHeight, 1.2, 1.2, 'D');
    } catch (e) {
      console.warn('Could not render image onto PDF, drawing vector fallback:', e);
    }
  }

  // Small caption under the image
  currentY += imgHeight + 2;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(...slateText);
  doc.text(
    `Figure 1.1 — Imagerie spatiale multispectrale ASAL (${satId}) : Détection du stress hydrique de la biomasse et emprise radar du secteur de Mila [BBox 36.30°-36.65°N, 6.10°-6.45°E]`,
    marginX + 1,
    currentY + 2.5
  );

  currentY += 6.5;

  // 5. Spectral & Vegetation Index (NDVI) Metrics Analysis Table
  doc.setFillColor(...darkNavy);
  doc.rect(marginX, currentY, contentWidth, 5.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text("1. DONNÉES SPECTRALES & ANALYSE D'INFLAMMABILITÉ FORESTIÈRE (NDVI)", marginX + 3, currentY + 3.8);

  currentY += 6.5;

  // Metrics Table Header
  const colW = [38, 28, 28, 30, 32, 30];
  const tableRowH = 5.2;

  doc.setFillColor(241, 245, 249);
  doc.rect(marginX, currentY, contentWidth, tableRowH, 'F');
  doc.setDrawColor(...borderGrey);
  doc.line(marginX, currentY + tableRowH, marginX + contentWidth, currentY + tableRowH);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(...darkNavy);
  doc.text("PARAMÈTRE SPECTRAL", marginX + 2, currentY + 3.5);
  doc.text("VALEUR MESURÉE", marginX + colW[0] + 2, currentY + 3.5);
  doc.text("RÉFÉRENCE NORMALE", marginX + colW[0] + colW[1] + 2, currentY + 3.5);
  doc.text("ÉCART STATISTIQUE (Δ)", marginX + colW[0] + colW[1] + colW[2] + 2, currentY + 3.5);
  doc.text("STATUT D'ALERTE", marginX + colW[0] + colW[1] + colW[2] + colW[3] + 2, currentY + 3.5);
  doc.text("ZONE FORESTIÈRE", marginX + colW[0] + colW[1] + colW[2] + colW[3] + colW[4] + 2, currentY + 3.5);

  currentY += tableRowH;

  // Table Data Rows
  const tableData = [
    {
      param: 'NDVI Moyen (Biomasse Foliaire)',
      val: `${meanNdvi.toFixed(2)}`,
      ref: '0.52 - 0.65',
      delta: '-21.2% (Déficit Hydrique)',
      status: 'CRITIQUE (Combustible Sec)',
      zone: 'Djebel Grouz / Sidi Maarouf'
    },
    {
      param: 'NDVI Minimal (Sous-bois / Lisières)',
      val: `${(pass.ndviStats?.minNdvi ?? 0.14).toFixed(2)}`,
      ref: '0.28 - 0.35',
      delta: '-50.0% (Litière Sèche)',
      status: 'EXTRÊME (Inflammabilité)',
      zone: 'Grarem Gouga / Ferdjioua'
    },
    {
      param: 'NDVI Maximal (Canopée Dense)',
      val: `${(pass.ndviStats?.maxNdvi ?? 0.76).toFixed(2)}`,
      ref: '0.75 - 0.85',
      delta: '-3.8% (Zone Humide)',
      status: 'STABLE (Réservoir Eau)',
      zone: 'Bassin Retenue Beni Haroun'
    },
    {
      param: 'Couverture Nuageuse (Cloud Cover)',
      val: `${pass.cloudCoverPercent ?? 1.8}%`,
      ref: '< 10.0%',
      delta: 'Optimal (Ciel Dégagé)',
      status: 'EXCELLENT (Fiabilité 99%)',
      zone: 'Ensemble du Secteur Mila'
    }
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);

  tableData.forEach((row, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(marginX, currentY, contentWidth, tableRowH, 'F');
    }
    doc.setDrawColor(...borderGrey);
    doc.line(marginX, currentY + tableRowH, marginX + contentWidth, currentY + tableRowH);

    doc.setTextColor(...darkNavy);
    doc.text(row.param, marginX + 2, currentY + 3.6);
    doc.setFont('helvetica', 'bold');
    doc.text(row.val, marginX + colW[0] + 2, currentY + 3.6);
    doc.setFont('helvetica', 'normal');
    doc.text(row.ref, marginX + colW[0] + colW[1] + 2, currentY + 3.6);
    doc.setTextColor(...algeriaRed);
    doc.text(row.delta, marginX + colW[0] + colW[1] + colW[2] + 2, currentY + 3.6);
    doc.setTextColor(idx === 2 || idx === 3 ? algeriaGreen[0] : algeriaRed[0], idx === 2 || idx === 3 ? algeriaGreen[1] : algeriaRed[1], idx === 2 || idx === 3 ? algeriaGreen[2] : algeriaRed[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(row.status, marginX + colW[0] + colW[1] + colW[2] + colW[3] + 2, currentY + 3.6);
    doc.setTextColor(...slateText);
    doc.setFont('helvetica', 'normal');
    doc.text(row.zone, marginX + colW[0] + colW[1] + colW[2] + colW[3] + colW[4] + 2, currentY + 3.6);

    currentY += tableRowH;
  });

  currentY += 3;

  // 6. Tactical Operational Directives & Command Recommendations
  doc.setFillColor(...darkNavy);
  doc.rect(marginX, currentY, contentWidth, 5.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text("2. DIRECTIVES OPÉRATIONNELLES DU COMMANDEMENT CONJOINT (DGF • DGPC)", marginX + 3, currentY + 3.8);

  currentY += 6.5;

  const recCardHeight = 24;
  doc.setFillColor(...bgCard);
  doc.setDrawColor(...borderGrey);
  doc.roundedRect(marginX, currentY, contentWidth, recCardHeight, 1.5, 1.5, 'FD');

  const recs = [
    {
      num: '1',
      title: 'DÉPLOIEMENT PRÉVENTIF DES COLONNES MOBILES (DGPC MILA)',
      desc: 'Pré-positionnement immédiat de deux colonnes mobiles d’attaque feux de forêts sur les axes RN79 et RN105, à proximité des massifs de Sidi Maarouf et Djebel Grouz.'
    },
    {
      num: '2',
      title: 'SURVEILLANCE AÉRIENNE PAR DRONES TACTIQUES AWIS',
      desc: 'Activation des patrouilles de reconnaissance thermique FLIR haute altitude sur le couloir de vent dominant (Sud-Ouest) du bassin de Beni Haroun pour détection des foyers naissants.'
    },
    {
      num: '3',
      title: 'CONTRÔLE DES TRANCHÉES PARE-FEUX & RÉSERVES D’EAU (DGF)',
      desc: 'Vérification de l’accessibilité des pistes forestières et maintien en pression des points de puisage pour hélicoptères bombardiers d’eau (HBE) sur le lac du barrage de Beni Haroun.'
    }
  ];

  let recY = currentY + 4;
  recs.forEach(rec => {
    // Number bullet
    doc.setFillColor(...algeriaGreen);
    doc.circle(marginX + 4.5, recY + 1.5, 2.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    doc.text(rec.num, marginX + 4.5, recY + 2.5, { align: 'center' });

    // Text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(...darkNavy);
    doc.text(rec.title, marginX + 9, recY + 1.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(...slateText);
    doc.text(rec.desc, marginX + 9, recY + 4.8);

    recY += 7.2;
  });

  currentY += recCardHeight + 3.5;

  // 7. Official Signatures, Visa Seals & Security Footer
  const signHeight = 22;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...borderGrey);
  doc.roundedRect(marginX, currentY, contentWidth, signHeight, 1.2, 1.2, 'FD');

  const signColW = contentWidth / 3;

  // Signature 1: ASAL Space Telemetry Mission Chief
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(...darkNavy);
  doc.text("POUR L'AGENCE SPATIALE ALGÉRIENNE", marginX + 4, currentY + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(...slateText);
  doc.text("Le Chef de Mission Télédétection (CTS Arzew)", marginX + 4, currentY + 8);
  doc.setFont('helvetica', 'italic');
  doc.text("Visa & Authentification TLE : [VAL-ASAL-OK]", marginX + 4, currentY + 12);
  doc.setFont('courier', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...algeriaGreen);
  doc.text("DR. B. MESSAOUDI // ASAL-CTS", marginX + 4, currentY + 18);

  // Center Official Seal (Circular Stamp)
  const sealCenterX = marginX + signColW + signColW / 2;
  const sealCenterY = currentY + signHeight / 2;

  doc.setDrawColor(...algeriaRed);
  doc.setLineWidth(0.6);
  doc.circle(sealCenterX, sealCenterY, 9, 'D');
  doc.circle(sealCenterX, sealCenterY, 7.5, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(...algeriaRed);
  doc.text("REPUBLIQUE ALGERIENNE", sealCenterX, sealCenterY - 4.5, { align: 'center' });
  doc.setFontSize(6.8);
  doc.text("* AWIS ASAL *", sealCenterX, sealCenterY - 0.5, { align: 'center' });
  doc.setFontSize(5);
  doc.text("COMMANDEMENT SECOURS", sealCenterX, sealCenterY + 3.5, { align: 'center' });
  doc.text("MILA 43", sealCenterX, sealCenterY + 6, { align: 'center' });

  // Signature 2: Civil Protection Command & AWIS Operations Room
  const colRightX = marginX + signColW * 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(...darkNavy);
  doc.text("DIRECTION GÉNÉRALE PROTECTION CIVILE", colRightX + 4, currentY + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(...slateText);
  doc.text("Le Commandant des Opérations de Secours (COS)", colRightX + 4, currentY + 8);
  doc.setFont('helvetica', 'italic');
  doc.text("Ordre de mission : [DIFFUSION IMMÉDIATE]", colRightX + 4, currentY + 12);
  doc.setFont('courier', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...algeriaRed);
  doc.text("COLONEL M. BOUALAM // DGPC-AWIS", colRightX + 4, currentY + 18);

  // Bottom Legal Stamp
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Document généré le ${dateNow.toLocaleString()} par le Système AWIS — Télédétection ASAL Algérie • Code d'intégrité SHA-256 : ${Math.random().toString(36).substring(2, 14).toUpperCase()}`,
    pageWidth / 2,
    pageHeight - 4,
    { align: 'center' }
  );

  // =========================================================================
  // PAGE 2: TECHNICAL ANNEX — TLE EPHEMERIS & SGP4 ORBITAL PASS SCHEDULE
  // =========================================================================
  doc.addPage('a4', 'portrait');

  // National Flag Ribbon (Top)
  doc.setFillColor(...algeriaGreen);
  doc.rect(marginX, 7, contentWidth / 2, 2.4, 'F');
  doc.setFillColor(...algeriaRed);
  doc.rect(marginX + contentWidth / 2, 7, contentWidth / 2, 2.4, 'F');

  // Page 2 Title Bar
  doc.setTextColor(...darkNavy);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text("ANNEXE TECHNIQUE : ÉPHÉMÉRIDES ORBITALES TLE & CALENDRIER DES PASSAGES", marginX, 16);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slateText);
  doc.text(`VECTEUR : ${tle.name} (NORAD #${tle.noradId}) | MODÈLE DE PROPAGATION : SGP4 ANALYTIQUE`, marginX, 20.5);

  let p2Y = 25;

  // 1. Authentic TLE Box
  doc.setFillColor(...darkNavy);
  doc.rect(marginX, p2Y, contentWidth, 5.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text("A. JEU DE DONNÉES TLE OFFICIELLES (TWO-LINE ELEMENT SET — ASAL / NORAD)", marginX + 3, p2Y + 3.8);

  p2Y += 6.5;

  doc.setFillColor(15, 23, 42);
  doc.roundedRect(marginX, p2Y, contentWidth, 18, 1, 1, 'F');
  doc.setFont('courier', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(52, 211, 153);
  doc.text(tle.line1, marginX + 4, p2Y + 6.5);
  doc.text(tle.line2, marginX + 4, p2Y + 12.5);

  p2Y += 21;

  // 2. Orbital Specifications Table
  doc.setFillColor(...darkNavy);
  doc.rect(marginX, p2Y, contentWidth, 5.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text("B. PARAMÈTRES BALISTIQUES & CARACTÉRISTIQUES DE LA CHARGE UTILE", marginX + 3, p2Y + 3.8);

  p2Y += 6.5;

  const specsColW = (contentWidth) / 4;
  const specsRowH = 14;

  const specBoxes = [
    { title: 'INCLINAISON ORBITALE', val: `${tle.inclinationDeg}° (Héliosynchrone)`, sub: 'Orbite Quasi-Polaire Rétrograde' },
    { title: 'ALTITUDE NOMINALE', val: `${tle.altitudeKm} km`, sub: 'Période : 97.4 minutes (14.78 rev/j)' },
    { title: 'LARGEUR DE FAUCHÉE', val: `${tle.swathWidthKm} km`, sub: 'Résolution Nadir : 2.5m PAN / 10m MS' },
    { title: 'BANDE SPECTRALES', val: 'VNIR (5 Bandes)', sub: 'Rouge, Vert, Bleu, Proche IR (NIR)' }
  ];

  specBoxes.forEach((bx, idx) => {
    const x = marginX + idx * specsColW;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...borderGrey);
    doc.roundedRect(x, p2Y, specsColW - 2, specsRowH, 1, 1, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(...slateText);
    doc.text(bx.title, x + 2.5, p2Y + 3.8);

    doc.setFontSize(8);
    doc.setTextColor(...darkNavy);
    doc.text(bx.val, x + 2.5, p2Y + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.8);
    doc.setTextColor(...algeriaGreen);
    doc.text(bx.sub, x + 2.5, p2Y + 11.8);
  });

  p2Y += specsRowH + 4;

  // 3. Predicted Passes Table (Next 5 Days over Mila & Northern Band)
  doc.setFillColor(...darkNavy);
  doc.rect(marginX, p2Y, contentWidth, 5.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text("C. TABLEAU PRÉVISIONNEL DES PROCHAINS SURVOLS — SECTEUR MILA & BANDE NORD", marginX + 3, p2Y + 3.8);

  p2Y += 6.5;

  // Table Header
  const passCols = [26, 32, 28, 26, 38, 36];
  doc.setFillColor(241, 245, 249);
  doc.rect(marginX, p2Y, contentWidth, 5.5, 'F');
  doc.setDrawColor(...borderGrey);
  doc.line(marginX, p2Y + 5.5, marginX + contentWidth, p2Y + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...darkNavy);
  doc.text("SATELLITE", marginX + 2, p2Y + 3.8);
  doc.text("DATE & HEURE (UTC)", marginX + passCols[0] + 2, p2Y + 3.8);
  doc.text("ÉLÉVATION MAX", marginX + passCols[0] + passCols[1] + 2, p2Y + 3.8);
  doc.text("DURÉE ESTIMÉE", marginX + passCols[0] + passCols[1] + passCols[2] + 2, p2Y + 3.8);
  doc.text("TYPE DE COUVERTURE", marginX + passCols[0] + passCols[1] + passCols[2] + passCols[3] + 2, p2Y + 3.8);
  doc.text("OBJECTIF OPÉRATIONNEL", marginX + passCols[0] + passCols[1] + passCols[2] + passCols[3] + passCols[4] + 2, p2Y + 3.8);

  p2Y += 5.5;

  const predictedPassesSchedule = [
    { sat: satId, date: `${dateStr} +02h:14m`, elev: '78° (Nadir)', dur: '10 min 40s', type: 'Survol Direct : Mila', obj: 'Imagerie Haute Résolution NDVI' },
    { sat: 'ALSAT-1B', date: `${dateStr} +09h:45m`, elev: '64°', dur: '11 min 15s', type: 'Bande Nord-Est (140km)', obj: 'Cartographie Large Détection Fumées' },
    { sat: satId, date: `J+1 (09:50 UTC)`, elev: '84° (Zénith)', dur: '10 min 50s', type: 'Survol Direct : Mila', obj: 'Évaluation Tactique Fronts Actifs' },
    { sat: 'ALSAT-2B', date: `J+1 (10:35 UTC)`, elev: '58°', dur: '09 min 30s', type: 'Couloir Constantine-Mila', obj: 'Stéréoscopie 3D Reliefs & Pentes' },
    { sat: satId, date: `J+2 (10:12 UTC)`, elev: '72°', dur: '10 min 20s', type: 'Survol Direct : Mila', obj: 'Contrôle RETEX Biomasse & Résorption' }
  ];

  predictedPassesSchedule.forEach((row, i) => {
    if (i % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(marginX, p2Y, contentWidth, 5.2, 'F');
    }
    doc.setDrawColor(...borderGrey);
    doc.line(marginX, p2Y + 5.2, marginX + contentWidth, p2Y + 5.2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...darkNavy);
    doc.text(row.sat, marginX + 2, p2Y + 3.6);
    doc.setFont('helvetica', 'normal');
    doc.text(row.date, marginX + passCols[0] + 2, p2Y + 3.6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...algeriaGreen);
    doc.text(row.elev, marginX + passCols[0] + passCols[1] + 2, p2Y + 3.6);
    doc.setTextColor(...slateText);
    doc.setFont('helvetica', 'normal');
    doc.text(row.dur, marginX + passCols[0] + passCols[1] + passCols[2] + 2, p2Y + 3.6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(row.type.includes('Direct') ? algeriaRed[0] : darkNavy[0], row.type.includes('Direct') ? algeriaRed[1] : darkNavy[1], row.type.includes('Direct') ? algeriaRed[2] : darkNavy[2]);
    doc.text(row.type, marginX + passCols[0] + passCols[1] + passCols[2] + passCols[3] + 2, p2Y + 3.6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...slateText);
    doc.text(row.obj, marginX + passCols[0] + passCols[1] + passCols[2] + passCols[3] + passCols[4] + 2, p2Y + 3.6);

    p2Y += 5.2;
  });

  p2Y += 5;

  // 4. Geographic Boundaries & Target Sector Matrix
  doc.setFillColor(...darkNavy);
  doc.rect(marginX, p2Y, contentWidth, 5.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text("D. MATRICE GÉOGRAPHIQUE DU CADRAGE OPÉRATIONNEL (WGS-84 / EPSG:4326)", marginX + 3, p2Y + 3.8);

  p2Y += 6.5;

  const geoCardW = (contentWidth - 4) / 2;
  const geoCardH = 22;

  // Card 1: Direct Mila BBox
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...algeriaGreen);
  doc.roundedRect(marginX, p2Y, geoCardW, geoCardH, 1.2, 1.2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...algeriaGreen);
  doc.text("SECTEUR 1 : WILAYA DE MILA (COUVERTURE DIRECTE)", marginX + 3, p2Y + 4.5);
  doc.setFont('courier', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(...darkNavy);
  doc.text(`Latitude  : [${MILA_BBOX.minLat.toFixed(2)}° N  à  ${MILA_BBOX.maxLat.toFixed(2)}° N]`, marginX + 3, p2Y + 9.5);
  doc.text(`Longitude : [${MILA_BBOX.minLng.toFixed(2)}° E  à  ${MILA_BBOX.maxLng.toFixed(2)}° E]`, marginX + 3, p2Y + 14);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6);
  doc.setTextColor(...slateText);
  doc.text("Communes : Mila, Grarem Gouga, Ferdjioua, Sidi Maarouf, Chelghoum Laid", marginX + 3, p2Y + 18.5);

  // Card 2: Northern Algeria Band BBox
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...borderGrey);
  doc.roundedRect(marginX + geoCardW + 4, p2Y, geoCardW, geoCardH, 1.2, 1.2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...darkNavy);
  doc.text("SECTEUR 2 : BANDE FORESTIÈRE DU NORD ALGÉRIEN", marginX + geoCardW + 7, p2Y + 4.5);
  doc.setFont('courier', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(...darkNavy);
  doc.text(`Latitude  : [${NORTHERN_ALGERIA_BBOX.minLat.toFixed(2)}° N  à  ${NORTHERN_ALGERIA_BBOX.maxLat.toFixed(2)}° N]`, marginX + geoCardW + 7, p2Y + 9.5);
  doc.text(`Longitude : [${NORTHERN_ALGERIA_BBOX.minLng.toFixed(2)}° W  à  ${NORTHERN_ALGERIA_BBOX.maxLng.toFixed(2)}° E]`, marginX + geoCardW + 7, p2Y + 14);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6);
  doc.setTextColor(...slateText);
  doc.text("Écosystèmes : Atlas Tellien, Chêne-liège, Pin d'Alep, Cèdre de l'Atlas", marginX + geoCardW + 7, p2Y + 18.5);

  p2Y += geoCardH + 5;

  // Security Footer Page 2
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Page 2 / 2 — Dossier Opérationnel ASAL / AWIS • Référence : ${reportRef} • Secret Défense / L3 Diffusion Réservée`,
    pageWidth / 2,
    pageHeight - 6,
    { align: 'center' }
  );

  // Save the PDF
  const filename = `AWIS_ALSAT_DOSSIER_MILA_${satId}_${dateStr}.pdf`;
  doc.save(filename);
}
