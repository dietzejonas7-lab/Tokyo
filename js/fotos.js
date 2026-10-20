/* =========================================================
   Tokio Entdecker – Beispielfotos von Wikimedia Commons
   ---------------------------------------------------------
   Wikimedia Commons ist die freie Bilddatenbank hinter Wikipedia.
   Alle Fotos dort stehen unter freien Lizenzen (z. B. CC BY-SA)
   und dürfen verwendet werden, wenn Fotograf und Lizenz genannt
   werden – das macht die App automatisch unter jedem Foto.
   Ein-/Ausschalten unter ☰ → ⚙️.
   ========================================================= */

const OrtFotos = {
  API: "https://commons.wikimedia.org/w/api.php",
  SPEICHER: "tokio.fotoCache2",   // neuer Name = alte (ungenaue) Treffer werden verworfen
  GUELTIG_TAGE: 14,
  aktiv: (() => { try { return JSON.parse(localStorage.getItem("tokio.ortFotos") ?? "true"); } catch { return true; } })(),
  cache: (() => { try { localStorage.removeItem("tokio.fotoCache"); return JSON.parse(localStorage.getItem("tokio.fotoCache2")) || {}; } catch { return {}; } })(),
  // Nur bei diesen Kategorien zeigt ein Foto aus der direkten Umgebung wirklich den Ort
  UMGEBUNG_OK: ["gaerten", "herbstlaub", "nachttempel", "goshuin", "stempel"],
  laufend: new Map(),

  umschalten(an = !this.aktiv) {
    this.aktiv = an;
    try { localStorage.setItem("tokio.ortFotos", JSON.stringify(an)); } catch {}
  },

  /** Fotos für einen Ort holen (aus dem Zwischenspeicher oder von Commons) */
  async fuer(e, kategorie) {
    if (!this.aktiv) return [];
    const gemerkt = this.cache[e.id];
    if (gemerkt && Date.now() - gemerkt.zeit < this.GUELTIG_TAGE * 86400000) return gemerkt.fotos;
    if (!this.laufend.has(e.id)) {
      this.laufend.set(e.id, this.suchen(e, kategorie)
        .then((fotos) => { this.merken(e.id, fotos); return fotos; })
        .catch(() => [])
        .finally(() => this.laufend.delete(e.id)));
    }
    return this.laufend.get(e.id);
  },

  merken(id, fotos) {
    this.cache[id] = { zeit: Date.now(), fotos };
    // Höchstens 300 Orte merken, die ältesten fliegen raus
    const ids = Object.keys(this.cache);
    if (ids.length > 300) {
      ids.sort((a, b) => this.cache[a].zeit - this.cache[b].zeit).slice(0, ids.length - 300).forEach((i) => delete this.cache[i]);
    }
    try { localStorage.setItem(this.SPEICHER, JSON.stringify(this.cache)); } catch {}
  },

  /**
   * Suche mit Titel-Prüfung: Ein Foto zählt nur, wenn der Name des Ortes im Dateinamen vorkommt.
   * Reihenfolge: (Goshuin-Foto) → englischer/deutscher Name → japanischer Name → Umgebung (nur bei passenden Kategorien).
   * In den Daten kann ein Ort mit "fotoSuche": "Suchbegriff" gezielt gesteuert oder mit false ausgeschaltet werden.
   */
  async suchen(e, kategorie) {
    if (e.fotoSuche === false) return [];
    const latein = e.fotoSuche || this.kernName(e, kategorie);
    const japanisch = (e.nameJa || "").trim().split(/[\s\u3000]/)[0];
    const versuche = [];
    if (kategorie?.id === "goshuin" && latein) versuche.push({ suche: `goshuin ${latein}`, pflicht: ["goshuin", latein] });
    if (latein) versuche.push({ suche: latein, pflicht: [latein] });
    if (japanisch && !e.fotoSuche) versuche.push({ suche: japanisch, pflicht: [japanisch] });

    for (const v of versuche) {
      if (v.pflicht.some((w) => this.norm(w).length < (/[a-z0-9]/.test(this.norm(w)) ? 5 : 2))) continue;
      const fotos = await this.anfrage({
        generator: "search", gsrsearch: `${v.suche} filetype:bitmap`, gsrnamespace: "6", gsrlimit: "20",
      });
      const passend = fotos.filter((f) => v.pflicht.every((w) => this.norm(f.titel).includes(this.norm(w))))
        // Goshuin-Fotos nur in den Goshuin-Kategorien zeigen
        .filter((f) => kategorie?.id?.startsWith("goshuin") || !/goshuin|御朱印/i.test(f.titel));
      if (passend.length) return passend.slice(0, 6);
    }
    if (!this.UMGEBUNG_OK.includes(kategorie?.id) || !isFinite(e.lat) || !isFinite(e.lng)) return [];
    return (await this.anfrage({
      generator: "geosearch", ggscoord: `${e.lat}|${e.lng}`, ggsradius: "70", ggsnamespace: "6", ggslimit: "6",
    })).slice(0, 6);
  },

  /** Lateinischer Kern-Name: „Sensō-ji bei Nacht“ → „Sensō-ji“, Bahnhof „Tokyo“ → „Tokyo Station“ */
  kernName(e, kategorie) {
    if (kategorie?.id === "stempel") return e.station && !e.station.includes(" ") ? `${e.station} Station` : "";
    return e.name.split(/ – | \(|: /)[0].replace(/ (bei Nacht|am Abend)$/, "").trim();
  },

  /** Zum Vergleichen: klein, ohne Akzente, ohne Leer- und Sonderzeichen („Sensō-ji“ → „sensoji“) */
  norm(text) {
    return String(text).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]/g, "");
  },

  async anfrage(extra) {
    const url = new URL(this.API);
    const parameter = {
      action: "query", format: "json", origin: "*",
      prop: "imageinfo", iiprop: "url|extmetadata|mime", iiurlwidth: "900",
      iiextmetadatafilter: "Artist|LicenseShortName", ...extra,
    };
    Object.entries(parameter).forEach(([k, v]) => url.searchParams.set(k, v));
    const antwort = await fetch(url);
    if (!antwort.ok) throw new Error("Commons: " + antwort.status);
    const daten = await antwort.json();
    return Object.values(daten.query?.pages || {})
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
      .map((seite) => seite.imageinfo?.[0] && { ...seite.imageinfo[0], titel: seite.title || "" })
      .filter((info) => info && /^image\/(jpeg|png|webp)$/.test(info.mime))
      .map((info) => ({
        titel: info.titel.replace(/^File:/, ""),
        bild: info.thumburl || info.url,
        seite: info.descriptionurl,
        autor: this.nurText(info.extmetadata?.Artist?.value) || "unbekannt",
        lizenz: this.nurText(info.extmetadata?.LicenseShortName?.value) || "freie Lizenz",
      }));
  },

  /** HTML aus den Commons-Angaben entfernen (z. B. Links im Fotografen-Namen) */
  nurText(html) {
    if (!html) return "";
    const text = new DOMParser().parseFromString(html, "text/html").body.textContent.trim().replace(/\s+/g, " ");
    return text.length > 40 ? text.slice(0, 38) + "…" : text;
  },
};
