<script setup lang="ts">
import { computed } from "vue";
import { RouterView, useRoute } from "vue-router";
import AppFooter from "./components/AppFooter.vue";
import FirstRunNotice from "./components/FirstRunNotice.vue";

const route = useRoute();
// Every route that can lead to a live stream is gated behind the one-time
// own-risk acknowledgement; legal/info pages stay reachable without it.
const STREAM_ROUTES = new Set(["behind", "stream", "hotel", "view"]);
const needsAck = computed(() => STREAM_ROUTES.has(String(route.name ?? "")));
</script>

<template>
  <div class="min-h-dvh flex flex-col">
    <RouterView v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </RouterView>
    <FirstRunNotice v-if="needsAck" />
    <!-- global footer: version is always visible. Full-screen video views
         (Viewer, Hotel "connected") sit above it via z-index. -->
    <AppFooter />
  </div>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.18s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
@media (prefers-reduced-motion: reduce) {
  .fade-enter-active,
  .fade-leave-active {
    transition: none;
  }
}
</style>
