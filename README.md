# Snake Duel 🐍

A competitive real-time 1v1 multiplayer snake game built for live events. Displayed on a projector while players join and control using their phones via QR code.

---

## How It Works

```
Host laptop (projector)          Players' phones
       │                              │
       └──────── Socket.IO ───────────┘
                     │
               Node.js Server
```

- The **host display** runs on a laptop/projector showing the arena, scores, and QR code
- Players **scan the QR code** with their phone → instantly join the room
- Each phone becomes a **D-pad controller**
- The **server is authoritative** — all game logic runs server-side, phones only send direction inputs

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Game display | Phaser.js + Vite |
| Mobile controller | Next.js |
| Backend | Node.js + Express + Socket.IO |
| QR generation | `qrcode` npm package |

---

## Project Structure

```
dual_snake/
├── server/                  ← Node.js game server
│   ├── server.js            ← Express + Socket.IO
│   ├── socket.js            ← All socket event handlers
│   └── game/
│       ├── GameManager.js   ← State machine + game loop (10 ticks/sec)
│       ├── Snake.js         ← Body, movement, direction queue
│       ├── Arena.js         ← 40×40 grid, boundary checks
│       ├── AppleManager.js  ← 2 active apples, instant respawn
│       └── CollisionSystem.js ← Wall / self / opponent / head-to-head
├── client-host/             ← Phaser.js host display (built → server/public/)
│   └── src/scenes/
│       ├── LobbyScene.js    ← Room code + QR code display
│       ├── CountdownScene.js
│       ├── GameScene.js     ← Arena, snakes, apples, scoreboard
│       └── GameOverScene.js ← Winner screen, auto-reset
└── client-mobile/           ← Next.js phone controller
    └── src/pages/
        ├── index.js         ← Name + room code entry
        ├── join/[roomCode]  ← QR deep-link auto-join
        ├── waiting.js       ← Lobby waiting room
        └── controller.js    ← D-pad controller
```

---

## Local Development

**Prerequisites:** Node.js 18+

```bash
# Install all workspace dependencies
npm install

# Start all three services
npm run dev
```

| Service | URL |
|---------|-----|
| Server | http://localhost:3000 |
| Host display | http://localhost:3002 |
| Mobile controller | http://localhost:3001 |

Open the host display in a browser, then open the mobile controller on your phone (or another browser tab). Scan the QR code or enter the room code manually to join.

---

## Environment Variables

**`server/.env`**
```
PORT=3000
MOBILE_APP_URL=http://localhost:3001
```

**`client-mobile/.env.local`**
```
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
```

---

## Production Build

```bash
# Builds Phaser bundle into server/public/
npm run build
```

---

## Deployment

Deployed across two free platforms:

| What | Platform | Role |
|------|----------|------|
| `server/` + built host display | [Railway](https://railway.app) | Game server + projector URL |
| `client-mobile/` | [Vercel](https://vercel.com) | Phone controller app |

### Steps

1. **Railway** — deploy repo, set `PORT=3000`, note your Railway URL  
2. **Vercel** — deploy repo, set root directory to `client-mobile`, set `NEXT_PUBLIC_SERVER_URL` to your Railway URL  
3. Go back to Railway and set `MOBILE_APP_URL` to your Vercel URL, then redeploy

The QR code on the host screen will automatically point phones to the correct Vercel URL.

---

## Game Rules

- 2 players, each controls one snake
- 2 apples active at all times — eating an apple grows your snake and scores a point
- You die if you hit a wall, your own body, or the opponent's body
- **Head-to-head collision:** shorter snake dies; equal length → both die
- Last snake alive wins

---

## Sound Assets (optional)

Drop CC0 `.ogg` files into `client-host/src/assets/sounds/` to enable sound effects:

| File | When it plays |
|------|---------------|
| `eat.ogg` | Apple eaten |
| `countdown.ogg` | Each countdown tick |
| `death.ogg` | Snake dies |
| `victory.ogg` | Game over screen |

The game runs silently if these files are absent. Free CC0 sounds: [freesound.org](https://freesound.org)
