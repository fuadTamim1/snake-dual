// Socket.IO event handlers

const { GameManager } = require('./game/GameManager');
const QRCode = require('qrcode');

const MOBILE_APP_URL = process.env.MOBILE_APP_URL || 'http://localhost:3001';

// Pre-build the WiFi QR once (same for every room)
let _wifiQrCache = null;
async function getWifiQR() {
  if (_wifiQrCache !== undefined) return _wifiQrCache;
  const ssid = process.env.WIFI_SSID;
  const pass = process.env.WIFI_PASS || '';
  if (!ssid) { _wifiQrCache = null; return null; }
  const wifiStr = `WIFI:T:WPA;S:${ssid};P:${pass};;`;
  _wifiQrCache = await QRCode.toDataURL(wifiStr, { width: 300, margin: 2 });
  return _wifiQrCache;
}

/** @type {Map<string, GameManager>} roomCode → GameManager */
const rooms = new Map();
/** @type {Map<string, string>} socketId → roomCode */
const socketRoom = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (rooms.has(code));
  return code;
}

/**
 * @param {import('socket.io').Server} io
 */
function registerHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`[socket] connected: ${socket.id}`);

    // ── Host creates a room ──────────────────────────────────────────────
    socket.on('room:create', async () => {
      // If this socket already owns a room, rejoin it
      let existingCode = socketRoom.get(socket.id);
      if (existingCode && rooms.has(existingCode)) {
        socket.join(existingCode);
        const players = rooms.get(existingCode).getPlayerList();
        socket.emit('room:created', {
          roomCode: existingCode,
          qrDataUrl: await buildQR(existingCode),
          players,
        });
        return;
      }

      const code = generateRoomCode();
      const manager = new GameManager(io, code);
      manager.addHost(socket.id);
      rooms.set(code, manager);
      socketRoom.set(socket.id, code);
      socket.join(code);

      const [qrDataUrl, wifiQrDataUrl] = await Promise.all([buildQR(code), getWifiQR()]);
      socket.emit('room:created', {
        roomCode: code,
        qrDataUrl,
        wifiQrDataUrl,
        wifiSsid: process.env.WIFI_SSID || null,
        players: [],
      });
      console.log(`[room] created: ${code}`);
    });

    // ── Player joins a room ──────────────────────────────────────────────
    socket.on('player:join', ({ roomCode, playerName }) => {
      const code = (roomCode || '').toUpperCase().trim();
      const manager = rooms.get(code);

      if (!manager) {
        socket.emit('error:join', { message: 'Room not found.' });
        return;
      }
      if (manager.isFull()) {
        socket.emit('error:join', { message: 'Room is full.' });
        return;
      }

      const result = manager.addPlayer(socket.id, sanitizeName(playerName));
      if (!result) {
        socket.emit('error:join', { message: 'Cannot join right now.' });
        return;
      }

      socket.join(code);
      socketRoom.set(socket.id, code);

      const players = manager.getPlayerList();
      socket.emit('player:joined:self', { slotIndex: result.slotIndex, color: result.color, players });
      io.to(code).emit('player:joined', { players });
      console.log(`[room] ${playerName} joined ${code} (slot ${result.slotIndex})`);
    });

    // ── Host starts the match ────────────────────────────────────────────
    socket.on('host:start', () => {
      const code = socketRoom.get(socket.id);
      const manager = rooms.get(code);
      if (!manager) return;
      manager.startCountdown();
    });

    // ── Host resets after game over ──────────────────────────────────────
    socket.on('host:reset', async () => {
      const code = socketRoom.get(socket.id);
      const manager = rooms.get(code);
      if (!manager) return;
      const [qrDataUrl, wifiQrDataUrl] = await Promise.all([buildQR(code), getWifiQR()]);
      manager.reset(qrDataUrl, wifiQrDataUrl, process.env.WIFI_SSID || null);
    });

    // ── Player sends direction input ─────────────────────────────────────
    socket.on('player:input', ({ direction }) => {
      const code = socketRoom.get(socket.id);
      const manager = rooms.get(code);
      if (!manager) return;
      const validDirs = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
      if (!validDirs.includes(direction)) return;
      manager.handleInput(socket.id, direction);
    });

    // ── Disconnect ────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`[socket] disconnected: ${socket.id}`);
      const code = socketRoom.get(socket.id);
      if (!code) return;
      socketRoom.delete(socket.id);

      const manager = rooms.get(code);
      if (!manager) return;

      manager.removePlayer(socket.id);

      // If host disconnected and room is empty, clean up
      if (manager.hostSocketId === socket.id) {
        manager.hostSocketId = null;
      }
      if (manager.isEmpty()) {
        rooms.delete(code);
        console.log(`[room] removed: ${code}`);
      } else {
        // Notify remaining clients
        io.to(code).emit('player:joined', { players: manager.getPlayerList() });
      }
    });
  });
}

async function buildQR(roomCode) {
  const url = `${MOBILE_APP_URL}/join/${roomCode}`;
  return QRCode.toDataURL(url, { width: 300, margin: 2 });
}

function sanitizeName(raw) {
  return String(raw || 'Player').replace(/[<>"'&]/g, '').slice(0, 20).trim() || 'Player';
}

module.exports = { registerHandlers };
