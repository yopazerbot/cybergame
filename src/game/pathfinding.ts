// Simple grid A* over a walkable map. 4-directional movement for readable paths.

export type WalkableFn = (gx: number, gy: number) => boolean;

interface Node {
  gx: number;
  gy: number;
  g: number;
  f: number;
  parent: Node | null;
}

const key = (x: number, y: number) => `${x},${y}`;

export function findPath(
  start: { gx: number; gy: number },
  goal: { gx: number; gy: number },
  isWalkable: WalkableFn,
): { gx: number; gy: number }[] | null {
  if (!isWalkable(goal.gx, goal.gy)) return null;
  if (start.gx === goal.gx && start.gy === goal.gy) return [];

  const h = (x: number, y: number) => Math.abs(x - goal.gx) + Math.abs(y - goal.gy);
  const open = new Map<string, Node>();
  const closed = new Set<string>();

  const startNode: Node = { gx: start.gx, gy: start.gy, g: 0, f: h(start.gx, start.gy), parent: null };
  open.set(key(start.gx, start.gy), startNode);

  const neighbours = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  while (open.size > 0) {
    // Lowest f.
    let current: Node | null = null;
    for (const node of open.values()) {
      if (!current || node.f < current.f) current = node;
    }
    if (!current) break;

    if (current.gx === goal.gx && current.gy === goal.gy) {
      const path: { gx: number; gy: number }[] = [];
      let n: Node | null = current;
      while (n && n.parent) {
        path.unshift({ gx: n.gx, gy: n.gy });
        n = n.parent;
      }
      return path;
    }

    open.delete(key(current.gx, current.gy));
    closed.add(key(current.gx, current.gy));

    for (const [dx, dy] of neighbours) {
      const nx = current.gx + dx;
      const ny = current.gy + dy;
      const k = key(nx, ny);
      if (closed.has(k) || !isWalkable(nx, ny)) continue;

      const g = current.g + 1;
      const existing = open.get(k);
      if (!existing || g < existing.g) {
        open.set(k, { gx: nx, gy: ny, g, f: g + h(nx, ny), parent: current });
      }
    }
  }
  return null;
}
