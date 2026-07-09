<script setup lang="ts">
import { RouterLink } from "vue-router";
</script>

<template>
  <div class="max-w-2xl mx-auto px-5 py-10 leading-relaxed text-[#c7ccea]">
    <RouterLink to="/" class="font-round font-semibold text-[#ffd0a8] no-underline hover:underline">← Zurück</RouterLink>
    <h1 class="font-round font-bold text-2xl mt-6 mb-2 text-ink">Datenschutzerklärung</h1>

    <p class="text-mint">
      Kurzfassung: Baby Cam Cut überträgt Video direkt zwischen deinen Geräten (Peer-to-Peer). Keine Konten, keine
      Aufzeichnung, kein Tracking.
    </p>

    <h2 class="font-round font-semibold text-lg mt-7 mb-1 text-moon">1. Verantwortlicher</h2>
    <p>Marcus Puchalla · <a href="mailto:marcus.puchalla@googlemail.com" class="text-[#ffd0a8]">marcus.puchalla@googlemail.com</a> (Anschrift siehe <RouterLink to="/impressum" class="text-[#ffd0a8]">Impressum</RouterLink>).</p>

    <h2 class="font-round font-semibold text-lg mt-7 mb-1 text-moon">2. Video- und Audioübertragung</h2>
    <p>Die Kamerabilder werden über WebRTC direkt zwischen den Geräten übertragen, nicht auf dem Server gespeichert und im Normalfall nicht über den Server geleitet. Keine Aufzeichnung.</p>

    <h2 class="font-round font-semibold text-lg mt-7 mb-1 text-moon">3. Verbindungsaufbau (Signaling)</h2>
    <p>Zum Herstellen der Verbindung tauschen die Geräte über einen Signaling-Server technische Verbindungsdaten aus (zufällige Raum-ID, IP-Adressen und ICE-Kandidaten, Zeitpunkt). IP-Adressen sind personenbezogen; die Verarbeitung erfolgt flüchtig zum Verbindungsaufbau (Art. 6 Abs. 1 lit. b und f DSGVO) und wird nicht dauerhaft gespeichert.</p>

    <h2 class="font-round font-semibold text-lg mt-7 mb-1 text-moon">4. Speicherung auf deinem Gerät</h2>
    <p>Im lokalen Speicher werden nur die Raum-ID und der zuletzt gewählte Bildausschnitt abgelegt. Diese Daten verlassen dein Gerät nicht. Keine Analyse- oder Werbe-Cookies.</p>

    <h2 class="font-round font-semibold text-lg mt-7 mb-1 text-moon">5. STUN-/TURN-Server</h2>
    <p>Für den Verbindungsaufbau werden STUN-Server genutzt (stun.l.google.com). Ist eine direkte Verbindung nicht möglich, kann ein TURN-Server (z. B. Cloudflare) den verschlüsselten Stream weiterleiten; dabei werden IP-Adressen und Mediendaten an den Anbieter übermittelt. Im Offline-/Hotel-Modus werden keine Server verwendet.</p>

    <h2 class="font-round font-semibold text-lg mt-7 mb-1 text-moon">6. Schriftarten</h2>
    <p>Die Oberfläche lädt „Baloo 2" von Google Fonts (IP-Übermittlung an Google); fällt der Dienst aus, wird eine System-Schriftart genutzt.</p>

    <h2 class="font-round font-semibold text-lg mt-7 mb-1 text-moon">7. Deine Rechte</h2>
    <p>Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit, Widerspruch sowie Beschwerderecht bei einer Aufsichtsbehörde. Kontakt siehe oben.</p>

    <hr class="border-0 border-t border-line my-8" />
    <p class="text-muted text-sm">Vorlage; für eine rechtssichere Erklärung fachkundige Prüfung empfohlen.</p>
  </div>
</template>
