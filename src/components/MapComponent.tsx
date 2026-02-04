import React, { useEffect, useRef, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
// @ts-ignore
import omnivore from 'leaflet-omnivore';
import { LINE_KML_MAPPING, LINE_NAMES, MAP_CENTER, ZOOM_LEVEL } from '../constants';
import SlidingMarker from './SlidingMarker';
import { getProjectedPosition, getSnappedPath } from '../routeMatcher';
import { BusStop } from '../stopsManager';

// Fix Leaflet Default Icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface Bus {
    VehicleDescription: string;
    LineNumber: string;
    Latitude: number;
    Longitude: number;
    GPSDate: string;
}

interface MapComponentProps {
    buses: Bus[];
    selectedLine: string | null;
    userLocation: [number, number] | null;
    focusedBusId: string | null;
    onRecenter?: () => void;
    lineStops?: BusStop[];
    closestStop?: BusStop | null;
    flyToLocation?: [number, number] | null;
    onStopClick?: (stop: BusStop) => void;
}

const KmlLayer = ({ selectedLine, userLocation }: { selectedLine: string | null, userLocation: [number, number] | null }) => {
    const map = useMap();
    const layerRef = useRef<L.LayerGroup | null>(null);

    useEffect(() => {
        if (layerRef.current) {
            map.removeLayer(layerRef.current);
            layerRef.current = null;
        }

        if (selectedLine && LINE_KML_MAPPING[selectedLine]) {
            const kmlUrl = `/kml-exports/${LINE_KML_MAPPING[selectedLine]}`;

            const customLayer = L.geoJSON(null, {
                style: {
                    color: '#3b82f6',
                    weight: 5,
                    opacity: 0.8
                }
            });

            const run = async () => {
                try {
                    const response = await fetch(kmlUrl);
                    if (!response.ok) throw new Error('KML not found');
                    const text = await response.text();

                    // Use omnivore to parse string
                    const kml = omnivore.kml.parse(text);

                    // Extract GeoJSON
                    const geoJson = kml.toGeoJSON();
                    customLayer.addData(geoJson);

                    customLayer.addTo(map);
                    layerRef.current = customLayer;

                    // Note: We leave bounds fitting to InitialBoundsHandler now

                } catch (e) {
                    console.error("Failed to load KML", e);
                }
            }
            run();
        } else {
            // If no line selected, and no user location, reset.
            if (!userLocation) {
                map.setView(MAP_CENTER, ZOOM_LEVEL);
            }
        }

        return () => {
            if (layerRef.current) {
                map.removeLayer(layerRef.current);
            }
        };
    }, [selectedLine, map, userLocation]);

    return null;
};

const StopsLayer = ({ stops, closestStop, onStopClick }: { stops: BusStop[], closestStop?: BusStop | null, onStopClick?: (stop: BusStop) => void }) => {
    if (!stops || stops.length === 0) return null;

    return (
        <>
            {stops.map(stop => {
                const isClosest = closestStop && closestStop.id === stop.id;

                return (
                    <Marker
                        key={stop.id}
                        position={[stop.latitude, stop.longitude]}
                        eventHandlers={{
                            click: () => {
                                if (onStopClick) onStopClick(stop);
                            }
                        }}
                        icon={L.divIcon({
                            className: 'bus-stop-icon',
                            html: `<div style="
                                background: ${isClosest ? '#10b981' : 'white'}; 
                                border: 2px solid ${isClosest ? '#047857' : '#666'}; 
                                width: ${isClosest ? '16px' : '10px'}; 
                                height: ${isClosest ? '16px' : '10px'}; 
                                border-radius: 50%; 
                                box-shadow: 0 1px 3px rgba(0,0,0,0.3);
                                cursor: pointer;
                            "></div>`,
                            iconSize: [20, 20],
                            iconAnchor: [10, 10]
                        })}
                    >
                        <Popup>
                            <strong>🚏 {stop.name}</strong>
                            {isClosest && <div style={{ color: '#10b981', fontWeight: 'bold' }}>Ponto mais próximo</div>}
                        </Popup>
                    </Marker>
                );
            })}
        </>
    );
};

// Handle External Fly Requests (e.g. clicking on a stop in the UI)
const FlyToHandler = ({ location }: { location?: [number, number] | null }) => {
    const map = useMap();
    useEffect(() => {
        if (location) {
            map.setView(location, 18, { animate: true });
        }
    }, [location, map]);
    return null;
}

// Detects user interaction to break "Following" mode
const InteractionHandler = ({ onInteraction }: { onInteraction: () => void }) => {
    useMapEvents({
        dragstart: () => {
            onInteraction();
        },
    });
    return null;
};

// Component to handle Initial Snap Focus on Specific Bus
const InitialFocusHandler = ({ focusedBusId, buses, isFollowing }: { focusedBusId: string | null, buses: Bus[], isFollowing: boolean }) => {
    const map = useMap();
    const prevFocusedIdRef = useRef<string | null>(null);

    // This effect runs mainly when selection changes or isFollowing is re-enabled to snap immediately
    useEffect(() => {
        if (focusedBusId && isFollowing) {
            // If we just enabled following or changed bus, SNAP to it.
            const bus = buses.find(b => b.VehicleDescription === focusedBusId);
            if (bus) {
                // If focusedId CHANGED, we snap.
                if (focusedBusId !== prevFocusedIdRef.current) {

                    // FIXED: Apply projection to the focus target too, so we jump to where the icon IS (snapped) not where the GPS says (raw)
                    let targetLat = bus.Latitude;
                    let targetLng = bus.Longitude;

                    try {
                        const snap = getProjectedPosition(bus.Latitude, bus.Longitude, bus.LineNumber);
                        if (snap) {
                            targetLat = snap.point[0];
                            targetLng = snap.point[1];
                        }
                    } catch (e) { }

                    map.setView([targetLat, targetLng], 17, { animate: true });
                    prevFocusedIdRef.current = focusedBusId;
                }
            }
        } else {
            prevFocusedIdRef.current = null;
        }
    }, [focusedBusId, isFollowing, map]); // Removed `buses` from dependency to prevent updates on position change

    return null;
}

const InitialBoundsHandler = ({ selectedLine, buses, userLocation }: { selectedLine: string | null, buses: Bus[], userLocation: [number, number] | null }) => {
    const map = useMap();
    const lastLineRef = useRef<string | null>(null);

    useEffect(() => {
        if (selectedLine !== lastLineRef.current) {
            lastLineRef.current = selectedLine;

            if (selectedLine) {
                const points: L.LatLngExpression[] = [];
                if (userLocation) points.push(userLocation);
                buses.forEach(b => points.push([b.Latitude, b.Longitude]));

                if (points.length > 0) {
                    const bounds = L.latLngBounds(points);
                    if (bounds.isValid()) {
                        map.fitBounds(bounds, { padding: [80, 80], maxZoom: 16, animate: true });
                    }
                }
            }
        }
    }, [selectedLine, buses, userLocation, map]);

    return null;
}

const RecenterButton = ({
    buses,
    userLocation,
    selectedLine,
    focusedBusId,
    onRecenter
}: {
    buses: Bus[],
    userLocation: [number, number] | null,
    selectedLine: string | null,
    focusedBusId: string | null,
    onRecenter: () => void
}) => {
    const map = useMap();

    const handleRecenter = (e: React.MouseEvent) => {
        e.stopPropagation();
        onRecenter(); // This re-enables "Following" mode

        // If specific bus is focused, center on it immediately
        if (focusedBusId) {
            const bus = buses.find(b => b.VehicleDescription === focusedBusId);
            if (bus) {
                map.setView([bus.Latitude, bus.Longitude], 17, { animate: true });
                return;
            }
        }

        // Default behavior: Fit bounds of all visible items
        const points: L.LatLngExpression[] = [];
        if (userLocation) points.push(userLocation);
        buses.forEach(b => points.push([b.Latitude, b.Longitude]));

        if (points.length > 0) {
            const bounds = L.latLngBounds(points);
            if (bounds.isValid()) {
                map.fitBounds(bounds, { padding: [80, 80], maxZoom: 16, animate: true });
            }
        } else if (selectedLine) {
            // Fallback
        } else {
            map.setView(MAP_CENTER, ZOOM_LEVEL);
        }
    };

    if (!selectedLine) return null;

    return (
        <button
            id="recenter-btn"
            onClick={handleRecenter}
            title="Recentralizar"
            style={{
                position: 'absolute',
                bottom: '40px', // Bottom Right
                right: '14px',   // Updated position
                zIndex: 1000,
                background: 'white',
                border: '2px solid rgba(0,0,0,0.1)',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                cursor: 'pointer',
                fontSize: '20px',
                lineHeight: '1'
            }}
        >
            🎯
        </button>
    );
};


const BusMarkers = ({ visibleBuses, focusedBusId, isFollowing }: { visibleBuses: Bus[], focusedBusId: string | null, isFollowing: boolean }) => {
    const map = useMap();
    const lastIndicesRef = useRef<Record<string, number>>({});

    const createBusIcon = (isFocused: boolean) => L.divIcon({
        className: 'custom-bus-icon',
        html: `<div style="background: ${isFocused ? '#ef4444' : '#3b82f6'}; border: ${isFocused ? '3px' : '2px'} solid white; width: ${isFocused ? '32px' : '24px'}; height: ${isFocused ? '32px' : '24px'}; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 8px rgba(0,0,0,0.4); transition: all 0.3s ease;">
                <span style="font-size: ${isFocused ? '18px' : '14px'};">🚌</span>
               </div>`,
        iconSize: [isFocused ? 40 : 30, isFocused ? 40 : 30],
        iconAnchor: [isFocused ? 20 : 15, isFocused ? 20 : 15]
    });

    return (
        <>
            {visibleBuses.map((bus) => {
                const isFocused = bus.VehicleDescription === focusedBusId;

                // --- Snapping Logic ---
                const prevIndex = lastIndicesRef.current[bus.VehicleDescription] ?? -1;
                // Attempt to snap to route
                const snap = getProjectedPosition(bus.Latitude, bus.Longitude, bus.LineNumber, prevIndex);

                let displayLat = bus.Latitude;
                let displayLng = bus.Longitude;
                let path: [number, number][] | undefined = undefined;

                if (snap) {
                    displayLat = snap.point[0];
                    displayLng = snap.point[1];

                    // Update index for next time
                    lastIndicesRef.current[bus.VehicleDescription] = snap.index;

                    // Calculate path from previous to current
                    if (prevIndex >= 0) {
                        const calculatedPath = getSnappedPath(prevIndex, snap.index, bus.LineNumber);
                        if (calculatedPath) {
                            path = calculatedPath;
                        }
                    }
                } else {
                    // Reset index if we lost the route (e.g. off-road or GPS jump)
                    delete lastIndicesRef.current[bus.VehicleDescription];
                }
                // ---------------------

                // If this is the focused bus AND we are following, update map view every frame
                const handlePositionChange = (pos: [number, number]) => {
                    if (isFocused && isFollowing) {
                        // Animate false is crucial to prevent stuttering loops
                        // We are manually driving the camera animation frame-by-frame
                        map.setView(pos, 17, { animate: false });
                    }
                };

                return (
                    <SlidingMarker
                        key={bus.VehicleDescription}
                        position={[displayLat, displayLng]}
                        duration={4000} // Match polling interval
                        icon={createBusIcon(isFocused)}
                        path={path}
                        onPositionChange={isFocused && isFollowing ? handlePositionChange : undefined}
                    >
                        <Popup>
                            <strong>{bus.VehicleDescription}</strong><br />
                            <span style={{ color: '#666' }}>{LINE_NAMES[bus.LineNumber] || bus.LineNumber}</span>
                            {snap && <div style={{ color: '#059669', fontSize: '10px' }}>⚡ Rota Monitorada</div>}
                            {isFocused && <div style={{ color: '#ef4444', fontWeight: 'bold', marginTop: '5px' }}>📍 Seguindo</div>}
                        </Popup>
                    </SlidingMarker>
                );
            })}
        </>
    );
};

const MapComponent: React.FC<MapComponentProps> = ({ buses, selectedLine, userLocation, focusedBusId, onRecenter, lineStops, closestStop, flyToLocation, onStopClick }) => {
    const [isFollowing, setIsFollowing] = useState(false);

    // Reset Following state to true whenever a new bus is focused
    useEffect(() => {
        if (focusedBusId) {
            setIsFollowing(true);
        } else {
            setIsFollowing(false);
        }
    }, [focusedBusId]);

    // Filter buses
    const visibleBuses = useMemo(() => {
        if (selectedLine) {
            return buses.filter(b => b.LineNumber === selectedLine);
        }
        // If no line selected, ONLY show buses that belong to mapped/valid lines
        return buses.filter(b => LINE_NAMES[b.LineNumber]);
    }, [buses, selectedLine]);

    const userIcon = L.divIcon({
        className: 'user-icon',
        html: `<div style="background: #fbbf24; border: 3px solid white; width: 20px; height: 20px; border-radius: 50%; box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.3);"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });

    return (
        <div id="map-container" style={{ height: "100%", width: "100%" }}>
            <MapContainer center={MAP_CENTER} zoom={ZOOM_LEVEL} scrollWheelZoom={true} zoomControl={false} style={{ height: "100%", width: "100%" }}>
                <TileLayer
                    attribution='&copy; <a href="https://www.carto.com/">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />

                <ZoomControl position="bottomleft" />

                <InteractionHandler onInteraction={() => setIsFollowing(false)} />
                <FlyToHandler location={flyToLocation} />

                <KmlLayer selectedLine={selectedLine} userLocation={userLocation} />

                {/* Render Stops Layer */}
                {lineStops && <StopsLayer stops={lineStops} closestStop={closestStop} onStopClick={onStopClick} />}

                <InitialBoundsHandler buses={visibleBuses} userLocation={userLocation} selectedLine={selectedLine} />
                <InitialFocusHandler focusedBusId={focusedBusId} buses={visibleBuses} isFollowing={isFollowing} />

                <RecenterButton
                    buses={visibleBuses}
                    userLocation={userLocation}
                    selectedLine={selectedLine}
                    focusedBusId={focusedBusId}
                    onRecenter={() => {
                        setIsFollowing(true);
                        if (onRecenter) onRecenter();
                    }}
                />

                {/* ... Markers ... */}
                {userLocation && (
                    <Marker position={userLocation} icon={userIcon}>
                        <Popup>Você está aqui</Popup>
                    </Marker>
                )}

                <BusMarkers visibleBuses={visibleBuses} focusedBusId={focusedBusId} isFollowing={isFollowing} />
            </MapContainer>
        </div>
    );
};

export default MapComponent;
