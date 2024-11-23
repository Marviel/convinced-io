import { Pathfinder } from '../utils/Pathfinder';
import { World } from '../World';

let pathfinder: Pathfinder | null = null;

interface AIState {
    lastPosition?: { x: number; y: number };
}

const aiStates = new Map<string, AIState>();

export function aiSystem(world: World, currentTime: number) {
    // Initialize or update pathfinder
    if (!pathfinder) {
        pathfinder = new Pathfinder(world.width, world.height);
    }

    // Update obstacle map
    for (const entity of world.getAllEntities()) {
        if (entity.components.collision?.solid) {
            const pos = entity.components.position;
            if (pos) {
                pathfinder.updateObstacle(pos.x, pos.y, true);
            }
        }
    }

    // Process AI entities
    for (const entity of world.getAllEntities()) {
        const ai = entity.components.ai;
        const pathfinding = entity.components.pathfinding;
        const movement = entity.components.movement;
        const position = entity.components.position;

        if (!ai || !pathfinding || !movement || !position || entity.type !== 'npc') continue;

        let state = aiStates.get(entity.id) || {};
        aiStates.set(entity.id, state);

        if (currentTime >= ai.nextMoveTime) {
            // Normal pathfinding behavior
            if (!pathfinding.targetPosition) {
                // Pick new random destination
                let targetX, targetY;
                let attempts = 0;
                do {
                    targetX = Math.floor(Math.random() * world.width);
                    targetY = Math.floor(Math.random() * world.height);
                    attempts++;
                } while (world.isPositionOccupied(targetX, targetY) && attempts < 10);

                if (attempts < 10) {
                    pathfinding.targetPosition = { x: targetX, y: targetY };
                    const path = pathfinder.findPath(
                        position,
                        pathfinding.targetPosition
                    );
                    if (path) {
                        pathfinding.currentPath = path;
                        pathfinding.pathIndex = 0;
                    }
                }
            }

            // Follow current path
            if (pathfinding.currentPath && pathfinding.pathIndex !== undefined) {
                const nextPoint = pathfinding.currentPath[pathfinding.pathIndex];

                if (nextPoint) {
                    movement.dx = Math.sign(nextPoint.x - position.x);
                    movement.dy = Math.sign(nextPoint.y - position.y);

                    if (position.x === nextPoint.x && position.y === nextPoint.y) {
                        pathfinding.pathIndex++;
                    }
                } else {
                    // Reached destination
                    movement.dx = 0;
                    movement.dy = 0;
                    pathfinding.targetPosition = undefined;
                    pathfinding.currentPath = undefined;
                    pathfinding.pathIndex = undefined;
                }
            }

            // Update last position for next cycle
            state.lastPosition = { ...position };
            ai.nextMoveTime = currentTime + 200;
        }
    }
} 