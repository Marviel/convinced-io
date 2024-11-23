import { useState } from 'react';

import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import {
    Box,
    IconButton,
    Paper,
    Typography,
} from '@mui/material';
import { styled } from '@mui/material/styles';

import type { GameMessage } from '../../../game/[gameId]/ecs/types';

const ChatContainer = styled(Paper)<{ isexpanded: string }>(({ isexpanded }) => ({
    position: 'absolute',
    right: 20,
    top: 20,
    bottom: 20,
    width: isexpanded === 'true' ? '300px' : '40px',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: 'white',
    padding: '16px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    transition: 'width 0.3s ease-in-out'
}));

const MessageBox = styled(Box)({
    padding: '8px',
    borderRadius: '4px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
});

interface ChatHistoryProps {
    messages: GameMessage[];
}

export function ChatHistory({ messages }: ChatHistoryProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <ChatContainer isexpanded={isExpanded.toString()} elevation={3}>
            <IconButton
                onClick={() => setIsExpanded(!isExpanded)}
                sx={{
                    color: 'white',
                    position: 'absolute',
                    left: '8px',
                    top: '8px'
                }}
            >
                {isExpanded ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            </IconButton>
            {isExpanded && (
                <>
                    <Typography variant="h6" sx={{ mb: 2, ml: 4 }}>
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
                </>
            )}
        </ChatContainer>
    );
} 