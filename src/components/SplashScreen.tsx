import React from 'react';
import './SplashScreen.css';
import logo from '../../public/dc-logo.png';

interface SplashScreenProps {
    isLoading: boolean;
    error?: string | null;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ isLoading, error }) => {
    if (!isLoading && !error) return null;

    return (
        <div className={`splash-screen ${!isLoading ? 'fade-out' : ''}`}>
            <div className="splash-content">
                {/* Logo Container with Shine Effect */}
                <div className="splash-logo-container">
                    {/* The Base Visible Logo */}
                    <img src={logo} alt="Tarifa Zero - Duque de Caxias" className="splash-logo" />

                    {/* The Shine Overlay (Masked to the logo shape) */}
                    <div
                        className="splash-logo-shine"
                        style={{
                            WebkitMaskImage: `url(${logo})`,
                            maskImage: `url(${logo})`
                        }}
                    ></div>
                </div>

                {error ? (
                    <div className="error-message">
                        <p>{error}</p>
                        <button onClick={() => window.location.reload()}>Tentar Novamente</button>
                    </div>
                ) : (
                    <>
                        <div className="spinner"></div>
                        <p className="loading-text">Carregando mapa e rotas...</p>
                    </>
                )}
            </div>
        </div>
    );
};

export default SplashScreen;
