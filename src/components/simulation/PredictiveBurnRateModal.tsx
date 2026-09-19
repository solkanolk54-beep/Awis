import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { 
  X, 
  Flame, 
  Wind, 
  Droplets, 
  Thermometer, 
  Compass, 
  Mountain, 
  Activity, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  Maximize2, 
  Minimize2, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Clock, 
  Users, 
  Truck, 
  ChevronRight, 
  Download, 
  Sliders, 
  Layers, 
  Target, 
  Sparkles,
  Info,
  ChevronDown
} from 'lucide-react';
import { WildfireIncident, Language, ExposedAsset } from '../../types';
import { 
  calculatePredictiveBurnRate, 
  BurnRateAssessmentResult, 
  BurnRateModelInput,
  degreesToCardinal 
} from '../../services/burnRateModelingService';

interface PredictiveBurnRateModalProps {
  incident: WildfireIncident | null;
  allIncidents?: WildfireIncident[];
  onSelectIncident?: (incident: WildfireIncident) => void;
  onClose: () => void;
  currentLang: Language;
}

export const PredictiveBurnRateModal: React.FC<PredictiveBurnRateModalProps> = ({
  incident,
  allIncidents = [],
  onSelectIncident,
  onClose,
  currentLang
}) => {
  // Active incident resolution with fallback
  const activeIncident = useMemo<WildfireIncident>(() => {
    return incident || allIncidents[0] || ({
      id: 'DZ-WF-FALLBACK',
      code: 'DZ-WF-2026-00421',
      title: 'Texanna - Guerrouche East Wildfire',
      titleAr: 'حريق قطاع شرق غابة قروش - تكسانة',
      wilaya: 'Jijel',
      wilayaAr: 'ولاية جيجل',
      locationName: 'Guerrouche Massif',
      locationNameAr: 'كتلة قروش الغابية',
      coordinates: { lat: 36.78, lng: 5.72 },
      status: 'active_response',
      riskLevel: 'critical',
      confidenceScore: 94,
      estimatedBurnedHectares: 6.5,
      windSpeedKmH: 38,
      windDirectionDegrees: 45,
      windDirectionCardinal: 'NE',
      temperatureC: 39.5,
      humidityPercent: 19,
      terrainSlopeDegrees: 28,
      detectionSources: [],
      assignedResources: [],
      spreadPredictions: [],
      exposedAssets: [],
      timeline: []
    } as unknown as WildfireIncident);
  }, [incident, allIncidents]);

  // Environmental simulation inputs (initialized from the incident's live telemetry)
  const [windSpeed, setWindSpeed] = useState<number>(activeIncident.windSpeedKmH || 36);
  const [windDirection, setWindDirection] = useState<number>(activeIncident.windDirectionDegrees ?? 45);
  const [humidity, setHumidity] = useState<number>(activeIncident.humidityPercent || 20);
  const [temperature, setTemperature] = useState<number>(activeIncident.temperatureC || 38);
  const [slope, setSlope] = useState<number>(activeIncident.terrainSlopeDegrees || 24);
  const [activeHorizon, setActiveHorizon] = useState<'all' | 6 | 12 | 24>('all');
  const [selectedAsset, setSelectedAsset] = useState<ExposedAsset | null>(null);
  const [hoveredIsochrone, setHoveredIsochrone] = useState<number | null>(null);
  const [showAssetLabels, setShowAssetLabels] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [activePreset, setActivePreset] = useState<'telemetry' | 'sirocco' | 'coastal' | 'night' | 'custom'>('telemetry');
  const [activeViewTab, setActiveViewTab] = useState<'spatial' | 'growthChart' | 'sensitivity'>('spatial');
  const [copiedReport, setCopiedReport] = useState<boolean>(false);

  // Sync inputs when active incident changes
  useEffect(() => {
    setWindSpeed(activeIncident.windSpeedKmH || 36);
    setWindDirection(activeIncident.windDirectionDegrees ?? 45);
    setHumidity(activeIncident.humidityPercent || 20);
    setTemperature(activeIncident.temperatureC || 38);
    setSlope(activeIncident.terrainSlopeDegrees || 24);
    setActivePreset('telemetry');
  }, [activeIncident]);

  // Compute burn rate modeling result using Rothermel & Huygens physics engine
  const assessment: BurnRateAssessmentResult = useMemo(() => {
    const input: BurnRateModelInput = {
      incidentId: activeIncident.id,
      incidentTitle: activeIncident.title,
      origin: activeIncident.coordinates,
      currentAreaHectares: activeIncident.estimatedBurnedHectares || 5.0,
      windSpeedKmH: windSpeed,
      windDirectionDegrees: windDirection,
      humidityPercent: humidity,
      temperatureC: temperature,
      slopeDegrees: slope,
      vegetationType: 'cork_oak'
    };
    return calculatePredictiveBurnRate(input, activeIncident);
  }, [activeIncident, windSpeed, windDirection, humidity, temperature, slope]);

  // Quick Preset Handlers
  const handleApplyPreset = (preset: 'telemetry' | 'sirocco' | 'coastal' | 'night') => {
    setActivePreset(preset);
    if (preset === 'telemetry') {
      setWindSpeed(activeIncident.windSpeedKmH || 36);
      setWindDirection(activeIncident.windDirectionDegrees ?? 45);
      setHumidity(activeIncident.humidityPercent || 20);
      setTemperature(activeIncident.temperatureC || 38);
      setSlope(activeIncident.terrainSlopeDegrees || 24);
    } else if (preset === 'sirocco') {
      setWindSpeed(56);
      setWindDirection(185); // South/SW Sirocco
      setHumidity(9);
      setTemperature(44);
      setSlope(Math.max(25, activeIncident.terrainSlopeDegrees || 28));
    } else if (preset === 'coastal') {
      setWindSpeed(18);
      setWindDirection(15); // North maritime sea breeze
      setHumidity(58);
      setTemperature(27);
    } else if (preset === 'night') {
      setWindSpeed(8);
      setHumidity(74);
      setTemperature(18);
    }
  };

  // D3 References
  const spatialSvgRef = useRef<SVGSVGElement | null>(null);
  const chartSvgRef = useRef<SVGSVGElement | null>(null);
  const polarSvgRef = useRef<SVGSVGElement | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const spatialContainerGRef = useRef<SVGGElement | null>(null);

  // --------------------------------------------------------------------------
  // D3 VISUALIZATION 1: SPATIAL 2D ELLIPTICAL FIRE SPREAD & ISOCHRONE MAP
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!spatialSvgRef.current) return;

    const svg = d3.select(spatialSvgRef.current);
    const width = 740;
    const height = 560;
    const centerX = width / 2;
    const centerY = height / 2;

    // Clear previous elements
    svg.selectAll('*').remove();

    // Defs for gradients, filters, markers
    const defs = svg.append('defs');

    // Flame Glow Filter
    const filter = defs.append('filter')
      .attr('id', 'flame-glow-filter')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    filter.append('feGaussianBlur')
      .attr('stdDeviation', '4')
      .attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Gradient for 6h Isochrone
    const grad6h = defs.append('radialGradient')
      .attr('id', 'grad-6h')
      .attr('cx', '50%')
      .attr('cy', '50%')
      .attr('r', '50%');
    grad6h.append('stop').attr('offset', '0%').attr('stop-color', '#ef4444').attr('stop-opacity', 0.55);
    grad6h.append('stop').attr('offset', '80%').attr('stop-color', '#dc2626').attr('stop-opacity', 0.28);
    grad6h.append('stop').attr('offset', '100%').attr('stop-color', '#b91c1c').attr('stop-opacity', 0.12);

    // Gradient for 12h Isochrone
    const grad12h = defs.append('radialGradient')
      .attr('id', 'grad-12h')
      .attr('cx', '50%')
      .attr('cy', '50%')
      .attr('r', '50%');
    grad12h.append('stop').attr('offset', '0%').attr('stop-color', '#f97316').attr('stop-opacity', 0.38);
    grad12h.append('stop').attr('offset', '100%').attr('stop-color', '#ea580c').attr('stop-opacity', 0.08);

    // Gradient for 24h Isochrone
    const grad24h = defs.append('radialGradient')
      .attr('id', 'grad-24h')
      .attr('cx', '50%')
      .attr('cy', '50%')
      .attr('r', '50%');
    grad24h.append('stop').attr('offset', '0%').attr('stop-color', '#eab308').attr('stop-opacity', 0.22);
    grad24h.append('stop').attr('offset', '100%').attr('stop-color', '#ca8a04').attr('stop-opacity', 0.04);

    // Wind Vector Arrow Marker
    defs.append('marker')
      .attr('id', 'wind-arrow-head')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 8)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-4L10,0L0,4')
      .attr('fill', '#38bdf8');

    // Base Group for Zoom & Pan
    const containerG = svg.append('g').attr('class', 'zoomable-container');
    spatialContainerGRef.current = containerG.node();

    // Coordinate Scale: Map kilometers to SVG pixels
    // 24h maximum reach determines domain (with minimum 15 km scale)
    const maxReachKm = Math.max(16, assessment.isochrones.twentyFourHour.ellipse.semiMajorKm * 2.2);
    const kmToPixels = d3.scaleLinear()
      .domain([-maxReachKm, maxReachKm])
      .range([-height * 0.42, height * 0.42]);

    const originScale = kmToPixels(1) - kmToPixels(0); // pixels per km

    // Center the container
    containerG.attr('transform', `translate(${centerX}, ${centerY})`);

    // D3 Zoom Behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.6, 4.5])
      .on('zoom', (event) => {
        containerG.attr('transform', `translate(${event.transform.x + centerX}, ${event.transform.y + centerY}) scale(${event.transform.k})`);
      });

    svg.call(zoom);
    zoomBehaviorRef.current = zoom;

    // 1. Concentric Distance Rings (5km, 10km, 15km, 20km, 25km)
    const ringRadiiKm = [2.5, 5, 10, 15, 20, 25].filter((r) => r <= maxReachKm * 1.25);
    const ringsG = containerG.append('g').attr('class', 'distance-rings opacity-40');

    ringRadiiKm.forEach((radiusKm) => {
      const radiusPx = radiusKm * originScale;
      ringsG.append('circle')
        .attr('cx', 0)
        .attr('cy', 0)
        .attr('r', radiusPx)
        .attr('fill', 'none')
        .attr('stroke', '#334155')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '3 3');

      // Distance label along South axis
      ringsG.append('text')
        .attr('x', 6)
        .attr('y', radiusPx - 4)
        .attr('fill', '#64748b')
        .attr('font-size', '10px')
        .attr('font-family', 'monospace')
        .text(`${radiusKm} km`);
    });

    // 2. Crosshair Grid Lines
    const gridG = containerG.append('g').attr('class', 'crosshairs opacity-30');
    gridG.append('line')
      .attr('x1', -width / 2)
      .attr('y1', 0)
      .attr('x2', width / 2)
      .attr('y2', 0)
      .attr('stroke', '#475569')
      .attr('stroke-width', 1);

    gridG.append('line')
      .attr('x1', 0)
      .attr('y1', -height / 2)
      .attr('x2', 0)
      .attr('y2', height / 2)
      .attr('stroke', '#475569')
      .attr('stroke-width', 1);

    // 3. Dynamic Wind Vector & Propagation Vector
    // Wind vector points in downwind direction (where flame travels)
    const flamePushRad = (assessment.flameHeadingDegrees * Math.PI) / 180;
    // Note: SVG Y is inverted (+Y is South, -Y is North). 0° is North (-Y), 90° East (+X), 180° South (+Y)
    const vectorLenPx = Math.min(200, Math.max(60, (windSpeed / 50) * 110));
    const vectorDx = vectorLenPx * Math.sin(flamePushRad);
    const vectorDy = -vectorLenPx * Math.cos(flamePushRad);

    const vectorG = containerG.append('g').attr('class', 'wind-vector');
    vectorG.append('line')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', vectorDx)
      .attr('y2', vectorDy)
      .attr('stroke', '#38bdf8')
      .attr('stroke-width', 2.5)
      .attr('stroke-dasharray', '4 2')
      .attr('marker-end', 'url(#wind-arrow-head)')
      .attr('opacity', 0.85);

    // Flame propagation direction label
    vectorG.append('text')
      .attr('x', vectorDx + 10 * Math.sin(flamePushRad))
      .attr('y', vectorDy - 10 * Math.cos(flamePushRad))
      .attr('fill', '#38bdf8')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('font-family', 'monospace')
      .attr('text-anchor', 'middle')
      .text(`HEAD FIRE VECTOR ${assessment.flameHeadingDegrees}° (${assessment.flameHeadingCardinal})`);

    // 4. Isochrone Polygons Generator (D3 Line Radial / Path)
    const isochronesG = containerG.append('g').attr('class', 'isochrones-layer');

    const isochroneConfigs = [
      {
        hours: 24,
        data: assessment.isochrones.twentyFourHour,
        stroke: '#eab308',
        fill: 'url(#grad-24h)',
        strokeDash: '5 3',
        strokeWidth: 2,
        label: '+24h Front Limit'
      },
      {
        hours: 12,
        data: assessment.isochrones.twelveHour,
        stroke: '#f97316',
        fill: 'url(#grad-12h)',
        strokeDash: '4 2',
        strokeWidth: 2.2,
        label: '+12h Isochrone'
      },
      {
        hours: 6,
        data: assessment.isochrones.sixHour,
        stroke: '#ef4444',
        fill: 'url(#grad-6h)',
        strokeDash: 'none',
        strokeWidth: 2.8,
        label: '+6h Active Front'
      }
    ];

    // Filter by active horizon if chosen
    const filteredIsochrones = isochroneConfigs.filter(
      (c) => activeHorizon === 'all' || activeHorizon === c.hours
    );

    // D3 Path generator for local Cartesian coordinates (km to pixels)
    // Local coords: x is East (+X), y is North (-Y in SVG space)
    const pathGenerator = d3.line<{ x: number; y: number }>()
      .x((d) => d.x * originScale)
      .y((d) => -d.y * originScale) // invert Y for screen coords
      .curve(d3.curveCatmullRomClosed);

    filteredIsochrones.forEach((iso) => {
      const isHovered = hoveredIsochrone === iso.hours;
      const pathData = pathGenerator(iso.data.polygonLocalKm) || '';

      const isoGroup = isochronesG.append('g')
        .attr('class', `isochrone-group-${iso.hours}`)
        .style('cursor', 'pointer')
        .on('mouseenter', () => setHoveredIsochrone(iso.hours))
        .on('mouseleave', () => setHoveredIsochrone(null));

      // Polygon Area Fill
      isoGroup.append('path')
        .attr('d', pathData)
        .attr('fill', iso.fill)
        .attr('stroke', iso.stroke)
        .attr('stroke-width', isHovered ? iso.strokeWidth + 1.5 : iso.strokeWidth)
        .attr('stroke-dasharray', iso.strokeDash)
        .attr('filter', iso.hours === 6 ? 'url(#flame-glow-filter)' : null)
        .attr('opacity', hoveredIsochrone && !isHovered ? 0.35 : 1)
        .attr('transition', 'all 0.2s ease');

      // Tag on furthest forward perimeter point
      const forwardPt = iso.data.polygonLocalKm[0];
      if (forwardPt) {
        isoGroup.append('rect')
          .attr('x', forwardPt.x * originScale - 32)
          .attr('y', -forwardPt.y * originScale - 18)
          .attr('width', 64)
          .attr('height', 16)
          .attr('rx', 4)
          .attr('fill', '#0f172a')
          .attr('stroke', iso.stroke)
          .attr('stroke-width', 1.2)
          .attr('opacity', 0.9);

        isoGroup.append('text')
          .attr('x', forwardPt.x * originScale)
          .attr('y', -forwardPt.y * originScale - 6)
          .attr('fill', iso.stroke)
          .attr('font-size', '10px')
          .attr('font-weight', 'bold')
          .attr('font-family', 'monospace')
          .attr('text-anchor', 'middle')
          .text(`+${iso.hours}h (${iso.data.cumulativeAreaHectares} ha)`);
      }
    });

    // 5. Exposed Regional Assets Markers
    const assetsG = containerG.append('g').attr('class', 'exposed-assets-layer');

    assessment.regionalAssets.forEach((asset) => {
      // Calculate local distance in km along radial offset
      // Place relative to origin using asset distance and incident azimuth
      const assetAngleRad = flamePushRad + ((asset.distanceKm % 3) - 1) * 0.45;
      const assetX = asset.distanceKm * Math.sin(assetAngleRad) * originScale;
      const assetY = -asset.distanceKm * Math.cos(assetAngleRad) * originScale;

      const isInside6h = asset.distanceKm <= assessment.isochrones.sixHour.ellipse.semiMajorKm * 1.1;
      const isInside12h = asset.distanceKm <= assessment.isochrones.twelveHour.ellipse.semiMajorKm * 1.1;
      const isInside24h = asset.distanceKm <= assessment.isochrones.twentyFourHour.ellipse.semiMajorKm * 1.1;

      let markerColor = '#10b981'; // safe
      let threatLevelText = 'Outside 24h Buffer';
      if (isInside6h) {
        markerColor = '#ef4444';
        threatLevelText = 'Intercept < 6h';
      } else if (isInside12h) {
        markerColor = '#f97316';
        threatLevelText = 'Intercept 6h-12h';
      } else if (isInside24h) {
        markerColor = '#eab308';
        threatLevelText = 'Threatened 12h-24h';
      }

      const isSelected = selectedAsset?.id === asset.id;
      const assetNode = assetsG.append('g')
        .attr('transform', `translate(${assetX}, ${assetY})`)
        .style('cursor', 'pointer')
        .on('click', () => setSelectedAsset(asset));

      // Ripple halo if inside 6h
      if (isInside6h) {
        assetNode.append('circle')
          .attr('r', 12)
          .attr('fill', 'none')
          .attr('stroke', '#ef4444')
          .attr('stroke-width', 1.5)
          .attr('opacity', 0.6)
          .append('animate')
          .attr('attributeName', 'r')
          .attr('values', '6; 16; 6')
          .attr('dur', '2s')
          .attr('repeatCount', 'indefinite');
      }

      // Marker symbol
      assetNode.append('circle')
        .attr('r', isSelected ? 8 : 6)
        .attr('fill', markerColor)
        .attr('stroke', '#0f172a')
        .attr('stroke-width', 2);

      // Asset label if enabled
      if (showAssetLabels) {
        assetNode.append('text')
          .attr('x', 9)
          .attr('y', 4)
          .attr('fill', '#f1f5f9')
          .attr('font-size', '10px')
          .attr('font-weight', '600')
          .attr('stroke', '#020617')
          .attr('stroke-width', 2)
          .attr('paint-order', 'stroke')
          .text(currentLang === 'ar' ? asset.nameAr : asset.name);

        assetNode.append('text')
          .attr('x', 9)
          .attr('y', 15)
          .attr('fill', markerColor)
          .attr('font-size', '9px')
          .attr('font-family', 'monospace')
          .attr('font-weight', 'bold')
          .text(`${asset.distanceKm}km • ${threatLevelText}`);
      }
    });

    // 6. Origin Incident Epicenter (Center)
    const originG = containerG.append('g').attr('class', 'origin-marker');

    // Pulsating flame beacon
    originG.append('circle')
      .attr('r', 18)
      .attr('fill', '#ef4444')
      .attr('opacity', 0.25)
      .append('animate')
      .attr('attributeName', 'r')
      .attr('values', '10; 24; 10')
      .attr('dur', '1.8s')
      .attr('repeatCount', 'indefinite');

    originG.append('circle')
      .attr('r', 7)
      .attr('fill', '#ef4444')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2);

    originG.append('text')
      .attr('x', 0)
      .attr('y', 16)
      .attr('fill', '#f87171')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('text-anchor', 'middle')
      .attr('font-family', 'monospace')
      .text('IGNITION ORIGIN (0h)');

  }, [assessment, activeHorizon, showAssetLabels, hoveredIsochrone, selectedAsset, currentLang]);

  // --------------------------------------------------------------------------
  // D3 VISUALIZATION 2: BURNED AREA EXPANSION & GROWTH TRAJECTORY OVER TIME (0h-24h)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!chartSvgRef.current) return;

    const svg = d3.select(chartSvgRef.current);
    const width = 640;
    const height = 240;
    const margin = { top: 25, right: 35, bottom: 40, left: 55 };

    svg.selectAll('*').remove();

    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // X Scale (Hours: 0 to 24)
    const xScale = d3.scaleLinear()
      .domain([0, 24])
      .range([0, chartWidth]);

    // Y Scale (Burned Area: Hectares)
    const maxArea = assessment.isochrones.twentyFourHour.cumulativeAreaHectares;
    const yScale = d3.scaleLinear()
      .domain([0, maxArea * 1.2])
      .range([chartHeight, 0]);

    // Defs: Area Gradient
    const defs = svg.append('defs');
    const areaGrad = defs.append('linearGradient')
      .attr('id', 'area-growth-grad')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    areaGrad.append('stop').attr('offset', '0%').attr('stop-color', '#ef4444').attr('stop-opacity', 0.5);
    areaGrad.append('stop').attr('offset', '50%').attr('stop-color', '#f97316').attr('stop-opacity', 0.25);
    areaGrad.append('stop').attr('offset', '100%').attr('stop-color', '#eab308').attr('stop-opacity', 0.04);

    // X & Y Gridlines
    g.append('g')
      .attr('class', 'grid opacity-15')
      .attr('transform', `translate(0, ${chartHeight})`)
      .call(
        d3.axisBottom(xScale)
          .ticks(8)
          .tickSize(-chartHeight)
          .tickFormat(() => '')
      );

    g.append('g')
      .attr('class', 'grid opacity-15')
      .call(
        d3.axisLeft(yScale)
          .ticks(5)
          .tickSize(-chartWidth)
          .tickFormat(() => '')
      );

    // Confidence Interval Band (P10 to P90)
    const confidenceArea = d3.area<typeof assessment.timeSeries[0]>()
      .x((d) => xScale(d.hour))
      .y0((d) => yScale(d.p10BestCaseAreaHectares))
      .y1((d) => yScale(d.p90WorstCaseAreaHectares))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(assessment.timeSeries)
      .attr('fill', '#f97316')
      .attr('opacity', 0.12)
      .attr('d', confidenceArea);

    // Baseline Area Under Curve
    const areaGenerator = d3.area<typeof assessment.timeSeries[0]>()
      .x((d) => xScale(d.hour))
      .y0(chartHeight)
      .y1((d) => yScale(d.areaHectares))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(assessment.timeSeries)
      .attr('fill', 'url(#area-growth-grad)')
      .attr('d', areaGenerator);

    // Baseline Curve Line
    const lineGenerator = d3.line<typeof assessment.timeSeries[0]>()
      .x((d) => xScale(d.hour))
      .y((d) => yScale(d.areaHectares))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(assessment.timeSeries)
      .attr('fill', 'none')
      .attr('stroke', '#f97316')
      .attr('stroke-width', 2.5)
      .attr('d', lineGenerator);

    // X Axis
    const xAxis = d3.axisBottom(xScale)
      .tickValues([0, 3, 6, 9, 12, 15, 18, 21, 24])
      .tickFormat((d) => `+${d}h`);

    g.append('g')
      .attr('transform', `translate(0, ${chartHeight})`)
      .call(xAxis)
      .attr('color', '#64748b')
      .selectAll('text')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace');

    // Y Axis
    const yAxis = d3.axisLeft(yScale)
      .ticks(5)
      .tickFormat((d) => `${d} ha`);

    g.append('g')
      .call(yAxis)
      .attr('color', '#64748b')
      .selectAll('text')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace');

    // Vertical dashed marker lines at 6h, 12h, 24h
    [6, 12, 24].forEach((hr) => {
      const pt = assessment.timeSeries.find((t) => t.hour === hr);
      if (!pt) return;

      const xPos = xScale(hr);
      const yPos = yScale(pt.areaHectares);

      g.append('line')
        .attr('x1', xPos)
        .attr('y1', 0)
        .attr('x2', xPos)
        .attr('y2', chartHeight)
        .attr('stroke', hr === 6 ? '#ef4444' : hr === 12 ? '#f97316' : '#eab308')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '3 3');

      // Milestone dot
      g.append('circle')
        .attr('cx', xPos)
        .attr('cy', yPos)
        .attr('r', 4.5)
        .attr('fill', hr === 6 ? '#ef4444' : hr === 12 ? '#f97316' : '#eab308')
        .attr('stroke', '#0f172a')
        .attr('stroke-width', 1.5);

      // Label callout
      g.append('text')
        .attr('x', xPos)
        .attr('y', yPos - 8)
        .attr('fill', hr === 6 ? '#f87171' : hr === 12 ? '#fb923c' : '#fde047')
        .attr('font-size', '10px')
        .attr('font-family', 'monospace')
        .attr('font-weight', 'bold')
        .attr('text-anchor', 'middle')
        .text(`${pt.areaHectares} ha`);
    });

  }, [assessment]);

  // --------------------------------------------------------------------------
  // D3 VISUALIZATION 3: POLAR COMPASS & HUYGENS ELLIPSE ECCENTRICITY GAUGE
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!polarSvgRef.current) return;

    const svg = d3.select(polarSvgRef.current);
    const size = 220;
    const center = size / 2;
    const radius = size * 0.42;

    svg.selectAll('*').remove();

    const g = svg.append('g').attr('transform', `translate(${center}, ${center})`);

    // Circular Rings
    [0.33, 0.66, 1.0].forEach((ratio) => {
      g.append('circle')
        .attr('r', radius * ratio)
        .attr('fill', 'none')
        .attr('stroke', '#334155')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '2 2');
    });

    // Cardinal Axes
    ['N', 'E', 'S', 'W'].forEach((card, idx) => {
      const angle = (idx * 90 * Math.PI) / 180;
      const x = radius * 1.15 * Math.sin(angle);
      const y = -radius * 1.15 * Math.cos(angle);

      g.append('text')
        .attr('x', x)
        .attr('y', y + 3)
        .attr('fill', '#94a3b8')
        .attr('font-size', '10px')
        .attr('font-weight', 'bold')
        .attr('text-anchor', 'middle')
        .text(card);
    });

    // Huygens Ellipse shape rotated by flame heading
    const lwr = assessment.lengthToWidthRatio;
    const flameRad = (assessment.flameHeadingDegrees * Math.PI) / 180;
    const a = radius * 0.78;
    const b = a / Math.max(1.1, lwr);

    // Draw rotated ellipse path
    const ellipseG = g.append('g').attr('transform', `rotate(${assessment.flameHeadingDegrees})`);
    ellipseG.append('ellipse')
      .attr('cx', 0)
      .attr('cy', -a * 0.3) // shifted downwind
      .attr('rx', b)
      .attr('ry', a)
      .attr('fill', '#ef4444')
      .attr('fill-opacity', 0.25)
      .attr('stroke', '#ef4444')
      .attr('stroke-width', 1.8);

    // Wind Vector Arrow
    g.append('line')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', radius * 0.9 * Math.sin(flameRad))
      .attr('y2', -radius * 0.9 * Math.cos(flameRad))
      .attr('stroke', '#38bdf8')
      .attr('stroke-width', 2);

    g.append('circle')
      .attr('r', 4)
      .attr('fill', '#ef4444')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.5);

  }, [assessment]);

  // Reset zoom handler
  const handleResetZoom = () => {
    if (spatialSvgRef.current && zoomBehaviorRef.current) {
      d3.select(spatialSvgRef.current)
        .transition()
        .duration(500)
        .call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
    }
  };

  // Zoom by step
  const handleZoomStep = (delta: number) => {
    if (spatialSvgRef.current && zoomBehaviorRef.current) {
      d3.select(spatialSvgRef.current)
        .transition()
        .duration(300)
        .call(zoomBehaviorRef.current.scaleBy, delta > 0 ? 1.3 : 0.77);
    }
  };

  // Copy tactical briefing summary to clipboard
  const handleCopyBriefing = () => {
    const text = `
[AWIS - ALGERIA WILDFIRE INTELLIGENCE SYSTEM]
TACTICAL PREDICTIVE BURN-RATE & SPREAD BRIEFING
Incident: ${activeIncident.code} (${activeIncident.locationName}, Wilaya of ${activeIncident.wilaya})
GPS Origin: ${activeIncident.coordinates.lat.toFixed(4)}°N, ${activeIncident.coordinates.lng.toFixed(4)}°E
Weather: Wind ${windSpeed} km/h from ${windDirection}° (${degreesToCardinal(windDirection)}) | RH ${humidity}% | Temp ${temperature}°C
Propagation Azimuth: ${assessment.flameHeadingDegrees}° (${assessment.flameHeadingCardinal})
Fuel Moisture Damping: ${assessment.effectiveFuelMoisturePercent}% (${assessment.fuelMoistureDampingFactor}x)

SPREAD PROJECTIONS:
• Current Footprint: ${activeIncident.estimatedBurnedHectares} ha
• +6 Hours Horizon:  ${assessment.isochrones.sixHour.cumulativeAreaHectares} ha (Forward ROS: ${assessment.isochrones.sixHour.forwardSpreadRateMMin} m/min | Flame: ${assessment.isochrones.sixHour.flameLengthMeters}m)
• +12 Hours Horizon: ${assessment.isochrones.twelveHour.cumulativeAreaHectares} ha (Forward ROS: ${assessment.isochrones.twelveHour.forwardSpreadRateMMin} m/min)
• +24 Hours Horizon: ${assessment.isochrones.twentyFourHour.cumulativeAreaHectares} ha (24h Expansion: ${assessment.summary.twentyFourHourExpansionRatio}x)

CRITICAL EVACUATION ADVISORY: ${assessment.summary.criticalAdvisoryLevel}
Threatened Assets: ${assessment.isochrones.twentyFourHour.threatenedAssetsCount} structures/communities in path
Required Resources: ${assessment.isochrones.twentyFourHour.requiredPumperUnits} pumper trucks, ${assessment.isochrones.twentyFourHour.requiredAirDrops} air retardant drops.
    `.trim();

    navigator.clipboard.writeText(text).then(() => {
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 3000);
    });
  };

  return (
    <div 
      id="predictive-burn-rate-modal-backdrop"
      onClick={onClose}
      className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-hidden animate-fadeIn cursor-pointer`}
    >
      <div 
        id="predictive-burn-rate-modal-content"
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full ${isFullscreen ? 'h-full max-w-none rounded-none' : 'max-w-7xl max-h-[94vh] rounded-2xl'} bg-[#090d16] border border-slate-700 shadow-2xl flex flex-col overflow-hidden cursor-default`}
      >
        
        {/* TOP MODAL HEADER */}
        <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/20 border border-orange-500/40 text-orange-400">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-orange-950 text-orange-300 border border-orange-800">
                  D3 PREDICTIVE BURN-RATE MODEL
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  ROTHERMEL & HUYGENS
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40 uppercase">
                  {assessment.summary.criticalAdvisoryLevel.replace('_', ' ')}
                </span>
              </div>
              <h2 className="text-lg font-bold text-white mt-1 flex items-center gap-2">
                <span>{currentLang === 'ar' ? 'النمذجة التنبؤية لمعدل الاحتراق وانتشار النيران' : 'Predictive Wildfire Spread & Burn-Rate Modeling'}</span>
                <span className="text-slate-400 text-sm font-normal">
                  — {currentLang === 'ar' ? activeIncident.titleAr : activeIncident.title} ({activeIncident.wilaya})
                </span>
              </h2>
            </div>
          </div>

          {/* INCIDENT SELECTOR DROPDOWN & ACTIONS */}
          <div className="flex items-center gap-2">
            {allIncidents.length > 1 && onSelectIncident && (
              <div className="relative">
                <select
                  value={activeIncident.id}
                  onChange={(e) => {
                    const found = allIncidents.find((i) => i.id === e.target.value);
                    if (found) onSelectIncident(found);
                  }}
                  className="bg-slate-800 text-slate-200 text-xs font-medium border border-slate-700 rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500 cursor-pointer pr-8"
                >
                  {allIncidents.map((inc) => (
                    <option key={inc.id} value={inc.id}>
                      {inc.wilaya}: {inc.locationName || inc.title}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}

            <button
              onClick={handleCopyBriefing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition cursor-pointer"
              title="Copy Tactical Briefing Summary"
            >
              {copiedReport ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Download className="w-3.5 h-3.5" />}
              <span>{copiedReport ? (currentLang === 'ar' ? 'تم النسخ' : 'Copied') : (currentLang === 'ar' ? 'تصدير التقرير' : 'Export Briefing')}</span>
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Close Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* SCENARIO PRESETS BAR */}
        <div className="bg-slate-950/80 border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-semibold flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              {currentLang === 'ar' ? 'سيناريوهات الطقس:' : 'Weather Scenarios:'}
            </span>
            {[
              { id: 'telemetry', label: currentLang === 'ar' ? 'بيانات الحريق الميدانية' : 'Live Incident Telemetry', icon: Activity },
              { id: 'sirocco', label: currentLang === 'ar' ? 'رياح الشهيلي القصوى (Sirocco)' : 'Sirocco / Chhili Storm', icon: Flame },
              { id: 'coastal', label: currentLang === 'ar' ? 'نسيم بحري معتدل' : 'Moderate Sea Breeze', icon: Droplets },
              { id: 'night', label: currentLang === 'ar' ? 'تعافي رطوبة الليل' : 'Night Moisture Inversion', icon: Clock }
            ].map((preset) => {
              const Icon = preset.icon;
              const isActive = activePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => handleApplyPreset(preset.id as any)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition cursor-pointer ${
                    isActive
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                      : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{preset.label}</span>
                </button>
              );
            })}
          </div>

          {/* VIEW SWITCHER TABS */}
          <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 font-medium">
            <button
              onClick={() => setActiveViewTab('spatial')}
              className={`px-3 py-1 rounded-md transition cursor-pointer ${
                activeViewTab === 'spatial' ? 'bg-orange-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              {currentLang === 'ar' ? 'المسقط المكاني (D3 Spatial Map)' : 'D3 Spatial Map'}
            </button>
            <button
              onClick={() => setActiveViewTab('growthChart')}
              className={`px-3 py-1 rounded-md transition cursor-pointer ${
                activeViewTab === 'growthChart' ? 'bg-orange-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              {currentLang === 'ar' ? 'منحنى المساحة (D3 Growth Curve)' : 'D3 Area Trajectory'}
            </button>
            <button
              onClick={() => setActiveViewTab('sensitivity')}
              className={`px-3 py-1 rounded-md transition cursor-pointer ${
                activeViewTab === 'sensitivity' ? 'bg-orange-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              {currentLang === 'ar' ? 'بوصلة هويغنز (Polar Gauge)' : 'Huygens Polar Gauge'}
            </button>
          </div>
        </div>

        {/* MAIN MODAL BODY: VISUALIZATION + CONTROL PANEL */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* LEFT: PRIMARY D3 INTERACTIVE DISPLAY */}
          <div className="flex-1 relative bg-[#060a12] flex flex-col items-center justify-center p-2 sm:p-4 overflow-hidden">
            
            {/* 1. Spatial 2D View */}
            {activeViewTab === 'spatial' && (
              <div className="relative w-full h-full flex flex-col items-center justify-center">
                <svg
                  ref={spatialSvgRef}
                  viewBox="0 0 740 560"
                  className="w-full h-full max-h-[680px] select-none cursor-grab active:cursor-grabbing"
                />

                {/* Floating Map HUD Controls */}
                <div className="absolute top-4 left-4 flex flex-col gap-1.5 bg-slate-900/85 backdrop-blur-md p-2 rounded-xl border border-slate-700/80 text-xs shadow-xl pointer-events-auto">
                  <div className="text-[11px] font-bold text-slate-300 flex items-center justify-between gap-2 border-b border-slate-800 pb-1">
                    <span>PROPAGATION VECTOR</span>
                    <span className="text-amber-400 font-mono">
                      {assessment.flameHeadingDegrees}° ({assessment.flameHeadingCardinal})
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 text-[11px] font-mono">
                    <span>Wind: {windSpeed} km/h</span>
                    <span>•</span>
                    <span>RH: {humidity}%</span>
                    <span>•</span>
                    <span>Slope: {slope}°</span>
                  </div>

                  {/* Horizon Selectors */}
                  <div className="flex items-center gap-1 mt-1 pt-1 border-t border-slate-800">
                    <span className="text-[10px] text-slate-500 mr-1">Horizon:</span>
                    {(['all', 6, 12, 24] as const).map((h) => (
                      <button
                        key={h}
                        onClick={() => setActiveHorizon(h)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                          activeHorizon === h
                            ? 'bg-amber-500 text-black'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {h === 'all' ? 'All' : `+${h}h`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Floating Map Zoom Tools */}
                <div className="absolute top-4 right-4 flex flex-col gap-1.5 bg-slate-900/85 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/80 shadow-xl pointer-events-auto">
                  <button
                    onClick={() => handleZoomStep(1)}
                    className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleZoomStep(-1)}
                    className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleResetZoom}
                    className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                    title="Reset View"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <div className="h-px bg-slate-800 my-0.5" />
                  <button
                    onClick={() => setShowAssetLabels(!showAssetLabels)}
                    className={`p-2 rounded-lg transition cursor-pointer ${
                      showAssetLabels ? 'text-emerald-400 bg-emerald-950/40' : 'text-slate-500 hover:text-slate-300'
                    }`}
                    title="Toggle Settlement & Road Labels"
                  >
                    <Users className="w-4 h-4" />
                  </button>
                </div>

                {/* Floating Map Legend */}
                <div className="absolute bottom-4 left-4 bg-slate-950/80 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-800 text-[11px] flex items-center gap-4 text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-500 border border-red-300 inline-block" />
                    <span>+6h Active Perimeter</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-orange-500 border border-orange-300 inline-block" />
                    <span>+12h Isochrone</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-yellow-500 border border-yellow-300 inline-block" />
                    <span>+24h Safety Buffer</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-sky-400 inline-block" />
                    <span>Wind Vector</span>
                  </div>
                </div>
              </div>
            )}

            {/* 2. D3 Growth Curve View */}
            {activeViewTab === 'growthChart' && (
              <div className="w-full h-full flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-2xl bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-200">
                        {currentLang === 'ar' ? 'منحنى تزايد المساحة المحترقة (0 - 24 ساعة)' : 'Burned Area Trajectory (0 - 24 Hours)'}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {currentLang === 'ar' ? 'استقراء دالي للمساحة بالهكتار مع مجال الثقة P10 - P90' : 'Cumulative burn area curve with P10/P90 confidence bounds under wind gusts'}
                      </p>
                    </div>
                    <div className="text-right font-mono text-xs text-orange-400">
                      <div>24h Total: {assessment.isochrones.twentyFourHour.cumulativeAreaHectares} ha</div>
                      <div className="text-[10px] text-slate-500">Expansion: {assessment.summary.twentyFourHourExpansionRatio}x</div>
                    </div>
                  </div>
                  <svg ref={chartSvgRef} viewBox="0 0 640 240" className="w-full h-auto" />
                </div>
              </div>
            )}

            {/* 3. Huygens Ellipse Eccentricity & Sensitivity Polar View */}
            {activeViewTab === 'sensitivity' && (
              <div className="w-full h-full flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-xl bg-slate-900/60 p-6 rounded-2xl border border-slate-800 flex flex-col items-center text-center">
                  <h3 className="text-sm font-bold text-slate-200 mb-1">
                    {currentLang === 'ar' ? 'تأثير سرعة الرياح على استطالة القطع الناقص (Huygens Ellipse)' : 'Huygens Fire Envelope & Wind Sensitivity'}
                  </h3>
                  <p className="text-xs text-slate-400 mb-4">
                    {currentLang === 'ar' 
                      ? 'كلما زادت سرعة الرياح، استطالت جبهة الحريق وأصبحت الأجنحة أضيق' 
                      : 'Higher wind velocities stretch the forward flank, increasing the Length-to-Width (L/W) ratio.'}
                  </p>
                  <svg ref={polarSvgRef} viewBox="0 0 220 220" className="w-56 h-56 my-2" />
                  <div className="grid grid-cols-2 gap-4 w-full mt-4 text-xs font-mono text-left">
                    <div className="bg-slate-850 p-2.5 rounded-xl border border-slate-700/60">
                      <span className="text-slate-400 block text-[11px]">Length-to-Width (L/W):</span>
                      <span className="text-base font-bold text-orange-400">{assessment.lengthToWidthRatio} : 1</span>
                    </div>
                    <div className="bg-slate-850 p-2.5 rounded-xl border border-slate-700/60">
                      <span className="text-slate-400 block text-[11px]">Fuel Moisture Damping:</span>
                      <span className="text-base font-bold text-emerald-400">{assessment.fuelMoistureDampingFactor}x (at {humidity}% RH)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: INTERACTIVE PARAMETER ADJUSTMENT & PREDICTION METRICS SIDEBAR */}
          <div className="w-full lg:w-96 bg-slate-900/95 border-t lg:border-t-0 lg:border-l border-slate-800 p-4 flex flex-col justify-between overflow-y-auto space-y-4">
            
            <div className="space-y-4">
              {/* 1. HORIZON PREDICTION METRIC CARDS (6h, 12h, 24h) */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>{currentLang === 'ar' ? 'توقعات انتشار النيران' : 'Spread Horizon Milestones'}</span>
                  <span className="text-[10px] text-amber-400 font-mono">D3 COMPUTED</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {/* +6 Hours Card */}
                  <div className={`p-2.5 rounded-xl border transition cursor-pointer ${
                    activeHorizon === 6 ? 'bg-red-950/60 border-red-500 shadow-lg shadow-red-950/50' : 'bg-slate-800/60 border-slate-700/70 hover:border-red-500/50'
                  }`} onClick={() => setActiveHorizon(activeHorizon === 6 ? 'all' : 6)}>
                    <div className="flex items-center justify-between text-[11px] font-bold text-red-400">
                      <span>+6 HOURS</span>
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                    </div>
                    <div className="text-lg font-mono font-bold text-white mt-1">
                      {assessment.isochrones.sixHour.cumulativeAreaHectares} <span className="text-xs text-slate-400">ha</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 font-mono">
                      ROS: {assessment.isochrones.sixHour.forwardSpreadRateMMin} m/min
                    </div>
                    <div className="text-[10px] text-amber-300 font-mono">
                      Flame: {assessment.isochrones.sixHour.flameLengthMeters}m
                    </div>
                  </div>

                  {/* +12 Hours Card */}
                  <div className={`p-2.5 rounded-xl border transition cursor-pointer ${
                    activeHorizon === 12 ? 'bg-orange-950/60 border-orange-500 shadow-lg shadow-orange-950/50' : 'bg-slate-800/60 border-slate-700/70 hover:border-orange-500/50'
                  }`} onClick={() => setActiveHorizon(activeHorizon === 12 ? 'all' : 12)}>
                    <div className="flex items-center justify-between text-[11px] font-bold text-orange-400">
                      <span>+12 HOURS</span>
                      <span className="w-2 h-2 rounded-full bg-orange-500" />
                    </div>
                    <div className="text-lg font-mono font-bold text-white mt-1">
                      {assessment.isochrones.twelveHour.cumulativeAreaHectares} <span className="text-xs text-slate-400">ha</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 font-mono">
                      ROS: {assessment.isochrones.twelveHour.forwardSpreadRateMMin} m/min
                    </div>
                    <div className="text-[10px] text-amber-300 font-mono">
                      Flame: {assessment.isochrones.twelveHour.flameLengthMeters}m
                    </div>
                  </div>

                  {/* +24 Hours Card */}
                  <div className={`p-2.5 rounded-xl border transition cursor-pointer ${
                    activeHorizon === 24 ? 'bg-yellow-950/60 border-yellow-500 shadow-lg shadow-yellow-950/50' : 'bg-slate-800/60 border-slate-700/70 hover:border-yellow-500/50'
                  }`} onClick={() => setActiveHorizon(activeHorizon === 24 ? 'all' : 24)}>
                    <div className="flex items-center justify-between text-[11px] font-bold text-yellow-400">
                      <span>+24 HOURS</span>
                      <span className="w-2 h-2 rounded-full bg-yellow-500" />
                    </div>
                    <div className="text-lg font-mono font-bold text-white mt-1">
                      {assessment.isochrones.twentyFourHour.cumulativeAreaHectares} <span className="text-xs text-slate-400">ha</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 font-mono">
                      ROS: {assessment.isochrones.twentyFourHour.forwardSpreadRateMMin} m/min
                    </div>
                    <div className="text-[10px] text-amber-300 font-mono">
                      Flame: {assessment.isochrones.twentyFourHour.flameLengthMeters}m
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. REAL-TIME WEATHER & TERRAIN INTERACTIVE SLIDERS */}
              <div className="space-y-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                    {currentLang === 'ar' ? 'ضبط المعاملات المناخية والتضاريسية' : 'Dynamic Physical Parameters'}
                  </span>
                  <span className="text-[10px] text-slate-500">Live Sensitivity</span>
                </div>

                {/* Wind Speed Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Wind className="w-3 h-3 text-sky-400" />
                      {currentLang === 'ar' ? 'سرعة الرياح' : 'Wind Speed'}:
                    </span>
                    <span className="text-sky-300 font-bold">{windSpeed} km/h</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    step="1"
                    value={windSpeed}
                    onChange={(e) => {
                      setWindSpeed(Number(e.target.value));
                      setActivePreset('custom');
                    }}
                    className="w-full accent-sky-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Wind Direction Slider & Compass Buttons */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Compass className="w-3 h-3 text-amber-400" />
                      {currentLang === 'ar' ? 'اتجاه الرياح (من)' : 'Wind Origin Direction'}:
                    </span>
                    <span className="text-amber-300 font-bold">
                      {windDirection}° ({degreesToCardinal(windDirection)})
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="359"
                    step="5"
                    value={windDirection}
                    onChange={(e) => {
                      setWindDirection(Number(e.target.value));
                      setActivePreset('custom');
                    }}
                    className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                  {/* Quick Cardinal Direction Pills */}
                  <div className="grid grid-cols-8 gap-1 pt-1">
                    {[
                      { l: 'N', d: 0 },
                      { l: 'NE', d: 45 },
                      { l: 'E', d: 90 },
                      { l: 'SE', d: 135 },
                      { l: 'S', d: 180 },
                      { l: 'SW', d: 225 },
                      { l: 'W', d: 270 },
                      { l: 'NW', d: 315 }
                    ].map((card) => (
                      <button
                        key={card.l}
                        onClick={() => {
                          setWindDirection(card.d);
                          setActivePreset('custom');
                        }}
                        className={`py-0.5 text-[10px] font-mono rounded border transition cursor-pointer ${
                          Math.abs(windDirection - card.d) <= 22
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                            : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {card.l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Relative Humidity Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Droplets className="w-3 h-3 text-emerald-400" />
                      {currentLang === 'ar' ? 'الرطوبة النسبية' : 'Relative Humidity'}:
                    </span>
                    <span className="text-emerald-300 font-bold">{humidity}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="90"
                    step="1"
                    value={humidity}
                    onChange={(e) => {
                      setHumidity(Number(e.target.value));
                      setActivePreset('custom');
                    }}
                    className="w-full accent-emerald-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Temperature & Slope Grid */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-slate-400">Temp:</span>
                      <span className="text-red-300 font-bold">{temperature}°C</span>
                    </div>
                    <input
                      type="range"
                      min="15"
                      max="48"
                      value={temperature}
                      onChange={(e) => setTemperature(Number(e.target.value))}
                      className="w-full accent-red-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-slate-400">Slope:</span>
                      <span className="text-purple-300 font-bold">{slope}°</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="45"
                      value={slope}
                      onChange={(e) => setSlope(Number(e.target.value))}
                      className="w-full accent-purple-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* 3. THREATENED REGIONAL ASSETS & COMMUNITIES */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>{currentLang === 'ar' ? 'الأصول والقرى المعرضة للخطر' : 'Threatened Infrastructure & Villages'}</span>
                  <span className="text-xs font-mono font-bold text-red-400">
                    {assessment.isochrones.twentyFourHour.threatenedAssetsCount} In Path
                  </span>
                </div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {assessment.regionalAssets.map((asset) => {
                    const isInside6h = asset.distanceKm <= assessment.isochrones.sixHour.ellipse.semiMajorKm * 1.1;
                    const isInside12h = asset.distanceKm <= assessment.isochrones.twelveHour.ellipse.semiMajorKm * 1.1;
                    const isInside24h = asset.distanceKm <= assessment.isochrones.twentyFourHour.ellipse.semiMajorKm * 1.1;

                    return (
                      <div
                        key={asset.id}
                        onClick={() => setSelectedAsset(asset)}
                        className={`p-2 rounded-lg border text-xs flex items-center justify-between transition cursor-pointer ${
                          selectedAsset?.id === asset.id
                            ? 'bg-slate-800 border-amber-500'
                            : isInside6h
                            ? 'bg-red-950/40 border-red-800/60 hover:bg-red-950/60'
                            : isInside12h
                            ? 'bg-orange-950/30 border-orange-800/60 hover:bg-orange-950/50'
                            : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isInside6h ? 'bg-red-400 animate-ping' : isInside12h ? 'bg-orange-400' : isInside24h ? 'bg-yellow-400' : 'bg-emerald-400'
                            }`}
                          />
                          <div>
                            <div className="font-semibold text-slate-200">
                              {currentLang === 'ar' ? asset.nameAr : asset.name}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {asset.type.toUpperCase()} {asset.population ? `• ${asset.population} residents` : ''}
                            </div>
                          </div>
                        </div>
                        <div className="text-right font-mono">
                          <div className={`font-bold ${isInside6h ? 'text-red-400' : isInside12h ? 'text-orange-400' : 'text-yellow-400'}`}>
                            {asset.distanceKm} km
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {isInside6h ? '< 6 Hours' : isInside12h ? '6h - 12h' : '12h - 24h'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 4. EMERGENCY RESOURCE REQUIREMENTS */}
            <div className="bg-gradient-to-r from-slate-950 to-slate-900 p-3 rounded-xl border border-slate-800 space-y-2">
              <div className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                  {currentLang === 'ar' ? 'الموارد التكتيكية المقدرة للحصار' : 'Required Containment Resources'}
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">CIVIL PROTECTION</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-amber-400" />
                  <div>
                    <span className="text-[10px] text-slate-400 block">Heavy Pumpers:</span>
                    <span className="font-bold text-white">{assessment.isochrones.twentyFourHour.requiredPumperUnits} Units</span>
                  </div>
                </div>
                <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-red-400" />
                  <div>
                    <span className="text-[10px] text-slate-400 block">Air Drops:</span>
                    <span className="font-bold text-white">{assessment.isochrones.twentyFourHour.requiredAirDrops} Drops</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
