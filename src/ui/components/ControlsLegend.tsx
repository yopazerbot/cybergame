// Always-visible, compact reminder of the controls.
export function ControlsLegend() {
  return (
    <div className="controls-legend">
      <span className="legend-desktop">
        <kbd>🖱️</kbd> Click floor · <kbd>WASD</kbd> / <kbd>↑↓←→</kbd> to walk
      </span>
      <span className="legend-desktop">
        <kbd>Space</kbd> / click a colleague to talk · <kbd>1</kbd>–<kbd>3</kbd> pick a reply
      </span>
      <span className="legend-desktop">
        <kbd>✋</kbd> Drag to pan · scroll or <kbd>+</kbd>/<kbd>−</kbd> to zoom
      </span>
      <span className="legend-touch">
        <kbd>👆</kbd> Tap to move · drag to pan · pinch to zoom · tap a colleague to talk
      </span>
      <span className="legend-hint">Follow 👉 the glowing rings ✨</span>
    </div>
  );
}
