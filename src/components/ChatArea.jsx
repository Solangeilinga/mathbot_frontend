import { useState, useRef, useEffect, useCallback } from "react";
import VoiceButton from "./VoiceButton";
import SpeakButton from "./SpeakButton";
import { chatAPI, progressionAPI } from "../utils/api";
import { speakText } from "../utils/tts";
import { useSpeechRecognition } from "../hooks/useSpeech";

const QUICK_ACTIONS = [
  { label: "💡 Expliquer",        text: "Je ne comprends pas, explique autrement avec un exemple simple du quotidien burkinabè" },
  { label: "➡ Exercice suivant",  text: "Donne-moi un nouvel exercice BEPC varié avec 4 options A B C D" },
  { label: "🎯 Indice",           text: "Donne-moi un indice sans donner la réponse directement" },
  { label: "📐 Formule",          text: "Rappelle-moi la formule principale de ce chapitre avec un exemple concret" },
  { label: "🔁 Revoir les bases", text: "Je veux revoir les bases du chapitre depuis le début, étape par étape" },
];

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

    const onStart = () => {
      if (currentMsgId.current === msgId) {
        setSpeakingId(msgId);
        setTalking(true);
      }
    };

    const onEnd = () => {
      // Vérifie que c'est bien ce message qui se termine
      if (currentMsgId.current === msgId) {
        currentMsgId.current = null;
        audioHandle.current  = null;
        setSpeakingId(null);
        setTalking(false);
      }
    };

    // Essaie le TTS IA (ElevenLabs/Gemini), puis retombe sur la voix du
    // navigateur si l'API ne renvoie pas d'audio ou échoue.
    const handle = await speakText(text, { onStart, onEnd });

    // Vérifie qu'on n'a pas été supplanté pendant l'attente réseau
    if (currentMsgId.current !== msgId) return;

    if (handle) {
      audioHandle.current = handle;
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

  // ── Appel IA (streaming, façon ChatGPT) ────────────────────────────────────
  const callAI = useCallback((text) => {
    setIsLoading(true);
    const msgId = Date.now() + Math.random();
    let started = false;

    chatAPI.streamMessage(text, chapter, {
      onChunk: (_piece, full) => {
        if (!started) {
          started = true;
          setIsLoading(false);
          appendMessage({ id: msgId, role: "bot", type: "text", content: full, streaming: true });
        } else {
          setMessages(prev => prev.map(m => (m.id === msgId ? { ...m, content: full } : m)));
        }
      },
      onDone: (full) => {
        setIsLoading(false);
        setMessages(prev => prev.map(m => (m.id === msgId ? { ...m, content: full, streaming: false } : m)));
        if (full.trim()) doSpeakRef.current(msgId, full);
      },
      onError: (err) => {
        setIsLoading(false);
        let msg = "⚠️ MathBot ne peut pas répondre pour le moment";
        if (err.message.includes("429") || err.message.includes("Limite")) {
          msg = "⏱️ Limite atteinte — réessaie dans quelques secondes";
        }
        if (started) {
          setMessages(prev => prev.map(m => (m.id === msgId ? { ...m, content: msg, streaming: false } : m)));
        } else {
          appendMessage({ role: "bot", type: "text", content: msg });
        }
      },
    });
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

  // ── Message de bienvenue (streaming) ──────────────────────────────────────
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    setMessages([]);
    setIsLoading(true);

    const msgId = Date.now() + Math.random();
    let started = false;

    chatAPI.streamWelcome(chapter, {
      onChunk: (_piece, full) => {
        if (!started) {
          started = true;
          setIsLoading(false);
          appendMessage({ id: msgId, role: "bot", type: "text", content: full, streaming: true });
        } else {
          setMessages(prev => prev.map(m => (m.id === msgId ? { ...m, content: full } : m)));
        }
      },
      onDone: (full) => {
        setIsLoading(false);
        setMessages(prev => prev.map(m => (m.id === msgId ? { ...m, content: full, streaming: false } : m)));
        if (full.trim()) doSpeakRef.current(msgId, full);
      },
      onError: () => {
        setIsLoading(false);
        const fallback = prenom
          ? `Bonjour ${prenom} ! Je suis MathBot, prêt à travailler "${chapter}" avec toi 😊`
          : `Bonjour ! Prêt à travailler "${chapter}" ensemble 😊`;
        if (started) {
          setMessages(prev => prev.map(m => (m.id === msgId ? { ...m, content: fallback, streaming: false } : m)));
        } else {
          appendMessage({ role: "bot", type: "text", content: fallback });
        }
      },
    });
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
  // ⚠️ Ne PAS faire correctLine.match(/[ABCD]/i)[0] : "Bonne" contient un "B",
  // qui matche avant la vraie lettre et fait croire que "B" est toujours la
  // bonne réponse. On ancre la capture juste après "✓"/"bonne réponse :", et
  // \b après la lettre empêche de re-matcher le "B" de "Bonne" lui-même
  // (pas de frontière de mot entre "B" et "onne").
  const correctLetter = correctLine?.match(/(?:✓\s*|bonne\s+r[ée]ponse\s*:?\s*)([ABCD])\b/i)?.[1]?.toUpperCase() ?? null;
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
    // Pendant le streaming, on n'essaie pas encore de parser un éventuel QCM :
    // le texte est incomplet et un "A." isolé afficherait des boutons prématurés.
    const exercise  = !msg.answered && !msg.streaming ? parseExercise(msg.content) : null;
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
          {msg.streaming && <span className="stream-cursor" aria-hidden="true" />}
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
          {!msg.streaming && (
            <SpeakButton
              speaking={isSpeaking}
              onSpeak={() => onSpeak(msg.id, msg.content)}
              onStop={() => onSpeak(msg.id, msg.content)}
            />
          )}
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