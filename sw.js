/* Service Worker — Προϋπολογισμός Ταξιδιού (offline/PWA) */
const VERSION = 'pt-v2';
const CORE = VERSION + '-core';
const RUNTIME = VERSION + '-runtime';

// Βασικά αρχεία εφαρμογής (app shell) — ΟΛΑ τοπικά (μηδενική εξάρτηση από ίντερνετ)
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './leaflet.min.css',
  './leaflet.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CORE).then(c => Promise.allSettled(
      CORE_ASSETS.map(u => c.add(new Request(u, { cache: 'reload' })))
    )).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = req.url;

  // Γεωκωδικοποίηση/δρομολόγηση: πάντα δίκτυο (φρέσκα δεδομένα, χωρίς cache)
  if (/nominatim\.openstreetmap|router\.project-osrm/.test(url)) return;

  // Πλοήγηση (HTML): δίκτυο πρώτα, αλλιώς cached index (offline)
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Υπόλοιπα: cache-first, με runtime cache για Leaflet & χάρτες OSM
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(resp => {
      if (resp && resp.ok && /cdnjs\.cloudflare|tile\.openstreetmap|unpkg/.test(url)) {
        const clone = resp.clone();
        caches.open(RUNTIME).then(c => c.put(req, clone));
      }
      return resp;
    }).catch(() => cached))
  );
});
