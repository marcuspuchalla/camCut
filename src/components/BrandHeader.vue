<script setup lang="ts">
import { RouterLink } from "vue-router";

defineProps<{ back?: boolean; live?: boolean }>();
</script>

<template>
  <header class="flex items-center gap-3 mb-4">
    <RouterLink
      v-if="back"
      to="/"
      class="grid place-items-center w-9 h-9 rounded-xl border border-line text-muted hover:text-moon"
      aria-label="Back"
    >
      <i class="pi pi-arrow-left"></i>
    </RouterLink>
    <span
      class="grid place-items-center w-9 h-9 rounded-xl text-[#ffd9a8]"
      style="background: radial-gradient(circle at 35% 30%, #2a2545, #1a1c33); box-shadow: inset 0 0 0 1px var(--color-line), 0 0 20px rgba(255,190,130,0.18)"
    >
      <svg viewBox="0 0 32 32" width="20" height="20" aria-hidden="true">
        <path d="M22 21a9 9 0 1 1-6.6-15.2A7 7 0 1 0 22 21Z" fill="currentColor" />
      </svg>
    </span>
    <span class="font-round font-bold text-xl">Baby Cam Cut</span>
    <span
      v-if="live"
      class="ml-auto inline-flex items-center gap-2 font-round font-semibold text-sm text-[#ffd9c2] bg-glow-b/10 border border-glow-b/40 px-3 py-1 rounded-full"
    >
      <i class="w-2 h-2 rounded-full bg-glow-b" style="box-shadow: 0 0 8px var(--color-glow-b); animation: bpulse 1.8s ease-in-out infinite"></i>
      Live
    </span>
  </header>
</template>

<style>
@keyframes bpulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.45; transform: scale(0.8); }
}
</style>
