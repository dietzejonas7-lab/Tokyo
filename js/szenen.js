/* =========================================================
   Tokio Entdecker – gezeichnete Mini-Szenen
   Jede Kategorie bekommt oben in der Detail-Karte eine kleine,
   animierte Illustration im Stil des Startbildschirms
   (solange kein echtes Foto da ist).
   Welche Kategorie welche Szene bekommt, steht in ZUORDNUNG.
   ========================================================= */

const Szenen = {
  ZUORDNUNG: {
    anime: "stadt", premiumfiguren: "stadt", gacha: "stadt", mode: "stadt",
    illumination: "lichter", events: "fest", nachttempel: "tempel", hotel: "hotel", filmspots: "gasse", gyoza: "gyoza",
    gaerten: "garten", herbstlaub: "herbst",
    stempel: "stempel", goshuin: "stempel", goshuincho: "stempel",
  },
  STEMPEL_TEXT: { stempel: "駅", goshuin: "奉拝", goshuincho: "限定" },
  nr: 0,

  /** SVG-Szene für einen Ort (kategorieId z. B. "gaerten") */
  fuer(kategorieId) {
    const art = this.ZUORDNUNG[kategorieId] || "abend";
    const p = "sz" + ++this.nr; // eindeutige IDs für Farbverläufe
    const inhalt = this[art](p, kategorieId);
    return `<svg class="szene-mini sz-${art}" viewBox="0 0 400 200" preserveAspectRatio="xMidYMax slice" aria-hidden="true">${inhalt}</svg>`;
  },

  /* ---------- Hilfen ---------- */
  z(a, b) { return a + Math.random() * (b - a); },
  f(x) { return x.toFixed(1); },
  himmel(p, farben) {
    const stops = farben.map((c, i) => `<stop offset="${i / (farben.length - 1)}" stop-color="${c}"/>`).join("");
    return `<defs><linearGradient id="${p}h" x1="0" y1="0" x2="0" y2="1">${stops}</linearGradient>
      <radialGradient id="${p}g"><stop offset="0" stop-color="#ffe3bd" stop-opacity=".9"/><stop offset="1" stop-color="#ffb27a" stop-opacity="0"/></radialGradient>
      <filter id="${p}b"><feGaussianBlur stdDeviation="2.5"/></filter></defs>
      <rect width="400" height="200" fill="url(#${p}h)"/>`;
  },
  sterne(n, maxY = 110) {
    return Array.from({ length: n }, () =>
      `<circle class="m-stern" cx="${this.f(this.z(0, 400))}" cy="${this.f(this.z(0, 1) ** 2 * maxY)}" r="${this.f(this.z(0.5, 1.4))}" style="--d:-${this.f(this.z(0, 4))}s;--t:${this.f(this.z(2, 4.5))}s"/>`).join("");
  },
  streifen(p, farbe, ys) {
    return `<g filter="url(#${p}b)">${ys.map((y, i) =>
      `<rect class="m-streifen" x="${this.f(this.z(-40, 220))}" y="${y}" width="${this.f(this.z(120, 200))}" height="4" rx="2" fill="${farbe}" opacity=".45" style="--d:-${i * 3}s"/>`).join("")}</g>`;
  },
  mond(p, x, y) {
    return `<circle cx="${x}" cy="${y}" r="34" fill="url(#${p}g)" opacity=".5"/>
      <path class="m-mond" d="M${x + 6} ${y - 14} a15 15 0 1 0 0 28 a12 12 0 1 1 0 -28 z" fill="#fdf0d5"/>`;
  },
  /** Punkt auf einer Kettenlinie (quadratische Kurve) */
  kurve(t, a, k, b) {
    const u = 1 - t;
    return [u * u * a[0] + 2 * u * t * k[0] + t * t * b[0], u * u * a[1] + 2 * u * t * k[1] + t * t * b[1]];
  },
  laternen(a, k, b, n, farbe = "#e8553a") {
    let s = `<path d="M${a} Q${k} ${b}" fill="none" stroke="#1a1020" stroke-width="1.2"/>`;
    for (let i = 1; i <= n; i++) {
      const [x, y] = this.kurve(i / (n + 1), a, k, b);
      s += `<g class="m-laterne" style="--d:-${this.f(this.z(0, 3))}s">
        <line x1="${this.f(x)}" y1="${this.f(y)}" x2="${this.f(x)}" y2="${this.f(y + 5)}" stroke="#1a1020"/>
        <ellipse class="m-glut" cx="${this.f(x)}" cy="${this.f(y + 15)}" rx="14" ry="14" fill="${farbe}" opacity=".35"/>
        <rect x="${this.f(x - 4)}" y="${this.f(y + 4)}" width="8" height="3" fill="#1a1020"/>
        <ellipse cx="${this.f(x)}" cy="${this.f(y + 15)}" rx="7" ry="9" fill="${farbe}"/>
        <ellipse cx="${this.f(x - 2)}" cy="${this.f(y + 13)}" rx="2.2" ry="5" fill="#ffd9a0" opacity=".7"/>
        <rect x="${this.f(x - 4)}" y="${this.f(y + 23)}" width="8" height="3" fill="#1a1020"/></g>`;
    }
    return s;
  },

  /* ---------- Szenen ---------- */

  /** Abendhimmel mit Sonne, Fuji und Vögeln (Standard, Attraktionen, Flohmärkte) */
  abend(p) {
    const voegel = [0, 1, 2].map((i) =>
      `<g transform="translate(${-30 - i * 22} ${48 + i * 9})"><path class="m-vogel" d="M0 0 q4 -4 8 0 q4 -4 8 0" fill="none" stroke="#2a1830" stroke-width="1.5" stroke-linecap="round"
        style="--d:-${i * 2.5}s"/></g>`).join("");
    return this.himmel(p, ["#1f1d4f", "#4b2e66", "#a2456a", "#e2774f", "#f6b07a"]) + this.sterne(14, 60) +
      this.streifen(p, "#f6c08a", [96, 120, 140]) +
      `<g class="m-sonne"><circle cx="200" cy="160" r="70" fill="url(#${p}g)"/><circle cx="200" cy="160" r="34" fill="#fdecd2"/></g>
      <path d="M0 180 Q70 150 140 168 T260 172 L260 200 L0 200Z" fill="#4e2b48"/>
      <path d="M230 186 L310 118 Q320 110 330 118 L410 186Z" fill="#6e3f62"/>
      <path class="m-schnee" d="M310 118 Q320 110 330 118 L340 127 L333 124 L326 130 L318 123 L310 130 L304 124 L298 127Z" fill="#f6e8ef"/>
      <rect y="184" width="400" height="16" fill="#2a1830"/>${voegel}`;
  },

  /** Abendliche Stadt mit Tokyo Tower und blinkenden Fenstern (Shops) */
  stadt(p) {
    let haeuser = "", fenster = "";
    const hinten = [[0, 70], [40, 95], [80, 60], [150, 100], [190, 75], [250, 110], [300, 80], [350, 105]];
    hinten.forEach(([x, h]) => (haeuser += `<rect x="${x}" y="${200 - h}" width="48" height="${h}" fill="#3d2a5e"/>`));
    const vorne = [[0, 46, 40], [44, 70, 34], [130, 58, 46], [180, 84, 38], [222, 52, 40], [266, 76, 44], [314, 60, 36], [354, 88, 46]];
    vorne.forEach(([x, h, w]) => {
      haeuser += `<rect x="${x}" y="${200 - h}" width="${w}" height="${h}" fill="#241a3e"/>`;
      for (let fy = 200 - h + 8; fy < 192; fy += 10)
        for (let fx = x + 5; fx < x + w - 6; fx += 9)
          if (Math.random() < 0.45) fenster += `<rect class="m-fenster" x="${fx}" y="${fy}" width="4" height="5" fill="#ffd98a" style="--d:-${this.f(this.z(0, 6))}s;--t:${this.f(this.z(3, 8))}s"/>`;
    });
    const schilder = [[48, 140, "#d2462c"], [270, 132, "#e0b86a"], [186, 124, "#f7b8cb"]].map(([x, y, c], i) =>
      `<g class="m-schild" style="--d:-${i}s"><rect x="${x}" y="${y}" width="9" height="34" rx="1.5" fill="${c}"/>
        <rect x="${x}" y="${y}" width="9" height="34" rx="1.5" fill="none" stroke="#fff3d6" stroke-width=".8" opacity=".7"/></g>`).join("");
    return this.himmel(p, ["#1f1d4f", "#4b2e66", "#a2456a", "#e98a5c"]) + this.sterne(18, 70) +
      `<circle cx="300" cy="120" r="55" fill="url(#${p}g)" opacity=".7"/><circle cx="300" cy="120" r="24" fill="#fbe0bd"/>` +
      haeuser +
      // Tokyo Tower
      `<g class="m-turm"><path d="M84 200 L96 120 L100 60 L104 120 L116 200 L108 200 L101 140 L99 140 L92 200Z" fill="#c8402c"/>
        <rect x="93" y="118" width="14" height="6" fill="#f2e6d8"/><rect x="95" y="84" width="10" height="4" fill="#f2e6d8"/>
        <path d="M88 170 L112 170 M90 150 L110 150" stroke="#f2e6d8" stroke-width="2"/>
        <circle class="m-blink" cx="100" cy="58" r="2.2" fill="#ff5a4a"/></g>` +
      fenster + schilder;
  },

  /** Nacht mit Pagode, Mond und Laternen (Tempel bei Nacht) */
  tempel(p) {
    const cx = 300;
    let pagode = "";
    [92, 80, 68, 56, 44].forEach((w, i) => {
      const y = 196 - i * 26;
      pagode += `<rect x="${cx - w * 0.28}" y="${y - 14}" width="${w * 0.56}" height="14" fill="#1c1228"/>
        <rect class="m-fenster an" x="${cx - 5}" y="${y - 11}" width="10" height="7" fill="#ffc46b" style="--d:-${i}s;--t:4s"/>
        <path d="M${cx - w / 2} ${y - 13} Q${cx} ${y - 19} ${cx + w / 2} ${y - 13} L${cx + w / 2 - 12} ${y - 24} L${cx - w / 2 + 12} ${y - 24}Z" fill="#140c1e"/>`;
    });
    pagode += `<line x1="${cx}" y1="62" x2="${cx}" y2="36" stroke="#140c1e" stroke-width="2.5"/>
      ${[42, 48, 54].map((y) => `<circle cx="${cx}" cy="${y}" r="2.4" fill="#140c1e"/>`).join("")}`;
    return this.himmel(p, ["#0a0e2a", "#1f1d4f", "#4b2e66", "#7a3a6a"]) + this.sterne(40) + this.mond(p, 80, 46) +
      this.streifen(p, "#c97aa0", [70, 104]) +
      `<path d="M0 176 Q100 160 200 172 T400 168 L400 200 L0 200Z" fill="#1c1228"/>` + pagode +
      this.laternen([0, 104], [110, 150], [230, 110], 5);
  },

  /** Fest mit roten Laternen-Ketten und Ständen (Events & Feste) */
  fest(p) {
    const staende = [[20, "#d2462c"], [120, "#2f4b7c"], [220, "#d2462c"], [320, "#6b8f47"]].map(([x, c]) =>
      `<rect x="${x}" y="160" width="70" height="40" fill="#1c1228"/>
       <path d="M${x - 6} 162 L${x + 76} 162 L${x + 66} 146 L${x + 4} 146Z" fill="${c}"/>
       <path d="M${x - 6} 162 L${x + 76} 162" stroke="#fff3d6" stroke-width="1" stroke-dasharray="5 5"/>
       <rect class="m-fenster an" x="${x + 8}" y="168" width="54" height="14" fill="#ffc46b" opacity=".85" style="--d:-${x / 40}s;--t:3s"/>`).join("");
    return this.himmel(p, ["#0f1236", "#2b2160", "#6b3a72", "#b4566a"]) + this.sterne(26, 80) +
      `<circle cx="200" cy="200" r="120" fill="url(#${p}g)" opacity=".35"/>` +
      this.laternen([-10, 28], [200, 92], [410, 28], 8) +
      this.laternen([-10, 70], [200, 124], [410, 70], 7, "#f0a23a") + staende;
  },

  /** Lichterketten und leuchtende Bäume (Illuminationen) */
  lichter(p) {
    const farben = ["#ffe08a", "#f7b8cb", "#ffffff", "#9fd3ff", "#ffc46b"];
    let ketten = "";
    [[-10, 26, 200, 70, 410, 26], [-10, 60, 200, 104, 410, 60]].forEach(([ax, ay, kx, ky, bx, by], k) => {
      ketten += `<path d="M${ax} ${ay} Q${kx} ${ky} ${bx} ${by}" fill="none" stroke="#2a1838" stroke-width="1"/>`;
      for (let i = 1; i < 28; i++) {
        const [x, y] = this.kurve(i / 28, [ax, ay], [kx, ky], [bx, by]);
        ketten += `<circle class="m-licht" cx="${this.f(x)}" cy="${this.f(y + 3)}" r="2.6" fill="${farben[(i + k) % farben.length]}" style="--d:-${this.f(this.z(0, 2))}s"/>`;
      }
    });
    const baeume = [[60, 46], [150, 60], [250, 52], [340, 64]].map(([x, h]) => {
      let punkte = "";
      for (let i = 0; i < 26; i++) {
        const t = Math.random(), yy = 196 - t * h, breite = (1 - t) * h * 0.42;
        punkte += `<circle class="m-licht" cx="${this.f(x + this.z(-breite, breite))}" cy="${this.f(yy)}" r="1.8" fill="${farben[i % farben.length]}" style="--d:-${this.f(this.z(0, 2))}s"/>`;
      }
      return `<path d="M${x} ${196 - h} L${x + h * 0.42} 196 L${x - h * 0.42} 196Z" fill="#1c2a3a"/>${punkte}
        <path class="m-licht" d="M${x} ${190 - h} l2 4 4 .5 -3 3 1 4 -4 -2 -4 2 1 -4 -3 -3 4 -.5z" fill="#ffe08a"/>`;
    }).join("");
    return this.himmel(p, ["#070b26", "#161a48", "#33295f", "#4e3470"]) + this.sterne(30, 90) + ketten +
      `<rect y="194" width="400" height="6" fill="#120c22"/>` + baeume;
  },

  /** Garten am Tag: Teich, rote Bogenbrücke, Kiefer, Koi (Gärten) */
  garten(p) {
    const wolken = [[40, 36, 0], [230, 24, 6], [330, 52, 12]].map(([x, y, d]) =>
      `<g class="m-wolke" style="--d:-${d}s"><ellipse cx="${x}" cy="${y}" rx="26" ry="8" fill="#fff"/><ellipse cx="${x + 14}" cy="${y - 6}" rx="14" ry="8" fill="#fff"/></g>`).join("");
    const koi = [[150, 182, "#e8743a", 0], [250, 186, "#f4f0e8", 4], [200, 190, "#e8553a", 8]].map(([x, y, c, d]) =>
      `<g class="m-koi" style="--d:-${d}s"><ellipse cx="${x}" cy="${y}" rx="7" ry="2.6" fill="${c}"/><path d="M${x - 7} ${y} l-4 -3 0 6z" fill="${c}"/></g>`).join("");
    return this.himmel(p, ["#cfe0e6", "#e8eadf", "#f6efe2"]) +
      `<circle cx="330" cy="40" r="20" fill="#e46a50" opacity=".85"/>` + wolken +
      `<path d="M0 150 Q80 130 170 146 T400 140 L400 200 L0 200Z" fill="#a9bf8a"/>
      <path d="M0 162 Q120 150 230 160 T400 156 L400 200 L0 200Z" fill="#87a36a"/>
      <ellipse cx="210" cy="186" rx="190" ry="22" fill="#9fc0c8"/>
      <ellipse class="m-kreis" cx="160" cy="186" rx="10" ry="3" fill="none" stroke="#fff" stroke-width="1"/>
      <ellipse class="m-kreis" cx="260" cy="190" rx="10" ry="3" fill="none" stroke="#fff" stroke-width="1" style="--d:-1.5s"/>` + koi +
      // Bogenbrücke
      `<path d="M150 178 Q210 128 270 178" fill="none" stroke="#c8362a" stroke-width="6"/>
       <path d="M154 168 Q210 122 266 168" fill="none" stroke="#c8362a" stroke-width="2.5"/>
       ${[168, 186, 210, 234, 252].map((x) => { const y = 178 - (1 - ((x - 210) / 60) ** 2) * 37; return `<line x1="${x}" y1="${this.f(y)}" x2="${x}" y2="${this.f(y - 10)}" stroke="#c8362a" stroke-width="2"/>`; }).join("")}` +
      // Kiefer
      `<g class="m-kiefer"><path d="M58 196 Q50 150 70 120 Q80 100 64 84" fill="none" stroke="#4a3426" stroke-width="7" stroke-linecap="round"/>
        <ellipse cx="44" cy="118" rx="30" ry="12" fill="#4f6b3a"/><ellipse cx="88" cy="100" rx="28" ry="11" fill="#5b7a43"/>
        <ellipse cx="60" cy="80" rx="22" ry="10" fill="#4f6b3a"/></g>
      <g><rect x="330" y="152" width="8" height="24" fill="#8c8478"/><path d="M322 152 L346 152 L340 144 L328 144Z" fill="#6f685e"/>
        <rect class="m-fenster an" x="331" y="156" width="6" height="6" fill="#ffc46b" style="--t:4s"/></g>`;
  },

  /** Herbst: Ahornbäume und fallende Blätter (Herbstlaub) */
  herbst(p) {
    const blatt = (x, y, s, c) => `<path d="M${x} ${y} l2 -6 2 4 4 -2 -1 5 5 1 -4 3 2 3 -6 -1 -1 5 -3 -4 -3 4 -1 -5 -6 1 2 -3 -4 -3 5 -1 -1 -5 4 2z" transform="scale(${s})" fill="${c}"/>`;
    const baum = (x, h, farben) => `<path d="M${x} 196 L${x} ${196 - h}" stroke="#3a2420" stroke-width="5"/>
      ${farben.map((c, i) => `<circle cx="${x + [-16, 14, 0, -6, 18][i]}" cy="${196 - h + [6, 4, -12, 16, 20][i]}" r="${[18, 17, 19, 14, 12][i]}" fill="${c}"/>`).join("")}`;
    const fallend = Array.from({ length: 12 }, (_, i) =>
      `<g transform="translate(${this.f(this.z(10, 390))} -10)"><g class="m-blatt" style="--x:${this.f(this.z(-30, 30))}px;--d:-${this.f(this.z(0, 7))}s;--t:${this.f(this.z(5, 9))}s">
        ${blatt(0, 0, this.z(0.7, 1.2), ["#c8362a", "#e0782f", "#e0b040", "#a8282a"][i % 4])}</g></g>`).join("");
    return this.himmel(p, ["#3b2a5a", "#a2456a", "#e2774f", "#f6c27a"]) +
      `<circle cx="300" cy="110" r="60" fill="url(#${p}g)"/><circle cx="300" cy="110" r="26" fill="#fde3bd"/>
      <path d="M0 150 Q90 120 200 140 T400 132 L400 200 L0 200Z" fill="#8a3a4a"/>
      <path d="M0 172 Q140 150 260 168 T400 162 L400 200 L0 200Z" fill="#5a2438"/>` +
      `<g class="m-baeume">${baum(70, 70, ["#c8362a", "#e0782f", "#a8282a", "#e85a3a", "#e0b040"])}
        ${baum(190, 56, ["#e0b040", "#e8c860", "#d8a030", "#f0d070", "#c89020"])}
        ${baum(350, 64, ["#a8282a", "#c8362a", "#e0782f", "#c8362a", "#e85a3a"])}</g>
      <rect y="194" width="400" height="6" fill="#3a1828"/>` + fallend;
  },

  /** Nächtliche Gasse: flackernde Neonschilder, Laternen, Regen und Spiegelungen auf nassem Boden (Filmspots) */
  gasse(p) {
    const farben = ["#ff4fa0", "#38d6ff", "#ffd23f", "#ff5a3c", "#b26bff"];
    const woerter = [["居酒屋", "焼鳥", "スナック", "酒"], ["ラーメン", "BAR", "カラオケ", "喫茶"]];
    let schilder = "", spiegel = "";
    [0, 1].forEach((seite) => {
      woerter[seite].forEach((wort, i) => {
        const s = 1 - i * 0.2, b = 16 * s, h = 64 * s;
        const x = seite === 0 ? 14 + i * 40 : 400 - 14 - i * 40 - b;
        const y = 28 + i * 13;
        const c = farben[(i * 2 + seite) % farben.length];
        const zeichen = [...wort].slice(0, 4);
        const gross = Math.min(11 * s, (h - 6) / zeichen.length);
        schilder += `<g class="m-neon" style="--d:-${this.f(this.z(0, 5))}s;--t:${this.f(this.z(4, 9))}s">
          <rect x="${this.f(x - 3)}" y="${this.f(y - 3)}" width="${this.f(b + 6)}" height="${this.f(h + 6)}" rx="3" fill="${c}" opacity=".45" filter="url(#${p}b)"/>
          <rect x="${this.f(x)}" y="${this.f(y)}" width="${this.f(b)}" height="${this.f(h)}" rx="2" fill="#140c1e" stroke="${c}" stroke-width="1.6"/>
          ${zeichen.map((z, k) => `<text x="${this.f(x + b / 2)}" y="${this.f(y + 4 + gross * (k + 0.9))}" text-anchor="middle" font-size="${this.f(gross)}" fill="${c}" style="font-family:var(--rund);font-weight:900">${z}</text>`).join("")}</g>`;
        spiegel += `<rect class="m-spiegel" x="${this.f(x - 2)}" y="${this.f(162 + i * 4)}" width="${this.f(b + 4)}" height="${this.f(34 - i * 6)}" fill="${c}" opacity=".3" filter="url(#${p}b)" style="--d:-${this.f(this.z(0, 3))}s"/>`;
      });
    });
    const fenster = [[178, 80], [192, 80], [206, 80], [220, 80], [178, 96], [206, 96], [220, 96], [192, 112], [220, 112]].map(([x, y], i) =>
      `<rect class="m-fenster" x="${x}" y="${y}" width="6" height="8" fill="#ffd98a" style="--d:-${i}s;--t:${5 + (i % 3)}s"/>`).join("");
    const tropfen = Array.from({ length: 34 }, () => {
      const x = this.z(0, 400), y = this.z(-60, 150);
      return `<line class="m-tropfen" x1="${this.f(x)}" y1="${this.f(y)}" x2="${this.f(x - 3)}" y2="${this.f(y + 12)}" stroke="#cfe3ff" stroke-width=".8" opacity=".35" style="--d:-${this.f(this.z(0, 1.2))}s"/>`;
    }).join("");
    return `<defs><linearGradient id="${p}h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a0e2a"/><stop offset="1" stop-color="#3a2466"/></linearGradient>
        <linearGradient id="${p}n" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#22183a"/><stop offset="1" stop-color="#0b0812"/></linearGradient>
        <radialGradient id="${p}g"><stop offset="0" stop-color="#ff8ac8" stop-opacity=".55"/><stop offset="1" stop-color="#ff8ac8" stop-opacity="0"/></radialGradient>
        <filter id="${p}b"><feGaussianBlur stdDeviation="3"/></filter></defs>
      <rect width="400" height="200" fill="url(#${p}h)"/>` + this.sterne(10, 50) +
      `<circle cx="200" cy="105" r="70" fill="url(#${p}g)"/>
      <rect x="170" y="70" width="60" height="82" fill="#241a3e"/>${fenster}
      <polygon points="0,0 170,70 170,152 0,200" fill="#1a1430"/>
      <polygon points="400,0 230,70 230,152 400,200" fill="#1c1634"/>
      <polygon points="0,200 170,152 230,152 400,200" fill="url(#${p}n)"/>
      <path d="M0 22 L400 34 M0 48 Q200 70 400 52" stroke="#0c0814" stroke-width="1" fill="none"/>` +
      spiegel + schilder +
      this.laternen([60, 52], [200, 76], [340, 52], 5) + tropfen;
  },

  /** Gyoza-Laden: Noren-Vorhang, dampfender Teller auf der Holztheke (Gyoza) */
  gyoza(p) {
    const tasche = (x, y, w, dreh) => `<g transform="translate(${x} ${y}) rotate(${dreh})">
      <path d="M-20 0 Q0 -20 20 0 Q0 7 -20 0Z" fill="#f3dcae" stroke="#c99a55" stroke-width="1"/>
      <path d="M-20 0 Q0 7 20 0 Q0 11 -20 0Z" fill="#b8742e"/>
      ${[-12, -6, 0, 6, 12].map((px) => `<path d="M${px} ${-12 + Math.abs(px) * 0.55} q2 3 0 6" stroke="#d9b47a" stroke-width="1.2" fill="none"/>`).join("")}</g>`;
    const dampf = [170, 200, 230].map((x, i) =>
      `<path class="m-dampf" d="M${x} 128 q-8 -12 0 -24 q8 -12 0 -24" stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none" opacity=".5" style="--d:-${i * 0.9}s"/>`).join("");
    const noren = [0, 1, 2, 3].map((i) =>
      `<g class="m-noren" style="--d:-${i * 0.6}s"><rect x="${70 + i * 66}" y="10" width="62" height="58" fill="#c8352a"/>
        <rect x="${70 + i * 66}" y="10" width="62" height="6" fill="#a82a22"/></g>`).join("");
    return `<defs><linearGradient id="${p}h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2414"/><stop offset="1" stop-color="#1e120a"/></linearGradient>
        <linearGradient id="${p}t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9a6a3c"/><stop offset="1" stop-color="#6e4624"/></linearGradient>
        <radialGradient id="${p}g"><stop offset="0" stop-color="#ffd9a0" stop-opacity=".55"/><stop offset="1" stop-color="#ffd9a0" stop-opacity="0"/></radialGradient></defs>
      <rect width="400" height="200" fill="url(#${p}h)"/>
      ${[30, 60, 340, 370].map((x) => `<line x1="${x}" y1="0" x2="${x}" y2="150" stroke="#2a1a0e" stroke-width="3"/>`).join("")}
      <circle cx="200" cy="140" r="120" fill="url(#${p}g)"/>
      <rect x="64" y="6" width="272" height="5" rx="2" fill="#2a1a0e"/>${noren}
      <text x="200" y="52" text-anchor="middle" font-size="30" fill="#fff8ef" style="font-family:var(--pinsel)" letter-spacing="40">餃子</text>
      <g class="m-laterne" style="--d:-1s"><line x1="32" y1="0" x2="32" y2="30" stroke="#1a1020"/>
        <ellipse class="m-glut" cx="32" cy="54" rx="26" ry="26" fill="#e8553a" opacity=".3"/>
        <ellipse cx="32" cy="54" rx="14" ry="20" fill="#e8553a"/><rect x="24" y="30" width="16" height="5" fill="#1a1020"/><rect x="24" y="73" width="16" height="5" fill="#1a1020"/>
        <text x="32" y="60" text-anchor="middle" font-size="14" fill="#fff3d6" style="font-family:var(--pinsel)">餃</text></g>
      <rect y="150" width="400" height="50" fill="url(#${p}t)"/>
      ${[160, 172, 186].map((y) => `<path d="M0 ${y} Q200 ${y + 4} 400 ${y}" stroke="#5a381c" stroke-width="1" fill="none" opacity=".5"/>`).join("")}
      <ellipse cx="200" cy="160" rx="88" ry="20" fill="#fdfaf3"/><ellipse cx="200" cy="160" rx="88" ry="20" fill="none" stroke="#2f4b7c" stroke-width="3"/>
      <ellipse cx="200" cy="156" rx="70" ry="13" fill="#e8b866" opacity=".55"/>
      <g class="m-gyoza">${tasche(152, 156, 1, -8)}${tasche(184, 152, 1, -3)}${tasche(216, 152, 1, 3)}${tasche(248, 156, 1, 8)}${tasche(200, 166, 1, 0)}</g>
      ${dampf}
      <ellipse cx="320" cy="170" rx="22" ry="7" fill="#fdfaf3" stroke="#2f4b7c" stroke-width="2"/><ellipse cx="320" cy="169" rx="15" ry="4" fill="#4a2414"/>
      <line x1="300" y1="186" x2="380" y2="150" stroke="#c9a06a" stroke-width="4" stroke-linecap="round"/>
      <line x1="306" y1="190" x2="386" y2="156" stroke="#b8905a" stroke-width="4" stroke-linecap="round"/>`;
  },

  /** Washi-Papier mit rotem Stempel und Pinselschrift (Stempel, Goshuin) */
  stempel(p, id) {
    const text = this.STEMPEL_TEXT[id] || "印";
    const zeichen = [...text];
    const gross = zeichen.length === 1 ? 46 : 26;
    const schrift = zeichen.map((z, i) =>
      `<text x="0" y="${(i - (zeichen.length - 1) / 2) * gross * 1.05 + gross * 0.36}" text-anchor="middle" font-size="${gross}">${z}</text>`).join("");
    const spritzer = Array.from({ length: 7 }, () =>
      `<circle cx="${this.f(this.z(-56, 56))}" cy="${this.f(this.z(-56, 56))}" r="${this.f(this.z(1, 3))}" fill="#c8352a"/>`).join("");
    return `<defs><pattern id="${p}w" width="40" height="20" patternUnits="userSpaceOnUse">
        <path d="M0 20a20 20 0 0 1 40 0M6 20a14 14 0 0 1 28 0M12 20a8 8 0 0 1 16 0M-20 10a20 20 0 0 1 40 0M20 10a20 20 0 0 1 40 0" fill="none" stroke="#b8913a" stroke-width=".8" opacity=".35"/></pattern></defs>
      <rect width="400" height="200" fill="#f6efe2"/><rect width="400" height="200" fill="url(#${p}w)"/>
      <path class="m-pinsel" d="M40 160 C110 120 170 175 240 140 S340 120 380 150" fill="none" stroke="#2b2622" stroke-width="10" stroke-linecap="round" opacity=".85"/>
      <path class="m-pinsel zwei" d="M60 60 C120 40 150 70 200 52" fill="none" stroke="#2b2622" stroke-width="5" stroke-linecap="round" opacity=".6"/>
      <text class="m-datum" x="292" y="30" font-size="15" fill="#2b2622" writing-mode="vertical-rl" style="font-family:var(--pinsel)">令和八年十一月</text>
      <g transform="translate(200 104)"><g class="m-hanko">
        <rect x="-50" y="-50" width="100" height="100" rx="14" fill="#fff8ef" stroke="#c8352a" stroke-width="5"/>
        <rect x="-42" y="-42" width="84" height="84" rx="9" fill="none" stroke="#c8352a" stroke-width="2"/>
        <g fill="#c8352a" style="font-family:var(--pinsel)">${schrift}</g></g>
        <g class="m-spritzer">${spritzer}</g></g>`;
  },

  /** Unser Hotel: Nacht mit großer Laterne „宿“ */
  hotel(p) {
    return this.himmel(p, ["#0a0e2a", "#1f1d4f", "#4b2e66", "#a2456a"]) + this.sterne(36) + this.mond(p, 320, 44) +
      `<path d="M0 170 Q120 150 230 166 T400 160 L400 200 L0 200Z" fill="#1c1228"/>
      ${[[30, 60], [80, 90], [250, 72], [300, 100], [350, 64]].map(([x, h]) => `<rect x="${x}" y="${200 - h}" width="40" height="${h}" fill="#241a3e"/>
        <rect class="m-fenster" x="${x + 8}" y="${210 - h}" width="5" height="6" fill="#ffd98a" style="--d:-${x / 50}s;--t:6s"/>
        <rect class="m-fenster" x="${x + 22}" y="${226 - h}" width="5" height="6" fill="#ffd98a" style="--d:-${x / 30}s;--t:5s"/>`).join("")}
      <g class="m-laterne gross" style="--d:0s"><line x1="170" y1="0" x2="170" y2="40" stroke="#1a1020" stroke-width="2"/>
        <ellipse class="m-glut" cx="170" cy="96" rx="58" ry="58" fill="#e8553a" opacity=".3"/>
        <rect x="150" y="38" width="40" height="8" rx="2" fill="#1a1020"/>
        <ellipse cx="170" cy="96" rx="34" ry="50" fill="#e8553a"/>
        ${[70, 84, 98, 112, 126].map((y) => `<path d="M138 ${y} Q170 ${y + 4} 202 ${y}" stroke="#b83a28" stroke-width="1.2" fill="none"/>`).join("")}
        <text x="170" y="110" text-anchor="middle" font-size="38" fill="#fff3d6" style="font-family:var(--pinsel)">宿</text>
        <rect x="150" y="144" width="40" height="8" rx="2" fill="#1a1020"/></g>`;
  },
};
