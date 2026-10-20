/* =========================================================
   Tokio Entdecker – Klänge
   Schlichte, leise Töne – direkt im Browser erzeugt (Web Audio),
   keine Sound-Dateien nötig. Ein-/Ausschalten unter ☰ → ⚙️.
   ========================================================= */

const Klang = {
  ctx: null,
  haupt: null,           // Gesamtlautstärke
  aktiv: (() => { try { return JSON.parse(localStorage.getItem("tokio.klang") ?? "true"); } catch { return true; } })(),

  /** Browser erlauben Ton erst nach dem ersten Antippen – dann starten wir */
  vorbereiten() {
    const starten = () => {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.haupt = this.ctx.createGain();
        this.haupt.gain.value = 0.5;
        this.haupt.connect(this.ctx.destination);
      }
      if (this.ctx.state === "suspended") this.ctx.resume();
    };
    ["pointerdown", "keydown"].forEach((t) => document.addEventListener(t, starten, { capture: true }));
  },

  umschalten(an = !this.aktiv) {
    this.aktiv = an;
    try { localStorage.setItem("tokio.klang", JSON.stringify(an)); } catch {}
    if (an) setTimeout(() => this.oeffnen(), 60);
  },

  bereit() {
    return this.aktiv && this.ctx && this.ctx.state === "running";
  },

  /** Ein kurzer, weicher Ton (Grundbaustein für alle Klänge) */
  ton(freq, { start = 0, dauer = 0.12, laut = 0.12, typ = "sine" } = {}) {
    if (!this.bereit()) return;
    const t = this.ctx.currentTime + start;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = typ;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(laut, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
    o.connect(g).connect(this.haupt);
    o.start(t);
    o.stop(t + dauer + 0.02);
  },

  /* ---------- Die einzelnen Klänge ---------- */

  /** Leises Klicken beim Antippen */
  tippen() { this.ton(1200, { dauer: 0.04, laut: 0.06, typ: "triangle" }); },

  /** Detail-Karte öffnet / schließt: kurzer Ton hoch bzw. runter */
  oeffnen() { this.ton(660, { dauer: 0.1, laut: 0.1 }); },
  schliessen() { this.ton(440, { dauer: 0.09, laut: 0.08 }); },

  /** Gesammelt: zwei kurze Töne aufwärts (passend zum Hanko-Stempel) */
  sammeln() {
    this.ton(660, { start: 0.33, dauer: 0.12, laut: 0.12 });
    this.ton(880, { start: 0.45, dauer: 0.22, laut: 0.12 });
  },

  /** Hell/Dunkel-Wechsel: ein ruhiger Ton */
  modus(dunkel) { this.ton(dunkel ? 392 : 523, { dauer: 0.25, laut: 0.1 }); },
};

Klang.vorbereiten();
