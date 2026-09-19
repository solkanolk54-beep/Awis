import React from 'react';
import { 
  CalculatedEvacuationRoute, 
  SafeEvacuationZone, 
  RoadSegment, 
  Language, 
  GeoCoordinates 
} from '../../types';
import { ALGERIAN_ROAD_SEGMENTS, SAFE_EVACUATION_ZONES, AT_RISK_SETTLEMENTS, CivilianSettlement } from '../../data/algerianRoadNetwork';

interface EvacuationRoutesLayerProps {
  geoToSvg: (lat: number, lng: number) => { x: number; y: number };
  routes: CalculatedEvacuationRoute[];
  selectedRouteId: string | null;
  onSelectRoute: (route: CalculatedEvacuationRoute | null) => void;
  selectedSettlementId: string | null;
  onSelectSettlement: (settlement: CivilianSettlement) => void;
  fireCenter: GeoCoordinates;
  smokePlumeCone?: {
    origin: GeoCoordinates;
    headingDegrees: number;
    lengthKm: number;
    spreadAngleDegrees: number;
  };
  showRoadNetwork: boolean;
  showSmokeCone: boolean;
  showShelters: boolean;
  currentLang: Language;
  isTemporaryDynamicActive?: boolean;
  temporaryCountdownSeconds?: number;
  onExtendTemporary?: () => void;
  onPinPermanent?: () => void;
}

export const EvacuationRoutesLayer: React.FC<EvacuationRoutesLayerProps> = ({
  geoToSvg,
  routes,
  selectedRouteId,
  onSelectRoute,
  selectedSettlementId,
  onSelectSettlement,
  fireCenter,
  smokePlumeCone,
  showRoadNetwork,
  showSmokeCone,
  showShelters,
  currentLang,
  isTemporaryDynamicActive = false,
  temporaryCountdownSeconds,
  onExtendTemporary,
  onPinPermanent
}) => {
  // Convert road coordinates into SVG polyline points
  const getPathPoints = (coords: GeoCoordinates[]): string => {
    return coords.map((c) => {
      const pt = geoToSvg(c.lat, c.lng);
      return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    }).join(' ');
  };

  // Convert road coordinates into smooth SVG path d
  const getSmoothPathD = (coords: GeoCoordinates[]): string => {
    if (!coords || coords.length === 0) return '';
    const pts = coords.map((c) => geoToSvg(c.lat, c.lng));
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;

    return pts.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}` : `${acc} L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
    }, '');
  };

  // Calculate smoke plume cone SVG polygon
  const renderSmokePlumeCone = () => {
    if (!smokePlumeCone || !showSmokeCone) return null;

    const originSvg = geoToSvg(smokePlumeCone.origin.lat, smokePlumeCone.origin.lng);
    const rad = (smokePlumeCone.headingDegrees * Math.PI) / 180;
    const spreadRad = ((smokePlumeCone.spreadAngleDegrees / 2) * Math.PI) / 180;

    // Length in SVG coordinates (approx 1km ~ 7.5 SVG units)
    const svgLen = smokePlumeCone.lengthKm * 8.5;

    const leftAngle = rad - spreadRad;
    const rightAngle = rad + spreadRad;

    const leftX = originSvg.x + Math.sin(leftAngle) * svgLen;
    const leftY = originSvg.y - Math.cos(leftAngle) * svgLen;

    const rightX = originSvg.x + Math.sin(rightAngle) * svgLen;
    const rightY = originSvg.y - Math.cos(rightAngle) * svgLen;

    const midX = originSvg.x + Math.sin(rad) * (svgLen * 1.15);
    const midY = originSvg.y - Math.cos(rad) * (svgLen * 1.15);

    return (
      <g id="evac-smoke-plume-cone" className="pointer-events-none">
        <polygon
          points={`${originSvg.x},${originSvg.y} ${leftX},${leftY} ${midX},${midY} ${rightX},${rightY}`}
          fill="url(#smokePlumeGradient)"
          opacity="0.45"
        />
        {/* Smoke perimeter stroke */}
        <polyline
          points={`${originSvg.x},${originSvg.y} ${leftX},${leftY} ${midX},${midY} ${rightX},${rightY} ${originSvg.x},${originSvg.y}`}
          fill="none"
          stroke="#94a3b8"
          strokeWidth="1.2"
          strokeDasharray="4 3"
          opacity="0.5"
        />
        {/* Smoke drift indicator label */}
        <g transform={`translate(${midX}, ${midY})`}>
          <rect
            x="-38"
            y="-8"
            width="76"
            height="14"
            rx="3"
            fill="rgba(15, 23, 42, 0.88)"
            stroke="#94a3b8"
            strokeWidth="0.8"
          />
          <text
            x="0"
            y="1.5"
            fill="#e2e8f0"
            fontSize="6.5"
            fontWeight="bold"
            fontFamily="monospace"
            textAnchor="middle"
          >
            💨 TOXIC SMOKE CONE ({smokePlumeCone.lengthKm}km)
          </text>
        </g>
      </g>
    );
  };

  return (
    <g id="layer-smart-evacuation-planner" className="transition-opacity duration-300">
      <defs>
        {/* Animated Evacuation Safe Direction Flow Marker (Emerald Chevron) */}
        <marker
          id="evacSafeArrow"
          viewBox="0 0 10 10"
          refX="6"
          refY="5"
          markerWidth="4.5"
          markerHeight="4.5"
          orient="auto-start-reverse"
        >
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#10b981" />
        </marker>

        {/* Secondary Route Arrow (Amber) */}
        <marker
          id="evacContingencyArrow"
          viewBox="0 0 10 10"
          refX="6"
          refY="5"
          markerWidth="4"
          markerHeight="4"
          orient="auto-start-reverse"
        >
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#f59e0b" />
        </marker>

        {/* Smoke Plume Gradient */}
        <radialGradient id="smokePlumeGradient" cx="50%" cy="0%" r="90%">
          <stop offset="0%" stopColor="#475569" stopOpacity="0.8" />
          <stop offset="40%" stopColor="#64748b" stopOpacity="0.4" />
          <stop offset="80%" stopColor="#94a3b8" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.0" />
        </radialGradient>

        {/* Safe Corridor Glow Filter */}
        <filter id="safeCorridorGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* 1. Downwind Smoke Plume Cone (Visibility & Gas Hazard) */}
      {renderSmokePlumeCone()}

      {/* 2. Base Algerian Road Network Corridors */}
      {showRoadNetwork && (
        <g id="evac-base-road-network" opacity={0.45}>
          {ALGERIAN_ROAD_SEGMENTS.map((road) => {
            const isHighway = road.type === 'highway';
            const isNational = road.type === 'national';
            const strokeColor = isHighway ? '#38bdf8' : isNational ? '#64748b' : '#475569';
            const strokeWidth = isHighway ? 2.5 : isNational ? 1.8 : 1.2;

            return (
              <g key={`road-${road.id}`} className="hover:opacity-100 transition-opacity">
                <path
                  d={getSmoothPathD(road.path)}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            );
          })}
        </g>
      )}

      {/* 3. Calculated Evacuation Routes (Primary, Secondary, Blocked) */}
      <g id="calculated-evacuation-corridors">
        {routes.map((route) => {
          const isSelected = selectedRouteId === route.id;
          const isPrimary = route.routeType === 'primary_optimal';
          const isBlocked = route.status === 'blocked_fire' || route.routeType === 'compromised_blocked';
          const isCaution = route.status === 'caution_smoke';

          const pathD = getSmoothPathD(route.waypoints);
          if (!pathD) return null;

          // Distinctive styling
          const strokeColor = isBlocked 
            ? '#ef4444' 
            : isCaution 
            ? '#f59e0b' 
            : '#10b981';

          const markerEnd = isBlocked 
            ? undefined 
            : isPrimary 
            ? 'url(#evacSafeArrow)' 
            : 'url(#evacContingencyArrow)';

          return (
            <g
              key={route.id}
              onClick={() => onSelectRoute(route)}
              className="cursor-pointer group"
            >
              {/* Outer halo / selection glow */}
              <path
                d={pathD}
                fill="none"
                stroke={strokeColor}
                strokeWidth={isSelected ? 10 : isPrimary ? 7 : 4.5}
                strokeOpacity={isSelected ? 0.35 : 0.18}
                strokeLinecap="round"
                strokeLinejoin="round"
                className={isBlocked ? 'animate-pulse' : undefined}
              />

              {/* Main Corridor Line */}
              <path
                d={pathD}
                fill="none"
                stroke={strokeColor}
                strokeWidth={isSelected ? 3.5 : isPrimary ? 2.8 : 1.8}
                strokeDasharray={isBlocked ? '4 3' : isPrimary ? 'none' : '6 4'}
                strokeLinecap="round"
                strokeLinejoin="round"
                markerEnd={markerEnd}
                className="transition-all duration-200"
              />

              {/* Dynamic Direction Flow Animation for Safe Primary Routes */}
              {isPrimary && !isBlocked && (
                <path
                  d={pathD}
                  fill="none"
                  stroke="#ecfdf5"
                  strokeWidth="1.6"
                  strokeDasharray="8 14"
                  strokeLinecap="round"
                  className="animate-[dash_1.5s_linear_infinite]"
                  opacity="0.85"
                />
              )}

              {/* Real-Time Moving Civilian Convoy Particles along the Graph Evacuation Path */}
              {!isBlocked && (isSelected || isPrimary) && (
                <g className="pointer-events-none">
                  {/* Lead Evacuation Escort Vehicle */}
                  <circle r={isSelected ? 3.4 : 2.6} fill="#34d399" stroke="#064e3b" strokeWidth="0.8">
                    <animateMotion dur="4.5s" repeatCount="indefinite" path={pathD} />
                  </circle>
                  {/* Secondary Evacuation Convoy Bus */}
                  <circle r={isSelected ? 3.0 : 2.2} fill="#6ee7b7" stroke="#064e3b" strokeWidth="0.7">
                    <animateMotion dur="4.5s" begin="1.5s" repeatCount="indefinite" path={pathD} />
                  </circle>
                  {/* Tail Civilian Protection Ambulance */}
                  <circle r={isSelected ? 2.8 : 2.0} fill="#a7f3d0" stroke="#064e3b" strokeWidth="0.6">
                    <animateMotion dur="4.5s" begin="3.0s" repeatCount="indefinite" path={pathD} />
                  </circle>
                </g>
              )}

              {/* Waypoint nodes along route */}
              {route.waypoints.map((wpt, idx) => {
                const pt = geoToSvg(wpt.lat, wpt.lng);
                return (
                  <circle
                    key={`wpt-${route.id}-${idx}`}
                    cx={pt.x}
                    cy={pt.y}
                    r={isSelected ? 2.8 : 1.8}
                    fill={strokeColor}
                    stroke="#0f172a"
                    strokeWidth="0.6"
                  />
                );
              })}

              {/* Midpoint route telemetry badge & Temporary Dynamic Path Overlay */}
              {route.waypoints.length > 2 && (
                (() => {
                  const midIndex = Math.floor(route.waypoints.length / 2);
                  const midPt = geoToSvg(route.waypoints[midIndex].lat, route.waypoints[midIndex].lng);

                  return (
                    <g>
                      {/* Temporary Dynamic Path Active Header Pill */}
                      {isTemporaryDynamicActive && isSelected && (
                        <g transform={`translate(${midPt.x}, ${midPt.y - 23})`}>
                          <rect
                            x="-58"
                            y="-9"
                            width="116"
                            height="18"
                            rx="4"
                            fill="rgba(4, 47, 46, 0.97)"
                            stroke="#10b981"
                            strokeWidth="1.2"
                            filter="url(#safeCorridorGlow)"
                          />
                          <circle cx="-47" cy="0" r="3" fill="#34d399" className="animate-ping" />
                          <circle cx="-47" cy="0" r="2" fill="#10b981" />
                          <text
                            x="-40"
                            y="2.5"
                            fill="#6ee7b7"
                            fontSize="6"
                            fontWeight="bold"
                            fontFamily="monospace"
                          >
                            ⚡ DYNAMIC PATH ({temporaryCountdownSeconds ?? 35}s)
                          </text>
                        </g>
                      )}

                      {/* Main Telemetry Badge */}
                      <g transform={`translate(${midPt.x}, ${midPt.y - 6})`}>
                        <rect
                          x="-34"
                          y="-7"
                          width="68"
                          height="14"
                          rx="3"
                          fill="rgba(15, 23, 42, 0.94)"
                          stroke={strokeColor}
                          strokeWidth={isSelected ? '1.2' : '0.8'}
                        />
                        <text
                          x="0"
                          y="2"
                          fill="#f8fafc"
                          fontSize="6"
                          fontWeight="bold"
                          fontFamily="monospace"
                          textAnchor="middle"
                        >
                          {isBlocked ? '⛔ BLOCKED' : `🟢 ${route.totalDistanceKm}km • ${route.estimatedTravelMinutes}m`}
                        </text>
                      </g>
                    </g>
                  );
                })()
              )}
            </g>
          );
        })}
      </g>

      {/* 4. At-Risk Civilian Settlements */}
      <g id="at-risk-settlements">
        {AT_RISK_SETTLEMENTS.map((settlement) => {
          const pt = geoToSvg(settlement.coordinates.lat, settlement.coordinates.lng);
          const isSelected = selectedSettlementId === settlement.id;

          return (
            <g
              key={settlement.id}
              onClick={() => onSelectSettlement(settlement)}
              className="cursor-pointer group"
              transform={`translate(${pt.x}, ${pt.y})`}
            >
              {/* Pulsing Danger Ping */}
              <circle
                cx="0"
                cy="0"
                r="14"
                fill="none"
                stroke="#f97316"
                strokeWidth="1"
                strokeDasharray="3 3"
                className="animate-spin"
              />
              <circle
                cx="0"
                cy="0"
                r="8"
                fill="#ea580c"
                fillOpacity="0.3"
                className="animate-ping"
              />

              {/* Core Node Circle */}
              <circle
                cx="0"
                cy="0"
                r={isSelected ? 5.5 : 4.5}
                fill={isSelected ? '#38bdf8' : '#ea580c'}
                stroke="#ffffff"
                strokeWidth="1.2"
              />

              {/* Label Badge */}
              <g transform="translate(0, -14)">
                <rect
                  x="-36"
                  y="-8"
                  width="72"
                  height="14"
                  rx="3"
                  fill="rgba(15, 23, 42, 0.95)"
                  stroke={isSelected ? '#38bdf8' : '#f97316'}
                  strokeWidth="0.8"
                />
                <text
                  x="0"
                  y="1.5"
                  fill="#fdba74"
                  fontSize="6.5"
                  fontWeight="bold"
                  fontFamily="sans-serif"
                  textAnchor="middle"
                >
                  🏘️ {currentLang === 'ar' ? settlement.nameAr : settlement.nameEn}
                </text>
              </g>

              {/* Population sub-label */}
              <g transform="translate(0, 15)">
                <rect
                  x="-24"
                  y="-6"
                  width="48"
                  height="11"
                  rx="2"
                  fill="rgba(15, 23, 42, 0.90)"
                  stroke="#64748b"
                  strokeWidth="0.5"
                />
                <text
                  x="0"
                  y="1.5"
                  fill="#f1f5f9"
                  fontSize="5.5"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  👥 {settlement.population} pop
                </text>
              </g>
            </g>
          );
        })}
      </g>

      {/* 5. Safe Evacuation Reception Hubs & Shelters */}
      {showShelters && (
        <g id="safe-evacuation-shelters">
          {SAFE_EVACUATION_ZONES.map((zone) => {
            const pt = geoToSvg(zone.coordinates.lat, zone.coordinates.lng);
            const isSelected = routes.some(r => r.safeZone.id === zone.id && selectedRouteId === r.id);

            return (
              <g
                key={zone.id}
                transform={`translate(${pt.x}, ${pt.y})`}
                className="cursor-pointer group"
              >
                {/* Pulsing Safe Beacon Ring */}
                <circle
                  cx="0"
                  cy="0"
                  r={isSelected ? 16 : 12}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="1.2"
                  strokeDasharray="2 2"
                  className="animate-spin"
                />
                <circle
                  cx="0"
                  cy="0"
                  r="7"
                  fill="#10b981"
                  fillOpacity="0.25"
                />

                {/* Hub Pin */}
                <circle
                  cx="0"
                  cy="0"
                  r="5"
                  fill="#10b981"
                  stroke="#ffffff"
                  strokeWidth="1.2"
                />
                {/* Inner Cross */}
                <path
                  d="M -2.5 0 L 2.5 0 M 0 -2.5 L 0 2.5"
                  stroke="#ffffff"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />

                {/* Shelter Name & Capacity Tag */}
                <g transform="translate(0, 16)">
                  <rect
                    x="-42"
                    y="-8"
                    width="84"
                    height="18"
                    rx="3.5"
                    fill="rgba(6, 78, 59, 0.95)"
                    stroke="#10b981"
                    strokeWidth="0.9"
                  />
                  <text
                    x="0"
                    y="-0.5"
                    fill="#ecfdf5"
                    fontSize="6"
                    fontWeight="bold"
                    fontFamily="sans-serif"
                    textAnchor="middle"
                  >
                    🛡️ {currentLang === 'ar' ? zone.nameAr.slice(0, 24) : zone.nameEn.slice(0, 24)}
                  </text>
                  <text
                    x="0"
                    y="7"
                    fill="#a7f3d0"
                    fontSize="5"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    Cap: {zone.capacityPersons - zone.currentOccupancy} free | {zone.emergencyVhfFrequency.split(' ')[0]}
                  </text>
                </g>
              </g>
            );
          })}
        </g>
      )}
    </g>
  );
};
