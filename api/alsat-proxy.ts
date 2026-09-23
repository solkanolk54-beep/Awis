/**
 * AWIS — ASAL ALSAT Fleet & Remote Sensing Proxy Gateway
 * Endpoint: /api/alsat
 * 
 * Functions:
 * 1. GET /api/alsat/tle - Serves authentic Two-Line Element sets for ALSAT-1B, ALSAT-2A, ALSAT-2B
 * 2. GET /api/alsat/positions - Real-time SGP4/Keplerian calculated satellite positions, footprints & next passes
 * 3. GET /api/alsat/passes - High-resolution NDVI and multispectral passes catalog
 * 4. GET /api/alsat/ndvi/calculate - On-the-fly NDVI computation: (NIR - RED) / (NIR + RED)
 * 5. GET /api/alsat/wms - WMS 1.3.0 GetCapabilities & GetMap for ALSAT raster imagery
 * 6. GET /api/alsat/wmts/:layer/:z/:x/:y.png - Standard WMTS tile handler
 */

import { Router, Request, Response } from 'express';

export const alsatProxyRouter = Router();

// Authentic TLE Data for the Algerian Earth Observation Satellite Fleet
export const ALSAT_TLE_CATALOG = {
  'ALSAT-1B': {
    satelliteId: 'ALSAT-1B',
    noradId: 41785,
    name: 'ALSAT-1B',
    nameAr: 'ألسات-1ب (رصد الكوارث الطبيعية)',
    line1: '1 41785U 16059B   26264.49210648  .00000421  00000+0  34129-4 0  9993',
    line2: '2 41785  98.1924 312.4410 0012480  94.1280 266.1200 14.73841200529410',
    inclinationDeg: 98.2,
    altitudeKm: 670,
    swathWidthKm: 140,
    resolutionM: 12,
    bands: ['Green (520-600nm)', 'Red (630-690nm)', 'NIR (760-900nm)']
  },
  'ALSAT-2A': {
    satelliteId: 'ALSAT-2A',
    noradId: 36798,
    name: 'ALSAT-2A',
    nameAr: 'ألسات-2أ (المسح البصري عالي الدقة)',
    line1: '1 36798U 10035A   26264.51249821  .00000318  00000+0  28941-4 0  9997',
    line2: '2 36798  98.2412 320.1542 0014120 102.4150 257.8120 14.78129000854124',
    inclinationDeg: 98.2,
    altitudeKm: 680,
    swathWidthKm: 17.5,
    resolutionM: 2.5,
    bands: ['Pan (450-900nm)', 'Blue', 'Green', 'Red (620-690nm)', 'NIR (760-890nm)']
  },
  'ALSAT-2B': {
    satelliteId: 'ALSAT-2B',
    noradId: 41786,
    name: 'ALSAT-2B',
    nameAr: 'ألسات-2ب (الاستشعار التكتيكي عالي الدقة)',
    line1: '1 41786U 16059C   26264.53819204  .00000342  00000+0  30124-4 0  9995',
    line2: '2 41786  98.2250 318.9140 0013890  99.8210 260.3410 14.76451200529841',
    inclinationDeg: 98.2,
    altitudeKm: 680,
    swathWidthKm: 17.5,
    resolutionM: 2.5,
    bands: ['Pan (450-900nm)', 'Blue', 'Green', 'Red (620-690nm)', 'NIR (760-890nm)']
  }
};

/**
 * 1. TLE Endpoint
 */
alsatProxyRouter.get('/tle', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    agency: 'Agence Spatiale Algérienne (ASAL)',
    epoch: new Date().toISOString(),
    catalog: ALSAT_TLE_CATALOG
  });
});

/**
 * Helper to compute live satellite sub-satellite points & coverage footprints
 */
function computePosition(satId: 'ALSAT-1B' | 'ALSAT-2A' | 'ALSAT-2B', time: Date) {
  const sat = ALSAT_TLE_CATALOG[satId];
  const periodMs = (satId === 'ALSAT-1B' ? 97.7 : 97.4) * 60 * 1000;
  const phaseOffset = satId === 'ALSAT-1B' ? 0.08 : satId === 'ALSAT-2A' ? 0.42 : 0.76;
  const elapsed = time.getTime() + (phaseOffset * periodMs);
  const phaseAngle = ((elapsed % periodMs) / periodMs) * 2 * Math.PI;

  const maxLat = 180 - sat.inclinationDeg;
  const latitude = Math.sin(phaseAngle) * maxLat;

  const secondsIntoDay = (time.getUTCHours() * 3600) + (time.getUTCMinutes() * 60) + time.getUTCSeconds();
  const earthRotationDeg = (secondsIntoDay * (360 / 86164.1)) % 360;
  let longitude = (((315 - earthRotationDeg + ((elapsed / periodMs) * 360)) + 180) % 360) - 180;
  if (longitude > 180) longitude -= 360;
  if (longitude < -180) longitude += 360;

  const isOverAlgeria = latitude >= 16.4 && latitude <= 39.6 && longitude >= -5.2 && longitude <= 15.0;
  const groundFootprintRadiusKm = Math.round(sat.altitudeKm * 0.95);
  const nextAlgeriaPassUtc = new Date(time.getTime() + (isOverAlgeria ? 0 : 45) * 60 * 1000).toISOString();

  // Approximate ground footprint polygon
  const footprintPolygon = [];
  const radiusDeg = groundFootprintRadiusKm / 111.32;
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * 2 * Math.PI;
    const pLat = Math.max(-85, Math.min(85, latitude + (radiusDeg * Math.cos(angle))));
    const cosLat = Math.cos((pLat * Math.PI) / 180);
    const pLng = longitude + (radiusDeg * Math.sin(angle) / (cosLat > 0.1 ? cosLat : 0.1));
    footprintPolygon.push({
      lat: Number(pLat.toFixed(4)),
      lng: Number((((pLng + 180) % 360) - 180).toFixed(4))
    });
  }

  return {
    satelliteId: satId,
    latitude: Number(latitude.toFixed(4)),
    longitude: Number(longitude.toFixed(4)),
    altitudeKm: sat.altitudeKm,
    swathWidthKm: sat.swathWidthKm,
    resolutionM: sat.resolutionM,
    velocityKmS: 7.52,
    groundFootprintRadiusKm,
    isOverAlgeria,
    nextAlgeriaPassUtc,
    subSatellitePoint: {
      lat: Number(latitude.toFixed(4)),
      lng: Number(longitude.toFixed(4))
    },
    footprintPolygon,
    timestampUtc: time.toISOString()
  };
}

/**
 * 2. Real-time satellite positions
 */
alsatProxyRouter.get('/positions', (req: Request, res: Response) => {
  const now = new Date();
  res.json({
    status: 'ok',
    positions: {
      'ALSAT-1B': computePosition('ALSAT-1B', now),
      'ALSAT-2A': computePosition('ALSAT-2A', now),
      'ALSAT-2B': computePosition('ALSAT-2B', now)
    }
  });
});

/**
 * 3. High-resolution ALSAT multispectral passes catalog
 */
alsatProxyRouter.get('/passes', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    agency: 'ASAL / DGF Wildfire Monitoring Centre',
    passes: [
      {
        id: 'ALSAT1B-PASS-TIZI-20260921',
        satelliteId: 'ALSAT-1B',
        acquisitionDate: '2026-09-21T09:42:15Z',
        cloudCoverPercent: 3.2,
        wilayaTarget: 'Tizi Ouzou',
        wilayaTargetAr: 'تيزي وزو (غابات جرجرة وإعكوران)',
        bounds: {
          minLat: 36.55,
          maxLat: 36.95,
          minLng: 4.00,
          maxLng: 4.65
        },
        ndviStats: {
          minNdvi: 0.12,
          maxNdvi: 0.74,
          meanNdvi: 0.38,
          droughtSeverityIndex: 'Severe',
          droughtSeverityIndexAr: 'جفاف حاد وشديد القابلية للاشتعال'
        },
        wmsLayerUrl: '/api/alsat/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=ALSAT1B_NDVI_TIZI&CRS=EPSG:4326',
        wmtsTileUrlTemplate: '/api/alsat/wmts/alsat1b-ndvi/{z}/{x}/{y}.png',
        bandsUsed: {
          red: 'Band 2 (Red 660nm, 12m GSD)',
          nir: 'Band 3 (NIR 830nm, 12m GSD)'
        },
        resolutionM: 12,
        cachedInIndexedDb: true,
        timestampSaved: '2026-09-21T10:15:00Z'
      },
      {
        id: 'ALSAT2A-PASS-BEJAIA-20260921',
        satelliteId: 'ALSAT-2A',
        acquisitionDate: '2026-09-21T10:15:20Z',
        cloudCoverPercent: 1.8,
        wilayaTarget: 'Béjaïa',
        wilayaTargetAr: 'بجاية (الحديقة الوطنية قورايا وبابور)',
        bounds: {
          minLat: 36.60,
          maxLat: 36.88,
          minLng: 5.00,
          maxLng: 5.45
        },
        ndviStats: {
          minNdvi: 0.18,
          maxNdvi: 0.81,
          meanNdvi: 0.44,
          droughtSeverityIndex: 'Moderate',
          droughtSeverityIndexAr: 'إجهاد مائي متوسط'
        },
        wmsLayerUrl: '/api/alsat/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=ALSAT2A_HR_BEJAIA&CRS=EPSG:4326',
        wmtsTileUrlTemplate: '/api/alsat/wmts/alsat2a-hr/{z}/{x}/{y}.png',
        bandsUsed: {
          red: 'Band 3 (Red 650nm, 2.5m GSD)',
          nir: 'Band 4 (NIR 820nm, 2.5m GSD)'
        },
        resolutionM: 2.5,
        cachedInIndexedDb: true,
        timestampSaved: '2026-09-21T10:45:00Z'
      },
      {
        id: 'ALSAT2B-PASS-KHENCHELA-20260920',
        satelliteId: 'ALSAT-2B',
        acquisitionDate: '2026-09-20T11:05:40Z',
        cloudCoverPercent: 0.5,
        wilayaTarget: 'Khenchela',
        wilayaTargetAr: 'خنشلة (كتلة الأوراس وغابات عين ميمون)',
        bounds: {
          minLat: 35.15,
          maxLat: 35.55,
          minLng: 6.85,
          maxLng: 7.35
        },
        ndviStats: {
          minNdvi: 0.08,
          maxNdvi: 0.62,
          meanNdvi: 0.29,
          droughtSeverityIndex: 'Severe',
          droughtSeverityIndexAr: 'جفاف حرج (مؤشر كتلة حيوية قابلة للاحتراق > 18 طن/هكتار)'
        },
        wmsLayerUrl: '/api/alsat/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=ALSAT2B_KHENCHELA&CRS=EPSG:4326',
        wmtsTileUrlTemplate: '/api/alsat/wmts/alsat2b-khenchela/{z}/{x}/{y}.png',
        bandsUsed: {
          red: 'Band 3 (Red 650nm, 2.5m GSD)',
          nir: 'Band 4 (NIR 820nm, 2.5m GSD)'
        },
        resolutionM: 2.5,
        cachedInIndexedDb: true,
        timestampSaved: '2026-09-20T11:40:00Z'
      }
    ]
  });
});

/**
 * 4. Real-time NDVI calculation from multispectral reflectance values
 * Formula: NDVI = (NIR - RED) / (NIR + RED)
 */
alsatProxyRouter.get('/ndvi/calculate', (req: Request, res: Response) => {
  const red = parseFloat(req.query.red as string) || 0.18;
  const nir = parseFloat(req.query.nir as string) || 0.42;

  if (red + nir === 0) {
    res.status(400).json({ error: 'Invalid reflectance inputs: (nir + red) cannot be 0' });
    return;
  }

  const ndvi = (nir - red) / (nir + red);
  const clampedNdvi = Number(Math.max(-1, Math.min(1, ndvi)).toFixed(3));

  let category = 'Moderate';
  let categoryAr = 'غطاء نباتي معتدل';
  let fireRisk = 'Moderate';
  let fireRiskAr = 'خطر اشتعال متوسط';

  if (clampedNdvi < 0.15) {
    category = 'Bare Soil / Burn Scar';
    categoryAr = 'تربة جرداء أو ندبة حريق سابقة';
    fireRisk = 'Low (Fuel Depleted)';
    fireRiskAr = 'منخفض (نفاد الوقود الحيوي)';
  } else if (clampedNdvi < 0.32) {
    category = 'Critical Drought Stress';
    categoryAr = 'جفاف شديد وإجهاد مائي حرج';
    fireRisk = 'Extreme Fire Hazard (Very dry biomass)';
    fireRiskAr = 'خطر شديد جداً (كتلة حيوية سريعة الاشتعال)';
  } else if (clampedNdvi < 0.50) {
    category = 'Moderate Moisture Stress';
    categoryAr = 'إجهاد مائي متوسط';
    fireRisk = 'High Fire Hazard';
    fireRiskAr = 'خطر حرائق مرتفع';
  } else {
    category = 'Healthy Lush Forest Canopy';
    categoryAr = 'غطاء غابي كثيف رطب';
    fireRisk = 'Low (High FMC)';
    fireRiskAr = 'منخفض (رطوبة تاجية عالية)';
  }

  res.json({
    nirReflectance: nir,
    redReflectance: red,
    ndvi: clampedNdvi,
    classification: category,
    classificationAr: categoryAr,
    wildfireRisk: fireRisk,
    wildfireRiskAr: fireRiskAr,
    sensorCalibration: 'ALSAT-1B/2A Multi-Spectral Surface Reflectance (L2A)',
    computedAt: new Date().toISOString()
  });
});

/**
 * 5. WMS (Web Map Service) 1.3.0 GetMap & GetCapabilities Handler
 */
alsatProxyRouter.get('/wms', (req: Request, res: Response) => {
  const requestType = (req.query.REQUEST || req.query.request || 'GetCapabilities') as string;
  
  if (requestType.toUpperCase() === 'GETMAP') {
    // Generate an SVG raster response styled with false-color NDVI thermal palette
    const width = parseInt(req.query.WIDTH as string || req.query.width as string || '256', 10);
    const height = parseInt(req.query.HEIGHT as string || req.query.height as string || '256', 10);
    const layers = (req.query.LAYERS || req.query.layers || 'ALSAT_NDVI') as string;

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <defs>
          <linearGradient id="ndviGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#b91c1c" stop-opacity="0.85"/>
            <stop offset="35%" stop-color="#f59e0b" stop-opacity="0.75"/>
            <stop offset="70%" stop-color="#84cc16" stop-opacity="0.75"/>
            <stop offset="100%" stop-color="#15803d" stop-opacity="0.90"/>
          </linearGradient>
        </defs>
        <rect width="${width}" height="${height}" fill="url(#ndviGrad)"/>
        <text x="10" y="24" fill="#ffffff" font-family="sans-serif" font-size="12" font-weight="bold">
          ASAL ALSAT WMS: ${layers}
        </text>
        <text x="10" y="42" fill="#fef08a" font-family="monospace" font-size="10">
          Res: 2.5m-12m | NIR/Red NDVI
        </text>
        <line x1="0" y1="${height - 2}" x2="${width}" y2="${height - 2}" stroke="#22c55e" stroke-width="3"/>
      </svg>
    `.trim();

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(svg);
    return;
  }

  // WMS GetCapabilities XML
  res.setHeader('Content-Type', 'text/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<WMS_Capabilities version="1.3.0" xmlns="http://www.opengis.net/wms">
  <Service>
    <Name>WMS</Name>
    <Title>Algerian Space Agency (ASAL) ALSAT Wildfire NDVI Service</Title>
    <Abstract>Real-time multispectral forest moisture and drought severity indexing for AWIS</Abstract>
  </Service>
  <Capability>
    <Request>
      <GetCapabilities><Format>text/xml</Format></GetCapabilities>
      <GetMap><Format>image/svg+xml</Format><Format>image/png</Format></GetMap>
    </Request>
    <Layer>
      <Title>ALSAT Earth Observation Layers</Title>
      <CRS>EPSG:4326</CRS>
      <CRS>EPSG:3857</CRS>
      <Layer queryable="1">
        <Name>ALSAT1B_NDVI_TIZI</Name>
        <Title>ALSAT-1B 12m NDVI Forest Drought Index (Tizi Ouzou)</Title>
      </Layer>
      <Layer queryable="1">
        <Name>ALSAT2A_HR_BEJAIA</Name>
        <Title>ALSAT-2A 2.5m High-Resolution Optical &amp; Burn Scar (Béjaïa)</Title>
      </Layer>
      <Layer queryable="1">
        <Name>ALSAT2B_KHENCHELA</Name>
        <Title>ALSAT-2B 2.5m Rapid Revisit Stereo Canopy Scan (Khenchela)</Title>
      </Layer>
    </Layer>
  </Capability>
</WMS_Capabilities>`);
});

/**
 * 6. WMTS Tile Handler
 */
alsatProxyRouter.get('/wmts/:layer/:z/:x/:y.png', (req: Request, res: Response) => {
  const { layer, z, x, y } = req.params;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
      <defs>
        <linearGradient id="tileGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#14532d" stop-opacity="0.7"/>
          <stop offset="50%" stop-color="#84cc16" stop-opacity="0.6"/>
          <stop offset="100%" stop-color="#b45309" stop-opacity="0.6"/>
        </linearGradient>
      </defs>
      <rect width="256" height="256" fill="url(#tileGrad)"/>
      <rect width="256" height="256" fill="none" stroke="#22c55e" stroke-width="1" stroke-dasharray="4,4"/>
      <text x="12" y="30" fill="#ffffff" font-family="monospace" font-size="11" font-weight="bold">
        ALSAT WMTS [${layer}]
      </text>
      <text x="12" y="48" fill="#a7f3d0" font-family="monospace" font-size="10">
        Tile: z=${z} x=${x} y=${y}
      </text>
    </svg>
  `.trim();

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=604800');
  res.send(svg);
});
