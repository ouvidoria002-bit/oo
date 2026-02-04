import { BusStop } from './stopsManager';
import { getProjectedPosition, getRouteDistance } from './routeMatcher';

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

    let closestBusDist = Infinity;
    let bestBusId = null;

    // 2. Check each bus
    buses.forEach(bus => {
        if (bus.LineNumber !== lineId) return;

        // Project Bus to Route
        const busSnap = getProjectedPosition(bus.Latitude, bus.Longitude, lineId);
        if (!busSnap) return;

        // Condition: Bus must be BEHIND the stop (Index < Stop Index)
        // If the bus is at index 100 and stop is at 80, the bus passed it (assuming linear).
        // Exceptions: Circular routes at the wrap-around point. 
        // For simplicity, we stick to linear "upstream" check.
        if (busSnap.index <= stopSnap.index) {

            // Calculate distance along path
            // We can approximate with (StopIndex - BusIndex) * AvgSegmentLength or use exact.
            // Let's use exact if possible.
            const dist = getRouteDistance(busSnap.index, stopSnap.index, lineId);

            if (dist >= 0 && dist < closestBusDist) {
                closestBusDist = dist;
                bestBusId = bus.VehicleDescription;
            }
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
