/* =========================================================
   Tokio Entdecker – Wetter & Sonne
   ---------------------------------------------------------
   • Vorhersage (16 Tage) und Wetter „jetzt gerade“ kommen von
     Open-Meteo (kostenlos, ohne Anmeldung): open-meteo.com
   • Für Tage, die noch weiter weg sind: Durchschnitt der
     letzten 10 Novembertage in Tokio (Open-Meteo-Archiv).
   • Sonnenauf- und -untergang rechnet die App selbst aus.
   Alles wird auf dem Handy zwischengespeichert, damit es auch
   ohne Internet (U-Bahn) noch angezeigt wird.
   ========================================================= */

const Wetter = {
  ORT: { lat: 35.6895, lng: 139.74 },     // Tokio Mitte
  SPEICHER: "tokio.wetter",
  KLIMA_SPEICHER: "tokio.klimaNovember",
  NEU_NACH_MIN: 30,                         // so oft wird die Vorhersage neu geholt
  daten: null,                              // letzte Vorhersage
  klima: null,                              // Durchschnittswerte November
  versucht: false,                          // schon einmal versucht zu laden? (verhindert Endlos-Schleifen ohne Internet)
  klimaVersucht: false,

  /** Vorhersage + aktuelles Wetter holen (oder aus dem Speicher nehmen) */
  async laden(erzwingen = false) {
    try { this.daten ??= JSON.parse(localStorage.getItem(this.SPEICHER)); } catch {}
    const alt = this.daten && Date.now() - this.daten.geholt < this.NEU_NACH_MIN * 60000;
    if (alt && !erzwingen) return this.daten;
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    Object.entries({
      latitude: this.ORT.lat, longitude: this.ORT.lng, timezone: "Asia/Tokyo",
      forecast_days: 16, past_days: 7, wind_speed_unit: "kmh",
      current: "temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m,precipitation,is_day",
      daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,sunrise,sunset",
      hourly: "temperature_2m,precipitation_probability,weather_code,is_day",
    }).forEach(([k, v]) => url.searchParams.set(k, v));
    this.versucht = true;
    try {
      const antwort = await fetch(url);
      if (!antwort.ok) throw new Error("Wetter " + antwort.status);
      this.daten = { geholt: Date.now(), ...(await antwort.json()) };
      try { localStorage.setItem(this.SPEICHER, JSON.stringify(this.daten)); } catch {}
    } catch (fehler) {
      console.warn("Wetter nicht erreichbar – nutze gespeicherte Daten", fehler);
    }
    return this.daten;
  },

  /** Durchschnitt aus den Novembern 2016–2025 (einmal holen, dann für immer gespeichert) */
  async klimaLaden() {
    try { this.klima ??= JSON.parse(localStorage.getItem(this.KLIMA_SPEICHER)); } catch {}
    if (this.klima || this.klimaVersucht) return this.klima;
    this.klimaVersucht = true;
    const url = new URL("https://archive-api.open-meteo.com/v1/archive");
    Object.entries({
      latitude: this.ORT.lat, longitude: this.ORT.lng, timezone: "Asia/Tokyo",
      start_date: "2016-11-01", end_date: "2025-11-30",
      daily: "temperature_2m_max,temperature_2m_min,precipitation_sum,sunshine_duration",
    }).forEach(([k, v]) => url.searchParams.set(k, v));
    try {
      const d = (await fetch(url).then((r) => r.json())).daily;
      const tage = {};
      d.time.forEach((t, i) => {
        if (t.slice(5, 7) !== "11" || d.temperature_2m_max[i] == null) return;
        (tage[t.slice(5)] ??= []).push([d.temperature_2m_max[i], d.temperature_2m_min[i], d.precipitation_sum[i] || 0, (d.sunshine_duration[i] || 0) / 3600]);
      });
      const mittel = (w, n) => w.reduce((s, x) => s + x[n], 0) / w.length;
      this.klima = Object.fromEntries(Object.entries(tage).map(([tag, w]) => [tag, {
        max: mittel(w, 0), min: mittel(w, 1), sonne: mittel(w, 3),
        regenJahre: w.filter((x) => x[2] >= 1).length, jahre: w.length,
      }]));
      try { localStorage.setItem(this.KLIMA_SPEICHER, JSON.stringify(this.klima)); } catch {}
    } catch (fehler) {
      console.warn("Klimadaten nicht erreichbar", fehler);
    }
    return this.klima;
  },

  /** Tageswerte für ein Datum (oder null, wenn außerhalb der Vorhersage) */
  tag(iso) {
    const d = this.daten?.daily;
    const i = d?.time.indexOf(iso) ?? -1;
    if (i < 0) return null;
    return {
      code: d.weather_code[i], max: d.temperature_2m_max[i], min: d.temperature_2m_min[i],
      regen: d.precipitation_probability_max[i], menge: d.precipitation_sum[i], wind: d.wind_speed_10m_max[i],
    };
  },

  /** Stündliche Werte eines Tages (alle 2 Stunden von 6 bis 22 Uhr) */
  stunden(iso) {
    const h = this.daten?.hourly;
    if (!h) return [];
    return h.time.map((t, i) => ({ t, i })).filter(({ t }) => t.startsWith(iso) && Number(t.slice(11, 13)) % 2 === 0 && Number(t.slice(11, 13)) >= 6)
      .map(({ t, i }) => ({ uhr: t.slice(11, 16), temp: h.temperature_2m[i], regen: h.precipitation_probability[i], code: h.weather_code[i], tag: h.is_day[i] }));
  },

  /** Letzter Tag, für den es eine Vorhersage gibt */
  letzterTag() { return this.daten?.daily?.time.at(-1) || null; },

  /** WMO-Wettercode → Symbol + deutscher Text */
  code(c, tag = true) {
    const t = {
      0: [tag ? "☀️" : "🌙", "Klar"], 1: [tag ? "🌤️" : "🌙", "Überwiegend klar"], 2: ["⛅", "Teilweise bewölkt"], 3: ["☁️", "Bedeckt"],
      45: ["🌫️", "Nebel"], 48: ["🌫️", "Nebel mit Reif"],
      51: ["🌦️", "Leichter Nieselregen"], 53: ["🌦️", "Nieselregen"], 55: ["🌧️", "Starker Nieselregen"],
      56: ["🌧️", "Gefrierender Niesel"], 57: ["🌧️", "Gefrierender Niesel"],
      61: ["🌦️", "Leichter Regen"], 63: ["🌧️", "Regen"], 65: ["🌧️", "Starker Regen"],
      66: ["🌧️", "Gefrierender Regen"], 67: ["🌧️", "Gefrierender Regen"],
      71: ["🌨️", "Leichter Schnee"], 73: ["🌨️", "Schnee"], 75: ["❄️", "Starker Schnee"], 77: ["🌨️", "Schneegriesel"],
      80: ["🌦️", "Regenschauer"], 81: ["🌧️", "Kräftige Schauer"], 82: ["⛈️", "Heftige Schauer"],
      85: ["🌨️", "Schneeschauer"], 86: ["🌨️", "Schneeschauer"],
      95: ["⛈️", "Gewitter"], 96: ["⛈️", "Gewitter mit Hagel"], 99: ["⛈️", "Gewitter mit Hagel"],
    }[c] || ["🌡️", "–"];
    return { icon: t[0], text: t[1], regen: [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(c) };
  },

  /**
   * Sonnenauf- und -untergang in Tokio für ein Datum (eigene Rechnung, genau auf ±1–2 Minuten).
   * Ergebnis als Date-Objekte – zum Anzeigen mit zeit() in japanische Uhrzeit umwandeln.
   */
  sonne(iso) {
    // Liegt das Datum in der Vorhersage, nehmen wir die genauen Zeiten von Open-Meteo
    const d = this.daten?.daily, i = d?.time.indexOf(iso) ?? -1;
    if (i >= 0 && d.sunrise?.[i]) return { auf: new Date(d.sunrise[i] + ":00+09:00"), unter: new Date(d.sunset[i] + ":00+09:00"), genau: true };
    const rad = Math.PI / 180, { lat, lng } = this.ORT;
    const tagNr = Math.round(Date.parse(iso + "T12:00:00Z") / 86400000 + 2440587.5 - 2451545.0);
    const j = tagNr - lng / 360;
    const m = (357.5291 + 0.98560028 * j) % 360;
    const c = 1.9148 * Math.sin(m * rad) + 0.02 * Math.sin(2 * m * rad) + 0.0003 * Math.sin(3 * m * rad);
    const lambda = (m + c + 180 + 102.9372) % 360;
    const mittag = 2451545.0 + j + 0.0053 * Math.sin(m * rad) - 0.0069 * Math.sin(2 * lambda * rad);
    const dekl = Math.asin(Math.sin(lambda * rad) * Math.sin(23.4397 * rad));
    const h = Math.acos((Math.sin(-0.833 * rad) - Math.sin(lat * rad) * Math.sin(dekl)) / (Math.cos(lat * rad) * Math.cos(dekl))) / rad;
    const datum = (jd) => new Date((jd - 2440587.5) * 86400000);
    return { auf: datum(mittag - h / 360), unter: datum(mittag + h / 360) };
  },

  /** Uhrzeit in Tokio, z. B. "16:41" */
  zeit(datum) {
    return datum.toLocaleTimeString("de-DE", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit" });
  },
};
