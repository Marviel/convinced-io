import { GameState } from '../network/types';
import {
    Entity,
    EntityId,
    Position,
} from './types';

interface Tile {
    baseLayer: number;  // Grass tile number
    objectLayer?: number;  // Log tile number
}

export class World {
    private entities: Map<EntityId, Entity> = new Map();
    private grid: Map<string, EntityId> = new Map();
    private tiles: Map<string, Tile> = new Map();

    constructor(public readonly width: number, public readonly height: number) {
        this.generateTerrain();
    }

    private generateTerrain() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const key = this.getGridKey(x, y);
                
                // Basic grass tile (18-26) There is no 20
                let baseLayer = 18 + Math.floor(Math.random() * 9);
                if (baseLayer === 20) {
                    baseLayer = 19;
                }

                const tile: Tile = {
                    baseLayer: baseLayer
                };

                // Add logs with low probability (1-8)
                // if (Math.random() < 0) {
                //     tile.objectLayer = 1 + Math.floor(Math.random() * 8);
                // }

                this.tiles.set(key, tile);
            }
        }
    }

    getTile(x: number, y: number): Tile | undefined {
        return this.tiles.get(this.getGridKey(x, y));
    }

    addEntity(entity: Entity) {
        this.entities.set(entity.id, entity);
        const pos = entity.components.position;
        if (pos) {
            this.updateGrid(entity.id, pos);
        }
    }

    removeEntity(entityId: EntityId) {
        const entity = this.entities.get(entityId);
        if (entity?.components.position) {
            this.removeFromGrid(entityId, entity.components.position);
        }
        this.entities.delete(entityId);
    }

    getEntity(entityId: EntityId) {
        return this.entities.get(entityId);
    }

    getAllEntities(): Entity[] {
        return Array.from(this.entities.values());
    }

    private getGridKey(x: number, y: number): string {
        return `${Math.floor(x)},${Math.floor(y)}`;
    }

    private updateGrid(entityId: EntityId, pos: Position) {
        const key = this.getGridKey(pos.x, pos.y);
        const oldKey = Array.from(this.grid.entries())
            .find(([_, id]) => id === entityId)?.[0];

        if (oldKey && oldKey !== key) {
            this.grid.delete(oldKey);
        }
        this.grid.set(key, entityId);
    }

    private removeFromGrid(entityId: EntityId, pos: Position) {
        const key = this.getGridKey(pos.x, pos.y);
        if (this.grid.get(key) === entityId) {
            this.grid.delete(key);
        }
    }

    isPositionOccupied(x: number, y: number): boolean {
        const key = this.getGridKey(x, y);
        const occupyingEntity = this.grid.get(key);
        if (!occupyingEntity) return false;

        const entity = this.entities.get(occupyingEntity);
        return entity?.components.collision?.solid ?? false;
    }

    moveEntity(entityId: EntityId, newX: number, newY: number): boolean {
        const entity = this.entities.get(entityId);
        if (!entity?.components.position) return false;

        // Check bounds
        if (newX < 0 || newX >= this.width || newY < 0 || newY >= this.height) {
            console.log(`Movement out of bounds: (${newX},${newY})`);
            return false;
        }

        // Check collisions
        if (this.isPositionOccupied(newX, newY)) {
            console.log(`Position occupied: (${newX},${newY})`);
            return false;
        }

        // Update position
        const oldPos = entity.components.position;
        this.removeFromGrid(entityId, oldPos);
        entity.components.position = { x: newX, y: newY };
        this.updateGrid(entityId, entity.components.position);
        return true;
    }

    debugGrid() {
        console.log('Current Grid State:');
        this.grid.forEach((entityId, key) => {
            const entity = this.entities.get(entityId);
            console.log(`${key}: ${entity?.type} (${entityId})`);
        });
    }

    saveState(): GameState {
        return {
            entities: Array.from(this.entities.entries()),
            grid: Array.from(this.grid.entries()),
            timestamp: Date.now()
        };
    }

    loadState(state: GameState) {
        this.entities = new Map(state.entities);
        this.grid = new Map(state.grid);
    }
} 