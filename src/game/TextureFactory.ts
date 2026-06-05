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

// RuneScape-style world palette: grassy green ground and warm sandstone walls.
const FLOOR_A = 0x6f9e4a; // grass
const FLOOR_B = 0x648f43; // grass (checker)
const WALL_TOP = 0xcabf98; // sandstone top
const WALL_LEFT = 0xa89a70; // sandstone (lit face)
const WALL_RIGHT = 0x8a7c58; // sandstone (shaded face)
const WALL_WINDOW = 0xbfe3f5;

function diamondPoints(cx = 0, cy = 0, sx = 1, sy = 1): Phaser.Types.Math.Vector2Like[] {
  return [
    { x: cx + 0, y: cy + (TILE_H / 2) * sy },
    { x: cx + (TILE_W / 2) * sx, y: cy + 0 },
    { x: cx + TILE_W * sx, y: cy + (TILE_H / 2) * sy },
    { x: cx + (TILE_W / 2) * sx, y: cy + TILE_H * sy },
  ];
}

/**
 * A soft, feathered ellipse — concentric translucent rings build up density at
 * the centre and fade to nothing at the edge, so shadows have a believable
 * penumbra instead of a hard flat blob. Alpha is per-ring; overlap accumulates.
 */
function featherEllipse(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: number,
  ringAlpha: number,
  steps = 6,
): void {
  for (let i = steps; i >= 1; i--) {
    const t = i / steps;
    g.fillStyle(color, ringAlpha);
    g.fillEllipse(cx, cy, rx * t, ry * t);
  }
}

/**
 * Render a texture through the raw 2D canvas context (drawn at ART_SCALE for
 * supersampling), which — unlike Phaser's flat-fill Graphics — gives real linear
 * and radial gradients, so surfaces can be genuinely shaded rather than
 * single-colour. Returns silently if the key already exists.
 */
function makeCanvasTexture(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
): void {
  const tex = scene.textures.createCanvas(key, Math.ceil(w * ART_SCALE), Math.ceil(h * ART_SCALE));
  if (!tex) return;
  const ctx = tex.getContext();
  ctx.save();
  ctx.scale(ART_SCALE, ART_SCALE);
  draw(ctx);
  ctx.restore();
  tex.refresh();
}

const toCss = (c: number) => '#' + (c & 0xffffff).toString(16).padStart(6, '0');

/** A CSS colour string for `c`, lightened (pct > 0) or darkened (pct < 0). */
function shadeCss(c: number, pct: number): string {
  const col = Phaser.Display.Color.IntegerToColor(c);
  if (pct >= 0) col.lighten(pct);
  else col.darken(-pct);
  return toCss(col.color);
}

/** Like shadeCss but returns an rgba() string at alpha `a` (for soft blending). */
function shadeRgba(c: number, pct: number, a: number): string {
  const col = Phaser.Display.Color.IntegerToColor(c);
  if (pct >= 0) col.lighten(pct);
  else col.darken(-pct);
  return `rgba(${col.red},${col.green},${col.blue},${a})`;
}

function floorDiamondPath(ctx: CanvasRenderingContext2D, inset = 0): void {
  const i = inset;
  ctx.beginPath();
  ctx.moveTo(TILE_W / 2, i);
  ctx.lineTo(TILE_W - i, TILE_H / 2);
  ctx.lineTo(TILE_W / 2, TILE_H - i);
  ctx.lineTo(i, TILE_H / 2);
  ctx.closePath();
}

/**
 * Organic terrain tile (grass / dirt) — RuneScape-style. No grout lines or
 * beveled rim (those read as an indoor tiled floor); instead a near-flat base
 * with mottled patches, fine grain and scattered blades, so neighbouring tiles
 * blend into a continuous, natural ground rather than a grid.
 */
function makeFloor(scene: Phaser.Scene, key: string, fill: number): void {
  makeCanvasTexture(scene, key, TILE_W, TILE_H, (ctx) => {
    ctx.save();
    floorDiamondPath(ctx);
    ctx.clip();

    // Near-flat base with only a whisper of top-down lighting.
    const base = ctx.createLinearGradient(0, 0, 0, TILE_H);
    base.addColorStop(0, shadeCss(fill, 5));
    base.addColorStop(1, shadeCss(fill, -7));
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, TILE_W, TILE_H);

    // Mottled patches — soft blobs of lighter/darker ground.
    for (let i = 0; i < 12; i++) {
      const bx = Math.random() * TILE_W;
      const by = Math.random() * TILE_H;
      const r = 4 + Math.random() * 9;
      const lighten = Math.random() > 0.5;
      const pct = lighten ? 8 + Math.random() * 9 : -(9 + Math.random() * 11);
      const blob = ctx.createRadialGradient(bx, by, 0, bx, by, r);
      blob.addColorStop(0, shadeRgba(fill, pct, 0.5));
      blob.addColorStop(1, shadeRgba(fill, pct, 0));
      ctx.fillStyle = blob;
      ctx.fillRect(0, 0, TILE_W, TILE_H);
    }

    // Fine grain.
    for (let i = 0; i < 70; i++) {
      ctx.fillStyle = shadeRgba(fill, Math.random() > 0.5 ? 16 : -18, 0.18);
      ctx.fillRect(Math.random() * TILE_W, Math.random() * TILE_H, 1, 1);
    }

    // A few short blades catching/giving light.
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = shadeRgba(fill, Math.random() > 0.5 ? 24 : -22, 0.5);
      ctx.fillRect(Math.random() * TILE_W, Math.random() * TILE_H, 0.7, 2);
    }
    ctx.restore();
  });
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

  // Top-edge highlight on the side faces: light catches where the faces meet the
  // lit top, giving each box a soft vertical gradient (bright top → dark base)
  // once paired with the ambient-occlusion bands below.
  const hiBand = Math.min(h * 0.45, 14);
  if (hiBand > 1) {
    g.fillStyle(0xffffff, 0.09);
    g.fillPoints(
      [
        { x: 0, y: TILE_H / 2 },
        { x: TILE_W / 2, y: TILE_H },
        { x: TILE_W / 2, y: TILE_H + hiBand },
        { x: 0, y: TILE_H / 2 + hiBand },
      ],
      true,
    );
    g.fillPoints(
      [
        { x: TILE_W, y: TILE_H / 2 },
        { x: TILE_W / 2, y: TILE_H },
        { x: TILE_W / 2, y: TILE_H + hiBand },
        { x: TILE_W, y: TILE_H / 2 + hiBand },
      ],
      true,
    );
  }

  // Ambient occlusion: a soft dark gradient at the base of the side faces, so the
  // box reads as grounded on the floor rather than pasted on. A few stacked bands
  // approximate a smooth falloff.
  const aoBand = Math.min(h * 0.4, 16);
  if (aoBand > 1) {
    const aoSteps = 3;
    for (let i = 1; i <= aoSteps; i++) {
      const band = (aoBand * i) / aoSteps;
      g.fillStyle(0x0d1426, 0.06);
      g.fillPoints(
        [
          { x: 0, y: TILE_H / 2 + h - band },
          { x: TILE_W / 2, y: TILE_H + h - band },
          { x: TILE_W / 2, y: TILE_H + h },
          { x: 0, y: TILE_H / 2 + h },
        ],
        true,
      );
      g.fillPoints(
        [
          { x: TILE_W, y: TILE_H / 2 + h - band },
          { x: TILE_W / 2, y: TILE_H + h - band },
          { x: TILE_W / 2, y: TILE_H + h },
          { x: TILE_W, y: TILE_H / 2 + h },
        ],
        true,
      );
    }
  }

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

/** A small filled circle placed at a point on a wall side face. */
function faceDot(
  g: Phaser.GameObjects.Graphics,
  face: 'left' | 'right',
  u: number,
  v: number,
  r: number,
  color: number,
  alpha = 1,
): void {
  const p = facePt(face, u, v);
  g.fillStyle(color, alpha);
  g.fillCircle(p.x as number, p.y as number, r);
}

/**
 * Paint a city skyline inside a window pane on one wall face: a banded sky, a
 * low sun with halo, layered building silhouettes on the horizon and a scatter
 * of lit windows — so there's a believable world outside the office. Drawn on
 * the slanted face, the buildings recede correctly with the wall.
 */
function drawWindowSkyline(g: Phaser.GameObjects.Graphics, face: 'left' | 'right'): void {
  const uL = 0.22;
  const uR = 0.78;
  // Sky, top → horizon.
  facePatch(g, face, uL, uR, 15, 20, 0x35608f, 1);
  facePatch(g, face, uL, uR, 20, 25, 0x5f93c4, 1);
  facePatch(g, face, uL, uR, 25, 30, 0xa9cfe6, 1); // horizon haze
  facePatch(g, face, uL, uR, 30, 37, 0x16293f, 1); // ground / foreground
  // Low sun with a soft halo.
  faceDot(g, face, 0.66, 19.5, 4.2, 0xfff0bf, 0.5);
  faceDot(g, face, 0.66, 19.5, 2.1, 0xfff7d8, 1);
  // Medieval town silhouette (two depth shades of stone) on the horizon (~30.5),
  // with a tall castle tower at the centre.
  const far = 0x6f6a58;
  const near = 0x524d3e;
  const blds: [number, number, number][] = [
    [0.24, 0.3, 25],
    [0.3, 0.35, 22],
    [0.36, 0.43, 26],
    [0.45, 0.52, 17], // castle tower
    [0.52, 0.59, 24],
    [0.6, 0.68, 25],
    [0.69, 0.77, 23],
  ];
  blds.forEach((b, i) => facePatch(g, face, b[0], b[1], b[2], 30.5, i % 2 ? near : far, 1));
  // A scatter of warm lit windows on the taller buildings.
  const lit: [number, number][] = [
    [0.47, 21],
    [0.49, 23.5],
    [0.32, 24],
    [0.63, 27],
    [0.4, 28],
    [0.55, 26],
  ];
  lit.forEach(([u, v]) => faceDot(g, face, u, v, 0.55, 0xffe49a, 0.9));
}

/** A taller, Habbo-style avatar: dark outline, big head, shaded torso, legs + shoes, face. */
function makeCharacter(
  scene: Phaser.Scene,
  key: string,
  body: number,
  accent: number,
  role = '',
  back = false,
  step = 0,
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

  // Soft, feathered contact shadow grounds the character on the floor.
  featherEllipse(g, cx, h - 4, 46, 16, 0x16203a, 0.05, 6);

  // Trousers + legs. `step` swings them fore/aft for a 2-frame walk stride.
  const legDY = step * 2.5;
  g.lineStyle(2, OUT, 0.85);
  g.fillStyle(0x3a4157, 1);
  g.fillRoundedRect(cx - 12, 58 + legDY, 11, 20, 4);
  g.fillRoundedRect(cx + 1, 58 - legDY, 11, 20, 4);
  g.strokeRoundedRect(cx - 12, 58 + legDY, 11, 20, 4);
  g.strokeRoundedRect(cx + 1, 58 - legDY, 11, 20, 4);
  // Shoes follow their legs, splaying slightly fore/aft.
  g.fillStyle(0x23283a, 1);
  g.fillRoundedRect(cx - 14 - step * 2, 75 + legDY, 13, 8, 3);
  g.fillRoundedRect(cx + 1 + step * 2, 75 - legDY, 13, 8, 3);

  // Arms counter-swing against the legs.
  const armDY = step * 3;
  g.fillStyle(dark, 1);
  g.lineStyle(2, OUT, 0.8);
  g.fillRoundedRect(cx - 21, 33 - armDY, 9, 26, 4);
  g.fillRoundedRect(cx + 12, 33 + armDY, 9, 26, 4);
  g.strokeRoundedRect(cx - 21, 33 - armDY, 9, 26, 4);
  g.strokeRoundedRect(cx + 12, 33 + armDY, 9, 26, 4);
  g.fillStyle(skin, 1); // hands
  g.fillCircle(cx - 16, 58 - armDY, 4);
  g.fillCircle(cx + 16, 58 + armDY, 4);

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
  if (back) {
    // Back of the head: hair covers the face; just a centre part.
    g.fillStyle(accent, 1);
    g.fillCircle(cx, 17, 14);
    g.fillStyle(hairDark, 1);
    g.fillRect(cx - 1, 5, 2, 12);
    g.lineStyle(2, OUT, 0.85);
    g.strokeCircle(cx, 17, 14);
    if (role === 'tech') {
      g.lineStyle(2.2, 0x2a2f44, 1); // headset band still reads from behind
      g.beginPath();
      g.arc(cx, 14, 15, 1.05 * Math.PI, 1.95 * Math.PI, false);
      g.strokePath();
    }
    g.setScale(ART_SCALE);
    g.generateTexture(key, w * ART_SCALE, h * ART_SCALE);
    g.destroy();
    return;
  }

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

/** A tiny tileable scanline (one dark line per 3px) for the attacker CRT overlay. */
function makeScanlines(scene: Phaser.Scene, key: string): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0x000000, 0.5);
  g.fillRect(0, 0, 3, 1);
  g.generateTexture(key, 3, 3);
  g.destroy();
}

/** Smooth radial contact shadow for furniture — soft penumbra, no hard edge. */
function makeShadow(scene: Phaser.Scene, key: string): void {
  makeCanvasTexture(scene, key, TILE_W, TILE_H, (ctx) => {
    ctx.save();
    ctx.translate(TILE_W / 2, TILE_H / 2);
    ctx.scale(1, (TILE_H * 0.72) / (TILE_W * 0.82)); // flatten the circle to the iso ellipse
    const r = TILE_W * 0.41;
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    grad.addColorStop(0, 'rgba(18,26,48,0.32)');
    grad.addColorStop(0.55, 'rgba(18,26,48,0.17)');
    grad.addColorStop(1, 'rgba(18,26,48,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

export const CHAR_PLAYER = 'char_player';
export const CHAR_PLAYER_WALK1 = 'char_player_walk1';
export const CHAR_PLAYER_WALK2 = 'char_player_walk2';
export const CHAR_PLAYER_BACK_WALK1 = 'char_player_back_walk1';
export const CHAR_PLAYER_BACK_WALK2 = 'char_player_back_walk2';
export const TEX_RUG = 'rug';
export const TEX_RING = 'ring';
export const TEX_TILE_HI = 'tile_hi';
export const TEX_SHADOW = 'shadow';
export const TEX_GLOW = 'glow';
export const TEX_SCAN = 'scanlines';

export function generateTextures(scene: Phaser.Scene): void {
  // Four grass variants (chosen per-tile by position) so the ground reads as a
  // continuous organic field instead of a repeating checker.
  makeFloor(scene, 'floor_a', FLOOR_A);
  makeFloor(scene, 'floor_b', FLOOR_B);
  makeFloor(scene, 'floor_c', 0x6b9846);
  makeFloor(scene, 'floor_d', 0x5e8940);
  makeFloor(scene, 'floor_accent', 0xb59a63); // dirt path
  makeDiamond(scene, TEX_RUG);
  makeDiamond(scene, TEX_RING, true);
  makeTileHighlight(scene, TEX_TILE_HI);
  makeShadow(scene, TEX_SHADOW);
  makeLight(scene, TEX_GLOW);
  makeScanlines(scene, TEX_SCAN);

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
  // Window wall: a city skyline behind mullioned glass on each visible face.
  makeBox(scene, 'wall_window', 54, WALL_TOP, WALL_LEFT, WALL_RIGHT, (g) => {
    for (const face of ['left', 'right'] as const) {
      facePatch(g, face, 0.16, 0.84, 12, 40, 0x2a3550, 1); // frame
      facePatch(g, face, 0.22, 0.78, 15, 37, 0x16293f, 1); // pane backing
      drawWindowSkyline(g, face); // the world outside
      facePatch(g, face, 0.22, 0.78, 15, 26, 0xffffff, 0.12); // glass sheen
      // Mullions divide the glass into a realistic multi-pane window.
      facePatch(g, face, 0.345, 0.36, 15, 37, 0x2a3550, 1);
      facePatch(g, face, 0.49, 0.51, 15, 37, 0x2a3550, 1);
      facePatch(g, face, 0.64, 0.655, 15, 37, 0x2a3550, 1);
      facePatch(g, face, 0.22, 0.78, 24.7, 25.4, 0x2a3550, 1); // horizontal mullion
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
    // Tiny "window" UI so the screens read up close: a title bar + code/text lines.
    g.fillStyle(0x2b3242, 1);
    g.fillRect(cx - 10, 3, 7, 1.4);
    g.fillRect(cx + 3, 3, 7, 1.4);
    g.fillStyle(0x163a82, 0.85);
    g.fillRect(cx - 9, 5.2, 5, 0.7);
    g.fillRect(cx - 9, 6.4, 3, 0.7);
    g.fillStyle(0x1f6b5e, 0.85);
    g.fillRect(cx + 4, 5.2, 4, 0.7);
    g.fillRect(cx + 4, 6.4, 5, 0.7);
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

  const cx = TILE_W / 2;
  // Office chair: low cushioned seat with a hint of a backrest.
  makeBox(scene, 'chair', 15, 0x4a5570, 0x39425c, 0x2c3349, (g) => {
    g.fillStyle(0x6a7596, 1);
    g.fillEllipse(cx, TILE_H / 2, TILE_W * 0.42, TILE_H * 0.4);
    g.fillStyle(0x39425c, 1);
    g.fillRoundedRect(cx - 9, -6, 18, 8, 3); // backrest
  });
  // Bookshelf: tall unit with rows of coloured spines on the front faces.
  makeBox(scene, 'bookshelf', 36, 0x7a5f47, 0x5e4836, 0x4a3a2c, (g, h) => {
    const spines = [0xc0563f, 0xe0a93b, 0x3f7fb0, 0x4caf78, 0x9b59b6];
    for (let r = 0; r < 4; r++) {
      const yy = TILE_H / 2 + 6 + r * (h / 4);
      for (let i = 0; i < 5; i++) {
        g.fillStyle(spines[(r + i) % spines.length], 1);
        g.fillRect(7 + i * 3.4, yy, 2.6, h / 4 - 4);
      }
    }
  });
  // Whiteboard: white panel with marker strokes + a coloured frame.
  makeBox(scene, 'whiteboard', 30, 0xf6f8fc, 0xd7dded, 0xc4cce0, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(cx - 16, 2, 32, 18, 2);
    g.lineStyle(1.4, 0x3f7fb0, 1);
    g.lineBetween(cx - 12, 7, cx - 2, 7);
    g.lineBetween(cx - 12, 11, cx + 6, 11);
    g.lineStyle(1.4, 0xc0563f, 1);
    g.lineBetween(cx - 12, 15, cx, 15);
  });
  // Reception desk: a counter with a small monitor.
  makeBox(scene, 'reception_desk', 24, 0x9a7a5b, 0x7a5f47, 0x624c39, (g) => {
    g.fillStyle(0xb8946d, 1);
    g.fillRoundedRect(cx - 18, TILE_H / 2 - 2, 36, 6, 2); // raised front lip
    g.fillStyle(0x2b3242, 1);
    g.fillRoundedRect(cx - 6, 0, 12, 8, 2);
    g.fillStyle(0x5fd0c4, 1);
    g.fillRect(cx - 4, 2, 8, 4);
  });
  // Sofa: low, wide, two cushions + arms.
  makeBox(scene, 'sofa', 18, 0x4f7a86, 0x3c5e68, 0x2f4a52, (g) => {
    g.fillStyle(0x6a98a4, 1);
    g.fillRoundedRect(cx - 16, -2, 32, 10, 4); // backrest
    g.fillStyle(0x7fb0bc, 1);
    g.fillRoundedRect(cx - 14, 4, 13, 8, 3);
    g.fillRoundedRect(cx + 1, 4, 13, 8, 3);
  });
  // Coffee table: very low wood/glass top.
  makeBox(scene, 'coffee_table', 9, 0x9a7a5b, 0x7a5f47, 0x624c39, (g) => {
    g.fillStyle(0xbfe3f5, 0.55);
    g.fillPoints(diamondPoints(6, 3, 0.8, 0.8), true);
  });
  // Printer: grey box with a paper tray and a status LED.
  makeBox(scene, 'printer', 18, 0xb9c2d4, 0x95a0b8, 0x7c889f, (g) => {
    g.fillStyle(0x6b768a, 1);
    g.fillRoundedRect(cx - 10, 4, 20, 3, 1.5); // paper slot
    g.fillStyle(0xeef2fb, 1);
    g.fillRect(cx - 6, 1, 12, 3); // paper
    g.fillStyle(0x59f08a, 1);
    g.fillCircle(cx + 8, 9, 1.4); // LED
  });
  // Boardroom table halves (two adjacent tiles read as one long table).
  const tableDecor = (g: Phaser.GameObjects.Graphics) => {
    g.fillStyle(0xb08a5f, 1);
    g.fillPoints(diamondPoints(0, -2, 0.96, 0.96), true);
  };
  makeBox(scene, 'boardroom_table_l', 16, 0x8a6a48, 0x6e5238, 0x57402b, tableDecor);
  makeBox(scene, 'boardroom_table_r', 16, 0x8a6a48, 0x6e5238, 0x57402b, tableDecor);

  makeCharacter(scene, CHAR_PLAYER, 0x2d6cdf, 0x163a82);
  makeCharacter(scene, CHAR_PLAYER_WALK1, 0x2d6cdf, 0x163a82, '', false, 1);
  makeCharacter(scene, CHAR_PLAYER_WALK2, 0x2d6cdf, 0x163a82, '', false, -1);
  makeCharacter(scene, CHAR_PLAYER_BACK_WALK1, 0x2d6cdf, 0x163a82, '', true, 1);
  makeCharacter(scene, CHAR_PLAYER_BACK_WALK2, 0x2d6cdf, 0x163a82, '', true, -1);
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
