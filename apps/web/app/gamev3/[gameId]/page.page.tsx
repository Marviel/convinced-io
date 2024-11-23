'use client';

import {
    useEffect,
    useRef,
    useState,
} from 'react';

import { useParams } from 'next/navigation';

import { TextField } from '@mui/material';

import { Entity } from '../../game/[gameId]/ecs/types';
import { ChatHistory } from './components/ChatHistory';
import { SpeechBubble } from './components/SpeechBubble';
import { renderSystem } from './renderSystem';
import { gameToScreenPosition } from './utils/coordinates';

const TILE_SIZE = 16;
const MAP_SIZE = 50;

const inputStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '300px',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: '4px'
};

const containerStyle: React.CSSProperties = {
    width: '100vw',
    height: '100vh',
    backgroundColor: '#1a1a1a',
    display: 'flex',
};

const gameAreaStyle: React.CSSProperties = {
    flex: 1,
    height: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative'
};

export default function GamePage() {
    const params = useParams();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [gameState, setGameState] = useState<any>(null);
    const [message, setMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
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
        if (!wsRef.current || isTyping) return; // Disable WASD when typing

        const keys = new Set<string>();

        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't handle movement keys if typing
            if (isTyping) return;

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
                        playerId: 'player',
                        timestamp: performance.now()
                    }
                };
                wsRef.current?.send(JSON.stringify(action));
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            // Don't handle movement keys if typing
            if (isTyping) return;

            keys.delete(e.key.toLowerCase());

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
    }, [isTyping]);

    const handleMessageSubmit = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && message.trim() && wsRef.current) {
            const action = {
                type: 'ACTION',
                action: {
                    type: 'CHAT',
                    payload: { message: message.trim() },
                    id: crypto.randomUUID(),
                    playerId: 'player',
                    timestamp: performance.now()
                }
            };
            wsRef.current.send(JSON.stringify(action));
            setMessage('');
        }
    };

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
            // canvasRef.current.style.width = `${size}px`;
            // canvasRef.current.style.height = `${size}px`;
            canvasRef.current.style.width = '100vw';
            canvasRef.current.style.height = '100vw';
        };

        window.addEventListener('resize', handleResize);

        const resizeInterval = setTimeout(handleResize, 500);
        handleResize();

        return () => {
            window.removeEventListener('resize', handleResize);
            clearInterval(resizeInterval);
        };
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
        <div style={containerStyle}>
            <div style={gameAreaStyle}>

                <canvas
                    ref={canvasRef}
                    style={{
                        imageRendering: 'pixelated',
                        position: 'relative'
                    }}
                />
                {gameState?.entities.map(([id, entity]: [string, Entity]) => {
                    if (entity.components.speech && entity.components.position && canvasRef.current) {
                        const pos = entity.components.position;

                        const curCanvas = canvasRef.current!;

                        if (!curCanvas) return null;
                        const canvasTop = curCanvas.getBoundingClientRect().top;
                        const canvasLeft = curCanvas.getBoundingClientRect().left;

                        const { screenX, screenY } = gameToScreenPosition(
                            pos.x,
                            pos.y,
                            MAP_SIZE,
                            curCanvas.width,
                            canvasTop,
                            canvasLeft,
                        );

                        if (entity.components.speech.expiryTime < gameState.timestamp) return null;

                        return (
                            <>
                                <div style={{
                                    position: 'absolute',
                                    top: screenY,
                                    left: screenX,
                                    width: '3px',
                                    height: '3px',
                                    backgroundColor: 'red',
                                    zIndex: 9999999999,
                                }}>

                                </div>
                                <SpeechBubble
                                    key={id}
                                    text={entity.components.speech.message}
                                    x={screenX}
                                    y={screenY}
                                    expiryTime={entity.components.speech.expiryTime}
                                    fadeStartTime={entity.components.speech.fadeStartTime}
                                    currentTime={gameState.timestamp}
                                />
                            </>

                        );
                    }
                    return null;
                })}
                <TextField
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleMessageSubmit}
                    onFocus={() => setIsTyping(true)}
                    onBlur={() => setIsTyping(false)}
                    placeholder="Type a message..."
                    variant="outlined"
                    size="small"
                    style={inputStyle}
                />
            </div>
            <ChatHistory messages={gameState?.messages || []} />
        </div>
    );
} 