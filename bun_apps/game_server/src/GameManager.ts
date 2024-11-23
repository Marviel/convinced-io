import { systems } from './systems';
import type {
    Action,
    GameState,
} from './types';
import type { GameServerWebSocket } from './types/connection';
import { World } from './World';

interface GameInstance {
    world: World;
    gameLoopInterval: number;
    lastActiveTime: number;
    connections: Set<GameServerWebSocket>;
}

export class GameManager {
    private games: Map<string, GameInstance> = new Map();
    private readonly INACTIVE_TIMEOUT = 5 * 60 * 1000; // 5 minutes in ms
    private readonly AUTOSAVE_INTERVAL = 60 * 1000; // 1 minute in ms

    constructor() {
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
            connections: new Set()
        };

        this.games.set(gameId, gameInstance);
        return world;
    }

    joinGame(gameId: string, connection: GameServerWebSocket): boolean {
        const game = this.games.get(gameId);
        if (!game) return false;

        game.connections.add(connection);
        game.lastActiveTime = Date.now();
        return true;
    }

    leaveGame(gameId: string, connection: GameServerWebSocket) {
        const game = this.games.get(gameId);
        if (game) {
            game.connections.delete(connection);
            game.lastActiveTime = Date.now();
        }
    }

    processAction(gameId: string, action: Action) {
        const game = this.games.get(gameId);
        if (!game) return;

        game.lastActiveTime = Date.now();

        switch (action.type) {
            case 'MOVE':
                systems.moveSystem(game.world, action);
                break;
            case 'CHAT':
                // Process chat/speech actions
                break;
            case 'INTERACT':
                // Process interaction actions
                break;
        }

        // Broadcast new state to all connections
        this.broadcastGameState(gameId);
    }

    private startGameLoop(gameId: string, world: World): number {
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
        // await supabase.from('games').upsert({ id: gameId, state: gameState });
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
            timestamp: Date.now()
        };
    }

    private broadcastGameState(gameId: string) {
        const game = this.games.get(gameId);
        if (!game) return;


        console.log('Broadcasting game state');
        const gameState = this.worldToGameState(game.world);
        const message = JSON.stringify({
            type: 'STATE_UPDATE',
            state: gameState
        });

        for (const connection of game.connections) {
            console.log('Sending message to connection');
            connection.send(message);
        }
    }
} 