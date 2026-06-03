import Phaser from 'phaser';
import { isoDepth } from '../iso';
import { TEX_RING } from '../TextureFactory';
import { ART_INV } from '../../core/config';
import type { Stakeholder } from '../../scenario/stakeholders';

type ToWorld = (gx: number, gy: number) => { x: number; y: number };

// A stakeholder NPC: procedural body + always-on nameplate + a pulsing floor "objective" ring.
export class Npc extends Phaser.GameObjects.Container {
  readonly info: Stakeholder;
  private ring: Phaser.GameObjects.Image;
  private arrow: Phaser.GameObjects.Text;
  private plate: Phaser.GameObjects.Container;
  private nextTag: Phaser.GameObjects.Container;
  private isNext = false;

  constructor(scene: Phaser.Scene, stakeholder: Stakeholder, toWorld: ToWorld) {
    const { x, y } = toWorld(stakeholder.grid.gx, stakeholder.grid.gy);
    super(scene, x, y);
    this.info = stakeholder;

    // Floor objective ring (hidden until the NPC has a pending action).
    this.ring = scene.add
      .image(0, 6, TEX_RING)
      .setOrigin(0.5, 0.5)
      .setScale(ART_INV)
      .setTint(stakeholder.colors.body)
      .setAlpha(0.0);

    const body = scene.add
      .image(0, 0, `char_${stakeholder.id}`)
      .setOrigin(0.5, 0.92)
      .setScale(ART_INV);

    // Bobbing down-chevron to draw the eye when there's something to do.
    this.arrow = scene.add
      .text(0, -120, '▼', {
        fontFamily: 'Baloo 2, sans-serif',
        fontSize: '18px',
        color: '#ffd24a',
      })
      .setOrigin(0.5)
      .setVisible(false);

    this.plate = this.makeNameplate(scene);
    this.nextTag = this.makeNextTag(scene);

    this.add([this.ring, body, this.plate, this.arrow, this.nextTag]);
    scene.add.existing(this);
    this.setDepth(isoDepth(stakeholder.grid.gx, stakeholder.grid.gy, 4));

    scene.tweens.add({
      targets: this.nextTag,
      y: -150,
      duration: 650,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });

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
      scale: { from: 0.9 * ART_INV, to: 1.12 * ART_INV },
      duration: 850,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
    scene.tweens.add({
      targets: this.arrow,
      y: -114,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });

    // Idle look-around: every few seconds an NPC may turn, so they read as alive
    // rather than as frozen statues.
    scene.time.addEvent({
      delay: Phaser.Math.Between(2800, 5200),
      loop: true,
      callback: () => {
        if (Math.random() < 0.55) body.setFlipX(!body.flipX);
      },
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
    const hgt = 30;
    const bg = scene.add.graphics();
    bg.fillStyle(0xffffff, 0.95);
    bg.fillRoundedRect(-w / 2, -hgt / 2, w, hgt, 8);
    bg.lineStyle(1.5, this.info.colors.body, 1);
    bg.strokeRoundedRect(-w / 2, -hgt / 2, w, hgt, 8);
    // Coloured accent bar under the name to separate role.
    bg.fillStyle(this.info.colors.body, 0.18);
    bg.fillRoundedRect(-w / 2 + 3, 1, w - 6, hgt / 2 - 3, 5);
    // Little pointer triangle.
    bg.fillStyle(0xffffff, 0.95);
    bg.fillTriangle(-5, hgt / 2 - 1, 5, hgt / 2 - 1, 0, hgt / 2 + 5);

    return scene.add.container(0, -102, [bg, name, role]);
  }

  /** A bright bouncing "talk to me next" banner for the single primary target. */
  private makeNextTag(scene: Phaser.Scene): Phaser.GameObjects.Container {
    const text = scene.add
      .text(0, 0, '👉 Talk to me next', {
        fontFamily: 'Baloo 2, sans-serif',
        fontSize: '12px',
        color: '#3a2a00',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const w = text.width + 18;
    const hgt = 22;
    const bg = scene.add.graphics();
    bg.fillStyle(0xffd24a, 1);
    bg.fillRoundedRect(-w / 2, -hgt / 2, w, hgt, 11);
    bg.lineStyle(2, 0xffffff, 0.95);
    bg.strokeRoundedRect(-w / 2, -hgt / 2, w, hgt, 11);
    bg.fillStyle(0xffd24a, 1);
    bg.fillTriangle(-5, hgt / 2 - 1, 5, hgt / 2 - 1, 0, hgt / 2 + 6);
    return scene.add.container(0, -144, [bg, text]).setVisible(false);
  }

  /** Marks this NPC as the recommended next stop (stronger ring + banner). */
  setNext(on: boolean): void {
    this.isNext = on;
    this.nextTag.setVisible(on);
    if (on) this.ring.setAlpha(0.75);
  }

  /** Pop a small speech bubble above the NPC (e.g. when you start talking). */
  emote(symbol = '💬'): void {
    const bubble = this.scene.add
      .text(0, -150, symbol, { fontFamily: 'Baloo 2, sans-serif', fontSize: '22px' })
      .setOrigin(0.5)
      .setScale(0);
    this.add(bubble);
    this.scene.tweens.add({ targets: bubble, scale: 1, duration: 170, ease: 'Back.out' });
    this.scene.tweens.add({
      targets: bubble,
      alpha: 0,
      y: -172,
      delay: 650,
      duration: 320,
      onComplete: () => bubble.destroy(),
    });
  }

  // Kill tweens targeting our children before teardown (mode switch rebuilds NPCs),
  // otherwise the tween manager keeps ticking destroyed objects and throws.
  destroy(fromScene?: boolean): void {
    this.scene?.tweens.killTweensOf(this.list);
    super.destroy(fromScene);
  }

  setPending(pending: boolean): void {
    this.ring.setAlpha(pending ? (this.isNext ? 0.75 : 0.55) : 0.0);
    this.arrow.setVisible(pending);
    this.plate.setScale(pending ? 1.05 : 1.0);
  }
}
