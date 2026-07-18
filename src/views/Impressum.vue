<script setup lang="ts">
import { RouterLink } from "vue-router";
</script>

<template>
  <div class="w-full flex-1 max-w-2xl mx-auto px-5 py-10 leading-relaxed text-[#c7ccea]">
    <RouterLink to="/" class="font-round font-semibold text-[#ffd0a8] no-underline hover:underline">← Zurück</RouterLink>
    <h1 class="font-round font-bold text-2xl mt-6 mb-2 text-ink">Impressum</h1>

    <h2 class="font-round font-semibold text-lg mt-7 mb-1 text-moon">Angaben gemäß § 5 DDG</h2>
    <p class="my-1">Marcus Puchalla</p>
    <p class="my-1">Gorkistraße 88</p>
    <p class="my-1">04347 Leipzig</p>
    <p class="my-1">Deutschland</p>

    <h2 class="font-round font-semibold text-lg mt-7 mb-1 text-moon">Kontakt</h2>
    <p class="my-1">E-Mail: <a href="mailto:marcus@puchalla.dev" class="text-[#ffd0a8]">marcus@puchalla.dev</a></p>

    <!-- Deliberately no USt-IdNr here: Baby Cam Cut is a private, non-commercial
         hobby project and is not offered in the course of a trade or profession.
         A VAT ID would say the opposite, and that single line could cost the
         non-commercial exemptions under the EU Product Liability Directive
         2024/2853 and the Cyber Resilience Act. See docs/legal-briefing.md. -->

    <h2 class="font-round font-semibold text-lg mt-7 mb-1 text-moon">Art des Angebots</h2>
    <p class="my-1">
      Baby Cam Cut ist ein privates, nicht-kommerzielles Hobbyprojekt. Es wird kostenlos angeboten — ohne
      Werbung, ohne In-App-Käufe, ohne Spendenfunktion, ohne Konten und ohne Vermarktung von Daten. Das Angebot
      erfolgt nicht im Rahmen einer gewerblichen oder beruflichen Tätigkeit.
    </p>

    <h2 class="font-round font-semibold text-lg mt-7 mb-1 text-moon">Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
    <p class="my-1">Marcus Puchalla</p>
    <p class="my-1">Gorkistraße 88</p>
    <p class="my-1">04347 Leipzig</p>

    <h2 class="font-round font-semibold text-lg mt-8 mb-1 text-moon">Haftungsausschluss</h2>

    <h3 class="font-round font-semibold mt-4 mb-1 text-[#e6b877]">Haftung für Inhalte</h3>
    <p class="my-1">
      Die Inhalte dieser Seiten wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und
      Aktualität der Inhalte kann ich jedoch keine Gewähr übernehmen. Als Diensteanbieter bin ich gemäß § 7 Abs. 1
      DDG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG
      bin ich als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen
      zu überwachen.
    </p>

    <h3 class="font-round font-semibold mt-4 mb-1 text-[#e6b877]">Haftung für Links</h3>
    <p class="my-1">
      Diese Website enthält Links zu externen Webseiten Dritter, auf deren Inhalte ich keinen Einfluss habe. Deshalb
      kann ich für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets
      der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.
    </p>

    <h3 class="font-round font-semibold mt-4 mb-1 text-[#e6b877]">Urheberrecht</h3>
    <p class="my-1">
      Die durch den Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen
      Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen
      des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
    </p>

    <h3 class="font-round font-semibold mt-4 mb-1 text-[#e6b877]">Streitschlichtung</h3>
    <p class="my-1">
      Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:
      <a href="https://ec.europa.eu/consumers/odr/" class="text-[#ffd0a8]" target="_blank" rel="noopener"
        >https://ec.europa.eu/consumers/odr/</a
      >. Meine E-Mail-Adresse finden Sie oben im Impressum.
    </p>
    <p class="my-1">
      Ich bin nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle
      teilzunehmen.
    </p>

    <hr class="border-0 border-t border-line my-8" />
    <p class="text-muted text-sm">
      Baby Cam Cut ist ein privates, quelloffenes Projekt (GPL-3.0). Quellcode:
      <a href="https://github.com/marcuspuchalla/camCut" class="text-[#ffd0a8]" target="_blank" rel="noopener"
        >github.com/marcuspuchalla/camCut</a
      >.
    </p>
  </div>
</template>
