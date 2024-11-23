import { GameManager } from './GameManager';
import type { Action } from './types';
import type {
    ConnectionData,
    GameServerWebSocket,
} from './types/connection';

const gameManager = new GameManager();

interface ActionMessage {
    type: 'ACTION';
    action: Action;
}

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': 'http://localhost:3000',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

const server = Bun.serve<ConnectionData>({
    port: 3001,
    fetch: async (req, server) => {
        // Handle CORS preflight requests
        if (req.method === 'OPTIONS') {
            return new Response(null, {
                headers: corsHeaders
            });
        }

        // Extract gameId from URL parameters
        const url = new URL(req.url);
        const gameId = url.searchParams.get('gameId');

        // Upgrade the request to WebSocket if it's a WebSocket request and has gameId
        if (gameId && server.upgrade(req, { data: { gameId } })) {
            return; // Return if upgrade was successful
        }

        // Handle HTTP requests
        if (url.pathname === '/create-game' && req.method === 'POST') {
            const gameId = crypto.randomUUID();
            const gameState = await gameManager.createGame(gameId);
            return new Response(JSON.stringify({ gameId, gameState }), {
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders
                }
            });
        }

        return new Response('Not Found', {
            status: 404,
            headers: corsHeaders
        });
    },
    websocket: {
        open(ws: GameServerWebSocket) {
            gameManager.joinGame(ws.data.gameId, ws);
        },
        close(ws: GameServerWebSocket) {
            gameManager.leaveGame(ws.data.gameId, ws);
        },
        message(ws: GameServerWebSocket, message: string | Buffer) {
            try {
                const data = JSON.parse(message as string) as ActionMessage;

                if (data.type === 'ACTION') {
                    gameManager.processAction(ws.data.gameId, data.action);
                }
            } catch (error) {
                console.error('Error processing message:', error);
            }
        },
    },
});

console.log(`Game server listening on port ${server.port}`);