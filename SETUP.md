# Snake Duel — Event Setup Guide

## Quick Start (Local Dev)

```bash
# From repo root — installs all workspaces
npm install

# Start all three services concurrently
npm run dev
```

| Service | URL |
|---------|-----|
| Server (Socket.IO + Express) | http://localhost:3000 |
| Host display (Vite dev server) | http://localhost:3002 |
| Mobile controller (Next.js) | http://localhost:3001 |

---

## Environment Variables

### server/.env
```
PORT=3000
MOBILE_APP_URL=http://localhost:3001   # set to Vercel URL in production
```

### client-mobile (.env.local or Vercel dashboard)
```
NEXT_PUBLIC_SERVER_URL=http://localhost:3000  # set to Railway URL in production
```

### client-host (optional .env in client-host/)
```
VITE_SERVER_URL=http://localhost:3000
```

---

## Production Build

```bash
# Build client-host → outputs to server/public/
npm run build
```

Then deploy `server/` to Railway or Render.  
Deploy `client-mobile/` to Vercel.

---

## Sound Assets

Place CC0 sound files in `client-host/src/assets/sounds/`:
- `eat.ogg`        — apple crunch
- `countdown.ogg`  — tick / beep
- `death.ogg`      — explosion / crash
- `victory.ogg`    — fanfare

Recommended free source: https://freesound.org (CC0 licence filter)

The game works silently without these files — no errors will occur.

---

## Event Setup Checklist

- [ ] Deploy server to Railway → note public URL
- [ ] Set `MOBILE_APP_URL` on Railway to Vercel URL
- [ ] Deploy client-mobile to Vercel → note public URL
- [ ] Set `NEXT_PUBLIC_SERVER_URL` on Vercel to Railway URL
- [ ] Open host display on laptop: https://your-railway-url.up.railway.app
- [ ] Connect laptop to projector
- [ ] Players scan QR → join room instantly
- [ ] Press SPACE to start match
- [ ] Game runs — last snake alive wins
- [ ] Auto-resets to lobby after 8 seconds

---

## Folder Structure

```
dual_snake/
├── package.json              ← npm workspaces root
├── railway.toml              ← Railway deploy config
├── vercel.json               ← Vercel deploy config for client-mobile
├── server/
│   ├── server.js
│   ├── socket.js
│   └── game/
│       ├── GameManager.js
│       ├── Snake.js
│       ├── Arena.js
│       ├── AppleManager.js
│       └── CollisionSystem.js
├── client-host/
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.js
│       ├── socket.js
│       ├── SoundManager.js
│       └── scenes/
│           ├── LobbyScene.js
│           ├── CountdownScene.js
│           ├── GameScene.js
│           └── GameOverScene.js
└── client-mobile/
    └── src/
        ├── lib/socket.js
        ├── pages/
        │   ├── index.js
        │   ├── join/[roomCode].js
        │   ├── waiting.js
        │   └── controller.js
        └── components/
            └── DPad.js
```
