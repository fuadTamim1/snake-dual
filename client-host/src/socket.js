// Socket.IO singleton for the host display
//
// Connects to '' (same origin) so no IP is baked into the bundle.
// - Dev:        Vite proxy on :3002 forwards /socket.io → :3000
// - Production: Express serves this bundle on :3000 — same origin = :3000

import { io } from 'socket.io-client';

const socket = io('', {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
});

export default socket;
