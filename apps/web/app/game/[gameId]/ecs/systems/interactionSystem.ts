import { World } from '../World';

export function interactionSystem(world: World) {
    // Find player
    const player = world.getAllEntities().find(e => e.type === 'player');
    if (!player?.components.position || !player.components.interactable) return;

    const playerPos = player.components.position;
    const interactionRadius = player.components.interactable.radius;

    // Check all entities for interaction range
    for (const entity of world.getAllEntities()) {
        if (entity.type !== 'npc') continue;

        const pos = entity.components.position;
        const appearance = entity.components.appearance;
        if (!pos || !appearance) continue;

        // Calculate distance (using Manhattan distance for simplicity)
        const distance = Math.abs(pos.x - playerPos.x) + Math.abs(pos.y - playerPos.y);

        // Update highlight status
        appearance.highlighted = distance <= interactionRadius;
    }
} 