import React from 'react';
import './HomeScreen.css';
import AppHeader from './AppHeader';
import busImage from '../../public/tarifazerobus.png';
import cityLandscape from '../../public/city-landscape.png';
import instituicoesBackground from '../../public/prefeitura-de-caxias-rj.jpg';

interface HomeScreenProps {
    onSelectOption: (option: 'instituicoes' | 'tarifazero') => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ onSelectOption }) => {
    return (
        <div className="home-screen">
            <AppHeader
                title="Ouvidoria Orienta"
                subtitle="Duque de Caxias"
                className="home-header"
            />

            <div className="home-content">
                <h1 className="home-title">Bem-vindo ao Ouvidoria Orienta</h1>
                <p className="home-subtitle">Escolha uma opção para continuar</p>

                <div className="options-container">
                    {/* Informações Institucionais - Com efeito de prédio */}
                    <button
                        className="option-button option-button-instituicoes"
                        onClick={() => onSelectOption('instituicoes')}
                    >
                        <div className="option-text">
                            <h2>Informações<br />Institucionais</h2>
                            <p>Conheça os órgãos públicos</p>
                        </div>
                        <div className="option-image instituicoes-bg-landscape">
                            <img
                                src={instituicoesBackground}
                                alt="Prédio governamental"
                                className="instituicoes-landscape-image"
                            />
                            <div className="image-overlay"></div>
                            {/* <img
                                src={buildingIcon}
                                alt="Ícone de instituição"
                                className="building-icon-image"
                            /> */}
                        </div>
                    </button>

                    {/* Tarifa Zero - Com efeito de ônibus saindo */}
                    <button
                        className="option-button option-button-bus"
                        onClick={() => onSelectOption('tarifazero')}
                    >
                        <div className="option-text">
                            <h2>Tarifa<br />Zero</h2>
                            <p>Acompanhe os ônibus em tempo real</p>
                        </div>
                        <div className="option-image tarifazero-bg-landscape">
                            <img
                                src={cityLandscape}
                                alt="Paisagem urbana"
                                className="landscape-image"
                            />
                            <div className="image-overlay"></div>
                            <img
                                src={busImage}
                                alt="Ônibus Tarifa Zero"
                                className="bus-image"
                            />
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HomeScreen;
