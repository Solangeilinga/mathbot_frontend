// src/utils/api.js — VERSION CORRIGÉE (JWT token envoyé dans chaque requête)

const BASE_URL = import.meta.env.VITE_API_URL || "/api";

console.log("🔍 [DEBUG] BASE_URL =", BASE_URL);
console.log("🔍 [DEBUG] VITE_API_URL =", import.meta.env.VITE_API_URL);

async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem("bepc_token");

  const headers = {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  let response;
  try {
    response = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
  } catch (networkErr) {
    throw new Error(`Erreur réseau : ${networkErr.message}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const text = await response.text();
    console.error(`[api] Réponse non-JSON sur ${endpoint}:`, text.slice(0, 200));
    throw new Error(`Réponse inattendue du serveur (pas du JSON). Vérifie l'URL API.`);
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Erreur ${response.status}`);
  }
  return data;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (nom, prenom, email, password) =>
    apiFetch("/auth/register", { method: "POST", body: JSON.stringify({ nom, prenom, email, password }) }),
  login: (email, password) =>
    apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => apiFetch("/auth/me"),
};

// ─── Chat IA ──────────────────────────────────────────────────────────────────
export const chatAPI = {
  getWelcome:   (chapitre) => apiFetch(`/chat/welcome?chapitre=${encodeURIComponent(chapitre)}`),
  sendMessage:  (message, chapitre) => apiFetch("/chat/message", { method: "POST", body: JSON.stringify({ message, chapitre }) }),
  getHistory:   (chapitre) => apiFetch(`/chat/history/${encodeURIComponent(chapitre)}`),
  clearHistory: (chapitre) => apiFetch(`/chat/history/${encodeURIComponent(chapitre)}`, { method: "DELETE" }),
};

// ─── Progression ──────────────────────────────────────────────────────────────
export const progressionAPI = {
  get:         ()                          => apiFetch("/progression"),
  logExercice: (chapitre, correct)         => apiFetch("/progression/exercice", { method: "POST", body: JSON.stringify({ chapitre, correct }) }),
  logSession:  (chapitre, xpGagne, dureeSec) => apiFetch("/progression/session", { method: "POST", body: JSON.stringify({ chapitre, xpGagne, dureeSec }) }),
  leaderboard: ()                          => apiFetch("/progression/leaderboard"),
};

// ─── TTS ──────────────────────────────────────────────────────────────────────
export const ttsAPI = {
  synthesize: (text) => apiFetch("/tts", { method: "POST", body: JSON.stringify({ text }) }),
};

// ─── Mémoire pédagogique ──────────────────────────────────────────────────────
export const memoryAPI = {
  get:    ()          => apiFetch("/memory"),
  update: (chapitre)  => apiFetch("/memory/update", { method: "POST", body: JSON.stringify({ chapitre }) }),
};

// ─── Examen ───────────────────────────────────────────────────────────────────
export const examAPI = {
  logResults: (chapitre, score, total, temps) =>
    apiFetch("/exam/results", { method: "POST", body: JSON.stringify({ chapitre, score, total, temps }) }),
  getHistory: (chapitre) =>
    apiFetch(chapitre ? `/exam/history/${encodeURIComponent(chapitre)}` : "/exam/history"),
  getStats:   (chapitre) =>
    apiFetch(`/exam/stats/${encodeURIComponent(chapitre)}`),
};

// ─── Sujets d'examen ──────────────────────────────────────────────────────────
export const subjectAPI = {
  getSessions:          ()                  => apiFetch("/subject/sessions"),
  getSubjectsBySession: (session)           => apiFetch(`/subject/${encodeURIComponent(session)}`),
  getSubject:           (session, chapitre) => apiFetch(`/subject/${encodeURIComponent(session)}/${encodeURIComponent(chapitre)}`),
  correctSubject:       (sujet, reponses)   => apiFetch("/subject/correct", { method: "POST", body: JSON.stringify({ sujet, reponses }) }),
};

// ─── Analyse d'exercice ───────────────────────────────────────────────────────
export const exerciseAPI = {
  analyze: ({ imageBase64, imageType, exerciseText, chapitre }) =>
    apiFetch("/exercise/analyze", {
      method: "POST",
      body: JSON.stringify({ imageBase64, imageType, exerciseText, chapitre }),
    }),
};

