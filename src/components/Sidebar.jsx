import MemoryCard from "./MemoryCard";

const CHAPTERS_ORDER = [
  "Probabilités", "Géométrie", "Algèbre",
  "Fonctions", "Statistiques", "Trigonométrie",
];

export default function Sidebar({ currentChapter, setCurrentChapter, showToast, user, chapitres }) {
  // Filtre strict — jamais "undefined" affiché
  const prenom = (user?.prenom && user.prenom !== "undefined" && user.prenom !== "null")
    ? user.prenom : "";
  const nom    = (user?.nom    && user.nom    !== "undefined" && user.nom    !== "null")
    ? user.nom    : "";

  // Initiales pour l'avatar
  const initials = ((prenom[0] || "") + (nom[0] || "")).toUpperCase() || "?";

  // Nom affiché : prénom seul si court, prénom + initiale nom sinon
  const displayName = prenom
    ? (nom ? `${prenom} ${nom[0]}.` : prenom)
    : (nom || "Mon compte");

  const xp     = user?.xp     ?? 0;
  const niveau = user?.niveau ?? 1;

  const getScore = (ch) => chapitres?.find(c => c.name === ch)?.score ?? 0;
  const pctClass = (s) => s >= 75 ? "green" : s >= 55 ? "orange" : "red";

  return (
    <aside className="sidebar">
      {/* Avatar + nom — plus "user dev" */}
      <div className="sidebar-avatar">{initials}</div>
      <div className="sidebar-username">{displayName}</div>
      <div className="sidebar-level">Niveau {niveau} · {xp} XP</div>
      <div className="level-bar">
        <div className="level-fill" style={{ width: `${Math.min(xp % 100, 100)}%` }} />
      </div>

      <div className="sidebar-section-label">Chapitres</div>
      <div className="sidebar-chapters">
        {CHAPTERS_ORDER.map(ch => {
          const s = getScore(ch);
          return (
            <div
              key={ch}
              className={`sidebar-item ${currentChapter === ch ? "active" : ""}`}
              onClick={() => { setCurrentChapter(ch); showToast(`Chapitre : ${ch}`); }}
            >
              <span className="sidebar-ch-name">{ch}</span>
              <span className={`sidebar-pct ${currentChapter !== ch ? pctClass(s) : ""}`}>
                {s}%
              </span>
            </div>
          );
        })}
      </div>

      <MemoryCard currentChapter={currentChapter} />
    </aside>
  );
}