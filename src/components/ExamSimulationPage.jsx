import { useState, useEffect, useRef, useCallback } from "react";
import { subjectAPI, examAPI } from "../utils/api";

const EXAM_DURATION = 2 * 60 * 60;

// ── Parser robuste a/b/c/d et A/B/C/D ────────────────────────────────────────
function parseSujet(sujetText) {
  const lines     = sujetText.split("\n").map(l => l.trim());
  const questions = [];
  let current     = null;

  const optReg  = /^([a-dA-D])[.)]\s+(.+)/;
  const qNumReg = /^(\d+\.\d+)\)\s*(.*)/;

  for (const line of lines) {
    if (!line || line.startsWith("━") || line.startsWith("═") || line.startsWith("─")) continue;

    const optMatch = line.match(optReg);
    if (optMatch && current) {
      current.options.push({
        letter:  optMatch[1].toUpperCase(),
        text:    optMatch[2].trim(),
        correct: false,
      });
      continue;
    }

    const qMatch = line.match(qNumReg);
    if (qMatch) {
      if (current && current.options.length >= 2) questions.push(current);
      const qText = qMatch[2].trim();
      current = {
        id:      questions.length + 1,
        numStr:  qMatch[1],
        text:    qText,
        options: [],
        pendingText: qText.length <= 3,
      };
      continue;
    }

    if (current?.pendingText && !optReg.test(line) && line.length > 5) {
      current.text       += (current.text ? " " : "") + line;
      current.pendingText = false;
    }
  }
  if (current && current.options.length >= 2) questions.push(current);

  return questions.filter(q => q.text.length > 3);
}

const fmt = s => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
};

export default function ExamSimulationPage({ chapter, onExit, showToast }) {
  const [timeLeft, setTimeLeft]   = useState(EXAM_DURATION);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [subject, setSubject]     = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers]     = useState({});
  const [currentQ, setCurrentQ]   = useState(0);
  const [phase, setPhase]         = useState("exam"); // "exam" | "results"
  const [results, setResults]     = useState(null);
  const [aiNote, setAiNote]       = useState(null);
  const [aiCorrecting, setAiCorrecting] = useState(false);
  const [freeText, setFreeText]   = useState("");
  const timerRef  = useRef(null);
  const submitted = useRef(false);

  // Charge le sujet — utilise "Mixte" si chapter = "Mixte", sinon session générique
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);

        // Essai 1 : sujet correspondant au chapitre exact
        let data = null;
        try {
          data = await subjectAPI.getSubject("2025", chapter === "Mixte" ? "Mixte" : chapter);
        } catch {
          // Essai 2 : sujet Mixte par défaut
          try {
            data = await subjectAPI.getSubject("2025", "Mixte");
          } catch {
            throw new Error("Aucun sujet disponible. Lance d'abord le script insertTestSubject.js");
          }
        }

        setSubject(data);
        setQuestions(parseSujet(data.sujet));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [chapter]);

  // Timer
  useEffect(() => {
    if (!subject || phase !== "exam") return;
    timerRef.current = setInterval(() => {
      setTimeLeft(p => {
        if (p <= 1) { clearInterval(timerRef.current); doSubmit(); return 0; }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [subject, phase]); // eslint-disable-line

  const doSubmit = useCallback(async () => {
    if (submitted.current) return;
    submitted.current = true;
    clearInterval(timerRef.current);

    if (questions.length > 0) {
      const detail = questions.map(q => ({
        q,
        userLetter: answers[q.id] || null,
        skipped:    !answers[q.id],
      }));
      const answered = detail.filter(d => !d.skipped).length;
      setResults({ detail, answered, total: questions.length });
      setPhase("results");

      if (subject && answered > 0) {
        setAiCorrecting(true);
        const synthAnswers = detail.map(d => {
          if (d.skipped) return `Q${d.q.id} (${d.q.numStr}): Non répondu`;
          const opt = d.q.options.find(o => o.letter === d.userLetter);
          return `Q${d.q.id} (${d.q.numStr}): ${d.userLetter}. ${opt?.text || ""}`;
        }).join("\n");
        try {
          const r = await subjectAPI.correctSubject(subject.sujet, synthAnswers);
          setAiNote(r);
          await examAPI.logResults(chapter, r.note, 20, timeLeft);
        } catch { /* silencieux */ }
        finally { setAiCorrecting(false); }
      }

    } else if (freeText.trim() && subject) {
      setPhase("results");
      setResults({ freeText: true, answered: 1, total: 1 });
      setAiCorrecting(true);
      try {
        const r = await subjectAPI.correctSubject(subject.sujet, freeText);
        setAiNote(r);
        await examAPI.logResults(chapter, r.note, 20, timeLeft);
      } catch { showToast("❌ Erreur correction IA"); }
      finally { setAiCorrecting(false); }
    } else {
      showToast("⚠️ Réponds à au moins une question");
      submitted.current = false;
    }
  }, [questions, answers, freeText, subject, chapter, timeLeft, showToast]);

  const selectAnswer = useCallback((qId, letter) => {
    setAnswers(p => ({ ...p, [qId]: letter }));
  }, []);

  // ── États d'affichage ─────────────────────────────────────────────────────

  if (loading) return (
    <div className="exam-loading">
      <div className="loading-spinner">⏳</div>
      <p>Chargement du sujet BEPC…</p>
    </div>
  );

  if (error) return (
    <div className="exam-error">
      <p>❌ {error}</p>
      <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
        Assure-toi d'avoir lancé : <code>node scripts/insertTestSubject.js</code>
      </p>
      <button className="btn-secondary" onClick={onExit}>← Retour</button>
    </div>
  );

  if (!subject) return (
    <div className="exam-error">
      <p>❌ Sujet introuvable</p>
      <button className="btn-secondary" onClick={onExit}>← Retour</button>
    </div>
  );

  if (phase === "results") {
    return (
      <ResultsPage
        results={results}
        aiNote={aiNote}
        aiCorrecting={aiCorrecting}
        onRetry={() => {
          submitted.current = false;
          setPhase("exam"); setResults(null); setAiNote(null);
          setAnswers({}); setCurrentQ(0); setTimeLeft(EXAM_DURATION); setFreeText("");
        }}
        onExit={onExit}
      />
    );
  }

  const totalQ    = questions.length;
  const answered  = Object.keys(answers).length;
  const timerColor = timeLeft < 600 ? "#ef4444" : timeLeft < 1800 ? "#f97316" : "#22c55e";

  return (
    <div className="exam-root">
      {/* Header */}
      <div className="exam-header">
        <div>
          <div className="exam-header-title">BEPC 2025 — Examen Blanc</div>
          <div className="exam-header-sub">{answered}/{totalQ} réponses</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="exam-timer" style={{ color: timerColor }}>{fmt(timeLeft)}</div>
          <div className="exam-timer-bar">
            <div className="exam-timer-fill" style={{ width: `${timeLeft / EXAM_DURATION * 100}%`, background: timerColor }} />
          </div>
        </div>
      </div>

      {/* Barre progression */}
      <div className="exam-progress-bar">
        <div className="exam-progress-fill" style={{ width: `${totalQ > 0 ? answered / totalQ * 100 : 0}%` }} />
      </div>

      {questions.length > 0 ? (
        <div className="exam-body">
          {/* Nav questions */}
          <div className="exam-nav-panel">
            <div className="exam-nav-title">Questions</div>
            <div className="exam-nav-grid">
              {questions.map((q, i) => (
                <button key={q.id}
                  className={`exam-nav-btn ${i === currentQ ? "current" : ""} ${answers[q.id] ? "answered" : ""}`}
                  onClick={() => setCurrentQ(i)}
                >{i + 1}</button>
              ))}
            </div>
            <div className="exam-nav-legend">
              <div><span className="leg-dot answered" /> Répondu</div>
              <div><span className="leg-dot current" /> Actuel</div>
              <div><span className="leg-dot" /> En attente</div>
            </div>
          </div>

          {/* Question active */}
          <div className="exam-question-panel">
            {questions[currentQ] && (
              <QuestionCard
                question={questions[currentQ]}
                index={currentQ}
                total={totalQ}
                selected={answers[questions[currentQ].id]}
                onSelect={l => selectAnswer(questions[currentQ].id, l)}
                onPrev={() => setCurrentQ(i => Math.max(0, i - 1))}
                onNext={() => setCurrentQ(i => Math.min(totalQ - 1, i + 1))}
              />
            )}
          </div>
        </div>
      ) : (
        /* Fallback texte libre */
        <div className="exam-freetext-body">
          <div className="exam-freetext-subject">
            <h3>Sujet</h3>
            <div className="subject-scroll">
              {subject.sujet.split("\n").map((l, i) => (
                <div key={i} className="subject-line">{l || "\u00A0"}</div>
              ))}
            </div>
          </div>
          <div className="exam-freetext-answer">
            <h3>Vos réponses</h3>
            <textarea
              className="answer-textarea"
              value={freeText}
              onChange={e => setFreeText(e.target.value)}
              placeholder="Rédigez vos réponses ici…"
            />
            <p className="answer-count">{freeText.length} caractères</p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="exam-footer">
        <button className="btn-secondary" onClick={onExit}>← Annuler</button>
        <span className="exam-status">
          {totalQ > 0 && answered < totalQ
            ? `${totalQ - answered} question(s) restante(s)`
            : answered === totalQ && totalQ > 0 ? "✅ Tout répondu !" : ""}
        </span>
        <button
          className="btn-finish"
          onClick={doSubmit}
          disabled={aiCorrecting || (totalQ > 0 ? answered === 0 : !freeText.trim())}
        >
          ✅ Soumettre
        </button>
      </div>
    </div>
  );
}

// ── Carte de question ─────────────────────────────────────────────────────────
function QuestionCard({ question, index, total, selected, onSelect, onPrev, onNext }) {
  return (
    <div className="question-card">
      <div className="question-meta">
        <span className="q-badge">Q {index + 1}<span className="q-total">/{total}</span></span>
        <span className="q-ref">{question.numStr}</span>
      </div>
      <p className="question-text">{question.text}</p>
      <div className="options-list">
        {question.options.map(opt => (
          <button key={opt.letter}
            className={`option-card ${selected === opt.letter ? "selected" : ""}`}
            onClick={() => onSelect(opt.letter)}
          >
            <span className={`option-badge ${selected === opt.letter ? "active" : ""}`}>{opt.letter}</span>
            <span className="option-txt">{opt.text}</span>
            {selected === opt.letter && <span className="option-tick">✓</span>}
          </button>
        ))}
      </div>
      <div className="q-nav">
        <button className="btn-q-nav" onClick={onPrev} disabled={index === 0}>← Préc.</button>
        <div className="q-dots">
          {Array.from({ length: Math.min(total, 12) }, (_, i) => (
            <span key={i} className={`q-dot ${i === index ? "active" : ""} ${i < index ? "done" : ""}`} />
          ))}
        </div>
        <button className="btn-q-nav right" onClick={onNext} disabled={index === total - 1}>Suiv. →</button>
      </div>
    </div>
  );
}

// ── Résultats ─────────────────────────────────────────────────────────────────
function ResultsPage({ results, aiNote, aiCorrecting, onRetry, onExit }) {
  const pct  = aiNote?.percentage ?? null;
  const note = aiNote?.note ?? null;

  const gradeColor = pct === null ? "var(--text-muted)"
    : pct >= 80 ? "#22c55e"
    : pct >= 70 ? "#4ade80"
    : pct >= 60 ? "#f97316"
    : pct >= 50 ? "#fb923c"
    : "#ef4444";

  const verdict = pct === null ? ""
    : pct >= 80 ? "Excellent ! 🎉"
    : pct >= 70 ? "Très bien 👍"
    : pct >= 60 ? "Assez bien"
    : pct >= 50 ? "Peut mieux faire"
    : "À retravailler 💪";

  return (
    <div className="results-page">
      <div className="results-inner">

        {/* Score */}
        <div className="results-score-card">
          <div className="rsc-left">
            {aiCorrecting ? (
              <div className="rsc-grade loading">
                <div className="rsc-spinner">⏳</div>
                <p>Correction en cours…</p>
              </div>
            ) : note !== null ? (
              <div className="rsc-grade">
                <div className="rsc-note" style={{ color: gradeColor }}>{note}<span className="rsc-denom">/20</span></div>
                <div className="rsc-pct" style={{ color: gradeColor }}>{pct}%</div>
              </div>
            ) : (
              <div className="rsc-grade">
                <div className="rsc-note" style={{ color: "var(--text-muted)" }}>–</div>
              </div>
            )}
          </div>
          <div className="rsc-right">
            {verdict && <div className="rsc-verdict">{verdict}</div>}
            <div className="rsc-stats">
              <div className="rsc-stat"><span className="rsc-stat-num">{results?.total || 0}</span><span className="rsc-stat-lbl">Questions</span></div>
              <div className="rsc-stat"><span className="rsc-stat-num green">{results?.answered || 0}</span><span className="rsc-stat-lbl">Répondues</span></div>
              <div className="rsc-stat"><span className="rsc-stat-num muted">{(results?.total || 0) - (results?.answered || 0)}</span><span className="rsc-stat-lbl">Ignorées</span></div>
            </div>
          </div>
        </div>

        {/* Récap réponses */}
        {results?.detail && (
          <div className="results-section">
            <h3 className="results-section-title">📋 Tes réponses</h3>
            <div className="answers-recap-grid">
              {results.detail.map(({ q, userLetter, skipped: sk }) => {
                const opt = userLetter ? q.options.find(o => o.letter === userLetter) : null;
                return (
                  <div key={q.id} className={`ar-card ${sk ? "ar-skip" : "ar-answered"}`}>
                    <div className="ar-head">
                      <span className="ar-num">{q.numStr}</span>
                      {sk
                        ? <span className="ar-badge skip">—</span>
                        : <span className="ar-badge ans">{userLetter}</span>
                      }
                    </div>
                    <div className="ar-qtext">{q.text.length > 60 ? q.text.slice(0, 60) + "…" : q.text}</div>
                    {!sk && opt && <div className="ar-opttext">{opt.text.length > 50 ? opt.text.slice(0, 50) + "…" : opt.text}</div>}
                    {sk && <div className="ar-skipped-label">Non répondu</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Correction IA */}
        {aiCorrecting && (
          <div className="results-section">
            <h3 className="results-section-title">🦉 Correction de MathBot</h3>
            <div className="ai-correcting-card">
              <div className="typing-indicator">
                <span className="typing-dot"/><span className="typing-dot"/><span className="typing-dot"/>
                <span className="typing-text">MathBot analyse ta copie…</span>
              </div>
            </div>
          </div>
        )}

        {aiNote && !aiCorrecting && (
          <div className="results-section">
            <h3 className="results-section-title">🦉 Correction de MathBot</h3>
            <div className="ai-correction-card">
              {aiNote.correction.split("\n").filter(Boolean).map((line, i) => {
                const isTitle = /^[\d]+[.)]\s+[A-ZÀÉÈÊ]/.test(line) || /^[A-ZÀÉÈÊ][^a-z]{0,3}:/.test(line);
                return <div key={i} className={`ai-line ${isTitle ? "title" : ""}`}>{line}</div>;
              })}
            </div>
          </div>
        )}

        <div className="results-actions">
          <button className="btn-retry" onClick={onRetry}>🔄 Recommencer</button>
          <button className="btn-back"  onClick={onExit}>← Retour aux annales</button>
        </div>
      </div>
    </div>
  );
}