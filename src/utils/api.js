// utils/api.js — Appels HTTP vers le backend Express (origine séparée du frontend)

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem("bepc_token");

  const headers = {
    "Content-Type": "application/json",
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
    throw new Error(`Réponse inattendue du serveur (pas du JSON).`);
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
  getWelcome: (chapitre) => apiFetch(`/chat/welcome?chapitre=${encodeURIComponent(chapitre)}`),
  sendMessage: (message, chapitre) =>
    apiFetch("/chat/message", { method: "POST", body: JSON.stringify({ message, chapitre }) }),
  getHistory: (chapitre) => apiFetch(`/chat/history/${encodeURIComponent(chapitre)}`),
  clearHistory: (chapitre) => apiFetch(`/chat/history/${encodeURIComponent(chapitre)}`, { method: "DELETE" }),

  /**
   * Version streaming du message de bienvenue : appelle onChunk(morceau, texteComplet)
   * au fur et à mesure que le texte arrive, puis onDone(texteComplet) à la fin.
   */
  streamWelcome: (chapitre, { onChunk, onDone, onError } = {}) =>
    streamFetch(`/chat/welcome?chapitre=${encodeURIComponent(chapitre)}`, { method: "GET" }, { onChunk, onDone, onError }),

  /**
   * Version streaming de l'envoi de message : mêmes callbacks que streamWelcome.
   */
  streamMessage: (message, chapitre, { onChunk, onDone, onError } = {}) =>
    streamFetch(
      "/chat/message",
      { method: "POST", body: JSON.stringify({ message, chapitre }) },
      { onChunk, onDone, onError }
    ),
};

/**
 * Effectue un fetch et lit la réponse comme un flux de texte brut, morceau par
 * morceau (pour un affichage progressif façon ChatGPT). Si le serveur répond
 * une erreur classique (JSON, status non-2xx), elle est remontée via onError.
 */
async function streamFetch(endpoint, options, { onChunk, onDone, onError } = {}) {
  const token = localStorage.getItem("bepc_token");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  let response;
  try {
    response = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
  } catch (err) {
    onError?.(new Error(`Erreur réseau : ${err.message}`));
    return;
  }

  const contentType = response.headers.get("content-type") || "";

  // Réponse d'erreur classique (JSON) — auth, validation, rate limit...
  if (!response.ok || contentType.includes("application/json")) {
    let message = `Erreur ${response.status}`;
    try {
      const data = await response.json();
      message = data.error || message;
    } catch {
      /* ignore parse error, garde le message générique */
    }
    onError?.(new Error(message));
    return;
  }

  if (!response.body) {
    // Environnement sans support du streaming : on lit tout d'un coup
    const text = await response.text();
    onChunk?.(text, text);
    onDone?.(text);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let full = "";

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const piece = decoder.decode(value, { stream: true });
    if (piece) {
      full += piece;
      onChunk?.(piece, full);
    }
  }

  onDone?.(full);
}

// ─── Progression ──────────────────────────────────────────────────────────────
export const progressionAPI = {
  get: () => apiFetch("/progression"),
  logExercice: (chapitre, correct) =>
    apiFetch("/progression/exercice", { method: "POST", body: JSON.stringify({ chapitre, correct }) }),
  leaderboard: () => apiFetch("/progression/leaderboard"),
};

// ─── TTS ──────────────────────────────────────────────────────────────────────
export const ttsAPI = {
  synthesize: (text) => apiFetch("/tts", { method: "POST", body: JSON.stringify({ text }) }),
};

// ─── Mémoire pédagogique ──────────────────────────────────────────────────────
export const memoryAPI = {
  get: () => apiFetch("/memory"),
  update: (chapitre) => apiFetch("/memory/update", { method: "POST", body: JSON.stringify({ chapitre }) }),
};

// ─── Examen ───────────────────────────────────────────────────────────────────
export const examAPI = {
  logResults: (chapitre, score, total, temps) =>
    apiFetch("/exam/results", { method: "POST", body: JSON.stringify({ chapitre, score, total, temps }) }),
  getHistory: (chapitre) =>
    apiFetch(chapitre ? `/exam/history/${encodeURIComponent(chapitre)}` : "/exam/history"),
  getStats: (chapitre) => apiFetch(`/exam/stats/${encodeURIComponent(chapitre)}`),
};

// ─── Sujets d'examen ──────────────────────────────────────────────────────────
export const subjectAPI = {
  getSessions: () => apiFetch("/subject/sessions"),
  getSubjectsBySession: (session) => apiFetch(`/subject/${encodeURIComponent(session)}`),
  getSubject: (session, chapitre) =>
    apiFetch(`/subject/${encodeURIComponent(session)}/${encodeURIComponent(chapitre)}`),
  correctSubject: (sujet, reponses) =>
    apiFetch("/subject/correct", { method: "POST", body: JSON.stringify({ sujet, reponses }) }),
};

// ─── Analyse d'exercice ───────────────────────────────────────────────────────
export const exerciseAPI = {
  analyze: ({ imageBase64, imageType, exerciseText, chapitre }) =>
    apiFetch("/exercise/analyze", {
      method: "POST",
      body: JSON.stringify({ imageBase64, imageType, exerciseText, chapitre }),
    }),
};
