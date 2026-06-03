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
  g.fillStyle(FLOOR_HI, 0.18);
  g.fillPoints(
    [
      { x: TILE_W / 2, y: 0 },
      { x: TILE_W, y: TILE_H / 2 },
      { x: TILE_W / 2, y: TILE_H / 2 },
    ],
    true,
  );
  // Inset bevel: a lighter inner ring just inside the grout line.
  g.lineStyle(1, FLOOR_HI, 0.35);
  g.strokePoints(diamondPoints(2, 1.5, 0.94, 0.94), true);
  // Grout edge.
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

/** A point on a wall side face, parameterised by u (0..1 across) and v (px down). */
function facePt(face: 'left' | 'right', u: number, v: number): Phaser.Types.Math.Vector2Like {
  return face === 'left'
    ? { x: (u * TILE_W) / 2, y: TILE_H / 2 + (u * TILE_H) / 2 + v }
    : { x: TILE_W - (u * TILE_W) / 2, y: TILE_H / 2 + (u * TILE_H) / 2 + v };
}

/** Fill a rectangular patch aligned to a wall side face. */
function facePatch(
  g: Phaser.GameObjects.Graphics,
  face: 'left' | 'right',
  u0: number,
  u1: number,
  v0: number,
  v1: number,
  color: number,
  alpha = 1,
): void {
  g.fillStyle(color, alpha);
  g.fillPoints(
    [facePt(face, u0, v0), facePt(face, u1, v0), facePt(face, u1, v1), facePt(face, u0, v1)],
    true,
  );
}

/** A taller, Habbo-style avatar: dark outline, big head, shaded torso, legs + shoes, face. */
function makeCharacter(
  scene: Phaser.Scene,
  key: string,
  body: number,
  accent: number,
  role = '',
): void {
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
  g.lineStyle(2, OUT, 0.85);
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
  g.lineStyle(2, OUT, 0.8);
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
  g.lineStyle(2, OUT, 0.85);
  g.strokeRoundedRect(cx - 17, 30, 34, 34, 13);

  // Head.
  g.fillStyle(skin, 1);
  g.fillCircle(cx, 18, 14);
  g.fillStyle(skinDk, 0.5);
  g.fillEllipse(cx + 5, 22, 14, 16);
  g.lineStyle(2, OUT, 0.85);
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

  // Small per-role accents so stakeholders are recognisable.
  if (role === 'management') {
    g.fillStyle(0xc0392b, 1); // tie
    g.fillTriangle(cx - 2.5, 37, cx + 2.5, 37, cx, 41);
    g.fillRect(cx - 1.6, 40, 3.2, 14);
  } else if (role === 'dpo') {
    g.lineStyle(1.6, 0x2a2f44, 1); // glasses
    g.strokeCircle(cx - 5, 19, 3.2);
    g.strokeCircle(cx + 5, 19, 3.2);
    g.lineBetween(cx - 1.8, 19, cx + 1.8, 19);
  } else if (role === 'tech') {
    g.lineStyle(2.2, 0x2a2f44, 1); // headset band
    g.beginPath();
    g.arc(cx, 14, 15, 1.05 * Math.PI, 1.95 * Math.PI, false);
    g.strokePath();
    g.fillStyle(0x2a2f44, 1);
    g.fillCircle(cx - 14, 19, 2.6);
    g.fillRect(cx - 14, 19, 7, 1.6); // mic boom
  }

  g.setScale(ART_SCALE);
  g.generateTexture(key, w * ART_SCALE, h * ART_SCALE);
  g.destroy();
}

/** Soft radial glow for a warm room light (displayed with ADD blend). */
function makeLight(scene: Phaser.Scene, key: string): void {
  const W = 360;
  const H = 240;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const steps = 22;
  for (let i = steps; i > 0; i--) {
    const t = i / steps;
    g.fillStyle(0xffffff, 0.045);
    g.fillEllipse(W / 2, H / 2, W * t, H * t);
  }
  g.generateTexture(key, W, H);
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
export const TEX_GLOW = 'glow';

export function generateTextures(scene: Phaser.Scene): void {
  makeFloor(scene, 'floor_a', FLOOR_A);
  makeFloor(scene, 'floor_b', FLOOR_B);
  makeFloor(scene, 'floor_accent', 0xcfeae0);
  makeDiamond(scene, TEX_RUG);
  makeDiamond(scene, TEX_RING, true);
  makeTileHighlight(scene, TEX_TILE_HI);
  makeShadow(scene, TEX_SHADOW);
  makeLight(scene, TEX_GLOW);

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
  // Window wall: a big sky pane with mullions on each visible face.
  makeBox(scene, 'wall_window', 54, WALL_TOP, WALL_LEFT, WALL_RIGHT, (g) => {
    for (const face of ['left', 'right'] as const) {
      facePatch(g, face, 0.16, 0.84, 12, 40, 0x2a3550, 1); // frame
      facePatch(g, face, 0.22, 0.78, 15, 37, WALL_WINDOW, 1); // pane
      facePatch(g, face, 0.22, 0.5, 15, 26, 0xffffff, 0.28); // sky sheen
      facePatch(g, face, 0.49, 0.51, 15, 37, 0x2a3550, 1); // vertical mullion
      facePatch(g, face, 0.22, 0.78, 25, 26.6, 0x2a3550, 1); // horizontal mullion
    }
  });
  // Picture wall: a framed abstract on each face.
  makeBox(scene, 'wall_picture', 54, WALL_TOP, WALL_LEFT, WALL_RIGHT, (g) => {
    for (const face of ['left', 'right'] as const) {
      facePatch(g, face, 0.28, 0.72, 14, 34, 0x6b4f33, 1); // frame
      facePatch(g, face, 0.32, 0.68, 16, 32, 0xf3eede, 1); // mat
      facePatch(g, face, 0.36, 0.64, 18, 26, 0x4a90c2, 1);
      facePatch(g, face, 0.36, 0.5, 26, 30, 0x84b86a, 1);
    }
  });
  // Clock wall: a round clock high on each face.
  makeBox(scene, 'wall_clock', 54, WALL_TOP, WALL_LEFT, WALL_RIGHT, (g) => {
    for (const face of ['left', 'right'] as const) {
      const c = facePt(face, 0.5, 22);
      g.fillStyle(0xf7f9ff, 1);
      g.fillCircle(c.x as number, c.y as number, 7);
      g.lineStyle(1.4, 0x2a3550, 1);
      g.strokeCircle(c.x as number, c.y as number, 7);
      g.lineStyle(1.4, 0x2a3550, 1);
      g.lineBetween(c.x as number, c.y as number, c.x as number, (c.y as number) - 4);
      g.lineBetween(c.x as number, c.y as number, (c.x as number) + 3.5, c.y as number);
    }
  });
  // Low interior partition (half-height) so the camera sees over it into back rooms.
  makeBox(scene, 'wall_low', 24, WALL_TOP, WALL_LEFT, WALL_RIGHT, (g, h) => {
    const band = (left: boolean, off: number, depth: number) =>
      left
        ? [
            { x: 0, y: TILE_H / 2 + off },
            { x: TILE_W / 2, y: TILE_H + off },
            { x: TILE_W / 2, y: TILE_H + off + depth },
            { x: 0, y: TILE_H / 2 + off + depth },
          ]
        : [
            { x: TILE_W, y: TILE_H / 2 + off },
            { x: TILE_W / 2, y: TILE_H + off },
            { x: TILE_W / 2, y: TILE_H + off + depth },
            { x: TILE_W, y: TILE_H / 2 + off + depth },
          ];
    // Bright top trim.
    g.fillStyle(0xffffff, 0.24);
    g.fillPoints(band(true, 0, 5), true);
    g.fillPoints(band(false, 0, 5), true);
    // Skirting.
    g.fillStyle(0x000000, 0.16);
    g.fillPoints(band(true, h - 6, 6), true);
    g.fillPoints(band(false, h - 6, 6), true);
  });
  // Desk with dual monitors, a keyboard and a mug.
  makeBox(scene, 'desk', 16, 0x9a7a5b, 0x7a5f47, 0x624c39, (g) => {
    const cx = TILE_W / 2;
    // Two monitors.
    g.fillStyle(0x2b3242, 1);
    g.fillRoundedRect(cx - 12, 1, 11, 9, 2);
    g.fillRoundedRect(cx + 1, 1, 11, 9, 2);
    g.fillStyle(0x5fd0c4, 1);
    g.fillRect(cx - 10, 3, 7, 5);
    g.fillStyle(0x8fb3ff, 1);
    g.fillRect(cx + 3, 3, 7, 5);
    // Keyboard.
    g.fillStyle(0x3a4255, 1);
    g.fillRoundedRect(cx - 7, 11, 14, 4, 1.5);
    // Mug.
    g.fillStyle(0xe06a55, 1);
    g.fillCircle(cx + 12, 13, 2.4);
  });
  // Server rack with stacked status LEDs.
  makeBox(scene, 'server', 30, 0x3c4a60, 0x2c3748, 0x202836, (g) => {
    const cx = TILE_W / 2;
    const leds = [0x59f08a, 0xffd45e, 0x59f08a, 0x4ab6ff, 0x59f08a];
    for (let r = 0; r < leds.length; r++) {
      g.fillStyle(leds[r], 1);
      g.fillCircle(cx - 7, 5 + r * 4, 1.5);
      g.fillStyle(0x59f08a, r % 2 ? 1 : 0.4);
      g.fillCircle(cx + 7, 5 + r * 4, 1.5);
    }
    // Vent slot.
    g.fillStyle(0x161d2a, 0.8);
    g.fillRoundedRect(cx - 3, 4, 6, 18, 1.5);
  });
  // Leafy plant.
  makeBox(scene, 'plant', 14, 0x8d6e52, 0x6f553f, 0x5a4532, (g) => {
    const cx = TILE_W / 2;
    g.fillStyle(0x3a8a5f, 1);
    g.fillCircle(cx - 6, 1, 8);
    g.fillCircle(cx + 6, 1, 7);
    g.fillStyle(0x4caf78, 1);
    g.fillCircle(cx, -3, 11);
    g.fillCircle(cx - 7, -2, 6);
    g.fillCircle(cx + 7, -2, 6);
    g.fillStyle(0x6fd49b, 1);
    g.fillCircle(cx - 3, -7, 5);
    g.fillCircle(cx + 4, -6, 4);
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
  generateCharacters(scene, STAKEHOLDERS);
}

/** (Re)generate the per-stakeholder avatar textures — used to swap personas by mode. */
export function generateCharacters(
  scene: Phaser.Scene,
  stakeholders: { id: string; colors: { body: number; accent: number } }[],
): void {
  for (const s of stakeholders) {
    makeCharacter(scene, `char_${s.id}`, s.colors.body, s.colors.accent, s.id);
  }
}
