<script setup lang="ts">
import { RouterLink } from "vue-router";

const version = `v${__APP_VERSION__} · built ${__BUILD_TIME__}`;
</script>

<template>
  <footer class="mt-auto pt-4 text-center text-muted2 text-xs flex flex-col gap-1.5">
    <p class="m-0">Peer-to-peer · your video stays between your devices</p>
    <nav class="flex gap-2 justify-center">
      <RouterLink to="/impressum" class="text-muted hover:text-moon">Impressum</RouterLink>
      <span>·</span>
      <RouterLink to="/datenschutz" class="text-muted hover:text-moon">Datenschutz</RouterLink>
    </nav>
    <p class="m-0 font-mono text-[0.72rem] text-muted2">{{ version }}</p>
  </footer>
</template>
