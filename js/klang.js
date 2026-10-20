/* =========================================================
   Tokio Entdecker – Klänge
   Alle Töne werden direkt im Browser erzeugt (Web Audio) –
   keine Sound-Dateien nötig. Ein-/Ausschalten unter ☰ → ⚙️.
   ========================================================= */

const Klang = {
  ctx: null,
  haupt: null,           // Gesamtlautstärke
  puffer: new Map(),     // fertig berechnete Koto-Töne
  aktiv: (() => { try { return JSON.parse(localStorage.getItem("tokio.klang") ?? "true"); } catch { return true; } })(),

  // Japanische „In“-Tonleiter (Miyako-bushi) auf D – klingt nach Koto-Musik
  LEITER: [293.66, 311.13, 392.0, 440.0, 466.16, 587.33, 622.25, 784.0, 880.0],

  /** Browser erlauben Ton erst nach dem ersten Antippen – dann starten wir */
  vorbereiten() {
    const starten = () => {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.haupt = this.ctx.createGain();
        this.haupt.gain.value = 0.55;
        // Etwas Hall wie in einem Holztempel
        const hall = this.ctx.createConvolver();
        hall.buffer = this.hallImpuls(1.6);
        const hallLaut = this.ctx.createGain();
        hallLaut.gain.value = 0.22;
        this.haupt.connect(this.ctx.destination);
        this.haupt.connect(hall).connect(hallLaut).connect(this.ctx.destination);
      }
      if (this.ctx.state === "suspended") this.ctx.resume();
    };
    ["pointerdown", "keydown"].forEach((t) => document.addEventListener(t, starten, { capture: true }));
  },

  umschalten(an = !this.aktiv) {
    this.aktiv = an;
    try { localStorage.setItem("tokio.klang", JSON.stringify(an)); } catch {}
    if (an) setTimeout(() => this.furin(), 60);
  },

  bereit() {
    return this.aktiv && this.ctx && this.ctx.state === "running";
  },

  hallImpuls(sekunden) {
    const rate = this.ctx.sampleRate, laenge = rate * sekunden;
    const b = this.ctx.createBuffer(2, laenge, rate);
    for (let k = 0; k < 2; k++) {
      const d = b.getChannelData(k);
      for (let i = 0; i < laenge; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / laenge, 3);
    }
    return b;
  },

  /** Gezupfte Saite (Karplus-Strong-Verfahren) – klingt wie eine Koto */
  kotoPuffer(freq) {
    const schluessel = Math.round(freq);
    if (this.puffer.has(schluessel)) return this.puffer.get(schluessel);
    const rate = this.ctx.sampleRate, laenge = Math.floor(rate * 1.6);
    const b = this.ctx.createBuffer(1, laenge, rate);
    const d = b.getChannelData(0);
    const periode = Math.round(rate / freq);
    for (let i = 0; i < periode; i++) d[i] = Math.random() * 2 - 1;
    for (let i = periode; i < laenge; i++) d[i] = 0.497 * (d[i - periode] + d[i - periode + 1]);
    this.puffer.set(schluessel, b);
    return b;
  },

  koto(freq, verzoegerung = 0, laut = 0.5) {
    if (!this.bereit()) return;
    const t = this.ctx.currentTime + verzoegerung;
    const quelle = this.ctx.createBufferSource();
    quelle.buffer = this.kotoPuffer(freq);
    const g = this.ctx.createGain();
    g.gain.value = laut;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 3200;
    quelle.connect(filter).connect(g).connect(this.haupt);
    quelle.start(t);
  },

  /** Sinus-Ton mit Ausklingen (Baustein für Glocken) */
  ton(freq, { start = 0, dauer = 1, laut = 0.2, typ = "sine" } = {}) {
    if (!this.bereit()) return;
    const t = this.ctx.currentTime + start;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = typ;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(laut, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
    o.connect(g).connect(this.haupt);
    o.start(t);
    o.stop(t + dauer + 0.05);
  },

  /** Kurzes Rauschen (für Holz, Papier, Stempel) */
  rauschen({ start = 0, dauer = 0.06, laut = 0.2, frequenz = 1800, q = 1.5, typ = "bandpass" } = {}) {
    if (!this.bereit()) return;
    const t = this.ctx.currentTime + start;
    const laenge = Math.floor(this.ctx.sampleRate * dauer);
    const b = this.ctx.createBuffer(1, laenge, this.ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < laenge; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / laenge);
    const quelle = this.ctx.createBufferSource();
    quelle.buffer = b;
    const f = this.ctx.createBiquadFilter();
    f.type = typ;
    f.frequency.value = frequenz;
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.value = laut;
    quelle.connect(f).connect(g).connect(this.haupt);
    quelle.start(t);
  },

  /* ---------- Die einzelnen Klänge ---------- */

  /** Leises Holzklacken beim Antippen */
  tippen() {
    this.ton(1250, { dauer: 0.07, laut: 0.06, typ: "triangle" });
    this.rauschen({ dauer: 0.025, laut: 0.05, frequenz: 2600, q: 4 });
  },

  /** Detail-Karte öffnet: zwei gezupfte Koto-Töne aufwärts */
  oeffnen() {
    this.koto(this.LEITER[2], 0, 0.35);
    this.koto(this.LEITER[5], 0.09, 0.3);
  },

  /** Detail-Karte schließt: ein tiefer Ton */
  schliessen() {
    this.koto(this.LEITER[2], 0, 0.22);
  },

  /** Seitenpanel: Papier rascheln wie beim Umblättern */
  blatt() {
    this.rauschen({ dauer: 0.22, laut: 0.09, frequenz: 3500, q: 0.6, typ: "highpass" });
  },

  /** Kategorie an: heller Ton – aus: tieferer Ton */
  an() { this.koto(this.LEITER[5], 0, 0.3); },
  aus() { this.koto(this.LEITER[1], 0, 0.22); },

  /** Datum gewählt: kleine Koto-Tonfolge */
  datum() {
    this.koto(this.LEITER[3], 0, 0.28);
    this.koto(this.LEITER[4], 0.07, 0.24);
  },

  /** Gesammelt: Hanko-Stempel „Pon“ + Glöckchen + Koto-Lauf */
  sammeln() {
    // dumpfer Stempel genau dann, wenn der Hanko aufschlägt
    this.ton(150, { start: 0.33, dauer: 0.16, laut: 0.35 });
    this.rauschen({ start: 0.33, dauer: 0.05, laut: 0.18, frequenz: 600, q: 0.8, typ: "lowpass" });
    this.furin(0.45);
    [2, 4, 5, 7].forEach((n, i) => this.koto(this.LEITER[n], 0.5 + i * 0.08, 0.26));
  },

  /** Furin – gläsernes Windspiel */
  furin(start = 0) {
    const grund = 1568;
    this.ton(grund, { start, dauer: 1.6, laut: 0.07 });
    this.ton(grund * 2.76, { start, dauer: 0.9, laut: 0.025 });
    this.ton(grund * 5.4, { start, dauer: 0.5, laut: 0.012 });
    this.ton(grund * 1.5, { start: start + 0.18, dauer: 1.3, laut: 0.04 });
  },

  /** Tempelglocke (Bonshō) – tief und lang */
  tempelglocke() {
    const grund = 98;
    this.ton(grund, { dauer: 3.5, laut: 0.22 });
    this.ton(grund * 2.01, { dauer: 2.6, laut: 0.1 });
    this.ton(grund * 2.98, { dauer: 1.8, laut: 0.05 });
    this.ton(grund * 4.1, { dauer: 1.1, laut: 0.03 });
    this.rauschen({ dauer: 0.08, laut: 0.12, frequenz: 300, q: 0.7, typ: "lowpass" });
  },

  /** Hinweis / Fehler: zwei absteigende tiefe Töne */
  hinweis() {
    this.koto(this.LEITER[1], 0, 0.25);
    this.koto(this.LEITER[0] / 2 * 1.5, 0.1, 0.2);
  },
};

Klang.vorbereiten();
