import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { OfficeScene } from './scenes/OfficeScene';

// Render the canvas at the display's physical pixel resolution.
//
// Phaser's RESIZE scale mode sizes the drawing buffer to CSS pixels only, ignoring
// devicePixelRatio. On any display with a fractional/high DPR — Chrome on Windows
// at 125–150% display scaling is the common case, plus Retina/HiDPI screens and
// browser zoom — the browser then upscales a low-resolution buffer, so the whole
// world looks blurry/soft and slightly mis-scaled.
//
// Instead we drive the scale manager manually (mode NONE): the backing buffer is
// sized to cssPixels × dpr (crisp, native resolution) while the canvas is still
// displayed at the full viewport CSS size. Camera framing is unchanged (frameCamera
// derives zoom from the game size, which scales proportionally), and pointer
// hit-testing self-corrects because Phaser derives its input scale from the canvas'
// real on-screen rect.
export function createGame(): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game-root',
    transparent: true,
    scale: {
      mode: Phaser.Scale.NONE,
      autoCenter: Phaser.Scale.NO_CENTER,
      width: window.innerWidth,
      height: window.innerHeight,
      autoRound: true,
    },
    render: { antialias: true, pixelArt: false, roundPixels: true },
    scene: [BootScene, OfficeScene],
  });

  const applyScale = () => {
    // Cap DPR so very high-density screens (phones at dpr 3+) don't allocate an
    // enormous buffer; 2 already covers the fractional-DPR Chrome/Windows case.
    const dpr = Math.min(Math.max(window.devicePixelRatio || 1, 1), 2);
    const cssW = window.innerWidth;
    const cssH = window.innerHeight;
    // Display the canvas at the viewport CSS size, render it at physical pixels.
    game.scale.setZoom(1 / dpr);
    game.scale.resize(cssW * dpr, cssH * dpr);
  };

  applyScale();
  window.addEventListener('resize', applyScale);

  return game;
}
