// Always-visible, compact reminder of the controls.
export function ControlsLegend() {
  return (
    <div className="controls-legend">
      <span>
        <kbd>🖱️</kbd> Click floor · <kbd>↑↓←→</kbd> arrows to walk
      </span>
      <span>
        <kbd>Space</kbd> / click a colleague to talk
      </span>
      <span>
        <kbd>✋</kbd> Drag to pan · scroll to zoom
      </span>
      <span className="legend-hint">Follow 👉 the glowing rings ✨</span>
    </div>
  );
}
