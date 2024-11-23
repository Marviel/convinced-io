import { World } from '../World';

export function speechSystem(world: World, currentTime: number) {
    for (const entity of world.getAllEntities()) {
        const speech = entity.components.speech;
        if (speech && currentTime >= speech.expiryTime) {
            // Remove expired speech
            delete entity.components.speech;
        }
    }
} 