import Phaser from 'phaser';
import { TILE_W, TILE_H, ART_SCALE, ART_INV } from '../core/config';
import { STAKEHOLDERS } from '../scenario/stakeholders';

// Generates every texture the game needs at runtime — no external art assets.
// Each texture is rendered at ART_SCALE× (the Graphics scale is baked into the
// canvas before generateTexture replays the path), then displayed at 1/ART_SCALE
// via addArt — so the camera zoom never upscales a 1× bitmap (= no blur).

/** Add a supersampled texture to the scene at its logical (1×) display size. */
export function addArt(
  scene: Phaser.Scene,
  x: number,
  y: number,
  key: string,
): Phaser.GameObjects.Image {
  return scene.add.image(x, y, key).setScale(ART_INV);
}

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
  g.setScale(ART_SCALE);
  g.generateTexture(key, TILE_W * ART_SCALE, TILE_H * ART_SCALE);
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
  g.setScale(ART_SCALE);
  g.generateTexture(key, TILE_W * ART_SCALE, TILE_H * ART_SCALE);
  g.destroy();
}

/** Hover highlight: a bright diamond outline. */
function makeTileHighlight(scene: Phaser.Scene, key: string): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.lineStyle(2.5, 0xffffff, 0.95);
  g.strokePoints(diamondPoints(2, 2, 0.93, 0.93), true);
  g.setScale(ART_SCALE);
  g.generateTexture(key, TILE_W * ART_SCALE, TILE_H * ART_SCALE);
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

  g.setScale(ART_SCALE);
  g.generateTexture(key, TILE_W * ART_SCALE, (TILE_H + h) * ART_SCALE);
  g.destroy();
}

/** A taller, Habbo-style avatar: dark outline, big head, shaded torso, legs + shoes, face. */
function makeCharacter(scene: Phaser.Scene, key: string, body: number, accent: number): void {
  const w = 58;
  const h = 96;
  const cx = w / 2;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const dark = Phaser.Display.Color.IntegerToColor(body).darken(26).color;
  const light = Phaser.Display.Color.IntegerToColor(body).lighten(18).color;
  const skin = 0xfcd9b0;
  const skinDk = 0xe9b98a;
  const hairDark = Phaser.Display.Color.IntegerToColor(accent).darken(14).color;
  const OUT = 0x232a3d; // outline colour

  // Drop shadow.
  g.fillStyle(0x16203a, 0.22);
  g.fillEllipse(cx, h - 4, 40, 13);

  // Trousers + legs.
  g.lineStyle(2, OUT, 0.5);
  g.fillStyle(0x3a4157, 1);
  g.fillRoundedRect(cx - 12, 58, 11, 20, 4);
  g.fillRoundedRect(cx + 1, 58, 11, 20, 4);
  g.strokeRoundedRect(cx - 12, 58, 11, 20, 4);
  g.strokeRoundedRect(cx + 1, 58, 11, 20, 4);
  // Shoes.
  g.fillStyle(0x23283a, 1);
  g.fillRoundedRect(cx - 14, 75, 13, 8, 3);
  g.fillRoundedRect(cx + 1, 75, 13, 8, 3);

  // Arms.
  g.fillStyle(dark, 1);
  g.lineStyle(2, OUT, 0.45);
  g.fillRoundedRect(cx - 21, 33, 9, 26, 4);
  g.fillRoundedRect(cx + 12, 33, 9, 26, 4);
  g.strokeRoundedRect(cx - 21, 33, 9, 26, 4);
  g.strokeRoundedRect(cx + 12, 33, 9, 26, 4);
  g.fillStyle(skin, 1); // hands
  g.fillCircle(cx - 16, 58, 4);
  g.fillCircle(cx + 16, 58, 4);

  // Torso with shading.
  g.fillStyle(body, 1);
  g.fillRoundedRect(cx - 17, 30, 34, 34, 13);
  g.fillStyle(light, 0.55);
  g.fillRoundedRect(cx - 17, 30, 34, 14, 13);
  g.fillStyle(dark, 0.5);
  g.fillRoundedRect(cx - 17, 54, 34, 10, 9);
  // Collar.
  g.fillStyle(accent, 1);
  g.fillTriangle(cx - 7, 31, cx + 7, 31, cx, 44);
  g.fillStyle(skin, 1);
  g.fillTriangle(cx - 3, 31, cx + 3, 31, cx, 37);
  // Torso outline.
  g.lineStyle(2, OUT, 0.5);
  g.strokeRoundedRect(cx - 17, 30, 34, 34, 13);

  // Head.
  g.fillStyle(skin, 1);
  g.fillCircle(cx, 18, 14);
  g.fillStyle(skinDk, 0.5);
  g.fillEllipse(cx + 5, 22, 14, 16);
  g.lineStyle(2, OUT, 0.5);
  g.strokeCircle(cx, 18, 14);
  // Ears.
  g.fillStyle(skin, 1);
  g.fillCircle(cx - 13, 19, 2.6);
  g.fillCircle(cx + 13, 19, 2.6);
  // Hair.
  g.fillStyle(accent, 1);
  g.fillRoundedRect(cx - 14, 3, 28, 12, 7);
  g.fillStyle(hairDark, 1);
  g.fillRect(cx - 14, 12, 28, 2);
  g.fillCircle(cx - 10, 6, 4.5);
  g.fillCircle(cx, 4, 5.5);
  g.fillCircle(cx + 10, 6, 4.5);
  // Eyes + brows.
  g.fillStyle(0x2a2f44, 1);
  g.fillCircle(cx - 5, 19, 2);
  g.fillCircle(cx + 5, 19, 2);
  // Smile.
  g.lineStyle(1.6, 0xb07a4e, 1);
  g.beginPath();
  g.arc(cx, 21, 4.5, 0.18 * Math.PI, 0.82 * Math.PI, false);
  g.strokePath();

  g.setScale(ART_SCALE);
  g.generateTexture(key, w * ART_SCALE, h * ART_SCALE);
  g.destroy();
}

/** Soft contact shadow blob for furniture. */
function makeShadow(scene: Phaser.Scene, key: string): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0x16203a, 0.16);
  g.fillEllipse(TILE_W / 2, TILE_H / 2, TILE_W * 0.7, TILE_H * 0.62);
  g.setScale(ART_SCALE);
  g.generateTexture(key, TILE_W * ART_SCALE, TILE_H * ART_SCALE);
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

  // Habbo-style wall: tall, with a bright top trim and a darker skirting band.
  makeBox(scene, 'wall', 54, WALL_TOP, WALL_LEFT, WALL_RIGHT, (g, h) => {
    const band = (x1: number, y1: number, x2: number, y2: number, off: number, depth: number) => [
      { x: x1, y: y1 + off },
      { x: x2, y: y2 + off },
      { x: x2, y: y2 + off + depth },
      { x: x1, y: y1 + off + depth },
    ];
    // Top trim highlight on both visible faces.
    g.fillStyle(0xffffff, 0.22);
    g.fillPoints(band(0, TILE_H / 2, TILE_W / 2, TILE_H, 0, 6), true);
    g.fillPoints(band(TILE_W, TILE_H / 2, TILE_W / 2, TILE_H, 0, 6), true);
    // Dark skirting near the floor.
    g.fillStyle(0x000000, 0.16);
    g.fillPoints(band(0, TILE_H / 2, TILE_W / 2, TILE_H, h - 8, 8), true);
    g.fillPoints(band(TILE_W, TILE_H / 2, TILE_W / 2, TILE_H, h - 8, 8), true);
    // Subtle window on the right face.
    g.fillStyle(WALL_WINDOW, 0.7);
    g.fillPoints(
      [
        { x: TILE_W - 6, y: TILE_H / 2 + 14 },
        { x: TILE_W / 2 + 8, y: TILE_H + 6 },
        { x: TILE_W / 2 + 8, y: TILE_H + 24 },
        { x: TILE_W - 6, y: TILE_H / 2 + 32 },
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
    g.fillStyle(0x6fd49b, 1);
    g.fillCircle(TILE_W / 2 - 2, -5, 5);
  });
  // Filing cabinet with drawer handles.
  makeBox(scene, 'cabinet', 30, 0xb9c2d4, 0x95a0b8, 0x7c889f, (g, h) => {
    g.fillStyle(0x6b768a, 1);
    for (let i = 0; i < 3; i++) {
      const yy = TILE_H / 2 + 8 + i * (h / 3 - 2);
      g.fillRoundedRect(8, yy, 12, 3, 1.5);
    }
  });
  // Water cooler.
  makeBox(scene, 'cooler', 26, 0xdfe7f0, 0xc3cdda, 0xaab6c6, (g) => {
    g.fillStyle(0x6cc6e8, 0.9);
    g.fillCircle(TILE_W / 2, 0, 8);
    g.fillStyle(0x9ad9f0, 0.9);
    g.fillCircle(TILE_W / 2 - 3, -2, 4);
  });

  makeCharacter(scene, CHAR_PLAYER, 0x2d6cdf, 0x163a82);
  for (const s of STAKEHOLDERS) {
    makeCharacter(scene, `char_${s.id}`, s.colors.body, s.colors.accent);
  }
}
