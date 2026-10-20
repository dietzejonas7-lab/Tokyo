# 🗼 Tokio Entdecker

Deine persönliche Tokio-Karte für den **1.–25. November 2026**. Die App läuft im Browser und lässt sich auf dem Handy wie eine echte App installieren.

**Kategorien**

| | Kategorie | Was drin ist |
|---|---|---|
| 🎴 | Anime & Pokémon | Pokémon Center, Akihabara, Nakano Broadway, Kartenläden … |
| 💎 | Premium-Figuren | Hochwertige Figuren & Statuen: Prime 1 Studio, Tamashii Nations, Kotobukiya, Kaiyodo … |
| 🧸 | Gachapon | Kapselautomaten-Läden – vom Rekord-Laden in Ikebukuro bis Akihabara |
| 👕 | Mode & Merch | Auffällige Mode (Anime, Gothic, Punk, japanische Designs) und zeitlich begrenzte Pop-up-Shops |
| 🏺 | Flohmärkte | Antik- und Flohmärkte, **gefiltert nach dem gewählten Tag** |
| ✨ | Illuminationen | Lichter-Events, **gefiltert nach dem gewählten Tag** |
| 🎏 | Events & Feste | Festivals, Feste und besondere Tage, **gefiltert nach dem gewählten Tag** |
| 🎡 | Attraktionen | teamLab, PokéPark KANTO, Aquarien, Aussichtstürme, Freizeitparks |
| 🌳 | Gärten | Edo-Gärten mit Teehäusern |
| 🏮 | Tempel bei Nacht | Tempel und Schreine, die abends beleuchtet sind, plus Feste wie Tori-no-Ichi (7. & 19.11.) |
| 🍁 | Herbstlaub | 62 Koyo-Orte. Die Pin-Farbe zeigt den Laub-Stand am gewählten Tag (grün → färbt sich → Höhepunkt → vorbei) |
| 🚇 | Bahnhofs-Stempel | Alle 78 offiziellen JR-East-Stempel der Tokio-Serie, 56 Toei-U-Bahn-Stationen, Metro-Museum, Ekitag & Garten-Stempelrallye – zum Abhaken |
| ⛩️ | Goshuin | 21 Tempel und Schreine mit Goshuin – zum Abhaken, mit 📷 eigenem Foto und 🔍 Beispielbildern |
| 📕 | Limitierte Goshuincho | zeitlich begrenzte Goshuin und Goshuincho, tagesaktuell gefiltert |

**Funktionen:** große Karte · Kategorien an/aus · Kalender (1.–25.11.) mit Event-Punkten · „Was läuft heute?“ · Suche (auch auf Japanisch) · Route über Google Maps · Sammel-Fortschritt · Fotos deiner Goshuin und Stempel (Galerie) · eigene Orte mit Foto · hell und dunkel · funktioniert offline.

---

## 1. App online stellen (einmalig, ca. 5 Minuten)

Damit du die App auf dem Handy öffnen kannst, muss sie im Internet liegen. Das geht kostenlos mit **GitHub Pages**:

1. Öffne dein Repository auf github.com.
2. Gehe zu **Settings** (Zahnrad oben) → links **Pages**.
3. Unter **Branch** wählst du den Branch mit der App (z. B. `main`) und den Ordner `/ (root)` → **Save**.
4. Nach 1–2 Minuten steht oben ein Link wie `https://DEIN-NAME.github.io/Tokyo/`. Das ist deine App! 🎉

> ⚠️ GitHub Pages funktioniert kostenlos nur bei **öffentlichen** Repositories. Ist dein Repository privat, stellst du es unter Settings → General → ganz unten „Change visibility“ auf **public**. Persönliche Daten stehen nicht drin: deine abgehakten Orte und eigenen Orte bleiben nur auf deinem Handy.

## 2. Auf dem Handy installieren

- **iPhone:** Link in **Safari** öffnen → Teilen-Knopf (□↑) → **„Zum Home-Bildschirm“**
- **Android:** Link in **Chrome** öffnen → ⋮ → **„App installieren“**

Danach hast du ein Torii-Icon auf dem Home-Bildschirm. Gebiete der Karte, die du schon einmal angesehen hast, funktionieren auch ohne Internet, zum Beispiel in der U-Bahn.

---

## 3. Neue Orte hinzufügen, ohne etwas neu zu installieren

Alle Orte stehen in einfachen Textdateien im Ordner **`data/`**. Die App lädt diese Dateien bei jedem Start frisch. Was du dort änderst, erscheint also automatisch in der App. Du musst nichts neu installieren.

### Weg A – direkt in der App (am schnellsten, unterwegs)
1. Tippe auf den roten **＋** Knopf. Ein 📌 erscheint in der Kartenmitte.
2. Verschiebe die Karte, bis der 📌 auf dem Ort steht, und tippe nochmal auf **＋**.
   *(Oder drücke einfach lange auf die Karte.)*
3. Name, Kategorie und optional Zeitraum und Foto eingeben → **Speichern**.

Diese Orte sind **nur auf diesem Handy** gespeichert. Unter ☰ → **✏️ Meine** kannst du sie **exportieren**, zum Beispiel als Sicherung oder um sie dauerhaft in die App zu übernehmen (siehe Weg B).

### Weg B – dauerhaft in den Daten (geht auch im Handy-Browser)
1. Öffne auf github.com die passende Datei, z. B. `data/anime-shops.json`.
2. Klicke auf den **Stift ✏️** (Edit).
3. Kopiere einen bestehenden Eintrag (alles von `{` bis `}`) und ändere die Werte.
4. Unten **Commit changes** klicken. Fertig – nach 1–2 Minuten ist der Ort in der App.

**Vorlage für einen Eintrag:**

```json
{
  "id": "mein-kartenladen",
  "name": "Toller Kartenladen",
  "nameJa": "カードショップ",
  "lat": 35.6995,
  "lng": 139.7710,
  "beschreibung": "Viele Pokémon-Einzelkarten, faire Preise.",
  "zeiten": "11:00–20:00",
  "preis": "kostenlos",
  "station": "Akihabara",
  "tags": ["Pokémon-Karten"],
  "zeitraum": [{ "von": "2026-11-10", "bis": "2026-11-20" }],
  "geprueft": true,
  "bild": "bilder/kartenladen.jpg",
  "links": [{ "titel": "Webseite", "url": "https://example.com" }]
}
```

Pflicht sind nur `id`, `name`, `lat` und `lng`. Alles andere ist optional.

| Feld | Bedeutung |
|---|---|
| `id` | eindeutiger Name ohne Leerzeichen (wird zum Abhaken gebraucht) |
| `lat` / `lng` | Koordinaten. **So bekommst du sie:** in Google Maps lange auf den Ort drücken → die Zahlen oben antippen, um sie zu kopieren (erste Zahl = `lat`, zweite = `lng`) |
| `zeitraum` | Wenn gesetzt, zeigt die App den Ort **nur an diesen Tagen**. Mehrere Zeiträume sind möglich. Format immer `JJJJ-MM-TT`. |
| `geprueft` | `false` zeigt „⚠️ Datum unbestätigt“ an |
| `bild` | Link zu einem Bild (`https://…`) **oder** eine Datei, die du in den Ordner `bilder/` hochlädst (`bilder/name.jpg`) |

> 💡 **Häufigster Fehler:** Zwischen zwei Einträgen `{ … }` muss ein **Komma** stehen, nach dem letzten aber **keins**. Wenn eine Kategorie plötzlich leer ist, zeigt die App eine Warnung an. Prüfen kannst du die Datei, indem du ihren Inhalt auf https://jsonlint.com einfügst.

### Eine ganz neue Kategorie anlegen
1. Neue Datei in `data/` anlegen, z. B. `data/ramen.json`, mit dem Inhalt `[ ]` (eine leere Liste), und dann Einträge hineinschreiben.
2. In `data/kategorien.json` einen Block ergänzen:
   ```json
   { "id": "ramen", "name": "Ramen", "icon": "🍜", "farbe": "#d97706", "datei": "ramen.json", "gruppe": "erleben", "beschreibung": "Die besten Nudelsuppen." }
   ```
   `gruppe` legt fest, unter welcher Überschrift die Kategorie in der Auswahl steht: `shoppen`, `erleben` oder `sammeln`.
   Mit `"sammelbar": true` erscheint die Kategorie zusätzlich mit Fortschrittsbalken unter 🏆 Sammlung.

---

## 4. Wichtige Hinweise zu den Daten (Stand: 20. Oktober 2026)

- **Bestätigt für 2026** (aus offiziellen Ankündigungen und Presseberichten): Asakusa Culture & Lights (30.10.–3.11.), Roppongi Hills (5.11.–25.12.), Weihnachtsmarkt Roppongi (ab 21.11.), Marunouchi (ab 12.11.), Midtown Yaesu (ab 19.11.), Tokyo Midtown (ab 26.11.), Rikugien Light-up (25.11.–6.12.), Tori-no-Ichi (7. & 19.11.).
- **⚠️ Datum unbestätigt:** Diese Termine habe ich aus dem Vorjahr geschätzt. Bitte kurz vor dem Besuch auf der offiziellen Seite prüfen und dann in der Datei `"geprueft": true` setzen.
- **Bahnhofs-Stempel:** Die **78 JR-Bahnhöfe** stammen aus der offiziellen JR-East-Stempelliste „東京エリア“ (Quelle: dotanstamp.com). 12 davon liegen schon in Chiba (z. B. Funabashi, Kashiwa) – das steht im Text. Dazu kommen **56 Stationen der Toei-U-Bahn** (Asakusa- und Ōedo-Linie) mit Papier-Stempel. Toei Mita- und Shinjuku-Linie sind noch nicht drin. **Tokyo Metro** setzt auf **digitale Stempel** über die App **„Ekitag“**. Papier-Stempel aller 9 Metro-Linien gibt es im **Metro-Museum** (Kasai). Fehlt ein Stempel, frag das Personal oder ergänze ihn mit ＋.
- **Herbstlaub:** Die Zeiten stammen von koyo.walkerplus.com. Wo es Daten gibt, gilt der Höhepunkt vom letzten Jahr (2025), sonst die üblichen Jahre. 2026 soll das Laub etwas später dran sein als normal. Den aktuellen Stand zeigt der Link „Aktueller Laub-Stand“ bei jedem Ort (täglich aktualisiert, japanisch: 青葉 = grün, 色づき始め = färbt sich, 見頃 = Höhepunkt, 落葉 = Laub fällt). Im Datenfeld `laub` stehen `beginn` (färbt sich ab), `von` und `bis` (Höhepunkt).
- **Illuminationen:** 42 Lichter-Events mit den Terminen für 2026 (Quellen: kyochika.jp, walkerplus). Nur Caretta Shiodome und das Mogusaen sind noch nicht bestätigt.
- **Limitierte Goshuin im November:** Die meisten wurden von den Vorjahren übernommen und sind als „ungeprüft“ markiert. Vor Ort oder auf Instagram des Schreins nachschauen.
- **Adressen:** Die meisten Läden haben jetzt die genaue japanische Adresse (Feld `adresse`). Die Koordinaten stammen aus dem japanischen Vermessungsamt (GSI). Noch ungefähr: Volks Akihabara, Kapital und zwei Pop-ups.
- **Beispielfotos:** Beim Öffnen eines Ortes lädt die App passende Fotos von **Wikimedia Commons**, der freien Bilddatenbank hinter Wikipedia. Diese Fotos stehen unter freien Lizenzen (z. B. CC BY-SA) und dürfen genutzt werden, wenn Fotograf und Lizenz genannt werden. Das zeigt die App unter jedem Foto an, ein Tipp darauf öffnet die Original-Seite. Ein Foto wird nur gezeigt, wenn der Name des Ortes im Titel des Fotos vorkommt. Lieber kein Foto als ein falsches. Bei Tempeln, Gärten und Bahnhöfen nimmt die App sonst ein Foto aus der direkten Umgebung. Für einzelne Orte lässt sich die Suche in den Daten mit `"fotoSuche": "Suchbegriff"` steuern oder mit `"fotoSuche": false` abschalten. Abschaltbar unter ☰ → ⚙️ → Beispielfotos.
- **Goshuin-Bilder:** Fremde Fotos darf ich wegen der Urheberrechte nicht in die App kopieren. Stattdessen gibt es zwei Knöpfe: **🔍 So sieht's aus** öffnet Google Bilder mit echten Fotos genau dieses Goshuin. Mit **📷 Mein Foto** fotografierst du dein eigenes Goshuin. Es wird dann groß angezeigt und erscheint unter 🏆 Sammlung in deiner Galerie. Die Fotos liegen nur auf deinem Handy. Wenn du die Website-Daten löschst, sind sie weg.
- **Limitierte Goshuincho:** Für November 2026 waren noch keine konkreten Ausgaben angekündigt. Die meisten Schreine geben solche Bücher erst kurz vorher auf **Instagram** oder **X** bekannt. Gute Suchbegriffe: `#限定御朱印帳`, `#限定御朱印`, `#御朱印帳 東京`. Wenn du etwas findest: über ＋ eintragen, mit Zeitraum und Foto. Ab dann erscheint es tagesaktuell auf der Karte.
- Öffnungszeiten sind ungefähre Angaben.

---

## 5. Für Neugierige: Wie ist die App aufgebaut?

```
index.html              ← das Gerüst der Seite
css/style.css           ← Design „Washi & Sumi“, Farben & Animationen (Farben ganz oben änderbar)
js/app.js               ← die Logik (Karte, Filter, Kalender …), mit Kommentaren
js/effekte.js           ← Animationen & Effekte (Stempel, Übergänge, Wellen)
js/fotos.js             ← Beispielfotos von Wikimedia Commons (mit Fotonachweis)
js/klang.js             ← schlichte Klänge (Klicken, kurze Töne) – direkt im Browser erzeugt
data/kategorien.json    ← Liste aller Kategorien
data/*.json             ← die Orte, eine Datei pro Kategorie
bilder/                 ← eigene Bilder hier hochladen
lib/                    ← Karten-Bibliotheken Leaflet & MapLibre (nicht ändern)
sw.js                   ← macht die App offline-fähig
manifest.webmanifest    ← App-Name und Icon für den Home-Bildschirm
```

**Auf dem Computer testen:** Im Projektordner `python3 -m http.server` ausführen und dann http://localhost:8000 öffnen. Ein Doppelklick auf `index.html` funktioniert nicht, weil der Browser dann die Daten-Dateien nicht laden darf.

Kartendaten © OpenStreetMap-Mitwirkende, Kartenstil © OpenFreeMap / OpenMapTiles (Ersatz-Karten: OpenStreetMap, Esri). Bibliotheken: MapLibre GL JS (BSD-3) und maplibre-gl-leaflet (ISC). Karten-Bibliothek: Leaflet (BSD-2) und Leaflet.markercluster (MIT).
