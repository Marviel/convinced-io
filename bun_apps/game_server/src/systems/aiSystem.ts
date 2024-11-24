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

            // TODO: bring back message processing.
            processMessage(
                ai.personality || "A friendly NPC",
                ai.processingMessage.message,
                pos,
                world.width
            ).then(response => {
                console.log('response', response);
                // Show thinking indicator
                entity.components.speech = {
                    message: response.message,
                    expiryTime: currentTime + 3000,
                    isThinking: true,
                    thinkingState: response.destinationChange ? 'changed' : 'notChanged'
                };

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

                // Check if we can path to this position
                const path = world.findPath(
                    {
                        x: pos.x,
                        y: pos.y
                    },
                    {
                        x: targetX,
                        y: targetY
                    }
                );

                if (path && path.length > 0) {
                    pathfinding.targetPosition = { x: targetX, y: targetY };
                    pathfinding.currentPath = path;
                    break;
                }
                attempts++;
            } while (attempts < 10);
        }

        // Move along path if we have one
        if (pathfinding.currentPath && pathfinding.currentPath.length > 0) {
            const nextPoint = pathfinding.currentPath[0];

            // Calculate direction to next point
            const dx = Math.sign(nextPoint.x - pos.x);
            const dy = Math.sign(nextPoint.y - pos.y);

            movement.dx = dx;
            movement.dy = dy;

            // If we've reached the next point, remove it from the path
            if (pos.x === nextPoint.x && pos.y === nextPoint.y) {
                pathfinding.currentPath.shift();

                // If path is empty and we're at target, clear target
                if (pathfinding.currentPath.length === 0 &&
                    pos.x === pathfinding.targetPosition?.x &&
                    pos.y === pathfinding.targetPosition?.y) {

                    pathfinding.targetPosition = undefined;
                    movement.dx = 0;
                    movement.dy = 0;

                    // Generate arrival message
                    // generateMessage().then(message => {
                    //     world.addMessage({
                    //         entityId: entity.id,
                    //         entityType: 'npc',
                    //         message,
                    //         timestamp: currentTime,
                    //         position: pos
                    //     });
                    // });
                }
            }
        } else if (pathfinding.targetPosition) {
            // Recalculate path if we have a target but no path
            const path = world.findPath(
                {
                    x: pos.x,
                    y: pos.y
                },
                {
                    x: pathfinding.targetPosition.x,
                    y: pathfinding.targetPosition.y
                }
            );

            if (path && path.length > 0) {
                pathfinding.currentPath = path;
            } else {
                // If we can't path to target, clear it
                pathfinding.targetPosition = undefined;
                movement.dx = 0;
                movement.dy = 0;
            }
        }


        // Only run if it's been 
        if (movement.lastMoveTime &&
            currentTime - movement.lastMoveTime < movement.moveInterval) {
            continue;
        }


        // Calculate new position
        const newX = pos.x + movement.dx;
        const newY = pos.y + movement.dy;

        if (movement.dx === 0 && movement.dy === 0) continue;

        // Try to move
        const moved = world.moveEntity(entity.id, newX, newY);

        if (moved) {
            movement.lastMoveTime = currentTime;

            // Update appearance if it exists
            if (entity.components.appearance) {
                if (movement.dx > 0) entity.components.appearance.direction = 'rt';
                else if (movement.dx < 0) entity.components.appearance.direction = 'lf';
                else if (movement.dy > 0) entity.components.appearance.direction = 'fr';
                else if (movement.dy < 0) entity.components.appearance.direction = 'bk';

                entity.components.appearance.isMoving = movement.dx !== 0 || movement.dy !== 0;
            }
        } else {
            // If we couldn't move, recalculate path
            pathfinding.currentPath = undefined;
        }
    }
} 