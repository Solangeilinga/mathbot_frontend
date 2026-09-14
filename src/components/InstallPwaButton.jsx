import { useEffect, useState } from "react";

// N'affiche un bouton "Installer l'app" que si le navigateur propose réellement
// l'installation PWA (Android/Chrome/Edge). Sur iOS Safari, l'API n'existe pas
// encore — le bouton reste simplement invisible, sans casser l'expérience.
export default function InstallPwaButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  if (!deferredPrompt || installed) return null;

  const handleInstall = async () => {
    deferredPrompt.prompt();
    try {
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setInstalled(true);
    } finally {
      setDeferredPrompt(null);
    }
  };

  return (
    <button className="install-pwa-btn" onClick={handleInstall} title="Installer MathBot sur cet appareil">
      📲 Installer
    </button>
  );
}
