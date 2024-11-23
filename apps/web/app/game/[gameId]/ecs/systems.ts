import { World } from './World';

export function moveSystem(world: World, delta: number) {
    const currentTime = performance.now();

    for (const entity of world.getAllEntities()) {
        const movement = entity.components.movement;
        const position = entity.components.position;

        if (movement && position) {
            if (movement.dx === 0 && movement.dy === 0) continue;

            // Check if enough time has passed since last move
            if (movement.lastMoveTime &&
                currentTime - movement.lastMoveTime < movement.moveInterval) {
                continue;
            }

            const newX = position.x + movement.dx;
            const newY = position.y + movement.dy;

            console.log(`Attempting to move ${entity.type} from (${position.x},${position.y}) to (${newX},${newY})`);
            const moved = world.moveEntity(entity.id, newX, newY);

            if (moved) {
                movement.lastMoveTime = currentTime;
                console.log(`Successfully moved ${entity.type} to (${newX},${newY})`);
            } else {
                console.log(`Movement blocked for ${entity.type}`);
                // If movement failed and this is an NPC, clear its movement
                if (entity.type === 'npc') {
                    movement.dx = 0;
                    movement.dy = 0;
                }
            }
        }
    }
}

export function aiSystem(world: World, currentTime: number) {
    for (const entity of world.getAllEntities()) {
        const ai = entity.components.ai;
        if (!ai || entity.type !== 'npc') continue;

        if (currentTime >= ai.nextMoveTime) {
            // Random movement
            const movement = entity.components.movement;
            if (movement) {
                // Only change direction if not currently moving or randomly
                if (movement.dx === 0 && movement.dy === 0 || Math.random() < 0.3) {
                    // Ensure we always move in some direction
                    do {
                        movement.dx = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
                        movement.dy = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
                    } while (movement.dx === 0 && movement.dy === 0);

                    console.log(`NPC changing direction to (${movement.dx},${movement.dy})`);
                }
                // Make NPCs change direction more frequently
                ai.nextMoveTime = currentTime + 200;
            }
        }
    }
} 