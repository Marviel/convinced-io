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
                isThinking: true,
                thinkingState: 'listening'
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
                    world.addMessage({
                        entityId: entity.id,
                        entityType: 'npc',
                        message: response.message,
                        timestamp: currentTime,
                        position: { x: position.x, y: position.y }
                    });

                    const isChangingDirection = !!response.destinationChange;

                    // Show thinking state
                    entity.components.speech = {
                        message: "!",
                        expiryTime: currentTime + 1000,
                        isThinking: true,
                        thinkingState: isChangingDirection ? 'changed' : 'notChanged'
                    };

                    // Update destination if needed
                    if (response.destinationChange) {
                        setTimeout(() => {
                            entity.components.speech = {
                                message: response.message,
                                expiryTime: currentTime + 3000
                            };

                            if (response.destinationChange) {
                                pathfinding.targetPosition = {
                                    x: response.destinationChange.x,
                                    y: response.destinationChange.y
                                };
                            }
                        }, 1000);
                    } else {
                        // If not changing direction, show message after brief pause
                        setTimeout(() => {
                            entity.components.speech = {
                                message: response.message,
                                expiryTime: currentTime + 3000
                            };
                        }, 1000);
                    }
                });

                // Clear processing state
                ai.processingMessage = undefined;
            }

            continue; // Skip normal movement while processing
        }

        // Pick initial destination if none exists
        if (!pathfinding.targetPosition) {
            let targetX, targetY;
            let attempts = 0;
            do {
                targetX = Math.floor(Math.random() * world.width);
                targetY = Math.floor(Math.random() * world.height);
                attempts++;
            } while (world.isPositionOccupied(targetX, targetY) && attempts < 10);

            if (attempts < 10) {
                pathfinding.targetPosition = { x: targetX, y: targetY };
            }
        }

        // Always try to update path if we have a target but no path
        if (pathfinding.targetPosition && (!pathfinding.currentPath || pathfinding.pathIndex === undefined)) {
            const path = pathfinder.findPath(position, pathfinding.targetPosition);
            if (path) {
                pathfinding.currentPath = path;
                pathfinding.pathIndex = 0;
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
                // Reached end of path
                movement.dx = 0;
                movement.dy = 0;
                pathfinding.targetPosition = undefined;
                pathfinding.currentPath = undefined;
                pathfinding.pathIndex = undefined;

                // Generate arrival message
                if (!entity.components.speech) {
                    generateMessage().then(message => {
                        entity.components.speech = {
                            message,
                            expiryTime: currentTime + 3000,
                        };
                    });
                }
            }
        }

        // Handle destination changes from message processing
        if (pathfinding.targetPosition && !pathfinding.currentPath) {
            const newPath = pathfinder.findPath(position, pathfinding.targetPosition);
            if (newPath) {
                pathfinding.currentPath = newPath;
                pathfinding.pathIndex = 0;
            }
        }

        ai.nextMoveTime = currentTime + 200;
    }
} 