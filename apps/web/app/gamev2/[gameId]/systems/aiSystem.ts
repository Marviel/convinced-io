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
import { WorldManager } from '../world/WorldManager';

const THINKING_TIME = 2000; // Time to process a message in ms

const aiQuery = defineQuery([AI, Position, Movement, Pathfinding]);

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

async function processMessage(personality: string, message: string): Promise<{
    message: string;
    destinationChange: { x: number; y: number; } | null;
}> {
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
                                x: { type: 'number' },
                                y: { type: 'number' }
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

export function aiSystem(world: WorldManager, currentTime: number) {
    const entities = aiQuery(world.world);

    for (const eid of entities) {
        // Initialize values if undefined
        AI.nextMoveTime[eid] = AI.nextMoveTime[eid] ?? 0;
        AI.processingMessage[eid] = AI.processingMessage[eid] ?? 0;
        AI.personalityIndex[eid] = AI.personalityIndex[eid] ?? 0;
        Pathfinding.hasTarget[eid] = Pathfinding.hasTarget[eid] ?? 0;
        Position.x[eid] = Position.x[eid] ?? 0;
        Position.y[eid] = Position.y[eid] ?? 0;
        Pathfinding.targetX[eid] = Pathfinding.targetX[eid] ?? 0;
        Pathfinding.targetY[eid] = Pathfinding.targetY[eid] ?? 0;

        // Handle message processing
        if (AI.processingMessage[eid]) {
            // Show thinking indicator
            const messageIndex = world.addMessage("!");

            // Add Speech component if it doesn't exist
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
            if (currentTime - AI.nextMoveTime[eid] >= THINKING_TIME) {
                const personality = world.personalityPool[AI.personalityIndex[eid] || 0] || "A friendly NPC";
                const currentMessageIndex = Speech.messageIndex[eid] || 0;
                const message = world.getMessage(currentMessageIndex) || "";

                processMessage(personality, message).then(response => {
                    const responseMessageIndex = world.addMessage(response.message);
                    Speech.messageIndex[eid] = responseMessageIndex;
                    Speech.expiryTime[eid] = currentTime + 3000;

                    const isChangingDirection = !!response.destinationChange;
                    Speech.thinkingState[eid] = isChangingDirection ? 2 : 3; // changed : notChanged

                    if (response.destinationChange) {
                        setTimeout(() => {
                            if (response.destinationChange) {
                                Pathfinding.targetX[eid] = response.destinationChange.x;
                                Pathfinding.targetY[eid] = response.destinationChange.y;
                                Pathfinding.hasTarget[eid] = 1;
                            }
                        }, 1000);
                    }
                });

                // Clear processing state
                AI.processingMessage[eid] = 0;
            }

            continue; // Skip normal movement while processing
        }

        // Pick initial destination if none exists
        if (!Pathfinding.hasTarget[eid]) {
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
        }

        // Move towards target
        if (Pathfinding.hasTarget[eid]) {
            const dx = Math.sign(Pathfinding.targetX[eid] - Position.x[eid]);
            const dy = Math.sign(Pathfinding.targetY[eid] - Position.y[eid]);

            Movement.dx[eid] = dx;
            Movement.dy[eid] = dy;

            // Check if reached target
            if (Position.x[eid] === Pathfinding.targetX[eid] &&
                Position.y[eid] === Pathfinding.targetY[eid]) {

                Pathfinding.hasTarget[eid] = 0;
                Movement.dx[eid] = 0;
                Movement.dy[eid] = 0;

                // Generate arrival message
                generateMessage().then(message => {
                    const messageIndex = world.addMessage(message);

                    // Add Speech component if it doesn't exist
                    if (!hasComponent(world.world, Speech, eid)) {
                        addComponent(world.world, Speech, eid);
                    }

                    Speech.messageIndex[eid] = messageIndex;
                    Speech.expiryTime[eid] = currentTime + 3000;
                });
            }
        }

        AI.nextMoveTime[eid] = currentTime + 200;
    }
} 