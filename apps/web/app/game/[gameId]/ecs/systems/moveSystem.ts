import { MovePayload } from '../../network/types';
import { World } from '../World';

export interface MoveSystemInput {
    delta: number;
    currentTime: number;
    movement?: MovePayload;
}

export function moveSystem(world: World, { delta, currentTime, movement }: MoveSystemInput) {
    for (const entity of world.getAllEntities()) {
        const entityMovement = entity.components.movement;
        const position = entity.components.position;

        if (entityMovement && position) {
            if (movement && entity.type === 'player') {
                entityMovement.dx = movement.dx;
                entityMovement.dy = movement.dy;
            }

            if (entityMovement.dx === 0 && entityMovement.dy === 0) continue;

            if (entityMovement.lastMoveTime &&
                currentTime - entityMovement.lastMoveTime < entityMovement.moveInterval) {
                continue;
            }

            const newX = position.x + entityMovement.dx;
            const newY = position.y + entityMovement.dy;

            const moved = world.moveEntity(entity.id, newX, newY);

            if (moved) {
                entityMovement.lastMoveTime = currentTime;
                console.log(`Entity ${entity.type} moved to ${newX},${newY}`);
            } else {
                if (entity.type === 'npc') {
                    entityMovement.dx = 0;
                    entityMovement.dy = 0;
                }
            }
        }
    }
} 