import { GameManager } from './core/GameManager.js';
import { Player } from './entities/Player.js';

// --- Config ---
const SCREEN_WIDTH = 1000;
const SCREEN_HEIGHT = 800;
const BG_COLOR = 'rgb(57, 76, 60)';

// --- Canvas Setup ---
const canvas = document.getElementById('game-canvas');

// --- Initialise Core ---
const gameManager = new GameManager(canvas, SCREEN_WIDTH, SCREEN_HEIGHT, BG_COLOR);

// --- Create & Register Entities ---
const player = new Player(SCREEN_WIDTH, SCREEN_HEIGHT);
gameManager.setPlayer(player); // seeds the infinite bush stream automatically

// --- Input ---
const keys = {};

window.addEventListener('keydown', (e) => {
  keys[e.key] = true;
  if ((e.key === 'r' || e.key === 'R') && gameManager.isGameOver) {
    gameManager.restart();
  }
});
window.addEventListener('keyup', (e) => { keys[e.key] = false; });

const mouse = { x: 0, y: 0, isDown: false, wasDown: false };
let canvasRect = canvas.getBoundingClientRect(); // Cached rect

// Optional: refresh if the window resizes
window.addEventListener('resize', () => {
  canvasRect = canvas.getBoundingClientRect();
});

function updateMousePos(e) {
  mouse.x = e.clientX - canvasRect.left;
  mouse.y = e.clientY - canvasRect.top;
}

canvas.addEventListener('mousedown', (e) => {
  mouse.isDown = true;
  updateMousePos(e);
});
canvas.addEventListener('mousemove', updateMousePos);
window.addEventListener('mouseup', () => {
  mouse.isDown = false;
});

// --- Game Loop ---
let lastTime = 0;

function loop(timestamp) {
  const dt = (timestamp - lastTime) / 1000; // delta time in seconds
  lastTime = timestamp;

  gameManager.update(dt, mouse);
  gameManager.draw();

  mouse.wasDown = mouse.isDown;

  requestAnimationFrame(loop);
}

// --- Start ---
requestAnimationFrame(loop);
