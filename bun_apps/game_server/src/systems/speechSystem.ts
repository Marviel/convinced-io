import { THINKING_STATES } from '../types';
import type { World } from '../World';

export function speechSystem(world: World, currentTime: number) {
    for (const entity of world.getAllEntities()) {
        const speech = entity.components.speech;
        if (!speech) continue;

        // Remove expired speech
        if (currentTime >= speech.expiryTime) {
            delete entity.components.speech;
            continue;
        }

        // Update thinking animation if needed
        if (speech.isThinking && speech.thinkingState) {
            // Cycle through thinking states
            const currentIndex = THINKING_STATES.indexOf(speech.thinkingState);
            const nextIndex = (currentIndex + 1) % THINKING_STATES.length;
            speech.thinkingState = THINKING_STATES[nextIndex];
        }
    }
} 