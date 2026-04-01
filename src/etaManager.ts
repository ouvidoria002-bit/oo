import type { BusStop } from './stopsManager';
import { getProjectedPosition, getAllProjectedPositions, getPreciseRouteDistance, getLastIndex, getRouteBearing, rawRouteCache } from './routeMatcher';

interface Bus {
    VehicleDescription: string;
    LineNumber: string;
    Latitude: number;
    Longitude: number;
    GPSDate: string;
    Direction?: number;
    Speed?: number;
}

// Average speed in km/h (conservative city estimate)
const AVERAGE_SPEED_KMH = 20;

// Cache do último índice de snap por ônibus.
// Sem isso, cada chamada faz busca GLOBAL na rota com tolerância 300m,
// e em rotas paralelas (Ida/Volta na mesma rua) o snap oscila entre os dois lados.
// Com o cache, a busca é JANELADA a partir da posição anterior — muito mais estável.
const busSnapCache: Record<string, number> = {};

export const calculateETA = (stop: BusStop, lineId: string, buses: Bus[], targetBusId?: string | null): string | null => {
    // 1. Project Stop to Route (Pode aparecer várias vezes na Ida e Volta)
    // Tolerance 150m: cobre casos onde o ponto cadastrado está levemente afastado do KML da rota
    const stopSnaps = getAllProjectedPositions(stop.latitude, stop.longitude, lineId, 150);
    if (!stopSnaps || stopSnaps.length === 0) {
        console.warn(`[ETA] Stop "${stop.name}" not found within 150m of route ${lineId}`);
        return null;
    }

    // Get Route Bounds
    const lastRouteIndex = getLastIndex(lineId);
    if (lastRouteIndex < 0) return null;

    let closestBusDist = Infinity;
    // @ts-ignore - keeping variable for future debugging
    let bestBusId = null;
    let bestIsLoop = false;

    // 2. Check each bus
    buses.forEach(bus => {
        if (bus.LineNumber !== lineId) return;
        if (targetBusId && bus.VehicleDescription !== targetBusId) return;
        // Busca janelada a partir da última posição conhecida — evita saltar para o lado errado
        // da rota (Ida vs Volta) quando os dois segmentos ficam dentro da tolerância de 300m.
        // Na primeira chamada (cache vazio), cai em busca global (-1) normalmente.
        const lastKnownIndex = busSnapCache[bus.VehicleDescription] ?? -1;
        const busSnap = getProjectedPosition(bus.Latitude, bus.Longitude, lineId, lastKnownIndex, 300);

        if (!busSnap) {
            console.warn(`[ETA] Bus ${bus.VehicleDescription} ignored - failed projection`);
            return;
        }

        // Persiste o índice encontrado para a próxima chamada (antes de qualquer correção de bearing)
        busSnapCache[bus.VehicleDescription] = busSnap.index;

        // Detecção de Sentido — determina se o ônibus está indo PARA FRENTE na rota (índices crescentes)
        // null = sem dados de direção confiáveis (parado ou sem campo Direction)
        let isMovingForward: boolean | null = null;

        if (bus.Direction !== undefined && bus.Direction !== null && bus.Speed !== undefined && bus.Speed > 5) {
            const routeAngle = getRouteBearing(lineId, busSnap.index);
            if (routeAngle !== null) {
                let angleDiff = Math.abs(bus.Direction - routeAngle);
                if (angleDiff > 180) angleDiff = 360 - angleDiff;

                isMovingForward = angleDiff <= 90;

                // Se snap caiu na metade errada da rota (ex: Ida vs Volta na mesma rua),
                // procura o segmento MAIS PRÓXIMO cujo azimute bate com a direção do GPS.
                // Bug anterior: threshold 100° (perdia casos 91-99°) + break no primeiro match
                //   → pegava o segmento de MENOR ÍNDICE (Ida) em vez do geograficamente mais próximo (Volta correta)
                if (angleDiff > 90) {
                    const routePoints = rawRouteCache[lineId];
                    let bestMatchIdx = -1;
                    let bestMatchDist = Infinity;

                    if (routePoints) {
                        for (let i = 0; i < routePoints.length - 1; i++) {
                            const p1 = routePoints[i];
                            const segDist = Math.sqrt(Math.pow(p1[0] - bus.Latitude, 2) + Math.pow(p1[1] - bus.Longitude, 2)) * 111000;

                            if (segDist < 300) {
                                const testAngle = getRouteBearing(lineId, i);
                                if (testAngle !== null) {
                                    let testDiff = Math.abs(bus.Direction - testAngle);
                                    if (testDiff > 180) testDiff = 360 - testDiff;
                                    // Aceita qualquer segmento compatível com a direção, mas guarda o mais próximo
                                    if (testDiff <= 90 && segDist < bestMatchDist) {
                                        bestMatchDist = segDist;
                                        bestMatchIdx = i;
                                    }
                                }
                            }
                        }
                    }

                    if (bestMatchIdx >= 0 && routePoints) {
                        busSnap.index = bestMatchIdx;
                        busSnap.point = [routePoints[bestMatchIdx][0], routePoints[bestMatchIdx][1]];
                        isMovingForward = true;
                        // Atualiza cache com o índice corrigido pelo bearing
                        busSnapCache[bus.VehicleDescription] = bestMatchIdx;
                    } else {
                        console.warn(`[ETA] Bus ${bus.VehicleDescription} — snap kept (no matching segment for direction ${bus.Direction.toFixed(0)}°)`);
                    }
                }
            }
        }

        // Avalia todas as possíveis passagens do ônibus por este ponto (Ida/Volta)
        let minBusToStopDist = Infinity;
        let minIsLoop = false;

        for (const stopSnap of stopSnaps) {
            let currentSnapDist = Infinity;
            let currentIsLoop = false;

            // O ônibus está se aproximando deste ponto SE:
            //   - tem dados de direção: está indo para frente E ainda não passou (índice <= ponto)
            //   - sem dados de direção: usa apenas comparação de índice como fallback
            const isApproaching = isMovingForward === null
                ? busSnap.index <= stopSnap.index
                : isMovingForward && busSnap.index <= stopSnap.index;

            if (isApproaching) {
                // Cálculo direto — ônibus a caminho do ponto
                currentSnapDist = getPreciseRouteDistance(busSnap, stopSnap, lineId);
                currentIsLoop = false;
            } else {
                // Ônibus passou ou está se AFASTANDO — calcula volta completa da rota
                // Exceção: ônibus parado a menos de 30m (fisicamente no ponto)
                const gap = getPreciseRouteDistance(stopSnap, busSnap, lineId);
                const busIsAtStopPlatform = gap !== -1 && gap < 30 && (bus.Speed === undefined || bus.Speed < 5);

                if (busIsAtStopPlatform) {
                    currentSnapDist = 0;
                    currentIsLoop = false;
                } else {
                    const points = rawRouteCache[lineId];
                    if (points) {
                        const lastPoint = points[lastRouteIndex];
                        const firstPoint = points[0];
                        const endSnap = { index: lastRouteIndex, point: [lastPoint[0], lastPoint[1]] as [number, number], distance: 0 };
                        const startSnap = { index: 0, point: [firstPoint[0], firstPoint[1]] as [number, number], distance: 0 };
                        const distToEnd = getPreciseRouteDistance(busSnap, endSnap, lineId);
                        const distFromStart = getPreciseRouteDistance(startSnap, stopSnap, lineId);
                        if (distToEnd !== -1 && distFromStart !== -1) {
                            currentSnapDist = distToEnd + distFromStart;
                            currentIsLoop = true;
                        }
                    }
                }
            }

            if (currentSnapDist !== -1 && currentSnapDist < minBusToStopDist) {
                minBusToStopDist = currentSnapDist;
                minIsLoop = currentIsLoop;
            }
        }

        if (minBusToStopDist !== Infinity && minBusToStopDist < closestBusDist) {
            closestBusDist = minBusToStopDist;
            bestBusId = bus.VehicleDescription;
            bestIsLoop = minIsLoop;
        }
    });

    if (closestBusDist === Infinity) return null;

    // 3. Calculate Time
    // Distance in meters
    const distKm = closestBusDist / 1000;
    const timeHours = distKm / AVERAGE_SPEED_KMH;
    const timeMin = Math.ceil(timeHours * 60);

    if (timeMin < 1) return "Menos de 1 min";
    return bestIsLoop ? `↺ ${timeMin} min` : `${timeMin} min`;
};
