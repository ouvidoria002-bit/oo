import React, { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

export interface TutorialStep {
    targetId: string;
    title: string;
    description: string;
    position: 'top' | 'bottom' | 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    disableNext?: boolean; // If true, user must perform action to advance (no 'Next' button)
}

interface TutorialOverlayProps {
    isActive: boolean;
    steps: TutorialStep[];
    currentStepIndex: number;
    onClose: () => void;
    onNext: () => void;
    onPrev: () => void;
}

const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
    isActive,
    steps,
    currentStepIndex,
    onClose,
    onNext,
    onPrev
}) => {
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

    const updatePosition = useCallback(() => {
        if (!isActive) return;
        const step = steps[currentStepIndex];
        if (!step) return;

        const element = document.getElementById(step.targetId);
        if (element) {
            const rect = element.getBoundingClientRect();
            setTargetRect(rect);
        } else {
            // Fallback: Center screen if target lost or covering whole map
            setTargetRect({
                top: window.innerHeight / 2 - 150,
                left: window.innerWidth / 2 - 150,
                width: 300,
                height: 300,
                bottom: window.innerHeight / 2 + 150,
                right: window.innerWidth / 2 + 150,
                x: window.innerWidth / 2 - 150,
                y: window.innerHeight / 2 - 150,
                toJSON: () => { }
            });
        }
    }, [isActive, steps, currentStepIndex]);

    useEffect(() => {
        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true); // Capture scroll
        const t = setInterval(updatePosition, 500); // Polling for layout changes

        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
            clearInterval(t);
        };
    }, [updatePosition]);

    if (!isActive || !targetRect) return null;

    const step = steps[currentStepIndex];
    const isLast = currentStepIndex === steps.length - 1;

    // Calculate Tooltip Position
    const TOOLTIP_WIDTH = 300;
    const PADDING = 16;
    const SCREEN_PADDING = 10;

    let tooltipStyle: React.CSSProperties = {
        position: 'fixed',
        zIndex: 10002,
        width: `${TOOLTIP_WIDTH}px`,
        maxWidth: '90vw',
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
        animation: 'fadeIn 0.3s ease'
    };

    // Helper to clamp horizontal position
    const getClampedLeft = (idealLeft: number) => {
        const halfWidth = TOOLTIP_WIDTH / 2;
        // Ensure left edge >= SCREEN_PADDING
        // Ensure right edge <= innerWidth - SCREEN_PADDING
        // But idealLeft is the CENTER of the tooltip

        let center = idealLeft;
        const minCenter = halfWidth + SCREEN_PADDING;
        const maxCenter = window.innerWidth - halfWidth - SCREEN_PADDING;

        if (center < minCenter) center = minCenter;
        if (center > maxCenter) center = maxCenter;

        return center;
    };

    // Helper for Corners - Absolute positioning without transform center
    const getCornerStyle = (pos: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right') => {
        const style: React.CSSProperties = {};
        if (pos.includes('top')) {
            style.top = targetRect.top + PADDING;
            // Override: if target is full screen (map), just put it in corner
            if (targetRect.height > window.innerHeight * 0.8) {
                style.top = PADDING + 60; // Below header
            }
        }
        if (pos.includes('bottom')) {
            style.bottom = PADDING;
        }

        if (pos.includes('left')) {
            style.left = PADDING;
        }
        if (pos.includes('right')) {
            // Calculate left based on right edge
            style.left = window.innerWidth - TOOLTIP_WIDTH - PADDING;
        }
        return style;
    }

    // Standard positions associated with a target element
    if (step.position === 'center') {
        tooltipStyle.top = '50%';
        tooltipStyle.left = '50%';
        tooltipStyle.transform = 'translate(-50%, -50%)';
    }
    else if (step.position === 'bottom') {
        tooltipStyle.top = targetRect.bottom + PADDING;
        tooltipStyle.left = getClampedLeft(targetRect.left + (targetRect.width / 2));
        tooltipStyle.transform = 'translateX(-50%)';
    }
    else if (step.position === 'top') {
        tooltipStyle.bottom = (window.innerHeight - targetRect.top) + PADDING;
        tooltipStyle.left = getClampedLeft(targetRect.left + (targetRect.width / 2));
        tooltipStyle.transform = 'translateX(-50%)';
    }
    else {
        // Corner positions (mostly for full screen or "just put it there" Logic)
        const cornerStyles = getCornerStyle(step.position);
        Object.assign(tooltipStyle, cornerStyles);
    }

    // Overlays (The "Hole")
    const overlayColor = 'rgba(0,0,0,0.6)';

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 10000, pointerEvents: 'none' }}>
            {/* Top Block */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: targetRect.top, backgroundColor: overlayColor, pointerEvents: 'auto' }}></div>
            {/* Bottom Block */}
            <div style={{ position: 'absolute', top: targetRect.bottom, left: 0, width: '100%', height: `calc(100vh - ${targetRect.bottom}px)`, backgroundColor: overlayColor, pointerEvents: 'auto' }}></div>
            {/* Left Block */}
            <div style={{ position: 'absolute', top: targetRect.top, left: 0, width: targetRect.left, height: targetRect.height, backgroundColor: overlayColor, pointerEvents: 'auto' }}></div>
            {/* Right Block */}
            <div style={{ position: 'absolute', top: targetRect.top, left: targetRect.right, width: `calc(100vw - ${targetRect.right}px)`, height: targetRect.height, backgroundColor: overlayColor, pointerEvents: 'auto' }}></div>

            {/* Highlight Border */}
            <div style={{
                position: 'absolute',
                top: targetRect.top - 4,
                left: targetRect.left - 4,
                width: targetRect.width + 8,
                height: targetRect.height + 8,
                borderRadius: '8px',
                border: '4px solid #fbbf24',
                boxShadow: '0 0 15px rgba(251, 191, 36, 0.5)',
                pointerEvents: 'none',
                transition: 'all 0.2s ease'
            }}></div>

            {/* Tooltip Card - Needs pointerEvents: auto */}
            <div style={{ ...tooltipStyle, pointerEvents: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#3b82f6', textTransform: 'uppercase' }}>
                        Passo {currentStepIndex + 1} de {steps.length}
                    </span>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}>
                        <X size={16} />
                    </button>
                </div>

                <h3 style={{ margin: '0 0 8px 0', color: '#1f2937', fontSize: '18px' }}>{step.title}</h3>
                <p style={{ margin: 0, color: '#4b5563', fontSize: '14px', lineHeight: '1.5' }}>
                    {step.description}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                    {/* Quit / Back */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {currentStepIndex > 0 ? (
                            <button onClick={onPrev} style={{
                                background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '6px',
                                padding: '8px 12px', fontSize: '14px', cursor: 'pointer'
                            }}>
                                Voltar
                            </button>
                        ) : (
                            <button onClick={onClose} style={{
                                background: 'transparent', color: '#6b7280', border: 'none', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline'
                            }}>
                                Pular
                            </button>
                        )}
                    </div>

                    {!step.disableNext && (
                        <button onClick={onNext} style={{
                            background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px',
                            padding: '8px 16px', fontSize: '14px', fontWeight: '600', cursor: 'pointer'
                        }}>
                            {isLast ? 'Concluir' : 'Próximo'}
                        </button>
                    )}
                </div>
            </div>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default TutorialOverlay;
