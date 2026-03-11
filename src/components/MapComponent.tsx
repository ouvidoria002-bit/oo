import React, { useEffect, useRef, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
// @ts-ignore
import omnivore from 'leaflet-omnivore';
import { LINE_KML_MAPPING, MAP_CENTER, ZOOM_LEVEL } from '../constants';
import SingleBusMarker from './SingleBusMarker';
import { getProjectedPosition } from '../routeMatcher';
import type { BusStop } from '../stopsManager';
import { Briefcase, GraduationCap, Heart, Users, Bus as BusIcon, Target, HelpCircle, Navigation } from 'lucide-react';
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
    Speed: number;
    Direction: number;
    GPSDate: string;
    status?: 'NORMAL' | 'PARADO' | 'FORA_ROTA' | 'SUSPEITO' | 'SEM_SINAL';
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
            const kmlUrl = `/cbt/kml-exports/${LINE_KML_MAPPING[selectedLine]}`;

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
                const iconSvg = renderToStaticMarkup(
                    <BusIcon
                        size={isClosest ? 18 : 14}
                        color="white"
                        strokeWidth={2.5}
                    />
                );

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
                                background: ${isClosest ? '#10b981' : '#64748b'}; 
                                border: 2px solid white; 
                                width: ${isClosest ? '32px' : '26px'}; 
                                height: ${isClosest ? '32px' : '26px'}; 
                                border-radius: 50%; 
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                                cursor: pointer;
                                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                            ">${iconSvg}</div>`,
                            iconSize: [32, 32],
                            iconAnchor: [16, 16],
                            popupAnchor: [0, -16]
                        })}
                    >
                        <Popup>
                            <strong>🚏 {stop.name}</strong>
                            {isClosest && <div style={{ color: '#10b981', fontWeight: 'bold' }}>Ponto mais próximo de você</div>}
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

// Color Legend Component
const ColorLegend = () => {
    const [isOpen, setIsOpen] = useState(false);
    const items = [
        { color: '#3b82f6', label: 'Em movimento' },
        { color: '#f59e0b', label: 'Parado' },
        { color: '#ef4444', label: 'Fora de rota' },
        { color: '#6b7280', label: 'Sem sinal' },
        { color: '#8b5cf6', label: 'Iniciando' },
    ];

    return (
        <div className="leaflet-bottom leaflet-left" style={{ marginBottom: '90px', marginLeft: '10px', pointerEvents: 'auto', zIndex: 1000, display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
            <button
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                style={{
                    background: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
                    cursor: 'pointer',
                    color: '#4b5563',
                    transition: 'all 0.2s'
                }}
            >
                <HelpCircle size={20} />
            </button>
            {isOpen && (
                <div style={{
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(8px)',
                    padding: '10px',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    border: '1px solid rgba(0,0,0,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    marginBottom: '2px'
                }}>
                    <span style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Legenda</span>
                    {items.map(item => (
                        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.color, border: '1px solid rgba(0,0,0,0.1)' }}></div>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#334155', whiteSpace: 'nowrap' }}>{item.label}</span>
                        </div>
                    ))}
                </div>
            )}
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

const FleetToggleButton: React.FC<{
    buses: any[],
    selectedLine: string | null,
    focusedBusId: string | null,
    showAllBuses: boolean,
    setShowAllBuses: (val: boolean) => void
}> = ({ buses, selectedLine, focusedBusId, showAllBuses, setShowAllBuses }) => {
    const map = useMap();

    // Hide global fleet button if a specific line/bus is focused, to keep UI clean
    if (selectedLine || focusedBusId) return null;

    const handleAction = () => {
        const newShowAll = !showAllBuses;
        setShowAllBuses(newShowAll);

        if (newShowAll && buses.length > 0) {
            const points: L.LatLngExpression[] = buses.map(b => [b.Latitude, b.Longitude]);
            const bounds = L.latLngBounds(points);
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15, animate: true });
        } else if (!newShowAll) {
            map.setView(MAP_CENTER, ZOOM_LEVEL);
        }
    };

    return (
        <div style={{ position: 'absolute', top: '15px', left: '14px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start', pointerEvents: 'auto' }}>
            <button
                id="recenter-btn"
                onClick={handleAction}
                style={{
                    background: showAllBuses ? '#3b82f6' : 'rgba(255, 255, 255, 0.98)',
                    backdropFilter: 'blur(8px)',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '12px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    color: showAllBuses ? 'white' : '#1e293b',
                    fontWeight: '700',
                    fontSize: '14px'
                }}
            >
                <Target size={18} color={showAllBuses ? 'white' : '#3b82f6'} />
                {showAllBuses ? 'Ocultar Frota' : 'Ver Toda a Frota'}
            </button>
        </div>
    );
};

const CenterLocationButton = ({ isFollowing, onRecenter, hasFocusTarget }: { isFollowing: boolean, onRecenter: () => void, hasFocusTarget: boolean }) => {
    if (isFollowing || !hasFocusTarget) return null;

    return (
        <div style={{
            position: 'absolute',
            bottom: 'max(env(safe-area-inset-bottom, 20px), 25px)', // Use safe-area for home bar
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            pointerEvents: 'auto',
            transition: 'opacity 0.2s',
        }}>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onRecenter();
                }}
                style={{
                    background: 'white',
                    color: '#3b82f6',
                    border: 'none',
                    borderRadius: '24px',
                    padding: '10px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                    cursor: 'pointer',
                    fontWeight: '700',
                    fontSize: '14px',
                    transition: 'transform 0.2s',
                    textTransform: 'uppercase',
                    letterSpacing: '0.3px'
                }}
            >
                <Navigation size={18} fill="currentColor" style={{ transform: 'rotate(45deg)', marginBottom: '2px' }} />
                Recentralizar
            </button>
        </div>
    );
};


const BusMarkers = ({ visibleBuses, focusedBusId, isFollowing }: { visibleBuses: Bus[], focusedBusId: string | null, isFollowing: boolean }) => {
    const map = useMap();

    // Opt: Viewport Culling — track map bounds to only render visible buses
    const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(() => map.getBounds());
    useMapEvents({
        moveend: () => setMapBounds(map.getBounds()),
        zoomend: () => setMapBounds(map.getBounds()),
    });

    // Expand bounds by 20% margin so buses near edge don't pop in
    const expandedBounds = mapBounds ? mapBounds.pad(0.2) : null;

    // Filter to only buses in/near viewport — avoid rendering off-screen markers
    const culledBuses = expandedBounds
        ? visibleBuses.filter(b => {
            const focused = b.VehicleDescription === focusedBusId;
            return focused || expandedBounds.contains(L.latLng(b.Latitude, b.Longitude));
        })
        : visibleBuses;


    return (
        <>
            {culledBuses.map((bus) => (
                <SingleBusMarker
                    key={bus.VehicleDescription}
                    bus={bus}
                    isFocused={bus.VehicleDescription === focusedBusId}
                    isFollowing={isFollowing}
                    map={map}
                />
            ))}
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
    const [showAllBuses, setShowAllBuses] = useState(false);

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

    // Quando o usuário seleciona uma linha, desativa o "Ver Tudo" para focar na linha
    useEffect(() => {
        if (selectedLine) {
            setShowAllBuses(false);
        }
    }, [selectedLine]);

    const visibleBuses = useMemo(() => {
        if (selectedLine) {
            return buses.filter(b => b.LineNumber === selectedLine);
        }

        // Se "Ver Tudo" estiver ativado, mostra todos. Senão, inicia VAZIO.
        if (showAllBuses) {
            return buses;
        }

        return [];
    }, [buses, selectedLine, showAllBuses]);

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

                <FleetToggleButton
                    buses={buses}
                    selectedLine={selectedLine}
                    focusedBusId={focusedBusId}
                    showAllBuses={showAllBuses}
                    setShowAllBuses={setShowAllBuses}
                />

                <CenterLocationButton
                    isFollowing={isFollowing}
                    hasFocusTarget={!!selectedLine || !!focusedBusId}
                    onRecenter={() => {
                        setIsFollowing(true);
                        if (onRecenter) onRecenter();

                        // Force recenter if a line is selected but no specific bus
                        if (selectedLine && !focusedBusId) {
                            const mapBoundsPoints: L.LatLngExpression[] = [];
                            if (userLocation) mapBoundsPoints.push(userLocation);
                            visibleBuses.forEach(b => mapBoundsPoints.push([b.Latitude, b.Longitude]));
                            if (mapBoundsPoints.length > 0) {
                                // Default bounding
                            }
                        }
                    }}
                />

                {userLocation && (
                    <Marker position={userLocation} icon={userIcon}>
                        <Popup>Você está aqui</Popup>
                    </Marker>
                )}

                <BusMarkers visibleBuses={visibleBuses} focusedBusId={focusedBusId} isFollowing={isFollowing} />

                {/* Legend and Filter Controls */}
                <ColorLegend />
                <FilterControls activeFilters={visibleCategories} toggleFilter={toggleFilter} />

            </MapContainer>
        </div>
    );
};

export default MapComponent;
