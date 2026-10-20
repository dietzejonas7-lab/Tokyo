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
  SPEICHER: "tokio.fotoCache",
  GUELTIG_TAGE: 14,
  aktiv: (() => { try { return JSON.parse(localStorage.getItem("tokio.ortFotos") ?? "true"); } catch { return true; } })(),
  cache: (() => { try { return JSON.parse(localStorage.getItem("tokio.fotoCache")) || {}; } catch { return {}; } })(),
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

  /** Erst nach dem japanischen Namen suchen, sonst Fotos direkt vom Ort */
  async suchen(e, kategorie) {
    const begriffe = [];
    const name = (e.nameJa || "").trim();
    if (name) {
      if (kategorie?.bildersuche) begriffe.push(`${name} ${kategorie.bildersuche}`);
      begriffe.push(name);
    }
    // Bahnhöfe: zusätzlich nur der Bahnhofsname (z. B. „東京駅“)
    if (kategorie?.id === "stempel" && name.includes("駅")) begriffe.push(name.split("駅")[0] + "駅");

    for (const begriff of begriffe) {
      const fotos = await this.anfrage({
        generator: "search", gsrsearch: `${begriff} filetype:bitmap`, gsrnamespace: "6", gsrlimit: "6",
      });
      if (fotos.length) return fotos;
    }
    if (!isFinite(e.lat) || !isFinite(e.lng)) return [];
    return this.anfrage({
      generator: "geosearch", ggscoord: `${e.lat}|${e.lng}`, ggsradius: "150", ggsnamespace: "6", ggslimit: "6",
    });
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
      .map((seite) => seite.imageinfo?.[0])
      .filter((info) => info && /^image\/(jpeg|png|webp)$/.test(info.mime))
      .map((info) => ({
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
