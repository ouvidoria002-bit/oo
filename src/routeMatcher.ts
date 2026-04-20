import { LINE_KML_MAPPING } from './constants';
// @ts-ignore
import * as turf from '@turf/turf';

// Cache for Turf features (for general matching)
const routeCache: Record<string, any> = {};

// Cache for Raw Coordinates (for animation snapping)
export const rawRouteCache: Record<string, number[][]> = {};

export const loadAllRoutes = async () => {
    const KML_CACHE_VERSION = 'v1'; // bump to invalidate all caches
    const promises = Object.entries(LINE_KML_MAPPING).map(async ([lineDetail, filename]) => {
        try {
            // --- localStorage Cache: evita re-download a cada sessão ---
            const cacheKey = `kml_${KML_CACHE_VERSION}_${filename}`;
            let text: string | null = null;

            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                text = cached; // Cache hit — sem network request
            } else {
                const response = await fetch(`${import.meta.env.BASE_URL}kml-exports/${filename}`);
                if (!response.ok) return;
                text = await response.text();
                try { localStorage.setItem(cacheKey, text); } catch (_) { /* storage full */ }
            }
            // ----------------------------------------------------------

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
                // Flatten all segments into one continuous path for snapping logic
                // This mimics the CBT app behavior where omnivore/leaflet paths are flattened
                const allPoints = coordsList.flat();

                // Store as [Lat, Lng] for easier usage in our math functions (Leaflet style)
                // Note: KML/Turf is [Lng, Lat]. We swap here for internal Calc.
                rawRouteCache[lineDetail] = allPoints.map(p => [p[1], p[0]]);

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
    console.log(`Loaded ${Object.keys(routeCache).length} routes for matching. Cache Keys:`, Object.keys(rawRouteCache));
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

// ---------------------------------------------------------------------------
// EXACT LOGIC PORT FROM CBT MONITORAMENTO (app.js)
// ---------------------------------------------------------------------------

export const getProjectedPosition = (lat: number, lng: number, lineId: string, lastIndex: number = -1, maxDist: number = 50): SnapResult | null => {
    const points = rawRouteCache[lineId];
    if (!points || points.length < 2) {
        console.warn(`[getProjectedPosition] No route found for line: ${lineId}. Available routes:`, Object.keys(rawRouteCache));
        return null;
    }

    const latlng: [number, number] = [lat, lng];

    // Configuration
    const WINDOW_SIZE = 150; // Look ahead ~1.5km
    const SEARCH_BACK = 20;   // Look back 200m
    const SNAP_DIST = maxDist;

    // Helper: Execute Search on a set of indices
    const findBestInRanges = (ranges: { start: number, end: number }[]) => {
        let bestLocal: SnapResult | null = null;
        for (const range of ranges) {
            for (let i = range.start; i < range.end; i++) {
                const p1 = points[i];
                const p2 = points[i + 1];
                if (!p1 || !p2) continue;

                const safeP1: [number, number] = [p1[0], p1[1]];
                const safeP2: [number, number] = [p2[0], p2[1]];

                const info = getClosestPointOnSegment(latlng, safeP1, safeP2);
                const dist = getDistanceMeters(latlng, info.point);

                if (dist < SNAP_DIST) {
                    let isBetter = false;
                    if (!bestLocal) {
                        isBetter = true;
                    } else {
                        const distDiff = dist - bestLocal.distance;
                        if (distDiff < -5) {
                            // Much closer (geometry wins)
                            isBetter = true;
                        } else if (Math.abs(distDiff) < 5) {
                            // Tie-break with Sequence if tracking
                            if (lastIndex >= 0) {
                                // Prefer closer index to last known position (smoothness)
                                // But if we are searching Global, lastIndex might be far.
                                // We treat "sequence" as |i - lastIndex|.
                                const currentGap = Math.abs(i - lastIndex);
                                const bestGap = Math.abs(bestLocal.index - lastIndex);
                                if (currentGap < bestGap) isBetter = true;
                            } else {
                                if (dist < bestLocal.distance) isBetter = true;
                            }
                        }
                    }

                    if (isBetter) {
                        bestLocal = { point: info.point, index: i, distance: dist };
                    }
                }
            }
        }
        return bestLocal;
    };

    // 1. Local Window Search
    let searchIndices: { start: number, end: number }[] = [];
    if (lastIndex < 0) {
        searchIndices = [{ start: 0, end: points.length - 1 }];
    } else {
        const start = Math.max(0, lastIndex - SEARCH_BACK);
        const end = Math.min(points.length - 1, lastIndex + WINDOW_SIZE);
        searchIndices.push({ start, end });
        // Loop Wrap
        if (lastIndex > points.length - WINDOW_SIZE) {
            searchIndices.push({ start: 0, end: WINDOW_SIZE });
        }
    }

    let best = findBestInRanges(searchIndices);

    // 2. Global Fallback (Escape Loop Trap)
    // If we are tracking (lastIndex >= 0) and the result is "weak" (dist > 20m) OR null,
    // we attempt a Global Search to see if the bus jumped significantly (e.g. Loop or Teleport).
    // This handles the user's high tolerance (400m) allowing wrong-segment snaps.
    if (lastIndex >= 0 && (!best || best.distance > 20)) {
        const globalBest = findBestInRanges([{ start: 0, end: points.length - 1 }]);
        if (globalBest) {
            if (!best) {
                best = globalBest;
            } else {
                // Only switch to Global if it is SIGNIFICANTLY better (10m closer)
                // This prevents jittering between parallel segments 5m apart.
                if (globalBest.distance < best.distance - 10) {
                    // console.log(`[Snap] Global Rescue! Local: ${best.distance.toFixed(1)}m, Global: ${globalBest.distance.toFixed(1)}m (idx ${globalBest.index})`);
                    best = globalBest;
                }
            }
        }
    }

    return best;
};

// Nova função para retornar TODOS os snaps possíveis (para pontos de ônibus que a rota passa 2x)
export const getAllProjectedPositions = (lat: number, lng: number, lineId: string, maxDist: number = 80): SnapResult[] => {
    const points = rawRouteCache[lineId];
    if (!points || points.length < 2) return [];

    const latlng: [number, number] = [lat, lng];
    const results: SnapResult[] = [];

    for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        if (!p1 || !p2) continue;

        const info = getClosestPointOnSegment(latlng, [p1[0], p1[1]], [p2[0], p2[1]]);
        const dist = getDistanceMeters(latlng, info.point);

        if (dist < maxDist) {
            if (results.length > 0) {
                const last = results[results.length - 1];
                // Se o índice for muito próximo, é parte da mesma rua na mesma passagem (ignora o pior)
                if (i - last.index < 15) {
                    if (dist < last.distance) {
                        results[results.length - 1] = { point: info.point, index: i, distance: dist };
                    }
                    continue; // Pula a adição de um novo pass
                }
            }
            results.push({ point: info.point, index: i, distance: dist });
        }
    }
    return results;
};

// Returns the path segment from Start to End for smooth animation
export const getSnappedPath = (startIdx: number, endIdx: number, lineId: string): [number, number][] | null => {
    const points = rawRouteCache[lineId];
    if (!points || startIdx < 0 || endIdx < 0) return null;

    // Safety check for bounds
    if (startIdx >= points.length || endIdx >= points.length) return null;

    const pStart = points[startIdx];
    const pEnd = points[endIdx];

    // Check for "Teleport" (Large gap)
    // CBT Logic: 50 points threshold. User asked for "flying" fix, but we want parity.
    // If CBT has 50, we should stick to similar buffer or slightly higher to be safe?
    // User complaint "viajou por cima" implies linear movement.
    // Let's keep 500 to satisfy the "flying" complaint while keeping projection logic identical.
    if (Math.abs(endIdx - startIdx) > 500) {
        // Just return start/end points for linear move
        if (pStart && pEnd && pStart.length >= 2 && pEnd.length >= 2) {
            return [[pStart[0], pStart[1]], [pEnd[0], pEnd[1]]];
        }
        return null;
    }

    const path: [number, number][] = [];

    if (startIdx <= endIdx) {
        for (let i = startIdx; i <= endIdx; i++) {
            const p = points[i];
            if (p && p.length >= 2) path.push([p[0], p[1]]);
        }
    } else {
        // Backward? Just linear fallback
        if (pStart && pEnd && pStart.length >= 2 && pEnd.length >= 2) {
            return [[pStart[0], pStart[1]], [pEnd[0], pEnd[1]]];
        }
    }

    return path;
};


// Substitua o getRouteDistance atual por esta versão de Alta Precisão
export const getPreciseRouteDistance = (
    startSnap: SnapResult,
    endSnap: SnapResult,
    lineId: string
): number => {
    const points = rawRouteCache[lineId];
    if (!points || startSnap.index < 0 || endSnap.index < 0) return -1;
    if (startSnap.index > endSnap.index) return -1;

    // Caso 1: Ônibus e Ponto estão no MESMO segmento do KML (ex: mesma reta longa)
    if (startSnap.index === endSnap.index) {
        return getDistanceMeters(startSnap.point, endSnap.point);
    }

    let totalDist = 0;

    // 1. Distância do ponto exato do Ônibus até o próximo nó do KML
    const nextNode = points[startSnap.index + 1];
    if (nextNode) {
        totalDist += getDistanceMeters(startSnap.point, [nextNode[0], nextNode[1]]);
    }

    // 2. Soma todos os segmentos inteiros que existem no meio do caminho
    for (let i = startSnap.index + 1; i < endSnap.index; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        if (p1 && p2) {
            totalDist += getDistanceMeters([p1[0], p1[1]], [p2[0], p2[1]]);
        }
    }

    // 3. Distância do último nó do KML até o ponto exato da Parada
    const prevNode = points[endSnap.index];
    if (prevNode) {
        totalDist += getDistanceMeters([prevNode[0], prevNode[1]], endSnap.point);
    }

    return totalDist;
};

// Helper to get the last index of a route (for loop calculations)
export const getLastIndex = (lineId: string): number => {
    const points = rawRouteCache[lineId];
    if (!points) return -1;
    return points.length - 1;
};

// Calculate course/bearing of the route at a specific index
export const getRouteBearing = (lineId: string, index: number): number | null => {
    const points = rawRouteCache[lineId];
    if (!points || index < 0 || index >= points.length - 1) return null;

    const p1 = points[index];
    const p2 = points[index + Math.min(5, points.length - 1 - index)]; // Look a bit ahead to smooth curves

    if (!p1 || !p2) return null;

    // Turf uses [lng, lat] while our points are [lat, lng]
    const pt1 = turf.point([p1[1], p1[0]]);
    const pt2 = turf.point([p2[1], p2[0]]);

    // Turf bearing returns decimal degrees, between -180 and 180 degrees (positive clockwise)
    // We convert it to 0-360 for easier comparison with GPS heading
    let bearing = turf.bearing(pt1, pt2);
    if (bearing < 0) bearing += 360;

    return bearing;
};

// Detects whether the bus is in the first half (Ida) or second half (Volta) of the KML route
export const getRouteSense = (lineId: string, index: number): 'IDA' | 'VOLTA' | null => {
    const points = rawRouteCache[lineId];
    if (!points || index < 0) return null;

    // Simple heuristic: first 50% is Ida, last 50% is Volta
    return (index < points.length / 2) ? 'IDA' : 'VOLTA';
};

export const matchBusToRoute = (lat: number, lng: number): string | null => {
    // Only used for initial identification, not precise snapping.
    // We can leave this as Turk/Simple check.
    const busPoint = turf.point([lng, lat]);
    let bestLine: string | null = null;
    let minDistance = Infinity;
    const MAX_DIST_KM = 0.5; // Relaxed for wider capture

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
