import Phaser from 'phaser';
import { GRID_SIZE, TILE_H, ART_INV, HOURS_PER_REAL_SECOND } from '../../core/config';
import { gridToWorld, worldToGrid, isoDepth } from '../iso';
import { findPath } from '../pathfinding';
import { Player } from '../entities/Player';
import { Npc } from '../entities/Npc';
import {
  addArt,
  generateCharacters,
  TEX_RING,
  TEX_TILE_HI,
  TEX_RUG,
  TEX_SHADOW,
  TEX_GLOW,
  TEX_SCAN,
} from '../TextureFactory';
import { store } from '../../core/store';
import { eventBus } from '../../core/eventBus';
import { sfx } from '../../core/sfx';
import { STAKEHOLDERS, STAKEHOLDER_BY_ID } from '../../scenario/stakeholders';
import { campaignStakeholders, campaignPhaseOrder } from '../../scenario/campaign';
import { nodeForStakeholder, stakeholderHasPending } from '../../scenario/scoring';
import type { Mode, GamePhase } from '../../core/types';
import { advanceClock } from '../../scenario/scoring';
import type { Role } from '../../core/types';

// Decorative / blocking furniture: tile -> texture key. Grouped by themed room.
// Tiles are validated reachable (no prop seals a room or blocks a doorway).
const FURNITURE: { gx: number; gy: number; key: string }[] = [
  // SOC / Tech (top-left)
  { gx: 1, gy: 1, key: 'server' },
  { gx: 4, gy: 1, key: 'server' },
  { gx: 1, gy: 2, key: 'whiteboard' },
  { gx: 1, gy: 3, key: 'desk' },
  { gx: 4, gy: 3, key: 'desk' },
  // DPO records (top-right)
  { gx: 6, gy: 1, key: 'bookshelf' },
  { gx: 8, gy: 1, key: 'cabinet' },
  { gx: 9, gy: 1, key: 'cabinet' },
  { gx: 10, gy: 1, key: 'cabinet' },
  { gx: 9, gy: 3, key: 'desk' },
  { gx: 8, gy: 4, key: 'plant' },
  // CISO office (bottom-left)
  { gx: 3, gy: 6, key: 'desk' },
  { gx: 4, gy: 7, key: 'cabinet' },
  { gx: 1, gy: 6, key: 'plant' },
  { gx: 1, gy: 7, key: 'bookshelf' },
  // Boardroom (bottom-right) — a long table with chairs
  { gx: 6, gy: 6, key: 'boardroom_table_l' },
  { gx: 7, gy: 6, key: 'boardroom_table_r' },
  { gx: 7, gy: 7, key: 'chair' },
  { gx: 8, gy: 7, key: 'chair' },
  { gx: 9, gy: 6, key: 'chair' },
  { gx: 10, gy: 6, key: 'plant' },
  // Reception / Lounge (front-left)
  { gx: 1, gy: 9, key: 'reception_desk' },
  { gx: 1, gy: 10, key: 'sofa' },
  { gx: 2, gy: 10, key: 'coffee_table' },
  { gx: 1, gy: 8, key: 'plant' },
  { gx: 1, gy: 11, key: 'plant' },
  { gx: 5, gy: 11, key: 'cooler' },
  // Regulator desk (front-right)
  { gx: 8, gy: 9, key: 'desk' },
  { gx: 8, gy: 10, key: 'chair' },
  { gx: 11, gy: 9, key: 'cabinet' },
  { gx: 11, gy: 8, key: 'plant' },
  { gx: 11, gy: 11, key: 'plant' },
  { gx: 6, gy: 8, key: 'printer' },
];

// Interior divider walls (half-height) carving the floor into six themed rooms.
// Doorway gaps at (5,4) [SOC↔DPO] and (4,5) [SOC↔CISO]; the open front strip
// (gy ≥ 8) links the two lower rooms via the lounge.
const INTERIOR_WALLS = new Set([
  '5,1', '5,2', '5,3', '5,5', '5,6', '5,7', // vertical spine gx=5 (gap at 5,4)
  '1,5', '2,5', '3,5', '6,5', '7,5', '8,5', '9,5', '10,5', // horizontal spine gy=5 (gap at 4,5)
]);

const START_TILE = { gx: 5, gy: 9 };

// Soft per-zone floor tint so each room reads as its own space at a glance.
function zoneTint(gx: number, gy: number): number | null {
  if (gy <= 4) return gx <= 4 ? 0xcfe0ff : gx >= 6 ? 0xcdeede : null; // SOC / DPO
  if (gy <= 7) return gx <= 4 ? 0xe2d8f6 : gx >= 6 ? 0xf2e3c8 : null; // CISO / Boardroom
  return gx <= 5 ? 0xf4ecd9 : 0xd9e0ec; // Lounge / Regulator (front strip)
}

export class OfficeScene extends Phaser.Scene {
  private player!: Player;
  private npcs: Npc[] = [];
  private blocked = new Set<string>();
  private npcTiles = new Set<string>();
  private marker!: Phaser.GameObjects.Image;
  private hover!: Phaser.GameObjects.Image;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private dragging = false;
  private downAt = { x: 0, y: 0 };
  private panLast = { x: 0, y: 0 };
  private panVel = { x: 0, y: 0 };
  private momentum = { x: 0, y: 0 };
  private pinchDist = 0;
  private pinching = false;
  private builtMode: Mode = 'defender';
  private lastPhase: GamePhase = 'start';
  private darkOverlay?: Phaser.GameObjects.Rectangle;
  private glow?: Phaser.GameObjects.Image;
  private scanlines?: Phaser.GameObjects.TileSprite;
  private toWorld = (gx: number, gy: number) => {
    const w = gridToWorld(gx, gy);
    return { x: w.x, y: w.y };
  };

  constructor() {
    super('Office');
  }

  create(): void {
    this.buildBlockedSet();
    this.assertConnectivity();
    this.drawFloor();
    this.drawStationRugs();
    this.drawWallsAndFurniture();
    this.addRoomLight();
    this.createMarker();

    // NPCs (personas depend on the campaign mode).
    this.builtMode = store.getState().mode;
    this.npcs = campaignStakeholders(this.builtMode).map((s) => new Npc(this, s, this.toWorld));

    // Player.
    this.player = new Player(this, START_TILE.gx, START_TILE.gy, this.toWorld);

    this.applyTheme(this.builtMode);

    // Frame the board and keep it framed on resize.
    this.frameCamera();
    this.scale.on('resize', this.frameCamera, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.scale.off('resize', this.frameCamera, this),
    );

    this.setupInput();

    eventBus.on('requestDialogue', ({ npcId }) => this.openDialogue(npcId));
    eventBus.on('stateChanged', () => this.onStateChanged());
    eventBus.on('restart', () => this.resetWorld());
    eventBus.on('zoom', ({ dir }) => this.applyZoom(dir));
    this.setupWheelZoom();
    this.input.addPointer(1); // enable a 2nd touch pointer for pinch-zoom

    this.refreshPendingIndicators();
  }

  // ---------------------------------------------------------------- world build
  private buildBlockedSet(): void {
    for (const s of STAKEHOLDERS) this.npcTiles.add(`${s.grid.gx},${s.grid.gy}`);
    for (const f of FURNITURE) this.blocked.add(`${f.gx},${f.gy}`);
  }

  /** Dev guard: every stakeholder must have a walkable neighbour reachable from START. */
  private assertConnectivity(): void {
    const seen = new Set<string>([`${START_TILE.gx},${START_TILE.gy}`]);
    const queue = [START_TILE];
    while (queue.length) {
      const { gx, gy } = queue.shift()!;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = gx + dx;
        const ny = gy + dy;
        const k = `${nx},${ny}`;
        if (this.isWalkable(nx, ny) && !seen.has(k)) {
          seen.add(k);
          queue.push({ gx: nx, gy: ny });
        }
      }
    }
    for (const s of STAKEHOLDERS) {
      const reachable = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) =>
        seen.has(`${s.grid.gx + dx},${s.grid.gy + dy}`),
      );
      if (!reachable) console.warn(`[connectivity] ${s.id} at ${s.grid.gx},${s.grid.gy} is unreachable`);
    }
  }

  private isWall(gx: number, gy: number): boolean {
    return gx === 0 || gy === 0 || INTERIOR_WALLS.has(`${gx},${gy}`);
  }

  private isWalkable = (gx: number, gy: number): boolean => {
    if (gx < 0 || gy < 0 || gx >= GRID_SIZE || gy >= GRID_SIZE) return false;
    if (this.isWall(gx, gy)) return false;
    if (this.blocked.has(`${gx},${gy}`)) return false;
    if (this.npcTiles.has(`${gx},${gy}`)) return false;
    return true;
  };

  private drawFloor(): void {
    for (let gx = 0; gx < GRID_SIZE; gx++) {
      for (let gy = 0; gy < GRID_SIZE; gy++) {
        if (this.isWall(gx, gy)) continue;
        const { x, y } = this.toWorld(gx, gy);
        const key = (gx + gy) % 2 === 0 ? 'floor_a' : 'floor_b';
        const tile = addArt(this, x, y, key).setOrigin(0.5, 0.5).setDepth(isoDepth(gx, gy, -2));
        const tint = zoneTint(gx, gy);
        if (tint !== null) tile.setTint(tint);
      }
    }
  }

  /** Colour-codes each stakeholder's "station" so areas read at a glance. */
  private drawStationRugs(): void {
    const c = (GRID_SIZE - 1) / 2;
    for (const s of STAKEHOLDERS) {
      const dirx = Math.sign(c - s.grid.gx);
      const diry = Math.sign(c - s.grid.gy);
      const tiles = [
        { gx: s.grid.gx, gy: s.grid.gy },
        { gx: s.grid.gx + dirx, gy: s.grid.gy },
        { gx: s.grid.gx, gy: s.grid.gy + diry },
      ];
      for (const t of tiles) {
        if (t.gx <= 0 || t.gy <= 0 || t.gx >= GRID_SIZE || t.gy >= GRID_SIZE) continue;
        const { x, y } = this.toWorld(t.gx, t.gy);
        addArt(this, x, y, TEX_RUG)
          .setOrigin(0.5, 0.5)
          .setTint(s.colors.body)
          .setAlpha(0.22)
          .setDepth(isoDepth(t.gx, t.gy, -1));
      }
    }
  }

  private frameCamera(): void {
    const cam = this.cameras.main;
    const center = this.toWorld((GRID_SIZE - 1) / 2, (GRID_SIZE - 1) / 2);
    // Fit the room to ~85% of the viewport so it fills the screen like a real room.
    const boardW = GRID_SIZE * TILE_H * 2; // diamond width ≈ GRID*TILE_W
    const boardH = GRID_SIZE * TILE_H + 150; // floor depth + wall/character height
    const zoom = Phaser.Math.Clamp(
      Math.min((cam.width * 0.86) / boardW, (cam.height * 0.86) / boardH),
      0.55,
      2.0,
    );
    cam.setZoom(zoom);
    cam.centerOn(center.x, center.y - 6);
  }

  /** Per-frame camera input: pinch-zoom (2 pointers) + flick momentum. */
  private updateCameraInput(): void {
    const cam = this.cameras.main;
    const p1 = this.input.pointer1;
    const p2 = this.input.pointer2;
    if (p1?.isDown && p2?.isDown) {
      const d = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
      if (this.pinchDist > 0 && d > 0) {
        cam.setZoom(Phaser.Math.Clamp(cam.zoom * (d / this.pinchDist), 0.3, 3.5));
        this.clampCamera();
      }
      this.pinchDist = d;
      this.pinching = true;
      this.dragging = false;
      this.momentum.x = 0;
      this.momentum.y = 0;
      return;
    }
    this.pinchDist = 0;
    this.pinching = false;
    if (!p1?.isDown && (Math.abs(this.momentum.x) > 0.15 || Math.abs(this.momentum.y) > 0.15)) {
      cam.scrollX -= this.momentum.x / cam.zoom;
      cam.scrollY -= this.momentum.y / cam.zoom;
      this.momentum.x *= 0.9;
      this.momentum.y *= 0.9;
      this.clampCamera();
    }
  }

  /** Keep the board from being panned/zoomed fully off-screen. */
  private clampCamera(): void {
    const cam = this.cameras.main;
    const pad = 220;
    const corners = [
      this.toWorld(0, 0),
      this.toWorld(GRID_SIZE - 1, 0),
      this.toWorld(0, GRID_SIZE - 1),
      this.toWorld(GRID_SIZE - 1, GRID_SIZE - 1),
    ];
    const xs = corners.map((c) => c.x);
    const ys = corners.map((c) => c.y);
    const cx = Phaser.Math.Clamp(cam.midPoint.x, Math.min(...xs) - pad, Math.max(...xs) + pad);
    const cy = Phaser.Math.Clamp(cam.midPoint.y, Math.min(...ys) - pad, Math.max(...ys) + pad);
    cam.centerOn(cx, cy);
  }

  // Manual zoom (UI buttons + mouse wheel). Reset re-fits the board.
  private applyZoom(dir: 'in' | 'out' | 'reset'): void {
    if (dir === 'reset') {
      this.frameCamera();
      return;
    }
    const cam = this.cameras.main;
    const factor = dir === 'in' ? 1.2 : 1 / 1.2;
    cam.setZoom(Phaser.Math.Clamp(cam.zoom * factor, 0.3, 3.5));
    this.clampCamera();
  }

  private setupWheelZoom(): void {
    this.input.on(
      'wheel',
      (_p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
        const cam = this.cameras.main;
        const factor = dy > 0 ? 1 / 1.1 : 1.1;
        cam.setZoom(Phaser.Math.Clamp(cam.zoom * factor, 0.3, 3.5));
        this.clampCamera();
      },
    );
  }

  private drawWallsAndFurniture(): void {
    // Back walls along gx=0 and gy=0, with a little Habbo-style variety.
    const decor: Record<number, string> = {
      2: 'wall_window',
      3: 'wall_window',
      5: 'wall_picture',
      8: 'wall_clock',
      9: 'wall_window',
    };
    for (let i = 0; i < GRID_SIZE; i++) {
      this.placeBox(0, i, decor[i] ?? 'wall');
      this.placeBox(i, 0, decor[i] ?? 'wall');
      // Soft daylight pooling on the floor in front of each window.
      if (decor[i] === 'wall_window') {
        this.windowLight(1, i);
        this.windowLight(i, 1);
      }
    }
    // Interior partitions dividing the rooms (half-height so back rooms stay visible).
    for (const key of INTERIOR_WALLS) {
      const [gx, gy] = key.split(',').map(Number);
      this.placeBox(gx, gy, 'wall_low');
    }
    for (const f of FURNITURE) {
      const { x, y } = this.toWorld(f.gx, f.gy);
      addArt(this, x, y, TEX_SHADOW).setOrigin(0.5, 0.5).setDepth(isoDepth(f.gx, f.gy, 0));
      this.placeBox(f.gx, f.gy, f.key);
      if (f.key === 'server') this.addServerLeds(f.gx, f.gy);
      else if (f.key === 'cooler') this.addCoolerBubbles(f.gx, f.gy);
      else if (f.key === 'desk' || f.key === 'reception_desk') this.addMonitorGlow(f.gx, f.gy);
      else if (f.key === 'printer') this.addPrinterBlink(f.gx, f.gy);
    }
  }

  /** A soft additive pool of window light on a floor tile (godray landing spot). */
  private windowLight(gx: number, gy: number): void {
    if (this.isWall(gx, gy)) return;
    const { x, y } = this.toWorld(gx, gy);
    this.add
      .image(x, y, TEX_GLOW)
      .setTint(0xcfeaff)
      .setAlpha(0.16)
      .setScale(0.7, 0.42)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(isoDepth(gx, gy, -1));
  }

  /** Blinking status LEDs on a server rack so it reads as alive. */
  private addServerLeds(gx: number, gy: number): void {
    const { x, y } = this.toWorld(gx, gy);
    const top = y - 30;
    const colors = [0x59f08a, 0xffd45e, 0x4ab6ff];
    for (let i = 0; i < 3; i++) {
      const led = this.add
        .circle(x - 6 + i * 6, top + i * 3, 1.6, colors[i])
        .setDepth(isoDepth(gx, gy, 2));
      this.tweens.add({
        targets: led,
        alpha: { from: 0.25, to: 1 },
        duration: 380 + i * 140,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
        delay: i * 200,
      });
    }
  }

  private addCoolerBubbles(gx: number, gy: number): void {
    const { x, y } = this.toWorld(gx, gy);
    const top = y - 22;
    for (let i = 0; i < 2; i++) {
      const b = this.add.circle(x - 2 + i * 4, top, 1.3, 0xbfe3f5, 0.9).setDepth(isoDepth(gx, gy, 2));
      this.tweens.add({
        targets: b,
        y: { from: top, to: top - 9 },
        alpha: { from: 0.9, to: 0 },
        duration: 1200,
        repeat: -1,
        delay: i * 500,
        ease: 'Sine.in',
      });
    }
  }

  private addMonitorGlow(gx: number, gy: number): void {
    const { x, y } = this.toWorld(gx, gy);
    const scr = this.add
      .rectangle(x, y - 14, 11, 6, 0x5fd0c4)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(isoDepth(gx, gy, 2));
    this.tweens.add({
      targets: scr,
      alpha: { from: 0.08, to: 0.34 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
  }

  private addPrinterBlink(gx: number, gy: number): void {
    const { x, y } = this.toWorld(gx, gy);
    const led = this.add.circle(x + 8, y - 15, 1.3, 0x59f08a).setDepth(isoDepth(gx, gy, 2));
    this.tweens.add({
      targets: led,
      alpha: { from: 0.3, to: 1 },
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
  }

  /** A one-shot expanding ring where the player tapped to move. */
  private spawnRipple(x: number, y: number): void {
    const r = this.add.image(x, y, TEX_RING).setTint(0x9fd0ff).setDepth(9990);
    this.tweens.add({
      targets: r,
      scale: { from: ART_INV * 0.4, to: ART_INV * 1.7 },
      alpha: { from: 0.75, to: 0 },
      duration: 430,
      ease: 'Cubic.out',
      onComplete: () => r.destroy(),
    });
  }

  private placeBox(gx: number, gy: number, key: string): void {
    const { x, y } = this.toWorld(gx, gy);
    // Origin (0.5,1) at the tile's bottom vertex makes the footprint overlay the floor tile.
    addArt(this, x, y + TILE_H / 2, key)
      .setOrigin(0.5, 1)
      .setDepth(isoDepth(gx, gy, 1));
  }

  /** A soft warm glow over the room for a cosy, lit feel (additive, very low alpha). */
  private addRoomLight(): void {
    const center = this.toWorld((GRID_SIZE - 1) / 2, (GRID_SIZE - 1) / 2);
    this.glow = this.add
      .image(center.x, center.y - 10, TEX_GLOW)
      .setTint(0xffe9c2)
      .setAlpha(0.09)
      .setScale(2.4)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(9999);

    // A purple "villain lair" wash for attacker mode. MULTIPLY tints + dims, but
    // gently (light colour, low alpha) so the world stays clearly readable.
    const big = GRID_SIZE * TILE_H * 4;
    this.darkOverlay = this.add
      .rectangle(center.x, center.y, big, big, 0x8f7fc0, 0.45)
      .setBlendMode(Phaser.BlendModes.MULTIPLY)
      .setDepth(9998)
      .setVisible(false);

    // CRT scanlines for the attacker "hacked" feel (toggled in applyTheme).
    this.scanlines = this.add
      .tileSprite(center.x, center.y, big, big, TEX_SCAN)
      .setDepth(9997)
      .setAlpha(0)
      .setVisible(false);
  }

  // Timer-driven mood (defender): the room glow warms → reddens as the 72h nears.
  private updateMood(state: { clock: { deadlineHours: number; hoursElapsed: number } }): void {
    if (this.builtMode !== 'defender' || !this.glow) return;
    const rem = Phaser.Math.Clamp(
      (state.clock.deadlineHours - state.clock.hoursElapsed) / state.clock.deadlineHours,
      0,
      1,
    );
    const t = Math.round((1 - rem) * 100);
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.IntegerToColor(0xffe9c2),
      Phaser.Display.Color.IntegerToColor(0xff5140),
      100,
      t,
    );
    this.glow.setTint(Phaser.Display.Color.GetColor(c.r, c.g, c.b)).setAlpha(0.09 + (1 - rem) * 0.13);
  }

  /** Recolour the world for the blue-team office vs the red-team lair. */
  private applyTheme(mode: Mode): void {
    const attacker = mode === 'attacker';
    this.cameras.main.setBackgroundColor(attacker ? '#0b0717' : '#aab4d2');
    this.darkOverlay?.setVisible(attacker);
    this.scanlines?.setVisible(attacker).setAlpha(attacker ? 0.12 : 0);
    this.glow?.setTint(attacker ? 0xff3b6b : 0xffe9c2).setAlpha(attacker ? 0.14 : 0.09);
    // Toggle the page chrome theme (HUD/panels) via a root class.
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('attacker-mode', attacker);
    }
  }

  /** Swap NPC personas + theme when a run starts in a different mode than built. */
  private rebuildForMode(mode: Mode): void {
    generateCharacters(this, campaignStakeholders(mode));
    for (const npc of this.npcs) npc.destroy();
    this.npcs = campaignStakeholders(mode).map((s) => new Npc(this, s, this.toWorld));
    this.builtMode = mode;
    this.applyTheme(mode);
    this.cameras.main.fadeIn(260);
    this.refreshPendingIndicators();
  }

  private createMarker(): void {
    this.hover = addArt(this, 0, 0, TEX_TILE_HI)
      .setOrigin(0.5, 0.5)
      .setVisible(false)
      .setAlpha(0.9);
    this.marker = addArt(this, 0, 0, TEX_RING)
      .setOrigin(0.5, 0.5)
      .setTint(0x2d6cdf)
      .setAlpha(0.85)
      .setVisible(false);
    this.tweens.add({
      targets: this.marker,
      scale: { from: 0.85 * ART_INV, to: 1.05 * ART_INV },
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
  }

  // ---------------------------------------------------------------- input
  private setupInput(): void {
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      const state = store.getState();
      const active =
        state.gamePhase === 'playing' && !state.activeDialogue && !state.activeInject;

      // Click-hold and drag to pan (single pointer only — 2 pointers = pinch-zoom).
      if (p.isDown && active && !this.pinching && !this.input.pointer2?.isDown) {
        const dx = p.x - this.panLast.x;
        const dy = p.y - this.panLast.y;
        this.panLast.x = p.x;
        this.panLast.y = p.y;
        if (Math.hypot(p.x - this.downAt.x, p.y - this.downAt.y) > 6) this.dragging = true;
        if (this.dragging) {
          const cam = this.cameras.main;
          cam.scrollX -= dx / cam.zoom;
          cam.scrollY -= dy / cam.zoom;
          this.panVel.x = dx;
          this.panVel.y = dy;
          this.clampCamera();
          this.hover.setVisible(false);
          this.input.setDefaultCursor('grabbing');
          return;
        }
      }

      if (!active) {
        this.hover.setVisible(false);
        this.input.setDefaultCursor('default');
        return;
      }
      const { gx, gy } = worldToGrid(p.worldX, p.worldY);
      const npcId = this.npcAt(gx, gy);
      const overNpc = npcId && this.isAdjacentToPlayer(STAKEHOLDER_BY_ID[npcId].grid);
      if (overNpc || (this.isWalkable(gx, gy) && !this.player.moving)) {
        const { x, y } = this.toWorld(gx, gy);
        this.hover.setPosition(x, y).setDepth(isoDepth(gx, gy, 0)).setVisible(true);
        this.input.setDefaultCursor('pointer');
      } else {
        this.hover.setVisible(false);
        this.input.setDefaultCursor('default');
      }
    });

    // Press starts a potential drag; a real tap is resolved on release.
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.dragging = false;
      this.downAt.x = p.x;
      this.downAt.y = p.y;
      this.panLast.x = p.x;
      this.panLast.y = p.y;
      this.momentum.x = 0;
      this.momentum.y = 0;
    });

    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      const wasDragging = this.dragging;
      this.dragging = false;
      this.input.setDefaultCursor('default');
      if (wasDragging) {
        // Flick momentum (decays in update()).
        this.momentum.x = this.panVel.x;
        this.momentum.y = this.panVel.y;
      } else {
        this.handleTap(p);
      }
      this.panVel.x = 0;
      this.panVel.y = 0;
    });
    this.input.on('pointerupoutside', () => {
      this.dragging = false;
      this.input.setDefaultCursor('default');
    });

    // Space talks to an adjacent NPC.
    this.input.keyboard?.on('keydown-SPACE', () => {
      const state = store.getState();
      if (
        state.gamePhase === 'playing' &&
        state.npcInRange &&
        !state.activeDialogue &&
        !state.activeInject
      ) {
        eventBus.emit('requestDialogue', { npcId: state.npcInRange });
      }
    });

    // Arrow keys walk the avatar one tile in a screen direction.
    this.cursors = this.input.keyboard?.createCursorKeys();
  }

  // A genuine tap (not a drag-pan): walk there, or talk to an adjacent NPC.
  private handleTap(p: Phaser.Input.Pointer): void {
    const state = store.getState();
    if (
      state.gamePhase !== 'playing' ||
      state.activeDialogue ||
      state.activeInject ||
      this.player.moving
    )
      return;

    const { gx, gy } = worldToGrid(p.worldX, p.worldY);
    const npcId = this.npcAt(gx, gy);
    if (npcId && this.isAdjacentToPlayer(STAKEHOLDER_BY_ID[npcId].grid)) {
      eventBus.emit('requestDialogue', { npcId });
      return;
    }

    if (!this.isWalkable(gx, gy)) return;
    const path = findPath({ gx: this.player.gx, gy: this.player.gy }, { gx, gy }, this.isWalkable);
    if (!path) return;

    const target = this.toWorld(gx, gy);
    this.marker.setPosition(target.x, target.y).setDepth(isoDepth(gx, gy, 0)).setVisible(true);
    this.spawnRipple(target.x, target.y);
    this.hover.setVisible(false);
    sfx.walk();

    this.player.moveAlongPath(path, () => {
      this.marker.setVisible(false);
      eventBus.emit('playerArrived', { gx: this.player.gx, gy: this.player.gy });
      this.updateNpcInRange();
    });
  }

  // Move one tile per step in the pressed screen direction (iso diagonal in grid
  // space). Holding a key keeps stepping once the previous tile tween finishes.
  private tryKeyboardMove(): void {
    if (this.player.moving) return;
    const c = this.cursors;
    if (!c) return;
    let dgx = 0;
    let dgy = 0;
    if (c.up.isDown) {
      dgx = -1;
      dgy = -1;
    } else if (c.down.isDown) {
      dgx = 1;
      dgy = 1;
    } else if (c.left.isDown) {
      dgx = -1;
      dgy = 1;
    } else if (c.right.isDown) {
      dgx = 1;
      dgy = -1;
    } else {
      return;
    }
    const tx = this.player.gx + dgx;
    const ty = this.player.gy + dgy;
    if (!this.isWalkable(tx, ty)) return;
    // Don't cut through a wall corner: need at least one open orthogonal side.
    if (!this.isWalkable(tx, this.player.gy) && !this.isWalkable(this.player.gx, ty)) return;
    sfx.walk();
    this.player.moveAlongPath([{ gx: tx, gy: ty }], () => {
      eventBus.emit('playerArrived', { gx: this.player.gx, gy: this.player.gy });
      this.updateNpcInRange();
    });
  }

  private npcAt(gx: number, gy: number): Role | null {
    const found = STAKEHOLDERS.find((s) => s.grid.gx === gx && s.grid.gy === gy);
    return found ? found.id : null;
  }

  private isAdjacentToPlayer(tile: { gx: number; gy: number }): boolean {
    return (
      Math.max(Math.abs(tile.gx - this.player.gx), Math.abs(tile.gy - this.player.gy)) <= 1
    );
  }

  private updateNpcInRange(): void {
    let inRange: Role | null = null;
    for (const s of STAKEHOLDERS) {
      if (this.isAdjacentToPlayer(s.grid)) {
        inRange = s.id;
        break;
      }
    }
    if (store.getState().npcInRange !== inRange) {
      store.setState({ ...store.getState(), npcInRange: inRange });
    }
  }

  // ---------------------------------------------------------------- dialogue
  private openDialogue(npcId: Role): void {
    const state = store.getState();
    if (state.activeDialogue) return;
    sfx.talk();
    this.npcs.find((n) => n.info.id === npcId)?.emote('💬');
    store.setState({ ...state, activeDialogue: { npcId } });
  }

  private onStateChanged(): void {
    const state = store.getState();
    if (state.gamePhase === 'playing' && state.mode !== this.builtMode) {
      this.rebuildForMode(state.mode);
    } else if (state.gamePhase === 'playing' && this.lastPhase !== 'playing') {
      this.cameras.main.fadeIn(260);
    }
    this.lastPhase = state.gamePhase;
    this.refreshPendingIndicators();
    if (state.gamePhase === 'start') this.resetWorld();
  }

  private refreshPendingIndicators(): void {
    const state = store.getState();
    const playing = state.gamePhase === 'playing';
    const pendings = this.npcs.map((npc) => playing && stakeholderHasPending(state, npc.info.id));
    // Pick a single "talk next" target: the pending NPC whose node is earliest
    // in the response sequence, so the player always has a clear next step.
    let target: Npc | null = null;
    let targetRank = Infinity;
    this.npcs.forEach((npc, i) => {
      if (!pendings[i]) return;
      const node = nodeForStakeholder(state, npc.info.id);
      const rank = node ? campaignPhaseOrder(state.mode).indexOf(node.phase) : 99;
      if (rank < targetRank) {
        targetRank = rank;
        target = npc;
      }
    });
    this.npcs.forEach((npc, i) => {
      npc.setNext(npc === target);
      npc.setPending(pendings[i]);
    });
  }

  private resetWorld(): void {
    if (!this.player) return;
    const start = this.toWorld(START_TILE.gx, START_TILE.gy);
    this.player.setPosition(start.x, start.y);
    this.player.gx = START_TILE.gx;
    this.player.gy = START_TILE.gy;
    this.player.setDepth(isoDepth(START_TILE.gx, START_TILE.gy, 5));
    this.marker.setVisible(false);
  }

  // ---------------------------------------------------------------- loop
  private clockAccum = 0;

  update(_time: number, delta: number): void {
    const state = store.getState();
    if (state.gamePhase === 'playing') this.updateMood(state);
    const active = state.gamePhase === 'playing' && !state.activeDialogue && !state.activeInject;
    if (active) this.updateCameraInput();
    if (active) {
      this.tryKeyboardMove();
      // Batch passive clock drift so we don't re-render the UI every frame.
      // Drift is fixed for all difficulties — difficulty never changes the clock.
      this.clockAccum += (HOURS_PER_REAL_SECOND * delta) / 1000;
      if (this.clockAccum >= 0.15) {
        advanceClock(this.clockAccum);
        this.clockAccum = 0;
      }
    }
  }

  // Expose for debugging if needed.
  currentNodeFor(role: Role) {
    return nodeForStakeholder(store.getState(), role);
  }
}
