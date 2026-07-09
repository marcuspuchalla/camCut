<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from "vue";
import QrCode from "./QrCode.vue";

// Renders a rateless fountain stream: each tick pulls a fresh XOR-mixed frame
// from `next()`, so the animation never repeats a fixed loop and a missed frame
// is simply replaced by the next one.
const props = defineProps<{ next: () => string; size?: number; fps?: number }>();

const current = ref("");
let timer: number | undefined;

function start() {
  if (timer) clearInterval(timer);
  current.value = props.next();
  timer = window.setInterval(() => {
    current.value = props.next();
  }, Math.round(1000 / (props.fps ?? 6)));
}

watch(() => props.next, start);
onMounted(start);
onBeforeUnmount(() => {
  if (timer) clearInterval(timer);
});
</script>

<template>
  <div class="flex flex-col items-center gap-2">
    <QrCode :value="current" :size="size ?? 260" ec="M" />
    <p class="text-muted2 text-xs">Keep both phones still — the code cycles automatically</p>
  </div>
</template>
