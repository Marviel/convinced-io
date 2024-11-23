import { styled } from '@mui/material/styles';

const BubbleContainer = styled('div')({
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: '8px 12px',
    borderRadius: '12px',
    maxWidth: '200px',
    color: '#000',
    fontSize: '14px',
    transform: 'translate(-50%, -100%)',
    marginTop: '-10px',
    pointerEvents: 'none',
    zIndex: 1000,
    '&:after': {
        content: '""',
        position: 'absolute',
        bottom: '-10px',
        left: '50%',
        transform: 'translateX(-50%)',
        border: '5px solid transparent',
        borderTopColor: 'rgba(255, 255, 255, 0.9)',
    },
});

interface SpeechBubbleProps {
    text: string;
    x: number;
    y: number;
}

export function SpeechBubble({ text, x, y }: SpeechBubbleProps) {
    return (
        <BubbleContainer style={{ left: x, top: y }}>
            {text}
        </BubbleContainer>
    );
} 