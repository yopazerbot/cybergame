import Phaser from 'phaser';
import { generateTextures } from '../TextureFactory';

// Loads the pixel-art character sprites, builds walk animations, generates the
// procedural tile/furniture textures, then starts the office.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    for (let i = 0; i < 6; i++) {
      this.load.spritesheet(`char_${i}`, `/assets/characters/char_${i}.png`, {
        frameWidth: 16,
        frameHeight: 32,
      });
    }
  }

  create(): void {
    generateTextures(this);

    // Sheet layout: 7 cols × 3 rows of 16×32. Row0=down, Row1=up, Row2=side.
    for (let i = 0; i < 6; i++) {
      const k = `char_${i}`;
      const walk = (base: number) => ({
        frames: this.anims.generateFrameNumbers(k, { frames: [base, base + 1, base + 2, base + 1] }),
        frameRate: 8,
        repeat: -1,
      });
      this.anims.create({ key: `${k}-down`, ...walk(0) });
      this.anims.create({ key: `${k}-up`, ...walk(7) });
      this.anims.create({ key: `${k}-side`, ...walk(14) });
      this.anims.create({
        key: `${k}-idle-down`,
        frames: [{ key: k, frame: 1 }],
        frameRate: 1,
      });
      this.anims.create({ key: `${k}-idle-up`, frames: [{ key: k, frame: 8 }], frameRate: 1 });
      this.anims.create({ key: `${k}-idle-side`, frames: [{ key: k, frame: 15 }], frameRate: 1 });
    }

    this.scene.start('Office');
  }
}
