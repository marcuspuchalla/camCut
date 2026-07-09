<script setup lang="ts">
import { ref, nextTick, onBeforeUnmount } from "vue";
import BrandHeader from "../components/BrandHeader.vue";
import DeviceNote from "../components/DeviceNote.vue";
import AnimatedQr from "../components/AnimatedQr.vue";
import {
  encodeFrames,
  scanFrames,
  createOffer,
  createAnswer,
  acceptAnswer,
} from "../lib/offline";
import { baseNotices } from "../composables/useCapabilities";

type Role = "camera" | "viewer";
type Step =
  | "intro"
  | "show-offer" // camera: display offer, wait for user to scan reply
  | "scan-answer" // camera: scanning the viewer's reply
  | "scan-offer" // viewer: scanning the camera's offer
  | "show-answer" // viewer: display reply, wait for stream
  | "connected";

const role = ref<Role | null>(null);
const step = ref<Step>("intro");
const error = ref("");
const progress = ref("");

const offerFrames = ref<string[]>([]);
const answerFrames = ref<string[]>([]);

const scanVideo = ref<HTMLVideoElement>();
const recvVideo = ref<HTMLVideoElement>();
const recvStream = ref<MediaStream | null>(null);
const scratch = document.createElement("canvas");

const blockers = baseNotices().filter((n) => n.severity === "blocker");

let cameraStream: MediaStream | null = null; // camera role: the feed we send + scan with
let scanStream: MediaStream | null = null; // viewer role: temp camera for scanning
let pc: RTCPeerConnection | null = null;
let scanCancel: (() => void) | null = null;

function watchPc(p: RTCPeerConnection) {
  p.onconnectionstatechange = () => {
    if (p.connectionState === "connected") step.value = "connected";
    else if (["failed", "disconnected"].includes(p.connectionState) && step.value !== "connected")
      error.value = "The direct connection dropped. Make sure both phones share one hotspot and try again.";
  };
}

async function getRearCamera(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  });
}

/* ---------------- camera role (offerer) ---------------- */
async function beCamera() {
  error.value = "";
  role.value = "camera";
  try {
    cameraStream = await getRearCamera();
    const res = await createOffer(cameraStream);
    pc = res.pc;
    watchPc(pc);
    offerFrames.value = await encodeFrames(res.sdp);
    step.value = "show-offer";
  } catch (e: any) {
    error.value = friendly(e);
    role.value = null;
  }
}

async function scanReply() {
  step.value = "scan-answer";
  await nextTick();
  try {
    if (scanVideo.value && cameraStream) {
      scanVideo.value.srcObject = cameraStream;
      await scanVideo.value.play().catch(() => {});
    }
    const { done, cancel } = scanFrames(scanVideo.value!, scratch, (p) => (progress.value = p));
    scanCancel = cancel;
    const answerSdp = await done;
    await acceptAnswer(pc!, answerSdp);
    step.value = "connected";
  } catch (e: any) {
    if (String(e?.message) !== "cancelled") error.value = friendly(e);
  }
}

/* ---------------- viewer role (answerer) ---------------- */
async function beViewer() {
  error.value = "";
  role.value = "viewer";
  step.value = "scan-offer";
  await nextTick();
  try {
    scanStream = await getRearCamera();
    if (scanVideo.value) {
      scanVideo.value.srcObject = scanStream;
      await scanVideo.value.play().catch(() => {});
    }
    const { done, cancel } = scanFrames(scanVideo.value!, scratch, (p) => (progress.value = p));
    scanCancel = cancel;
    const offerSdp = await done;

    const res = await createAnswer(offerSdp, (stream) => {
      // ontrack fires while we're still showing the answer QR, before the
      // recvVideo element is mounted — stash the stream and attach it once the
      // "connected" view renders.
      recvStream.value = stream;
      step.value = "connected";
      nextTick(() => {
        if (recvVideo.value) {
          recvVideo.value.srcObject = stream;
          recvVideo.value.play().catch(() => {});
        }
      });
    });
    pc = res.pc;
    watchPc(pc);
    // Scanning camera no longer needed — free it.
    scanStream.getTracks().forEach((t) => t.stop());
    scanStream = null;
    answerFrames.value = await encodeFrames(res.sdp);
    step.value = "show-answer";
  } catch (e: any) {
    if (String(e?.message) !== "cancelled") error.value = friendly(e);
    if (step.value === "scan-offer") role.value = null;
  }
}

function friendly(e: any): string {
  if (e?.name === "NotAllowedError") return "Camera permission was denied. Allow it and try again.";
  if (e?.name === "NotFoundError") return "No camera found on this device.";
  return `Something went wrong: ${e?.message || e}`;
}

function reset() {
  scanCancel?.();
  scanCancel = null;
  pc?.close();
  pc = null;
  cameraStream?.getTracks().forEach((t) => t.stop());
  scanStream?.getTracks().forEach((t) => t.stop());
  cameraStream = scanStream = null;
  recvStream.value = null;
  offerFrames.value = [];
  answerFrames.value = [];
  progress.value = "";
  error.value = "";
  role.value = null;
  step.value = "intro";
}

onBeforeUnmount(() => {
  scanCancel?.();
  pc?.close();
  cameraStream?.getTracks().forEach((t) => t.stop());
  scanStream?.getTracks().forEach((t) => t.stop());
});
</script>

<template>
  <div class="max-w-xl mx-auto px-5 py-6 min-h-dvh flex flex-col">
    <BrandHeader back :live="step === 'connected'" />

    <div v-if="blockers.length" class="flex flex-col gap-2.5 mb-4">
      <DeviceNote v-for="n in blockers" :key="n.id" :note="n" />
    </div>

    <!-- intro / role choice -->
    <template v-if="step === 'intro'">
      <p class="text-muted text-sm mb-2 leading-relaxed">
        No internet needed. Put both phones on one personal hotspot, then link them by scanning QR codes. Nothing
        leaves your two devices.
      </p>
      <ol class="text-muted2 text-sm mb-5 list-decimal pl-5 space-y-1">
        <li>On one phone, turn on its personal hotspot; connect the other phone to it.</li>
        <li>Pick a role on each phone below.</li>
        <li>Point each phone's camera at the other's screen when asked.</li>
      </ol>
      <div class="flex flex-col gap-4">
        <button
          class="text-left rounded-2xl border border-line bg-night-700 hover:border-glow-a/60 hover:bg-night-600 transition p-5 flex items-start gap-4"
          @click="beCamera"
        >
          <span class="text-3xl">🎥</span>
          <span class="flex-1">
            <span class="block font-round font-bold text-lg">This phone is the camera</span>
            <span class="block text-muted text-sm mt-1">Watches the baby and sends the video.</span>
          </span>
        </button>
        <button
          class="text-left rounded-2xl border border-line bg-night-700 hover:border-glow-a/60 hover:bg-night-600 transition p-5 flex items-start gap-4"
          @click="beViewer"
        >
          <span class="text-3xl">📺</span>
          <span class="flex-1">
            <span class="block font-round font-bold text-lg">This phone watches</span>
            <span class="block text-muted text-sm mt-1">Shows the video from the camera phone.</span>
          </span>
        </button>
      </div>
    </template>

    <!-- camera: show offer -->
    <template v-else-if="step === 'show-offer'">
      <p class="font-round font-bold text-lg mb-1">Step 1 — show this to the watcher</p>
      <p class="text-muted text-sm mb-4">
        On the watching phone, choose “This phone watches” and point it at this code until it fills up.
      </p>
      <div class="grid place-items-center mb-5">
        <AnimatedQr :frames="offerFrames" :size="260" />
      </div>
      <button
        class="rounded-xl bg-glow-a text-night-800 px-5 py-3 font-round font-bold self-center flex items-center gap-2"
        @click="scanReply"
      >
        <i class="pi pi-qrcode"></i>Next — scan their reply
      </button>
    </template>

    <!-- camera: scan answer -->
    <template v-else-if="step === 'scan-answer'">
      <p class="font-round font-bold text-lg mb-1">Step 2 — scan the watcher's reply</p>
      <p class="text-muted text-sm mb-4">Point this phone at the code shown on the watching phone.</p>
      <div class="relative rounded-2xl overflow-hidden bg-black border border-line aspect-video">
        <video ref="scanVideo" autoplay muted playsinline class="w-full h-full object-cover"></video>
        <div class="absolute inset-0 border-2 border-glow-a/60 m-10 rounded-xl pointer-events-none"></div>
      </div>
      <p class="text-center text-muted2 text-sm mt-3 font-mono">{{ progress || "looking for code…" }}</p>
    </template>

    <!-- viewer: scan offer -->
    <template v-else-if="step === 'scan-offer'">
      <p class="font-round font-bold text-lg mb-1">Step 1 — scan the camera phone</p>
      <p class="text-muted text-sm mb-4">Point this phone at the code shown on the camera phone.</p>
      <div class="relative rounded-2xl overflow-hidden bg-black border border-line aspect-video">
        <video ref="scanVideo" autoplay muted playsinline class="w-full h-full object-cover"></video>
        <div class="absolute inset-0 border-2 border-glow-a/60 m-10 rounded-xl pointer-events-none"></div>
      </div>
      <p class="text-center text-muted2 text-sm mt-3 font-mono">{{ progress || "looking for code…" }}</p>
    </template>

    <!-- viewer: show answer -->
    <template v-else-if="step === 'show-answer'">
      <p class="font-round font-bold text-lg mb-1">Step 2 — show this reply back</p>
      <p class="text-muted text-sm mb-4">
        On the camera phone, tap “Next — scan their reply” and point it at this code. The video starts
        automatically once it connects.
      </p>
      <div class="grid place-items-center">
        <AnimatedQr :frames="answerFrames" :size="260" />
      </div>
    </template>

    <!-- connected -->
    <template v-else-if="step === 'connected'">
      <div v-if="role === 'viewer'" class="fixed inset-0 bg-black flex items-center justify-center">
        <video ref="recvVideo" autoplay muted playsinline class="w-full h-full object-contain"></video>
        <div class="absolute top-3 left-3 flex items-center gap-2">
          <button class="text-white/80 hover:text-white" @click="reset"><i class="pi pi-times"></i></button>
          <span class="font-round font-semibold text-white/90 text-sm">Baby Cam Cut · offline</span>
        </div>
      </div>
      <div v-else class="grid place-items-center flex-1 text-center py-16">
        <div>
          <div class="text-5xl mb-3">✅</div>
          <p class="font-round font-bold text-xl">Connected</p>
          <p class="text-muted text-sm mt-1 mb-5">This phone is streaming to the watcher. Keep the app open.</p>
          <button class="rounded-xl border border-line bg-night-700 px-4 py-2.5 font-round font-semibold" @click="reset">
            Stop
          </button>
        </div>
      </div>
    </template>

    <p v-if="error" class="text-glow-b text-sm mt-4">{{ error }}</p>
    <button
      v-if="error && step !== 'intro'"
      class="mt-3 self-center rounded-xl border border-line bg-night-700 px-4 py-2.5 font-round font-semibold text-sm"
      @click="reset"
    >
      Start over
    </button>
  </div>
</template>
