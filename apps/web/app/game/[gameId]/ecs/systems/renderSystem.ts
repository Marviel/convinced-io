import { World } from '../World';

export interface RenderContext {
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
    tileSize: number;
    mapSize: number;
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

    // First, draw the interaction radius for the player
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

    // Draw entities
    for (const entity of world.getAllEntities()) {
        const pos = entity.components.position;
        const appearance = entity.components.appearance;
        if (!pos || !appearance) continue;

        const x = (pos.x - mapSize / 2) * tileSize + tileSize / 2;
        const y = (pos.y - mapSize / 2) * tileSize + tileSize / 2;

        // Draw highlight for NPCs in range
        if (entity.type === 'npc' && appearance.highlighted) {
            ctx.beginPath();
            ctx.rect(
                x - tileSize / 2 - 2,
                y - tileSize / 2 - 2,
                tileSize + 4,
                tileSize + 4
            );
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Set the fill color
        ctx.fillStyle = appearance.color;

        if (entity.type === 'player') {
            // Draw circle for players
            ctx.beginPath();
            ctx.arc(x, y, tileSize / 2 - 1, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Draw squares for other entities
            ctx.fillRect(
                x - tileSize / 2,
                y - tileSize / 2,
                tileSize - 1,
                tileSize - 1
            );
        }
    }

    ctx.restore();
} 