import type { BusStop } from './stopsManager';
import { getProjectedPosition, getRouteDistance, getLastIndex } from './routeMatcher';

interface Bus {
    VehicleDescription: string;
    LineNumber: string;
    Latitude: number;
    Longitude: number;
    GPSDate: string;
}

// Average speed in km/h (conservative city estimate)
const AVERAGE_SPEED_KMH = 20;

export const calculateETA = (stop: BusStop, lineId: string, buses: Bus[]): string | null => {
    // 1. Project Stop to Route
    const stopSnap = getProjectedPosition(stop.latitude, stop.longitude, lineId);
    if (!stopSnap) return null; // Stop not on mapped route?

    // Get Route Bounds
    const lastRouteIndex = getLastIndex(lineId);
    if (lastRouteIndex < 0) return null;

    let closestBusDist = Infinity;
    let bestBusId = null;

    // 2. Check each bus
    buses.forEach(bus => {
        if (bus.LineNumber !== lineId) return;

        // Project Bus to Route
        const busSnap = getProjectedPosition(bus.Latitude, bus.Longitude, lineId);
        if (!busSnap) return;

        let dist = Infinity;

        // Case A: Bus is BEHIND the stop (Approaching normally)
        if (busSnap.index <= stopSnap.index) {
            dist = getRouteDistance(busSnap.index, stopSnap.index, lineId);
        }
        // Case B: Bus is AHEAD of the stop (Needs to loop back)
        else {
            // Calculate: (Bus -> End) + (Start -> Stop)
            // Assumes circular route or "Ida" then "Volta" logic
            const distToEnd = getRouteDistance(busSnap.index, lastRouteIndex, lineId);
            const distFromStart = getRouteDistance(0, stopSnap.index, lineId);

            if (distToEnd !== -1 && distFromStart !== -1) {
                dist = distToEnd + distFromStart;
            }
        }

        if (dist !== -1 && dist < closestBusDist) {
            closestBusDist = dist;
            bestBusId = bus.VehicleDescription;
        }
    });

    if (closestBusDist === Infinity) return null;

    // 3. Calculate Time
    // Distance in meters
    const distKm = closestBusDist / 1000;
    const timeHours = distKm / AVERAGE_SPEED_KMH;
    const timeMin = Math.ceil(timeHours * 60);

    if (timeMin < 1) return "Menos de 1 min";
    return `${timeMin} min`;
};
