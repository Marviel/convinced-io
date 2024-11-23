import type { World } from '../World';

export function interactionSystem(world: World) {
    // Find all players
    const players = world.getAllEntities().filter(e => e.type === 'player');

    // Process each player's interaction radius
    for (const player of players) {
        const pos = player.components.position;
        const interactable = player.components.interactable;

        if (!pos || !interactable) continue;

        // Find NPCs in range
        for (const entity of world.getAllEntities()) {
            if (entity.type !== 'npc') continue;

            const npcPos = entity.components.position;
            const appearance = entity.components.appearance;

            if (!npcPos || !appearance) continue;

            // Calculate Manhattan distance
            const distance = Math.abs(npcPos.x - pos.x) + Math.abs(npcPos.y - pos.y);

            // Update highlight status
            appearance.highlighted = distance <= interactable.radius;
        }
    }
} 