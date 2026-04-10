import { Bush } from '../entities/Bush.js';

export class GameManager {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {number} width        - screen / canvas width
   * @param {number} height       - screen / canvas height
   * @param {string} bgColor      - default background colour
   */
  constructor(canvas, width, height, bgColor = '#1a1a2e') {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.width = width;
    this.height = height;
    this.bgColor = bgColor;

    // Apply dimensions to the canvas element
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    // Physics properties
    this.gravity = 980; // pixels per second squared

    this.bushes = [];
    this.activePlayer = null;

    // Camera tracks world-space position of the screen centre
    this.camera = { x: width / 2, y: height / 2 };

    // World corridor: play area is a vertical strip centered on the screen
    this.CORRIDOR_HALF_WIDTH = 200;
    this.WORLD_LEFT  = width / 2 - this.CORRIDOR_HALF_WIDTH;
    this.WORLD_RIGHT = width / 2 + this.CORRIDOR_HALF_WIDTH;

    // Infinite bush generation
    this.BUSH_GAP_MIN    = 150; // minimum vertical gap between bushes
    this.BUSH_GAP_RANDOM = 100; // extra random variation on top of minimum
    this.SPAWN_AHEAD     = 1500; // generate bushes this far above the player
    this.CULL_BEHIND     = 800;  // remove bushes this far below the player

    this.nextBushY = 0; // initialized in setPlayer
  }

  /**
   * Register a bush so the manager will update & draw it.
   * @param {object} bush
   */
  addBush(bush) {
    this.bushes.push(bush);
  }

  /**
   * Set the active player and seed the first batch of bushes.
   * @param {object} player
   */
  setPlayer(player) {
    this.activePlayer = player;
    // Camera X is fixed to corridor centre; only Y follows the player
    this.camera.x = this.width / 2;
    this.camera.y = player.y + player.height / 2;

    // Seed generation starting 200px above the player
    this.nextBushY = player.y + player.height / 2 - 200;
    this._generateBushes();
  }

  /** Spawns randomised bushes upward until SPAWN_AHEAD distance is covered. */
  _generateBushes() {
    if (!this.activePlayer) return;
    const playerY  = this.activePlayer.y + this.activePlayer.height / 2;
    const targetY  = playerY - this.SPAWN_AHEAD;
    const margin   = 30; // bush radius + a little padding
    const spawnWidth = this.WORLD_RIGHT - this.WORLD_LEFT - margin * 2;

    while (this.nextBushY > targetY) {
      const x = this.WORLD_LEFT + margin + Math.random() * spawnWidth;
      this.addBush(new Bush(x, this.nextBushY));
      this.nextBushY -= this.BUSH_GAP_MIN + Math.random() * this.BUSH_GAP_RANDOM;
    }
  }

  /** Removes bushes that have scrolled too far below the player. */
  _cullBushes() {
    if (!this.activePlayer) return;
    const playerY   = this.activePlayer.y + this.activePlayer.height / 2;
    const threshold = playerY + this.CULL_BEHIND;
    this.bushes = this.bushes.filter(b => b.y < threshold);
  }

  /** Stops the player from leaving the corridor left/right bounds. */
  _clampPlayer() {
    if (!this.activePlayer) return;
    const p = this.activePlayer;

    if (p.x < this.WORLD_LEFT) {
      p.x = this.WORLD_LEFT;
      if (p.velocity && p.velocity.x < 0) p.velocity.x = 0;
    }
    if (p.x + p.width > this.WORLD_RIGHT) {
      p.x = this.WORLD_RIGHT - p.width;
      if (p.velocity && p.velocity.x > 0) p.velocity.x = 0;
    }
  }

  /** Applies physics including gravity to all non-static entities. */
  applyPhysics(dt) {
    const applyToEntity = (entity) => {
      if (!entity || entity.isStatic || !entity.velocity) return;
      entity.velocity.y += this.gravity * dt;
      if (entity.x !== undefined && entity.y !== undefined) {
        entity.x += entity.velocity.x * dt;
        entity.y += entity.velocity.y * dt;
      }
    };

    applyToEntity(this.activePlayer);
    for (const bush of this.bushes) {
      applyToEntity(bush);
    }
  }

  /** Checks whether the player has landed on a bush and hooks them together. */
  checkCollisions() {
    if (!this.activePlayer) return;

    const px = this.activePlayer.x + this.activePlayer.width / 2;
    const py = this.activePlayer.y + this.activePlayer.height / 2;

    for (const bush of this.bushes) {
      const dist = Math.hypot(px - bush.x, py - bush.y);
      const threshold = bush.radius + this.activePlayer.width / 2;

      if (dist < threshold) {
        if (!this.activePlayer.isStatic && this.activePlayer.lastHookedBush !== bush && !bush.isDisabled) {
          this.activePlayer.isStatic = true;
          this.activePlayer.velocity.x = 0;
          this.activePlayer.velocity.y = 0;
          this.activePlayer.x = bush.x - this.activePlayer.width / 2;
          this.activePlayer.y = bush.y - this.activePlayer.height / 2;
          this.activePlayer.lastHookedBush = bush;
          bush.isDisabled = true;
        }
      } else {
        if (this.activePlayer.lastHookedBush === bush && dist > threshold) {
          this.activePlayer.lastHookedBush = null;
        }
      }
    }
  }

  /** Called every frame — delegates to every registered component. */
  update(dt, mouse) {
    this.applyPhysics(dt);
    this._clampPlayer();
    this.checkCollisions();

    // Convert screen-space mouse coords to world-space
    const worldMouse = {
      ...mouse,
      x: mouse.x + this.camera.x - this.width / 2,
      y: mouse.y + this.camera.y - this.height / 2,
    };

    if (this.activePlayer) {
      this.activePlayer.update(dt, worldMouse);
    }
    for (const bush of this.bushes) {
      bush.update(dt, worldMouse);
    }

    // Camera: X locked to corridor centre, Y smooth-follows player
    if (this.activePlayer) {
      const targetY  = this.activePlayer.y + this.activePlayer.height / 2;
      const smoothing = 1 - Math.exp(-8 * dt);
      this.camera.x  = this.width / 2;
      this.camera.y += (targetY - this.camera.y) * smoothing;
    }

    // Maintain infinite bush stream
    this._generateBushes();
    this._cullBushes();
  }

  /** Draws an infinite grid pattern in world space so camera movement is visible. */
  _drawBackground() {
    const GRID_SIZE = 60;
    const ctx = this.ctx;

    // Visible world-space bounds
    const visLeft   = this.camera.x - this.width  / 2;
    const visTop    = this.camera.y - this.height / 2;
    const visRight  = this.camera.x + this.width  / 2;
    const visBottom = this.camera.y + this.height / 2;

    // Solid fill
    ctx.fillStyle = this.bgColor;
    ctx.fillRect(visLeft, visTop, this.width, this.height);

    // Grid lines — snap start to nearest grid boundary
    const startX = Math.floor(visLeft  / GRID_SIZE) * GRID_SIZE;
    const startY = Math.floor(visTop   / GRID_SIZE) * GRID_SIZE;

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.lineWidth = 1;

    for (let x = startX; x <= visRight; x += GRID_SIZE) {
      ctx.moveTo(x, visTop);
      ctx.lineTo(x, visBottom);
    }
    for (let y = startY; y <= visBottom; y += GRID_SIZE) {
      ctx.moveTo(visLeft,  y);
      ctx.lineTo(visRight, y);
    }
    ctx.stroke();
  }

  /** Draws darker wall overlays outside the corridor bounds. */
  _drawWalls() {
    const ctx = this.ctx;
    const visTop    = this.camera.y - this.height;
    const visHeight = this.height * 2;
    const wallExtent = this.width;

    ctx.fillStyle = '#2a7038';
    ctx.fillRect(this.WORLD_LEFT - wallExtent, visTop, wallExtent, visHeight);
    ctx.fillRect(this.WORLD_RIGHT, visTop, wallExtent, visHeight);

    // Edge lines
    ctx.strokeStyle = '#1a4d25';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(this.WORLD_LEFT,  visTop);
    ctx.lineTo(this.WORLD_LEFT,  visTop + visHeight);
    ctx.moveTo(this.WORLD_RIGHT, visTop);
    ctx.lineTo(this.WORLD_RIGHT, visTop + visHeight);
    ctx.stroke();
  }

  /** Clears the screen, applies camera transform, then draws every entity. */
  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // Translate so that camera world-position maps to screen centre
    const camOffsetX = this.width  / 2 - this.camera.x;
    const camOffsetY = this.height / 2 - this.camera.y;

    ctx.save();
    ctx.translate(camOffsetX, camOffsetY);

    this._drawBackground();
    this._drawWalls();

    // Player
    if (this.activePlayer) {
      this.activePlayer.draw(ctx);
    }

    // Bushes
    for (const bush of this.bushes) {
      bush.draw(ctx);
    }

    ctx.restore();
  }
}
