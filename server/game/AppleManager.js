// AppleManager — 2 active apples, instant respawn, never overlap snakes

class AppleManager {
  /**
   * @param {Arena} arena
   */
  constructor(arena) {
    this.arena = arena;
    this.apples = []; // array of {x, y}
    this.targetCount = 2;
  }

  /** Initialise apples given initial snake bodies */
  init(snakes) {
    this.apples = [];
    this._fill(snakes);
  }

  /**
   * Check if any snake head landed on an apple.
   * Removes eaten apples and immediately respawns.
   * @param {Snake[]} snakes
   * @returns {string[]} ids of snakes that ate an apple this tick
   */
  checkEat(snakes) {
    const eaters = [];
    for (const snake of snakes) {
      if (!snake.alive) continue;
      const idx = this.apples.findIndex(a => a.x === snake.head.x && a.y === snake.head.y);
      if (idx !== -1) {
        snake.grow();
        this.apples.splice(idx, 1);
        eaters.push(snake.id);
      }
    }
    // Respawn missing apples
    if (eaters.length > 0) this._fill(snakes);
    return eaters;
  }

  /** Fill up to targetCount apples */
  _fill(snakes) {
    while (this.apples.length < this.targetCount) {
      const occupied = [
        ...this.apples,
        ...snakes.flatMap(s => s.body),
      ];
      const cell = this.arena.randomFreeCell(occupied);
      if (!cell) break; // grid full (shouldn't happen in practice)
      this.apples.push(cell);
    }
  }

  toJSON() {
    return this.apples.map(a => ({ x: a.x, y: a.y }));
  }
}

module.exports = AppleManager;
