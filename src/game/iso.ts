import { TILE } from '../core/config';

// Top-down square-grid coordinate helpers (tile centres).

export function gridToWorld(gx: number, gy: number): { x: number; y: number } {
  return { x: gx * TILE + TILE / 2, y: gy * TILE + TILE / 2 };
}

export function worldToGrid(wx: number, wy: number): { gx: number; gy: number } {
  return { gx: Math.floor(wx / TILE), gy: Math.floor(wy / TILE) };
}

/** Render depth so sprites lower on screen draw in front. */
export function depthFor(worldY: number, bias = 0): number {
  return worldY + bias;
}
