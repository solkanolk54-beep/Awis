import { 
  GeoCoordinates, 
  CalculatedEvacuationRoute, 
  SafeEvacuationZone, 
  RoadSegment, 
  EvacuationPlanScenario, 
  EvacuationTurnInstruction,
  RoadSafetyStatus,
  Language 
} from '../types';
import { 
  ALGERIAN_ROAD_SEGMENTS, 
  SAFE_EVACUATION_ZONES, 
  AT_RISK_SETTLEMENTS, 
  CivilianSettlement 
} from '../data/algerianRoadNetwork';

// Haversine distance in kilometers
export function computeGeoDistanceKm(coord1: GeoCoordinates, coord2: GeoCoordinates): number {
  const R = 6371; // Earth radius in km
  const dLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const dLng = ((coord2.lng - coord1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coord1.lat * Math.PI) / 180) *
      Math.cos((coord2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

// Distance from a point to a road path (minimum distance to any vertex on the road)
export function computeMinDistanceToRoad(point: GeoCoordinates, road: RoadSegment): number {
  let minDistance = Infinity;
  for (const vertex of road.path) {
    const d = computeGeoDistanceKm(point, vertex);
    if (d < minDistance) {
      minDistance = d;
    }
  }
  return minDistance;
}

// Calculate bearing between two coordinates in degrees (0 = North, 90 = East, 180 = South, 270 = West)
export function computeBearingDegrees(from: GeoCoordinates, to: GeoCoordinates): number {
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

// Cardinal direction string from bearing
export function getCardinalDirection(bearing: number, lang: Language = 'en'): string {
  const directionsEn = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const directionsAr = ['شمال', 'شمال-شرق', 'شرق', 'جنوب-شرق', 'جنوب', 'جنوب-غرب', 'غرب', 'شمال-غرب'];
  const directionsFr = ['Nord', 'Nord-Est', 'Est', 'Sud-Est', 'Sud', 'Sud-Ouest', 'Ouest', 'Nord-Ouest'];
  
  const index = Math.round(bearing / 45) % 8;
  if (lang === 'ar') return directionsAr[index];
  if (lang === 'fr') return directionsFr[index];
  return directionsEn[index];
}

// Check if a point is inside the downwind smoke plume cone
export function isPointInsideSmokePlume(
  point: GeoCoordinates,
  fireOrigin: GeoCoordinates,
  flamePushHeadingDegrees: number, // Direction smoke is traveling
  plumeLengthKm: number = 8.5,
  plumeSpreadAngleDegrees: number = 42
): boolean {
  const distance = computeGeoDistanceKm(fireOrigin, point);
  if (distance > plumeLengthKm || distance < 0.2) return false;

  const bearing = computeBearingDegrees(fireOrigin, point);
  let angleDiff = Math.abs(bearing - flamePushHeadingDegrees);
  if (angleDiff > 180) angleDiff = 360 - angleDiff;

  return angleDiff <= plumeSpreadAngleDegrees / 2;
}

/**
 * Evaluates the safety status of a road segment given wildfire coordinates and wind
 */
export function evaluateRoadSafety(
  road: RoadSegment,
  fireCenter: GeoCoordinates,
  flamePushHeadingDegrees: number,
  fireDangerRadiusKm: number = 1.4
): { status: RoadSafetyStatus; minFireDistanceKm: number; isSmokeCompromised: boolean } {
  let minFireDistanceKm = Infinity;
  let isSmokeCompromised = false;

  for (const pt of road.path) {
    const dist = computeGeoDistanceKm(fireCenter, pt);
    if (dist < minFireDistanceKm) {
      minFireDistanceKm = dist;
    }

    if (!isSmokeCompromised && isPointInsideSmokePlume(pt, fireCenter, flamePushHeadingDegrees)) {
      isSmokeCompromised = true;
    }
  }

  // If directly encroached by flames or critical radiant heat (< 1.4 km)
  if (minFireDistanceKm <= fireDangerRadiusKm) {
    return { status: 'blocked_fire', minFireDistanceKm, isSmokeCompromised };
  }

  // If inside smoke plume, caution needed
  if (isSmokeCompromised || minFireDistanceKm < 2.5) {
    return { status: 'caution_smoke', minFireDistanceKm, isSmokeCompromised };
  }

  return { status: 'open_safe', minFireDistanceKm, isSmokeCompromised };
}

/**
 * Generates turn-by-turn navigation instructions for civilians
 */
function buildTurnInstructions(
  waypoints: GeoCoordinates[],
  roadName: string,
  safeZone: SafeEvacuationZone
): EvacuationTurnInstruction[] {
  const instructions: EvacuationTurnInstruction[] = [];
  if (waypoints.length < 2) return instructions;

  // Step 1: Initial departure
  const initialDist = computeGeoDistanceKm(waypoints[0], waypoints[1]);
  const bearing1 = computeBearingDegrees(waypoints[0], waypoints[1]);
  const card1 = getCardinalDirection(bearing1, 'en');
  const card1Ar = getCardinalDirection(bearing1, 'ar');
  const card1Fr = getCardinalDirection(bearing1, 'fr');

  instructions.push({
    stepNumber: 1,
    roadName,
    distanceKm: initialDist,
    coordinates: waypoints[0],
    turnType: 'straight',
    instructionEn: `Depart village along ${roadName} heading ${card1} away from smoke line`,
    instructionAr: `الانطلاق من القرية عبر ${roadName} باتجاه ${card1Ar} بعيداً عن عمود الدخان`,
    instructionFr: `Quitter le village par ${roadName} en direction ${card1Fr}, loin des fumées`
  });

  // Intermediate waypoints
  for (let i = 1; i < waypoints.length - 1; i++) {
    const fromPt = waypoints[i - 1];
    const currPt = waypoints[i];
    const nextPt = waypoints[i + 1];

    const segDist = computeGeoDistanceKm(currPt, nextPt);
    const bBefore = computeBearingDegrees(fromPt, currPt);
    const bAfter = computeBearingDegrees(currPt, nextPt);

    let angleDelta = bAfter - bBefore;
    if (angleDelta > 180) angleDelta -= 360;
    if (angleDelta < -180) angleDelta += 360;

    let turnType: 'straight' | 'turn_left' | 'turn_right' | 'fork' = 'straight';
    let turnEn = 'Continue straight on';
    let turnAr = 'مواصلة السير مباشرة عبر';
    let turnFr = 'Continuer tout droit sur';

    if (angleDelta > 28) {
      turnType = 'turn_right';
      turnEn = 'Turn right onto safety corridor';
      turnAr = 'الانعطاف يميناً نحو الممر الآمن';
      turnFr = 'Tourner à droite sur le corridor sécurisé';
    } else if (angleDelta < -28) {
      turnType = 'turn_left';
      turnEn = 'Turn left avoiding ridge crest';
      turnAr = 'الانعطاف يساراً وتجنب قمة المنحدر';
      turnFr = 'Tourner à gauche en évitant les crêtes';
    }

    instructions.push({
      stepNumber: i + 1,
      roadName,
      distanceKm: segDist,
      coordinates: currPt,
      turnType,
      instructionEn: `${turnEn} (${segDist} km)`,
      instructionAr: `${turnAr} (${segDist} كم)`,
      instructionFr: `${turnFr} (${segDist} km)`
    });
  }

  // Final step: Arrival at safe hub
  const lastIndex = waypoints.length - 1;
  instructions.push({
    stepNumber: instructions.length + 1,
    roadName: safeZone.nameEn,
    distanceKm: 0.3,
    coordinates: waypoints[lastIndex],
    turnType: 'arrive',
    instructionEn: `Arrive at Safe Haven: ${safeZone.nameEn} (Reception & Medical Triage)`,
    instructionAr: `الوصول إلى الملاذ الآمن: ${safeZone.nameAr} (مركز الاستقبال والفرز الطبي)`,
    instructionFr: `Arrivée au Refuge Sécurisé: ${safeZone.nameFr} (Accueil et Triage Médical)`
  });

  return instructions;
}

/**
 * Topological Road Network Graph Definition for Graph-Based Pathfinding
 */
export interface GraphNode {
  id: string;
  name: string;
  nameAr?: string;
  nameFr?: string;
  coordinates: GeoCoordinates;
  type: 'settlement' | 'junction' | 'shelter' | 'waypoint';
  settlementId?: string;
  shelterId?: string;
}

export interface GraphEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  roadSegmentId: string;
  roadName: string;
  roadNameAr: string;
  roadNameFr: string;
  roadType: string;
  distanceKm: number;
  speedLimitKmH: number;
  lanes: number;
  capacityVehiclesPerHour: number;
  elevationGainMeters: number;
  path: GeoCoordinates[];
}

export interface RoadNetworkGraph {
  nodes: Map<string, GraphNode>;
  adjacency: Map<string, GraphEdge[]>;
}

export interface GraphPathfindingResult {
  route: CalculatedEvacuationRoute;
  nodesExplored: number;
  executionTimeMs: number;
  totalCost: number;
}

/**
 * Builds the comprehensive Algerian Road Network topological graph.
 * Automatically identifies junctions where road paths intersect or connect,
 * and links all at-risk settlements and designated safe evacuation zones.
 */
export function buildAlgerianRoadGraph(): RoadNetworkGraph {
  const nodes = new Map<string, GraphNode>();
  const adjacency = new Map<string, GraphEdge[]>();

  const addNode = (node: GraphNode) => {
    if (!nodes.has(node.id)) {
      nodes.set(node.id, node);
      adjacency.set(node.id, []);
    }
  };

  const addEdge = (edge: GraphEdge) => {
    const list = adjacency.get(edge.fromNodeId) || [];
    list.push(edge);
    adjacency.set(edge.fromNodeId, list);
  };

  // Helper to find existing node within snap threshold (0.35 km) or register new
  const getOrCreateJunctionNode = (coord: GeoCoordinates, label: string): string => {
    for (const [id, node] of nodes.entries()) {
      if (computeGeoDistanceKm(node.coordinates, coord) <= 0.35) {
        return id;
      }
    }
    const nodeId = `JUNCTION-${label.replace(/\s+/g, '-').toUpperCase()}-${nodes.size + 1}`;
    addNode({
      id: nodeId,
      name: label,
      coordinates: coord,
      type: 'junction'
    });
    return nodeId;
  };

  // 1. Ingest all Algerian Road Segments and build connected topological graph
  for (const road of ALGERIAN_ROAD_SEGMENTS) {
    if (!road.path || road.path.length < 2) continue;

    let prevNodeId = getOrCreateJunctionNode(road.path[0], `${road.roadNumber}-0`);

    for (let i = 1; i < road.path.length; i++) {
      const currPt = road.path[i];
      const isLast = i === road.path.length - 1;
      const currNodeId = getOrCreateJunctionNode(
        currPt, 
        `${road.roadNumber}-${i}${isLast ? '-END' : ''}`
      );

      const segDist = computeGeoDistanceKm(road.path[i - 1], currPt);
      const subPath = [road.path[i - 1], currPt];

      // Forward Edge
      const fwdEdgeId = `EDGE-${road.id}-${prevNodeId}-TO-${currNodeId}`;
      addEdge({
        id: fwdEdgeId,
        fromNodeId: prevNodeId,
        toNodeId: currNodeId,
        roadSegmentId: road.id,
        roadName: road.nameEn,
        roadNameAr: road.nameAr,
        roadNameFr: road.nameFr,
        roadType: road.type,
        distanceKm: segDist,
        speedLimitKmH: road.speedLimitKmH,
        lanes: road.lanes,
        capacityVehiclesPerHour: road.capacityVehiclesPerHour,
        elevationGainMeters: (road.elevationGainMeters || 0) / (road.path.length - 1),
        path: subPath
      });

      // Backward Edge (Bi-directional Algerian Road)
      const bwdEdgeId = `EDGE-${road.id}-${currNodeId}-TO-${prevNodeId}`;
      addEdge({
        id: bwdEdgeId,
        fromNodeId: currNodeId,
        toNodeId: prevNodeId,
        roadSegmentId: road.id,
        roadName: road.nameEn,
        roadNameAr: road.nameAr,
        roadNameFr: road.nameFr,
        roadType: road.type,
        distanceKm: segDist,
        speedLimitKmH: road.speedLimitKmH * 0.95,
        lanes: road.lanes,
        capacityVehiclesPerHour: road.capacityVehiclesPerHour,
        elevationGainMeters: -((road.elevationGainMeters || 0) / (road.path.length - 1)),
        path: [currPt, road.path[i - 1]]
      });

      prevNodeId = currNodeId;
    }
  }

  // 2. Register and link All At-Risk Civilian Settlements into the Graph
  for (const settlement of AT_RISK_SETTLEMENTS) {
    const settleNodeId = `NODE-SETTLE-${settlement.id}`;
    addNode({
      id: settleNodeId,
      name: settlement.nameEn,
      nameAr: settlement.nameAr,
      nameFr: settlement.nameFr,
      coordinates: settlement.coordinates,
      type: 'settlement',
      settlementId: settlement.id
    });

    // Link settlement to its designated primary and secondary road junctions
    // Connect to nearest road graph nodes
    let nearestNodeA: { id: string; dist: number } | null = null;
    let nearestNodeB: { id: string; dist: number } | null = null;

    for (const [id, node] of nodes.entries()) {
      if (node.type === 'settlement' || node.type === 'shelter') continue;
      const d = computeGeoDistanceKm(settlement.coordinates, node.coordinates);
      if (!nearestNodeA || d < nearestNodeA.dist) {
        nearestNodeB = nearestNodeA;
        nearestNodeA = { id, dist: d };
      } else if (!nearestNodeB || d < nearestNodeB.dist) {
        nearestNodeB = { id, dist: d };
      }
    }

    if (nearestNodeA) {
      const edgeOutId = `EDGE-CONNECT-${settleNodeId}-TO-${nearestNodeA.id}`;
      addEdge({
        id: edgeOutId,
        fromNodeId: settleNodeId,
        toNodeId: nearestNodeA.id,
        roadSegmentId: settlement.primaryRoadAccessId,
        roadName: `${settlement.nameEn} Primary Access Road`,
        roadNameAr: `طريق نفاذ ${settlement.nameAr} الرئيسي`,
        roadNameFr: `Voie d'accès principale ${settlement.nameFr}`,
        roadType: 'wilaya',
        distanceKm: nearestNodeA.dist,
        speedLimitKmH: 50,
        lanes: 2,
        capacityVehiclesPerHour: 800,
        elevationGainMeters: 40,
        path: [settlement.coordinates, nodes.get(nearestNodeA.id)!.coordinates]
      });
    }

    if (nearestNodeB && nearestNodeB.dist < 8.0) {
      const edgeOutBId = `EDGE-CONNECT-${settleNodeId}-TO-${nearestNodeB.id}`;
      addEdge({
        id: edgeOutBId,
        fromNodeId: settleNodeId,
        toNodeId: nearestNodeB.id,
        roadSegmentId: settlement.secondaryRoadAccessId,
        roadName: `${settlement.nameEn} Secondary Contingency Access`,
        roadNameAr: `طريق نفاذ ${settlement.nameAr} الثانوي الاحتياطي`,
        roadNameFr: `Voie d'accès secondaire ${settlement.nameFr}`,
        roadType: 'mountain_pass',
        distanceKm: nearestNodeB.dist,
        speedLimitKmH: 40,
        lanes: 1,
        capacityVehiclesPerHour: 400,
        elevationGainMeters: 75,
        path: [settlement.coordinates, nodes.get(nearestNodeB.id)!.coordinates]
      });
    }
  }

  // 3. Register and link All Safe Evacuation Zones into the Graph
  for (const shelter of SAFE_EVACUATION_ZONES) {
    const shelterNodeId = `NODE-SHELTER-${shelter.id}`;
    addNode({
      id: shelterNodeId,
      name: shelter.nameEn,
      nameAr: shelter.nameAr,
      nameFr: shelter.nameFr,
      coordinates: shelter.coordinates,
      type: 'shelter',
      shelterId: shelter.id
    });

    // Link closest road junctions to this safe shelter
    for (const [id, node] of nodes.entries()) {
      if (node.type === 'settlement' || node.type === 'shelter') continue;
      const d = computeGeoDistanceKm(shelter.coordinates, node.coordinates);
      if (d <= 6.5) {
        addEdge({
          id: `EDGE-INTO-${id}-TO-${shelterNodeId}`,
          fromNodeId: id,
          toNodeId: shelterNodeId,
          roadSegmentId: `SAFE-ACCESS-${shelter.id}`,
          roadName: `${shelter.nameEn} Ingress Gate`,
          roadNameAr: `مدخل ${shelter.nameAr}`,
          roadNameFr: `Accès sécurisé ${shelter.nameFr}`,
          roadType: 'national',
          distanceKm: d,
          speedLimitKmH: 60,
          lanes: 2,
          capacityVehiclesPerHour: 1500,
          elevationGainMeters: 0,
          path: [node.coordinates, shelter.coordinates]
        });
      }
    }
  }

  return { nodes, adjacency };
}

// Cached singleton graph instance for fast pathfinding query execution
let CACHED_ROAD_GRAPH: RoadNetworkGraph | null = null;
function getRoadNetworkGraph(): RoadNetworkGraph {
  if (!CACHED_ROAD_GRAPH) {
    CACHED_ROAD_GRAPH = buildAlgerianRoadGraph();
  }
  return CACHED_ROAD_GRAPH;
}

/**
 * Evaluates dynamic cost for traversing an edge under active wildfire conditions.
 * Graph edges closer than 1.4km to confirmed fire perimeter are impassable (infinite weight).
 * Edges inside the wind smoke plume or within heat radiation zones incur exponential penalties.
 */
function computeDynamicEdgeCost(
  edge: GraphEdge,
  fireCenter: GeoCoordinates,
  flamePushHeadingDegrees: number,
  plumeLengthKm: number,
  avoidEdgeIds?: Set<string>,
  evacuatingPopulation: number = 1500
): { cost: number; isBlocked: boolean; minFireClearanceKm: number; hasSmoke: boolean } {
  let minFireClearanceKm = Infinity;
  let hasSmoke = false;

  for (const pt of edge.path) {
    const d = computeGeoDistanceKm(pt, fireCenter);
    if (d < minFireClearanceKm) minFireClearanceKm = d;
    if (!hasSmoke && isPointInsideSmokePlume(pt, fireCenter, flamePushHeadingDegrees, plumeLengthKm)) {
      hasSmoke = true;
    }
  }

  // 1. Critical Radiant Heat / Active Flame Front Blocking Threshold (< 1.4 km)
  if (minFireClearanceKm <= 1.4) {
    return {
      cost: 1000000, // Impassable
      isBlocked: true,
      minFireClearanceKm,
      hasSmoke
    };
  }

  // 2. Base transit time in minutes
  const speed = Math.max(25, edge.speedLimitKmH);
  let cost = (edge.distanceKm / speed) * 60;

  // 3. Flame proximity exponential penalty (1.4 km to 4.5 km)
  if (minFireClearanceKm < 4.5) {
    const proximityRatio = Math.max(0, 1 - (minFireClearanceKm - 1.4) / 3.1);
    cost += 120 * Math.exp(proximityRatio * 2.2);
  }

  // 4. Downwind toxic smoke plume penalty
  if (hasSmoke) {
    cost += 45; // Substantial penalty due to zero visibility, respiratory hazard, convoy slowdown
  }

  // 5. Road capacity bottleneck delay
  const convoys = Math.ceil(evacuatingPopulation / 3.5);
  const throughput = Math.max(300, edge.capacityVehiclesPerHour);
  cost += (convoys / throughput) * 12;

  // 6. Steep mountain pass grade penalty
  if (edge.elevationGainMeters > 200) {
    cost += (edge.elevationGainMeters / 100) * 3;
  }

  // 7. Edge avoidance multiplier (used for secondary contingency path finding)
  if (avoidEdgeIds && avoidEdgeIds.has(edge.id)) {
    cost *= 5.0;
  }

  return {
    cost,
    isBlocked: false,
    minFireClearanceKm,
    hasSmoke
  };
}

/**
 * Graph-Based Pathfinding (Dijkstra / A* Algorithm)
 * Finds the mathematically optimal evacuation route from a civilian settlement to the safest available shelter.
 */
export function findOptimalEvacuationRouteGraph(
  settlement: CivilianSettlement,
  targetShelters: SafeEvacuationZone[],
  fireCenter: GeoCoordinates,
  flamePushHeadingDegrees: number,
  windSpeedKmH: number = 38,
  avoidEdgeIds?: Set<string>,
  isContingencyRoute: boolean = false
): GraphPathfindingResult {
  const startTime = performance.now();
  const graph = getRoadNetworkGraph();
  const startNodeId = `NODE-SETTLE-${settlement.id}`;

  const plumeLengthKm = Math.min(16, 5 + (windSpeedKmH / 10) * 2.2);

  // Set of target shelter node IDs
  const targetNodeIds = new Set(targetShelters.map((s) => `NODE-SHELTER-${s.id}`));

  // Min-Priority Queue state for Dijkstra / A*
  const distances = new Map<string, number>();
  const previousEdges = new Map<string, { edge: GraphEdge; fromNodeId: string }>();
  const visited = new Set<string>();

  // A* Heuristic: minimum straight-line distance to any target shelter
  const getHeuristic = (nodeId: string): number => {
    const node = graph.nodes.get(nodeId);
    if (!node) return 0;
    let minDist = Infinity;
    for (const shelter of targetShelters) {
      const d = computeGeoDistanceKm(node.coordinates, shelter.coordinates);
      if (d < minDist) minDist = d;
    }
    return (minDist / 80) * 60; // Optimistic estimate in minutes at 80km/h
  };

  // Min-Priority queue array [nodeId, priority]
  const pq: Array<{ nodeId: string; priority: number; dist: number }> = [];

  distances.set(startNodeId, 0);
  pq.push({ nodeId: startNodeId, priority: getHeuristic(startNodeId), dist: 0 });

  let targetReachedNodeId: string | null = null;
  let nodesExplored = 0;

  while (pq.length > 0) {
    // Extract node with minimum priority (A* f-score)
    pq.sort((a, b) => a.priority - b.priority);
    const current = pq.shift()!;
    const u = current.nodeId;

    if (visited.has(u)) continue;
    visited.add(u);
    nodesExplored++;

    // Target reached check
    if (targetNodeIds.has(u)) {
      targetReachedNodeId = u;
      break;
    }

    const currentDist = distances.get(u) ?? Infinity;
    const neighbors = graph.adjacency.get(u) || [];

    for (const edge of neighbors) {
      const v = edge.toNodeId;
      if (visited.has(v)) continue;

      const edgeEval = computeDynamicEdgeCost(
        edge,
        fireCenter,
        flamePushHeadingDegrees,
        plumeLengthKm,
        avoidEdgeIds,
        settlement.population
      );

      // Skip impassable blocked roads unless absolutely forced
      if (edgeEval.isBlocked) continue;

      const newDist = currentDist + edgeEval.cost;
      const existingDist = distances.get(v) ?? Infinity;

      if (newDist < existingDist) {
        distances.set(v, newDist);
        previousEdges.set(v, { edge, fromNodeId: u });
        const priority = newDist + getHeuristic(v);
        pq.push({ nodeId: v, priority, dist: newDist });
      }
    }
  }

  // Fallback: If no target was directly reached (e.g. fire blocked all direct roads), pick closest explored shelter
  if (!targetReachedNodeId) {
    let bestDist = Infinity;
    for (const sNodeId of targetNodeIds) {
      const d = distances.get(sNodeId);
      if (d !== undefined && d < bestDist) {
        bestDist = d;
        targetReachedNodeId = sNodeId;
      }
    }
  }

  // Determine chosen safe zone
  let chosenShelter: SafeEvacuationZone = targetShelters[0] || SAFE_EVACUATION_ZONES[0];
  if (targetReachedNodeId) {
    const node = graph.nodes.get(targetReachedNodeId);
    if (node?.shelterId) {
      const s = targetShelters.find((z) => z.id === node.shelterId);
      if (s) chosenShelter = s;
    }
  }

  // Reconstruct path of edges
  const pathEdges: GraphEdge[] = [];
  let curr = targetReachedNodeId;

  while (curr && curr !== startNodeId) {
    const step = previousEdges.get(curr);
    if (!step) break;
    pathEdges.unshift(step.edge);
    curr = step.fromNodeId;
  }

  // If path reconstruction failed, build direct fallback route
  if (pathEdges.length === 0) {
    const fallbackPt = [settlement.coordinates, chosenShelter.coordinates];
    const totalDist = computeGeoDistanceKm(settlement.coordinates, chosenShelter.coordinates);
    const executionTimeMs = performance.now() - startTime;

    const fallbackRoute: CalculatedEvacuationRoute = {
      id: `ROUTE-${settlement.id}-${isContingencyRoute ? 'SECONDARY' : 'PRIMARY'}`,
      settlementId: settlement.id,
      settlementName: settlement.nameEn,
      settlementNameAr: settlement.nameAr,
      safeZone: chosenShelter,
      routeType: isContingencyRoute ? 'secondary_contingency' : 'primary_optimal',
      status: 'caution_smoke',
      totalDistanceKm: totalDist,
      estimatedTravelMinutes: Math.round((totalDist / 45) * 60),
      estimatedEvacuationClearanceMinutes: Math.round((totalDist / 45) * 60) + 20,
      minFireClearanceKm: 3.5,
      smokeExposureRisk: 'moderate',
      bottleneckRiskIndex: 45,
      waypoints: fallbackPt,
      instructions: buildTurnInstructions(fallbackPt, 'Emergency Evacuation Corridor', chosenShelter),
      roadSegmentsUsed: [settlement.primaryRoadAccessId],
      logisticsRequired: {
        ambulances: Math.max(2, Math.ceil(settlement.vulnerableCount * 0.04)),
        buses: Math.max(3, Math.ceil(settlement.vulnerableCount / 38)),
        policeEscorts: Math.max(2, Math.ceil(settlement.population / 750)),
        medicalStaff: Math.max(4, Math.ceil(settlement.vulnerableCount * 0.06))
      }
    };

    return {
      route: fallbackRoute,
      nodesExplored,
      executionTimeMs,
      totalCost: 100
    };
  }

  // Assemble full waypoints from edge paths
  const waypoints: GeoCoordinates[] = [settlement.coordinates];
  let totalDistanceKm = 0;
  let minFireClearanceKm = Infinity;
  let hasSmokeEncountered = false;
  const roadIdsUsed = new Set<string>();

  for (const edge of pathEdges) {
    roadIdsUsed.add(edge.roadSegmentId);
    for (const pt of edge.path) {
      const d = computeGeoDistanceKm(pt, fireCenter);
      if (d < minFireClearanceKm) minFireClearanceKm = d;
      if (!hasSmokeEncountered && isPointInsideSmokePlume(pt, fireCenter, flamePushHeadingDegrees, plumeLengthKm)) {
        hasSmokeEncountered = true;
      }
      waypoints.push(pt);
    }
  }
  waypoints.push(chosenShelter.coordinates);

  // Clean duplicate consecutive coordinates
  const cleanWaypoints = waypoints.filter((pt, idx, arr) => {
    if (idx === 0) return true;
    return computeGeoDistanceKm(pt, arr[idx - 1]) > 0.08;
  });

  // Calculate cumulative distance
  for (let i = 1; i < cleanWaypoints.length; i++) {
    totalDistanceKm += computeGeoDistanceKm(cleanWaypoints[i - 1], cleanWaypoints[i]);
  }
  totalDistanceKm = Number(totalDistanceKm.toFixed(1));

  // Travel time and clearance calculations
  const avgSpeed = 60;
  const travelMinutes = Math.max(5, Math.round((totalDistanceKm / avgSpeed) * 60));
  const bottleneckFactor = Math.min(100, Math.round((settlement.population / 1200) * 40));
  const clearanceMinutes = travelMinutes + Math.round(bottleneckFactor * 0.35) + 12;

  const isBlocked = minFireClearanceKm <= 1.4;
  const status: RoadSafetyStatus = isBlocked
    ? 'blocked_fire'
    : hasSmokeEncountered || minFireClearanceKm < 2.5
    ? 'caution_smoke'
    : 'open_safe';

  const executionTimeMs = Number((performance.now() - startTime).toFixed(2));
  const totalCost = distances.get(targetReachedNodeId || '') || travelMinutes;

  const route: CalculatedEvacuationRoute = {
    id: `ROUTE-${settlement.id}-${isContingencyRoute ? 'SECONDARY' : 'PRIMARY'}`,
    settlementId: settlement.id,
    settlementName: settlement.nameEn,
    settlementNameAr: settlement.nameAr,
    safeZone: chosenShelter,
    routeType: isBlocked
      ? 'compromised_blocked'
      : isContingencyRoute
      ? 'secondary_contingency'
      : 'primary_optimal',
    status,
    totalDistanceKm,
    estimatedTravelMinutes: travelMinutes,
    estimatedEvacuationClearanceMinutes: clearanceMinutes,
    minFireClearanceKm: Number(minFireClearanceKm.toFixed(1)),
    smokeExposureRisk: hasSmokeEncountered ? 'moderate' : 'none',
    bottleneckRiskIndex: bottleneckFactor,
    waypoints: cleanWaypoints,
    instructions: buildTurnInstructions(
      cleanWaypoints,
      pathEdges[0]?.roadName || 'Designated Safe Evacuation Corridor',
      chosenShelter
    ),
    roadSegmentsUsed: Array.from(roadIdsUsed),
    logisticsRequired: {
      ambulances: Math.max(2, Math.ceil(settlement.vulnerableCount * 0.04)),
      buses: Math.max(3, Math.ceil(settlement.vulnerableCount / 38)),
      policeEscorts: Math.max(2, Math.ceil(settlement.population / 750)),
      medicalStaff: Math.max(4, Math.ceil(settlement.vulnerableCount * 0.06))
    }
  };

  return {
    route,
    nodesExplored,
    executionTimeMs,
    totalCost
  };
}

/**
 * Main Smart Evacuation Routing Optimizer:
 * Calculates Primary & Secondary optimal evacuation routes for all settlements
 * near confirmed fire incidents utilizing the Graph-Based Pathfinding engine.
 */
export function calculateSmartEvacuationPlan(
  fireCenter: GeoCoordinates,
  windHeadingDegrees: number, // 0-360
  windSpeedKmH: number = 38,
  incidentId: string = 'ACTIVE-INCIDENT'
): EvacuationPlanScenario {
  // 1. Calculate downwind smoke plume cone
  const flamePushHeadingDegrees = windHeadingDegrees;
  const plumeLengthKm = Math.min(16, 5 + (windSpeedKmH / 10) * 2.2);

  // 2. Evaluate all roads in the network for safety tagging
  const evaluatedRoads = ALGERIAN_ROAD_SEGMENTS.map((road) => {
    const safety = evaluateRoadSafety(road, fireCenter, flamePushHeadingDegrees);
    return {
      road,
      ...safety
    };
  });

  const blockedRoadIds = evaluatedRoads
    .filter((r) => r.status === 'blocked_fire')
    .map((r) => r.road.id);

  // 3. Settlements within perimeter (35 km)
  const relevantSettlements = AT_RISK_SETTLEMENTS.filter((settlement) => {
    const dist = computeGeoDistanceKm(settlement.coordinates, fireCenter);
    return dist <= 38;
  });

  const settlementRoutes: CalculatedEvacuationRoute[] = [];
  let totalPopulationAtRisk = 0;

  for (const settlement of relevantSettlements) {
    totalPopulationAtRisk += settlement.population;

    // Filter viable safe shelters (at least 4.5km away from active fire perimeter)
    const viableShelters = SAFE_EVACUATION_ZONES
      .filter((z) => computeGeoDistanceKm(fireCenter, z.coordinates) >= 4.5)
      .sort(
        (a, b) =>
          computeGeoDistanceKm(settlement.coordinates, a.coordinates) -
          computeGeoDistanceKm(settlement.coordinates, b.coordinates)
      );

    // Run Graph-Based Pathfinding for Primary Route (A* / Dijkstra)
    const primaryResult = findOptimalEvacuationRouteGraph(
      settlement,
      viableShelters,
      fireCenter,
      flamePushHeadingDegrees,
      windSpeedKmH,
      undefined,
      false
    );
    settlementRoutes.push(primaryResult.route);

    // Run Graph-Based Pathfinding for Secondary Route (penalizing primary edges)
    const usedEdges = new Set<string>();
    for (const rId of primaryResult.route.roadSegmentsUsed) {
      usedEdges.add(rId);
    }

    const secondaryResult = findOptimalEvacuationRouteGraph(
      settlement,
      viableShelters.slice(1).concat(viableShelters.slice(0, 1)),
      fireCenter,
      flamePushHeadingDegrees,
      windSpeedKmH,
      usedEdges,
      true
    );
    settlementRoutes.push(secondaryResult.route);
  }

  return {
    id: `EVAC-PLAN-${Date.now()}`,
    incidentId,
    generatedAt: new Date().toISOString(),
    activeFireCenter: fireCenter,
    windHeadingDegrees,
    windSpeedKmH,
    smokePlumeCone: {
      origin: fireCenter,
      headingDegrees: flamePushHeadingDegrees,
      lengthKm: plumeLengthKm,
      spreadAngleDegrees: 42
    },
    settlementRoutes,
    blockedRoadIds,
    totalPopulationAtRisk,
    totalEvacuatedCount: Math.round(totalPopulationAtRisk * 0.18),
    advisoryStatus: 'mandatory_immediate'
  };
}

/**
 * Generates an official Civil Protection Emergency SMS / Radio Broadcast Dispatch Alert
 */
export function generateCivilDefenseEvacuationBroadcast(
  route: CalculatedEvacuationRoute,
  settlement: CivilianSettlement,
  lang: Language = 'ar'
): { title: string; body: string; urgentActionText: string } {
  if (lang === 'ar') {
    return {
      title: `إنذار إخلاء استعجالي فوري — الحماية المدنية الجزائرية`,
      body: `إلى كافة مواطني ${settlement.nameAr}: نظراً لسرعة انتشار ألسنة اللهب باتجاه التجمعات السكنية، تقرر الإخلاء الفوري والمنظم. يرجى سلك المسار الآمن المحدد: ${route.instructions[0]?.roadName || 'الممر الرئيسي'} وصولاً إلى ${route.safeZone.nameAr}. تم تجهيز المركز بفرق طبية ومؤن. يمنع منعاً باتاً التوجه نحو الطرق المتاخمة للغابة لتفادي الاختناق بالدخان وسقوط الأشجار.`,
      urgentActionText: `أرقام الطوارئ المجانية: 14 (الحماية المدنية) • 1021 (الرقم الأخضر) • تردد الراديو المحلي: ${route.safeZone.emergencyVhfFrequency}`
    };
  }

  if (lang === 'fr') {
    return {
      title: `ALERTE D'ÉVACUATION IMMÉDIATE — PROTECTION CIVILE`,
      body: `À l'attention des résidents de ${settlement.nameFr}: En raison de la propagation rapide du front de flamme, l'évacuation immédiate est ordonnée. Empruntez l'itinéraire sécurisé via ${route.instructions[0]?.roadName || 'Axe Principal'} vers le refuge: ${route.safeZone.nameFr}. Évitez impérativement les pistes forestières compromises par les fumées toxiques.`,
      urgentActionText: `Urgences: 14 (Protection Civile) • 1021 • Fréquence VHF: ${route.safeZone.emergencyVhfFrequency}`
    };
  }

  return {
    title: `IMMEDIATE EVACUATION ORDER — CIVIL PROTECTION ALGERIA`,
    body: `To all residents of ${settlement.nameEn}: Due to rapid wildfire advance, mandatory evacuation is in effect. Proceed immediately along designated safe corridor ${route.instructions[0]?.roadName || 'Primary Axis'} to safe shelter: ${route.safeZone.nameEn}. Avoid forest roads due to toxic smoke plumes and flame entrapment risk.`,
    urgentActionText: `Emergency Hotline: 14 / 1021 • VHF Emergency Channel: ${route.safeZone.emergencyVhfFrequency}`
  };
}
