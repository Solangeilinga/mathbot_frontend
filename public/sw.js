// public/sw.js — Service worker MathBot
//
// Deux stratégies selon le type de requête :
//
// 1. Navigation (le document HTML, ex. "/") — RÉSEAU EN PRIORITÉ, avec repli
//    sur le cache seulement hors-ligne. L'HTML référence les fichiers JS/CSS
//    par leur nom hashé (ex. index-abc123.js) : le servir depuis le cache en
//    priorité est ce qui causait le bug — après un déploiement, le vieux HTML
//    en cache pointe vers des fichiers que le nouveau build a supprimés du
//    serveur, et l'app affichait une page blanche avec des 404 en console.
//
// 2. Tout le reste (JS/CSS/images hashés, manifest, icônes) — "stale-while-
//    revalidate" : on sert le cache immédiatement si dispo (rapide, marche
//    hors-ligne), et on met à jour en arrière-plan. Sans risque ici car ces
//    fichiers sont content-hashés par Vite — un nouveau build produit de
//    nouveaux noms de fichiers, il ne modifie jamais un fichier existant.
//
// ⚠️ Les appels /api/** ne sont JAMAIS mis en cache : ce sont des données
// dynamiques et authentifiées (chat, progression...), les servir depuis le
// cache donnerait de fausses réponses ou mélangerait les utilisateurs.

const CACHE_NAME = "mathbot-cache-v2"; // v1 -> v2 : purge les caches déjà cassés chez les visiteurs existants
const APP_SHELL = ["/manifest.json"];

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

  // ── Navigation (le document HTML) : réseau en priorité, cache seulement
  // comme repli hors-ligne (mis à jour à chaque visite en ligne réussie) ──
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
    );
    return;
  }

  // ── Tout le reste : stale-while-revalidate ───────────────────────────────
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
