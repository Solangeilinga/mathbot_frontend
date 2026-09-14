import { useEffect } from "react";

// Enregistre le service worker au montage — ne rend rien à l'écran.
export default function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("[PWA] Échec de l'enregistrement du service worker :", err.message);
      });
    }
  }, []);

  return null;
}
