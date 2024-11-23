import { Entity } from '../ecs/types';

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
    type: 'MOVE' | 'INTERACT' | 'CHAT';  // Add more action types as needed
    payload: MovePayload;  // Union type with other payloads as we add them
    id: string;
    playerId: string;
    timestamp: number;
} 