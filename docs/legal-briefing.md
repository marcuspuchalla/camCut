# Briefing für den Anwalt (Fachanwalt für IT-Recht)

**Zweck:** Diese Seite ist die Vorbereitung für **ein** Beratungsgespräch. Sie
enthält den Sachverhalt und die konkreten Fragen, damit die Stunde nicht mit
Erklären draufgeht.

**Wichtig:** Dieses Dokument ist **keine Rechtsberatung**. Es wurde von einem
KI-Assistenten auf Basis öffentlicher Quellen erstellt. Die Einschätzungen sind
Diskussionsgrundlage, nicht geprüftes Recht.

---

## 1. Sachverhalt in fünf Sätzen

Baby Cam Cut ist eine kostenlose, quelloffene (GPL-3.0) Web-App (PWA), die Bild
und Ton live von einem Gerät des Nutzers auf ein anderes überträgt. Die
Medienübertragung läuft Ende-zu-Ende-verschlüsselt peer-to-peer (WebRTC); ein
selbst betriebener Signaling-Server vermittelt nur den Verbindungsaufbau und
sieht die Inhalte nie. Es gibt keine Konten, keine Werbung, keine In-App-Käufe,
keine Spendenfunktion, kein Tracking und keine Datenvermarktung. Der Betreiber
ist hauptberuflich **selbständiger Freiberufler (Softwareentwickler)**, betreibt
dieses Projekt aber als **privates Hobbyprojekt** und will damit **kein Geld
verdienen**. Geplant ist die Veröffentlichung als PWA und ggf. im Apple App Store
und bei Google Play.

**Anwendungsfall:** Babyphone-Ersatz. Das ist haftungsrechtlich die ungünstigste
denkbare Konstellation, weil im Schadensfall **Personenschäden an einem
Säugling** im Raum stehen.

---

## 2. Die zentrale Frage (bitte hier zuerst ansetzen)

> **Gilt die Bereitstellung dieser App als „im Rahmen einer geschäftlichen
> Tätigkeit" — obwohl sie kostenlos und als Hobby erfolgt, der Anbieter aber
> hauptberuflich Freiberufler im selben Fachgebiet (Software) ist?**

Diese eine Frage entscheidet **gleichzeitig** über vier Regelwerke, die alle
dasselbe Tatbestandsmerkmal verwenden:

| Regelwerk | Ausnahme hängt an |
|---|---|
| **Produkthaftungs-RL (EU) 2024/2853** (Umsetzung bis 09.12.2026) | Art. 2 Abs. 2: FOSS „developed or supplied **outside the course of a commercial activity**" |
| **Cyber Resilience Act (EU) 2024/2847** | Art. 3 Nr. 22: „making available … **in the course of a commercial activity**", ausdrücklich auch „free of charge" |
| **GPSR (EU) 2023/988** | Art. 3 Nr. 2: Abgabe „**im Rahmen einer Geschäftstätigkeit**", entgeltlich oder unentgeltlich |
| **ProdHaftG § 1 Abs. 2 Nr. 3** (geltendes Recht) | „weder für Verkauf/Vertrieb mit wirtschaftlichem Zweck … **noch im Rahmen seiner beruflichen Tätigkeit**" (kumulativ!) |

### Warum das existenziell ist

Die neue PLD erfasst **Software ausdrücklich als Produkt** (Art. 4) und begründet
eine **verschuldensunabhängige Haftung** für Personenschäden. Nach **§ 14
ProdHaftG** ist diese Haftung **nicht abdingbar** — kein Disclaimer, keine AGB,
keine Nutzungsbedingung hilft dagegen. Greift die FOSS-Ausnahme nicht, haftet
eine Privatperson verschuldensunabhängig für Personenschäden an einem Säugling.

Die CRA-Herstellerpflichten (CE-Kennzeichnung, Konformitätsbewertung, **5 Jahre
Supportzusage**, 24-Stunden-Meldefristen) sind für eine Einzelperson faktisch
nicht erfüllbar.

### Konkrete Unterfragen

1. Reicht die **subjektive Hobby-Absicht**, oder kommt es auf das **objektive
   Auftreten nach außen** an?
2. Schadet es, dass der Anbieter **im selben Fachgebiet** freiberuflich tätig ist
   — auch ohne jeden Bezug zwischen App und Auftragsarbeit?
3. Schadet der **selbst betriebene Signaling-Server**? Er ist kostenlos, aber ein
   fortlaufend betriebener „Dienst" und nicht bloßes Code-Sharing.
4. **Ist die Veröffentlichung im App Store / bei Google Play als solche schon
   „commercial activity"?** → In der Literatur **ausdrücklich als ungeklärt**
   bezeichnet. Das ist der wichtigste offene Punkt.
5. Wenn ja: Ist die Konsequenz, **auf die Stores ganz zu verzichten** und nur als
   PWA über die eigene Website zu verteilen?

---

## 3. Trader-Status im App Store (Art. 30, 31 DSA)

Apple verlangt eine **verbindliche Erklärung**: Trader oder Non-Trader. Ohne
Erklärung → **Entfernung aus allen 27 EU-Storefronts** (seit 17.02.2025 in
Kraft, wurde real durchgesetzt).

- Apples Kriterien nennen u.a. „**Whether you're registered for VAT purposes**"
  und „whether you develop your app **in connection with your trade, business,
  craft, or profession**". Apple sagt ausdrücklich: „Apple can't determine
  whether you're a trader."
- Apples Hobbyist-Beispiel: „if you're a hobbyist and you developed your app
  **with no intention of commercializing it**, you may not be considered a
  trader."

> **Frage:** Kann der Anbieter — als registrierter Freiberufler mit USt-IdNr. —
> guten Gewissens **Non-Trader** erklären, wenn diese konkrete App kostenlos,
> hobbymäßig und ohne Kommerzialisierungsabsicht entsteht?

> **Anschlussfrage:** Wie hoch ist das Risiko, dass eine **Trader-Erklärung**
> gegenüber Apple später als Beweis für „commercial activity" i.S.d. PLD/CRA
> gegen ihn verwendet wird? Er kann schlecht gegenüber Apple „Trader" erklären
> und gegenüber einem Geschädigten „nicht-kommerziell" argumentieren.

*(Falls Trader: Apple erlaubt für Einzelpersonen ausdrücklich ein **Postfach**
statt der Privatanschrift, gegen Nachweis der Zuordnung — z. B. eine Rechnung.)*

---

## 4. Zielkonflikt Impressum ↔ Nicht-Kommerzialität

**§ 5 DDG** trifft **geschäftsmäßige** digitale Dienste. Ein reines
Hobbyprojekt ist möglicherweise **nicht** impressumspflichtig — ein Impressum,
das den Anbieter als Unternehmer ausweist, ist aber genau das Gegenteil der
Nicht-Kommerzialitäts-Argumentation.

**Aktueller Stand (bewusst so umgesetzt, bitte prüfen):**
- Impressum bleibt vorhanden (Fehlen = OWi bis 50.000 €; Vorhandensein schadet
  im Zweifel weniger).
- **USt-IdNr. wurde entfernt** — sie ist das schärfste Signal für gewerbliches
  Handeln.
- Ein Absatz „Art des Angebots" stellt die Nicht-Kommerzialität ausdrücklich klar.
- Verweise auf **TMG → DDG** aktualisiert (TMG seit 14.05.2024 ersetzt).

> **Fragen:** Ist das die richtige Balance? Muss die USt-IdNr. trotzdem rein?
> Ist § 18 Abs. 2 MStV nötig, wenn es einen News-/Changelog-Bereich gibt (bloße
> Produktinformation, nicht journalistisch-redaktionell)?

---

## 5. Haftungsklausel — bitte gegenlesen

Die Nutzungsbedingungen (`/nutzungsbedingungen`) sind bewusst so gebaut:

- **Kein pauschaler Haftungsausschluss.** Begründung: § 309 Nr. 7a BGB macht den
  Ausschluss für Leben/Körper/Gesundheit **immer** unwirksam, und § 306 BGB kennt
  **keine geltungserhaltende Reduktion** — die Klausel fällt ersatzlos weg und es
  gilt das volle gesetzliche Haftungsrecht. Ein zu weiter Disclaimer ist also
  **schlechter als keiner**.
- Stattdessen wird **§ 521 BGB deklaratorisch wiedergegeben** (Schenkung → nur
  Vorsatz und grobe Fahrlässigkeit; nach h.M./BGH auch auf konkurrierende
  § 823-Ansprüche erstreckt). Deklaratorische Klauseln unterliegen nach **§ 307
  Abs. 3 S. 1 BGB** keiner Inhaltskontrolle.
- ProdHaftG, Vorsatz, grobe Fahrlässigkeit, Arglist (§§ 523, 524) und Garantie
  sind ausdrücklich **ausgenommen**.
- Getrennt davon: **keine Beschaffenheitsgarantie** — Haftung lässt sich kaum
  begrenzen, aber man kann vermeiden, überhaupt etwas zu versprechen.

> **Fragen:** Trägt die Schenkungs-Qualifikation (§§ 516 ff. BGB) hier, obwohl es
> keinen Account und keinen erkennbaren Vertragsschluss gibt? Ist die Klausel
> wirksam? Fehlt etwas?

---

## 6. Zweckbestimmung / MDR

Ein Produkt wird zum **Medizinprodukt**, wenn der Hersteller es zur Überwachung
physiologischer Vorgänge bestimmt (Art. 2 Nr. 1 MDR). **Atmung ist ein
physiologischer Vorgang.** Die Zweckbestimmung ergibt sich aus der
**Gesamtdarstellung inkl. Werbematerial**.

Umgesetzt: Warnhinweis „kein Medizinprodukt, kein Sicherheitsgerät, keine
Vitalfunktionen, nur für gesunde Kinder, ersetzt keine Aufsicht, **ein Ausfall
wird möglicherweise nicht angezeigt**" — ganz oben auf der Bedingungenseite.
Store-Kategorie: **Utilities**, nicht Health/Medical.

> **Frage (echter Zielkonflikt):** Wäre eine **Verbindungsabbruch-Anzeige** oder
> ein Ton bei Verbindungsverlust haftungsrechtlich **hilfreich** (sie verwandelt
> den gefährlichsten Fehlerfall — den *stillen* Ausfall — in einen erkennbaren
> und erfüllt die Instruktionspflicht) oder **schädlich** (weil ein „Alarm" als
> Sicherheitsfunktion die Zweckbestimmung Richtung MDR verschiebt)?

---

## 7. Datenschutz

- **Kein Tracking mehr.** Umami wurde vollständig entfernt (auch wegen PLD
  ErwGr. 14: Nutzung personenbezogener Daten zu anderen Zwecken als Sicherheit/
  Kompatibilität/Interoperabilität kann die FOSS-Ausnahme kippen).
- **Google Fonts** wurden self-hosted (LG München I, 3 O 17493/20).
- Usage-Messung jetzt: **reine Zähler** auf dem Signaling-Server (keine IPs,
  keine Kennungen, kein Geräte-Zugriff → § 25 TDDDG nicht einschlägig).

### TURN / STUN — technisch geprüft, zwei offene Punkte

`server/net.js` wurde geprüft. Befund:

**a) STUN läuft gegen Google.** Default sind
`stun:stun.l.google.com:19302` / `stun1.l.google.com`. Bei **jedem**
Verbindungsaufbau wird damit die **IP-Adresse des Nutzers an Google
übermittelt** — strukturell dasselbe Problem wie bei Google Fonts (LG München I),
nur nicht beim Seitenaufruf, sondern beim Verbindungsaufbau.

> **Fragen:** Ist das genauso zu bewerten wie Google Fonts? Genügt die
> Offenlegung in der Datenschutzerklärung (Art. 6 Abs. 1 lit. f), oder braucht
> es einen Wechsel? *Technisch wäre ein Wechsel einfach:* eigener coturn (liegt
> in `turn/` bereits vor) oder ein EU-STUN-Dienst. **Empfehlung: wechseln** —
> es kostet fast nichts und beseitigt die Parallele zum Google-Fonts-Fall.

**b) TURN relayed die Babyvideos, falls konfiguriert.** Empfohlen und vorbereitet
ist **Cloudflare Realtime TURN** (`TURN_KEY_ID` / `TURN_KEY_API_TOKEN`), Fallback
ist ein eigener coturn. TURN greift, wenn keine direkte Verbindung möglich ist
(symmetrisches NAT, Mobilfunk) — realistisch **10–20 % der Verbindungen**.

Ist Cloudflare aktiv, laufen die **(DTLS-SRTP-verschlüsselten) Bild- und
Tonströme des Kindes über Cloudflare**. Inhaltlich nicht lesbar, aber
**Verarbeitung i.S.d. Art. 4 Nr. 2 DSGVO**.

> **Fragen:** (1) Braucht es einen **AVV** mit Cloudflare, und reicht deren
> Standard-DPA? (2) **Drittlandtransfer** (Cloudflare US-Konzern) — genügen SCCs
> / DPF? (3) Löst das eine **DSFA (Art. 35)** aus — Videodaten von Kindern,
> besonders schutzbedürftige Personen? (4) Wäre **eigener coturn in der EU** die
> sauberere Wahl, auch wenn er Bandbreite kostet?

> **Entscheidung, die daran hängt:** TURN ganz weglassen wäre datenschutzrechtlich
> am saubersten, würde aber „Hotel mode über verschiedene Netze" praktisch
> unbrauchbar machen. Das ist ein Produkt-/Recht-Abwägung, keine reine Technikfrage.

---

## 8. Was ich zusätzlich ansprechen würde

**Berufshaftpflicht mit ausdrücklichem Einschluss der Produkthaftung für
Software.** Falls die FOSS-Ausnahme wackelt, ist das die einzige verbleibende
Absicherung — AGB helfen gegen ProdHaftG nicht (§ 14 ProdHaftG).

---

## 9. Erledigt / nicht zu klären

| Thema | Status |
|---|---|
| **BFSG** (Barrierefreiheit) | Gilt **nicht** — kein Vertragsschluss (keine „Dienstleistung im elektronischen Geschäftsverkehr"), zusätzlich Kleinstunternehmen-Ausnahme. Doppelt abgesichert. |
| **Datenschutzbeauftragter** | Nicht nötig (§ 38 BDSG: erst ab 20 Personen). |
| **Cookie-Banner** | Nicht nötig — kein Tracking, keine Cookies, kein LocalStorage-Zugriff zu Analysezwecken. |
| **Open-Source-Steward (CRA)** | Trifft nicht zu — setzt eine **juristische Person** voraus (Art. 3 Nr. 14). |

---

## 10. Priorität

1. **§ 2 (commercial activity)** — entscheidet alles andere.
2. **§ 3 (Trader-Status)** — muss vor dem Store-Onboarding stehen, ist danach
   schwer zu korrigieren.
3. **§ 7 (TURN)** — vorher technisch klären.
4. Rest ist Feinschliff.
