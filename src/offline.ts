// Offline "hotel mode": connect two devices on the same hotspot with NO server
// and NO internet, by exchanging the WebRTC handshake through QR codes.
//
// The handshake (SDP) is compressed, base64'd, split into chunks, and shown as
// an animated sequence of QR codes. The other device scans the sequence with
// its camera until it has every chunk, reassembles, and answers the same way.

import jsQR from "jsqr";

// --- Compression (shrinks the SDP so it needs fewer QR frames) -------------
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

// --- Encode a payload into QR frame strings --------------------------------
// Frame format:  B|<id>|<seq>|<total>|<enc>|<chunk>
const CHUNK = 560; // base64 chars per QR — kept modest so phone cameras read it easily

export async function encodeFrames(text: string): Promise<string[]> {
  const id = Math.random().toString(36).slice(2, 8);
  let enc = "r";
  let payload: string;
  try {
    if (typeof CompressionStream !== "undefined") {
      payload = bytesToB64(await gzip(text));
      enc = "g";
    } else {
      payload = btoa(unescape(encodeURIComponent(text)));
    }
  } catch {
    payload = btoa(unescape(encodeURIComponent(text)));
    enc = "r";
  }
  const chunks: string[] = [];
  for (let i = 0; i < payload.length; i += CHUNK) chunks.push(payload.slice(i, i + CHUNK));
  const total = chunks.length;
  return chunks.map((c, seq) => `B|${id}|${seq}|${total}|${enc}|${c}`);
}

// --- Collect scanned frames until a payload is complete --------------------
export class FrameCollector {
  private id: string | null = null;
  private enc = "g";
  private total = 0;
  private parts = new Map<number, string>();

  /** Returns true once every chunk of a message has been seen. */
  add(frame: string): boolean {
    const m = frame.match(/^B\|([^|]+)\|(\d+)\|(\d+)\|([gr])\|(.*)$/s);
    if (!m) return false;
    const [, id, seq, total, enc, chunk] = m;
    if (this.id && this.id !== id) this.reset();
    this.id = id;
    this.enc = enc;
    this.total = Number(total);
    this.parts.set(Number(seq), chunk);
    return this.parts.size === this.total && this.total > 0;
  }

  progress(): string {
    return this.total ? `${this.parts.size}/${this.total}` : "";
  }

  reset() {
    this.id = null;
    this.total = 0;
    this.parts.clear();
  }

  async text(): Promise<string> {
    let b64 = "";
    for (let i = 0; i < this.total; i++) b64 += this.parts.get(i) ?? "";
    if (this.enc === "g") return gunzip(b64ToBytes(b64));
    return decodeURIComponent(escape(atob(b64)));
  }
}

// --- Animated QR display ---------------------------------------------------
export interface AnimatedQR {
  stop: () => void;
}

// --- Scan QR frames from a camera until a full payload arrives --------------
export function scanFrames(
  video: HTMLVideoElement,
  scratch: HTMLCanvasElement,
  onProgress: (p: string) => void,
): { done: Promise<string>; cancel: () => void } {
  const ctx = scratch.getContext("2d", { willReadFrequently: true })!;
  const collector = new FrameCollector();
  let cancelled = false;

  const done = new Promise<string>((resolve, reject) => {
    const tick = () => {
      if (cancelled) return reject(new Error("cancelled"));
      if (video.readyState >= 2 && video.videoWidth) {
        scratch.width = video.videoWidth;
        scratch.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        const img = ctx.getImageData(0, 0, scratch.width, scratch.height);
        const code = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
        if (code && code.data.startsWith("B|")) {
          const complete = collector.add(code.data);
          onProgress(collector.progress());
          if (complete) {
            collector.text().then(resolve, reject);
            return;
          }
        }
      }
      requestAnimationFrame(tick);
    };
    tick();
  });

  return { done, cancel: () => (cancelled = true) };
}

// --- WebRTC over manual (QR) signaling -------------------------------------
// No ICE servers: on the same hotspot, direct host candidates connect. Cap the
// gather wait so we don't hang if a candidate is slow.
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
    setTimeout(resolve, 3000);
  });
}

export async function createOffer(stream: MediaStream): Promise<{ pc: RTCPeerConnection; sdp: string }> {
  const pc = new RTCPeerConnection({ iceServers: [] });
  stream.getTracks().forEach((t) => pc.addTrack(t, stream));
  await pc.setLocalDescription(await pc.createOffer());
  await waitIceComplete(pc);
  return { pc, sdp: JSON.stringify(pc.localDescription) };
}

export async function createAnswer(
  offerSdp: string,
  onStream: (s: MediaStream) => void,
): Promise<{ pc: RTCPeerConnection; sdp: string }> {
  const pc = new RTCPeerConnection({ iceServers: [] });
  pc.ontrack = (e) => onStream(e.streams[0]);
  await pc.setRemoteDescription(JSON.parse(offerSdp));
  await pc.setLocalDescription(await pc.createAnswer());
  await waitIceComplete(pc);
  return { pc, sdp: JSON.stringify(pc.localDescription) };
}

export async function acceptAnswer(pc: RTCPeerConnection, answerSdp: string): Promise<void> {
  await pc.setRemoteDescription(JSON.parse(answerSdp));
}
