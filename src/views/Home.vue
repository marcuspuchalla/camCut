<script setup lang="ts">
import { useRouter } from "vue-router";
import BrandHeader from "../components/BrandHeader.vue";
import AppFooter from "../components/AppFooter.vue";
import DeviceNote from "../components/DeviceNote.vue";
import { useCapabilities } from "../composables/useCapabilities";

const router = useRouter();
const { notices } = useCapabilities();

const modes = [
  {
    to: "/behind",
    emoji: "👀",
    title: "Look behind me",
    desc: "You're at the PC and the crib is behind you. Stream your webcam and pop out an always-on-top window to glance at.",
  },
  {
    to: "/stream",
    emoji: "📱",
    title: "Watch on another device",
    desc: "Use this device as the camera and watch from a phone or another PC. Share a link or QR — works across networks.",
  },
  {
    to: "/hotel",
    emoji: "✈️",
    title: "Hotel mode — offline",
    desc: "No internet? Link two phones directly over a personal hotspot by scanning QR codes. Nothing leaves your devices.",
  },
];
</script>

<template>
  <div class="max-w-xl mx-auto px-5 py-6 min-h-dvh flex flex-col">
    <BrandHeader />

    <div class="mb-6">
      <p class="font-round font-semibold uppercase tracking-[2px] text-xs text-[#ffbe86] mb-1">Nursery watch</p>
      <h1 class="font-round font-bold text-2xl leading-tight m-0">What would you like to do?</h1>
    </div>

    <div v-if="notices.length" class="flex flex-col gap-2.5 mb-5">
      <DeviceNote v-for="n in notices" :key="n.id" :note="n" />
    </div>

    <div class="flex flex-col gap-4">
      <button
        v-for="m in modes"
        :key="m.to"
        class="text-left rounded-2xl border border-line bg-night-700 hover:border-glow-a/60 hover:bg-night-600 transition p-5 flex items-start gap-4"
        @click="router.push(m.to)"
      >
        <span class="text-3xl leading-none mt-0.5">{{ m.emoji }}</span>
        <span class="flex-1">
          <span class="block font-round font-bold text-lg">{{ m.title }}</span>
          <span class="block text-muted text-sm mt-1 leading-relaxed">{{ m.desc }}</span>
        </span>
        <i class="pi pi-chevron-right text-muted2 mt-2"></i>
      </button>
    </div>

    <AppFooter />
  </div>
</template>
