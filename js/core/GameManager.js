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

    /** @type {Array<{update:(dt:number)=>void, draw:(ctx:CanvasRenderingContext2D)=>void}>} */
    this.components = [];
    this.activePlayer = null;

    // Camera tracks world-space position of the screen centre
    this.camera = { x: width / 2, y: height / 2 };
  }

  /**
   * Register a component / entity so the manager will update & draw it.
   * @param {object} component – must expose update(dt) and draw(ctx)
   */
  addComponent(component) {
    this.components.push(component);
  }

  /**
   * Set the active player for the game.
   * @param {object} player
   */
  setPlayer(player) {
    this.activePlayer = player;
    // Snap camera to player immediately so there is no initial slide
    this.camera.x = player.x + player.width / 2;
    this.camera.y = player.y + player.height / 2;
  }

  /** Applies physics including gravity to all non-static entities. */
  applyPhysics(dt) {
    const applyToEntity = (entity) => {
      // Skip if entity doesn't exist, is static, or lacks basic physics properties
      if (!entity || entity.isStatic || !entity.velocity) return;

      // Apply gravity to change vertical velocity
      entity.velocity.y += this.gravity * dt;

      // Update position based on velocity
      if (entity.x !== undefined && entity.y !== undefined) {
        entity.x += entity.velocity.x * dt;
        entity.y += entity.velocity.y * dt;
      }
    };

    applyToEntity(this.activePlayer);
    for (const component of this.components) {
      applyToEntity(component);
    }
  }

  /** Called every frame — delegates to every registered component. */
  update(dt, mouse) {
    // Compute all new locations before frame update logic
    this.applyPhysics(dt);

    // Convert screen-space mouse coords to world-space so that components
    // (e.g. SlingshotController) work correctly regardless of camera position.
    const worldMouse = {
      ...mouse,
      x: mouse.x + this.camera.x - this.width / 2,
      y: mouse.y + this.camera.y - this.height / 2,
    };

    if (this.activePlayer) {
      this.activePlayer.update(dt, worldMouse);
    }
    for (const component of this.components) {
      component.update(dt, worldMouse);
    }

    // Smooth camera follow — exponential decay, frame-rate independent
    if (this.activePlayer) {
      const targetX = this.activePlayer.x + this.activePlayer.width / 2;
      const targetY = this.activePlayer.y + this.activePlayer.height / 2;
      const smoothing = 1 - Math.exp(-8 * dt);
      this.camera.x += (targetX - this.camera.x) * smoothing;
      this.camera.y += (targetY - this.camera.y) * smoothing;
    }
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

  /** Clears the screen, applies camera transform, then draws every component. */
  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // Translate so that camera world-position maps to screen centre
    const camOffsetX = this.width  / 2 - this.camera.x;
    const camOffsetY = this.height / 2 - this.camera.y;

    ctx.save();
    ctx.translate(camOffsetX, camOffsetY);

    this._drawBackground();

    // Player
    if (this.activePlayer) {
      this.activePlayer.draw(ctx);
    }

    // Components
    for (const component of this.components) {
      component.draw(ctx);
    }

    ctx.restore();
  }
}
