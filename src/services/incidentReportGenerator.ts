import { jsPDF } from 'jspdf';
import { WildfireIncident, Language, DroneEdgeVisionTelemetry, AlsatRealtimePosition } from '../types';
import { computeRothermelHazardArea } from './cellBroadcastService';
import { computeDroneTacticalAssessment } from './droneReconService';

export interface DroneReconSnapshotData {
  incidentId: string;
  imageBase64: string;
  timestamp: string;
  mode: 'thermal_flir' | 'optical_rgb' | 'fused_pip';
  coreTempC: number;
  flameHeightM: number;
  frpMw: number;
  waterDropTarget: {
    lat: number;
    lng: number;
    wgs84: string;
    utm: string;
  };
  callsign: string;
}

// In-memory cache of attached drone recon snapshots
const droneSnapshotCache: Record<string, DroneReconSnapshotData> = {};

export function saveDroneReconSnapshot(snapshot: DroneReconSnapshotData): void {
  droneSnapshotCache[snapshot.incidentId] = snapshot;
  try {
    localStorage.setItem(`awis_recon_snapshot_${snapshot.incidentId}`, JSON.stringify(snapshot));
  } catch (e) {
    console.warn('Could not cache snapshot in localStorage', e);
  }
}

export function getLatestDroneReconSnapshot(incidentId: string): DroneReconSnapshotData | null {
  if (droneSnapshotCache[incidentId]) {
    return droneSnapshotCache[incidentId];
  }
  try {
    const raw = localStorage.getItem(`awis_recon_snapshot_${incidentId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      droneSnapshotCache[incidentId] = parsed;
      return parsed;
    }
  } catch (e) {
    // fallback
  }
  return null;
}

export interface SovereignExecutiveReportData {
  incident: WildfireIncident;
  droneTelemetry?: DroneEdgeVisionTelemetry;
  alsatPosition?: AlsatRealtimePosition;
  commandingOfficer?: string;
  securityClassification?: 'SECRET-DEFENSE // CONFIDENTIEL' | 'TACTICAL-RESTRICTED';
  generationDate?: string;
  droneReconSnapshotBase64?: string;
  droneReconSnapshotMetadata?: Partial<DroneReconSnapshotData>;
}

/**
 * Generates an official, sovereign high-command intelligence dossier (PDF)
 * ready for the General Directorate of Civil Protection & High National Security Council
 */
export function generateExecutiveIncidentReport(
  data: SovereignExecutiveReportData,
  lang: Language = 'ar'
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2; // 182mm

  const isAr = lang === 'ar';
  const inc = data.incident;
  const hazard = computeRothermelHazardArea(inc, 6);
  const droneAssessment = computeDroneTacticalAssessment(inc);
  const reportRef = `AWIS-SOV-${inc.id}-${Date.now().toString(36).toUpperCase()}`;

  // Government Palette
  const darkNavy = [15, 23, 42] as const; // #0f172a
  const algeriaGreen = [4, 120, 87] as const; // #047857
  const algeriaRed = [185, 28, 28] as const; // #b91c1c
  const goldAccent = [217, 119, 6] as const; // #d97706
  const bgCard = [248, 250, 252] as const; // #f8fafc
  const borderGrey = [203, 213, 225] as const; // #cbd5e1

  // =========================================================================
  // 1. TOP NATIONAL COLOR BARS & OFFICIAL GOVERNMENT SEAL
  // =========================================================================
  doc.setFillColor(...algeriaGreen);
  doc.rect(marginX, 8, contentWidth / 2, 2.5, 'F');
  doc.setFillColor(...algeriaRed);
  doc.rect(marginX + contentWidth / 2, 8, contentWidth / 2, 2.5, 'F');

  // National Crest Circular Emblem
  doc.setDrawColor(...darkNavy);
  doc.setLineWidth(0.4);
  doc.setFillColor(255, 255, 255);
  doc.circle(marginX + 8, 23, 7.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...algeriaGreen);
  doc.text('DZ', marginX + 8, 21.5, { align: 'center' });
  doc.setTextColor(...algeriaRed);
  doc.setFontSize(7);
  doc.text('* C', marginX + 8, 25.5, { align: 'center' });

  // Official State Headings
  doc.setTextColor(...darkNavy);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(
    'RÉPUBLIQUE ALGÉRIENNE DÉMOCRATIQUE ET POPULAIRE',
    marginX + 20,
    18
  );
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(
    'MINISTÈRE DE L’INTÉRIEUR, DES COLLECTIVITÉS LOCALES ET DE L’AMÉNAGEMENT DU TERRITOIRE',
    marginX + 20,
    22.5
  );
  doc.text(
    'DIRECTION GÉNÉRALE DE LA PROTECTION CIVILE — CENTRE OPÉRATIONNEL NATIONAL (AWIS)',
    marginX + 20,
    26.5
  );

  // Security Classification Stamp (Top Right)
  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(...algeriaRed);
  doc.roundedRect(pageWidth - marginX - 52, 14, 52, 15, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...algeriaRed);
  doc.text('DIFFUSION RESTREINTE / L3', pageWidth - marginX - 26, 19.5, { align: 'center' });
  doc.setFontSize(6.5);
  doc.setTextColor(...darkNavy);
  doc.text(`DOSSIER: ${reportRef}`, pageWidth - marginX - 26, 24, { align: 'center' });

  // Divider Line
  doc.setDrawColor(...borderGrey);
  doc.setLineWidth(0.5);
  doc.line(marginX, 32, pageWidth - marginX, 32);

  // =========================================================================
  // 2. EXECUTIVE REPORT TITLE & METADATA BAR
  // =========================================================================
  let currentY = 39;
  doc.setFillColor(...bgCard);
  doc.setDrawColor(...borderGrey);
  doc.roundedRect(marginX, currentY, contentWidth, 14, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...darkNavy);
  doc.text(
    `RAPPORT STRATÉGIQUE D'INTERVENTION FEUX DE FORÊT — ${inc.code || 'INCIDENT DZ'}`,
    marginX + 4,
    currentY + 6.5
  );
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Wilaya: ${inc.wilaya} | Commune/Lieu: ${inc.locationName || 'Zone Nord'} | Horodatage: ${new Date().toLocaleString()} UTC`,
    marginX + 4,
    currentY + 11
  );

  currentY += 19;

  // =========================================================================
  // 3. SYNTHÈSE TACTIQUE & NIVEAU DE DANGER (KEY METRICS CARDS)
  // =========================================================================
  const cardWidth = (contentWidth - 6) / 3;
  const cardHeight = 22;

  // Card 1: Coordonnées & Risque
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(marginX, currentY, cardWidth, cardHeight, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('POSITIONNEMENT GPS', marginX + 3, currentY + 5.5);
  doc.setFontSize(9.5);
  doc.setTextColor(...darkNavy);
  doc.text(`${inc.coordinates.lat.toFixed(4)}°N, ${inc.coordinates.lng.toFixed(4)}°E`, marginX + 3, currentY + 11.5);
  doc.setFontSize(7);
  doc.setTextColor(...algeriaRed);
  doc.text(`RISQUE: ${inc.riskLevel.toUpperCase()} (FWI / ROTHERMEL)`, marginX + 3, currentY + 17);

  // Card 2: Surface & Propagation
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(marginX + cardWidth + 3, currentY, cardWidth, cardHeight, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('SURFACE BRÛLÉE & FRONT', marginX + cardWidth + 6, currentY + 5.5);
  doc.setFontSize(9.5);
  doc.setTextColor(...darkNavy);
  doc.text(`~${inc.estimatedBurnedHectares} Hectares`, marginX + cardWidth + 6, currentY + 11.5);
  doc.setFontSize(7);
  doc.setTextColor(217, 119, 6);
  doc.text(`Vitesse de front: ~${(inc.windSpeedKmH * 0.065).toFixed(1)} km/h`, marginX + cardWidth + 6, currentY + 17);

  // Card 3: Conditions Aérologiques
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(marginX + (cardWidth + 3) * 2, currentY, cardWidth, cardHeight, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('CONDITIONS MÉTÉO', marginX + (cardWidth + 3) * 2 + 3, currentY + 5.5);
  doc.setFontSize(9.5);
  doc.setTextColor(...darkNavy);
  doc.text(`${inc.windSpeedKmH} km/h (${inc.windDirectionCardinal || 'SW'})`, marginX + (cardWidth + 3) * 2 + 3, currentY + 11.5);
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(`Direction: ${inc.windDirectionDegrees}° | T: 34°C | HR: 22%`, marginX + (cardWidth + 3) * 2 + 3, currentY + 17);

  currentY += cardHeight + 6;

  // =========================================================================
  // 4. SECTION A: COUVERTURE SATELLITAIRE ALSAT (ASAL)
  // =========================================================================
  doc.setFillColor(...darkNavy);
  doc.rect(marginX, currentY, contentWidth, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('1. APPORT SPATIAL NATIONAL — AGENCE SPATIALE ALGÉRIENNE (ASAL ALSAT)', marginX + 3, currentY + 4.2);

  currentY += 8;
  doc.setFillColor(...bgCard);
  doc.roundedRect(marginX, currentY, contentWidth, 24, 1.5, 1.5, 'FD');

  const satId = data.alsatPosition?.satelliteId || 'ALSAT-1B';
  const satAlt = data.alsatPosition?.altitudeKm || 670;
  const satVel = (data.alsatPosition?.velocityKmS || 7.52).toFixed(2);
  const satLat = (data.alsatPosition?.subSatellitePoint?.lat || 35.8).toFixed(2);
  const satLng = (data.alsatPosition?.subSatellitePoint?.lng || 4.2).toFixed(2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...darkNavy);
  doc.text(`Satellite de veille actif: ${satId} (Orbite Héliosynchrone SSO 98.2°)`, marginX + 4, currentY + 6);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`• Position Nadir Actuelle: ${satLat}°N, ${satLng}°E | Altitude: ${satAlt} km | Vélocité orbitale: ${satVel} km/s`, marginX + 4, currentY + 11);
  doc.text(`• Couverture spectrale: Bandes Rouge (630-690nm) & Proche Infrarouge NIR (760-900nm) pour indice de stress hydrique NDVI.`, marginX + 4, currentY + 15.5);
  doc.text(`• Synthèse sécheresse: Indice de sévérité du massif forestier: CRITIQUE (<0.32 NDVI) — Risque d'embrasement spontané accru.`, marginX + 4, currentY + 20);

  currentY += 28;

  // =========================================================================
  // 5. SECTION B: TÉLÉMÉTRIE DE RECONNAISSANCE DRONE UAV (FLIR / OPTIQUE)
  // =========================================================================
  doc.setFillColor(...darkNavy);
  doc.rect(marginX, currentY, contentWidth, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('2. CALIBRATION TACTIQUE PAR VECTEUR AÉRIEN DRONE (FLIR / THERMOGRAPHIE)', marginX + 3, currentY + 4.2);

  currentY += 8;

  const flameHeight = data.droneTelemetry?.visionDetections.measuredFlameHeightMeters ?? droneAssessment.flameHeightMeters;
  const coreTemp = data.droneTelemetry?.visionDetections.peakRadiometricTempC ?? droneAssessment.maxHotspotTempC;
  const droneAlt = data.droneTelemetry?.dronePosition.altitudeAglMeters ?? 340;
  const dropLat = droneAssessment.recommendedDropPoint.lat;
  const dropLng = droneAssessment.recommendedDropPoint.lng;

  // Retrieve any attached or cached drone recon snapshot for this incident
  const attachedSnapshot = data.droneReconSnapshotBase64
    ? { imageBase64: data.droneReconSnapshotBase64, timestamp: data.generationDate || new Date().toISOString() }
    : getLatestDroneReconSnapshot(inc.id);

  const hasSnapshot = Boolean(attachedSnapshot?.imageBase64);
  const droneCardHeight = hasSnapshot ? 44 : 30;

  doc.setFillColor(...bgCard);
  doc.roundedRect(marginX, currentY, contentWidth, droneCardHeight, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...darkNavy);
  doc.text('Paramètres physiques mesurés par caméra radiométrique aéroportée:', marginX + 4, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`• Température maximale du foyer de flamme: ${coreTemp}°C (Mesure infrarouge étalonnée).`, marginX + 4, currentY + 11);
  doc.text(`• Hauteur mesurée des flammes de front: ${flameHeight} mètres | Puissance radiative d'incendie (FRP): ${droneAssessment.fireRadiativePowerMw} MW.`, marginX + 4, currentY + 15.5);
  doc.text(`• Altitude de vol d'observation: ${droneAlt}m AGL | Dé-brumage par algorithme IA actif.`, marginX + 4, currentY + 20);
  doc.text(`• Coordonnées optimales de largage Canadair / Hélicoptère: ${dropLat}°N, ${dropLng}°E (Ligne d'arrêt humide).`, marginX + 4, currentY + 24.5);

  if (hasSnapshot && attachedSnapshot?.imageBase64) {
    doc.text(`• Cible d'arrosage L3 transmise à la flotte aérienne Protection Civile.`, marginX + 4, currentY + 29);
    doc.text(`• Cliché haute résolution validé pour l'enquête technique et le dossier d'indemnisation.`, marginX + 4, currentY + 33.5);

    try {
      const imgW = 54;
      const imgH = 34;
      const imgX = marginX + contentWidth - imgW - 3;
      const imgY = currentY + 4;

      // Dark background for tactical photo
      doc.setFillColor(15, 23, 42);
      doc.roundedRect(imgX - 0.8, imgY - 0.8, imgW + 1.6, imgH + 1.6, 1, 1, 'F');

      // Embed the drone recon image
      doc.addImage(attachedSnapshot.imageBase64, 'JPEG', imgX, imgY, imgW, imgH);

      // Algeria Green Tactical Frame
      doc.setDrawColor(...algeriaGreen);
      doc.setLineWidth(0.4);
      doc.roundedRect(imgX, imgY, imgW, imgH, 0.5, 0.5, 'D');

      // Caption
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(...algeriaGreen);
      doc.text('CLICHÉ RECO FLIR AÉROPORTÉ L3', imgX + imgW / 2, imgY + imgH + 3.2, { align: 'center' });
    } catch (e) {
      console.warn('Could not embed drone snapshot image into PDF', e);
    }
  }

  currentY += droneCardHeight + 4;

  // =========================================================================
  // 6. SECTION C: CONE D'ÉVACUATION CELL BROADCAST / ALERTE POPULATION
  // =========================================================================
  doc.setFillColor(...darkNavy);
  doc.rect(marginX, currentY, contentWidth, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('3. DIFFUSION D\'URGENCE CELL BROADCAST & SMS GÉOCIBLÉ (G-04)', marginX + 3, currentY + 4.2);

  currentY += 8;
  doc.setFillColor(...bgCard);
  doc.roundedRect(marginX, currentY, contentWidth, 24, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`• Boîte d'aléa géographique (Bounding Box): Lat [${hazard.minLat}°N - ${hazard.maxLat}°N] | Lng [${hazard.minLng}°E - ${hazard.maxLng}°E].`, marginX + 4, currentY + 6);
  doc.text(`• Rayon de précaution sous le vent: ${hazard.radiusKm} km | Population totale estimée dans le cône: ~${hazard.estimatedAffectedPopulation.toLocaleString()} résidents.`, marginX + 4, currentY + 11);
  doc.text(`• Pylônes télécoms alertés: ${hazard.cellTowersCount} BTS (Mobilis, Djezzy, Ooredoo) | Protocole CAP v1.2 activé.`, marginX + 4, currentY + 15.5);
  doc.text(`• Ordre émis: Évacuation immédiate des habitations forestières vers les axes carrossables sécurisés.`, marginX + 4, currentY + 20);

  currentY += 28;

  // =========================================================================
  // 7. SECTION D: VISA D'AUTORITÉ & SCEAU OFFICIEL (SIGN-OFF BLOCK)
  // =========================================================================
  const visaBoxHeight = 36;
  doc.setDrawColor(...borderGrey);
  doc.roundedRect(marginX, currentY, contentWidth, visaBoxHeight, 2, 2, 'D');

  const halfWidth = contentWidth / 2;

  // Left: Officer Identification & Time Stamp
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...darkNavy);
  doc.text('VISA DE TRANSMISSION OPÉRATIONNELLE', marginX + 4, currentY + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Officier de commandement: ${data.commandingOfficer || 'COLONEL B. MUSTAPHA'}`, marginX + 4, currentY + 12);
  doc.text('Poste de Commandement Fixe (Wilaya) / L3 Command', marginX + 4, currentY + 17);
  doc.text(`Date & Heure: ${new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC`, marginX + 4, currentY + 22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...algeriaGreen);
  doc.text('STATUT: VALIDÉ ET TRANSMIS AU C.C.O', marginX + 4, currentY + 28);

  // Right: Official Circular Stamp Representation
  const stampCenterX = marginX + halfWidth + 45;
  const stampCenterY = currentY + 18;

  doc.setDrawColor(...algeriaGreen);
  doc.setLineWidth(0.6);
  doc.circle(stampCenterX, stampCenterY, 13, 'D');
  doc.setLineWidth(0.2);
  doc.circle(stampCenterX, stampCenterY, 11, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(...algeriaGreen);
  doc.text('DIRECTION GÉNÉRALE', stampCenterX, stampCenterY - 6.5, { align: 'center' });
  doc.text('PROTECTION CIVILE', stampCenterX, stampCenterY - 3.5, { align: 'center' });
  doc.setFontSize(7);
  doc.setTextColor(...algeriaRed);
  doc.text('★ AWIS 2026 ★', stampCenterX, stampCenterY + 1, { align: 'center' });
  doc.setFontSize(6);
  doc.setTextColor(...algeriaGreen);
  doc.text('RÉP. ALGÉRIENNE', stampCenterX, stampCenterY + 5.5, { align: 'center' });
  doc.text('SECRÉTARIAT OPÉRATIONNEL', stampCenterX, stampCenterY + 8.5, { align: 'center' });

  // Bottom Security Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'DOCUMENT OFFICIEL GÉNÉRÉ PAR LE SYSTÈME DE DÉFENSE ET SURVEILLANCE DES FEUX DE FORÊT (AWIS) — TOUTE REPRODUCTION NON AUTORISÉE EST PASSIBLE DE POURSUITES',
    pageWidth / 2,
    pageHeight - 8,
    { align: 'center' }
  );

  // Save the generated PDF directly to user's device
  const filename = `AWIS_RAPPORT_STRATEGIQUE_${inc.id}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
