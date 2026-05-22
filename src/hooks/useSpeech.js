// src/hooks/useSpeech.js — Web Speech API : reconnaissance vocale + synthèse vocale

import { useState, useRef, useCallback, useEffect } from "react";

// ── Reconnaissance vocale (élève → texte) ────────────────────────────────────
export function useSpeechRecognition({ onResult, onError }) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  const supported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const start = useCallback(() => {
    if (!supported || listening) return;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = "fr-FR";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setListening(true);

    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      onResult(transcript);
    };

    recognition.onerror = (e) => {
      setListening(false);
      if (onError) onError(e.error);
    };

    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  }, [supported, listening, onResult, onError]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  // Nettoyage si le composant est démonté pendant l'écoute
  useEffect(() => () => recognitionRef.current?.abort(), []);

  return { listening, start, stop, supported };
}

// ── Synthèse vocale (MathBot → audio) ────────────────────────────────────────
export function useSpeechSynthesis() {
  const [speaking, setSpeaking] = useState(false);
  const utteranceRef = useRef(null);

  const supported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  // Choisit la meilleure voix française disponible
  function pickFrenchVoice() {
    const voices = window.speechSynthesis.getVoices();
    return (
      voices.find((v) => v.lang === "fr-FR" && v.localService) ||
      voices.find((v) => v.lang.startsWith("fr")) ||
      null
    );
  }

  const speak = useCallback(
    (text) => {
      if (!supported) return;
      // Arrêter ce qui parle déjà
      window.speechSynthesis.cancel();

      // Nettoyer le texte : retirer les emojis et les balises markdown
      const clean = text
        .replace(/[^\p{L}\p{N}\s.,!?;:'«»()\-]/gu, " ")
        .replace(/\*+/g, "")
        .replace(/#+/g, "")
        .replace(/\s+/g, " ")
        .trim();

      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = "fr-FR";
      utterance.rate = 0.92;   // légèrement plus lent pour la pédagogie
      utterance.pitch = 1.05;
      utterance.volume = 1;

      // Les voix se chargent de façon asynchrone sur certains navigateurs
      const setVoice = () => {
        const voice = pickFrenchVoice();
        if (voice) utterance.voice = voice;
      };

      if (window.speechSynthesis.getVoices().length) {
        setVoice();
      } else {
        window.speechSynthesis.onvoiceschanged = setVoice;
      }

      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [supported]
  );

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  useEffect(() => () => window.speechSynthesis.cancel(), []);

  return { speaking, speak, stopSpeaking, supported };
}
