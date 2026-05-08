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

// Allow the host display (Vite dev server) and mobile controller origins
const allowedOrigins = [
  `http://localhost:3002`, // Vite dev server (client-host)
  MOBILE_APP_URL,
  // Allow same-origin requests when serving built files
  `http://localhost:${PORT}`,
];

app.use(cors({ origin: allowedOrigins, credentials: true }));
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
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'], credentials: true },
});

registerHandlers(io);

httpServer.listen(PORT, () => {
  console.log(`Snake Duel server running on http://localhost:${PORT}`);
  console.log(`Mobile controller expected at: ${MOBILE_APP_URL}`);
});
