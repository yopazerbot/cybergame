import Phaser from 'phaser';
import { generateTextures } from '../TextureFactory';

// Generates all procedural textures, then starts the office.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    generateTextures(this);
    this.scene.start('Office');
  }
}
