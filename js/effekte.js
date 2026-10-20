/* =========================================================
   Tokio Entdecker – Effekte & Animationen
   Hier steht nur Optisches. Wenn dir ein Effekt nicht gefällt,
   kannst du ihn in app.js einfach nicht mehr aufrufen.
   ========================================================= */

const Effekte = {
  ruhig: matchMedia("(prefers-reduced-motion: reduce)").matches,

  /** Schwebende Stimmung über der Karte: Ahornblätter (hell) bzw. Laternenlichter (dunkel) */
  stimmungStarten() {
    if (this.ruhig) return;
    const box = document.getElementById("ambient");
    for (let i = 0; i < 9; i++) {
      const teil = document.createElement("span");
      teil.className = "ambient-teil";
      teil.style.left = Math.random() * 100 + "%";
      teil.style.setProperty("--dauer", 16 + Math.random() * 14 + "s");
      teil.style.setProperty("--verz", -Math.random() * 30 + "s");
      teil.style.setProperty("--drift", Math.random() * 140 - 70 + "px");
      teil.style.setProperty("--gr", (0.6 + Math.random() * 0.7).toFixed(2));
      box.appendChild(teil);
    }
  },

  /** Wellen-Effekt beim Antippen von Knöpfen */
  wellenAktivieren() {
    document.addEventListener("pointerdown", (ev) => {
      const ziel = ev.target.closest(".btn, .fab, .chip, .icon-btn, .list-item, .date-pill, #calendar button, .tabs button");
      if (!ziel || this.ruhig) return;
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

  /** Splash: Schriftzeichen nacheinander erscheinen lassen */
  titelZerlegen(el) {
    el.innerHTML = [...el.textContent].map((z, i) => `<i style="--i:${i}">${z}</i>`).join("");
  },
};
