import { useState } from "react";
export default function LoginPage({ onLogin, onRegister, error, loading }) {
  const [tab, setTab]   = useState("login");
  const [form, setForm] = useState({ nom:"", prenom:"", email:"", password:"" });
  const set = (f) => (e) => setForm(p => ({...p, [f]:e.target.value}));
  const handleSubmit = (e) => { e.preventDefault(); tab==="login" ? onLogin(form.email,form.password) : onRegister(form.nom,form.prenom,form.email,form.password); };
  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <span className="login-owl">🦉</span>
          <div>
            <div className="login-logo-text"><span className="gold">BEPC</span>Math AI</div>
            <div className="login-logo-sub">Tuteur IA — Burkina Faso</div>
          </div>
        </div>
        <div className="login-tabs">
          <button className={`login-tab ${tab==="login"?"active":""}`}  onClick={() => setTab("login")}    type="button">Connexion</button>
          <button className={`login-tab ${tab==="register"?"active":""}`} onClick={() => setTab("register")} type="button">Inscription</button>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          {tab==="register" && (
            <div className="login-row2">
              <div className="login-field"><label className="login-label">Nom</label><input className="login-input" type="text" placeholder="Traore" value={form.nom} onChange={set("nom")} required /></div>
              <div className="login-field"><label className="login-label">Prénom</label><input className="login-input" type="text" placeholder="Issouf" value={form.prenom} onChange={set("prenom")} required /></div>
            </div>
          )}
          <div className="login-field"><label className="login-label">Email</label><input className="login-input" type="email" placeholder="issouf@exemple.bf" value={form.email} onChange={set("email")} required /></div>
          <div className="login-field"><label className="login-label">Mot de passe</label><input className="login-input" type="password" placeholder="••••••••" value={form.password} onChange={set("password")} required minLength={6}/></div>
          {error && <div className="login-error">{error}</div>}
          <button className="login-submit" type="submit" disabled={loading}>{loading?"Chargement...":tab==="login"?"Se connecter →":"Créer mon compte →"}</button>
        </form>
        <p className="login-hint">{tab==="login"?"Pas encore de compte ? ":"Déjà inscrit ? "}<button className="login-switch" onClick={() => setTab(tab==="login"?"register":"login")} type="button">{tab==="login"?"S'inscrire":"Se connecter"}</button></p>
      </div>
    </div>
  );
}
