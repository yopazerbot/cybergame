import Phaser from 'phaser';
import { TILE_W, TILE_H } from '../core/config';
import { STAKEHOLDERS } from '../scenario/stakeholders';

// Generates every texture the game needs at runtime — no external art assets.

const FLOOR_A = 0xe9eef7;
const FLOOR_B = 0xdfe6f2;
const FLOOR_LINE = 0xc7d2e6;
const ACCENT_RUG = 0xb7e0d6;
const WALL_TOP = 0xbcc7da;
const WALL_LEFT = 0x9aa7c0;
const WALL_RIGHT = 0x7f8db0;

function diamondPoints(): Phaser.Types.Math.Vector2Like[] {
  return [
    { x: 0, y: TILE_H / 2 },
    { x: TILE_W / 2, y: 0 },
    { x: TILE_W, y: TILE_H / 2 },
    { x: TILE_W / 2, y: TILE_H },
  ];
}

function makeFloor(scene: Phaser.Scene, key: string, fill: number): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(fill, 1);
  g.fillPoints(diamondPoints(), true);
  g.lineStyle(1, FLOOR_LINE, 0.8);
  g.strokePoints(diamondPoints(), true);
  g.generateTexture(key, TILE_W, TILE_H);
  g.destroy();
}

/** A 2.5D box (wall / furniture) drawn as a top diamond plus two shaded side faces. */
function makeBox(
  scene: Phaser.Scene,
  key: string,
  height: number,
  top: number,
  left: number,
  right: number,
): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const h = height;

  // Left face.
  g.fillStyle(left, 1);
  g.fillPoints(
    [
      { x: 0, y: TILE_H / 2 },
      { x: TILE_W / 2, y: TILE_H },
      { x: TILE_W / 2, y: TILE_H + h },
      { x: 0, y: TILE_H / 2 + h },
    ],
    true,
  );
  // Right face.
  g.fillStyle(right, 1);
  g.fillPoints(
    [
      { x: TILE_W, y: TILE_H / 2 },
      { x: TILE_W / 2, y: TILE_H },
      { x: TILE_W / 2, y: TILE_H + h },
      { x: TILE_W, y: TILE_H / 2 + h },
    ],
    true,
  );
  // Top.
  g.fillStyle(top, 1);
  g.fillPoints(diamondPoints(), true);

  g.generateTexture(key, TILE_W, TILE_H + h);
  g.destroy();
}

/** A friendly character sprite: soft shadow + rounded body + head + accent stripe. */
function makeCharacter(scene: Phaser.Scene, key: string, body: number, accent: number): void {
  const w = 44;
  const h = 64;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);

  // Drop shadow.
  g.fillStyle(0x1a2236, 0.18);
  g.fillEllipse(w / 2, h - 6, 30, 12);

  // Body (rounded).
  g.fillStyle(body, 1);
  g.fillRoundedRect(w / 2 - 14, 26, 28, 30, 10);
  // Accent stripe.
  g.fillStyle(accent, 1);
  g.fillRoundedRect(w / 2 - 14, 42, 28, 8, 4);

  // Head.
  g.fillStyle(0xffe0bd, 1);
  g.fillCircle(w / 2, 18, 12);
  // Hair / cap hint.
  g.fillStyle(accent, 1);
  g.fillRoundedRect(w / 2 - 12, 6, 24, 9, 5);

  g.generateTexture(key, w, h);
  g.destroy();
}

export const CHAR_PLAYER = 'char_player';

export function generateTextures(scene: Phaser.Scene): void {
  makeFloor(scene, 'floor_a', FLOOR_A);
  makeFloor(scene, 'floor_b', FLOOR_B);
  makeFloor(scene, 'floor_accent', ACCENT_RUG);

  makeBox(scene, 'wall', 40, WALL_TOP, WALL_LEFT, WALL_RIGHT);
  makeBox(scene, 'desk', 16, 0x8d6e52, 0x6f553f, 0x5a4532);
  makeBox(scene, 'server', 28, 0x415066, 0x2f3b4d, 0x232c3a);
  makeBox(scene, 'plant', 22, 0x4caf78, 0x3a8a5f, 0x2f6f4d);

  // Player + one character texture per stakeholder colour set.
  makeCharacter(scene, CHAR_PLAYER, 0x2d6cdf, 0x163a82);
  for (const s of STAKEHOLDERS) {
    makeCharacter(scene, `char_${s.id}`, s.colors.body, s.colors.accent);
  }
}
