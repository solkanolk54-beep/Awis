// AWIS — Algerian Space Agency (ASAL) ALSAT Fleet Map Overlay
// Renders real-time positions, orbital paths, imaging swaths, and multi-spectral NDVI passes for ALSAT-1B, ALSAT-2A, and ALSAT-2B

import React from 'react';
import { Satellite, Radio, Layers, Eye, HardDrive, ShieldCheck, Zap } from 'lucide-react';
import { 
  AlsatSatelliteId, 
  AlsatRealtimePosition, 
  AlsatOrbitalTrack, 
  AlsatNdviPassData, 
  Language, 
  GeoCoordinates 
} from '../../types';

interface AlsatFleetOverlayProps {
  positions: Record<AlsatSatelliteId, AlsatRealtimePosition>;
  tracks: Record<AlsatSatelliteId, AlsatOrbitalTrack>;
  passes: AlsatNdviPassData[];
  selectedSatelliteId?: AlsatSatelliteId | 'ALL';
  selectedSatellite?: AlsatSatelliteId | 'ALL';
  selectedPassId: string | null;
  onSelectPass: (pass: AlsatNdviPassData | null) => void;
  onSelectSatellite: (id: AlsatSatelliteId) => void;
  showOrbitalTracks?: boolean;
  showTracks?: boolean;
  showSwathCorridors?: boolean;
  showSwaths?: boolean;
  showNdviFootprints?: boolean;
  showFootprints?: boolean;
  geoToSvg: (lat: number, lng: number) => { x: number; y: number };
  currentLang: Language;
}

const SATELLITE_THEMES: Record<AlsatSatelliteId, { stroke: string; fill: string; badge: string; glow: string }> = {
  'ALSAT-1B': {
    stroke: '#10b981', // Emerald for disaster & vegetation
    fill: 'rgba(16, 185, 129, 0.25)',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    glow: 'rgba(16, 185, 129, 0.6)'
  },
  'ALSAT-2A': {
    stroke: '#06b6d4', // Cyan high-res
    fill: 'rgba(6, 182, 212, 0.25)',
    badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    glow: 'rgba(6, 182, 212, 0.6)'
  },
  'ALSAT-2B': {
    stroke: '#8b5cf6', // Violet tactical
    fill: 'rgba(139, 92, 246, 0.25)',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    glow: 'rgba(139, 92, 246, 0.6)'
  }
};

export const AlsatFleetOverlay: React.FC<AlsatFleetOverlayProps> = ({
  positions,
  tracks,
  passes,
  selectedSatelliteId: satIdProp,
  selectedSatellite: satProp,
  selectedPassId,
  onSelectPass,
  onSelectSatellite,
  showOrbitalTracks: tracksProp,
  showTracks,
  showSwathCorridors: swathsProp,
  showSwaths,
  showNdviFootprints: footprintsProp,
  showFootprints,
  geoToSvg,
  currentLang
}) => {
  const isAr = currentLang === 'ar';
  const satellites: AlsatSatelliteId[] = ['ALSAT-1B', 'ALSAT-2A', 'ALSAT-2B'];
  const selectedSatelliteId = satIdProp ?? satProp ?? 'ALL';
  const showOrbitalTracks = tracksProp ?? showTracks ?? true;
  const showSwathCorridors = swathsProp ?? showSwaths ?? true;
  const showNdviFootprints = footprintsProp ?? showFootprints ?? true;

  // Helper to build SVG polyline path from coordinate array
  const buildSvgPath = (coords: GeoCoordinates[]): string => {
    if (!coords || !Array.isArray(coords) || coords.length === 0) return '';
    return coords
      .filter((c) => c && typeof c.lat === 'number' && typeof c.lng === 'number' && !isNaN(c.lat) && !isNaN(c.lng))
      .map((c, idx) => {
        const pt = geoToSvg(c.lat, c.lng);
        return `${idx === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
      })
      .join(' ');
  };

  // Helper to build closed polygon for swath corridor
  const buildSvgPolygon = (coords: GeoCoordinates[]): string => {
    if (!coords || coords.length === 0) return '';
    const d = buildSvgPath(coords);
    return `${d} Z`;
  };

  return (
    <g id="layer-alsat-fleet-integration" className="alsat-fleet-layer">
      {/* 1. SWATH CORRIDORS (Imaging Swaths) */}
      {showSwathCorridors && (
        <g id="alsat-swath-corridors" opacity={0.65}>
          {satellites.map((satId) => {
            if (selectedSatelliteId !== 'ALL' && selectedSatelliteId !== satId) return null;
            const track = tracks[satId];
            if (!track || !track.swathCorridor) return null;
            const theme = SATELLITE_THEMES[satId];
            const d = buildSvgPolygon(track.swathCorridor);

            return (
              <g key={`swath-${satId}`}>
                <path
                  d={d}
                  fill={theme.fill}
                  stroke={theme.stroke}
                  strokeWidth="0.8"
                  strokeDasharray="4 4"
                  opacity={0.7}
                />
              </g>
            );
          })}
        </g>
      )}

      {/* 2. ORBITAL TRACKS (Ground Track Polyline) */}
      {showOrbitalTracks && (
        <g id="alsat-orbital-tracks">
          {satellites.map((satId) => {
            if (selectedSatelliteId !== 'ALL' && selectedSatelliteId !== satId) return null;
            const track = tracks[satId];
            if (!track) return null;
            const theme = SATELLITE_THEMES[satId];

            // Past Track (Solid line)
            const pastPath = buildSvgPath(track.pastTrack);
            // Future Track (Dashed line)
            const futurePath = buildSvgPath(track.futureTrack);

            return (
              <g key={`track-${satId}`}>
                {pastPath && (
                  <path
                    d={pastPath}
                    fill="none"
                    stroke={theme.stroke}
                    strokeWidth="1.6"
                    opacity={0.55}
                  />
                )}
                {futurePath && (
                  <path
                    d={futurePath}
                    fill="none"
                    stroke={theme.stroke}
                    strokeWidth="1.8"
                    strokeDasharray="6 4"
                    opacity={0.85}
                  />
                )}
              </g>
            );
          })}
        </g>
      )}

      {/* 3. ALSAT HIGH-RES NDVI FOOTPRINT PASSES OVER ALGERIA */}
      {showNdviFootprints && (
        <g id="alsat-ndvi-footprint-passes">
          {Array.isArray(passes) && passes.map((pass) => {
            if (!pass || !pass.bounds) return null;
            const isSelected = selectedPassId === pass.id;
            const theme = SATELLITE_THEMES[pass.satelliteId] || SATELLITE_THEMES['ALSAT-1B'];

            const minLat = Number(pass.bounds.minLat ?? 35);
            const maxLat = Number(pass.bounds.maxLat ?? 37);
            const minLng = Number(pass.bounds.minLng ?? 3);
            const maxLng = Number(pass.bounds.maxLng ?? 5);

            if (isNaN(minLat) || isNaN(maxLat) || isNaN(minLng) || isNaN(maxLng)) return null;

            // Convert pass bounding box to SVG polygon coordinates
            const polyCoords: GeoCoordinates[] = [
              { lat: maxLat, lng: minLng },
              { lat: maxLat, lng: maxLng },
              { lat: minLat, lng: maxLng },
              { lat: minLat, lng: minLng }
            ];
            const polyPath = buildSvgPolygon(polyCoords);
            const centerLat = (minLat + maxLat) / 2;
            const centerLng = (minLng + maxLng) / 2;
            const centerPt = geoToSvg(centerLat, centerLng);

            // Determine NDVI color code
            const meanVal = pass.ndviStats?.meanNdvi ?? 0.4;
            const ndviColor = meanVal < 0.35 
              ? '#ef4444' // Critical drought
              : meanVal < 0.50 
              ? '#f59e0b' // Moderate moisture stress
              : '#10b981'; // Healthy biomass

            return (
              <g
                key={`pass-${pass.id}`}
                className="cursor-pointer group"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectPass(isSelected ? null : pass);
                }}
              >
                {/* Multispectral Footprint Bounding Frame */}
                <path
                  d={polyPath}
                  fill={ndviColor}
                  fillOpacity={isSelected ? 0.35 : 0.18}
                  stroke={isSelected ? '#ffffff' : theme.stroke}
                  strokeWidth={isSelected ? 2.2 : 1.2}
                  strokeDasharray={isSelected ? undefined : '5 3'}
                  className="transition-all duration-200"
                />

                {/* Center Badge: ALSAT Pass Marker */}
                <g transform={`translate(${centerPt.x}, ${centerPt.y})`}>
                  <rect
                    x="-42"
                    y="-12"
                    width="84"
                    height="24"
                    rx="6"
                    fill="#0f172a"
                    stroke={isSelected ? '#ffffff' : theme.stroke}
                    strokeWidth={isSelected ? 1.8 : 1.0}
                    opacity="0.95"
                    filter="drop-shadow(0 4px 6px rgba(0,0,0,0.5))"
                  />
                  <text
                    x="0"
                    y="-1"
                    fill="#f8fafc"
                    fontSize="7.5"
                    fontWeight="bold"
                    textAnchor="middle"
                    className="select-none pointer-events-none font-mono"
                  >
                    🛰️ {pass.satelliteId}
                  </text>
                  <text
                    x="0"
                    y="8"
                    fill={ndviColor}
                    fontSize="6.5"
                    fontWeight="bold"
                    textAnchor="middle"
                    className="select-none pointer-events-none font-mono"
                  >
                    NDVI {meanVal.toFixed(2)} • {pass.cloudCoverPercent}% Cloud
                  </text>
                </g>
              </g>
            );
          })}
        </g>
      )}

      {/* 4. REAL-TIME SATELLITE ICONS & COVERAGE AURA */}
      <g id="alsat-satellite-nodes">
        {satellites.map((satId) => {
          if (selectedSatelliteId !== 'ALL' && selectedSatelliteId !== satId) return null;
          const pos = positions?.[satId];
          if (!pos) return null;
          const theme = SATELLITE_THEMES[satId] || SATELLITE_THEMES['ALSAT-1B'];
          const lat = Number(pos.subSatellitePoint?.lat ?? pos.latitude);
          const lng = Number(pos.subSatellitePoint?.lng ?? pos.longitude);
          if (isNaN(lat) || isNaN(lng)) return null;

          const pt = geoToSvg(lat, lng);

          // Calculate radius of instantaneous nadir ground footprint
          const radiusKm = pos.groundFootprintRadiusKm || 300;
          const footprintRadiusSvg = Math.max(14, (radiusKm / 111.32) * 1.5);

          return (
            <g 
              key={`sat-node-${satId}`} 
              className="cursor-pointer group"
              onClick={(e) => {
                e.stopPropagation();
                onSelectSatellite(satId);
              }}
            >
              {/* Nadir Footprint Aura */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={footprintRadiusSvg}
                fill={theme.fill}
                stroke={theme.stroke}
                strokeWidth="1.2"
                strokeDasharray="4 4"
                opacity={0.45}
                className="animate-pulse"
              />

              {/* Pulsing Satellite Glow */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r="18"
                fill={theme.glow}
                opacity="0.3"
                filter="blur(5px)"
              />

              {/* Satellite Core Ring */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r="10"
                fill="#0f172a"
                stroke={theme.stroke}
                strokeWidth="2"
                className="group-hover:scale-125 transition-transform"
              />

              {/* Satellite Icon Center */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r="4.5"
                fill={pos.isOverAlgeria ? '#22c55e' : theme.stroke}
              />

              {/* Satellite Label Callout */}
              <g transform={`translate(${pt.x + 14}, ${pt.y - 12})`}>
                <rect
                  x="0"
                  y="0"
                  width="78"
                  height="22"
                  rx="4"
                  fill="#020617"
                  stroke={theme.stroke}
                  strokeWidth="1"
                  opacity="0.95"
                />
                <text
                  x="6"
                  y="10"
                  fill="#ffffff"
                  fontSize="7.5"
                  fontWeight="bold"
                  className="font-mono select-none"
                >
                  {satId}
                </text>
                <text
                  x="6"
                  y="18"
                  fill={pos.isOverAlgeria ? '#4ade80' : '#94a3b8'}
                  fontSize="6.5"
                  className="font-mono select-none"
                >
                  {pos.isOverAlgeria ? (isAr ? 'فوق الجزائر' : 'Over Algeria') : `${pos.altitudeKm} km`}
                </text>
              </g>
            </g>
          );
        })}
      </g>
    </g>
  );
};
