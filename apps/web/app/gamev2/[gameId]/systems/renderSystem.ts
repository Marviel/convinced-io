import {
    defineQuery,
    hasComponent,
} from 'bitecs';

import {
    Appearance,
    EntityType,
    Interactable,
    Pathfinding,
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

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = ctx.measureText(currentLine + ' ' + word).width;
        if (width < maxWidth) {
            currentLine += ' ' + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    lines.push(currentLine);
    return lines;
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

    // Scale down the text and bubble size
    const scale = 1 / 32; // Inverse of tile size to make bubbles smaller
    ctx.scale(scale, scale);

    // Measure text (in scaled space)
    ctx.font = '14px Arial';
    const maxWidth = 200;
    const lineHeight = 20;

    // Wrap text and calculate dimensions
    const lines = wrapText(ctx, text, maxWidth);
    const textHeight = lines.length * lineHeight;

    // Calculate bubble dimensions (in scaled space)
    const bubbleWidth = maxWidth + SPEECH_BUBBLE_PADDING * 2;
    const bubbleHeight = textHeight + SPEECH_BUBBLE_PADDING * 2;
    const bubbleX = (x / scale) - bubbleWidth / 2;
    const bubbleY = (y / scale) - bubbleHeight - 20; // Above the entity

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
    ctx.moveTo(bubbleX + bubbleWidth / 2 - 5, bubbleY + bubbleHeight);
    ctx.lineTo(bubbleX + bubbleWidth / 2, bubbleY + bubbleHeight + 10);
    ctx.lineTo(bubbleX + bubbleWidth / 2 + 5, bubbleY + bubbleHeight);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Draw text
    ctx.fillStyle = 'black';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    if (isThinking) {
        // Draw thinking animation
        const thinkingDots = THINKING_DOTS[Math.floor(thinkingState) % THINKING_DOTS.length];
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
            thinkingDots ?? '',
            bubbleX + bubbleWidth / 2,
            bubbleY + bubbleHeight / 2
        );
    } else {
        // Draw wrapped text
        lines.forEach((line, index) => {
            ctx.fillText(
                line,
                bubbleX + SPEECH_BUBBLE_PADDING,
                bubbleY + SPEECH_BUBBLE_PADDING + (index * lineHeight)
            );
        });
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

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, alpha: number) {
    const time = performance.now() / 1000;
    const scale = 0.8 + Math.sin(time * 2) * 0.2;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.globalAlpha = alpha;
    ctx.beginPath();

    for (let i = 0; i < 8; i++) {
        const radius = i % 2 === 0 ? size : size / 2;
        const angle = (i * Math.PI) / 4;
        if (i === 0) {
            ctx.moveTo(radius * Math.cos(angle), radius * Math.sin(angle));
        } else {
            ctx.lineTo(radius * Math.cos(angle), radius * Math.sin(angle));
        }
    }

    ctx.closePath();
    ctx.fill();
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

    // Draw paths and destinations for NPCs
    for (const eid of characters) {
        if (EntityType.type[eid] !== 1) continue; // Skip non-NPCs

        const pos = Position.x[eid] !== undefined && Position.y[eid] !== undefined ?
            { x: Position.x[eid], y: Position.y[eid] } : null;

        if (!pos) continue;

        // Draw path if entity has one
        if (Pathfinding.hasTarget[eid] && Pathfinding.pathIndex[eid] !== undefined) {
            const path = world.getPath(Pathfinding.pathIndex[eid]);
            if (path) {
                // Draw connecting lines with gradient
                ctx.beginPath();
                ctx.strokeStyle = '#00b894';
                ctx.lineWidth = 0.1;
                ctx.globalAlpha = 0.3;

                ctx.moveTo(pos.x + 0.5, pos.y + 0.5);

                path.forEach(point => {
                    ctx.lineTo(point.x + 0.5, point.y + 0.5);
                });

                ctx.stroke();
                ctx.globalAlpha = 1;

                // Draw dots at each path point
                path.forEach(point => {
                    ctx.beginPath();
                    ctx.arc(point.x + 0.5, point.y + 0.5, 0.1, 0, Math.PI * 2);
                    ctx.fillStyle = '#00b894';
                    ctx.globalAlpha = 0.5;
                    ctx.fill();
                });
                ctx.globalAlpha = 1;
            }
        }

        // Draw destination marker
        if (Pathfinding.hasTarget[eid]) {
            const targetX = Pathfinding.targetX[eid];
            const targetY = Pathfinding.targetY[eid];
            if (targetX !== undefined && targetY !== undefined) {
                ctx.fillStyle = '#00b894';
                drawStar(ctx, targetX + 0.5, targetY + 0.5, 0.4, 0.5);
            }
        }
    }

    // Draw player interaction radius
    const players = characterQuery(world.world);
    for (const eid of players) {
        if (EntityType.type[eid] !== 0) continue; // Skip non-players

        const pos = Position.x[eid] !== undefined && Position.y[eid] !== undefined ?
            { x: Position.x[eid], y: Position.y[eid] } : null;

        if (!pos || !hasComponent(world.world, Interactable, eid)) continue;

        // Handle undefined radius with default value
        const radius = Interactable.radius[eid] ?? 5;

        // Draw interaction circle
        ctx.beginPath();
        ctx.arc(pos.x + 0.5, pos.y + 0.5, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 0.1;
        ctx.stroke();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.fill();
    }

    ctx.restore();
} 