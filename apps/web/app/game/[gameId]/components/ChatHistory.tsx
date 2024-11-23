import {
    Box,
    Paper,
    Typography,
} from '@mui/material';
import { styled } from '@mui/material/styles';

import { GameMessage } from '../ecs/types';

const ChatContainer = styled(Paper)({
    position: 'absolute',
    right: 20,
    top: 20,
    bottom: 20,
    width: '300px',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: 'white',
    padding: '16px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
});

const MessageBox = styled(Box)({
    padding: '8px',
    borderRadius: '4px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
});

interface ChatHistoryProps {
    messages: GameMessage[];
}

export function ChatHistory({ messages }: ChatHistoryProps) {
    return (
        <ChatContainer elevation={3}>
            <Typography variant="h6" sx={{ mb: 2 }}>
                Chat History
            </Typography>
            {messages.map((msg, index) => (
                <MessageBox key={index}>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        {msg.entityType === 'player' ? 'Player' : 'NPC'} at ({msg.position.x}, {msg.position.y})
                    </Typography>
                    <Typography>
                        {msg.message}
                    </Typography>
                </MessageBox>
            ))}
        </ChatContainer>
    );
} 