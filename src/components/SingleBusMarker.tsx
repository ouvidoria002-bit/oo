import React, { useRef, useEffect } from 'react';
import { Popup } from 'react-leaflet';
import L from 'leaflet';
import { getProjectedPosition, getRouteSense } from '../routeMatcher';
import SlidingMarker from './SlidingMarker';

interface Bus {
    VehicleDescription: string;
    LineNumber: string;
    Latitude: number;
    Longitude: number;
    Speed: number;
    Direction: number;
    GPSDate: string;
    status?: 'NORMAL' | 'PARADO' | 'FORA_ROTA' | 'SUSPEITO' | 'SEM_SINAL';
}

interface SingleBusMarkerProps {
    bus: Bus;
    isFocused: boolean;
    isFollowing: boolean;
    map: L.Map;
}

const STATUS_COLORS: Record<string, string> = {
    NORMAL: '#3b82f6', PARADO: '#f59e0b',
    FORA_ROTA: '#ef4444', SUSPEITO: '#f97316', SEM_SINAL: '#6b7280',
};

const STATUS_LABELS: Record<string, string> = {
    PARADO: '🟡 Parado', FORA_ROTA: '🔴 Fora da rota',
    SUSPEITO: '🟠 Vel. suspeita', SEM_SINAL: '⚠️ Sem sinal', NORMAL: ''
};

// Create SVG Icon 
function getBusIcon(bus: Bus, isFocused: boolean): L.DivIcon {
    const isMoving = bus.Speed > 5;
    const baseColor = STATUS_COLORS[bus.status || 'NORMAL'] || '#3b82f6';
    const color = (bus.Speed === 0 && bus.status === 'NORMAL') ? '#8b5cf6' : baseColor;

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

const SingleBusMarker: React.FC<SingleBusMarkerProps> = ({ bus, isFocused, isFollowing, map }) => {
    const markerRef = useRef<L.Marker>(null);

    let displayLat = bus.Latitude;
    let displayLng = bus.Longitude;

    let sense: 'IDA' | 'VOLTA' | null = null;

    try {
        const snap = getProjectedPosition(bus.Latitude, bus.Longitude, bus.LineNumber);
        if (snap) {
            displayLat = snap.point[0];
            displayLng = snap.point[1];
            sense = getRouteSense(bus.LineNumber, snap.index);
        }
    } catch (e) {
        // Fallback to raw GPS
    }

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
    const ageClass = ageMinutes > 5 ? 'text-red-500 font-bold' : 'text-gray-500';

    return (
        <SlidingMarker
            position={[displayLat, displayLng]}
            duration={1800}
            icon={getBusIcon(bus, isFocused)}
            markerRef={markerRef}
        >
            <Popup className="bus-popup">
                <div className="p-1 min-w-[200px]">
                    <div className="flex justify-between items-start mb-2 border-b border-gray-100 pb-2">
                        <div>
                            <span className="font-bold text-xl text-gray-800 tracking-tight">
                                {bus.VehicleDescription.replace('DC-', '').replace('DC', '')}
                            </span>
                            <span className="block text-xs font-bold text-blue-600 bg-blue-50 w-fit px-2 py-0.5 rounded-full mt-0.5">
                                LINHA {bus.LineNumber}
                            </span>
                        </div>
                        {bus.Speed > 0 && (
                            <div className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-md shadow-sm flex items-center gap-1">
                                {bus.Speed} km/h
                            </div>
                        )}
                    </div>

                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
                            <span className="text-gray-500 font-medium">Sentido</span>
                            <span className="font-bold text-gray-700">
                                {sense === 'IDA' ? '➡️ CIDADE' : sense === 'VOLTA' ? '⬅️ BAIRRO' : '---'}
                            </span>
                        </div>

                        <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
                            <span className="text-gray-500 font-medium">Última conexão</span>
                            <span className={`${ageClass} font-bold`}>
                                {timeSince(bus.GPSDate) === 'NaNm' ? 'Agora' : timeSince(bus.GPSDate)}
                            </span>
                        </div>

                        {(bus.status && bus.status !== 'NORMAL') && (
                            <div className="mt-2 text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1.5 rounded border border-orange-100 flex items-center gap-1.5">
                                {STATUS_LABELS[bus.status]}
                            </div>
                        )}

                        {isFocused && (
                            <div className="mt-2 text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1.5 rounded border border-blue-100 flex items-center justify-center gap-1.5 animate-pulse">
                                🎯 Modo Câmera Ativo
                            </div>
                        )}
                    </div>
                </div>
            </Popup>
        </SlidingMarker>
    );
};

export default React.memo(SingleBusMarker, (prevProps, nextProps) => {
    // Only re-render if essential visual properties change to save massive CPU
    return (
        prevProps.bus.Latitude === nextProps.bus.Latitude &&
        prevProps.bus.Longitude === nextProps.bus.Longitude &&
        prevProps.isFocused === nextProps.isFocused &&
        prevProps.bus.Speed === nextProps.bus.Speed &&
        prevProps.bus.status === nextProps.bus.status
    );
});
