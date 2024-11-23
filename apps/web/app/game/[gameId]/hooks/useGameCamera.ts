import {
  useEffect,
  useState,
} from 'react';

type Position = { x: number; y: number };

interface GameCameraProps {
    player: Position;
    mapSize: number;
    tileSize: number;
}

export function useGameCamera({ player, mapSize, tileSize }: GameCameraProps) {
    const [zoom, setZoom] = useState(1);

    useEffect(() => {
        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            setZoom(prev => {
                const newZoom = prev * (e.deltaY > 0 ? 0.9 : 1.1);
                return Math.max(0.5, Math.min(2, newZoom));
            });
        };

        window.addEventListener('wheel', handleWheel, { passive: false });
        return () => window.removeEventListener('wheel', handleWheel);
    }, []);

    // Center the camera on the player
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    return { zoom, centerX, centerY };
} 