import Phaser from 'phaser';
import { TEX_RING } from '../TextureFactory';

type ToWorld = (gx: number, gy: number) => { x: number; y: number };
type Dir = 'down' | 'up' | 'side';

// Top-down animated player avatar with a "YOU" badge + marker ring.
export class Player extends Phaser.GameObjects.Container {
  gx: number;
  gy: number;
  moving = false;
  private sprite: Phaser.GameObjects.Sprite;
  private key: string;
  private toWorld: ToWorld;
  private dir: Dir = 'down';

  constructor(scene: Phaser.Scene, gx: number, gy: number, toWorld: ToWorld, key = 'char_0') {
    const { x, y } = toWorld(gx, gy);
    super(scene, x, y);
    this.gx = gx;
    this.gy = gy;
    this.toWorld = toWorld;
    this.key = key;

    const ring = scene.add.image(0, 10, TEX_RING).setTint(0x2d6cdf).setAlpha(0.55);
    scene.tweens.add({
      targets: ring,
      scale: { from: 0.85, to: 1.05 },
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });

    this.sprite = scene.add.sprite(0, 0, key, 1).setOrigin(0.5, 0.9).setScale(2);
    const badge = this.makeBadge(scene);

    this.add([ring, this.sprite, badge]);
    scene.add.existing(this);
    this.setDepth(this.y);
    this.sprite.play(`${key}-idle-down`);
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
    const w = text.width + 20;
    const h = 22;
    const bg = scene.add.graphics();
    bg.fillStyle(0x2d6cdf, 1);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 11);
    bg.lineStyle(2, 0xffffff, 0.95);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 11);
    bg.fillStyle(0x2d6cdf, 1);
    bg.fillTriangle(-5, h / 2 - 1, 5, h / 2 - 1, 0, h / 2 + 6);
    const badge = scene.add.container(0, -64, [bg, text]);
    scene.tweens.add({
      targets: badge,
      y: -70,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
    return badge;
  }

  private face(dx: number, dy: number): void {
    if (Math.abs(dx) > Math.abs(dy)) {
      this.dir = 'side';
      this.sprite.setFlipX(dx < 0);
    } else {
      this.dir = dy < 0 ? 'up' : 'down';
    }
    this.sprite.play(`${this.key}-${this.dir}`, true);
  }

  private idle(): void {
    this.sprite.play(`${this.key}-idle-${this.dir}`, true);
  }

  moveAlongPath(path: { gx: number; gy: number }[], onArrive: () => void): void {
    if (this.moving || path.length === 0) {
      onArrive();
      return;
    }
    this.moving = true;

    const tweens = path.map((step) => {
      const { x, y } = this.toWorld(step.gx, step.gy);
      return {
        x,
        y,
        duration: 200,
        ease: 'Linear',
        onStart: () => {
          this.face(x - this.x, y - this.y);
          this.gx = step.gx;
          this.gy = step.gy;
        },
        onUpdate: () => this.setDepth(this.y),
      };
    });

    this.scene.tweens.chain({
      targets: this,
      tweens,
      onComplete: () => {
        this.moving = false;
        this.idle();
        onArrive();
      },
    });
  }
}
