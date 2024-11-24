'use client';

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import { useParams } from 'next/navigation';

import { TextField } from '@mui/material';

import { useSupabase } from '../../client/SupabaseProvider';
import { Entity } from '../../game/[gameId]/ecs/types';
import { ChatHistory } from './components/ChatHistory';
import { SpeechBubble } from './components/SpeechBubble';
import { renderSystem } from './renderSystem';
import { gameToScreenPosition } from './utils/coordinates';

const TILE_SIZE = 16;

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

// Add throttle time constant
const ACTION_THROTTLE = 100; // ms between actions



export default function GamePage() {
    const { supabase } = useSupabase();
    const params = useParams();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [gameState, setGameState] = useState<any>(null);
    const [message, setMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const lastStateTimestampRef = useRef<number>(0);
    const needsRenderRef = useRef<boolean>(false);
    const animationFrameRef = useRef<number>();
    // Add last action time ref
    const lastActionTimeRef = useRef<number>(0);

    const mapDims = useMemo(() => {
        return gameState?.mapDims || [40, 40];
    }, [gameState]);

    // TODO: replace with actual id
    const playerId = useMemo(() => {
        return crypto.randomUUID();
    }, []);

    const playerActionsChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
    // Initialize channels
    useEffect(() => {
        if (!params) return;
        if (!params.gameId) return;

        console.log('Initializing channels for game:', params.gameId);

        // Set up game state channel
        const stateChannel = supabase
            .channel(`game_state:${params.gameId}`)
            .on('broadcast', { event: 'state_update' }, ({ payload }) => {
                console.log('Received state update', payload);
                setIsConnected(true);
                if (payload.timestamp > lastStateTimestampRef.current) {
                    lastStateTimestampRef.current = payload.timestamp;
                    setGameState(payload.state);
                    needsRenderRef.current = true;
                }
            })
            .subscribe();

        // Set up player actions channel
        const actionsChannel = supabase
            .channel(`player_actions:${params.gameId}`)
            .subscribe();

        playerActionsChannelRef.current = actionsChannel;

        return () => {
            console.log('Cleaning up channels');
            stateChannel.unsubscribe();
            actionsChannel.unsubscribe();
        }
    }, [params?.gameId]);

    // Modify the action sending function with throttling
    const sendAction = useCallback((action: any) => {
        if (!playerActionsChannelRef.current) {
            console.error('No player actions channel found');
            return;
        }

        const now = Date.now();
        if (now - lastActionTimeRef.current < ACTION_THROTTLE) {
            return; // Skip if too soon
        }
        lastActionTimeRef.current = now;

        console.log('Sending action', action);

        playerActionsChannelRef.current.send({
            type: 'broadcast',
            event: 'player_action',
            payload: {
                ...action,
                playerId
            }
        });
    }, [playerId]);

    // Update keyboard handler to use sendAction
    useEffect(() => {
        if (isTyping) return; // Disable WASD when typing

        const keys = new Set<string>();

        const handleKeyDown = (e: KeyboardEvent) => {
            if (isTyping) return;

            keys.add(e.key.toLowerCase());

            // Calculate movement
            const dx = Number(keys.has('d')) - Number(keys.has('a'));
            const dy = Number(keys.has('s')) - Number(keys.has('w'));

            // Send movement action if there's movement
            if (dx !== 0 || dy !== 0) {
                sendAction({
                    type: 'MOVE',
                    payload: { dx, dy },
                    id: crypto.randomUUID(),
                    playerId,
                    timestamp: performance.now()
                });
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (isTyping) return;

            keys.delete(e.key.toLowerCase());

            const dx = Number(keys.has('d')) - Number(keys.has('a'));
            const dy = Number(keys.has('s')) - Number(keys.has('w'));

            sendAction({
                type: 'MOVE',
                payload: { dx, dy },
                id: crypto.randomUUID(),
                playerId: 'player',
                timestamp: performance.now()
            });
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [isTyping]);

    // Update message submit handler
    const handleMessageSubmit = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && message.trim()) {
            sendAction({
                type: 'CHAT',
                payload: { message: message.trim() },
                id: crypto.randomUUID(),
                playerId: 'player',
                timestamp: performance.now()
            });
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
            canvasRef.current.width = mapDims[0] * TILE_SIZE;
            canvasRef.current.height = mapDims[1] * TILE_SIZE;

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
    }, [playerId]);

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
                        mapDims[0]
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
                            mapDims[0],
                            curCanvas.width,
                            canvasTop,
                            canvasLeft,
                        );

                        if (entity.components.speech.expiryTime < gameState.timestamp) return null;

                        return (
                            <SpeechBubble
                                key={id}
                                text={entity.components.speech.message}
                                x={screenX}
                                y={screenY}
                                expiryTime={entity.components.speech.expiryTime}
                                // @ts-ignore
                                fadeStartTime={entity.components.speech.fadeStartTime}
                                currentTime={gameState.timestamp}
                            />
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