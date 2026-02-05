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
    const [shouldHide, setShouldHide] = useState(false);

    useEffect(() => {
        if (!isLoading && !error) {
            // Start animation to header
            setIsAnimatingToHeader(true);

            // After animation completes, hide the splash screen
            const timer = setTimeout(() => {
                setShouldHide(true);
                if (onAnimationComplete) {
                    onAnimationComplete();
                }
            }, 1000); // Match the animation duration

            return () => clearTimeout(timer);
        }
    }, [isLoading, error, onAnimationComplete]);

    if (shouldHide) return null;

    return (
        <div className={`splash-screen ${isAnimatingToHeader ? 'animate-to-header' : ''}`}>
            <div className="splash-content">
                {/* Logo Container with Shine Effect */}
                <div className={`splash-logo-container ${isAnimatingToHeader ? 'move-to-header' : ''}`}>
                    {/* The Base Visible Logo */}
                    <img src={logo} alt="Ouvidoria Orienta - Duque de Caxias" className="splash-logo" />

                    {/* The Shine Overlay (Masked to the logo shape) */}
                    {!isAnimatingToHeader && (
                        <div
                            className="splash-logo-shine"
                            style={{
                                WebkitMaskImage: `url(${logo})`,
                                maskImage: `url(${logo})`
                            }}
                        ></div>
                    )}
                </div>

                {!isAnimatingToHeader && (
                    <>
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
                    </>
                )}
            </div>
        </div>
    );
};

export default SplashScreen;
