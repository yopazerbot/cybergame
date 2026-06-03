import React from 'react';
import { createRoot } from 'react-dom/client';
import { createGame } from './game/PhaserGame';
import { App } from './ui/App';
import './ui/styles/ui.css';

// Boot the Phaser world (canvas) ...
createGame();

// ... and mount the React UI overlay on top.
const uiRoot = document.getElementById('ui-root');
if (uiRoot) {
  createRoot(uiRoot).render(React.createElement(App));
}
