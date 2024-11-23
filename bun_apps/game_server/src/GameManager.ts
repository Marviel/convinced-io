import { SupabaseManager } from './SupabaseManager';
import { systems } from './systems';
import type {
    Action,
    GameState,
} from './types';
import { World } from './World';

interface GameInstance {
    world: World;
    gameLoopInterval: number;
    lastActiveTime: number;
    connections: Array<{ playerId: string }>;
}

export class GameManager {
    private games: Map<string, GameInstance> = new Map();
    private readonly INACTIVE_TIMEOUT = 5 * 60 * 1000; // 5 minutes in ms
    private readonly AUTOSAVE_INTERVAL = 60 * 1000; // 1 minute in ms
    private supabaseManager: SupabaseManager;

    constructor() {
        this.supabaseManager = new SupabaseManager(this);
        // Start cleanup interval
        setInterval(() => this.cleanupInactiveGames(), 60 * 1000);
        // Start autosave interval
        setInterval(() => this.autosaveGames(), this.AUTOSAVE_INTERVAL);
    }

    async createGame(gameId: string): Promise<World> {
        const world = new World(50, 50);
        await world.initialize();
        const gameLoopInterval = this.startGameLoop(gameId, world);

        const gameInstance: GameInstance = {
            world,
            gameLoopInterval,
            lastActiveTime: Date.now(),
            connections: []
        };

        this.games.set(gameId, gameInstance);
        return world;
    }


    processAction(gameId: string, action: Action) {
        console.log(`gameId: ${gameId} processing action ${JSON.stringify(action)}`);
        const game = this.games.get(gameId);
        if (!game) return;

        const playerId = action.playerId;

        // If we haven't seen this player yet, create them
        if (!game.connections.find(c => c.playerId === action.playerId)) {
            console.log(`gameId: ${gameId} creating player ${action.playerId}`);
            this.handleUserJoin(gameId, action.playerId);
        }

        switch (action.type) {
            case 'MOVE':
                systems.moveSystem(game.world, action);
                break;
            case 'CHAT':
                this.processChatAction(game.world, action);
                break;
            case 'INTERACT':
                // Process interaction actions
                break;
        }

        // Broadcast new state to all connections
        this.broadcastGameState(gameId);
    }

    handleUserJoin(gameId: string, playerId: string) {
        const game = this.games.get(gameId);
        if (!game) return;

        game.connections.push({ playerId });

        // Create the player
        game.world.createPlayer(playerId);
    }

    handleUserLeave(gameId: string, playerId: string) {
        const game = this.games.get(gameId);
        if (!game) return;

        game.connections = game.connections.filter(c => c.playerId !== playerId);
    }

    private startGameLoop(gameId: string, world: World): number {
        // Initialize channels
        this.supabaseManager.initializeChannels(gameId);

        return setInterval(() => {
            const game = this.games.get(gameId);
            if (!game) return;

            const currentTime = performance.now();

            // Track if state changed
            const oldState = this.worldToGameState(world);

            // Run systems
            systems.aiSystem(world, currentTime);
            systems.interactionSystem(world);
            systems.speechSystem(world, currentTime);

            // Only broadcast if state actually changed
            const newState = this.worldToGameState(world);
            if (JSON.stringify(oldState) !== JSON.stringify(newState)) {
                console.log('State changed');
                this.broadcastGameState(gameId);
            }
            else {
                // console.log('State did not change');
            }

        }, 1000 / 60) as unknown as number; // Run at 10 FPS instead of 60
    }

    private async autosaveGames() {
        for (const [gameId, game] of this.games.entries()) {
            try {
                // Save to database
                await this.saveGameState(gameId, game.world);
                console.log(`Autosaved game ${gameId}`);
            } catch (error) {
                console.error(`Failed to autosave game ${gameId}:`, error);
            }
        }
    }

    private async saveGameState(gameId: string, world: World) {
        // TODO: Implement save to database
        // This is where we'd save to Supabase
        const gameState = this.worldToGameState(world);
        // await this.supabaseManager.(gameId, gameState);
    }

    private cleanupInactiveGames() {
        const now = Date.now();
        for (const [gameId, game] of this.games.entries()) {
            if (game.connections.size === 0 &&
                now - game.lastActiveTime > this.INACTIVE_TIMEOUT) {
                // Save one last time before cleanup
                this.saveGameState(gameId, game.world)
                    .then(() => {
                        // Clear intervals and remove game
                        clearInterval(game.gameLoopInterval);
                        this.games.delete(gameId);
                        console.log(`Cleaned up inactive game ${gameId}`);
                    })
                    .catch(error => {
                        console.error(`Failed to save game ${gameId} during cleanup:`, error);
                    });
            }
        }
    }

    private worldToGameState(world: World): GameState {
        return {
            entities: Array.from(world.getAllEntities()).map(entity => [entity.id, entity]),
            grid: Array.from(world.getGrid()),
            timestamp: Date.now(),
            messages: world.getMessageLog()
        };
    }

    private broadcastGameState(gameId: string) {
        const game = this.games.get(gameId);
        if (!game) return;

        this.supabaseManager.broadcastGameState(gameId, this.worldToGameState(game.world));
    }

    private processChatAction(world: World, action: Action) {
        console.log(`Processing chat action: ${action.payload.message}`);
        // Find the speaking player
        const player = world.getAllEntities().find(e => e.id === 'player');
        if (!player?.components.position || !player.components.interactable) return;

        const playerPos = player.components.position;
        const interactionRadius = player.components.interactable.radius;

        const now = Date.now();

        // Add message to world's message log
        world.addMessage({
            entityId: player.id,
            entityType: 'player',
            message: action.payload.message,
            timestamp: now,
            position: playerPos
        });

        // Set player's speech bubble with expiry time
        player.components.speech = {
            message: action.payload.message,
            expiryTime: now + 10000, // 10 seconds from now
            fadeStartTime: now + 8000 // Start fading 8 seconds from now
        };

        // Find NPCs in range
        for (const entity of world.getAllEntities()) {
            if (entity.type !== 'npc') continue;

            const npcPos = entity.components.position;
            if (!npcPos) continue;

            // Calculate distance
            const dx = npcPos.x - playerPos.x;
            const dy = npcPos.y - playerPos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // If NPC is in range, make them process the message
            if (distance <= interactionRadius) {
                const ai = entity.components.ai;
                if (!ai) continue;

                // Show thinking indicator
                entity.components.speech = {
                    message: "!",
                    expiryTime: now + 3000,
                    isThinking: true,
                    thinkingState: 'listening'
                };

                // Stop the NPC
                if (entity.components.movement) {
                    entity.components.movement.dx = 0;
                    entity.components.movement.dy = 0;
                }

                // Set processing state
                ai.processingMessage = {
                    message: action.payload.message,
                    fromEntity: player.id,
                    processStartTime: now
                };
            }
        }
    }
} 