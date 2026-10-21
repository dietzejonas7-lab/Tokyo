/* Service Worker: macht die App offline-fähig.
   - Eigene Dateien (HTML/CSS/JS/Daten): immer zuerst frisch aus dem Netz, damit
     Änderungen sofort ankommen. Nur ohne Internet wird die gespeicherte Version genutzt.
   - Kartenkacheln und Schriften: aus dem Speicher, wenn möglich
     (so funktioniert die Karte auch in der U-Bahn ohne Netz – für bereits angesehene Gebiete). */
const VERSION = "v25"; // hochzählen löscht alte gespeicherte Daten (auch Kartenkacheln)
const SHELL = [
  "./", "index.html", "css/style.css", "js/app.js", "js/effekte.js", "js/szenen.js", "js/klang.js", "js/fotos.js", "manifest.webmanifest", "icons/icon.svg",
  "lib/leaflet/leaflet.js", "lib/leaflet/leaflet.css",
  "lib/markercluster/leaflet.markercluster.js", "lib/markercluster/MarkerCluster.css",
  "lib/maplibre/maplibre-gl.js", "lib/maplibre/maplibre-gl.css", "lib/maplibre/leaflet-maplibre-gl.js",
];

self.addEventListener("install", (ev) => {
  ev.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (ev) => {
  ev.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (ev) => {
  const req = ev.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Daten & App-Code: Netz zuerst, Speicher als Notfall
  if (url.origin === location.origin) {
    ev.respondWith(
      // "no-cache": beim Server nachfragen, ob es eine neue Version gibt (statt alte Kopie zu nehmen)
      fetch(url.href, { cache: "no-cache" })
        .then((res) => {
          const kopie = res.clone();
          caches.open(VERSION).then((c) => c.put(req, kopie));
          return res;
        })
        .catch(() => caches.match(req, { ignoreSearch: true }))
    );
    return;
  }

  // Kartenkacheln, Schriften, Bilder: Speicher zuerst (ändern sich nicht)
  if (/\.(pbf|mvt|png|jpe?g|webp|woff2?)$/.test(url.pathname) || url.pathname.includes("/tile/")) {
    ev.respondWith(
      caches.match(req).then((treffer) =>
        treffer ||
        fetch(req).then((res) => {
          if (res.ok || res.type === "opaque") {
            const kopie = res.clone();
            caches.open(VERSION + "-extern").then((c) => c.put(req, kopie));
          }
          return res;
        })
      )
    );
    return;
  }

  // Kartenstil & Kartenverzeichnis: Netz zuerst (zeigen auf die jeweils aktuellen Kacheln)
  ev.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const kopie = res.clone();
          caches.open(VERSION + "-extern").then((c) => c.put(req, kopie));
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
