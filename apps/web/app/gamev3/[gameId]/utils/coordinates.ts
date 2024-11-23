export function gameToScreenPosition(
    gameTileX: number,
    gameTileY: number,
    numTilesX: number,
    canvasWidth: number,
    canvasTop: number,
    canvasLeft: number,
) {
    // 0,0 is the top left of the canvas

    // We need to calculate the pixel position of the top left of the tile
    const tileSize = canvasWidth / numTilesX;

    return {
        screenX: ((gameTileX * tileSize) + canvasLeft) + (tileSize / 2),
        screenY: (((gameTileY * tileSize)) + canvasTop) + (tileSize / 2),
    };
} 
