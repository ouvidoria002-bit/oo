const turf = require('@turf/turf');
const fs = require('fs-extra');
const path = require('path');

// Constants Mapping
const LINE_KML_MAPPING = {
    'DC-TZ01': 'DC_598.kml',
    'DC-TZ02': 'DC_555.kml',
    'DC-TZ03': 'DC_532.kml',
    'DC-TZ04': 'DC_600.kml',
    'DC-TZ05': 'DC_537.kml',
    'DC-TZ06': 'DC_549.kml',
    'DC-TZ07': 'DC_526.kml',
    'DC-TZ08': 'DC_527.kml',
    'DC-TZ09': 'DC_550.kml',
    'DC-TZ10': 'DC_535.kml',
    'DC-TZ11': 'DC_554.kml',
    'DC-TZ12': 'DC_539.kml',
    'DC-TZ13': 'DC_547.kml',
    'DC-TZ14': 'DC_533.kml',
    'DC-TZ15': 'DC_524.kml',
    'DC-TZ16': 'DC_559.kml',
    'DC-TZ17': 'DC_553.kml',
    'DC-TZ18': 'DC_595.kml',
    'DC-TZ19': 'DC_545.kml',
    'DC-TZ20': 'DC_577.kml'
};

const routeCache = {};

async function loadRoutes(kmlDir) {
    console.log('[RouteMatcher] Loading KML routes from:', kmlDir);
    const entries = Object.entries(LINE_KML_MAPPING);

    for (const [lineId, filename] of entries) {
        try {
            const filePath = path.join(kmlDir, filename);
            if (!await fs.pathExists(filePath)) {
                // console.warn(`[RouteMatcher] File not found: ${filePath}`);
                continue;
            }

            const text = await fs.readFile(filePath, 'utf-8');

            // Regex Parse (Same as Frontend logic)
            const coordsList = [];
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
                }).filter(p => p !== null);

                if (points.length >= 2) {
                    coordsList.push(points);
                }
            }

            if (coordsList.length > 0) {
                if (coordsList.length === 1) {
                    routeCache[lineId] = turf.lineString(coordsList[0]);
                } else {
                    routeCache[lineId] = turf.multiLineString(coordsList);
                }
            }
        } catch (e) {
            console.error(`[RouteMatcher] Failed to load ${filename}:`, e.message);
        }
    }
    console.log(`[RouteMatcher] Loaded ${Object.keys(routeCache).length} routes.`);
}

const lineCache = new Map(); // vehicleId -> { lineId, confirmedAt }
const CACHE_TTL = 10_000;   // revalida a cada 10s

function checkSingleLine(lineId, busPoint) {
    const geomFeature = routeCache[lineId];
    if (!geomFeature) return Infinity;

    try {
        if (geomFeature.geometry.type === 'LineString') {
            return turf.pointToLineDistance(busPoint, geomFeature, { units: 'kilometers' });
        } else if (geomFeature.geometry.type === 'MultiLineString') {
            const flattened = turf.flatten(geomFeature);
            let minDist = Infinity;
            flattened.features.forEach((f) => {
                const d = turf.pointToLineDistance(busPoint, f, { units: 'kilometers' });
                if (d < minDist) minDist = d;
            });
            return minDist;
        }
    } catch (e) { }
    return Infinity;
}

function matchBusToRoute(lat, lng, vehicleId, originalLine = null, previousLine = null) {
    const busPoint = turf.point([lng, lat]);
    const MAX_DIST_KM = 0.2;

    // 1. Check Cache first
    if (vehicleId) {
        const cached = lineCache.get(vehicleId);
        if (cached && (Date.now() - cached.confirmedAt < CACHE_TTL)) {
            const dist = checkSingleLine(cached.lineId, busPoint);
            if (dist < MAX_DIST_KM) {
                // Still on the same line, update timestamp and return
                cached.confirmedAt = Date.now();
                return cached.lineId;
            }
        }
    }

    // 2. Full Scan (Fallback)
    let distances = [];
    Object.entries(routeCache).forEach(([lineId, geomFeature]) => {
        const distance = checkSingleLine(lineId, busPoint);
        if (distance < MAX_DIST_KM) {
            distances.push({ lineId, distance });
        }
    });

    let bestLine = null;
    if (distances.length > 0) {
        if (previousLine) {
            const stillOnPrevious = distances.find(item => item.lineId === previousLine);
            if (stillOnPrevious) bestLine = previousLine;
        }

        if (!bestLine && originalLine) {
            const onOriginal = distances.find(item => item.lineId === originalLine || item.lineId.includes(originalLine));
            if (onOriginal) bestLine = onOriginal.lineId;
        }

        if (!bestLine) {
            distances.sort((a, b) => a.distance - b.distance);
            bestLine = distances[0].lineId;
        }
    }

    // Update Cache
    if (vehicleId && bestLine) {
        lineCache.set(vehicleId, { lineId: bestLine, confirmedAt: Date.now() });
    }

    return bestLine;
}

module.exports = { loadRoutes, matchBusToRoute };
