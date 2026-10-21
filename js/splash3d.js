/* =========================================================
   Tokio Entdecker – 3D-Startbildschirm (three.js)
   ---------------------------------------------------------
   Eine echte 3D-Szene: Torii im Wasser vor der Abendsonne,
   Fuji, Hügel im Abendnebel, treibende Wasserlaternen,
   Kirschbaum und fallende Blütenblätter. Die Kamera fliegt
   langsam auf das Torii zu – beim Ausblenden hindurch.
   Fällt 3D aus (altes Handy, Stromsparen), bleibt der
   gezeichnete Startbildschirm. Ein-/ausschalten unter ☰ → ⚙️.
   ========================================================= */

const Splash3D = {
  SPEICHER: "tokio.splash3d",
  aktiv: (() => { try { return JSON.parse(localStorage.getItem("tokio.splash3d") ?? "true"); } catch { return true; } })(),
  laeuft: false,

  umschalten(an = !this.aktiv) {
    this.aktiv = an;
    try { localStorage.setItem(this.SPEICHER, JSON.stringify(an)); } catch {}
  },

  /** three.js nachladen (nur wenn 3D benutzt wird) */
  laden() {
    if (window.THREE) return Promise.resolve();
    return new Promise((fertig, fehler) => {
      const s = document.createElement("script");
      s.src = "lib/three/three.min.js";
      s.onload = fertig;
      s.onerror = fehler;
      document.head.appendChild(s);
    });
  },

  /** Szene aufbauen und starten. Gibt ein Promise zurück, das nach dem ersten Bild erfüllt ist. */
  starten(behaelter) {
    const T = window.THREE;
    const breite = () => behaelter.clientWidth || innerWidth, hoehe = () => behaelter.clientHeight || innerHeight;
    const renderer = new T.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
    renderer.setSize(breite(), hoehe());
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.domElement.className = "splash3d";
    behaelter.prepend(renderer.domElement);

    const szene = new T.Scene();
    szene.fog = new T.Fog(0x6a3566, 140, 760);
    const kamera = new T.PerspectiveCamera(56, breite() / hoehe(), 0.5, 2500);

    // ---------- Himmel: Farbverlauf als Kuppel + funkelnde Sterne ----------
    const himmel = new T.Mesh(
      new T.SphereGeometry(1400, 32, 16),
      new T.ShaderMaterial({
        side: T.BackSide, depthWrite: false, fog: false,
        uniforms: {
          oben: { value: new T.Color(0x0b0d2e) }, mitte: { value: new T.Color(0x3b2a6a) },
          rand: { value: new T.Color(0xe0785a) }, tief: { value: new T.Color(0x2a1830) },
        },
        vertexShader: "varying vec3 p; void main(){ p = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }",
        fragmentShader: `uniform vec3 oben, mitte, rand, tief; varying vec3 p;
          void main(){ float h = normalize(p).y;
            vec3 c = mix(rand, mitte, smoothstep(0.0, 0.22, h));
            c = mix(c, oben, smoothstep(0.22, 0.65, h));
            c = mix(c, tief, smoothstep(0.0, -0.08, h));
            gl_FragColor = vec4(c, 1.); }`,
      })
    );
    szene.add(himmel);

    const sternPos = [], sternPhase = [];
    for (let i = 0; i < 420; i++) {
      const w = Math.random() * Math.PI * 2, h = 0.18 + Math.random() * 0.8;
      const r = 1300, ring = Math.sqrt(1 - h * h);
      sternPos.push(Math.cos(w) * ring * r, h * r, Math.sin(w) * ring * r);
      sternPhase.push(Math.random() * 6.28);
    }
    const sternGeo = new T.BufferGeometry();
    sternGeo.setAttribute("position", new T.Float32BufferAttribute(sternPos, 3));
    sternGeo.setAttribute("phase", new T.Float32BufferAttribute(sternPhase, 1));
    const sternMat = new T.ShaderMaterial({
      transparent: true, depthWrite: false, fog: false, blending: T.AdditiveBlending,
      uniforms: { zeit: { value: 0 }, pr: { value: renderer.getPixelRatio() } },
      vertexShader: `attribute float phase; uniform float zeit, pr; varying float a;
        void main(){ a = 0.35 + 0.65 * (0.5 + 0.5 * sin(zeit * 1.7 + phase * 3.0));
          gl_PointSize = (1.4 + fract(phase) * 1.8) * pr; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
      fragmentShader: "varying float a; void main(){ float d = length(gl_PointCoord - .5); gl_FragColor = vec4(1., .96, .9, a * smoothstep(.5, .0, d)); }",
    });
    szene.add(new T.Points(sternGeo, sternMat));

    // ---------- Weiche Leucht-Textur (für Sonne, Laternen, Spiegelungen) ----------
    const leuchtTextur = (() => {
      const c = document.createElement("canvas"); c.width = c.height = 128;
      const g = c.getContext("2d"), v = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      v.addColorStop(0, "rgba(255,255,255,1)"); v.addColorStop(0.25, "rgba(255,255,255,.55)"); v.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = v; g.fillRect(0, 0, 128, 128);
      const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
    })();
    // tiefe = false: Lichtschein wird nicht von der Wasseroberfläche abgeschnitten (keine eckigen Kanten)
    const leuchten = (farbe, groesse, staerke = 1, tiefe = true) => {
      const s = new T.Sprite(new T.SpriteMaterial({ map: leuchtTextur, color: farbe, transparent: true, opacity: staerke, depthWrite: false, depthTest: tiefe, blending: T.AdditiveBlending, fog: false }));
      s.scale.set(groesse, groesse, 1);
      return s;
    };

    // ---------- Sonne ----------
    const sonne = new T.Group();
    const sonnenScheibe = new T.Mesh(new T.CircleGeometry(30, 48), new T.MeshBasicMaterial({ color: 0xffe6c4, fog: false }));
    sonne.add(sonnenScheibe, leuchten(0xffb070, 260, 0.9), leuchten(0xff7a50, 520, 0.35));
    sonne.position.set(0, 36, -520);
    szene.add(sonne);

    // ---------- Licht ----------
    szene.add(new T.HemisphereLight(0x9a7ad8, 0x241430, 0.85));
    const abendLicht = new T.DirectionalLight(0xffa06a, 2.2);
    abendLicht.position.set(0, 30, -200);
    szene.add(abendLicht);
    const fuelllicht = new T.DirectionalLight(0x6a78c8, 0.6);
    fuelllicht.position.set(-40, 50, 120);
    szene.add(fuelllicht);
    const laternenLicht = new T.PointLight(0xffa860, 260, 70, 1.6);
    laternenLicht.position.set(0, 5, 14);
    szene.add(laternenLicht);

    // ---------- Berge: Fuji & Hügel (Low-Poly) ----------
    const flach = (farbe) => new T.MeshStandardMaterial({ color: farbe, flatShading: true, roughness: 0.95 });
    const fuji = new T.Group();
    const fujiKegel = new T.Mesh(new T.ConeGeometry(150, 95, 10, 2), flach(0x74426a));
    fujiKegel.position.y = 47.5;
    const schnee = new T.Mesh(new T.ConeGeometry(47, 30, 10, 1), flach(0xf3e4ee));
    schnee.position.y = 95 - 15 + 0.6;
    fuji.add(fujiKegel, schnee);
    fuji.position.set(95, -4, -470);
    szene.add(fuji);
    [[-260, -420, 120, 55, 0x4e2b52], [-120, -360, 90, 38, 0x43264a], [320, -380, 110, 42, 0x4a2a50], [60, -330, 70, 26, 0x3a2142], [-330, -300, 80, 34, 0x351e3e]]
      .forEach(([x, z, r, h, f]) => {
        const huegel = new T.Mesh(new T.ConeGeometry(r, h, 7, 1), flach(f));
        huegel.position.set(x, h / 2 - 6, z);
        huegel.rotation.y = Math.random() * 3;
        szene.add(huegel);
      });

    // ---------- Torii im Wasser ----------
    const rot = new T.MeshStandardMaterial({ color: 0xd2392b, roughness: 0.5, emissive: 0x4a0c06, emissiveIntensity: 0.6 });
    const schwarz = new T.MeshStandardMaterial({ color: 0x1c1216, roughness: 0.6 });
    const torii = new T.Group();
    const saeule = (x) => {
      const s = new T.Mesh(new T.CylinderGeometry(0.75, 0.9, 16, 20), rot);
      s.position.set(x, 8, 0);
      const fuss = new T.Mesh(new T.CylinderGeometry(1.05, 1.1, 1.4, 20), schwarz);
      fuss.position.set(x, 0.5, 0);
      torii.add(s, fuss);
    };
    saeule(-7); saeule(7);
    const nuki = new T.Mesh(new T.BoxGeometry(19, 0.95, 0.85), rot); nuki.position.set(0, 11.6, 0);
    const shimaki = new T.Mesh(new T.BoxGeometry(20.5, 1.0, 1.2), rot); shimaki.position.set(0, 15.0, 0);
    const gakuzuka = new T.Mesh(new T.BoxGeometry(1.1, 3.0, 0.9), rot); gakuzuka.position.set(0, 13.3, 0);
    // Kasagi: geschwungener schwarzer Dachbalken mit hochgezogenen Enden
    const form = new T.Shape();
    form.moveTo(-13, 1.9); form.quadraticCurveTo(0, -0.7, 13, 1.9);
    form.lineTo(12.6, 3.0); form.quadraticCurveTo(0, 0.5, -12.6, 3.0); form.closePath();
    const kasagi = new T.Mesh(new T.ExtrudeGeometry(form, { depth: 1.8, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.12, bevelSegments: 1, curveSegments: 24 }), schwarz);
    kasagi.position.set(0, 14.6, -0.9);
    const kasagiRot = new T.Mesh(new T.ExtrudeGeometry(form, { depth: 1.5, bevelEnabled: false, curveSegments: 24 }), rot);
    kasagiRot.scale.set(0.985, 0.55, 1); kasagiRot.position.set(0, 14.25, -0.75);
    torii.add(nuki, shimaki, gakuzuka, kasagiRot, kasagi);
    szene.add(torii);

    // Spiegelung: gespiegelte Kopie unter der Wasseroberfläche
    const spiegelTorii = torii.clone(true);
    spiegelTorii.scale.y = -1;
    spiegelTorii.traverse((o) => { if (o.material) { o.material = o.material.clone(); o.material.side = T.DoubleSide; } });
    szene.add(spiegelTorii);

    // ---------- Wasser ----------
    const wasser = new T.Mesh(
      new T.PlaneGeometry(3000, 3000),
      new T.MeshStandardMaterial({ color: 0x2a1a46, emissive: 0x24123a, emissiveIntensity: 0.6, roughness: 0.22, metalness: 0.55, transparent: true, opacity: 0.82 })
    );
    wasser.rotation.x = -Math.PI / 2;
    szene.add(wasser);
    // Glitzernder Sonnenweg auf dem Wasser
    const sonnenweg = [];
    for (let i = 0; i < 26; i++) {
      const g = leuchten(0xffb070, 1, 0.5);
      g.scale.set(14 + Math.random() * 30, 1.6, 1);
      g.position.set((Math.random() - 0.5) * 16 * (1 + i * 0.08), 0.15, -40 - i * 18);
      g.userData.phase = Math.random() * 6.28;
      szene.add(g); sonnenweg.push(g);
    }

    // ---------- Treibende Wasserlaternen (Tōrō nagashi) ----------
    const laternen = [];
    const laternenMat = new T.MeshStandardMaterial({ color: 0xffd8a0, emissive: 0xff9a3c, emissiveIntensity: 2.2, roughness: 0.6 });
    const laternenDach = new T.MeshStandardMaterial({ color: 0x2a1a14, roughness: 0.8 });
    for (let i = 0; i < 30; i++) {
      const l = new T.Group();
      const koerper = new T.Mesh(new T.BoxGeometry(0.9, 1.0, 0.9), laternenMat); koerper.position.y = 0.55;
      const dach = new T.Mesh(new T.ConeGeometry(0.85, 0.45, 4), laternenDach); dach.position.y = 1.25; dach.rotation.y = Math.PI / 4;
      const schein = leuchten(0xffa050, 6, 0.75, false); schein.position.y = 0.6;
      const spiegelSchein = leuchten(0xff9040, 5, 0.3, false); spiegelSchein.position.y = -0.6; spiegelSchein.scale.set(3, 6, 1);
      l.add(koerper, dach, schein, spiegelSchein);
      l.position.set((Math.random() - 0.5) * 50, 0, 110 - Math.random() * 170);
      l.userData = { phase: Math.random() * 6.28, tempo: 0.6 + Math.random() * 0.8 };
      szene.add(l); laternen.push(l);
    }

    // ---------- Kirschzweig (ragt oben rechts ins Bild) ----------
    const baum = new T.Group();
    const holz = flach(0x2a1820);
    const zweig = (x1, y1, x2, y2, dicke) => {
      const laenge = Math.hypot(x2 - x1, y2 - y1);
      const z = new T.Mesh(new T.CylinderGeometry(dicke * 0.6, dicke, laenge, 6), holz);
      z.position.set((x1 + x2) / 2, (y1 + y2) / 2, 0);
      z.rotation.z = Math.atan2(x1 - x2, y2 - y1);
      baum.add(z);
    };
    zweig(10, 2, 3, 5, 0.45); zweig(3, 5, -2, 4.2, 0.28); zweig(5.5, 4, 3.5, 7, 0.22); zweig(0.5, 4.7, -0.5, 6.4, 0.16);
    const bluetenFarben = [0xf7b6ca, 0xfbd0dc, 0xf29ab8, 0xffe2ea];
    for (let i = 0; i < 46; i++) {
      const t = Math.random();
      const x = 10 - t * 12.5 + (Math.random() - 0.5) * 2.2, y = 2 + Math.sin(t * 3) * 2.6 + (Math.random() - 0.3) * 2.4;
      const farbe = bluetenFarben[i % 4];
      const bl = new T.Mesh(new T.IcosahedronGeometry(0.35 + Math.random() * 0.45, 0),
        new T.MeshStandardMaterial({ color: farbe, emissive: farbe, emissiveIntensity: 0.45, flatShading: true, roughness: 0.7 }));
      bl.position.set(x, y, (Math.random() - 0.5) * 2);
      baum.add(bl);
    }
    // Der Zweig hängt an der Kamera – so bleibt er als Bildrahmen oben rechts, während die Kamera fliegt
    baum.scale.setScalar(0.34);
    baum.position.set(1.9, 5.7, -14);
    kamera.add(baum);
    szene.add(kamera);

    // ---------- Fallende Blütenblätter ----------
    const anzahl = 240;
    const blattForm = new T.CircleGeometry(0.16, 7);
    blattForm.scale(1.5, 1, 1);
    const blatt = new T.InstancedMesh(
      blattForm,
      new T.MeshBasicMaterial({ color: 0xf28fb0, side: T.DoubleSide, transparent: true, opacity: 0.9 }),
      anzahl
    );
    const blaetter = Array.from({ length: anzahl }, () => ({
      x: (Math.random() - 0.5) * 50, y: Math.random() * 34, z: 60 - Math.random() * 80,
      v: 0.03 + Math.random() * 0.05, drift: Math.random() * 6.28, rx: Math.random() * 6, ry: Math.random() * 6, dr: 0.01 + Math.random() * 0.04,
    }));
    szene.add(blatt);
    const hilf = new T.Object3D();

    // ---------- Kameraflug ----------
    const start = performance.now();
    const ziel = new T.Vector3();
    let flug = null; // Ausflug durch das Torii
    let basisFov = 56;
    const glatt = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

    const bild = (jetzt) => {
      if (!this.laeuft) return;
      const s = (jetzt - start) / 1000;
      const t = glatt(s / 4.6);
      // Anflug: von weit hinten tief über dem Wasser auf das Torii zu, leicht schwebend
      kamera.position.set(Math.sin(s * 0.4) * 1.2, 4.0 + t * 3.0 + Math.sin(s * 0.9) * 0.25, 140 - t * 72);
      ziel.set(0, 12 + t * 1.5, -40);
      if (flug) {
        const f = glatt((jetzt - flug) / 1000);
        kamera.position.z -= f * 84;
        kamera.position.y += f * 3.5;
        kamera.fov = basisFov + f * 30;
        kamera.updateProjectionMatrix();
      }
      kamera.lookAt(ziel);
      sonne.position.y = 36 + t * 10;
      sternMat.uniforms.zeit.value = s;
      laternenLicht.intensity = 240 + Math.sin(s * 3.1) * 25;
      laternen.forEach((l) => {
        l.position.y = Math.sin(s * l.userData.tempo + l.userData.phase) * 0.12;
        l.position.z += 0.02 * l.userData.tempo;
        if (l.position.z > kamera.position.z - 6) l.position.z = -60 - Math.random() * 20;
        l.rotation.y = Math.sin(s * 0.3 + l.userData.phase) * 0.4;
      });
      sonnenweg.forEach((g) => { g.material.opacity = 0.25 + 0.25 * (0.5 + 0.5 * Math.sin(s * 2.2 + g.userData.phase)); });
      blaetter.forEach((b, i) => {
        b.y -= b.v; b.x += Math.sin(s + b.drift) * 0.02 + 0.012; b.rx += b.dr; b.ry += b.dr * 0.7;
        if (b.y < 0) { b.y = 30 + Math.random() * 6; b.x = (Math.random() - 0.5) * 50; }
        hilf.position.set(b.x, b.y, b.z);
        hilf.rotation.set(b.rx, b.ry, 0);
        hilf.updateMatrix();
        blatt.setMatrixAt(i, hilf.matrix);
      });
      blatt.instanceMatrix.needsUpdate = true;
      baum.rotation.z = Math.sin(s * 0.8) * 0.03;
      renderer.render(szene, kamera);
      this.raf = requestAnimationFrame(bild);
    };

    const anpassen = () => {
      renderer.setSize(breite(), hoehe());
      kamera.aspect = breite() / hoehe();
      // Hochformat: etwas weiter weg, damit das Torii ganz ins Bild passt
      basisFov = kamera.fov = kamera.aspect < 0.7 ? 62 : 52;
      kamera.updateProjectionMatrix();
    };
    anpassen();
    addEventListener("resize", anpassen);

    this.laeuft = true;
    this.aufraeumen = () => {
      this.laeuft = false;
      cancelAnimationFrame(this.raf);
      removeEventListener("resize", anpassen);
      szene.traverse((o) => { o.geometry?.dispose(); if (o.material) [].concat(o.material).forEach((m) => { m.map?.dispose(); m.dispose(); }); });
      renderer.dispose();
      renderer.domElement.remove();
    };
    this.durchfliegen = () => { flug = performance.now(); };

    return new Promise((fertig) => {
      requestAnimationFrame((jetzt) => { bild(jetzt); behaelter.classList.add("drei-d"); fertig(); });
    });
  },

  /** Beim Ausblenden durch das Torii fliegen, danach alles freigeben */
  beenden() {
    if (!this.laeuft) return;
    this.durchfliegen?.();
    setTimeout(() => this.aufraeumen?.(), 1200);
  },
};
