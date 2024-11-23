import {
    addComponent,
    addEntity,
    createWorld,
    IWorld,
} from 'bitecs';

import {
    AI,
    Appearance,
    Collision,
    EntityType,
    Interactable,
    Movement,
    Pathfinding,
    Position,
} from '../components';
import {
    AVAILABLE_SPRITES,
    STRUCTURE_TILES,
} from '../constants';

// Constants
export const ENTITY_TYPES = {
    PLAYER: 0,
    NPC: 1,
    STRUCTURE: 2
} as const;

export const DIRECTIONS = {
    FRONT: 0,
    BACK: 1,
    LEFT: 2,
    RIGHT: 3
} as const;

export class WorldManager {
    world: IWorld;
    messagePool: string[] = [];
    personalityPool: string[] = [];
    spritePool: string[] = [];
    pathPool: Array<Array<{ x: number, y: number }>> = [];
    private grid: Map<string, number> = new Map();
    private tiles: Map<string, { baseLayer: number }> = new Map();

    constructor(
        public readonly width: number,
        public readonly height: number
    ) {
        this.world = createWorld();
        this.initializeWorld();
    }

    private getGridKey(x: number, y: number): string {
        return `${Math.floor(x)},${Math.floor(y)}`;
    }

    private updateGrid(eid: number, x: number, y: number) {
        const key = this.getGridKey(x, y);
        this.grid.set(key, eid);
    }

    isPositionOccupied(x: number, y: number): boolean {
        const key = this.getGridKey(x, y);
        const occupyingEid = this.grid.get(key);
        if (!occupyingEid) return false;

        return Collision.solid[occupyingEid] === 1;
    }

    private initializeWorld() {
        // Initialize grass tiles
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                this.setTile(x, y, { baseLayer: STRUCTURE_TILES.GRASS });
            }
        }

        // Create player at center
        this.createPlayer(
            Math.floor(this.width / 2),
            Math.floor(this.height / 2)
        );

        // Create NPCs
        this.createInitialNPCs();

        // Create structures
        this.createInitialStructures();
    }

    createPlayer(x: number, y: number) {
        const eid = addEntity(this.world);

        // Add components
        addComponent(this.world, Position, eid);
        Position.x[eid] = x;
        Position.y[eid] = y;

        addComponent(this.world, Movement, eid);
        Movement.speed[eid] = 1;
        Movement.moveInterval[eid] = 100;

        addComponent(this.world, Appearance, eid);
        addComponent(this.world, Collision, eid);
        addComponent(this.world, Interactable, eid);
        addComponent(this.world, EntityType, eid);

        EntityType.type[eid] = ENTITY_TYPES.PLAYER;
        Collision.solid[eid] = 1;
        Interactable.radius[eid] = 5;

        const randomSprite = AVAILABLE_SPRITES[Math.floor(Math.random() * AVAILABLE_SPRITES.length)];
        if (randomSprite) {
            const spriteIndex = this.addSprite(randomSprite);
            Appearance.spriteIndex[eid] = spriteIndex;
            Appearance.direction[eid] = DIRECTIONS.FRONT;
            Appearance.isMoving[eid] = 0;
        }

        this.updateGrid(eid, x, y);

        return eid;
    }

    createNPC(x: number, y: number) {
        const eid = addEntity(this.world);

        // Add components
        addComponent(this.world, Position, eid);
        Position.x[eid] = x;
        Position.y[eid] = y;

        addComponent(this.world, Movement, eid);
        Movement.speed[eid] = 1;
        Movement.moveInterval[eid] = 500;

        addComponent(this.world, Appearance, eid);
        addComponent(this.world, Collision, eid);
        addComponent(this.world, AI, eid);
        addComponent(this.world, EntityType, eid);
        addComponent(this.world, Pathfinding, eid);

        EntityType.type[eid] = ENTITY_TYPES.NPC;
        Collision.solid[eid] = 1;
        AI.type[eid] = 0; // Random movement

        const randomSprite = AVAILABLE_SPRITES[Math.floor(Math.random() * AVAILABLE_SPRITES.length)];
        if (randomSprite) {
            const spriteIndex = this.addSprite(randomSprite);
            Appearance.spriteIndex[eid] = spriteIndex;
            Appearance.direction[eid] = Math.floor(Math.random() * 4);
            Appearance.isMoving[eid] = 0;
        }

        // Initialize with a random destination
        let targetX, targetY;
        let attempts = 0;
        do {
            targetX = Math.floor(Math.random() * this.width);
            targetY = Math.floor(Math.random() * this.height);
            attempts++;
        } while (this.isPositionOccupied(targetX, targetY) && attempts < 10);

        if (attempts < 10) {
            Pathfinding.targetX[eid] = targetX;
            Pathfinding.targetY[eid] = targetY;
            Pathfinding.hasTarget[eid] = 1;
        }

        this.updateGrid(eid, x, y);

        return eid;
    }

    createStructure(x: number, y: number) {
        const eid = addEntity(this.world);

        addComponent(this.world, Position, eid);
        Position.x[eid] = x;
        Position.y[eid] = y;

        addComponent(this.world, Appearance, eid);
        addComponent(this.world, Collision, eid);
        addComponent(this.world, EntityType, eid);

        EntityType.type[eid] = ENTITY_TYPES.STRUCTURE;
        Collision.solid[eid] = 1;

        // Set structure appearance
        Appearance.spriteIndex[eid] = STRUCTURE_TILES.STUMP;

        this.updateGrid(eid, x, y);

        return eid;
    }

    private createInitialNPCs(count: number = 5) {
        for (let i = 0; i < count; i++) {
            let x, y;
            do {
                x = Math.floor(Math.random() * this.width);
                y = Math.floor(Math.random() * this.height);
            } while (this.isPositionOccupied(x, y));

            this.createNPC(x, y);
        }
    }

    private createInitialStructures() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (Math.random() < 0.1 && !this.isPositionOccupied(x, y)) {
                    this.createStructure(x, y);
                }
            }
        }
    }

    addMessage(message: string): number {
        const index = this.messagePool.length;
        this.messagePool.push(message);
        return index;
    }

    getMessage(index: number): string | undefined {
        return this.messagePool[index];
    }

    addSprite(sprite: string): number {
        const index = this.spritePool.indexOf(sprite);
        if (index !== -1) return index;

        this.spritePool.push(sprite);
        return this.spritePool.length - 1;
    }

    getSprite(index: number): string | undefined {
        return this.spritePool[index];
    }

    addPath(path: Array<{ x: number, y: number }>): number {
        const index = this.pathPool.length;
        this.pathPool.push(path);
        return index;
    }

    getPath(index: number): Array<{ x: number, y: number }> | undefined {
        return this.pathPool[index];
    }

    getTile(x: number, y: number) {
        const key = this.getGridKey(x, y);
        return this.tiles.get(key);
    }

    setTile(x: number, y: number, tile: { baseLayer: number }) {
        const key = this.getGridKey(x, y);
        this.tiles.set(key, tile);
    }
} 