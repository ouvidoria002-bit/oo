import { LINE_KML_MAPPING } from './constants';
// @ts-ignore
import * as turf from '@turf/turf';

// Cache for Turf features (for general matching)
const routeCache: Record<string, any> = {};

// Cache for Raw Coordinates (for animation snapping)
const rawRouteCache: Record<string, number[][]> = {};

export const loadAllRoutes = async () => {
    const promises = Object.entries(LINE_KML_MAPPING).map(async ([lineDetail, filename]) => {
        try {
            const response = await fetch(`/kml-exports/${filename}`);
            if (!response.ok) return;
            const text = await response.text();

            // Improved KML Parser
            const coordsList: number[][][] = [];
            const regex = /<coordinates>([\s\S]*?)<\/coordinates>/g;
            let match;

            while ((match = regex.exec(text)) !== null) {
                const content = match[1];
                const rawPoints = content.trim().split(/\s+/);

                const points = rawPoints.map(pair => {
                    const parts = pair.split(',');
                    const lng = parseFloat(parts[0]);
                    const lat = parseFloat(parts[1]);
                    if (isNaN(lng) || isNaN(lat)) return null;
                    return [lng, lat];
                }).filter((p): p is number[] => p !== null);

                if (points.length >= 2) {
                    coordsList.push(points);
                }
            }

            if (coordsList.length > 0) {
                // Determine the main route (usually the longest or first valid one)
                // For raw cache, we want a SINGLE flat line for the main route if possible, 
                // or we handle multi-polys by flattening them if they are connected.
                // For simplicity, we take the longest segment or flat all if they are contiguous?
                // Let's take the longest segment as the "Main Path" for simple following.
                const longestSegment = coordsList.reduce((prev, current) => (prev.length > current.length) ? prev : current);

                // Store as [Lat, Lng] for easier usage in our math functions (Leaflet style)
                // Note: KML/Turf is [Lng, Lat]. We swap here for internal Calc.
                rawRouteCache[lineDetail] = longestSegment.map(p => [p[1], p[0]]);

                if (coordsList.length === 1) {
                    routeCache[lineDetail] = turf.lineString(coordsList[0]);
                } else {
                    routeCache[lineDetail] = turf.multiLineString(coordsList);
                }
            }

        } catch (e) {
            console.warn(`Failed to load route for analysis: ${lineDetail}`, e);
        }
    });

    await Promise.all(promises);
    console.log(`Loaded ${Object.keys(routeCache).length} routes for matching.`);
};

// --- Math Helpers for Projection ---

interface SnapResult {
    point: [number, number]; // Lat, Lng
    index: number;
    distance: number; // in meters (approx)
}

function getClosestPointOnSegment(p: [number, number], p1: [number, number], p2: [number, number]): { point: [number, number] } {
    const x = p[0], y = p[1];
    const x1 = p1[0], y1 = p1[1];
    const x2 = p2[0], y2 = p2[1];

    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;

    if (param < 0) {
        xx = x1; yy = y1;
    } else if (param > 1) {
        xx = x2; yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }

    return { point: [xx, yy] };
}

// Distance in meters (rough approx)
function getDistanceMeters(p1: [number, number], p2: [number, number]): number {
    const R = 6371e3; // metres
    const φ1 = p1[0] * Math.PI / 180; // φ, λ in radians
    const φ2 = p2[0] * Math.PI / 180;
    const Δφ = (p2[0] - p1[0]) * Math.PI / 180;
    const Δλ = (p2[1] - p1[1]) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

export const getProjectedPosition = (lat: number, lng: number, lineId: string, lastIndex: number = -1): SnapResult | null => {
    const points = rawRouteCache[lineId];
    if (!points || points.length < 2) return null;

    const latlng: [number, number] = [lat, lng];
    const WINDOW_SIZE = 150;
    const SEARCH_BACK = 20;
    const SNAP_DIST = 100; // meters

    const searchIndices: { start: number, end: number }[] = [];

    if (lastIndex < 0) {
        searchIndices.push({ start: 0, end: points.length - 1 });
    } else {
        const start = Math.max(0, lastIndex - SEARCH_BACK);
        const end = Math.min(points.length - 1, lastIndex + WINDOW_SIZE);
        searchIndices.push({ start, end });

        // Loop handling
        if (lastIndex > points.length - WINDOW_SIZE) {
            searchIndices.push({ start: 0, end: WINDOW_SIZE });
        }
    }

    let best: SnapResult | null = null;

    for (const range of searchIndices) {
        for (let i = range.start; i < range.end; i++) {
            // Safe cast assuming cache is correct
            const p1 = points[i];
            const p2 = points[i + 1];
            if (!p1 || !p2 || p1.length < 2 || p2.length < 2) continue;

            const safeP1: [number, number] = [p1[0], p1[1]];
            const safeP2: [number, number] = [p2[0], p2[1]];

            const info = getClosestPointOnSegment(latlng, safeP1, safeP2);
            const dist = getDistanceMeters(latlng, info.point);

            if (dist < SNAP_DIST) {
                let isBetter = false;
                if (!best) {
                    isBetter = true;
                } else {
                    const distDiff = dist - best.distance;
                    if (distDiff < -5) {
                        isBetter = true;
                    } else if (Math.abs(distDiff) < 5) {
                        // Tie-break with Sequence
                        if (lastIndex >= 0) {
                            const currentGap = Math.abs(i - lastIndex);
                            const bestGap = Math.abs(best.index - lastIndex);
                            if (currentGap < bestGap) isBetter = true;
                        } else {
                            if (dist < best.distance) isBetter = true;
                        }
                    }
                }

                if (isBetter) {
                    best = { point: info.point, index: i, distance: dist };
                }
            }
        }
    }

    return best;
};

// Returns the path segment from Start to End for smooth animation
export const getSnappedPath = (startIdx: number, endIdx: number, lineId: string): [number, number][] | null => {
    const points = rawRouteCache[lineId];
    if (!points || startIdx < 0 || endIdx < 0) return null;

    // Check for "Teleport" (Large gap)
    if (Math.abs(endIdx - startIdx) > 50) {
        // Just return start/end points for linear move
        const pStart = points[startIdx];
        const pEnd = points[endIdx];
        if (pStart.length >= 2 && pEnd.length >= 2) {
            return [[pStart[0], pStart[1]], [pEnd[0], pEnd[1]]];
        }
        return null;
    }

    const path: [number, number][] = [];

    if (startIdx <= endIdx) {
        for (let i = startIdx; i <= endIdx; i++) {
            const p = points[i];
            if (p.length >= 2) path.push([p[0], p[1]]);
        }
    } else {
        // Backward? Just linear fallback
        const pStart = points[startIdx];
        const pEnd = points[endIdx];
        if (pStart.length >= 2 && pEnd.length >= 2) {
            return [[pStart[0], pStart[1]], [pEnd[0], pEnd[1]]];
        }
    }

    return path;
};


// Main Matcher (Legacy, used for detecting line ID if unknown)
export const matchBusToRoute = (lat: number, lng: number): string | null => {
    const busPoint = turf.point([lng, lat]);
    let bestLine: string | null = null;
    let minDistance = Infinity;
    const MAX_DIST_KM = 0.1;

    Object.entries(routeCache).forEach(([lineId, geomFeature]) => {
        if (!geomFeature) return;

        let distance = Infinity;
        try {
            if (geomFeature.geometry.type === 'LineString') {
                distance = turf.pointToLineDistance(busPoint, geomFeature, { units: 'kilometers' });
            } else if (geomFeature.geometry.type === 'MultiLineString') {
                const flattened = turf.flatten(geomFeature);
                flattened.features.forEach((f: any) => {
                    const d = turf.pointToLineDistance(busPoint, f, { units: 'kilometers' });
                    if (d < distance) distance = d;
                });
            }
        } catch (err) { }

        if (distance < MAX_DIST_KM && distance < minDistance) {
            minDistance = distance;
            bestLine = lineId;
        }
    });

    return bestLine;
};
