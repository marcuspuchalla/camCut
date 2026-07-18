import { WebSocket } from "ws";

// Room-based WebRTC signaling relay.
//
// Every camera has a stable `room` id (a UUID that lives in the page URL). A
// publisher (the PC showing its webcam) and any number of viewers (phones)
// that share the same room id are introduced to each other; the video then
// flows peer-to-peer over WebRTC and never passes through this server. Rooms
// are fully isolated — one person's camera is invisible to another's room.
//
// Used by both the Vite dev plugin and the standalone production server.

const short = (id) => String(id).slice(0, 8);

/**
 * Aggregate usage counters — deliberately the only "analytics" this project has.
 *
 * These are plain integers: no IP addresses, no identifiers, no timestamps per
 * user, nothing that could single anyone out, and nothing read from anyone's
 * device. That keeps them outside § 25 TDDDG (no device access) and means there
 * is no personal data to have a legal basis for. It also answers the only
 * question actually worth asking — how often is the app really used — which
 * page-view tracking never did.
 */
export const stats = {
  since: new Date().toISOString(),
  camerasStarted: 0,
  viewersConnected: 0,
};

export function attachSignaling(wss, { log = () => {} } = {}) {
  /** @type {Map<string, {publisher: WebSocket|null, viewers: Map<number, WebSocket>, nextId: number}>} */
  const rooms = new Map();

  const getRoom = (id) => {
    let r = rooms.get(id);
    if (!r) {
      r = { publisher: null, viewers: new Map(), nextId: 1 };
      rooms.set(id, r);
    }
    return r;
  };

  const send = (ws, msg) => {
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  };

  const cleanupRoom = (id) => {
    const r = rooms.get(id);
    if (r && !r.publisher && r.viewers.size === 0) rooms.delete(id);
  };

  // Protocol-level liveness sweep: terminate sockets that stop answering
  // pings (browsers pong automatically). Without this, a publisher whose
  // network died stays registered as a ghost and viewers join into silence.
  const SWEEP_MS = 30_000;
  const sweep = setInterval(() => {
    for (const ws of wss.clients) {
      if (ws.isAlive === false) {
        ws.terminate();
        continue;
      }
      ws.isAlive = false;
      try {
        ws.ping();
      } catch {
        /* socket already dying */
      }
    }
  }, SWEEP_MS);
  wss.on("close", () => clearInterval(sweep));

  wss.on("connection", (ws) => {
    ws.isAlive = true;
    ws.on("pong", () => (ws.isAlive = true));

    ws.on("message", (data) => {
      let msg;
      try {
        msg = JSON.parse(data.toString());
      } catch {
        return;
      }

      switch (msg.type) {
        // Application-level heartbeat: clients ping and close their socket if
        // the pong doesn't come back, because after a network drop a TCP
        // socket can look open for minutes.
        case "ping": {
          send(ws, { type: "pong" });
          break;
        }

        case "publisher": {
          if (!msg.room) return;
          ws.role = "publisher";
          ws.room = msg.room;
          const r = getRoom(msg.room);
          // Same room opened elsewhere (another computer/day) takes over.
          if (r.publisher && r.publisher !== ws) send(r.publisher, { type: "replaced" });
          r.publisher = ws;
          stats.camerasStarted++;
          log(`publisher ready for room ${short(msg.room)}`);
          for (const v of r.viewers.values()) send(v, { type: "publisher-ready" });
          break;
        }

        case "viewer-join": {
          const roomId = ws.room || msg.room;
          if (!roomId) return;
          ws.role = "viewer";
          ws.room = roomId;
          const r = getRoom(roomId);
          if (ws.viewerId == null) {
            ws.viewerId = r.nextId++;
            r.viewers.set(ws.viewerId, ws);
            stats.viewersConnected++;
          }
          log(
            `viewer ${ws.viewerId} joined room ${short(roomId)} ` +
              `(publisher ${r.publisher ? "present" : "absent"})`,
          );
          if (r.publisher) send(r.publisher, { type: "viewer-join", viewerId: ws.viewerId });
          else send(ws, { type: "no-publisher" });
          break;
        }

        case "offer": {
          const r = rooms.get(ws.room);
          if (r) send(r.viewers.get(msg.viewerId), { type: "offer", sdp: msg.sdp });
          break;
        }

        case "answer": {
          const r = rooms.get(ws.room);
          if (r) send(r.publisher, { type: "answer", viewerId: ws.viewerId, sdp: msg.sdp });
          break;
        }

        case "ice": {
          const r = rooms.get(ws.room);
          if (!r) break;
          if (ws.role === "publisher") {
            send(r.viewers.get(msg.viewerId), { type: "ice", candidate: msg.candidate });
          } else {
            send(r.publisher, { type: "ice", viewerId: ws.viewerId, candidate: msg.candidate });
          }
          break;
        }
      }
    });

    ws.on("close", () => {
      const r = ws.room ? rooms.get(ws.room) : null;
      if (!r) return;
      if (ws.role === "publisher" && r.publisher === ws) {
        r.publisher = null;
        for (const v of r.viewers.values()) send(v, { type: "publisher-gone" });
      } else if (ws.role === "viewer" && ws.viewerId != null) {
        r.viewers.delete(ws.viewerId);
        send(r.publisher, { type: "viewer-leave", viewerId: ws.viewerId });
      }
      cleanupRoom(ws.room);
    });
  });
}
