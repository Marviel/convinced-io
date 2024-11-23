'use client';

import {
    useEffect,
    useRef,
    useState,
} from 'react';

import { Button } from '@mui/material';
import { styled } from '@mui/material/styles';

import { SpeechBubble } from './components/SpeechBubble';
import {
    aiSystem,
    interactionSystem,
    moveSystem,
    type MoveSystemInput,
    type RenderContext,
    renderSystem,
    speechSystem,
} from './ecs/systems';
import { Entity } from './ecs/types';
import { World } from './ecs/World';
import { useKeyboardControls } from './hooks/useKeyboardControls';
import { NetworkManager } from './network/NetworkManager';

// Constants
const TILE_SIZE = 32;
const MAP_SIZE = 50;
const NUM_NPCS = 20;
const INTERACTION_RADIUS = 5; // 5 tiles radius
const AVAILABLE_SPRITES = ['syb1', 'spd1', 'thf2']; // Add all your available sprite base names

const GameContainer = styled('div')({
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'fixed',
    top: 0,
    left: 0,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
});

const GameCanvas = styled('canvas')({
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    imageRendering: 'pixelated',
});

// Add this type
interface GeneratedMessage {
    message: string;
    timestamp: number;
}

export default function GameRoom() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const worldRef = useRef<World>(new World(MAP_SIZE, MAP_SIZE));
    const playerRef = useRef<Entity>();
    const lastTimeRef = useRef<number>(0);
    const [initialized, setInitialized] = useState(false);
    const networkManager = useRef<NetworkManager>();
    const [generatedMessage, setGeneratedMessage] = useState<GeneratedMessage | null>(null);

    // Initialize world
    useEffect(() => {
        if (initialized) return;
        const world = worldRef.current;

        // Create player
        const player: Entity = {
            id: 'player',
            type: 'player',
            components: {
                position: { x: 25, y: 25 },
                appearance: {
                    color: '#0077be', // Fallback color
                    sprite: AVAILABLE_SPRITES[Math.floor(Math.random() * AVAILABLE_SPRITES.length)],
                    direction: 'fr',
                    isMoving: false
                },
                movement: {
                    dx: 0,
                    dy: 0,
                    speed: 1,
                    moveInterval: 100
                },
                collision: { solid: true },
                interactable: { radius: INTERACTION_RADIUS },
            },
        };
        world.addEntity(player);
        playerRef.current = player;

        // Create structures (logs)
        for (let y = 0; y < MAP_SIZE; y++) {
            for (let x = 0; x < MAP_SIZE; x++) {
                if (Math.random() < 0.1) {
                    const structure: Entity = {
                        id: `structure-${x}-${y}`,
                        type: 'structure',
                        components: {
                            position: { x, y },
                            appearance: { 
                                structure: true,
                                structureNumber: 1 + Math.floor(Math.random() * 8)
                            },
                            collision: { solid: true },
                        },
                    };
                    if (!world.isPositionOccupied(x, y)) {
                        world.addEntity(structure);
                    }
                }
            }
        }

        // Create NPCs
        for (let i = 0; i < NUM_NPCS; i++) {
            let x, y;
            do {
                x = Math.floor(Math.random() * MAP_SIZE);
                y = Math.floor(Math.random() * MAP_SIZE);
            } while (world.isPositionOccupied(x, y));

            const npc: Entity = {
                id: `npc-${i}`,
                type: 'npc',
                components: {
                    position: { x, y },
                    appearance: {
                        color: `hsl(${Math.random() * 360}, 70%, 50%)`, // Fallback color
                        sprite: AVAILABLE_SPRITES[Math.floor(Math.random() * AVAILABLE_SPRITES.length)],
                        direction: ['fr', 'bk', 'lf', 'rt'][Math.floor(Math.random() * 4)] as 'fr' | 'bk' | 'lf' | 'rt',
                        isMoving: false
                    },
                    movement: {
                        dx: 0,
                        dy: 0,
                        speed: 1,
                        moveInterval: 500
                    },
                    collision: { solid: true },
                    ai: { type: 'random', nextMoveTime: 0 },
                    pathfinding: {}
                },
            };
            world.addEntity(npc);
        }

        networkManager.current = new NetworkManager(
            worldRef.current,
            playerRef.current!.id
        );

        setInitialized(true);
    }, [initialized]);

    // Modify keyboard controls to dispatch actions
    useKeyboardControls((action) => {
        networkManager.current?.dispatchAction(action);
    });

    // Game loop
    useEffect(() => {
        if (!initialized) return;

        let animationFrameId: number;
        const gameLoop = (timestamp: number) => {
            const delta = lastTimeRef.current ? (timestamp - lastTimeRef.current) / 1000 : 0;
            lastTimeRef.current = timestamp;

            const moveInput: MoveSystemInput = {
                delta,
                currentTime: timestamp
            };

            // Update systems
            moveSystem(worldRef.current, moveInput);
            aiSystem(worldRef.current, timestamp);
            interactionSystem(worldRef.current);
            speechSystem(worldRef.current, timestamp);

            const renderInput: RenderContext = {
                ctx: canvasRef.current!.getContext('2d')!,
                width: canvasRef.current!.width,
                height: canvasRef.current!.height,
                tileSize: TILE_SIZE,
                mapSize: MAP_SIZE
            };

            // Render
            renderSystem(worldRef.current, renderInput);

            animationFrameId = requestAnimationFrame(gameLoop);
        };

        animationFrameId = requestAnimationFrame(gameLoop);
        return () => cancelAnimationFrame(animationFrameId);
    }, [initialized]);

    // Add this to your keyboard controls setup
    useEffect(() => {
        const handleDebugKey = (e: KeyboardEvent) => {
            if (e.key === 'D' && e.shiftKey) {
                worldRef.current.debugGrid();
            }
        };

        window.addEventListener('keydown', handleDebugKey);
        return () => window.removeEventListener('keydown', handleDebugKey);
    }, []);

    // Add resize handler
    useEffect(() => {
        const handleResize = () => {
            if (!canvasRef.current) return;

            // Calculate size while maintaining aspect ratio
            const scale = Math.min(
                window.innerWidth / (MAP_SIZE * TILE_SIZE),
                window.innerHeight / (MAP_SIZE * TILE_SIZE)
            );

            canvasRef.current.width = MAP_SIZE * TILE_SIZE;
            canvasRef.current.height = MAP_SIZE * TILE_SIZE;
            canvasRef.current.style.transform = `scale(${scale})`;
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // Initial size

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Add this function
    // const handleGenerate = async () => {
    //     try {
    //         const response = await fetch('/api/genObject', {
    //             method: 'POST',
    //             headers: {
    //                 'Content-Type': 'application/json',
    //             },
    //             body: JSON.stringify({
    //                 schema: {
    //                     type: 'object',
    //                     properties: {
    //                         message: { type: 'string' },
    //                     },
    //                     required: ['message'],
    //                 },
    //                 prompt: "Generate a short, funny message for a game character to say.",
    //             }),
    //         });

    //         const result = await response.json();
    //         console.log(result);

    //         // Add speech component to player
    //         if (playerRef.current) {
    //             playerRef.current.components.speech = {
    //                 message: result.message,
    //                 expiryTime: performance.now() + 5000, // 5 seconds from now
    //             };
    //         }
    //     } catch (error) {
    //         console.error('Error generating message:', error);
    //     }
    // };

    const handlePlayerSpeak = async (message: string) => {
        const player = playerRef.current;
        if (!player?.components.position || !player.components.interactable) return;

        // Get all NPCs in range
        const npcsInRange = worldRef.current.getAllEntities().filter(entity => {
            if (entity.type !== 'npc') return false;

            const npcPos = entity.components.position;
            if (!npcPos) return false;

            const dx = npcPos.x - player.components.position!.x;
            const dy = npcPos.y - player.components.position!.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            return distance <= player.components.interactable!.radius;
        });

        // Make them process the message
        for (const npc of npcsInRange) {
            if (npc.components.ai) {
                npc.components.ai.processingMessage = {
                    message,
                    fromEntity: player.id,
                    processStartTime: performance.now()
                };
            }
        }

        // Show player's message
        player.components.speech = {
            message,
            expiryTime: performance.now() + 3000
        };
    };

    // Update handleGenerate to use this
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
                    prompt: "Generate a short, funny message for a game character to say.",
                }),
            });

            const result = await response.json();
            handlePlayerSpeak(result.message);
        } catch (error) {
            console.error('Error generating message:', error);
        }
    };

    // Update the render function to include button and speech bubble
    return (
        <GameContainer>
            <GameCanvas ref={canvasRef} />

            {/* Add Generate Button */}
            <Button
                variant="contained"
                onClick={handleGenerate}
                sx={{
                    position: 'fixed',
                    bottom: 20,
                    right: 20,
                    zIndex: 1000,
                }}
            >
                Generate Message
            </Button>

            {/* Add Speech Bubble */}
            {generatedMessage && playerRef.current?.components.position && (
                <SpeechBubble
                    text={generatedMessage.message}
                    x={window.innerWidth / 2}
                    y={window.innerHeight / 2 - 50}
                />
            )}
        </GameContainer>
    );
}