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

/** A friendly, more detailed character: shadow, shoes, shaded body, arms, head with face. */
function makeCharacter(scene: Phaser.Scene, key: string, body: number, accent: number): void {
  const w = 52;
  const h = 78;
  const cx = w / 2;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const dark = Phaser.Display.Color.IntegerToColor(body).darken(22).color;
  const light = Phaser.Display.Color.IntegerToColor(body).lighten(16).color;
  const hairDark = Phaser.Display.Color.IntegerToColor(accent).darken(12).color;

  // Drop shadow.
  g.fillStyle(0x16203a, 0.2);
  g.fillEllipse(cx, h - 4, 34, 11);

  // Legs + shoes.
  g.fillStyle(0x3a4055, 1);
  g.fillRoundedRect(cx - 11, 52, 9, 15, 4);
  g.fillRoundedRect(cx + 2, 52, 9, 15, 4);
  g.fillStyle(0x20242f, 1);
  g.fillRoundedRect(cx - 12, 63, 11, 6, 3);
  g.fillRoundedRect(cx + 1, 63, 11, 6, 3);

  // Arms.
  g.fillStyle(dark, 1);
  g.fillRoundedRect(cx - 19, 30, 8, 23, 4);
  g.fillRoundedRect(cx + 11, 30, 8, 23, 4);
  g.fillStyle(0xffe0bd, 1); // hands
  g.fillCircle(cx - 15, 52, 3.5);
  g.fillCircle(cx + 15, 52, 3.5);

  // Body with shading.
  g.fillStyle(body, 1);
  g.fillRoundedRect(cx - 15, 26, 30, 31, 12);
  g.fillStyle(light, 0.5); // top-left light
  g.fillRoundedRect(cx - 15, 26, 30, 13, 12);
  g.fillStyle(dark, 0.55); // bottom shade
  g.fillRoundedRect(cx - 15, 48, 30, 9, 8);
  // Collar V.
  g.fillStyle(accent, 1);
  g.fillTriangle(cx - 6, 27, cx + 6, 27, cx, 38);
  g.fillStyle(0xffe0bd, 1);
  g.fillTriangle(cx - 3, 27, cx + 3, 27, cx, 33);
  // Body outline.
  g.lineStyle(1.5, 0x222a3d, 0.18);
  g.strokeRoundedRect(cx - 15, 26, 30, 31, 12);

  // Head.
  g.fillStyle(0xffe0bd, 1);
  g.fillCircle(cx, 16, 12.5);
  g.lineStyle(1.5, 0x222a3d, 0.16);
  g.strokeCircle(cx, 16, 12.5);
  // Ears.
  g.fillStyle(0xf2cda6, 1);
  g.fillCircle(cx - 12, 17, 2.4);
  g.fillCircle(cx + 12, 17, 2.4);
  // Hair.
  g.fillStyle(accent, 1);
  g.fillRoundedRect(cx - 13, 3, 26, 11, 6);
  g.fillStyle(hairDark, 1);
  g.fillRect(cx - 13, 11, 26, 2);
  g.fillCircle(cx - 9, 6, 4);
  g.fillCircle(cx, 4, 5);
  g.fillCircle(cx + 9, 6, 4);
  // Eyes.
  g.fillStyle(0x2a2f44, 1);
  g.fillCircle(cx - 4.5, 17, 1.8);
  g.fillCircle(cx + 4.5, 17, 1.8);
  // Smile.
  g.lineStyle(1.4, 0xb07a4e, 1);
  g.beginPath();
  g.arc(cx, 19, 4, 0.18 * Math.PI, 0.82 * Math.PI, false);
  g.strokePath();

  g.generateTexture(key, w, h);
  g.destroy();
}

/** Soft contact shadow blob for furniture. */
function makeShadow(scene: Phaser.Scene, key: string): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0x16203a, 0.16);
  g.fillEllipse(TILE_W / 2, TILE_H / 2, TILE_W * 0.7, TILE_H * 0.62);
  g.generateTexture(key, TILE_W, TILE_H);
  g.destroy();
}

export const CHAR_PLAYER = 'char_player';
export const TEX_RUG = 'rug';
export const TEX_RING = 'ring';
export const TEX_TILE_HI = 'tile_hi';
export const TEX_SHADOW = 'shadow';

export function generateTextures(scene: Phaser.Scene): void {
  makeFloor(scene, 'floor_a', FLOOR_A);
  makeFloor(scene, 'floor_b', FLOOR_B);
  makeFloor(scene, 'floor_accent', 0xcfeae0);
  makeDiamond(scene, TEX_RUG);
  makeDiamond(scene, TEX_RING, true);
  makeTileHighlight(scene, TEX_TILE_HI);
  makeShadow(scene, TEX_SHADOW);

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
