<script setup lang="ts">
import { computed } from "vue";
import BrandHeader from "../components/BrandHeader.vue";
import { news, type NewsEntry } from "../news";

const kindLabel: Record<NewsEntry["kind"], string> = {
  new: "New",
  improved: "Improved",
  fixed: "Fixed",
};

const kindClass: Record<NewsEntry["kind"], string> = {
  new: "bg-mint/15 text-mint border-mint/30",
  improved: "bg-glow-a/15 text-glow-a border-glow-a/30",
  fixed: "bg-moon/15 text-moon border-moon/30",
};

/** Group by release so the page reads as a history, not a flat list. */
const releases = computed(() => {
  const byVersion = new Map<string, { version: string; date: string; entries: NewsEntry[] }>();
  for (const e of news) {
    const r = byVersion.get(e.version) ?? { version: e.version, date: e.date, entries: [] };
    r.entries.push(e);
    byVersion.set(e.version, r);
  }
  return [...byVersion.values()];
});

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
</script>

<template>
  <div class="w-full max-w-xl mx-auto px-5 py-6 flex-1 flex flex-col">
    <BrandHeader back />

    <div class="mb-6">
      <p class="font-round font-semibold uppercase tracking-[2px] text-xs text-[#ffbe86] mb-1">What's new</p>
      <h1 class="font-round font-bold text-2xl leading-tight m-0">Changes you can see</h1>
      <p class="text-muted text-sm mt-2 leading-relaxed">
        Every update that changes something you can see, hear or do. Behind-the-scenes work isn't listed here.
      </p>
    </div>

    <div class="flex flex-col gap-7">
      <section v-for="r in releases" :key="r.version">
        <div class="flex items-baseline gap-2 mb-3">
          <h2 class="font-round font-bold text-lg m-0">Version {{ r.version }}</h2>
          <span class="text-muted2 text-xs">{{ fmt(r.date) }}</span>
        </div>

        <div class="flex flex-col gap-3">
          <article
            v-for="e in r.entries"
            :key="e.title"
            class="rounded-2xl border border-line bg-night-700 p-4"
          >
            <div class="flex items-center gap-2 mb-1.5">
              <span
                class="text-[0.68rem] font-round font-bold uppercase tracking-wide border rounded-full px-2 py-0.5"
                :class="kindClass[e.kind]"
                >{{ kindLabel[e.kind] }}</span
              >
            </div>
            <h3 class="font-round font-bold text-base m-0 mb-1">{{ e.title }}</h3>
            <p class="text-muted text-sm m-0 leading-relaxed">{{ e.body }}</p>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>
