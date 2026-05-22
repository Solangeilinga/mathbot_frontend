import { useEffect, useRef, useState } from "react";

const CHAPTER_STEPS = {
  Probabilités:  { concept: "Probabilité d'un événement", steps: ["P(A) = cas favorables / cas totaux", "Valeurs de 0 (impossible) à 1 (certain)", "P(cœur) = 13/52 = 1/4"] },
  Géométrie:     { concept: "Théorème de Pythagore",      steps: ["BC² = AB² + AC²", "L'hypoténuse est opposée à l'angle droit", "Vérifier : plus grand côté = hypoténuse"] },
  Algèbre:       { concept: "Résolution d'équations",     steps: ["Isoler x d'un côté", "Même opération des deux côtés", "2x + 3 = 7 → x = 2 ✓"] },
  Fonctions:     { concept: "Fonctions affines",           steps: ["f(x) = ax + b est une droite", "a = pente, b = ordonnée à l'origine", "Tracer 2 points pour la droite"] },
  Statistiques:  { concept: "Moyenne et fréquences",      steps: ["Moyenne = Σ(xi×ni)/Σni", "Médiane = valeur centrale ordonnée", "Mode = valeur la plus fréquente"] },
  Trigonométrie: { concept: "Sin, Cos et Tan",             steps: ["sin(α)=opposé/hypoténuse", "cos(α)=adjacent/hypoténuse", "Mémo : SOH-CAH-TOA"] },
};

export default function OwlTutor({ chapter, chapitres, isTalking }) {
  const svgRef      = useRef(null);
  const pupilLRef   = useRef(null);
  const pupilRRef   = useRef(null);
  const beakRef     = useRef(null);
  const bodyRef     = useRef(null);
  const eyelidLRef  = useRef(null);
  const eyelidRRef  = useRef(null);

  const floatAnim   = useRef(null);
  const blinkTimer  = useRef(null);
  const talkTimer   = useRef(null);
  const lookTimer   = useRef(null);

  const data     = CHAPTER_STEPS[chapter] || CHAPTER_STEPS["Probabilités"];
  const chapData = chapitres?.find(c => c.name === chapter);
  const score    = chapData?.score    ?? 0;
  const exercices = chapData?.exercices ?? 0;
  const reussites = chapData?.reussites ?? 0;

  // ── Animation flottement corps ─────────────────────────────────────────────
  useEffect(() => {
    if (!bodyRef.current) return;
    let t = 0;
    const step = () => {
      t += 0.025;
      const y = Math.sin(t) * 5;
      const r = Math.sin(t * 0.7) * 1.5;
      if (bodyRef.current) {
        bodyRef.current.style.transform = `translateY(${y}px) rotate(${r}deg)`;
      }
      floatAnim.current = requestAnimationFrame(step);
    };
    floatAnim.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(floatAnim.current);
  }, []);

  // ── Clignement naturel aléatoire ────────────────────────────────────────────
  useEffect(() => {
    const scheduleBlink = () => {
      const delay = 2500 + Math.random() * 4000; // entre 2.5s et 6.5s
      blinkTimer.current = setTimeout(() => {
        doBlink();
        scheduleBlink();
      }, delay);
    };

    const doBlink = () => {
      [eyelidLRef, eyelidRRef].forEach(ref => {
        if (!ref.current) return;
        ref.current.style.transition = "transform 60ms ease-in";
        ref.current.style.transform = "scaleY(1)"; // paupière fermée
        setTimeout(() => {
          if (!ref.current) return;
          ref.current.style.transition = "transform 100ms ease-out";
          ref.current.style.transform = "scaleY(0)"; // ouverte
        }, 80);
      });
    };

    scheduleBlink();
    return () => clearTimeout(blinkTimer.current);
  }, []);

  // ── Mouvement des yeux (regard aléatoire) ──────────────────────────────────
  useEffect(() => {
    const scheduleLook = () => {
      const delay = 1500 + Math.random() * 3000;
      lookTimer.current = setTimeout(() => {
        const dx = (Math.random() - 0.5) * 6;
        const dy = (Math.random() - 0.5) * 3;
        [pupilLRef, pupilRRef].forEach(ref => {
          if (!ref.current) return;
          ref.current.style.transition = "transform 200ms ease";
          ref.current.style.transform = `translate(${dx}px, ${dy}px)`;
          // Retour au centre après 600ms
          setTimeout(() => {
            if (!ref.current) return;
            ref.current.style.transition = "transform 300ms ease";
            ref.current.style.transform = "translate(0, 0)";
          }, 600);
        });
        scheduleLook();
      }, delay);
    };
    scheduleLook();
    return () => clearTimeout(lookTimer.current);
  }, []);

  // ── Animation bouche (parole) ──────────────────────────────────────────────
  useEffect(() => {
    if (!beakRef.current) return;

    if (isTalking) {
      // Animation bouche qui parle
      let open = false;
      const animateMouth = () => {
        open = !open;
        if (!beakRef.current) return;
        beakRef.current.setAttribute(
          "d",
          open
            ? "M50,64 Q60,75 70,64" // bouche ouverte
            : "M50,64 Q60,68 70,64"  // bouche légèrement ouverte
        );
        talkTimer.current = setTimeout(animateMouth, 120 + Math.random() * 80);
      };
      animateMouth();

      // Yeux légèrement plus expressifs
      [pupilLRef, pupilRRef].forEach(ref => {
        if (ref.current) ref.current.style.transition = "none";
      });
    } else {
      clearTimeout(talkTimer.current);
      if (beakRef.current) {
        beakRef.current.style.transition = "d 150ms ease";
        beakRef.current.setAttribute("d", "M50,64 Q60,68 70,64");
      }
    }

    return () => clearTimeout(talkTimer.current);
  }, [isTalking]);

  return (
    <div className="tutor-box">
      <div className="tutor-glow1" /><div className="tutor-glow2" />
      <div className="tutor-content">

        {/* ── Hibou SVG animé ── */}
        <div className="owl-container" ref={svgRef}>
          <svg
            ref={bodyRef}
            className="owl-svg"
            viewBox="0 0 120 130"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ width: "100%", height: "100%", transformOrigin: "60px 75px", willChange: "transform" }}
          >
            <defs>
              <radialGradient id="bodyG" cx="40%" cy="30%">
                <stop offset="0%" stopColor="#2d3a50"/>
                <stop offset="100%" stopColor="#0d1117"/>
              </radialGradient>
              <radialGradient id="eyeG" cx="35%" cy="35%">
                <stop offset="0%" stopColor="#fff9e0"/>
                <stop offset="50%" stopColor="#e8a020"/>
                <stop offset="100%" stopColor="#9a6200"/>
              </radialGradient>
              <radialGradient id="bellyG" cx="50%" cy="40%">
                <stop offset="0%" stopColor="#3a4a6a"/>
                <stop offset="100%" stopColor="#1a2035"/>
              </radialGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2.5" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>

            {/* Corps */}
            <ellipse cx="60" cy="75" rx="40" ry="48" fill="url(#bodyG)"/>
            {/* Ventre */}
            <ellipse cx="60" cy="82" rx="24" ry="30" fill="url(#bellyG)" opacity=".8"/>
            {/* Plumes */}
            <path d="M44 75 Q60 70 76 75 Q60 80 44 75Z" fill="rgba(255,255,255,0.07)"/>
            <path d="M42 83 Q60 77 78 83 Q60 89 42 83Z" fill="rgba(255,255,255,0.05)"/>
            <path d="M44 91 Q60 85 76 91 Q60 97 44 91Z" fill="rgba(255,255,255,0.04)"/>

            {/* Ailes */}
            <ellipse cx="22" cy="80" rx="13" ry="21" fill="#1a2235" transform="rotate(-15,22,80)"/>
            <ellipse cx="98" cy="80" rx="13" ry="21" fill="#1a2235" transform="rotate(15,98,80)"/>

            {/* ── Œil gauche ── */}
            <g filter="url(#glow)">
              <circle cx="40" cy="52" r="18" fill="url(#eyeG)" stroke="#e8a020" strokeWidth="1.5"/>
              <circle cx="40" cy="52" r="14" fill="#0d1117"/>
              <circle cx="40" cy="52" r="10" fill="#1a2a4a"/>
              {/* Pupille gauche — animée via ref */}
              <circle ref={pupilLRef} cx="40" cy="52" r="6" fill="#050810" style={{ transformOrigin: "40px 52px", willChange: "transform" }}/>
              {/* Reflets */}
              <circle cx="37" cy="48" r="2.5" fill="white" opacity=".85"/>
              <circle cx="43" cy="55" r="1.2" fill="white" opacity=".4"/>
              {/* Paupière (se ferme via scaleY) */}
              <ellipse
                ref={eyelidLRef}
                cx="40" cy="34" rx="18" ry="18"
                fill="#1e2d45"
                style={{ transformOrigin: "40px 34px", transform: "scaleY(0)", willChange: "transform" }}
              />
            </g>

            {/* ── Œil droit ── */}
            <g filter="url(#glow)">
              <circle cx="80" cy="52" r="18" fill="url(#eyeG)" stroke="#e8a020" strokeWidth="1.5"/>
              <circle cx="80" cy="52" r="14" fill="#0d1117"/>
              <circle cx="80" cy="52" r="10" fill="#1a2a4a"/>
              <circle ref={pupilRRef} cx="80" cy="52" r="6" fill="#050810" style={{ transformOrigin: "80px 52px", willChange: "transform" }}/>
              <circle cx="77" cy="48" r="2.5" fill="white" opacity=".85"/>
              <circle cx="83" cy="55" r="1.2" fill="white" opacity=".4"/>
              <ellipse
                ref={eyelidRRef}
                cx="80" cy="34" rx="18" ry="18"
                fill="#1e2d45"
                style={{ transformOrigin: "80px 34px", transform: "scaleY(0)", willChange: "transform" }}
              />
            </g>

            {/* Nez */}
            <polygon points="60,62 54,70 66,70" fill="#f97316" opacity=".9"/>

            {/* Bec / bouche animée */}
            <path
              ref={beakRef}
              d="M50,64 Q60,68 70,64"
              stroke="#f97316"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />

            {/* Sourcils */}
            <path d="M26 35 Q33 30 40 33" stroke="#e8a020" strokeWidth="2" strokeLinecap="round" fill="none" opacity=".7"/>
            <path d="M80 33 Q87 30 94 35" stroke="#e8a020" strokeWidth="2" strokeLinecap="round" fill="none" opacity=".7"/>

            {/* Aigrettes */}
            <path d="M28 24 Q24 10 32 14" stroke="#e8a020" strokeWidth="3" strokeLinecap="round" fill="none"/>
            <path d="M28 24 Q34 11 36 16" stroke="#e8a020" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
            <path d="M92 24 Q96 10 88 14" stroke="#e8a020" strokeWidth="3" strokeLinecap="round" fill="none"/>
            <path d="M92 24 Q86 11 84 16" stroke="#e8a020" strokeWidth="2.5" strokeLinecap="round" fill="none"/>

            {/* Pattes */}
            <path d="M45 118 Q42 112 40 118" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
            <path d="M52 120 Q50 113 48 120" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
            <path d="M75 118 Q78 112 80 118" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
            <path d="M68 120 Q70 113 72 120" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" fill="none"/>

            {/* Halo */}
            <circle cx="60" cy="75" r="48" stroke="rgba(232,160,32,0.07)" strokeWidth="1" fill="none"/>
          </svg>

          {/* Indicateur de parole */}
          {isTalking && (
            <div className="owl-talking-badge">
              <span className="talking-wave"/><span className="talking-wave"/>
              <span className="talking-wave"/>
              <span>MathBot parle…</span>
            </div>
          )}
        </div>

        {/* ── Info chapitre ── */}
        <div className="tutor-info">
          <div className="tutor-badge">
            <span className="tutor-pulse"/>
            {isTalking ? "🔊 En train de parler" : `Notion clé — ${chapter}`}
          </div>
          <h2 className="tutor-concept">{data.concept}</h2>
          <div className="tutor-steps">
            {data.steps.map((s, i) => (
              <div key={i} className="tutor-step" style={{ animationDelay: `${0.1 + i * 0.3}s` }}>
                <span className="tutor-step-num">{i + 1}</span>
                <span>{s}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="chap-stats">
          <div className="chap-stat"><div className="chap-stat-num">{score}%</div><div className="chap-stat-label">Score</div></div>
          <div className="chap-stat"><div className="chap-stat-num">{exercices}</div><div className="chap-stat-label">Exercices</div></div>
          <div className="chap-stat"><div className="chap-stat-num">{reussites}</div><div className="chap-stat-label">Réussis</div></div>
        </div>
      </div>
    </div>
  );
}