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

export function renderSystem(
    ctx: CanvasRenderingContext2D,
    gameState: any,
    width: number,
    height: number,
    tileSize: number,
    mapSize: number
) {
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);

    // Apply camera transform
    ctx.save();
    ctx.translate(width / 2, height / 2);

    // Enable image smoothing settings for pixel art
    ctx.imageSmoothingEnabled = false;

    // Draw tile-based background
    for (let y = 0; y < mapSize; y++) {
        for (let x = 0; x < mapSize; x++) {
            const screenX = (x - mapSize / 2) * tileSize;
            const screenY = (y - mapSize / 2) * tileSize;

            // Draw grass base layer
            const baseTile = tileCache.get(18); // Grass tile
            if (baseTile) {
                ctx.drawImage(baseTile, screenX, screenY, tileSize, tileSize);
            } else {
                loadTile(18).catch(console.error);
                // Draw fallback color
                ctx.fillStyle = '#2d3436';
                ctx.fillRect(screenX, screenY, tileSize, tileSize);
            }
        }
    }

    // Draw entities
    if (gameState?.entities) {
        for (const [_, entity] of gameState.entities) {
            const pos = entity.components.position;
            const appearance = entity.components.appearance;
            if (!pos || !appearance) continue;

            const screenX = (pos.x - mapSize / 2) * tileSize;
            const screenY = (pos.y - mapSize / 2) * tileSize;

            if (appearance.sprite) {
                // Construct sprite name
                const frameNum = appearance.isMoving ? '2' : '1';
                const direction = appearance.direction || 'fr';
                const spriteName = `${appearance.sprite}_${direction}${frameNum}`;

                // Try to get sprite from cache
                const sprite = spriteCache.get(spriteName);
                if (sprite) {
                    ctx.drawImage(sprite, screenX, screenY, tileSize, tileSize);
                } else {
                    // Load sprite if not in cache
                    loadSprite(spriteName)
                        .then(() => {/* Sprite will be drawn in next frame */ })
                        .catch(() => {
                            // Fallback to colored circle
                            ctx.fillStyle = entity.type === 'player' ? '#0984e3' : '#00b894';
                            ctx.beginPath();
                            ctx.arc(
                                screenX + tileSize / 2,
                                screenY + tileSize / 2,
                                tileSize / 2 - 2,
                                0,
                                Math.PI * 2
                            );
                            ctx.fill();
                        });
                }
            }
            else if (appearance.structure) {
                // Draw structure
                const structureNumber = appearance.structureNumber || 18;
                const tile = tileCache.get(structureNumber);
                if (tile) {
                    ctx.drawImage(tile, screenX, screenY, tileSize, tileSize);
                } else {
                    loadTile(structureNumber).catch(console.error);
                    // Draw fallback
                    ctx.fillStyle = '#b2bec3';
                    ctx.fillRect(screenX, screenY, tileSize - 1, tileSize - 1);
                }
            }

            // Draw highlight if needed
            if (appearance.highlighted) {
                ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
                ctx.lineWidth = 2;
                ctx.strokeRect(screenX, screenY, tileSize, tileSize);
            }
        }
    }

    ctx.restore();
} 