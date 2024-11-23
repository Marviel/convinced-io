'use client';

import { useRouter } from 'next/navigation';

import { Button } from '@mui/material';

export default function CreateGamePage() {
    const router = useRouter();

    const createGame = async () => {
        try {
            const response = await fetch('http://localhost:3001/create-game', {
                method: 'POST',
            });
            const { gameId } = await response.json();

            // Redirect to game page
            router.push(`/gamev3/${gameId}`);
        } catch (error) {
            console.error('Failed to create game:', error);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
            <Button variant="contained" color="primary" onClick={createGame}>Create Game</Button>
        </div>
    );
} 