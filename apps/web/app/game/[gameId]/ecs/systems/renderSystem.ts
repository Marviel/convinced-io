import { World } from '../World';

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

export interface RenderContext {
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
    tileSize: number;
    mapSize: number;
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
    // @ts-ignore
    return lines;
}

export function renderSystem(world: World, context: RenderContext) {
    const { ctx, width, height, tileSize, mapSize } = context;

    // Clear canvas with a solid color
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);

    // Apply camera transform
    ctx.save();
    ctx.translate(width / 2, height / 2);

    // Enable image smoothing settings for pixel art
    ctx.imageSmoothingEnabled = false;

    // Set global composite operation to preserve transparency
    ctx.globalCompositeOperation = 'source-over';

    // Draw tile-based background
    for (let y = 0; y < mapSize; y++) {
        for (let x = 0; x < mapSize; x++) {
            const screenX = (x - mapSize / 2) * tileSize;
            const screenY = (y - mapSize / 2) * tileSize;
            const tile = world.getTile(x, y);

            if (tile) {
                // Draw grass base layer
                const baseTile = tileCache.get(tile.baseLayer);
                if (baseTile) {
                    ctx.drawImage(baseTile, screenX, screenY, tileSize, tileSize);
                } else {
                    loadTile(tile.baseLayer).catch(console.error);
                }
            }
        }
    }

    // Draw player interaction radius
    const player = world.getAllEntities().find(e => e.type === 'player');
    if (player?.components.position && player.components.interactable) {
        const pos = player.components.position;
        const x = (pos.x - mapSize / 2) * tileSize + tileSize / 2;
        const y = (pos.y - mapSize / 2) * tileSize + tileSize / 2;
        const radius = player.components.interactable.radius * tileSize;

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fill();
    }

    // Draw entities and their paths
    const speechBubbles: (() => void)[] = [];
    for (const entity of world.getAllEntities()) {
        const pos = entity.components.position;
        const appearance = entity.components.appearance;
        const pathfinding = entity.components.pathfinding;
        const speech = entity.components.speech;
        if (!pos || !appearance) continue;

        const x = (pos.x - mapSize / 2) * tileSize;
        const y = (pos.y - mapSize / 2) * tileSize;

        // Draw path for NPCs
        if (entity.type === 'npc' && pathfinding?.currentPath && pathfinding.pathIndex !== undefined) {
            // Create gradient for path
            const path = pathfinding.currentPath.slice(pathfinding.pathIndex);
            if (path.length > 0) {
                // Draw connecting lines with gradient
                ctx.beginPath();
                ctx.strokeStyle = appearance.color || '#ffffff';
                ctx.lineWidth = 2;
                ctx.globalAlpha = 0.3;

                const startX = (pos.x - mapSize / 2) * tileSize + tileSize / 2;
                const startY = (pos.y - mapSize / 2) * tileSize + tileSize / 2;
                ctx.moveTo(startX, startY);

                path.forEach(point => {
                    const pathX = (point.x - mapSize / 2) * tileSize + tileSize / 2;
                    const pathY = (point.y - mapSize / 2) * tileSize + tileSize / 2;
                    ctx.lineTo(pathX, pathY);
                });

                ctx.stroke();
                ctx.globalAlpha = 1;

                // Draw dots at each path point
                path.forEach(point => {
                    const pathX = (point.x - mapSize / 2) * tileSize + tileSize / 2;
                    const pathY = (point.y - mapSize / 2) * tileSize + tileSize / 2;
                    ctx.beginPath();
                    ctx.arc(pathX, pathY, 2, 0, Math.PI * 2);
                    ctx.fillStyle = appearance.color || '#ffffff';
                    ctx.globalAlpha = 0.5;
                    ctx.fill();
                });
                ctx.globalAlpha = 1;
            }
        }

        // Draw destination marker for NPCs
        if (entity.type === 'npc' && pathfinding?.targetPosition) {
            const targetX = (pathfinding.targetPosition.x - mapSize / 2) * tileSize + tileSize / 2;
            const targetY = (pathfinding.targetPosition.y - mapSize / 2) * tileSize + tileSize / 2;

            ctx.fillStyle = appearance.color || '#ffffff';
            drawStar(ctx, targetX, targetY, tileSize / 2, 0.5);
        }

        // Draw path for NPCs
        if (entity.type === 'npc' && pathfinding?.currentPath && pathfinding.pathIndex !== undefined) {
            // Create gradient for path
            const path = pathfinding.currentPath.slice(pathfinding.pathIndex);
            if (path.length > 0) {
                // Draw connecting lines with gradient
                ctx.beginPath();
                // @ts-ignore
                ctx.strokeStyle = appearance.color;
                ctx.lineWidth = 2;
                ctx.globalAlpha = 0.3;

                const startX = (pos.x - mapSize / 2) * tileSize + tileSize / 2;
                const startY = (pos.y - mapSize / 2) * tileSize + tileSize / 2;
                ctx.moveTo(startX, startY);

                path.forEach(point => {
                    const pathX = (point.x - mapSize / 2) * tileSize + tileSize / 2;
                    const pathY = (point.y - mapSize / 2) * tileSize + tileSize / 2;
                    ctx.lineTo(pathX, pathY);
                });

                ctx.stroke();
                ctx.globalAlpha = 1;

                // Draw dots at each path point
                path.forEach(point => {
                    const pathX = (point.x - mapSize / 2) * tileSize + tileSize / 2;
                    const pathY = (point.y - mapSize / 2) * tileSize + tileSize / 2;
                    ctx.beginPath();
                    ctx.arc(pathX, pathY, 2, 0, Math.PI * 2);
                    // @ts-ignore
                    ctx.fillStyle = appearance.color;
                    ctx.globalAlpha = 0.5;
                    ctx.fill();
                });
                ctx.globalAlpha = 1;
            }
        }

        // Draw destination marker for NPCs
        if (entity.type === 'npc' && pathfinding?.targetPosition) {
            const targetX = (pathfinding.targetPosition.x - mapSize / 2) * tileSize + tileSize / 2;
            const targetY = (pathfinding.targetPosition.y - mapSize / 2) * tileSize + tileSize / 2;

            // @ts-ignore
            ctx.fillStyle = appearance.color;
            drawStar(ctx, targetX, targetY, tileSize / 2, 0.5);
        }

        // Draw highlight for NPCs in range
        if (entity.type === 'npc' && appearance.highlighted) {
            ctx.beginPath();
            ctx.rect(
                x - 2,
                y - 2,
                tileSize + 4,
                tileSize + 4
            );
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        if (appearance.sprite) {
            // Construct sprite name
            const frameNum = appearance.isMoving ? '2' : '1';
            const direction = appearance.direction || 'fr';
            const spriteName = `${appearance.sprite}_${direction}${frameNum}`;

            // Try to get sprite from cache
            const sprite = spriteCache.get(spriteName);
            if (sprite) {
                // Save the current context state
                ctx.save();
                // Ensure we're using source-over composition
                ctx.globalCompositeOperation = 'source-over';
                ctx.drawImage(sprite, x, y, tileSize, tileSize);
                // Restore the context state
                ctx.restore();
            } else {
                // Load sprite if not in cache
                loadSprite(spriteName)
                    .then(() => {/* Sprite will be drawn in next frame */ })
                    .catch(() => {
                        // Fallback to color if sprite loading fails
                        ctx.fillStyle = appearance.color || '#ff0000';
                        ctx.fillRect(x, y, tileSize - 1, tileSize - 1);
                    });
            }
        } else if (appearance.structure) {
            // Use the stored structure number
            const number = appearance.structureNumber || 1;
            const tile = tileCache.get(number);
            if (tile) {
                ctx.drawImage(tile, x, y, tileSize, tileSize);
            } else {
                // Load the log tile
                loadTile(number).then(tile => {
                    ctx.drawImage(tile, x, y, tileSize, tileSize);
                }).catch(console.error);
            }
        } else {
            // Fallback to color rendering
            ctx.fillStyle = appearance.color || '#ff0000';
            ctx.fillRect(x, y, tileSize - 1, tileSize - 1);
        }

        // Draw speech bubble if entity has speech
        if (speech) {
            speechBubbles.push(() => {
                ctx.save();

                // Special handling for thinking indicator
                if (speech.isThinking) {
                    const size = tileSize / 2;
                    const thinkingColors = {
                        listening: 'yellow',
                        changed: 'red',
                        notChanged: '#888888'  // gray
                    };
                    ctx.fillStyle = speech.thinkingState ?
                        thinkingColors[speech.thinkingState] :
                        thinkingColors.listening;

                    ctx.beginPath();
                    ctx.arc(x, y - tileSize - size, size, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = 'white';
                    ctx.font = `bold ${size}px Arial`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('!', x, y - tileSize - size);
                } else {
                    // Speech bubble background
                    const padding = 10;
                    const fontSize = 14;
                    const maxWidth = 200;  // Maximum width for speech bubbles

                    ctx.font = `${fontSize}px Arial`;

                    // Wrap text and calculate dimensions
                    const lines = wrapText(ctx, speech.message, maxWidth - (padding * 2));
                    const lineHeight = fontSize * 1.2;
                    const bubbleHeight = (lines.length * lineHeight) + padding * 2;
                    const bubbleWidth = Math.min(
                        Math.max(...lines.map(line => ctx.measureText(line).width)) + padding * 2,
                        maxWidth
                    );

                    const bubbleX = x - bubbleWidth / 2;
                    const bubbleY = y - tileSize - bubbleHeight - 10;

                    // Draw bubble background
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                    ctx.beginPath();
                    ctx.roundRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, 8);
                    ctx.fill();

                    // Draw pointer
                    ctx.beginPath();
                    ctx.moveTo(x - 8, bubbleY + bubbleHeight);
                    ctx.lineTo(x + 8, bubbleY + bubbleHeight);
                    ctx.lineTo(x, bubbleY + bubbleHeight + 8);
                    ctx.closePath();
                    ctx.fill();

                    // Draw text
                    ctx.fillStyle = '#000';
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'top';

                    lines.forEach((line, index) => {
                        ctx.fillText(
                            line,
                            bubbleX + padding,
                            bubbleY + padding + (index * lineHeight)
                        );
                    });
                }

                ctx.restore();
            });
        }
    }

    // After drawing all entities, draw speech bubbles last (on top)
    speechBubbles.forEach(drawBubble => drawBubble());

    ctx.restore();
} 