import type { ServerWebSocket } from 'bun';

export interface ConnectionData {
    gameId: string;
}

export type GameServerWebSocket = ServerWebSocket<ConnectionData>; 