import { useState, useRef, useEffect, useCallback } from "react";
import VoiceButton from "./VoiceButton";
import SpeakButton from "./SpeakButton";
import { chatAPI, progressionAPI, ttsAPI } from "../utils/api";
import { useSpeechRecognition } from "../hooks/useSpeech";

const QUICK_ACTIONS = [
  { label: "💡 Expliquer",        text: "Je ne comprends pas, explique autrement avec un exemple simple du quotidien burkinabè" },
  { label: "➡ Exercice suivant",  text: "Donne-moi un nouvel exercice BEPC varié avec 4 options A B C D" },
  { label: "🎯 Indice",           text: "Donne-moi un indice sans donner la réponse directement" },
  { label: "📐 Formule",          text: "Rappelle-moi la formule principale de ce chapitre avec un exemple concret" },
  { label: "🔁 Revoir les bases", text: "Je veux revoir les bases du chapitre depuis le début, étape par étape" },
];

// ── Lecture audio base64 (ElevenLabs / Gemini) ────────────────────────────────
function playAudioBase64(base64, mimeType, { onStart, onEnd } = {}) {
  try {
    const bytes = atob(base64);
    const buf   = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i);
    const blob  = new Blob([buf], { type: mimeType || "audio/mpeg" });
    const url   = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onplay  = onStart;
    audio.onended = () => { URL.revokeObjectURL(url); onEnd?.(); };
    audio.onerror = () => { URL.revokeObjectURL(url); onEnd?.(); };
    audio.play().catch(() => { URL.revokeObjectURL(url); onEnd?.(); });
    return audio;
  } catch {
    onEnd?.();
    return null;
  }
}

// ── Lecture navigateur (fallback) ─────────────────────────────────────────────
function speakBrowser(text, { onStart, onEnd } = {}) {
  if (!window.speechSynthesis) { onEnd?.(); return null; }
  window.speechSynthesis.cancel();

  const clean = (text || "")
    .replace(/[^\p{L}\p{N}\s.,!?;:'«»()\-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 700);

  if (!clean) { onEnd?.(); return null; }

  const utt = new SpeechSynthesisUtterance(clean);
  utt.lang  = "fr-FR";
  utt.rate  = 0.9;
  utt.pitch = 1.05;

  const applyVoice = () => {
    const v = window.speechSynthesis.getVoices()
      .find(v => v.lang === "fr-FR" && v.localService)
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
  utt.onend   = onEnd;
  utt.onerror = () => onEnd?.();
  window.speechSynthesis.speak(utt);
  return utt;
}

export default function ChatArea({ chapter, onXPUpdate, showToast, user, onTalkingChange }) {
  const [messages, setMessages]     = useState([]);
  const [inputText, setInputText]   = useState("");
  const [isLoading, setIsLoading]   = useState(false);
  const [speakingId, setSpeakingId] = useState(null);

  const chatRef        = useRef(null);
  const initializedRef = useRef(false);
  // currentMsgId : le msgId pour lequel on est en train de parler (ou null)
  const currentMsgId  = useRef(null);
  // handle audio en cours (Audio ou SpeechSynthesisUtterance)
  const audioHandle   = useRef(null);

  const onTalkingRef = useRef(onTalkingChange);
  useEffect(() => { onTalkingRef.current = onTalkingChange; }, [onTalkingChange]);

  const setTalking = useCallback(val => onTalkingRef.current?.(val), []);

  const prenom = user?.prenom && user.prenom !== "undefined" ? user.prenom : "";

  // Scroll auto
  useEffect(() => {
    if (chatRef.current)
      setTimeout(() => { chatRef.current.scrollTop = chatRef.current.scrollHeight; }, 80);
  }, [messages]);

  const appendMessage = useCallback(msg =>
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), ...msg }])
  , []);

  // ── Stoppe tout ───────────────────────────────────────────────────────────
  const stopAll = useCallback(() => {
    // Arrête audio IA
    if (audioHandle.current instanceof Audio) {
      try { audioHandle.current.pause(); } catch {}
    }
    // Arrête voix navigateur
    try { window.speechSynthesis?.cancel(); } catch {}
    audioHandle.current = null;
    currentMsgId.current = null;
    setSpeakingId(null);
    setTalking(false);
  }, [setTalking]);

  // ── Fonction de lecture — appelée par ref pour éviter les closures périmées
  const doSpeak = useCallback(async (msgId, text) => {
    // Toggle : reclique = stop
    if (currentMsgId.current === msgId) {
      stopAll();
      return;
    }

    // Arrête le précédent sans attendre
    stopAll();

    // Enregistre immédiatement le msgId courant
    currentMsgId.current = msgId;
    setSpeakingId(msgId);
    setTalking(true);

    const onEnd = () => {
      // Vérifie que c'est bien ce message qui se termine
      if (currentMsgId.current === msgId) {
        currentMsgId.current = null;
        audioHandle.current  = null;
        setSpeakingId(null);
        setTalking(false);
      }
    };

    // ── Essai 1 : TTS IA (ElevenLabs / Gemini) ───────────────────────────
    try {
      const data = await ttsAPI.synthesize(text);

      // Vérifie qu'on n'a pas été supplanté pendant l'attente réseau
      if (currentMsgId.current !== msgId) return;

      if (data.audioContent) {
        const audio = playAudioBase64(data.audioContent, data.mimeType, {
          onStart: () => {
            if (currentMsgId.current === msgId) {
              setSpeakingId(msgId);
              setTalking(true);
            }
          },
          onEnd,
        });
        if (audio) {
          audioHandle.current = audio;
          return; // succès
        }
      }
    } catch {
      // TTS IA indisponible → on continue vers le navigateur
    }

    // Vérifie encore qu'on n'a pas été supplanté
    if (currentMsgId.current !== msgId) return;

    // ── Essai 2 : voix navigateur ─────────────────────────────────────────
    const utt = speakBrowser(text, {
      onStart: () => {
        if (currentMsgId.current === msgId) {
          setSpeakingId(msgId);
          setTalking(true);
        }
      },
      onEnd,
    });

    if (utt) {
      audioHandle.current = utt;
    } else {
      // Aucune voix disponible
      currentMsgId.current = null;
      setSpeakingId(null);
      setTalking(false);
    }
  }, [stopAll, setTalking]);

  // Ref stable pour doSpeak (accessible depuis callAI sans dépendance circulaire)
  const doSpeakRef = useRef(doSpeak);
  useEffect(() => { doSpeakRef.current = doSpeak; }, [doSpeak]);

  // ── Appel IA ──────────────────────────────────────────────────────────────
  const callAI = useCallback(async (text) => {
    setIsLoading(true);
    try {
      const data = await chatAPI.sendMessage(text, chapter);
      setIsLoading(false);
      const msgId = Date.now();
      appendMessage({ id: msgId, role: "bot", type: "text", content: data.reply });
      // Lance la voix automatiquement via la ref (toujours à jour)
      doSpeakRef.current(msgId, data.reply);
    } catch (err) {
      setIsLoading(false);
      let msg = "⚠️ MathBot ne peut pas répondre pour le moment";
      if (err.message.includes("429") || err.message.includes("Limite"))
        msg = "⏱️ Limite atteinte — réessaie dans quelques secondes";
      appendMessage({ role: "bot", type: "text", content: msg });
    }
  }, [chapter, appendMessage]);

  // ── Voix entrée micro ─────────────────────────────────────────────────────
  const onVoiceResult = useCallback(transcript => {
    appendMessage({ role: "user", type: "text", content: transcript });
    callAI(transcript);
  }, [appendMessage, callAI]);

  const onVoiceError = useCallback(err => {
    showToast(`Micro : ${err === "not-allowed" ? "Autorise le micro dans le navigateur" : err}`);
  }, [showToast]);

  const { listening, start: startListening, stop: stopListening, supported: sttSupported } =
    useSpeechRecognition({ onResult: onVoiceResult, onError: onVoiceError });

  // ── Message de bienvenue ──────────────────────────────────────────────────
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    setMessages([]);

    (async () => {
      setIsLoading(true);
      try {
        const data = await chatAPI.getWelcome(chapter);
        setIsLoading(false);
        const msgId = Date.now();
        appendMessage({ id: msgId, role: "bot", type: "text", content: data.reply });
        doSpeakRef.current(msgId, data.reply);
      } catch {
        setIsLoading(false);
        const fallback = prenom
          ? `Bonjour ${prenom} ! Je suis MathBot, prêt à travailler "${chapter}" avec toi 😊`
          : `Bonjour ! Prêt à travailler "${chapter}" ensemble 😊`;
        appendMessage({ role: "bot", type: "text", content: fallback });
      }
    })();
  }, [chapter]); // eslint-disable-line

  useEffect(() => () => stopAll(), [stopAll]);

  // ── Envoi message ─────────────────────────────────────────────────────────
  const sendMessage = async text => {
    const t = text.trim();
    if (!t || isLoading) return;
    stopAll();
    appendMessage({ role: "user", type: "text", content: t });
    setInputText("");
    await callAI(t);
  };

  // ── Réponse QCM ──────────────────────────────────────────────────────────
  const selectOption = async (msgId, optionLabel, isCorrect) => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, answered: true } : m));
    appendMessage({ role: "user", type: "text", content: `Ma réponse : ${optionLabel}` });
    try {
      const r = await progressionAPI.logExercice(chapter, isCorrect);
      if (onXPUpdate) onXPUpdate(r.xp, r.niveau);
      showToast(r.message);
    } catch { showToast(isCorrect ? "+20 XP ! 🎉" : "+5 XP 💪"); }
    const prompt = isCorrect
      ? `${prenom ? prenom + ", b" : "B"}onne réponse "${optionLabel}" ! Explique pourquoi pas-à-pas, puis propose un exercice plus difficile.`
      : `Réponse "${optionLabel}" incorrecte${prenom ? " " + prenom : ""}. Explique gentiment l'erreur, donne la correction pas-à-pas et encourage.`;
    await callAI(prompt);
  };

  const handleKey = e => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(inputText); }
  };

  // Wrapper stable pour les composants enfants
  const speakMessage = useCallback((msgId, text) => {
    doSpeakRef.current(msgId, text);
  }, []);

  return (
    <div className="chat-area">
      <div className="chat-top">
        <div className="chat-bot-info">
          <div className="chat-bot-avatar">🦉</div>
          <div>
            <div className="chat-bot-name">MathBot</div>
            <div className="chat-bot-sub">Tuteur IA · BEPC Burkina Faso</div>
          </div>
        </div>
        <div className="chat-topic-tag">{chapter}</div>
      </div>

      <div className="chat-messages" ref={chatRef}>
        {messages.map(msg => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            onSelectOption={selectOption}
            onSpeak={speakMessage}
            speakingId={speakingId}
          />
        ))}
        {isLoading && <TypingIndicator />}
      </div>

      <div className="quick-row">
        {QUICK_ACTIONS.map(a => (
          <button key={a.label} className="quick-btn"
            onClick={() => sendMessage(a.text)}
            disabled={isLoading || listening}
          >{a.label}</button>
        ))}
      </div>

      <div className="input-row">
        {sttSupported && (
          <VoiceButton
            listening={listening}
            onStart={startListening}
            onStop={stopListening}
            disabled={isLoading}
          />
        )}
        <input
          className={`chat-input ${listening ? "listening" : ""}`}
          value={listening ? "🎙 En écoute..." : inputText}
          onChange={e => !listening && setInputText(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Écris ta question à MathBot..."
          disabled={isLoading || listening}
          readOnly={listening}
        />
        <button
          className="send-btn"
          onClick={() => sendMessage(inputText)}
          disabled={isLoading || listening || !inputText.trim()}
        >↑</button>
      </div>

      {listening && (
        <div className="listening-banner">
          <span className="listening-dot" />MathBot t'écoute… parle maintenant
        </div>
      )}
    </div>
  );
}

// ── Parse QCM ─────────────────────────────────────────────────────────────────
function parseExercise(content) {
  const lines   = content.split("\n").map(l => l.trim()).filter(Boolean);
  const reg     = /^([ABCD])[.)•\-]\s+(.+)/i;
  const options = lines.filter(l => reg.test(l));
  if (options.length < 2) return null;
  const correctLine   = lines.find(l =>
    (l.includes("✓") && /[ABCD]/.test(l)) ||
    /bonne\s+r[ée]ponse\s*:?\s*[ABCD]/i.test(l)
  );
  const correctLetter = correctLine?.match(/[ABCD]/i)?.[0]?.toUpperCase() ?? null;
  return {
    options: options.map(opt => {
      const m      = opt.match(reg);
      const letter = m?.[1]?.toUpperCase() || opt[0].toUpperCase();
      return {
        label:   opt,
        letter,
        text:    m?.[2] || opt.slice(2).trim(),
        correct: correctLetter === letter,
      };
    }),
  };
}

function MessageBubble({ msg, onSelectOption, onSpeak, speakingId }) {
  const isSpeaking = speakingId === msg.id;
  if (msg.role === "user")
    return <div className="msg-user"><div className="bubble-user">{msg.content}</div></div>;

  if (msg.type === "text") {
    const exercise  = !msg.answered ? parseExercise(msg.content) : null;
    const optReg    = /^[ABCD][.)•\-]\s+/i;
    const textLines = msg.content.split("\n").map(l => l.trim()).filter(l => {
      if (!l) return false;
      if (!exercise) return true;
      if (optReg.test(l)) return false;
      if (/bonne\s+r[ée]ponse|✓/i.test(l)) return false;
      return true;
    });
    return (
      <div className="msg-bot">
        <div className="bubble-bot">
          {textLines.map((line, i) => <span key={i}>{line}<br /></span>)}
          {exercise && !msg.answered && (
            <div className="chat-options">
              {exercise.options.map((opt, i) => (
                <button key={i} className="opt-btn"
                  onClick={() => onSelectOption(msg.id, opt.label, opt.correct)}
                >
                  <span className="opt-letter">{opt.letter}</span>
                  <span className="opt-text">{opt.text}</span>
                </button>
              ))}
            </div>
          )}
          <SpeakButton
            speaking={isSpeaking}
            onSpeak={() => onSpeak(msg.id, msg.content)}
            onStop={() => onSpeak(msg.id, msg.content)}
          />
        </div>
      </div>
    );
  }
  return null;
}

function TypingIndicator() {
  return (
    <div className="msg-bot">
      <div className="bubble-bot">
        <div className="typing-indicator">
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-text">MathBot réfléchit…</span>
        </div>
      </div>
    </div>
  );
}