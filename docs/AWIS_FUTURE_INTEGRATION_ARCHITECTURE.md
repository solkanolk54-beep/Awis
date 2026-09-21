# الخطة الهندسية والمعمارية لتكامل الأنظمة المستقبلية لنظام AWIS
## Future Integration Architecture & Technical Specifications (AWIS 2026-2028)

**المُعِد:** كبير مهندسي الأنظمة والذكاء الاصطناعي الجيو-فضائي (Principal Systems Architect)  
**المشروع:** نظام الجزائر للإنذار المبكر وإدارة حرائق الغابات (Algeria Wildfire Information System - AWIS)  
**النطاق:** دمج الأقمار الجيوستاتيكية MTG-FCI، رادارات الفتحة التركيبية SAR Sentinel-1، شبكات مجسات LoRaWAN الأرضية، والرؤية الحاسوبية على الدرونات التكتيكية Edge AI.

---

## 🏛️ المخطط المعماري العام للتكامل (Unified Sensor-to-Tactical Edge Architecture)

```
[ Tier 1: Geospatial & Earth Observation ]       [ Tier 2: Ground & Tactical Edge ]
┌─────────────────────────┐ ┌───────────────────┐ ┌─────────────────────────┐ ┌──────────────────────┐
│  EUMETSAT Data Tailor   │ │ Copernicus SciHub │ │   LoRaWAN Meshes        │ │  Tactical UAVs       │
│  MTG-1 / FCI (10-min)   │ │ Sentinel-1 SAR    │ │   ChirpStack / TTN      │ │  RTSP/WebRTC + Edge  │
│  Near-Real-Time NetCDF4 │ │ GRD / Interferom. │ │   CO / VOCs / Temp      │ │  YOLOv10 / Thermal   │
└───────────┬─────────────┘ └─────────┬─────────┘ └───────────┬─────────────┘ └──────────┬───────────┘
            │ EUMETCast / S3          │ Sentinel Hub          │ MQTT / Webhook           │ gRPC / RTMP
            ▼                         ▼                       ▼                          ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                       AWIS Unified Real-Time Multi-Sensor Ingestion Layer                          │
│                                (Node.js / Express Microservices)                                   │
├────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ • Temporal Resampling & Spatial Reprojection (EPSG:4326 WGS-84 / UTM Zone 31N/32N Algeria)        │
│ • Geofence Filtering: Algeria BBox [-8.7°W, 18.9°N, 12.0°E, 37.1°N]                              │
│ • Cross-Sensor Multi-Spectral & Multi-Modal Feature Extraction                                     │
└─────────────────────────────────┬──────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                    Sensor Fusion & Physical Validation Pipeline (D3 & Rothermel)                   │
├────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ • Byram Fireline Intensity Integration (kW/m)                                                      │
│ • Spatio-Temporal Spatial Co-registration (Hotspot Clustering & Cloud Penetration)                 │
│ • First-Minute Emergency Trigger Engine (Zero-Latency Early Warning Thresholds)                     │
└──────────────────┬───────────────────────────────────────────────┬─────────────────────────────────┘
                   │                                               │
                   ▼                                               ▼
┌───────────────────────────────────────────────┐ ┌──────────────────────────────────────────────────┐
│   Tactical Cloud Persistence (Google Firebase)│ │   Tactical Offline-First Client (Browser Engine) │
│   • Firestore Incident Collections            │ │   • IndexedDB (awis_tactical_db / g01_cache)     │
│   • Multi-Sensor Anomaly Streams              │ │   • Web Workers for Vector Processing            │
│   • Real-Time Dispatch & Resource Allocation  │ │   • Dynamic D3 Flame Intensity & Isochrones HUD  │
└───────────────────────────────────────────────┘ └──────────────────────────────────────────────────┘
```

---

## 🛰️ المحور الأول: دمج القمر الجيوستاتيكي الجديد (Meteosat Third Generation - MTG / FCI)

### 1.1 البنية التحتية المقترحة (Infrastructure & Protocols)
* **قناة استقبال البيانات (Data Stream Protocol):**
  * الاشتراك في خدمة **EUMETSAT Data Tailor API** وخدمة التوزيع الفضائي **EUMETCast-Terrestrial** عبر بروتوكول `DVB-S2 / ZMQ`.
  * تنسيق البيانات الخام: حزم `NetCDF4 / HDF5` المتضمنة قنوات المستشعر المتطور `Flexible Combined Imager (FCI)`.
* **محول الاستقبال والترشيح (Data Ingestion Adapter):**
  * خدمة خلفية مخصصة (`services/mtgIngestionAdapter.ts`) تعمل بنمط Daemon أو Cron كل **10 دقائق** لاستقبال حزم النطاق الإقليمي الكامل (Full Disc / European-African Sub-area).
  * قص النطاق المكاني الجغرافي آلياً (Clipping & Sub-setting) لمصفوفة الجزائر:
    $$\text{Algeria BBox} = [-8.7^\circ, 18.9^\circ, 12.0^\circ, 37.1^\circ]$$
* **القنوات الطيفية المعتمدة لرصد الشذوذ الحراري:**
  * **قناة NIR 3.8 µm (IR3.8):** حساسية بالغة للانبعاثات الحرارية شديدة التوهج وحرائق الغابات في أطوارها الأولى (تطبيق قانون فين للإزاحة Wien's Displacement Law عند 700–1000 كلفن).
  * **قناة TIR 10.5 µm (IR10.5):** قياس درجة حرارة الخلفية السطحية وتحديد السحب الركامية والجليدية.
  * **الخوارزمية الحسابية (Dual-Band Differential Radiance Index):**
    $$\Delta T_{\text{FCI}} = T_{3.8} - T_{10.5}$$
    إذا تجاوز $\Delta T_{\text{FCI}}$ عتبة الارتفاع الموضعي بمقدار 8K إلى 12K مقارنة بالبكسلات المحيطة الصافية، يُصنف البكسل كبؤرة حريق ناشئة.
* **البنية التحتية البرمجية:**
  * خادم وسيط `Fastify / Express Worker` مع مكتبة `gdal-async` أو `netcdf4-wasm` لتحويل مصفوفات NetCDF إلى حزم `GeoJSON / Protobuf` مقتضبة ترسل إلى واجهة AWIS عبر **Server-Sent Events (SSE)** أو **WebSockets**.

### 1.2 نموذج البيانات الموحد (Unified Data Model)
يتم ربط بيانات MTG-FCI بسلاسة مع واجهة الكشف `DetectionSignal` و `FirmsDetection` المعتمدة في النظام:

```typescript
export interface MtgFciHotspotSignal {
  id: string; // e.g. "MTG-FCI-DZ-20260921-1240"
  timestampUtc: string; // ISO 8601 كل 10 دقائق
  scanRepeatCycle: number; // دورة المسح (1-144 في اليوم)
  location: {
    lat: number;
    lng: number;
  };
  wilayaId: number;
  wilayaNameAr: string;
  spectralChannels: {
    t38Kelvin: number; // درجة حرارة القناة 3.8 ميكرومتر
    t105Kelvin: number; // درجة حرارة القناة 10.5 ميكرومتر
    deltaTKelvin: number; // الفارق الإشعاعي (T3.8 - T10.5)
  };
  frpEstimatedMw: number; // طاقة الإشعاع المقدرة (Fire Radiative Power)
  pixelFootprintKm2: number; // ~1-2 كم حسب زاوية الرصد (Sub-satellite point)
  cloudMaskStatus: 'clear' | 'partially_cloudy' | 'smoke_plume';
  confidenceLevel: 'low' | 'nominal' | 'high';
  isProcessedInCadence: boolean;
}
```

### 1.3 خطة التنفيذ المرحلية (Phase-by-Phase Implementation)
1. **المرحلة 1: المحاكي المداري عالي الدقة (Mock & Historical Feed - أسبوعين):**
   * بناء محول محاكاة في خادم `server.ts` يولد نبضات كل 10 دقائق مطابقة لخصائص MTG-FCI للمناطق الغابية عالية الخطورة (تيزي وزو، بجاية، جيجل، سوق أهراس) لتجهيز واجهة العرض التكتيكية.
2. **المرحلة 2: خادم التحويل اللحظي (NetCDF Cloud Pipeline - 4 أسابيع):**
   * إعداد وظيفة بدون خادم (Cloud Function / Cloud Run) ترتبط بـ EUMETSAT Data Tailor API، وتستخلص فقط حزم الجزائر، وتحولها إلى نقاط GeoJSON مدمجة بنطاق الذاكرة المؤقتة.
3. **المرحلة 3: تكامل المزامنة والتخزين دون اتصال (Offline Sync - أسبوعين):**
   * تحديث `indexedDbService.ts` لتخزين أحدث 72 دورة مسح لـ MTG (تغطية آخر 12 ساعة) محلياً في مخزن `mtg_fci_timeseries` لتمكين التحليل الميداني الزمني عند انقطاع الاتصال.

---

## 📡 المحور الثاني: معالجة بيانات رادارات الفتحة التركيبية (SAR / Sentinel-1)

### 2.1 البنية التحتية المقترحة (Infrastructure & Algorithms)
* **واجهة استجلاب صور الرادار (API Access & Data Stream):**
  * الاتصال بـ **Copernicus Data Space Ecosystem (CDSE) OData API** أو **Sentinel Hub Statistical API** باستخدام حساب مؤسساتي.
  * نوع المنتجات: **Sentinel-1 Level-1 GRD (Ground Range Detected)** بنمط الاستقطاب المزدوج $VV + VH$، بتردد نطاق C-Band ($5.405\text{ GHz}$).
* **خوارزميات اختراق الدخان والسحب (Through-Smoke Radar Processing):**
  * إشارات C-Band الرادارية لا تتأثر بجزيئات الدخان الهوائية (Aerosols) ولا بالسحب المائية والركامية بفضل طول الموجة (~$5.6\text{ cm}$).
  * **خوارزمية رصد التغير في معامل التبعثر الخلفي (Radar Backscatter Change Detection - $\Delta\sigma^0$):**
    * حرق الأوراق وفقدان الرطوبة في الكتلة الحيوية الشجرية يؤدي إلى هبوط حاد في التبعثر الحجمي (Volume Scattering) في استقطاب $VH$:
      $$\text{Burn Ratio (dB)} = 10 \cdot \log_{10}\left(\frac{\sigma^0_{VH,\text{Post}}}{\sigma^0_{VH,\text{Pre}}}\right)$$
    * المناطق التي يقل فيها التبعثر بمقدار $> -2.8\text{ dB}$ تصنف فوراً كمناطق متفحمة (Burn Scar)، بينما خط التغير المفاجئ يمثل جبهة الحريق الهندسية (Active Fire Perimeter).
* **معالجة مضلعات محيط الحريق (Geometric Vectorization):**
  * تشغيل معالج `OpenCV / Shapely` لتحويل مصفوفات التغير الراداري الثنائية (Binary Mask) إلى مضلعات موجهة (GeoJSON Polygons) تمثل المحيط الفعلي للحريق بدقة 10–20 متراً.

### 2.2 نموذج البيانات الموحد (Unified Data Model)
```typescript
export interface SarRadarFirePerimeter {
  id: string; // e.g. "SAR-S1-DZ-2026-0042"
  orbitDirection: 'ASCENDING' | 'DESCENDING';
  acquisitionTimestamp: string;
  polarizationChannels: ['VV', 'VH'];
  perimeterGeoJson: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][];
  };
  totalBurnScarAreaHa: number;
  cloudPenetrationSuccess: true; // ميزة الرادار الثابتة
  backscatterDifferenceDbMean: number; // متوسط الانخفاض في التبعثر الراداري
  confidenceMatrix: number[]; // مؤشر ثقة التفرقة بين الحريق والرطوبة الأرضية
  derivedFireFrontLine: {
    type: 'LineString';
    coordinates: number[][];
    advancementBearingDeg: number;
  };
}
```

### 2.3 خطة التنفيذ المرحلية (Phase-by-Phase Implementation)
1. **المرحلة 1: طبقة العرض التكتيكي لمضلعات الرادار في GISMap (أسبوعين):**
   * تحديث محرك الخرائط في `GISMap.tsx` لإضافة طبقة `SAR Radar Penetration Overlay` قادرة على رسم مضلعات الاحتراق بالألوان الفوسفورية الرادارية الشفافة (Radar Cyan / Lime).
2. **المرحلة 2: محول معالجة التغيرات السحابي (Cloud Change-Detection Pipeline - 4 أسابيع):**
   * نشر خدمة على Python (FastAPI + GDAL/SNAP Engine) تقارن تلقائياً بين آخر لقطتين لرادار Sentinel-1 عند الإبلاغ عن حريق نشط في الولاية المعنية.
3. **المرحلة 3: دمج محيط الرادار بمحرك D3 ومصفوفة ألسنة اللهب (أسبوعين):**
   * إدخال مضلع الرادار الفعلي كشرط أولي حقيقي (Ground-Truth Baseline) في محاكي النمو D3 بدلاً من الدائرة أو الإهليلج التقديري، مما يرفع دقة التنبؤ بانتشار الحريق بنسبة تتجاوز 40%.

---

## 🌲 المحور الثالث: شبكة مجسات أرضية لإنترنت الأشياء (IoT LoRaWAN Meshes)

### 3.1 البنية التحتية المقترحة (Infrastructure & Protocols)
* **معمارية شبكة الاستشعار في الغابات (Field Sensor Topology):**
  * بوابات راديوية **LoRaWAN Outdoor Gateways (IP67)** مثبتة على أبراج المراقبة التابعة للغابات أو قمم الجبال (بارتفاعات استراتيجية لمدى تغطية 10–15 كم بنطاق EU868 MHz المعتمد بالجزائر).
  * عقد استشعار طرفية مدمجة بألواح شمسية وبطاريات فوسفات الحديد الليثيوم (LiFePO4) تزرع على مسافات 200–500 متر في المناطق عالية القابلية للاشتعال.
* **مجسات الغازات والبيئة الدقيقة في العقدة (Sensor Array Payload):**
  * **مستشعر أول أكسيد الكربون الكهروكيميائي (CO Sensor):** قياس بتركيز أجزاء في المليون (ppm).
  * **مستشعر المركبات العضوية المتطايرة (Metal-Oxide VOC Sensor):** التقاط الغازات المنبعثة من التحلل الحراري للصمغ والأوراق قبل اشتعال اللهب المكشوف (Pyrolysis stage).
  * **مجس درجة الحرارة والرطوبة السطحي (Digital T/RH Probe):** رصد قفزات الحرارة اللحظية.
* **وسيط البيانات السحابي (IoT Gateway Broker):**
  * خادم **ChirpStack LoRaWAN Network Server** أو **MQTT Broker (Eclipse Mosquitto)** مؤمن بشهادات TLS 1.3.
  * وسيط الربط الداخلي لنظام AWIS (`services/iotLoRaBridge.ts`):
    * اشتراك في مواضيع MQTT: `awis/dz/wilaya/+/forest/+/node/+/telemetry`.
    * تدقيق القراءات وفحص شروط الإنذار في **الدقيقة الأولى** ($t < 60\text{ sec}$).

```
[ LoRa Node in Forest ] ──(868 MHz LoRa)──> [ Watchtower Gateway ]
                                                     │
                                               (4G/LTE or Satellite)
                                                     ▼
                                          [ ChirpStack Network Server ]
                                                     │
                                                (MQTT Event)
                                                     ▼
                                     [ AWIS IoT Ingestion Broker ]
                                                     │
                    ┌────────────────────────────────┴───────────────────────────────┐
                    ▼                                                                ▼
      [ Threshold Engine: ΔCO/Δt ]                                     [ Firestore & IndexedDB ]
      إذا زاد CO > 35ppm مع ارتفاع الحرارة                                 تحديث فوري لطبقة المجسات
      ──> إطلاق إنذار الحريق في الدقيقة الأولى!
```

### 3.2 نموذج البيانات الموحد (Unified Data Model)
```typescript
export interface IotForestNodeTelemetry {
  nodeId: string; // e.g. "LR-TEB-014" (Tébessa forest node 14)
  gatewayId: string;
  timestamp: string;
  batteryMillivolts: number;
  solarChargingCurrentMa: number;
  rssi: number; // مؤشر قوة الإشارة الراديوية
  snr: number;
  telemetry: {
    gasCoPpm: number; // تركيز غاز CO
    gasVocIndex: number; // مؤشر المركبات العضوية 0-500
    ambientTempC: number;
    ambientHumidityPercent: number;
    pyrolysisProbability: number; // احتمال التحلل الحراري الدخاني 0-100%
  };
  geoPosition: {
    lat: number;
    lng: number;
    altitudeMeters: number;
    forestCompartment: string; // الحوض الغابي
    wilaya: string;
  };
  alarmState: 'NOMINAL' | 'PRE_FIRE_PYROLYSIS' | 'ACTIVE_COMBUSTION';
}
```

### 3.3 خطة التنفيذ المرحلية (Phase-by-Phase Implementation)
1. **المرحلة 1: بناء وسيط الاتصال الداخلي ومولد المحاكاة (أسبوعين):**
   * إنشاء `src/services/iotMeshService.ts` وإضافة دعم إشارات `iot_sensor` في مكونات الإنذار المبكر، مع محاكاة قراءات 50 مجس غابي في الحظيرة الوطنية لجرجرة وقروش.
2. **المرحلة 2: إدماج وسيط بروتوكول MQTT في خادم Node.js (أسبوعين):**
   * إضافة مكتبة `mqtt` في الخادم `server.ts` لاستقبال نبضات العقد وتحويلها إلى أحداث إنذار فورية لغرفة القيادة.
3. **المرحلة 3: ربط عتبات التحلل الحراري بمصفوفة المخاطر والمحاكي (أسبوعين):**
   * عندما يرصد مجس LoRa ارتفاعاً مفاجئاً لغاز CO ومؤشر VOCs، يقوم AWIS بإنشاء حادثة نشطة بدقة نقطية فورية وتغذية محاكي اللهب D3 بقيم رطوبة الوقود الفعلية المقاسة محلياً بدلاً من القيم التقريبية.

---

## 🛸 المحور الرابع: الذكاء الاصطناعي للرؤية الحاسوبية على الدرونات (Edge AI Drone Vision)

### 4.1 البنية التحتية المقترحة (Infrastructure & Edge Video Processing)
* **بروتوكول واستقبال بث الفيديو التكتيكي (Tactical Video Streaming):**
  * بروتوكول البث فائق انخفاض زمن التأخير: **WebRTC / RTSP via WHEP (WebRTC HTTP Egress Protocol)** أو **SRT (Secure Reliable Transport)** المنقول عبر شبكات 5G التكتيكية أو وصلات الراديو بعيدة المدى (COFDM Datalink).
  * خادم وسائط متدفق خفيف: **MediaMTX / LiveKit** مدمج في بنية AWIS لمعالجة قنوات الفيديو المزدوجة (الكاميرا البصرية 4K والكاميرا الحرارية الإشعاعية Radiometric Thermal LWIR 640×512).
* **خوارزميات الرؤية الحاسوبية الطرفية (Edge AI Detection Engine):**
  * تشغيل نموذج مدرب مسبقاً ومخصص لحرائق الغابات: **YOLOv10-Fire / YOLOv8-Thermal Nano** معتمد على أجهزة الطرفية في محطة التحكم الأرضية للدرون (NVIDIA Jetson Orin Nano / Orin NX) بسرعة معالجة تتجاوز 45 إطاراً في الثانية (FPS).
  * مخرجات الكشف بالرؤية الحاسوبية:
    1. **صناديق التحديد (Bounding Boxes):** تصنيف `Flame_Core` (قلب اللهب)، `Smoke_Plume` (عمود الدخان)، `Smoldering_Embers` (الجمر المتطاير).
    2. **التقسيم الدلالي اللحظي (Instance Segmentation):** استخراج قناع المضلع الهندسي الحقيقي لقاعدة الحريق (Flame Base Mask) بدقة سنتيمترية.
    3. **القياس المساحي الموجه جغرافياً (Photogrammetric Georeferencing):** مطابقة كل بكسل لهب مع خطوط الطول والعرض والارتفاع الرقمي (DEM) عبر زوايا دوران الكاميرا (Gimbal Pitch, Roll, Yaw) ونظام الملاحة GNSS RTK للدرون.

```
[ Tactical Drone (Optical + LWIR Thermal) ]
                    │
                    ▼ (COFDM / WebRTC Low-Latency Stream)
[ Edge Computing Unit (NVIDIA Jetson Orin) ]
  • YOLOv10-Thermal Inference (45 FPS)
  • Flame Base Footprint Polygon Extraction
  • Byram Flame Height Laser / Optical Estimation
                    │
                    ▼ (JSON Telemetry Payload via WebSocket / SSE)
[ AWIS Backend / Ingestion Gateway ]
                    │
                    ▼
[ AWIS Web Frontend: D3 Flame Intensity Engine & GIS HUD ]
  • تحديث تلقائي لطول ألسنة اللهب في محاكي D3
  • تصحيح اتجاه جبهة النيران في الخريطة التكتيكية
```

### 4.2 نموذج البيانات الموحد (Unified Data Model)
```typescript
export interface DroneEdgeVisionTelemetry {
  droneCallsign: string; // e.g. "DRONE-ALGER-ALPHA-02"
  flightSessionId: string;
  timestamp: string;
  dronePosition: {
    lat: number;
    lng: number;
    altitudeAglMeters: number; // الارتفاع فوق سطح الأرض
    headingDeg: number;
    gimbalPitchDeg: number;
  };
  visionDetections: {
    fireFrontDetected: boolean;
    flameCentroidGeo: { lat: number; lng: number };
    flamePerimeterCoordinates: number[][]; // مضلع قاعدة اللهب الفعلي بالسنتيمتر
    measuredFlameHeightMeters: number; // طول ألسنة اللهب المقاس بالرؤية الحاسوبية
    peakRadiometricTempC: number; // أقصى درجة حرارة مسجلة بالعدسة الحرارية
    smokeVectorDirectionDeg: number; // اتجاه انتشار الدخان المقاس بصرياً
    smokeVelocityMps: number;
  };
  streamUrls: {
    thermalRtc: string;
    rgbRtc: string;
  };
  feedHealth: {
    fps: number;
    latencyMs: number;
    confidenceScorePercent: number;
  };
}
```

### 4.3 خطة التنفيذ المرحلية (Phase-by-Phase Implementation)
1. **المرحلة 1: بناء مشغل بث الفيديو التكتيكي ونافذة المراقبة الجوية (أسبوعين):**
   * إضافة واجهة تشغيل `DroneMissionHUD.tsx` في نظام AWIS تدعم استقبال بث WebRTC متزامن، مع رسم صناديق التحديد الافتراضية فوق البث.
2. **المرحلة 2: محول التغذية العكسية لمحاكي D3 (D3 Auto-Tuning Loop - أسبوعين):**
   * ربط المكون `FlameIntensityHeatmapBarGraph.tsx` ببيانات القياس الفعلية القادمة من الدرون: استبدال المتغير التقديري لطول اللهب `flameLengthM` وشدة خط الحريق `firelineIntensityKwM` بالقيم الحرارية المقاسة بالكاميرا، مما يجعل محاكي D3 أداة ذاتية المعايرة ديناميكياً (Self-Calibrating).
3. **المرحلة 3: المزامنة وتخزين إطارات الفيديو الاستخباراتية محلياً (أسبوعين):**
   * تخزين اللقطات الحرارية المفصلية ومضلعات اللهب في `IndexedDB` لحفظ السجل الجنائي والتقني للحادثة وتمكين المراجعة الميدانية للطيار دون اتصال بالإنترنت.

---

## 🧩 جدول مصفوفة تكامل النماذج مع قاعدة بيانات AWIS وأنظمة العرض

| المحور | معدل التحديث | الدقة المكانية | البروتوكول | أسلوب التخزين السحابي (Firestore) | أسلوب التخزين المحلي (IndexedDB Offline) | المكون المتأثر في واجهة AWIS |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **MTG / FCI** | كل 10 دقائق | ~1.5–2 كم | HTTP NetCDF4 / REST | مجموعة `mtg_hotspots` | مخزن `g01_cache_mtg_cadence` | خريطة `GISMap`، شريط التنبيهات اللحظي |
| **SAR Sentinel-1** | كل 2–4 أيام (أو عند الطلب) | 10–20 متراً | OData / GeoJSON | مجموعة `sar_perimeters` | مخزن `sar_burn_scars` | طبقة مضلعات الرادار `GISMap`، ومصفوفة المساحات المتفحمة |
| **IoT LoRaWAN** | فوري (ثوانٍ عند التغير) | 200–500 متر | MQTT / WebSockets | مجموعة `iot_forest_telemetry` | مخزن `iot_sensor_history` | مؤشرات جفاف الوقود، إطلاق أول إنذار تلقائي |
| **Edge AI Drones** | لحظي (30–45 FPS) | سنتيمترية (<10 سم) | WebRTC / RTSP | مجموعة `drone_missions` | مخزن `drone_tactical_snapshots` | محاكي ألسنة اللهب `FlameIntensityHeatmapBarGraph`، نافذة الدرون |

---

## 🛡️ استراتيجية الصمود دون اتصال (Offline-First Continuity Framework)

للحفاظ على الميزة المحورية التي يتميز بها نظام AWIS في العمليات الميدانية العسكرية والحماية المدنية في أعماق الغابات المنقطعة:
1. **المعالجة غير المتزامنة (Asynchronous Queuing):** يتم تسجيل أي قرارات توزيع أو ملاحظات يضعها القائد الميداني في طابور مهام محلي (`IndexedDB Action Queue`)، وتتم مزامنتها تلقائياً مع السحابة المركزية عند استعادة الاتصال.
2. **الاسترجاع التدريجي (Graceful Degradation):**
   * إذا انقطع اتصال الإنترنت: يستمر محاكي D3 ونظام الخرائط بالاعتماد على آخر دورة مسح لقمر MTG وبيانات عقد LoRaWAN المحلية المستلمة عبر شبكة Wi-Fi تكتيكية محلية (Ad-Hoc Tactical Mesh) دون أي عطل.
3. **تشفير البيانات التكتيكية:** تشفير قواعد بيانات المتصفح `awis_tactical_db` بمفتاح جلسة محلي لضمان سرية إحداثيات الوحدات والمسارات عند فقدان الأجهزة اللوحية الميدانية.

---

## 🏁 الخلاصة والتوصيات الاستراتيجية للمرحلة القادمة
هذه المعمارية تنقل نظام **AWIS** من مجرد منصة متابعة فضائية تقليدية ذات زمن استجابة متأخر (ساعات)، إلى **منظومة دفاع وطنية سيادية متعددة الطبقات (Multi-Tier Defense Ecosystem)**:
* **الدقيقة 0–1:** إشعار أولي عبر مجسات **LoRaWAN** الأرضية الغابية.
* **الدقيقة 10:** تأكيد إشعاعي واسع النطاق من قمر **MTG-FCI** الجيوستاتيكي.
* **الدقيقة 15–20:** توجيه واستطلاع دقيق فائق الدقة بسنتيمترات عبر طائرات الدرون التكتيكية **Edge AI**.
* **خلال العمليات:** اختراق السحب ورسم الحدود الدقيقة لاحتواء الحريق عبر رادارات **SAR**.
* **القيادة والتحكم:** محاكاة رياضية حية لشدة اللهب عبر محرك **D3 Flame Intensity** تضمن سلامة أطقم الحماية المدنية الجزائرية وإدارة الموارد بكفاءة استباقية مطلقة.
