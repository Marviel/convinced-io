import {
    defineQuery,
    removeComponent,
} from 'bitecs';

import { Speech } from '../components';
import { WorldManager } from '../world/WorldManager';

const speechQuery = defineQuery([Speech]);

export function speechSystem(world: WorldManager, currentTime: number) {
    const entities = speechQuery(world.world);

    for (const eid of entities) {
        // Initialize values if undefined
        Speech.expiryTime[eid] = Speech.expiryTime[eid] ?? 0;
        Speech.isThinking[eid] = Speech.isThinking[eid] ?? 0;
        Speech.thinkingState[eid] = Speech.thinkingState[eid] ?? 0;
        Speech.messageIndex[eid] = Speech.messageIndex[eid] ?? 0;

        // Remove expired speech
        if (currentTime >= Speech.expiryTime[eid]) {
            removeComponent(world.world, Speech, eid);
            continue;
        }

        // Optional: Update thinking animation state
        if (Speech.isThinking[eid]) {
            // You could add thinking animation logic here
            // For example, cycling through different thinking indicators
            // or updating the visual state based on thinkingState
        }
    }
} 