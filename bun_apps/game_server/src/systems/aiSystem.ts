import { z } from 'zod';

import { genObject } from '../utils/genObject';
import type { World } from '../World';

const THINKING_TIME = 2000; // Time to process a message in ms

// Schema for AI responses
const responseSchema = z.object({
    message: z.string(),
    destinationChange: z.object({
        x: z.number(),
        y: z.number()
    }).nullable()
});

async function generateMessage(): Promise<string> {
    const result = await genObject({
        schema: z.object({
            message: z.string()
        }),
        prompt: "Generate a short, funny message that an NPC might say when reaching their destination. Keep it under 40 characters."
    });

    return result.message;
}

async function processMessage(
    personality: string,
    message: string,
    currentPosition: { x: number, y: number },
    worldSize: number
): Promise<z.infer<typeof responseSchema>> {
    return genObject({
        schema: responseSchema,
        prompt: `You are an NPC with the following personality: ${personality}. 
                You are currently at position (${currentPosition.x}, ${currentPosition.y}).
                Someone just told you: "${message}". 
                How do you respond, and does this make you want to change where you're going?
                If you decide to change destination, ensure coordinates are within 0-${worldSize}.`,
        temperature: 1.0
    });
}

export function aiSystem(world: World, currentTime: number) {
    for (const entity of world.getAllEntities()) {
        if (entity.type !== 'npc') continue;

        const ai = entity.components.ai;
        const pos = entity.components.position;
        const movement = entity.components.movement;
        const pathfinding = entity.components.pathfinding;

        if (!ai || !pos || !movement || !pathfinding) continue;

        // Handle message processing
        if (ai.processingMessage) {
            // Show thinking indicator
            world.addMessage({
                entityId: entity.id,
                entityType: 'npc',
                message: "!",
                timestamp: currentTime,
                position: pos
            });

            // Stop moving while processing
            movement.dx = 0;
            movement.dy = 0;

            processMessage(
                ai.personality || "A friendly NPC",
                ai.processingMessage.message,
                pos,
                world.width
            ).then(response => {
                // Add response to message log
                world.addMessage({
                    entityId: entity.id,
                    entityType: 'npc',
                    message: response.message,
                    timestamp: currentTime,
                    position: pos
                });

                // Update destination if needed
                if (response.destinationChange) {
                    pathfinding.targetPosition = response.destinationChange;
                }
            });

            // Clear processing state
            ai.processingMessage = undefined;

            continue; // Skip normal movement while processing
        }

        // Regular movement logic...
        if (!pathfinding.targetPosition) {
            // Pick new random destination
            let attempts = 0;
            do {
                const targetX = Math.floor(Math.random() * world.width);
                const targetY = Math.floor(Math.random() * world.height);

                if (!world.isPositionOccupied(targetX, targetY)) {
                    pathfinding.targetPosition = { x: targetX, y: targetY };
                    break;
                }
                attempts++;
            } while (attempts < 10);
        }

        // Move towards target if we have one
        if (pathfinding.targetPosition) {
            const dx = Math.sign(pathfinding.targetPosition.x - pos.x);
            const dy = Math.sign(pathfinding.targetPosition.y - pos.y);

            movement.dx = dx;
            movement.dy = dy;

            // Check if reached target
            if (pos.x === pathfinding.targetPosition.x &&
                pos.y === pathfinding.targetPosition.y) {

                pathfinding.targetPosition = undefined;
                movement.dx = 0;
                movement.dy = 0;

                // Generate arrival message
                generateMessage().then(message => {
                    world.addMessage({
                        entityId: entity.id,
                        entityType: 'npc',
                        message,
                        timestamp: currentTime,
                        position: pos
                    });
                });
            }
        }

        ai.nextMoveTime = currentTime + 200;
    }
} 