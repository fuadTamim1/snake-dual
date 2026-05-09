// Socket.IO client singleton for mobile controller
// Must only initialise on the client side (no SSR)
//
// The server URL is derived from the browser's own hostname at runtime.
// This means the SAME Next.js build works for:
//   - Local dev   → phone visits http://localhost:3001    → connects to localhost:3000
//   - LAN         → phone visits http://192.168.x.x:3001 → connects to 192.168.x.x:3000
//   - VPS         → phone visits http://31.97.x.x:3001   → connects to 31.97.x.x:3000
// No env vars or rebuilds needed when switching networks.

let socket = null;

function getServerUrl() {
  if (typeof window === 'undefined') return 'http://localhost:3000';
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:3000`;
}

export function getSocket() {
  if (typeof window === 'undefined') return null;

  if (!socket) {
    const { io } = require('socket.io-client');
    socket = io(getServerUrl(), {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });
  }
  return socket;
}
