import Phaser from 'phaser';
import { CHAR_PLAYER, TEX_RING, TEX_SHADOW } from '../TextureFactory';
import { ART_INV } from '../../core/config';
import { isoDepth } from '../iso';

type ToWorld = (gx: number, gy: number) => { x: number; y: number };

// The player avatar: click-to-move along an A* path with a faked walk bob.
// Clearly tagged with a "YOU" badge and a marker ring so it's never mistaken for an NPC.
export class Player extends Phaser.GameObjects.Container {
  gx: number;
  gy: number;
  moving = false;
  private avatar: Phaser.GameObjects.Image;
  private bob: Phaser.Tweens.Tween;
  private toWorld: ToWorld;

  constructor(scene: Phaser.Scene, gx: number, gy: number, toWorld: ToWorld) {
    const { x, y } = toWorld(gx, gy);
    super(scene, x, y);
    this.gx = gx;
    this.gy = gy;
    this.toWorld = toWorld;

    // Marker ring on the floor under the player.
    const ring = scene.add
      .image(0, 6, TEX_RING)
      .setOrigin(0.5, 0.5)
      .setScale(ART_INV)
      .setTint(0x2d6cdf)
      .setAlpha(0.4);
    scene.tweens.add({
      targets: ring,
      scale: { from: 0.92 * ART_INV, to: 1.08 * ART_INV },
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });

    this.avatar = scene.add.image(0, 0, CHAR_PLAYER).setOrigin(0.5, 0.92).setScale(ART_INV);

    const badge = this.makeBadge(scene);

    this.add([ring, this.avatar, badge]);
    scene.add.existing(this);
    this.setDepth(isoDepth(gx, gy, 5));

    this.bob = scene.tweens.add({
      targets: this.avatar,
      y: -4,
      scaleY: ART_INV * 0.94,
      duration: 170,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
      paused: true,
    });
  }

  private makeBadge(scene: Phaser.Scene): Phaser.GameObjects.Container {
    const text = scene.add
      .text(0, 0, 'YOU', {
        fontFamily: 'Baloo 2, sans-serif',
        fontSize: '12px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const w = text.width + 22;
    const hgt = 22;
    const bg = scene.add.graphics();
    bg.fillStyle(0x2d6cdf, 1);
    bg.fillRoundedRect(-w / 2, -hgt / 2, w, hgt, 11);
    bg.lineStyle(2, 0xffffff, 0.95);
    bg.strokeRoundedRect(-w / 2, -hgt / 2, w, hgt, 11);
    bg.fillStyle(0x2d6cdf, 1);
    bg.fillTriangle(-5, hgt / 2 - 1, 5, hgt / 2 - 1, 0, hgt / 2 + 6);

    const badge = scene.add.container(0, -100, [bg, text]);
    scene.tweens.add({
      targets: badge,
      y: -106,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
    return badge;
  }

  private startWalk(): void {
    if (!this.bob.isPlaying()) this.bob.restart();
  }

  private stopWalk(): void {
    this.bob.pause();
    this.avatar.setY(0).setScale(ART_INV, ART_INV);
  }

  moveAlongPath(path: { gx: number; gy: number }[], onArrive: () => void): void {
    if (this.moving || path.length === 0) {
      onArrive();
      return;
    }
    this.moving = true;
    this.startWalk();

    const tweens = path.map((step) => {
      const { x, y } = this.toWorld(step.gx, step.gy);
      return {
        x,
        y,
        duration: 230,
        ease: 'Linear',
        onStart: () => {
          this.avatar.setFlipX(x < this.x);
          this.puff();
          this.gx = step.gx;
          this.gy = step.gy;
          this.setDepth(isoDepth(step.gx, step.gy, 5));
        },
      };
    });

    this.scene.tweens.chain({
      targets: this,
      tweens,
      onComplete: () => {
        this.moving = false;
        this.stopWalk();
        onArrive();
      },
    });
  }

  /** A small dust puff at the feet on each step. */
  private puff(): void {
    const p = this.scene.add
      .image(this.x, this.y, TEX_SHADOW)
      .setScale(ART_INV * 0.45)
      .setAlpha(0.5)
      .setDepth(this.depth - 1);
    this.scene.tweens.add({
      targets: p,
      scaleX: ART_INV * 0.9,
      scaleY: ART_INV * 0.9,
      alpha: 0,
      duration: 340,
      onComplete: () => p.destroy(),
    });
  }
}
