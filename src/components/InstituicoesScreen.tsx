import React, { useEffect, useState } from 'react';
import './InstituicoesScreen.css';
import AppHeader from './AppHeader';
import { Search, X, MapPin, Phone, Globe, Clock, Info } from 'lucide-react';

interface InstituicoesData {
    secretarias: any[];
    unidades_saude: any[];
    escolas: any[];
    servicos_socioassistenciais: any[];
}

interface InstituicoesScreenProps {
    onBack: () => void;
}

const CATEGORIES = [
    { id: 'all', label: 'Todas' },
    { id: 'secretarias', label: 'Secretarias' },
    { id: 'unidades_saude', label: 'Saúde' },
    { id: 'escolas', label: 'Escolas' },
    { id: 'servicos_socioassistenciais', label: 'Assistência Social' }
];

const normalize = (str: string) => {
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, "");
};

const InstituicoesScreen: React.FC<InstituicoesScreenProps> = ({ onBack }) => {
    const [data, setData] = useState<InstituicoesData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredItems, setFilteredItems] = useState<any[]>([]);
    const [selectedItem, setSelectedItem] = useState<any | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(`/instituicoes.json?t=${Date.now()}`);
                const jsonData = await response.json();
                setData(jsonData);
                setLoading(false);
            } catch (error) {
                console.error("Erro ao carregar dados:", error);
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    useEffect(() => {
        if (!data) return;

        // 1. Criar a base de dados total (ou por categoria)
        let allAvailableItems: any[] = [];

        const processItem = (item: any, category: string, type: string, idx: number) => ({
            ...item,
            _generatedId: item.id ? String(item.id) : `${category}-${idx}`,
            category,
            type: item.tipo || type,
            displayName: getDisplayName(item.nome)
        });

        // Mapeamento de categorias para chaves do JSON
        const categoryMap: Record<string, { key: keyof InstituicoesData, label: string, type: string }> = {
            secretarias: { key: 'secretarias', label: 'Secretaria', type: 'ADM' },
            unidades_saude: { key: 'unidades_saude', label: 'Saúde', type: 'Saúde' },
            escolas: { key: 'escolas', label: 'Educação', type: 'Escola' },
            servicos_socioassistenciais: { key: 'servicos_socioassistenciais', label: 'Social', type: 'Assistência' }
        };

        if (activeCategory === 'all') {
            Object.entries(categoryMap).forEach(([_, config]) => {
                const list = data[config.key];
                if (Array.isArray(list)) {
                    allAvailableItems = [...allAvailableItems, ...list.map((i, idx) => processItem(i, config.label, config.type, idx))];
                }
            });
        } else {
            const config = categoryMap[activeCategory];
            const list = data[config.key];
            if (config && Array.isArray(list)) {
                allAvailableItems = list.map((i, idx) => processItem(i, config.label, config.type, idx));
            }
        }

        // 2. Aplicar o filtro de busca sobre a lista selecionada
        let results = allAvailableItems;
        if (searchTerm.trim() !== '') {
            const term = normalize(searchTerm);
            results = allAvailableItems.filter(item =>
                normalize(item.nome || '').includes(term) ||
                normalize(item.displayName || '').includes(term) ||
                normalize(item.bairro || '').includes(term) ||
                normalize(String(item.endereco || '')).includes(term)
            );
        } else if (activeCategory === 'all') {
            // 3. Só aplicar o limite se não houver busca, para não esconder resultados válidos
            results = results.slice(0, 100);
        }

        setFilteredItems(results);
    }, [data, activeCategory, searchTerm]);

    // Helper to generate a short name or acronym
    const getDisplayName = (fullName: string) => {
        if (!fullName) return '';

        // Remove common prefixes for cleaner display
        let cleanName = fullName;

        if (cleanName.includes('SECRETARIA MUNICIPAL DE')) {
            const parts = cleanName.replace('SECRETARIA MUNICIPAL DE ', '').split(' ');
            if (parts.length > 3) {
                // Create acronym for very long names
                return 'SM ' + parts.map(p => p[0]).join('').toUpperCase();
            }
            return cleanName.replace('SECRETARIA MUNICIPAL DE ', 'SM ');
        }

        if (cleanName.startsWith('ESCOLA MUNICIPAL')) {
            return cleanName.replace('ESCOLA MUNICIPAL', 'E.M.');
        }

        // Check for hyphen separator which often separates Acronym from Full Name
        // e.g., "FUNDEC – FUNDAÇÃO..." -> "FUNDEC"
        const dashIndex = cleanName.indexOf('–');
        if (dashIndex > 0 && dashIndex < 15) {
            return cleanName.substring(0, dashIndex).trim();
        }

        const hyphenIndex = cleanName.indexOf(' - ');
        if (hyphenIndex > 0 && hyphenIndex < 15) {
            return cleanName.substring(0, hyphenIndex).trim();
        }

        return cleanName;
    };

    const handleCardClick = (item: any) => {
        setSelectedItem(item);
    };

    const isCoordinate = (str: string) => /^-?\d+\.\d+.*-?\d+\.\d+/.test(str);



    return (
        <div className="instituicoes-container">
            <AppHeader
                title="Ouvidoria Orienta"
                subtitle="Informações Institucionais"
                showBackButton={true}
                onBackClick={onBack}
                className="instituicoes-header"
            />

            <div className="instituicoes-content">
                <div className="search-bar">
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por nome, sigla ou bairro..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="category-filter">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            className={`filter-chip ${activeCategory === cat.id ? 'active' : ''}`}
                            onClick={() => setActiveCategory(cat.id)}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>

                <div className="instituicoes-list" key={`${activeCategory}-${searchTerm}`}>
                    {loading ? (
                        <div className="loading-spinner">Carregando informações...</div>
                    ) : (
                        <>
                            <div style={{ marginBottom: '10px', fontSize: '12px', color: '#666' }}>
                                {filteredItems.length} resultados encontrados
                            </div>

                            {filteredItems.length > 0 ? (
                                filteredItems.map((item, index) => (
                                    <div
                                        key={item._generatedId || index}
                                        className="instituicao-card"
                                        onClick={() => handleCardClick(item)}
                                    >
                                        <span className="instituicao-badge">{item.type}</span>
                                        <div className="instituicao-name">{item.displayName}</div>
                                        <div className="instituicao-info" style={{ fontSize: '11px', color: '#666' }}>
                                            {item.nome !== item.displayName ? item.nome : ''}
                                        </div>
                                        {item.endereco && !isCoordinate(item.endereco) && (
                                            <div className="instituicao-info">
                                                📍 {item.endereco}
                                            </div>
                                        )}
                                        {item.bairro && (
                                            <div className="instituicao-info">
                                                🏘️ {item.bairro}
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="empty-state">Nenhuma instituição encontrada.</div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Modal de Detalhes */}
            {selectedItem && (
                <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">{selectedItem.displayName}</h2>
                            <button className="modal-close-btn" onClick={() => setSelectedItem(null)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">

                            {/* Nome Completo */}
                            <div className="modal-info-row">
                                <Info className="modal-info-icon" size={20} />
                                <div className="modal-info-content">
                                    <span className="modal-label">Nome Completo</span>
                                    <div className="modal-value">{selectedItem.nome}</div>
                                </div>
                            </div>

                            {/* Telefone */}
                            <div className="modal-info-row">
                                <Phone className="modal-info-icon" size={20} />
                                <div className="modal-info-content">
                                    <span className="modal-label">Telefone</span>
                                    <div className={`modal-value ${!selectedItem.telefone ? 'empty-field' : ''}`}>
                                        {selectedItem.telefone ? (
                                            <a href={`tel:${selectedItem.telefone.replace(/[^0-9]/g, '')}`}>{selectedItem.telefone}</a>
                                        ) : 'Não informado'}
                                    </div>
                                </div>
                            </div>

                            {/* Endereço */}
                            <div className="modal-info-row">
                                <MapPin className="modal-info-icon" size={20} />
                                <div className="modal-info-content">
                                    <span className="modal-label">Endereço</span>
                                    <div className={`modal-value ${!selectedItem.endereco ? 'empty-field' : ''}`}>
                                        {selectedItem.endereco && !isCoordinate(selectedItem.endereco) ? selectedItem.endereco : 'Não informado'}
                                        {selectedItem.bairro && <br />}
                                        {selectedItem.bairro && <span style={{ fontSize: '14px', color: '#666' }}>{selectedItem.bairro}</span>}
                                        {selectedItem.cep && <br />}
                                        {selectedItem.cep && <span style={{ fontSize: '12px', color: '#999' }}>CEP: {selectedItem.cep}</span>}
                                    </div>
                                </div>
                            </div>

                            {/* Site (Placeholder) */}
                            <div className="modal-info-row">
                                <Globe className="modal-info-icon" size={20} />
                                <div className="modal-info-content">
                                    <span className="modal-label">Site / Redes Sociais</span>
                                    <div className={`modal-value ${!selectedItem.site ? 'empty-field' : ''}`}>
                                        {selectedItem.site ? (
                                            <a href={selectedItem.site} target="_blank" rel="noopener noreferrer">Acessar site</a>
                                        ) : 'Não informado'}
                                    </div>
                                </div>
                            </div>

                            {/* Horário (Placeholder) */}
                            <div className="modal-info-row">
                                <Clock className="modal-info-icon" size={20} />
                                <div className="modal-info-content">
                                    <span className="modal-label">Horário de Atendimento</span>
                                    <div className={`modal-value ${!selectedItem.horario ? 'empty-field' : ''}`}>
                                        {selectedItem.publico_atendido || selectedItem.horario || 'Não informado'}
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InstituicoesScreen;
