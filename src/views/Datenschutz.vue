<script setup lang="ts">
import { RouterLink } from "vue-router";
</script>

<template>
  <div class="w-full flex-1 max-w-2xl mx-auto px-5 py-10 leading-relaxed text-[#c7ccea]">
    <RouterLink to="/" class="font-round font-semibold text-[#ffd0a8] no-underline hover:underline">← Zurück</RouterLink>
    <h1 class="font-round font-bold text-2xl mt-6 mb-2 text-ink">Datenschutzerklärung</h1>

    <p class="text-mint">
      Kurzfassung: Baby Cam Cut überträgt Bild und Ton direkt zwischen deinen Geräten (Peer-to-Peer). Keine
      Konten, keine Aufzeichnung, kein Tracking, keine Cookies. Die Oberfläche lädt keine Inhalte von fremden
      Servern. Für den Verbindungsaufbau werden allerdings STUN-/TURN-Dienste kontaktiert — siehe Abschnitt 6.
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

    <h2 class="font-round font-semibold text-lg mt-7 mb-1 text-moon">3. Kein Tracking, keine Cookies</h2>
    <p>
      Diese Website und die App setzen <strong>keine Analyse-Software, kein Tracking und keine Cookies</strong>
      ein. Es werden keine Einwilligungen nach § 25 TDDDG benötigt, weil auf deinem Endgerät weder Informationen
      gespeichert noch ausgelesen werden.
    </p>
    <p class="mt-2">
      Um zu erkennen, wie oft die App genutzt wird, zählt der Verbindungsdienst lediglich zwei Gesamtzahlen:
      wie oft eine Kamera gestartet und wie oft eine Verbindung hergestellt wurde. Das sind reine Zähler ohne
      IP-Adressen, ohne Kennungen und ohne Zeitpunkte einzelner Personen. Ein Personenbezug entsteht dabei nicht.
    </p>

    <h2 class="font-round font-semibold text-lg mt-7 mb-1 text-moon">4. Video- und Audioübertragung (WebRTC)</h2>
    <p>
      Bild <strong>und Ton</strong> werden über WebRTC direkt zwischen den beteiligten Geräten übertragen
      (Peer-to-Peer) und dabei Ende-zu-Ende verschlüsselt (DTLS-SRTP). Sie werden nicht auf dem Server
      gespeichert und im Normalfall nicht über den Server geleitet. Es findet <strong>keine Aufzeichnung</strong>
      statt — weder von Bild noch von Ton.
    </p>
    <p class="mt-2">
      Das Mikrofon des Kamerageräts wird zusammen mit der Kamera aktiviert und kann jederzeit auf beiden Seiten
      stummgeschaltet werden. Die Aufnahme verlässt dein Gerät ausschließlich als verschlüsselter Direktstream an
      dein zweites Gerät.
    </p>
    <p class="mt-2">
      <strong>Kinder als Betroffene:</strong> Die übertragenen Bild- und Tondaten betreffen typischerweise ein
      Kind. Diese Daten sind für den Anbieter zu keinem Zeitpunkt zugänglich; sie fließen ausschließlich zwischen
      den Geräten, die von den Erziehungsberechtigten kontrolliert werden. Eine Verarbeitung durch den Anbieter
      findet insoweit nicht statt.
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
      Für den Verbindungsaufbau wird ausschließlich ein vom Betreiber dieser Instanz selbst betriebener
      STUN-/TURN-Server genutzt; es werden keine STUN-Server von Google oder anderen Dritten kontaktiert. Ist eine
      direkte Verbindung nicht möglich, kann dieser Server den verschlüsselten Stream weiterleiten; er kann die
      Inhalte nicht einsehen. Dabei werden IP-Adressen flüchtig zum Verbindungsaufbau verarbeitet (Art. 6 Abs. 1
      lit. b und f DSGVO).
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
      Die Schriftart „Baloo 2" wird <strong>direkt von diesem Server</strong> ausgeliefert und nicht von Google
      Fonts geladen. Beim Aufruf der Oberfläche werden dadurch keine Inhalte von Servern Dritter geladen und
      keine Daten an Google übermittelt.
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
