/* =========================================================
   Tokio Entdecker – Effekte & Animationen
   Hier steht nur Optisches. Wenn dir ein Effekt nicht gefällt,
   kannst du ihn in app.js einfach nicht mehr aufrufen.
   ========================================================= */

const Effekte = {
  ruhig: matchMedia("(prefers-reduced-motion: reduce)").matches,

  /** Wellen-Effekt beim Antippen von Knöpfen */
  wellenAktivieren() {
    document.addEventListener("pointerdown", (ev) => {
      const ziel = ev.target.closest(".btn, .dock-btn, .logo-btn, .chip, .icon-btn, .list-item, .date-pill, #calendar button, .tabs button, .kat-kachel, .fav-knopf, .siegel, #btn-hotel");
      if (!ziel) return;
      Klang.tippen();
      if (this.ruhig) return;
      const r = ziel.getBoundingClientRect();
      const groesse = Math.max(r.width, r.height) * 2;
      const welle = document.createElement("span");
      welle.className = "welle";
      Object.assign(welle.style, {
        width: groesse + "px",
        height: groesse + "px",
        left: ev.clientX - r.left - groesse / 2 + "px",
        top: ev.clientY - r.top - groesse / 2 + "px",
      });
      ziel.appendChild(welle);
      welle.addEventListener("animationend", () => welle.remove());
    });
  },

  /** Roter Hanko-Stempel „済“ (= erledigt) auf dem Bild der Detail-Karte */
  hanko(container, mitSchwung) {
    const h = document.createElement("div");
    h.className = "hanko" + (mitSchwung && !this.ruhig ? " schwung" : "");
    h.innerHTML = "<span>済</span>";
    container.appendChild(h);
    if (mitSchwung) setTimeout(() => navigator.vibrate?.(35), 380);
  },

  /** Hell/Dunkel-Wechsel als Kreis, der sich vom Knopf aus ausbreitet */
  themaWechsel(knopf, aendern) {
    if (!document.startViewTransition || this.ruhig) return aendern();
    const r = knopf.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const uebergang = document.startViewTransition(aendern);
    uebergang.ready.then(() =>
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 650, easing: "cubic-bezier(.2,.8,.2,1)", pseudoElement: "::view-transition-new(root)" }
      )
    ).catch(() => {});
  },

  /** Zahlen hochzählen lassen (z. B. 0 → 12) */
  hochzaehlen(root) {
    root.querySelectorAll("[data-ziel]").forEach((el) => {
      const ziel = Number(el.dataset.ziel);
      if (this.ruhig || ziel === 0) { el.textContent = ziel; return; }
      const start = performance.now(), dauer = 900;
      const schritt = (jetzt) => {
        const t = Math.min(1, (jetzt - start) / dauer);
        el.textContent = Math.round(ziel * (1 - Math.pow(1 - t, 3)));
        if (t < 1) requestAnimationFrame(schritt);
      };
      requestAnimationFrame(schritt);
    });
  },

  /** Animation erneut abspielen (Klasse kurz entfernen und wieder setzen) */
  nochmal(el, klasse) {
    if (!el) return;
    el.classList.remove(klasse);
    void el.offsetWidth;
    el.classList.add(klasse);
  },

  /** Tageswechsel: Wellenband zieht über den Bildschirm, das neue Datum wird „gestempelt“ */
  tagWechsel(iso) {
    if (this.ruhig) return;
    document.querySelector(".tag-wechsel")?.remove();
    const d = new Date(iso + "T12:00:00Z");
    const el = document.createElement("div");
    el.className = "tag-wechsel";
    el.innerHTML = `<b>${d.getUTCDate()}日<small>${"日月火水木金土"[d.getUTCDay()]}曜日</small></b>`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1300);
  },

  /** Favorit: kleine Herzen fliegen aus dem Knopf */
  herzen(knopf) {
    if (this.ruhig || !knopf) return;
    const r = knopf.getBoundingClientRect();
    for (let i = 0; i < 9; i++) {
      const h = document.createElement("i");
      h.className = "flug-herz";
      h.textContent = "♥";
      const winkel = -Math.PI / 2 + (i - 4) * 0.32, weite = 46 + Math.random() * 40;
      Object.assign(h.style, { left: r.left + r.width / 2 + "px", top: r.top + r.height / 2 + "px", fontSize: 10 + Math.random() * 10 + "px" });
      document.body.appendChild(h);
      h.animate(
        [
          { transform: "translate(-50%, -50%) scale(0.3)", opacity: 1 },
          { transform: `translate(calc(-50% + ${Math.cos(winkel) * weite}px), calc(-50% + ${Math.sin(winkel) * weite}px)) scale(1)`, opacity: 1, offset: 0.6 },
          { transform: `translate(calc(-50% + ${Math.cos(winkel) * weite * 1.2}px), calc(-50% + ${Math.sin(winkel) * weite * 1.2 - 20}px)) scale(0.8)`, opacity: 0 },
        ],
        { duration: 800 + Math.random() * 300, easing: "cubic-bezier(.2,.8,.2,1)" }
      ).onfinish = () => h.remove();
    }
    navigator.vibrate?.(20);
  },

  /** Antippen der Karte: ein Tuschetropfen breitet sich wie auf Papier aus */
  tuscheTropfen(punkt) {
    if (this.ruhig || !punkt) return;
    const t = document.createElement("i");
    t.className = "tusche-tropfen";
    t.style.left = punkt.x + "px";
    t.style.top = punkt.y + "px";
    document.body.appendChild(t);
    t.addEventListener("animationend", () => t.remove());
  },

  /** Splash: Schriftzeichen nacheinander erscheinen lassen */
  titelZerlegen(el) {
    el.innerHTML = [...el.textContent].map((z, i) => `<i style="--i:${i}">${z}</i>`).join("");
  },
};
