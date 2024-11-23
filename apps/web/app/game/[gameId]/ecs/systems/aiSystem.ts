import { Pathfinder } from '../utils/Pathfinder';
import { World } from '../World';

let pathfinder: Pathfinder | null = null;

interface AIState {
    lastPosition?: { x: number; y: number };
}

const aiStates = new Map<string, AIState>();
const THINKING_TIME = 2000; // Time to process a message

interface ThinkResponse {
    message: string;
    destinationChange: {
        x: number;
        y: number;
    } | null;
}

async function generateMessage(): Promise<string> {
    try {
        const response = await fetch('/api/genObject', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                schema: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' },
                    },
                    required: ['message'],
                },
                temperature: 1.0,
                prompt: "Generate a short, funny message that an NPC might say when reaching their destination. Keep it under 40 characters.",
            }),
        });

        const result = await response.json();
        return result.message;
    } catch (error) {
        console.error('Error generating message:', error);
        return "I made it!"; // Fallback message
    }
}

async function processMessage(personality: string, message: string): Promise<ThinkResponse> {
    try {
        const response = await fetch('/api/genObject', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                schema: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' },
                        destinationChange: {
                            type: ['object', 'null'],
                            properties: {
                                x: { type: 'number', description: 'The new destination X Coord' },
                                y: { type: 'number', description: 'The new destination Y Coord' }
                            },
                            required: ['x', 'y']
                        }
                    },
                    required: ['message', 'destinationChange']
                },
                prompt: `You are an NPC with the following personality: ${personality}. 
                        Someone just told you: "${message}". 
                        How do you respond, and does this make you want to change where you're going?
                        If you decide to change destination, ensure coordinates are within 0-50.`,
            }),
        });

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error processing message:', error);
        return {
            message: "Hmm... interesting.",
            destinationChange: null
        };
    }
}

export function aiSystem(world: World, currentTime: number) {
    // Initialize or update pathfinder
    if (!pathfinder) {
        pathfinder = new Pathfinder(world.width, world.height);
    }

    // Update obstacle map
    for (const entity of world.getAllEntities()) {
        if (entity.components.collision?.solid) {
            const pos = entity.components.position;
            if (pos) {
                pathfinder.updateObstacle(pos.x, pos.y, true);
            }
        }
    }

    // Process AI entities
    for (const entity of world.getAllEntities()) {
        const ai = entity.components.ai;
        const pathfinding = entity.components.pathfinding;
        const movement = entity.components.movement;
        const position = entity.components.position;

        if (!ai || !pathfinding || !movement || !position || entity.type !== 'npc') continue;

        // Handle message processing
        if (ai.processingMessage) {
            // Show thinking indicator
            entity.components.speech = {
                message: "!",
                expiryTime: currentTime + 1000,
                isThinking: true
            };

            // Stop moving while processing
            movement.dx = 0;
            movement.dy = 0;

            // After thinking time, process message
            if (currentTime - ai.processingMessage.processStartTime >= THINKING_TIME) {
                processMessage(
                    ai.personality || "A friendly NPC",
                    ai.processingMessage.message
                ).then(response => {
                    // Log the message
                    world.addMessage({
                        entityId: entity.id,
                        entityType: 'npc',
                        message: response.message,
                        timestamp: currentTime,
                        position: { ...position }
                    });

                    // Show response
                    entity.components.speech = {
                        message: response.message,
                        expiryTime: currentTime + 3000,
                        isThinking: true,
                        isChangingDirection: !!response.destinationChange
                    };

                    // Update destination if needed
                    if (response.destinationChange) {
                        const newDestination = response.destinationChange; // Temporary variable to handle null
                        if (newDestination) { // Check if not null
                            pathfinding.targetPosition = newDestination;
                            const path = pathfinder?.findPath(
                                position,
                                newDestination // Use the temporary variable
                            );
                            if (path) {
                                pathfinding.currentPath = path;
                                pathfinding.pathIndex = 0;
                            }
                        }
                    } else {
                        // If not changing direction, immediately show message
                        entity.components.speech = {
                            message: response.message,
                            expiryTime: currentTime + 3000
                        };
                    }
                });

                // Clear processing state
                ai.processingMessage = undefined;
            }

            continue; // Skip normal movement while processing
        }

        let state = aiStates.get(entity.id) || {};
        aiStates.set(entity.id, state);

        if (currentTime >= ai.nextMoveTime) {
            // Normal pathfinding behavior
            if (!pathfinding.targetPosition) {
                // Pick new random destination
                let targetX, targetY;
                let attempts = 0;
                do {
                    targetX = Math.floor(Math.random() * world.width);
                    targetY = Math.floor(Math.random() * world.height);
                    attempts++;
                } while (world.isPositionOccupied(targetX, targetY) && attempts < 10);

                if (attempts < 10) {
                    pathfinding.targetPosition = { x: targetX, y: targetY };
                    const path = pathfinder.findPath(
                        position,
                        pathfinding.targetPosition
                    );
                    if (path) {
                        pathfinding.currentPath = path;
                        pathfinding.pathIndex = 0;
                    }
                }
            }

            // Follow current path
            if (pathfinding.currentPath && pathfinding.pathIndex !== undefined) {
                const nextPoint = pathfinding.currentPath[pathfinding.pathIndex];

                if (nextPoint) {
                    movement.dx = Math.sign(nextPoint.x - position.x);
                    movement.dy = Math.sign(nextPoint.y - position.y);

                    if (position.x === nextPoint.x && position.y === nextPoint.y) {
                        pathfinding.pathIndex++;
                    }
                } else {
                    // Reached destination - generate message
                    movement.dx = 0;
                    movement.dy = 0;

                    // Only generate message if we don't already have one
                    if (!entity.components.speech) {
                        generateMessage().then(message => {
                            // Log the arrival message
                            world.addMessage({
                                entityId: entity.id,
                                entityType: 'npc',
                                message: message,
                                timestamp: currentTime,
                                position: { ...position }
                            });

                            entity.components.speech = {
                                message,
                                expiryTime: currentTime + 3000,
                            };
                        });
                    }

                    pathfinding.targetPosition = undefined;
                    pathfinding.currentPath = undefined;
                    pathfinding.pathIndex = undefined;
                }
            }

            // Update last position for next cycle
            state.lastPosition = { ...position };
            ai.nextMoveTime = currentTime + 200;
        }
    }
} 