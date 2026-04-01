import * as fs from 'fs';
import { loadAllRoutes, rawRouteCache, getRouteBearing, getProjectedPosition, getPreciseRouteDistance, getLastIndex } from './routeMatcher';
import { calculateETA } from './etaManager';

global.fetch = async (url: string) => {
    const filename = url.split('/').pop();
    const filepath = '/home/tesch/ouvidoria/tzappgeral/CBTMonitoramento/kml-exports/' + filename;
    if (fs.existsSync(filepath)) {
        return { ok: true, text: async () => fs.readFileSync(filepath, 'utf-8') } as any;
    }
    return { ok: false } as any;
};
global.localStorage = { getItem: () => null, setItem: () => { } } as any;

const run = async () => {
    await loadAllRoutes();
    console.log(`Loaded ${Object.keys(rawRouteCache).length} routes.`);

    const stop = {
        id: "stop_b522",
        name: "Bernardo de Vasconcelos 522",
        latitude: -22.666589,
        longitude: -43.274532
    } as any;

    const busDC537 = {
        VehicleDescription: "DC-537",
        LineNumber: "DC-TZ05",
        Latitude: -22.66198,
        Longitude: -43.28344,
        Speed: 5,
        Direction: 302.2, // Approaching or leaving? Let's check the map.
        GPSDate: "2026-03-13T13:30:00.000Z"
    };

    const busDC526 = {
        VehicleDescription: "DC-526",
        LineNumber: "DC-TZ05",
        Latitude: -22.66262,
        Longitude: -43.2732,
        Speed: 0,
        Direction: 267.61,
        GPSDate: "2026-03-13T13:30:00.000Z"
    };

    console.log("ETA DC-537:");
    console.log("Result =>", calculateETA(stop, "DC-TZ05", [busDC537]));

    console.log("ETA DC-526:");
    console.log("Result =>", calculateETA(stop, "DC-TZ05", [busDC526]));

    console.log("--- DEBUG DC-537 ---");
    debugETA("DC-TZ05", stop, busDC537);
};

function debugETA(lineId: string, stop: any, bus: any) {
    const stopSnap = getProjectedPosition(stop.latitude, stop.longitude, lineId);
    console.log("StopSnap:", stopSnap);

    const busSnap = getProjectedPosition(bus.Latitude, bus.Longitude, lineId, -1, 300);
    console.log("Original BusSnap:", busSnap);

    if (busSnap && bus.Direction !== undefined) {
        let routeAngle = getRouteBearing(lineId, busSnap.index);
        console.log("Original RouteAngle:", routeAngle, " BusDir:", bus.Direction);

        let angleDiff = Math.abs(bus.Direction - routeAngle!);
        if (angleDiff > 180) angleDiff = 360 - angleDiff;
        console.log("AngleDiff:", angleDiff);

        if (angleDiff > 100) {
            const points = rawRouteCache[lineId];
            let foundBetterSnap = false;
            for (let i = 0; i < points.length - 1; i++) {
                if (i % 5 !== 0) continue;
                const p1 = points[i];
                const dist = Math.sqrt(Math.pow(p1[0] - bus.Latitude, 2) + Math.pow(p1[1] - bus.Longitude, 2)) * 111000;

                if (dist < 300) {
                    const testAngle = getRouteBearing(lineId, i);
                    let testDiff = Math.abs(bus.Direction - testAngle!);
                    if (testDiff > 180) testDiff = 360 - testDiff;

                    if (testDiff <= 100) {
                        console.log(`Found better snap at index ${i} with Angle ${testAngle}, Diff ${testDiff}`);
                        busSnap.index = i;
                        foundBetterSnap = true;
                        break;
                    }
                }
            }
        }

        console.log("Final BusSnap index:", busSnap.index);

        if (busSnap.index <= stopSnap!.index) {
            const dist = getPreciseRouteDistance(busSnap, stopSnap!, lineId);
            console.log(`Case A (Bus behind stop). Route Dist = ${dist}m`);
        } else {
            const gap = getPreciseRouteDistance(stopSnap!, busSnap, lineId);
            console.log(`Case B (Bus ahead of stop). Gap = ${gap}m`);
            if (gap !== -1 && gap < 200) {
                console.log("Gap < 200m, treating as 0m (passed just now)");
            } else {
                const lastRouteIndex = getLastIndex(lineId);
                const points = rawRouteCache[lineId];
                const endSnap = { index: lastRouteIndex, point: [points[lastRouteIndex][0], points[lastRouteIndex][1]] as [number, number], distance: 0 };
                const startSnap = { index: 0, point: [points[0][0], points[0][1]] as [number, number], distance: 0 };
                const distToEnd = getPreciseRouteDistance(busSnap, endSnap, lineId);
                const distFromStart = getPreciseRouteDistance(startSnap, stopSnap!, lineId);
                console.log(`distToEnd: ${distToEnd}, distFromStart: ${distFromStart} => Total Route Loop Dist: ${distToEnd + distFromStart}m`);
            }
        }
    }
}

run().catch(console.error);
