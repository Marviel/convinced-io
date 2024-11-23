import { styled } from '@mui/material/styles';

const BubbleContainer = styled('div')<{ opacity: number }>(({ opacity }) => ({
    position: 'absolute',
    backgroundColor: `rgba(255, 255, 255, ${opacity * 0.9})`,
    padding: '8px 12px',
    borderRadius: '12px',
    maxWidth: '200px',
    color: `rgba(0, 0, 0, ${opacity})`,
    fontSize: '14px',
    transform: 'translate(-50%, -100%)',
    marginTop: '-10px',
    pointerEvents: 'none',
    zIndex: 9999,
    '&:after': {
        content: '""',
        position: 'absolute',
        bottom: '-10px',
        left: '50%',
        transform: 'translateX(-50%)',
        border: '5px solid transparent',
        borderTopColor: `rgba(255, 255, 255, ${opacity * 0.9})`,
    },
}));

interface SpeechBubbleProps {
    text: string;
    x: number;
    y: number;
    expiryTime: number;
    fadeStartTime?: number;
    currentTime: number;
}

export function SpeechBubble({
    text,
    x,
    y,
    expiryTime,
    fadeStartTime,
    currentTime
}: SpeechBubbleProps) {
    // If expired, don't render
    // if (currentTime >= expiryTime) return null;

    // Calculate opacity
    let opacity = 1;
    if (fadeStartTime && currentTime >= fadeStartTime) {
        opacity = Math.max(0, (expiryTime - currentTime) / (expiryTime - fadeStartTime));
    }

    return (
        <BubbleContainer style={{ left: x, top: y }} opacity={opacity}>
            {text}
        </BubbleContainer>
    );
} 