import Phaser from 'phaser';
import { CHAR_PLAYER } from '../TextureFactory';
import { isoDepth } from '../iso';

type ToWorld = (gx: number, gy: number) => { x: number; y: number };

// The player avatar: click-to-move along an A* path with a faked walk bob.
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

    this.avatar = scene.add.image(0, 0, CHAR_PLAYER).setOrigin(0.5, 0.92);
    this.add(this.avatar);
    scene.add.existing(this);
    this.setDepth(isoDepth(gx, gy, 5));

    this.bob = scene.tweens.add({
      targets: this.avatar,
      y: -4,
      scaleY: 0.94,
      duration: 170,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
      paused: true,
    });
  }

  private startWalk(): void {
    if (!this.bob.isPlaying()) this.bob.restart();
  }

  private stopWalk(): void {
    this.bob.pause();
    this.avatar.setY(0).setScale(1, 1);
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
}
