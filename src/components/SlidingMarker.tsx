import { useEffect, useState, useRef } from 'react';
import { Marker } from 'react-leaflet';
import L from 'leaflet';

interface SlidingMarkerProps {
    position: [number, number];
    duration: number;
    icon: L.Icon | L.DivIcon;
    children?: React.ReactNode;
    path?: [number, number][]; // Optional path to follow
    onPositionChange?: (pos: [number, number]) => void;
    markerRef?: React.MutableRefObject<L.Marker | null>; // Exposed for RAF live position
    zIndexOffset?: number;
}

export const SlidingMarker: React.FC<SlidingMarkerProps> = ({ position, duration, icon, children, path, onPositionChange, markerRef, zIndexOffset }) => {
    // We keep an internal state for the "animated" position
    const [currentPos, setCurrentPos] = useState(position);

    // Refs to track smooth transition
    const startPosRef = useRef(position);
    const endPosRef = useRef(position);
    const pathRef = useRef<[number, number][] | null>(null);
    // Pre-calculated distances cache — avoids recalculating per animation frame
    const pathDistancesRef = useRef<{ segs: number[], total: number } | null>(null);
    const startTimeRef = useRef<number>(0);
    const frameRef = useRef<number>(0);

    useEffect(() => {
        // If the target position is the same as the last know target, do nothing
        if (position[0] === endPosRef.current[0] && position[1] === endPosRef.current[1]) {
            return;
        }

        // Teleport Check: If distance is too large (> ~500m), skip animation to prevent "ghosting"
        const distSq = (currentPos[0] - position[0]) ** 2 + (currentPos[1] - position[1]) ** 2;
        if (distSq > 0.000025) { // Approx 0.005 degrees squared
            setCurrentPos(position);
            startPosRef.current = position;
            endPosRef.current = position;
            pathRef.current = null;
            pathDistancesRef.current = null;
            if (onPositionChange) onPositionChange(position);
            return;
        }

        // Setup animation
        startPosRef.current = currentPos; // Start from where we are
        endPosRef.current = position;
        startTimeRef.current = performance.now();

        // If path provided, cache it and PRE-CALCULATE distances once
        if (path && path.length > 0) {
            pathRef.current = path;
            // Pre-calculate segment distances — O(n) once, not at every frame
            const segs: number[] = [];
            let total = 0;
            for (let i = 0; i < path.length - 1; i++) {
                const d = dist(path[i], path[i + 1]);
                segs.push(d);
                total += d;
            }
            pathDistancesRef.current = { segs, total };
        } else {
            pathRef.current = null;
            pathDistancesRef.current = null;
        }

        const animate = (now: number) => {
            const elapsed = now - startTimeRef.current;
            const progress = Math.min(elapsed / duration, 1.0);
            let newPos: [number, number];

            if (pathRef.current && pathRef.current.length >= 2 && pathDistancesRef.current) {
                // Path Animation — uses pre-cached distances
                newPos = interpolateOnPath(pathRef.current, pathDistancesRef.current, progress);
            } else {
                // Linear Interpolation (Lerp)
                const lat = startPosRef.current[0] + (endPosRef.current[0] - startPosRef.current[0]) * progress;
                const lng = startPosRef.current[1] + (endPosRef.current[1] - startPosRef.current[1]) * progress;
                newPos = [lat, lng];
            }

            setCurrentPos(newPos);

            if (onPositionChange) {
                onPositionChange(newPos);
            }

            if (progress < 1.0) {
                frameRef.current = requestAnimationFrame(animate);
            }
        };

        cancelAnimationFrame(frameRef.current);
        frameRef.current = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(frameRef.current);
    }, [position, duration, path /* Removed onPositionChange from deps to avoid re-trigger */]);
    // Note: dependency on 'path' is important if the path changes with the position update

    return (
        <Marker
            position={currentPos}
            icon={icon}
            zIndexOffset={zIndexOffset ?? 0}
            ref={(m) => { if (markerRef) markerRef.current = m; }}
        >
            {children}
        </Marker>
    );
};

// Helper to interpolate along a multi-segment path
// distances param is pre-calculated to avoid CPU burn on each frame
function interpolateOnPath(
    path: [number, number][],
    distances: { segs: number[], total: number },
    progress: number
): [number, number] {
    if (progress <= 0) return path[0];
    if (progress >= 1) return path[path.length - 1];

    const { segs, total } = distances;
    if (total === 0) return path[path.length - 1];

    const targetDist = total * progress;
    let currentDist = 0;

    for (let i = 0; i < segs.length; i++) {
        const d = segs[i];
        if (currentDist + d >= targetDist) {
            // In this segment
            const segProgress = (targetDist - currentDist) / d;
            const p1 = path[i];
            const p2 = path[i + 1];
            return [
                p1[0] + (p2[0] - p1[0]) * segProgress,
                p1[1] + (p2[1] - p1[1]) * segProgress
            ];
        }
        currentDist += d;
    }

    return path[path.length - 1];
}

function dist(p1: [number, number], p2: [number, number]): number {
    const dx = p1[0] - p2[0];
    const dy = p1[1] - p2[1];
    return Math.sqrt(dx * dx + dy * dy);
}

// Named export preferred for consistency
// export default SlidingMarker;

