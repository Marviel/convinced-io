import { createClient } from '@supabase/supabase-js';

import type { GameManager } from './GameManager';

export class SupabaseManager {
    private supabase;
    private gameManager;

    constructor(gameManager: GameManager) {
        console.log('Initializing SupabaseManager with URL:', process.env.SUPABASE_URL);

        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY || !process.env.SUPABASE_SERVICE_KEY) {
            throw new Error('Missing Supabase environment variables');
        }

        // TODO not sure about this.
        this.supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
        this.gameManager = gameManager;

        console.log('Initializing channels...');
    }

    async initializeChannels(gameId: string) {
        try {
            const channel = this.supabase
                .channel(`player_actions:${gameId}`)
                .on('broadcast', { event: 'player_action' }, ({ payload }) => {
                    console.log(`gameId: ${gameId} received player action`);
                    this.gameManager.processAction(gameId, payload);
                })
                .subscribe((status) => {
                    console.log('Player actions channel status:', status);
                });

            console.log('Player actions channel initialized.');
        } catch (error) {
            console.error('Error initializing channels:', error);
        }
    }

    public async broadcastGameState(gameId: string, state: any) {
        try {
            const channel = await this.supabase.channel(`game_state:${gameId}`);

            channel.subscribe(async (status, error) => {
                const response = await this.supabase
                    .channel(`game_state:${gameId}`)
                    .send({
                        type: 'broadcast',
                        event: 'state_update',
                        payload: {
                            state,
                            timestamp: Date.now()
                        }
                    });
            });
        } catch (error) {
            console.error('Error broadcasting game state:', error);
        }
    }
} 