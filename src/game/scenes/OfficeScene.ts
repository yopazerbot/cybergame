import Phaser from 'phaser';
import { GRID_SIZE, TILE, HOURS_PER_REAL_SECOND } from '../../core/config';
import { gridToWorld, worldToGrid } from '../iso';
import { findPath } from '../pathfinding';
import { Player } from '../entities/Player';
import { Npc } from '../entities/Npc';
import { TEX_RING, TEX_TILE_HI, TEX_RUG, TEX_SHADOW } from '../TextureFactory';
import { store } from '../../core/store';
import { eventBus } from '../../core/eventBus';
import { sfx } from '../../core/sfx';
import { STAKEHOLDERS, STAKEHOLDER_BY_ID } from '../../scenario/stakeholders';
import { nodeForStakeholder, stakeholderHasPending, advanceClock } from '../../scenario/scoring';
import type { Role } from '../../core/types';

const FURNITURE: { gx: number; gy: number; key: string }[] = [
  { gx: 1, gy: 1, key: 'server' },
  { gx: 1, gy: 2, key: 'server' },
  { gx: 8, gy: 1, key: 'cabinet' },
  { gx: 9, gy: 1, key: 'cooler' },
  { gx: 5, gy: 4, key: 'desk' },
  { gx: 6, gy: 4, key: 'desk' },
  { gx: 5, gy: 6, key: 'desk' },
  { gx: 6, gy: 6, key: 'desk' },
  { gx: 1, gy: 5, key: 'sofa' },
  { gx: 1, gy: 6, key: 'sofa' },
  { gx: 1, gy: 10, key: 'plant' },
  { gx: 10, gy: 10, key: 'plant' },
  { gx: 10, gy: 1, key: 'plant' },
];

const START_TILE = { gx: 3, gy: 5 };

const FLOOR_DEPTH = -100000;
const RUG_DEPTH = -90000;
const MARKER_DEPTH = -80000;

export class OfficeScene extends Phaser.Scene {
  private player!: Player;
  private npcs: Npc[] = [];
  private blocked = new Set<string>();
  private npcTiles = new Set<string>();
  private marker!: Phaser.GameObjects.Image;
  private hover!: Phaser.GameObjects.Image;
  private toWorld = (gx: number, gy: number) => gridToWorld(gx, gy);

  constructor() {
    super('Office');
  }

  create(): void {
    this.buildBlockedSet();
    this.drawFloor();
    this.drawStationRugs();
    this.createMarker();
    this.drawWallsAndFurniture();

    this.npcs = STAKEHOLDERS.map((s) => new Npc(this, s, this.toWorld));
    this.player = new Player(this, START_TILE.gx, START_TILE.gy, this.toWorld, 'char_0');

    this.frameCamera();
    this.scale.on('resize', this.frameCamera, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.scale.off('resize', this.frameCamera, this),
    );

    this.setupInput();
    eventBus.on('requestDialogue', ({ npcId }) => this.openDialogue(npcId));
    eventBus.on('stateChanged', () => this.onStateChanged());
    eventBus.on('restart', () => this.resetWorld());
    this.refreshPendingIndicators();
  }

  // ---------------------------------------------------------------- world build
  private buildBlockedSet(): void {
    for (const s of STAKEHOLDERS) this.npcTiles.add(`${s.grid.gx},${s.grid.gy}`);
    for (const f of FURNITURE) this.blocked.add(`${f.gx},${f.gy}`);
  }

  private isWall(gx: number, gy: number): boolean {
    return gx === 0 || gy === 0 || gx === GRID_SIZE - 1 || gy === GRID_SIZE - 1;
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
        const { x, y } = this.toWorld(gx, gy);
        const key = (gx + gy) % 2 === 0 ? 'floor_a' : 'floor_b';
        this.add.image(x, y, key).setDepth(FLOOR_DEPTH);
      }
    }
  }

  private drawStationRugs(): void {
    const c = (GRID_SIZE - 1) / 2;
    for (const s of STAKEHOLDERS) {
      const dx = Math.sign(c - s.grid.gx);
      const dy = Math.sign(c - s.grid.gy);
      const tiles = [
        { gx: s.grid.gx, gy: s.grid.gy },
        { gx: s.grid.gx + dx, gy: s.grid.gy },
        { gx: s.grid.gx, gy: s.grid.gy + dy },
      ];
      for (const t of tiles) {
        if (this.isWall(t.gx, t.gy)) continue;
        const { x, y } = this.toWorld(t.gx, t.gy);
        this.add.image(x, y, TEX_RUG).setTint(s.colors.body).setAlpha(0.2).setDepth(RUG_DEPTH);
      }
    }
  }

  private drawWallsAndFurniture(): void {
    for (let gx = 0; gx < GRID_SIZE; gx++) {
      for (let gy = 0; gy < GRID_SIZE; gy++) {
        if (!this.isWall(gx, gy)) continue;
        const { x, y } = this.toWorld(gx, gy);
        this.add.image(x, y, 'wall').setDepth(y);
      }
    }
    for (const f of FURNITURE) {
      const { x, y } = this.toWorld(f.gx, f.gy);
      this.add.image(x, y + TILE * 0.3, TEX_SHADOW).setDepth(y - 1);
      this.add.image(x, y, f.key).setDepth(y);
    }
  }

  private createMarker(): void {
    this.hover = this.add.image(0, 0, TEX_TILE_HI).setVisible(false).setDepth(MARKER_DEPTH);
    this.marker = this.add
      .image(0, 0, TEX_RING)
      .setTint(0x2d6cdf)
      .setAlpha(0.85)
      .setVisible(false)
      .setDepth(MARKER_DEPTH);
    this.tweens.add({
      targets: this.marker,
      scale: { from: 0.8, to: 1.0 },
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
  }

  private frameCamera(): void {
    const cam = this.cameras.main;
    const span = GRID_SIZE * TILE;
    const zoom = Phaser.Math.Clamp(Math.min((cam.width * 0.92) / span, (cam.height * 0.92) / span), 0.6, 2.4);
    cam.setZoom(zoom);
    cam.centerOn(span / 2, span / 2);
  }

  // ---------------------------------------------------------------- input
  private setupInput(): void {
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      const state = store.getState();
      if (state.gamePhase !== 'playing' || state.activeDialogue) {
        this.hover.setVisible(false);
        this.input.setDefaultCursor('default');
        return;
      }
      const { gx, gy } = worldToGrid(p.worldX, p.worldY);
      const npcId = this.npcAt(gx, gy);
      const overNpc = npcId && this.isAdjacentToPlayer(STAKEHOLDER_BY_ID[npcId].grid);
      if (overNpc || (this.isWalkable(gx, gy) && !this.player.moving)) {
        const { x, y } = this.toWorld(gx, gy);
        this.hover.setPosition(x, y).setVisible(true);
        this.input.setDefaultCursor('pointer');
      } else {
        this.hover.setVisible(false);
        this.input.setDefaultCursor('default');
      }
    });

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const state = store.getState();
      if (state.gamePhase !== 'playing' || state.activeDialogue || this.player.moving) return;

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
      this.marker.setPosition(target.x, target.y).setVisible(true);
      this.hover.setVisible(false);
      sfx.walk();

      this.player.moveAlongPath(path, () => {
        this.marker.setVisible(false);
        eventBus.emit('playerArrived', { gx: this.player.gx, gy: this.player.gy });
        this.updateNpcInRange();
      });
    });

    this.input.keyboard?.on('keydown-SPACE', () => {
      const state = store.getState();
      if (state.gamePhase === 'playing' && state.npcInRange && !state.activeDialogue) {
        eventBus.emit('requestDialogue', { npcId: state.npcInRange });
      }
    });
  }

  private npcAt(gx: number, gy: number): Role | null {
    const found = STAKEHOLDERS.find((s) => s.grid.gx === gx && s.grid.gy === gy);
    return found ? found.id : null;
  }

  private isAdjacentToPlayer(tile: { gx: number; gy: number }): boolean {
    return Math.max(Math.abs(tile.gx - this.player.gx), Math.abs(tile.gy - this.player.gy)) <= 1;
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
    store.setState({ ...state, activeDialogue: { npcId } });
  }

  private onStateChanged(): void {
    this.refreshPendingIndicators();
    if (store.getState().gamePhase === 'start') this.resetWorld();
  }

  private refreshPendingIndicators(): void {
    const state = store.getState();
    for (const npc of this.npcs) {
      npc.setPending(state.gamePhase === 'playing' && stakeholderHasPending(state, npc.info.id));
    }
  }

  private resetWorld(): void {
    if (!this.player) return;
    const start = this.toWorld(START_TILE.gx, START_TILE.gy);
    this.player.setPosition(start.x, start.y);
    this.player.gx = START_TILE.gx;
    this.player.gy = START_TILE.gy;
    this.player.setDepth(start.y);
    this.marker.setVisible(false);
  }

  // ---------------------------------------------------------------- loop
  private clockAccum = 0;

  update(_time: number, delta: number): void {
    const state = store.getState();
    if (state.gamePhase === 'playing' && !state.activeDialogue) {
      this.clockAccum += (HOURS_PER_REAL_SECOND * delta) / 1000;
      if (this.clockAccum >= 0.15) {
        advanceClock(this.clockAccum);
        this.clockAccum = 0;
      }
    }
  }

  currentNodeFor(role: Role) {
    return nodeForStakeholder(store.getState(), role);
  }
}
