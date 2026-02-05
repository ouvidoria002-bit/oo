import React from 'react';
import './HomeScreen.css';
import logo2 from '../../public/dc-logo-cortada.png';

interface HomeScreenProps {
    onSelectOption: (option: 'instituicoes' | 'tarifazero') => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ onSelectOption }) => {
    return (
        <div className="home-screen">
            {/* Fixed Header */}
            <header className="home-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                        background: 'transparent'
                    }}>
                        <img
                            src={logo2}
                            alt="Logo da Prefeitura de Duque de Caxias"
                            style={{ width: '120%', height: '120%', objectFit: 'cover' }}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 700, fontSize: '16px', lineHeight: '1.2' }}>Ouvidoria Orienta</span>
                        <span style={{ fontWeight: 400, fontSize: '11px', opacity: 0.8 }}>Duque de Caxias</span>
                    </div>
                </div>
            </header>

            <div className="home-content">
                <h1 className="home-title">Bem-vindo ao Ouvidoria Orienta</h1>
                <p className="home-subtitle">Escolha uma opção para continuar</p>

                <div className="options-container">
                    {/* Instituições Municipais */}
                    <button
                        className="option-button"
                        onClick={() => onSelectOption('instituicoes')}
                    >
                        <div className="option-text">
                            <h2>Instituições<br />Municipais</h2>
                            <p>Conheça os órgãos públicos</p>
                        </div>
                        <div className="option-image instituicoes-bg">
                            <div className="image-overlay"></div>
                        </div>
                    </button>

                    {/* Tarifa Zero */}
                    <button
                        className="option-button"
                        onClick={() => onSelectOption('tarifazero')}
                    >
                        <div className="option-text">
                            <h2>Tarifa<br />Zero</h2>
                            <p>Acompanhe os ônibus em tempo real</p>
                        </div>
                        <div className="option-image tarifazero-bg">
                            <div className="image-overlay"></div>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HomeScreen;
