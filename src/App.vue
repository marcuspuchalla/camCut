<script setup lang="ts">
import { RouterView } from "vue-router";
import AppFooter from "./components/AppFooter.vue";
</script>

<template>
  <div class="min-h-dvh flex flex-col">
    <RouterView v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </RouterView>
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
