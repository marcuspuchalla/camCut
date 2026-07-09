<script setup lang="ts">
import type { CapNotice } from "../composables/useCapabilities";

defineProps<{ note: CapNotice }>();

const icon: Record<CapNotice["severity"], string> = {
  blocker: "pi pi-ban",
  warn: "pi pi-exclamation-triangle",
  info: "pi pi-info-circle",
};
</script>

<template>
  <div
    class="flex gap-3 rounded-xl border px-3.5 py-3 text-sm leading-relaxed"
    :class="{
      'border-glow-b/40 bg-glow-b/10 text-[#ffd6d8]': note.severity === 'blocker',
      'border-glow-a/40 bg-glow-a/10 text-[#ffe0bd]': note.severity === 'warn',
      'border-line bg-night-700 text-muted': note.severity === 'info',
    }"
    role="note"
  >
    <i
      :class="[
        icon[note.severity],
        'mt-0.5',
        note.severity === 'blocker' ? 'text-glow-b' : note.severity === 'warn' ? 'text-glow-a' : 'text-moon',
      ]"
    ></i>
    <span class="flex-1">
      <span class="block font-round font-semibold text-[0.92rem]">{{ note.title }}</span>
      <span class="block mt-0.5 opacity-90">{{ note.detail }}</span>
    </span>
  </div>
</template>
