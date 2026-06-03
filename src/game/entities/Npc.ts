import Phaser from 'phaser';
import { TEX_RING } from '../TextureFactory';
import type { Stakeholder } from '../../scenario/stakeholders';

type ToWorld = (gx: number, gy: number) => { x: number; y: number };

// Top-down stakeholder NPC: animated sprite + nameplate (name + role) + objective ring.
export class Npc extends Phaser.GameObjects.Container {
  readonly info: Stakeholder;
  private ring: Phaser.GameObjects.Image;
  private arrow: Phaser.GameObjects.Text;
  private plate: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, stakeholder: Stakeholder, toWorld: ToWorld) {
    const { x, y } = toWorld(stakeholder.grid.gx, stakeholder.grid.gy);
    super(scene, x, y);
    this.info = stakeholder;

    this.ring = scene.add
      .image(0, 10, TEX_RING)
      .setTint(stakeholder.colors.body)
      .setAlpha(0);

    const sprite = scene.add.sprite(0, 0, stakeholder.sheet, 1).setOrigin(0.5, 0.9).setScale(2);
    sprite.play(`${stakeholder.sheet}-idle-down`);

    this.arrow = scene.add
      .text(0, -92, '▼', {
        fontFamily: 'Baloo 2, sans-serif',
        fontSize: '18px',
        color: '#ffd24a',
      })
      .setOrigin(0.5)
      .setVisible(false);

    this.plate = this.makeNameplate(scene);

    this.add([this.ring, sprite, this.plate, this.arrow]);
    scene.add.existing(this);
    this.setDepth(this.y);

    scene.tweens.add({
      targets: this.ring,
      scale: { from: 0.85, to: 1.12 },
      duration: 850,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
    scene.tweens.add({
      targets: this.arrow,
      y: -86,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
  }

  private makeNameplate(scene: Phaser.Scene): Phaser.GameObjects.Container {
    const roleColor = '#' + this.info.colors.body.toString(16).padStart(6, '0');
    const name = scene.add
      .text(0, -7, `${this.info.emoji}  ${this.info.name}`, {
        fontFamily: 'Baloo 2, sans-serif',
        fontSize: '13px',
        color: '#1f2740',
      })
      .setOrigin(0.5);
    const role = scene.add
      .text(0, 8, this.info.title.toUpperCase(), {
        fontFamily: 'Nunito, sans-serif',
        fontSize: '9px',
        color: roleColor,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const w = Math.max(name.width, role.width) + 18;
    const h = 30;
    const bg = scene.add.graphics();
    bg.fillStyle(0xffffff, 0.96);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
    bg.lineStyle(1.5, this.info.colors.body, 1);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
    bg.fillStyle(this.info.colors.body, 0.16);
    bg.fillRoundedRect(-w / 2 + 3, 1, w - 6, h / 2 - 3, 5);
    bg.fillStyle(0xffffff, 0.96);
    bg.fillTriangle(-5, h / 2 - 1, 5, h / 2 - 1, 0, h / 2 + 5);

    return scene.add.container(0, -72, [bg, name, role]);
  }

  setPending(pending: boolean): void {
    this.ring.setAlpha(pending ? 0.6 : 0);
    this.arrow.setVisible(pending);
    this.plate.setScale(pending ? 1.05 : 1.0);
  }
}
