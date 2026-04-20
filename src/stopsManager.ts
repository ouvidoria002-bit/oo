import { LINE_KML_MAPPING } from './constants';

export interface BusStop {
    id: string; // generated or from KML
    name: string;
    latitude: number;
    longitude: number;
}

const stopsCache: Record<string, BusStop[]> = {};

export const fetchStopsForLine = async (lineId: string): Promise<BusStop[]> => {
    if (stopsCache[lineId]) {
        return stopsCache[lineId];
    }

    try {
        const safeId = lineId.replace(/[^a-z0-9]/gi, '_');
        const response = await fetch(`/stops/${safeId}.json`);
        if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data)) {
                const stops: BusStop[] = data.map((item, index) => ({
                    id: `${lineId}-stop-${index}`,
                    name: item.PointName || 'Ponto',
                    latitude: Number(item.Latitude),
                    longitude: Number(item.Longitude)
                })).filter(s => !isNaN(s.latitude) && !isNaN(s.longitude));

                if (stops.length > 0) {
                    stopsCache[lineId] = stops;
                    console.log(`Loaded ${stops.length} stops from API for ${lineId}`);
                    return stops;
                }
            }
        }
    } catch (e) {
        console.warn(`No API stops found for ${lineId}, trying KML...`, e);
    }

    // 2. Fallback to KML (Legacy)
    const filename = LINE_KML_MAPPING[lineId];
    if (!filename) {
        // console.warn(`No KML found for line ${lineId}`);
        return [];
    }

    try {
        const response = await fetch(`/kml-exports/${filename}`);
        if (!response.ok) throw new Error('Failed to fetch KML');
        const text = await response.text();

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, "text/xml");
        const placemarks = xmlDoc.getElementsByTagName("Placemark");

        const stops: BusStop[] = [];

        for (let i = 0; i < placemarks.length; i++) {
            const placemark = placemarks[i];
            const point = placemark.getElementsByTagName("Point")[0];

            // Only process Placemarks that contain a Point (Stops)
            if (point) {
                const coordsTag = point.getElementsByTagName("coordinates")[0];
                if (coordsTag) {
                    const coordsStr = coordsTag.textContent?.trim();
                    if (coordsStr) {
                        const [lngStr, latStr] = coordsStr.split(',');
                        const lng = parseFloat(lngStr);
                        const lat = parseFloat(latStr);

                        if (!isNaN(lat) && !isNaN(lng)) {
                            // Try to get name
                            const nameTag = placemark.getElementsByTagName("name")[0];
                            const name = nameTag ? (nameTag.textContent || 'Ponto sem nome') : 'Ponto sem nome';

                            stops.push({
                                id: `${lineId}-stop-${i}`,
                                name,
                                latitude: lat,
                                longitude: lng
                            });
                        }
                    }
                }
            }
        }

        stopsCache[lineId] = stops;
        return stops;
    } catch (e) {
        console.error(`Error loading stops KML for ${lineId}`, e);
        return [];
    }
};

export const getClosestStop = (userLat: number, userLng: number, stops: BusStop[]): BusStop | null => {
    if (!stops || stops.length === 0) return null;

    let minDistance = Infinity;
    let closest: BusStop | null = null;

    stops.forEach(stop => {
        const dist = getDistanceFromLatLonInKm(userLat, userLng, stop.latitude, stop.longitude);
        if (dist < minDistance) {
            minDistance = dist;
            closest = stop;
        }
    });

    return closest;
};

// Haversine formula
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
}

function deg2rad(deg: number) {
    return deg * (Math.PI / 180);
}
