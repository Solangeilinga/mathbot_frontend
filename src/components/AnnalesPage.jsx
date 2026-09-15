// Un sujet BEPC officiel (1er tour) couvre toujours plusieurs chapitres à la
// fois — il est donc stocké côté backend sous chapitre "Mixte" pour chaque
// session, jamais sous un seul chapitre. Les tags "chapitres" ci-dessous sont
// juste informatifs (thèmes réellement présents dans le sujet, pour l'affichage
// et le score par thème) — 2025/2023/2022/2021 sont de vrais sujets transcrits ;
// 2020 n'a pas été trouvé (aucune source fiable, probablement lié aux
// perturbations de cette session au Burkina Faso) et retombera sur le message
// "pas encore disponible".
const ANNALES = [
  { year: "2025", title: "Sujet BEPC 2025", chapitres: ["Mixte"] },
  { year: "2023", title: "Sujet BEPC 2023", chapitres: ["Algèbre", "Géométrie", "Fonctions"] },
  { year: "2022", title: "Sujet BEPC 2022", chapitres: ["Fonctions", "Algèbre", "Statistiques"] },
  { year: "2021", title: "Sujet BEPC 2021", chapitres: ["Algèbre", "Géométrie", "Statistiques"] },
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
          return (
            <div
              key={a.year}
              className="annale-item"
              onClick={() => {
                onStartExam("Mixte", a.year);
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
                  onStartExam("Mixte", a.year);
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
              onStartExam("Mixte", "2025");
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