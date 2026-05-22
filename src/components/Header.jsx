export default function Header({ xp, user, onLogout }) {
  const prenom   = user?.prenom && user.prenom !== "undefined" ? user.prenom : "";
  const nom      = user?.nom    && user.nom    !== "undefined" ? user.nom    : "";
  const initials = ((prenom[0] || "") + (nom[0] || "")).toUpperCase() || "?";

  return (
    <header className="header">
      {/* Logo — MathBot (plus BEPCMath AI) */}
      <div className="header-logo">
        <span className="header-owl">🦉</span>
        <span className="header-brand">MathBot</span>
        <span className="header-sub">BEPC Burkina Faso</span>
      </div>

      <div className="header-right">
        <div className="xp-badge">⬡ <span>{xp ?? 0}</span> XP</div>

        {/* Avatar seul — pas de texte "user" */}
        <div className="avatar" title={[prenom, nom].filter(Boolean).join(" ") || "Profil"}>
          {initials}
        </div>

        {onLogout && (
          <button className="logout-btn" onClick={onLogout} title="Déconnexion">⎋</button>
        )}
      </div>
    </header>
  );
}