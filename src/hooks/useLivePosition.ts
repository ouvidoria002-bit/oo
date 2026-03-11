import { useEffect, useRef } from 'react';
import L from 'leaflet';

// Dead reckoning: extrapola posição com base em velocidade e direção
function deadReckon(lat: number, lng: number, speedKmh: number, directionDeg: number, gpsDate: string): [number, number] {
    if (!speedKmh || speedKmh < 2) return [lat, lng];
    const ageSeconds = Math.min((Date.now() - new Date(gpsDate).getTime()) / 1000, 120);
    if (ageSeconds < 1) return [lat, lng];
    const distanceKm = (speedKmh * ageSeconds) / 3600;
    const R = 6371;
    const dLat = (distanceKm / R) * Math.cos((directionDeg * Math.PI) / 180);
    const dLng = (distanceKm / R) * Math.sin((directionDeg * Math.PI) / 180) / Math.cos((lat * Math.PI) / 180);
    return [lat + (dLat * 180) / Math.PI, lng + (dLng * 180) / Math.PI];
}

interface BusLiveData {
    Latitude: number;
    Longitude: number;
    Speed: number;
    Direction: number;
    GPSDate: string;
}

/**
 * Hook RAF (requestAnimationFrame) para interpolação preditiva contínua.
 * Atualiza diretamente via marker.setLatLng() para evitar re-renders React a 60fps.
 * 
 * @param markerRef - Ref do marcador Leaflet
 * @param bus       - Dados atuais do ônibus
 * @param enabled   - Só ativa quando ônibus está online e em movimento
 */
export function useLivePosition(
    markerRef: React.MutableRefObject<L.Marker | null>,
    bus: BusLiveData,
    enabled: boolean
): void {
    // Usar GPSDate como dependência — reinicia RAF só quando chega novo GPS real
    // (sugestão do arquiteto: evitar restart por mudança de referência do objeto bus)
    const busRef = useRef(bus);
    busRef.current = bus; // Atualiza sem re-triggerar effect

    useEffect(() => {
        if (!enabled || !markerRef) return;

        let rafId: number;
        let lastFrameTime = performance.now();

        const animate = (now: number) => {
            const marker = markerRef.current;
            if (!marker) {
                rafId = requestAnimationFrame(animate);
                return;
            }

            const b = busRef.current;
            if (b.Speed >= 2) {
                const [predLat, predLng] = deadReckon(b.Latitude, b.Longitude, b.Speed, b.Direction, b.GPSDate);

                // Aplica easing suave: interpolar entre posição atual do Leaflet e prevista
                const currentPos = marker.getLatLng();
                const easeFactor = Math.min(1, (now - lastFrameTime) / 1000 * 0.3); // 0.3 = suavidade
                const easedLat = currentPos.lat + (predLat - currentPos.lat) * easeFactor;
                const easedLng = currentPos.lng + (predLng - currentPos.lng) * easeFactor;

                marker.setLatLng([easedLat, easedLng]);
            }

            lastFrameTime = now;
            rafId = requestAnimationFrame(animate);
        };

        rafId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(rafId);

        // Reinicia APENAS quando GPSDate muda (novo fix GPS real), não a cada render
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bus.GPSDate, enabled]);
}
