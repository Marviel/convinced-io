import {
    defineQuery,
    enterQuery,
    exitQuery,
} from 'bitecs';

import {
    Appearance,
    EntityType,
    Movement,
    Position,
} from '../components';
import {
    DIRECTIONS,
    ENTITY_TYPES,
    WorldManager,
} from '../world/WorldManager';

export interface MoveSystemInput {
    delta: number;
    currentTime: number;
    movement?: {
        dx: number;
        dy: number;
    };
}

// Create queries
const movementQuery = defineQuery([Position, Movement]);
const movementQueryEnter = enterQuery(movementQuery);
const movementQueryExit = exitQuery(movementQuery);

export function moveSystem(world: WorldManager, { delta, currentTime, movement }: MoveSystemInput) {
    // Handle new entities
    const enterEntities = movementQueryEnter(world.world);
    // Handle removed entities
    const exitEntities = movementQueryExit(world.world);

    // Process movement for all entities with Position and Movement components
    const entities = movementQuery(world.world);

    for (const eid of entities) {
        // Initialize movement values if undefined
        Movement.dx[eid] = Movement.dx[eid] ?? 0;
        Movement.dy[eid] = Movement.dy[eid] ?? 0;
        Movement.lastMoveTime[eid] = Movement.lastMoveTime[eid] ?? 0;
        Movement.moveInterval[eid] = Movement.moveInterval[eid] ?? 100;

        // Skip if not enough time has passed since last move
        if (currentTime - Movement.lastMoveTime[eid] < Movement.moveInterval[eid]) {
            continue;
        }

        // Update player movement if provided
        if (movement && EntityType.type[eid] === ENTITY_TYPES.PLAYER) {
            Movement.dx[eid] = movement.dx;
            Movement.dy[eid] = movement.dy;
        }

        // Skip if no movement
        if (Movement.dx[eid] === 0 && Movement.dy[eid] === 0) continue;


        // Skip if no position
        if (Position.x[eid] === undefined || Position.y[eid] === undefined) continue;

        const newX = Position.x[eid] + Movement.dx[eid];
        const newY = Position.y[eid] + Movement.dy[eid];

        // Check bounds
        if (newX < 0 || newX >= world.width || newY < 0 || newY >= world.height) {
            continue;
        }

        // Check collisions
        if (world.isPositionOccupied(newX, newY)) {
            // Stop NPCs when they hit something
            if (EntityType.type[eid] === ENTITY_TYPES.NPC) {
                Movement.dx[eid] = 0;
                Movement.dy[eid] = 0;
            }
            continue;
        }

        // Update position
        Position.x[eid] = newX;
        Position.y[eid] = newY;
        Movement.lastMoveTime[eid] = currentTime;

        // Update appearance direction
        if (Appearance.direction[eid] !== undefined) {
            if (Movement.dx[eid] > 0) Appearance.direction[eid] = DIRECTIONS.RIGHT;
            else if (Movement.dx[eid] < 0) Appearance.direction[eid] = DIRECTIONS.LEFT;
            else if (Movement.dy[eid] > 0) Appearance.direction[eid] = DIRECTIONS.FRONT;
            else if (Movement.dy[eid] < 0) Appearance.direction[eid] = DIRECTIONS.BACK;

            // Convert boolean to number (0 or 1)
            Appearance.isMoving[eid] = Number(Movement.dx[eid] !== 0 || Movement.dy[eid] !== 0);
        }
    }
} 