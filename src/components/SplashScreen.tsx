import React, { useState, useEffect } from 'react';
import './SplashScreen.css';
import logo from '../../public/dc-logo-cortada.png';

interface SplashScreenProps {
    isLoading: boolean;
    error?: string | null;
    onAnimationComplete?: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ isLoading, error, onAnimationComplete }) => {
    const [isAnimatingToHeader, setIsAnimatingToHeader] = useState(false);

    useEffect(() => {
        if (!isLoading && !error) {
            // Start animation to header immediately when loading finishes
            setIsAnimatingToHeader(true);

            // After animation duration, trigger completion
            const timer = setTimeout(() => {
                if (onAnimationComplete) {
                    onAnimationComplete();
                }
            }, 1000); // 1s matches the CSS transition time

            return () => clearTimeout(timer);
        }
    }, [isLoading, error, onAnimationComplete]);

    return (
        <div className={`splash-screen ${isAnimatingToHeader ? 'animate-to-header' : ''}`}>
            <div className="splash-content">
                {/* Logo Container */}
                <div className={`splash-logo-container ${isAnimatingToHeader ? 'move-to-header' : ''}`}>
                    <img src={logo} alt="Ouvidoria Orienta - Duque de Caxias" className="splash-logo" />

                    {/* Shine Effect - only visible when NOT moving */}
                    {!isAnimatingToHeader && (
                        <div
                            className="splash-logo-shine"
                            style={{
                                WebkitMaskImage: `url(${logo})`,
                                maskImage: `url(${logo})`
                            }}
                        />
                    )}
                </div>

                {/* Loading / Error Content - Fades out when animating */}
                <div className={`splash-info ${isAnimatingToHeader ? 'fade-out' : ''}`}>
                    {error ? (
                        <div className="error-message">
                            <p>{error}</p>
                            <button onClick={() => window.location.reload()}>Tentar Novamente</button>
                        </div>
                    ) : (
                        <>
                            <div className="spinner"></div>
                            <p className="loading-text">Carregando dados...</p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SplashScreen;
