import type { Action } from '../types';
import type { World } from '../World';

export function moveAction(world: World, action: Action) {
    if (action.type !== 'MOVE') return;

    const entity = world.getEntity(action.playerId);
    if (!entity?.components.position || !entity.components.movement) return;

    const movement = entity.components.movement;
    const { dx, dy } = action.payload;

    // Update movement direction
    movement.dx = dx;
    movement.dy = dy;

    // Skip if no movement or not enough time has passed
    if (dx === 0 && dy === 0) return;
    if (movement.lastMoveTime &&
        action.timestamp - movement.lastMoveTime < movement.moveInterval) {
        return;
    }

    // Calculate new position
    const pos = entity.components.position;
    const newX = pos.x + movement.dx;
    const newY = pos.y + movement.dy;

    // Try to move
    const moved = world.moveEntity(entity.id, newX, newY);

    if (moved) {
        movement.lastMoveTime = action.timestamp;

        // Update appearance if it exists
        if (entity.components.appearance) {
            if (dx > 0) entity.components.appearance.direction = 'rt';
            else if (dx < 0) entity.components.appearance.direction = 'lf';
            else if (dy > 0) entity.components.appearance.direction = 'fr';
            else if (dy < 0) entity.components.appearance.direction = 'bk';

            entity.components.appearance.isMoving = dx !== 0 || dy !== 0;
        }
    }
}