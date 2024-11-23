import { World } from '../World';

const spriteCache = new Map<string, HTMLImageElement>();

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
        img.onerror = reject;
        img.src = `assets/sprites/${spriteName}.gif`;
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

export function renderSystem(world: World, context: RenderContext) {
    const { ctx, width, height, tileSize, mapSize } = context;

    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);

    // Apply camera transform
    ctx.save();
    ctx.translate(width / 2, height / 2);

    // Draw grid background
    ctx.fillStyle = '#1a1a1a';
    for (let y = 0; y < mapSize; y++) {
        for (let x = 0; x < mapSize; x++) {
            ctx.fillRect(
                (x - mapSize / 2) * tileSize,
                (y - mapSize / 2) * tileSize,
                tileSize - 1,
                tileSize - 1
            );
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
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.fill();
    }

    // Draw entities and their paths
    for (const entity of world.getAllEntities()) {
        const pos = entity.components.position;
        const appearance = entity.components.appearance;
        const pathfinding = entity.components.pathfinding;
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
                ctx.strokeStyle = appearance.color || '#ff0000';
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
                    ctx.fillStyle = appearance.color || '#ff0000';
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

            ctx.fillStyle = appearance.color || '#ff0000';
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
                ctx.drawImage(sprite, x, y, tileSize, tileSize);
            } else {
                // Load sprite if not in cache
                loadSprite(spriteName)
                    .then(() => {/* Sprite will be drawn in next frame */})
                    .catch(() => {
                        // Fallback to color if sprite loading fails
                        ctx.fillStyle = appearance.color || '#ff0000';
                        ctx.fillRect(x, y, tileSize - 1, tileSize - 1);
                    });
            }
        } else {
            // Fallback to color rendering
            ctx.fillStyle = appearance.color || '#ff0000';
            ctx.fillRect(x, y, tileSize - 1, tileSize - 1);
        }
    }

    ctx.restore();
} 