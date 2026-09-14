// utils/tts.js — Lecture audio partagée : TTS IA (ElevenLabs/Gemini) avec repli
// systématique sur la voix du navigateur. Utilisé par ChatArea et ExerciseAnalyzer
// pour éviter d'avoir deux implémentations qui divergent.
import { ttsAPI } from "./api";

export function playAudioBase64(base64, mimeType, { onStart, onEnd } = {}) {
  try {
    const bytes = atob(base64);
    const buf = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i);
    const blob = new Blob([buf], { type: mimeType || "audio/mpeg" });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onplay = onStart;
    audio.onended = () => { URL.revokeObjectURL(url); onEnd?.(); };
    audio.onerror = () => { URL.revokeObjectURL(url); onEnd?.(); };
    audio.play().catch(() => { URL.revokeObjectURL(url); onEnd?.(); });
    return audio;
  } catch {
    onEnd?.();
    return null;
  }
}

export function speakBrowser(text, { onStart, onEnd } = {}) {
  if (!window.speechSynthesis) { onEnd?.(); return null; }
  window.speechSynthesis.cancel();

  const clean = (text || "")
    .replace(/[^\p{L}\p{N}\s.,!?;:'«»()\-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 700);

  if (!clean) { onEnd?.(); return null; }

  const utt = new SpeechSynthesisUtterance(clean);
  utt.lang = "fr-FR";
  utt.rate = 0.9;
  utt.pitch = 1.05;

  const applyVoice = () => {
    const v = window.speechSynthesis.getVoices().find(v => v.lang === "fr-FR" && v.localService)
      || window.speechSynthesis.getVoices().find(v => v.lang.startsWith("fr"))
      || null;
    if (v) utt.voice = v;
  };

  if (window.speechSynthesis.getVoices().length) {
    applyVoice();
  } else {
    window.speechSynthesis.onvoiceschanged = applyVoice;
  }

  utt.onstart = onStart;
  utt.onend = onEnd;
  utt.onerror = () => onEnd?.();
  window.speechSynthesis.speak(utt);
  return utt;
}

/**
 * Lit un texte à voix haute : essaie le TTS IA (ElevenLabs/Gemini) via l'API,
 * puis retombe TOUJOURS sur la voix du navigateur si l'API ne renvoie pas
 * d'audio (pas de clé configurée -> { silent: true }) ou échoue.
 * Retourne le handle audio (Audio ou SpeechSynthesisUtterance) ou null.
 */
export async function speakText(text, { onStart, onEnd } = {}) {
  try {
    const data = await ttsAPI.synthesize(text);
    if (data.audioContent) {
      const audio = playAudioBase64(data.audioContent, data.mimeType, { onStart, onEnd });
      if (audio) return audio;
    }
  } catch {
    /* API TTS indisponible → repli navigateur */
  }
  return speakBrowser(text, { onStart, onEnd });
}
