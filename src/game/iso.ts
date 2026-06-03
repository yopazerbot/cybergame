import { TILE_W, TILE_H } from '../core/config';

// Isometric <-> grid coordinate helpers (2:1 diamond tiles).

export function gridToWorld(gx: number, gy: number): { x: number; y: number } {
  return {
    x: (gx - gy) * (TILE_W / 2),
    y: (gx + gy) * (TILE_H / 2),
  };
}

export function worldToGrid(wx: number, wy: number): { gx: number; gy: number } {
  const gx = (wx / (TILE_W / 2) + wy / (TILE_H / 2)) / 2;
  const gy = (wy / (TILE_H / 2) - wx / (TILE_W / 2)) / 2;
  return { gx: Math.round(gx), gy: Math.round(gy) };
}

/** Depth so that objects further "down" the screen render in front. */
export function isoDepth(gx: number, gy: number, bias = 0): number {
  return (gx + gy) * 10 + bias;
}
