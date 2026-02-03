import React from 'react';
import './SplashScreen.css';

interface SplashScreenProps {
    isLoading: boolean;
    error?: string | null;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ isLoading, error }) => {
    if (!isLoading && !error) return null;

    return (
        <div className={`splash-screen ${!isLoading ? 'fade-out' : ''}`}>
            <div className="splash-content">
                {/* Placeholder for Logo */}
                <div className="logo-placeholder">
                    <h1 style={{ color: '#0056b3', fontSize: '2rem' }}>Tarifa Zero</h1>
                    <p style={{ color: '#666' }}>Prefeitura de Duque de Caxias</p>
                </div>

                {error ? (
                    <div className="error-message">
                        <p>{error}</p>
                        <button onClick={() => window.location.reload()}>Tentar Novamente</button>
                    </div>
                ) : (
                    <div className="spinner"></div>
                )}
            </div>
        </div>
    );
};

export default SplashScreen;
