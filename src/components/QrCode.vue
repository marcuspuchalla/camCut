<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import QRCode from "qrcode";

const props = defineProps<{ value: string; size?: number; ec?: "L" | "M" | "Q" | "H" }>();
const canvas = ref<HTMLCanvasElement>();

async function render() {
  if (!canvas.value || !props.value) return;
  try {
    await QRCode.toCanvas(canvas.value, props.value, {
      width: props.size ?? 240,
      margin: 1,
      errorCorrectionLevel: props.ec ?? "M",
      color: { dark: "#0e1122", light: "#ffffff" },
    });
  } catch {
    /* value too large for one QR — caller should chunk it */
  }
}

watch(() => props.value, render);
onMounted(render);
</script>

<template>
  <canvas ref="canvas" class="rounded-xl bg-white" :width="size ?? 240" :height="size ?? 240"></canvas>
</template>
