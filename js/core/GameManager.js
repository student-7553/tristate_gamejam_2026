import { Bush } from '../entities/Bush.js';
import { SecurityCamera } from '../entities/SecurityCamera.js';

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
    this.nextCamY  = 0; // initialized in setPlayer

    // Security cameras
    this.securityCameras = [];
    this.CAM_GAP_MIN    = 400;
    this.CAM_GAP_RANDOM = 300;

    // Floor & game over
    this.FLOOR_Y        = height / 2 + 300; // world-space Y of the kill floor
    this.isGameOver     = false;
    this.gameOverReason = null; // 'floor' | 'spotted'

    // Zoom
    this.zoom       = 1.0;
    this.targetZoom = 1.0;

    // Score — how many pixels above spawn the player has reached
    this.score     = 0;
    this.bestScore = 0;
    this.startY    = 0; // set in setPlayer
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
    this.startY = player.y + player.height / 2;

    // Camera X is fixed to corridor centre; only Y follows the player
    this.camera.x = this.width / 2;
    this.camera.y = player.y + player.height / 2;

    // Seed generation starting 200px above the player
    this.nextBushY = player.y + player.height / 2 - 200;
    this._generateBushes();

    // Security cameras start 600px up so the player has breathing room at spawn
    this.nextCamY = player.y + player.height / 2 - 600;
    this._generateCameras();
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

  /** Spawns security cameras upward until SPAWN_AHEAD distance is covered. */
  _generateCameras() {
    if (!this.activePlayer) return;
    const playerY = this.activePlayer.y + this.activePlayer.height / 2;
    const targetY = playerY - this.SPAWN_AHEAD;

    while (this.nextCamY > targetY) {
      const onLeft   = Math.random() < 0.5;
      const x        = onLeft ? this.WORLD_LEFT : this.WORLD_RIGHT;
      const angle    = onLeft ? 0 : Math.PI;
      const phase    = Math.random() * Math.PI * 2;
      this.securityCameras.push(new SecurityCamera(x, this.nextCamY, angle, phase));
      this.nextCamY -= this.CAM_GAP_MIN + Math.random() * this.CAM_GAP_RANDOM;
    }
  }

  /** Removes cameras that have scrolled too far below the player. */
  _cullCameras() {
    if (!this.activePlayer) return;
    const playerY   = this.activePlayer.y + this.activePlayer.height / 2;
    const threshold = playerY + this.CULL_BEHIND;
    this.securityCameras = this.securityCameras.filter(c => c.y < threshold);
  }

  /** Stops the player from leaving the corridor left/right bounds. */
  _clampPlayer() {
    if (!this.activePlayer) return;
    const p = this.activePlayer;

    if (p.x < this.WORLD_LEFT) {
      p.x = this.WORLD_LEFT;
      if (!p.isStatic && p.velocity && p.velocity.x < 0) p.velocity.x = -p.velocity.x * 0.3;
    }
    if (p.x + p.width > this.WORLD_RIGHT) {
      p.x = this.WORLD_RIGHT - p.width;
      if (!p.isStatic && p.velocity && p.velocity.x > 0) p.velocity.x = -p.velocity.x * 0.3;
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

  /** Game over if a camera sees the player (player is hidden only while on a bush). */
  _checkDetection() {
    if (!this.activePlayer || this.isGameOver) return;
    // Hidden while physically resting on a bush
    if (this.activePlayer.isStatic && this.activePlayer.lastHookedBush) return;

    const px = this.activePlayer.x + this.activePlayer.width / 2;
    const py = this.activePlayer.y + this.activePlayer.height / 2;

    for (const cam of this.securityCameras) {
      if (cam.isPointInCone(px, py)) {
        this.isGameOver     = true;
        this.gameOverReason = 'spotted';
        return;
      }
    }
  }

  /** Updates score to the highest point the player has reached above spawn. */
  _updateScore() {
    if (!this.activePlayer) return;
    const playerCenterY = this.activePlayer.y + this.activePlayer.height / 2;
    const dist = Math.max(0, Math.floor(this.startY - playerCenterY));
    if (dist > this.score) {
      this.score = dist;
      if (this.score > this.bestScore) this.bestScore = this.score;
    }
  }

  /** Triggers game over if the player's bottom edge crosses the floor. */
  _checkGameOver() {
    if (!this.activePlayer || this.isGameOver) return;
    if (this.activePlayer.y + this.activePlayer.height > this.FLOOR_Y) {
      this.isGameOver     = true;
      this.gameOverReason = 'floor';
    }
  }

  /** Resets the game back to its initial state. */
  restart() {
    if (!this.activePlayer) return;
    const p = this.activePlayer;
    p.reset(this.width / 2 - p.width / 2, this.height / 2 - p.height / 2);

    this.bushes          = [];
    this.securityCameras = [];
    this.isGameOver      = false;
    this.gameOverReason  = null;
    this.score           = 0;
    this.startY          = this.height / 2;
    this.zoom            = 1.0;
    this.targetZoom      = 1.0;
    this.camera.x  = this.width / 2;
    this.camera.y  = this.height / 2;
    this.nextBushY = this.height / 2 - 200;
    this.nextCamY  = this.height / 2 - 600;
    this._generateBushes();
    this._generateCameras();
  }

  /** Called every frame — delegates to every registered component. */
  update(dt, mouse) {
    if (this.isGameOver) return;

    this.applyPhysics(dt);
    this._clampPlayer();
    this.checkCollisions();

    // Zoom out while the player is pulling back, return to normal when released
    this.targetZoom = (this.activePlayer && this.activePlayer.slingshot.isDragging) ? 0.75 : 1.0;
    this.zoom += (this.targetZoom - this.zoom) * (1 - Math.exp(-6 * dt));

    // Convert screen-space mouse coords to world-space (accounts for zoom)
    const worldMouse = {
      ...mouse,
      x: this.camera.x + (mouse.x - this.width  / 2) / this.zoom,
      y: this.camera.y + (mouse.y - this.height / 2) / this.zoom,
    };

    if (this.activePlayer) {
      this.activePlayer.update(dt, worldMouse);
    }
    for (const bush of this.bushes) {
      bush.update(dt, worldMouse);
    }
    for (const cam of this.securityCameras) {
      cam.update(dt);
    }

    // Camera: X locked to corridor centre, Y smooth-follows player
    if (this.activePlayer) {
      const targetY  = this.activePlayer.y + this.activePlayer.height / 2;
      const smoothing = 1 - Math.exp(-8 * dt);
      this.camera.x  = this.width / 2;
      this.camera.y += (targetY - this.camera.y) * smoothing;
    }

    // Maintain infinite streams
    this._generateBushes();
    this._cullBushes();
    this._generateCameras();
    this._cullCameras();

    this._updateScore();
    this._checkDetection();
    this._checkGameOver();
  }

  /** Draws an infinite grid pattern in world space so camera movement is visible. */
  _drawBackground() {
    const GRID_SIZE = 60;
    const ctx = this.ctx;

    // Visible world-space bounds (zoom-corrected: zooming out reveals more world)
    const halfW = (this.width  / 2) / this.zoom;
    const halfH = (this.height / 2) / this.zoom;
    const visLeft   = this.camera.x - halfW;
    const visTop    = this.camera.y - halfH;
    const visRight  = this.camera.x + halfW;
    const visBottom = this.camera.y + halfH;

    // Solid fill
    ctx.fillStyle = this.bgColor;
    ctx.fillRect(visLeft, visTop, halfW * 2, halfH * 2);

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
    const halfH = (this.height / 2) / this.zoom;
    const visTop    = this.camera.y - halfH * 2;
    const visHeight = halfH * 4;
    const wallExtent = this.width / this.zoom;

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

  /** Draws the kill floor across the full corridor width (world space). */
  _drawFloor() {
    const ctx = this.ctx;
    const floorH = 24;
    const extent = this.width;

    ctx.fillStyle = '#7a1a1a';
    ctx.fillRect(this.WORLD_LEFT - extent, this.FLOOR_Y, (this.WORLD_RIGHT - this.WORLD_LEFT) + extent * 2, floorH);

    // Top edge line
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(this.WORLD_LEFT - extent, this.FLOOR_Y);
    ctx.lineTo(this.WORLD_RIGHT + extent, this.FLOOR_Y);
    ctx.stroke();
  }

  /** Draws the live score in the top-left corner (screen space). */
  _drawHUD() {
    const ctx = this.ctx;
    ctx.save();
    ctx.textAlign    = 'left';
    ctx.shadowColor  = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur   = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(`Height: ${this.score}`, 16, 32);

    if (this.bestScore > 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = '15px sans-serif';
      ctx.fillText(`Best: ${this.bestScore}`, 16, 54);
    }
    ctx.restore();
  }

  /** Draws the game-over overlay in screen space (called outside camera transform). */
  _drawGameOver() {
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.textAlign = 'center';

    if (this.gameOverReason === 'spotted') {
      ctx.fillStyle = '#ffcc00';
      ctx.font = 'bold 72px sans-serif';
      ctx.fillText('SPOTTED!', this.width / 2, this.height / 2 - 50);
    } else {
      ctx.fillStyle = '#ff4444';
      ctx.font = 'bold 72px sans-serif';
      ctx.fillText('GAME OVER', this.width / 2, this.height / 2 - 50);
    }

    const isNewBest = this.score > 0 && this.score >= this.bestScore;
    ctx.fillStyle = isNewBest ? '#ffcc00' : '#cccccc';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText(`Height: ${this.score}${isNewBest ? '  NEW BEST!' : ''}`, this.width / 2, this.height / 2 + 10);

    if (!isNewBest && this.bestScore > 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '18px sans-serif';
      ctx.fillText(`Best: ${this.bestScore}`, this.width / 2, this.height / 2 + 36);
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = '22px sans-serif';
    ctx.fillText('Press R to restart', this.width / 2, this.height / 2 + 68);
  }

  /** Clears the screen, applies camera transform, then draws every entity. */
  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    ctx.save();
    // Scale around screen centre, then position camera
    ctx.translate(this.width / 2, this.height / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.camera.x, -this.camera.y);

    this._drawBackground();
    this._drawWalls();
    this._drawFloor();

    // Security cameras (drawn before entities so cone appears behind player/bushes)
    for (const cam of this.securityCameras) {
      cam.draw(ctx);
    }

    // Player
    if (this.activePlayer) {
      this.activePlayer.draw(ctx, this.gravity);
    }

    // Bushes
    for (const bush of this.bushes) {
      bush.draw(ctx);
    }

    ctx.restore();

    if (this.isGameOver) {
      this._drawGameOver();
    } else {
      this._drawHUD();
    }
  }
}
