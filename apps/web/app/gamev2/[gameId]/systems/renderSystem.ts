import { defineQuery } from 'bitecs';

import {
    Appearance,
    EntityType,
    Position,
    Speech,
} from '../components';
import { WorldManager } from '../world/WorldManager';
import { RenderContext } from './index';

// Queries for different render layers
const backgroundQuery = defineQuery([Position, Appearance, EntityType]);
const characterQuery = defineQuery([Position, Appearance, EntityType]);
const speechQuery = defineQuery([Position, Speech]);

// Constants
const SPEECH_BUBBLE_PADDING = 8;
const SPEECH_BUBBLE_RADIUS = 4;
const THINKING_DOTS = ['', '.', '..', '...'];

// Cache for loaded sprites
const spriteCache = new Map<string, HTMLImageElement>();
const tileCache = new Map<number, HTMLImageElement>();

async function loadSprite(spriteName: string): Promise<HTMLImageElement> {
    if (spriteCache.has(spriteName)) {
        return spriteCache.get(spriteName)!;
    }

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            spriteCache.set(spriteName, img);
            resolve(img);
        };
        img.onerror = (e) => {
            console.log('Failed to load sprite:', `assets/sprites/${spriteName}.gif`, e);
            reject(e);
        };
        const src = `/assets/sprites/${spriteName}.gif`;
        console.log('Loading sprite:', src);
        img.crossOrigin = 'anonymous';
        img.src = src;
    });
}

async function loadTile(tileNumber: number): Promise<HTMLImageElement> {
    if (tileCache.has(tileNumber)) {
        return tileCache.get(tileNumber)!;
    }

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            tileCache.set(tileNumber, img);
            resolve(img);
        };
        img.onerror = (e) => {
            console.error('Failed to load tile:', tileNumber, e);
            reject(e);
        };
        img.src = `/assets/tiles/Slice ${tileNumber}.png`;
    });
}

function drawSpeechBubble(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    text: string,
    isThinking: boolean = false,
    thinkingState: number = 0
) {
    ctx.save();

    // Measure text
    ctx.font = '14px Arial';
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = 20;

    // Calculate bubble dimensions
    const bubbleWidth = textWidth + SPEECH_BUBBLE_PADDING * 2;
    const bubbleHeight = textHeight + SPEECH_BUBBLE_PADDING * 2;
    const bubbleX = x - bubbleWidth / 2;
    const bubbleY = y - bubbleHeight - 20; // Above the entity

    // Draw bubble background
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(
        bubbleX,
        bubbleY,
        bubbleWidth,
        bubbleHeight,
        SPEECH_BUBBLE_RADIUS
    );
    ctx.fill();
    ctx.stroke();

    // Draw tail
    ctx.beginPath();
    ctx.moveTo(x - 5, bubbleY + bubbleHeight);
    ctx.lineTo(x, bubbleY + bubbleHeight + 10);
    ctx.lineTo(x + 5, bubbleY + bubbleHeight);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Draw text
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (isThinking) {
        // Draw thinking animation
        const thinkingDots = THINKING_DOTS[Math.floor(thinkingState) % THINKING_DOTS.length];
        ctx.fillText(
            thinkingDots ?? '',
            x,
            bubbleY + bubbleHeight / 2
        );
    } else {
        ctx.fillText(
            text,
            x,
            bubbleY + bubbleHeight / 2
        );
    }

    ctx.restore();
}

function drawTile(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string = '#2d3436'
) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 1, 1);
}

function drawEntity(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    sprite: HTMLImageElement | null,
    color: string = '#00b894',
    highlighted: boolean = false,
    direction: number = 0,
    isMoving: boolean = false
) {
    ctx.save();

    if (sprite) {
        ctx.drawImage(sprite, x, y, 1, 1);
    } else {
        // Fallback shape
        ctx.fillStyle = color;
        if (highlighted) {
            ctx.strokeStyle = '#ffeaa7';
            ctx.lineWidth = 0.1;
        }
        ctx.beginPath();
        ctx.arc(x + 0.5, y + 0.5, 0.4, 0, Math.PI * 2);
        ctx.fill();
        if (highlighted) {
            ctx.stroke();
        }
    }

    ctx.restore();
}

export function renderSystem(world: WorldManager, { ctx, width, height, tileSize, mapSize }: RenderContext) {
    // Clear canvas
    ctx.save();
    ctx.fillStyle = '#636e72';
    ctx.fillRect(0, 0, width, height);

    // Calculate scaling to fit the entire map
    const scale = width / mapSize;

    // Set up camera transform
    ctx.scale(scale, scale);

    // Enable image smoothing settings for pixel art
    ctx.imageSmoothingEnabled = false;

    // Draw tile-based background
    for (let y = 0; y < world.height; y++) {
        for (let x = 0; x < world.width; x++) {
            const tile = world.getTile(x, y);
            if (tile) {
                // Draw grass base layer
                const baseTile = tileCache.get(tile.baseLayer);
                if (baseTile) {
                    ctx.drawImage(baseTile, x, y, 1, 1);
                } else {
                    loadTile(tile.baseLayer).catch(console.error);
                    // Draw fallback color while loading
                    drawTile(ctx, x, y);
                }
            } else {
                drawTile(ctx, x, y);
            }
        }
    }

    // Draw structures (background layer)
    const backgroundEntities = backgroundQuery(world.world);
    for (const eid of backgroundEntities) {
        if (EntityType.type[eid] !== 2) continue;

        const x = Position.x[eid] ?? 0;
        const y = Position.y[eid] ?? 0;
        const structureNumber = Appearance.spriteIndex[eid];

        if (structureNumber !== undefined) {
            const tile = tileCache.get(structureNumber);
            if (tile) {
                ctx.drawImage(tile, x, y, 1, 1);
            } else {
                loadTile(structureNumber).catch(console.error);
                // Draw fallback while loading
                drawEntity(ctx, x, y, null, '#b2bec3');
            }
        } else {
            drawEntity(ctx, x, y, null, '#b2bec3');
        }
    }

    // Draw characters (middle layer)
    const characters = characterQuery(world.world);
    for (const eid of characters) {
        if (EntityType.type[eid] === 2) continue;

        const x = Position.x[eid] ?? 0;
        const y = Position.y[eid] ?? 0;
        const spriteIndex = Appearance.spriteIndex[eid];
        const direction = Appearance.direction[eid];
        const isMoving = Appearance.isMoving[eid] === 1;
        const sprite = spriteIndex !== undefined ? world.getSprite(spriteIndex) : null;

        if (sprite) {
            // Construct sprite name
            const frameNum = isMoving ? '2' : '1';
            const dirStr = ['fr', 'bk', 'lf', 'rt'][direction ?? 0];
            const spriteName = `${sprite}_${dirStr}${frameNum}`;

            // Try to get sprite from cache
            const spriteImg = spriteCache.get(spriteName);
            if (spriteImg) {
                drawEntity(ctx, x, y, spriteImg, undefined, Appearance.highlighted[eid] === 1);
            } else {
                // Load sprite if not in cache
                loadSprite(spriteName)
                    .then(() => {/* Sprite will be drawn in next frame */ })
                    .catch(() => {
                        // Fallback to color if sprite loading fails
                        drawEntity(ctx, x, y, null, '#ff0000', Appearance.highlighted[eid] === 1);
                    });
            }
        } else {
            // Fallback to colored circle
            const color = EntityType.type[eid] === 0 ? '#0984e3' : '#00b894';
            drawEntity(ctx, x, y, null, color, Appearance.highlighted[eid] === 1);
        }
    }

    // Draw speech bubbles (top layer)
    const speechEntities = speechQuery(world.world);
    for (const eid of speechEntities) {
        const x = Position.x[eid] ?? 0;
        const y = Position.y[eid] ?? 0;
        const messageIndex = Speech.messageIndex[eid];
        if (messageIndex === undefined) continue;

        const message = world.getMessage(messageIndex) || '';
        const isThinking = Speech.isThinking[eid] === 1;
        const thinkingState = Speech.thinkingState[eid] ?? 0;

        drawSpeechBubble(
            ctx,
            x + 0.5,
            y,
            message,
            isThinking,
            thinkingState
        );
    }

    ctx.restore();
} 