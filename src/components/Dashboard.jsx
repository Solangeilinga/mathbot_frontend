export default function Dashboard({ onChapterClick, user, chapitres, stats, loading }) {
  if (loading) return <div className="dashboard"><div className="dash-card"><div className="dash-loading">Chargement de ta progression...</div></div></div>;
  return (
    <div className="dashboard" style={{animation:"fade-in .4s ease"}}>
      <div className="dash-card">
        <h1 className="dash-welcome">Bon retour, {user?.prenom||"élève"} 👋</h1>
        <p className="dash-sub">Niveau {user?.niveau||1} · {user?.xp||0} XP total — continue comme ça !</p>
        <div className="stats-grid">
          {stats.map(s => <div key={s.label} className="stat-box"><div className="stat-num">{s.num}</div><div className="stat-label">{s.label}</div></div>)}
        </div>
        <div className="section-title">Chapitres du programme BEPC</div>
        {chapitres.length===0
          ? <p className="dash-empty">Commence une session pour voir ta progression !</p>
          : <div className="chapters-grid">
              {chapitres.map(ch => (
                <div key={ch.name} className="chapter-card" onClick={() => onChapterClick(ch.name)}>
                  <div className="chapter-name">{ch.name}</div>
                  <div className="chapter-sub">{ch.sub}</div>
                  <div className="progress-bar"><div className={`progress-fill ${ch.color}`} style={{width:`${ch.score}%`}}/></div>
                  <div className="chapter-footer">
                    <span className="chapter-score-text">{ch.score}/100 · {ch.exercices} ex.</span>
                    <span className={`badge ${ch.badgeClass}`}>{ch.badge}</span>
                  </div>
                </div>
              ))}
            </div>
        }
      </div>
    </div>
  );
}
