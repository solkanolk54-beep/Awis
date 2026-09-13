import { WildfireIncident, GeoCoordinates, DetectionSignal, RiskLevel, SpreadIsochrone, ExposedAsset } from '../types';
import { FirmsDetection } from './firmsService';

export interface ActiveIncidentZone {
  id: string; // e.g. "AIZ-JIJEL-01"
  clusterCode: string; // e.g. "ZONE-JIJ-01"
  name: string;
  nameAr: string;
  wilaya: string;
  wilayaAr: string;
  centroid: GeoCoordinates;
  radiusKm: number;
  hotspots: FirmsDetection[];
  hotspotCount: number;
  totalFrpMw: number;
  maxFrpMw: number;
  avgBrightnessTempC: number;
  maxBrightnessTempC: number;
  dominantSatellite: string;
  satellites: string[];
  instruments: string[];
  confidenceLevel: 'nominal' | 'high' | 'critical';
  highestConfidencePercent: number;
  riskLevel: RiskLevel;
  firstDetectedTime: string;
  lastDetectedTime: string;
  isPromoted: boolean;
  promotedIncidentId?: string;
  hullCoordinates: GeoCoordinates[];
  areaHectares: number;
}

/**
 * Calculates Great-Circle geospatial distance between two coordinates in kilometers using Haversine formula.
 */
export function computeHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Computes a geometric convex hull for a set of 2D coordinates.
 * Falls back to an expanded circle/buffered polygon for clusters with 1 or 2 points.
 */
function computeSpatialEnclosure(
  points: GeoCoordinates[],
  centroid: GeoCoordinates,
  radiusKm: number
): GeoCoordinates[] {
  if (points.length === 0) return [];

  // Single hotspot: generate a buffered 8-vertex circle
  if (points.length === 1) {
    const latRadius = radiusKm / 111.0;
    const lngRadius = radiusKm / (111.0 * Math.cos((centroid.lat * Math.PI) / 180));
    const circlePts: GeoCoordinates[] = [];
    const numPoints = 12;
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * 2 * Math.PI;
      circlePts.push({
        lat: centroid.lat + Math.sin(angle) * latRadius,
        lng: centroid.lng + Math.cos(angle) * lngRadius
      });
    }
    return circlePts;
  }

  // 2 hotspots: create a pill/capsule corridor around them
  if (points.length === 2) {
    const p1 = points[0];
    const p2 = points[1];
    const bufferKm = Math.max(3.5, radiusKm * 0.4);
    const dLat = p2.lat - p1.lat;
    const dLng = p2.lng - p1.lng;
    const len = Math.hypot(dLat, dLng) || 0.001;
    const normLat = -dLng / len;
    const normLng = dLat / len;

    const latBuffer = bufferKm / 111.0;
    const lngBuffer = bufferKm / (111.0 * Math.cos((centroid.lat * Math.PI) / 180));

    return [
      { lat: p1.lat + normLat * latBuffer - (dLat / len) * latBuffer * 0.5, lng: p1.lng + normLng * lngBuffer - (dLng / len) * lngBuffer * 0.5 },
      { lat: p2.lat + normLat * latBuffer + (dLat / len) * latBuffer * 0.5, lng: p2.lng + normLng * lngBuffer + (dLng / len) * lngBuffer * 0.5 },
      { lat: p2.lat - normLat * latBuffer + (dLat / len) * latBuffer * 0.5, lng: p2.lng - normLng * lngBuffer + (dLng / len) * lngBuffer * 0.5 },
      { lat: p1.lat - normLat * latBuffer - (dLat / len) * latBuffer * 0.5, lng: p1.lng - normLng * lngBuffer - (dLng / len) * lngBuffer * 0.5 }
    ];
  }

  // Monotone chain 2D convex hull algorithm for 3+ points
  const sorted = [...points].sort((a, b) => (a.lng === b.lng ? a.lat - b.lat : a.lng - b.lng));

  const cross = (o: GeoCoordinates, a: GeoCoordinates, b: GeoCoordinates) =>
    (a.lng - o.lng) * (b.lat - o.lat) - (a.lat - o.lat) * (b.lng - o.lng);

  const lower: GeoCoordinates[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper: GeoCoordinates[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }

  lower.pop();
  upper.pop();
  const hull = lower.concat(upper);

  // Expand slightly from centroid by 15% for visual padding buffer
  return hull.map((pt) => ({
    lat: centroid.lat + (pt.lat - centroid.lat) * 1.25,
    lng: centroid.lng + (pt.lng - centroid.lng) * 1.25
  }));
}

/**
 * Spatial clustering algorithm that groups nearby FIRMS satellite anomalies into 'Active Incident Zones'.
 * Uses a distance graph connectivity model (threshold in km, default 24km) to correlate satellite detections.
 */
export function clusterFirmsHotspots(
  hotspots: FirmsDetection[],
  existingIncidents: WildfireIncident[] = [],
  thresholdKm: number = 24
): ActiveIncidentZone[] {
  if (!hotspots || hotspots.length === 0) {
    return [];
  }

  const n = hotspots.length;
  const visited = new Array<boolean>(n).fill(false);
  const clusters: FirmsDetection[][] = [];

  // Group connected components based on distance <= thresholdKm
  for (let i = 0; i < n; i++) {
    if (visited[i]) continue;

    const cluster: FirmsDetection[] = [];
    const queue: number[] = [i];
    visited[i] = true;

    while (queue.length > 0) {
      const currIdx = queue.shift()!;
      const curr = hotspots[currIdx];
      cluster.push(curr);

      for (let j = 0; j < n; j++) {
        if (!visited[j]) {
          const dist = computeHaversineDistanceKm(
            curr.latitude,
            curr.longitude,
            hotspots[j].latitude,
            hotspots[j].longitude
          );
          if (dist <= thresholdKm) {
            visited[j] = true;
            queue.push(j);
          }
        }
      }
    }
    clusters.push(cluster);
  }

  // Sort clusters by threat (descending by total FRP)
  return clusters
    .map((memberHotspots, idx) => {
      const count = memberHotspots.length;

      // Centroid
      const sumLat = memberHotspots.reduce((acc, h) => acc + h.latitude, 0);
      const sumLng = memberHotspots.reduce((acc, h) => acc + h.longitude, 0);
      const centroid: GeoCoordinates = {
        lat: Number((sumLat / count).toFixed(4)),
        lng: Number((sumLng / count).toFixed(4))
      };

      // Radius in KM (max distance to any member + minimum 3km margin)
      let maxDist = 3.2;
      memberHotspots.forEach((h) => {
        const d = computeHaversineDistanceKm(centroid.lat, centroid.lng, h.latitude, h.longitude);
        if (d > maxDist) maxDist = d;
      });
      const radiusKm = Number((maxDist + 2.0).toFixed(1));

      // Aggregate FRP
      const totalFrpMw = Math.round(memberHotspots.reduce((acc, h) => acc + (h.frpMw || 20), 0) * 10) / 10;
      const maxFrpMw = Math.round(Math.max(...memberHotspots.map((h) => h.frpMw || 20)) * 10) / 10;

      // Temperatures in Celsius
      const tempsC = memberHotspots.map((h) => Math.round(h.brightnessTempKelvin - 273.15));
      const avgBrightnessTempC = Math.round(tempsC.reduce((a, b) => a + b, 0) / count);
      const maxBrightnessTempC = Math.max(...tempsC);

      // Satellites & Instruments
      const satSet = new Set<string>();
      const instSet = new Set<string>();
      memberHotspots.forEach((h) => {
        satSet.add(h.satellite.replace('VIIRS_', '').replace('MODIS_', ''));
        instSet.add(h.instrument);
      });
      const satellites = Array.from(satSet);
      const instruments = Array.from(instSet);
      const dominantSatellite = satellites.join(' & ');

      // Dominant Wilaya & Names
      const primaryHotspot = memberHotspots.reduce((prev, curr) =>
        (curr.frpMw || 0) > (prev.frpMw || 0) ? curr : prev
      );
      const wilaya = primaryHotspot.wilaya;
      const wilayaAr = primaryHotspot.wilayaAr;

      const wilayaSlug = wilaya.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'DZ';
      const clusterCode = `AIZ-${wilayaSlug}-${String(idx + 1).padStart(2, '0')}`;
      const id = `ZONE-${clusterCode}`;

      // Name & Localization
      const name = count > 1 
        ? `${primaryHotspot.locationName} (${count} Hotspots Cluster)`
        : `${primaryHotspot.locationName} (Thermal Anomaly)`;
      const nameAr = count > 1 
        ? `${primaryHotspot.locationNameAr} (تجمع ${count} بؤر حرارية)`
        : `${primaryHotspot.locationNameAr} (شذوذ حراري فضائي)`;

      // Confidence & Risk
      const highestConfidencePercent = Math.max(...memberHotspots.map((h) => h.confidencePercent));
      const confidenceLevel: 'nominal' | 'high' | 'critical' =
        highestConfidencePercent >= 90 ? 'critical' : highestConfidencePercent >= 75 ? 'high' : 'nominal';

      let riskLevel: RiskLevel = 'moderate';
      if (totalFrpMw >= 450 || (count >= 3 && totalFrpMw >= 250)) {
        riskLevel = 'critical';
      } else if (totalFrpMw >= 220 || count >= 2) {
        riskLevel = 'extreme';
      } else if (totalFrpMw >= 100) {
        riskLevel = 'high';
      }

      // Detection Timestamps
      const sortedTimes = memberHotspots
        .map((h) => h.acqTime)
        .sort();
      const firstDetectedTime = sortedTimes[0] || '10:00 UTC';
      const lastDetectedTime = sortedTimes[sortedTimes.length - 1] || '12:00 UTC';

      // Spatial Enclosure polygon
      const points = memberHotspots.map((h) => ({ lat: h.latitude, lng: h.longitude }));
      const hullCoordinates = computeSpatialEnclosure(points, centroid, radiusKm);

      // Estimated Area Hectares based on circular radius or polygon extent
      const areaHectares = Math.round(Math.PI * Math.pow(radiusKm, 2) * 100 * 0.35);

      // Check promotion status against existing incidents
      const promotedIncident = existingIncidents.find((inc) => {
        // Direct ID match from promotion
        if (inc.id === `DZ-WF-CLUS-${id}` || inc.id.includes(clusterCode)) return true;
        // Proximity match: within 12km and has satellite signals
        const dist = computeHaversineDistanceKm(centroid.lat, centroid.lng, inc.coordinates.lat, inc.coordinates.lng);
        return dist <= 10 && (inc.status === 'confirmed' || inc.status === 'active_response');
      });

      return {
        id,
        clusterCode,
        name,
        nameAr,
        wilaya,
        wilayaAr,
        centroid,
        radiusKm,
        hotspots: memberHotspots,
        hotspotCount: count,
        totalFrpMw,
        maxFrpMw,
        avgBrightnessTempC,
        maxBrightnessTempC,
        dominantSatellite,
        satellites,
        instruments,
        confidenceLevel,
        highestConfidencePercent,
        riskLevel,
        firstDetectedTime,
        lastDetectedTime,
        isPromoted: Boolean(promotedIncident),
        promotedIncidentId: promotedIncident?.id,
        hullCoordinates,
        areaHectares
      };
    })
    .sort((a, b) => b.totalFrpMw - a.totalFrpMw);
}

/**
 * Promotes an ActiveIncidentZone into a formal monitored WildfireIncident in the national command post registry.
 */
export function promoteClusterToIncident(cluster: ActiveIncidentZone): WildfireIncident {
  const incidentId = `DZ-WF-CLUS-${cluster.id}`;
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Convert each constituent satellite anomaly into a DetectionSignal
  const detectionSources: DetectionSignal[] = cluster.hotspots.map((hotspot) => ({
    id: `SIG-SAT-${hotspot.id}`,
    source: 'satellite_firms',
    sourceName: `NASA FIRMS (${hotspot.instrument} on ${hotspot.satellite.replace('_', ' ')})`,
    timestamp: hotspot.acqTime,
    confidence: hotspot.confidencePercent,
    location: { lat: hotspot.latitude, lng: hotspot.longitude },
    details: `Satellite Thermal Anomaly: FRP ${hotspot.frpMw} MW, Temp ${Math.round(hotspot.brightnessTempKelvin - 273.15)}°C, Scan ${hotspot.scanMeters}m`,
    sensorMetadata: {
      thermalAnomalyMw: hotspot.frpMw,
      temperatureReading: Math.round(hotspot.brightnessTempKelvin - 273.15),
      device: `${hotspot.satellite} ${hotspot.instrument}`
    }
  }));

  // Initial isochrones based on cluster centroid
  const spreadPredictions: SpreadIsochrone[] = [
    {
      timeHorizonMinutes: 30,
      areaHectares: Math.round(cluster.areaHectares * 0.4),
      probability: 92,
      frontSpeedKmH: 2.1,
      perimeterPoints: [
        { lat: cluster.centroid.lat + 0.015, lng: cluster.centroid.lng + 0.012 },
        { lat: cluster.centroid.lat + 0.012, lng: cluster.centroid.lng + 0.024 },
        { lat: cluster.centroid.lat - 0.008, lng: cluster.centroid.lng + 0.018 },
        { lat: cluster.centroid.lat - 0.012, lng: cluster.centroid.lng - 0.005 },
        { lat: cluster.centroid.lat + 0.005, lng: cluster.centroid.lng - 0.012 }
      ]
    },
    {
      timeHorizonMinutes: 60,
      areaHectares: Math.round(cluster.areaHectares * 0.85),
      probability: 80,
      frontSpeedKmH: 2.8,
      perimeterPoints: [
        { lat: cluster.centroid.lat + 0.030, lng: cluster.centroid.lng + 0.025 },
        { lat: cluster.centroid.lat + 0.022, lng: cluster.centroid.lng + 0.045 },
        { lat: cluster.centroid.lat - 0.015, lng: cluster.centroid.lng + 0.032 },
        { lat: cluster.centroid.lat - 0.022, lng: cluster.centroid.lng - 0.012 },
        { lat: cluster.centroid.lat + 0.012, lng: cluster.centroid.lng - 0.022 }
      ]
    }
  ];

  // Exposed assets sample based on wilaya
  const exposedAssets: ExposedAsset[] = [
    {
      id: `asset-${cluster.id}-1`,
      name: `${cluster.wilaya} Rural Forest Hamlet`,
      nameAr: `قرية ريفية محاذية لغابات ${cluster.wilayaAr}`,
      type: 'village',
      population: 480,
      distanceKm: Number((cluster.radiusKm * 0.8).toFixed(1)),
      estimatedWindowMinutes: '45-60 min',
      evacuationStatus: 'advisory',
      urgency: 'critical'
    },
    {
      id: `asset-${cluster.id}-2`,
      name: `Regional Forestry Road CW-14`,
      nameAr: `الطريق الولائي الغابي CW-14`,
      type: 'road',
      distanceKm: Number((cluster.radiusKm * 0.5).toFixed(1)),
      estimatedWindowMinutes: '20 min',
      evacuationStatus: 'mandatory',
      urgency: 'critical'
    }
  ];

  return {
    id: incidentId,
    code: `INCIDENT #${cluster.clusterCode}`,
    title: `[Active Zone] ${cluster.wilaya} - ${cluster.name}`,
    titleAr: `[منطقة عملياتية مراقبة] ${cluster.wilayaAr} - ${cluster.nameAr}`,
    wilaya: cluster.wilaya,
    wilayaAr: cluster.wilayaAr,
    locationName: cluster.name,
    locationNameAr: cluster.nameAr,
    coordinates: cluster.centroid,
    status: 'confirmed', // Formally promoted into monitored active incident
    riskLevel: cluster.riskLevel,
    confidenceScore: cluster.highestConfidencePercent,
    detectionSources,
    detectionTime: `${cluster.firstDetectedTime} - ${cluster.lastDetectedTime} (Satellite Cluster)`,
    confirmationTime: timeStr,
    estimatedBurnedHectares: Math.max(14, Math.round(cluster.totalFrpMw * 0.048 * 10) / 10),
    windSpeedKmH: 34,
    windDirectionDegrees: 55,
    windDirectionCardinal: 'NE',
    temperatureC: cluster.maxBrightnessTempC,
    humidityPercent: 19,
    terrainSlopeDegrees: 24,
    spreadPredictions,
    exposedAssets,
    assignedResources: [],
    timeline: [
      {
        id: `tl-${cluster.id}-1`,
        timestamp: cluster.firstDetectedTime,
        type: 'detection',
        title: `Spatial Clustering Correlated ${cluster.hotspotCount} NASA FIRMS Thermal Anomalies`,
        description: `Correlated ${cluster.hotspotCount} satellite hotspots within ${cluster.radiusKm}km radius. Combined FRP: ${cluster.totalFrpMw} MW. Satellites: ${cluster.dominantSatellite}.`,
        sourceBadge: 'Spatial Clustering Engine'
      },
      {
        id: `tl-${cluster.id}-2`,
        timestamp: timeStr,
        type: 'verification',
        title: 'Cluster Promoted to Formal Monitored Incident by Command Post',
        description: `Duty commander promoted spatial cluster '${cluster.clusterCode}' into the national active wildfire incident registry for coordinated response and monitoring.`,
        sourceBadge: 'National Command Center'
      }
    ],
    expertValidation: {
      verified: true,
      expertName: 'National Command Post (Satellite Cluster Promotion)',
      decision: 'confirmed',
      notes: `Correlated from ${cluster.hotspotCount} satellite thermal detections (${cluster.instruments.join(', ')}). Total Fire Radiative Power: ${cluster.totalFrpMw} MW.`,
      timestamp: timeStr
    }
  };
}
