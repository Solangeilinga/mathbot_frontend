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
