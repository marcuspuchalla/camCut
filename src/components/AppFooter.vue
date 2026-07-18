<script setup lang="ts">
import { RouterLink } from "vue-router";

const version = `v${__APP_VERSION__} · built ${__BUILD_TIME__}`;
</script>

<template>
  <footer
    class="shrink-0 px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-line text-center text-muted2 text-xs flex flex-col gap-1.5"
  >
    <p class="m-0">Peer-to-peer · your video and sound stay between your devices</p>
    <p class="m-0 text-[#ffb3c1]">
      Not a safety device · doesn't watch your child for you · used at your own risk · never replaces adult
      supervision
    </p>
    <nav class="flex gap-2 justify-center flex-wrap">
      <RouterLink to="/news" class="text-muted hover:text-moon">What's new</RouterLink>
      <span>·</span>
      <RouterLink to="/impressum" class="text-muted hover:text-moon">Impressum</RouterLink>
      <span>·</span>
      <RouterLink to="/datenschutz" class="text-muted hover:text-moon">Datenschutz</RouterLink>
      <span>·</span>
      <RouterLink to="/nutzungsbedingungen" class="text-muted hover:text-moon">Nutzungsbedingungen</RouterLink>
    </nav>
    <p class="m-0 font-mono text-[0.72rem] text-muted2">{{ version }}</p>
  </footer>
</template>
