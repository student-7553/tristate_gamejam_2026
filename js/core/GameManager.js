import { Bush } from '../entities/Bush.js';
import { SecurityCamera } from '../entities/SecurityCamera.js';
import { shuriken } from '../entities/shuriken.js';
import { TreeBackground } from '../entities/TreeBackground.js';
import { BorderTile } from '../entities/BorderTile.js';
import { WallSpikes } from '../entities/Wallspikes.js';
import { Cloud } from '../entities/Cloud.js';

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
    this.ctx.imageSmoothingEnabled = false;

    this.width = width;
    this.height = height;
    this.bgColor = bgColor;

    // Apply dimensions to the canvas element
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    // Physics properties
    this.gravity = 980; // pixels per second squared
    this.WALL_SLIDE_SPEED = 80; // px/s slide-down speed while clinging to a wall

    this.bushes = [];
    this.activePlayer = null;

    // Camera tracks world-space position of the screen centre
    this.camera = { x: width / 2, y: height / 2 };

    // World corridor: play area is a vertical strip centered on the screen
    this.CORRIDOR_HALF_WIDTH = 200;
    this.WORLD_LEFT = width / 2 - this.CORRIDOR_HALF_WIDTH;
    this.WORLD_RIGHT = width / 2 + this.CORRIDOR_HALF_WIDTH;

    // Infinite bush generation
    this.BUSH_GAP_MIN = 150; // minimum vertical gap between bushes
    this.BUSH_GAP_RANDOM = 100; // extra random variation on top of minimum
    this.SPAWN_AHEAD = 1500; // generate bushes this far above the player
    this.CULL_BEHIND = 800;  // remove bushes this far below the player

    this.nextBushY = 0; // initialized in setPlayer
    this.nextCamY = 0; // initialized in setPlayer

    this.treeBackgrounds = [];
    this.borderTiles = [];
    this.nextTreeY = 0; // initialized in setPlayer

    // Security cameras
    this.securityCameras = [];
    this.CAM_GAP_MIN = 320;
    this.CAM_GAP_RANDOM = 220;

    // Detection meter — fills when a camera sees the player, drains when hidden
    this.detectionLevel = 0;
    this.DETECTION_FILL_RATE = 1 / 0.6; // 0.6 s to fill
    this.DETECTION_DRAIN_RATE = 1 / 0.7; // 0.7 s to fully drain

    // Floor & game over
    this.FLOOR_Y = height / 2 + 300; // world-space Y of the kill floor
    this.isGameOver = false;
    this.gameOverReason = null; // 'floor' | 'spotted'

    // Zoom
    this.zoom = 1.0;
    this.targetZoom = 1.0;

    // Score — how many pixels above spawn the player has reached
    this.score = 0;
    this.bestScore = 0;
    this.startY = 0; // set in setPlayer


    this.shurikens = [];
    this.leafParticles = [];

    // spawn timing (
    this.shuSpawnTimer = 0;
    this.SHU_MIN_INTERVAL = 0.4;
    this.SHU_MAX_INTERVAL = 1.6;
    this.nextShuInterval = this.SHU_MIN_INTERVAL;

    // speed randomness
    this.SHU_SPEED_MIN = 160;
    this.SHU_SPEED_MAX = 420;

    // wallspikes
    this.wallSpikes = [];
    this.SPIKE_GAP_MIN = 260;
    this.SPIKE_GAP_RANDOM = 180;
    this.nextSpikeY = 0;

    // spawn height for entities
    this.SHU_SPAWN_HEIGHT = 1500;
    this.CAMERA_SPAWN_HEIGHT = 4000;
    this.WALLSPIKE_SPAWN_HEIGHT = 800;

    this.clouds = [];
    for (let i = 0; i < 20; i++) {
      this.clouds.push(new Cloud(width, height));
    }
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

    // Trees
    this.nextTreeY = player.y + player.height / 2 + 600;
    this._generateTrees();

    //Wall spikes
    this.nextSpikeY = player.y + player.height / 2 - 900;
    this._generateSpikes();

    this.nextSpikeY = 0;
  }

  _generateTrees() {
    if (!this.activePlayer) return;
    const playerY = this.activePlayer.y + this.activePlayer.height / 2;
    // Pre-generate a massive static background going 50,000 units high at the start
    const targetY = playerY - 50000;
    const GRID_SIZE = 20;

    const visibleWidth = (this.width / 0.75); // max possible zoom is 0.75
    const halfVis = visibleWidth / 2;

    const startX = Math.floor((this.width / 2 - halfVis - GRID_SIZE) / GRID_SIZE) * GRID_SIZE;
    const endX = Math.floor((this.width / 2 + halfVis + GRID_SIZE) / GRID_SIZE) * GRID_SIZE;

    while (this.nextTreeY > targetY) {
      // 1. Explicitly place border tiles at the wall edges (guaranteed to render for any GRID_SIZE)
      this.borderTiles.push(new BorderTile(this.WORLD_LEFT - GRID_SIZE, this.nextTreeY, GRID_SIZE, true));
      this.borderTiles.push(new BorderTile(this.WORLD_RIGHT, this.nextTreeY, GRID_SIZE, false));

      // 2. Fill in the background trees
      for (let x = startX; x <= endX; x += GRID_SIZE) {
        // Skip the corridor and the wall areas
        const isPlayableArea = x >= this.WORLD_LEFT && x < this.WORLD_RIGHT;
        const isWallArea = (x >= this.WORLD_LEFT - GRID_SIZE && x < this.WORLD_LEFT) ||
          (x >= this.WORLD_RIGHT && x < this.WORLD_RIGHT + GRID_SIZE);

        if (isPlayableArea && !isWallArea) {
          this.treeBackgrounds.push(new TreeBackground(x, this.nextTreeY, GRID_SIZE));
        }
      }
      this.nextTreeY -= GRID_SIZE;
    }
  }


  /** Returns a 0–1 difficulty factor based on how high the player has climbed. Reaches 1 at height 2500. */
  _getDifficultyFactor() {
    return Math.min(1, this.score / 2500);
  }

  /** Spawns randomised bushes upward until SPAWN_AHEAD distance is covered. */
  _generateBushes() {
    if (!this.activePlayer) return;
    const playerY = this.activePlayer.y + this.activePlayer.height / 2;
    const targetY = playerY - this.SPAWN_AHEAD;
    const margin = 30;
    const spawnWidth = this.WORLD_RIGHT - this.WORLD_LEFT - margin * 2;
    const diff = this._getDifficultyFactor();
    // Bushes get sparser as difficulty rises: gap grows from 150–250 up to 240–400
    const gapMin = this.BUSH_GAP_MIN + Math.round(diff * 90);
    const gapRandom = this.BUSH_GAP_RANDOM + Math.round(diff * 70);

    while (this.nextBushY > targetY) {
      const x = this.WORLD_LEFT + margin + Math.random() * spawnWidth;
      this.addBush(new Bush(x, this.nextBushY));
      this.nextBushY -= gapMin + Math.random() * gapRandom;
    }
  }

  /** Removes bushes that have scrolled too far below the player. */
  _cullBushes() {
    if (!this.activePlayer) return;
    const playerY = this.activePlayer.y + this.activePlayer.height / 2;
    const threshold = playerY + this.CULL_BEHIND;
    this.bushes = this.bushes.filter(b => b.y < threshold);
  }

  /** Spawns security cameras upward until SPAWN_AHEAD distance is covered. */
  _generateCameras() {
    if (!this.activePlayer) return;
    // Do not spawn above the unlock line
    const unlockWorldY = this.startY - this.CAMERA_SPAWN_HEIGHT;
    if (this.nextCamY > unlockWorldY) {
    this.nextCamY = unlockWorldY;
    }

    const playerY = this.activePlayer.y + this.activePlayer.height / 2;
    const targetY = playerY - this.SPAWN_AHEAD;
    const diff = this._getDifficultyFactor();
    // Cameras get denser as difficulty rises: gap shrinks from 320–540 down to 140–230
    const gapMin = Math.max(140, this.CAM_GAP_MIN - Math.round(diff * 180));
    const gapRandom = Math.max(90, this.CAM_GAP_RANDOM - Math.round(diff * 130));

    while (this.nextCamY > targetY) {
      const onLeft = Math.random() < 0.5;
      const x = onLeft ? this.WORLD_LEFT : this.WORLD_RIGHT;
      const angle = onLeft ? 0 : Math.PI;
      const phase = Math.random() * Math.PI * 2;
      this.securityCameras.push(new SecurityCamera(x, this.nextCamY, angle, phase, diff));
      this.nextCamY -= gapMin + Math.random() * gapRandom;
    }
  }

  _spawnShurikenWave() {
    if (!this.activePlayer) return;

    const playerY = this.activePlayer.y + this.activePlayer.height / 2;


      // Convert unlock height to world position
    const unlockWorldY = this.startY - this.SHU_SPAWN_HEIGHT;

      // Do not spawn above the unlock line
      if (playerY > unlockWorldY) return;

    // small, controlled height above player
    const baseOffset = 120; // always slightly above
    const randomOffset = Math.random() * 180; // small variation

    const offsetY = - (baseOffset + randomOffset);

    const speed = 250;

    const spawnLeft = Math.random() < 0.5;

    if (spawnLeft) {
      this.shurikens.push(
        new shuriken(this.WORLD_LEFT, playerY + offsetY, speed)
      );
    } else {
      this.shurikens.push(
        new shuriken(this.WORLD_RIGHT, playerY + offsetY, -speed)
      );
    }
  }



  _checkShurikenCollisions() {
    if (!this.activePlayer || this.isGameOver) return;

    if (this.activePlayer.isStatic && this.activePlayer.lastHookedBush) {
      return;
    }

    const px = this.activePlayer.x + this.activePlayer.width / 2;
    const py = this.activePlayer.y + this.activePlayer.height / 2;

    for (const s of this.shurikens) {
      const dist = Math.hypot(px - s.x, py - s.y);
      const threshold = s.size + this.activePlayer.width / 2;

      if (dist < threshold) {
        this.isGameOver = true;
        this.gameOverReason = "shuriken";
        return;
      }
    }
  }
  /** Removes cameras that have scrolled too far below the player. */
  _cullCameras() {
    if (!this.activePlayer) return;
    const playerY = this.activePlayer.y + this.activePlayer.height / 2;
    const threshold = playerY + this.CULL_BEHIND;
    this.securityCameras = this.securityCameras.filter(c => c.y < threshold);
  }


  _spawnLeafParticles(bush) {
    const colors = ['#2d7a2d', '#256b25', '#1f5c1f', '#3a8a3a', '#4d9e4d'];
    const count = 10 + Math.floor(Math.random() * 6); // 10–15 leaves
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 120;
      const life = 1.2 + Math.random() * 1.0;
      this.leafParticles.push({
        x: bush.x + (Math.random() - 0.5) * bush.radius * 1.5,
        y: bush.y + (Math.random() - 0.5) * bush.radius * 1.5,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60, // slight upward burst
        life,
        maxLife: life,
        color: colors[Math.floor(Math.random() * colors.length)],
        w: 4 + Math.random() * 4,
        h: 2 + Math.random() * 2,
        angle: Math.random() * Math.PI * 2,
        angVel: (Math.random() - 0.5) * 8,
      });
    }
  }

  _cullShurikens() {
    if (!this.activePlayer) return;

    const playerY = this.activePlayer.y + this.activePlayer.height / 2;
    const threshold = playerY + this.CULL_BEHIND;

    this.shurikens = this.shurikens.filter(s => s.y < threshold);
  }



_generateSpikes() {
  if (!this.activePlayer) return;



  const unlockWorldY = this.startY - this.WALLSPIKE_SPAWN_HEIGHT;

  // clamp starting position
  if (this.nextSpikeY > unlockWorldY) {
    this.nextSpikeY = unlockWorldY;
  }

  const playerY = this.activePlayer.y + this.activePlayer.height / 2;
  const targetY = playerY - this.SPAWN_AHEAD;

  while (this.nextSpikeY > targetY) {

    const onLeft = Math.random() < 0.5;
    const x = onLeft ? this.WORLD_LEFT : this.WORLD_RIGHT;

    const count = 2 + Math.floor(Math.random() * 4); // 2–5 spikes

    this.wallSpikes.push(
      new WallSpikes(x, this.nextSpikeY, onLeft, count)
    );

    this.nextSpikeY -= this.SPIKE_GAP_MIN + Math.random() * this.SPIKE_GAP_RANDOM;
  }
}


  _cullSpikes() {
    if (!this.activePlayer) return;

    const playerY = this.activePlayer.y + this.activePlayer.height / 2;
    const threshold = playerY + this.CULL_BEHIND;

    this.wallSpikes = this.wallSpikes.filter(s => s.y < threshold);
}

  _checkSpikeCollisions() {
    if (!this.activePlayer || this.isGameOver) return;

    const px = this.activePlayer.x + this.activePlayer.width / 2;
    const py = this.activePlayer.y + this.activePlayer.height / 2;

    for (const spike of this.wallSpikes) {
      if (spike.isPointTouching(px, py)) {
        this.isGameOver = true;
        this.gameOverReason = "spikes";
        return;
      }
    }
  }

  /** Stops the player from leaving the corridor; wall-cling on impact while airborne. */
  _clampPlayer(dt) {
    if (!this.activePlayer) return;
    const p = this.activePlayer;

    const hitLeft = p.x < this.WORLD_LEFT;
    const hitRight = p.x + p.width > this.WORLD_RIGHT;

    if (hitLeft || hitRight) {
      // Pin to wall
      p.x = hitLeft ? this.WORLD_LEFT : this.WORLD_RIGHT - p.width;

      if (!p.isStatic) {
        // First contact while airborne → start clinging
        p.velocity.x = 0;
        p.velocity.y = 0;
        p.isStatic = true;
        p.isWallClinging = true;
      }
    }

    // Slide down while clinging
    if (p.isWallClinging) {
      p.y += this.WALL_SLIDE_SPEED * dt;
      // Keep x pinned to whichever wall the player is on
      if (p.x <= this.WORLD_LEFT) p.x = this.WORLD_LEFT;
      else if (p.x + p.width >= this.WORLD_RIGHT) p.x = this.WORLD_RIGHT - p.width;
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
          this.activePlayer.isWallClinging = false; // wall-cling ends when catching a bush
          this.activePlayer.velocity.x = 0;
          this.activePlayer.velocity.y = 0;
          this.activePlayer.x = bush.x - this.activePlayer.width / 2;
          this.activePlayer.y = bush.y - this.activePlayer.height / 2;
          this.activePlayer.lastHookedBush = bush;
          // Bush stays visually intact while the player is on it
        }
      } else {
        if (this.activePlayer.lastHookedBush === bush) {
          this.activePlayer.lastHookedBush = null;
          bush.isDisabled = true;
          this._spawnLeafParticles(bush);
          this.bushes = this.bushes.filter((b) => b !== bush);
        }
      }
    }
  }

  /** Fills a detection meter while any camera sees the player; triggers game over when full. */
  _checkDetection(dt) {
    // Reset each camera's alert state every frame
    for (const cam of this.securityCameras) {
      cam.isDetecting = false;
    }

    if (!this.activePlayer || this.isGameOver) return;

    // Player is hidden while physically resting on a bush
    const hidden = this.activePlayer.isStatic && this.activePlayer.lastHookedBush;

    let anyDetecting = false;
    if (!hidden) {
      const px = this.activePlayer.x + this.activePlayer.width / 2;
      const py = this.activePlayer.y + this.activePlayer.height / 2;
      for (const cam of this.securityCameras) {
        if (cam.isPointInCone(px, py)) {
          cam.isDetecting = true;
          anyDetecting = true;
        }
      }
    }

    if (anyDetecting) {
      this.detectionLevel = Math.min(1, this.detectionLevel + this.DETECTION_FILL_RATE * dt);
      if (this.detectionLevel >= 1) {
        this.isGameOver = true;
        this.gameOverReason = 'spotted';
      }
    } else {
      this.detectionLevel = Math.max(0, this.detectionLevel - this.DETECTION_DRAIN_RATE * dt);
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
      this.isGameOver = true;
      this.gameOverReason = 'floor';
    }
  }

  /** Resets the game back to its initial state. */
  restart() {
    if (!this.activePlayer) return;
    const p = this.activePlayer;
    p.reset(this.width / 2 - p.width / 2, this.height / 2 - p.height / 2);

    this.bushes = [];
    this.securityCameras = [];
    this.isGameOver = false;
    this.gameOverReason = null;
    this.score = 0;
    this.startY = this.height / 2;
    this.detectionLevel = 0;
    this.zoom = 1.0;
    this.targetZoom = 1.0;
    this.camera.x = this.width / 2;
    this.camera.y = this.height / 2;
    this.nextBushY = this.height / 2 - 200;
    this.nextCamY = this.height / 2 - 600;
    this._generateBushes();
    this._generateCameras();
    this.shurikens = [];
    this.leafParticles = [];
    this.shuSpawnTimer = 0;
    this.nextShuInterval = 0.8 + Math.random() * 0.8;
    this.nextSpikeY = this.activePlayer.y + this.activePlayer.height / 2 - 200;

    this.treeBackgrounds = [];
    this.borderTiles = [];
    this.nextTreeY = this.height / 2 + 600;
    this._generateTrees();
  }

  /** Called every frame — delegates to every registered component. */
  update(dt, mouse) {
    if (this.isGameOver) return;

    this.applyPhysics(dt);
    this._clampPlayer(dt);
    this.checkCollisions();

    // Zoom out while the player is pulling back, return to normal when released
    this.targetZoom = (this.activePlayer && this.activePlayer.slingshot.isDragging) ? 0.75 : 1.0;
    this.zoom += (this.targetZoom - this.zoom) * (1 - Math.exp(-6 * dt));

    // Convert screen-space mouse coords to world-space (accounts for zoom)
    const worldMouse = {
      ...mouse,
      x: this.camera.x + (mouse.x - this.width / 2) / this.zoom,
      y: this.camera.y + (mouse.y - this.height / 2) / this.zoom,
    };

    if (this.activePlayer) {
      this.activePlayer.update(dt, mouse, this.camera, this.zoom);
    }
    for (const bush of this.bushes) {
      bush.update(dt);
    }
    for (const cloud of this.clouds) {
      cloud.update(dt);
    }

    // Zoom update comes AFTER player.update so isDragging reflects this frame's state.
    // Smooth in both directions — no snap needed since input is now screen-space.
    this.targetZoom = (this.activePlayer && this.activePlayer.slingshot.isDragging) ? 0.75 : 1.0;
    this.zoom += (this.targetZoom - this.zoom) * (1 - Math.exp(-6 * dt));
    const px = this.activePlayer ? this.activePlayer.x + this.activePlayer.width / 2 : null;
    const py = this.activePlayer ? this.activePlayer.y + this.activePlayer.height / 2 : null;
    for (const cam of this.securityCameras) {
      cam.update(dt, px, py);
    }

    for (const shu of this.shurikens) {
      shu.update(dt);
    }
    this._checkShurikenCollisions();

    // TIMER-BASED SPAWNER
    this.shuSpawnTimer += dt;

    if (this.shuSpawnTimer >= this.nextShuInterval) {
      this._spawnShurikenWave();

      this.shuSpawnTimer = 0;
      this.nextShuInterval =
        this.SHU_MIN_INTERVAL +
        Math.random() * (this.SHU_MAX_INTERVAL - this.SHU_MIN_INTERVAL);
    }

    this._cullShurikens();


    this._generateSpikes();
    this._cullSpikes();
    this._checkSpikeCollisions();

    // Update leaf particles
    for (let i = this.leafParticles.length - 1; i >= 0; i--) {
      const p = this.leafParticles[i];
      p.vy += 200 * dt; // gentle gravity
      p.vx *= Math.pow(0.92, dt * 60); // light air resistance
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.angle += p.angVel * dt;
      p.life -= dt;
      if (p.life <= 0) this.leafParticles.splice(i, 1);
    }

    // Camera: X follows corridor centre, Y smooth-follows player.
    // While slingshotting: offset camera 180° opposite the drag so the player
    // can see further in the direction they are about to launch.
    if (this.activePlayer) {
      const playerCY = this.activePlayer.y + this.activePlayer.height / 2;
      const slingshot = this.activePlayer.slingshot;

      let targetCameraX = this.width / 2;
      let targetCameraY = playerCY;

      if (slingshot.isDragging) {
        const lookAheadScale = 2.5;
        targetCameraX = this.width / 2 - slingshot.dragDx * lookAheadScale;
        targetCameraY = playerCY - slingshot.dragDy * lookAheadScale;
      }

      const smoothing = 1 - Math.exp(-8 * dt);
      this.camera.x += (targetCameraX - this.camera.x) * smoothing;
      this.camera.y += (targetCameraY - this.camera.y) * smoothing;
    }

    // Maintain infinite streams
    this._generateBushes();
    this._cullBushes();
    this._generateCameras();
    this._cullCameras();

    this._updateScore();
    this._checkDetection(dt);
    this._checkGameOver();
  }

  /** Draws an infinite grid pattern in world space so camera movement is visible. */
  _drawBackground() {
    const GRID_SIZE = 50;
    const ctx = this.ctx;

    // Visible world-space bounds (zoom-corrected: zooming out reveals more world)
    const halfW = (this.width / 2) / this.zoom;
    const halfH = (this.height / 2) / this.zoom;
    const visLeft = this.camera.x - halfW;
    const visTop = this.camera.y - halfH;
    const visRight = this.camera.x + halfW;
    const visBottom = this.camera.y + halfH;

    // Solid fill
    ctx.fillStyle = this.bgColor;
    ctx.fillRect(visLeft, visTop, halfW * 2, halfH * 2);
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
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(`Height: ${this.score}`, 16, 32);

    if (this.bestScore > 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = '15px sans-serif';
      ctx.fillText(`Best: ${this.bestScore}`, 16, 54);
    }

    // Detection bar — bottom-centre, only visible when meter is non-zero
    if (this.detectionLevel > 0) {
      const BAR_W = 220;
      const BAR_H = 10;
      const bx = this.width / 2 - BAR_W / 2;
      const by = this.height - 44;

      // Label
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('DETECTION', this.width / 2, by - 5);

      // Background track
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillRect(bx - 2, by - 1, BAR_W + 4, BAR_H + 2);

      // Filled portion — shifts from yellow to red as it fills
      const g = Math.round(200 * (1 - this.detectionLevel));
      ctx.fillStyle = `rgb(255, ${g}, 0)`;
      ctx.fillRect(bx, by, BAR_W * this.detectionLevel, BAR_H);
    }

    ctx.restore();
  }

  /** Darkens the screen edges and pulses red while a camera is detecting the player. */
  _drawVignette() {
    const ctx = this.ctx;
    const cx = this.width / 2;
    const cy = this.height / 2;
    const r1 = Math.min(this.width, this.height) * 0.18;
    const r2 = Math.max(this.width, this.height) * 0.85;

    // Permanent dark vignette
    const vg = ctx.createRadialGradient(cx, cy, r1, cx, cy, r2);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.60)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, this.width, this.height);

    // Red pulse overlay while being detected
    if (this.detectionLevel > 0) {
      const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.009);
      const alpha = this.detectionLevel * 0.45 * pulse;
      const rg = ctx.createRadialGradient(cx, cy, r1 * 1.5, cx, cy, r2 * 1.1);
      rg.addColorStop(0, 'rgba(180,0,0,0)');
      rg.addColorStop(1, `rgba(180,0,0,${alpha.toFixed(3)})`);
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, this.width, this.height);
    }
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

    for (const cloud of this.clouds) {
      cloud.draw(ctx, this.camera.x, this.camera.y);
    }

    // Visible bounds for rendering optimization
    const halfW = (this.width / 2) / this.zoom;
    const halfH = (this.height / 2) / this.zoom;
    const visTop = this.camera.y - halfH;
    const visBottom = this.camera.y + halfH;

    // Trees
    for (const tree of this.treeBackgrounds) {
      if (tree.y + tree.size >= visTop && tree.y <= visBottom) {
        tree.draw(ctx);
      }
    }

    // Border tiles
    for (const border of this.borderTiles) {
      if (border.y + border.size >= visTop && border.y <= visBottom) {
        border.draw(ctx);
      }
    }

    this._drawFloor();

    // Security cameras (drawn before entities so cone appears behind player/bushes)
    for (const cam of this.securityCameras) {
      cam.draw(ctx);
    }

    // Player
    if (this.activePlayer) {
      this.activePlayer.draw(ctx, this.gravity, this.zoom);
    }

    // Bushes
    for (const bush of this.bushes) {
      bush.draw(ctx);
    }

    // Leaf particles
    for (const p of this.leafParticles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }

    // Shurikens
    for (const shu of this.shurikens) {
      shu.draw(ctx);
    }

    // wall spikes
    for (const spike of this.wallSpikes) {
      spike.draw(ctx);
    }

    ctx.restore();

    this._drawVignette();

    if (this.isGameOver) {
      this._drawGameOver();
    } else {
      this._drawHUD();
    }
  }
}
