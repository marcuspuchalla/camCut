<script setup lang="ts">
import { RouterLink } from "vue-router";
</script>

<template>
  <div class="max-w-2xl mx-auto px-5 py-10 leading-relaxed text-[#c7ccea]">
    <RouterLink to="/" class="font-round font-semibold text-[#ffd0a8] no-underline hover:underline">← Zurück</RouterLink>
    <h1 class="font-round font-bold text-2xl mt-6 mb-2 text-ink">Datenschutzerklärung</h1>

    <p class="text-mint">
      Kurzfassung: Baby Cam Cut überträgt Video direkt zwischen deinen Geräten (Peer-to-Peer). Keine Konten, keine
      Aufzeichnung. Zur Reichweitenmessung wird das cookiefreie, selbst gehostete Umami eingesetzt.
    </p>

    <h2 class="font-round font-semibold text-lg mt-7 mb-1 text-moon">1. Verantwortliche Stelle</h2>
    <p>
      Verantwortlich für die Datenverarbeitung auf dieser Website im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:
    </p>
    <p class="my-1">Marcus Puchalla</p>
    <p class="my-1">Gorkistraße 88</p>
    <p class="my-1">04347 Leipzig</p>
    <p class="my-1">Deutschland</p>
    <p class="my-1">E-Mail: <a href="mailto:marcus@puchalla.dev" class="text-[#ffd0a8]">marcus@puchalla.dev</a></p>

    <h2 class="font-round font-semibold text-lg mt-7 mb-1 text-moon">2. Erhebung von Zugriffsdaten (Server-Logfiles)</h2>
    <p>
      Beim Aufruf dieser Website werden durch den Hosting-Provider automatisch technisch notwendige Informationen
      erfasst und in sogenannten Server-Logfiles gespeichert (u. a. IP-Adresse, Datum und Uhrzeit des Zugriffs,
      aufgerufene Seite, Referrer-URL, verwendeter Browser und dessen Version, Betriebssystem). Rechtsgrundlage ist
      Art. 6 Abs. 1 lit. f DSGVO; das berechtigte Interesse besteht in einem stabilen, sicheren Betrieb der Website.
      Die Daten werden nach kurzer Zeit gelöscht, sofern keine Anhaltspunkte für einen missbräuchlichen Zugriff
      vorliegen.
    </p>

    <h2 class="font-round font-semibold text-lg mt-7 mb-1 text-moon">3. Reichweitenmessung mit Umami</h2>
    <p>
      Diese Website nutzt zur Reichweitenanalyse die selbst gehostete Open-Source-Software Umami (geladen von
      a.fmp.dev, betrieben vom Verantwortlichen dieser Website). Umami arbeitet cookiefrei und speichert keine
      personenbezogenen Daten. Erfasst werden ausschließlich aggregierte, anonymisierte Statistiken wie aufgerufene
      Seiten, Referrer, ungefähre Region (auf Basis der anonymisierten IP-Adresse) und Gerätetyp. Ein Rückschluss auf
      einzelne Nutzer ist nicht möglich. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO; das berechtigte Interesse
      besteht darin, die Nutzung der Website zu verstehen und diese verbessern zu können.
    </p>

    <h2 class="font-round font-semibold text-lg mt-7 mb-1 text-moon">4. Video- und Audioübertragung (WebRTC)</h2>
    <p>
      Die Kamerabilder werden über WebRTC direkt zwischen den beteiligten Geräten übertragen (Peer-to-Peer). Sie
      werden nicht auf dem Server gespeichert und im Normalfall nicht über den Server geleitet. Es findet keine
      Aufzeichnung statt.
    </p>

    <h2 class="font-round font-semibold text-lg mt-7 mb-1 text-moon">5. Verbindungsaufbau (Signaling)</h2>
    <p>
      Zum Herstellen der Verbindung tauschen die Geräte über einen Signaling-Server technische Verbindungsdaten aus
      (zufällige Raum-ID, IP-Adressen und ICE-Kandidaten, Zeitpunkt). IP-Adressen sind personenbezogen; die
      Verarbeitung erfolgt flüchtig zum Verbindungsaufbau (Art. 6 Abs. 1 lit. b und f DSGVO) und wird nicht dauerhaft
      gespeichert.
    </p>

    <h2 class="font-round font-semibold text-lg mt-7 mb-1 text-moon">6. STUN-/TURN-Server</h2>
    <p>
      Für den Verbindungsaufbau werden STUN-Server genutzt (u. a. stun.l.google.com). Ist eine direkte Verbindung
      nicht möglich, kann ein TURN-Server den verschlüsselten Stream weiterleiten; dabei werden IP-Adressen und
      Mediendaten an den jeweiligen Anbieter übermittelt.
    </p>

    <h2 class="font-round font-semibold text-lg mt-7 mb-1 text-moon">7. Offline-/Hotel-Modus</h2>
    <p>
      Im Offline-/Hotel-Modus verbinden sich zwei Geräte direkt über ein gemeinsames Netzwerk bzw. einen persönlichen
      Hotspot. Der Verbindungsaufbau erfolgt ausschließlich lokal über QR-Codes; es werden keine Server verwendet und
      keine Daten an Dritte übermittelt.
    </p>

    <h2 class="font-round font-semibold text-lg mt-7 mb-1 text-moon">8. Speicherung auf deinem Gerät</h2>
    <p>
      Im lokalen Speicher deines Geräts werden nur die Raum-ID und der zuletzt gewählte Bildausschnitt abgelegt. Diese
      Daten verlassen dein Gerät nicht. Als installierbare App (PWA) werden zudem die Programmdateien im Browser-Cache
      abgelegt, damit die App offline funktioniert. Es werden keine Analyse- oder Werbe-Cookies gesetzt.
    </p>

    <h2 class="font-round font-semibold text-lg mt-7 mb-1 text-moon">9. Schriftarten</h2>
    <p>
      Die Oberfläche lädt „Baloo 2" von Google Fonts (IP-Übermittlung an Google); fällt der Dienst aus oder bist du
      offline, wird eine System-Schriftart genutzt.
    </p>

    <h2 class="font-round font-semibold text-lg mt-7 mb-1 text-moon">10. Deine Rechte</h2>
    <p>Du hast nach den Vorgaben der DSGVO folgende Rechte gegenüber dem Verantwortlichen:</p>
    <ul class="list-disc pl-5 my-2 space-y-0.5">
      <li>Recht auf Auskunft (Art. 15 DSGVO)</li>
      <li>Recht auf Berichtigung (Art. 16 DSGVO)</li>
      <li>Recht auf Löschung (Art. 17 DSGVO)</li>
      <li>Recht auf Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
      <li>Recht auf Datenübertragbarkeit (Art. 20 DSGVO)</li>
      <li>Recht auf Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)</li>
    </ul>
    <p>
      Zur Ausübung deiner Rechte genügt eine formlose Nachricht an
      <a href="mailto:marcus@puchalla.dev" class="text-[#ffd0a8]">marcus@puchalla.dev</a>.
    </p>

    <h2 class="font-round font-semibold text-lg mt-7 mb-1 text-moon">11. Beschwerderecht bei der Aufsichtsbehörde</h2>
    <p>
      Du hast das Recht, dich bei einer Datenschutz-Aufsichtsbehörde zu beschweren (Art. 77 DSGVO). Zuständig für
      Sachsen ist:
    </p>
    <p class="my-1">Sächsische Datenschutz- und Transparenzbeauftragte</p>
    <p class="my-1">Devrientstraße 1</p>
    <p class="my-1">01067 Dresden</p>
    <p class="my-1">
      <a href="https://datenschutz.sachsen.de" class="text-[#ffd0a8]" target="_blank" rel="noopener"
        >datenschutz.sachsen.de</a
      >
    </p>

    <h2 class="font-round font-semibold text-lg mt-7 mb-1 text-moon">12. Aktualität und Änderung dieser Erklärung</h2>
    <p>
      Diese Datenschutzerklärung ist aktuell gültig und hat den Stand Juli 2026. Durch die Weiterentwicklung der
      Website oder aufgrund geänderter gesetzlicher Vorgaben kann eine Anpassung notwendig werden. Die jeweils
      aktuelle Fassung kann jederzeit auf dieser Seite abgerufen werden.
    </p>
  </div>
</template>
