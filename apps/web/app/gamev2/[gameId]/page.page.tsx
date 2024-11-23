'use client';

import {
    useEffect,
    useRef,
    useState,
} from 'react';

import { useParams } from 'next/navigation';

import { clientSystems } from './systems';
import { renderSystem } from './systems/renderSystem';
import { WorldManager } from './world/WorldManager';

// Constants
const TILE_SIZE = 32;
const MAP_SIZE = 50;

const containerStyle: React.CSSProperties = {
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    backgroundColor: '#000',
    display: 'flex'
};

const gameAreaStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
};

const canvasStyle: React.CSSProperties = {
    imageRendering: 'pixelated'
};

export default function GamePage() {
    const params = useParams();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const worldRef = useRef<WorldManager | null>(null);
    const lastTimeRef = useRef<number>(0);
    const [isLoaded, setIsLoaded] = useState(false);

    // Initialize game world
    useEffect(() => {
        if (!params.gameId) return;

        worldRef.current = new WorldManager(MAP_SIZE, MAP_SIZE);
        setIsLoaded(true);

        return () => {
            worldRef.current = null;
        };
    }, [params.gameId]);

    // Handle keyboard input
    useEffect(() => {
        if (!isLoaded) return;

        const keys = new Set<string>();

        const handleKeyDown = (e: KeyboardEvent) => {
            keys.add(e.key.toLowerCase());
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            keys.delete(e.key.toLowerCase());
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        // Game loop
        let animationFrameId: number;

        const gameLoop = (timestamp: number) => {
            if (!worldRef.current || !canvasRef.current) return;

            const delta = timestamp - lastTimeRef.current;
            lastTimeRef.current = timestamp;

            // Process input
            const dx = Number(keys.has('d')) - Number(keys.has('a'));
            const dy = Number(keys.has('s')) - Number(keys.has('w'));

            // Run systems
            clientSystems.moveSystem(worldRef.current, {
                delta,
                currentTime: timestamp,
                movement: { dx, dy }
            });

            clientSystems.interactionSystem(worldRef.current);
            clientSystems.speechSystem(worldRef.current, timestamp);
            clientSystems.pathfindingSystem(worldRef.current);

            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
                renderSystem(worldRef.current, {
                    ctx,
                    width: canvasRef.current.width,
                    height: canvasRef.current.height,
                    tileSize: TILE_SIZE,
                    mapSize: MAP_SIZE
                });
            }

            animationFrameId = requestAnimationFrame(gameLoop);
        };

        animationFrameId = requestAnimationFrame(gameLoop);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            cancelAnimationFrame(animationFrameId);
        };
    }, [isLoaded]);

    // Handle resize
    useEffect(() => {
        const handleResize = () => {
            if (!canvasRef.current) return;

            const gameSection = canvasRef.current.parentElement;
            if (!gameSection) return;

            // Get the available space
            const availableWidth = gameSection.clientWidth;
            const availableHeight = gameSection.clientHeight;

            // Use the smaller dimension to maintain square aspect ratio
            const size = Math.min(availableWidth, availableHeight) * 0.9; // 90% of the smaller dimension

            // Set the actual canvas size to match the map size in tiles
            canvasRef.current.width = MAP_SIZE * TILE_SIZE;
            canvasRef.current.height = MAP_SIZE * TILE_SIZE;

            // Scale the canvas display size while maintaining aspect ratio
            canvasRef.current.style.width = `${size}px`;
            canvasRef.current.style.height = `${size}px`;
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // Initial size

        // Also do this on an interval
        const interval = setInterval(handleResize, 1000);

        return () => {
            window.removeEventListener('resize', handleResize);
            clearInterval(interval);
        };
    }, []);

    if (!isLoaded) {
        return <div style={containerStyle}>Loading...</div>;
    }

    return (
        <div style={containerStyle}>
            <div style={gameAreaStyle}>
                <canvas
                    ref={canvasRef}
                    style={canvasStyle}
                />
            </div>
        </div>
    );
} 