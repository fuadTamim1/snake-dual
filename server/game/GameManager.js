// GameManager — state machine + game loop + round/match tracking

const Snake = require('./Snake');
const Arena = require('./Arena');
const AppleManager = require('./AppleManager');
const CollisionSystem = require('./CollisionSystem');

const STATES = {
  WAITING:    'WAITING',
  READY:      'READY',
  COUNTDOWN:  'COUNTDOWN',
  PLAYING:    'PLAYING',
  ROUND_OVER: 'ROUND_OVER',
  GAME_OVER:  'GAME_OVER',
};

const TOTAL_ROUNDS      = 5;
const COUNTDOWN_FROM    = 3;
const TICK_START_MS     = 200;  // slow start — gives players time to orient
const TICK_MIN_MS       = 80;   // fastest tick (12.5 ticks/sec)
const TICK_ACCEL_EVERY  = 8000; // speed up every 8 seconds
const TICK_ACCEL_STEP   = 20;   // reduce interval by 20ms per step
const BETWEEN_ROUND_MS  = 3500; // pause before next round countdown

const PLAYER_SLOTS = [
  { color: '#00ff88', startPos: { x: 10, y: 20 }, startDir: 'RIGHT' },
  { color: '#ff4466', startPos: { x: 29, y: 20 }, startDir: 'LEFT'  },
];

class GameManager {
  constructor(io, roomCode) {
    this.io = io;
    this.roomCode = roomCode;
    this.state = STATES.WAITING;

    this.arena = new Arena();
    this.appleManager = new AppleManager(this.arena);
    this.collisionSystem = new CollisionSystem(this.arena);

    this.players = new Map(); // socketId → {socketId, name, slotIndex}
    this.hostSocketId = null;

    this.snakes = [];
    this.currentRound = 0;
    this.roundWins = {};   // socketId → number of rounds won

    this._loopTimer      = null;
    this._accelTimer     = null;
    this._countdownTimer = null;
    this._nextRoundTimer = null;
    this._currentTickMs  = TICK_START_MS;
  }

  // ─── Player Management ────────────────────────────────────────────────────

  addHost(socketId) {
    this.hostSocketId = socketId;
  }

  addPlayer(socketId, name) {
    if (this.players.size >= 2) return null;
    if (this.state !== STATES.WAITING && this.state !== STATES.READY) return null;

    const slotIndex = this.players.size;
    this.players.set(socketId, { socketId, name, slotIndex });
    if (this.players.size === 2) this.state = STATES.READY;
    return { slotIndex, color: PLAYER_SLOTS[slotIndex].color };
  }

  removePlayer(socketId) {
    if (!this.players.has(socketId)) return;
    this.players.delete(socketId);

    if (this.state === STATES.PLAYING) {
      const snake = this.snakes.find(s => s.id === socketId);
      if (snake) { snake.alive = false; this._checkRoundEnd([socketId]); }
    } else {
      this.state = STATES.WAITING;
      this._stopAll();
    }
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  startCountdown() {
    if (this.state !== STATES.READY) return;
    this._runCountdown(() => this._startRound());
  }

  _runCountdown(onDone) {
    this.state = STATES.COUNTDOWN;
    let count = COUNTDOWN_FROM;
    this.io.to(this.roomCode).emit('game:countdown', { count });

    this._countdownTimer = setInterval(() => {
      count--;
      if (count > 0) {
        this.io.to(this.roomCode).emit('game:countdown', { count });
      } else {
        clearInterval(this._countdownTimer);
        this._countdownTimer = null;
        onDone();
      }
    }, 1000);
  }

  _startRound() {
    this.currentRound++;
    this.state = STATES.PLAYING;
    this._currentTickMs = TICK_START_MS;

    // Fresh snakes each round
    this.snakes = [];
    for (const [socketId, info] of this.players) {
      const slot = PLAYER_SLOTS[info.slotIndex];
      this.snakes.push(new Snake(socketId, slot.color, slot.startPos, slot.startDir));
    }
    this.appleManager.init(this.snakes);

    // Notify clients which round we're starting
    this.io.to(this.roomCode).emit('round:start', {
      round: this.currentRound,
      totalRounds: TOTAL_ROUNDS,
    });

    // Game loop
    this._loopTimer = setInterval(() => this._tick(), this._currentTickMs);

    // Speed ramp — accelerate every TICK_ACCEL_EVERY ms
    this._accelTimer = setInterval(() => {
      if (this._currentTickMs <= TICK_MIN_MS) return;
      this._currentTickMs = Math.max(TICK_MIN_MS, this._currentTickMs - TICK_ACCEL_STEP);
      clearInterval(this._loopTimer);
      this._loopTimer = setInterval(() => this._tick(), this._currentTickMs);
    }, TICK_ACCEL_EVERY);

    this._broadcastState();
  }

  /**
   * Reset after full match — keep players in room, clear round state.
   * @param {string} qrDataUrl fresh QR to send so lobby can redisplay it
   */
  reset(qrDataUrl) {
    this._stopAll();
    this.state = STATES.READY;
    this.snakes = [];
    this.appleManager.apples = [];
    this.currentRound = 0;
    this.roundWins = {};

    const players = this.getPlayerList();
    this.io.to(this.roomCode).emit('game:reset', {
      roomCode: this.roomCode,
      qrDataUrl,
      players,
    });
  }

  // ─── Game Loop ────────────────────────────────────────────────────────────

  _tick() {
    for (const snake of this.snakes) {
      if (snake.alive) snake.move();
    }
    const died = this.collisionSystem.check(this.snakes);
    this.appleManager.checkEat(this.snakes.filter(s => s.alive));
    this._broadcastState(died);
    if (died.length > 0) this._checkRoundEnd(died);
  }

  _checkRoundEnd(justDied) {
    const alive = this.snakes.filter(s => s.alive);
    if (alive.length > 1) return;

    this._stopAll();
    this.state = STATES.ROUND_OVER;

    const roundWinner = alive.length === 1 ? alive[0] : null;
    if (roundWinner) {
      this.roundWins[roundWinner.id] = (this.roundWins[roundWinner.id] || 0) + 1;
    }

    const names = {};
    for (const [sid, info] of this.players) names[sid] = info.name;

    const winsSnapshot = {};
    for (const [sid] of this.players) winsSnapshot[sid] = this.roundWins[sid] || 0;

    this.io.to(this.roomCode).emit('round:over', {
      round:           this.currentRound,
      totalRounds:     TOTAL_ROUNDS,
      roundWinnerId:   roundWinner ? roundWinner.id   : null,
      roundWinnerName: roundWinner ? names[roundWinner.id] : null,
      roundWins:       winsSnapshot,
      names,
    });

    if (this.currentRound >= TOTAL_ROUNDS) {
      // Last round — emit final result after a short pause
      setTimeout(() => this._emitGameOver(names, winsSnapshot), 2000);
    } else {
      // Schedule next round
      this._nextRoundTimer = setTimeout(
        () => this._runCountdown(() => this._startRound()),
        BETWEEN_ROUND_MS,
      );
    }
  }

  _emitGameOver(names, winsSnapshot) {
    this.state = STATES.GAME_OVER;

    // Winner = most round wins; tie = null (nobody)
    let maxWins = 0;
    let winnerId = null;
    for (const [sid, wins] of Object.entries(winsSnapshot)) {
      if (wins > maxWins)       { maxWins = wins; winnerId = sid; }
      else if (wins === maxWins)  { winnerId = null; }
    }

    this.io.to(this.roomCode).emit('game:over', {
      winnerId,
      winnerName: winnerId ? names[winnerId] : null,
      roundWins:  winsSnapshot,
      names,
    });
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
      snakes:      this.snakes.map(s => s.toJSON()),
      apples:      this.appleManager.toJSON(),
      scores:      Object.fromEntries(this.snakes.map(s => [s.id, s.score])),
      died,
      state:       this.state,
      round:       this.currentRound,
      totalRounds: TOTAL_ROUNDS,
    });
  }

  _stopAll() {
    if (this._loopTimer)      { clearInterval(this._loopTimer);      this._loopTimer = null; }
    if (this._accelTimer)     { clearInterval(this._accelTimer);     this._accelTimer = null; }
    if (this._countdownTimer) { clearInterval(this._countdownTimer); this._countdownTimer = null; }
    if (this._nextRoundTimer) { clearTimeout(this._nextRoundTimer);  this._nextRoundTimer = null; }
  }

  getPlayerList() {
    return [...this.players.values()].map(p => ({
      socketId:  p.socketId,
      name:      p.name,
      slotIndex: p.slotIndex,
      color:     PLAYER_SLOTS[p.slotIndex].color,
    }));
  }

  isFull()  { return this.players.size >= 2; }
  isEmpty() { return this.players.size === 0 && this.hostSocketId === null; }
}

module.exports = { GameManager, STATES };

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
