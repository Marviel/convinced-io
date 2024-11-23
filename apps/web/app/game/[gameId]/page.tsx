'use client';

import {
  useEffect,
  useRef,
  useState,
} from 'react';

import { styled } from '@mui/material/styles';

import {
  aiSystem,
  moveSystem,
} from './ecs/systems';
import { Entity } from './ecs/types';
import { World } from './ecs/World';
import { useKeyboardControls } from './hooks/useKeyboardControls';

// Constants
const TILE_SIZE = 32;
const MAP_SIZE = 50;
const NUM_NPCS = 20;

const GameContainer = styled('div')({
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    backgroundColor: '#000',
});

const GameCanvas = styled('canvas')({
    position: 'absolute',
});

export default function GameRoom() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const worldRef = useRef<World>(new World(MAP_SIZE, MAP_SIZE));
    const playerRef = useRef<Entity>();
    const lastTimeRef = useRef<number>(0);
    const [initialized, setInitialized] = useState(false);

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
                appearance: { color: '#0077be' },
                movement: {
                    dx: 0,
                    dy: 0,
                    speed: 1,
                    moveInterval: 100  // Can move every 100ms (10 times per second)
                },
                collision: { solid: true },
            },
        };
        world.addEntity(player);
        playerRef.current = player;

        // Create structures
        for (let y = 0; y < MAP_SIZE; y++) {
            for (let x = 0; x < MAP_SIZE; x++) {
                if (Math.random() < 0.1) {
                    const structure: Entity = {
                        id: `structure-${x}-${y}`,
                        type: 'structure',
                        components: {
                            position: { x, y },
                            appearance: { color: '#8b4513' },
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
                    appearance: { color: `hsl(${Math.random() * 360}, 70%, 50%)` },
                    movement: {
                        dx: 0,
                        dy: 0,
                        speed: 1,
                        moveInterval: 500  // Can move every 500ms (2 times per second)
                    },
                    collision: { solid: true },
                    ai: { type: 'random', nextMoveTime: 0 },
                },
            };
            world.addEntity(npc);
        }

        setInitialized(true);
    }, [initialized]);

    // Handle keyboard controls
    useKeyboardControls((dx, dy) => {
        if (playerRef.current?.components.movement) {
            playerRef.current.components.movement.dx = dx;
            playerRef.current.components.movement.dy = dy;
        }
    });

    // Game loop
    useEffect(() => {
        if (!initialized) return;

        let animationFrameId: number;
        const gameLoop = (timestamp: number) => {
            const delta = lastTimeRef.current ? (timestamp - lastTimeRef.current) / 1000 : 0;
            lastTimeRef.current = timestamp;

            // Update systems
            moveSystem(worldRef.current, delta);
            aiSystem(worldRef.current, timestamp);

            // Render
            renderWorld();

            animationFrameId = requestAnimationFrame(gameLoop);
        };

        const renderWorld = () => {
            const canvas = canvasRef.current;
            const world = worldRef.current;
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Set canvas size to window size
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;

            // Clear canvas
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Apply camera transform
            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2);

            // Draw grid background
            ctx.fillStyle = '#1a1a1a';
            for (let y = 0; y < MAP_SIZE; y++) {
                for (let x = 0; x < MAP_SIZE; x++) {
                    ctx.fillRect(
                        (x - MAP_SIZE / 2) * TILE_SIZE,
                        (y - MAP_SIZE / 2) * TILE_SIZE,
                        TILE_SIZE - 1,
                        TILE_SIZE - 1
                    );
                }
            }

            // Draw entities
            for (const entity of world.getAllEntities()) {
                const pos = entity.components.position;
                const appearance = entity.components.appearance;
                if (pos && appearance) {
                    ctx.fillStyle = appearance.color;
                    ctx.fillRect(
                        (pos.x - MAP_SIZE / 2) * TILE_SIZE,
                        (pos.y - MAP_SIZE / 2) * TILE_SIZE,
                        TILE_SIZE - 1,
                        TILE_SIZE - 1
                    );
                }
            }

            ctx.restore();
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

    return (
        <GameContainer>
            <GameCanvas ref={canvasRef} />
        </GameContainer>
    );
}