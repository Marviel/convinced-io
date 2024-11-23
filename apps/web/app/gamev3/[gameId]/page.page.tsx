'use client';

import {
    useEffect,
    useRef,
    useState,
} from 'react';

import { useParams } from 'next/navigation';

import { renderSystem } from './renderSystem';

const TILE_SIZE = 32;
const MAP_SIZE = 50;

export default function GamePage() {
    const params = useParams();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [gameState, setGameState] = useState<any>(null);
    const lastStateTimestampRef = useRef<number>(0);
    const needsRenderRef = useRef<boolean>(false);
    const animationFrameRef = useRef<number>();

    // Initialize WebSocket connection
    useEffect(() => {
        if (!params.gameId) return;

        const ws = new WebSocket(`ws://localhost:3001?gameId=${params.gameId}`);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('Connected to game server');
            setIsConnected(true);
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'STATE_UPDATE') {
                // Only update state if this message is newer than our last state
                if (data.state.timestamp > lastStateTimestampRef.current) {
                    lastStateTimestampRef.current = data.state.timestamp;
                    setGameState(data.state);
                    needsRenderRef.current = true; // Mark that we need a render
                }
            }
        };

        ws.onclose = () => {
            console.log('Disconnected from game server');
            setIsConnected(false);
        };

        return () => {
            ws.close();
            wsRef.current = null;
        };
    }, [params.gameId]);

    // Handle keyboard input
    useEffect(() => {
        if (!wsRef.current) return;

        const keys = new Set<string>();

        const handleKeyDown = (e: KeyboardEvent) => {
            keys.add(e.key.toLowerCase());

            // Calculate movement
            const dx = Number(keys.has('d')) - Number(keys.has('a'));
            const dy = Number(keys.has('s')) - Number(keys.has('w'));

            // Send movement action if there's movement
            if (dx !== 0 || dy !== 0) {
                const action = {
                    type: 'ACTION',
                    action: {
                        type: 'MOVE',
                        payload: { dx, dy },
                        id: crypto.randomUUID(),
                        playerId: 'player', // This should match the server's player ID
                        timestamp: performance.now()
                    }
                };
                wsRef.current?.send(JSON.stringify(action));
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            keys.delete(e.key.toLowerCase());

            // Send stop movement if no movement keys are pressed
            const dx = Number(keys.has('d')) - Number(keys.has('a'));
            const dy = Number(keys.has('s')) - Number(keys.has('w'));

            const action = {
                type: 'ACTION',
                action: {
                    type: 'MOVE',
                    payload: { dx, dy },
                    id: crypto.randomUUID(),
                    playerId: 'player',
                    timestamp: performance.now()
                }
            };
            wsRef.current?.send(JSON.stringify(action));
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    // Handle canvas sizing
    useEffect(() => {
        const handleResize = () => {
            if (!canvasRef.current) return;

            const gameSection = canvasRef.current.parentElement;
            if (!gameSection) return;

            // Get the available space
            const availableWidth = gameSection.clientWidth;
            const availableHeight = gameSection.clientHeight;

            // Use the smaller dimension to maintain square aspect ratio
            const size = Math.min(availableWidth, availableHeight) * 0.9;

            // Set the actual canvas size to match the map size in tiles
            canvasRef.current.width = MAP_SIZE * TILE_SIZE;
            canvasRef.current.height = MAP_SIZE * TILE_SIZE;

            // Scale the canvas display size while maintaining aspect ratio
            canvasRef.current.style.width = `${size}px`;
            canvasRef.current.style.height = `${size}px`;
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Handle rendering
    useEffect(() => {
        if (!canvasRef.current || !gameState) return;

        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        const render = () => {
            try {
                // Only render if we have new state
                if (needsRenderRef.current) {
                    renderSystem(
                        ctx,
                        gameState,
                        canvasRef.current!.width,
                        canvasRef.current!.height,
                        TILE_SIZE,
                        MAP_SIZE
                    );
                    needsRenderRef.current = false; // Reset the flag
                }
            } catch (e) {
                console.error(e);
            }
            animationFrameRef.current = requestAnimationFrame(render);
        };

        animationFrameRef.current = requestAnimationFrame(render);

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [gameState]);

    if (!isConnected) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900">
                <div className="text-white text-xl">Connecting to game...</div>
            </div>
        );
    }

    return (
        <div style={{
            width: '100vw',
            height: '100vh',
            backgroundColor: '#1a1a1a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <canvas
                ref={canvasRef}
                style={{
                    imageRendering: 'pixelated'
                }}
            />
        </div>
    );
} 