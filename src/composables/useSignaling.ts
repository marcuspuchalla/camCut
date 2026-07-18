// WebRTC over the room-based signaling relay (server/signaling.js).
//
// The publisher (camera device) and any number of viewers share a room id.
// Media flows peer-to-peer; the server only introduces the two devices and
// forwards SDP / ICE. Mirrors the message protocol in server/signaling.js
// exactly.
//
// Resilience model: the VIEWER drives recovery. A peer connection can sit in
// "connected" while no media arrives (network switched, OS paused the camera
// tab, the Chromium background-audio drop) — so besides connectionState we
// watch getStats(): if bytes stop flowing, the viewer tears down and re-joins
// the room, which makes the publisher send a fresh offer. Both sides also run
// an application-level ping over the WebSocket, because a dead TCP socket can
// take minutes to fire onclose after a network drop.

function wsUrl(): string {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${location.host}/signal`;
}

async function loadIceServers(): Promise<RTCIceServer[]> {
  try {
    const r = await fetch("/api/ice");
    const j = await r.json();
    if (Array.isArray(j.iceServers)) return j.iceServers;
  } catch {
    /* fall through */
  }
  // No hardcoded public STUN fallback: STUN sends the user's IP to whoever
  // runs it (CLAUDE.md §4). Without ICE servers, host candidates still connect
  // devices on the same network; cross-network needs the server-configured
  // coturn (turn/README.md).
  return [];
}

/**
 * Force the Opus settings a baby monitor needs into an SDP:
 *  - usedtx=0 — DTX stops sending packets during "silence", which is exactly
 *    the quiet breathing/room tone we transmit all night. Also, continuous
 *    packets are what lets the stall watchdog tell "quiet room" from "dead
 *    connection".
 *  - useinbandfec=1 — forward error correction so brief packet loss doesn't
 *    become an audible dropout.
 * The fmtp line a peer puts in its SDP describes what it wants to RECEIVE, so
 * both offer (publisher) and answer (viewer) get munged.
 */
function tuneOpus(sdp: string): string {
  const rtpmap = sdp.match(/a=rtpmap:(\d+) opus\/48000\/2/);
  if (!rtpmap) return sdp;
  const pt = rtpmap[1];
  const fmtpRe = new RegExp(`a=fmtp:${pt} ([^\r\n]*)`);
  const fmtp = sdp.match(fmtpRe);
  if (fmtp) {
    let params = fmtp[1];
    for (const [k, v] of [
      ["usedtx", "0"],
      ["useinbandfec", "1"],
    ]) {
      const re = new RegExp(`${k}=[^;\r\n]*`);
      params = re.test(params) ? params.replace(re, `${k}=${v}`) : `${params};${k}=${v}`;
    }
    return sdp.replace(fmtpRe, `a=fmtp:${pt} ${params}`);
  }
  return sdp.replace(rtpmap[0], `${rtpmap[0]}\r\na=fmtp:${pt} usedtx=0;useinbandfec=1`);
}

/**
 * Ask the network to favour the audio track when bandwidth gets tight — on a
 * monitor, hearing the room matters more than a crisp picture. Chrome-only
 * (networkPriority), harmless elsewhere. Must run after negotiation, so it's
 * called from the "connected" state change.
 */
function prioritiseAudio(pc: RTCPeerConnection) {
  for (const sender of pc.getSenders()) {
    if (sender.track?.kind !== "audio") continue;
    try {
      const p = sender.getParameters();
      if (!p.encodings?.length) continue;
      (p.encodings[0] as any).networkPriority = "high";
      (p.encodings[0] as any).priority = "high";
      void sender.setParameters(p).catch(() => {});
    } catch {
      /* not supported here */
    }
  }
}

/**
 * Application-level WebSocket heartbeat. Returns a stop function. When the
 * server misses a pong, the socket is closed so the caller's onclose-reconnect
 * path kicks in instead of waiting for TCP to notice.
 */
function startHeartbeat(ws: WebSocket): () => void {
  const PING_EVERY = 15_000;
  const PONG_WITHIN = 6_000;
  let pongTimer: number | undefined;
  const interval = window.setInterval(() => {
    if (ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: "ping" }));
    if (pongTimer === undefined) {
      pongTimer = window.setTimeout(() => ws.close(), PONG_WITHIN);
    }
  }, PING_EVERY);
  const onMessage = (ev: MessageEvent) => {
    if (typeof ev.data === "string" && ev.data.includes('"pong"')) {
      clearTimeout(pongTimer);
      pongTimer = undefined;
    }
  };
  ws.addEventListener("message", onMessage);
  return () => {
    clearInterval(interval);
    clearTimeout(pongTimer);
    ws.removeEventListener("message", onMessage);
  };
}

export interface Publisher {
  start(): Promise<void>;
  /** Swap the outgoing stream (camera flip, mic re-acquired) without dropping
   *  viewers: existing peers get replaceTrack, future offers use the new one. */
  setStream(s: MediaStream): void;
  stop(): void;
}

/** Camera side: answers every viewer that joins the room with an offer. */
export function createPublisher(
  room: string,
  stream: MediaStream,
  onViewerCount: (n: number) => void,
): Publisher {
  const peers = new Map<number, RTCPeerConnection>();
  const disconnectTimers = new Map<number, number>();
  let ws: WebSocket | null = null;
  let stopHeartbeat: (() => void) | null = null;
  let ice: RTCIceServer[] = [];
  let closed = false;

  function connect() {
    ws = new WebSocket(wsUrl());
    ws.onopen = () => {
      stopHeartbeat = startHeartbeat(ws!);
      ws!.send(JSON.stringify({ type: "publisher", room }));
    };
    ws.onmessage = async (ev) => {
      let m: any;
      try {
        m = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (m.type === "viewer-join") {
        await makeOffer(m.viewerId);
      } else if (m.type === "answer") {
        const pc = peers.get(m.viewerId);
        if (pc) await pc.setRemoteDescription(m.sdp).catch(() => {});
      } else if (m.type === "ice") {
        const pc = peers.get(m.viewerId);
        if (pc && m.candidate) await pc.addIceCandidate(m.candidate).catch(() => {});
      } else if (m.type === "viewer-leave") {
        dropPeer(m.viewerId);
      }
    };
    ws.onclose = () => {
      stopHeartbeat?.();
      stopHeartbeat = null;
      if (!closed) setTimeout(connect, 1500);
    };
  }

  function dropPeer(viewerId: number) {
    clearTimeout(disconnectTimers.get(viewerId));
    disconnectTimers.delete(viewerId);
    peers.get(viewerId)?.close();
    peers.delete(viewerId);
    onViewerCount(peers.size);
  }

  async function makeOffer(viewerId: number) {
    peers.get(viewerId)?.close();
    clearTimeout(disconnectTimers.get(viewerId));
    const pc = new RTCPeerConnection({ iceServers: ice });
    peers.set(viewerId, pc);
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    pc.onicecandidate = (e) => {
      if (e.candidate && ws?.readyState === WebSocket.OPEN)
        ws.send(JSON.stringify({ type: "ice", viewerId, candidate: e.candidate }));
    };
    pc.onconnectionstatechange = () => {
      const st = pc.connectionState;
      if (st === "connected") {
        clearTimeout(disconnectTimers.get(viewerId));
        disconnectTimers.delete(viewerId);
        prioritiseAudio(pc);
      } else if (st === "failed" || st === "closed") {
        if (peers.get(viewerId) === pc) dropPeer(viewerId);
      } else if (st === "disconnected") {
        // "disconnected" often self-heals within a couple of seconds; only a
        // sustained one means the viewer is gone (it re-joins on its own).
        disconnectTimers.set(
          viewerId,
          window.setTimeout(() => {
            if (peers.get(viewerId) === pc && pc.connectionState === "disconnected")
              dropPeer(viewerId);
          }, 5000),
        );
      }
    };
    const offer = await pc.createOffer();
    offer.sdp = tuneOpus(offer.sdp ?? "");
    await pc.setLocalDescription(offer);
    ws?.send(JSON.stringify({ type: "offer", viewerId, sdp: pc.localDescription }));
    onViewerCount(peers.size);
  }

  return {
    async start() {
      ice = await loadIceServers();
      connect();
    },
    setStream(s: MediaStream) {
      stream = s;
      for (const pc of peers.values()) {
        for (const sender of pc.getSenders()) {
          const kind = sender.track?.kind;
          if (!kind) continue;
          const next = s.getTracks().find((t) => t.kind === kind);
          if (next && next !== sender.track) void sender.replaceTrack(next).catch(() => {});
        }
      }
    },
    stop() {
      closed = true;
      stopHeartbeat?.();
      disconnectTimers.forEach((t) => clearTimeout(t));
      disconnectTimers.clear();
      peers.forEach((p) => p.close());
      peers.clear();
      ws?.close();
    },
  };
}

export type ViewerState = "connecting" | "waiting" | "live" | "reconnecting";

export interface Viewer {
  start(): Promise<void>;
  stop(): void;
}

/** Viewer side: joins a room, renders the publisher's stream, and re-joins on
 *  its own whenever the connection dies — including the silent way, where the
 *  peer still claims "connected" but no bytes arrive. */
export function createViewer(
  room: string,
  onStream: (s: MediaStream) => void,
  onState: (s: ViewerState) => void,
): Viewer {
  let ws: WebSocket | null = null;
  let pc: RTCPeerConnection | null = null;
  let stopHeartbeat: (() => void) | null = null;
  let ice: RTCIceServer[] = [];
  let closed = false;

  // Watchdog bookkeeping
  const CHECK_EVERY = 2_000;
  const STALL_MS = 8_000; // no media bytes at all while "connected"
  const AUDIO_STALL_MS = 12_000; // DTX is off, so healthy audio never pauses this long
  const JOIN_TIMEOUT_MS = 8_000; // sent a join, got neither offer nor no-publisher
  const RECOVER_COOLDOWN_MS = 5_000;
  let statsTimer: number | undefined;
  let disconnectTimer: number | undefined;
  let joinTimer: number | undefined;
  let lastBytes = 0;
  let lastAudioBytes = 0;
  let lastProgress = 0;
  let lastAudioProgress = 0;
  let hasAudioTrack = false;
  let lastRecover = 0;

  function teardownPc() {
    clearTimeout(disconnectTimer);
    disconnectTimer = undefined;
    pc?.close();
    pc = null;
  }

  function clearJoinTimeout() {
    clearTimeout(joinTimer);
    joinTimer = undefined;
  }

  function sendJoin() {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      // Dead or dying socket: closing it puts us on the onclose-reconnect
      // path, which re-joins once a fresh socket opens.
      try {
        ws?.close();
      } catch {
        /* already closed */
      }
      return;
    }
    ws.send(JSON.stringify({ type: "viewer-join", room }));
    clearJoinTimeout();
    // If the server never answers (half-open socket, ghost publisher socket),
    // force a WebSocket reconnect rather than spinning forever.
    joinTimer = window.setTimeout(() => ws?.close(), JOIN_TIMEOUT_MS);
  }

  function recover() {
    if (closed) return;
    const now = performance.now();
    if (now - lastRecover < RECOVER_COOLDOWN_MS) return;
    lastRecover = now;
    teardownPc();
    onState("reconnecting");
    sendJoin();
  }

  function resetStallClock() {
    const now = performance.now();
    lastProgress = now;
    lastAudioProgress = now;
    lastBytes = 0;
    lastAudioBytes = 0;
  }

  async function checkHealth() {
    if (closed || !pc || pc.connectionState !== "connected") return;
    let audio = 0;
    let total = 0;
    try {
      const stats = await pc.getStats();
      stats.forEach((s: any) => {
        if (s.type === "inbound-rtp") {
          total += s.bytesReceived || 0;
          if (s.kind === "audio") audio += s.bytesReceived || 0;
        }
      });
    } catch {
      return;
    }
    const now = performance.now();
    if (total > lastBytes) lastProgress = now;
    if (audio > lastAudioBytes) lastAudioProgress = now;
    lastBytes = total;
    lastAudioBytes = audio;
    // Total stall = connection is dead-but-"connected". Audio-only stall =
    // e.g. Chromium's background audio drop; video may still trickle, but a
    // monitor without sound is broken, so recover for that too.
    if (now - lastProgress > STALL_MS) recover();
    else if (hasAudioTrack && now - lastAudioProgress > AUDIO_STALL_MS) recover();
  }

  function onVisibility() {
    // Background tabs throttle timers; catch up the moment we're visible.
    if (document.visibilityState === "visible") void checkHealth();
  }

  function connect() {
    ws = new WebSocket(wsUrl());
    ws.onopen = () => {
      stopHeartbeat = startHeartbeat(ws!);
      onState(pc?.connectionState === "connected" ? "live" : "connecting");
      sendJoin();
    };
    ws.onmessage = async (ev) => {
      let m: any;
      try {
        m = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (m.type === "offer") {
        clearJoinTimeout();
        await handleOffer(m.sdp);
      } else if (m.type === "ice") {
        if (pc && m.candidate) await pc.addIceCandidate(m.candidate).catch(() => {});
      } else if (m.type === "no-publisher") {
        clearJoinTimeout();
        onState("waiting");
      } else if (m.type === "publisher-ready") {
        onState(pc?.connectionState === "connected" ? "live" : "connecting");
        sendJoin();
      } else if (m.type === "publisher-gone") {
        clearJoinTimeout();
        // Only the camera's *signaling* socket dropped — the P2P media often
        // keeps flowing. Keep a healthy stream; the watchdog catches real
        // death, and a returning publisher triggers publisher-ready → re-join.
        if (!pc || pc.connectionState !== "connected") {
          teardownPc();
          onState("waiting");
        }
      }
    };
    ws.onclose = () => {
      stopHeartbeat?.();
      stopHeartbeat = null;
      clearJoinTimeout();
      if (!closed) {
        if (!pc || pc.connectionState !== "connected") onState("reconnecting");
        setTimeout(connect, 1500);
      }
    };
  }

  async function handleOffer(sdp: RTCSessionDescriptionInit) {
    teardownPc();
    hasAudioTrack = false;
    pc = new RTCPeerConnection({ iceServers: ice });
    const thisPc = pc;
    pc.ontrack = (e) => {
      if (e.track.kind === "audio") {
        hasAudioTrack = true;
        try {
          // A bigger jitter buffer trades a little delay for riding out the
          // bursts and hiccups of an hours-long unattended stream.
          (e.receiver as any).jitterBufferTarget = 500;
          (e.receiver as any).playoutDelayHint = 0.5;
        } catch {
          /* not supported here */
        }
      }
      onStream(e.streams[0]);
      onState("live");
    };
    pc.onicecandidate = (e) => {
      if (e.candidate && ws?.readyState === WebSocket.OPEN)
        ws.send(JSON.stringify({ type: "ice", candidate: e.candidate }));
    };
    pc.onconnectionstatechange = () => {
      if (pc !== thisPc) return;
      const st = thisPc.connectionState;
      if (st === "connected") {
        clearTimeout(disconnectTimer);
        disconnectTimer = undefined;
        resetStallClock();
        onState("live");
      } else if (st === "failed") {
        recover();
      } else if (st === "disconnected") {
        clearTimeout(disconnectTimer);
        disconnectTimer = window.setTimeout(() => {
          if (pc === thisPc && thisPc.connectionState === "disconnected") recover();
        }, 3000);
      }
    };
    await pc.setRemoteDescription(sdp);
    const answer = await pc.createAnswer();
    answer.sdp = tuneOpus(answer.sdp ?? "");
    await pc.setLocalDescription(answer);
    ws?.send(JSON.stringify({ type: "answer", sdp: pc.localDescription }));
  }

  return {
    async start() {
      ice = await loadIceServers();
      connect();
      statsTimer = window.setInterval(() => void checkHealth(), CHECK_EVERY);
      document.addEventListener("visibilitychange", onVisibility);
    },
    stop() {
      closed = true;
      document.removeEventListener("visibilitychange", onVisibility);
      clearInterval(statsTimer);
      clearJoinTimeout();
      stopHeartbeat?.();
      teardownPc();
      ws?.close();
    },
  };
}
