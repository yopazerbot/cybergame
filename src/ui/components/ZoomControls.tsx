import { eventBus } from '../../core/eventBus';

// Camera zoom controls (also works via mouse wheel). Sits in the right-edge rail.
export function ZoomControls() {
  return (
    <div className="zoom-controls" role="group" aria-label="Zoom controls">
      <button
        className="zoom-btn"
        title="Zoom in"
        aria-label="Zoom in"
        onClick={() => eventBus.emit('zoom', { dir: 'in' })}
      >
        ＋
      </button>
      <button
        className="zoom-btn"
        title="Reset view"
        aria-label="Reset view"
        onClick={() => eventBus.emit('zoom', { dir: 'reset' })}
      >
        ⊙
      </button>
      <button
        className="zoom-btn"
        title="Zoom out"
        aria-label="Zoom out"
        onClick={() => eventBus.emit('zoom', { dir: 'out' })}
      >
        －
      </button>
    </div>
  );
}
