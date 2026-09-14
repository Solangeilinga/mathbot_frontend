const PAGES = [
  { id:"dashboard", label:"Tableau de bord" },
  { id:"session",   label:"Session de révision" },
  { id:"annales",   label:"Annales BEPC" },
];
export default function Nav({ activePage, setActivePage }) {
  return (
    <nav className="nav">
      {PAGES.map(p => (
        <button key={p.id} className={`nav-btn ${activePage===p.id?"active":""}`} onClick={() => setActivePage(p.id)}>{p.label}</button>
      ))}
    </nav>
  );
}
