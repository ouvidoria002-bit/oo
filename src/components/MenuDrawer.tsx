import React, { useState } from 'react';
import { X, Clock, ExternalLink, ChevronRight, ChevronDown, MapPin, HelpCircle } from 'lucide-react';
import { LINE_NAMES } from '../constants';
import { BUS_SCHEDULES } from '../schedules';

interface MenuDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onOpenTutorial: () => void;
}

// Custom Instagram Icon to replace deprecated Lucide version
const InstagramIcon = ({ size = 24, color = 'currentColor' }: { size?: number, color?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
    </svg>
);

const MenuDrawer: React.FC<MenuDrawerProps> = ({ isOpen, onClose, onOpenTutorial }) => {
    const [view, setView] = useState<'main' | 'schedules'>('main');
    const [expandedLine, setExpandedLine] = useState<string | null>(null);

    // List of Lines for Schedules
    const lines = Object.entries(LINE_NAMES).map(([code, name]) => ({
        code,
        name
    }));

    const toggleLine = (lineCode: string) => {
        if (expandedLine === lineCode) {
            setExpandedLine(null);
        } else {
            setExpandedLine(lineCode);
        }
    };

    const handleTutorialClick = () => {
        onClose(); // Close menu first
        onOpenTutorial();
    };

    const renderMainContent = () => (
        <div className="menu-list">
            <h2 style={{ padding: '0 16px', margin: '20px 0 10px', fontSize: '14px', color: '#888', textTransform: 'uppercase' }}>Serviços</h2>

            <button className="menu-item" onClick={handleTutorialClick}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <HelpCircle size={20} color="#003366" />
                    <span>Como usar o app</span>
                </div>
            </button>

            <button className="menu-item" onClick={() => setView('schedules')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Clock size={20} color="#003366" />
                    <span>Horários</span>
                </div>
                <ChevronRight size={16} color="#ccc" />
            </button>

            <a href="https://duquedecaxias.rj.gov.br/" target='_blank' rel="noreferrer" className="menu-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <ExternalLink size={20} color="#003366" />
                    <span>Site da Prefeitura</span>
                </div>
            </a>

            <a href="https://duquedecaxias.colab.re/" target='_blank' rel="noreferrer" className="menu-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <ExternalLink size={20} color="#003366" />
                    <span>Site do Colab</span>
                </div>
            </a>

            <h2 style={{ padding: '0 16px', margin: '20px 0 10px', fontSize: '14px', color: '#888', textTransform: 'uppercase' }}>Redes Sociais</h2>

            <a href="https://www.instagram.com/ouvidoria.caxias?igsh=MWtjd2VrcjZjMTg5OA==" target='_blank' rel="noreferrer" className="menu-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <InstagramIcon size={20} color="#E1306C" />
                    <span>Ouvidoria</span>
                </div>
            </a>

            <a href="https://www.instagram.com/duquedecaxiasoficial?igsh=bjdmdmt5M2R3a3Nx" target='_blank' rel="noreferrer" className="menu-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <InstagramIcon size={20} color="#E1306C" />
                    <span>Prefeitura</span>
                </div>
            </a>
        </div>
    );

    const renderScheduleSection = (title: string, times: string[]) => {
        if (!times || times.length === 0) return null;
        return (
            <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#666', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={12} /> Saída: {title}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {times.map((time, idx) => (
                        <span key={idx} style={{
                            background: '#f0f9ff',
                            color: '#003366',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '13px',
                            border: '1px solid #bae6fd'
                        }}>
                            {time}
                        </span>
                    ))}
                </div>
            </div>
        );
    };

    const renderSchedulesList = () => (
        <div className="menu-list" style={{ overflowY: 'auto', height: '100%' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '10px', position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
                <button onClick={() => setView('main')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    <ChevronRight size={20} style={{ transform: 'rotate(180deg)' }} />
                </button>
                <span style={{ fontWeight: 'bold' }}>Horários das Linhas</span>
            </div>
            {lines.map((line) => {
                const schedule = BUS_SCHEDULES[line.code];
                const isExpanded = expandedLine === line.code;
                const hasAnySchedule = schedule && schedule.length > 0;

                return (
                    <div key={line.code} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <button
                            className="menu-item"
                            onClick={() => toggleLine(line.code)}
                            style={{ borderBottom: 'none', background: isExpanded ? '#fafafa' : 'white' }}
                        >
                            <div style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px', textAlign: 'left' }}>
                                <div style={{ fontWeight: 'bold', color: '#003366' }}>{line.code}</div>
                                <div style={{ fontSize: '13px', color: '#666' }}>{line.name}</div>
                            </div>
                            {isExpanded ? <ChevronDown size={20} color="#666" /> : <ChevronRight size={20} color="#ccc" />}
                        </button>

                        {isExpanded && (
                            <div style={{ padding: '0 16px 16px 16px', background: '#fafafa', borderTop: '1px solid #eee' }}>
                                {hasAnySchedule ? (
                                    <>
                                        {schedule.map((departure, idx) => (
                                            <React.Fragment key={idx}>
                                                {renderScheduleSection(departure.location, departure.times)}
                                            </React.Fragment>
                                        ))}
                                    </>
                                ) : (
                                    <div style={{ fontSize: '13px', color: '#999', fontStyle: 'italic', padding: '8px 0' }}>
                                        Horários não disponíveis. Verifique no site da prefeitura.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );

    return (
        <>
            <div
                className={`menu-backdrop ${isOpen ? 'open' : ''}`}
                onClick={onClose}
            />

            <div className={`menu-drawer ${isOpen ? 'open' : ''}`}>
                <div className="menu-header">
                    <span style={{ fontWeight: 'bold', fontSize: '18px', color: '#003366' }}>Menu</span>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                        <X size={24} color="#333" />
                    </button>
                </div>

                <div className="menu-content">
                    {view === 'main' ? renderMainContent() : renderSchedulesList()}
                </div>
            </div>
        </>
    );
};

export default MenuDrawer;
