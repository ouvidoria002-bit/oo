import React from 'react';
import './HomeScreen.css';
import AppHeader from './AppHeader';
import busImage from '../../public/tarifazerobus.png';
import cityLandscape from '../../public/city-landscape.png';
import instituicoesBackground from '../../public/prefeitura-de-caxias-rj.jpg';
import buildingIcon from "../../public/eusoulindo.png"
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
                            <img
                                src={buildingIcon}
                                alt="Ícone de instituição"
                                className="building-icon-image"
                            />
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

                {/* Colab Download Links */}
                <div className="colab-section">
                    <p className="colab-text">Baixe também o app Colab para contribuir com a gestão da cidade:</p>
                    <div className="colab-buttons">
                        <a
                            href="https://play.google.com/store/apps/details?id=thirtyideas.colab_android"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="colab-button google-play"
                        >
                            <span className="colab-icon">📱</span>
                            <div className="colab-text-content">
                                <span className="colab-label">Disponível no</span>
                                <span className="colab-store">Google Play</span>
                            </div>
                        </a>
                        <a
                            href="https://apps.apple.com/br/app/colab/id609666061"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="colab-button app-store"
                        >
                            <span className="colab-icon">🍎</span>
                            <div className="colab-text-content">
                                <span className="colab-label">Disponível na</span>
                                <span className="colab-store">App Store</span>
                            </div>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HomeScreen;
