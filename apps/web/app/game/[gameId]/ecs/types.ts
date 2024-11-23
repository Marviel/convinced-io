export type EntityId = string;

export interface Position {
    x: number;
    y: number;
}

export interface Movement {
    dx: number;
    dy: number;
    speed: number;
    lastMoveTime?: number;
    moveInterval: number;
}

export interface Appearance {
    color: string;
    highlighted?: boolean;
}

export interface Collision {
    solid: boolean;
}

export interface Interactable {
    radius: number;
}

export interface AI {
    type: 'random';
    nextMoveTime: number;
}

export interface PathfindingComponent {
    targetPosition?: { x: number; y: number };
    currentPath?: { x: number; y: number }[];
    pathIndex?: number;
}

export type ComponentTypes = {
    position: Position;
    movement: Movement;
    appearance: Appearance;
    collision: Collision;
    ai: AI;
    interactable: Interactable;
    pathfinding: PathfindingComponent;
};

export type ComponentType = keyof ComponentTypes;

export type Entity = {
    id: EntityId;
    type: 'player' | 'npc' | 'structure';
    components: Partial<ComponentTypes>;
}; 