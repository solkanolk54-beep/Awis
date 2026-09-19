import React, { useState } from 'react';
import { 
  FireFrontDynamicsResult, 
  FireFrontPolylineVertex, 
  HistoricalFrontEdgeSnapshot 
} from '../../services/fireFrontDynamicsService';
import { Language } from '../../types';

interface FireFrontDynamicsLayerProps {
  dynamics: FireFrontDynamicsResult | null;
  geoToSvg: (lat: number, lng: number) => { x: number; y: number };
  showActiveFront?: boolean;
  showHistoricalTrails?: boolean;
  showExpansionVectors?: boolean;
  showVertexNodes?: boolean;
  selectedVertexId?: string | null;
  onSelectVertex?: (vertex: FireFrontPolylineVertex | null) => void;
  currentLang: Language;
}

export const FireFrontDynamicsLayer: React.FC<FireFrontDynamicsLayerProps> = ({
  dynamics,
  geoToSvg,
  showActiveFront = true,
  showHistoricalTrails = true,
  showExpansionVectors = true,
  showVertexNodes = true,
  selectedVertexId = null,
  onSelectVertex,
  currentLang
}) => {
  const [hoveredVertex, setHoveredVertex] = useState<FireFrontPolylineVertex | null>(null);

  if (!dynamics) return null;

  const { activeFrontPolyline, historicalSnapshots, activeHeadPosition } = dynamics;
  if (!activeFrontPolyline || activeFrontPolyline.length < 2) return null;

  // Convert an array of {lat, lng} to SVG path string (M x y L x y ...)
  const toSvgPath = (points: Array<{ lat: number; lng: number }>): string => {
    return points.reduce((acc, pt, idx) => {
      const svgPt = geoToSvg(pt.lat, pt.lng);
      return idx === 0 
        ? `M ${svgPt.x.toFixed(1)} ${svgPt.y.toFixed(1)}` 
        : `${acc} L ${svgPt.x.toFixed(1)} ${svgPt.y.toFixed(1)}`;
    }, '');
  };

  // Convert points to SVG points string for polygons
  const toSvgPoints = (points: Array<{ lat: number; lng: number }>): string => {
    return points
      .map((pt) => {
        const svgPt = geoToSvg(pt.lat, pt.lng);
        return `${svgPt.x.toFixed(1)},${svgPt.y.toFixed(1)}`;
      })
      .join(' ');
  };

  // Get color scale for spread rate in m/min
  const getSpreadRateColor = (rosMMin: number): string => {
    if (rosMMin >= 25) return '#ef4444'; // Extreme (Red)
    if (rosMMin >= 15) return '#f97316'; // High (Orange)
    if (rosMMin >= 8) return '#eab308'; // Moderate (Amber)
    return '#10b981'; // Backing / Slow (Emerald)
  };

  const activeVertex = hoveredVertex || activeFrontPolyline.find((v) => v.id === selectedVertexId) || null;
  const activeHeadSvg = geoToSvg(activeHeadPosition.lat, activeHeadPosition.lng);

  return (
    <g id="layer-fire-front-dynamics" className="transition-opacity duration-300">
      <defs>
        {/* Dynamic Glow Filter */}
        <filter id="fireFrontDynamicGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Vector Arrow Head Markers */}
        <marker
          id="dynamicsArrowHeadExtreme"
          viewBox="0 0 10 10"
          refX="6"
          refY="5"
          markerWidth="4.5"
          markerHeight="4.5"
          orient="auto-start-reverse"
        >
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#ef4444" />
        </marker>

        <marker
          id="dynamicsArrowHeadRapid"
          viewBox="0 0 10 10"
          refX="6"
          refY="5"
          markerWidth="4"
          markerHeight="4"
          orient="auto-start-reverse"
        >
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#f97316" />
        </marker>

        <marker
          id="dynamicsArrowHeadModerate"
          viewBox="0 0 10 10"
          refX="6"
          refY="5"
          markerWidth="3.5"
          markerHeight="3.5"
          orient="auto-start-reverse"
        >
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#eab308" />
        </marker>

        <marker
          id="dynamicsArrowHeadBacking"
          viewBox="0 0 10 10"
          refX="6"
          refY="5"
          markerWidth="3"
          markerHeight="3"
          orient="auto-start-reverse"
        >
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#10b981" />
        </marker>
      </defs>

      {/* 1. Historical Ghost Expansion Trails (Past Time Offsets) */}
      {showHistoricalTrails && (
        <g id="historical-expansion-trails">
          {historicalSnapshots.map((snapshot: HistoricalFrontEdgeSnapshot, idx: number) => {
            if (snapshot.polyline.length < 2) return null;
            const pathD = toSvgPath(snapshot.polyline);
            const isOldest = idx === 0;
            const strokeOpacity = 0.25 + idx * 0.18;
            const strokeWidth = 1.0 + idx * 0.35;

            // Anchor label near center vertex
            const midIndex = Math.floor(snapshot.polyline.length / 2);
            const midPt = snapshot.polyline[midIndex];
            const midSvg = geoToSvg(midPt.lat, midPt.lng);

            return (
              <g key={`hist-edge-${snapshot.timeOffsetMinutes}`} opacity={0.85}>
                {/* Dashed progression line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="#fb923c"
                  strokeWidth={strokeWidth}
                  strokeDasharray="4 3"
                  strokeOpacity={strokeOpacity}
                  strokeLinecap="round"
                />

                {/* Subtle historical time badge */}
                {!isOldest && (
                  <g transform={`translate(${midSvg.x}, ${midSvg.y - 4})`}>
                    <rect
                      x="-14"
                      y="-7"
                      width="28"
                      height="10"
                      rx="2.5"
                      fill="rgba(15, 23, 42, 0.85)"
                      stroke="#fb923c"
                      strokeWidth="0.5"
                      strokeOpacity="0.7"
                    />
                    <text
                      x="0"
                      y="0.5"
                      fill="#fed7aa"
                      fontSize="5.5"
                      fontWeight="bold"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {snapshot.timeOffsetMinutes}m
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      )}

      {/* 2. Primary Active 'Fire Front' Polyline (Active Expansion Edge) */}
      {showActiveFront && (
        <g id="active-fire-front-polyline">
          {/* Path Layer 1: Ambient Thermal Radiation Aura (Pulsing Glow) */}
          <path
            d={toSvgPath(activeFrontPolyline)}
            fill="none"
            stroke="#ea580c"
            strokeWidth="8"
            strokeOpacity="0.30"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="animate-pulse"
            filter="url(#fireFrontDynamicGlow)"
          />

          {/* Path Layer 2: Main Flame Edge Body */}
          <path
            d={toSvgPath(activeFrontPolyline)}
            fill="none"
            stroke="#ef4444"
            strokeWidth="3.2"
            strokeOpacity="0.95"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Path Layer 3: High-Intensity Blazing Core Line */}
          <path
            d={toSvgPath(activeFrontPolyline)}
            fill="none"
            stroke="#fef08a"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="animate-pulse"
          />
        </g>
      )}

      {/* 3. Coupled Wind & Terrain Expansion Velocity Vectors */}
      {showExpansionVectors && (
        <g id="front-expansion-vectors">
          {activeFrontPolyline.map((vertex, idx) => {
            // Draw vectors on every vertex for head sector, every 2nd for flanks
            if (vertex.sector !== 'head' && idx % 2 !== 0) return null;

            const originSvg = geoToSvg(vertex.lat, vertex.lng);
            const color = getSpreadRateColor(vertex.spreadRateMMin);

            // Vector arrow length proportional to local spread velocity (min 9px, max 26px)
            const arrowLen = Math.max(9, Math.min(26, vertex.spreadRateMMin * 0.95));
            const angleRad = (vertex.normalHeadingDeg * Math.PI) / 180;
            const endX = originSvg.x + Math.sin(angleRad) * arrowLen;
            const endY = originSvg.y - Math.cos(angleRad) * arrowLen;

            let markerUrl = 'url(#dynamicsArrowHeadModerate)';
            if (vertex.spreadRateMMin >= 25) markerUrl = 'url(#dynamicsArrowHeadExtreme)';
            else if (vertex.spreadRateMMin >= 15) markerUrl = 'url(#dynamicsArrowHeadRapid)';
            else if (vertex.spreadRateMMin < 8) markerUrl = 'url(#dynamicsArrowHeadBacking)';

            return (
              <g 
                key={`vector-${vertex.id}`}
                className="cursor-pointer group"
                onMouseEnter={() => setHoveredVertex(vertex)}
                onMouseLeave={() => setHoveredVertex(null)}
                onClick={() => onSelectVertex?.(vertex)}
              >
                {/* Arrow line */}
                <line
                  x1={originSvg.x}
                  y1={originSvg.y}
                  x2={endX}
                  y2={endY}
                  stroke={color}
                  strokeWidth={vertex.isLeadingHeadVertex ? 2.2 : 1.4}
                  markerEnd={markerUrl}
                />
              </g>
            );
          })}
        </g>
      )}

      {/* 4. Active Polyline Vertex Nodes */}
      {showVertexNodes && (
        <g id="front-vertex-nodes">
          {activeFrontPolyline.map((vertex) => {
            const ptSvg = geoToSvg(vertex.lat, vertex.lng);
            const isSelected = selectedVertexId === vertex.id;
            const isHovered = hoveredVertex?.id === vertex.id;
            const color = getSpreadRateColor(vertex.spreadRateMMin);

            return (
              <g
                key={`node-${vertex.id}`}
                className="cursor-pointer group"
                onMouseEnter={() => setHoveredVertex(vertex)}
                onMouseLeave={() => setHoveredVertex(null)}
                onClick={() => onSelectVertex?.(vertex)}
              >
                {/* Pulsing ring on selected/hovered */}
                {(isSelected || isHovered) && (
                  <circle
                    cx={ptSvg.x}
                    cy={ptSvg.y}
                    r={6.5}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="1.2"
                    className="animate-ping"
                  />
                )}

                {/* Main vertex circle */}
                <circle
                  cx={ptSvg.x}
                  cy={ptSvg.y}
                  r={vertex.isLeadingHeadVertex ? 4.0 : isSelected ? 3.5 : 2.5}
                  fill={isSelected ? '#38bdf8' : vertex.isLeadingHeadVertex ? '#ffffff' : color}
                  stroke="#0f172a"
                  strokeWidth="0.9"
                  className="transition-transform group-hover:scale-125"
                />
              </g>
            );
          })}
        </g>
      )}

      {/* 5. Active Head Front Milestone Beacon */}
      <g id="head-fire-front-beacon" transform={`translate(${activeHeadSvg.x}, ${activeHeadSvg.y})`}>
        {/* Pulsing beacon waves */}
        <circle r="7" fill="none" stroke="#ef4444" strokeWidth="1.2" className="animate-ping" opacity="0.8" />
        <circle r="4" fill="#fef08a" stroke="#dc2626" strokeWidth="1.2" />

        {/* Head Front Tag */}
        <g transform="translate(0, -10)">
          <rect
            x="-26"
            y="-7"
            width="52"
            height="11"
            rx="3"
            fill="rgba(15, 23, 42, 0.92)"
            stroke="#ef4444"
            strokeWidth="0.8"
          />
          <text
            x="0"
            y="1"
            fill="#fef08a"
            fontSize="6"
            fontWeight="bold"
            fontFamily="monospace"
            textAnchor="middle"
          >
            🔥 {dynamics.peakRateOfSpreadMMin} m/min
          </text>
        </g>
      </g>

      {/* 6. Dynamic On-Canvas Vertex Telemetry Card (Hover / Selection) */}
      {activeVertex && (() => {
        const vSvg = geoToSvg(activeVertex.lat, activeVertex.lng);
        const cardWidth = 148;
        const cardHeight = 64;
        const cardX = vSvg.x - cardWidth / 2;
        const cardY = vSvg.y - cardHeight - 12;

        return (
          <g id="active-vertex-telemetry-tooltip" pointerEvents="none" className="z-40">
            {/* Connector stem */}
            <line
              x1={vSvg.x}
              y1={vSvg.y - 4}
              x2={vSvg.x}
              y2={cardY + cardHeight}
              stroke="#38bdf8"
              strokeWidth="1.0"
              strokeDasharray="2 2"
            />

            {/* Background Card */}
            <rect
              x={cardX}
              y={cardY}
              width={cardWidth}
              height={cardHeight}
              rx="6"
              fill="#020617"
              stroke="#38bdf8"
              strokeWidth="1.2"
              fillOpacity="0.96"
              filter="drop-shadow(0 4px 8px rgba(0,0,0,0.8))"
            />

            {/* Header: Title & Sector */}
            <text
              x={cardX + 8}
              y={cardY + 12}
              fill="#f8fafc"
              fontSize="7.5"
              fontWeight="bold"
            >
              {currentLang === 'ar' ? 'حافة الجبهة النشطة' : 'Active Expansion Vertex'} #{activeVertex.index}
            </text>
            <text
              x={cardX + cardWidth - 8}
              y={cardY + 12}
              fill="#38bdf8"
              fontSize="6.5"
              fontWeight="bold"
              fontFamily="monospace"
              textAnchor="end"
            >
              {activeVertex.sector.toUpperCase()}
            </text>

            {/* Row 1: Rate of Spread & Flame Length */}
            <text
              x={cardX + 8}
              y={cardY + 24}
              fill="#fb923c"
              fontSize="7"
              fontFamily="monospace"
              fontWeight="bold"
            >
              ROS: {activeVertex.spreadRateMMin} m/min ({activeVertex.spreadRateKmH} km/h)
            </text>
            <text
              x={cardX + cardWidth - 8}
              y={cardY + 24}
              fill="#fef08a"
              fontSize="7"
              fontFamily="monospace"
              textAnchor="end"
            >
              Flame: {activeVertex.flameLengthM}m
            </text>

            {/* Row 2: Coupled Vectors (Wind & Slope Alignment) */}
            <text
              x={cardX + 8}
              y={cardY + 36}
              fill="#94a3b8"
              fontSize="6.5"
              fontFamily="monospace"
            >
              💨 Wind: {activeVertex.wind.speedKmH}km/h @ {activeVertex.wind.pushHeadingDeg}° ({activeVertex.expansionVector.windContributionPct}%)
            </text>
            <text
              x={cardX + 8}
              y={cardY + 47}
              fill="#a7f3d0"
              fontSize="6.5"
              fontFamily="monospace"
            >
              ⛰️ Slope: {activeVertex.terrain.slopeDegrees}° uphill @ {activeVertex.terrain.aspectCardinal} ({activeVertex.terrain.elevationMeters}m)
            </text>

            {/* Row 3: Net Expansion Heading & Intensity */}
            <text
              x={cardX + 8}
              y={cardY + 58}
              fill="#cbd5e1"
              fontSize="6.5"
              fontFamily="monospace"
            >
              🧭 Vector Normal: {activeVertex.normalHeadingDeg}° • I: {activeVertex.firelineIntensityKwM} kW/m
            </text>
          </g>
        );
      })()}
    </g>
  );
};
