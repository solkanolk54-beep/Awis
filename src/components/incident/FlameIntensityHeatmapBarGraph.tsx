import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { 
  Flame, 
  Wind, 
  Droplets, 
  Thermometer, 
  Mountain, 
  Activity, 
  AlertTriangle, 
  RotateCcw, 
  Sliders, 
  Info,
  CheckCircle2,
  TrendingUp,
  ShieldAlert,
  BarChart3,
  Camera,
  Cpu,
  Radio,
  RadioTower,
  Send,
  FileDown,
  Video
} from 'lucide-react';
import { WildfireIncident, Language, DroneEdgeVisionTelemetry } from '../../types';
import { dispatchCellBroadcastAlert, CellBroadcastDispatchResult } from '../../services/cellBroadcastService';
import { generateExecutiveIncidentReport } from '../../services/incidentReportGenerator';

interface FlameIntensityHeatmapBarGraphProps {
  incident: WildfireIncident;
  currentLang: Language;
  onOpenFullSimulation?: () => void;
  liveDroneData?: DroneEdgeVisionTelemetry;
  onOpenLiveDroneStream?: () => void;
}

interface ProjectionTimeStep {
  hour: number;
  label: string;
  cumulativeAreaHa: number;
  hourlyGrowthHa: number;
  firelineIntensityKwM: number;
  flameLengthM: number;
  forwardSpeedKmH: number;
  containmentRating: 'Low' | 'Moderate' | 'High' | 'Extreme' | 'Critical';
  containmentRatingAr: string;
  heatColor: string;
  heatGradientId: string;
}

// Thermal heatmap color palette according to Byram's Fireline Intensity scale
export function getFlameIntensityColor(intensityKwM: number): {
  color: string;
  topColor: string;
  glowColor: string;
  label: string;
  labelAr: string;
} {
  if (intensityKwM < 800) {
    return {
      color: '#eab308', // amber-500
      topColor: '#fef08a', // yellow-200
      glowColor: 'rgba(234, 179, 8, 0.4)',
      label: 'Low (<800 kW/m)',
      labelAr: 'منخفض (<800 ك.واط/م)'
    };
  }
  if (intensityKwM < 1800) {
    return {
      color: '#f97316', // orange-500
      topColor: '#fed7aa', // orange-200
      glowColor: 'rgba(249, 115, 22, 0.45)',
      label: 'Moderate (800-1800 kW/m)',
      labelAr: 'متوسط (800-1800 ك.واط/م)'
    };
  }
  if (intensityKwM < 3500) {
    return {
      color: '#ef4444', // red-500
      topColor: '#fecaca', // red-200
      glowColor: 'rgba(239, 68, 68, 0.5)',
      label: 'High (1800-3500 kW/m)',
      labelAr: 'مرتفع (1800-3500 ك.واط/م)'
    };
  }
  if (intensityKwM < 5500) {
    return {
      color: '#b91c1c', // red-700
      topColor: '#f87171', // red-400
      glowColor: 'rgba(185, 28, 28, 0.6)',
      label: 'Extreme (3500-5500 kW/m)',
      labelAr: 'شديد (3500-5500 ك.واط/م)'
    };
  }
  return {
    color: '#7f1d1d', // red-950 / purple-red
    topColor: '#ef4444', // crimson
    glowColor: 'rgba(127, 29, 29, 0.75)',
    label: 'Critical (>5500 kW/m)',
    labelAr: 'حرج للغاية (>5500 ك.واط/م)'
  };
}

export const FlameIntensityHeatmapBarGraph: React.FC<FlameIntensityHeatmapBarGraphProps> = ({
  incident,
  currentLang,
  onOpenFullSimulation,
  liveDroneData,
  onOpenLiveDroneStream
}) => {
  const isAr = currentLang === 'ar';
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Cell Broadcast State
  const [isDispatchingAlert, setIsDispatchingAlert] = useState(false);
  const [lastDispatchedAlert, setLastDispatchedAlert] = useState<CellBroadcastDispatchResult | null>(null);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfSuccessMessage, setPdfSuccessMessage] = useState(false);

  // Check if live drone telemetry is available and calibrated
  const isDroneLive = Boolean(
    liveDroneData && 
    liveDroneData.visionDetections && 
    (liveDroneData.visionDetections.measuredFlameHeightMeters > 0 || liveDroneData.visionDetections.peakRadiometricTempC > 0)
  );

  // Dynamic simulation parameters initialized with incident telemetry
  const [windSpeed, setWindSpeed] = useState<number>(incident.windSpeedKmH || 32);
  const [humidity, setHumidity] = useState<number>(incident.humidityPercent || 22);
  const [temperature, setTemperature] = useState<number>(incident.temperatureC || 36);
  const [metricMode, setMetricMode] = useState<'cumulative' | 'growthRate' | 'intensity'>('cumulative');
  const [hoveredStep, setHoveredStep] = useState<ProjectionTimeStep | null>(null);
  const [showControls, setShowControls] = useState<boolean>(false);

  // Synchronize when incident changes
  useEffect(() => {
    setWindSpeed(incident.windSpeedKmH || 32);
    setHumidity(incident.humidityPercent || 22);
    setTemperature(incident.temperatureC || 36);
  }, [incident.id, incident.windSpeedKmH, incident.humidityPercent, incident.temperatureC]);

  const isCustomParams = 
    windSpeed !== incident.windSpeedKmH || 
    humidity !== incident.humidityPercent ||
    temperature !== incident.temperatureC;

  const resetToIncidentTelemetry = () => {
    setWindSpeed(incident.windSpeedKmH || 32);
    setHumidity(incident.humidityPercent || 22);
    setTemperature(incident.temperatureC || 36);
  };

  // Physical Rothermel & Byram Fire Growth Computation based on wind & humidity
  // OVERRIDE DIRECTIVE: When isDroneLive is true, measured drone telemetry overrides theoretical models
  const timeSteps = useMemo<ProjectionTimeStep[]>(() => {
    const initialArea = Math.max(0.5, incident.estimatedBurnedHectares || 5);
    const slope = incident.terrainSlopeDegrees || 20;

    // 1. Effective Fuel Moisture Content (FMC)
    const effectiveFMC = Math.max(4, Math.min(35, 
      2.8 + 0.30 * humidity - 0.11 * Math.max(0, temperature - 20)
    ));
    const moistureRatio = effectiveFMC / 26; // extinction moisture ~26%
    const fuelDamping = Math.max(0.08, 1 - 2.59 * moistureRatio + 5.11 * Math.pow(moistureRatio, 2) - 3.52 * Math.pow(moistureRatio, 3));

    // 2. Wind multiplier
    const windMps = (Math.max(1, windSpeed) * 1000) / 3600;
    const windMultiplier = 1.0 + Math.pow(windMps / 6.5, 1.45);

    // 3. Slope multiplier
    const slopeRad = (Math.min(45, Math.max(0, slope)) * Math.PI) / 180;
    const slopeMultiplier = 1.0 + 5.275 * Math.pow(Math.tan(slopeRad), 2) * 0.5 + Math.sin(slopeRad) * 0.85;

    // 4. Baseline forward spread speed
    let baseRateMMin = 3.4 * fuelDamping * windMultiplier * slopeMultiplier;
    
    // If live drone telemetry measured smoke velocity or flame spread, adjust base rate
    if (isDroneLive && liveDroneData?.visionDetections.smokeVelocityMps) {
      const droneWindInfluence = 1 + (liveDroneData.visionDetections.smokeVelocityMps / 15);
      baseRateMMin = baseRateMMin * 0.7 + (baseRateMMin * droneWindInfluence * 0.3);
    }
    const forwardSpeedKmH = (baseRateMMin * 60) / 1000;

    // Byram's Fireline Intensity (kW/m): I = H * w * R
    // When live drone data is present, invert Byram's formula from measured flame height or radiometric core temp:
    // Theoretical Byram: L = 0.0775 * I^0.46 => I = (L / 0.0775)^(1 / 0.46)
    let baseIntensityKwM: number;
    if (isDroneLive && liveDroneData?.visionDetections.measuredFlameHeightMeters) {
      const measuredHeight = liveDroneData.visionDetections.measuredFlameHeightMeters;
      // Inverted Byram: I = (L / 0.0775)^2.174
      const droneDerivedIntensity = Math.round(Math.pow(measuredHeight / 0.0775, 1 / 0.46));
      // Calibrate with radiometric core temperature (Stefan-Boltzmann radiative proxy)
      const coreTempFactor = liveDroneData.visionDetections.peakRadiometricTempC > 600 ? 1.25 : 1.0;
      baseIntensityKwM = Math.round(droneDerivedIntensity * coreTempFactor);
    } else {
      const heatContent = 18800; // kJ/kg for Mediterranean pine/oak maquis
      const fuelLoadKgM2 = 1.30;
      const rosMps = baseRateMMin / 60;
      baseIntensityKwM = Math.round(heatContent * fuelLoadKgM2 * rosMps);
    }

    // Discrete key horizons to project over 24 hours
    const hours = [1, 2, 3, 4, 6, 8, 10, 12, 16, 20, 24];
    let previousCumulativeArea = initialArea;

    return hours.map((h, index) => {
      // Non-linear acceleration factor representing fire front expansion and spot fires
      const expansionFactor = 1.0 + 0.15 * Math.log10(h + 1);
      const currentSpeedKmH = forwardSpeedKmH * expansionFactor;

      // Area growth calculation (elliptical growth formula)
      const aspect = Math.max(1.2, 1.0 + 0.12 * Math.pow(windSpeed, 0.8));
      const majorKm = currentSpeedKmH * h;
      const minorKm = majorKm / aspect;
      const ellipticalGrowthHa = Math.PI * (majorKm / 2) * (minorKm / 2) * 100;
      const cumulativeAreaHa = Number((initialArea + ellipticalGrowthHa).toFixed(1));

      // Hourly growth rate for this interval
      const hoursSinceLast = index === 0 ? h : (h - hours[index - 1]);
      const hourlyGrowthHa = Number(((cumulativeAreaHa - previousCumulativeArea) / hoursSinceLast).toFixed(1));
      previousCumulativeArea = cumulativeAreaHa;

      // Dynamic flame intensity evolution with wind gusts and diurnal factor
      const diurnalFactor = (h >= 4 && h <= 14) ? 1.15 : 0.92;
      const stepIntensityKwM = Math.round(baseIntensityKwM * diurnalFactor * (1 + 0.03 * Math.min(10, h)));

      // Byram Flame Length: L = 0.0775 * I^0.46 (meters) or calibrated with drone
      let flameLengthM: number;
      if (isDroneLive && liveDroneData?.visionDetections.measuredFlameHeightMeters && index === 0) {
        flameLengthM = liveDroneData.visionDetections.measuredFlameHeightMeters;
      } else {
        flameLengthM = Number((0.0775 * Math.pow(stepIntensityKwM, 0.46)).toFixed(1));
      }

      // Rating classification
      let containmentRating: ProjectionTimeStep['containmentRating'] = 'Moderate';
      let containmentRatingAr = 'متوسط';
      if (stepIntensityKwM < 800) {
        containmentRating = 'Low';
        containmentRatingAr = 'منخفض';
      } else if (stepIntensityKwM < 1800) {
        containmentRating = 'Moderate';
        containmentRatingAr = 'متوسط';
      } else if (stepIntensityKwM < 3500) {
        containmentRating = 'High';
        containmentRatingAr = 'مرتفع';
      } else if (stepIntensityKwM < 5500) {
        containmentRating = 'Extreme';
        containmentRatingAr = 'شديد الخطورة';
      } else {
        containmentRating = 'Critical';
        containmentRatingAr = 'حرج للغاية (عواصف نارية)';
      }

      const colorData = getFlameIntensityColor(stepIntensityKwM);

      return {
        hour: h,
        label: `+${h}h`,
        cumulativeAreaHa,
        hourlyGrowthHa,
        firelineIntensityKwM: stepIntensityKwM,
        flameLengthM,
        forwardSpeedKmH: Number(currentSpeedKmH.toFixed(2)),
        containmentRating,
        containmentRatingAr,
        heatColor: colorData.color,
        heatGradientId: `flame-gradient-step-${h}`
      };
    });
  }, [incident, windSpeed, humidity, temperature, isDroneLive, liveDroneData]);

  // Overall summary metrics
  const maxIntensity = useMemo(() => {
    return Math.max(...timeSteps.map(s => s.firelineIntensityKwM));
  }, [timeSteps]);

  const finalAreaHa = useMemo(() => {
    return timeSteps[timeSteps.length - 1]?.cumulativeAreaHa || 0;
  }, [timeSteps]);

  const expansionRatio = useMemo(() => {
    const init = incident.estimatedBurnedHectares || 1;
    return Number((finalAreaHa / init).toFixed(1));
  }, [finalAreaHa, incident.estimatedBurnedHectares]);

  // Render D3 Visualization
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous drawing

    const containerWidth = 720;
    const containerHeight = 240;
    const margin = { top: 28, right: 24, bottom: 42, left: 56 };
    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;

    // SVG Defs for thermal heatmap bar gradients and filters
    const defs = svg.append('defs');

    // Create a linear gradient for each time step reflecting flame intensity
    timeSteps.forEach((step) => {
      const colorData = getFlameIntensityColor(step.firelineIntensityKwM);
      const grad = defs
        .append('linearGradient')
        .attr('id', step.heatGradientId)
        .attr('x1', '0%')
        .attr('y1', '100%') // bottom
        .attr('x2', '0%')
        .attr('y2', '0%'); // top (flame head)

      grad.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', '#1e1b4b') // deep coal/dark base
        .attr('stop-opacity', 0.95);

      grad.append('stop')
        .attr('offset', '45%')
        .attr('stop-color', colorData.color)
        .attr('stop-opacity', 0.85);

      grad.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', colorData.topColor)
        .attr('stop-opacity', 1);
    });

    // Main Chart Group
    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3
      .scaleBand()
      .domain(timeSteps.map(d => d.label))
      .range([0, width])
      .padding(0.24);

    // Compute metric value according to current active mode
    const getMetricValue = (d: ProjectionTimeStep) => {
      if (metricMode === 'growthRate') return d.hourlyGrowthHa;
      if (metricMode === 'intensity') return d.firelineIntensityKwM;
      return d.cumulativeAreaHa;
    };

    const maxMetricValue = Math.max(10, d3.max(timeSteps, getMetricValue) || 10);
    const yScale = d3
      .scaleLinear()
      .domain([0, maxMetricValue * 1.15])
      .nice()
      .range([height, 0]);

    // Horizontal Grid Lines
    g.append('g')
      .attr('class', 'grid-lines')
      .call(
        d3.axisLeft(yScale)
          .tickSize(-width)
          .tickFormat(() => '')
      )
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('.tick line')
        .attr('stroke', '#334155')
        .attr('stroke-dasharray', '3,3')
        .attr('stroke-opacity', 0.6)
      );

    // X Axis
    const xAxisGroup = g
      .append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale).tickSize(5));

    xAxisGroup.select('.domain')
      .attr('stroke', '#475569')
      .attr('stroke-width', 1.2);

    xAxisGroup.selectAll('.tick line')
      .attr('stroke', '#64748b');

    xAxisGroup.selectAll('.tick text')
      .attr('fill', '#94a3b8')
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .attr('font-family', 'monospace')
      .attr('dy', '12px');

    // Y Axis
    const yAxisGroup = g
      .append('g')
      .call(
        d3.axisLeft(yScale)
          .ticks(5)
          .tickFormat(d => {
            const num = Number(d);
            if (metricMode === 'intensity') {
              return num >= 1000 ? `${(num / 1000).toFixed(1)}k` : `${num}`;
            }
            return `${num}`;
          })
      );

    yAxisGroup.select('.domain').remove();

    yAxisGroup.selectAll('.tick line')
      .attr('stroke', '#475569');

    yAxisGroup.selectAll('.tick text')
      .attr('fill', '#94a3b8')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace')
      .attr('dx', '-4px');

    // Y-Axis Unit Label
    const yUnit = metricMode === 'intensity' ? 'kW/m' : metricMode === 'growthRate' ? 'ha / h' : 'Hectares (ha)';
    g.append('text')
      .attr('x', -8)
      .attr('y', -12)
      .attr('fill', '#f59e0b')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace')
      .attr('font-weight', 'bold')
      .text(`▲ ${yUnit}`);

    // Critical Containment Threshold line for Flame Intensity (2000 kW/m threshold or equivalent)
    if (metricMode === 'intensity') {
      const thresholdY = yScale(2000);
      if (thresholdY >= 0 && thresholdY <= height) {
        g.append('line')
          .attr('x1', 0)
          .attr('x2', width)
          .attr('y1', thresholdY)
          .attr('y2', thresholdY)
          .attr('stroke', '#ef4444')
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '4,4')
          .attr('opacity', 0.85);

        g.append('text')
          .attr('x', width - 4)
          .attr('y', thresholdY - 4)
          .attr('text-anchor', 'end')
          .attr('fill', '#f87171')
          .attr('font-size', '9px')
          .attr('font-family', 'monospace')
          .attr('font-weight', 'bold')
          .text(isAr ? 'حد السيطرة اليدوية المباشرة (2000 ك.واط/م)' : 'Direct Attack Threshold (2,000 kW/m)');
      }
    }

    // Heat Map Bars Group
    const barGroups = g
      .selectAll('.flame-bar-group')
      .data(timeSteps)
      .enter()
      .append('g')
      .attr('class', 'flame-bar-group')
      .attr('transform', d => `translate(${xScale(d.label) || 0}, 0)`)
      .style('cursor', 'pointer');

    // Background Bar Track
    barGroups
      .append('rect')
      .attr('class', 'bar-track')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', xScale.bandwidth())
      .attr('height', height)
      .attr('fill', '#0f172a')
      .attr('opacity', 0.4)
      .attr('rx', 3);

    // Heat Map Value Bar
    const bars = barGroups
      .append('rect')
      .attr('class', 'heat-bar')
      .attr('x', 0)
      .attr('y', height) // start at bottom for transition
      .attr('width', xScale.bandwidth())
      .attr('height', 0)
      .attr('fill', d => `url(#${d.heatGradientId})`)
      .attr('stroke', d => getFlameIntensityColor(d.firelineIntensityKwM).color)
      .attr('stroke-width', 1)
      .attr('rx', 4);

    // Animate Bar Growing Upwards
    bars
      .transition()
      .duration(750)
      .ease(d3.easeCubicOut)
      .attr('y', d => yScale(getMetricValue(d)))
      .attr('height', d => height - yScale(getMetricValue(d)));

    // Glowing Flame Front Top Cap (highlight at the peak of each bar)
    barGroups
      .append('rect')
      .attr('class', 'flame-front-cap')
      .attr('x', 1)
      .attr('y', height)
      .attr('width', Math.max(2, xScale.bandwidth() - 2))
      .attr('height', 3)
      .attr('fill', d => getFlameIntensityColor(d.firelineIntensityKwM).topColor)
      .attr('rx', 1.5)
      .transition()
      .duration(750)
      .ease(d3.easeCubicOut)
      .attr('y', d => yScale(getMetricValue(d)));

    // Text Values on top of bars
    barGroups
      .append('text')
      .attr('class', 'bar-label')
      .attr('x', xScale.bandwidth() / 2)
      .attr('y', d => yScale(getMetricValue(d)) - 5)
      .attr('text-anchor', 'middle')
      .attr('fill', '#cbd5e1')
      .attr('font-size', '9.5px')
      .attr('font-family', 'monospace')
      .attr('font-weight', 'bold')
      .text(d => {
        const val = getMetricValue(d);
        if (metricMode === 'intensity') {
          return val >= 1000 ? `${(val / 1000).toFixed(1)}k` : `${val}`;
        }
        return `${val}`;
      })
      .attr('opacity', 0)
      .transition()
      .delay(450)
      .duration(300)
      .attr('opacity', 1);

    // Interactive Hover Listeners
    barGroups
      .on('mouseenter', function (event, d) {
        setHoveredStep(d);
        d3.select(this)
          .select('.heat-bar')
          .transition()
          .duration(150)
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 2);
      })
      .on('mouseleave', function (event, d) {
        setHoveredStep(null);
        d3.select(this)
          .select('.heat-bar')
          .transition()
          .duration(150)
          .attr('stroke', getFlameIntensityColor(d.firelineIntensityKwM).color)
          .attr('stroke-width', 1);
      });

  }, [timeSteps, metricMode, isAr]);

  return (
    <div 
      id="flame-intensity-heatmap-card"
      className="p-4 rounded-xl bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 border border-orange-500/40 shadow-xl space-y-4"
    >
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-600/30 text-orange-400 border border-orange-500/40 shadow-inner">
            <Flame className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-1.5">
                <span>{isAr ? 'مخطط شدة اللهب الحراري وتوسع الحريق (D3 Flame Intensity)' : 'D3 Flame Intensity Heat Map & Fire Growth'}</span>
              </h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/40 uppercase">
                D3 Physical Model
              </span>
              {isDroneLive && (
                <span 
                  id="drone-self-calibrated-badge"
                  className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.35)] flex items-center gap-1.5 animate-pulse"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <Camera className="w-3 h-3 text-emerald-300" />
                  <span>{isAr ? 'معاير ذاتياً بكاميرا الدرون (Self-Calibrated)' : 'Self-Calibrated (Live Drone UAV)'}</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {isDroneLive 
                ? (isAr 
                    ? `تم ضبط نموذج بيرام وروثرميل بالقيم المقاسة فعلياً: ارتفاع اللهب (${liveDroneData?.visionDetections.measuredFlameHeightMeters}م) وحرارة الإشعاع (${liveDroneData?.visionDetections.peakRadiometricTempC}°C).` 
                    : `Calibrated with real-time drone vision: flame height (${liveDroneData?.visionDetections.measuredFlameHeightMeters}m) & radiometric core temp (${liveDroneData?.visionDetections.peakRadiometricTempC}°C).`)
                : (isAr 
                    ? 'محاكاة ديناميكية لنمو رقعة الحريق وشدة طاقة اللهب خلال 24 ساعة حسب سرعة الرياح ورطوبة الغطاء النباتي.'
                    : 'Projects fire front expansion and Byram fireline intensity over 24h, driven by wind velocity and fuel moisture.')}
            </p>
          </div>
        </div>

        {/* View Mode & Tuning Controls */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Mode Switcher */}
          <div className="flex rounded-lg bg-slate-950 border border-slate-800 p-0.5 text-[11px] font-mono">
            <button
              id="flame-metric-cumulative-btn"
              onClick={() => setMetricMode('cumulative')}
              className={`px-2.5 py-1 rounded transition cursor-pointer ${
                metricMode === 'cumulative'
                  ? 'bg-orange-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {isAr ? 'المساحة (ha)' : 'Area (ha)'}
            </button>
            <button
              id="flame-metric-growth-btn"
              onClick={() => setMetricMode('growthRate')}
              className={`px-2.5 py-1 rounded transition cursor-pointer ${
                metricMode === 'growthRate'
                  ? 'bg-orange-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {isAr ? 'السرعة (ha/h)' : 'Rate (ha/h)'}
            </button>
            <button
              id="flame-metric-intensity-btn"
              onClick={() => setMetricMode('intensity')}
              className={`px-2.5 py-1 rounded transition cursor-pointer ${
                metricMode === 'intensity'
                  ? 'bg-orange-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {isAr ? 'الشدة (kW/m)' : 'Intensity (kW/m)'}
            </button>
          </div>

          {/* Toggle Interactive Tuning Drawer */}
          <button
            id="flame-toggle-tuning-btn"
            onClick={() => setShowControls(!showControls)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              showControls || isCustomParams
                ? 'bg-amber-950/60 border-amber-500 text-amber-300'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{isAr ? 'معايير الرياح والرطوبة' : 'Wind & Humidity'}</span>
            {isCustomParams && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            )}
          </button>
        </div>
      </div>

      {/* Dynamic Environmental Parameters Tuning Bar (Collapsible / Expandable) */}
      {showControls && (
        <div 
          id="flame-intensity-tuning-panel"
          className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              {isAr ? 'حساسية المتغيرات البيئية الفورية (What-If Weather Parameters)' : 'What-If Incident Parameter Testing'}
            </span>
            {isCustomParams && (
              <button
                onClick={resetToIncidentTelemetry}
                className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer font-mono"
              >
                <RotateCcw className="w-3 h-3" />
                {isAr ? 'إعادة ضبط لمعطيات الحريق الحية' : 'Reset to Incident Telemetry'}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            {/* Wind Speed Control */}
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1">
                  <Wind className="w-3.5 h-3.5 text-sky-400" />
                  {isAr ? 'سرعة الرياح' : 'Wind Velocity'}
                </span>
                <span className="font-mono font-bold text-sky-300">
                  {windSpeed} km/h
                </span>
              </div>
              <input
                id="flame-wind-slider"
                type="range"
                min="5"
                max="85"
                step="1"
                value={windSpeed}
                onChange={(e) => setWindSpeed(Number(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>5 km/h</span>
                <span className="text-sky-400">{incident.windSpeedKmH} (Live)</span>
                <span>85 km/h</span>
              </div>
            </div>

            {/* Relative Humidity Control */}
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1">
                  <Droplets className="w-3.5 h-3.5 text-emerald-400" />
                  {isAr ? 'الرطوبة النسبية' : 'Relative Humidity'}
                </span>
                <span className="font-mono font-bold text-emerald-300">
                  {humidity}% RH
                </span>
              </div>
              <input
                id="flame-humidity-slider"
                type="range"
                min="5"
                max="80"
                step="1"
                value={humidity}
                onChange={(e) => setHumidity(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>5% (Arid)</span>
                <span className="text-emerald-400">{incident.humidityPercent}% (Live)</span>
                <span>80% (Damp)</span>
              </div>
            </div>

            {/* Temperature Control */}
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1">
                  <Thermometer className="w-3.5 h-3.5 text-orange-400" />
                  {isAr ? 'درجة الحرارة' : 'Ambient Temperature'}
                </span>
                <span className="font-mono font-bold text-orange-300">
                  {temperature}°C
                </span>
              </div>
              <input
                id="flame-temperature-slider"
                type="range"
                min="18"
                max="50"
                step="1"
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                className="w-full accent-orange-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>18°C</span>
                <span className="text-orange-400">{incident.temperatureC}°C (Live)</span>
                <span>50°C</span>
              </div>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] text-slate-400">{isAr ? 'أنماط جاهزة:' : 'Quick Presets:'}</span>
            <button
              onClick={() => {
                setWindSpeed(incident.windSpeedKmH || 35);
                setHumidity(incident.humidityPercent || 20);
                setTemperature(incident.temperatureC || 38);
              }}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 font-mono cursor-pointer"
            >
              {isAr ? 'معطيات الحريق الحالية' : 'Live Telemetry'}
            </button>
            <button
              onClick={() => {
                setWindSpeed(58);
                setHumidity(12);
                setTemperature(43);
              }}
              className="px-2 py-0.5 rounded bg-red-950/60 hover:bg-red-900/80 border border-red-800 text-[11px] text-red-300 font-mono cursor-pointer"
            >
              {isAr ? 'عاصفة سيروكو جافة (58km/h, 12%)' : 'Sirocco Extreme (58km/h, 12%)'}
            </button>
            <button
              onClick={() => {
                setWindSpeed(16);
                setHumidity(55);
                setTemperature(26);
              }}
              className="px-2 py-0.5 rounded bg-sky-950/60 hover:bg-sky-900/80 border border-sky-800 text-[11px] text-sky-300 font-mono cursor-pointer"
            >
              {isAr ? 'انقلاب ليلي رطب (16km/h, 55%)' : 'Night Inversion (16km/h, 55%)'}
            </button>
          </div>
        </div>
      )}

      {/* Main D3 Chart Display Area */}
      <div className="relative w-full bg-slate-950/60 rounded-xl border border-slate-800/80 p-2 overflow-hidden">
        {/* SVG Container */}
        <div className="w-full overflow-x-auto">
          <svg
            id="flame-intensity-d3-svg"
            ref={svgRef}
            viewBox="0 0 720 240"
            className="w-full h-auto min-w-[580px] select-none"
          />
        </div>

        {/* Hovered Time Step Floating Detail Card */}
        {hoveredStep && (
          <div 
            id="flame-bar-tooltip-popup"
            className="absolute top-3 right-3 sm:right-6 max-w-xs p-3 rounded-xl bg-slate-900/95 border border-amber-500/50 shadow-2xl backdrop-blur-md pointer-events-none text-xs space-y-1.5 transition-all z-20"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <span className="font-bold text-white font-mono flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                Horizon: {hoveredStep.label} ({hoveredStep.hour} {isAr ? 'ساعة' : 'hours'})
              </span>
              <span 
                className="px-2 py-0.5 rounded text-[10px] font-mono font-bold"
                style={{ 
                  backgroundColor: `${getFlameIntensityColor(hoveredStep.firelineIntensityKwM).glowColor}`,
                  color: getFlameIntensityColor(hoveredStep.firelineIntensityKwM).topColor 
                }}
              >
                {isAr ? hoveredStep.containmentRatingAr : hoveredStep.containmentRating}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div>
                <span className="text-slate-400 block text-[10px]">{isAr ? 'المساحة التراكمية' : 'Cumulative Area'}</span>
                <span className="text-white font-bold">{hoveredStep.cumulativeAreaHa} ha</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">{isAr ? 'معدل التوسع' : 'Growth Velocity'}</span>
                <span className="text-amber-300 font-bold">+{hoveredStep.hourlyGrowthHa} ha/h</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">{isAr ? 'شدة اللهب (بيرام)' : 'Fireline Intensity'}</span>
                <span className="text-red-400 font-bold">{hoveredStep.firelineIntensityKwM.toLocaleString()} kW/m</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">{isAr ? 'طول السنة اللهب' : 'Flame Length'}</span>
                <span className="text-orange-300 font-bold">{hoveredStep.flameLengthM} meters</span>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800">
              {isAr ? 'سرعة الجبهة الأمامية:' : 'Forward Front Speed:'} <strong className="text-sky-300">{hoveredStep.forwardSpeedKmH} km/h</strong>
            </div>
          </div>
        )}
      </div>

      {/* Heat Map Intensity Scale Legend & Summary Footprint */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 pt-1 text-xs">
        {/* Metric 1: Peak Intensity */}
        <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-mono">{isAr ? 'أعلى شدة إشعاعية' : 'Peak Flame Intensity'}</span>
            <span className="text-sm font-bold text-red-400 font-mono">{maxIntensity.toLocaleString()} kW/m</span>
          </div>
          <Flame className="w-5 h-5 text-red-500 shrink-0" />
        </div>

        {/* Metric 2: Estimated 24h Area */}
        <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-mono">{isAr ? 'المساحة المتوقعة (+24h)' : '24h Projected Extent'}</span>
            <span className="text-sm font-bold text-amber-400 font-mono">{finalAreaHa} ha</span>
          </div>
          <TrendingUp className="w-5 h-5 text-amber-500 shrink-0" />
        </div>

        {/* Metric 3: Growth Multiplier */}
        <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-mono">{isAr ? 'معامل التضاعف' : 'Expansion Ratio'}</span>
            <span className="text-sm font-bold text-orange-400 font-mono">×{expansionRatio}</span>
          </div>
          <Activity className="w-5 h-5 text-orange-500 shrink-0" />
        </div>

        {/* Metric 4: Direct Launch Burn-Rate Simulator */}
        {onOpenFullSimulation && (
          <button
            id="flame-open-full-sim-btn"
            onClick={onOpenFullSimulation}
            className="p-2.5 rounded-lg bg-gradient-to-r from-orange-600/30 to-red-600/30 hover:from-orange-600/40 hover:to-red-600/40 border border-orange-500/40 text-orange-200 flex items-center justify-between font-semibold transition cursor-pointer"
          >
            <div>
              <span className="text-[10px] text-orange-300 block font-mono">{isAr ? 'المحاكاة ثلاثية الأبعاد' : 'Full Isochrone Model'}</span>
              <span className="text-xs font-bold text-white">{isAr ? 'فتح محاكي D3 الكامل' : 'Open D3 Simulator'}</span>
            </div>
            <BarChart3 className="w-4 h-4 text-orange-400" />
          </button>
        )}
      </div>

      {/* TACTICAL COMMAND BAR: G-04 EMERGENCY CELL BROADCAST & G-05 LIVE DRONE STREAM & SOVEREIGN PDF REPORT */}
      <div 
        id="flame-tactical-command-actions"
        className="p-3 rounded-xl bg-gradient-to-r from-red-950/40 via-slate-900 to-emerald-950/30 border border-red-500/40 flex flex-wrap items-center justify-between gap-3 shadow-lg"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-red-600/20 text-red-400 border border-red-500/40 shadow-inner">
            <RadioTower className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white uppercase font-mono tracking-wide">
                {isAr ? 'منظومة الاستجابة والقيادة المركزية L3' : 'Command Tactical Response (L3)'}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 font-bold">
                G-04 / G-05 ACTIVATED
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {isAr 
                ? 'إطلاق أوامر الإخلاء الخلوي الميداني CAP، متابعة تدفق كاميرات الدرون الحية، واستخراج التقرير السيادي الموثق.' 
                : 'Broadcast instant CAP evacuation alerts via BTS towers, open live drone video player, and generate sovereign dossier.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Action 1: G-04 Early Evacuation Cell Broadcast Button */}
          <button
            id="flame-dispatch-cell-broadcast-btn"
            onClick={async () => {
              setIsDispatchingAlert(true);
              try {
                const res = await dispatchCellBroadcastAlert(incident);
                setLastDispatchedAlert(res);
                setShowAlertModal(true);
              } catch (err) {
                console.error('Cell broadcast dispatch error', err);
              } finally {
                setIsDispatchingAlert(false);
              }
            }}
            disabled={isDispatchingAlert}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-lg shadow-red-950/50 border border-red-500/50 disabled:opacity-50"
            title={isAr ? 'إصدار تنبيه إخلاء مبكر فوري عبر أبراج الاتصالات' : 'Issue immediate early evacuation cell broadcast alert'}
          >
            <Radio className={`w-4 h-4 ${isDispatchingAlert ? 'animate-spin' : 'animate-ping'}`} />
            <span>
              {isDispatchingAlert
                ? (isAr ? 'جارٍ البث الخلوي...' : 'Broadcasting CAP Alert...')
                : (isAr ? 'إصدار تنبيه إخلاء مبكر (Cell Broadcast)' : 'Issue Early Evacuation Alert')}
            </span>
            <span className="text-[9px] font-mono font-black px-1.5 py-0.5 rounded bg-black/40 text-rose-200">
              CAP v1.2
            </span>
          </button>

          {/* Action 2: G-05 Live Drone Stream Player Button */}
          {onOpenLiveDroneStream && (
            <button
              id="flame-open-drone-stream-btn"
              onClick={onOpenLiveDroneStream}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-950/50 border border-emerald-500/50"
              title={isAr ? 'فتح النافذة الحية لبث فيديو كاميرات الدرون' : 'Open real-time drone RTSP / WebRTC video stream'}
            >
              <Video className="w-4 h-4 text-emerald-200 animate-pulse" />
              <span>{isAr ? 'بث فيديو الدرون المباشر' : 'Drone Live Stream'}</span>
              <span className="text-[9px] font-mono font-black px-1.5 py-0.5 rounded bg-black/40 text-emerald-200">
                1080p
              </span>
            </button>
          )}

          {/* Action 3: Sovereign Executive Incident PDF Report Generator */}
          <button
            id="flame-generate-executive-report-btn"
            onClick={() => {
              setIsGeneratingPdf(true);
              try {
                generateExecutiveIncidentReport(
                  {
                    incident,
                    droneTelemetry: liveDroneData,
                    commandingOfficer: 'COLONEL B. MUSTAPHA (L3 COMMAND)',
                    securityClassification: 'SECRET-DEFENSE // CONFIDENTIEL'
                  },
                  currentLang
                );
                setPdfSuccessMessage(true);
                setTimeout(() => setPdfSuccessMessage(false), 4500);
              } catch (err) {
                console.error('Failed to generate sovereign PDF', err);
              } finally {
                setIsGeneratingPdf(false);
              }
            }}
            disabled={isGeneratingPdf}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer border border-slate-700 shadow-md"
            title={isAr ? 'توليد تقرير رسمي تكتيكي للقيادة العليا (PDF)' : 'Generate Sovereign Executive PDF Intelligence Report'}
          >
            <FileDown className="w-4 h-4 text-amber-400" />
            <span>
              {pdfSuccessMessage
                ? (isAr ? '✓ تم تنزيل التقرير' : '✓ Dossier Downloaded')
                : isGeneratingPdf
                ? (isAr ? 'جارٍ الإنشاء...' : 'Generating PDF...')
                : (isAr ? 'تقرير القيادة العليا (PDF)' : 'Sovereign PDF Report')}
            </span>
          </button>
        </div>
      </div>

      {/* Dispatched Cell Broadcast Result Modal / Overlay */}
      {showAlertModal && lastDispatchedAlert && (
        <div 
          id="cell-broadcast-confirmation-overlay"
          onClick={() => setShowAlertModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm cursor-pointer animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-xl bg-slate-900 border border-red-500 rounded-2xl shadow-2xl p-5 space-y-4 cursor-default text-slate-200"
          >
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500 flex items-center justify-center text-red-400">
                  <RadioTower className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{isAr ? 'تم إرسال بث الطوارئ الخلوي بنجاح (CAP v1.2)' : 'Emergency Cell Broadcast Dispatched'}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                      ACKNOWLEDGED
                    </span>
                  </h4>
                  <span className="text-xs text-slate-400 font-mono">
                    REF: {lastDispatchedAlert.dispatchId} | {new Date().toLocaleTimeString()}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowAlertModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Broadcast Target Specs */}
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400">{isAr ? 'النطاق الجغرافي الخطر (Hazard Bounding Box):' : 'Hazard Bounding Box:'}</span>
                <span className="font-mono text-amber-300 font-bold">
                  {lastDispatchedAlert.hazardArea.minLat}°N - {lastDispatchedAlert.hazardArea.maxLat}°N
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400">{isAr ? 'الولاية والبلديات المستهدفة:' : 'Targeted Wilaya & Communes:'}</span>
                <span className="font-bold text-white">
                  {isAr ? lastDispatchedAlert.targetWilayaAr : lastDispatchedAlert.targetWilaya} ({lastDispatchedAlert.affectedCommunes.join(', ')})
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400">{isAr ? 'السكان المتوقع استقبالهم للإنذار:' : 'Estimated Affected Population:'}</span>
                <span className="font-mono text-red-400 font-black text-sm">
                  ~{lastDispatchedAlert.totalEstimatedRecipients.toLocaleString()} {isAr ? 'مواطن' : 'Citizens'}
                </span>
              </div>
            </div>

            {/* Telecom Providers Handshake Status */}
            <div>
              <span className="text-xs font-bold text-slate-300 block mb-2">
                {isAr ? 'حالة أبراج الاتصالات المتعاملة (Telecom BTS Relays):' : 'Telecom Operators Relay Status:'}
              </span>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {lastDispatchedAlert.telecomProviders.map((provider) => (
                  <div key={provider.provider} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-center">
                    <span className="font-bold text-white block">{provider.provider}</span>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold block mt-0.5">
                      ✓ {provider.towersAlerted} BTS Towers
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono block">
                      ~{provider.subscribersReachedEstimated.toLocaleString()} Users ({provider.latencyMs}ms)
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* CAP Alert Text Content */}
            <div className="p-3 rounded-lg bg-red-950/30 border border-red-500/40 text-xs space-y-1">
              <div className="font-bold text-red-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span>{isAr ? lastDispatchedAlert.capAlertMessage.titleAr : lastDispatchedAlert.capAlertMessage.titleEn}</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                {isAr ? lastDispatchedAlert.capAlertMessage.bodyAr : lastDispatchedAlert.capAlertMessage.bodyEn}
              </p>
              <p className="text-amber-300 font-bold text-[11px] pt-1">
                {isAr ? lastDispatchedAlert.capAlertMessage.instructionAr : lastDispatchedAlert.capAlertMessage.instructionEn}
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowAlertModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer"
              >
                {isAr ? 'إغلاق نافذة التأكيد' : 'Dismiss Confirmation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Byram Heat Map Color Scale Legend Strip */}
      <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-slate-400">
        <span className="font-bold text-slate-300 flex items-center gap-1">
          <Info className="w-3 h-3 text-amber-400" />
          {isAr ? 'مدرج درجات حرارة اللهب (Byram Heat Map Scale):' : 'Flame Intensity Heat Map Scale:'}
        </span>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-yellow-500 inline-block" />
            <span>&lt;800 kW/m ({isAr ? 'منخفض' : 'Low'})</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-orange-500 inline-block" />
            <span>800-1800 ({isAr ? 'متوسط' : 'Moderate'})</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-red-500 inline-block" />
            <span>1800-3500 ({isAr ? 'مرتفع' : 'High'})</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-red-700 inline-block" />
            <span>3500-5500 ({isAr ? 'شديد' : 'Extreme'})</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-purple-900 border border-red-500 inline-block" />
            <span>&gt;5500 ({isAr ? 'حرج' : 'Critical'})</span>
          </div>
        </div>
      </div>
    </div>
  );
};
