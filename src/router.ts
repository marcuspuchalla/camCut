import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";

const routes: RouteRecordRaw[] = [
  { path: "/", name: "home", component: () => import("./views/Home.vue") },
  { path: "/behind", name: "behind", component: () => import("./views/LookBehind.vue") },
  { path: "/stream", name: "stream", component: () => import("./views/StreamOut.vue") },
  { path: "/hotel", name: "hotel", component: () => import("./views/Hotel.vue") },
  { path: "/view", name: "view", component: () => import("./views/Viewer.vue") },
  { path: "/impressum", name: "impressum", component: () => import("./views/Impressum.vue") },
  { path: "/datenschutz", name: "datenschutz", component: () => import("./views/Datenschutz.vue") },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
