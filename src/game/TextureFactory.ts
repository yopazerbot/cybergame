import Phaser from 'phaser';
import { TILE } from '../core/config';

// Procedural top-down tile + furniture textures (48×48). Characters are real
// pixel-art sprites loaded from /public/assets (see BootScene).

export const TEX_RUG = 'rug';
export const TEX_RING = 'ring';
export const TEX_TILE_HI = 'tile_hi';
export const TEX_SHADOW = 'shadow';

const T = TILE;

function gfx(scene: Phaser.Scene): Phaser.GameObjects.Graphics {
  return scene.make.graphics({ x: 0, y: 0 }, false);
}

function floor(scene: Phaser.Scene, key: string, fill: number, border: number): void {
  const g = gfx(scene);
  g.fillStyle(fill, 1);
  g.fillRect(0, 0, T, T);
  g.lineStyle(1, border, 0.7);
  g.strokeRect(0.5, 0.5, T - 1, T - 1);
  g.fillStyle(0xffffff, 0.05);
  g.fillRect(0, 0, T, 2);
  g.generateTexture(key, T, T);
  g.destroy();
}

function wallTile(scene: Phaser.Scene): void {
  const g = gfx(scene);
  g.fillStyle(0x6c7488, 1);
  g.fillRect(0, 0, T, T);
  g.fillStyle(0x8a92a6, 1); // top highlight
  g.fillRect(0, 0, T, 7);
  g.fillStyle(0x565d70, 1); // baseboard
  g.fillRect(0, T - 9, T, 9);
  g.lineStyle(1, 0x474d5e, 0.6);
  g.strokeRect(0.5, 0.5, T - 1, T - 1);
  g.generateTexture('wall', T, T);
  g.destroy();
}

export function generateTextures(scene: Phaser.Scene): void {
  // Floors.
  floor(scene, 'floor_a', 0xe9e3d5, 0xd3cbb8);
  floor(scene, 'floor_b', 0xe1dac9, 0xd3cbb8);

  // Wall.
  wallTile(scene);

  // Rug (tintable square).
  {
    const g = gfx(scene);
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(2, 2, T - 4, T - 4, 6);
    g.generateTexture(TEX_RUG, T, T);
    g.destroy();
  }
  // Ring (tintable).
  {
    const g = gfx(scene);
    g.lineStyle(3, 0xffffff, 1);
    g.strokeCircle(T / 2, T / 2, T / 2 - 4);
    g.generateTexture(TEX_RING, T, T);
    g.destroy();
  }
  // Tile highlight (hover).
  {
    const g = gfx(scene);
    g.lineStyle(2.5, 0xffffff, 0.95);
    g.strokeRoundedRect(2, 2, T - 4, T - 4, 5);
    g.generateTexture(TEX_TILE_HI, T, T);
    g.destroy();
  }
  // Soft shadow.
  {
    const g = gfx(scene);
    g.fillStyle(0x10182c, 0.22);
    g.fillEllipse(T / 2, T / 2, T * 0.66, T * 0.4);
    g.generateTexture(TEX_SHADOW, T, T);
    g.destroy();
  }

  // ---- Furniture (top-down footprints) ----
  // Desk with monitor.
  {
    const g = gfx(scene);
    g.fillStyle(0x8a6b4f, 1);
    g.fillRoundedRect(4, 10, T - 8, T - 16, 5);
    g.fillStyle(0x9c7c5c, 1);
    g.fillRoundedRect(6, 12, T - 12, T - 22, 4);
    g.fillStyle(0x2b3242, 1); // monitor
    g.fillRoundedRect(T / 2 - 9, 4, 18, 12, 2);
    g.fillStyle(0x5fd0c4, 1);
    g.fillRect(T / 2 - 7, 6, 14, 8);
    g.fillStyle(0x1f2530, 1); // keyboard
    g.fillRoundedRect(T / 2 - 9, T - 18, 18, 6, 1);
    g.generateTexture('desk', T, T);
    g.destroy();
  }
  // Server rack.
  {
    const g = gfx(scene);
    g.fillStyle(0x333b4a, 1);
    g.fillRoundedRect(8, 4, T - 16, T - 8, 4);
    g.fillStyle(0x232a36, 1);
    for (let i = 0; i < 4; i++) g.fillRect(12, 9 + i * 9, T - 24, 5);
    g.fillStyle(0x59f08a, 1);
    g.fillCircle(15, 11, 1.6);
    g.fillStyle(0xffd45e, 1);
    g.fillCircle(15, 20, 1.6);
    g.fillStyle(0x59f08a, 1);
    g.fillCircle(15, 29, 1.6);
    g.generateTexture('server', T, T);
    g.destroy();
  }
  // Plant.
  {
    const g = gfx(scene);
    g.fillStyle(0x8d6e52, 1);
    g.fillRoundedRect(T / 2 - 8, T / 2 + 2, 16, 14, 3);
    g.fillStyle(0x4caf78, 1);
    g.fillCircle(T / 2, T / 2 - 2, 14);
    g.fillStyle(0x3a8a5f, 1);
    g.fillCircle(T / 2 - 7, T / 2 + 2, 8);
    g.fillCircle(T / 2 + 7, T / 2, 7);
    g.fillStyle(0x6fd49b, 1);
    g.fillCircle(T / 2 - 2, T / 2 - 7, 6);
    g.generateTexture('plant', T, T);
    g.destroy();
  }
  // Filing cabinet.
  {
    const g = gfx(scene);
    g.fillStyle(0xb9c2d4, 1);
    g.fillRoundedRect(8, 6, T - 16, T - 12, 3);
    g.fillStyle(0x95a0b8, 1);
    for (let i = 0; i < 3; i++) g.fillRect(11, 10 + i * 11, T - 22, 8);
    g.fillStyle(0x6b768a, 1);
    for (let i = 0; i < 3; i++) g.fillRect(T / 2 - 4, 13 + i * 11, 8, 2);
    g.generateTexture('cabinet', T, T);
    g.destroy();
  }
  // Water cooler.
  {
    const g = gfx(scene);
    g.fillStyle(0xdfe7f0, 1);
    g.fillRoundedRect(12, 10, T - 24, T - 16, 4);
    g.fillStyle(0x6cc6e8, 0.9);
    g.fillCircle(T / 2, 12, 8);
    g.fillStyle(0x9ad9f0, 0.9);
    g.fillCircle(T / 2 - 3, 10, 4);
    g.generateTexture('cooler', T, T);
    g.destroy();
  }
  // Sofa.
  {
    const g = gfx(scene);
    g.fillStyle(0x55719f, 1);
    g.fillRoundedRect(4, 6, T - 8, T - 12, 6);
    g.fillStyle(0x6b8cce, 1);
    g.fillRoundedRect(7, 12, T - 14, T - 20, 5);
    g.fillStyle(0x7d9cd8, 1);
    g.fillRoundedRect(9, 14, (T - 18) / 2 - 1, T - 24, 3);
    g.fillRoundedRect(T / 2 + 1, 14, (T - 18) / 2 - 1, T - 24, 3);
    g.generateTexture('sofa', T, T);
    g.destroy();
  }
}
