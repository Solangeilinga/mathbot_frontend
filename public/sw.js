// public/sw.js — Service worker MathBot
//
// Stratégie "stale-while-revalidate" pour l'app shell et les assets statiques :
// on sert le cache immédiatement si dispo (rapide, fonctionne hors-ligne), et on
// met à jour le cache en arrière-plan avec la dernière version du réseau.
//
// ⚠️ Les appels /api/** ne sont JAMAIS mis en cache : ce sont des données
// dynamiques et authentifiées (chat, progression...), les servir depuis le
// cache donnerait de fausses réponses ou mélangerait les utilisateurs.

const CACHE_NAME = "mathbot-cache-v1";
const APP_SHELL = ["/", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {
        /* premier chargement hors-ligne : pas grave, on retentera plus tard */
      })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // On ne gère que les requêtes GET, jamais les mutations (POST/PUT/DELETE)
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Jamais de cache pour l'API (données dynamiques/auth) — toujours réseau direct
  if (url.pathname.startsWith("/api/")) return;

  // Requêtes cross-origin (ex. audio TTS externe) : on laisse passer normalement
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);

      // Sert le cache immédiatement si dispo, sinon attend le réseau
      return cached || networkFetch;
    })
  );
});
