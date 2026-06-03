import Phaser from 'phaser';
import { GRID_SIZE, TILE_H, HOURS_PER_REAL_SECOND } from '../../core/config';
import { gridToWorld, worldToGrid, isoDepth } from '../iso';
import { findPath } from '../pathfinding';
import { Player } from '../entities/Player';
import { Npc } from '../entities/Npc';
import { store } from '../../core/store';
import { eventBus } from '../../core/eventBus';
import { STAKEHOLDERS, STAKEHOLDER_BY_ID } from '../../scenario/stakeholders';
import { nodeForStakeholder, stakeholderHasPending } from '../../scenario/scoring';
import { advanceClock } from '../../scenario/scoring';
import type { Role } from '../../core/types';

// Decorative / blocking furniture: tile -> texture key.
const FURNITURE: { gx: number; gy: number; key: string }[] = [
  { gx: 5, gy: 5, key: 'desk' },
  { gx: 6, gy: 5, key: 'desk' },
  { gx: 3, gy: 1, key: 'server' },
  { gx: 4, gy: 1, key: 'server' },
  { gx: 1, gy: 11, key: 'plant' },
  { gx: 11, gy: 11, key: 'plant' },
  { gx: 1, gy: 6, key: 'plant' },
];

const ACCENT_TILES = new Set(['5,6', '6,6', '5,7', '6,7']);
const START_TILE = { gx: 7, gy: 7 };

export class OfficeScene extends Phaser.Scene {
  private player!: Player;
  private npcs: Npc[] = [];
  private blocked = new Set<string>();
  private npcTiles = new Set<string>();
  private marker!: Phaser.GameObjects.Image;
  private toWorld = (gx: number, gy: number) => {
    const w = gridToWorld(gx, gy);
    return { x: w.x, y: w.y };
  };

  constructor() {
    super('Office');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#aeb9d4');

    this.buildBlockedSet();
    this.drawFloor();
    this.drawWallsAndFurniture();
    this.createMarker();

    // NPCs.
    this.npcs = STAKEHOLDERS.map((s) => new Npc(this, s, this.toWorld));

    // Player.
    this.player = new Player(this, START_TILE.gx, START_TILE.gy, this.toWorld);

    // Center the camera on the board.
    const center = this.toWorld((GRID_SIZE - 1) / 2, (GRID_SIZE - 1) / 2);
    this.cameras.main.centerOn(center.x, center.y - 20);

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
    return gx === 0 || gy === 0;
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
        let key = (gx + gy) % 2 === 0 ? 'floor_a' : 'floor_b';
        if (ACCENT_TILES.has(`${gx},${gy}`)) key = 'floor_accent';
        this.add.image(x, y, key).setOrigin(0.5, 0.5).setDepth(isoDepth(gx, gy, -2));
      }
    }
  }

  private drawWallsAndFurniture(): void {
    // Back walls along gx=0 and gy=0.
    for (let i = 0; i < GRID_SIZE; i++) {
      this.placeBox(0, i, 'wall');
      this.placeBox(i, 0, 'wall');
    }
    for (const f of FURNITURE) this.placeBox(f.gx, f.gy, f.key);
  }

  private placeBox(gx: number, gy: number, key: string): void {
    const { x, y } = this.toWorld(gx, gy);
    // Origin (0.5,1) at the tile's bottom vertex makes the footprint overlay the floor tile.
    this.add
      .image(x, y + TILE_H / 2, key)
      .setOrigin(0.5, 1)
      .setDepth(isoDepth(gx, gy, 1));
  }

  private createMarker(): void {
    this.marker = this.add
      .image(0, 0, 'floor_accent')
      .setOrigin(0.5, 0.5)
      .setAlpha(0.55)
      .setVisible(false)
      .setDepth(isoDepth(0, 0, -1));
  }

  // ---------------------------------------------------------------- input
  private setupInput(): void {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const state = store.getState();
      if (state.gamePhase !== 'playing' || state.activeDialogue || this.player.moving) return;

      const { gx, gy } = worldToGrid(p.worldX, p.worldY);

      // Clicking an NPC (or its tile) while adjacent opens dialogue.
      const npcId = this.npcAt(gx, gy);
      if (npcId && this.isAdjacentToPlayer(STAKEHOLDER_BY_ID[npcId].grid)) {
        eventBus.emit('requestDialogue', { npcId });
        return;
      }

      if (!this.isWalkable(gx, gy)) return;
      const path = findPath({ gx: this.player.gx, gy: this.player.gy }, { gx, gy }, this.isWalkable);
      if (!path) return;

      const target = this.toWorld(gx, gy);
      this.marker
        .setPosition(target.x, target.y)
        .setDepth(isoDepth(gx, gy, -1))
        .setVisible(true);

      this.player.moveAlongPath(path, () => {
        this.marker.setVisible(false);
        eventBus.emit('playerArrived', { gx: this.player.gx, gy: this.player.gy });
        this.updateNpcInRange();
      });
    });

    // Space talks to an adjacent NPC.
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
    this.player.setDepth(isoDepth(START_TILE.gx, START_TILE.gy, 5));
    this.marker.setVisible(false);
  }

  // ---------------------------------------------------------------- loop
  private clockAccum = 0;

  update(_time: number, delta: number): void {
    const state = store.getState();
    if (state.gamePhase === 'playing' && !state.activeDialogue) {
      // Batch passive clock drift so we don't re-render the UI every frame.
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
