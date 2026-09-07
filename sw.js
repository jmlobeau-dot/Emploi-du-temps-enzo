'use strict';
// Incrémenter VERSION à chaque publication. Ne pas supprimer les caches d'autres applications.
const VERSION = 'v1.3-20260907';
const BASE = new URL('./', self.location.href);
const PREFIX = 'edt-enzo:' + BASE.pathname + ':';
const CACHE = PREFIX + VERSION;
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'].map(path => new URL(path, BASE).href);
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== BASE.origin || !url.pathname.startsWith(BASE.pathname)) return;
  const page = request.mode === 'navigate';
  if (!page && !ASSETS.includes(url.href)) return;
  // La page vient du réseau à chaque ouverture ; le cache prend le relais sans réseau.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(request, {cache: 'no-cache'});
      if (!response.ok) throw new Error('Réponse réseau indisponible');
      await cache.put(page ? new URL('./index.html', BASE).href : request, response.clone());
      return response;
    } catch (error) {
      const saved = page ? await cache.match(new URL('./index.html', BASE).href) : await cache.match(request);
      if (saved) return saved;
      return new Response('Ressource indisponible hors connexion.', {status: 503, headers: {'Content-Type': 'text/plain; charset=utf-8'}});
    }
  })());
});
