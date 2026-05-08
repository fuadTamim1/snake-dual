// Snake — body segments, direction queue, movement, growth

const DIRECTIONS = {
  UP:    { x:  0, y: -1 },
  DOWN:  { x:  0, y:  1 },
  LEFT:  { x: -1, y:  0 },
  RIGHT: { x:  1, y:  0 },
};

const OPPOSITES = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' };

class Snake {
  /**
   * @param {string} id       - socket id of controlling player
   * @param {string} color    - hex color string e.g. '#00ff88'
   * @param {{x:number,y:number}} startPos  - initial head position
   * @param {string} startDir - 'UP'|'DOWN'|'LEFT'|'RIGHT'
   */
  constructor(id, color, startPos, startDir = 'RIGHT') {
    this.id = id;
    this.color = color;
    // Body stored head-first: body[0] is the head
    this.body = [
      { x: startPos.x,     y: startPos.y },
      { x: startPos.x - 1, y: startPos.y },
      { x: startPos.x - 2, y: startPos.y },
    ];
    this.direction = startDir;
    this.nextDirection = startDir;
    this.score = 0;
    this.alive = true;
    this.pendingGrowth = 0;
  }

  /** Queue a direction change — ignores reversal and same-direction repeats */
  setDirection(dir) {
    if (!DIRECTIONS[dir]) return;
    if (OPPOSITES[this.direction] === dir) return; // prevent 180° reverse
    this.nextDirection = dir;
  }

  /** Advance the snake by one cell. Returns the new head position. */
  move() {
    this.direction = this.nextDirection;
    const delta = DIRECTIONS[this.direction];
    const head = this.body[0];
    const newHead = { x: head.x + delta.x, y: head.y + delta.y };
    this.body.unshift(newHead);

    if (this.pendingGrowth > 0) {
      this.pendingGrowth--;
    } else {
      this.body.pop(); // remove tail when not growing
    }
    return newHead;
  }

  /** Call when this snake eats an apple */
  grow(amount = 1) {
    this.pendingGrowth += amount;
    this.score += 1;
  }

  /** Convenience — head cell */
  get head() {
    return this.body[0];
  }

  /** Length in cells */
  get length() {
    return this.body.length;
  }

  /** Serialise for broadcast */
  toJSON() {
    return {
      id: this.id,
      color: this.color,
      body: this.body,
      direction: this.direction,
      score: this.score,
      alive: this.alive,
    };
  }
}

module.exports = Snake;
