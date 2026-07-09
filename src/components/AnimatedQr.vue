<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from "vue";
import QrCode from "./QrCode.vue";

const props = defineProps<{ frames: string[]; size?: number; fps?: number }>();
const idx = ref(0);
let timer: number | undefined;

function restart() {
  if (timer) clearInterval(timer);
  idx.value = 0;
  if (props.frames.length > 1) {
    timer = window.setInterval(() => {
      idx.value = (idx.value + 1) % props.frames.length;
    }, Math.round(1000 / (props.fps ?? 4)));
  }
}

watch(() => props.frames, restart, { immediate: true });
onBeforeUnmount(() => {
  if (timer) clearInterval(timer);
});
</script>

<template>
  <div class="flex flex-col items-center gap-2">
    <QrCode :value="frames[idx] ?? ''" :size="size ?? 240" />
    <p v-if="frames.length > 1" class="text-muted2 text-xs font-mono">
      frame {{ idx + 1 }} / {{ frames.length }} · keep both phones still
    </p>
  </div>
</template>
