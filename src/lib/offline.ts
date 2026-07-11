// Offline "hotel mode": connect two devices on the same hotspot with NO server
// and NO internet, by exchanging the WebRTC handshake through QR codes.
//
// Transport uses FOUNTAIN CODES (rateless erasure coding), the same idea as the
// BC-UR animated QR used by air-gapped hardware wallets: the payload is split
// into K blocks, and every QR frame carries a pseudo-random XOR mix of some
// blocks. The receiver reconstructs the whole message after catching *any* ~K+
// frames — it never has to wait for one specific frame, so a missed frame just
// means one more frame later, not a rescan. We roll our own compact version
// (Uint8Array + CRC32, no dependencies) because both ends are this same app, so
// we don't need BC-UR's CBOR/Buffer wire-compatibility.

import jsQR from "jsqr";

// --- Compression (shrinks the SDP so it needs fewer blocks) ----------------
async function gzip(str: string): Promise<Uint8Array> {
  const cs = new CompressionStream("gzip");
  const writer = cs.writable.getWriter();
  void writer.write(new TextEncoder().encode(str));
  void writer.close();
  return new Uint8Array(await new Response(cs.readable).arrayBuffer());
}
async function gunzip(bytes: Uint8Array): Promise<string> {
  const ds = new DecompressionStream("gzip");
  const writer = ds.writable.getWriter();
  void writer.write(bytes as BufferSource);
  void writer.close();
  return new TextDecoder().decode(await new Response(ds.readable).arrayBuffer());
}

function bytesToB64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
function b64ToBytes(b64: string): Uint8Array {
  const s = atob(b64);
  const a = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i);
  return a;
}

// --- CRC32 (integrity check on the reassembled message) --------------------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// --- Deterministic PRNG so encoder and decoder pick the SAME block mixes ----
function makeRng(seed: number) {
  let s = seed >>> 0 || 0x1a2b3c4d;
  const nextU32 = () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s >>> 0;
  };
  return {
    nextFloat: () => nextU32() / 0x100000000,
    nextInt: (n: number) => nextU32() % n,
  };
}

// Which source blocks does frame `seqNum` mix together? The first K frames are
// the K "pure" blocks (fast path); after that, a seeded random XOR combination.
function chooseIndices(seqNum: number, k: number): number[] {
  if (seqNum <= k) return [seqNum - 1];
  const rng = makeRng(((seqNum * 0x9e3779b1) ^ (k * 0x85ebca6b)) >>> 0);
  // degree distribution weighted ~1/d (Ideal-Soliton-like) keeps decoding cheap
  let total = 0;
  for (let d = 1; d <= k; d++) total += 1 / d;
  let r = rng.nextFloat() * total;
  let degree = k;
  for (let d = 1; d <= k; d++) {
    r -= 1 / d;
    if (r <= 0) {
      degree = d;
      break;
    }
  }
  const set = new Set<number>();
  while (set.size < degree) set.add(rng.nextInt(k));
  return [...set];
}

function xorInto(target: Uint8Array, src: Uint8Array) {
  for (let i = 0; i < target.length; i++) target[i] ^= src[i];
}

const TAG = "B"; // frame prefix so the scanner ignores unrelated QR codes
const HEADER = 14; // seqNum(4) + K(2) + msgLen(4) + crc(4)

// --- Fountain encoder: rateless, call nextPart() forever -------------------
export interface FountainEncoder {
  nextPart(): string;
  frameCount: number; // K — informational (min frames a perfect receiver needs)
}

export async function createFountainEncoder(
  text: string,
  targetFragment = 96,
): Promise<FountainEncoder> {
  const msg = await gzip(text);
  const msgLen = msg.length;
  const k = Math.max(1, Math.ceil(msgLen / targetFragment));
  const fragLen = Math.ceil(msgLen / k);
  const crc = crc32(msg);

  const blocks: Uint8Array[] = [];
  for (let i = 0; i < k; i++) {
    const b = new Uint8Array(fragLen);
    b.set(msg.subarray(i * fragLen, Math.min((i + 1) * fragLen, msgLen)));
    blocks.push(b);
  }

  let seqNum = 0;
  return {
    frameCount: k,
    nextPart() {
      seqNum++;
      const mix = new Uint8Array(fragLen);
      for (const idx of chooseIndices(seqNum, k)) xorInto(mix, blocks[idx]);

      const out = new Uint8Array(HEADER + fragLen);
      const dv = new DataView(out.buffer);
      dv.setUint32(0, seqNum);
      dv.setUint16(4, k);
      dv.setUint32(6, msgLen);
      dv.setUint32(10, crc);
      out.set(mix, HEADER);
      return TAG + bytesToB64(out);
    },
  };
}

// --- Fountain decoder ------------------------------------------------------
export interface FountainDecoder {
  receivePart(frame: string): void;
  isComplete(): boolean;
  progress(): number; // 0..1 — fraction of source blocks recovered
  result(): Promise<string>;
}

export function createFountainDecoder(): FountainDecoder {
  let k = 0;
  let msgLen = 0;
  let crc = 0;
  let fragLen = 0;
  let started = false;
  const known = new Map<number, Uint8Array>();
  let pending: { set: Set<number>; data: Uint8Array }[] = [];

  const reduce = (set: Set<number>, data: Uint8Array) => {
    for (const idx of [...set]) {
      const kb = known.get(idx);
      if (kb) {
        xorInto(data, kb);
        set.delete(idx);
      }
    }
  };

  // After learning a new block, cascade through pending mixes until stable.
  const settle = () => {
    let changed = true;
    while (changed) {
      changed = false;
      const next: typeof pending = [];
      for (const p of pending) {
        reduce(p.set, p.data);
        if (p.set.size === 0) continue; // fully cancelled, no info
        if (p.set.size === 1) {
          const idx = [...p.set][0];
          if (!known.has(idx)) {
            known.set(idx, p.data);
            changed = true;
          }
          continue;
        }
        next.push(p);
      }
      pending = next;
    }
  };

  return {
    receivePart(frame: string) {
      if (frame[0] !== TAG) return;
      let bytes: Uint8Array;
      try {
        bytes = b64ToBytes(frame.slice(1));
      } catch {
        return;
      }
      if (bytes.length <= HEADER) return;
      const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const seqNum = dv.getUint32(0);
      const pk = dv.getUint16(4);
      const pMsgLen = dv.getUint32(6);
      const pCrc = dv.getUint32(10);

      if (!started) {
        k = pk;
        msgLen = pMsgLen;
        crc = pCrc;
        fragLen = Math.ceil(msgLen / k);
        started = true;
      } else if (pk !== k || pMsgLen !== msgLen || pCrc !== crc) {
        return; // a frame from a different message — ignore
      }
      if (bytes.length - HEADER < fragLen) return;

      const set = new Set(chooseIndices(seqNum, k));
      const data = bytes.slice(HEADER, HEADER + fragLen);
      reduce(set, data);
      if (set.size === 0) return;
      if (set.size === 1) {
        const idx = [...set][0];
        if (!known.has(idx)) {
          known.set(idx, data);
          settle();
        }
        return;
      }
      pending.push({ set, data });
      settle();
    },
    isComplete() {
      return started && known.size === k;
    },
    progress() {
      return started ? known.size / k : 0;
    },
    async result() {
      const full = new Uint8Array(fragLen * k);
      for (let i = 0; i < k; i++) full.set(known.get(i)!, i * fragLen);
      const msg = full.subarray(0, msgLen);
      if (crc32(msg) !== crc) throw new Error("checksum mismatch");
      return gunzip(msg);
    },
  };
}

// --- Camera QR scanner: native BarcodeDetector, else jsQR fallback ---------
// BarcodeDetector (Chromium / Vanadium / Android) decodes animated QR far more
// reliably than jsQR; jsQR covers browsers without it (iOS Safari, Firefox).
export interface QrScan {
  done: Promise<string>; // resolves with the decoded text once complete
  cancel: () => void;
}

export function scanQR(
  video: HTMLVideoElement,
  decoder: FountainDecoder,
  onProgress: (p: number) => void,
): QrScan {
  let cancelled = false;
  const BD = (globalThis as any).BarcodeDetector;
  let detector: any = null;
  if (BD) {
    try {
      detector = new BD({ formats: ["qr_code"] });
    } catch {
      detector = null;
    }
  }
  const scratch = document.createElement("canvas");
  const ctx = detector ? null : scratch.getContext("2d", { willReadFrequently: true });

  const done = new Promise<string>((resolve, reject) => {
    const handle = (raw: string | undefined) => {
      if (raw && raw[0] === TAG) {
        decoder.receivePart(raw);
        onProgress(decoder.progress());
      }
    };
    const tick = async () => {
      if (cancelled) return reject(new Error("cancelled"));
      if (video.readyState >= 2 && video.videoWidth) {
        try {
          if (detector) {
            const codes = await detector.detect(video);
            for (const c of codes) handle(c.rawValue);
          } else if (ctx) {
            scratch.width = video.videoWidth;
            scratch.height = video.videoHeight;
            ctx.drawImage(video, 0, 0);
            const img = ctx.getImageData(0, 0, scratch.width, scratch.height);
            const code = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
            if (code) handle(code.data);
          }
        } catch {
          /* transient decode error — keep scanning */
        }
        if (decoder.isComplete()) {
          decoder.result().then(resolve, reject);
          return;
        }
      }
      requestAnimationFrame(tick);
    };
    tick();
  });

  return { done, cancel: () => (cancelled = true) };
}

// --- WebRTC over manual (QR) signaling -------------------------------------
// The QR handshake replaces the *signaling server*, but the media path still
// needs ICE. With no ICE servers only host candidates are found → same network
// only. Adding STUN/TURN (when online) puts srflx/relay candidates into the SDP
// that's carried by the QR, so two devices on *different* networks can connect
// serverlessly too. Offline (no internet) STUN/TURN simply don't resolve and we
// fall back to host candidates → same-network still works.

const STUN: RTCIceServer = { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] };

/** Fetch STUN+TURN from the server; fall back to public STUN (or nothing offline). */
export async function getHotelIceServers(): Promise<RTCIceServer[]> {
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 2500);
    const r = await fetch("/api/ice", { signal: ctrl.signal });
    clearTimeout(to);
    const j = await r.json();
    if (Array.isArray(j.iceServers) && j.iceServers.length) return j.iceServers;
  } catch {
    /* offline or server unreachable */
  }
  return [STUN];
}

// Wait until ICE gathering completes so the one-shot SDP carries every
// candidate (host + srflx + relay). Capped so a slow TURN server can't hang us.
function waitIceComplete(pc: RTCPeerConnection): Promise<void> {
  return new Promise((resolve) => {
    if (pc.iceGatheringState === "complete") return resolve();
    const check = () => {
      if (pc.iceGatheringState === "complete") {
        pc.removeEventListener("icegatheringstatechange", check);
        resolve();
      }
    };
    pc.addEventListener("icegatheringstatechange", check);
    setTimeout(resolve, 5000);
  });
}

export async function createOffer(
  stream: MediaStream,
  iceServers: RTCIceServer[] = [],
): Promise<{ pc: RTCPeerConnection; sdp: string; probe: RTCDataChannel }> {
  const pc = new RTCPeerConnection({ iceServers });
  // A tiny data channel used as an application-level reachability "test packet".
  const probe = pc.createDataChannel("probe", { ordered: true });
  stream.getTracks().forEach((t) => pc.addTrack(t, stream));
  await pc.setLocalDescription(await pc.createOffer());
  await waitIceComplete(pc);
  return { pc, sdp: JSON.stringify(pc.localDescription), probe };
}

export async function createAnswer(
  offerSdp: string,
  onStream: (s: MediaStream) => void,
  iceServers: RTCIceServer[] = [],
): Promise<{ pc: RTCPeerConnection; sdp: string }> {
  const pc = new RTCPeerConnection({ iceServers });
  pc.ontrack = (e) => onStream(e.streams[0]);
  // Echo the probe ("p<ts>" → "o<ts>") so the camera phone can measure round-trip.
  pc.ondatachannel = (ev) => {
    const ch = ev.channel;
    ch.onmessage = (m) => {
      if (typeof m.data === "string" && m.data[0] === "p") {
        try {
          ch.send("o" + m.data.slice(1));
        } catch {
          /* channel closed */
        }
      }
    };
  };
  await pc.setRemoteDescription(JSON.parse(offerSdp));
  await pc.setLocalDescription(await pc.createAnswer());
  await waitIceComplete(pc);
  return { pc, sdp: JSON.stringify(pc.localDescription) };
}

export async function acceptAnswer(pc: RTCPeerConnection, answerSdp: string): Promise<void> {
  await pc.setRemoteDescription(JSON.parse(answerSdp));
}
