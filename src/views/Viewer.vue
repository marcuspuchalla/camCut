<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";
import { useRoute } from "vue-router";
import { createViewer, type Viewer, type ViewerState } from "../composables/useSignaling";

const route = useRoute();
const room = String(route.query.room ?? "");

const videoEl = ref<HTMLVideoElement>();
const state = ref<ViewerState>("connecting");
const fitContain = ref(true);
let viewer: Viewer | null = null;

// Browsers only autoplay video that is muted. We start muted so the picture
// always appears, then try to unmute; where that's blocked (iOS always, Chrome
// Android without prior engagement) we ask for a tap, because the unmute has to
// happen inside the gesture handler itself.
const muted = ref(true);
const needsTapForSound = ref(false);
const hasAudioTrack = ref(false);

async function unmute() {
  const el = videoEl.value;
  if (!el) return false;
  el.muted = false;
  try {
    await el.play();
    muted.value = false;
    needsTapForSound.value = false;
    return true;
  } catch {
    el.muted = true;
    muted.value = true;
    needsTapForSound.value = true;
    await el.play().catch(() => {});
    return false;
  }
}

function toggleMute() {
  if (muted.value) void unmute();
  else {
    muted.value = true;
    if (videoEl.value) videoEl.value.muted = true;
  }
}

const label: Record<ViewerState, string> = {
  connecting: "Connecting…",
  waiting: "Waiting for the camera to go live…",
  live: "Live",
  reconnecting: "Reconnecting…",
};

onMounted(async () => {
  if (!room) {
    state.value = "waiting";
    return;
  }
  viewer = createViewer(
    room,
    async (s) => {
      if (!videoEl.value) return;
      videoEl.value.srcObject = s;
      await videoEl.value.play().catch(() => {});
      hasAudioTrack.value = s.getAudioTracks().length > 0;
      if (hasAudioTrack.value) await unmute();
    },
    (st) => (state.value = st),
  );
  await viewer.start();
});

onBeforeUnmount(() => viewer?.stop());
</script>

<template>
  <div class="fixed inset-0 z-50 bg-black flex flex-col">
    <video
      ref="videoEl"
      autoplay
      playsinline
      class="flex-1 w-full h-full"
      :class="fitContain ? 'object-contain' : 'object-cover'"
      @click="fitContain = !fitContain"
    ></video>

    <!-- Sound needs a tap on iOS (and Chrome Android without prior engagement).
         Silence is ambiguous on a baby monitor, so make this impossible to miss. -->
    <button
      v-if="state === 'live' && needsTapForSound"
      class="absolute inset-x-0 bottom-24 mx-auto w-max rounded-full bg-glow-a text-night-800 font-round font-bold px-6 py-3 flex items-center gap-2 shadow-lg"
      @click="unmute"
    >
      <i class="pi pi-volume-up"></i>Tap to turn sound on
    </button>

    <!-- status overlay while not live -->
    <div
      v-if="state !== 'live'"
      class="absolute inset-0 grid place-items-center text-center px-8 pointer-events-none"
    >
      <div>
        <div
          class="mx-auto mb-4 w-10 h-10 rounded-full border-2 border-line border-t-glow-a"
          :class="{ 'animate-spin': state === 'connecting' || state === 'reconnecting' }"
        ></div>
        <p class="font-round font-semibold text-moon">{{ label[state] }}</p>
        <p v-if="!room" class="text-muted text-sm mt-2">This link is missing a room id.</p>
        <p class="text-[#ffb3c1] text-xs mt-4 max-w-xs mx-auto leading-relaxed">
          This stream only shows what the camera sees — it doesn't watch your child, and it can stop without
          warning. Use at your own risk; never a substitute for an adult nearby.
        </p>
      </div>
    </div>

    <!-- top bar -->
    <div class="absolute top-0 inset-x-0 flex items-center gap-2 px-4 py-3 bg-gradient-to-b from-black/60 to-transparent">
      <RouterLink to="/" class="text-white/80 hover:text-white" aria-label="Home">
        <i class="pi pi-arrow-left"></i>
      </RouterLink>
      <span class="font-round font-semibold text-white/90 text-sm">Baby Cam Cut</span>
      <button
        v-if="state === 'live' && hasAudioTrack"
        class="ml-auto text-white/80 hover:text-white"
        :aria-label="muted ? 'Turn sound on' : 'Turn sound off'"
        @click="toggleMute"
      >
        <i :class="muted ? 'pi pi-volume-off' : 'pi pi-volume-up'"></i>
      </button>
      <span
        v-if="state === 'live'"
        class="inline-flex items-center gap-2 text-xs font-round font-semibold text-[#ffd9c2]"
        :class="{ 'ml-auto': !hasAudioTrack }"
      >
        <i class="w-2 h-2 rounded-full bg-glow-b" style="box-shadow: 0 0 8px var(--color-glow-b)"></i>Live
      </span>
    </div>
  </div>
</template>
