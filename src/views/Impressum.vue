<script setup lang="ts">
import { RouterLink } from "vue-router";
</script>

<template>
  <div class="max-w-2xl mx-auto px-5 py-10 leading-relaxed">
    <RouterLink to="/" class="font-round font-semibold text-[#ffd0a8] no-underline hover:underline">← Zurück</RouterLink>
    <h1 class="font-round font-bold text-2xl mt-6 mb-2">Impressum</h1>

    <h2 class="font-round font-semibold text-lg mt-7 mb-1 text-moon">Angaben gemäß § 5 DDG</h2>
    <p class="my-1 text-[#c7ccea]">Marcus Puchalla</p>
    <p class="my-1 text-[#e6b877]">[Straße und Hausnummer]</p>
    <p class="my-1 text-[#e6b877]">[PLZ und Ort]</p>

    <h2 class="font-round font-semibold text-lg mt-7 mb-1 text-moon">Kontakt</h2>
    <p class="my-1 text-[#c7ccea]">
      E-Mail: <a href="mailto:marcus.puchalla@googlemail.com" class="text-[#ffd0a8]">marcus.puchalla@googlemail.com</a>
    </p>

    <h2 class="font-round font-semibold text-lg mt-7 mb-1 text-moon">Verantwortlich nach § 18 Abs. 2 MStV</h2>
    <p class="my-1 text-[#c7ccea]">Marcus Puchalla (Anschrift wie oben)</p>

    <hr class="border-0 border-t border-line my-8" />
    <p class="text-muted text-sm">
      Privates, nicht-kommerzielles Projekt. Bitte die [Klammern] vor Veröffentlichung ausfüllen; für Rechtssicherheit
      anwaltliche Prüfung empfohlen.
    </p>
  </div>
</template>
