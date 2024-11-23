import type {
    Entity,
    Position,
} from './types';

interface Tile {
    baseLayer: number;  // Grass tile number
    objectLayer?: number;  // Structure number
}

const AVAILABLE_SPRITES = ['mnt1', 'wmn3', 'amg2', 'man4', 'wmg3', 'npc1', 'bmg1', 'nja3', 'dvl1', 'npc3', 'scr1', 'pdn4', 'pdn2', 'nja1', 'ftr2', 'knt4', 'ygr1', 'wnv3', 'thf3', 'wnv2'];
const NUM_NPCS = 5;

export class World {
    private entities: Map<string, Entity> = new Map();
    private grid: Map<string, string> = new Map(); // gridKey -> entityId
    private tiles: Map<string, Tile> = new Map();
    private messageLog: Array<{
        entityId: string;
        entityType: 'player' | 'npc';
        message: string;
        timestamp: number;
        position: Position;
    }> = [];

    constructor(
        public readonly width: number,
        public readonly height: number
    ) {
    }

    async initialize() {
        await this.generateTerrain();
        await this.initializeEntities();
    }

    private async initializeEntities() {
        // Create player at center
        this.createPlayer(
            Math.floor(this.width / 2),
            Math.floor(this.height / 2)
        );

        // Create NPCs
        await this.createInitialNPCs();

        // Create structures
        this.createInitialStructures();
    }

    private createPlayer(x: number, y: number) {
        const entity: Entity = {
            id: 'player',
            type: 'player',
            components: {
                position: { x, y },
                appearance: {
                    sprite: AVAILABLE_SPRITES[Math.floor(Math.random() * AVAILABLE_SPRITES.length)],
                    direction: 'fr',
                    isMoving: false
                },
                movement: {
                    dx: 0,
                    dy: 0,
                    speed: 1,
                    moveInterval: 100
                },
                collision: { solid: true },
                interactable: { radius: 5 }
            }
        };

        this.addEntity(entity);
        return entity;
    }

    private async createInitialNPCs(count: number = NUM_NPCS) {
        for (let i = 0; i < count; i++) {
            let x, y;
            do {
                x = Math.floor(Math.random() * this.width);
                y = Math.floor(Math.random() * this.height);
            } while (this.isPositionOccupied(x, y));

            // TODO: Generate personality for NPC
            // const personality = await genObject({
            //     schema: z.object({
            //         personality: z.string()
            //     }),
            //     prompt: "Generate a brief, interesting personality description for an NPC in a game. Make it quirky and unique, but keep it under 50 words."
            // });

            const npc: Entity = {
                id: `npc-${i}`,
                type: 'npc',
                components: {
                    position: { x, y },
                    appearance: {
                        sprite: AVAILABLE_SPRITES[Math.floor(Math.random() * AVAILABLE_SPRITES.length)],
                        direction: ['fr', 'bk', 'lf', 'rt'][Math.floor(Math.random() * 4)] as 'fr' | 'bk' | 'lf' | 'rt',
                        isMoving: false
                    },
                    movement: {
                        dx: 0,
                        dy: 0,
                        speed: 1,
                        moveInterval: 500
                    },
                    collision: { solid: true },
                    ai: {
                        type: 'random',
                        nextMoveTime: 0,
                        // personality: personality.personality
                        personality: 'You are an NPC with a quirky personality.'
                    },
                    pathfinding: {}
                }
            };

            this.addEntity(npc);
        }
    }

    private createInitialStructures() {


        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (Math.random() < 0.1 && !this.isPositionOccupied(x, y)) {
                    const structure: Entity = {
                        id: `structure-${x}-${y}`,
                        type: 'structure',
                        components: {
                            position: { x, y },
                            appearance: {
                                structure: true,
                                structureNumber: 1 + Math.floor(Math.random() * 8)
                            },
                            collision: { solid: true }
                        }
                    };
                    this.addEntity(structure);
                }

                if (x === 0 && y === 0) {
                    const structure: Entity = {
                        id: `structure-${x}-${y}`,
                        type: 'structure',
                        components: {
                            position: { x, y },
                            appearance: {
                                structure: true,
                                structureNumber: 30
                            },
                            collision: { solid: true }
                        }
                    };
                    this.addEntity(structure);
                }
            }
        }
    }

    private generateTerrain() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const key = this.getGridKey(x, y);

                // Basic grass tile
                const tile: Tile = {
                    baseLayer: 18 // Grass tile
                };

                this.tiles.set(key, tile);
            }
        }
    }

    private getGridKey(x: number, y: number): string {
        return `${Math.floor(x)},${Math.floor(y)}`;
    }

    addEntity(entity: Entity) {
        this.entities.set(entity.id, entity);
        const pos = entity.components.position;
        if (pos) {
            this.updateGrid(entity.id, pos);
        }
    }

    removeEntity(entityId: string) {
        const entity = this.entities.get(entityId);
        if (entity?.components.position) {
            this.removeFromGrid(entityId, entity.components.position);
        }
        this.entities.delete(entityId);
    }

    private updateGrid(entityId: string, pos: Position) {
        const key = this.getGridKey(pos.x, pos.y);
        const oldKey = Array.from(this.grid.entries())
            .find(([_, id]) => id === entityId)?.[0];

        if (oldKey && oldKey !== key) {
            this.grid.delete(oldKey);
        }
        this.grid.set(key, entityId);
    }

    private removeFromGrid(entityId: string, pos: Position) {
        const key = this.getGridKey(pos.x, pos.y);
        if (this.grid.get(key) === entityId) {
            this.grid.delete(key);
        }
    }

    isPositionOccupied(x: number, y: number): boolean {
        const key = this.getGridKey(x, y);
        const occupyingEntityId = this.grid.get(key);
        if (!occupyingEntityId) return false;

        const entity = this.entities.get(occupyingEntityId);
        return entity?.components.collision?.solid ?? false;
    }

    moveEntity(entityId: string, newX: number, newY: number): boolean {
        const entity = this.entities.get(entityId);
        if (!entity?.components.position) return false;

        // Check bounds
        if (newX < 0 || newX >= this.width || newY < 0 || newY >= this.height) {
            return false;
        }

        // Check collisions
        if (this.isPositionOccupied(newX, newY)) {
            return false;
        }

        // Update position
        const oldPos = entity.components.position;
        this.removeFromGrid(entityId, oldPos);
        entity.components.position = { x: newX, y: newY };
        this.updateGrid(entityId, entity.components.position);
        return true;
    }

    getAllEntities(): Entity[] {
        return Array.from(this.entities.values());
    }

    getEntity(entityId: string): Entity | undefined {
        return this.entities.get(entityId);
    }

    getTile(x: number, y: number): Tile | undefined {
        return this.tiles.get(this.getGridKey(x, y));
    }

    addMessage(message: {
        entityId: string;
        entityType: 'player' | 'npc';
        message: string;
        timestamp: number;
        position: Position;
    }) {
        this.messageLog.push(message);
        // Limit log size
        if (this.messageLog.length > 100) {
            this.messageLog.shift();
        }
    }

    getMessageLog() {
        return [...this.messageLog];
    }

    getGrid(): [string, string][] {
        return Array.from(this.grid.entries());
    }
} 