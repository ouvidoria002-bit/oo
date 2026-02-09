import React, { useEffect, useRef, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
// @ts-ignore
import omnivore from 'leaflet-omnivore';
import { LINE_KML_MAPPING, LINE_NAMES, MAP_CENTER, ZOOM_LEVEL } from '../constants';
import SlidingMarker from './SlidingMarker';
import { getProjectedPosition, getSnappedPath } from '../routeMatcher';
import type { BusStop } from '../stopsManager';
import { Briefcase, GraduationCap, Heart, Users } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';

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

interface Instituicao {
    id: string | number;
    nome: string;
    latitude?: number;
    longitude?: number;
    endereco?: string;
    category: 'Secretaria' | 'Saúde' | 'Educação' | 'Social';
    type: string;
    details?: any;
    displayName?: string;
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
    instituicoes?: Instituicao[];
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

                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(text, "text/xml");
                    const lineStrings = xmlDoc.getElementsByTagName("LineString");

                    let paths: number[][][] = [];

                    for (let i = 0; i < lineStrings.length; i++) {
                        const coordsNode = lineStrings[i].getElementsByTagName("coordinates")[0];
                        if (coordsNode) {
                            const raw = coordsNode.textContent?.trim() || "";
                            const points = raw.split(/\s+/).map(pair => {
                                const [lng, lat] = pair.split(',').map(Number);
                                return (isNaN(lng) || isNaN(lat)) ? null : [lng, lat];
                            }).filter((p): p is number[] => p !== null);

                            if (points.length > 2) {
                                paths.push(points);
                            }
                        }
                    }

                    if (paths.length > 0) {
                        const geoJson: any = {
                            type: "Feature",
                            properties: {},
                            geometry: {
                                type: "MultiLineString",
                                coordinates: paths
                            }
                        };
                        customLayer.addData(geoJson);
                    }

                    customLayer.addTo(map);
                    layerRef.current = customLayer;

                } catch (e) {
                    console.error("Failed to load KML", e);
                }
            }
            run();
        } else {
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

const InstituicoesLayer = ({ data, visibleCategories }: { data: Instituicao[], visibleCategories: string[] }) => {
    if (!data || data.length === 0) return null;

    const getIconSvg = (category: string) => {
        let iconNode = <Briefcase size={16} color="white" />;
        let bgColor = '#6b7280'; // Gray default

        switch (category) {
            case 'Secretaria':
                iconNode = <Briefcase size={16} color="white" />;
                bgColor = '#4b5563'; // Gray 600
                break;
            case 'Saúde':
                iconNode = <Heart size={16} color="white" />;
                bgColor = '#ef4444'; // Red 500
                break;
            case 'Educação':
                iconNode = <GraduationCap size={16} color="white" />;
                bgColor = '#f59e0b'; // Amber 500
                break;
            case 'Social':
                iconNode = <Users size={16} color="white" />;
                bgColor = '#8b5cf6'; // Violet 500
                break;
        }

        const svgString = renderToStaticMarkup(iconNode);

        return L.divIcon({
            className: 'inst-marker',
            html: `<div style="
                background-color: ${bgColor};
                width: 28px;
                height: 28px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 2px solid white;
                box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            ">${svgString}</div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
            popupAnchor: [0, -14]
        });
    };

    return (
        <>
            {data.filter(i => visibleCategories.includes(i.category) && i.latitude && i.longitude).map((item, idx) => (
                <Marker
                    key={`inst-${item.id || idx}`}
                    position={[item.latitude!, item.longitude!]}
                    icon={getIconSvg(item.category)}
                >
                    <Popup>
                        <div style={{ minWidth: '200px' }}>
                            <strong style={{ display: 'block', marginBottom: '4px', color: '#1f2937' }}>{item.displayName || item.nome}</strong>
                            <span style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold', color: '#6b7280', background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>
                                {item.type}
                            </span>
                            {item.endereco && !/^-?\d+\.\d+.*-?\d+\.\d+/.test(item.endereco) && (
                                <div style={{ fontSize: '12px', marginTop: '8px', color: '#4b5563' }}>
                                    {item.endereco}
                                </div>
                            )}
                        </div>
                    </Popup>
                </Marker>
            ))}
        </>
    );
};

// Filter Controls Component
const FilterControls = ({
    activeFilters,
    toggleFilter
}: {
    activeFilters: string[],
    toggleFilter: (cat: string) => void
}) => {
    const categories = [
        { id: 'Secretaria', icon: <Briefcase size={14} />, color: '#4b5563', label: 'Secretarias' },
        { id: 'Saúde', icon: <Heart size={14} />, color: '#ef4444', label: 'Saúde' },
        { id: 'Educação', icon: <GraduationCap size={14} />, color: '#f59e0b', label: 'Escolas' },
        { id: 'Social', icon: <Users size={14} />, color: '#8b5cf6', label: 'Social' },
    ];

    return (
        <div className="leaflet-bottom leaflet-right" style={{ marginBottom: '90px', marginRight: '10px', pointerEvents: 'auto', zIndex: 1000 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                {categories.map(cat => {
                    const isActive = activeFilters.includes(cat.id);
                    return (
                        <button
                            key={cat.id}
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleFilter(cat.id);
                            }}
                            style={{
                                background: isActive ? cat.color : 'white',
                                color: isActive ? 'white' : '#4b5563',
                                border: 'none',
                                borderRadius: '20px',
                                padding: '6px 12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '12px',
                                fontWeight: 600,
                                boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                opacity: isActive ? 1 : 0.9
                            }}
                        >
                            <span style={{ display: 'flex', alignItems: 'center' }}>{cat.icon}</span>
                            {cat.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

const FlyToHandler = ({ location }: { location?: [number, number] | null }) => {
    const map = useMap();
    useEffect(() => {
        if (location) {
            map.setView(location, 18, { animate: true });
        }
    }, [location, map]);
    return null;
}

const InteractionHandler = ({ onInteraction }: { onInteraction: () => void }) => {
    useMapEvents({
        dragstart: () => {
            onInteraction();
        },
    });
    return null;
};

const InitialFocusHandler = ({ focusedBusId, buses, isFollowing }: { focusedBusId: string | null, buses: Bus[], isFollowing: boolean }) => {
    const map = useMap();
    const prevFocusedIdRef = useRef<string | null>(null);

    useEffect(() => {
        if (focusedBusId && isFollowing) {
            const bus = buses.find(b => b.VehicleDescription === focusedBusId);
            if (bus) {
                if (focusedBusId !== prevFocusedIdRef.current) {
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
    }, [focusedBusId, isFollowing, map]);

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
        onRecenter();

        if (focusedBusId) {
            const bus = buses.find(b => b.VehicleDescription === focusedBusId);
            if (bus) {
                // CRITICAL FIX: Use the SAME projected position that the marker uses
                let targetLat = bus.Latitude;
                let targetLng = bus.Longitude;

                try {
                    const snap = getProjectedPosition(bus.Latitude, bus.Longitude, bus.LineNumber);
                    if (snap) {
                        targetLat = snap.point[0];
                        targetLng = snap.point[1];
                    }
                } catch (e) {
                    console.warn("Failed to get projected position for recenter", e);
                }

                map.setView([targetLat, targetLng], 17, { animate: true });
                return;
            }
        }

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
                bottom: '40px',
                right: '14px',
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

    const createBusIcon = (isFocused: boolean, isOffline: boolean) => L.divIcon({
        className: 'custom-bus-icon',
        html: `<div style="background: ${isOffline ? '#6b7280' : (isFocused ? '#ef4444' : '#3b82f6')}; border: ${isFocused ? '3px' : '2px'} solid white; width: ${isFocused ? '32px' : '24px'}; height: ${isFocused ? '32px' : '24px'}; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 8px rgba(0,0,0,0.4); transition: all 0.3s ease;">
                <span style="font-size: ${isFocused ? '18px' : '14px'};">${isOffline ? '⚠️' : '🚌'}</span>
               </div>`,
        iconSize: [isFocused ? 40 : 30, isFocused ? 40 : 30],
        iconAnchor: [isFocused ? 20 : 15, isFocused ? 20 : 15]
    });

    return (
        <>
            {visibleBuses.map((bus) => {
                const isFocused = bus.VehicleDescription === focusedBusId;
                const now = Date.now();
                const gpsTime = new Date(bus.GPSDate).getTime();
                const isOffline = (now - gpsTime) > 5 * 60 * 1000;

                const prevIndex = lastIndicesRef.current[bus.VehicleDescription] ?? -1;
                const snap = getProjectedPosition(bus.Latitude, bus.Longitude, bus.LineNumber, prevIndex, 100);

                let displayLat = bus.Latitude;
                let displayLng = bus.Longitude;
                let path: [number, number][] | undefined = undefined;

                if (snap) {
                    displayLat = snap.point[0];
                    displayLng = snap.point[1];
                    lastIndicesRef.current[bus.VehicleDescription] = snap.index;

                    if (prevIndex >= 0) {
                        const calculatedPath = getSnappedPath(prevIndex, snap.index, bus.LineNumber);
                        if (calculatedPath && calculatedPath.length < 500) {
                            path = calculatedPath;
                        }
                    }
                } else {
                    // Debug log when snap fails
                    console.warn(`[BusMarkers] Failed to snap bus ${bus.VehicleDescription} (${bus.LineNumber}) at [${bus.Latitude}, ${bus.Longitude}]`);
                    delete lastIndicesRef.current[bus.VehicleDescription];
                }

                const handlePositionChange = (pos: [number, number]) => {
                    if (isFocused && isFollowing) {
                        map.setView(pos, 17, { animate: false });
                    }
                };

                return (
                    <SlidingMarker
                        key={bus.VehicleDescription}
                        position={[displayLat, displayLng]}
                        duration={4000}
                        icon={createBusIcon(isFocused, isOffline)}
                        path={path}
                        onPositionChange={isFocused && isFollowing ? handlePositionChange : undefined}
                    >
                        <Popup>
                            <strong>{bus.VehicleDescription}</strong><br />
                            <span style={{ color: '#666' }}>{LINE_NAMES[bus.LineNumber] || bus.LineNumber}</span>
                            {isOffline && <div style={{ color: '#ef4444', fontWeight: 'bold', marginTop: '5px' }}>⚠️ Sem Sinal</div>}
                            {!isOffline && snap && <div style={{ color: '#059669', fontSize: '10px' }}>⚡ Rota Monitorada</div>}
                            {isFocused && <div style={{ color: '#ef4444', fontWeight: 'bold', marginTop: '5px' }}>📍 Seguindo</div>}
                        </Popup>
                    </SlidingMarker>
                );
            })}
        </>
    );
};

const MapComponent: React.FC<MapComponentProps> = ({
    buses, selectedLine, userLocation, focusedBusId, onRecenter,
    lineStops, closestStop, flyToLocation, onStopClick,
    instituicoes = []
}) => {
    const [isFollowing, setIsFollowing] = useState(false);
    const [visibleCategories, setVisibleCategories] = useState<string[]>([]); // Default all hidden

    const toggleFilter = (cat: string) => {
        setVisibleCategories(prev =>
            prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
        );
    };

    useEffect(() => {
        if (focusedBusId) {
            setIsFollowing(true);
        } else {
            setIsFollowing(false);
        }
    }, [focusedBusId]);

    const visibleBuses = useMemo(() => {
        if (selectedLine) {
            return buses.filter(b => b.LineNumber === selectedLine);
        }
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

                {lineStops && <StopsLayer stops={lineStops} closestStop={closestStop} onStopClick={onStopClick} />}

                {/* Institutions Layer: Render only if user enabled filters */}
                <InstituicoesLayer data={instituicoes} visibleCategories={visibleCategories} />

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

                {userLocation && (
                    <Marker position={userLocation} icon={userIcon}>
                        <Popup>Você está aqui</Popup>
                    </Marker>
                )}

                <BusMarkers visibleBuses={visibleBuses} focusedBusId={focusedBusId} isFollowing={isFollowing} />

                {/* Filter Controls: Always visible on map */}
                <FilterControls activeFilters={visibleCategories} toggleFilter={toggleFilter} />

            </MapContainer>
        </div>
    );
};

export default MapComponent;
