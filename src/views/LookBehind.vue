<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from "vue";
import BrandHeader from "../components/BrandHeader.vue";
import DeviceNote from "../components/DeviceNote.vue";
import { useCamera } from "../composables/useCamera";
import { useCrop } from "../composables/useCrop";
import {
  baseNotices,
  pipUnavailableNote,
  hasScriptablePiP,
} from "../composables/useCapabilities";

const cam = useCamera();

const rawVideo = ref<HTMLVideoElement>();
const cropVideo = ref<HTMLVideoElement>();
const pipVideo = ref<HTMLVideoElement>(); // the element that pops out (cropped)
const stage = ref<HTMLDivElement>();

const { uiMode, overlayStyle, hasSelection, onDown, onMove, onUp, toggle } = useCrop(
  stage,
  cam.selection,
  cam.setSelection,
);
const pipActive = ref(false);

const blockers = baseNotices().filter((n) => n.severity === "blocker");
const pipSupported = hasScriptablePiP();
const pipNote = pipUnavailableNote();

// Bind the live streams to the visible elements as they arrive.
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
    if (pipVideo.value) pipVideo.value.srcObject = s;
  },
);

async function begin() {
  await cam.start();
}

function clearCrop() {
  cam.setSelection(null);
}

/* ---- picture-in-picture pop-out ---- */
async function popOut() {
  const v = pipVideo.value;
  if (!v) return;
  try {
    await v.play().catch(() => {});
    if (typeof (v as any).webkitSetPresentationMode === "function") {
      (v as any).webkitSetPresentationMode("picture-in-picture");
      pipActive.value = true;
    } else if (typeof v.requestPictureInPicture === "function") {
      await v.requestPictureInPicture();
    }
  } catch {
    /* user may have cancelled */
  }
}

function onEnterPip() {
  pipActive.value = true;
}
function onLeavePip() {
  pipActive.value = false;
}

onMounted(() => {
  document.addEventListener("enterpictureinpicture", onEnterPip);
  document.addEventListener("leavepictureinpicture", onLeavePip);
});
onBeforeUnmount(() => {
  document.removeEventListener("enterpictureinpicture", onEnterPip);
  document.removeEventListener("leavepictureinpicture", onLeavePip);
});
</script>

<template>
  <div class="max-w-xl mx-auto px-5 py-6 min-h-dvh flex flex-col">
    <BrandHeader back :live="cam.running.value" />

    <div v-if="blockers.length" class="flex flex-col gap-2.5 mb-4">
      <DeviceNote v-for="n in blockers" :key="n.id" :note="n" />
    </div>

    <p class="text-muted text-sm mb-4 leading-relaxed">
      Point this device's camera at the crib. Draw a box to zoom into just that area, then pop out a small
      always-on-top window to glance at while you work.
    </p>

    <!-- stage -->
    <div
      ref="stage"
      class="relative rounded-2xl overflow-hidden bg-black/60 border border-line aspect-video select-none touch-none"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
    >
      <!-- cropped output (also the pop-out source) -->
      <video
        v-show="uiMode === 'watch'"
        ref="cropVideo"
        autoplay
        muted
        playsinline
        class="w-full h-full object-contain"
      ></video>
      <!-- raw full frame while selecting -->
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
        Drag to select the area
      </div>
    </div>

    <p v-if="cam.error.value" class="text-glow-b text-sm mt-3">{{ cam.error.value }}</p>

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
        v-if="pipSupported"
        class="rounded-xl bg-glow-a text-night-800 px-4 py-2.5 font-round font-bold text-sm flex items-center gap-2 ml-auto"
        :class="{ 'opacity-70': pipActive }"
        @click="popOut"
      >
        <i class="pi pi-window-maximize"></i>{{ pipActive ? "Popped out" : "Pop out window" }}
      </button>
    </div>

    <!-- why the pop-out isn't here -->
    <div v-if="cam.running.value && !pipSupported && pipNote" class="mt-3">
      <DeviceNote :note="pipNote" />
    </div>

    <!-- hidden element carrying the cropped stream for PiP (kept rendered, not display:none, for Safari) -->
    <video
      ref="pipVideo"
      autoplay
      muted
      playsinline
      class="fixed w-px h-px opacity-0 pointer-events-none -z-10 bottom-0 right-0"
    ></video>
  </div>
</template>
