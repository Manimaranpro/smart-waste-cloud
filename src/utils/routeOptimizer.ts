import { Complaint, ComplaintSeverity } from '../types';

export interface RouteStop {
  stopNumber: number;
  complaint: Complaint;
  distanceFromPrevKm: number;
  drivingMinutesFromPrev: number;
  estCleanupMinutes: number;
  cumulativeDistanceKm: number;
  cumulativeTimeMinutes: number;
  lat: number;
  lng: number;
}

export interface RouteOptimizationResult {
  startLocation: { lat: number; lng: number; label: string };
  stops: RouteStop[];
  totalDistanceKm: number;
  totalDrivingMinutes: number;
  totalCleanupMinutes: number;
  totalTripMinutes: number;
  baselineDistanceKm: number;
  distanceSavedKm: number;
  distanceSavedPercent: number;
  co2SavedKg: number;
  googleMapsMultiStopUrl: string;
  algorithmUsed: 'tsp_2opt' | 'urgency_priority';
}

export type OptimizationStrategy = 'shortest_distance' | 'urgency_first';

/**
 * Calculates Great-Circle distance using Haversine formula
 */
export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
  return R * c;
}

/**
 * Estimates driving minutes in urban municipal territory (average ~25 km/h + traffic/intersection buffers)
 */
export function estimateDrivingMinutes(distanceKm: number): number {
  if (distanceKm <= 0.05) return 1;
  const baseMinutes = (distanceKm / 24) * 60;
  return Math.max(2, Math.round(baseMinutes + 1));
}

/**
 * Estimates on-site cleanup duration in minutes based on waste type and severity
 */
export function estimateCleanupMinutes(severity: ComplaintSeverity, garbageType?: string): number {
  let minutes = 15;
  if (severity === 'Critical') minutes = 30;
  else if (severity === 'High') minutes = 22;
  else if (severity === 'Medium') minutes = 15;
  else minutes = 10;

  if (garbageType === 'Construction & Heavy' || garbageType === 'Overflowing Public Dumpster') {
    minutes += 10;
  }
  return minutes;
}

/**
 * Compute total distance of an ordered tour starting from startCoords
 */
function calculateTourDistance(
  startLat: number,
  startLng: number,
  orderedComplaints: Complaint[]
): number {
  if (orderedComplaints.length === 0) return 0;
  let total = haversineDistanceKm(startLat, startLng, orderedComplaints[0].lat, orderedComplaints[0].lng);
  for (let i = 0; i < orderedComplaints.length - 1; i++) {
    total += haversineDistanceKm(
      orderedComplaints[i].lat,
      orderedComplaints[i].lng,
      orderedComplaints[i + 1].lat,
      orderedComplaints[i + 1].lng
    );
  }
  return total;
}

/**
 * 2-Opt Local Search heuristic to untangle route crossings and find minimal tour
 */
function apply2Opt(
  startLat: number,
  startLng: number,
  tour: Complaint[],
  maxIterations = 50
): Complaint[] {
  if (tour.length < 4) return tour;
  let improved = true;
  let iterations = 0;
  let currentTour = [...tour];

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    for (let i = 0; i < currentTour.length - 1; i++) {
      for (let j = i + 1; j < currentTour.length; j++) {
        // Compute distance before swap
        const prevPoint = i === 0 ? { lat: startLat, lng: startLng } : currentTour[i - 1];
        const nextPoint = j === currentTour.length - 1 ? null : currentTour[j + 1];

        const oldDist1 = haversineDistanceKm(prevPoint.lat, prevPoint.lng, currentTour[i].lat, currentTour[i].lng);
        const oldDist2 = nextPoint
          ? haversineDistanceKm(currentTour[j].lat, currentTour[j].lng, nextPoint.lat, nextPoint.lng)
          : 0;

        const newDist1 = haversineDistanceKm(prevPoint.lat, prevPoint.lng, currentTour[j].lat, currentTour[j].lng);
        const newDist2 = nextPoint
          ? haversineDistanceKm(currentTour[i].lat, currentTour[i].lng, nextPoint.lat, nextPoint.lng)
          : 0;

        if (newDist1 + newDist2 < oldDist1 + oldDist2 - 0.001) {
          // Reverse subsegment from i to j
          const sub = currentTour.slice(i, j + 1).reverse();
          currentTour.splice(i, sub.length, ...sub);
          improved = true;
          break;
        }
      }
      if (improved) break;
    }
  }

  return currentTour;
}

/**
 * Route Optimization Engine for Municipal Field Workers
 */
export function optimizeWorkerRoute(
  startLocation: { lat: number; lng: number; label?: string },
  complaintsToVisit: Complaint[],
  strategy: OptimizationStrategy = 'shortest_distance'
): RouteOptimizationResult {
  if (complaintsToVisit.length === 0) {
    return {
      startLocation: { ...startLocation, label: startLocation.label || 'Worker Current Depot / GPS' },
      stops: [],
      totalDistanceKm: 0,
      totalDrivingMinutes: 0,
      totalCleanupMinutes: 0,
      totalTripMinutes: 0,
      baselineDistanceKm: 0,
      distanceSavedKm: 0,
      distanceSavedPercent: 0,
      co2SavedKg: 0,
      googleMapsMultiStopUrl: '',
      algorithmUsed: 'tsp_2opt'
    };
  }

  const baselineDistance = calculateTourDistance(startLocation.lat, startLocation.lng, complaintsToVisit);

  // Initial Nearest Neighbor Pass
  const remaining = [...complaintsToVisit];
  const orderedTour: Complaint[] = [];
  let currentLat = startLocation.lat;
  let currentLng = startLocation.lng;

  // Severity Weight Factors for urgency-first strategy
  const getSeverityWeight = (severity: ComplaintSeverity): number => {
    if (strategy === 'shortest_distance') return 1.0;
    switch (severity) {
      case 'Critical':
        return 0.35; // Effectively appears 65% closer to prioritize hazardous spillages
      case 'High':
        return 0.65;
      case 'Medium':
        return 0.88;
      case 'Low':
      default:
        return 1.0;
    }
  };

  while (remaining.length > 0) {
    let bestIndex = 0;
    let minWeightedDistance = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const dist = haversineDistanceKm(currentLat, currentLng, remaining[i].lat, remaining[i].lng);
      const weightedDist = dist * getSeverityWeight(remaining[i].severity);

      if (weightedDist < minWeightedDistance) {
        minWeightedDistance = weightedDist;
        bestIndex = i;
      }
    }

    const nextStop = remaining.splice(bestIndex, 1)[0];
    orderedTour.push(nextStop);
    currentLat = nextStop.lat;
    currentLng = nextStop.lng;
  }

  // Refine tour using 2-Opt local search if using shortest_distance strategy
  const finalTour = strategy === 'shortest_distance'
    ? apply2Opt(startLocation.lat, startLocation.lng, orderedTour)
    : orderedTour;

  // Generate detailed stop-by-stop metrics
  let cumulativeDist = 0;
  let cumulativeTime = 0;
  let prevLat = startLocation.lat;
  let prevLng = startLocation.lng;

  const stops: RouteStop[] = finalTour.map((cmp, idx) => {
    const distFromPrev = haversineDistanceKm(prevLat, prevLng, cmp.lat, cmp.lng);
    const driveMins = estimateDrivingMinutes(distFromPrev);
    const cleanMins = estimateCleanupMinutes(cmp.severity, cmp.garbageType);

    cumulativeDist += distFromPrev;
    cumulativeTime += driveMins + cleanMins;

    prevLat = cmp.lat;
    prevLng = cmp.lng;

    return {
      stopNumber: idx + 1,
      complaint: cmp,
      distanceFromPrevKm: parseFloat(distFromPrev.toFixed(2)),
      drivingMinutesFromPrev: driveMins,
      estCleanupMinutes: cleanMins,
      cumulativeDistanceKm: parseFloat(cumulativeDist.toFixed(2)),
      cumulativeTimeMinutes: cumulativeTime,
      lat: cmp.lat,
      lng: cmp.lng
    };
  });

  const totalDistance = parseFloat(cumulativeDist.toFixed(2));
  const totalDrivingMins = stops.reduce((acc, s) => acc + s.drivingMinutesFromPrev, 0);
  const totalCleanupMins = stops.reduce((acc, s) => acc + s.estCleanupMinutes, 0);
  const totalTripMins = totalDrivingMins + totalCleanupMins;

  // Efficiency savings compared to unoptimized sequence
  const distSaved = Math.max(0, parseFloat((baselineDistance - totalDistance).toFixed(2)));
  const percentSaved = baselineDistance > 0 ? Math.round((distSaved / baselineDistance) * 100) : 0;
  // Diesel waste compactor generates ~0.28 kg CO2 per km
  const co2Saved = parseFloat((distSaved * 0.28).toFixed(2));

  // Build Multi-Stop Google Maps Directions URL
  let googleMapsUrl = '';
  if (finalTour.length === 1) {
    googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${startLocation.lat},${startLocation.lng}&destination=${finalTour[0].lat},${finalTour[0].lng}&travelmode=driving`;
  } else if (finalTour.length > 1) {
    const origin = `${startLocation.lat},${startLocation.lng}`;
    const destination = `${finalTour[finalTour.length - 1].lat},${finalTour[finalTour.length - 1].lng}`;
    const waypoints = finalTour
      .slice(0, finalTour.length - 1)
      .map((c) => `${c.lat},${c.lng}`)
      .join('|');
    googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${encodeURIComponent(waypoints)}&travelmode=driving`;
  }

  return {
    startLocation: { ...startLocation, label: startLocation.label || 'Field Worker Live Position' },
    stops,
    totalDistanceKm: totalDistance,
    totalDrivingMinutes: totalDrivingMins,
    totalCleanupMinutes: totalCleanupMins,
    totalTripMinutes: totalTripMins,
    baselineDistanceKm: parseFloat(baselineDistance.toFixed(2)),
    distanceSavedKm: distSaved,
    distanceSavedPercent: percentSaved,
    co2SavedKg: co2Saved,
    googleMapsMultiStopUrl: googleMapsUrl,
    algorithmUsed: strategy === 'shortest_distance' ? 'tsp_2opt' : 'urgency_priority'
  };
}
