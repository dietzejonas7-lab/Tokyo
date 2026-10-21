/* =========================================================
   Tokio Entdecker – App-Logik
   ---------------------------------------------------------
   Aufbau dieser Datei:
     1. Einstellungen
     2. Hilfsfunktionen (Datum, Speicher, HTML)
     3. Daten laden
     4. Karte & Marker
     5. Kategorien-Chips
     6. Detail-Karte (Bottom Sheet)
     7. Seitenpanel (Heute, Sammlung, Meine Orte, Suche)
     8. Datum wählen
     9. Eigene Orte hinzufügen
    10. Start
   Die Inhalte (Orte) stehen NICHT hier, sondern in /data/*.json
   ========================================================= */

/* ---------- 1. Einstellungen ---------- */
const REISE = { von: "2026-11-01", bis: "2026-11-25" };
// Unser Hotel: immer sichtbar, lässt sich nicht ausschalten
const HOTEL = {
  id: "unser-hotel", kategorie: "hotel", hotel: true, fotoSuche: false,
  name: "Tosei Hotel Cocone Kanda", nameJa: "トーセイホテル ココネ神田",
  lat: 35.68952, lng: 139.76905,
  beschreibung: "Unser Zuhause in Tokio! 3-Sterne-Hotel zwischen Kanda und Ōtemachi, nur ein paar Minuten zu Fuß vom Bahnhof Kanda. In der Lobby gibt es kostenlosen Kaffee und eine große Manga-Auswahl.",
  station: "Kanda (JR Yamanote/Chūō, Ginza-Linie) · Ōtemachi",
  adresse: "東京都千代田区内神田3丁目",
  tags: ["Unser Hotel", "Kanda"],
};
const HOTEL_KAT = { id: "hotel", name: "Unser Hotel", icon: "🏨", farbe: "#b8913a" };
const START_ANSICHT = { lat: 35.6895, lng: 139.7400, zoom: 12 };
// Hauptkarte: moderne Vektor-Karte (ähnlich wie Google Maps) von OpenFreeMap – kostenlos, ohne API-Schlüssel.
const VEKTOR_KARTE = {
  hell: "https://tiles.openfreemap.org/styles/liberty",
  dunkel: "https://tiles.openfreemap.org/styles/dark",
  attribution: '<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> &copy; <a href="https://www.openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
};
// Eigene Kartenfarben passend zum App-Design (nur Flächen – Straßen bleiben wie im Original)
// neon = Straßenfarben, bahn = Bahnlinien, leuchten = große Straßen glühen (Nachtkarte „Tokio bei Nacht“)
const KARTEN_FARBEN = {
  light: {
    hintergrund: "#efe7d6", wasser: "#b7cdd6", gruen: "#d3dfbd", gebaeude: "#e3d8c3",
    neon: { rand: "#dccbaa", schnell: "#e9a27e", haupt: "#f6e2b8", neben: "#fffaf0", klein: "#fffdf7" },
    bahn: "#9aa3c0", text: "#4a4038", textRand: "#f7f1e6",
  },
  dark: {
    hintergrund: "#16152f", wasser: "#1d2350", gruen: "#1d2a33", gebaeude: "#252344",
    neon: { rand: "#100e26", schnell: "#f08a4b", haupt: "#d9a35a", neben: "#6e5a7e", klein: "#3a3466" },
    bahn: "#8a6fb0", text: "#e9dcc8", textRand: "#16152f", leuchten: true,
  },
};
// Sprache der Kartenbeschriftung: erst Deutsch, dann Englisch, dann lateinische Schrift, sonst Japanisch
const KARTEN_SPRACHE = ["name:de", "name_de", "name:en", "name_en", "name:latin", "name"];
// Ersatz-Karten (Bilder-Kacheln), falls die Vektor-Karte nicht lädt. Dunkelmodus dann per CSS-Filter.
const KARTEN_DIENSTE = [
  {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    maxZoom: 19,
    attribution: "Tiles &copy; Esri",
  },
];
const SPEICHER = {
  besucht: "tokio.besucht",
  eigene: "tokio.eigene",
  aktiv: "tokio.aktiveKategorien",
  bekannt: "tokio.bekannteKategorien",
  theme: "tokio.theme",
  design: "tokio.designVersion",
  favoriten: "tokio.favoriten",
  erledigtAus: "tokio.erledigteAusblenden",
  favZeigen: "tokio.favoritenZeigen",
};

const state = {
  kategorien: [],          // aus data/kategorien.json
  eintraege: [],           // alle Orte aller Kategorien
  aktiv: new Set(),        // eingeschaltete Kategorien
  datum: heuteInTokio(),   // gewählter Tag (YYYY-MM-DD)
  alleZeigen: false,       // Zeitraum-Filter ignorieren?
  besucht: new Set(laden(SPEICHER.besucht, [])),
  favoriten: new Set(laden(SPEICHER.favoriten, [])), // ❤️ gemerkte Orte
  nurFavoriten: false,     // Karte zeigt nur die Favoriten
  favZeigen: laden(SPEICHER.favZeigen, true), // Favoriten immer zeigen (auch wenn ihre Kategorie aus ist)
  erledigteAusblenden: laden(SPEICHER.erledigtAus, false), // Erledigtes ganz von der Karte nehmen
  laubLive: {},            // echter Laub-Stand von Walkerplus (data/laub-stand.json, täglich automatisch)
  laubOhne: new Set(),     // Orte, für die Walkerplus keinen täglichen Stand liefert
  eigene: laden(SPEICHER.eigene, []),
  fotos: new Map(),        // eigene Fotos (z. B. vom Goshuin), gespeichert in IndexedDB
  meinOrt: null,           // GPS-Position
  addModus: false,
  neuerPunkt: null,
};

/* ---------- 2. Hilfsfunktionen ---------- */
function heuteInTokio() {
  // "en-CA" liefert praktischerweise das Format 2026-11-03
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(new Date());
}
function tageZwischen(a, b) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
}
function plusTage(iso, n) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function datumSchoen(iso, opts = { weekday: "short", day: "numeric", month: "short" }) {
  return new Date(iso + "T12:00:00Z").toLocaleDateString("de-DE", { ...opts, timeZone: "UTC" });
}
function laden(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function speichern(key, wert) {
  try { localStorage.setItem(key, JSON.stringify(wert)); return true; }
  catch { toast("⚠️ Speicher voll – evtl. Foto zu groß"); return false; }
}
/** Fotos brauchen mehr Platz als localStorage hat – darum IndexedDB (Datenbank im Browser) */
const fotoSpeicher = {
  db: null,
  oeffnen() {
    this.db ??= new Promise((ok, fehler) => {
      const r = indexedDB.open("tokio", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("fotos");
      r.onsuccess = () => ok(r.result);
      r.onerror = () => fehler(r.error);
    });
    return this.db;
  },
  async aktion(modus, fn) {
    const db = await this.oeffnen();
    return new Promise((ok, fehler) => {
      const t = db.transaction("fotos", modus);
      fn(t.objectStore("fotos"));
      t.oncomplete = () => ok();
      t.onerror = () => fehler(t.error);
    });
  },
  async alleLaden() {
    const fotos = new Map();
    await this.aktion("readonly", (store) => {
      store.openCursor().onsuccess = (ev) => {
        const c = ev.target.result;
        if (c) { fotos.set(c.key, c.value); c.continue(); }
      };
    });
    return fotos;
  },
  setzen: (id, bild) => fotoSpeicher.aktion("readwrite", (store) => store.put(bild, id)),
  loeschen: (id) => fotoSpeicher.aktion("readwrite", (store) => store.delete(id)),
};

function esc(text) {
  return String(text ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function sichereUrl(url) {
  return /^(https?:|bilder\/|data:image\/)/.test(url || "") ? url : "";
}
const $ = (sel) => document.querySelector(sel);
/** Für die Suche: klein schreiben und Akzente entfernen („Pokémon“ → „pokemon“) */
function normal(text) {
  return String(text ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

let toastTimer;
function toast(text) {
  const el = $("#toast");
  el.textContent = text;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}

function kategorie(id) {
  if (id === "hotel") return HOTEL_KAT;
  return state.kategorien.find((k) => k.id === id) || { id, name: id, icon: "📍", farbe: "#888" };
}

/** Läuft ein Eintrag am Tag `datum`? Einträge ohne Zeitraum laufen immer. */
function istAktiv(e, datum = state.datum) {
  if (!e.zeitraum || !e.zeitraum.length) return true;
  return e.zeitraum.some((z) => z.von <= datum && datum <= z.bis);
}

/** Text + Farbe für den Zeitraum-Status (läuft / bald / vorbei). */
function zeitStatus(e, datum = state.datum) {
  if (!e.zeitraum || !e.zeitraum.length) return null;
  const laufend = e.zeitraum.find((z) => z.von <= datum && datum <= z.bis);
  if (laufend) {
    const rest = tageZwischen(datum, laufend.bis);
    const naechster = e.zeitraum.filter((z) => z.von > laufend.bis).sort((a, b) => a.von.localeCompare(b.von))[0];
    if (rest === 0 && naechster) {
      return { art: "live", text: `Heute! Wieder am ${datumSchoen(naechster.von)}`, kurz: "heute" };
    }
    const text = rest === 0 ? "Nur noch heute!" : `Läuft – noch ${rest} ${rest === 1 ? "Tag" : "Tage"}`;
    return { art: "live", text, kurz: rest === 0 ? "letzter Tag" : `noch ${rest} T.` };
  }
  const kommend = e.zeitraum.filter((z) => z.von > datum).sort((a, b) => a.von.localeCompare(b.von))[0];
  if (kommend) {
    const in_ = tageZwischen(datum, kommend.von);
    return { art: "soon", text: `Startet ${datumSchoen(kommend.von)} (in ${in_} ${in_ === 1 ? "Tag" : "Tagen"})`, kurz: `in ${in_} T.` };
  }
  return { art: "past", text: "Schon vorbei", kurz: "vorbei" };
}

/**
 * Herbstlaub: Wie weit ist das Laub am Tag `datum`? (nach typischen Jahren bzw. dem Vorjahr)
 * Daten-Feld: "laub": { beginn, von, bis } – beginn = färbt sich, von–bis = Höhepunkt.
 */
const LAUB_STUFEN = {
  gruen:     { icon: "🌿", farbe: "#5f8f3e", name: "Noch grün" },
  faerbt:    { icon: "🍁", farbe: "#d9a21b", name: "Färbt sich" },
  hoch:      { icon: "🍁", farbe: "#c8361f", name: "Höhepunkt" },
  verblasst: { icon: "🍂", farbe: "#b0703a", name: "Verblasst" },
  vorbei:    { icon: "🍂", farbe: "#8a6a4f", name: "Meist vorbei" },
};

/** Echter Stand von Walkerplus für einen Ort (oder null) – mit deutscher Bedeutung */
function laubLive(e) {
  const live = state.laubLive[e.id];
  if (!live?.stand) return null;
  const wort = LAUB_WOERTER.find((w) => live.stand.includes(w.ja)) ||
    (live.stand.includes("見頃") ? LAUB_WOERTER.find((w) => w.stufe === "hoch") : null);
  return wort ? { ...live, wort } : null;
}

/**
 * Vorhersage für den gewählten Tag (nach Vorjahr bzw. typischen Jahren).
 * Die Karte und die Listen zeigen immer diese Vorhersage – den tagesaktuellen
 * Stand von Walkerplus gibt es zusätzlich in der Detail-Karte (laubLive).
 */
function laubStatus(e, datum = state.datum) {
  const l = e.laub;
  if (!l) return null;
  const kurzDatum = (iso) => datumSchoen(iso, { day: "numeric", month: "numeric" });
  let stufe, text, kurz;
  if (datum < l.beginn) {
    stufe = "gruen"; text = `Vorhersage: noch grün – färbt sich ab ca. ${kurzDatum(l.beginn)}`; kurz = "noch grün";
  } else if (datum < l.von) {
    const n = tageZwischen(datum, l.von);
    stufe = "faerbt"; text = `Vorhersage: färbt sich – Höhepunkt in ca. ${n} ${n === 1 ? "Tag" : "Tagen"}`; kurz = `färbt sich`;
  } else if (datum <= l.bis) {
    stufe = "hoch"; text = "Vorhersage: Höhepunkt!"; kurz = "Höhepunkt";
  } else {
    stufe = "vorbei"; text = "Vorhersage: meist schon vorbei"; kurz = "vorbei";
  }
  return { stufe, text, kurz, ...LAUB_STUFEN[stufe] };
}

/** Kleine Übersetzungshilfe für die japanische Laub-Seite (Walkerplus) */
const LAUB_WOERTER = [
  { ja: "青葉", lesung: "aoba", de: "Noch grün", farbe: "#5f8f3e", stufe: "gruen" },
  { ja: "色づき始め", lesung: "irozuki hajime", de: "Färbt sich gerade", farbe: "#d9a21b", stufe: "faerbt" },
  { ja: "今見頃", lesung: "ima migoro", de: "Jetzt Höhepunkt – hingehen!", farbe: "#c8361f", stufe: "hoch" },
  { ja: "色あせ始め", lesung: "iroase hajime", de: "Verblasst – oft noch schön", farbe: "#b0703a", stufe: "verblasst" },
  { ja: "落葉", lesung: "rakuyō", de: "Laub fällt – meist vorbei", farbe: "#8a6a4f", stufe: "vorbei" },
];
/** Allgemeine Tipps für cinematische Nachtaufnahmen (Kategorie Neon & Filmspots) */
function kameraTipps() {
  const sonne = Wetter.sonne(state.datum);
  const blau = (m) => Wetter.zeit(new Date(sonne.unter.getTime() + m * 60000));
  const tipps = [
    ["🎞️", "Kino-Look", "4K mit 24 oder 25 Bildern pro Sekunde. Für Zeitlupe 60 oder 120 Bilder/s aufnehmen und später verlangsamen."],
    ["🔵", "Blaue Stunde", `Direkt nach Sonnenuntergang ist der Himmel noch tiefblau und die Schilder leuchten schon – am ${datumSchoen(state.datum, { day: "numeric", month: "numeric" })} ca. ${blau(5)}–${blau(30)} Uhr.`],
    ["🌧️", "Regen ist dein Freund", "Nasse Straßen spiegeln die Neonschilder – die schönsten Aufnahmen gibt es während und kurz nach dem Regen. Das Wetter steht unter „Dein Tag“."],
    ["🌃", "Wenig Licht", "Neon und Laternen als Lichtquelle nutzen und nah an die Lichter gehen. Nachtmodus nutzen, falls vorhanden; ISO nicht zu hoch (etwa unter 3200), sonst rauscht das Bild."],
    ["🎨", "Farbprofil", "„Normal“, wenn du die Videos direkt teilen willst. D-Log M nur, wenn du später am Handy oder PC die Farben bearbeitest."],
    ["🚶", "Ruhige Bewegung", "„Ninja-Walk“: Knie leicht beugen, langsam mit der Ferse zuerst aufsetzen. Folgemodus für Fahrten, gesperrte Neigung für ruhige Bilder. Low-Angle (Kamera nah am Boden) wirkt besonders filmisch."],
    ["🙇", "Rücksicht", "In Japan ist Privatsphäre wichtig: Gesichter nicht nah filmen, in Bars und Lokalen vorher fragen, Schilder 撮影禁止 (satsuei kinshi = Filmen verboten) beachten. In engen Gassen nicht im Weg stehen, kein Stativ."],
    ["🔋", "Strom", "Nachtaufnahmen und Kälte leeren den Akku schnell – Powerbank und Kabel mitnehmen."],
  ];
  return `<details class="kamera-tipps">
    <summary>🎥 Tipps für cinematische Nachtaufnahmen</summary>
    ${tipps.map(([icon, titel, text], i) => `<div class="kt-zeile" style="--i:${i}"><span>${icon}</span><p><b>${titel}</b>${esc(text)}</p></div>`).join("")}
  </details>`;
}

/** Ob Walkerplus für diesen Ort überhaupt einen täglichen Stand liefert */
function laubOhneDaten(e) {
  const hatSeite = (e.links || []).some((l) => l.url.includes("koyo.walkerplus.com/detail/"));
  return !hatSeite || state.laubOhne.has(e.id);
}

function laubLegende(e, laub, live) {
  const kurz = (iso) => datumSchoen(iso, { day: "numeric", month: "numeric" });
  // Vorhersage der App für den gewählten Tag ("vorbei" gehört in der Tabelle zu 色あせ始め)
  const vorhersage = laub.stufe === "vorbei" ? "verblasst" : laub.stufe;
  const zeilen = LAUB_WOERTER.map((w, i) => {
    const istLive = live && w.stufe === live.wort.stufe;
    const istVorhersage = w.stufe === vorhersage;
    return `<div class="lw-zeile ${istLive ? "jetzt" : ""} ${istVorhersage ? "vorhersage" : ""}" style="--c:${w.farbe};--i:${i}">
      <span class="lw-punkt"></span>
      <b class="lw-ja">${w.ja}</b>
      <span class="lw-text"><small>${w.lesung}</small>${esc(w.de)}</span>
      <span class="lw-marken">${istLive ? `<em>heute echt</em>` : ""}${istVorhersage ? `<em class="vh">Vorhersage ${kurz(state.datum)}</em>` : ""}</span>
    </div>`;
  }).join("");
  let stand;
  if (live) {
    const zeit = live.aktualisiert ? ` · Stand ${kurz(live.aktualisiert.slice(0, 10))}, ${live.aktualisiert.slice(11, 16)} Uhr Japan` : "";
    stand = `<div class="lw-live">📡 <b>Tagesaktuell</b> (Walkerplus${zeit}):<br><b class="gross">${live.wort.ja}</b> = ${esc(live.wort.de)}</div>`;
  } else if (laubOhneDaten(e)) {
    stand = `<div class="lw-live keine">📡 Für diesen Ort liefert Walkerplus <b>keinen tagesaktuellen Stand</b>.
      <small>Es gibt nur die Vorhersage der App (gestrichelt markiert). Auf der Walkerplus-Seite stehen dann nur die üblichen Zeiten.</small></div>`;
  } else {
    stand = `<div class="lw-live keine">📡 Der tagesaktuelle Stand ist gerade nicht verfügbar.
      <small>Er wird automatisch zweimal täglich abgeholt – schau später nochmal oder tippe auf den Link oben.</small></div>`;
  }
  return `<div class="laub-woerter">
    <div class="lw-kopf"><b>色づき状況</b><span>„Stand der Färbung“ – steht auf der Seite direkt unter dem Namen</span></div>
    ${stand}
    ${zeilen}
    <p class="lw-tipp"><span class="lw-mini voll"></span> = tagesaktueller Stand · <span class="lw-mini gestrichelt"></span> = Vorhersage für den gewählten Tag (${kurz(state.datum)}).<br>
      Auf der Seite steht unter dem Stand, wann aktualisiert wurde (z. B. 10月20日 16:05更新 = 20. Oktober, 16:05 Uhr).
      Weiter unten: <b>ちなみに2025年は…</b> = Höhepunkt im letzten Jahr · <b>ライトアップ</b> = abendliche Beleuchtung.</p>
  </div>`;
}

function distanzKm(a, b) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function distanzText(e) {
  if (!state.meinOrt) return "";
  const km = distanzKm(state.meinOrt, e);
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

/* ---------- 3. Daten laden ---------- */
async function datenLaden() {
  // "cache: no-cache" = immer nach neuen Daten fragen, damit deine Änderungen sofort ankommen
  const kats = await fetch("data/kategorien.json", { cache: "no-cache" }).then((r) => r.json());
  state.kategorien = kats;

  const listen = await Promise.all(
    kats.map(async (k) => {
      try {
        const daten = await fetch("data/" + k.datei, { cache: "no-cache" }).then((r) => r.json());
        return daten.map((e) => ({ ...e, kategorie: k.id }));
      } catch (err) {
        console.error("Fehler in Datei", k.datei, err);
        toast(`⚠️ ${k.datei} hat einen Fehler`);
        return [];
      }
    })
  );
  alleEintraegeNeu(listen.flat());
  // Echter Laub-Stand – wird von GitHub täglich automatisch abgeholt (fehlt die Datei, geht es auch ohne)
  try {
    const stand = await fetch("data/laub-stand.json", { cache: "no-cache" }).then((r) => r.json());
    state.laubLive = stand.orte || {};
    state.laubOhne = new Set(stand.ohneStand || []);
  } catch { state.laubLive = {}; }

  const gespeichert = laden(SPEICHER.aktiv, null);
  state.aktiv = new Set(gespeichert || kats.map((k) => k.id));
  // Neu hinzugekommene Kategorien automatisch einschalten
  // (Ohne gespeicherte Liste: die 7 Kategorien der ersten App-Version gelten als bekannt)
  const ersteVersion = ["anime", "illumination", "gaerten", "nachttempel", "stempel", "goshuin", "goshuincho"];
  const bekannt = new Set(laden(SPEICHER.bekannt, ersteVersion));
  kats.filter((k) => gespeichert && !bekannt.has(k.id) && !k.standardAus).forEach((k) => state.aktiv.add(k.id));
  if (!gespeichert) kats.filter((k) => k.standardAus).forEach((k) => state.aktiv.delete(k.id));
  speichern(SPEICHER.bekannt, kats.map((k) => k.id));
}

function alleEintraegeNeu(ausDateien = state.eintraege.filter((e) => !e.eigen)) {
  const eigene = state.eigene.map((e) => ({ ...e, eigen: true }));
  state.eintraege = [...ausDateien, ...eigene];
}

/* ---------- 4. Karte & Marker ---------- */
let map, tiles, vektor, cluster, meinMarker;
const markerNachId = new Map();

function karteStarten() {
  map = L.map("map", { zoomControl: false, tapHold: true, attributionControl: true, maxZoom: 19 })
    .setView([START_ANSICHT.lat, START_ANSICHT.lng], START_ANSICHT.zoom);
  karteSetzen();

  cluster = L.markerClusterGroup({
    showCoverageOnHover: false,
    maxClusterRadius: 45,
    spiderfyDistanceMultiplier: 1.6,
    iconCreateFunction: clusterIcon,
  });
  map.addLayer(cluster);
  hotelMarkerSetzen();

  // Lange drücken (Handy) oder Rechtsklick (PC) = neuen Ort hier anlegen
  map.on("contextmenu", (ev) => formularOeffnen(ev.latlng));
  map.on("click", (ev) => { sheetSchliessen(); Effekte.tuscheTropfen(ev.containerPoint); });
}

/** Vektor-Karte laden; klappt das nicht, Bilder-Kacheln als Ersatz nehmen */
async function karteSetzen() {
  const dunkel = document.documentElement.dataset.theme === "dark";
  if (webglMoeglich()) {
    try {
      const antwort = await fetch(dunkel ? VEKTOR_KARTE.dunkel : VEKTOR_KARTE.hell);
      if (!antwort.ok) throw new Error("Stil nicht geladen: " + antwort.status);
      const stil = kartenFarben(beschriftungDeutsch(await antwort.json()), dunkel ? "dark" : "light");
      if (vektor) vektor.getMaplibreMap().setStyle(stil);
      else vektorStarten(stil);
      return;
    } catch (err) {
      console.warn("Vektor-Karte nicht verfügbar, nutze Ersatz-Karte", err);
    }
  }
  tilesSetzen();
}

function webglMoeglich() {
  try {
    const c = document.createElement("canvas");
    return !!(window.maplibregl && L.maplibreGL && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch {
    return false;
  }
}

/** Alle Beschriftungen im Kartenstil auf Deutsch (bzw. Englisch/lateinisch) umstellen */
function beschriftungDeutsch(stil) {
  const name = ["coalesce", ...KARTEN_SPRACHE.map((feld) => ["get", feld])];
  stil.layers.forEach((layer) => {
    const text = layer.layout?.["text-field"];
    if (text && JSON.stringify(text).includes("name")) layer.layout["text-field"] = name;
  });
  return stil;
}

/** Flächen der Vektor-Karte (Hintergrund, Wasser, Grün, Gebäude) in den App-Farben einfärben */
function kartenFarben(stil, theme) {
  const f = KARTEN_FARBEN[theme];
  stil.layers.forEach((layer) => {
    const id = layer.id.toLowerCase();
    layer.paint ??= {};
    if (layer.type === "background") layer.paint["background-color"] = f.hintergrund;
    if (layer.type === "fill") {
      if (id.includes("water")) layer.paint["fill-color"] = f.wasser;
      else if (/park|wood|forest|grass|landcover/.test(id)) layer.paint["fill-color"] = f.gruen;
      else if (id.includes("building")) layer.paint["fill-color"] = f.gebaeude;
    }
    if (layer.type === "fill-extrusion" && id.includes("building")) layer.paint["fill-extrusion-color"] = f.gebaeude;
    if (!f.neon) return;
    if (layer.type === "line" && !/water|rail|boundary|admin|ferry|aeroway/.test(id) && /road|highway|street|motorway|trunk|primary|secondary|tertiary|minor|service|path|bridge|tunnel/.test(id)) {
      if (id.includes("casing")) layer.paint["line-color"] = f.neon.rand;
      else if (/motorway|trunk/.test(id)) layer.paint["line-color"] = f.neon.schnell;
      else if (/primary|major/.test(id)) layer.paint["line-color"] = f.neon.haupt;
      else if (/secondary|tertiary/.test(id)) layer.paint["line-color"] = f.neon.neben;
      else layer.paint["line-color"] = f.neon.klein;
    }
    if (layer.type === "line" && /rail/.test(id)) layer.paint["line-color"] = /dashline/.test(id) ? f.hintergrund : f.bahn;
    if (layer.type === "symbol" && layer.layout?.["text-field"]) {
      layer.paint["text-color"] = f.text;
      layer.paint["text-halo-color"] = f.textRand;
    }
  });
  if (f.leuchten) stil.layers = strassenLeuchten(stil.layers, f);
  return stil;
}

/** Nachtkarte: unter die großen Straßen eine weich verschwommene Kopie legen – sieht aus wie Lichter der Stadt */
function strassenLeuchten(layers, f) {
  const breite = (faktor) => ["interpolate", ["exponential", 1.4], ["zoom"], 8, 3 * faktor, 12, 7 * faktor, 16, 22 * faktor, 19, 46 * faktor];
  return layers.flatMap((layer) => {
    const id = layer.id.toLowerCase();
    if (layer.type !== "line" || !/motorway|major|trunk_primary/.test(id) || /casing|subtle|link|tunnel/.test(id)) return [layer];
    const schnell = /motorway/.test(id);
    const glow = {
      id: layer.id + "_leuchten", type: "line", source: layer.source, "source-layer": layer["source-layer"],
      layout: { ...(layer.layout || {}), "line-cap": "round" },
      paint: { "line-color": schnell ? f.neon.schnell : f.neon.haupt, "line-width": breite(schnell ? 1.3 : 1), "line-blur": breite(0.9), "line-opacity": schnell ? 0.45 : 0.3 },
    };
    ["filter", "minzoom", "maxzoom"].forEach((k) => layer[k] !== undefined && (glow[k] = layer[k]));
    return [glow, layer];
  });
}

function vektorStarten(stil) {
  if (tiles) { map.removeLayer(tiles); tiles = null; }
  vektor = L.maplibreGL({ style: stil, attributionControl: { customAttribution: VEKTOR_KARTE.attribution } }).addTo(map);
  document.documentElement.classList.add("vektor");
  // Kommen gar keine Kartendaten an, auf die Ersatz-Karte wechseln
  const ml = vektor.getMaplibreMap();
  let geladen = false, fehler = 0;
  ml.on("data", (ev) => { if (ev.dataType === "source" && ev.tile) geladen = true; });
  ml.on("error", () => { if (!geladen && ++fehler === 5) tilesSetzen(); });
}

function tilesSetzen(nr = 0) {
  if (vektor) { map.removeLayer(vektor); vektor = null; }
  document.documentElement.classList.remove("vektor");
  if (tiles) map.removeLayer(tiles);
  const dienst = KARTEN_DIENSTE[nr];
  let geladen = false, fehler = 0;
  tiles = L.tileLayer(dienst.url, { maxZoom: dienst.maxZoom, attribution: dienst.attribution })
    .on("tileload", () => (geladen = true))
    .on("tileerror", () => {
      // Kommt vom aktuellen Dienst gar nichts an, zum nächsten wechseln
      if (!geladen && ++fehler === 4 && nr + 1 < KARTEN_DIENSTE.length) tilesSetzen(nr + 1);
    })
    .addTo(map);
}

function clusterIcon(c) {
  const marker = c.getAllChildMarkers();
  const zaehler = {};
  marker.forEach((m) => (zaehler[m.options.farbe] = (zaehler[m.options.farbe] || 0) + 1));
  let start = 0;
  const stops = Object.entries(zaehler).map(([farbe, n]) => {
    const ende = start + (n / marker.length) * 100;
    const s = `${farbe} ${start}% ${ende}%`;
    start = ende;
    return s;
  });
  return L.divIcon({
    html: `<div class="cluster" style="--stops:${stops.join(",")}"><b>${marker.length}</b></div>`,
    className: "pin-wrap",
    iconSize: [46, 46],
  });
}

function sichtbareEintraege() {
  // Erledigtes ist halb durchsichtig – oder (Einstellung) ganz ausgeblendet
  const zeigen = (e) => !(state.erledigteAusblenden && state.besucht.has(e.id));
  // Favoriten-Chip an: Favoriten sind immer zu sehen – egal welche Kategorie oder welcher Tag gewählt ist.
  // Aus: Favoriten verhalten sich wie alle anderen Orte (nur sichtbar, wenn ihre Kategorie an ist).
  if (state.nurFavoriten) return state.eintraege.filter((e) => state.favoriten.has(e.id) && zeigen(e));
  return state.eintraege.filter((e) => zeigen(e) &&
    ((state.favZeigen && state.favoriten.has(e.id)) || (state.aktiv.has(e.kategorie) && (state.alleZeigen || istAktiv(e)))));
}

/** Erledigte Orte in Listen nach unten schieben (Reihenfolge sonst unverändert) */
function erledigtNachHinten(liste) {
  return [...liste].sort((a, b) => state.besucht.has(a.id) - state.besucht.has(b.id));
}

/** Aussehen eines Kartenpunkts (Farbe, Symbol, Erledigt-Stempel, Favoriten-Herz) */
function pinIcon(e, i = 0) {
  const k = kategorie(e.kategorie);
  const klassen = ["pin"];
  if (e.zeitraum && istAktiv(e)) klassen.push("live");
  if (state.besucht.has(e.id)) klassen.push("done");
  if (e.eigen) klassen.push("mine");
  // Herbstlaub: Pin-Farbe zeigt den Laub-Stand am gewählten Tag
  const laub = laubStatus(e);
  if (laub?.stufe === "hoch") klassen.push("live");
  const farbe = laub ? laub.farbe : k.farbe;
  const herz = state.favoriten.has(e.id) ? `<i class="fav-herz">♥</i>` : "";
  return L.divIcon({
    className: "pin-wrap",
    html: `<i class="pin-schatten" style="--d:${Math.min(i * 12, 400)}ms"></i><div class="${klassen.join(" ")}" style="--c:${farbe};--d:${Math.min(i * 12, 400)}ms"><span>${laub ? laub.icon : k.icon}</span>${herz}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 44],
  });
}

function markerZeichnen() {
  cluster.clearLayers();
  markerNachId.clear();
  const liste = sichtbareEintraege();
  const marker = liste.map((e, i) => {
    const k = kategorie(e.kategorie);
    const erledigt = state.besucht.has(e.id);
    // Erledigtes liegt hinter den anderen Punkten und färbt die Gruppen-Ringe nur grau
    const m = L.marker([e.lat, e.lng], {
      icon: pinIcon(e, i), title: e.name,
      farbe: erledigt ? "#c9bfb2" : k.farbe, zIndexOffset: erledigt ? -1000 : 0,
    });
    m.on("click", () => sheetOeffnen(e));
    markerNachId.set(e.id, m);
    return m;
  });
  cluster.addLayers(marker);
  chipsZeichnen();
}

function zuOrt(e) {
  map.flyTo([e.lat, e.lng], Math.max(map.getZoom(), 16), { duration: 0.9 });
}

function standortSuchen() {
  if (!navigator.geolocation) return toast("Standort wird nicht unterstützt");
  toast("📍 Suche deinen Standort …");
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      state.meinOrt = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      if (!meinMarker) {
        meinMarker = L.marker(state.meinOrt, {
          icon: L.divIcon({ className: "pin-wrap", html: '<div class="me-dot"></div>', iconSize: [18, 18] }),
          interactive: false,
        }).addTo(map);
      } else meinMarker.setLatLng(state.meinOrt);
      map.flyTo(state.meinOrt, 15, { duration: 1 });
    },
    () => toast("Standort nicht verfügbar – Erlaubnis prüfen"),
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

/* ---------- 5. Kategorien-Chips ---------- */
function chipsZeichnen() {
  const nav = $("#chips");
  const filter = `<button class="chip chip-filter" id="chip-filter" style="--i:0" aria-label="Kategorien auswählen">
    <span>🎛️</span>Kategorien<span class="count">${state.aktiv.size}/${state.kategorien.length}</span></button>`;
  const favAn = state.nurFavoriten || state.favZeigen;
  const favChip = `<button class="chip chip-fav ${favAn ? "on" : ""} ${state.nurFavoriten ? "nur" : ""}" id="chip-fav" style="--i:1;--c:#e0607e"
    aria-pressed="${favAn}" title="Antippen: Favoriten ein-/ausblenden · Lange drücken: nur Favoriten">
    <span>${favAn ? "❤️" : "🤍"}</span>${state.nurFavoriten ? "Nur Favoriten" : "Favoriten"}<span class="count">${state.favoriten.size}</span></button>`;
  nav.innerHTML = filter + favChip + state.kategorien
    .map((k, i) => {
      const anzahl = state.eintraege.filter((e) => e.kategorie === k.id && (state.alleZeigen || istAktiv(e))).length;
      return `<button class="chip ${state.aktiv.has(k.id) ? "on" : ""}" data-kat="${esc(k.id)}"
        style="--c:${esc(k.farbe)};--i:${i + 2}" title="${esc(k.beschreibung)}">
        <span>${k.icon}</span>${esc(k.name)}<span class="count">${anzahl}</span></button>`;
    })
    .join("");
  // Einflug-Animation nur beim ersten Mal
  if (chipsZeichnen.schonGezeigt) nav.classList.add("ruhig");
  chipsZeichnen.schonGezeigt = true;
}

function chipKlick(ev) {
  if (ev.target.closest("#chip-filter")) return katAuswahlOeffnen();
  if (ev.target.closest("#chip-fav")) {
    if (Date.now() - (chipKlick.langGedrueckt || 0) < 600) return; // Loslassen nach langem Drücken zählt nicht als Tippen
    return state.nurFavoriten ? nurFavoritenUmschalten() : favoritenZeigenUmschalten();
  }
  const chip = ev.target.closest(".chip");
  if (!chip) return;
  const id = chip.dataset.kat;
  katUmschalten(id);
  Effekte.nochmal($(`.chip[data-kat="${id}"]`), "bump");
  if (state.aktiv.has(id)) toast(`${kategorie(id).icon} ${kategorie(id).beschreibung}`);
}

function katUmschalten(id, an = !state.aktiv.has(id)) {
  an ? state.aktiv.add(id) : state.aktiv.delete(id);
  katGespeichert();
}
function katGespeichert() {
  speichern(SPEICHER.aktiv, [...state.aktiv]);
  markerZeichnen();
  katAuswahlAktualisieren();
}

/* ---------- 5b. Kategorien-Auswahl (große Übersicht) ---------- */
const GRUPPEN = [
  ["shoppen", "🛍️ Shoppen & Stöbern"],
  ["erleben", "✨ Erleben"],
  ["essen", "🥢 Essen"],
  ["sammeln", "🏆 Sammeln"],
];

function katAuswahlOeffnen() {
  katAuswahlZeichnen();
  modal("kat-modal", true);
}

function katAuswahlZeichnen() {
  let i = 0;
  $("#kat-liste").innerHTML = GRUPPEN.map(([gruppe, titel]) => {
    const kats = state.kategorien.filter((k) => (k.gruppe || "erleben") === gruppe);
    if (!kats.length) return "";
    return `<section class="kat-gruppe">
      <header><h3>${titel}</h3><button class="kat-link" data-gruppe="${gruppe}"></button></header>
      <div class="kat-grid">${kats.map((k) => katKachel(k, i++)).join("")}</div>
    </section>`;
  }).join("");
  katAuswahlAktualisieren();
}

function katKachel(k, i) {
  const alle = state.eintraege.filter((e) => e.kategorie === k.id);
  const sichtbar = alle.filter((e) => state.alleZeigen || istAktiv(e)).length;
  const live = alle.filter((e) => e.zeitraum && istAktiv(e)).length;
  return `<button class="kat-kachel" data-kat="${esc(k.id)}" style="--c:${esc(k.farbe)};--i:${i}">
    <span class="kk-icon">${k.icon}</span>
    <span class="kk-text">
      <b>${esc(k.name)}</b>
      <small>${esc(k.beschreibung)}</small>
      <span class="kk-zahlen"><span>${sichtbar} ${sichtbar === 1 ? "Ort" : "Orte"}</span>
        ${live ? `<span class="kk-live">✨ ${live} am ${datumSchoen(state.datum, { day: "numeric", month: "short" })}</span>` : ""}</span>
    </span>
    <span class="schalter" aria-hidden="true"></span>
  </button>`;
}

/** Nur Klassen umschalten (ohne neu zu zeichnen), damit die Animationen flüssig bleiben */
function katAuswahlAktualisieren() {
  document.querySelectorAll(".kat-kachel").forEach((el) => {
    const an = state.aktiv.has(el.dataset.kat);
    el.classList.toggle("on", an);
    el.setAttribute("aria-pressed", an);
  });
  document.querySelectorAll("[data-gruppe]").forEach((b) => {
    const kats = state.kategorien.filter((k) => (k.gruppe || "erleben") === b.dataset.gruppe);
    b.textContent = kats.every((k) => state.aktiv.has(k.id)) ? "alle aus" : "alle an";
  });
  const n = sichtbareEintraege().length;
  $("#kat-zaehler").textContent = `${state.aktiv.size} von ${state.kategorien.length} Kategorien · ${n} ${n === 1 ? "Ort" : "Orte"} auf der Karte`;
}

function katAuswahlVerbinden() {
  const liste = $("#kat-liste");
  let druckTimer, langGedrueckt = false;
  liste.addEventListener("pointerdown", (ev) => {
    const kachel = ev.target.closest(".kat-kachel");
    if (!kachel) return;
    langGedrueckt = false;
    druckTimer = setTimeout(() => {
      // Langes Drücken: nur diese Kategorie
      langGedrueckt = true;
      state.aktiv = new Set([kachel.dataset.kat]);
      katGespeichert();
      Effekte.nochmal(kachel, "bump");
      navigator.vibrate?.(20);
      toast(`Nur noch: ${kategorie(kachel.dataset.kat).icon} ${kategorie(kachel.dataset.kat).name}`);
    }, 550);
  });
  ["pointerup", "pointerleave", "pointercancel"].forEach((t) => liste.addEventListener(t, () => clearTimeout(druckTimer)));
  liste.addEventListener("contextmenu", (ev) => ev.preventDefault());
  liste.addEventListener("click", (ev) => {
    const gruppe = ev.target.closest("[data-gruppe]");
    if (gruppe) {
      const kats = state.kategorien.filter((k) => (k.gruppe || "erleben") === gruppe.dataset.gruppe);
      const alleAn = kats.every((k) => state.aktiv.has(k.id));
      kats.forEach((k) => (alleAn ? state.aktiv.delete(k.id) : state.aktiv.add(k.id)));
      return katGespeichert();
    }
    const kachel = ev.target.closest(".kat-kachel");
    if (!kachel || langGedrueckt) return;
    katUmschalten(kachel.dataset.kat);
    Effekte.nochmal(kachel.querySelector(".kk-icon"), "huepf");
  });
  $("#kat-alle").onclick = () => { state.aktiv = new Set(state.kategorien.map((k) => k.id)); katGespeichert(); };
  $("#kat-keine").onclick = () => { state.aktiv.clear(); katGespeichert(); };
  $("#kat-live").onclick = () => {
    // Kategorien, in denen es zeitlich begrenzte Einträge gibt
    state.aktiv = new Set(state.eintraege.filter((e) => e.zeitraum).map((e) => e.kategorie));
    katGespeichert();
    toast("✨ Nur Kategorien mit zeitlich begrenzten Highlights");
  };
}

/* ---------- 6. Detail-Karte (Bottom Sheet) ---------- */
let offenerEintrag = null;

function sheetOeffnen(e) {
  const warSchonOffen = $("#sheet").classList.contains("open") && offenerEintrag?.id === e.id;
  if (!warSchonOffen) Klang.oeffnen();
  offenerEintrag = e;
  const k = kategorie(e.kategorie);
  const status = zeitStatus(e);
  const meinFoto = state.fotos.get(e.id);
  const bild = meinFoto || sichereUrl(e.bild || e.foto);
  const gesammelt = state.besucht.has(e.id);
  const route = `https://www.google.com/maps/dir/?api=1&destination=${e.lat},${e.lng}&travelmode=transit`;
  // Kategorien mit "bildersuche" bekommen einen Link zu Google Bilder (zeigt echte, aktuelle Fotos)
  const bilderLink = k.bildersuche === undefined ? "" :
    "https://www.google.com/search?tbm=isch&q=" + encodeURIComponent(`${e.nameJa || e.name} ${k.bildersuche}`.trim());

  const zeitraeume = (e.zeitraum || [])
    .map((z) => (z.von === z.bis ? datumSchoen(z.von) : `${datumSchoen(z.von)} – ${datumSchoen(z.bis)}`))
    .join(" · ");

  const laub = laubStatus(e);
  const laubZeit = e.laub && `Höhepunkt ca. ${datumSchoen(e.laub.von, { day: "numeric", month: "numeric" })}–${datumSchoen(e.laub.bis, { day: "numeric", month: "numeric" })}`;

  const live = e.laub && laubLive(e);
  const fakten = [
    ["📡", e.laub && (live
      ? `Tagesaktuell: ${live.wort.de.split(" – ")[0]} (${live.wort.ja}) · Walkerplus${live.aktualisiert ? " " + datumSchoen(live.aktualisiert.slice(0, 10), { day: "numeric", month: "numeric" }) : ""}`
      : laubOhneDaten(e) ? "Kein tagesaktueller Stand – Walkerplus liefert für diesen Ort keine Daten" : "Tagesaktueller Stand gerade nicht verfügbar")],
    ["🍁", laubZeit],
    ["🎥", e.kamera && `Filmtipp: ${e.kamera}`],
    ["📊", e.laub?.vorjahr && `Letztes Jahr: ${e.laub.vorjahr}`],
    ["🎨", e.laub?.farbe && `Farben: ${e.laub.farbe}`],
    ["🗓️", zeitraeume],
    ["🕒", e.zeiten],
    ["💴", e.preis],
    ["🚉", e.station],
    ["🚃", e.linie],
    ["📏", distanzText(e) && `${distanzText(e)} entfernt`],
  ].filter(([, wert]) => wert);

  $("#sheet-body").innerHTML = `
    <div class="hero ${meinFoto ? "mein" : ""}" style="--c:${esc(k.farbe)}">
      ${bild ? `<img src="${esc(bild)}" alt="${esc(e.name)}" loading="lazy">`
             : `${Szenen.fuer(k.id)}<span class="hero-glanz"></span><span class="hero-medaillon">${laub ? laub.icon : k.icon}</span><span class="hero-ja">${esc(e.nameJa || "")}</span>`}
      ${meinFoto ? `<span class="hero-badge">📷 Mein Foto</span>` : ""}
    </div>
    <div class="sheet-content">
      <div class="kicker">
        <span class="badge cat" style="--c:${esc(k.farbe)}">${k.icon} ${esc(k.name)}</span>
        ${status ? `<span class="badge ${status.art}">${esc(status.text)}</span>` : ""}
        ${laub ? `<span class="badge laub" style="--c:${laub.farbe}">${laub.icon} ${esc(laub.text)}</span>` : ""}
        ${e.zeitraum && e.geprueft === false ? `<span class="badge warn" title="Datum geschätzt – bitte vorher prüfen">⚠️ Datum unbestätigt</span>` : ""}
        ${e.eigen ? `<span class="badge">✏️ Mein Ort</span>` : ""}
      </div>
      <div class="sheet-title">
        <div>
          <h2>${esc(e.name)}</h2>
          ${e.nameJa ? `<div class="ja">${esc(e.nameJa)}</div>` : ""}
        </div>
        ${e.hotel ? "" : favKnopf(e)}
      </div>
      ${e.beschreibung ? `<p class="desc">${esc(e.beschreibung)}</p>` : ""}
      ${fakten.length ? `<dl class="facts">${fakten.map(([i, w]) => `<div><dt>${i}</dt><dd>${esc(w)}</dd></div>`).join("")}</dl>` : ""}
      ${e.tags?.length ? `<div class="tags">${e.tags.map((t) => `<span class="tag">#${esc(t)}</span>`).join("")}</div>` : ""}
      <div class="actions">
        <a class="btn" href="${route}" target="_blank" rel="noopener">🧭 Route</a>
        ${e.hotel
          ? `<a class="btn ghost" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("Tosei Hotel Cocone Kanda")}" target="_blank" rel="noopener">📍 Google Maps</a>`
          : `<button class="btn collect ${gesammelt ? "done" : ""}" id="btn-collect">
          ${gesammelt ? "✓ Erledigt" : k.sammelbar ? "✅ Gesammelt!" : "✅ Besucht"}
        </button>`}
        ${bilderLink ? `<a class="btn ghost" href="${bilderLink}" target="_blank" rel="noopener">🔍 So sieht's aus</a>` : ""}
        <label class="btn ghost ${bilderLink ? "" : "full"}">${meinFoto ? "📷 Foto ändern" : "📷 Mein Foto"}
          <input type="file" accept="image/*" id="foto-input" hidden></label>
        ${meinFoto ? `<button class="btn ghost full" id="btn-foto-weg">Foto entfernen</button>` : ""}
        ${e.eigen ? `<button class="btn danger full" id="btn-delete">🗑️ Meinen Ort löschen</button>` : ""}
      </div>
      ${e.links?.length ? `<div class="links">${e.links.filter((l) => sichereUrl(l.url)).map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener">↗ ${esc(l.titel)}</a>`).join("")}</div>` : ""}
      ${laub ? laubLegende(e, laub, laubLive(e)) : ""}
      ${k.id === "filmspots" ? kameraTipps() : ""}
    </div>`;

  if (gesammelt) Effekte.hanko($("#sheet .hero"), state.frischGesammelt === e.id);
  state.frischGesammelt = null;
  markerHervorheben(e);
  // Ohne eigenes Foto: freie Beispielfotos von Wikimedia Commons nachladen
  if (!bild) {
    OrtFotos.fuer(e, k).then((fotos) => {
      if (offenerEintrag?.id === e.id && fotos.length) heroFotosZeigen(e, fotos);
    });
  }
  if (!e.hotel) {
    $("#btn-collect").onclick = () => besuchtUmschalten(e);
    $("#btn-fav").onclick = () => favoritUmschalten(e);
  }
  if (e.eigen) $("#btn-delete").onclick = () => eigenenLoeschen(e);
  $("#foto-input").onchange = (ev) => ev.target.files[0] && fotoSpeichern(e, ev.target.files[0]);
  if (meinFoto) $("#btn-foto-weg").onclick = () => fotoEntfernen(e);

  const sheet = $("#sheet");
  sheet.scrollTop = 0;
  sheet.classList.add("open");
  sheet.setAttribute("aria-hidden", "false");
}

/** Beispielfotos im Kopfbild zeigen – mit Fotograf & Lizenz; Antippen = nächstes Foto */
function heroFotosZeigen(e, fotos) {
  const hero = $("#sheet .hero");
  if (!hero || hero.querySelector("img.commons")) return;
  let nr = 0;
  const img = new Image();
  img.className = "commons";
  img.alt = e.name;
  const nachweis = document.createElement("a");
  nachweis.className = "foto-credit";
  nachweis.target = "_blank";
  nachweis.rel = "noopener";
  const punkte = document.createElement("div");
  punkte.className = "foto-punkte";
  punkte.innerHTML = fotos.length > 1 ? fotos.map(() => "<i></i>").join("") : "";

  const zeigen = () => {
    const foto = fotos[nr];
    img.classList.remove("da");
    img.src = foto.bild;
    nachweis.href = foto.seite;
    nachweis.textContent = `📷 ${foto.autor} · ${foto.lizenz} · Wikimedia Commons`;
    punkte.querySelectorAll("i").forEach((p, i) => p.classList.toggle("an", i === nr));
  };
  img.onload = () => { img.classList.add("da"); hero.classList.add("mit-foto"); };
  img.onerror = () => { if (nr < fotos.length - 1) { nr++; zeigen(); } };

  hero.prepend(img);
  hero.append(nachweis, punkte);
  if (fotos.length > 1) {
    hero.addEventListener("click", (ev) => {
      if (ev.target.closest(".foto-credit")) return;
      nr = (nr + 1) % fotos.length;
      zeigen();
    });
  }
  zeigen();
}

/** Hotel-Markierung: liegt außerhalb der Kategorien und ist deshalb immer zu sehen */
function hotelMarkerSetzen() {
  const icon = L.divIcon({
    className: "pin-wrap hotel-wrap",
    html: `<div class="hotel-pin"><i class="hotel-halo"></i><i class="hotel-halo"></i>
      <div class="hotel-schild"><span>宿</span></div><b class="hotel-name">Unser Hotel</b></div>`,
    iconSize: [56, 70],
    iconAnchor: [28, 62],
  });
  L.marker([HOTEL.lat, HOTEL.lng], { icon, zIndexOffset: 5000, title: HOTEL.name, keyboard: false })
    .on("click", () => sheetOeffnen(HOTEL))
    .addTo(map);
}
function zumHotel() {
  map.flyTo([HOTEL.lat, HOTEL.lng], Math.max(map.getZoom(), 16), { duration: 1 });
  setTimeout(() => sheetOeffnen(HOTEL), 700);
}

function markerHervorheben(e) {
  document.querySelectorAll(".pin.gewaehlt").forEach((p) => p.classList.remove("gewaehlt"));
  document.querySelectorAll(".pin-wrap.gewaehlt").forEach((p) => p.classList.remove("gewaehlt"));
  const m = e && markerNachId.get(e.id);
  if (!m) return;
  m.setZIndexOffset(1000);
  m.getElement()?.classList.add("gewaehlt");
  Effekte.nochmal(m.getElement()?.querySelector(".pin"), "gewaehlt");
}

function sheetSchliessen() {
  if ($("#sheet").classList.contains("open")) Klang.schliessen();
  markerHervorheben(null);
  $("#sheet").classList.remove("open");
  $("#sheet").setAttribute("aria-hidden", "true");
  offenerEintrag = null;
}

/* ---------- Favoriten ❤️ ---------- */
function favKnopf(e) {
  const an = state.favoriten.has(e.id);
  return `<button class="fav-knopf ${an ? "an" : ""}" id="btn-fav" aria-pressed="${an}"
    aria-label="${an ? "Aus Favoriten entfernen" : "Als Favorit merken"}"><span>${an ? "♥" : "♡"}</span></button>`;
}

function favoritUmschalten(e) {
  const an = !state.favoriten.has(e.id);
  if (an) state.favoriten.add(e.id);
  else state.favoriten.delete(e.id);
  speichern(SPEICHER.favoriten, [...state.favoriten]);
  // Knopf in der Detail-Karte austauschen (ohne die ganze Karte neu aufzubauen)
  const knopf = $("#btn-fav");
  if (knopf) {
    knopf.outerHTML = favKnopf(e);
    $("#btn-fav").onclick = () => favoritUmschalten(e);
    if (an) Effekte.herzen($("#btn-fav"));
  }
  if (an) { Klang.sammeln(); toast(state.favZeigen ? "❤️ Als Favorit gemerkt – ist jetzt immer auf der Karte" : "❤️ Als Favorit gemerkt"); }
  else toast("Aus den Favoriten entfernt");
  // Nur diesen einen Punkt neu zeichnen – außer er verschwindet dadurch von der Karte
  const m = markerNachId.get(e.id);
  const sichtbar = sichtbareEintraege().some((x) => x.id === e.id);
  if (m && sichtbar) { m.setIcon(pinIcon(e)); chipsZeichnen(); markerHervorheben(e); }
  else markerZeichnen();
  if ($("#panel").classList.contains("open")) panelZeichnen();
}

/** Favoriten auf der Karte ein-/ausblenden (wie eine Kategorie) */
function favoritenZeigenUmschalten() {
  state.favZeigen = !state.favZeigen;
  speichern(SPEICHER.favZeigen, state.favZeigen);
  markerZeichnen();
  Effekte.nochmal($("#chip-fav"), "bump");
  toast(state.favZeigen ? "❤️ Favoriten sind immer auf der Karte" : "🤍 Favoriten ausgeblendet (außer ihre Kategorie ist an)");
  if ($("#panel").classList.contains("open")) panelZeichnen();
}

function nurFavoritenUmschalten() {
  if (!state.nurFavoriten && !state.favoriten.size) return toast("Noch keine Favoriten – tippe in einem Ort auf ♡");
  state.nurFavoriten = !state.nurFavoriten;
  markerZeichnen();
  Effekte.nochmal($("#chip-fav"), "bump");
  toast(state.nurFavoriten ? "❤️ Karte zeigt nur deine Favoriten" : "Alle Kategorien wieder sichtbar");
  if ($("#panel").classList.contains("open")) panelZeichnen();
}

function besuchtUmschalten(e) {
  if (state.besucht.has(e.id)) state.besucht.delete(e.id);
  else {
    state.besucht.add(e.id);
    state.frischGesammelt = e.id;
    konfetti();
    Klang.sammeln();
    if (kategorie(e.kategorie).sammelbar && !state.fotos.has(e.id)) toast("Tipp: Halte es mit 📷 Mein Foto fest!");
  }
  speichern(SPEICHER.besucht, [...state.besucht]);
  markerZeichnen();
  sheetOeffnen(e);
}

async function fotoSpeichern(e, datei) {
  try {
    const bild = await fotoVerkleinern(datei, 1200);
    await fotoSpeicher.setzen(e.id, bild);
    state.fotos.set(e.id, bild);
    if (!state.besucht.has(e.id)) {
      state.besucht.add(e.id);
      state.frischGesammelt = e.id;
      speichern(SPEICHER.besucht, [...state.besucht]);
      markerZeichnen();
    }
    konfetti();
    Klang.sammeln();
    toast("📷 Foto gespeichert");
    sheetOeffnen(e);
  } catch {
    toast("⚠️ Foto konnte nicht gespeichert werden");
  }
}

async function fotoEntfernen(e) {
  if (!confirm("Foto wirklich entfernen?")) return;
  await fotoSpeicher.loeschen(e.id);
  state.fotos.delete(e.id);
  sheetOeffnen(e);
}

/** Kleine Feier-Animation beim Sammeln: Kirschblüten und Goldfunken fliegen auf */
function konfetti() {
  if (Effekte.ruhig) return;
  const farben = ["#f4b6c2", "#fbd3dc", "#ffffff", "#f7c9d2", "#e8a0b4"];
  for (let i = 0; i < 34; i++) {
    const p = document.createElement("i");
    const blatt = i % 4 !== 0;
    const winkel = -Math.PI / 2 + (Math.random() - 0.5) * 2.4, weite = 90 + Math.random() * 170;
    Object.assign(p.style, {
      position: "fixed", left: "50%", top: "62%", zIndex: 2000, pointerEvents: "none",
      width: blatt ? "12px" : "6px", height: blatt ? "10px" : "6px",
      borderRadius: blatt ? "12px 0 12px 0" : "50%",
      background: blatt ? farben[i % farben.length] : "#e0b86a",
      boxShadow: blatt ? "none" : "0 0 8px #ffd98a",
    });
    document.body.appendChild(p);
    const x = Math.cos(winkel) * weite, y = Math.sin(winkel) * weite;
    p.animate(
      [
        { transform: "translate(0,0) rotate(0) scale(0.4)", opacity: 1 },
        { transform: `translate(${x}px, ${y}px) rotate(${Math.random() * 360}deg) scale(1)`, opacity: 1, offset: 0.45 },
        { transform: `translate(${x + (Math.random() - 0.5) * 80}px, ${y + 160}px) rotate(${Math.random() * 720}deg) scale(0.9)`, opacity: 0 },
      ],
      { duration: 1400 + Math.random() * 700, easing: "cubic-bezier(.2,.7,.3,1)" }
    ).onfinish = () => p.remove();
  }
}

/** Nach unten wischen schließt die Detail-Karte */
function sheetWischen() {
  const sheet = $("#sheet");
  // Parallax: Das Bild oben bewegt sich beim Scrollen langsamer als der Text
  sheet.addEventListener("scroll", () => sheet.style.setProperty("--scroll", Math.min(sheet.scrollTop, 300)), { passive: true });
  let startY = null, dy = 0;
  sheet.addEventListener("touchstart", (ev) => {
    if (sheet.scrollTop > 0) return;
    startY = ev.touches[0].clientY; dy = 0;
    sheet.style.transition = "none";
  }, { passive: true });
  sheet.addEventListener("touchmove", (ev) => {
    if (startY === null) return;
    dy = Math.max(0, ev.touches[0].clientY - startY);
    if (dy > 0) sheet.style.transform = `translateY(${dy}px)`;
  }, { passive: true });
  sheet.addEventListener("touchend", () => {
    if (startY === null) return;
    sheet.style.transition = "";
    sheet.style.transform = "";
    if (dy > 110) sheetSchliessen();
    startY = null;
  });
}

/* ---------- Wetter & Sonne (Daten: js/wetter.js) ---------- */
const INDOOR_KATEGORIEN = ["anime", "premiumfiguren", "gacha", "mode", "attraktionen"];

function wetterHtml() {
  const iso = state.datum, heute = heuteInTokio();
  const kurz = (d) => datumSchoen(d, { weekday: "short", day: "numeric", month: "numeric" });
  const grad = (x) => (x == null ? "–" : Math.round(x) + "°");
  if (!Wetter.daten) {
    if (Wetter.versucht) return `<h3 class="section-title">🌤️ Wetter & Sonne</h3><div class="wetter-karte laedt">📵 Wetter gerade nicht erreichbar – kein Internet? Es wird beim nächsten Öffnen neu geladen.</div>`;
    Wetter.laden().then(wetterAktualisieren);
    return `<h3 class="section-title">🌤️ Wetter & Sonne</h3><div class="wetter-karte laedt">⏳ Wetter wird geladen …</div>`;
  }
  // 1) Gewählter Tag: Vorhersage (bzw. „so war es“ für vergangene Tage) oder Durchschnitt
  const tag = Wetter.tag(iso);
  let auswahl = "";
  if (tag) {
    const c = Wetter.code(tag.code);
    const titel = iso < heute ? "So war das Wetter" : iso === heute ? "Heute – Vorhersage" : "Vorhersage";
    const jetztStunde = iso === heute ? (Wetter.daten.current?.time || "").slice(11, 13) : "";
    const stunden = Wetter.stunden(iso).filter((h) => !jetztStunde || h.uhr.slice(0, 2) >= jetztStunde);
    auswahl = `<div class="wetter-karte ${c.regen ? "nass" : ""}">
      <div class="wk-kopf">${titel} · ${kurz(iso)}</div>
      <div class="wk-haupt">
        <span class="wk-icon">${c.icon}</span>
        <div class="wk-temp"><b>${grad(tag.max)}</b><span>/ ${grad(tag.min)}</span><small>${c.text}</small></div>
        <ul class="wk-werte"><li>☔ ${tag.regen ?? "–"} %</li><li>💧 ${tag.menge?.toFixed(1) ?? "–"} mm</li><li>💨 ${Math.round(tag.wind ?? 0)} km/h</li></ul>
      </div>
      ${stunden.length ? `<div class="wk-stunden">${stunden.map((h, i) => `<div style="--i:${i}">
        <small>${h.uhr.slice(0, 2)} Uhr</small><span>${Wetter.code(h.code, h.tag).icon}</span><b>${grad(h.temp)}</b><i>${h.regen ?? 0} %</i></div>`).join("")}</div>` : ""}
    </div>`;
    if (iso >= heute && (tag.regen >= 60 || tag.menge >= 5)) {
      auswahl += `<div class="regen-tipp">☔ <span><b>Regentag?</b> Shops, Figuren, Gachapon & Attraktionen sind meist drinnen.
        <br>🎥 Für Filmer ein Glücksfall: Abends spiegeln sich die Neonschilder auf den nassen Straßen.</span>
        <button class="btn ghost" id="indoor-knopf">Nur drinnen zeigen</button></div>`;
    }
  } else if (iso > (Wetter.letzterTag() || iso)) {
    const ab = plusTage(iso, -15);
    const k = Wetter.klima?.[iso.slice(5)];
    if (!Wetter.klima && !Wetter.klimaVersucht) Wetter.klimaLaden().then(wetterAktualisieren);
    auswahl = `<div class="wetter-karte klima">
      <div class="wk-kopf">Noch keine Vorhersage · ${kurz(iso)}</div>
      <p class="wk-hinweis">Die Vorhersage gibt es ca. 16 Tage vorher – ab dem ${datumSchoen(ab, { day: "numeric", month: "long" })}.
        ${k ? "So ist es an diesem Tag normalerweise (Durchschnitt der letzten 10 Jahre):" : Wetter.klimaVersucht && !Wetter.klima ? "" : "Durchschnittswerte werden geladen …"}</p>
      ${k ? `<div class="wk-haupt">
        <span class="wk-icon">${k.sonne >= 6 ? "☀️" : k.sonne >= 3 ? "⛅" : "☁️"}</span>
        <div class="wk-temp"><b>${grad(k.max)}</b><span>/ ${grad(k.min)}</span><small>üblich</small></div>
        <ul class="wk-werte"><li>☔ Regen in ${k.regenJahre} von ${k.jahre} Jahren</li><li>☀️ ca. ${k.sonne.toFixed(1)} h Sonne</li></ul>
      </div>` : ""}
    </div>`;
  }
  // 2) Immer dabei: wie es gerade wirklich ist
  const jetzt = Wetter.daten.current;
  let wirklich = "";
  if (jetzt) {
    const c = Wetter.code(jetzt.weather_code, jetzt.is_day);
    const heuteTag = Wetter.tag(heute);
    wirklich = `<div class="wetter-karte jetzt">
      <div class="wk-kopf">📡 Jetzt gerade in Tokio · ${kurz(heute)}, ${jetzt.time.slice(11, 16)} Uhr Japan</div>
      <div class="wk-haupt">
        <span class="wk-icon">${c.icon}</span>
        <div class="wk-temp"><b>${grad(jetzt.temperature_2m)}</b><span>gefühlt ${grad(jetzt.apparent_temperature)}</span><small>${c.text}</small></div>
        <ul class="wk-werte">${heuteTag ? `<li>🌡️ heute ${grad(heuteTag.max)} / ${grad(heuteTag.min)}</li>` : ""}<li>💨 ${Math.round(jetzt.wind_speed_10m)} km/h</li><li>💧 ${jetzt.relative_humidity_2m} % Luftf.</li></ul>
      </div>
    </div>`;
  }
  // 3) Sonne für den gewählten Tag
  const sonne = Wetter.sonne(iso);
  const plusMin = (d, m) => Wetter.zeit(new Date(d.getTime() + m * 60000));
  const licht = `<div class="sonnen-karte">
    <div><span>🌅</span><small>Aufgang</small><b>${Wetter.zeit(sonne.auf)}</b></div>
    <div><span>🌇</span><small>Untergang</small><b>${Wetter.zeit(sonne.unter)}</b></div>
    <div><span>🔵</span><small>Blaue Stunde</small><b>${plusMin(sonne.unter, 5)}–${plusMin(sonne.unter, 30)}</b></div>
    <p>✨ Illuminationen & Tempel bei Nacht lohnen sich ab ca. <b>${plusMin(sonne.unter, 20)} Uhr</b>.<br>
      <small>Alle Uhrzeiten in japanischer Zeit${sonne.genau ? "" : " · ± 3 Min."}</small></p>
  </div>`;
  const stand = `<p class="wk-quelle">Wetter: <a href="https://open-meteo.com" target="_blank" rel="noopener">Open-Meteo.com</a> (die ersten Tage vom japanischen Wetterdienst JMA) · aktualisiert ${new Date(Wetter.daten.geholt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr (deine Zeit)</p>`;
  return `<h3 class="section-title">🌤️ Wetter & Sonne</h3>` + (iso === heute ? wirklich + auswahl : auswahl + wirklich) + licht + stand;
}

/** Wetter-Bereich neu zeichnen, sobald Daten da sind (ohne das ganze Panel neu aufzubauen) */
function wetterAktualisieren() {
  const block = $("#wetter-block");
  if (block) block.innerHTML = wetterHtml();
  if ($("#date-modal").classList.contains("open")) kalenderZeichnen();
}

function nurDrinnenZeigen() {
  state.aktiv = new Set(INDOOR_KATEGORIEN.filter((id) => state.kategorien.some((k) => k.id === id)));
  katGespeichert();
  toast("☔ Nur noch Ziele unter Dach – über „Kategorien“ wieder alles einschalten");
}

/* ---------- Gyoza-Radar 🥟 ---------- */
const GyozaRadar = {
  zentrum: null,      // { lat, lng, art: "ich" | "karte" | "hotel" }
  RUND: 4,            // Sekunden pro Umdrehung des Radarstrahls

  async oeffnen() {
    modal("radar-modal", true);
    Klang.oeffnen();
    this.zentrumWaehlen("ich");
  },

  async zentrumWaehlen(art) {
    document.querySelectorAll("#radar-wahl button").forEach((b) => b.classList.toggle("on", b.dataset.zentrum === art));
    if (art === "hotel") return this.zeigen({ lat: HOTEL.lat, lng: HOTEL.lng, art }, "rund ums Hotel");
    if (art === "karte") { const c = map.getCenter(); return this.zeigen({ lat: c.lat, lng: c.lng, art }, "rund um die Kartenmitte"); }
    // „Um mich“: Standort holen
    $("#radar-info").textContent = "📡 Suche deinen Standort …";
    $("#radar-schirm").innerHTML = this.schirm([], 1, true);
    $("#radar-liste").innerHTML = "";
    const pos = await new Promise((fertig) => {
      if (!navigator.geolocation) return fertig(null);
      navigator.geolocation.getCurrentPosition((p) => fertig({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => fertig(null), { enableHighAccuracy: true, timeout: 9000, maximumAge: 60000 });
    });
    if (!pos) return this.zeigen({ lat: HOTEL.lat, lng: HOTEL.lng, art: "hotel" }, "Standort nicht verfügbar – zeige rund ums Hotel");
    state.meinOrt = pos;
    if (distanzKm(pos, START_ANSICHT) > 60) return this.zeigen({ lat: HOTEL.lat, lng: HOTEL.lng, art: "hotel" }, "Du bist (noch) nicht in Tokio – zeige rund ums Hotel");
    this.zeigen({ ...pos, art: "ich" }, "rund um dich");
  },

  /** Richtung (0° = Norden, im Uhrzeigersinn) und Entfernung von a nach b */
  peilung(a, b) {
    const rad = Math.PI / 180;
    const y = Math.sin((b.lng - a.lng) * rad) * Math.cos(b.lat * rad);
    const x = Math.cos(a.lat * rad) * Math.sin(b.lat * rad) - Math.sin(a.lat * rad) * Math.cos(b.lat * rad) * Math.cos((b.lng - a.lng) * rad);
    return ((Math.atan2(y, x) / rad) + 360) % 360;
  },

  zeigen(zentrum, text) {
    this.zentrum = zentrum;
    const laeden = state.eintraege.filter((e) => e.kategorie === "gyoza")
      .map((e) => ({ e, km: distanzKm(zentrum, e), grad: this.peilung(zentrum, e) }))
      .sort((a, b) => a.km - b.km);
    // Reichweite so wählen, dass mindestens 5 Läden auf dem Schirm sind
    const stufen = [0.5, 1, 2, 3, 5, 8, 12, 20, 40];
    const weite = stufen.find((w) => laeden.filter((l) => l.km <= w).length >= 5) || 40;
    const imRadar = laeden.filter((l) => l.km <= weite);
    $("#radar-info").textContent = `${imRadar.length} Gyoza-Läden im Umkreis von ${weite < 1 ? weite * 1000 + " m" : weite + " km"} – ${text}`;
    $("#radar-schirm").innerHTML = this.schirm(imRadar, weite);
    $("#radar-liste").innerHTML = laeden.slice(0, 12).map((l, i) => this.zeile(l, i)).join("");
    navigator.vibrate?.([20, 60, 20]);
  },

  /** Der runde Radarschirm (SVG) mit kreisendem Strahl und aufleuchtenden Punkten */
  schirm(laeden, weite, sucht = false) {
    const R = 140;
    const ringe = [1 / 3, 2 / 3, 1].map((f) => {
      const km = weite * f;
      return `<circle r="${R * f}" class="r-ring"/><text x="4" y="${-R * f + 12}" class="r-text">${km < 1 ? Math.round(km * 1000) + " m" : (Math.round(km * 10) / 10) + " km"}</text>`;
    }).join("");
    const punkte = laeden.map((l, i) => {
      const r = Math.min(1, l.km / weite) * R, w = (l.grad * Math.PI) / 180;
      const x = Math.sin(w) * r, y = -Math.cos(w) * r;
      return `<g class="r-punkt ${l.e.top ? "top" : ""}" data-id="${esc(l.e.id)}" style="--v:${((l.grad / 360) * this.RUND).toFixed(2)}s" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">
        <circle r="${l.e.top ? 7 : 5.5}" class="r-blip"/><circle r="${l.e.top ? 7 : 5.5}" class="r-welle"/>${i < 3 ? `<text y="-10" class="r-nr">${i + 1}</text>` : ""}</g>`;
    }).join("");
    return `<svg viewBox="-150 -150 300 300" class="${sucht ? "sucht" : ""}" aria-label="Radar">
      <defs><linearGradient id="r-strahl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffb347" stop-opacity="0"/><stop offset="1" stop-color="#ffb347" stop-opacity=".55"/></linearGradient></defs>
      <circle r="${R}" class="r-grund"/>${ringe}
      <path d="M0 ${-R} V${R} M${-R} 0 H${R}" class="r-kreuz"/>
      <text y="${-R - 2}" class="r-n">N</text>
      <g class="r-strahl" style="--rund:${this.RUND}s"><path d="M0 0 L0 ${-R} A${R} ${R} 0 0 1 ${(R * Math.sin(Math.PI / 4)).toFixed(1)} ${(-R * Math.cos(Math.PI / 4)).toFixed(1)} Z" fill="url(#r-strahl)" transform="rotate(-45)"/></g>
      ${punkte}
      <circle r="6" class="r-ich"/><circle r="6" class="r-ich-welle"/>
    </svg>`;
  },

  zeile(l, i) {
    const e = l.e;
    const meter = l.km * 1000, minuten = Math.max(1, Math.round(meter / 80));
    const tag = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"][new Date(heuteInTokio() + "T12:00:00Z").getUTCDay()];
    const ruhetagHeute = (e.ruhetage || []).includes(tag);
    const route = `https://www.google.com/maps/dir/?api=1&destination=${e.lat},${e.lng}&travelmode=${l.km < 2 ? "walking" : "transit"}`;
    return `<div class="radar-zeile ${e.top ? "top" : ""}" style="--i:${i}" data-id="${esc(e.id)}">
      <span class="rz-nr">${i + 1}</span>
      <div class="rz-text">
        <b>${esc(e.name)}</b>
        <small>${e.top ? "⭐ Bestenliste 2024" : "👍 Bestenliste " + esc(e.listen.join(" / "))} · ${esc(e.station)}</small>
        <small>${meter < 1000 ? Math.round(meter / 10) * 10 + " m" : l.km.toFixed(1) + " km"} · ${l.km < 2 ? `ca. ${minuten} Min. zu Fuß` : "mit der Bahn"}${e.lageUngefaehr ? " · Lage ungefähr" : ""}
          ${ruhetagHeute ? ` · <em>heute Ruhetag!</em>` : ""}</small>
      </div>
      <div class="rz-knoepfe">
        <a class="btn" href="${route}" target="_blank" rel="noopener">🧭</a>
        <button class="btn ghost" data-info="${esc(e.id)}">Infos</button>
      </div>
    </div>`;
  },

  listeKlick(ev) {
    const info = ev.target.closest("[data-info]") || ev.target.closest(".r-punkt");
    if (!info) return;
    const id = info.dataset.info || info.dataset.id;
    const e = state.eintraege.find((x) => x.id === id);
    if (!e) return;
    modal("radar-modal", false);
    if (!state.aktiv.has("gyoza")) { state.aktiv.add("gyoza"); katGespeichert(); }
    zuOrt(e);
    setTimeout(() => sheetOeffnen(e), 600);
  },
};

/* ---------- 7. Seitenpanel ---------- */
let panelTab = "heute";

function panelOeffnen(tab = panelTab) {
  panelTab = tab;
  panelZeichnen();
  $("#panel").classList.add("open");
  $("#panel").setAttribute("aria-hidden", "false");
  dockMarkieren();
}
function panelSchliessen() {
  $("#panel").classList.remove("open");
  $("#panel").setAttribute("aria-hidden", "true");
  dockMarkieren();
}
/** Unten in der Leiste zeigen, welcher Bereich gerade offen ist */
function dockMarkieren() {
  const offen = $("#panel").classList.contains("open");
  $("#dock-tag").classList.toggle("aktiv", offen && panelTab === "heute");
  $("#dock-sammlung").classList.toggle("aktiv", offen && panelTab === "sammlung");
  $("#dock-fav")?.classList.toggle("aktiv", offen && panelTab === "favoriten");
}

function listItem(e, i, seite = "") {
  const k = kategorie(e.kategorie);
  // In der Sammlung ist alles erledigt – dort nicht blass machen
  const blass = state.besucht.has(e.id) && panelTab !== "sammlung";
  return `<button class="list-item ${blass ? "erledigt" : ""}" data-id="${esc(e.id)}" style="--c:${esc(k.farbe)};--i:${i}">
    <span class="li-icon">${k.icon}</span>
    <span><b>${esc(e.name)}</b><small>${esc(e.station || k.name)}</small></span>
    <span class="li-side">${esc(seite)}</span>
  </button>`;
}

/** Ein Siegel im Stempelheft: erstes japanisches Schriftzeichen des Namens */
function siegel(e, i) {
  const zeichen = [...(e.nameJa || "")].find((z) => /[\u3400-\u9fff\u3040-\u30ff]/.test(z)) || kategorie(e.kategorie).icon;
  const voll = state.besucht.has(e.id);
  const drehung = ((e.id.length * 37) % 24) - 12;
  return `<button class="siegel ${voll ? "voll" : ""}" data-id="${esc(e.id)}" title="${esc(e.name)}"
    style="--r:${drehung}deg;--i:${Math.min(i, 60)}"><span>${esc(zeichen)}</span></button>`;
}

function nachDistanz(liste) {
  return state.meinOrt ? [...liste].sort((a, b) => distanzKm(state.meinOrt, a) - distanzKm(state.meinOrt, b)) : liste;
}

function panelZeichnen(suchbegriff = "") {
  const tabs = [["heute", "📅 Tag"], ["favoriten", "❤️ Favoriten"], ["sammlung", "🏆 Sammlung"], ["meine", "✏️ Meine"], ["hilfe", "⚙️"]];
  let html = `<div class="tabs">${tabs.map(([id, t]) => `<button data-tab="${id}" class="${panelTab === id ? "on" : ""}">${t}</button>`).join("")}</div>`;

  if (panelTab === "suche") {
    $("#panel-title").textContent = "Suche";
    const q = normal(suchbegriff);
    const treffer = state.eintraege.filter((e) =>
      normal([e.name, e.nameJa, e.station, e.beschreibung, ...(e.tags || [])].join(" ")).includes(q)
    );
    html += treffer.length
      ? `<div class="list">${nachDistanz(treffer).map((e, i) => listItem(e, i, distanzText(e))).join("")}</div>`
      : `<div class="empty">Nichts gefunden für „${esc(suchbegriff)}“ 🤔</div>`;
  }

  if (panelTab === "heute") {
    $("#panel-title").textContent = "Dein Tag";
    const zeitlich = state.eintraege.filter((e) => e.zeitraum && istAktiv(e));
    const naechsterStart = (e) => e.zeitraum.map((z) => z.von).filter((v) => v > state.datum).sort()[0];
    const bald = state.eintraege
      .filter((e) => e.zeitraum && !istAktiv(e) && naechsterStart(e))
      .sort((a, b) => naechsterStart(a).localeCompare(naechsterStart(b)));
    const reiseTag = tageZwischen(REISE.von, state.datum) + 1;
    const reiseTage = tageZwischen(REISE.von, REISE.bis) + 1;
    // Bild über dem Kalenderblatt: Herbstlaub, sobald viele Orte auf dem Höhepunkt sind
    const laubHoch = state.eintraege.filter((e) => e.laub && laubStatus(e).stufe === "hoch").length;
    const wetterTag = Wetter.tag(state.datum);
    const regnet = wetterTag && Wetter.code(wetterTag.code).regen;
    html += `<div class="tageskarte">
      <div class="tk-szene ${regnet ? "regen" : ""}">${Szenen.fuer(laubHoch >= 15 ? "herbstlaub" : "abend")}</div>
      <div class="tk-datum">
        <span class="tk-monat">${datumSchoen(state.datum, { month: "long" })}</span>
        <b>${Number(state.datum.slice(8))}</b>
        <span class="tk-kanji">${"日月火水木金土"[new Date(state.datum + "T12:00:00Z").getUTCDay()]}曜日</span>
      </div>
      <div class="tk-info">
        <strong>${datumSchoen(state.datum, { weekday: "long" })}</strong>
        ${reiseTag >= 1 && reiseTag <= reiseTage ? `<span>Reisetag ${reiseTag} von ${reiseTage}</span>` : ""}
        <span>✨ <b data-ziel="${zeitlich.length}">0</b> Highlights an diesem Tag</span>
      </div>
    </div>
    <div id="wetter-block">${wetterHtml()}</div>`;
    html += `<h3 class="section-title">✨ Läuft an diesem Tag (${zeitlich.length})</h3>`;
    html += zeitlich.length
      ? `<div class="list">${erledigtNachHinten(nachDistanz(zeitlich)).map((e, i) => listItem(e, i, zeitStatus(e).kurz)).join("")}</div>`
      : `<div class="empty">Keine zeitlich begrenzten Events an diesem Tag.</div>`;
    if (bald.length) {
      html += `<h3 class="section-title">⏳ Startet bald</h3>`;
      html += `<div class="list">${erledigtNachHinten(bald).map((e, i) => listItem(e, i, zeitStatus(e).kurz)).join("")}</div>`;
    }
    // Herbstlaub: was ist an diesem Tag auf dem Höhepunkt / färbt sich gerade?
    const laubOrte = state.eintraege.filter((e) => e.laub);
    const aufHoehe = laubOrte.filter((e) => laubStatus(e).stufe === "hoch");
    const faerbt = laubOrte.filter((e) => laubStatus(e).stufe === "faerbt")
      .sort((a, b) => a.laub.von.localeCompare(b.laub.von));
    if (aufHoehe.length) {
      html += `<h3 class="section-title">🍁 Herbstlaub auf dem Höhepunkt (${aufHoehe.length})</h3>`;
      html += `<div class="list">${erledigtNachHinten(nachDistanz(aufHoehe)).map((e, i) => listItem(e, i, "Höhepunkt")).join("")}</div>`;
    }
    if (faerbt.length) {
      html += `<h3 class="section-title">🍂 Färbt sich gerade (${faerbt.length})</h3>`;
      html += `<div class="list">${erledigtNachHinten(faerbt).slice(0, 12).map((e, i) => listItem(e, i, "ab " + datumSchoen(e.laub.von, { day: "numeric", month: "numeric" }))).join("")}</div>`;
    }
  }

  if (panelTab === "sammlung") {
    $("#panel-title").textContent = "Meine Sammlung";
    html += state.kategorien
      .map((k) => {
        const alle = state.eintraege.filter((e) => e.kategorie === k.id);
        const done = alle.filter((e) => state.besucht.has(e.id)).length;
        const pz = alle.length ? Math.round((done / alle.length) * 100) : 0;
        return `<div class="progress-card ${pz === 100 ? "voll" : ""}" style="--c:${esc(k.farbe)}">
          <header><span>${k.icon} ${esc(k.name)}</span><span><b data-ziel="${done}">0</b> / ${alle.length}</span></header>
          <div class="bar"><i data-w="${pz}%"></i></div></div>`;
      })
      .join("");
    // Stempelheft: jeder Stempel/Goshuin als Siegel – rot, sobald gesammelt
    state.kategorien.filter((k) => k.sammelbar).forEach((k) => {
      const alle = state.eintraege.filter((e) => e.kategorie === k.id);
      const done = alle.filter((e) => state.besucht.has(e.id)).length;
      html += `<details class="stempelheft" style="--c:${esc(k.farbe)}">
        <summary><span>📖 Stempelheft: ${esc(k.name)}</span><b>${done} / ${alle.length}</b></summary>
        <div class="siegel-raster">${alle.map((e, i) => siegel(e, i)).join("")}</div></details>`;
    });
    const mitFoto = state.eintraege.filter((e) => state.fotos.has(e.id));
    if (mitFoto.length) {
      html += `<h3 class="section-title">📷 Meine Fotos (${mitFoto.length})</h3><div class="galerie">${mitFoto
        .map((e, i) => `<button class="list-item foto" data-id="${esc(e.id)}" style="--i:${i}" title="${esc(e.name)}">
          <img src="${state.fotos.get(e.id)}" alt="${esc(e.name)}" loading="lazy"></button>`).join("")}</div>`;
    }
    const erledigt = state.eintraege.filter((e) => state.besucht.has(e.id));
    if (erledigt.length) html += `<h3 class="section-title">✓ Erledigt</h3><div class="list">${erledigt.map((e, i) => listItem(e, i, "✓")).join("")}</div>`;
  }

  if (panelTab === "favoriten") {
    $("#panel-title").textContent = "Meine Favoriten";
    const favs = state.eintraege.filter((e) => state.favoriten.has(e.id));
    if (!favs.length) {
      html += `<div class="empty fav-leer"><span>♡</span>Noch keine Favoriten.<br>Öffne einen Ort und tippe auf das Herz ♡ neben dem Namen –
        dann landet er hier und ist auf der Karte mit einem kleinen Herz markiert.</div>`;
    } else {
      html += `<button class="einstellung ${state.favZeigen ? "on" : ""}" id="fav-zeigen-schalter" aria-pressed="${state.favZeigen}">
        <span class="es-icon">❤️</span>
        <span class="es-text"><b>Favoriten immer zeigen</b><small>Auch wenn ihre Kategorie ausgeschaltet ist</small></span>
        <span class="schalter" aria-hidden="true"></span></button>
        <button class="einstellung ${state.nurFavoriten ? "on" : ""}" id="fav-schalter" aria-pressed="${state.nurFavoriten}" style="margin-top:10px">
        <span class="es-icon">🗺️</span>
        <span class="es-text"><b>Nur Favoriten auf der Karte</b><small>Blendet alles andere aus (oder lange auf den Favoriten-Chip drücken)</small></span>
        <span class="schalter" aria-hidden="true"></span></button>`;
      const seite = (e) => distanzText(e) || laubStatus(e)?.kurz || zeitStatus(e)?.kurz || kategorie(e.kategorie).name;
      html += `<h3 class="section-title">❤️ ${favs.length} ${favs.length === 1 ? "Ort" : "Orte"} gemerkt</h3>
        <div class="list">${erledigtNachHinten(nachDistanz(favs)).map((e, i) => listItem(e, i, seite(e))).join("")}</div>`;
    }
  }

  if (panelTab === "meine") {
    $("#panel-title").textContent = "Meine Orte";
    html += `<p class="muted">Orte, die du mit ＋ angelegt hast. Sie sind nur auf diesem Gerät gespeichert. Mit „Exportieren“ bekommst du sie als Text, den du in eine Datei in <code>data/</code> kopieren kannst – dann sind sie dauerhaft in der App.</p>
      <div class="actions" style="margin:12px 0">
        <button class="btn" id="btn-export">⬇️ Exportieren</button>
        <label class="btn ghost">⬆️ Importieren<input type="file" id="import-file" accept=".json,application/json" hidden></label>
      </div>`;
    const eigene = state.eintraege.filter((e) => e.eigen);
    html += eigene.length
      ? `<div class="list">${eigene.map((e, i) => listItem(e, i, distanzText(e))).join("")}</div>`
      : `<div class="empty">Noch keine eigenen Orte. Tippe auf ＋ oder drücke lange auf die Karte.</div>`;
  }

  if (panelTab === "hilfe") {
    $("#panel-title").textContent = "Einstellungen & Hilfe";
    html += `<button class="einstellung ${Klang.aktiv ? "on" : ""}" id="klang-schalter" aria-pressed="${Klang.aktiv}">
      <span class="es-icon">${Klang.aktiv ? "🔊" : "🔇"}</span>
      <span class="es-text"><b>Klänge</b><small>Leises Klicken & kurze Töne</small></span>
      <span class="schalter" aria-hidden="true"></span>
    </button>
    <button class="einstellung ${OrtFotos.aktiv ? "on" : ""}" id="foto-schalter" aria-pressed="${OrtFotos.aktiv}" style="margin-top:10px">
      <span class="es-icon">🖼️</span>
      <span class="es-text"><b>Beispielfotos</b><small>Freie Fotos von Wikimedia Commons (braucht Internet)</small></span>
      <span class="schalter" aria-hidden="true"></span>
    </button>
    <button class="einstellung ${state.erledigteAusblenden ? "on" : ""}" id="erledigt-schalter" aria-pressed="${state.erledigteAusblenden}" style="margin-top:10px">
      <span class="es-icon">✓</span>
      <span class="es-text"><b>Erledigtes ausblenden</b><small>Aus: erledigte Orte bleiben halb durchsichtig auf der Karte</small></span>
      <span class="schalter" aria-hidden="true"></span>
    </button>
    <h3 class="section-title">So funktioniert's</h3>
    <div class="list" style="gap:12px;line-height:1.5">
      <p>🎛️ <b>Kategorien</b>: Oben einzelne Kategorien antippen = ein-/ausblenden. Der Knopf „Kategorien“ öffnet die große Übersicht (lange drücken = nur diese Kategorie).</p>
      <p>📅 <b>Datum</b> (Knopf oben rechts) = Illuminationen & limitierte Goshuincho für diesen Tag. Pulsierende Marker laufen am gewählten Tag.</p>
      <p>✅ <b>Gesammelt/Besucht</b> markieren – Fortschritt unter 🏆 Sammlung.</p>
      <p>⚠️ <b>Datum unbestätigt</b> = Termin geschätzt aus dem Vorjahr. Bitte kurz auf der offiziellen Seite prüfen.</p>
      <p>＋ <b>Eigener Ort</b>: Karte verschieben, ＋ tippen, nochmal ＋ – oder lange auf die Karte drücken.</p>
      <p>📲 <b>Als App installieren</b>: iPhone → Safari → Teilen → „Zum Home-Bildschirm“. Android → Chrome → ⋮ → „App installieren“.</p>
    </div>`;
  }

  $("#panel-body").innerHTML = html;
  Effekte.hochzaehlen($("#panel-body"));
  // Fortschrittsbalken animiert füllen
  requestAnimationFrame(() => document.querySelectorAll(".bar i").forEach((b) => (b.style.width = b.dataset.w)));
}

function panelKlick(ev) {
  const tab = ev.target.closest("[data-tab]");
  if (tab) { panelTab = tab.dataset.tab; dockMarkieren(); return panelZeichnen(); }
  const item = ev.target.closest(".list-item, .siegel");
  if (item) {
    const e = state.eintraege.find((x) => x.id === item.dataset.id);
    if (!e) return;
    if (!state.aktiv.has(e.kategorie)) { state.aktiv.add(e.kategorie); markerZeichnen(); }
    panelSchliessen();
    zuOrt(e);
    setTimeout(() => sheetOeffnen(e), 500);
  }
  if (ev.target.id === "btn-export") exportieren();
  if (ev.target.closest("#foto-schalter")) {
    OrtFotos.umschalten();
    panelZeichnen();
  }
  if (ev.target.closest("#fav-schalter")) nurFavoritenUmschalten();
  if (ev.target.closest("#fav-zeigen-schalter")) {
    if (state.nurFavoriten) nurFavoritenUmschalten();
    favoritenZeigenUmschalten();
  }
  if (ev.target.closest("#indoor-knopf")) nurDrinnenZeigen();
  if (ev.target.closest("#erledigt-schalter")) {
    state.erledigteAusblenden = !state.erledigteAusblenden;
    speichern(SPEICHER.erledigtAus, state.erledigteAusblenden);
    markerZeichnen();
    panelZeichnen();
    toast(state.erledigteAusblenden ? "✓ Erledigtes ist ausgeblendet" : "✓ Erledigtes wird wieder (blass) gezeigt");
  }
  if (ev.target.closest("#klang-schalter")) {
    Klang.umschalten();
    panelZeichnen();
  }
}

function exportieren() {
  const daten = state.eigene.map(({ eigen, ...rest }) => rest);
  const text = JSON.stringify(daten, null, 2);
  navigator.clipboard?.writeText(text).then(() => toast("📋 In die Zwischenablage kopiert"), () => {});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  a.download = "meine-orte.json";
  a.click();
  URL.revokeObjectURL(a.href);
}

function importieren(datei) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const neu = JSON.parse(reader.result);
      if (!Array.isArray(neu)) throw new Error("keine Liste");
      const ids = new Set(state.eigene.map((e) => e.id));
      state.eigene.push(...neu.filter((e) => e.id && !ids.has(e.id) && isFinite(e.lat) && isFinite(e.lng)));
      speichern(SPEICHER.eigene, state.eigene);
      alleEintraegeNeu();
      markerZeichnen();
      panelZeichnen();
      toast("✅ Importiert");
    } catch {
      toast("⚠️ Datei konnte nicht gelesen werden");
    }
  };
  reader.readAsText(datei);
}

/* ---------- 8. Datum wählen ---------- */
function datumAnzeigen() {
  const heute = heuteInTokio();
  $("#date-day").textContent = datumSchoen(state.datum, { day: "numeric", month: "short" });
  $("#date-label").textContent = state.alleZeigen ? "alle Tage" : state.datum === heute ? "Heute" : datumSchoen(state.datum, { weekday: "short" });
  Effekte.nochmal($("#btn-date"), "flip");
}

function kalenderZeichnen() {
  const heute = heuteInTokio();
  const tage = tageZwischen(REISE.von, REISE.bis) + 1;
  // Montag = erste Spalte
  const versatz = (new Date(REISE.von + "T12:00:00Z").getUTCDay() + 6) % 7;
  let html = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((t) => `<span class="wd">${t}</span>`).join("");
  html += "<span></span>".repeat(versatz);
  for (let i = 0; i < tage; i++) {
    const iso = plusTage(REISE.von, i);
    const events = state.eintraege.filter((e) => e.zeitraum && istAktiv(e, iso)).length;
    const dots = "<i></i>".repeat(Math.min(events, 4));
    html += `<button data-datum="${iso}" style="--i:${i}" class="${iso === state.datum ? "sel" : ""} ${iso === heute ? "today" : ""}"
      title="${events} Events">${Number(iso.slice(8))}${Wetter.tag(iso) ? `<span class="kal-wetter">${Wetter.code(Wetter.tag(iso).code).icon}</span>` : ""}<span class="dots">${dots}</span></button>`;
  }
  $("#calendar").innerHTML = html;
}

function datumSetzen(iso) {
  if (iso !== state.datum) Effekte.tagWechsel(iso);
  state.datum = iso;
  datumAnzeigen();
  kalenderZeichnen();
  markerZeichnen();
  if ($("#panel").classList.contains("open")) panelZeichnen();
  if (offenerEintrag) sheetOeffnen(offenerEintrag);
}

/* ---------- 9. Eigene Orte hinzufügen ---------- */
function addKnopf() {
  if (!state.addModus) {
    state.addModus = true;
    $("#btn-add").classList.add("armed");
    $("#center-pin").classList.add("show");
    sheetSchliessen();
    toast("Karte verschieben – dann nochmal ＋ tippen");
  } else {
    addModusBeenden();
    formularOeffnen(map.getCenter());
  }
}
function addModusBeenden() {
  state.addModus = false;
  $("#btn-add").classList.remove("armed");
  $("#center-pin").classList.remove("show");
}

function formularOeffnen(latlng) {
  addModusBeenden();
  state.neuerPunkt = latlng;
  const form = $("#add-form");
  form.reset();
  $("#add-preview").hidden = true;
  $("#add-preview").removeAttribute("src");
  $("#add-kategorie").innerHTML = state.kategorien.map((k) => `<option value="${esc(k.id)}">${k.icon} ${esc(k.name)}</option>`).join("");
  modal("add-modal", true);
}

/** Foto verkleinern, damit es in den Handyspeicher passt */
function fotoVerkleinern(datei, max = 900) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const f = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * f);
      c.height = Math.round(img.height * f);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL("image/jpeg", 0.72));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(datei);
  });
}

async function formularSpeichern(ev) {
  ev.preventDefault();
  const f = new FormData(ev.target);
  const von = f.get("von"), bis = f.get("bis") || f.get("von");
  const eintrag = {
    id: "mein-" + Date.now(),
    name: f.get("name").trim(),
    kategorie: f.get("kategorie"),
    lat: +state.neuerPunkt.lat.toFixed(5),
    lng: +state.neuerPunkt.lng.toFixed(5),
    beschreibung: f.get("beschreibung").trim(),
    zeiten: f.get("zeiten").trim() || undefined,
    zeitraum: von ? [{ von, bis: bis < von ? von : bis }] : undefined,
    foto: $("#add-preview").hidden ? undefined : $("#add-preview").src,
  };
  state.eigene.push(eintrag);
  if (!speichern(SPEICHER.eigene, state.eigene)) {
    state.eigene.pop();
    return;
  }
  state.aktiv.add(eintrag.kategorie);
  alleEintraegeNeu();
  markerZeichnen();
  modal("add-modal", false);
  konfetti();
  Klang.sammeln();
  toast("📌 Gespeichert!");
  const e = state.eintraege.find((x) => x.id === eintrag.id);
  setTimeout(() => sheetOeffnen(e), 400);
}

function eigenenLoeschen(e) {
  if (!confirm(`„${e.name}“ wirklich löschen?`)) return;
  state.eigene = state.eigene.filter((x) => x.id !== e.id);
  speichern(SPEICHER.eigene, state.eigene);
  alleEintraegeNeu();
  sheetSchliessen();
  markerZeichnen();
}

/* ---------- Allgemein: Modals, Theme, Splash ---------- */
function modal(id, auf) {
  const el = document.getElementById(id);
  el.classList.toggle("open", auf);
  el.setAttribute("aria-hidden", String(!auf));
}

function themeSetzen(theme) {
  document.documentElement.dataset.theme = theme;
  $("#btn-theme span").textContent = theme === "dark" ? "☀️" : "🌙";
  Effekte.nochmal($("#btn-theme span"), "dreh");
  if (!$("#splash")) metaFarbeSetzen();
  if (vektor) karteSetzen(); // Vektor-Karte hat einen eigenen Dunkel-Stil
}

/** Farbe der Handy-Statusleiste passend zum Hell/Dunkel-Modus */
function metaFarbeSetzen() {
  document.querySelector('meta[name="theme-color"]').content =
    document.documentElement.dataset.theme === "dark" ? "#12112a" : "#f5efe3";
}

function splashBlueten() {
  // Funkelnde Sterne im oberen Himmel
  const sterne = document.querySelector(".sz-sterne");
  for (let i = 0; i < 70; i++) {
    const s = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    s.setAttribute("cx", (Math.random() * 390).toFixed(1));
    s.setAttribute("cy", (Math.random() * Math.random() * 520).toFixed(1));
    s.setAttribute("r", (0.5 + Math.random() * 1.2).toFixed(2));
    s.style.setProperty("--t", 2 + Math.random() * 3 + "s");
    s.style.setProperty("--d", -Math.random() * 4 + "s");
    sterne.appendChild(s);
  }
  const box = document.querySelector(".petals");
  for (let i = 0; i < 26; i++) {
    const p = document.createElement("span");
    p.className = "petal";
    p.style.left = Math.random() * 100 + "%";
    p.style.setProperty("--drift", (Math.random() * 160 - 80) + "px");
    p.style.animationDuration = 2.4 + Math.random() * 2.5 + "s";
    p.style.animationDelay = Math.random() * 1.2 + "s";
    box.appendChild(p);
  }
}

function ereignisseVerbinden() {
  $("#chips").addEventListener("click", chipKlick);
  // Lange auf den Favoriten-Chip drücken = nur Favoriten zeigen
  let favDruck;
  $("#chips").addEventListener("pointerdown", (ev) => {
    if (!ev.target.closest("#chip-fav")) return;
    favDruck = setTimeout(() => { chipKlick.langGedrueckt = Date.now(); navigator.vibrate?.(25); nurFavoritenUmschalten(); }, 550);
  });
  ["pointerup", "pointerleave", "pointercancel"].forEach((art) => $("#chips").addEventListener(art, () => clearTimeout(favDruck)));
  $("#chips").addEventListener("contextmenu", (ev) => ev.target.closest("#chip-fav") && ev.preventDefault());
  katAuswahlVerbinden();
  $("#btn-menu").onclick = () => panelOeffnen("heute");
  $("#dock-tag").onclick = () => panelOeffnen("heute");
  $("#dock-sammlung").onclick = () => panelOeffnen("sammlung");
  $("#btn-date").onclick = () => { kalenderZeichnen(); modal("date-modal", true); };
  $("#btn-today").onclick = () => { datumSetzen(heuteInTokio()); modal("date-modal", false); };
  $("#calendar").addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-datum]");
    if (!b) return;
    datumSetzen(b.dataset.datum);
    setTimeout(() => modal("date-modal", false), 250);
    const n = sichtbareEintraege().filter((e) => e.zeitraum).length;
    toast(`📅 ${datumSchoen(b.dataset.datum)}: ${n} zeitlich begrenzte Highlights`);
  });
  $("#show-all").onchange = (ev) => { state.alleZeigen = ev.target.checked; datumAnzeigen(); markerZeichnen(); };
  $("#btn-locate").onclick = standortSuchen;
  $("#btn-hotel").onclick = zumHotel;
  $("#btn-gyoza").onclick = () => GyozaRadar.oeffnen();
  $("#radar-wahl").onclick = (ev) => { const b = ev.target.closest("[data-zentrum]"); if (b) GyozaRadar.zentrumWaehlen(b.dataset.zentrum); };
  $("#radar-liste").onclick = (ev) => GyozaRadar.listeKlick(ev);
  $("#radar-schirm").onclick = (ev) => GyozaRadar.listeKlick(ev);
  $("#btn-add").onclick = addKnopf;
  $("#btn-theme").onclick = () => {
    const neu = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    speichern(SPEICHER.theme, neu);
    Klang.modus(neu === "dark");
    Effekte.themaWechsel($("#btn-theme"), () => themeSetzen(neu));
  };
  $("#panel").addEventListener("click", panelKlick);
  $("#panel").addEventListener("change", (ev) => { if (ev.target.id === "import-file" && ev.target.files[0]) importieren(ev.target.files[0]); });
  $("#add-form").addEventListener("submit", formularSpeichern);
  $("#add-form [name=foto]").addEventListener("change", async (ev) => {
    const datei = ev.target.files[0];
    if (!datei) return;
    try {
      $("#add-preview").src = await fotoVerkleinern(datei);
      $("#add-preview").hidden = false;
    } catch { toast("⚠️ Foto konnte nicht geladen werden"); }
  });

  document.querySelectorAll("[data-close]").forEach((b) =>
    b.addEventListener("click", () => (b.dataset.close === "panel" ? panelSchliessen() : modal(b.dataset.close, false)))
  );
  document.querySelectorAll(".modal").forEach((m) => m.addEventListener("click", (ev) => { if (ev.target === m) modal(m.id, false); }));

  let suchTimer;
  $("#search").addEventListener("input", (ev) => {
    clearTimeout(suchTimer);
    const q = ev.target.value.trim();
    suchTimer = setTimeout(() => {
      if (!q) { if (panelTab === "suche") panelSchliessen(); return; }
      panelTab = "suche";
      panelZeichnen(q);
      $("#panel").classList.add("open");
    }, 200);
  });

  document.addEventListener("keydown", (ev) => {
    if (ev.key !== "Escape") return;
    sheetSchliessen(); panelSchliessen(); addModusBeenden();
    document.querySelectorAll(".modal.open").forEach((m) => modal(m.id, false));
  });
  sheetWischen();
}

/* ---------- 10. Start ---------- */
async function start() {
  // Washi-Design: startet einmalig im Tag-Modus, danach gilt deine Auswahl
  if (laden(SPEICHER.design, 0) < 3) {
    speichern(SPEICHER.design, 3);
    speichern(SPEICHER.theme, "light");
  }
  themeSetzen(laden(SPEICHER.theme, "light"));
  splashBlueten();
  Effekte.titelZerlegen($("#splash .kanji"));
  Effekte.wellenAktivieren();
  const splashMin = new Promise((r) => setTimeout(r, 2600));

  // Außerhalb der Reise: Kalender trotzdem auf den 1. November stellen
  if (state.datum < REISE.von || state.datum > REISE.bis) {
    state.datum = state.datum < REISE.von ? REISE.von : REISE.bis;
  }

  karteStarten();
  ereignisseVerbinden();
  try {
    state.fotos = await fotoSpeicher.alleLaden();
  } catch (err) {
    console.warn("Fotos nicht verfügbar", err);
  }
  try {
    await datenLaden();
  } catch (err) {
    console.error(err);
    toast("⚠️ Daten konnten nicht geladen werden");
  }
  datumAnzeigen();
  Wetter.laden().then(wetterAktualisieren);
  // Kommt die App wieder in den Vordergrund: Wetter auffrischen (höchstens alle 30 Minuten)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") Wetter.laden().then(wetterAktualisieren);
  });
  await splashMin;
  $("#splash").classList.add("hide");
  setTimeout(metaFarbeSetzen, 400);
  setTimeout(() => $("#splash").remove(), 1000);
  markerZeichnen();

  if ("serviceWorker" in navigator) {
    // Gibt es eine neue App-Version, einmal automatisch neu laden
    const hatteAlteVersion = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (hatteAlteVersion && !start.neuGeladen) { start.neuGeladen = true; location.reload(); }
    });
    navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).catch(() => {});
  }
}

start();
