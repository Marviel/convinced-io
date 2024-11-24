type Point = { x: number; y: number };
type Path = Point[];

export class Pathfinder {
    private adjacencyMatrix: boolean[][];

    constructor(
        private width: number,
        private height: number
    ) {
        this.adjacencyMatrix = Array(height).fill(0).map(() =>
            Array(width).fill(true)
        );
    }

    updateObstacle(x: number, y: number, isBlocked: boolean) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            this.adjacencyMatrix[y][x] = !isBlocked;
        }
    }

    resetObstacles() {
        this.adjacencyMatrix = Array(this.height).fill(0).map(() =>
            Array(this.width).fill(true)
        );
    }

    findPath(start: Point, goal: Point, ignoredPoints: Point[] = []): Path | null {
        const openSet = new Set<string>();
        const cameFrom = new Map<string, Point>();
        const gScore = new Map<string, number>();
        const fScore = new Map<string, number>();

        const pointToKey = (p: Point) => `${p.x},${p.y}`;
        const getNeighbors = (p: Point): Point[] => {
            const neighbors: Point[] = [];
            const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]] as const;

            for (const [dx, dy] of dirs) {
                const nx = p.x + dx;
                const ny = p.y + dy;
                if (nx >= 0 && nx < this.width &&
                    ny >= 0 && ny < this.height) {
                    const isIgnored = ignoredPoints.some(ip => ip.x === nx && ip.y === ny);
                    if (this.adjacencyMatrix[ny][nx] || isIgnored) {
                        neighbors.push({ x: nx, y: ny });
                    }
                }
            }
            return neighbors;
        };

        const startKey = pointToKey(start);
        openSet.add(startKey);
        gScore.set(startKey, 0);
        fScore.set(startKey, this.heuristic(start, goal));

        while (openSet.size > 0) {
            let current = this.getLowestFScore(openSet, fScore);
            if (!current) break;

            if (current.x === goal.x && current.y === goal.y) {
                return this.reconstructPath(cameFrom, current);
            }

            openSet.delete(pointToKey(current));

            for (const neighbor of getNeighbors(current)) {
                const neighborKey = pointToKey(neighbor);
                const tentativeGScore = (gScore.get(pointToKey(current)) ?? Infinity) + 1;

                if (!gScore.has(neighborKey) || tentativeGScore < (gScore.get(neighborKey) ?? Infinity)) {
                    cameFrom.set(neighborKey, current);
                    gScore.set(neighborKey, tentativeGScore);
                    fScore.set(neighborKey, tentativeGScore + this.heuristic(neighbor, goal));
                    openSet.add(neighborKey);
                }
            }
        }

        return null;
    }

    private heuristic(a: Point, b: Point): number {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }

    private getLowestFScore(openSet: Set<string>, fScore: Map<string, number>): Point | null {
        let lowest = Infinity;
        let lowestPoint: Point | null = null;

        for (const key of openSet) {
            const score = fScore.get(key) ?? Infinity;
            if (score < lowest) {
                lowest = score;
                const [x, y] = key.split(',').map(Number);
                if (!isNaN(x) && !isNaN(y)) {
                    lowestPoint = { x, y };
                }
            }
        }

        return lowestPoint;
    }

    private reconstructPath(cameFrom: Map<string, Point>, current: Point): Path {
        const path = [current];
        const pointToKey = (p: Point) => `${p.x},${p.y}`;

        while (cameFrom.has(pointToKey(current))) {
            current = cameFrom.get(pointToKey(current))!;
            path.unshift(current);
        }

        return path;
    }
} 