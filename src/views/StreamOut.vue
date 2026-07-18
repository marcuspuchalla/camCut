<script setup lang="ts">
import { ref, watch, computed, onMounted, onBeforeUnmount } from "vue";
import { useRoute, useRouter } from "vue-router";
import BrandHeader from "../components/BrandHeader.vue";
import DeviceNote from "../components/DeviceNote.vue";
import QrCode from "../components/QrCode.vue";
import { useCamera } from "../composables/useCamera";
import { useCrop } from "../composables/useCrop";
import { useWakeLock } from "../composables/useWakeLock";
import { createPublisher, type Publisher } from "../composables/useSignaling";
import { baseNotices } from "../composables/useCapabilities";
import { isValidRoom } from "../lib/room";

const route = useRoute();
const router = useRouter();
const cam = useCamera();

const rawVideo = ref<HTMLVideoElement>();
const cropVideo = ref<HTMLVideoElement>();
const stage = ref<HTMLDivElement>();
const { uiMode, overlayStyle, hasSelection, onDown, onMove, onUp, toggle } = useCrop(
  stage,
  cam.selection,
  cam.setSelection,
);
const blockers = baseNotices().filter((n) => n.severity === "blocker");

// Stable room id: keep it in the URL so the link can be bookmarked once and
// reused on any day / any computer.
const room = ref<string>(String(route.query.room ?? ""));

// When running on localhost, other devices on the LAN can't reach "localhost".
// Swap in this computer's network IP so the share link / QR work from a phone
// without deploying. The viewer only receives video (no camera), so plain http
// over the LAN is fine.
const isLocalHost = /^(localhost|127\.0\.0\.1|\[?::1\]?)$/i.test(location.hostname);
const streamHost = ref(location.host);
const usingLanIp = computed(() => streamHost.value !== location.host);

onMounted(async () => {
  // Missing OR invalid (hand-edited, guessable) room ids are replaced with a
  // fresh UUID — the room is the only access control, so it must stay random.
  if (!isValidRoom(room.value)) {
    room.value = crypto.randomUUID();
    router.replace({ query: { ...route.query, room: room.value } });
  }
  if (isLocalHost) {
    try {
      const r = await fetch("/api/lan-info");
      const j = await r.json();
      const ip: string | undefined = j.ips?.[0];
      if (ip) streamHost.value = location.port ? `${ip}:${location.port}` : ip;
    } catch {
      /* keep localhost */
    }
  }
});

const viewerLink = computed(() => `${location.protocol}//${streamHost.value}/view?room=${room.value}`);

const live = ref(false);
const viewerCount = ref(0);
let publisher: Publisher | null = null;

// Keep the camera device's screen awake while live: a dimmed/locked phone
// throttles or suspends the page and the stream dies with it.
const wake = useWakeLock();

watch(
  () => cam.rawStream.value,
  (s) => {
    if (rawVideo.value) rawVideo.value.srcObject = s;
  },
);
watch(
  () => cam.outStream.value,
  (s) => {
    if (cropVideo.value) cropVideo.value.srcObject = s;
    // Camera flip / re-acquire while live: hand viewers the new tracks.
    if (s && publisher) publisher.setStream(s);
  },
);

// The watermark burned into the picture: the host the viewer link points at.
watch(streamHost, (h) => (cam.overlayLabel.value = h), { immediate: true });

async function begin() {
  await cam.start();
}

function clearCrop() {
  cam.setSelection(null);
}

async function goLive() {
  if (!cam.outStream.value) return;
  publisher = createPublisher(room.value, cam.outStream.value, (n) => (viewerCount.value = n));
  await publisher.start();
  live.value = true;
  await wake.acquire();
}

function stopLive() {
  publisher?.stop();
  publisher = null;
  live.value = false;
  viewerCount.value = 0;
  void wake.release();
}

const copied = ref(false);
async function copyLink() {
  try {
    await navigator.clipboard.writeText(viewerLink.value);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1800);
  } catch {
    /* clipboard blocked */
  }
}

const canShare = typeof navigator !== "undefined" && !!navigator.share;
async function shareLink() {
  try {
    await navigator.share({
      title: "Baby Cam Cut",
      text: "Watch the baby cam:",
      url: viewerLink.value,
    });
  } catch {
    /* user cancelled */
  }
}

onBeforeUnmount(stopLive);
</script>

<template>
  <div class="w-full max-w-xl mx-auto px-5 py-6 flex-1 flex flex-col">
    <BrandHeader back :live="live" />

    <div v-if="blockers.length" class="flex flex-col gap-2.5 mb-4">
      <DeviceNote v-for="n in blockers" :key="n.id" :note="n" />
    </div>

    <p class="text-muted text-sm mb-1 leading-relaxed">
      Use this device as the camera. Draw a box to stream only that area, then go live and open the link on a
      phone or send it to someone you trust — the video streams directly between the devices.
    </p>
    <p class="text-[#ffb3c1] text-xs mb-4 leading-relaxed">
      It only shows what the camera sees — it doesn't watch your child, and the stream can stop without
      warning. Use at your own risk; keep an adult nearby.
    </p>

    <!-- preview / crop stage -->
    <div
      ref="stage"
      class="relative rounded-2xl overflow-hidden bg-black/60 border border-line aspect-video select-none touch-none"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
    >
      <!-- what actually gets streamed (cropped output) -->
      <video
        v-show="uiMode === 'watch'"
        ref="cropVideo"
        autoplay
        muted
        playsinline
        class="w-full h-full object-contain"
      ></video>
      <!-- raw full frame while selecting an area -->
      <video
        v-show="uiMode === 'crop'"
        ref="rawVideo"
        autoplay
        muted
        playsinline
        class="w-full h-full object-contain"
      ></video>

      <div
        v-if="uiMode === 'crop'"
        class="absolute border-2 border-glow-a rounded-md pointer-events-none"
        style="box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.45)"
        :style="overlayStyle"
      ></div>

      <div v-if="!cam.running.value" class="absolute inset-0 grid place-items-center text-center px-6">
        <div>
          <p class="text-muted text-sm mb-3">Camera is off</p>
          <button class="rounded-xl bg-glow-a text-night-800 font-round font-bold px-5 py-2.5" @click="begin">
            Start camera
          </button>
        </div>
      </div>

      <div
        v-if="uiMode === 'crop'"
        class="absolute top-2 left-1/2 -translate-x-1/2 text-xs font-round bg-night-800/80 border border-line rounded-full px-3 py-1 text-moon"
      >
        Drag to select the area to stream
      </div>

      <span
        v-if="live && uiMode === 'watch'"
        class="absolute top-3 right-3 inline-flex items-center gap-2 text-xs font-round font-semibold bg-night-800/80 border border-line rounded-full px-3 py-1"
      >
        <i class="pi pi-eye text-mint"></i>{{ viewerCount }} watching
      </span>
    </div>

    <p v-if="cam.error.value" class="text-glow-b text-sm mt-3">{{ cam.error.value }}</p>

    <!-- persistent while live without a screen lock: a sleeping screen is the
         main way an unattended stream silently stops -->
    <div
      v-if="live && !wake.held.value"
      class="mt-3 rounded-xl border border-glow-a/50 bg-glow-a/10 px-4 py-3 text-sm flex items-start gap-2.5"
    >
      <i class="pi pi-sun mt-0.5 text-glow-a"></i>
      <span v-if="wake.supported">
        The screen isn't being kept awake right now. If this device's screen turns off or locks, the stream can
        stop without warning — return to this page or turn off battery saver so it can stay on.
      </span>
      <span v-else>
        This browser can't keep the screen awake. Set this device's screen timeout to "never" (or keep it
        plugged in with the screen on) — if the screen locks, the stream can stop without warning.
      </span>
    </div>
    <p v-else-if="live" class="text-muted2 text-xs mt-3 flex items-center gap-1.5">
      <i class="pi pi-sun"></i>The screen stays awake while you're live.
    </p>

    <!-- controls -->
    <div v-if="cam.running.value" class="flex flex-wrap gap-2.5 mt-4">
      <button
        class="rounded-xl border border-line bg-night-700 hover:bg-night-600 px-4 py-2.5 font-round font-semibold text-sm flex items-center gap-2"
        @click="toggle"
      >
        <i class="pi pi-crop"></i>{{ hasSelection ? "Change area" : "Select area" }}
      </button>
      <button
        v-if="hasSelection"
        class="rounded-xl border border-line bg-night-700 hover:bg-night-600 px-4 py-2.5 font-round font-semibold text-sm flex items-center gap-2"
        @click="clearCrop"
      >
        <i class="pi pi-times"></i>Full frame
      </button>
      <button
        v-if="cam.devices.value.length > 1"
        class="rounded-xl border border-line bg-night-700 hover:bg-night-600 px-4 py-2.5 font-round font-semibold text-sm flex items-center gap-2"
        @click="cam.flip()"
      >
        <i class="pi pi-sync"></i>Switch camera
      </button>
      <button
        v-if="cam.hasAudio.value"
        class="rounded-xl border border-line bg-night-700 hover:bg-night-600 px-4 py-2.5 font-round font-semibold text-sm flex items-center gap-2"
        :class="{ 'text-glow-b border-glow-b/50': !cam.micOn.value }"
        @click="cam.toggleMic()"
      >
        <i :class="cam.micOn.value ? 'pi pi-microphone' : 'pi pi-microphone-slash'"></i>
        {{ cam.micOn.value ? "Sound on" : "Muted" }}
      </button>
      <button
        v-if="!live"
        class="rounded-xl bg-mint text-night-800 px-5 py-2.5 font-round font-bold text-sm flex items-center gap-2 ml-auto"
        @click="goLive"
      >
        <i class="pi pi-play"></i>Go live
      </button>
      <button
        v-else
        class="rounded-xl border border-glow-b/50 bg-glow-b/10 text-[#ffd6d8] px-5 py-2.5 font-round font-bold text-sm flex items-center gap-2 ml-auto"
        @click="stopLive"
      >
        <i class="pi pi-stop"></i>Stop
      </button>
    </div>

    <!-- share panel -->
    <div v-if="live" class="mt-5 rounded-2xl border border-line bg-night-700 p-5">
      <p class="font-round font-bold text-lg mb-1">Watch on another device</p>
      <p class="text-muted text-sm mb-4">Scan the code, or copy the link and open it anywhere.</p>

      <div class="flex flex-col sm:flex-row gap-5 items-center">
        <div class="shrink-0 grid place-items-center">
          <QrCode :value="viewerLink" :size="200" />
        </div>
        <div class="flex-1 w-full">
          <div
            class="rounded-xl border border-line bg-night-800 px-3 py-2.5 text-xs font-mono text-moon break-all mb-3"
          >
            {{ viewerLink }}
          </div>
          <div class="flex flex-wrap gap-2.5">
            <button
              class="rounded-xl bg-glow-a text-night-800 px-4 py-2.5 font-round font-bold text-sm flex items-center gap-2"
              @click="copyLink"
            >
              <i :class="copied ? 'pi pi-check' : 'pi pi-copy'"></i>{{ copied ? "Copied!" : "Copy link" }}
            </button>
            <button
              v-if="canShare"
              class="rounded-xl border border-line bg-night-800 hover:bg-night-600 px-4 py-2.5 font-round font-semibold text-sm flex items-center gap-2"
              @click="shareLink"
            >
              <i class="pi pi-share-alt"></i>Share
            </button>
          </div>
          <p v-if="usingLanIp" class="text-mint text-xs mt-3 flex items-start gap-1.5">
            <i class="pi pi-wifi mt-0.5"></i>
            <span>Using your computer's network address so devices on the same Wi-Fi can open it — no deploy needed.</span>
          </p>
          <p v-else-if="isLocalHost" class="text-glow-a text-xs mt-3 flex items-start gap-1.5">
            <i class="pi pi-exclamation-triangle mt-0.5"></i>
            <span>This is a <code>localhost</code> link — other devices can't reach it. Couldn't detect a network IP.</span>
          </p>
          <p v-else class="text-muted2 text-xs mt-3">
            Bookmark this page — the link stays the same, so you only share it once.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
