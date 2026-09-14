const ANNALES = [
  { year: "2025", title: "Sujet BEPC 2025", chapitres: ["Mixte"], session: "2025" },
  { year: "2023", title: "Sujet BEPC 2023", chapitres: ["Probabilités", "Géométrie", "Algèbre"] },
  { year: "2022", title: "Sujet BEPC 2022", chapitres: ["Fonctions", "Statistiques", "Trigonométrie"] },
  { year: "2021", title: "Sujet BEPC 2021", chapitres: ["Algèbre", "Probabilités", "Géométrie"] },
  { year: "2020", title: "Sujet BEPC 2020", chapitres: ["Trigonométrie", "Fonctions", "Statistiques"] },
];

function getScore(annale, chapitres) {
  if (!chapitres?.length) return null;
  const scores = annale.chapitres
    .map(ch => chapitres.find(c => c.name === ch)?.score ?? null)
    .filter(s => s !== null);
  return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
}

function scoreClass(s) {
  if (s === null) return "none";
  if (s >= 70)   return "good";
  if (s >= 50)   return "mid";
  return "low";
}

export default function AnnalesPage({ onStartExam, showToast, chapitres }) {
  return (
    <div className="annales-page" style={{ animation: "fade-in .4s ease" }}>
      <div className="annales-card">
        <h2 className="annales-title">Annales BEPC — Burkina Faso</h2>
        <p className="annales-sub">Entraîne-toi sur les vrais sujets du BEPC</p>

        {ANNALES.map(a => {
          const s = getScore(a, chapitres);
          // Le chapitre passé à onStartExam = premier de la liste
          const chapitreExam = a.chapitres[0];
          return (
            <div
              key={a.year}
              className="annale-item"
              onClick={() => {
                onStartExam(chapitreExam);
                showToast(`Sujet BEPC ${a.year} — Bonne chance !`);
              }}
            >
              <div className="annale-year">{a.year}</div>
              <div className="annale-info">
                <div className="annale-title-text">{a.title}</div>
                <div className="annale-tags">{a.chapitres.join(" · ")}</div>
              </div>
              <div className={`annale-score ${scoreClass(s)}`}>{s !== null ? `${s}%` : "—"}</div>
              <button
                className="annale-start-btn"
                onClick={e => {
                  e.stopPropagation();
                  onStartExam(chapitreExam);
                  showToast(`Sujet BEPC ${a.year} — Bonne chance !`);
                }}
              >
                Commencer →
              </button>
            </div>
          );
        })}

        <div className="annales-banner">
          <div>
            <div className="annales-banner-title">Mode Examen Blanc</div>
            <div className="annales-banner-sub">2h chrono · Conditions réelles BEPC</div>
          </div>
          <button
            className="annales-exam-btn"
            onClick={() => {
              onStartExam("Mixte");
              showToast("Mode Examen Blanc lancé !");
            }}
          >
            🎓 Lancer l'examen
          </button>
        </div>
      </div>
    </div>
  );
}