export interface HourlyTrendPoint {
  hour: string; // e.g. "08:00", "14:00"
  hourOffset: number; // -24 to 0
  score: number; // 0 - 100
  trendVelocity?: number; // rate of change
  note?: string; // meteorological or operational event
  noteAr?: string;
  noteFr?: string;
}

export interface MetricTrendProfile {
  metricId: 'fire_risk' | 'active_fires' | 'high_risk_zones' | 'fleet_mobilization';
  currentValue: number;
  delta24h: number;
  percentageChange: number;
  status: 'accelerating' | 'subsiding' | 'stable';
  statusLabelEn: string;
  statusLabelAr: string;
  statusLabelFr: string;
  statusReasonEn: string;
  statusReasonAr: string;
  statusReasonFr: string;
  peakValue: number;
  peakHour: string;
  lowValue: number;
  lowHour: string;
  history: HourlyTrendPoint[];
}

/**
 * Generates realistic 24-hour hourly progression of fire risk scores across Algeria's Mediterranean forest belt.
 * Models diurnal temperatures, Sirocco wind surge (accelerating), or night maritime recovery (subsiding).
 */
export function get24HourFireRiskTrend(scenario: 'accelerating' | 'subsiding' = 'accelerating'): MetricTrendProfile {
  const hours = [
    '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
    '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
    '20:00', '21:00', '22:00', '23:00', '00:00', '01:00',
    '02:00', '03:00', '04:00', '05:00', '06:00', '07:00', 'Now'
  ];

  if (scenario === 'accelerating') {
    // Accelerating Trend: Sirocco wave active, temperatures climbing from 28°C to 41.5°C,
    // strong southerly gusts (45 km/h), relative humidity dropped to 14%.
    const rawScores = [
      58, 60, 63, 67, 72, 76,
      82, 85, 87, 84, 79, 74,
      70, 67, 65, 63, 61, 59,
      58, 57, 56, 61, 68, 77, 84
    ];

    const history: HourlyTrendPoint[] = rawScores.map((score, index) => {
      const hourOffset = index - 24;
      let note = 'Normal diurnal background';
      let noteAr = 'المستوى المرجعي العادي';
      let noteFr = 'Fond diurne normal';

      if (index === 6 || index === 7 || index === 8) {
        note = 'Sirocco heatwave peak (41°C, 45 km/h wind)';
        noteAr = 'ذروة موجة الشهيلي (41 م°، رياح 45 كم/سا)';
        noteFr = 'Pic de canicule Sirocco (41°C, vents 45 km/h)';
      } else if (index >= 18 && index <= 20) {
        note = 'Night inversion lull (RH recovery to 38%)';
        noteAr = 'انحسار ليلي مؤقت (ارتفاع الرطوبة إلى 38%)';
        noteFr = 'Accalmie nocturne (remontée humidité à 38%)';
      } else if (index >= 21) {
        note = 'Rapid morning acceleration under dry Sirocco gusts';
        noteAr = 'تسارع صباحي حاد مع عودة رياح الشهيلي الجافة';
        noteFr = 'Accélération matinale rapide sous rafales sèches';
      }

      return {
        hour: hours[index],
        hourOffset,
        score,
        note,
        noteAr,
        noteFr
      };
    });

    const startVal = history[0].score;
    const currentVal = history[history.length - 1].score;
    const delta24h = currentVal - startVal; // +26
    const percentageChange = Number(((delta24h / startVal) * 100).toFixed(1));

    return {
      metricId: 'fire_risk',
      currentValue: currentVal,
      delta24h,
      percentageChange,
      status: 'accelerating',
      statusLabelEn: 'Accelerating (+26 pts)',
      statusLabelAr: 'خطر متسارع (+26 نقطة)',
      statusLabelFr: 'En Accélération (+26 pts)',
      statusReasonEn: 'Severe Sirocco wind surge (45 km/h) & critical fuel moisture deficit (<12%) escalating fire danger across maritime Tell Atlas.',
      statusReasonAr: 'رياح الشهيلي الجنوبية العاتية (45 كم/سا) مع جفاف قياسي للغطاء النباتي تسببت في تسارع شديد لمؤشر الخطر الوطني.',
      statusReasonFr: 'Rafales de Sirocco (45 km/h) et déficit hydrique sévère provoquant une escalade rapide du risque sur le Tell Atlas.',
      peakValue: 87,
      peakHour: '16:00',
      lowValue: 56,
      lowHour: '04:00',
      history
    };
  } else {
    // Subsiding Scenario: Maritime front arrived, temperature dropped to 26°C,
    // relative humidity climbed to 65%, calming winds.
    const rawScores = [
      84, 82, 79, 75, 71, 68,
      64, 60, 56, 53, 50, 47,
      45, 43, 41, 40, 39, 38,
      37, 36, 35, 34, 33, 31, 30
    ];

    const history: HourlyTrendPoint[] = rawScores.map((score, index) => {
      const hourOffset = index - 24;
      return {
        hour: hours[index],
        hourOffset,
        score,
        note: index < 6 ? 'Gradual containment' : 'Maritime moisture influx dampening fire spread',
        noteAr: index < 6 ? 'تطويق تدريجي' : 'دخول رطوبة بحرية يخمد انتشار النيران',
        noteFr: index < 6 ? 'Maîtrise progressive' : 'Entrée d\'air maritime humide freinant la propagation'
      };
    });

    const startVal = history[0].score;
    const currentVal = history[history.length - 1].score;
    const delta24h = currentVal - startVal;
    const percentageChange = Number(((delta24h / startVal) * 100).toFixed(1));

    return {
      metricId: 'fire_risk',
      currentValue: currentVal,
      delta24h,
      percentageChange,
      status: 'subsiding',
      statusLabelEn: 'Subsiding (-54 pts)',
      statusLabelAr: 'خطر متراجع (-54 نقطة)',
      statusLabelFr: 'En Régression (-54 pts)',
      statusReasonEn: 'Cooling marine front and nocturnal humidity recovery dampening fire ignition velocity.',
      statusReasonAr: 'تيارات بحرية رطبة وانخفاض درجات الحرارة يسهمان في انحسار مؤشرات الخطر وتراجع سرعة انتشار النيران.',
      statusReasonFr: 'Front maritime frais et remontée hygrométrique favorisant la régression rapide du risque.',
      peakValue: 84,
      peakHour: '08:00',
      lowValue: 30,
      lowHour: 'Now',
      history
    };
  }
}

/**
 * 24-hour active fire count history profile
 */
export function get24HourActiveFiresTrend(scenario: 'accelerating' | 'subsiding' = 'accelerating'): MetricTrendProfile {
  const hours = [
    '08:00', '10:00', '12:00', '14:00', '16:00', '18:00',
    '20:00', '22:00', '00:00', '02:00', '04:00', '06:00', 'Now'
  ];

  const rawValues = scenario === 'accelerating'
    ? [2, 2, 3, 3, 4, 5, 5, 4, 3, 3, 3, 4, 5]
    : [6, 6, 5, 5, 4, 4, 3, 3, 2, 2, 1, 1, 1];

  const history: HourlyTrendPoint[] = rawValues.map((val, idx) => ({
    hour: hours[idx],
    hourOffset: (idx - 12) * 2,
    score: val,
    note: `${val} active thermal fronts`
  }));

  const startVal = rawValues[0];
  const currentVal = rawValues[rawValues.length - 1];
  const delta = currentVal - startVal;

  return {
    metricId: 'active_fires',
    currentValue: currentVal,
    delta24h: delta,
    percentageChange: Number(((delta / startVal) * 100).toFixed(0)),
    status: scenario === 'accelerating' ? 'accelerating' : 'subsiding',
    statusLabelEn: scenario === 'accelerating' ? 'Expanding (+3 fires)' : 'Contained (-5 fires)',
    statusLabelAr: scenario === 'accelerating' ? 'تصاعد (+3 حرائق)' : 'انحسار (-5 حرائق)',
    statusLabelFr: scenario === 'accelerating' ? 'En hausse (+3 feux)' : 'En baisse (-5 feux)',
    statusReasonEn: scenario === 'accelerating' ? 'New ignitions detected in Tizi Ouzou & Béjaïa.' : 'Active fronts successfully extinguished.',
    statusReasonAr: scenario === 'accelerating' ? 'بؤر جديدة رُصدت في تيزي وزو وبجاية.' : 'تمت السيطرة على الجبهات النشطة بنجاح.',
    statusReasonFr: scenario === 'accelerating' ? 'Nouveaux départs repérés à Tizi Ouzou et Béjaïa.' : 'Fronts actifs circonscrits avec succès.',
    peakValue: Math.max(...rawValues),
    peakHour: '18:00',
    lowValue: Math.min(...rawValues),
    lowHour: '08:00',
    history
  };
}

/**
 * 24-hour high-risk forest zones history profile
 */
export function get24HourForestZonesTrend(scenario: 'accelerating' | 'subsiding' = 'accelerating'): MetricTrendProfile {
  const hours = [
    '08:00', '10:00', '12:00', '14:00', '16:00', '18:00',
    '20:00', '22:00', '00:00', '02:00', '04:00', '06:00', 'Now'
  ];

  const rawValues = scenario === 'accelerating'
    ? [3, 3, 4, 5, 6, 6, 5, 5, 4, 4, 4, 5, 6]
    : [7, 6, 6, 5, 4, 4, 3, 3, 2, 2, 2, 1, 1];

  const history: HourlyTrendPoint[] = rawValues.map((val, idx) => ({
    hour: hours[idx],
    hourOffset: (idx - 12) * 2,
    score: val,
    note: `${val} massifs under critical threshold (>70)`
  }));

  const startVal = rawValues[0];
  const currentVal = rawValues[rawValues.length - 1];
  const delta = currentVal - startVal;

  return {
    metricId: 'high_risk_zones',
    currentValue: currentVal,
    delta24h: delta,
    percentageChange: Number(((delta / startVal) * 100).toFixed(0)),
    status: scenario === 'accelerating' ? 'accelerating' : 'subsiding',
    statusLabelEn: scenario === 'accelerating' ? 'Surging (6 Critical Massifs)' : 'De-escalating (1 Massif)',
    statusLabelAr: scenario === 'accelerating' ? 'تصاعد (6 غابات حرجة)' : 'انخفاض (غابة واحدة)',
    statusLabelFr: scenario === 'accelerating' ? 'En hausse (6 Massifs Critiques)' : 'Désescalade (1 Massif)',
    statusReasonEn: 'Yakouren, Akfadou & Gouraya massifs crossed danger index 75.',
    statusReasonAr: 'غابات اليعقورن، أكفادو وقورايا تجاوزت عتبة الخطر 75.',
    statusReasonFr: 'Les massifs de Yakouren, Akfadou et Gouraya ont franchi le seuil 75.',
    peakValue: Math.max(...rawValues),
    peakHour: '16:00',
    lowValue: Math.min(...rawValues),
    lowHour: '08:00',
    history
  };
}

/**
 * 24-hour fleet mobilization profile
 */
export function get24HourFleetMobilizationTrend(scenario: 'accelerating' | 'subsiding' = 'accelerating'): MetricTrendProfile {
  const hours = [
    '08:00', '10:00', '12:00', '14:00', '16:00', '18:00',
    '20:00', '22:00', '00:00', '02:00', '04:00', '06:00', 'Now'
  ];

  const rawValues = scenario === 'accelerating'
    ? [2, 3, 4, 6, 7, 8, 8, 7, 6, 6, 6, 7, 8]
    : [8, 8, 7, 6, 5, 4, 4, 3, 3, 2, 2, 1, 1];

  const history: HourlyTrendPoint[] = rawValues.map((val, idx) => ({
    hour: hours[idx],
    hourOffset: (idx - 12) * 2,
    score: val,
    note: `${val} operational units deployed`
  }));

  const startVal = rawValues[0];
  const currentVal = rawValues[rawValues.length - 1];
  const delta = currentVal - startVal;

  return {
    metricId: 'fleet_mobilization',
    currentValue: currentVal,
    delta24h: delta,
    percentageChange: Number(((delta / startVal) * 100).toFixed(0)),
    status: scenario === 'accelerating' ? 'accelerating' : 'subsiding',
    statusLabelEn: scenario === 'accelerating' ? 'Mobilizing (8 Units)' : 'Demobilizing (1 Unit)',
    statusLabelAr: scenario === 'accelerating' ? 'تعبئة مكثفة (8 وحدات)' : 'إعادة التمركز (وحدة واحدة)',
    statusLabelFr: scenario === 'accelerating' ? 'Mobilisation (8 Unités)' : 'Démobilisation (1 Unité)',
    statusReasonEn: 'Air & ground units scrambled to protect mountain hamlets.',
    statusReasonAr: 'استنفار للأرتال المتنقلة والإسناد الجوي لحماية المداشر.',
    statusReasonFr: 'Unités aériennes et terrestres engagées pour protéger les hameaux.',
    peakValue: Math.max(...rawValues),
    peakHour: '18:00',
    lowValue: Math.min(...rawValues),
    lowHour: '08:00',
    history
  };
}
