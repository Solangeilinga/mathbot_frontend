# 🦉 MathBot — Frontend (Vite + React)

Interface élève du tuteur IA MathBot pour le BEPC (Burkina Faso). Ce frontend
est indépendant : il consomme l'API REST exposée par le backend séparé
(`mathbot_backend`, Express + PostgreSQL), comme dans l'architecture d'origine
à deux dépôts.

## 📂 Structure

```
mathbot_frontend/
├── index.html                  # Point d'entrée Vite (manifest PWA, icônes)
├── vite.config.js
├── public/
│   ├── manifest.json           # Manifest PWA (installable sur mobile/desktop)
│   ├── sw.js                   # Service worker (stale-while-revalidate)
│   └── icons/                  # Icônes PWA (standard + maskable)
└── src/
    ├── main.jsx                 # Point d'entrée React + enregistrement du service worker
    ├── App.jsx                  # Composant racine (auth réelle, navigation)
    ├── styles.css                # Tous les styles (fusion de l'ancien global.css + styles.css)
    ├── components/               # ChatArea, OwlTutor, Dashboard, Leaderboard, ExamSimulationPage...
    ├── hooks/                    # useAuth, useProgression, useSpeech, useToast, useXP
    ├── data/chapters.js          # Données de secours pour les chapitres
    └── utils/api.js              # Client fetch vers le backend (+ streaming du chat)
```

## 🚀 Démarrage

```bash
npm install
cp .env.example .env
# VITE_API_URL doit pointer vers votre backend (http://localhost:5000/api en dev)

npm run dev       # http://localhost:5173
```

Assurez-vous que `mathbot_backend` tourne en parallèle (voir son propre
README) — ce frontend ne fonctionne pas seul.

### Build de production

```bash
npm run build      # génère dist/
npm run preview    # sert le build localement pour vérifier
```

## 🔐 Authentification réelle

`App.jsx` affiche l'écran de connexion (`LoginPage`) tant qu'aucun utilisateur
n'est authentifié (`useAuth`), et transmet le JWT à chaque appel API via
`utils/api.js`. Chaque élève est donc bien isolé des autres côté backend.

## 🌊 Streaming du chat

`utils/api.js` expose `chatAPI.streamMessage` / `chatAPI.streamWelcome`, qui
lisent la réponse du backend via `response.body.getReader()` et appellent
`onChunk(morceau, texteComplet)` à chaque paquet reçu. `components/ChatArea.jsx`
affiche donc le texte au fur et à mesure, avec un curseur clignotant
(`.stream-cursor` dans `styles.css`), et n'active la détection d'un éventuel
QCM qu'une fois le flux terminé.

## 🏆 Classement

`components/Leaderboard.jsx` affiche le top 10 (médailles pour les 3
premiers) et surligne la ligne de l'utilisateur connecté. Intégré dans
`Dashboard.jsx`.

## 📲 PWA installable

- `public/manifest.json` + icônes (standard et *maskable*) permettent
  l'installation sur mobile/desktop.
- `public/sw.js` : service worker en stratégie *stale-while-revalidate* pour
  l'app shell — **ne met jamais en cache les appels vers le backend**
  (données dynamiques/authentifiées).
- `components/PwaRegister.jsx` enregistre le service worker au montage
  (inclus dans `main.jsx`).
- `components/InstallPwaButton.jsx` affiche un bouton "📲 Installer" dans le
  header, uniquement quand le navigateur le permet réellement (invisible sur
  iOS Safari, qui ne supporte pas cette API).

*Limite connue* : le service worker met en cache les pages/assets statiques,
mais pas les données — en mode complètement hors-ligne, l'app s'affiche mais
les fonctionnalités nécessitant l'IA ou la base de données attendent le
retour de la connexion.

## ⚠️ CORS

Ce frontend et le backend tournent sur des origines différentes
(`localhost:5173` vs `localhost:5000` en dev). Le backend doit autoriser
explicitement l'origine du frontend via sa variable `CORS_ORIGIN` (voir le
README de `mathbot_backend`).
