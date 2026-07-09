import { createApp } from "vue";
import PrimeVue from "primevue/config";
import Aura from "@primevue/themes/aura";
import "primeicons/primeicons.css";
import "./style.css";
import App from "./App.vue";
import { router } from "./router";

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
