// Socket.IO client singleton for mobile controller
// Must only initialise on the client side (no SSR)

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000';

let socket = null;

export function getSocket() {
  // Guard: socket.io-client uses browser globals — never run on the server
  if (typeof window === 'undefined') return null;

  if (!socket) {
    // Dynamic require so the module is never evaluated during SSR
    const { io } = require('socket.io-client');
    socket = io(SERVER_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });
  }
  return socket;
}
