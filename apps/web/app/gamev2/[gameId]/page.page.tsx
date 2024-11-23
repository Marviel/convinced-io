'use client';

import {
    useEffect,
    useRef,
    useState,
} from 'react';

import {
    addComponent,
    defineQuery,
    hasComponent,
} from 'bitecs';
import { useParams } from 'next/navigation';

import { notEmpty } from '@lukebechtel/lab-ts-utils';

import {
    AI,
    EntityType,
    Interactable,
    Movement,
    Position,
    Speech,
} from './components';
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

// Define the query for AI entities
const aiQuery = defineQuery([AI, Position, Movement]);

// Define the query for player entities
const playerQuery = defineQuery([Position, EntityType, Interactable]);

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

            clientSystems.aiSystem(worldRef.current, timestamp);

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

    const handlePlayerSpeak = async (message: string) => {
        if (!worldRef.current) return;

        // Find player entity using query
        const players = playerQuery(worldRef.current.world);
        const player = players.find(eid => EntityType.type[eid] === 0);

        if (!notEmpty(player)) return;

        // Add message to pool
        const messageIndex = worldRef.current.addMessage(message);

        // Add speech component to player
        if (!hasComponent(worldRef.current.world, Speech, player)) {
            addComponent(worldRef.current.world, Speech, player);
        }
        Speech.messageIndex[player] = messageIndex;
        Speech.expiryTime[player] = performance.now() + 3000;

        // Find NPCs in range
        const entities = aiQuery(worldRef.current.world);
        for (const eid of entities) {
            // Initialize values if undefined
            const npcX = Position.x[eid] ?? 0;
            const npcY = Position.y[eid] ?? 0;
            const playerX = Position.x[player] ?? 0;
            const playerY = Position.y[player] ?? 0;
            const radius = Interactable.radius[player] ?? 5;

            // Calculate distance
            const dx = npcX - playerX;
            const dy = npcY - playerY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance <= radius) {
                // Stop the NPC
                Movement.dx[eid] = 0;
                Movement.dy[eid] = 0;

                // Set processing state
                AI.processingMessage[eid] = 1;
                AI.processingStartTime[eid] = performance.now();
                AI.processingMessageIndex[eid] = messageIndex;
            }
        }
    };

    // Add generate message button
    const handleGenerate = async () => {
        try {
            const response = await fetch('/api/genObject', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    schema: {
                        type: 'object',
                        properties: {
                            message: { type: 'string' },
                        },
                        required: ['message'],
                    },
                    prompt: "Generate a funny message that tries to convince nearby NPCs to go in one of the four cardinal directions.",
                }),
            });

            const result = await response.json();
            handlePlayerSpeak(result.message);
        } catch (error) {
            console.error('Error generating message:', error);
        }
    };

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
                <button
                    onClick={handleGenerate}
                    style={{
                        position: 'absolute',
                        bottom: '20px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        padding: '10px 20px',
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer'
                    }}
                >
                    Generate Message
                </button>
            </div>
        </div>
    );
} 