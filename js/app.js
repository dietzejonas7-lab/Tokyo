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
const START_ANSICHT = { lat: 35.6895, lng: 139.7400, zoom: 12 };
// Hauptkarte: moderne Vektor-Karte (ähnlich wie Google Maps) von OpenFreeMap – kostenlos, ohne API-Schlüssel.
const VEKTOR_KARTE = {
  hell: "https://tiles.openfreemap.org/styles/liberty",
  dunkel: "https://tiles.openfreemap.org/styles/dark",
  attribution: '<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> &copy; <a href="https://www.openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
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
  theme: "tokio.theme",
};

const state = {
  kategorien: [],          // aus data/kategorien.json
  eintraege: [],           // alle Orte aller Kategorien
  aktiv: new Set(),        // eingeschaltete Kategorien
  datum: heuteInTokio(),   // gewählter Tag (YYYY-MM-DD)
  alleZeigen: false,       // Zeitraum-Filter ignorieren?
  besucht: new Set(laden(SPEICHER.besucht, [])),
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

  const gespeichert = laden(SPEICHER.aktiv, null);
  state.aktiv = new Set(gespeichert || kats.map((k) => k.id));
}

function alleEintraegeNeu(ausDateien = state.eintraege.filter((e) => !e.eigen)) {
  const eigene = state.eigene.map((e) => ({ ...e, eigen: true }));
  state.eintraege = [...ausDateien, ...eigene];
}

/* ---------- 4. Karte & Marker ---------- */
let map, tiles, vektor, cluster, meinMarker;

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

  // Lange drücken (Handy) oder Rechtsklick (PC) = neuen Ort hier anlegen
  map.on("contextmenu", (ev) => formularOeffnen(ev.latlng));
  map.on("click", () => { sheetSchliessen(); });
}

/** Vektor-Karte laden; klappt das nicht, Bilder-Kacheln als Ersatz nehmen */
async function karteSetzen() {
  const dunkel = document.documentElement.dataset.theme === "dark";
  if (webglMoeglich()) {
    try {
      const antwort = await fetch(dunkel ? VEKTOR_KARTE.dunkel : VEKTOR_KARTE.hell);
      if (!antwort.ok) throw new Error("Stil nicht geladen: " + antwort.status);
      const stil = beschriftungDeutsch(await antwort.json());
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
  return state.eintraege.filter((e) => state.aktiv.has(e.kategorie) && (state.alleZeigen || istAktiv(e)));
}

function markerZeichnen() {
  cluster.clearLayers();
  const liste = sichtbareEintraege();
  const marker = liste.map((e, i) => {
    const k = kategorie(e.kategorie);
    const klassen = ["pin"];
    if (e.zeitraum && istAktiv(e)) klassen.push("live");
    if (state.besucht.has(e.id)) klassen.push("done");
    if (e.eigen) klassen.push("mine");
    const icon = L.divIcon({
      className: "pin-wrap",
      html: `<div class="${klassen.join(" ")}" style="--c:${k.farbe};--d:${Math.min(i * 12, 400)}ms"><span>${k.icon}</span></div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 44],
    });
    const m = L.marker([e.lat, e.lng], { icon, farbe: k.farbe, title: e.name });
    m.on("click", () => sheetOeffnen(e));
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
  nav.innerHTML = state.kategorien
    .map((k, i) => {
      const anzahl = state.eintraege.filter((e) => e.kategorie === k.id && (state.alleZeigen || istAktiv(e))).length;
      return `<button class="chip ${state.aktiv.has(k.id) ? "on" : ""}" data-kat="${esc(k.id)}"
        style="--c:${esc(k.farbe)};animation-delay:${i * 60}ms" title="${esc(k.beschreibung)}">
        <span>${k.icon}</span>${esc(k.name)}<span class="count">${anzahl}</span></button>`;
    })
    .join("");
  // Einflug-Animation nur beim ersten Mal
  if (chipsZeichnen.schonGezeigt) nav.querySelectorAll(".chip").forEach((c) => (c.style.animation = "none"));
  chipsZeichnen.schonGezeigt = true;
}

function chipKlick(ev) {
  const chip = ev.target.closest(".chip");
  if (!chip) return;
  const id = chip.dataset.kat;
  state.aktiv.has(id) ? state.aktiv.delete(id) : state.aktiv.add(id);
  speichern(SPEICHER.aktiv, [...state.aktiv]);
  markerZeichnen();
  if (state.aktiv.has(id)) toast(`${kategorie(id).icon} ${kategorie(id).beschreibung}`);
}

/* ---------- 6. Detail-Karte (Bottom Sheet) ---------- */
let offenerEintrag = null;

function sheetOeffnen(e) {
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

  const fakten = [
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
             : `<span class="hero-icon">${k.icon}</span><span class="hero-ja">${esc(e.nameJa || "")}</span>`}
      ${meinFoto ? `<span class="hero-badge">📷 Mein Foto</span>` : ""}
    </div>
    <div class="sheet-content">
      <div class="kicker">
        <span class="badge cat" style="--c:${esc(k.farbe)}">${k.icon} ${esc(k.name)}</span>
        ${status ? `<span class="badge ${status.art}">${esc(status.text)}</span>` : ""}
        ${e.zeitraum && e.geprueft === false ? `<span class="badge warn" title="Datum geschätzt – bitte vorher prüfen">⚠️ Datum unbestätigt</span>` : ""}
        ${e.eigen ? `<span class="badge">✏️ Mein Ort</span>` : ""}
      </div>
      <div class="sheet-title">
        <h2>${esc(e.name)}</h2>
        ${e.nameJa ? `<div class="ja">${esc(e.nameJa)}</div>` : ""}
      </div>
      ${e.beschreibung ? `<p class="desc">${esc(e.beschreibung)}</p>` : ""}
      ${fakten.length ? `<dl class="facts">${fakten.map(([i, w]) => `<div><dt>${i}</dt><dd>${esc(w)}</dd></div>`).join("")}</dl>` : ""}
      ${e.tags?.length ? `<div class="tags">${e.tags.map((t) => `<span class="tag">#${esc(t)}</span>`).join("")}</div>` : ""}
      <div class="actions">
        <a class="btn" href="${route}" target="_blank" rel="noopener">🧭 Route</a>
        <button class="btn collect ${gesammelt ? "done" : ""}" id="btn-collect">
          ${gesammelt ? "✓ Erledigt" : k.sammelbar ? "✅ Gesammelt!" : "✅ Besucht"}
        </button>
        ${bilderLink ? `<a class="btn ghost" href="${bilderLink}" target="_blank" rel="noopener">🔍 So sieht's aus</a>` : ""}
        <label class="btn ghost ${bilderLink ? "" : "full"}">${meinFoto ? "📷 Foto ändern" : "📷 Mein Foto"}
          <input type="file" accept="image/*" id="foto-input" hidden></label>
        ${meinFoto ? `<button class="btn ghost full" id="btn-foto-weg">Foto entfernen</button>` : ""}
        ${e.eigen ? `<button class="btn danger full" id="btn-delete">🗑️ Meinen Ort löschen</button>` : ""}
      </div>
      ${e.links?.length ? `<div class="links">${e.links.filter((l) => sichereUrl(l.url)).map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener">↗ ${esc(l.titel)}</a>`).join("")}</div>` : ""}
    </div>`;

  $("#btn-collect").onclick = () => besuchtUmschalten(e);
  if (e.eigen) $("#btn-delete").onclick = () => eigenenLoeschen(e);
  $("#foto-input").onchange = (ev) => ev.target.files[0] && fotoSpeichern(e, ev.target.files[0]);
  if (meinFoto) $("#btn-foto-weg").onclick = () => fotoEntfernen(e);

  const sheet = $("#sheet");
  sheet.scrollTop = 0;
  sheet.classList.add("open");
  sheet.setAttribute("aria-hidden", "false");
}

function sheetSchliessen() {
  $("#sheet").classList.remove("open");
  $("#sheet").setAttribute("aria-hidden", "true");
  offenerEintrag = null;
}

function besuchtUmschalten(e) {
  if (state.besucht.has(e.id)) state.besucht.delete(e.id);
  else {
    state.besucht.add(e.id);
    konfetti();
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
      speichern(SPEICHER.besucht, [...state.besucht]);
      markerZeichnen();
    }
    konfetti();
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

/** Kleine Feier-Animation beim Sammeln */
function konfetti() {
  const farben = ["#e5383b", "#ff8fab", "#f7b500", "#2fae6f", "#2f8cff", "#8f5bff"];
  for (let i = 0; i < 28; i++) {
    const p = document.createElement("i");
    const winkel = Math.random() * Math.PI * 2, weite = 80 + Math.random() * 140;
    Object.assign(p.style, {
      position: "fixed", left: "50%", top: "60%", width: "9px", height: "9px", zIndex: 2000,
      borderRadius: i % 2 ? "50%" : "2px", background: farben[i % farben.length], pointerEvents: "none",
    });
    document.body.appendChild(p);
    p.animate(
      [
        { transform: "translate(0,0) rotate(0)", opacity: 1 },
        { transform: `translate(${Math.cos(winkel) * weite}px, ${Math.sin(winkel) * weite - 120}px) rotate(${Math.random() * 720}deg)`, opacity: 0 },
      ],
      { duration: 900 + Math.random() * 500, easing: "cubic-bezier(.2,.8,.2,1)" }
    ).onfinish = () => p.remove();
  }
}

/** Nach unten wischen schließt die Detail-Karte */
function sheetWischen() {
  const sheet = $("#sheet");
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

/* ---------- 7. Seitenpanel ---------- */
let panelTab = "heute";

function panelOeffnen(tab = panelTab) {
  panelTab = tab;
  panelZeichnen();
  $("#panel").classList.add("open");
  $("#panel").setAttribute("aria-hidden", "false");
}
function panelSchliessen() {
  $("#panel").classList.remove("open");
  $("#panel").setAttribute("aria-hidden", "true");
}

function listItem(e, i, seite = "") {
  const k = kategorie(e.kategorie);
  return `<button class="list-item" data-id="${esc(e.id)}" style="--c:${esc(k.farbe)};--i:${i}">
    <span class="li-icon">${k.icon}</span>
    <span><b>${esc(e.name)}</b><small>${esc(e.station || k.name)}</small></span>
    <span class="li-side">${esc(seite)}</span>
  </button>`;
}

function nachDistanz(liste) {
  return state.meinOrt ? [...liste].sort((a, b) => distanzKm(state.meinOrt, a) - distanzKm(state.meinOrt, b)) : liste;
}

function panelZeichnen(suchbegriff = "") {
  const tabs = [["heute", "📅 Tag"], ["sammlung", "🏆 Sammlung"], ["meine", "✏️ Meine"], ["hilfe", "❔"]];
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
    $("#panel-title").textContent = datumSchoen(state.datum, { weekday: "long", day: "numeric", month: "long" });
    const zeitlich = state.eintraege.filter((e) => e.zeitraum && istAktiv(e));
    const naechsterStart = (e) => e.zeitraum.map((z) => z.von).filter((v) => v > state.datum).sort()[0];
    const bald = state.eintraege
      .filter((e) => e.zeitraum && !istAktiv(e) && naechsterStart(e))
      .sort((a, b) => naechsterStart(a).localeCompare(naechsterStart(b)));
    html += `<h3 class="section-title">✨ Läuft an diesem Tag (${zeitlich.length})</h3>`;
    html += zeitlich.length
      ? `<div class="list">${nachDistanz(zeitlich).map((e, i) => listItem(e, i, zeitStatus(e).kurz)).join("")}</div>`
      : `<div class="empty">Keine zeitlich begrenzten Events an diesem Tag.</div>`;
    if (bald.length) {
      html += `<h3 class="section-title">⏳ Startet bald</h3>`;
      html += `<div class="list">${bald.map((e, i) => listItem(e, i, zeitStatus(e).kurz)).join("")}</div>`;
    }
  }

  if (panelTab === "sammlung") {
    $("#panel-title").textContent = "Meine Sammlung";
    html += state.kategorien
      .map((k) => {
        const alle = state.eintraege.filter((e) => e.kategorie === k.id);
        const done = alle.filter((e) => state.besucht.has(e.id)).length;
        const pz = alle.length ? Math.round((done / alle.length) * 100) : 0;
        return `<div class="progress-card" style="--c:${esc(k.farbe)}">
          <header><span>${k.icon} ${esc(k.name)}</span><span>${done} / ${alle.length}</span></header>
          <div class="bar"><i data-w="${pz}%"></i></div></div>`;
      })
      .join("");
    const mitFoto = state.eintraege.filter((e) => state.fotos.has(e.id));
    if (mitFoto.length) {
      html += `<h3 class="section-title">📷 Meine Fotos (${mitFoto.length})</h3><div class="galerie">${mitFoto
        .map((e, i) => `<button class="list-item foto" data-id="${esc(e.id)}" style="--i:${i}" title="${esc(e.name)}">
          <img src="${state.fotos.get(e.id)}" alt="${esc(e.name)}" loading="lazy"></button>`).join("")}</div>`;
    }
    const erledigt = state.eintraege.filter((e) => state.besucht.has(e.id));
    if (erledigt.length) html += `<h3 class="section-title">✓ Erledigt</h3><div class="list">${erledigt.map((e, i) => listItem(e, i, "✓")).join("")}</div>`;
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
    $("#panel-title").textContent = "So funktioniert's";
    html += `<div class="list" style="gap:12px;line-height:1.5">
      <p>🎴 <b>Kategorien</b> oben antippen = ein-/ausblenden.</p>
      <p>📅 <b>Datum</b> (roter Knopf) = Illuminationen & limitierte Goshuincho für diesen Tag. Pulsierende Marker laufen am gewählten Tag.</p>
      <p>✅ <b>Gesammelt/Besucht</b> markieren – Fortschritt unter 🏆 Sammlung.</p>
      <p>⚠️ <b>Datum unbestätigt</b> = Termin geschätzt aus dem Vorjahr. Bitte kurz auf der offiziellen Seite prüfen.</p>
      <p>＋ <b>Eigener Ort</b>: Karte verschieben, ＋ tippen, nochmal ＋ – oder lange auf die Karte drücken.</p>
      <p>📲 <b>Als App installieren</b>: iPhone → Safari → Teilen → „Zum Home-Bildschirm“. Android → Chrome → ⋮ → „App installieren“.</p>
    </div>`;
  }

  $("#panel-body").innerHTML = html;
  // Fortschrittsbalken animiert füllen
  requestAnimationFrame(() => document.querySelectorAll(".bar i").forEach((b) => (b.style.width = b.dataset.w)));
}

function panelKlick(ev) {
  const tab = ev.target.closest("[data-tab]");
  if (tab) { panelTab = tab.dataset.tab; return panelZeichnen(); }
  const item = ev.target.closest(".list-item");
  if (item) {
    const e = state.eintraege.find((x) => x.id === item.dataset.id);
    if (!e) return;
    if (!state.aktiv.has(e.kategorie)) { state.aktiv.add(e.kategorie); markerZeichnen(); }
    panelSchliessen();
    zuOrt(e);
    setTimeout(() => sheetOeffnen(e), 500);
  }
  if (ev.target.id === "btn-export") exportieren();
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
      title="${events} Events">${Number(iso.slice(8))}<span class="dots">${dots}</span></button>`;
  }
  $("#calendar").innerHTML = html;
}

function datumSetzen(iso) {
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
  $("#btn-theme").textContent = theme === "dark" ? "☀️" : "🌙";
  document.querySelector('meta[name="theme-color"]').content = theme === "dark" ? "#0f0d22" : "#f6f1ea";
  if (vektor) karteSetzen(); // Vektor-Karte hat einen eigenen Dunkel-Stil
}

function splashBlueten() {
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
  $("#btn-menu").onclick = () => panelOeffnen("heute");
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
  $("#btn-add").onclick = addKnopf;
  $("#btn-theme").onclick = () => {
    const neu = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    speichern(SPEICHER.theme, neu);
    themeSetzen(neu);
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
  const gespeichertesTheme = laden(SPEICHER.theme, null);
  themeSetzen(gespeichertesTheme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
  splashBlueten();
  const splashMin = new Promise((r) => setTimeout(r, 1800));

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
  await splashMin;
  $("#splash").classList.add("hide");
  setTimeout(() => $("#splash").remove(), 800);
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
