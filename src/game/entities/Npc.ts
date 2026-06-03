import Phaser from 'phaser';
import { isoDepth } from '../iso';
import { TEX_RING } from '../TextureFactory';
import type { Stakeholder } from '../../scenario/stakeholders';

type ToWorld = (gx: number, gy: number) => { x: number; y: number };

// A stakeholder NPC: procedural body + always-on nameplate + a pulsing floor "objective" ring.
export class Npc extends Phaser.GameObjects.Container {
  readonly info: Stakeholder;
  private ring: Phaser.GameObjects.Image;
  private arrow: Phaser.GameObjects.Text;
  private plate: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, stakeholder: Stakeholder, toWorld: ToWorld) {
    const { x, y } = toWorld(stakeholder.grid.gx, stakeholder.grid.gy);
    super(scene, x, y);
    this.info = stakeholder;

    // Floor objective ring (hidden until the NPC has a pending action).
    this.ring = scene.add
      .image(0, 6, TEX_RING)
      .setOrigin(0.5, 0.5)
      .setTint(stakeholder.colors.body)
      .setAlpha(0.0);

    const body = scene.add.image(0, 0, `char_${stakeholder.id}`).setOrigin(0.5, 0.92);

    // Bobbing down-chevron to draw the eye when there's something to do.
    this.arrow = scene.add
      .text(0, -70, '▼', {
        fontFamily: 'Baloo 2, sans-serif',
        fontSize: '18px',
        color: '#ffd24a',
      })
      .setOrigin(0.5)
      .setVisible(false);

    this.plate = this.makeNameplate(scene);

    this.add([this.ring, body, this.plate, this.arrow]);
    scene.add.existing(this);
    this.setDepth(isoDepth(stakeholder.grid.gx, stakeholder.grid.gy, 4));

    scene.tweens.add({
      targets: body,
      y: -3,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
      delay: Math.random() * 800,
    });
    scene.tweens.add({
      targets: this.ring,
      scale: { from: 0.9, to: 1.12 },
      duration: 850,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
    scene.tweens.add({
      targets: this.arrow,
      y: -64,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
  }

  private makeNameplate(scene: Phaser.Scene): Phaser.GameObjects.Container {
    const label = `${this.info.emoji}  ${this.info.name}`;
    const text = scene.add
      .text(0, 0, label, {
        fontFamily: 'Baloo 2, sans-serif',
        fontSize: '13px',
        color: '#1f2740',
      })
      .setOrigin(0.5);
    const padX = 9;
    const w = text.width + padX * 2;
    const hgt = text.height + 6;
    const bg = scene.add.graphics();
    bg.fillStyle(0xffffff, 0.92);
    bg.fillRoundedRect(-w / 2, -hgt / 2, w, hgt, 7);
    bg.lineStyle(1.5, this.info.colors.body, 1);
    bg.strokeRoundedRect(-w / 2, -hgt / 2, w, hgt, 7);
    // Little pointer triangle.
    bg.fillStyle(0xffffff, 0.92);
    bg.fillTriangle(-5, hgt / 2 - 1, 5, hgt / 2 - 1, 0, hgt / 2 + 5);

    const plate = scene.add.container(0, -52, [bg, text]);
    return plate;
  }

  setPending(pending: boolean): void {
    this.ring.setAlpha(pending ? 0.55 : 0.0);
    this.arrow.setVisible(pending);
    this.plate.setScale(pending ? 1.05 : 1.0);
  }
}
