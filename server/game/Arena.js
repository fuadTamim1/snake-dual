// Arena — 40×40 grid, boundary helpers, safe random cell picker

const GRID_W = 40;
const GRID_H = 40;

class Arena {
  constructor() {
    this.width = GRID_W;
    this.height = GRID_H;
  }

  /** Returns true when {x,y} is outside the playable grid */
  isOutOfBounds(x, y) {
    return x < 0 || x >= this.width || y < 0 || y >= this.height;
  }

  /**
   * Pick a random cell that is not occupied by any snake body.
   * @param {Array<{x:number,y:number}>} occupied - flat list of occupied cells
   * @returns {{x:number, y:number}|null} null when the grid is completely full
   */
  randomFreeCell(occupied) {
    const occupiedSet = new Set(occupied.map(c => `${c.x},${c.y}`));
    const free = [];
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        if (!occupiedSet.has(`${x},${y}`)) free.push({ x, y });
      }
    }
    if (free.length === 0) return null;
    return free[Math.floor(Math.random() * free.length)];
  }

  /** Convert grid coords to pixel centre (for rendering reference) */
  toPixel(x, y, cellSize = 20) {
    return { px: x * cellSize + cellSize / 2, py: y * cellSize + cellSize / 2 };
  }
}

module.exports = Arena;
