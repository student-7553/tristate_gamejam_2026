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
    this.bushes = [];
    this.activePlayer = null;
    this.camera = { x: 0, y: 0 };
  }

  /**
   * Register a bush so the manager will update & draw it.
   * @param {object} bush
   */
  addBush(bush) {
    this.bushes.push(bush);
  }

  /**
   * Set the active player for the game.
   * @param {object} player
   */
  setPlayer(player) {
    this.activePlayer = player;
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
    for (const bush of this.bushes) {
      applyToEntity(bush);
    }
  }

  checkCollisions() {
    if (!this.activePlayer) return;

    const px = this.activePlayer.x + this.activePlayer.width / 2;
    const py = this.activePlayer.y + this.activePlayer.height / 2;

    for (const bush of this.bushes) {
      const dist = Math.hypot(px - bush.x, py - bush.y);
      const threshold = bush.radius + this.activePlayer.width / 2;

      if (dist < threshold) {
        // Hook into the bush if we are moving, it's not disabled, and not escaping the same bush
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
        // If we are far enough from the bush we last hooked to, clear it so we can hook again later
        if (this.activePlayer.lastHookedBush === bush && dist > threshold) {
          this.activePlayer.lastHookedBush = null;
        }
      }
    }
  }

  /** Called every frame — delegates to every registered component. */
  update(dt, mouse) {
    // Compute all new locations before frame update logic
    this.applyPhysics(dt);

    // Check custom collisions (hooking into bushes)
    this.checkCollisions();

    let worldMouse = mouse;

    if (this.activePlayer) {
      // Update camera so the player is strictly in the centre of the window
      this.camera.x = this.width / 2 - (this.activePlayer.x + this.activePlayer.width / 2);
      this.camera.y = this.height / 2 - (this.activePlayer.y + this.activePlayer.height / 2);

      // Translate the actual mouse screen coordinates into world coordinates for logic checking
      if (mouse) {
        worldMouse = {
          ...mouse,
          x: mouse.x - this.camera.x,
          y: mouse.y - this.camera.y
        };
      }

      this.activePlayer.update(dt, worldMouse);
    }

    for (const bush of this.bushes) {
      bush.update(dt, worldMouse);
    }
  }

  /** Clears the screen, fills with bgColor, then draws every component. */
  draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Background (fixed to screen, do not translate)
    this.ctx.fillStyle = this.bgColor;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Apply Camera translation
    this.ctx.save();
    this.ctx.translate(this.camera.x, this.camera.y);

    // Player
    if (this.activePlayer) {
      this.activePlayer.draw(this.ctx);
    }

    // Bushes
    for (const bush of this.bushes) {
      bush.draw(this.ctx);
    }

    // Restore context back to normal screen space
    this.ctx.restore();
  }
}
