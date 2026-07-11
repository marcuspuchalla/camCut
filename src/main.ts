import { createApp } from "vue";
import { registerSW } from "virtual:pwa-register";
import PrimeVue from "primevue/config";
import Aura from "@primevue/themes/aura";
import "primeicons/primeicons.css";
import "./style.css";
import App from "./App.vue";
import { router } from "./router";

// Reliable auto-update. iOS PWAs cling to an old service worker, so we poll for
// a new one and reload once it takes control — this is why a fix could appear
// "not deployed" on the phone even after reopening the app.
registerSW({
  immediate: true,
  onRegisteredSW(_url, reg) {
    if (reg) setInterval(() => reg.update().catch(() => {}), 60_000);
  },
});
if ("serviceWorker" in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    location.reload();
  });
}

// The app is committed to a dark "night nursery" look.
document.documentElement.classList.add("dark");

createApp(App)
  .use(router)
  .use(PrimeVue, {
    theme: {
      preset: Aura,
      options: { darkModeSelector: ".dark", cssLayer: { name: "primevue", order: "theme, base, primevue" } },
    },
  })
  .mount("#app");
