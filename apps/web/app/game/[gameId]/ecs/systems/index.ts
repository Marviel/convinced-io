import { aiSystem } from './aiSystem';
import { createOptimisticSystem } from './createOptimisticSystem';
import { interactionSystem } from './interactionSystem';
import {
    moveSystem,
    MoveSystemInput,
} from './moveSystem';
import {
    RenderContext,
    renderSystem,
} from './renderSystem';
import { speechSystem } from './speechSystem';

// Non-authoritative systems (can run on client for optimistic updates)
export const clientSystems = {
    // Visual-only systems
    interactionSystem,
    renderSystem,

    // Optimistic systems
    moveSystem: createOptimisticSystem(moveSystem),
};

// Authoritative systems (must run on server)
export const serverSystems = {
    moveSystem,
    aiSystem,
};

// Export individual systems and their types
export {
    aiSystem,
    interactionSystem,
    moveSystem,
    type MoveSystemInput,
    type RenderContext,
    renderSystem,
    speechSystem,
};