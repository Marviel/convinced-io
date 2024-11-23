import { defineQuery } from 'bitecs';

import {
    Appearance,
    EntityType,
    Interactable,
    Position,
} from '../components';
import {
    ENTITY_TYPES,
    WorldManager,
} from '../world/WorldManager';

const playerQuery = defineQuery([Position, Interactable, EntityType]);
const npcQuery = defineQuery([Position, Appearance, EntityType]);

export function interactionSystem(world: WorldManager) {
    // Find player
    const players = playerQuery(world.world);
    const player = players.find(eid => EntityType.type[eid] === ENTITY_TYPES.PLAYER);

    if (!player) return;

    // Initialize values if undefined
    Position.x[player] = Position.x[player] ?? 0;
    Position.y[player] = Position.y[player] ?? 0;
    Interactable.radius[player] = Interactable.radius[player] ?? 5;

    const playerPos = {
        x: Position.x[player],
        y: Position.y[player]
    };
    const interactionRadius = Interactable.radius[player];

    // Check all NPCs for interaction range
    const npcs = npcQuery(world.world);
    for (const npc of npcs) {
        if (EntityType.type[npc] !== ENTITY_TYPES.NPC) continue;

        // Initialize values if undefined
        Position.x[npc] = Position.x[npc] ?? 0;
        Position.y[npc] = Position.y[npc] ?? 0;
        Appearance.highlighted[npc] = Appearance.highlighted[npc] ?? 0;

        const npcPos = {
            x: Position.x[npc],
            y: Position.y[npc]
        };

        // Calculate Manhattan distance
        const distance = Math.abs(npcPos.x - playerPos.x) + Math.abs(npcPos.y - playerPos.y);

        // Update highlight status
        Appearance.highlighted[npc] = distance <= interactionRadius ? 1 : 0;
    }
} 