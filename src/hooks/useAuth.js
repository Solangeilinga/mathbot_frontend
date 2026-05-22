// src/hooks/useAuth.js
import { useState, useCallback, useEffect } from "react";
import { authAPI } from "../utils/api";

function sanitizeUser(u) {
  if (!u) return null;
  return {
    ...u,
    prenom: (u.prenom && u.prenom !== "undefined" && u.prenom !== "null") ? u.prenom : "",
    nom:    (u.nom    && u.nom    !== "undefined" && u.nom    !== "null") ? u.nom    : "",
  };
}

export function useAuth() {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("bepc_user");
      return stored ? sanitizeUser(JSON.parse(stored)) : null;
    } catch { return null; }
  });
  const [authError, setAuthError]   = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // ── Sync depuis le serveur au démarrage (écrase localStorage périmé) ────────
  useEffect(() => {
    const token = localStorage.getItem("bepc_token");
    if (!token) return;

    authAPI.me()
      .then(data => {
        if (data?.user) {
          const fresh = sanitizeUser(data.user);
          localStorage.setItem("bepc_user", JSON.stringify(fresh));
          setUser(fresh);
        }
      })
      .catch(() => {
        // Token expiré ou invalide → déconnexion silencieuse
        localStorage.removeItem("bepc_token");
        localStorage.removeItem("bepc_user");
        setUser(null);
      });
  }, []); // eslint-disable-line

  const login = useCallback(async (email, password) => {
    setAuthLoading(true); setAuthError("");
    try {
      const data = await authAPI.login(email, password);
      const u = sanitizeUser(data.user);
      localStorage.setItem("bepc_token", data.token);
      localStorage.setItem("bepc_user", JSON.stringify(u));
      setUser(u);
      return true;
    } catch (err) { setAuthError(err.message); return false; }
    finally { setAuthLoading(false); }
  }, []);

  const register = useCallback(async (nom, prenom, email, password) => {
    setAuthLoading(true); setAuthError("");
    try {
      const data = await authAPI.register(nom, prenom, email, password);
      const u = sanitizeUser(data.user);
      localStorage.setItem("bepc_token", data.token);
      localStorage.setItem("bepc_user", JSON.stringify(u));
      setUser(u);
      return true;
    } catch (err) { setAuthError(err.message); return false; }
    finally { setAuthLoading(false); }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("bepc_token");
    localStorage.removeItem("bepc_user");
    setUser(null);
  }, []);

  const updateXP = useCallback((newXP, newNiveau) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, xp: newXP, niveau: newNiveau ?? prev.niveau };
      localStorage.setItem("bepc_user", JSON.stringify(updated));
      return updated;
    });
  }, []);

  return { user, authError, authLoading, login, register, logout, updateXP };
}