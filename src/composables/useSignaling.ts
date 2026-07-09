// WebRTC over the room-based signaling relay (server/signaling.js).
//
// The publisher (camera device) and any number of viewers share a room id.
// Media flows peer-to-peer; the server only introduces peers and forwards SDP
// / ICE. Mirrors the message protocol in server/signaling.js exactly.

function wsUrl(): string {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${location.host}/signal`;
}

async function loadIceServers(): Promise<RTCIceServer[]> {
  try {
    const r = await fetch("/api/ice");
    const j = await r.json();
    if (Array.isArray(j.iceServers) && j.iceServers.length) return j.iceServers;
  } catch {
    /* fall through */
  }
  return [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];
}

export interface Publisher {
  start(): Promise<void>;
  stop(): void;
}

/** Camera side: answers every viewer that joins the room with an offer. */
export function createPublisher(
  room: string,
  stream: MediaStream,
  onViewerCount: (n: number) => void,
): Publisher {
  const peers = new Map<number, RTCPeerConnection>();
  let ws: WebSocket | null = null;
  let ice: RTCIceServer[] = [];
  let closed = false;

  function connect() {
    ws = new WebSocket(wsUrl());
    ws.onopen = () => ws!.send(JSON.stringify({ type: "publisher", room }));
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
        peers.get(m.viewerId)?.close();
        peers.delete(m.viewerId);
        onViewerCount(peers.size);
      }
    };
    ws.onclose = () => {
      if (!closed) setTimeout(connect, 1500);
    };
  }

  async function makeOffer(viewerId: number) {
    peers.get(viewerId)?.close();
    const pc = new RTCPeerConnection({ iceServers: ice });
    peers.set(viewerId, pc);
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    pc.onicecandidate = (e) => {
      if (e.candidate && ws?.readyState === WebSocket.OPEN)
        ws.send(JSON.stringify({ type: "ice", viewerId, candidate: e.candidate }));
    };
    pc.onconnectionstatechange = () => {
      if (["failed", "closed", "disconnected"].includes(pc.connectionState)) {
        peers.delete(viewerId);
        onViewerCount(peers.size);
      }
    };
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    ws?.send(JSON.stringify({ type: "offer", viewerId, sdp: pc.localDescription }));
    onViewerCount(peers.size);
  }

  return {
    async start() {
      ice = await loadIceServers();
      connect();
    },
    stop() {
      closed = true;
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

/** Viewer side: joins a room and renders the publisher's stream. */
export function createViewer(
  room: string,
  onStream: (s: MediaStream) => void,
  onState: (s: ViewerState) => void,
): Viewer {
  let ws: WebSocket | null = null;
  let pc: RTCPeerConnection | null = null;
  let ice: RTCIceServer[] = [];
  let closed = false;

  function teardownPc() {
    pc?.close();
    pc = null;
  }

  function connect() {
    ws = new WebSocket(wsUrl());
    ws.onopen = () => {
      onState("connecting");
      ws!.send(JSON.stringify({ type: "viewer-join", room }));
    };
    ws.onmessage = async (ev) => {
      let m: any;
      try {
        m = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (m.type === "offer") {
        await handleOffer(m.sdp);
      } else if (m.type === "ice") {
        if (pc && m.candidate) await pc.addIceCandidate(m.candidate).catch(() => {});
      } else if (m.type === "no-publisher") {
        onState("waiting");
      } else if (m.type === "publisher-ready") {
        onState("connecting");
        ws!.send(JSON.stringify({ type: "viewer-join", room }));
      } else if (m.type === "publisher-gone") {
        teardownPc();
        onState("waiting");
      }
    };
    ws.onclose = () => {
      if (!closed) {
        onState("reconnecting");
        setTimeout(connect, 1500);
      }
    };
  }

  async function handleOffer(sdp: RTCSessionDescriptionInit) {
    teardownPc();
    pc = new RTCPeerConnection({ iceServers: ice });
    pc.ontrack = (e) => {
      onStream(e.streams[0]);
      onState("live");
    };
    pc.onicecandidate = (e) => {
      if (e.candidate && ws?.readyState === WebSocket.OPEN)
        ws.send(JSON.stringify({ type: "ice", candidate: e.candidate }));
    };
    pc.onconnectionstatechange = () => {
      if (pc?.connectionState === "connected") onState("live");
    };
    await pc.setRemoteDescription(sdp);
    await pc.setLocalDescription(await pc.createAnswer());
    ws?.send(JSON.stringify({ type: "answer", sdp: pc.localDescription }));
  }

  return {
    async start() {
      ice = await loadIceServers();
      connect();
    },
    stop() {
      closed = true;
      teardownPc();
      ws?.close();
    },
  };
}
