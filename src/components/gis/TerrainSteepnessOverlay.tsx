import React from 'react';
import { 
  TerrainSteepnessCell, 
  CriticalEscarpmentZone, 
  MachineryMobilityCategory,
  GroundCrewHazardLevel 
} from '../../services/terrainSteepnessService';
import { Language } from '../../types';

export interface TerrainSteepnessOverlayProps {
  geoToSvg: (lat: number, lng: number) => { x: number; y: number };
  cells: TerrainSteepnessCell[];
  criticalZones: CriticalEscarpmentZone[];
  opacity: number;
  mode: 'all' | 'critical_only' | 'machinery_access' | 'ground_crew_safety';
  showContourBlobs: boolean;
  showHazardBadges: boolean;
  showAspectVectors: boolean;
  selectedCellId: string | null;
  onSelectCell: (cell: TerrainSteepnessCell | null) => void;
  onSelectCriticalZone?: (zone: CriticalEscarpmentZone) => void;
  currentLang: Language;
}

export const TerrainSteepnessOverlay: React.FC<TerrainSteepnessOverlayProps> = ({
  geoToSvg,
  cells,
  criticalZones,
  opacity,
  mode,
  showContourBlobs,
  showHazardBadges,
  showAspectVectors,
  selectedCellId,
  onSelectCell,
  onSelectCriticalZone,
  currentLang
}) => {
  // Filter cells according to selected display mode
  const filteredCells = React.useMemo(() => {
    if (mode === 'critical_only') {
      return cells.filter((c) => c.slopeDegrees >= 18);
    }
    if (mode === 'machinery_access') {
      return cells.filter((c) => c.slopeDegrees >= 10);
    }
    if (mode === 'ground_crew_safety') {
      return cells.filter((c) => c.slopeDegrees >= 12);
    }
    return cells;
  }, [cells, mode]);

  // Color mapper by mode
  const getCellFill = (cell: TerrainSteepnessCell): string => {
    if (mode === 'machinery_access') {
      switch (cell.machineryCategory) {
        case 'accessible_all':
          return '#10b981'; // Green: Passable
        case 'restricted_low_gear':
          return '#eab308'; // Amber: 4x4 Low-Gear
        case 'high_risk_winch':
          return '#f97316'; // Orange: Winched Dozers Only
        case 'impassable_extreme':
          return '#dc2626'; // Red: Impassable / Rollover Hazard
      }
    }

    if (mode === 'ground_crew_safety') {
      switch (cell.groundCrewHazard) {
        case 'low_risk':
          return '#10b981';
        case 'moderate_caution':
          return '#eab308';
        case 'severe_hazard':
          return '#ea580c';
        case 'extreme_prohibited':
          return '#9333ea'; // Purple: Extreme Chimney Threat
      }
    }

    return cell.heatColor;
  };

  return (
    <g id="layer-terrain-steepness-heatmap" opacity={opacity} className="transition-opacity duration-300">
      {/* SVG Definitions for Gradients and Filters */}
      <defs>
        <filter id="steepnessBlur" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
        <filter id="escarpmentGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#ef4444" floodOpacity="0.8" />
        </filter>
        <linearGradient id="aspectArrowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0.3" />
        </linearGradient>
      </defs>

      {/* 1. Spatial Steepness Heat Contour Blobs */}
      {showContourBlobs && (
        <g id="steepness-heat-blobs">
          {filteredCells.map((cell) => {
            const pt = geoToSvg(cell.lat, cell.lng);
            const fill = getCellFill(cell);
            const isSevere = cell.slopeDegrees >= 24;
            const isSelected = cell.id === selectedCellId;
            const r = isSelected ? cell.contourRadius * 1.35 : cell.contourRadius;
            const cellOpacity = isSevere ? 0.65 : 0.42;

            return (
              <circle
                key={`steep-blob-${cell.id}`}
                cx={pt.x}
                cy={pt.y}
                r={r}
                fill={fill}
                opacity={cellOpacity}
                filter="url(#steepnessBlur)"
                className="pointer-events-none"
              />
            );
          })}
        </g>
      )}

      {/* 2. Interactive Slope Cells & Incline Vectors */}
      <g id="steepness-interactive-cells">
        {filteredCells.map((cell) => {
          const pt = geoToSvg(cell.lat, cell.lng);
          const isSelected = cell.id === selectedCellId;
          const isExtreme = cell.slopeDegrees >= 28;
          const fill = getCellFill(cell);

          // Calculate aspect arrow endpoint (length ~10px in direction of uphill ascent)
          const rad = (cell.aspectDegrees * Math.PI) / 180;
          const arrowLen = Math.min(14, 6 + cell.slopeDegrees * 0.2);
          const arrowX = pt.x + Math.sin(rad) * arrowLen;
          const arrowY = pt.y - Math.cos(rad) * arrowLen;

          return (
            <g
              key={`cell-node-${cell.id}`}
              className="cursor-pointer group"
              onClick={(e) => {
                e.stopPropagation();
                onSelectCell(isSelected ? null : cell);
              }}
            >
              {/* Selected Cell Pulsing Reticle */}
              {isSelected && (
                <g>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={18}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    className="animate-spin"
                  />
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={24}
                    fill="none"
                    stroke={fill}
                    strokeWidth="1"
                    opacity="0.7"
                  />
                </g>
              )}

              {/* Core Cell Node */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={isSelected ? 6 : isExtreme ? 4.8 : 3.2}
                fill={fill}
                stroke={isExtreme ? '#ffffff' : '#0f172a'}
                strokeWidth={isExtreme || isSelected ? 1.2 : 0.6}
                className="transition-transform group-hover:scale-125"
              />

              {/* Subtle Aspect Ascent Vector (Chimney Draft Direction) */}
              {showAspectVectors && cell.slopeDegrees >= 15 && (
                <g opacity={isSelected ? 1 : 0.55} className="pointer-events-none">
                  <line
                    x1={pt.x}
                    y1={pt.y}
                    x2={arrowX}
                    y2={arrowY}
                    stroke={fill}
                    strokeWidth={isSelected ? 1.5 : 0.8}
                    strokeLinecap="round"
                  />
                  <circle
                    cx={arrowX}
                    cy={arrowY}
                    r={isSelected ? 1.8 : 1.2}
                    fill="#ffffff"
                  />
                </g>
              )}

              {/* Slope Angle Label for steep points or when selected */}
              {(cell.slopeDegrees >= 25 || isSelected) && (
                <text
                  x={pt.x}
                  y={pt.y + 11}
                  fill="#ffffff"
                  fontSize={isSelected ? "8" : "6.5"}
                  fontWeight="bold"
                  fontFamily="monospace"
                  textAnchor="middle"
                  filter="drop-shadow(0 1px 2px rgba(0,0,0,0.9))"
                  className="pointer-events-none select-none"
                >
                  {cell.slopeDegrees}°
                </text>
              )}
            </g>
          );
        })}
      </g>

      {/* 3. Critical Escarpment Zone High-Hazard Badges */}
      {showHazardBadges && (
        <g id="steepness-critical-escarpments">
          {criticalZones.map((zone) => {
            const pt = geoToSvg(zone.coordinates.lat, zone.coordinates.lng);
            const isImpassable = zone.machineryStatus === 'impassable_extreme';

            return (
              <g
                key={`escarp-badge-${zone.id}`}
                transform={`translate(${pt.x}, ${pt.y})`}
                className="cursor-pointer group"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSelectCriticalZone) {
                    onSelectCriticalZone(zone);
                  }
                }}
              >
                {/* Warning Pulse Rings */}
                <circle
                  cx="0"
                  cy="0"
                  r="16"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="1.2"
                  opacity="0.8"
                  className="animate-ping"
                />
                <circle
                  cx="0"
                  cy="0"
                  r="22"
                  fill="rgba(239, 68, 68, 0.15)"
                  filter="url(#escarpmentGlow)"
                />

                {/* Escarpment Crest Marker Icon */}
                <polygon
                  points="0,-10 9,6 -9,6"
                  fill={isImpassable ? '#dc2626' : '#ea580c'}
                  stroke="#ffffff"
                  strokeWidth="1.2"
                  filter="drop-shadow(0 2px 4px rgba(0,0,0,0.8))"
                />
                <text
                  x="0"
                  y="4.5"
                  fill="#ffffff"
                  fontSize="7"
                  fontWeight="bold"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  !
                </text>

                {/* Tactical Flag Badge */}
                <g transform="translate(0, -14)">
                  <rect
                    x="-42"
                    y="-11"
                    width="84"
                    height="16"
                    rx="3"
                    fill="rgba(15, 23, 42, 0.94)"
                    stroke={isImpassable ? '#ef4444' : '#f97316'}
                    strokeWidth="1"
                    filter="drop-shadow(0 2px 4px rgba(0,0,0,0.7))"
                  />
                  <text
                    x="0"
                    y="0"
                    fill="#f8fafc"
                    fontSize="6.5"
                    fontWeight="bold"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    ⛰️ {zone.maxSlopeDegrees}° • {isImpassable ? 'NO CCF TANKERS' : 'WINCH ONLY'}
                  </text>
                </g>

                {/* Name Label */}
                <text
                  x="0"
                  y="18"
                  fill="#fecdd3"
                  fontSize="6.5"
                  fontWeight="bold"
                  fontFamily="sans-serif"
                  textAnchor="middle"
                  filter="drop-shadow(0 1px 3px rgba(0,0,0,0.9))"
                  className="pointer-events-none select-none"
                >
                  {currentLang === 'ar' ? zone.nameAr : zone.name}
                </text>
              </g>
            );
          })}
        </g>
      )}
    </g>
  );
};
