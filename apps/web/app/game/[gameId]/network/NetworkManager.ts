import { clientSystems } from '../ecs/systems';
import { World } from '../ecs/World';
import { Action } from './types';

export class NetworkManager {
    private pendingActions: Action[] = [];
    // private lastConfirmedState: GameState | null = null;
    // private optimisticState: GameState | null = null;

    constructor(
        private world: World,
        // private socket: WebSocket,
        private playerId: string
    ) {
        // this.setupSocketHandlers();
    }

    /*
    private setupSocketHandlers() {
        this.socket.onmessage = (event) => {
            const message = JSON.parse(event.data);

            switch (message.type) {
                case 'STATE_UPDATE':
                    this.handleStateUpdate(message.state);
                    break;
                case 'ACTION_RESPONSE':
                    this.handleActionResponse(message.action, message.success);
                    break;
            }
        };
    }
    */

    // Send action to server
    dispatchAction(action: Action) {
        console.log('Dispatching action:', action);
        this.pendingActions.push(action);
        this.applyOptimisticAction(action);
    }

    /*
    private handleStateUpdate(serverState: GameState) {
        this.lastConfirmedState = serverState;

        // Reapply pending actions on top of new state
        this.reconcileState();
    }

    private handleActionResponse(action: Action, success: boolean) {
        if (!success) {
            // Remove failed action and reconcile
            this.pendingActions = this.pendingActions.filter(a => a.id !== action.id);
            this.reconcileState();
        }
    }

    private reconcileState() {
        // Start from last confirmed state
        this.world.loadState(this.lastConfirmedState!);

        // Reapply all pending actions
        for (const action of this.pendingActions) {
            this.applyOptimisticAction(action);
        }
    }
    */

    private applyOptimisticAction(action: Action) {
        console.log('Applying optimistic action:', action);
        switch (action.type) {
            case 'MOVE':
                clientSystems.moveSystem(this.world, {
                    delta: 0,
                    currentTime: action.timestamp,
                    movement: action.payload
                });
                break;
            // Add other action types here
        }
    }
} 