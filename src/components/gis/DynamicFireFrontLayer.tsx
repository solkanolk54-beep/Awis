import React from 'react';
import { 
  PhysicalFireFrontSimulationResult, 
  FireFrontPolygonWavefront, 
  FireFrontVertex 
} from '../../services/fireFrontPhysicsEngine';
import { Language } from '../../types';

interface DynamicFireFrontLayerProps {
  simulation: PhysicalFireFrontSimulationResult | null;
  geoToSvg: (lat: number, lng: number) => { x: number; y: number };
  showVectors: boolean;
  showIsochrones: boolean;
  showDemBadges: boolean;
  activeTimeMinutes: number;
  selectedVertex: FireFrontVertex | null;
  onSelectVertex: (vertex: FireFrontVertex | null) => void;
  currentLang: Language;
}

export const DynamicFireFrontLayer: React.FC<DynamicFireFrontLayerProps> = ({
  simulation,
  geoToSvg,
  showVectors,
  showIsochrones,
  showDemBadges,
  activeTimeMinutes,
  selectedVertex,
  onSelectVertex,
  currentLang
}) => {
  if (!simulation) return null;

  const originSvg = geoToSvg(simulation.origin.lat, simulation.origin.lng);
  const activeWavefront = simulation.activeWavefront;

  // Isochrone style mapping for historical / future horizons
  const horizonStyles: Record<number, { stroke: string; fill: string; opacity: number; dash?: string }> = {
    15: { stroke: '#ef4444', fill: '#b91c1c', opacity: 0.35 },
    30: { stroke: '#f97316', fill: '#c2410c', opacity: 0.28 },
    45: { stroke: '#fb923c', fill: '#ea580c', opacity: 0.22 },
    60: { stroke: '#f59e0b', fill: '#d97706', opacity: 0.18 },
    90: { stroke: '#eab308', fill: '#b45309', opacity: 0.14, dash: '4 3' },
    120: { stroke: '#84cc16', fill: '#4d7c0f', opacity: 0.11, dash: '5 4' },
    180: { stroke: '#06b6d4', fill: '#0e7490', opacity: 0.08, dash: '6 4' },
    240: { stroke: '#8b5cf6', fill: '#6d28d9', opacity: 0.06, dash: '7 5' }
  };

  // Build SVG polygon points string for a wavefront
  const buildSvgPoints = (wavefront: FireFrontPolygonWavefront): string => {
    return wavefront.vertices
      .map((v) => {
        const pt = geoToSvg(v.lat, v.lng);
        return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
      })
      .join(' ');
  };

  // Head fire front path for animated glowing leading edge
  const buildHeadEdgePath = (wavefront: FireFrontPolygonWavefront): string => {
    if (!wavefront.headVertices || wavefront.headVertices.length < 2) return '';
    const pts = wavefront.headVertices.map((v) => geoToSvg(v.lat, v.lng));
    return pts.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}` : `${acc} L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
    }, '');
  };

  // Helper for color coding spread velocity
  const getVelocityColor = (velKmH: number): string => {
    if (velKmH >= 3.5) return '#ef4444'; // Red (Extreme ROS)
    if (velKmH >= 2.0) return '#f97316'; // Orange (High ROS)
    if (velKmH >= 1.0) return '#eab308'; // Amber (Moderate ROS)
    return '#10b981'; // Emerald (Low Backing ROS)
  };

  const headFirePoint = simulation.headFireFrontPosition;
  const headFireSvg = geoToSvg(headFirePoint.lat, headFirePoint.lng);

  return (
    <g id="layer-dynamic-fire-front" className="transition-opacity duration-300">
      <defs>
        {/* Fire Front Radial Thermal Core Gradient */}
        <radialGradient id="fireFrontCoreGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffedd5" stopOpacity="0.85" />
          <stop offset="35%" stopColor="#f97316" stopOpacity="0.45" />
          <stop offset="70%" stopColor="#dc2626" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#7f1d1d" stopOpacity="0.0" />
        </radialGradient>

        {/* Dynamic Velocity Arrow Marker */}
        <marker
          id="frontVelocityArrow"
          viewBox="0 0 10 10"
          refX="6"
          refY="5"
          markerWidth="4"
          markerHeight="4"
          orient="auto-start-reverse"
        >
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#fb923c" />
        </marker>

        {/* Fast Head Velocity Arrow Marker */}
        <marker
          id="headVelocityArrow"
          viewBox="0 0 10 10"
          refX="6"
          refY="5"
          markerWidth="4.5"
          markerHeight="4.5"
          orient="auto-start-reverse"
        >
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#ef4444" />
        </marker>

        {/* Backing Velocity Arrow Marker */}
        <marker
          id="backingVelocityArrow"
          viewBox="0 0 10 10"
          refX="6"
          refY="5"
          markerWidth="3.5"
          markerHeight="3.5"
          orient="auto-start-reverse"
        >
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#10b981" />
        </marker>
      </defs>

      {/* 1. Multi-Horizon Background Isochrones (if toggled) */}
      {showIsochrones && (
        <g id="isochrone-horizons" opacity={0.8}>
          {simulation.isochrones.map((iso) => {
            // Do not redraw active wavefront here
            if (iso.timeMinutes === activeWavefront.timeMinutes) return null;
            const style = horizonStyles[iso.timeMinutes] || { stroke: '#fb923c', fill: '#ea580c', opacity: 0.15 };
            const pts = buildSvgPoints(iso);

            // Label anchor at furthest vertex
            const leadV = iso.headVertices[Math.floor(iso.headVertices.length / 2)] || iso.vertices[0];
            const leadSvg = geoToSvg(leadV.lat, leadV.lng);

            return (
              <g key={`iso-front-${iso.timeMinutes}`}>
                <polygon
                  points={pts}
                  fill={style.fill}
                  fillOpacity={style.opacity}
                  stroke={style.stroke}
                  strokeWidth="1.2"
                  strokeDasharray={style.dash}
                />
                <g transform={`translate(${leadSvg.x}, ${leadSvg.y - 2})`}>
                  <rect
                    x="-18"
                    y="-8"
                    width="36"
                    height="10"
                    rx="2.5"
                    fill="rgba(15, 23, 42, 0.85)"
                    stroke={style.stroke}
                    strokeWidth="0.6"
                  />
                  <text
                    x="0"
                    y="-1"
                    fill="#f8fafc"
                    fontSize="6"
                    fontWeight="bold"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    +{iso.timeMinutes}m ({iso.burnedAreaHectares}ha)
                  </text>
                </g>
              </g>
            );
          })}
        </g>
      )}

      {/* 2. Primary Active Physical Fire Front Polygon */}
      <g id="active-fire-front-polygon">
        {/* Soft thermal ambient glow aura */}
        <polygon
          points={buildSvgPoints(activeWavefront)}
          fill="none"
          stroke="#f97316"
          strokeWidth="6"
          strokeOpacity="0.25"
          className="animate-pulse"
        />

        {/* Primary solid front body */}
        <polygon
          points={buildSvgPoints(activeWavefront)}
          fill="url(#fireFrontCoreGlow)"
          stroke="#ef4444"
          strokeWidth="1.8"
          strokeDasharray="none"
        />

        {/* Leading Active Flame Front Arc (Glowing high-velocity head) */}
        {activeWavefront.headVertices.length >= 2 && (
          <path
            d={buildHeadEdgePath(activeWavefront)}
            fill="none"
            stroke="#fef08a"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="animate-pulse"
            style={{
              filter: 'drop-shadow(0 0 4px #ef4444)'
            }}
          />
        )}
      </g>

      {/* 3. Physical Spread Velocity Vectors (Tangents & Normals) */}
      {showVectors && (
        <g id="velocity-vectors">
          {activeWavefront.vertices.map((v, idx) => {
            // Draw every 2nd or 3rd vertex to avoid visual clutter
            if (idx % 2 !== 0 && v.sectorType !== 'head') return null;

            const vPt = geoToSvg(v.lat, v.lng);
            const color = getVelocityColor(v.spreadVelocityKmH);

            // Vector arrow length proportional to spread velocity (min 8px, max 24px)
            const arrowLen = Math.max(8, Math.min(26, v.spreadVelocityKmH * 5.2));
            const angleRad = (v.angleDegrees * Math.PI) / 180;
            const endX = vPt.x + Math.sin(angleRad) * arrowLen;
            const endY = vPt.y - Math.cos(angleRad) * arrowLen; // SVG Y is inverted

            const isHead = v.sectorType === 'head';
            const isSelected = selectedVertex?.index === v.index;

            return (
              <g 
                key={`vec-${v.index}`}
                onClick={() => onSelectVertex(v)}
                className="cursor-pointer group"
              >
                {/* Arrow stem */}
                <line
                  x1={vPt.x}
                  y1={vPt.y}
                  x2={endX}
                  y2={endY}
                  stroke={color}
                  strokeWidth={isHead ? 2.0 : 1.2}
                  strokeDasharray={isHead ? 'none' : '2 2'}
                  markerEnd={isHead ? 'url(#headVelocityArrow)' : v.spreadVelocityKmH < 1.0 ? 'url(#backingVelocityArrow)' : 'url(#frontVelocityArrow)'}
                />

                {/* Vertex node circle */}
                <circle
                  cx={vPt.x}
                  cy={vPt.y}
                  r={isSelected ? 4 : isHead ? 2.8 : 1.8}
                  fill={isSelected ? '#38bdf8' : color}
                  stroke="#0f172a"
                  strokeWidth="0.8"
                  className="transition-transform group-hover:scale-125"
                />

                {/* Vertex tooltip on head or selected */}
                {(isHead && idx % 4 === 0 || isSelected) && (
                  <g transform={`translate(${endX + 6}, ${endY})`}>
                    <rect
                      x="-2"
                      y="-7"
                      width="54"
                      height="12"
                      rx="2.5"
                      fill="rgba(15, 23, 42, 0.92)"
                      stroke={color}
                      strokeWidth="0.7"
                    />
                    <text
                      x="25"
                      y="1.5"
                      fill="#f8fafc"
                      fontSize="6.5"
                      fontWeight="bold"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {v.spreadVelocityKmH}km/h | {v.demSlopeDegrees}°
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      )}

      {/* 4. Origin & DEM Elevation Telemetry Badges */}
      {showDemBadges && (
        <g id="dem-telemetry-overlays">
          {/* Ignition origin point marker */}
          <g transform={`translate(${originSvg.x}, ${originSvg.y})`}>
            <circle cx="0" cy="0" r="4" fill="#fbbf24" stroke="#78350f" strokeWidth="1" />
            <circle cx="0" cy="0" r="7" fill="none" stroke="#f59e0b" strokeWidth="0.8" strokeDasharray="2 2" className="animate-spin" />
            
            <g transform="translate(0, 16)">
              <rect
                x="-38"
                y="-8"
                width="76"
                height="14"
                rx="3"
                fill="rgba(15, 23, 42, 0.92)"
                stroke="#f59e0b"
                strokeWidth="0.8"
              />
              <text
                x="0"
                y="1.5"
                fill="#fde68a"
                fontSize="6.5"
                fontWeight="bold"
                fontFamily="monospace"
                textAnchor="middle"
              >
                ⛰ {simulation.originDEM.elevationMeters}m | {simulation.originDEM.slopeDegrees}° ({simulation.originDEM.aspectCardinal})
              </text>
            </g>
          </g>

          {/* Head Fire Front Point Marker */}
          <g transform={`translate(${headFireSvg.x}, ${headFireSvg.y})`}>
            <circle cx="0" cy="0" r="4.5" fill="#ef4444" className="animate-ping" />
            <circle cx="0" cy="0" r="3" fill="#ffffff" stroke="#991b1b" strokeWidth="1" />

            <g transform="translate(10, -8)">
              <rect
                x="0"
                y="-8"
                width="84"
                height="22"
                rx="3.5"
                fill="rgba(15, 23, 42, 0.95)"
                stroke="#ef4444"
                strokeWidth="1"
              />
              <text
                x="42"
                y="-0.5"
                fill="#f87171"
                fontSize="6.5"
                fontWeight="bold"
                fontFamily="monospace"
                textAnchor="middle"
              >
                HEAD FIRE: {activeWavefront.maxSpreadVelocityKmH} km/h
              </text>
              <text
                x="42"
                y="9"
                fill="#fdba74"
                fontSize="6"
                fontFamily="monospace"
                textAnchor="middle"
              >
                Flame: {activeWavefront.peakFlameLengthMeters}m | {activeWavefront.peakFirelineIntensityKwM} kW/m
              </text>
            </g>
          </g>
        </g>
      )}

      {/* 5. Wind Vector Influence Arrow (from origin along wind push vector) */}
      <g id="wind-vector-indicator">
        {(() => {
          const windRad = (simulation.flamePushHeadingDegrees * Math.PI) / 180;
          const arrowLength = 32;
          const endX = originSvg.x + Math.sin(windRad) * arrowLength;
          const endY = originSvg.y - Math.cos(windRad) * arrowLength;

          return (
            <g>
              <line
                x1={originSvg.x}
                y1={originSvg.y}
                x2={endX}
                y2={endY}
                stroke="#38bdf8"
                strokeWidth="1.8"
                strokeDasharray="4 2"
                markerEnd="url(#frontVelocityArrow)"
              />
              <g transform={`translate(${(originSvg.x + endX) / 2}, ${(originSvg.y + endY) / 2})`}>
                <rect
                  x="-32"
                  y="-8"
                  width="64"
                  height="12"
                  rx="3"
                  fill="rgba(2, 6, 23, 0.90)"
                  stroke="#38bdf8"
                  strokeWidth="0.8"
                />
                <text
                  x="0"
                  y="0.5"
                  fill="#7dd3fc"
                  fontSize="6.5"
                  fontWeight="bold"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  💨 {simulation.windSpeedKmH} km/h {simulation.windDirectionCardinal} ➔ {simulation.flamePushHeadingCardinal}
                </text>
              </g>
            </g>
          );
        })()}
      </g>
    </g>
  );
};
