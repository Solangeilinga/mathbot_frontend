import { useState, useEffect } from "react";
import { progressionAPI } from "../utils/api";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function Leaderboard({ currentUser }) {
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    progressionAPI
      .leaderboard()
      .then((data) => setEntries(data.leaderboard || []))
      .catch(() => setError(true));
  }, []);

  if (error) return null;

  return (
    <div className="leaderboard-card">
      <div className="leaderboard-title">🏆 Classement — Top 10</div>

      {!entries ? (
        <div className="dash-loading">Chargement du classement...</div>
      ) : entries.length === 0 ? (
        <p className="dash-empty">Personne pour l'instant — sois le premier à gagner de l'XP !</p>
      ) : (
        <div className="leaderboard-list">
          {entries.map((entry, i) => {
            const isMe = currentUser && entry.id === currentUser.id;
            const prenom = entry.prenom && entry.prenom !== "undefined" ? entry.prenom : "Élève";
            const nomInitiale = entry.nom && entry.nom !== "undefined" ? `${entry.nom[0]}.` : "";
            return (
              <div key={entry.id || i} className={`leaderboard-row ${isMe ? "me" : ""}`}>
                <span className="leaderboard-rank">{MEDALS[i] || `${i + 1}.`}</span>
                <span className="leaderboard-name">
                  {prenom} {nomInitiale}
                  {isMe && <span className="leaderboard-you"> (toi)</span>}
                </span>
                <span className="leaderboard-niveau">Niv. {entry.niveau}</span>
                <span className="leaderboard-xp">{entry.xp} XP</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
