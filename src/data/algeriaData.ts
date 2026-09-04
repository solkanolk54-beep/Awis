import { 
  WildfireIncident, 
  ForestZone, 
  EmergencyResource, 
  WaterPoint, 
  WatchtowerCamera, 
  PostFireReport 
} from '../types';

export interface WilayaGeographicData {
  code: string;
  nameEn: string;
  nameAr: string;
  nameFr: string;
  lat: number;
  lng: number;
  forestCoverageHectares: number;
  currentRiskIndex: number; // 0-100
  svgPath: string; // Coordinate path on Algeria simplified/tactical GIS projection
}

// Tactical SVG Coordinate space: Algeria bounded approx Lat 28 to 37.5, Lng -2 to 9
// We map (Lng -2..9.5) to (X 60..900) and (Lat 31..37.5) to (Y 520..80) for the Northern Forest Mediterranean Ridge
export const ALGERIA_WILAYAS: WilayaGeographicData[] = [
  {
    code: '18',
    nameEn: 'Jijel',
    nameAr: 'جيجل',
    nameFr: 'Jijel',
    lat: 36.82,
    lng: 5.76,
    forestCoverageHectares: 142000,
    currentRiskIndex: 88,
    svgPath: 'M 590 125 L 635 120 L 640 145 L 605 160 Z'
  },
  {
    code: '15',
    nameEn: 'Tizi Ouzou',
    nameAr: 'تيزي وزو',
    nameFr: 'Tizi Ouzou',
    lat: 36.71,
    lng: 4.05,
    forestCoverageHectares: 115000,
    currentRiskIndex: 84,
    svgPath: 'M 470 120 L 525 125 L 530 155 L 480 160 Z'
  },
  {
    code: '06',
    nameEn: 'Béjaïa',
    nameAr: 'بجاية',
    nameFr: 'Béjaïa',
    lat: 36.75,
    lng: 5.08,
    forestCoverageHectares: 128000,
    currentRiskIndex: 82,
    svgPath: 'M 530 122 L 588 126 L 595 162 L 535 158 Z'
  },
  {
    code: '21',
    nameEn: 'Skikda',
    nameAr: 'سكيكدة',
    nameFr: 'Skikda',
    lat: 36.87,
    lng: 6.90,
    forestCoverageHectares: 95000,
    currentRiskIndex: 76,
    svgPath: 'M 645 118 L 710 115 L 705 150 L 642 146 Z'
  },
  {
    code: '36',
    nameEn: 'El Tarf',
    nameAr: 'الطارف',
    nameFr: 'El Tarf',
    lat: 36.76,
    lng: 8.31,
    forestCoverageHectares: 165000,
    currentRiskIndex: 79,
    svgPath: 'M 770 115 L 830 120 L 825 155 L 768 150 Z'
  },
  {
    code: '09',
    nameEn: 'Blida',
    nameAr: 'البليدة',
    nameFr: 'Blida',
    lat: 36.47,
    lng: 2.83,
    forestCoverageHectares: 65000,
    currentRiskIndex: 71,
    svgPath: 'M 380 140 L 425 142 L 420 175 L 375 170 Z'
  },
  {
    code: '42',
    nameEn: 'Tipaza',
    nameAr: 'تيبازة',
    nameFr: 'Tipaza',
    lat: 36.59,
    lng: 2.44,
    forestCoverageHectares: 42000,
    currentRiskIndex: 68,
    svgPath: 'M 335 132 L 378 138 L 372 170 L 330 160 Z'
  },
  {
    code: '13',
    nameEn: 'Tlemcen',
    nameAr: 'تلمسان',
    nameFr: 'Tlemcen',
    lat: 34.88,
    lng: -1.31,
    forestCoverageHectares: 78000,
    currentRiskIndex: 64,
    svgPath: 'M 95 190 L 160 185 L 155 240 L 90 235 Z'
  },
  {
    code: '10',
    nameEn: 'Bouira',
    nameAr: 'البويرة',
    nameFr: 'Bouira',
    lat: 36.37,
    lng: 3.90,
    forestCoverageHectares: 112000,
    currentRiskIndex: 74,
    svgPath: 'M 460 162 L 525 160 L 520 200 L 455 195 Z'
  },
  {
    code: '26',
    nameEn: 'Médéa',
    nameAr: 'المدية',
    nameFr: 'Médéa',
    lat: 36.26,
    lng: 2.75,
    forestCoverageHectares: 155000,
    currentRiskIndex: 69,
    svgPath: 'M 370 175 L 440 178 L 435 225 L 365 218 Z'
  },
  {
    code: '41',
    nameEn: 'Souk Ahras',
    nameAr: 'سوق أهراس',
    nameFr: 'Souk Ahras',
    lat: 36.28,
    lng: 7.95,
    forestCoverageHectares: 89000,
    currentRiskIndex: 73,
    svgPath: 'M 740 152 L 810 155 L 805 198 L 735 190 Z'
  },
  {
    code: '24',
    nameEn: 'Guelma',
    nameAr: 'قالمة',
    nameFr: 'Guelma',
    lat: 36.46,
    lng: 7.43,
    forestCoverageHectares: 75000,
    currentRiskIndex: 70,
    svgPath: 'M 690 148 L 745 150 L 740 190 L 685 185 Z'
  },
  {
    code: '16',
    nameEn: 'Algiers',
    nameAr: 'الجزائر العاصمة',
    nameFr: 'Alger',
    lat: 36.75,
    lng: 3.05,
    forestCoverageHectares: 12000,
    currentRiskIndex: 52,
    svgPath: 'M 405 128 L 440 128 L 438 145 L 402 144 Z'
  },
  {
    code: '40',
    nameEn: 'Khenchela',
    nameAr: 'خنشلة',
    nameFr: 'Khenchela',
    lat: 35.43,
    lng: 7.14,
    forestCoverageHectares: 145000,
    currentRiskIndex: 72,
    svgPath: 'M 670 215 L 750 218 L 745 280 L 665 270 Z'
  }
];

export const ALGERIA_FORESTS: ForestZone[] = [
  {
    id: 'FOR-01',
    forestId: 'DZ-FOR-JIJEL-GUERROUCHE',
    name: 'Guerrouche National Biosphere',
    nameAr: 'حظيرة وقصر قروش الحيوية',
    nameFr: 'Réserve Forestière de Guerrouche',
    wilaya: 'Jijel',
    wilayaAr: 'جيجل',
    totalHectares: 34500,
    vegetationType: 'Cork Oak (Quercus suber) & Zeen Oak',
    vegetationTypeAr: 'بلوط الفلين، بلوط الزان، غابات الديس والصنوبر',
    fuelMoistureIndex: 18,
    densityLevel: 'Very Dense',
    elevationMeters: 920,
    slopeDegrees: 34,
    coordinates: { lat: 36.78, lng: 5.72 },
    waterPointsCount: 7,
    watchtowersCount: 4,
    droneStationsCount: 2,
    civilProtectionBasesCount: 3,
    historicalFireCount: 28,
    lastBurnYear: 2021,
    recoveryHealthPercent: 72,
    currentRiskScore: 89,
    riskLevel: 'critical'
  },
  {
    id: 'FOR-02',
    forestId: 'DZ-FOR-TIZI-YAKOUREN',
    name: 'Yakouren Forest Massif',
    nameAr: 'غابة إعكوران الكبرى',
    nameFr: 'Massif Forestier de Yakouren',
    wilaya: 'Tizi Ouzou',
    wilayaAr: 'تيزي وزو',
    totalHectares: 26000,
    vegetationType: 'Cork Oak & High Mountain Ferns',
    vegetationTypeAr: 'بلوط الفلين وسرخس المرتفعات الجبلية',
    fuelMoistureIndex: 22,
    densityLevel: 'Very Dense',
    elevationMeters: 850,
    slopeDegrees: 30,
    coordinates: { lat: 36.73, lng: 4.41 },
    waterPointsCount: 5,
    watchtowersCount: 3,
    droneStationsCount: 1,
    civilProtectionBasesCount: 4,
    historicalFireCount: 42,
    lastBurnYear: 2023,
    recoveryHealthPercent: 65,
    currentRiskScore: 86,
    riskLevel: 'extreme'
  },
  {
    id: 'FOR-03',
    forestId: 'DZ-FOR-BEJAIA-AKFADOU',
    name: 'Akfadou Massif & Cedar Reserve',
    nameAr: 'غابة أكفادو وأشجار الأرز القديمة',
    nameFr: 'Massif de l\'Akfadou',
    wilaya: 'Béjaïa',
    wilayaAr: 'بجاية',
    totalHectares: 38000,
    vegetationType: 'Atlas Cedar & Cork Oak',
    vegetationTypeAr: 'أرز الأطلس وبلوط الفلين والبلوط الأخضر',
    fuelMoistureIndex: 25,
    densityLevel: 'Dense',
    elevationMeters: 1200,
    slopeDegrees: 38,
    coordinates: { lat: 36.68, lng: 4.65 },
    waterPointsCount: 6,
    watchtowersCount: 3,
    droneStationsCount: 1,
    civilProtectionBasesCount: 3,
    historicalFireCount: 31,
    lastBurnYear: 2022,
    recoveryHealthPercent: 78,
    currentRiskScore: 82,
    riskLevel: 'extreme'
  },
  {
    id: 'FOR-04',
    forestId: 'DZ-FOR-BLIDA-CHREA',
    name: 'Chréa National Park',
    nameAr: 'الحظيرة الوطنية للشريعة',
    nameFr: 'Parc National de Chréa',
    wilaya: 'Blida',
    wilayaAr: 'البليدة',
    totalHectares: 26500,
    vegetationType: 'Atlas Cedar & Aleppo Pine',
    vegetationTypeAr: 'أرز الأطلس والصنوبر الحلبي وبلوط الفلين',
    fuelMoistureIndex: 32,
    densityLevel: 'Medium',
    elevationMeters: 1450,
    slopeDegrees: 42,
    coordinates: { lat: 36.42, lng: 2.88 },
    waterPointsCount: 4,
    watchtowersCount: 2,
    droneStationsCount: 1,
    civilProtectionBasesCount: 3,
    historicalFireCount: 19,
    lastBurnYear: 2020,
    recoveryHealthPercent: 88,
    currentRiskScore: 71,
    riskLevel: 'high'
  },
  {
    id: 'FOR-05',
    forestId: 'DZ-FOR-ELTARF-ELKALA',
    name: 'El Kala National Wetlands & Forests',
    nameAr: 'الحظيرة الوطنية للقالة والبحيرات',
    nameFr: 'Parc National d\'El Kala',
    wilaya: 'El Tarf',
    wilayaAr: 'الطارف',
    totalHectares: 76000,
    vegetationType: 'Maritime Pine & Humid Maquis',
    vegetationTypeAr: 'الصنوبر البحري وغابات الفلين الرطبة',
    fuelMoistureIndex: 28,
    densityLevel: 'Very Dense',
    elevationMeters: 380,
    slopeDegrees: 18,
    coordinates: { lat: 36.85, lng: 8.42 },
    waterPointsCount: 12,
    watchtowersCount: 5,
    droneStationsCount: 2,
    civilProtectionBasesCount: 5,
    historicalFireCount: 36,
    lastBurnYear: 2022,
    recoveryHealthPercent: 80,
    currentRiskScore: 79,
    riskLevel: 'high'
  },
  {
    id: 'FOR-06',
    forestId: 'DZ-FOR-SKIKDA-COLLO',
    name: 'Collo Peninsula Maritime Massif',
    nameAr: 'شبه جزيرة القل والغابات الساحلية',
    nameFr: 'Massif Forestier de Collo',
    wilaya: 'Skikda',
    wilayaAr: 'سكيكدة',
    totalHectares: 31000,
    vegetationType: 'Cork Oak & Heather Shrub',
    vegetationTypeAr: 'أدغال السنديان وبلوط الفلين والخلنج',
    fuelMoistureIndex: 26,
    densityLevel: 'Dense',
    elevationMeters: 740,
    slopeDegrees: 36,
    coordinates: { lat: 36.98, lng: 6.54 },
    waterPointsCount: 5,
    watchtowersCount: 3,
    droneStationsCount: 1,
    civilProtectionBasesCount: 3,
    historicalFireCount: 22,
    lastBurnYear: 2021,
    recoveryHealthPercent: 74,
    currentRiskScore: 76,
    riskLevel: 'high'
  }
];

export const INITIAL_INCIDENTS: WildfireIncident[] = [
  {
    id: 'DZ-WF-2026-000421',
    code: 'INCIDENT #DZ-2026-00421',
    title: 'Guerrouche Sector East Wildfire',
    titleAr: 'حريق قطاع شرق غابة قروش - تكسانة',
    wilaya: 'Jijel',
    wilayaAr: 'ولاية جيجل',
    locationName: 'Texanna - Guerrouche Massif',
    locationNameAr: 'تكسانة - محاذاة غابة قروش',
    coordinates: { lat: 36.78, lng: 5.72 },
    status: 'under_verification',
    riskLevel: 'critical',
    confidenceScore: 94,
    detectionTime: '14:20:00 (Today)',
    confirmationTime: undefined,
    estimatedBurnedHectares: 4.8,
    windSpeedKmH: 42,
    windDirectionDegrees: 45, // NE
    windDirectionCardinal: 'NE',
    temperatureC: 40.5,
    humidityPercent: 19,
    terrainSlopeDegrees: 31,
    detectionSources: [
      {
        id: 'SIG-01',
        source: 'satellite_firms',
        sourceName: 'NASA FIRMS VIIRS & Sentinel-3 SLSTR',
        timestamp: '14:20:12',
        confidence: 96,
        location: { lat: 36.781, lng: 5.722 },
        details: 'High-temperature thermal anomaly 340 MW FRP detected in deep forest canopy',
        sensorMetadata: {
          thermalAnomalyMw: 340,
          temperatureReading: 580
        }
      },
      {
        id: 'SIG-02',
        source: 'watchtower_camera',
        sourceName: 'Watchtower Camera #17 (Texanna Summit)',
        timestamp: '14:23:45',
        confidence: 93,
        location: { lat: 36.778, lng: 5.724 },
        details: 'Optical CV detected rising dense grey smoke column azimuth 042°',
        sensorMetadata: {
          smokeProbability: 93.4,
          imageUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=400&q=80'
        }
      },
      {
        id: 'SIG-03',
        source: 'citizen_report',
        sourceName: 'Citizen App verified via GPS & IMEI',
        timestamp: '14:24:50',
        confidence: 88,
        location: { lat: 36.784, lng: 5.719 },
        details: 'Reported crackling flames advancing through dry bracken, strong Sirocco wind pushing northeast',
        sensorMetadata: {
          device: 'Samsung Galaxy A53 / Android 14'
        }
      }
    ],
    spreadPredictions: [
      {
        timeHorizonMinutes: 30,
        areaHectares: 9.5,
        probability: 92,
        frontSpeedKmH: 1.8,
        perimeterPoints: [
          { lat: 36.780, lng: 5.720 },
          { lat: 36.785, lng: 5.726 },
          { lat: 36.788, lng: 5.731 },
          { lat: 36.784, lng: 5.733 },
          { lat: 36.779, lng: 5.728 }
        ]
      },
      {
        timeHorizonMinutes: 60,
        areaHectares: 24.2,
        probability: 84,
        frontSpeedKmH: 2.3,
        perimeterPoints: [
          { lat: 36.778, lng: 5.718 },
          { lat: 36.788, lng: 5.729 },
          { lat: 36.794, lng: 5.738 },
          { lat: 36.787, lng: 5.742 },
          { lat: 36.776, lng: 5.730 }
        ]
      },
      {
        timeHorizonMinutes: 180,
        areaHectares: 78.0,
        probability: 72,
        frontSpeedKmH: 2.7,
        perimeterPoints: [
          { lat: 36.774, lng: 5.715 },
          { lat: 36.795, lng: 5.734 },
          { lat: 36.808, lng: 5.752 },
          { lat: 36.798, lng: 5.760 },
          { lat: 36.772, lng: 5.735 }
        ]
      },
      {
        timeHorizonMinutes: 360,
        areaHectares: 185.0,
        probability: 58,
        frontSpeedKmH: 3.1,
        perimeterPoints: [
          { lat: 36.770, lng: 5.710 },
          { lat: 36.805, lng: 5.740 },
          { lat: 36.825, lng: 5.770 },
          { lat: 36.810, lng: 5.782 },
          { lat: 36.768, lng: 5.740 }
        ]
      }
    ],
    exposedAssets: [
      {
        id: 'ASSET-01',
        name: 'Village Ait Bouyoucef (Hamlet)',
        nameAr: 'قرية آيت بويوسف',
        type: 'village',
        population: 1840,
        distanceKm: 2.3,
        estimatedWindowMinutes: '45–70 min',
        evacuationStatus: 'advisory',
        urgency: 'critical'
      },
      {
        id: 'ASSET-02',
        name: 'National Highway RN-77 Link',
        nameAr: 'الطريق الوطني رقم 77',
        type: 'road',
        distanceKm: 1.1,
        estimatedWindowMinutes: '20–35 min',
        evacuationStatus: 'monitoring',
        urgency: 'critical'
      },
      {
        id: 'ASSET-03',
        name: 'Rural Primary School Chouhada',
        nameAr: 'مدرسة الشهداء الابتدائية الريفية',
        type: 'school',
        population: 195,
        distanceKm: 3.1,
        estimatedWindowMinutes: '75–110 min',
        evacuationStatus: 'advisory',
        urgency: 'moderate'
      },
      {
        id: 'ASSET-04',
        name: 'Sonelgaz 60kV High-Voltage Transmission Pylons',
        nameAr: 'خط الضغط العالي 60 كيلو فولط سونلغاز',
        type: 'electrical_grid',
        distanceKm: 1.8,
        estimatedWindowMinutes: '35–50 min',
        evacuationStatus: 'monitoring',
        urgency: 'critical'
      }
    ],
    assignedResources: ['RES-01', 'RES-04', 'RES-07'],
    timeline: [
      {
        id: 'TL-01',
        timestamp: '14:20:12',
        type: 'detection',
        title: 'Thermal Anomaly Detected by Satellite',
        description: 'VIIRS satellite flagged 340MW radiant anomaly at coords (36.781°N, 5.722°E). Confidence: 96%.',
        sourceBadge: 'Satellite'
      },
      {
        id: 'TL-02',
        timestamp: '14:21:00',
        type: 'spread_alert',
        title: 'High Sirocco Wind Warning Ingested',
        description: 'National Meteorological Office weather telemetry updated: Wind 42 km/h NE, Humidity 19%, Temp 40.5°C.',
        sourceBadge: 'Weather Telemetry'
      },
      {
        id: 'TL-03',
        timestamp: '14:23:45',
        type: 'detection',
        title: 'Watchtower Optical CV Confirms Smoke Column',
        description: 'Watchtower #17 high-zoom camera identified dense particulate smoke rising above canopy. Direction: 42° Azimuth.',
        sourceBadge: 'Computer Vision'
      },
      {
        id: 'TL-04',
        timestamp: '14:24:50',
        type: 'fusion',
        title: 'Alert Fusion Correlated 3 Independent Signals',
        description: 'Alert Fusion Engine fused Satellite + Watchtower CV + Citizen report into verified candidate. Confidence: 94%.',
        sourceBadge: 'Fusion Engine'
      }
    ]
  },
  {
    id: 'DZ-WF-2026-000418',
    code: 'INCIDENT #DZ-2026-00418',
    title: 'Yakouren North Flank Response',
    titleAr: 'تدخل الواجهة الشمالية لغابة إعكوران',
    wilaya: 'Tizi Ouzou',
    wilayaAr: 'ولاية تيزي وزو',
    locationName: 'Yakouren Heights / Azazga Ridge',
    locationNameAr: 'مرتفعات إعكوران - عزازقة',
    coordinates: { lat: 36.73, lng: 4.41 },
    status: 'active_response',
    riskLevel: 'extreme',
    confidenceScore: 98,
    detectionTime: '11:15:00 (Today)',
    confirmationTime: '11:22:00',
    estimatedBurnedHectares: 18.4,
    windSpeedKmH: 35,
    windDirectionDegrees: 60,
    windDirectionCardinal: 'ENE',
    temperatureC: 38.0,
    humidityPercent: 24,
    terrainSlopeDegrees: 28,
    detectionSources: [
      {
        id: 'SIG-10',
        source: 'thermal_drone',
        sourceName: 'Civil Protection Drone DZ-02',
        timestamp: '11:18:00',
        confidence: 98,
        location: { lat: 36.731, lng: 4.412 },
        details: 'Active crown fire front with flame heights exceeding 8 meters',
        sensorMetadata: {
          thermalAnomalyMw: 410
        }
      }
    ],
    spreadPredictions: [],
    exposedAssets: [],
    assignedResources: ['RES-02', 'RES-05'],
    timeline: [
      {
        id: 'TL-10',
        timestamp: '11:15:00',
        type: 'detection',
        title: 'Civil Protection Mobile Patrol Sighting',
        description: 'Unit reported ground ignition along steep terrain ravine.'
      },
      {
        id: 'TL-11',
        timestamp: '11:22:00',
        type: 'verification',
        title: 'Incident Confirmed by Wilaya Operations Room',
        description: 'Tizi Ouzou emergency dispatch activated Mobile Column.'
      }
    ]
  },
  {
    id: 'DZ-WF-2026-000415',
    code: 'INCIDENT #DZ-2026-00415',
    title: 'Akfadou Foothills Patrol Anomaly',
    titleAr: 'إشعار اشتباه دخان بسفوح أكفادو',
    wilaya: 'Béjaïa',
    wilayaAr: 'ولاية بجاية',
    locationName: 'Adekar - Akfadou Border',
    locationNameAr: 'أدكار - أطراف غابة أكفادو',
    coordinates: { lat: 36.68, lng: 4.65 },
    status: 'suspected',
    riskLevel: 'high',
    confidenceScore: 68,
    detectionTime: '13:50:00 (Today)',
    confirmationTime: undefined,
    estimatedBurnedHectares: 0.6,
    windSpeedKmH: 26,
    windDirectionDegrees: 90,
    windDirectionCardinal: 'E',
    temperatureC: 36.2,
    humidityPercent: 29,
    terrainSlopeDegrees: 22,
    detectionSources: [
      {
        id: 'SIG-20',
        source: 'satellite_sentinel',
        sourceName: 'Sentinel-2 MSI Hotspot Candidate',
        timestamp: '13:50:10',
        confidence: 68,
        location: { lat: 36.682, lng: 4.651 },
        details: 'Thermal signature near agricultural clearing; drone dispatched for validation',
        sensorMetadata: {
          thermalAnomalyMw: 95
        }
      }
    ],
    spreadPredictions: [],
    exposedAssets: [],
    assignedResources: ['RES-03'],
    timeline: [
      {
        id: 'TL-20',
        timestamp: '13:50:10',
        type: 'detection',
        title: 'Spectral Anomaly Registered',
        description: 'Algorithm flagged medium-confidence reflection. Drone DZ-04 sent to inspect.'
      }
    ]
  }
];

export const EMERGENCY_RESOURCES: EmergencyResource[] = [
  {
    id: 'RES-01',
    code: 'CP-17',
    name: 'Civil Protection Rapid Intervention Unit #17',
    nameAr: 'وحدة التدخل السريع للحماية المدنية رقم 17',
    type: 'firetruck',
    status: 'available',
    baseLocation: { lat: 36.81, lng: 5.75 },
    currentLocation: { lat: 36.81, lng: 5.75 },
    wilaya: 'Jijel',
    capacity: 'Heavy Forest Truck (CCFM 6000L)',
    estimatedArrivalMinutes: 14
  },
  {
    id: 'RES-02',
    code: 'WT-08',
    name: 'High-Capacity Water Tanker WT-08',
    nameAr: 'شاحنة صهريج الإمداد المائي الكبرى WT-08',
    type: 'water_tanker',
    status: 'available',
    baseLocation: { lat: 36.79, lng: 5.73 },
    currentLocation: { lat: 36.79, lng: 5.73 },
    wilaya: 'Jijel',
    capacity: '12,000 Liters Water + Foam Dispenser',
    estimatedArrivalMinutes: 19
  },
  {
    id: 'RES-03',
    code: 'DZ-04',
    name: 'Tactical Recon Thermal Drone DZ-04',
    nameAr: 'طائرة استطلاع بدون طيار حرارية DZ-04',
    type: 'drone',
    status: 'available',
    baseLocation: { lat: 36.78, lng: 5.71 },
    currentLocation: { lat: 36.78, lng: 5.71 },
    wilaya: 'Jijel',
    capacity: 'FLIR Thermal 4K + 45 Min Endurance',
    estimatedArrivalMinutes: 5
  },
  {
    id: 'RES-04',
    code: 'AIR-BE200',
    name: 'Beriev Be-200 Amphibious Water Bomber',
    nameAr: 'طائرة الإخماد البرمائية بيريف Be-200',
    type: 'aircraft',
    status: 'available',
    baseLocation: { lat: 36.71, lng: 5.07 }, // Bejaia / Jijel Airbase
    currentLocation: { lat: 36.71, lng: 5.07 },
    wilaya: 'Jijel',
    capacity: '12,000 Liters Retardant Drop',
    estimatedArrivalMinutes: 18
  },
  {
    id: 'RES-05',
    code: 'ET-03',
    name: 'Civilian Evacuation & Medical Escort ET-03',
    nameAr: 'فوج الإخلاء المدني والإسعاف الطبي ET-03',
    type: 'medical',
    status: 'available',
    baseLocation: { lat: 36.80, lng: 5.74 },
    currentLocation: { lat: 36.80, lng: 5.74 },
    wilaya: 'Jijel',
    capacity: '2 Ambulances + 4 Off-road Transporters',
    estimatedArrivalMinutes: 22
  },
  {
    id: 'RES-06',
    code: 'CP-MOB-TIZI',
    name: 'Tizi Ouzou Mobile Column Support',
    nameAr: 'الرتل المتحرك للحماية المدنية - ولاية تيزي وزو',
    type: 'ground_team',
    status: 'dispatched',
    baseLocation: { lat: 36.71, lng: 4.05 },
    currentLocation: { lat: 36.72, lng: 4.35 },
    wilaya: 'Tizi Ouzou',
    capacity: '65 Firefighters + 8 CCFM Trucks',
    estimatedArrivalMinutes: 12
  },
  {
    id: 'RES-07',
    code: 'DZ-AIRTRACTOR',
    name: 'Air Tractor AT-802F Water Dropper',
    nameAr: 'طائرة مكافحة الحرائق إير تراكتور AT-802',
    type: 'aircraft',
    status: 'available',
    baseLocation: { lat: 36.75, lng: 6.90 }, // Skikda / Constantine
    currentLocation: { lat: 36.75, lng: 6.90 },
    wilaya: 'Skikda',
    capacity: '3,100 Liters Water / Retardant',
    estimatedArrivalMinutes: 24
  }
];

export const WATER_POINTS: WaterPoint[] = [
  {
    id: 'WP-01',
    name: 'Kissir Dam & Reservoir (Jijel)',
    type: 'dam',
    capacityM3: 68000000,
    coordinates: { lat: 36.80, lng: 5.68 },
    status: 'operational'
  },
  {
    id: 'WP-02',
    name: 'Texanna High Cistern Water Point #4',
    type: 'cistern',
    capacityM3: 150000,
    coordinates: { lat: 36.77, lng: 5.74 },
    status: 'accessible'
  },
  {
    id: 'WP-03',
    name: 'Oued El Kebir Pumping Station',
    type: 'river',
    capacityM3: 250000,
    coordinates: { lat: 36.82, lng: 5.77 },
    status: 'operational'
  },
  {
    id: 'WP-04',
    name: 'Taksebt Dam (Tizi Ouzou)',
    type: 'dam',
    capacityM3: 180000000,
    coordinates: { lat: 36.69, lng: 4.15 },
    status: 'operational'
  },
  {
    id: 'WP-05',
    name: 'Tichy-Haf Dam (Bejaia)',
    type: 'dam',
    capacityM3: 120000000,
    coordinates: { lat: 36.55, lng: 4.88 },
    status: 'operational'
  }
];

export const WATCHTOWERS: WatchtowerCamera[] = [
  {
    id: 'WT-CAM-17',
    name: 'Watchtower #17 (Texanna Summit)',
    wilaya: 'Jijel',
    coordinates: { lat: 36.785, lng: 5.735 },
    hasOpticalCamera: true,
    hasThermalSensor: true,
    status: 'online',
    lastDetection: 'Smoke Column 042° at 14:23:45',
    bearingDegrees: 42,
    rangeKm: 18
  },
  {
    id: 'WT-CAM-12',
    name: 'Watchtower #12 (Guerrouche West)',
    wilaya: 'Jijel',
    coordinates: { lat: 36.765, lng: 5.690 },
    hasOpticalCamera: true,
    hasThermalSensor: true,
    status: 'online',
    bearingDegrees: 85,
    rangeKm: 20
  },
  {
    id: 'WT-CAM-05',
    name: 'Watchtower #05 (Yakouren Ridge)',
    wilaya: 'Tizi Ouzou',
    coordinates: { lat: 36.74, lng: 4.45 },
    hasOpticalCamera: true,
    hasThermalSensor: true,
    status: 'online',
    lastDetection: 'Flames sighted on North slope at 11:15',
    bearingDegrees: 310,
    rangeKm: 22
  },
  {
    id: 'WT-CAM-08',
    name: 'Watchtower #08 (Akfadou Peak)',
    wilaya: 'Béjaïa',
    coordinates: { lat: 36.70, lng: 4.67 },
    hasOpticalCamera: true,
    hasThermalSensor: false,
    status: 'online',
    bearingDegrees: 180,
    rangeKm: 25
  }
];

export const SAMPLE_POST_FIRE_REPORT: PostFireReport = {
  incidentId: 'DZ-WF-2026-000389',
  incidentCode: 'INCIDENT #DZ-2026-00389',
  wilaya: 'Skikda',
  startTime: '2026-08-18 13:10:00',
  containmentTime: '2026-08-19 06:45:00',
  totalDurationHours: 17.6,
  finalBurnedHectares: 84.5,
  vegetationLost: '62 ha Cork Oak canopy, 22.5 ha dry scrub maquis',
  infrastructureProtected: 'Hamlets of Ain Zouit, 1 rural clinic, 2 olive groves, 1 electric substation',
  casualties: 0,
  displacedCount: 240,
  resourcesDeployedCount: 14,
  waterUsedLiters: 340000,
  predictedVsActualSpreadAccuracyPercent: 88.4,
  initialDetectionLatencyMinutes: 4.2,
  responseArrivalLatencyMinutes: 16.5,
  aiModelLessons: [
    'Huygens elliptical spread model accurately predicted 3-hour vector within 9.2% lateral variance.',
    'Thermal drone reconnaissance bypassed thick smoke cover 18 minutes faster than traditional ground scouts.',
    'Underestimated local canyon draught wind acceleration in Oued Bibi sector; slope weighting adjusted in Model v4.2.',
    'Early citizen reporting provided critical early smoke azimuth 6 minutes ahead of satellite polar-orbit overpass.'
  ],
  reforestationPlanTimeline: 'Conservation des Forêts biological rest period (Year 1) followed by resilient Cork Oak and Carob tree seedlings (Years 2–4).'
};

// Aliases for clean component imports
export const SAMPLE_INCIDENTS = INITIAL_INCIDENTS;
export const SAMPLE_FORESTS = ALGERIA_FORESTS;
export const SAMPLE_WATER_POINTS = WATER_POINTS;
export const SAMPLE_WATCHTOWERS = WATCHTOWERS;
export const SAMPLE_RESOURCES = EMERGENCY_RESOURCES;
export const SAMPLE_DETECTION_SIGNALS = [
  ...INITIAL_INCIDENTS[0].detectionSources,
  {
    id: 'SIG-04',
    source: 'satellite_sentinel' as const,
    sourceName: 'Copernicus Sentinel-2 MSI Multi-Spectral',
    timestamp: '14:26:30',
    confidence: 89,
    location: { lat: 36.783, lng: 5.725 },
    details: 'SWIR B12 shortwave infrared anomaly confirms active surface flaming zone',
    sensorMetadata: {
      thermalAnomalyMw: 180,
      temperatureReading: 520
    }
  },
  {
    id: 'SIG-05',
    source: 'thermal_drone' as const,
    sourceName: 'Tactical Drone DZ-04 Flir Thermal',
    timestamp: '14:28:10',
    confidence: 97,
    location: { lat: 36.782, lng: 5.723 },
    details: 'Thermal radiometric spot identifies 2 distinct head fire fingers leaping ravine',
    sensorMetadata: {
      temperatureReading: 640
    }
  }
];

