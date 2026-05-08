// GameManager — state machine + game loop + score tracking

const Snake = require('./Snake');
const Arena = require('./Arena');
const AppleManager = require('./AppleManager');
const CollisionSystem = require('./CollisionSystem');

const STATES = {
  WAITING:   'WAITING',
  READY:     'READY',
  COUNTDOWN: 'COUNTDOWN',
  PLAYING:   'PLAYING',
  GAME_OVER: 'GAME_OVER',
};

const TICK_MS = 100;       // 10 ticks/sec
const COUNTDOWN_FROM = 3;  // 3…2…1

// Snake colours and start positions for each player slot (0 and 1)
const PLAYER_SLOTS = [
  { color: '#00ff88', startPos: { x: 10, y: 20 }, startDir: 'RIGHT' },
  { color: '#ff4466', startPos: { x: 29, y: 20 }, startDir: 'LEFT'  },
];

class GameManager {
  /**
   * @param {import('socket.io').Server} io
   * @param {string} roomCode
   */
  constructor(io, roomCode) {
    this.io = io;
    this.roomCode = roomCode;
    this.state = STATES.WAITING;

    this.arena = new Arena();
    this.appleManager = new AppleManager(this.arena);
    this.collisionSystem = new CollisionSystem(this.arena);

    /** @type {Map<string, {socketId:string, name:string, slotIndex:number}>} */
    this.players = new Map(); // socketId → player info
    this.hostSocketId = null;

    this.snakes = [];
    this._loopTimer = null;
    this._countdownTimer = null;
  }

  // ─── Player Management ────────────────────────────────────────────────────

  addHost(socketId) {
    this.hostSocketId = socketId;
  }

  /**
   * Add a player to the room.
   * @returns {{slotIndex:number, color:string}|null} null when room is full
   */
  addPlayer(socketId, name) {
    if (this.players.size >= 2) return null;
    if (this.state !== STATES.WAITING && this.state !== STATES.READY) return null;

    const slotIndex = this.players.size; // 0 or 1
    this.players.set(socketId, { socketId, name, slotIndex });

    if (this.players.size === 2) this.state = STATES.READY;

    return { slotIndex, color: PLAYER_SLOTS[slotIndex].color };
  }

  removePlayer(socketId) {
    if (!this.players.has(socketId)) return;
    this.players.delete(socketId);

    if (this.state === STATES.PLAYING) {
      // Kill that snake and trigger game-over check
      const snake = this.snakes.find(s => s.id === socketId);
      if (snake) {
        snake.alive = false;
        this._checkGameOver([socketId]);
      }
    } else {
      this.state = STATES.WAITING;
      this._stopLoop();
    }
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  startCountdown() {
    if (this.state !== STATES.READY) return;
    this.state = STATES.COUNTDOWN;

    let count = COUNTDOWN_FROM;
    this.io.to(this.roomCode).emit('game:countdown', { count });

    this._countdownTimer = setInterval(() => {
      count--;
      if (count > 0) {
        this.io.to(this.roomCode).emit('game:countdown', { count });
      } else {
        clearInterval(this._countdownTimer);
        this._startGame();
      }
    }, 1000);
  }

  _startGame() {
    this.state = STATES.PLAYING;

    // Build snakes from player slots
    this.snakes = [];
    for (const [socketId, info] of this.players) {
      const slot = PLAYER_SLOTS[info.slotIndex];
      this.snakes.push(new Snake(socketId, slot.color, slot.startPos, slot.startDir));
    }
    this.appleManager.init(this.snakes);

    this._loopTimer = setInterval(() => this._tick(), TICK_MS);
    this._broadcastState();
  }

  reset() {
    this._stopLoop();
    this.state = STATES.WAITING;
    this.snakes = [];
    this.appleManager.apples = [];
    // Keep existing players but require re-ready
    if (this.players.size === 2) this.state = STATES.READY;
    this.io.to(this.roomCode).emit('game:reset');
  }

  // ─── Game Loop ────────────────────────────────────────────────────────────

  _tick() {
    // Move all alive snakes
    for (const snake of this.snakes) {
      if (snake.alive) snake.move();
    }

    // Check collisions (may mark snakes dead)
    const died = this.collisionSystem.check(this.snakes);

    // Check apple eating (only for snakes still alive after collisions)
    this.appleManager.checkEat(this.snakes.filter(s => s.alive));

    this._broadcastState(died);

    if (died.length > 0) {
      this._checkGameOver(died);
    }
  }

  _checkGameOver(justDied) {
    const alive = this.snakes.filter(s => s.alive);

    if (alive.length <= 1) {
      this._stopLoop();
      this.state = STATES.GAME_OVER;

      const winner = alive.length === 1 ? alive[0] : null;
      const scores = {};
      for (const snake of this.snakes) scores[snake.id] = snake.score;

      // Build name map for readability on the client
      const names = {};
      for (const [sid, info] of this.players) names[sid] = info.name;

      this.io.to(this.roomCode).emit('game:over', {
        winnerId: winner ? winner.id : null,
        winnerName: winner ? (names[winner.id] || 'Unknown') : null,
        scores,
        names,
        died: justDied,
      });
    }
  }

  // ─── Input ────────────────────────────────────────────────────────────────

  handleInput(socketId, direction) {
    if (this.state !== STATES.PLAYING) return;
    const snake = this.snakes.find(s => s.id === socketId);
    if (snake && snake.alive) snake.setDirection(direction);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  _broadcastState(died = []) {
    this.io.to(this.roomCode).emit('game:state', {
      snakes: this.snakes.map(s => s.toJSON()),
      apples: this.appleManager.toJSON(),
      scores: Object.fromEntries(this.snakes.map(s => [s.id, s.score])),
      died,
      state: this.state,
    });
  }

  _stopLoop() {
    if (this._loopTimer) { clearInterval(this._loopTimer); this._loopTimer = null; }
    if (this._countdownTimer) { clearInterval(this._countdownTimer); this._countdownTimer = null; }
  }

  getPlayerList() {
    return [...this.players.values()].map(p => ({
      socketId: p.socketId,
      name: p.name,
      slotIndex: p.slotIndex,
      color: PLAYER_SLOTS[p.slotIndex].color,
    }));
  }

  isFull() { return this.players.size >= 2; }
  isEmpty() { return this.players.size === 0 && this.hostSocketId === null; }
}

module.exports = { GameManager, STATES };
