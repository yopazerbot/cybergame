import Phaser from 'phaser';
import { TILE_W, TILE_H } from '../core/config';
import { STAKEHOLDERS } from '../scenario/stakeholders';

// Generates every texture the game needs at runtime — no external art assets.

const FLOOR_A = 0xeef2fb;
const FLOOR_B = 0xe2e8f6;
const FLOOR_EDGE = 0xcdd8ee;
const FLOOR_HI = 0xffffff;
const WALL_TOP = 0xc6d0e4;
const WALL_LEFT = 0x9aa7c4;
const WALL_RIGHT = 0x7e8cae;
const WALL_WINDOW = 0xbfe3f5;

function diamondPoints(cx = 0, cy = 0, sx = 1, sy = 1): Phaser.Types.Math.Vector2Like[] {
  return [
    { x: cx + 0, y: cy + (TILE_H / 2) * sy },
    { x: cx + (TILE_W / 2) * sx, y: cy + 0 },
    { x: cx + TILE_W * sx, y: cy + (TILE_H / 2) * sy },
    { x: cx + (TILE_W / 2) * sx, y: cy + TILE_H * sy },
  ];
}

function makeFloor(scene: Phaser.Scene, key: string, fill: number, edge = FLOOR_EDGE): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(fill, 1);
  g.fillPoints(diamondPoints(), true);
  // Subtle top-left highlight wedge for a soft-lit look.
  g.fillStyle(FLOOR_HI, 0.25);
  g.fillPoints(
    [
      { x: TILE_W / 2, y: 0 },
      { x: TILE_W, y: TILE_H / 2 },
      { x: TILE_W / 2, y: TILE_H / 2 },
    ],
    true,
  );
  g.lineStyle(1, edge, 0.9);
  g.strokePoints(diamondPoints(), true);
  g.generateTexture(key, TILE_W, TILE_H);
  g.destroy();
}

/** A plain white diamond used as a tintable rug / highlight. */
function makeDiamond(scene: Phaser.Scene, key: string, stroke = false): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0xffffff, 1);
  g.fillPoints(diamondPoints(), true);
  if (stroke) {
    g.lineStyle(3, 0xffffff, 1);
    g.strokePoints(diamondPoints(2, 2, 0.92, 0.92), true);
  }
  g.generateTexture(key, TILE_W, TILE_H);
  g.destroy();
}

/** Hover highlight: a bright diamond outline. */
function makeTileHighlight(scene: Phaser.Scene, key: string): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.lineStyle(2.5, 0xffffff, 0.95);
  g.strokePoints(diamondPoints(2, 2, 0.93, 0.93), true);
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
  decorate?: (g: Phaser.GameObjects.Graphics, h: number) => void,
): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const h = height;

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
  g.fillStyle(top, 1);
  g.fillPoints(diamondPoints(), true);

  if (decorate) decorate(g, h);

  g.generateTexture(key, TILE_W, TILE_H + h);
  g.destroy();
}

/** A friendly little character: shadow, legs, body, arms, head with hair + eyes. */
function makeCharacter(scene: Phaser.Scene, key: string, body: number, accent: number): void {
  const w = 48;
  const h = 72;
  const cx = w / 2;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const darker = Phaser.Display.Color.IntegerToColor(body).darken(18).color;

  // Drop shadow.
  g.fillStyle(0x16203a, 0.18);
  g.fillEllipse(cx, h - 5, 32, 11);

  // Legs.
  g.fillStyle(accent, 1);
  g.fillRoundedRect(cx - 11, 50, 9, 16, 4);
  g.fillRoundedRect(cx + 2, 50, 9, 16, 4);

  // Arms (behind body edges).
  g.fillStyle(darker, 1);
  g.fillRoundedRect(cx - 18, 30, 8, 22, 4);
  g.fillRoundedRect(cx + 10, 30, 8, 22, 4);

  // Body.
  g.fillStyle(body, 1);
  g.fillRoundedRect(cx - 14, 26, 28, 30, 11);
  // Accent stripe.
  g.fillStyle(accent, 1);
  g.fillRoundedRect(cx - 14, 43, 28, 7, 4);
  // Body shading.
  g.fillStyle(darker, 0.5);
  g.fillRoundedRect(cx - 14, 50, 28, 6, 4);

  // Head.
  g.fillStyle(0xffe0bd, 1);
  g.fillCircle(cx, 17, 12);
  // Hair.
  g.fillStyle(accent, 1);
  g.fillRoundedRect(cx - 12, 5, 24, 10, 6);
  g.fillRect(cx - 12, 12, 24, 2);
  // Eyes.
  g.fillStyle(0x2a2f44, 1);
  g.fillCircle(cx - 4, 18, 1.7);
  g.fillCircle(cx + 4, 18, 1.7);

  g.generateTexture(key, w, h);
  g.destroy();
}

export const CHAR_PLAYER = 'char_player';
export const TEX_RUG = 'rug';
export const TEX_RING = 'ring';
export const TEX_TILE_HI = 'tile_hi';

export function generateTextures(scene: Phaser.Scene): void {
  makeFloor(scene, 'floor_a', FLOOR_A);
  makeFloor(scene, 'floor_b', FLOOR_B);
  makeFloor(scene, 'floor_accent', 0xcfeae0);
  makeDiamond(scene, TEX_RUG);
  makeDiamond(scene, TEX_RING, true);
  makeTileHighlight(scene, TEX_TILE_HI);

  // Wall with a soft top trim + light strips on the visible faces.
  makeBox(scene, 'wall', 42, WALL_TOP, WALL_LEFT, WALL_RIGHT, (g) => {
    // Subtle skirting highlight where each face meets the top.
    g.fillStyle(WALL_WINDOW, 0.35);
    g.fillPoints(
      [
        { x: 4, y: TILE_H / 2 + 4 },
        { x: TILE_W / 2 - 2, y: TILE_H + 2 },
        { x: TILE_W / 2 - 2, y: TILE_H + 8 },
        { x: 4, y: TILE_H / 2 + 10 },
      ],
      true,
    );
  });
  // Desk with a monitor.
  makeBox(scene, 'desk', 16, 0x9a7a5b, 0x7a5f47, 0x624c39, (g) => {
    g.fillStyle(0x2b3242, 1);
    g.fillRoundedRect(TILE_W / 2 - 7, 2, 14, 9, 2);
    g.fillStyle(0x5fd0c4, 1);
    g.fillRect(TILE_W / 2 - 5, 4, 10, 5);
  });
  // Server rack with blinking lights.
  makeBox(scene, 'server', 30, 0x3c4a60, 0x2c3748, 0x202836, (g) => {
    g.fillStyle(0x59f08a, 1);
    g.fillCircle(TILE_W / 2 - 6, 8, 1.6);
    g.fillStyle(0xffd45e, 1);
    g.fillCircle(TILE_W / 2, 8, 1.6);
    g.fillStyle(0x59f08a, 1);
    g.fillCircle(TILE_W / 2 + 6, 8, 1.6);
  });
  // Plant.
  makeBox(scene, 'plant', 14, 0x8d6e52, 0x6f553f, 0x5a4532, (g) => {
    g.fillStyle(0x4caf78, 1);
    g.fillCircle(TILE_W / 2, -2, 11);
    g.fillStyle(0x3a8a5f, 1);
    g.fillCircle(TILE_W / 2 - 5, 1, 7);
    g.fillCircle(TILE_W / 2 + 5, 0, 6);
  });

  makeCharacter(scene, CHAR_PLAYER, 0x2d6cdf, 0x163a82);
  for (const s of STAKEHOLDERS) {
    makeCharacter(scene, `char_${s.id}`, s.colors.body, s.colors.accent);
  }
}
