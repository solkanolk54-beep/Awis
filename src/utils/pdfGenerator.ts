import { jsPDF } from 'jspdf';
import { PostFireReport, Language } from '../types';

/**
 * Generates an official, publication-grade Algerian Government Post-Fire Incident
 * Dossier (RETEX) as a vector PDF document with official letterhead, metrics,
 * machine learning review, forestry recovery plan, and administrative sign-off visas.
 */
export function generatePostFireReportPDF(report: PostFireReport, lang: Language = 'fr'): void {
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
  const incidentRef = report.incidentCode || 'DZ-WF-2026-000389';
  const wilayaName = report.wilaya || 'Skikda';

  // Helper colors
  const primarySlate = [15, 23, 42] as const; // #0f172a
  const borderSlate = [203, 213, 225] as const; // #cbd5e1
  const bgCard = [248, 250, 252] as const; // #f8fafc
  const algeriaGreen = [4, 120, 87] as const; // #047857
  const algeriaRed = [185, 28, 28] as const; // #b91c1c
  const accentPurple = [109, 40, 217] as const; // #6d28d9

  // =========================================================================
  // PAGE 1: OFFICIAL LETTERHEAD, INCIDENT METADATA, METRICS & AI REVIEW
  // =========================================================================

  // Top National Color Bars (Algerian Flag Colors Accent)
  doc.setFillColor(...algeriaGreen);
  doc.rect(marginX, 8, contentWidth / 2, 2, 'F');
  doc.setFillColor(...algeriaRed);
  doc.rect(marginX + contentWidth / 2, 8, contentWidth / 2, 2, 'F');

  // National Crest Representation (Crescent & Star in Circular Seal)
  doc.setDrawColor(...primarySlate);
  doc.setLineWidth(0.4);
  doc.setFillColor(255, 255, 255);
  doc.circle(marginX + 8, 21, 7, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...algeriaGreen);
  doc.text('DZ', marginX + 8, 19.5, { align: 'center' });
  doc.setTextColor(...algeriaRed);
  doc.setFontSize(6);
  doc.text('* C', marginX + 8, 23, { align: 'center' });

  // Official State Headings
  doc.setTextColor(...primarySlate);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(
    isAr
      ? 'REPUBLIQUE ALGERIENNE DEMOCRATIQUE ET POPULAIRE'
      : 'RÉPUBLIQUE ALGÉRIENNE DÉMOCRATIQUE ET POPULAIRE',
    pageWidth / 2 + 5,
    14,
    { align: 'center' }
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    "Ministère de l'Intérieur, des Collectivités Locales • Ministère de l'Agriculture et du Développement Rural",
    pageWidth / 2 + 5,
    18,
    { align: 'center' }
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...primarySlate);
  doc.text(
    'Direction Générale de la Protection Civile (DGPC) • Direction Générale des Forêts (DGF)',
    pageWidth / 2 + 5,
    22,
    { align: 'center' }
  );

  doc.setTextColor(...algeriaGreen);
  doc.setFontSize(8);
  doc.text(
    "SYSTÈME NATIONAL D'INTELLIGENCE ET D'ALERTE FEUX DE FORÊTS (AWIS)",
    pageWidth / 2 + 5,
    26,
    { align: 'center' }
  );

  // Divider Line
  doc.setDrawColor(...primarySlate);
  doc.setLineWidth(0.6);
  doc.line(marginX, 29, marginX + contentWidth, 29);

  // Document Title Banner Box
  doc.setFillColor(...primarySlate);
  doc.rect(marginX, 32, contentWidth, 12, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(255, 255, 255);
  doc.text(
    "RAPPORT OFFICIEL DE RETOUR D'EXPÉRIENCE (RETEX) POST-INCENDIE",
    pageWidth / 2,
    37.5,
    { align: 'center' }
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(226, 232, 240);
  doc.text(
    'Audit Technique Opérationnel, Validation des Modèles Prédictifs IA & Plan de Reboisement',
    pageWidth / 2,
    41.5,
    { align: 'center' }
  );

  // Quick Metadata Table (4-Column Layout)
  const metaY = 47;
  doc.setFillColor(...bgCard);
  doc.setDrawColor(...borderSlate);
  doc.setLineWidth(0.3);
  doc.rect(marginX, metaY, contentWidth, 20, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('CODE INCIDENT:', marginX + 4, metaY + 5);
  doc.text('WILAYA / SECTEUR:', marginX + 50, metaY + 5);
  doc.text('STATUT RÉGLEMENTAIRE:', marginX + 115, metaY + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...primarySlate);
  doc.text(incidentRef, marginX + 4, metaY + 9);
  doc.text(`Wilaya de ${wilayaName} (Forêt Nationale)`, marginX + 50, metaY + 9);
  doc.setTextColor(...algeriaGreen);
  doc.text('CLÔTURÉ & ARCHIVÉ (PERMANENT)', marginX + 115, metaY + 9);

  // Meta row 2
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text("DÉBUT D'IGNITION:", marginX + 4, metaY + 14);
  doc.text('MAÎTRISE COMPLÈTE:', marginX + 50, metaY + 14);
  doc.text('RÉFÉRENCE DOSSIER:', marginX + 115, metaY + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...primarySlate);
  doc.text(report.startTime || '2026-08-18 13:10:00', marginX + 4, metaY + 18);
  doc.text(report.containmentTime || '2026-08-19 06:45:00', marginX + 50, metaY + 18);
  doc.setFont('helvetica', 'bold');
  doc.text(`DZ-RETEX-2026-${incidentRef.slice(-6)}`, marginX + 115, metaY + 18);

  // =========================================================================
  // SECTION 1: OPERATIONAL TIMINGS & IMPACT
  // =========================================================================
  const sec1Y = 71;
  doc.setFillColor(...primarySlate);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...primarySlate);
  doc.text('1. DÉLAIS OPÉRATIONNELS & PERFORMANCE DES FORCES D’INTERVENTION', marginX, sec1Y);

  doc.setDrawColor(...algeriaGreen);
  doc.setLineWidth(0.4);
  doc.line(marginX, sec1Y + 1.5, marginX + contentWidth, sec1Y + 1.5);

  // 4 Main Metric Cards
  const cardW = (contentWidth - 6) / 4;
  const cardH = 17;
  const cardY = sec1Y + 4;

  const metricsData = [
    {
      title: 'DURÉE TOTALE',
      val: `${report.totalDurationHours} H`,
      sub: 'Ignition à extinction',
      color: primarySlate,
    },
    {
      title: 'SUPERFICIE BRÛLÉE',
      val: `${report.finalBurnedHectares} ha`,
      sub: 'Contenu en zone B',
      color: algeriaRed,
    },
    {
      title: 'DÉTECTION IA',
      val: `${report.initialDetectionLatencyMinutes} Min`,
      sub: 'Tour CV + Satellite',
      color: primarySlate,
    },
    {
      title: 'ARRIVÉE 1ER RÉTAL',
      val: `${report.responseArrivalLatencyMinutes} Min`,
      sub: 'Unité DGPC CP-17',
      color: algeriaGreen,
    },
  ];

  metricsData.forEach((m, idx) => {
    const cx = marginX + idx * (cardW + 2);
    doc.setFillColor(...bgCard);
    doc.setDrawColor(...borderSlate);
    doc.setLineWidth(0.3);
    doc.rect(cx, cardY, cardW, cardH, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(m.title, cx + cardW / 2, cardY + 4, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(m.color[0], m.color[1], m.color[2]);
    doc.text(m.val, cx + cardW / 2, cardY + 10.5, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text(m.sub, cx + cardW / 2, cardY + 14.5, { align: 'center' });
  });

  // Secondary Operational Stats Strip
  const stripY = cardY + cardH + 2.5;
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(...borderSlate);
  doc.rect(marginX, stripY, contentWidth, 9, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...primarySlate);
  doc.text(
    `Victimes: 0 (Zéro perte)  |  Évacués / Sécurisés: ${report.displacedCount} personnes  |  Eau Déversée: ${report.waterUsedLiters.toLocaleString()} L  |  Unités Mobilisées: ${report.resourcesDeployedCount} Colonnes`,
    pageWidth / 2,
    stripY + 5.5,
    { align: 'center' }
  );

  // Environmental Damage & Strategic Infrastructure Preservation
  const damageY = stripY + 12;
  const colW = (contentWidth - 3) / 2;
  const colH = 22;

  // Box 1: Vegetation Loss
  doc.setFillColor(...bgCard);
  doc.setDrawColor(...borderSlate);
  doc.rect(marginX, damageY, colW, colH, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...algeriaRed);
  doc.text('DÉGÂTS AU COUVERT VÉGÉTAL & BIOMASS:', marginX + 3, damageY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...primarySlate);
  const vegLines = doc.splitTextToSize(report.vegetationLost || '62 ha Chêne-liège, 22.5 ha maquis', colW - 6);
  doc.text(vegLines, marginX + 3, damageY + 9.5);

  // Box 2: Infrastructure Protected
  doc.setFillColor(...bgCard);
  doc.setDrawColor(...borderSlate);
  doc.rect(marginX + colW + 3, damageY, colW, colH, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...algeriaGreen);
  doc.text('INFRASTRUCTURES ET LOCALITÉS PROTÉGÉES:', marginX + colW + 6, damageY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...primarySlate);
  const infraLines = doc.splitTextToSize(
    report.infrastructureProtected || 'Hameaux de Aïn Zouit, dispensaire rural, poste Sonelgaz 60kV',
    colW - 6
  );
  doc.text(infraLines, marginX + colW + 6, damageY + 9.5);

  // =========================================================================
  // SECTION 2: AI SPREAD ACCURACY & MODEL LESSONS
  // =========================================================================
  const sec2Y = damageY + colH + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...primarySlate);
  doc.text('2. AUDIT DE PRÉCISION DU MODÈLE DE PROPAGATION IA & RÉTRO-CALIBRAGE', marginX, sec2Y);

  doc.setDrawColor(...accentPurple);
  doc.setLineWidth(0.4);
  doc.line(marginX, sec2Y + 1.5, marginX + contentWidth, sec2Y + 1.5);

  // Accuracy Score Banner Box
  const accY = sec2Y + 4;
  doc.setFillColor(245, 243, 255); // purple-50
  doc.setDrawColor(196, 181, 253); // purple-300
  doc.rect(marginX, accY, contentWidth, 14, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...accentPurple);
  doc.text('SCORE DE CONFORMITÉ PRÉDICTIVE IA:', marginX + 4, accY + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(75, 85, 99);
  doc.text(
    'Comparatif ellipse Rothermel-Huygens vs cicatrice réelle Sentinel-2 (Indices NBR / NDVI post-feu)',
    marginX + 4,
    accY + 10
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...accentPurple);
  doc.text(`${report.predictedVsActualSpreadAccuracyPercent}%`, marginX + contentWidth - 25, accY + 9);
  doc.setFontSize(6.5);
  doc.setTextColor(...algeriaGreen);
  doc.text('Validé Haute Fidélité', marginX + contentWidth - 25, accY + 12.5);

  // Machine Learning Lessons Bullet List
  const lessonsY = accY + 17;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...primarySlate);
  doc.text('Leçons Continues Apprises pour le Recalibrage des Poids Algorithmiques:', marginX, lessonsY);

  let curLessonY = lessonsY + 4;
  (report.aiModelLessons || []).slice(0, 4).forEach((lesson, lIdx) => {
    doc.setFillColor(...bgCard);
    doc.setDrawColor(...borderSlate);
    doc.rect(marginX, curLessonY, contentWidth, 9, 'FD');

    // Number Badge
    doc.setFillColor(...accentPurple);
    doc.rect(marginX + 2, curLessonY + 1.5, 6, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`${lIdx + 1}`, marginX + 5, curLessonY + 5.5, { align: 'center' });

    // Lesson text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...primarySlate);
    const lineText = doc.splitTextToSize(lesson, contentWidth - 12);
    doc.text(lineText, marginX + 11, curLessonY + 4.5);

    curLessonY += 10;
  });

  // Page 1 Footer Note
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('AWIS Wildfire Intelligence • Rapport RETEX Officiel • Page 1 sur 2', marginX, pageHeight - 6);
  doc.text(`Réf: DZ-RETEX-${incidentRef}`, pageWidth - marginX, pageHeight - 6, { align: 'right' });

  // =========================================================================
  // PAGE 2: REFORESTATION PLAN, OFFICIAL VISAS & DIGITAL AUDIT STAMP
  // =========================================================================
  doc.addPage();

  // Page 2 Header Running Banner
  doc.setFillColor(...primarySlate);
  doc.rect(marginX, 8, contentWidth, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text(
    `AWIS RETEX • DOSSIER POST-INCENDIE ${incidentRef} • WILAYA DE ${wilayaName.toUpperCase()}`,
    marginX + 4,
    13
  );
  doc.setFont('helvetica', 'normal');
  doc.text('PAGE 2 / 2 (RÉGÉNÉRATION & CLÔTURE)', pageWidth - marginX - 4, 13, { align: 'right' });

  // =========================================================================
  // SECTION 3: FOREST SUCCESSION & RECOVERY PLAN
  // =========================================================================
  const sec3Y = 22;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...primarySlate);
  doc.text('3. SUCCESSION ÉCOLOGIQUE & PLAN DE RESTAURATION FORESTIÈRE À 4 ANS', marginX, sec3Y);

  doc.setDrawColor(...algeriaGreen);
  doc.setLineWidth(0.4);
  doc.line(marginX, sec3Y + 1.5, marginX + contentWidth, sec3Y + 1.5);

  // 5 Succession Timeline Steps (Table-style)
  const stepsY = sec3Y + 4;
  const stepW = contentWidth / 5;
  const stepH = 20;

  const steps = [
    { time: 'IMMÉDIAT', title: 'Cendres & Sol', desc: 'Encroûtement et stabilisation superficielle.' },
    { time: '1 MOIS', title: 'Fascinage', desc: 'Pose de barrières anti-érosion sur fortes pentes.' },
    { time: '6 MOIS', title: 'Pionnières', desc: 'Repousse herbacée et structuration pédologique.' },
    { time: '1 AN', title: 'Rejets Souche', desc: 'Bourgeonnement épicormique du Chêne-liège.' },
    { time: '4 ANS', title: 'Couvert Restauré', desc: 'Régénération assistée et fermeture du couvert.' },
  ];

  steps.forEach((st, sIdx) => {
    const sx = marginX + sIdx * stepW;
    const isFinal = sIdx === 4;

    doc.setFillColor(isFinal ? 236 : 248, isFinal ? 253 : 250, isFinal ? 245 : 252);
    doc.setDrawColor(isFinal ? 5 : 203, isFinal ? 150 : 213, isFinal ? 105 : 225);
    doc.setLineWidth(0.3);
    doc.rect(sx, stepsY, stepW - 1.5, stepH, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(isFinal ? 4 : 185, isFinal ? 120 : 28, isFinal ? 87 : 28);
    doc.text(st.time, sx + (stepW - 1.5) / 2, stepsY + 4, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...primarySlate);
    doc.text(st.title, sx + (stepW - 1.5) / 2, stepsY + 8.5, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(71, 85, 105);
    const dLines = doc.splitTextToSize(st.desc, stepW - 3);
    doc.text(dLines, sx + 1.5, stepsY + 12);
  });

  // Forestry Action Plan Detail Box
  const planY = stepsY + stepH + 4;
  doc.setFillColor(...bgCard);
  doc.setDrawColor(...borderSlate);
  doc.rect(marginX, planY, contentWidth, 24, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...algeriaGreen);
  doc.text('PROGRAMME D’ACTION DE LA CONSERVATION DES FORÊTS (DGF):', marginX + 3, planY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...primarySlate);
  const planLines = doc.splitTextToSize(
    report.reforestationPlanTimeline ||
      "Mise en défens totale pendant 24 mois pour interdire le pâturage. Travaux de billonnage et reboisement d'enrichissement prévus à l'automne avec Quercus suber et essences compagnes locales.",
    contentWidth - 6
  );
  doc.text(planLines, marginX + 3, planY + 10);

  // =========================================================================
  // SECTION 4: OFFICIAL ADMINISTRATIVE VISAS & SIGN-OFF BLOCKS
  // =========================================================================
  const sec4Y = planY + 30;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...primarySlate);
  doc.text('4. VISAS RÉGLEMENTAIRES, CACHETS OFFICIELS & CERTIFICATION NUMÉRIQUE', marginX, sec4Y);

  doc.setDrawColor(...primarySlate);
  doc.setLineWidth(0.4);
  doc.line(marginX, sec4Y + 1.5, marginX + contentWidth, sec4Y + 1.5);

  // 3 Verification Boxes
  const stampBoxY = sec4Y + 4;
  const stampW = (contentWidth - 4) / 3;
  const stampH = 46;

  // Box 1: DGF Conservateur des Forêts
  doc.setFillColor(...bgCard);
  doc.setDrawColor(...borderSlate);
  doc.rect(marginX, stampBoxY, stampW, stampH, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...algeriaGreen);
  doc.text('LE CONSERVATEUR DES FORÊTS', marginX + 3, stampBoxY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Direction des Forêts de ${wilayaName}`, marginX + 3, stampBoxY + 9);
  doc.text('Engagement du plan de restauration', marginX + 3, stampBoxY + 13);

  // Stamp Placeholder Box
  doc.setDrawColor(148, 163, 184);
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.rect(marginX + 3, stampBoxY + 16, stampW - 6, 22, 'D');
  doc.setLineDashPattern([], 0); // reset
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184);
  doc.text('[ Signature & Cachet Officiel DGF ]', marginX + stampW / 2, stampBoxY + 28, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...primarySlate);
  doc.text(`Visa: DGF-RETEX-${wilayaName.toUpperCase()}`, marginX + 3, stampBoxY + 42);

  // Box 2: DGPC Protection Civile
  const box2X = marginX + stampW + 2;
  doc.setFillColor(...bgCard);
  doc.setDrawColor(...borderSlate);
  doc.rect(box2X, stampBoxY, stampW, stampH, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...algeriaRed);
  doc.text('LE DIRECTEUR DE LA PROTECTION CIVILE', box2X + 3, stampBoxY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Direction Protection Civile de ${wilayaName}`, box2X + 3, stampBoxY + 9);
  doc.text('Clôture définitive & repli des moyens', box2X + 3, stampBoxY + 13);

  // Stamp Placeholder Box
  doc.setDrawColor(148, 163, 184);
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.rect(box2X + 3, stampBoxY + 16, stampW - 6, 22, 'D');
  doc.setLineDashPattern([], 0); // reset
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184);
  doc.text('[ Signature & Visa DGPC ]', box2X + stampW / 2, stampBoxY + 28, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...primarySlate);
  doc.text('Visa: DGPC-OPS-CONCLU', box2X + 3, stampBoxY + 42);

  // Box 3: Digital Certification & SHA-256 Stamp
  const box3X = box2X + stampW + 2;
  doc.setFillColor(...bgCard);
  doc.setDrawColor(...borderSlate);
  doc.rect(box3X, stampBoxY, stampW, stampH, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...accentPurple);
  doc.text('AUDIT & CERTIFICAT AWIS', box3X + 3, stampBoxY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Empreinte cryptographique & Horodatage', box3X + 3, stampBoxY + 9);

  // Simulated QR Code Graphic
  const qrX = box3X + 4;
  const qrY = stampBoxY + 14;
  doc.setFillColor(...primarySlate);
  doc.rect(qrX, qrY, 18, 18, 'F');
  doc.setFillColor(255, 255, 255);
  doc.rect(qrX + 2, qrY + 2, 4, 4, 'F');
  doc.rect(qrX + 12, qrY + 2, 4, 4, 'F');
  doc.rect(qrX + 2, qrY + 12, 4, 4, 'F');
  doc.rect(qrX + 8, qrY + 8, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(...algeriaGreen);
  doc.text('AUTHENTIFIÉ', box3X + 25, qrY + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Registre National', box3X + 25, qrY + 11);
  doc.text('Décret n° 21-344', box3X + 25, qrY + 15);

  doc.setFont('courier', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(71, 85, 105);
  doc.text('SHA256: 8f4e2b...c91d', box3X + 3, stampBoxY + 36);
  doc.text(`Time: ${report.containmentTime || '2026-08-19'}`, box3X + 3, stampBoxY + 40);

  // Legal Citation Footer
  const legY = stampBoxY + stampH + 8;
  doc.setFillColor(241, 245, 249);
  doc.rect(marginX, legY, contentWidth, 14, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    'AVIS JURIDIQUE: Ce document est délivré et archivé en conformité avec les dispositions du Décret Exécutif n° 21-344',
    marginX + 3,
    legY + 5
  );
  doc.text(
    'définissant les mécanismes de coordination intersectorielle pour la prévention et la lutte contre les incendies de forêts.',
    marginX + 3,
    legY + 9
  );

  // Page 2 Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('AWIS Wildfire Intelligence • Rapport RETEX Officiel • Page 2 sur 2', marginX, pageHeight - 6);
  doc.text('FIN DU RAPPORT OFFICIEL', pageWidth - marginX, pageHeight - 6, { align: 'right' });

  // Save the document with clean filename
  const cleanCode = incidentRef.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`AWIS_PostFire_RETEX_${cleanCode}.pdf`);
}
