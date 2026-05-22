import { useState, useEffect } from "react";
import { memoryAPI } from "../utils/api";
export default function MemoryCard({ currentChapter }) {
  const [profil, setProfil]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [updating, setUpdating] = useState(false);
  useEffect(() => {
    memoryAPI.get().then(d => setProfil(d.profil)).catch(() => setProfil(null)).finally(() => setLoading(false));
  }, []);
  const handleUpdate = async () => {
    setUpdating(true);
    try { const d = await memoryAPI.update(currentChapter); setProfil(d.profil); } catch {}
    finally { setUpdating(false); }
  };
  if (loading) return null;
  return (
    <div className="memory-card">
      <div className="memory-header">
        <div className="memory-title">🧠 Profil pédagogique</div>
        <button className="memory-update-btn" onClick={handleUpdate} disabled={updating}>{updating?"Analyse...":"↻ Mettre à jour"}</button>
      </div>
      {!profil ? <p className="memory-empty">Continue tes sessions — ton profil se construira automatiquement !</p> : (
        <div className="memory-body">
          <div className="memory-niveau">Niveau : <span className="memory-niveau-badge">{profil.niveau_global}</span></div>
          {profil.points_forts?.length>0 && <div className="memory-section"><div className="memory-section-label">✅ Points forts</div>{profil.points_forts.map((p,i) => <div key={i} className="memory-tag green">{p}</div>)}</div>}
          {profil.lacunes?.length>0       && <div className="memory-section"><div className="memory-section-label">⚠️ Lacunes</div>{profil.lacunes.map((l,i) => <div key={i} className="memory-tag red">{l}</div>)}</div>}
          {profil.notions_a_retravailler?.length>0 && <div className="memory-section"><div className="memory-section-label">📚 À retravailler</div>{profil.notions_a_retravailler.map((n,i) => <div key={i} className="memory-tag orange">{n}</div>)}</div>}
          {profil.conseils_pour_tuteur && <div className="memory-conseil">💡 {profil.conseils_pour_tuteur}</div>}
        </div>
      )}
    </div>
  );
}
