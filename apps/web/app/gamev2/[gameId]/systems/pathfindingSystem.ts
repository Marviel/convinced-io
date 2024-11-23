import { defineQuery } from 'bitecs';

import {
    Pathfinding,
    Position,
} from '../components';
import { findPath } from '../utils/pathfinder';
import { WorldManager } from '../world/WorldManager';

const pathfindingQuery = defineQuery([Position, Pathfinding]);

export function pathfindingSystem(world: WorldManager) {
    const entities = pathfindingQuery(world.world);

    for (const eid of entities) {
        // Skip if no target or already has a path
        if (
            !Pathfinding.hasTarget[eid] ||
            Pathfinding.pathIndex[eid] !== undefined
        ) {
            continue;
        }

        // Get current position and target
        const startX = Position.x[eid] ?? 0;
        const startY = Position.y[eid] ?? 0;
        const targetX = Pathfinding.targetX[eid] ?? 0;
        const targetY = Pathfinding.targetY[eid] ?? 0;

        // Find path
        const path = findPath(
            { x: startX, y: startY },
            { x: targetX, y: targetY },
            world.width,
            world.height,
            (x, y) => !world.isPositionOccupied(x, y)
        );

        // Store path in world and save index
        if (path.length > 0) {
            const pathIndex = world.addPath(path);
            Pathfinding.pathIndex[eid] = pathIndex;
        } else {
            // If no path found, clear target
            Pathfinding.hasTarget[eid] = 0;
        }
    }
} 