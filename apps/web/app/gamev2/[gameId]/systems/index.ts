import { aiSystem } from './aiSystem';
import { interactionSystem } from './interactionSystem';
import {
    moveSystem,
    type MoveSystemInput,
} from './moveSystem';
import { pathfindingSystem } from './pathfindingSystem';
import { speechSystem } from './speechSystem';

// Non-authoritative systems (can run on client for optimistic updates)
export const clientSystems = {
    // Visual-only systems
    interactionSystem,
    speechSystem,

    // Optimistic systems
    moveSystem,
    pathfindingSystem,
};

// Authoritative systems (must run on server)
export const serverSystems = {
    moveSystem,
    aiSystem,
    pathfindingSystem,
};

// Export individual systems and their types
export {
    aiSystem,
    interactionSystem,
    moveSystem,
    type MoveSystemInput,
    pathfindingSystem,
    speechSystem,
};

// Export system input types
export type SystemContext = {
    delta: number;
    currentTime: number;
};

// Export render context type (we'll need this for the render system)
export type RenderContext = {
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
    tileSize: number;
    mapSize: number;
}; 