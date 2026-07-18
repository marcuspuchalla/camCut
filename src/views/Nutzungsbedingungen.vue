<script setup lang="ts">
import { RouterLink } from "vue-router";
</script>

<!--
  Legal note for whoever edits this next (agents included):

  This page deliberately does NOT say "jegliche Haftung ist ausgeschlossen".
  That is not caution, it is the opposite. A blanket exclusion is void under
  § 309 Nr. 7a BGB, and § 306 BGB gives no geltungserhaltende Reduktion — the
  void clause falls away entirely and the FULL statutory liability applies. A
  sweeping disclaimer is therefore strictly worse than none at all.

  What actually protects a free app is § 521 BGB: for a gift, the giver is
  liable only for intent and gross negligence, and the courts extend that
  privilege to competing § 823 claims. That is statutory — it works without
  being written down. A clause that merely RESTATES it is declaratory and under
  § 307 Abs. 3 BGB escapes AGB review altogether.

  So: restate the law, exclude nothing, and never promise anything.
  Reviewed by a lawyer? NOT YET — see docs/legal-briefing.md.
-->

<template>
  <div class="w-full flex-1 max-w-2xl mx-auto px-5 py-10 leading-relaxed text-[#c7ccea]">
    <RouterLink to="/" class="font-round font-semibold text-[#ffd0a8] no-underline hover:underline"
      >← Zurück</RouterLink
    >
    <h1 class="font-round font-bold text-2xl mt-6 mb-2 text-ink">Nutzungsbedingungen</h1>
    <p class="text-muted2 text-sm">Stand: Juli 2026</p>

    <!-- The safety notice goes FIRST. Buried at the bottom it would carry far
         less weight as an instruction, and instruction is its whole purpose. -->
    <div class="rounded-2xl border border-glow-b/40 bg-glow-b/5 p-5 my-7">
      <h2 class="font-round font-bold text-lg mt-0 mb-2 text-[#ffd6d8]">⚠️ Wichtiger Hinweis</h2>
      <p class="my-2">
        Baby Cam Cut ist <strong>kein Medizinprodukt</strong> und <strong>kein Sicherheitsgerät</strong>.
      </p>
      <p class="my-2">
        Die App ist ausschließlich dazu bestimmt, Bild und Ton von einem deiner Geräte auf ein anderes zu
        übertragen. Sie ist nichts weiter als eine Möglichkeit, <em>selbst</em> hinzusehen und hinzuhören — sie
        beobachtet dein Kind <strong>nicht automatisch und nicht kontinuierlich</strong>. Sie ist nicht bestimmt
        zur Diagnose, Verhütung, Überwachung, Behandlung oder Linderung von Krankheiten oder Beeinträchtigungen.
        Sie überwacht <strong>keine Vitalfunktionen</strong> — sie erkennt weder Atmung noch Bewegung — und sie
        erkennt <strong>keine Gefahrensituationen</strong>.
      </p>
      <p class="my-2">
        Die App ist ausschließlich für die Verwendung bei <strong>gesunden Kindern</strong> bestimmt und nicht
        zur Überwachung von Kindern mit gesundheitlichen Risiken geeignet.
      </p>
      <p class="my-2">
        <strong>Verlass dich nicht auf diese App.</strong> Die Übertragung kann jederzeit und ohne Vorwarnung
        ausfallen — etwa durch Netzwerkstörungen, leeren Akku, Verhalten des Betriebssystems, Updates oder
        Softwarefehler. <strong>Ein Ausfall wird dir möglicherweise nicht angezeigt.</strong>
      </p>
      <p class="my-2">
        Die App ersetzt <strong>nicht</strong> die persönliche Aufsicht durch eine erwachsene Person. Lass dein
        Kind niemals unbeaufsichtigt im Vertrauen auf diese oder eine andere technische Lösung. Die Nutzung
        erfolgt in diesem Bewusstsein <strong>auf eigene Verantwortung</strong>.
      </p>
    </div>

    <h2 class="font-round font-semibold text-lg mt-7 mb-1 text-moon">1. Anbieter und Geltungsbereich</h2>
    <p>
      Diese Bedingungen gelten für die Nutzung der App und der Website „Baby Cam Cut". Anbieter ist die im
      <RouterLink to="/impressum" class="text-[#ffd0a8]">Impressum</RouterLink> genannte Person. Baby Cam Cut ist
      ein privates, nicht-kommerzielles Hobbyprojekt.
    </p>

    <h2 class="font-round font-semibold text-lg mt-7 mb-1 text-moon">2. Gegenstand und Zweckbestimmung</h2>
    <p>
      Die App überträgt Bild und Ton live von einem Gerät zu einem anderen. Das ist ihr gesamter Zweck. Sie
      erhebt nicht den Anspruch, dein Kind automatisch oder ununterbrochen zu beobachten.
    </p>
    <p class="mt-2">Die App tut insbesondere <strong>nicht</strong>:</p>
    <ul class="list-disc pl-5 my-2 space-y-0.5">
      <li>Vitalfunktionen messen oder überwachen (keine Atem- oder Bewegungserkennung)</li>
      <li>Gefahren erkennen oder vor ihnen warnen</li>
      <li>Aufzeichnen, speichern oder auswerten</li>
    </ul>

    <h2 class="font-round font-semibold text-lg mt-7 mb-1 text-moon">3. Unentgeltlichkeit und Lizenz</h2>
    <p>
      Die Nutzung ist <strong>kostenlos</strong>. Es gibt keine Konten, keine Werbung, keine In-App-Käufe, keine
      Spendenfunktion und keine Vermarktung von Daten. Die Überlassung erfolgt schenkweise.
    </p>
    <p class="mt-2">
      Der Quellcode steht unter der GPL-3.0 zur Verfügung:
      <a href="https://github.com/marcuspuchalla/camCut" class="text-[#ffd0a8]" target="_blank" rel="noopener"
        >github.com/marcuspuchalla/camCut</a
      >. Die GPL regelt die Rechte am <em>Quellcode</em>; diese Bedingungen regeln die Nutzung des
      <em>angebotenen Dienstes</em>.
    </p>

    <h2 class="font-round font-semibold text-lg mt-7 mb-1 text-moon">4. Keine Verfügbarkeitszusage</h2>
    <p>
      Es wird keine Zusage zu Verfügbarkeit, Zuverlässigkeit, Fehlerfreiheit oder ununterbrochener Funktion
      gemacht. Der Verbindungsdienst (Signaling) kann jederzeit und ohne Ankündigung eingestellt werden. Ein
      Anspruch auf Weiterentwicklung, Updates oder Support besteht nicht.
    </p>

    <h2 class="font-round font-semibold text-lg mt-7 mb-1 text-moon">5. Deine Verantwortung</h2>
    <ul class="list-disc pl-5 my-2 space-y-0.5">
      <li>Du nutzt deine eigenen Geräte und dein eigenes Netzwerk und sorgst für Strom und Verbindung.</li>
      <li>
        Du bist für die Aufstellung der Geräte verantwortlich — halte insbesondere <strong>Kabel</strong> außer
        Reichweite des Kindes (Strangulationsgefahr).
      </li>
      <li>
        Die Nutzung ist nur an eigenen Kindern bzw. mit Einwilligung der Erziehungsberechtigten zulässig. Die
        heimliche Überwachung anderer Personen ist strafbar (§ 201a StGB).
      </li>
    </ul>

    <h2 class="font-round font-semibold text-lg mt-7 mb-1 text-moon">6. Haftung</h2>
    <p>
      Baby Cam Cut wird unentgeltlich als quelloffene Software überlassen. Nach <strong>§ 521 BGB</strong> hat
      der Anbieter bei einer unentgeltlichen Überlassung nur <strong>Vorsatz</strong> und
      <strong>grobe Fahrlässigkeit</strong> zu vertreten. Für einfache Fahrlässigkeit wird daher nicht gehaftet.
      Diese gesetzliche Haftungsmilderung gilt auch für konkurrierende Ansprüche aus unerlaubter Handlung.
    </p>
    <p class="mt-2">Unberührt und uneingeschränkt bestehen bleiben:</p>
    <ul class="list-disc pl-5 my-2 space-y-0.5">
      <li>die Haftung für Vorsatz und grobe Fahrlässigkeit;</li>
      <li>die Haftung für arglistig verschwiegene Mängel (§§ 523, 524 BGB);</li>
      <li>die Haftung nach dem Produkthaftungsgesetz;</li>
      <li>die Haftung bei Übernahme einer Garantie.</li>
    </ul>
    <p class="mt-2">
      Eine Beschränkung der Haftung für Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit
      ist mit dieser Klausel nicht verbunden; insoweit gilt die gesetzliche Haftung nach Maßgabe des § 521 BGB.
    </p>
    <p class="mt-2">
      <strong>Keine Beschaffenheitsgarantie:</strong> Es wird keine Garantie für die Verfügbarkeit,
      Zuverlässigkeit, Fehlerfreiheit oder ununterbrochene Funktion der Software übernommen. Die Software wird
      ohne jede Zusicherung einer bestimmten Beschaffenheit bereitgestellt.
    </p>

    <h2 class="font-round font-semibold text-lg mt-7 mb-1 text-moon">7. Datenschutz</h2>
    <p>
      Bild und Ton werden direkt zwischen deinen Geräten übertragen und laufen nicht über unsere Server. Details
      in der <RouterLink to="/datenschutz" class="text-[#ffd0a8]">Datenschutzerklärung</RouterLink>.
    </p>

    <h2 class="font-round font-semibold text-lg mt-7 mb-1 text-moon">8. Schlussbestimmungen</h2>
    <p>
      Es gilt deutsches Recht. Es gilt die jeweils bei der Nutzung abrufbare Fassung dieser Bedingungen. Der
      Anbieter ist nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
      Verbraucherschlichtungsstelle teilzunehmen.
    </p>
  </div>
</template>
