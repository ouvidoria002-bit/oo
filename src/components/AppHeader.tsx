import React from 'react';
import logo2 from '../../public/dc-logo-cortada.png';
import { Menu } from 'lucide-react';
import './AppHeader.css';

interface AppHeaderProps {
    title: string;
    subtitle: string;
    onMenuClick?: () => void;
    onBackClick?: () => void;
    showBackButton?: boolean;
    className?: string;
}

const AppHeader: React.FC<AppHeaderProps> = ({
    title,
    subtitle,
    onMenuClick,
    onBackClick,
    showBackButton = false,
    className = ''
}) => {
    return (
        <header className={`app-header ${className}`}>
            <div className="app-header-content">
                <div className="app-header-logo-wrapper">
                    <div className="app-header-logo-container">
                        <img
                            src={logo2}
                            alt="Logo da Prefeitura de Duque de Caxias"
                            className="app-header-logo-img"
                        />
                    </div>
                    <div className="app-header-text">
                        <span className="app-header-title">{title}</span>
                        <span className="app-header-subtitle">{subtitle}</span>
                    </div>
                </div>

                {showBackButton ? (
                    <button
                        className="app-header-button app-header-back-button"
                        onClick={onBackClick}
                    >
                        ← Voltar
                    </button>
                ) : (
                    onMenuClick && (
                        <button
                            className="app-header-button app-header-menu-button"
                            onClick={onMenuClick}
                        >
                            <Menu size={28} />
                        </button>
                    )
                )}
            </div>
        </header>
    );
};

export default AppHeader;
