import Phaser from 'phaser';
import { isoDepth } from '../iso';
import type { Stakeholder } from '../../scenario/stakeholders';

type ToWorld = (gx: number, gy: number) => { x: number; y: number };

// A stakeholder NPC: procedural body sprite + floating role emoji + a "!" pending indicator.
export class Npc extends Phaser.GameObjects.Container {
  readonly info: Stakeholder;
  private bang: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, stakeholder: Stakeholder, toWorld: ToWorld) {
    const { x, y } = toWorld(stakeholder.grid.gx, stakeholder.grid.gy);
    super(scene, x, y);
    this.info = stakeholder;

    const body = scene.add.image(0, 0, `char_${stakeholder.id}`).setOrigin(0.5, 0.92);

    const emoji = scene.add
      .text(0, -58, stakeholder.emoji, { fontSize: '20px' })
      .setOrigin(0.5);

    this.bang = scene.add
      .text(16, -64, '!', {
        fontFamily: 'Baloo 2, sans-serif',
        fontSize: '24px',
        color: '#ffffff',
        backgroundColor: '#e8554e',
        padding: { x: 7, y: 1 },
      })
      .setOrigin(0.5)
      .setVisible(false);

    this.add([body, emoji, this.bang]);
    scene.add.existing(this);
    this.setDepth(isoDepth(stakeholder.grid.gx, stakeholder.grid.gy, 4));

    // Gentle idle bob.
    scene.tweens.add({
      targets: body,
      y: -3,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
      delay: Math.random() * 800,
    });

    // Pulse on the indicator.
    scene.tweens.add({
      targets: this.bang,
      scale: { from: 0.85, to: 1.1 },
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
  }

  setPending(pending: boolean): void {
    this.bang.setVisible(pending);
  }
}
