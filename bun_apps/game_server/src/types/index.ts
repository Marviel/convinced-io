export interface Position {
    x: number;
    y: number;
}

export interface GameState {
    entities: [string, Entity][];  // Array of [entityId, entity] tuples
    grid: [string, string][];     // Array of [gridKey, entityId] tuples
    timestamp: number;
}

export interface MovePayload {
    dx: number;
    dy: number;
}

export interface Action {
    type: 'MOVE' | 'INTERACT' | 'CHAT';
    payload: any;  // We'll type this more specifically as we add actions
    id: string;
    playerId: string;
    timestamp: number;
}

export const THINKING_STATES = ['listening', 'changed', 'notChanged'] as const;
export type ThinkingState = typeof THINKING_STATES[number];

export interface GameMessage {
    entityId: string;
    entityType: 'player' | 'npc';
    message: string;
    timestamp: number;
    position: Position;
}

export interface Entity {
    id: string;
    type: 'player' | 'npc' | 'structure';
    components: {
        position?: Position;
        movement?: {
            dx: number;
            dy: number;
            speed: number;
            lastMoveTime?: number;
            moveInterval: number;
        };
        appearance?: {
            color?: string;
            sprite?: string;
            direction?: 'fr' | 'bk' | 'lf' | 'rt';
            isMoving?: boolean;
            structure?: boolean;
            structureNumber?: number;
            highlighted?: boolean;
        };
        collision?: {
            solid: boolean;
        };
        interactable?: {
            radius: number;
        };
        ai?: {
            type: 'random';
            nextMoveTime: number;
            personality?: string;
            processingMessage?: {
                message: string;
                fromEntity: string;
                processStartTime: number;
            };
        };
        pathfinding?: {
            targetPosition?: Position;
            currentPath?: Position[];
            pathIndex?: number;
        };
        speech?: {
            message: string;
            expiryTime: number;
            isThinking?: boolean;
            thinkingState?: ThinkingState;
        };
    };
} 