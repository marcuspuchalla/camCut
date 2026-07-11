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
    (s) => {
      if (videoEl.value) {
        videoEl.value.srcObject = s;
        videoEl.value.play().catch(() => {});
      }
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
      muted
      playsinline
      class="flex-1 w-full h-full"
      :class="fitContain ? 'object-contain' : 'object-cover'"
      @click="fitContain = !fitContain"
    ></video>

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
      </div>
    </div>

    <!-- top bar -->
    <div class="absolute top-0 inset-x-0 flex items-center gap-2 px-4 py-3 bg-gradient-to-b from-black/60 to-transparent">
      <RouterLink to="/" class="text-white/80 hover:text-white" aria-label="Home">
        <i class="pi pi-arrow-left"></i>
      </RouterLink>
      <span class="font-round font-semibold text-white/90 text-sm">Baby Cam Cut</span>
      <span
        v-if="state === 'live'"
        class="ml-auto inline-flex items-center gap-2 text-xs font-round font-semibold text-[#ffd9c2]"
      >
        <i class="w-2 h-2 rounded-full bg-glow-b" style="box-shadow: 0 0 8px var(--color-glow-b)"></i>Live
      </span>
    </div>
  </div>
</template>
