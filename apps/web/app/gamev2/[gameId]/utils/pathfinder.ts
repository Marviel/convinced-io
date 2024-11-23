interface Node {
    x: number;
    y: number;
    f: number;
    g: number;
    h: number;
    parent: Node | null;
}

function manhattan(a: { x: number; y: number }, b: { x: number; y: number }): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function getNeighbors(node: Node, width: number, height: number): Array<{ x: number; y: number }> {
    const neighbors: Array<{ x: number; y: number }> = [];
    const dirs = [
        { x: 0, y: -1 }, // up
        { x: 1, y: 0 },  // right
        { x: 0, y: 1 },  // down
        { x: -1, y: 0 }, // left
    ];

    for (const dir of dirs) {
        const newX = node.x + dir.x;
        const newY = node.y + dir.y;

        if (newX >= 0 && newX < width && newY >= 0 && newY < height) {
            neighbors.push({ x: newX, y: newY });
        }
    }

    return neighbors;
}

export function findPath(
    start: { x: number; y: number },
    goal: { x: number; y: number },
    width: number,
    height: number,
    isWalkable: (x: number, y: number) => boolean
): Array<{ x: number; y: number }> {
    const openSet: Node[] = [];
    const closedSet = new Set<string>();

    const startNode: Node = {
        x: start.x,
        y: start.y,
        f: 0,
        g: 0,
        h: manhattan(start, goal),
        parent: null
    };

    openSet.push(startNode);

    while (openSet.length > 0) {
        // Find node with lowest f score
        let currentIndex = 0;
        for (let i = 1; i < openSet.length; i++) {
            const itemi = openSet[i];
            const itemCurrent = openSet[currentIndex];
            if (itemi && itemCurrent && itemi.f < itemCurrent.f) {
                currentIndex = i;
            }
        }

        const current = openSet[currentIndex];

        if (!current) continue;

        // Check if we reached the goal
        if (current.x === goal.x && current.y === goal.y) {
            const path: Array<{ x: number; y: number }> = [];
            let node: Node | null = current;
            while (node) {
                path.unshift({ x: node.x, y: node.y });
                node = node.parent;
            }
            return path;
        }

        // Move current node from open to closed set
        openSet.splice(currentIndex, 1);
        closedSet.add(`${current.x},${current.y}`);

        // Check neighbors
        const neighbors = getNeighbors(current, width, height);
        for (const neighbor of neighbors) {
            // Skip if in closed set or not walkable
            if (
                closedSet.has(`${neighbor.x},${neighbor.y}`) ||
                !isWalkable(neighbor.x, neighbor.y)
            ) {
                continue;
            }

            const g = current.g + 1;
            const h = manhattan(neighbor, goal);
            const f = g + h;

            // Check if this is a better path
            const existingNode = openSet.find(
                node => node.x === neighbor.x && node.y === neighbor.y
            );

            if (!existingNode) {
                // Add new node
                openSet.push({
                    x: neighbor.x,
                    y: neighbor.y,
                    f,
                    g,
                    h,
                    parent: current
                });
            } else if (g < existingNode.g) {
                // Update existing node
                existingNode.f = f;
                existingNode.g = g;
                existingNode.parent = current;
            }
        }
    }

    // No path found
    return [];
} 