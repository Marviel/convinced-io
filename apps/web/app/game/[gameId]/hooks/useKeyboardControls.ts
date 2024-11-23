import {
    useEffect,
    useRef,
} from 'react';

import { Action } from '../network/types';

export function useKeyboardControls(
    onMove: (action: Action) => void
) {
    const keysPressed = useRef(new Set<string>());

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            keysPressed.current.add(e.key.toLowerCase());
            updateMovement();
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            keysPressed.current.delete(e.key.toLowerCase());
            updateMovement();
        };

        const updateMovement = () => {
            const keys = keysPressed.current;
            let dx = 0;
            let dy = 0;

            if (keys.has('w')) dy = -1;
            if (keys.has('s')) dy = 1;
            if (keys.has('a')) dx = -1;
            if (keys.has('d')) dx = 1;

            const moveAction: Action = {
                type: 'MOVE',
                payload: { dx, dy },
                id: crypto.randomUUID(),
                playerId: 'player',
                timestamp: performance.now()
            };
            onMove(moveAction);
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [onMove]);
} 