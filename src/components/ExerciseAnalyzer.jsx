import { useState, useRef, useCallback } from "react";
import { exerciseAPI, ttsAPI } from "../utils/api";
import { progressionAPI } from "../utils/api";

// ── TTS (même logique que ChatArea) ──────────────────────────────────────────
async function speakText(text, { onStart, onEnd } = {}) {
  try {
    const data = await ttsAPI.synthesize(text);
    if (data.audioContent) {
      const bytes = atob(data.audioContent);
      const buf = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i);
      const blob = new Blob([buf], { type: data.mimeType || "audio/wav" });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onplay = onStart;
      audio.onended = () => { URL.revokeObjectURL(url); onEnd?.(); };
      audio.onerror = () => { URL.revokeObjectURL(url); speakBrowser(data.cleanText || text, { onStart, onEnd }); };
      audio.play();
      return audio;
    }
    if (data.fallback) speakBrowser(data.cleanText || text, { onStart, onEnd });
  } catch { speakBrowser(text, { onStart, onEnd }); }
}

function speakBrowser(text, { onStart, onEnd } = {}) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const clean = text.replace(/[^\p{L}\p{N}\s.,!?;:'«»()\-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 700);
  const utt = new SpeechSynthesisUtterance(clean);
  utt.lang = "fr-FR"; utt.rate = 0.9; utt.pitch = 1.05;
  const applyVoice = () => { const v = window.speechSynthesis.getVoices().find(v => v.lang.startsWith("fr")); if (v) utt.voice = v; };
  window.speechSynthesis.getVoices().length ? applyVoice() : (window.speechSynthesis.onvoiceschanged = applyVoice);
  utt.onstart = onStart; utt.onend = onEnd; utt.onerror = onEnd;
  window.speechSynthesis.speak(utt);
}

// ── Parse la réponse en sections ──────────────────────────────────────────────
function parseAnalysis(text) {
  const sections = {};
  const markers = [
    { key: "analyse",      regex: /📌\s*ANALYSE/i },
    { key: "explication",  regex: /📖\s*EXPLICATION/i },
    { key: "solution",     regex: /✅\s*SOLUTION/i },
    { key: "entrainement", regex: /🎯\s*ENTRAÎNE-TOI/i },
  ];

  let remaining = text;

  for (let i = 0; i < markers.length; i++) {
    const current = markers[i];
    const next    = markers[i + 1];
    const start   = remaining.search(current.regex);
    if (start === -1) continue;
    const afterTitle = remaining.indexOf("\n", start);
    const end = next ? remaining.search(next.regex) : remaining.length;
    sections[current.key] = remaining.slice(afterTitle, end === -1 ? remaining.length : end).trim();
    if (i === 0) remaining = remaining; // garde tout pour chercher les suivantes
  }

  // Parse les exercices QCM depuis la section entraînement
  const exercises = [];
  if (sections.entrainement) {
    const exReg = /Exercice\s+(\d+)\s*:\s*([^\n]+)([\s\S]*?)(?=Exercice\s+\d+|$)/gi;
    let match;
    while ((match = exReg.exec(sections.entrainement)) !== null) {
      const num     = match[1];
      const enonce  = match[2].trim();
      const bloc    = match[3];
      const optReg  = /^([ABCD])[.)]\s+(.+)/gm;
      const options = [];
      let optMatch;
      while ((optMatch = optReg.exec(bloc)) !== null) {
        options.push({ letter: optMatch[1], text: optMatch[2].trim() });
      }
      const correctMatch = bloc.match(/✓\s*Bonne\s+r[ée]ponse\s*:\s*([ABCD])/i);
      const correctLetter = correctMatch?.[1]?.toUpperCase() || null;
      if (options.length >= 2) {
        exercises.push({
          id: num,
          enonce,
          options: options.map(o => ({ ...o, correct: o.letter === correctLetter })),
          answered: false,
          selectedLetter: null,
        });
      }
    }
  }

  return { sections, exercises, raw: text };
}

export default function ExerciseAnalyzer({ chapter, user, showToast, onXPUpdate }) {
  const [mode, setMode]           = useState("text"); // "text" | "image"
  const [inputText, setInputText] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState(null); // { sections, exercises, raw }
  const [exercises, setExercises] = useState([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [fallbackSuggested, setFallbackSuggested] = useState(false);
  const fileInputRef = useRef(null);
  const dropRef      = useRef(null);
  const audioRef     = useRef(null);

  // ── Gestion image ─────────────────────────────────────────────────────────
  const handleImageFile = useCallback((file) => {
    if (!file) return;
    const allowed = ["image/jpeg","image/png","image/webp","image/gif"];
    if (!allowed.includes(file.type)) { showToast("❌ Format non supporté (JPG, PNG, WEBP)"); return; }
    if (file.size > 5 * 1024 * 1024) { showToast("❌ Image trop lourde (max 5 Mo)"); return; }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = e => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
    setFallbackSuggested(false);
  }, [showToast]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    dropRef.current?.classList.remove("drag-over");
    const file = e.dataTransfer.files[0];
    if (file) handleImageFile(file);
  }, [handleImageFile]);

  const handleDragOver = (e) => { e.preventDefault(); dropRef.current?.classList.add("drag-over"); };
  const handleDragLeave = () => { dropRef.current?.classList.remove("drag-over"); };

  const removeImage = () => { setImageFile(null); setImagePreview(null); setFallbackSuggested(false); };

  // ── Analyse ───────────────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    if (mode === "text" && !inputText.trim()) { showToast("⚠️ Écris ton exercice d'abord"); return; }
    if (mode === "image" && !imageFile)       { showToast("⚠️ Sélectionne une image d'abord"); return; }

    setLoading(true);
    setResult(null);
    setExercises([]);

    try {
      let payload = { chapitre: chapter };

      if (mode === "image" && imageFile) {
        // Convertit en base64 pur (sans le préfixe data:...)
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = e => resolve(e.target.result.split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(imageFile);
        });
        payload.imageBase64 = base64;
        payload.imageType   = imageFile.type;
      } else {
        payload.exerciseText = inputText.trim();
      }

      const data = await exerciseAPI.analyze(payload);
      const parsed = parseAnalysis(data.reply);
      setResult(parsed);
      setExercises(parsed.exercises.map(ex => ({ ...ex })));

    } catch (err) {
      if (err.message.includes("422") || err.message.includes("fallback")) {
        setFallbackSuggested(true);
        setMode("text");
        showToast("📝 Écris l'exercice en texte à la place");
      } else {
        showToast(`❌ ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Répondre à un exercice QCM ────────────────────────────────────────────
  const selectOption = async (exIdx, letter) => {
    const ex = exercises[exIdx];
    if (ex.answered) return;
    const isCorrect = ex.options.find(o => o.letter === letter)?.correct || false;

    setExercises(prev => prev.map((e, i) =>
      i === exIdx ? { ...e, answered: true, selectedLetter: letter } : e
    ));

    try {
      const r = await progressionAPI.logExercice(chapter, isCorrect);
      if (onXPUpdate) onXPUpdate(r.xp, r.niveau);
      showToast(r.message);
    } catch {
      showToast(isCorrect ? "Bonne réponse ! +20 XP 🎉" : "Pas tout à fait ! +5 XP 💪");
    }
  };

  // ── Lecture audio ─────────────────────────────────────────────────────────
  const handleSpeak = async () => {
    if (isSpeaking) {
      audioRef.current?.pause?.();
      window.speechSynthesis?.cancel();
      setIsSpeaking(false);
      return;
    }
    if (!result) return;
    const textToRead = [
      result.sections.analyse,
      result.sections.explication,
      result.sections.solution,
    ].filter(Boolean).join(". ");

    const audio = await speakText(textToRead, {
      onStart: () => setIsSpeaking(true),
      onEnd:   () => { setIsSpeaking(false); audioRef.current = null; },
    });
    if (audio) audioRef.current = audio;
  };

  const handleReset = () => {
    setResult(null); setExercises([]); setInputText("");
    setImageFile(null); setImagePreview(null); setFallbackSuggested(false);
  };

  // ── Rendu ─────────────────────────────────────────────────────────────────
  return (
    <div className="ea-root">

      {/* ── En-tête ── */}
      <div className="ea-header">
        <div className="ea-header-icon">🔍</div>
        <div>
          <h2 className="ea-title">Analyse d'exercice</h2>
          <p className="ea-subtitle">Upload une photo ou tape ton exercice — MathBot l'explique et te fait pratiquer</p>
        </div>
      </div>

      {/* ── Zone de saisie (si pas encore de résultat) ── */}
      {!result && (
        <div className="ea-input-zone">

          {/* Toggle mode */}
          <div className="ea-mode-toggle">
            <button
              className={`ea-mode-btn ${mode === "text" ? "active" : ""}`}
              onClick={() => { setMode("text"); removeImage(); }}
            >✏️ Taper l'exercice</button>
            <button
              className={`ea-mode-btn ${mode === "image" ? "active" : ""}`}
              onClick={() => setMode("image")}
            >📷 Photo d'exercice</button>
          </div>

          {/* Mode texte */}
          {mode === "text" && (
            <div className="ea-text-mode">
              {fallbackSuggested && (
                <div className="ea-fallback-notice">
                  ℹ️ La reconnaissance d'image n'est pas disponible. Saisis l'exercice en texte.
                </div>
              )}
              <textarea
                className="ea-textarea"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder={`Copie ou écris ton exercice ici…\n\nExemple :\nRésoudre l'équation : 2x + 5 = 13\nOu : Un agriculteur a 250 kg de mil à 800 FCFA/kg, combien gagne-t-il ?`}
                rows={6}
              />
              <div className="ea-char-count">{inputText.length} caractères</div>
            </div>
          )}

          {/* Mode image */}
          {mode === "image" && (
            <div className="ea-image-mode">
              {!imagePreview ? (
                <div
                  ref={dropRef}
                  className="ea-dropzone"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="ea-drop-icon">📷</div>
                  <div className="ea-drop-title">Glisse ta photo ici</div>
                  <div className="ea-drop-sub">ou clique pour choisir un fichier</div>
                  <div className="ea-drop-formats">JPG · PNG · WEBP · max 5 Mo</div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: "none" }}
                    onChange={e => handleImageFile(e.target.files[0])}
                  />
                </div>
              ) : (
                <div className="ea-preview-zone">
                  <img src={imagePreview} alt="Exercice" className="ea-preview-img" />
                  <button className="ea-remove-img" onClick={removeImage}>✕ Supprimer</button>
                </div>
              )}
            </div>
          )}

          {/* Bouton analyser */}
          <button
            className="ea-analyze-btn"
            onClick={handleAnalyze}
            disabled={loading || (mode === "text" ? !inputText.trim() : !imageFile)}
          >
            {loading ? (
              <span className="ea-loading-row">
                <span className="ea-spinner" />
                MathBot analyse…
              </span>
            ) : (
              "🔍 Analyser et expliquer"
            )}
          </button>
        </div>
      )}

      {/* ── Résultat ── */}
      {result && (
        <div className="ea-result">

          {/* Actions */}
          <div className="ea-result-actions">
            <button className="ea-action-btn" onClick={handleSpeak}>
              {isSpeaking ? "⏹ Arrêter" : "🔊 Écouter l'explication"}
            </button>
            <button className="ea-action-btn secondary" onClick={handleReset}>
              ← Nouvel exercice
            </button>
          </div>

          {/* Section Analyse */}
          {result.sections.analyse && (
            <div className="ea-section analyse">
              <div className="ea-section-label">📌 Analyse</div>
              <div className="ea-section-content">{result.sections.analyse}</div>
            </div>
          )}

          {/* Section Explication */}
          {result.sections.explication && (
            <div className="ea-section explication">
              <div className="ea-section-label">📖 Explication</div>
              <div className="ea-section-content">{result.sections.explication}</div>
            </div>
          )}

          {/* Section Solution */}
          {result.sections.solution && (
            <div className="ea-section solution">
              <div className="ea-section-label">✅ Solution</div>
              <div className="ea-section-content">{result.sections.solution}</div>
            </div>
          )}

          {/* Exercices d'entraînement */}
          {exercises.length > 0 && (
            <div className="ea-section entrainement">
              <div className="ea-section-label">🎯 Entraîne-toi !</div>
              <div className="ea-exercises">
                {exercises.map((ex, idx) => (
                  <ExerciseCard
                    key={ex.id}
                    exercise={ex}
                    index={idx}
                    onSelect={(letter) => selectOption(idx, letter)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Fallback si parsing a échoué */}
          {exercises.length === 0 && result.sections.entrainement && (
            <div className="ea-section entrainement">
              <div className="ea-section-label">🎯 Entraîne-toi !</div>
              <div className="ea-section-content">{result.sections.entrainement}</div>
            </div>
          )}

          {/* Fallback brut si aucune section détectée */}
          {!result.sections.analyse && !result.sections.explication && (
            <div className="ea-section">
              <div className="ea-section-content ea-raw">{result.raw}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Carte d'exercice QCM ──────────────────────────────────────────────────────
function ExerciseCard({ exercise, index, onSelect }) {
  const { enonce, options, answered, selectedLetter } = exercise;
  const correctOption = options.find(o => o.correct);

  return (
    <div className={`ea-ex-card ${answered ? "answered" : ""}`}>
      <div className="ea-ex-num">Exercice {index + 1}</div>
      <p className="ea-ex-enonce">{enonce}</p>
      <div className="ea-ex-options">
        {options.map(opt => {
          let state = "";
          if (answered) {
            if (opt.letter === selectedLetter && opt.correct)  state = "correct";
            else if (opt.letter === selectedLetter && !opt.correct) state = "wrong";
            else if (opt.correct) state = "correct-show";
          }
          return (
            <button
              key={opt.letter}
              className={`ea-ex-opt ${state}`}
              onClick={() => !answered && onSelect(opt.letter)}
              disabled={answered}
            >
              <span className={`ea-ex-badge ${state}`}>{opt.letter}</span>
              <span className="ea-ex-opt-text">{opt.text}</span>
              {answered && opt.correct && <span className="ea-ex-check">✓</span>}
              {answered && opt.letter === selectedLetter && !opt.correct && <span className="ea-ex-cross">✗</span>}
            </button>
          );
        })}
      </div>
      {answered && (
        <div className={`ea-ex-feedback ${correctOption && selectedLetter === correctOption.letter ? "ok" : "ko"}`}>
          {correctOption && selectedLetter === correctOption.letter
            ? "✅ Bonne réponse ! Bien joué !"
            : `❌ La bonne réponse était ${correctOption?.letter}. ${correctOption?.text}`}
        </div>
      )}
    </div>
  );
}