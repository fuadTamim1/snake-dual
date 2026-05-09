require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const path = require('path');
const { registerHandlers } = require('./socket');

const PORT = process.env.PORT || 3000;
const MOBILE_APP_URL = process.env.MOBILE_APP_URL || 'http://localhost:3001';

const app = express();
const httpServer = http.createServer(app);

// CORS: allow localhost (dev) + any port on the same host as MOBILE_APP_URL.
// This covers: local dev, LAN (any IP), and VPS — no hardcoded origins.
const mobileHostname = (() => {
  try { return new URL(MOBILE_APP_URL).hostname; } catch { return 'localhost'; }
})();

function isAllowedOrigin(origin) {
  if (!origin) return true; // same-origin / server-to-server
  try {
    const { hostname, port } = new URL(origin);
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
    if (hostname === mobileHostname) return true;
    return false;
  } catch {
    return false;
  }
}

const corsOptions = {
  origin: (origin, cb) => cb(null, isAllowedOrigin(origin)),
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// Serve built Phaser host display
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// Fallback: serve index.html for the host SPA
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Socket.IO
const io = new Server(httpServer, {
  cors: { origin: (origin, cb) => cb(null, isAllowedOrigin(origin)), methods: ['GET', 'POST'], credentials: true },
});

registerHandlers(io);

httpServer.listen(PORT, () => {
  console.log(`Snake Duel server running on http://localhost:${PORT}`);
  console.log(`Mobile controller expected at: ${MOBILE_APP_URL}`);
});
