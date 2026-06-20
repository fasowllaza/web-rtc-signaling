# WebRTC Signaling Proof-of-Concept

A local WebRTC video call demo built with **React**, **NestJS**, **TypeScript**, and **Nx**. Two browser clients exchange SDP offers/answers and ICE candidates through a signaling server, then media flows **peer-to-peer** (the server never handles media).

## Architecture

```
Client 1  ──offer/answer/ICE──►  Signaling Server  ──relay──►  Client 2
   │                                                              │
   └──────────────── P2P media (video/audio) ────────────────────┘
```

| Component | Port | Description |
|-----------|------|-------------|
| `client-1` | 3000 | React + Vite browser client |
| `client-2` | 3001 | React + Vite browser client (same UI/logic) |
| `signaling-server` | 8080 | NestJS + Socket.IO relay only |

Shared WebRTC UI and logic live in `packages/client-core` (`@webrtc/client-core`).

## WebRTC signaling flow

1. **Join room** — Each client connects to the signaling server via Socket.IO and joins the same room ID (max 2 participants).
2. **Start call (caller)** — Caller acquires camera/mic, creates an `RTCPeerConnection`, calls `createOffer()`, `setLocalDescription()`, and sends the offer through the server.
3. **Answer (receiver)** — Receiver gets the offer, calls `setRemoteDescription()`, `createAnswer()`, `setLocalDescription()`, and sends the answer back.
4. **ICE exchange** — Both sides emit `ice-candidate` events through the server; each peer calls `addIceCandidate()`.
5. **P2P media** — Once connected, video/audio streams directly between browsers. The signaling server is not in the media path.

## Prerequisites

- Node.js 20+
- npm
- Docker & Docker Compose (optional)
- Webcam and microphone for testing

## Local development

```bash
npm install

# Terminal 1 — signaling server
npm run start:server
# or: npx nx serve signaling-server

# Terminal 2 — client 1
npm run start:client-1
# or: npx nx serve client-1

# Terminal 3 — client 2
npm run start:client-2
# or: npx nx serve client-2
```

Open:

- Client 1: http://localhost:3000
- Client 2: http://localhost:3001

### Demo steps

1. Open both clients in separate browser tabs/windows.
2. Enter the same **Room ID** (e.g. `demo-room`) on both.
3. Click **Join Room** on both clients.
4. On one client, click **Start Call** (this side sends the offer).
5. The other client automatically answers when it receives the offer.
6. Confirm **Connected** status and remote video on both sides.

## Environment variables

| Variable | Default | Used by |
|----------|---------|---------|
| `PORT` | `8080` | Signaling server HTTP/WebSocket port |
| `VITE_SIGNALING_SERVER_URL` | `http://localhost:8080` | React clients (Socket.IO endpoint) |

Copy `.env.example` and per-app `.env` files as needed:

```bash
# apps/client-1/.env
VITE_SIGNALING_SERVER_URL=http://localhost:8080

# apps/client-2/.env
VITE_SIGNALING_SERVER_URL=http://localhost:8080
```

> **Docker note:** Browsers run on your host machine, so `VITE_SIGNALING_SERVER_URL` must point to `http://localhost:8080` (the published Docker port), not an internal Docker service name.

## Docker Compose

```bash
docker compose up --build
```

Services:

- http://localhost:3000 — Client 1
- http://localhost:3001 — Client 2
- http://localhost:8080 — Signaling server

## Socket.IO event protocol

| Client → Server | Server → Client | Purpose |
|-----------------|-----------------|---------|
| `join-room` | `room-joined` / `room-full` | Join a room (max 2 peers) |
| `leave-room` | `room-left` / `peer-left` | Leave and notify peer |
| `offer` | `offer` | Relay SDP offer |
| `answer` | `answer` | Relay SDP answer |
| `ice-candidate` | `ice-candidate` | Relay ICE candidate |

## Project structure

```
apps/
├── client-1/           # Thin React shell (port 3000)
├── client-2/           # Thin React shell (port 3001)
└── signaling-server/   # NestJS Socket.IO gateway
packages/
└── client-core/        # Shared hooks, services, VideoCall UI
```

## Useful commands

```bash
npx nx build signaling-server
npx nx build client-1
npx nx build client-2
npx nx run-many -t lint
npm run format
```

## STUN configuration

Clients use Google's public STUN server:

```ts
iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
```

This is sufficient for local/same-network testing. Production deployments typically also require TURN servers for restrictive NATs.
