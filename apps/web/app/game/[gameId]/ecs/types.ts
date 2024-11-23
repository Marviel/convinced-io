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
    color?: string;
    sprite?: string;
    direction?: 'fr' | 'bk' | 'lf' | 'rt';
    isMoving?: boolean;
    structure?: boolean;
    structureNumber?: number;
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
    personality?: string;
    processingMessage?: {
        message: string;
        fromEntity: string;
        processStartTime: number;
    };
}

export interface PathfindingComponent {
    targetPosition?: { x: number; y: number };
    currentPath?: { x: number; y: number }[];
    pathIndex?: number;
}

export type ThinkingState = 'listening' | 'changed' | 'notChanged';

export interface Speech {
    message: string;
    expiryTime: number;
    isThinking?: boolean;
    thinkingState?: ThinkingState;
}

export interface PathfindingComponent {
    targetPosition?: { x: number; y: number };
    currentPath?: { x: number; y: number }[];
    pathIndex?: number;
}

export interface GameMessage {
    entityId: string;
    entityType: 'player' | 'npc';
    message: string;
    timestamp: number;
    position: { x: number; y: number };
}

export type ComponentTypes = {
    position: Position;
    movement: Movement;
    appearance: Appearance;
    collision: Collision;
    ai: AI;
    interactable: Interactable;
    pathfinding: PathfindingComponent;
    speech: Speech;
};

export type ComponentType = keyof ComponentTypes;

export type Entity = {
    id: EntityId;
    type: 'player' | 'npc' | 'structure';
    components: Partial<ComponentTypes>;
}; 