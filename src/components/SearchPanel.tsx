import React, { useState, useMemo } from 'react';
import { Search, X, ChevronLeft } from 'lucide-react';
import { LINE_KML_MAPPING, LINE_NAMES } from '../constants';
import './SearchPanel.css';

interface Bus {
    VehicleDescription: string;
    LineNumber: string;
    Latitude: number;
    Longitude: number;
}

interface SearchPanelProps {
    buses: Bus[];
    onSelectLine: (lineId: string | null) => void;
    selectedLine: string | null;
    userLocation: [number, number] | null;
    onFocusBus: (busId: string | null) => void;
    focusedBusId: string | null;
}

// Define explicit Union Type to avoid inference errors
type SearchResult =
    | { id: string; name: string; type: 'line'; distance: number; busId?: undefined }
    | { id: string; name: string; type: 'bus'; distance: number; busId: string };

const SearchPanel: React.FC<SearchPanelProps> = ({ buses, onSelectLine, selectedLine, userLocation, onFocusBus, focusedBusId }) => {
    const [query, setQuery] = useState('');
    const [isFocused, setIsFocused] = useState(false);

    // Helpers for Distance
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const handleFocusBus = (bus: Bus) => {
        onFocusBus(bus.VehicleDescription);
    };

    // Calculate minimum distance from User to any bus of a specific Line
    const getMinDistanceToLine = (lineNum: string) => {
        if (!userLocation) return Infinity;
        const lineBuses = buses.filter(b => b.LineNumber === lineNum);
        if (lineBuses.length === 0) return Infinity;

        let minD = Infinity;
        lineBuses.forEach(b => {
            const d = calculateDistance(userLocation[0], userLocation[1], b.Latitude, b.Longitude);
            if (d < minD) minD = d;
        });
        return minD;
    };

    const availableLines = useMemo(() => Object.keys(LINE_KML_MAPPING), []);

    const filteredResults = useMemo(() => {
        const lowerQuery = query.toLowerCase();

        // 1. Filter Lines (Name or ID)
        const matches: SearchResult[] = availableLines.filter(line => {
            const name = LINE_NAMES[line] || '';
            const id = line;
            return id.toLowerCase().includes(lowerQuery) || name.toLowerCase().includes(lowerQuery);
        }).map(line => ({
            id: line,
            name: LINE_NAMES[line] || line,
            type: 'line',
            distance: getMinDistanceToLine(line)
        }));

        // 2. Filter Buses
        if (query) {
            const busMatches = buses
                .filter(b => b.VehicleDescription.toLowerCase().includes(lowerQuery))
                .map(b => ({
                    id: b.LineNumber,
                    name: LINE_NAMES[b.LineNumber] || b.LineNumber,
                    type: 'bus' as const,
                    busId: b.VehicleDescription,
                    distance: userLocation ? calculateDistance(userLocation[0], userLocation[1], b.Latitude, b.Longitude) : Infinity
                }));
            busMatches.forEach(bm => matches.push(bm));
        }

        // 3. Sort
        if (userLocation) {
            matches.sort((a, b) => a.distance - b.distance);
        } else if (!query) {
            matches.sort((a, b) => a.id.localeCompare(b.id));
        }

        return matches;
    }, [query, availableLines, buses, userLocation]);

    const handleSelect = (line: string) => {
        onSelectLine(line);
        setQuery('');
        setIsFocused(false);
    };

    const handleClear = () => {
        onSelectLine(null);
        setQuery('');
        onFocusBus(null);
    };

    if (selectedLine) {
        const activeBuses = buses.filter(b => b.LineNumber === selectedLine);

        // Sort active buses by proximity to user
        if (userLocation) {
            activeBuses.sort((a, b) => {
                const dA = calculateDistance(userLocation[0], userLocation[1], a.Latitude, a.Longitude);
                const dB = calculateDistance(userLocation[0], userLocation[1], b.Latitude, b.Longitude);
                return dA - dB;
            });
        }

        return (
            <div className="search-panel-container selected-mode" style={{ flexDirection: 'column', height: 'auto', maxHeight: '50vh', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '12px', borderBottom: '1px solid #eee' }}>
                    <button className="back-button" onClick={handleClear} style={{ marginRight: '10px' }}>
                        <ChevronLeft size={20} />
                    </button>
                    <div className="selected-info" style={{ flex: 1 }}>
                        <strong style={{ fontSize: '13px', display: 'block' }}>{LINE_NAMES[selectedLine] || selectedLine}</strong>
                        <span style={{ fontSize: '11px', color: '#666' }}>
                            {activeBuses.length} ônibus ativos
                        </span>
                    </div>
                    <button className="clear-button" onClick={handleClear}>
                        <X size={20} />
                    </button>
                </div>

                <div className="bus-list" style={{ overflowY: 'auto', width: '100%', background: '#fafafa' }}>
                    {activeBuses.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#888', fontSize: '12px' }}>
                            Nenhum ônibus reportando posição nesta rota no momento.
                        </div>
                    ) : (
                        activeBuses.map((bus) => {
                            const dist = userLocation ? calculateDistance(userLocation[0], userLocation[1], bus.Latitude, bus.Longitude).toFixed(1) + ' km' : '';
                            const isFocused = focusedBusId === bus.VehicleDescription;

                            return (
                                <div
                                    key={bus.VehicleDescription}
                                    onClick={() => handleFocusBus(bus)}
                                    style={{
                                        padding: '12px 15px',
                                        borderBottom: '1px solid #eee',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        background: isFocused ? '#eff6ff' : 'white',
                                        borderLeft: isFocused ? '3px solid #3b82f6' : '3px solid transparent',
                                        transition: 'background 0.2s'
                                    }}
                                >
                                    <div style={{ marginRight: '12px', fontSize: '20px', filter: isFocused ? 'drop-shadow(0 0 2px rgba(59,130,246,0.5))' : 'none' }}>🚌</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: '14px', color: '#333' }}>{bus.VehicleDescription}</div>
                                        {dist && <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>📍 {dist} de você</div>}
                                    </div>
                                    {isFocused && <div style={{ fontSize: '10px', color: '#3b82f6', fontWeight: 'bold', background: '#dbeafe', padding: '2px 6px', borderRadius: '4px' }}>ACOMPANHANDO</div>}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="search-panel-container">
            <div className="search-input-wrapper">
                <Search className="search-icon" size={20} />
                <input
                    type="text"
                    placeholder="Buscar linha ou ônibus..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    // Delay blur to allow click
                    onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                />
                {query && (
                    <button className="clear-input" onClick={() => setQuery('')}>
                        <X size={16} />
                    </button>
                )}
            </div>

            {(isFocused) && (
                <div className="search-results">
                    {userLocation && !query && (
                        <div style={{ padding: '8px 16px', fontSize: '12px', color: '#888', background: '#f8f8f8', borderBottom: '1px solid #eee' }}>
                            Próximos a você
                        </div>
                    )}

                    {filteredResults.length === 0 ? (
                        <div className="no-results">Nenhuma linha encontrada</div>
                    ) : (
                        filteredResults.map((res, idx) => (
                            <div
                                key={`${res.id}-${idx}`}
                                className="search-result-item"
                                onClick={() => handleSelect(res.id)}
                            >
                                <div className={`result-icon ${res.type === 'line' ? 'line-type' : 'bus-type'}`}>
                                    {res.type === 'line' ? '🗺️' : '🚌'}
                                </div>
                                <div className="result-info">
                                    <div className="result-title">{res.name}</div>
                                    <div className="result-subtitle">
                                        {res.id}
                                        {res.type === 'bus' && ` • Ônibus ${res.busId}`}
                                        {userLocation && res.distance !== Infinity && ` • ${res.distance.toFixed(1)} km`}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchPanel;
