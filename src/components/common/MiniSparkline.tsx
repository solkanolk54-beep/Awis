import React, { useState, useId } from 'react';
import { HourlyTrendPoint } from '../../data/kpiTrendData';

interface MiniSparklineProps {
  data: HourlyTrendPoint[];
  width?: number | string;
  height?: number;
  strokeColor?: string;
  fillColor?: string;
  trend?: 'accelerating' | 'subsiding' | 'stable';
  unit?: string;
  showMinMax?: boolean;
  showCurrentDot?: boolean;
  interactive?: boolean;
  id?: string;
}

export const MiniSparkline: React.FC<MiniSparklineProps> = ({
  data,
  width = '100%',
  height = 38,
  strokeColor,
  fillColor,
  trend = 'accelerating',
  unit = '',
  showMinMax = true,
  showCurrentDot = true,
  interactive = true,
  id
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<HourlyTrendPoint | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const gradientId = useId();

  if (!data || data.length === 0) {
    return <div className="h-8 flex items-center justify-center text-[10px] text-slate-500">No data</div>;
  }

  // Color defaults based on trend status
  let resolvedStroke = strokeColor;
  let resolvedFill = fillColor;

  if (!resolvedStroke) {
    if (trend === 'accelerating') {
      resolvedStroke = '#f43f5e'; // Rose-500 / Amber-Rose
      resolvedFill = '#e11d48';
    } else if (trend === 'subsiding') {
      resolvedStroke = '#10b981'; // Emerald-500
      resolvedFill = '#059669';
    } else {
      resolvedStroke = '#38bdf8'; // Sky-400
      resolvedFill = '#0284c7';
    }
  }

  // Compute boundaries for SVG viewBox
  const vbWidth = 200;
  const vbHeight = height;
  const paddingX = 4;
  const paddingTop = 5;
  const paddingBottom = 5;
  const effectiveHeight = vbHeight - paddingTop - paddingBottom;
  const effectiveWidth = vbWidth - paddingX * 2;

  const values = data.map((d) => d.score);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  // Convert data points to SVG coordinate space
  const points = data.map((d, index) => {
    const x = paddingX + (index / (data.length - 1)) * effectiveWidth;
    const y = vbHeight - paddingBottom - ((d.score - minVal) / range) * effectiveHeight;
    return { x, y, data: d, index };
  });

  // Find min and max points
  let minPoint = points[0];
  let maxPoint = points[0];
  points.forEach((p) => {
    if (p.data.score < minPoint.data.score) minPoint = p;
    if (p.data.score > maxPoint.data.score) maxPoint = p;
  });

  const lastPoint = points[points.length - 1];

  // Build SVG path with smooth curve
  const createSmoothPath = (pts: { x: number; y: number }[]) => {
    if (pts.length < 2) return '';
    let path = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = i > 0 ? pts[i - 1] : pts[0];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = i != pts.length - 2 ? pts[i + 2] : p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return path;
  };

  const linePath = createSmoothPath(points);
  const areaPath = `${linePath} L ${lastPoint.x.toFixed(1)} ${vbHeight} L ${points[0].x.toFixed(1)} ${vbHeight} Z`;

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!interactive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const relativeX = Math.max(0, Math.min(1, mouseX / rect.width));
    const targetIndex = Math.round(relativeX * (points.length - 1));
    const closest = points[targetIndex];
    if (closest) {
      setHoveredPoint(closest.data);
      setHoverIndex(targetIndex);
    }
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
    setHoverIndex(null);
  };

  return (
    <div 
      id={id}
      className="relative w-full group select-none"
      style={{ width }}
    >
      {/* Floating Hover Tooltip */}
      {interactive && hoveredPoint && hoverIndex !== null && (
        <div 
          className="absolute -top-7 z-20 pointer-events-none transform -translate-x-1/2 bg-slate-950/95 border border-slate-700 text-white rounded-md px-1.5 py-0.5 text-[10px] font-mono shadow-xl flex items-center gap-1.5 whitespace-nowrap"
          style={{
            left: `${(points[hoverIndex].x / vbWidth) * 100}%`
          }}
        >
          <span className="text-slate-400 font-bold">{hoveredPoint.hour}:</span>
          <span className={`font-black ${trend === 'accelerating' ? 'text-rose-400' : 'text-emerald-400'}`}>
            {hoveredPoint.score} {unit}
          </span>
          {hoveredPoint.note && (
            <span className="text-[9px] text-slate-400 hidden sm:inline max-w-[120px] truncate">
              • {hoveredPoint.note}
            </span>
          )}
        </div>
      )}

      {/* SVG Canvas */}
      <svg
        viewBox={`0 0 ${vbWidth} ${vbHeight}`}
        className="w-full h-auto overflow-visible block"
        style={{ height }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={resolvedFill} stopOpacity="0.4" />
            <stop offset="60%" stopColor={resolvedFill} stopOpacity="0.1" />
            <stop offset="100%" stopColor={resolvedFill} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Shaded Area Below Line */}
        <path
          d={areaPath}
          fill={`url(#${gradientId})`}
          className="transition-opacity duration-300"
        />

        {/* Main Sparkline Stroke */}
        <path
          d={linePath}
          fill="none"
          stroke={resolvedStroke}
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="drop-shadow-sm"
        />

        {/* Min Point Marker */}
        {showMinMax && (
          <circle
            cx={minPoint.x}
            cy={minPoint.y}
            r="2"
            fill="#64748b"
            stroke="#0f172a"
            strokeWidth="1"
            className="opacity-70"
          >
            <title>Min: {minPoint.data.score} at {minPoint.data.hour}</title>
          </circle>
        )}

        {/* Max / Peak Point Marker */}
        {showMinMax && (
          <circle
            cx={maxPoint.x}
            cy={maxPoint.y}
            r="2.25"
            fill={resolvedStroke}
            stroke="#0f172a"
            strokeWidth="1"
            className="opacity-90"
          >
            <title>Peak: {maxPoint.data.score} at {maxPoint.data.hour}</title>
          </circle>
        )}

        {/* End / Current Value Point with Pulsing Ring */}
        {showCurrentDot && (
          <g>
            <circle
              cx={lastPoint.x}
              cy={lastPoint.y}
              r="4.5"
              fill={resolvedStroke}
              className="animate-ping opacity-40 origin-center"
            />
            <circle
              cx={lastPoint.x}
              cy={lastPoint.y}
              r="2.75"
              fill={resolvedStroke}
              stroke="#0f172a"
              strokeWidth="1.5"
            />
          </g>
        )}

        {/* Hover Crosshair Guideline */}
        {interactive && hoverIndex !== null && (
          <g>
            <line
              x1={points[hoverIndex].x}
              y1="0"
              x2={points[hoverIndex].x}
              y2={vbHeight}
              stroke="#94a3b8"
              strokeWidth="1"
              strokeDasharray="2 2"
              className="opacity-80"
            />
            <circle
              cx={points[hoverIndex].x}
              cy={points[hoverIndex].y}
              r="3.5"
              fill="#ffffff"
              stroke={resolvedStroke}
              strokeWidth="2"
            />
          </g>
        )}
      </svg>
    </div>
  );
};
