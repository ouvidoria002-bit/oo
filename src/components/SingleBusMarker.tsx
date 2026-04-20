import React, { useRef, useEffect } from 'react';
import { Popup } from 'react-leaflet';
import L from 'leaflet';

import { calculateETA } from '../etaManager';
import type { BusStop } from '../stopsManager';
import { SlidingMarker } from './SlidingMarker';

interface Bus {
    VehicleDescription: string;
    LineNumber: string;
    Latitude: number;
    Longitude: number;
    Speed: number;
    Direction: number;
    GPSDate: string;
    status?: 'ANDANDO' | 'PARADO' | 'SEM_SINAL';
    LicensePlate?: string;
    EventName?: string;
}

interface SingleBusMarkerProps {
    bus: Bus;
    isFocused: boolean;
    isFollowing: boolean;
    map: L.Map;
    closestStop: BusStop | null;
    buses: Bus[];
}

const STATUS_COLORS: Record<string, string> = {
    ANDANDO: '#3b82f6', PARADO: '#f59e0b',
    SEM_SINAL: '#ef4444'
};

const STATUS_LABELS: Record<string, string> = {
    PARADO: '🟡 Parado', SEM_SINAL: '🔴 Sem sinal', ANDANDO: '🔵 Andando'
};

// Create SVG Icon 
function getBusIcon(bus: Bus, isFocused: boolean): L.DivIcon {
    const isMoving = bus.Speed > 5;
    const baseColor = STATUS_COLORS[bus.status || 'ANDANDO'] || '#3b82f6';
    const color = baseColor;

    // Core neon glow logic
    const glowSpec = isFocused
        ? `0 0 15px ${color}, 0 0 30px ${color}`
        : isMoving
            ? `0 0 10px ${color}`
            : `0 2px 4px rgba(0,0,0,0.5)`;

    const borderSpec = isFocused ? `3px solid white` : `2px solid white`;
    const zIndexOffset = isFocused ? 1000 : 0;
    const scale = isFocused ? 1.2 : 1;

    // The SVG inner content
    const svgContent = `
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 60%; height: 60%; margin-top:20%;">
            <path d="M4 16C4 17.1046 4.89543 18 6 18H8M16 18H18C19.1046 18 20 17.1046 20 16V8C20 6.89543 19.1046 6 18 6H6C4.89543 6 4 6.89543 4 8V16ZM4 16V13H20V16ZM4 13V10H20V13ZM6 21V18M18 21V18" 
                stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    `;

    return L.divIcon({
        className: 'custom-bus-marker',
        html: `
            <div style="
                background-color: ${color};
                width: 36px;
                height: 36px;
                border-radius: 50%;
                border: ${borderSpec};
                box-shadow: ${glowSpec};
                transform: scale(${scale}) rotate(${bus.Direction || 0}deg);
                transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                display: flex;
                align-items: flex-start;
                justify-content: center;
                position: relative;
                z-index: ${zIndexOffset};
            ">
                ${svgContent}
                
                <!-- Direction Indicator (Nose of the bus) -->
                <div style="
                    position: absolute;
                    top: -4px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 0; 
                    height: 0; 
                    border-left: 6px solid transparent;
                    border-right: 6px solid transparent;
                    border-bottom: 8px solid ${isFocused ? 'white' : color};
                "></div>
            </div>
            
            <!-- Label Tag -->
            <div style="
                position: absolute;
                top: 40px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 3px 6px;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 700;
                white-space: nowrap;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                border: 1px solid rgba(255,255,255,0.1);
                z-index: ${zIndexOffset + 1};
                pointer-events: none;
                backdrop-filter: blur(4px);
            ">
                ${bus.LineNumber} • ${bus.VehicleDescription.replace('DC', '')}
            </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -20]
    });
}

function timeSince(dateString: string) {
    // A API do GlobalBus retorna sem o Z (ex: 2026-03-05T15:20:00), que é o fuso de Brasília (BRT / UTC-3).
    // Alguns navegadores assumem isso como UTC e jogam 3 horas pra frente.
    // Vamos garantir que a comparação seja justa transformando tudo pra timestamp absoluto.
    const parts = dateString.split(/[-T:]/);
    if (parts.length >= 6) {
        // Construct the date exactly as provided in the string (local time)
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), Number(parts[3]), Number(parts[4]), Number(parts[5]));
        const seconds = Math.floor((new Date().getTime() - d.getTime()) / 1000);
        if (seconds < 60) return `${Math.max(0, seconds)}s`;
        const minutes = Math.floor(seconds / 60);
        return `${minutes}m`;
    }

    // Fallback safe 
    const seconds = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 1000);
    if (seconds < 60) return `${Math.max(0, seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
}

// Debug log to catch undefined components at init
console.log('[DEBUG] Component Load:', { SlidingMarker });

const SingleBusMarkerComponent: React.FC<SingleBusMarkerProps> = ({ bus, isFocused, isFollowing, map, closestStop, buses }) => {
    const markerRef = useRef<L.Marker>(null);

    let displayLat = bus.Latitude;
    let displayLng = bus.Longitude;

    useEffect(() => {
        if (isFocused && isFollowing && markerRef.current) {
            map.panTo([displayLat, displayLng], { animate: true, duration: 0.5 });
        }
    }, [displayLat, displayLng, isFocused, isFollowing, map]);

    let ageMinutes = 0;
    const parts = bus.GPSDate.split(/[-T:]/);
    if (parts.length >= 6) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), Number(parts[3]), Number(parts[4]), Number(parts[5]));
        ageMinutes = Math.floor((new Date().getTime() - d.getTime()) / 60000);
    }

    // Layer 2: Persistence of last valid position to prevent flickering
    const lastValidPos = useRef<[number, number]>([displayLat, displayLng]);

    useEffect(() => {
        if (!isNaN(displayLat) && !isNaN(displayLng)) {
            lastValidPos.current = [displayLat, displayLng];
        }
    }, [displayLat, displayLng]);

    // Layer 3: ETA calculation for this specific bus to the closest stop
    const [eta, setEta] = React.useState<string | null>(null);
    useEffect(() => {
        if (closestStop && bus.LineNumber && buses.length > 0) {
            const time = calculateETA(closestStop, bus.LineNumber, buses, bus.VehicleDescription);
            setEta(time);
        }
    }, [closestStop, bus.LineNumber, buses, bus.VehicleDescription]);

    return (
        <SlidingMarker
            position={lastValidPos.current}
            duration={2100} // Sincronizado com o novo polling de 2s (2000ms) + margem de fluidez
            icon={getBusIcon(bus, isFocused)}
            markerRef={markerRef}
            zIndexOffset={isFocused ? 2000 : 500}
        >
            <Popup className="bus-popup">
                <div style={{ minWidth: '180px', padding: '4px' }}>
                    {/* Header Clean */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div>
                            <span style={{ fontSize: '24px', fontWeight: '900', color: '#1e293b', letterSpacing: '-1px' }}>
                                {bus.VehicleDescription.replace('DC-', '').replace('DC', '')}
                            </span>
                            <div style={{ fontSize: '10px', fontWeight: '800', color: '#3b82f6', textTransform: 'uppercase', marginTop: '-4px' }}>
                                Linha {bus.LineNumber}
                            </div>
                        </div>
                        {bus.Speed > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                <div style={{ background: '#3b82f6', color: 'white', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '900' }}>
                                    {bus.Speed} <span style={{ fontSize: '9px', fontWeight: 'normal' }}>km/h</span>
                                </div>
                                {bus.LicensePlate && (
                                    <div style={{ 
                                        background: 'white', 
                                        border: '1.5px solid #000', 
                                        borderRadius: '3px', 
                                        padding: '1px 4px', 
                                        fontSize: '9px', 
                                        fontWeight: '900', 
                                        color: '#000',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        lineHeight: '1',
                                        minWidth: '60px'
                                    }}>
                                        <div style={{ background: '#003399', width: '100%', height: '4px', borderRadius: '1px 1px 0 0', position: 'relative', top: '-1px' }}></div>
                                        <span style={{ height: '8px' }}>{bus.LicensePlate}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {/* Info Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Chega em</div>
                                <div style={{ fontSize: '12px', fontWeight: '800', color: '#10b981' }}>
                                    {eta || '---'}
                                </div>
                            </div>
                            <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Sinal</div>
                                <div style={{ fontSize: '12px', fontWeight: '800', color: ageMinutes > 5 ? '#ef4444' : '#10b981' }}>
                                    {timeSince(bus.GPSDate) === 'NaNm' ? 'Agora' : timeSince(bus.GPSDate)}
                                </div>
                            </div>
                        </div>

                        {/* Status Alert if needed */}
                        {(bus.status && bus.status !== 'ANDANDO') && (
                            <div style={{ background: '#fff7ed', border: '1px solid #ffedd5', padding: '6px 10px', borderRadius: '6px', fontSize: '11px', color: '#c2410c', fontWeight: 'bold', textAlign: 'center' }}>
                                {STATUS_LABELS[bus.status]}
                            </div>
                        )}

                        {isFocused && (
                            <div style={{ textAlign: 'center', fontSize: '10px', color: '#94a3b8', fontWeight: '600' }}>
                                🎯 Seguindo este veículo
                            </div>
                        )}
                    </div>
                </div>
            </Popup>
        </SlidingMarker>
    );
};

export const SingleBusMarker = React.memo(SingleBusMarkerComponent, (prevProps, nextProps) => {
    // Only re-render if essential visual properties change to save massive CPU
    return (
        prevProps.bus.Latitude === nextProps.bus.Latitude &&
        prevProps.bus.Longitude === nextProps.bus.Longitude &&
        prevProps.isFocused === nextProps.isFocused &&
        prevProps.bus.Speed === nextProps.bus.Speed &&
        prevProps.bus.status === nextProps.bus.status
    );
});
