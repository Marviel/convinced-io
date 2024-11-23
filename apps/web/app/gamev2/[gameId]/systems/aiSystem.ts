import {
    addComponent,
    defineQuery,
    hasComponent,
} from 'bitecs';

import {
    AI,
    Movement,
    Pathfinding,
    Position,
    Speech,
} from '../components';
import { findPath } from '../utils/pathfinder';
import { WorldManager } from '../world/WorldManager';

const THINKING_TIME = 2000; // Time to process a message in ms

// Define query for AI entities
const aiQuery = defineQuery([AI, Position, Movement, Pathfinding]);

function getTerrainMap(world: WorldManager, centerX: number, centerY: number, radius: number = 5): string {
    let map = '';
    for (let y = centerY - radius; y <= centerY + radius; y++) {
        for (let x = centerX - radius; x <= centerX + radius; x++) {
            if (x === centerX && y === centerY) {
                map += '@'; // NPC position
            } else if (x < 0 || x >= world.width || y < 0 || y >= world.height) {
                map += '#'; // Out of bounds
            } else if (world.isPositionOccupied(x, y)) {
                map += 'X'; // Obstacle
            } else {
                map += '.'; // Empty space
            }
        }
        map += '\n';
    }
    return map;
}

async function processMessage(
    world: WorldManager,
    eid: number,
    personality: string,
    message: string
): Promise<{
    message: string;
    destinationChange: { x: number; y: number; } | null;
}> {
    try {
        const npcX = Position.x[eid] ?? 0;
        const npcY = Position.y[eid] ?? 0;
        const terrainMap = getTerrainMap(world, npcX, npcY);

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
                                x: { type: 'number' },
                                y: { type: 'number' }
                            },
                            required: ['x', 'y']
                        }
                    },
                    required: ['message', 'destinationChange']
                },
                prompt: `You are an NPC with the following personality: ${personality}.
                        You are currently at position (${npcX}, ${npcY}).
                        Here is a map of your surroundings (@ is you, X is obstacle, . is empty space):
                        ${terrainMap}
                        Someone just told you: "${message}".
                        How do you respond, and does this make you want to change where you're going?
                        If you decide to change destination, ensure coordinates are within 0-${world.width}.
                        Consider the terrain - try to pick a destination that seems reachable.`,
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

export function aiSystem(world: WorldManager, currentTime: number) {
    const entities = aiQuery(world.world);

    for (const eid of entities) {
        // Initialize values if undefined
        AI.nextMoveTime[eid] = AI.nextMoveTime[eid] ?? 0;
        AI.processingMessage[eid] = AI.processingMessage[eid] ?? 0;
        AI.processingStartTime[eid] = AI.processingStartTime[eid] ?? 0;
        AI.processingMessageIndex[eid] = AI.processingMessageIndex[eid] ?? 0;
        Position.x[eid] = Position.x[eid] ?? 0;
        Position.y[eid] = Position.y[eid] ?? 0;
        Pathfinding.hasTarget[eid] = Pathfinding.hasTarget[eid] ?? 0;

        // Handle message processing
        if (AI.processingMessage[eid]) {
            // Show thinking indicator
            const messageIndex = world.addMessage("!");
            if (!hasComponent(world.world, Speech, eid)) {
                addComponent(world.world, Speech, eid);
            }
            Speech.messageIndex[eid] = messageIndex;
            Speech.expiryTime[eid] = currentTime + 1000;
            Speech.isThinking[eid] = 1;
            Speech.thinkingState[eid] = 1; // listening

            // Stop moving while processing
            Movement.dx[eid] = 0;
            Movement.dy[eid] = 0;

            // After thinking time, process message
            if (currentTime - AI.processingStartTime[eid] >= THINKING_TIME) {
                const personality = world.personalityPool[AI.personalityIndex[eid] ?? 0] || "A friendly NPC";
                const message = world.getMessage(AI.processingMessageIndex[eid] ?? 0) || "";

                processMessage(world, eid, personality, message).then(response => {
                    const responseMessageIndex = world.addMessage(response.message);

                    if (!hasComponent(world.world, Speech, eid)) {
                        addComponent(world.world, Speech, eid);
                    }
                    Speech.messageIndex[eid] = responseMessageIndex;
                    Speech.expiryTime[eid] = currentTime + 3000;

                    const isChangingDirection = !!response.destinationChange;
                    Speech.thinkingState[eid] = isChangingDirection ? 2 : 3; // changed : notChanged

                    if (response.destinationChange) {
                        console.log(`Changing destination from ${Position.x[eid]},${Position.y[eid]} to ${response.destinationChange.x},${response.destinationChange.y}`);
                        setTimeout(() => {
                            if (response.destinationChange) {
                                Pathfinding.targetX[eid] = response.destinationChange.x;
                                Pathfinding.targetY[eid] = response.destinationChange.y;
                                Pathfinding.hasTarget[eid] = 1;
                                Pathfinding.pathIndex[eid] = undefined; // Clear existing path
                            }
                        }, 1000);
                    }
                });

                // Clear processing state
                AI.processingMessage[eid] = 0;
            }

            continue; // Skip normal movement while processing
        }

        // Always try to update path if we have a target but no path
        if (Pathfinding.hasTarget[eid] && !Pathfinding.pathIndex[eid]) {
            const path = findPath(
                { x: Position.x[eid], y: Position.y[eid] },
                { x: Pathfinding.targetX[eid], y: Pathfinding.targetY[eid] },
                world.width,
                world.height,
                (x, y) => !world.isPositionOccupied(x, y)
            );

            if (path.length > 0) {
                const pathIndex = world.addPath(path);
                Pathfinding.pathIndex[eid] = pathIndex;
            } else {
                // If no path found, clear target
                Pathfinding.hasTarget[eid] = 0;
            }
        }

        // Move along path
        if (Pathfinding.hasTarget[eid] && Pathfinding.pathIndex[eid] !== undefined) {
            const path = world.getPath(Pathfinding.pathIndex[eid]);
            if (path && path.length > 0) {
                const nextPoint = path[0];
                Movement.dx[eid] = Math.sign(nextPoint.x - Position.x[eid]);
                Movement.dy[eid] = Math.sign(nextPoint.y - Position.y[eid]);

                // If we've reached the next point, remove it from the path
                if (Position.x[eid] === nextPoint.x && Position.y[eid] === nextPoint.y) {
                    path.shift();
                    if (path.length === 0) {
                        // Reached destination
                        Pathfinding.hasTarget[eid] = 0;
                        Pathfinding.pathIndex[eid] = 0; // Changed from undefined to 0
                        Movement.dx[eid] = 0;
                        Movement.dy[eid] = 0;

                        // Generate arrival message
                        generateMessage().then(message => {
                            const messageIndex = world.addMessage(message);
                            if (!hasComponent(world.world, Speech, eid)) {
                                addComponent(world.world, Speech, eid);
                            }
                            Speech.messageIndex[eid] = messageIndex;
                            Speech.expiryTime[eid] = currentTime + 3000;
                        });
                    }
                }
            }
        }

        // Pick new destination if none exists
        if (!Pathfinding.hasTarget[eid] && currentTime >= AI.nextMoveTime[eid]) {
            let targetX, targetY;
            let attempts = 0;
            do {
                targetX = Math.floor(Math.random() * world.width);
                targetY = Math.floor(Math.random() * world.height);
                attempts++;
            } while (world.isPositionOccupied(targetX, targetY) && attempts < 10);

            if (attempts < 10) {
                Pathfinding.targetX[eid] = targetX;
                Pathfinding.targetY[eid] = targetY;
                Pathfinding.hasTarget[eid] = 1;
            }

            AI.nextMoveTime[eid] = currentTime + 1000; // Wait a second before trying again
        }
    }
} 