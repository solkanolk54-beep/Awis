import { RoadSegment, SafeEvacuationZone, GeoCoordinates } from '../types';

/**
 * Algerian Strategic Road Network for Wildfire Evacuation Routing
 * Includes Autoroute Est-Ouest (A1), National Highways (RN), and Mountain Wilaya Corridors (CW)
 * covering high-risk fire zones across Jijel, Tizi Ouzou, Béjaïa, Skikda, Tipaza, Blida, and El Tarf.
 */
export const ALGERIAN_ROAD_SEGMENTS: RoadSegment[] = [
  // ==========================================
  // JIJEL REGION (Texenna, Taher, El Aouana, Jijel Port)
  // ==========================================
  {
    id: 'RN77-NORTH',
    roadNumber: 'RN 77',
    nameEn: 'National Highway 77 (Texenna to Jijel Coast)',
    nameAr: 'الطريق الوطني رقم 77 (تاكسنة - ساحل جيجل)',
    nameFr: 'Route Nationale 77 (Texenna vers Jijel)',
    type: 'national',
    lanes: 2,
    speedLimitKmH: 70,
    capacityVehiclesPerHour: 1200,
    elevationGainMeters: -450,
    path: [
      { lat: 36.685, lng: 5.782 }, // Texenna south
      { lat: 36.721, lng: 5.765 }, // Texenna center
      { lat: 36.755, lng: 5.748 }, // Forest pass near fire zone
      { lat: 36.782, lng: 5.735 }, // Kaous junction
      { lat: 36.812, lng: 5.768 }  // Jijel city gateway
    ]
  },
  {
    id: 'RN43-EAST',
    roadNumber: 'RN 43',
    nameEn: 'RN 43 Corniche East (Jijel to Taher & Airport)',
    nameAr: 'الطريق الوطني رقم 43 الكورنيش الشرقي (جيجل - الطاهير)',
    nameFr: 'RN 43 Corniche Est (Jijel vers Taher)',
    type: 'national',
    lanes: 4,
    speedLimitKmH: 90,
    capacityVehiclesPerHour: 2200,
    elevationGainMeters: 10,
    path: [
      { lat: 36.812, lng: 5.768 }, // Jijel city
      { lat: 36.805, lng: 5.820 }, // Bazoul coastal plain
      { lat: 36.785, lng: 5.885 }, // Taher coastal safe corridor
      { lat: 36.772, lng: 5.925 }  // Taher Civil Protection Airport Safe Hub
    ]
  },
  {
    id: 'RN43-WEST',
    roadNumber: 'RN 43',
    nameEn: 'RN 43 Corniche West (Jijel to El Aouana & Ziama)',
    nameAr: 'الطريق الوطني رقم 43 الكورنيش الغربي (جيجل - العوانة)',
    nameFr: 'RN 43 Corniche Ouest (Jijel vers El Aouana)',
    type: 'national',
    lanes: 2,
    speedLimitKmH: 80,
    capacityVehiclesPerHour: 1400,
    elevationGainMeters: 25,
    path: [
      { lat: 36.812, lng: 5.768 }, // Jijel
      { lat: 36.788, lng: 5.680 }, // Kissir Dam junction
      { lat: 36.775, lng: 5.585 }, // El Aouana beach safe zone
      { lat: 36.745, lng: 5.480 }  // Caves of Ziama Mansouriah
    ]
  },
  {
    id: 'CW142-MOUNTAIN',
    roadNumber: 'CW 142',
    nameEn: 'Chekfa - Ait Bouyoucef Mountain Corridor',
    nameAr: 'الطريق الولائي 142 (ممر جبال الشقفة - آيت بويوسف)',
    nameFr: 'Chemin de Wilaya 142 (Chekfa vers Montagne)',
    type: 'wilaya',
    lanes: 2,
    speedLimitKmH: 50,
    capacityVehiclesPerHour: 600,
    elevationGainMeters: 380,
    path: [
      { lat: 36.784, lng: 5.719 }, // Village Ait Bouyoucef hamlet
      { lat: 36.772, lng: 5.742 }, // Mountain pass link
      { lat: 36.760, lng: 5.775 }, // Chekfa town outskirts
      { lat: 36.785, lng: 5.885 }  // Connects to Taher plain
    ]
  },
  {
    id: 'CW137-FOREST',
    roadNumber: 'CW 137',
    nameEn: 'Selma Benziada Forest Crest Route',
    nameAr: 'الطريق الولائي 137 (طريق غابات سلمى بن زيادة)',
    nameFr: 'Chemin de Wilaya 137 (Selma Benziada)',
    type: 'mountain_pass',
    lanes: 1,
    speedLimitKmH: 40,
    capacityVehiclesPerHour: 350,
    elevationGainMeters: 550,
    path: [
      { lat: 36.715, lng: 5.660 }, // High mountain ridge
      { lat: 36.742, lng: 5.698 }, // Valley bridge
      { lat: 36.782, lng: 5.735 }  // Intersects RN 77 Kaous
    ]
  },

  // ==========================================
  // TIZI OUZOU / KABYLIE REGION (Yakouren, Azazga, Larbaâ Nath Irathen)
  // ==========================================
  {
    id: 'RN12-CENTRAL',
    roadNumber: 'RN 12',
    nameEn: 'National Highway 12 Expressway (Yakouren - Azazga - Tizi Ouzou)',
    nameAr: 'الطريق الوطني السريع رقم 12 (إعكوران - عزازقة - تيزي وزو)',
    nameFr: 'Voie Rapide RN 12 (Yakouren - Azazga - Tizi Ouzou)',
    type: 'national',
    lanes: 4,
    speedLimitKmH: 100,
    capacityVehiclesPerHour: 2800,
    elevationGainMeters: -520,
    path: [
      { lat: 36.745, lng: 4.450 }, // Yakouren dense cedar forest
      { lat: 36.742, lng: 4.372 }, // Azazga city valley
      { lat: 36.728, lng: 4.250 }, // Freha plains
      { lat: 36.715, lng: 4.140 }, // Oued Aissi industrial safe zone
      { lat: 36.711, lng: 4.045 }  // Tizi Ouzou Grand Olympic Stadium Hub
    ]
  },
  {
    id: 'RN71-MOUNTAIN',
    roadNumber: 'RN 71',
    nameEn: 'RN 71 Djurdjura Ridge (Ain El Hammam to Azazga)',
    nameAr: 'الطريق الوطني رقم 71 (عين الحمام - عزازقة)',
    nameFr: 'RN 71 Crête du Djurdjura',
    type: 'mountain_pass',
    lanes: 2,
    speedLimitKmH: 50,
    capacityVehiclesPerHour: 550,
    elevationGainMeters: 420,
    path: [
      { lat: 36.565, lng: 4.305 }, // Ain El Hammam high crest
      { lat: 36.635, lng: 4.340 }, // Mekla valley
      { lat: 36.742, lng: 4.372 }  // Azazga junction RN 12
    ]
  },
  {
    id: 'CW253-PASS',
    roadNumber: 'CW 253',
    nameEn: 'Col de Chellata Mountain Route to Akbou',
    nameAr: 'ممر شلاطة الجبلي (تيزي وزو نحو أقبو بجاية)',
    nameFr: 'Col de Chellata (Vers Vallée de la Soummam)',
    type: 'mountain_pass',
    lanes: 1,
    speedLimitKmH: 35,
    capacityVehiclesPerHour: 300,
    elevationGainMeters: 600,
    path: [
      { lat: 36.720, lng: 4.420 }, // High forest flank
      { lat: 36.660, lng: 4.480 }, // Mountain crest
      { lat: 36.540, lng: 4.540 }  // Akbou valley connection
    ]
  },
  {
    id: 'RN24-TIZI-COAST',
    roadNumber: 'RN 24',
    nameEn: 'RN 24 Coastal Route (Tigzirt - Azeffoun - Dellys)',
    nameAr: 'الطريق الوطني رقم 24 الساحلي (تيقزيرت - أزفون)',
    nameFr: 'RN 24 Route Côtière Nord',
    type: 'national',
    lanes: 2,
    speedLimitKmH: 80,
    capacityVehiclesPerHour: 1300,
    elevationGainMeters: 15,
    path: [
      { lat: 36.895, lng: 4.120 }, // Tigzirt safe coastal harbor
      { lat: 36.898, lng: 4.425 }, // Azeffoun marina & safe zone
      { lat: 36.780, lng: 4.435 }  // Yakouren mountain bypass link
    ]
  },

  // ==========================================
  // BÉJAÏA & SOUMMAM VALLEY (Aokas, Tichy, Kherrata, Akbou)
  // ==========================================
  {
    id: 'RN9-SOUMMAM-COAST',
    roadNumber: 'RN 9',
    nameEn: 'RN 9 Expressway (Béjaïa Port - Tichy - Aokas)',
    nameAr: 'الطريق الوطني رقم 9 السريع (ميناء بجاية - تيشي - أوقاس)',
    nameFr: 'RN 9 Voie Côtière (Béjaïa - Tichy - Aokas)',
    type: 'national',
    lanes: 4,
    speedLimitKmH: 90,
    capacityVehiclesPerHour: 2500,
    elevationGainMeters: 5,
    path: [
      { lat: 36.755, lng: 5.080 }, // Béjaïa port & university complex
      { lat: 36.672, lng: 5.160 }, // Tichy beach resort safe haven
      { lat: 36.638, lng: 5.240 }, // Aokas tunnel entrance
      { lat: 36.565, lng: 5.285 }  // Souk El Tenine junction
    ]
  },
  {
    id: 'RN26-SOUMMAM',
    roadNumber: 'RN 26',
    nameEn: 'RN 26 Soummam River Corridor (El Kseur to Akbou)',
    nameAr: 'الطريق الوطني رقم 26 وادي الصومام (القصر - أقبو)',
    nameFr: 'RN 26 Vallée de la Soummam (El Kseur - Akbou)',
    type: 'national',
    lanes: 4,
    speedLimitKmH: 100,
    capacityVehiclesPerHour: 2600,
    elevationGainMeters: 60,
    path: [
      { lat: 36.755, lng: 5.080 }, // Béjaïa
      { lat: 36.685, lng: 4.860 }, // El Kseur Civil Protection Hub
      { lat: 36.540, lng: 4.540 }, // Akbou industrial zone
      { lat: 36.420, lng: 4.420 }  // Tazmalt exit
    ]
  },

  // ==========================================
  // AUTOROUTE EST-OUEST (A1) & BLIDA / TIPAZA CORRIDOR
  // ==========================================
  {
    id: 'A1-EAST-WEST-ALGIERS-BOUIRA',
    roadNumber: 'A1',
    nameEn: 'A1 East-West Highway (Algiers - Bouira - Bordj Bou Arreridj)',
    nameAr: 'الطريق السيار شرق-غرب أ1 (الجزائر العاصمة - البويرة)',
    nameFr: 'Autoroute Est-Ouest A1 (Alger - Bouira)',
    type: 'highway',
    lanes: 6,
    speedLimitKmH: 110,
    capacityVehiclesPerHour: 4500,
    elevationGainMeters: 220,
    path: [
      { lat: 36.720, lng: 3.150 }, // Algiers east hub
      { lat: 36.630, lng: 3.520 }, // Boumerdes interchange
      { lat: 36.520, lng: 3.750 }, // Lakhdaria gorges
      { lat: 36.380, lng: 3.900 }, // Bouira Olympic Complex Safe Hub
      { lat: 36.080, lng: 4.760 }  // Bordj Bou Arreridj connection
    ]
  },
  {
    id: 'RN11-TIPAZA',
    roadNumber: 'RN 11',
    nameEn: 'RN 11 Tipaza Coastal Expressway (Cherchell - Tipaza - Tipaza Port)',
    nameAr: 'الطريق الوطني السريع 11 (شرشال - تيبازة)',
    nameFr: 'Voie Rapide Côtière RN 11 Tipaza',
    type: 'national',
    lanes: 4,
    speedLimitKmH: 100,
    capacityVehiclesPerHour: 2600,
    elevationGainMeters: 10,
    path: [
      { lat: 36.598, lng: 2.420 }, // Tipaza city safe zone
      { lat: 36.605, lng: 2.190 }, // Cherchell safe port
      { lat: 36.530, lng: 1.850 }  // Damous coastal corridor
    ]
  },

  // ==========================================
  // SKIKDA & EL TARF EASTERN CORRIDORS
  // ==========================================
  {
    id: 'RN43-SKIKDA-COLLO',
    roadNumber: 'RN 43 / RN 85',
    nameEn: 'RN 85 Mountain Corridor (Collo Peninsula to Skikda)',
    nameAr: 'الطريق الوطني رقم 85 (شبه جزيرة القل نحو سكيكدة)',
    nameFr: 'RN 85 Corridor Massif de Collo vers Skikda',
    type: 'national',
    lanes: 2,
    speedLimitKmH: 60,
    capacityVehiclesPerHour: 900,
    elevationGainMeters: 180,
    path: [
      { lat: 37.008, lng: 6.575 }, // Collo harbor safe haven
      { lat: 36.935, lng: 6.640 }, // Tamalous junction
      { lat: 36.875, lng: 6.905 }  // Skikda 20 Août Stadium Safe Center
    ]
  },
  {
    id: 'RN44-EL-TARF',
    roadNumber: 'RN 44',
    nameEn: 'RN 44 Trans-Maghreb Corridor (Annaba - El Kala - Tunisia)',
    nameAr: 'الطريق الوطني رقم 44 (عنابة - القالة - الحدود)',
    nameFr: 'RN 44 Corridor Frontalier El Tarf',
    type: 'national',
    lanes: 4,
    speedLimitKmH: 90,
    capacityVehiclesPerHour: 2200,
    elevationGainMeters: 15,
    path: [
      { lat: 36.900, lng: 7.750 }, // Annaba 19 Mai Stadium Hub
      { lat: 36.765, lng: 8.310 }, // El Tarf Wilaya Command
      { lat: 36.895, lng: 8.445 }  // El Kala Safe Peninsula
    ]
  }
];

/**
 * Designated Safe Evacuation Zones & Emergency Reception Facilities
 * Equipped with field triage, civil defense logistic stockpiles, and helicopter landing spots.
 */
export const SAFE_EVACUATION_ZONES: SafeEvacuationZone[] = [
  // JIJEL
  {
    id: 'SAFE-JIJEL-STADIUM',
    nameEn: 'Colonel Amirouche Stadium & Complex',
    nameAr: 'المركب الرياضي وملعب العقيد عميروش (جيجل)',
    nameFr: 'Complexe et Stade Colonel Amirouche (Jijel)',
    type: 'stadium_shelter',
    coordinates: { lat: 36.814, lng: 5.765 },
    wilaya: 'Jijel',
    capacityPersons: 4500,
    currentOccupancy: 320,
    availableBeds: 1200,
    hasMedicalSupport: true,
    hasHelipad: true,
    hasFoodWaterSupply: true,
    emergencyVhfFrequency: '156.800 MHz (VHF Ch 16)',
    contactPhone: '14 / 1021 / 034 47 12 12'
  },
  {
    id: 'SAFE-TAHER-AIRPORT',
    nameEn: 'Taher Ferhat Abbas Field Triage & Base',
    nameAr: 'قاعدة الإيواء والإسعاف المتقدم بمطار فرحات عباس (الطاهير)',
    nameFr: 'Base Avancée de Triage - Aéroport Taher Ferhat Abbas',
    type: 'field_hospital',
    coordinates: { lat: 36.772, lng: 5.885 },
    wilaya: 'Jijel',
    capacityPersons: 3200,
    currentOccupancy: 150,
    availableBeds: 850,
    hasMedicalSupport: true,
    hasHelipad: true,
    hasFoodWaterSupply: true,
    emergencyVhfFrequency: '156.450 MHz',
    contactPhone: '14 / 034 45 60 00'
  },
  {
    id: 'SAFE-AOUANA-BEACH',
    nameEn: 'El Aouana Coastal Assembly Haven',
    nameAr: 'منطقة التجمع الساحلية الآمنة بالعوانة',
    nameFr: 'Zone Côtière Sécurisée El Aouana',
    type: 'coastal_safe_zone',
    coordinates: { lat: 36.775, lng: 5.585 },
    wilaya: 'Jijel',
    capacityPersons: 2800,
    currentOccupancy: 80,
    availableBeds: 500,
    hasMedicalSupport: true,
    hasHelipad: false,
    hasFoodWaterSupply: true,
    emergencyVhfFrequency: '156.600 MHz',
    contactPhone: '14 / 034 49 11 11'
  },

  // TIZI OUZOU
  {
    id: 'SAFE-TIZI-HOCINE-AIT-AHMED',
    nameEn: 'Hocine Aït Ahmed 50,000 Olympic Hub',
    nameAr: 'ملعب المجاهد حسين آيت أحمد ومركز التجمع المدني',
    nameFr: 'Stade Olympique Hocine Aït Ahmed Tizi Ouzou',
    type: 'stadium_shelter',
    coordinates: { lat: 36.711, lng: 4.045 },
    wilaya: 'Tizi Ouzou',
    capacityPersons: 12000,
    currentOccupancy: 640,
    availableBeds: 3500,
    hasMedicalSupport: true,
    hasHelipad: true,
    hasFoodWaterSupply: true,
    emergencyVhfFrequency: '156.850 MHz',
    contactPhone: '14 / 026 20 14 14'
  },
  {
    id: 'SAFE-AZAZGA-POLYCLINIC',
    nameEn: 'Azazga Central Safe Logistics Hub',
    nameAr: 'المركب الرياضي ومركز الاستجابة السريعة بعزازقة',
    nameFr: 'Centre Logistique et Sportif Azazga',
    type: 'civil_protection_hub',
    coordinates: { lat: 36.742, lng: 4.372 },
    wilaya: 'Tizi Ouzou',
    capacityPersons: 2500,
    currentOccupancy: 210,
    availableBeds: 600,
    hasMedicalSupport: true,
    hasHelipad: false,
    hasFoodWaterSupply: true,
    emergencyVhfFrequency: '156.700 MHz',
    contactPhone: '14 / 026 34 22 22'
  },
  {
    id: 'SAFE-TIGZIRT-PORT',
    nameEn: 'Tigzirt Coastal Maritime Evacuation Hub',
    nameAr: 'ميناء تيقزيرت ومركز الإيواء البحري للطوارئ',
    nameFr: 'Port et Centre d’Évacuation Maritime Tigzirt',
    type: 'coastal_safe_zone',
    coordinates: { lat: 36.895, lng: 4.120 },
    wilaya: 'Tizi Ouzou',
    capacityPersons: 3000,
    currentOccupancy: 95,
    availableBeds: 700,
    hasMedicalSupport: true,
    hasHelipad: false,
    hasFoodWaterSupply: true,
    emergencyVhfFrequency: '156.800 MHz (VHF Ch 16)',
    contactPhone: '14 / 026 25 70 00'
  },

  // BÉJAÏA
  {
    id: 'SAFE-BEJAIA-MAGHREBI',
    nameEn: 'Béjaïa Maghrebi Unit & Port Safe Zone',
    nameAr: 'الوحدة الرئيسية للحماية المدنية ومركب الميناء (بجاية)',
    nameFr: 'Unité Principale Protection Civile & Port de Béjaïa',
    type: 'civil_protection_hub',
    coordinates: { lat: 36.755, lng: 5.080 },
    wilaya: 'Béjaïa',
    capacityPersons: 6000,
    currentOccupancy: 410,
    availableBeds: 1800,
    hasMedicalSupport: true,
    hasHelipad: true,
    hasFoodWaterSupply: true,
    emergencyVhfFrequency: '156.550 MHz',
    contactPhone: '14 / 034 12 14 14'
  },
  {
    id: 'SAFE-TICHY-SPORTS',
    nameEn: 'Tichy Youth & Sports Safe Camp',
    nameAr: 'المخيم الكشفي ومركب الشباب تيشي (الملاذ الساحلي)',
    nameFr: 'Complexe Jeunesse et Loisirs de Tichy',
    type: 'coastal_safe_zone',
    coordinates: { lat: 36.672, lng: 5.160 },
    wilaya: 'Béjaïa',
    capacityPersons: 3500,
    currentOccupancy: 120,
    availableBeds: 900,
    hasMedicalSupport: true,
    hasHelipad: false,
    hasFoodWaterSupply: true,
    emergencyVhfFrequency: '156.650 MHz',
    contactPhone: '14 / 034 23 88 88'
  },

  // SKIKDA
  {
    id: 'SAFE-SKIKDA-STADIUM',
    nameEn: 'Skikda 20 Août Multi-Sports Complex',
    nameAr: 'مركب 20 أوت 1955 الرياضي بسكيكدة',
    nameFr: 'Complexe Omnisports 20 Août 1955 Skikda',
    type: 'stadium_shelter',
    coordinates: { lat: 36.875, lng: 6.905 },
    wilaya: 'Skikda',
    capacityPersons: 5500,
    currentOccupancy: 190,
    availableBeds: 1400,
    hasMedicalSupport: true,
    hasHelipad: true,
    hasFoodWaterSupply: true,
    emergencyVhfFrequency: '156.750 MHz',
    contactPhone: '14 / 038 75 14 14'
  },

  // BOUIRA / CENTRAL
  {
    id: 'SAFE-BOUIRA-COMPLEX',
    nameEn: 'Rabah Bitat Bouira Sports Arena',
    nameAr: 'القاعة متعددة الرياضات رابح بيطاط (البويرة)',
    nameFr: 'Palais des Sports Rabah Bitat (Bouira)',
    type: 'stadium_shelter',
    coordinates: { lat: 36.380, lng: 3.900 },
    wilaya: 'Bouira',
    capacityPersons: 4000,
    currentOccupancy: 75,
    availableBeds: 1100,
    hasMedicalSupport: true,
    hasHelipad: true,
    hasFoodWaterSupply: true,
    emergencyVhfFrequency: '156.800 MHz',
    contactPhone: '14 / 026 93 14 14'
  }
];

/**
 * Known vulnerable settlements / hamlets near dense northern forest massifs
 */
export interface CivilianSettlement {
  id: string;
  nameEn: string;
  nameAr: string;
  nameFr: string;
  wilaya: string;
  coordinates: GeoCoordinates;
  population: number;
  vulnerableCount: number; // Children, elderly, reduced mobility
  primaryRoadAccessId: string;
  secondaryRoadAccessId: string;
}

export const AT_RISK_SETTLEMENTS: CivilianSettlement[] = [
  {
    id: 'SETTLE-AIT-BOUYOUCEF',
    nameEn: 'Village Ait Bouyoucef (Hamlet)',
    nameAr: 'قرية آيت بويوسف',
    nameFr: 'Village Ait Bouyoucef',
    wilaya: 'Jijel',
    coordinates: { lat: 36.784, lng: 5.719 },
    population: 1840,
    vulnerableCount: 380,
    primaryRoadAccessId: 'CW142-MOUNTAIN',
    secondaryRoadAccessId: 'RN77-NORTH'
  },
  {
    id: 'SETTLE-TEXENNA-CREST',
    nameEn: 'Texenna North Settlement',
    nameAr: 'تجمع شمال تاكسنة الجبلي',
    nameFr: 'Agglomération Nord Texenna',
    wilaya: 'Jijel',
    coordinates: { lat: 36.721, lng: 5.765 },
    population: 2450,
    vulnerableCount: 520,
    primaryRoadAccessId: 'RN77-NORTH',
    secondaryRoadAccessId: 'CW137-FOREST'
  },
  {
    id: 'SETTLE-YAKOUREN-VILLAGE',
    nameEn: 'Yakouren Forest Edge Community',
    nameAr: 'قرية حافة غابة إعكوران',
    nameFr: 'Communauté Lisière Forêt Yakouren',
    wilaya: 'Tizi Ouzou',
    coordinates: { lat: 36.745, lng: 4.450 },
    population: 3100,
    vulnerableCount: 640,
    primaryRoadAccessId: 'RN12-CENTRAL',
    secondaryRoadAccessId: 'CW253-PASS'
  },
  {
    id: 'SETTLE-KISSIR-VALLEY',
    nameEn: 'El Aouana Kissir Hamlet',
    nameAr: 'قرية وادي كيسير بالعوانة',
    nameFr: 'Hameau Vallée de Kissir',
    wilaya: 'Jijel',
    coordinates: { lat: 36.788, lng: 5.680 },
    population: 1250,
    vulnerableCount: 260,
    primaryRoadAccessId: 'RN43-WEST',
    secondaryRoadAccessId: 'CW142-MOUNTAIN'
  },
  {
    id: 'SETTLE-TAMALOUS-RIDGE',
    nameEn: 'Tamalous Forest Periphery',
    nameAr: 'مشارف غابات تمالوس',
    nameFr: 'Périphérie Forestière Tamalous',
    wilaya: 'Skikda',
    coordinates: { lat: 36.935, lng: 6.640 },
    population: 2200,
    vulnerableCount: 450,
    primaryRoadAccessId: 'RN43-SKIKDA-COLLO',
    secondaryRoadAccessId: 'RN43-SKIKDA-COLLO'
  }
];
