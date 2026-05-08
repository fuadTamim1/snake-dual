// CollisionSystem — wall, self, opponent, head-to-head

class CollisionSystem {
  /**
   * @param {Arena} arena
   */
  constructor(arena) {
    this.arena = arena;
  }

  /**
   * Run all collision checks after snakes have moved.
   * Mutates snake.alive = false on lethal collisions.
   * @param {Snake[]} snakes
   * @returns {string[]} ids of snakes that died this tick
   */
  check(snakes) {
    const dead = new Set();

    for (const snake of snakes) {
      if (!snake.alive) continue;

      // 1. Wall collision
      if (this.arena.isOutOfBounds(snake.head.x, snake.head.y)) {
        dead.add(snake.id);
        continue;
      }

      // 2. Self collision — head vs rest of own body (index > 0)
      for (let i = 1; i < snake.body.length; i++) {
        if (snake.head.x === snake.body[i].x && snake.head.y === snake.body[i].y) {
          dead.add(snake.id);
          break;
        }
      }
    }

    // 3. Opponent body collision (head vs opponent body, not head)
    for (const snake of snakes) {
      if (!snake.alive || dead.has(snake.id)) continue;
      for (const other of snakes) {
        if (other.id === snake.id) continue;
        // Check against all body cells of opponent (including head — handled in step 4)
        for (let i = 1; i < other.body.length; i++) {
          if (snake.head.x === other.body[i].x && snake.head.y === other.body[i].y) {
            dead.add(snake.id);
            break;
          }
        }
      }
    }

    // 4. Head-to-head collision
    if (snakes.length === 2) {
      const [a, b] = snakes;
      if (a.alive && b.alive && !dead.has(a.id) && !dead.has(b.id)) {
        if (a.head.x === b.head.x && a.head.y === b.head.y) {
          if (a.length > b.length) {
            dead.add(b.id);
          } else if (b.length > a.length) {
            dead.add(a.id);
          } else {
            // Equal length — both die
            dead.add(a.id);
            dead.add(b.id);
          }
        }
      }
    }

    // Mark dead
    for (const snake of snakes) {
      if (dead.has(snake.id)) snake.alive = false;
    }

    return [...dead];
  }
}

module.exports = CollisionSystem;
