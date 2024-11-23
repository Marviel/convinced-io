import {
    defineComponent,
    Types,
} from 'bitecs';

// Basic components
export const Position = defineComponent({
    x: Types.f32,
    y: Types.f32
})

export const Movement = defineComponent({
    dx: Types.f32,
    dy: Types.f32,
    speed: Types.f32,
    lastMoveTime: Types.f32,
    moveInterval: Types.f32
})

export const Appearance = defineComponent({
    spriteIndex: Types.ui8,  // Index into sprite lookup table
    direction: Types.ui8,    // 0: front, 1: back, 2: left, 3: right
    isMoving: Types.ui8,     // Boolean
    color: Types.ui32,       // Packed color value
    highlighted: Types.ui8    // Boolean
})

export const Collision = defineComponent({
    solid: Types.ui8
})

export const AI = defineComponent({
    type: Types.ui8,         // 0: random
    nextMoveTime: Types.f32,
    personalityIndex: Types.ui8, // Index into personality table
    processingMessage: Types.ui8 // Boolean
})

export const Interactable = defineComponent({
    radius: Types.f32
})

export const Speech = defineComponent({
    messageIndex: Types.ui16, // Index into message pool
    expiryTime: Types.f32,
    isThinking: Types.ui8,
    thinkingState: Types.ui8  // 0: none, 1: listening, 2: changed, 3: notChanged
})

export const EntityType = defineComponent({
    type: Types.ui8  // 0: player, 1: npc, 2: structure
})

export const Pathfinding = defineComponent({
    targetX: Types.f32,
    targetY: Types.f32,
    hasTarget: Types.ui8,
    pathIndex: Types.ui16
}) 