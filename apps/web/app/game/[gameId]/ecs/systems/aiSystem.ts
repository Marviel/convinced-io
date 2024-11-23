import { World } from '../World';

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
                }
                // Make NPCs change direction more frequently
                ai.nextMoveTime = currentTime + 200;
            }
        }
    }
} 