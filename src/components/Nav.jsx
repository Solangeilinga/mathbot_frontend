const PAGES = [
  { id:"dashboard", label:"Tableau de bord",     short:"Accueil"  },
  { id:"session",   label:"Session de révision", short:"Révision" },
  { id:"annales",   label:"Annales BEPC",        short:"Annales"  },
];
export default function Nav({ activePage, setActivePage }) {
  return (
    <nav className="nav">
      {PAGES.map(p => (
        <button key={p.id} className={`nav-btn ${activePage===p.id?"active":""}`} onClick={() => setActivePage(p.id)} aria-label={p.label}>
          <span className="nav-label-long">{p.label}</span>
          <span className="nav-label-short" aria-hidden="true">{p.short}</span>
        </button>
      ))}
    </nav>
  );
}
